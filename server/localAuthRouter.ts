/**
 * Router de Autenticação Local
 * Endpoints para login com e-mail e senha
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { validateLocalCredentials, updateUserPassword, hashPassword, createLocalUser } from "./localAuthService";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const localAuthRouter = router({
  /**
   * Login local com e-mail e senha
   */
  login: publicProcedure
    .input(z.object({
      email: z.string().email("E-mail inválido"),
      password: z.string().min(1, "Senha é obrigatória"),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await validateLocalCredentials(input.email, input.password);
      
      if (!result.success || !result.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: result.error || "Credenciais inválidas",
        });
      }
      
      const user = result.user;
      
      // Criar token de sessão
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || user.email || "Usuário",
      });
      
      // Definir cookie de sessão (usando o mesmo nome que o OAuth para sobrescrever sessão anterior)
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      
      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          mustChangePassword: user.mustChangePassword === true,
        },
      };
    }),

  /**
   * Verificar se o e-mail tem login local disponível
   */
  checkLocalLogin: publicProcedure
    .input(z.object({
      email: z.string().email("E-mail inválido"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      const result = await db.execute(sql`
        SELECT id, password_hash, "loginMethod" 
        FROM users 
        WHERE email = ${input.email} 
        AND "isActive" = true
        LIMIT 1
      `);
      
      const users = result.rows as any[];
      
      if (!users || users.length === 0) {
        return {
          exists: false,
          hasLocalLogin: false,
          loginMethod: null,
        };
      }
      
      const user = users[0];
      
      return {
        exists: true,
        hasLocalLogin: !!user.password_hash,
        loginMethod: user.loginMethod,
      };
    }),

  /**
   * Alterar senha (usuário autenticado)
   */
  changePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string().min(1, "Senha atual é obrigatória"),
      newPassword: z.string().min(8, "Nova senha deve ter pelo menos 8 caracteres"),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;
      
      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Usuário não autenticado",
        });
      }
      
      // Verificar senha atual
      const result = await validateLocalCredentials(user.email || "", input.currentPassword);
      
      if (!result.success) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Senha atual incorreta",
        });
      }
      
      // Atualizar senha
      await updateUserPassword(user.id, input.newPassword);
      
      return { success: true };
    }),

  /**
   * Definir senha para usuário no primeiro acesso (usa email + senha temporária para identificar)
   */
  setInitialPassword: publicProcedure
    .input(z.object({
      email: z.string().email("E-mail inválido"),
      currentPassword: z.string().min(1, "Senha atual é obrigatória"),
      newPassword: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
    }))
    .mutation(async ({ input }) => {
      // Validar credenciais atuais para identificar o usuário correto
      const result = await validateLocalCredentials(input.email, input.currentPassword);
      
      if (!result.success || !result.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Credenciais inválidas. Verifique o e-mail e a senha temporária.",
        });
      }
      
      const user = result.user;
      
      // Verificar se realmente precisa trocar a senha
      if (user.mustChangePassword !== true) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este usuário não precisa trocar a senha.",
        });
      }
      
      // Atualizar senha
      await updateUserPassword(user.id, input.newPassword);
      
      return { success: true };
    }),

  /**
   * Validar token de primeiro acesso (usado pela página /primeiro-acesso/:token)
   */
  validateSetupToken: publicProcedure
    .input(z.object({
      token: z.string().min(1, "Token é obrigatório"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      const result = await db.execute(sql`
        SELECT id, name, email, "isActive", setup_token_expires_at as "setupTokenExpiresAt"
        FROM users 
        WHERE setup_token = ${input.token}
        LIMIT 1
      `);
      
      const users = result.rows as any[];
      
      if (!users || users.length === 0) {
        return { valid: false, reason: 'not_found' as const };
      }
      
      const user = users[0];
      
      // Verificar se o usuário está ativo
      if (!user.isActive) {
        return { valid: false, reason: 'inactive' as const };
      }
      
      // Verificar se o token expirou
      if (user.setupTokenExpiresAt && new Date() > new Date(user.setupTokenExpiresAt)) {
        return { valid: false, reason: 'expired' as const };
      }
      
      return {
        valid: true,
        userName: user.name || '',
        userEmail: user.email || '',
      };
    }),

  /**
   * Definir senha usando token de primeiro acesso (fluxo principal para novos usuários)
   */
  setupPasswordByToken: publicProcedure
    .input(z.object({
      token: z.string().min(1, "Token é obrigatório"),
      newPassword: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Buscar usuário pelo token
      const result = await db.execute(sql`
        SELECT id, name, email, "openId", "isActive", role, "organizationId",
               setup_token_expires_at as "setupTokenExpiresAt",
               password_hash as "passwordHash"
        FROM users 
        WHERE setup_token = ${input.token}
        LIMIT 1
      `);
      
      const users = result.rows as any[];
      
      if (!users || users.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Link de primeiro acesso inválido ou expirado. Solicite um novo link ao administrador.",
        });
      }
      
      const user = users[0];
      
      // Verificar se o usuário está ativo
      if (!user.isActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Sua conta está inativa. Entre em contato com o administrador.",
        });
      }
      
      // Verificar se o token expirou
      if (user.setupTokenExpiresAt && new Date() > new Date(user.setupTokenExpiresAt)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este link de primeiro acesso expirou. Solicite um novo link ao administrador.",
        });
      }
      
      // Verificar se já tem senha definida (token já foi usado)
      if (user.passwordHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Sua senha já foi definida. Use a tela de login para acessar a plataforma.",
        });
      }
      
      // Definir a senha, limpar o token e atualizar openId para indicar primeiro acesso concluído
      const passwordHash = await hashPassword(input.newPassword);
      const newOpenId = `local_${user.id}_${Date.now()}`;
      
      await db.execute(sql`
        UPDATE users 
        SET password_hash = ${passwordHash},
            "loginMethod" = 'local',
            must_change_password = false,
            temporary_password = NULL,
            password_expires_at = NULL,
            setup_token = NULL,
            setup_token_expires_at = NULL,
            "openId" = ${newOpenId},
            "lastSignedIn" = NOW()
        WHERE id = ${user.id}
      `);
      
      // Criar sessão automaticamente após definir senha (usar o novo openId)
      const sessionToken = await sdk.createSessionToken(newOpenId, {
        name: user.name || user.email || "Usuário",
      });
      
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      
      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
        },
      };
    }),

  /**
   * Auto-registro de novo usuário com login local
   * NOTA: Mantido por compatibilidade mas desabilitado - acessos são provisionados pela equipe interna
   */
  register: publicProcedure
    .input(z.object({
      name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
      email: z.string().email("E-mail inválido"),
      password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
    }))
    .mutation(async ({ input }) => {
      // Auto-registro desabilitado - acessos são provisionados exclusivamente pela equipe interna
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "O cadastro de novos usuários é realizado exclusivamente pela equipe administrativa. Entre em contato com o administrador.",
      });
    }),
});
