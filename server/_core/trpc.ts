import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

// adminProcedure: Restringe acesso APENAS ao perfil admin_global
// Usado para operações críticas de administração da plataforma
export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    // Verificar se o usuário é admin_global
    const isAdmin = ctx.user.role === 'admin_global';
    
    if (!isAdmin) {
      throw new TRPCError({ 
        code: "FORBIDDEN", 
        message: NOT_ADMIN_ERR_MSG 
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// internalProcedure: Permite acesso à equipe interna Seusdados
// (admin_global, consultor)
// Usado para operações que qualquer membro da equipe interna pode executar
export const internalProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    const internalRoles = ['admin_global', 'consultor'];
    const isInternal = internalRoles.includes(ctx.user.role);
    
    if (!isInternal) {
      throw new TRPCError({ 
        code: "FORBIDDEN", 
        message: 'Acesso restrito à equipe interna Seusdados. Apenas administradores, consultores e gestores de projeto podem realizar esta operação.' 
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// clienteBlockedProcedure: Bloqueia acesso para usuários Cliente
// Roles de Cliente: sponsor, comite, lider_processo, gestor_area
// Usado para rotas que devem ser restritas apenas à equipe interna
// Para outros roles (admin, consultor, etc), permite acesso normalmente
export const clienteBlockedProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    // Roles de Cliente que devem ser bloqueados
    const clienteRoles = ['sponsor', 'comite', 'lider_processo', 'gestor_area', 'terceiro'];
    
    // Se for Cliente, bloqueia acesso
    if (clienteRoles.includes(ctx.user.role)) {
      throw new TRPCError({ 
        code: "FORBIDDEN", 
        message: 'Este módulo não está disponível para seu perfil. Entre em contato com o administrador.' 
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

/**
 * Função auxiliar para verificar se um usuário tem qualquer um dos papéis especificados
 * Suporta múltiplos papéis de cliente atribuídos ao mesmo usuário
 * @param userRole - Papel principal do usuário
 * @param userClientRoles - Array de papéis de cliente adicionais
 * @param requiredRoles - Array de papéis requeridos (qualquer um satisfaz)
 * @returns true se o usuário tem qualquer um dos papéis requeridos
 */
export function hasAnyRole(
  userRole: string,
  userClientRoles: string[] | undefined,
  requiredRoles: string[]
): boolean {
  // Verificar papel principal
  if (requiredRoles.includes(userRole)) {
    return true;
  }
  
  // Verificar papéis de cliente adicionais
  if (userClientRoles && userClientRoles.length > 0) {
    return userClientRoles.some(role => requiredRoles.includes(role));
  }
  
  return false;
}

/**
 * Função auxiliar para verificar se um usuário tem TODOS os papéis especificados
 * @param userRole - Papel principal do usuário
 * @param userClientRoles - Array de papéis de cliente adicionais
 * @param requiredRoles - Array de papéis requeridos (todos devem estar presentes)
 * @returns true se o usuário tem todos os papéis requeridos
 */
export function hasAllRoles(
  userRole: string,
  userClientRoles: string[] | undefined,
  requiredRoles: string[]
): boolean {
  const allUserRoles = [userRole, ...(userClientRoles || [])];
  return requiredRoles.every(role => allUserRoles.includes(role));
}
