import { getAppBaseUrl } from './appUrl';
import { actionPlanHistory, actionPlanObservations, users } from '../drizzle/schema';
import { logger } from "./_core/logger";
import { eq, and, sql } from "drizzle-orm";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, internalProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { generateComplianceReportHTML, generateThirdPartyReportHTML, generateActionPlanHTML, generateActivityReportHTML, generatePDF, ComplianceReportData, ThirdPartyReportData, ActivityReportData } from "./pdfService";
import { generateCompliancePremiumReport, generateDueDiligencePremiumReport, generateContractAnalysisPremiumReport, generateXaiPremiumReport } from "./premiumReportService";
import { sendAssessmentEmail, sendAssessmentEmailLegacy, sendReminderEmail, sendUserInviteEmail, sendWelcomeUserEmail } from "./emailService";
import * as aiService from "./aiService";
import * as gedService from "./gedService";
import { contractAnalysisRouter } from "./contractAnalysisRouter";
import { lgpdTemplateRouter } from "./lgpdTemplateRouter";
import { simuladorRouter } from "./simuladorRouter";
import { scenarioRouter } from "./scenarioRouter";
import { governancaRouter } from "./governancaRouter";
import { ticketsRouter } from "./ticketsRouter";
import { notificationsRouter } from "./notificationsRouter";
import { rotRouter } from "./rotRouter";
import { mapeamentoRouter } from "./mapeamentoRouter";
import { fase3Router } from "./fase3Router";
import { cppdInitiativeRouter } from "./cppdInitiativeRouter";
import { govbrSignatureRouter } from "./govbrSignatureRouter";
import { alertsRouter } from "./alertsRouter";
import { maturityEngineRouter } from "./maturityEngineRouter";
import { maturityIndicatorRouter } from "./maturityIndicatorRouter";
import * as maturityEvents from './maturityEventIntegration';
import { generateCadastrosReport, CadastrosReportData } from './cadastrosReportService';
import { localAuthRouter } from './localAuthRouter';
import { incidentsRouter } from './incidentsRouter';
import { serviceCatalogRouter } from './serviceCatalogRouter';
import { userPreferencesRouter } from './userPreferencesRouter';
import { clauseCommentsRouter, clauseAnnotationsRouter, commentNotificationsRouter } from './clauseCommentsRouter';
import { dpiaRouter } from './dpiaRouter';
import { seusdadosRouter } from './seusdadosRouter';
import { paAnpdRouter } from './paAnpdRouter';
import { assessmentsRouter } from './assessmentsRouter';
import { reportRouter } from './reportRouter';
import { reviewRouter } from './reviewRouter';
import { ripdEvidenceRouter } from './ripdEvidenceRouter';
import { ripdAiRouter } from './ripdAiRouter';
import { ripdWorkflowRouterPremium } from './ripdWorkflowRouterPremium';
import { ripdSignatureRouter } from './ripdSignatureRouter';
import { ripdReportRouter } from './ripdReportRouter';
import { ripdTasksRouter } from './ripdTasksRouter';
import { ripdContractIntegrationRouter } from './ripdContractIntegrationRouter';
import { ripdAdminRouter } from './ripdAdminRouter';
import { rotDocumentRouter } from './rotDocumentRouter';
import { deadlinesRouter } from './deadlinesRouter';
import { dashboardRouter } from './dashboardRouter';
import { calculateDueDiligenceRiskScore, getTotalDueDiligenceQuestions, getDueDiligenceQuestionById } from '../shared/frameworkDueDiligence';
import { complianceEndpointsExtra } from './complianceEndpoints';
import { orgSyncRouter } from './orgSyncRouter';
import { taxonomyRouter } from './taxonomyRouter';
import { userProfilesRouter } from './userProfilesRouter';
import { canUserAccessActionPlan, getActionPlanById, getActionPlanEvidenceById, assertUserCanAccessActionPlan, assertResponsibleOrInternal, isInternalActionPlanRole, isClientActionPlanRole } from './actionPlanAccess';


const INTERNAL_TEAM_ROLES = ['admin_global', 'consultor'] as const;
const CLIENT_ROLES = ['sponsor', 'comite', 'lider_processo', 'gestor_area'] as const;

function isInternalTeamRole(role: string) {
  return INTERNAL_TEAM_ROLES.includes(role as any);
}

function isClientRole(role: string) {
  return CLIENT_ROLES.includes(role as any);
}

async function getAuthorizedThirdPartyOrThrow(thirdPartyId: number, ctx: any) {
  const thirdParty = await db.getThirdPartyById(thirdPartyId);
  if (!thirdParty) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Terceiro não encontrado' });
  }
  if (!isInternalTeamRole(ctx.user.role) && ctx.user.organizationId !== thirdParty.organizationId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
  }
  return thirdParty;
}

async function getAuthorizedThirdPartyAssessmentOrThrow(assessmentId: number, ctx: any) {
  const assessment = await db.getThirdPartyAssessmentById(assessmentId);
  if (!assessment) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Avaliação não encontrada' });
  }
  if (!isInternalTeamRole(ctx.user.role) && ctx.user.organizationId !== assessment.organizationId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
  }
  return assessment;
}

async function getAuthorizedAccessLinkOrThrow(token: string, ctx: any) {
  const link = await db.getAccessLinkByToken(token);
  if (!link) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Link não encontrado' });
  }
  if (!isInternalTeamRole(ctx.user.role) && ctx.user.organizationId !== link.organizationId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
  }
  return link;
}

function getQuestionByNumber(questionNumber: number) {
  return getDueDiligenceQuestionById(`DD-${String(questionNumber).padStart(2, '0')}`);
}


// ==================== ORGANIZATION ROUTER ====================
const organizationRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === 'admin_global' || ctx.user.role === 'consultor') {
      return db.getAllOrganizations();
    }
    if (ctx.user.organizationId) {
      const org = await db.getOrganizationById(ctx.user.organizationId);
      return org ? [org] : [];
    }
    return [];
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.id) {
        return null;
      }
      return db.getOrganizationById(input.id);
    }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      tradeName: z.string().optional().nullable(),
      cnpj: z.string().optional().nullable(),
      email: z.string().email().optional().nullable().or(z.literal('')),
      phone: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      city: z.string().optional().nullable(),
      state: z.string().optional().nullable(),
      zipCode: z.string().optional().nullable(),
      logoUrl: z.string().optional().nullable(),
      primaryColor: z.string().optional().nullable(),
      secondaryColor: z.string().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Limpar campos vazios para evitar erros de validação
      const cleanedInput = {
        ...input,
        tradeName: input.tradeName || undefined,
        cnpj: input.cnpj || undefined,
        email: input.email || undefined,
        phone: input.phone || undefined,
        address: input.address || undefined,
        city: input.city || undefined,
        state: input.state || undefined,
        zipCode: input.zipCode || undefined,
        logoUrl: input.logoUrl || undefined,
        primaryColor: input.primaryColor || undefined,
        secondaryColor: input.secondaryColor || undefined,
      };
      const id = await db.createOrganization(cleanedInput);
      // Criar pastas padrão do GED para a nova organização
      try {
        await gedService.createDefaultFoldersForOrganization(id, ctx.user.id);
      } catch (error) {
        logger.error('Erro ao criar pastas padrão do GED:', error);
      }
      
      // Registrar auditoria
      await db.createAuditLog({
        userId: ctx.user.id,
        organizationId: id,
        action: 'CREATE',
        entityType: 'organization',
        entityId: id,
        details: {
          data: cleanedInput,
          createdBy: ctx.user.name || ctx.user.email
        }
      });
      
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      tradeName: z.string().optional().nullable(),
      cnpj: z.string().optional().nullable(),
      email: z.string().email().optional().nullable().or(z.literal('')),
      phone: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      city: z.string().optional().nullable(),
      state: z.string().optional().nullable(),
      zipCode: z.string().optional().nullable(),
      logoUrl: z.string().optional().nullable(),
      primaryColor: z.string().optional().nullable(),
      secondaryColor: z.string().optional().nullable(),
      isActive: z.union([z.boolean(), z.number()]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      // Buscar dados anteriores para auditoria
      const previousData = await db.getOrganizationById(input.id);
      
      const { id, isActive, ...rest } = input;
      // Limpar campos null para undefined para evitar problemas no banco
      const cleanedRest: Record<string, any> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (value !== null && value !== undefined) {
          cleanedRest[key] = value;
        }
      }
      const data = {
        ...cleanedRest,
        ...(isActive !== undefined && { isActive: isActive === true || isActive === 1 }),
      };
      await db.updateOrganization(id, data);
      
      // Registrar auditoria
      await db.createAuditLog({
        userId: ctx.user.id,
        organizationId: id,
        action: 'UPDATE',
        entityType: 'organization',
        entityId: id,
        details: {
          previousData: previousData ? {
            name: previousData.name,
            tradeName: previousData.tradeName,
            cnpj: previousData.cnpj,
            email: previousData.email,
            phone: previousData.phone,
            address: previousData.address,
            city: previousData.city,
            state: previousData.state,
            zipCode: previousData.zipCode,
            isActive: previousData.isActive
          } : null,
          newData: data,
          changedBy: ctx.user.name || ctx.user.email
        }
      });
      
      // Buscar e retornar os dados atualizados
      const updatedOrg = await db.getOrganizationById(id);
      return { success: true, organization: updatedOrg };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Buscar dados antes de excluir para auditoria
      const previousData = await db.getOrganizationById(input.id);
      
      await db.deleteOrganization(input.id);
      
      // Registrar auditoria
      await db.createAuditLog({
        userId: ctx.user.id,
        organizationId: input.id,
        action: 'DELETE',
        entityType: 'organization',
        entityId: input.id,
        details: {
          deletedData: previousData ? {
            name: previousData.name,
            cnpj: previousData.cnpj,
            email: previousData.email
          } : null,
          deletedBy: ctx.user.name || ctx.user.email
        }
      });
      
      return { success: true };
    }),

  getStats: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.id) {
        return null;
      }
      return db.getOrganizationStats(input.id);
    }),

  // Gerar relatório de cadastros em PDF
  generateCadastrosReport: adminProcedure.mutation(async ({ ctx }) => {
    // Buscar dados
    const organizations = await db.getAllOrganizations();
    const users = await db.getAllUsers();
    const invites = await db.getAllInvites();
    
    // Calcular estatísticas
    const activeOrgs = organizations.filter((o: any) => o.isActive !== false).length;
    const activeUsers = users.filter((u: any) => u.isActive !== false).length;
    const adminCount = users.filter((u: any) => u.role === 'admin_global').length;
    const consultorCount = users.filter((u: any) => u.role === 'consultor').length;
    const clienteCount = users.filter((u: any) => u.role !== 'admin_global' && ctx.user.role !== 'consultor').length;
    const pendingInvites = invites.filter((i: any) => i.status === 'pending').length;
    const acceptedInvites = invites.filter((i: any) => i.status === 'accepted').length;
    const expiredInvites = invites.filter((i: any) => i.status === 'expired').length;
    
    // Preparar dados para o relatório
    const reportData: CadastrosReportData = {
      generatedAt: new Date().toLocaleDateString('pt-BR', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      }),
      generatedBy: ctx.user.name || ctx.user.email,
      stats: {
        totalOrgs: organizations.length,
        activeOrgs,
        inactiveOrgs: organizations.length - activeOrgs,
        totalUsers: users.length,
        activeUsers,
        adminCount,
        consultorCount,
        clienteCount,
        pendingInvites,
        acceptedInvites,
        expiredInvites
      },
      organizations: organizations.map((org: any) => ({
        id: org.id,
        name: org.name,
        cnpj: org.cnpj,
        email: org.email,
        phone: org.phone,
        city: org.city,
        state: org.state,
        isActive: org.isActive !== false,
        userCount: users.filter((u: any) => u.organizationId === org.id).length,
        createdAt: org.createdAt ? new Date(org.createdAt).toLocaleDateString('pt-BR') : '-'
      })),
      users: users.map((user: any) => {
        const org = organizations.find((o: any) => o.id === user.organizationId);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationName: org?.name || null,
          isActive: user.isActive !== false,
          createdAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : '-'
        };
      }),
      invites: invites.map((invite: any) => {
        const org = organizations.find((o: any) => o.id === invite.organizationId);
        return {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          status: invite.status,
          organizationName: org?.name || null,
          createdAt: invite.createdAt ? new Date(invite.createdAt).toLocaleDateString('pt-BR') : '-',
          expiresAt: invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString('pt-BR') : '-'
        };
      })
    };
    
    // Gerar PDF
    const pdfBuffer = await generateCadastrosReport(reportData);
    
    return {
      pdf: pdfBuffer.toString('base64'),
      filename: `relatorio-cadastros-${new Date().toISOString().split('T')[0]}.pdf`
    };
  }),
});

// ==================== USER ROUTER ====================
const userRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    // Equipe interna vê todos os usuários
    const internalRoles = ['admin_global', 'consultor'];
    if (internalRoles.includes(ctx.user.role)) {
      return db.getAllUsers();
    }
    // Clientes e terceiros vêem apenas usuários da própria organização
    if (ctx.user.organizationId) {
      return db.getUsersByOrganization(ctx.user.organizationId);
    }
    return [];
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getUserById(input.id);
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().nullable().optional(),
      role: z.enum(['admin_global', 'consultor', 'sponsor', 'comite', 'lider_processo', 'gestor_area', 'terceiro']).optional(),
      organizationId: z.number().nullable().optional(),
      // Aceitar boolean ou número para compatibilidade com dados do banco
      isActive: z.union([z.boolean(), z.number()]).optional(),
      clientRoles: z.array(z.enum(['sponsor', 'comite', 'lider_processo', 'gestor_area'])).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const internalRoles = ['admin_global', 'consultor'];
      const isInternal = internalRoles.includes(ctx.user.role);
      if (!isInternal && ctx.user.id !== input.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      if (!isInternal && input.role) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas a equipe interna pode alterar perfis de acesso' });
      }
      if (!isInternal && input.clientRoles) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas a equipe interna pode atribuir papéis Cliente' });
      }
      
      // Buscar dados anteriores para auditoria
      const previousData = await db.getUserById(input.id);
      
      const { id, isActive, ...restData } = input;
      // Converter isActive para número (aceita boolean ou número)
      const data = {
        ...restData,
        ...(isActive !== undefined && { isActive: !!isActive }),
      };
      await db.updateUser(id, data);
      
      // Registrar auditoria
      await db.createAuditLog({
        userId: ctx.user.id,
        organizationId: previousData?.organizationId || ctx.user.organizationId,
        action: 'UPDATE',
        entityType: 'user',
        entityId: id,
        details: {
          previousData: previousData ? {
            name: previousData.name,
            email: previousData.email,
            role: previousData.role,
            isActive: previousData.isActive
          } : null,
          newData: data,
          changedBy: ctx.user.name || ctx.user.email
        }
      });
      
      return { success: true };
    }),

  getOrganizations: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return db.getUserOrganizations(input.userId);
    }),

  addToOrganization: internalProcedure
    .input(z.object({
      userId: z.number(),
      organizationId: z.number(),
      accessLevel: z.enum(['viewer', 'editor', 'admin']).default('viewer'),
    }))
    .mutation(async ({ input }) => {
      await db.addUserToOrganization(input);
      return { success: true };
    }),

  removeFromOrganization: internalProcedure
    .input(z.object({
      userId: z.number(),
      organizationId: z.number(),
    }))
    .mutation(async ({ input }) => {
      await db.removeUserFromOrganization(input.userId, input.organizationId);
      return { success: true };
    }),

  listByOrganization: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        return [];
      }
      return db.getUsersByOrganization(input.organizationId);
    }),

  create: internalProcedure
    .input(z.object({
      name: z.string().min(1, 'Nome é obrigatório'),
      email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'E-mail inválido'),
      phone: z.string().optional(),
      role: z.enum(['admin_global', 'consultor', 'sponsor', 'comite', 'lider_processo', 'gestor_area', 'terceiro']),
      organizationId: z.number().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Controle de acesso: apenas admin_global pode criar outros admin_global
      const adminOnlyRoles = ['admin_global'];
      if (adminOnlyRoles.includes(input.role) && ctx.user.role !== 'admin_global') {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Apenas o Administrador Global pode criar outros administradores globais.' 
        });
      }
      
      // Perfis que exigem organização vinculada
      const rolesNeedOrg = ['sponsor', 'comite', 'lider_processo', 'gestor_area', 'terceiro'];
      if (rolesNeedOrg.includes(input.role) && !input.organizationId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este perfil de acesso exige uma organização vinculada' });
      }
      
      // Verificar se o e-mail já existe na mesma organização (multi-tenant)
      const existingUser = await db.getUserByEmailAndOrg(input.email, input.organizationId || null);
      if (existingUser) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Já existe um usuário com este e-mail nesta empresa.' });
      }
      
      try {
        // Criar o usuário
        // Gerar um openId único para o usuário (necessário pois é NOT NULL)
        const openId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Gerar token de primeiro acesso (válido por 30 dias)
        const setupToken = Array.from({ length: 48 }, () => 
          'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(
            Math.floor(Math.random() * 62)
          )
        ).join('');
        const setupTokenExpiresAt = new Date();
        setupTokenExpiresAt.setDate(setupTokenExpiresAt.getDate() + 30);
        
        const id = await db.createUser({
          openId,
          name: input.name,
          email: input.email,
          phone: input.phone || null,
          role: input.role,
          organizationId: input.organizationId || null,
          isActive: true,
        });
        
        // Salvar o setupToken no usuário recém-criado
        const dbInstance = await db.getDb();
        await dbInstance.execute(sql`
          UPDATE users 
          SET setup_token = ${setupToken},
              setup_token_expires_at = ${setupTokenExpiresAt.toISOString()}
          WHERE id = ${id}
        `);
        
        // Buscar nome da organização se houver
        let organizationName: string | undefined;
        if (input.organizationId) {
          const org = await db.getOrganizationById(input.organizationId);
          organizationName = org?.name;
        }
        
        // Enviar e-mail de boas-vindas com link de primeiro acesso
        const baseUrl = getAppBaseUrl();
        const setupUrl = `${baseUrl}/primeiro-acesso/${setupToken}`;
        
        try {
          await sendWelcomeUserEmail({
            userName: input.name,
            userEmail: input.email,
            role: input.role,
            organizationName,
            loginUrl: setupUrl,
            createdByName: ctx.user.name || ctx.user.email || 'Administrador',
          });
        } catch (emailErr) {
          console.warn('Aviso: Falha ao enviar e-mail de boas-vindas, mas usuário foi criado.', emailErr);
        }
        
        return { id, success: true };
      } catch (err: any) {
        // Se for erro de duplicação do banco (constraint unique)
        if (err?.code === 'ER_DUP_ENTRY' || err?.message?.includes('Duplicate entry')) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Já existe um usuário cadastrado com este e-mail.' });
        }
        // Se já é um TRPCError, re-lançar
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro inesperado ao criar usuário. Tente novamente.' });
      }
    }),

  delete: internalProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      
      // Não pode excluir a si mesmo
      if (ctx.user.id === input.id) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Você não pode excluir seu próprio usuário' });
      }
      
      await db.deleteUser(input.id);
      return { success: true };
    }),

  // Soft delete - apenas desativa o usuário mantendo dados para auditoria
  softDelete: internalProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      
      if (ctx.user.id === input.id) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Você não pode desativar seu próprio usuário' });
      }
      
      // Registrar ação no audit log
      await db.createAuditLog({
        userId: ctx.user.id,
        action: 'user_soft_delete',
        entityType: 'user',
        entityId: input.id,
        details: { performedBy: ctx.user.name },
      });
      
      await db.softDeleteUser(input.id);
      return { success: true };
    }),

  // Ativar/Inativar usuário independente de verificação
  toggleStatus: internalProcedure
    .input(z.object({ 
      id: z.number(),
      isActive: z.boolean()
    }))
    .mutation(async ({ input, ctx }) => {
      
      // Registrar ação no audit log
      await db.createAuditLog({
        userId: ctx.user.id,
        action: input.isActive ? 'user_activated' : 'user_deactivated',
        entityType: 'user',
        entityId: input.id,
        details: { performedBy: ctx.user.name, newStatus: input.isActive },
      });
      
      await db.updateUser(input.id, { isActive: !!input.isActive });
      return { success: true };
    }),

  // Obter logs de atividades de um usuário
  getActivityLogs: internalProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input, ctx }) => {
      return db.getUserAuditLogs(input.userId);
    }),

  // Obter todos os logs de atividades (para admin global e consultor PMO)
  getAllActivityLogs: internalProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      return db.getAllAuditLogs(input.limit || 100);
    }),

  // Gerar relatório de atividades de usuário
  generateActivityReport: internalProcedure
    .input(z.object({ 
      userId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      format: z.enum(['json', 'pdf']).default('json'),
    }))
    .mutation(async ({ input, ctx }) => {
      
      // Buscar dados do usuário se especificado
      let userData = null;
      if (input.userId) {
        userData = await db.getUserById(input.userId);
      }
      
      // Buscar todos os usuários para mapear nomes
      const allUsers = await db.getAllUsers();
      const userMap = new Map(allUsers.map((u: any) => [u.id, u.name || u.email]));
      
      // Buscar logs de atividades
      let logs = input.userId 
        ? await db.getUserAuditLogs(input.userId)
        : await db.getAllAuditLogs(500);
      
      // Filtrar por data se especificado
      if (input.startDate) {
        const startDate = new Date(input.startDate);
        logs = logs.filter((log: any) => new Date(log.createdAt) >= startDate);
      }
      if (input.endDate) {
        const endDate = new Date(input.endDate);
        endDate.setHours(23, 59, 59, 999);
        logs = logs.filter((log: any) => new Date(log.createdAt) <= endDate);
      }
      
      // Agrupar por tipo de ação
      const actionCounts: Record<string, number> = {};
      logs.forEach((log: any) => {
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      });
      
      // Agrupar por dia
      const dailyActivity: Record<string, number> = {};
      logs.forEach((log: any) => {
        const date = new Date(log.createdAt).toISOString().split('T')[0];
        dailyActivity[date] = (dailyActivity[date] || 0) + 1;
      });
      
      // Se formato PDF, gerar e retornar
      if (input.format === 'pdf') {
        const html = generateActivityReportHTML({
          userName: userData?.name || userData?.email || 'Todos os usuários',
          generatedAt: new Date().toLocaleDateString('pt-BR'),
          startDate: input.startDate || 'Início',
          endDate: input.endDate || 'Atual',
          totalActions: logs.length,
          actionCounts,
          dailyActivity,
          logs: logs.slice(0, 100).map((log: any) => ({
            ...log,
            userName: userMap.get(log.userId) || `ID: ${log.userId}`,
          })),
        });
        const pdfBuffer = await generatePDF(html);
        return {
          pdf: pdfBuffer.toString('base64'),
          filename: `relatorio-atividades-${new Date().toISOString().split('T')[0]}.pdf`,
        };
      }
      
      return {
        user: userData,
        totalActions: logs.length,
        actionCounts,
        dailyActivity,
        logs: logs.slice(0, 100), // Limitar para performance
      };
    }),

  // Gerar senha temporária para usuário
  generateTemporaryPassword: internalProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      
      const user = await db.getUserById(input.userId);
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
      }
      
      // Gerar senha temporária aleatória
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
      
      // Salvar hash da senha temporária no banco
      await db.updateUser(input.userId, {
        temporaryPassword: tempPassword,
        passwordExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
        mustChangePassword: true,
      });
      
      // Registrar atividade
      await db.createAuditLog({
        userId: ctx.user.id,
        action: 'generate_temp_password',
        entityType: 'user',
        entityId: input.userId,
        details: { performedBy: ctx.user.name, targetUser: user.email },
      });
      
      return {
        success: true,
        temporaryPassword: tempPassword,
        expiresIn: '24 horas',
        message: `Senha temporária gerada para ${user.name || user.email}`,
      };
    }),

  // Definir nova senha manualmente
  setPassword: adminProcedure
    .input(z.object({
      userId: z.number(),
      newPassword: z.string().min(8),
    }))
    .mutation(async ({ input, ctx }) => {
      
      const user = await db.getUserById(input.userId);
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
      }
      
      // Salvar nova senha (em produção, usar hash)
      await db.updateUser(input.userId, {
        temporaryPassword: input.newPassword,
        passwordExpiresAt: null,
        mustChangePassword: true,
      });
      
      // Registrar atividade
      await db.createAuditLog({
        userId: ctx.user.id,
        action: 'set_password',
        entityType: 'user',
        entityId: input.userId,
        details: { performedBy: ctx.user.name, targetUser: user.email },
      });
      
      return {
        success: true,
        message: `Senha definida para ${user.name || user.email}`,
      };
    }),

  // Revogar senha (forçar reset)
  revokePassword: internalProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      
      const user = await db.getUserById(input.userId);
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
      }
      
      // Invalidar senha atual
      await db.updateUser(input.userId, {
        temporaryPassword: null,
        passwordExpiresAt: null,
        mustChangePassword: true,
      });
      
      // Registrar atividade
      await db.createAuditLog({
        userId: ctx.user.id,
        action: 'revoke_password',
        entityType: 'user',
        entityId: input.userId,
        details: { performedBy: ctx.user.name, targetUser: user.email },
      });
      
      return {
        success: true,
        message: `Senha revogada para ${user.name || user.email}. O usuário precisará redefinir a senha no próximo login.`,
      };
    }),

  // Enviar e-mail com senha temporária
  sendPasswordEmail: internalProcedure
    .input(z.object({
      userId: z.number(),
      temporaryPassword: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      
      const user = await db.getUserById(input.userId);
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
      }
      
      // Enviar e-mail com senha temporária
      // TODO: Implementar envio real de e-mail
      // await sendPasswordResetEmail(user.email, input.temporaryPassword);
      
      // Registrar atividade
      await db.createAuditLog({
        userId: ctx.user.id,
        action: 'send_password_email',
        entityType: 'user',
        entityId: input.userId,
        details: { performedBy: ctx.user.name, targetUser: user.email },
      });
      
      return {
        success: true,
        message: `E-mail enviado para ${user.email}`,
      };
    }),
});

// ==================== THIRD PARTY ROUTER ====================
const thirdPartyRouter = router({
  list: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      // Bloquear acesso de usuários Cliente
      if (isClientRole(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado. Este módulo não está disponível para seu perfil.' });
      }
      
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        return [];
      }
      return db.getThirdPartiesByOrganization(input.organizationId);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return getAuthorizedThirdPartyOrThrow(input.id, ctx);
    }),

  create: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      name: z.string().min(1),
      tradeName: z.string().optional(),
      cnpj: z.string().optional(),
      type: z.enum(['fornecedor', 'parceiro', 'suboperador', 'outro']).default('fornecedor'),
      category: z.string().optional(),
      contactName: z.string().optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      address: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!isInternalTeamRole(ctx.user.role) && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      const id = await db.createThirdParty(input);
      
      // Registrar auditoria
      await db.createAuditLog({
        userId: ctx.user.id,
        organizationId: input.organizationId,
        action: 'CREATE',
        entityType: 'third_party',
        entityId: id,
        details: {
          data: input,
          createdBy: ctx.user.name || ctx.user.email
        }
      });
      
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      tradeName: z.string().optional(),
      cnpj: z.string().optional(),
      type: z.enum(['fornecedor', 'parceiro', 'suboperador', 'outro']).optional(),
      category: z.string().optional(),
      contactName: z.string().optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      address: z.string().optional(),
      description: z.string().optional(),
      riskLevel: z.enum(['baixo', 'moderado', 'alto', 'critico']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const previousData = await getAuthorizedThirdPartyOrThrow(input.id, ctx);
      
      const { id, ...data } = input;
      await db.updateThirdParty(id, data);
      
      // Registrar auditoria
      await db.createAuditLog({
        userId: ctx.user.id,
        organizationId: previousData?.organizationId,
        action: 'UPDATE',
        entityType: 'third_party',
        entityId: id,
        details: {
          previousData: previousData ? {
            name: previousData.name,
            tradeName: previousData.tradeName,
            cnpj: previousData.cnpj,
            type: previousData.type,
            contactEmail: previousData.contactEmail
          } : null,
          newData: data,
          changedBy: ctx.user.name || ctx.user.email
        }
      });
      
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const previousData = await getAuthorizedThirdPartyOrThrow(input.id, ctx);
      
      await db.deleteThirdParty(input.id);
      
      // Registrar auditoria
      await db.createAuditLog({
        userId: ctx.user.id,
        organizationId: previousData?.organizationId,
        action: 'DELETE',
        entityType: 'third_party',
        entityId: input.id,
        details: {
          deletedData: previousData ? {
            name: previousData.name,
            cnpj: previousData.cnpj,
            type: previousData.type
          } : null,
          deletedBy: ctx.user.name || ctx.user.email
        }
      });
      
      return { success: true };
    }),

  // Perfil completo do terceiro com todos os dados consolidados
  getFullProfile: protectedProcedure
    .input(z.object({ thirdPartyId: z.number(), organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        return null;
      }
      
      const terceiro = await getAuthorizedThirdPartyOrThrow(input.thirdPartyId, ctx);
      
      // Buscar contratos vinculados
      const contracts = await db.getThirdPartyContracts(input.thirdPartyId);
      
      // Buscar avaliações due diligence
      const dueDiligence = await db.getThirdPartyAssessmentsByThirdParty(input.thirdPartyId);
      
      // Buscar análises de contratos
      const contractAnalyses = await db.getContractAnalysesByThirdParty(input.thirdPartyId);
      
      // Buscar planos de ação
      const actionPlans = await db.getActionPlansByThirdParty(input.thirdPartyId);
      
      // Buscar timeline de atividades
      const activities = await db.getThirdPartyActivities(input.thirdPartyId);
      
      // Calcular estatísticas
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const stats = {
        total_contracts: contracts.length,
        active_contracts: contracts.filter(c => c.status === 'ativo').length,
        expired_contracts: contracts.filter(c => c.end_date && new Date(c.end_date) < now).length,
        expiring_soon: contracts.filter(c => c.end_date && new Date(c.end_date) >= now && new Date(c.end_date) <= thirtyDaysFromNow).length,
        total_assessments: dueDiligence.length,
        total_action_plans: actionPlans.length,
        completed_action_plans: actionPlans.filter(p => p.status === 'concluido').length,
      };
      
      return {
        ...terceiro,
        razao_social: terceiro.name,
        nome_fantasia: terceiro.tradeName,
        tipo_negocio: terceiro.type,
        contracts,
        dueDiligence,
        contractAnalyses,
        actionPlans,
        activities,
        stats,
      };
    }),
});

// ==================== COMPLIANCE ASSESSMENT ROUTER ====================
const complianceRouter = router({
  list: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      // ✅ Usuários comuns podem visualizar apenas avaliações de sua organização
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        return [];
      }
      
      // ✅ Diferenciar Sponsor de demais perfis Cliente
      const isSponsor = ctx.user.role === 'sponsor';
      const clientRoles = ['sponsor', 'comite', 'lider_processo', 'gestor_area'];
      const isOtherClient = clientRoles.includes(ctx.user.role);
      
      // Sponsor vê TODAS as avaliações da organização
      if (isSponsor) {
        return db.getComplianceAssessmentsByOrganization(input.organizationId);
      }
      
      // Demais clientes veem apenas avaliações vinculadas a eles
      if (isOtherClient) {
        return db.getComplianceAssessmentsByUserLink(input.organizationId, ctx.user.id);
      }
      
      // Consultores e admins veem todas
      return db.getComplianceAssessmentsByOrganization(input.organizationId);
    }),

  // Endpoint para histórico comparativo de avaliações
  history: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      // ✅ Usuários comuns podem visualizar apenas histórico de sua organização
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        return [];
      }
      const assessments = await db.getComplianceAssessmentsByOrganization(input.organizationId);
      
      // Retorna apenas avaliações concluídas com score, ordenadas por data
      return assessments
        .filter(a => a.status === 'concluida' && a.overallScore !== null)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map(a => ({
          id: a.id,
          title: a.title,
          framework: a.framework,
          date: a.createdAt,
          overallScore: a.overallScore || 0,
          maturityLevel: a.maturityLevel || 1,
          riskScore: a.riskScore || 0,
        }));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getComplianceAssessmentById(input.id);
    }),

  create: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      title: z.string().min(1),
      framework: z.enum(['misto', 'sgd', 'ico', 'cnil', 'seusdados']).default('misto'),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Validacao: Apenas Equipe Interna (Admin/Consultor) pode criar avaliações
      const isInternalTeam = isInternalTeamRole(ctx.user.role);
      
      if (!isInternalTeam) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Apenas Administradores e Consultores podem criar novas avaliações de conformidade.' 
        });
      }
      const id = await db.createComplianceAssessment({
        ...input,
        createdById: ctx.user.id,
        status: 'aguardando_vinculacao', // Novo status: aguardando vinculação do Sponsor
        totalQuestions: 0,
        answeredQuestions: 0,
      });
      // Retornar dados completos da avaliação criada
      const assessment = await db.getComplianceAssessmentById(id);
      
      // Notificar Sponsor da organização
      try {
        const dbInstance = await db.getDb();
        const sponsorUsers = dbInstance ? await dbInstance.select().from(users).where(
          and(
            eq(users.organizationId, input.organizationId),
            eq(users.role, 'sponsor')
          )
        ) : [];
        
        // Enviar notificação para cada Sponsor
        for (const sponsor of sponsorUsers) {
          if (sponsor.email) {
            await sendAssessmentEmail({
              to: sponsor.email,
              subject: `Avaliação de Conformidade Criada - Ação Necessária: ${input.title}`,
              template: 'sponsor_notification',
              data: {
                sponsorName: sponsor.name || 'Sponsor',
                assessmentTitle: input.title,
                framework: input.framework,
                assessmentId: id,
                organizationId: input.organizationId,
              },
            });
          }
        }
      } catch (e) {
        logger.error('Erro ao notificar Sponsor', { error: e, assessmentId: id });
      }

      // Log de atividade
      try {
        const { logActivity } = await import('./dashboardRouter');
        await logActivity({
          organizationId: input.organizationId,
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email,
          activityType: 'avaliacao_criada',
          module: 'conformidade',
          description: `Avaliação de conformidade criada: ${input.title}`,
          entityType: 'compliance_assessment',
          entityId: id,
          entityName: input.title,
        });
      } catch (e) { /* silencioso */ }

      return assessment || { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).optional(),
      framework: z.enum(['misto', 'sgd', 'ico', 'cnil', 'seusdados']).optional(),
      status: z.enum(['rascunho', 'aguardando_vinculacao', 'em_andamento', 'concluida', 'arquivada']).optional(),
      overallScore: z.number().optional(),
      maturityLevel: z.number().optional(),
      riskScore: z.number().optional(),
      totalQuestions: z.number().optional(),
      answeredQuestions: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const assessment = await getAuthorizedThirdPartyAssessmentOrThrow(input.id, ctx);
      const { id, ...data } = input;
      if (data.status === 'concluida') {
        (data as any).completedAt = new Date();
      }
      await db.updateComplianceAssessment(id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteComplianceAssessment(input.id);
      return { success: true };
    }),

  getResponses: protectedProcedure
    .input(z.object({ assessmentId: z.number() }))
    .query(async ({ input }) => {
      return db.getComplianceResponsesByAssessment(input.assessmentId);
    }),

  saveResponse: protectedProcedure
    .input(z.object({
      assessmentId: z.number(),
      domainId: z.number(),
      questionId: z.string(),
      selectedLevel: z.number(),
      riskScore: z.number().optional(),
      notes: z.string().min(1, 'Observações e Evidências são obrigatórias').trim(),
      evidenceUrls: z.array(z.string()).optional(),
      attachments: z.array(z.object({
        fileName: z.string(),
        fileUrl: z.string(),
        fileSize: z.number(),
        fileType: z.string(),
        uploadedAt: z.string(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      // ✅ Validação: Observações são obrigatórias
      if (!input.notes || input.notes.trim().length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'O campo "Observações e Evidências" é obrigatório para avançar a avaliação.'
        });
      }

      const id = await db.saveComplianceResponse({
        ...input,
        evidenceUrls: input.evidenceUrls || [],
        attachments: input.attachments || [],
      });
      return { id };
    }),

  exportPdf: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const assessment = await db.getComplianceAssessmentById(input.id);
      if (!assessment) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Avaliação não encontrada' });
      }

      const organization = await db.getOrganizationById(assessment.organizationId);
      const responses = await db.getComplianceResponsesByAssessment(input.id);
      const actionPlans = await db.getActionPlansByAssessment('compliance', input.id);

      // Calculate domain scores
      const domainScores: Record<number, { total: number; count: number; levels: number[] }> = {};
      for (const response of responses) {
        if (!domainScores[response.domainId]) {
          domainScores[response.domainId] = { total: 0, count: 0, levels: [] };
        }
        domainScores[response.domainId].total += response.selectedLevel;
        domainScores[response.domainId].count += 1;
        domainScores[response.domainId].levels.push(response.selectedLevel);
      }

      const domainNames: Record<number, string> = {
        1: 'Governança e Responsabilização',
        2: 'Bases Legais e Consentimento',
        3: 'Direitos dos Titulares',
        4: 'Segurança da Informação',
        5: 'Gestão de Incidentes',
        6: 'Transferência Internacional',
        7: 'Gestão de Terceiros',
        8: 'Privacidade por Design',
        9: 'Treinamento e Conscientização',
      };

      const domains = Object.entries(domainScores).map(([domainId, data]) => {
        const avgLevel = data.total / data.count;
        const score = (avgLevel / 5) * 100;
        return {
          name: domainNames[parseInt(domainId)] || `Domínio ${domainId}`,
          score,
          maturity: Math.round(avgLevel),
          questionsAnswered: data.count,
          totalQuestions: data.count,
        };
      });

      const maturityLabels: Record<number, string> = {
        1: 'Inicial',
        2: 'Repetitivo',
        3: 'Definido',
        4: 'Gerenciado',
        5: 'Otimizado',
      };

      const riskLabels: Record<string, string> = {
        'baixo': 'Baixo',
        'moderado': 'Moderado',
        'alto': 'Alto',
        'critico': 'Crítico',
      };

      const reportData: ComplianceReportData = {
        organizationName: organization?.name || 'Organização',
        assessmentDate: new Date(assessment.createdAt).toLocaleDateString('pt-BR'),
        framework: assessment.framework.toUpperCase(),
        overallScore: assessment.overallScore || 0,
        maturityLevel: assessment.maturityLevel || 1,
        maturityLabel: maturityLabels[assessment.maturityLevel || 1] || 'Inicial',
        riskLevel: assessment.riskScore && assessment.riskScore >= 15 ? 'Crítico' : assessment.riskScore && assessment.riskScore >= 10 ? 'Alto' : assessment.riskScore && assessment.riskScore >= 5 ? 'Moderado' : 'Baixo',
        domains,
        recommendations: ['Implementar programa formal de governança de dados', 'Revisar e documentar bases legais para tratamento', 'Estabelecer canal de atendimento aos titulares', 'Realizar avaliação de impacto à proteção de dados', 'Implementar programa de treinamento contínuo'],
        actionPlan: actionPlans.slice(0, 10).map(ap => ({
          priority: ap.priority === 'critica' ? 'Alta' : ap.priority === 'alta' ? 'Alta' : ap.priority === 'media' ? 'Média' : 'Baixa',
          action: ap.title,
          domain: 'Geral',
          deadline: ap.dueDate ? new Date(ap.dueDate).toLocaleDateString('pt-BR') : '30 dias',
        })),
        consultantName: ctx.user.name || 'Consultor Seusdados',
        consultantEmail: ctx.user.email || 'dpo@seusdados.com',
      };

      const html = generateComplianceReportHTML(reportData);
      const pdfBuffer = await generatePDF(html);
      const base64 = pdfBuffer.toString('base64');

      return {
        filename: `relatorio-conformidade-${assessment.id}-${Date.now()}.pdf`,
        contentType: 'application/pdf',
        data: base64,
      };
    }),

  // Relatório Premium HTML
  exportPremiumHtml: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const assessment = await db.getComplianceAssessmentById(input.id);
      if (!assessment) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Avaliação não encontrada' });
      }

      const organization = await db.getOrganizationById(assessment.organizationId);
      const responses = await db.getComplianceResponsesByAssessment(input.id);
      const actionPlans = await db.getActionPlansByAssessment('compliance', input.id);

      // Calculate domain scores
      const domainScores: Record<number, { total: number; count: number; levels: number[] }> = {};
      for (const response of responses) {
        if (!domainScores[response.domainId]) {
          domainScores[response.domainId] = { total: 0, count: 0, levels: [] };
        }
        domainScores[response.domainId].total += response.selectedLevel;
        domainScores[response.domainId].count += 1;
        domainScores[response.domainId].levels.push(response.selectedLevel);
      }

      const domainNames: Record<number, string> = {
        1: 'Governança e Responsabilização',
        2: 'Bases Legais e Consentimento',
        3: 'Direitos dos Titulares',
        4: 'Segurança da Informação',
        5: 'Gestão de Incidentes',
        6: 'Transferência Internacional',
        7: 'Gestão de Terceiros',
        8: 'Privacidade por Design',
        9: 'Treinamento e Conscientização',
      };

      const domains = Object.entries(domainScores).map(([domainId, data]) => {
        const avgLevel = data.total / data.count;
        const score = (avgLevel / 5) * 100;
        return {
          name: domainNames[parseInt(domainId)] || `Domínio ${domainId}`,
          score,
          maturity: Math.round(avgLevel),
          questionsAnswered: data.count,
          totalQuestions: data.count,
        };
      });

      const maturityLabels: Record<number, string> = {
        1: 'Inicial',
        2: 'Repetitivo',
        3: 'Definido',
        4: 'Gerenciado',
        5: 'Otimizado',
      };

      const html = generateCompliancePremiumReport({
        organizationName: organization?.name || 'Organização',
        assessmentDate: new Date(assessment.createdAt).toISOString(),
        framework: assessment.framework.toUpperCase(),
        overallScore: assessment.overallScore || 0,
        maturityLevel: assessment.maturityLevel || 1,
        maturityLabel: maturityLabels[assessment.maturityLevel || 1] || 'Inicial',
        riskLevel: assessment.riskScore && assessment.riskScore >= 15 ? 'Crítico' : assessment.riskScore && assessment.riskScore >= 10 ? 'Alto' : assessment.riskScore && assessment.riskScore >= 5 ? 'Moderado' : 'Baixo',
        domains,
        recommendations: ['Implementar programa formal de governança de dados', 'Revisar e documentar bases legais para tratamento', 'Estabelecer canal de atendimento aos titulares', 'Realizar avaliação de impacto à proteção de dados', 'Implementar programa de treinamento contínuo'],
        actionPlan: actionPlans.slice(0, 10).map(ap => ({
          priority: ap.priority === 'critica' ? 'Alta' : ap.priority === 'alta' ? 'Alta' : ap.priority === 'media' ? 'Média' : 'Baixa',
          action: ap.title,
          domain: 'Geral',
          deadline: ap.dueDate ? new Date(ap.dueDate).toLocaleDateString('pt-BR') : '30 dias',
        })),
        consultantName: ctx.user.name || 'Consultor Seusdados',
        consultantEmail: ctx.user.email || 'dpo@seusdados.com',
      });

      return {
        html,
        filename: `relatorio-conformidade-premium-${assessment.id}.html`,
      };
    }),

  ...complianceEndpointsExtra,
});


// ==================== THIRD PARTY ASSESSMENT ROUTER ====================
const thirdPartyAssessmentRouter = router({
  list: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      // Bloquear acesso de usuários Cliente
      if (isClientRole(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado. Este módulo não está disponível para seu perfil.' });
      }
      
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        return [];
      }
      return db.getThirdPartyAssessmentsByOrganization(input.organizationId);
    }),

  listByThirdParty: protectedProcedure
    .input(z.object({ thirdPartyId: z.number() }))
    .query(async ({ input, ctx }) => {
      const thirdParty = await getAuthorizedThirdPartyOrThrow(input.thirdPartyId, ctx);
      return db.getThirdPartyAssessmentsByThirdParty(thirdParty.id);
    }),

  // Histórico comparativo de avaliações de terceiros por organização
  history: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        return [];
      }
      const assessments = await db.getThirdPartyAssessmentsByOrganization(input.organizationId);
      
      return assessments
        .filter(a => a.status === 'concluida' && a.overallRiskScore !== null)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map(a => ({
          id: a.id,
          title: a.title,
          thirdPartyId: a.thirdPartyId,
          date: a.createdAt,
          riskScore: a.overallRiskScore || 0,
          riskLevel: a.riskClassification || 'baixo',
          overallScore: a.overallRiskScore || 0,
        }));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return getAuthorizedThirdPartyAssessmentOrThrow(input.id, ctx);
    }),

  create: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      thirdPartyId: z.number(),
      title: z.string().min(1),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Validacao: Apenas Equipe Interna pode criar avaliações
      const internalTeamRoles = ['admin_global', 'consultor'];
      const isInternalTeam = internalTeamRoles.includes(ctx.user.role);
      
      if (!isInternalTeam) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas Administradores e Consultores podem criar avaliações.' });
      }
      
      const thirdParty = await getAuthorizedThirdPartyOrThrow(input.thirdPartyId, ctx);
      if (thirdParty.organizationId !== input.organizationId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Terceiro não pertence à organização informada' });
      }
      const id = await db.createThirdPartyAssessment({
        ...input,
        createdById: ctx.user.id,
        totalQuestions: getTotalDueDiligenceQuestions(),
        answeredQuestions: 0,
      });

      // Log de atividade
      try {
        const { logActivity } = await import('./dashboardRouter');
        await logActivity({
          organizationId: input.organizationId,
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email,
          activityType: 'terceiro_avaliado',
          module: 'due_diligence',
          description: `Avaliação de terceiro criada: ${input.title}`,
          entityType: 'third_party_assessment',
          entityId: id,
          entityName: input.title,
        });
      } catch (e) { /* silencioso */ }

      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).optional(),
      status: z.enum(['rascunho', 'em_andamento', 'concluida', 'arquivada']).optional(),
      overallRiskScore: z.number().optional(),
      riskClassification: z.enum(['baixo', 'moderado', 'alto', 'critico']).optional(),
      totalQuestions: z.number().optional(),
      answeredQuestions: z.number().optional(),
      recommendation: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      if (data.status === 'concluida') {
        (data as any).completedAt = new Date();
      }
      await db.updateThirdPartyAssessment(id, data);
      
      // Registrar evento de maturidade quando avaliação é concluída
      if (data.status === 'concluida') {
        const assessment = await db.getThirdPartyAssessmentById(id);
        if (assessment) {
          await maturityEvents.onTerceiroAvaliacaoConcluida(
            String(assessment.organizationId),
            String(id),
            data.riskClassification || 'moderado',
            data.overallRiskScore || 0
          );
        }
      }
      
      return { success: true };
    }),

  getResponses: protectedProcedure
    .input(z.object({ assessmentId: z.number() }))
.query(async ({ input, ctx }) => {
      await getAuthorizedThirdPartyAssessmentOrThrow(input.assessmentId, ctx);
      return db.getThirdPartyResponsesByAssessment(input.assessmentId);
    }),

  saveResponse: protectedProcedure
    .input(z.object({
      assessmentId: z.number(),
      questionId: z.number(),
      selectedLevel: z.number(),
      impactScore: z.number(),
      probabilityScore: z.number(),
      riskScore: z.number(),
      notes: z.string().optional(),
      evidenceUrls: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await getAuthorizedThirdPartyAssessmentOrThrow(input.assessmentId, ctx);
      const id = await db.saveThirdPartyResponse({
        ...input,
        evidenceUrls: input.evidenceUrls || [],
      });
      return { id };
    }),

  exportPdf: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const assessment = await getAuthorizedThirdPartyAssessmentOrThrow(input.id, ctx);
      if (!assessment) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Avaliação não encontrada' });
      }

      const organization = await db.getOrganizationById(assessment.organizationId);
      const thirdParty = await db.getThirdPartyById(assessment.thirdPartyId);
      const responses = await db.getThirdPartyResponsesByAssessment(input.id);

      // Calculate category scores
      const categoryNames: Record<number, string> = {
        1: 'Governança Corporativa',
        2: 'Segurança da Informação',
        3: 'Proteção de Dados',
        4: 'Conformidade Legal',
        5: 'Gestão de Riscos',
        6: 'Continuidade de Negócios',
      };

      const categoryScores: Record<number, { total: number; count: number; max: number }> = {};
      for (const response of responses) {
        const catId = Math.ceil(response.questionId / 4); // Assuming 4 questions per category
        if (!categoryScores[catId]) {
          categoryScores[catId] = { total: 0, count: 0, max: 0 };
        }
        categoryScores[catId].total += response.selectedLevel;
        categoryScores[catId].count += 1;
        categoryScores[catId].max += 5;
      }

      const categories = Object.entries(categoryScores).map(([catId, data]) => ({
        name: categoryNames[parseInt(catId)] || `Categoria ${catId}`,
        score: data.total,
        maxScore: data.max,
        percentage: data.max > 0 ? (data.total / data.max) * 100 : 0,
      }));

      // Calculate average probability and impact
      let avgProbability = 3;
      let avgImpact = 3;
      if (responses.length > 0) {
        avgProbability = Math.round(responses.reduce((sum, r) => sum + r.probabilityScore, 0) / responses.length);
        avgImpact = Math.round(responses.reduce((sum, r) => sum + r.impactScore, 0) / responses.length);
      }

      const riskLabels: Record<string, string> = {
        'baixo': 'Baixo',
        'moderado': 'Moderado',
        'alto': 'Alto',
        'critico': 'Crítico',
      };

      const typeLabels: Record<string, string> = {
        'fornecedor': 'Fornecedor',
        'parceiro': 'Parceiro',
        'suboperador': 'Suboperador',
        'outro': 'Outro',
      };

      const reportData: ThirdPartyReportData = {
        organizationName: organization?.name || 'Organização',
        thirdPartyName: thirdParty?.name || 'Terceiro',
        thirdPartyType: typeLabels[thirdParty?.type || 'fornecedor'] || 'Fornecedor',
        assessmentDate: new Date(assessment.createdAt).toLocaleDateString('pt-BR'),
        overallRiskScore: assessment.overallRiskScore || avgProbability * avgImpact,
        riskClassification: riskLabels[assessment.riskClassification || 'moderado'] || 'Moderado',
        probabilityScore: avgProbability,
        impactScore: avgImpact,
        categories,
        criticalFindings: assessment.overallRiskScore && assessment.overallRiskScore >= 15 ? ['Nível de risco elevado identificado', 'Requer ações corretivas imediatas', 'Monitoramento contínuo recomendado'] : [],
        recommendations: ['Realizar auditorias periódicas de conformidade', 'Solicitar evidências de certificações de segurança', 'Revisar cláusulas contratuais de proteção de dados', 'Estabelecer SLAs para resposta a incidentes', 'Implementar programa de monitoramento contínuo'],
        consultantName: ctx.user.name || 'Consultor Seusdados',
        consultantEmail: ctx.user.email || 'dpo@seusdados.com',
      };

      const html = generateThirdPartyReportHTML(reportData);
      const pdfBuffer = await generatePDF(html);
      const base64 = pdfBuffer.toString('base64');

      return {
        filename: `relatorio-due-diligence-${thirdParty?.name?.replace(/\s+/g, '-') || assessment.id}-${Date.now()}.pdf`,
        contentType: 'application/pdf',
        data: base64,
      };
    }),

  // Relatório Premium HTML
  exportPremiumHtml: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const assessment = await getAuthorizedThirdPartyAssessmentOrThrow(input.id, ctx);
      if (!assessment) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Avaliação não encontrada' });
      }

      const organization = await db.getOrganizationById(assessment.organizationId);
      const thirdParty = await db.getThirdPartyById(assessment.thirdPartyId);
      const responses = await db.getThirdPartyResponsesByAssessment(input.id);

      const categoryNames: Record<number, string> = {
        1: 'Governança Corporativa',
        2: 'Segurança da Informação',
        3: 'Proteção de Dados',
        4: 'Conformidade Legal',
        5: 'Gestão de Riscos',
        6: 'Continuidade de Negócios',
      };

      const categoryScores: Record<number, { total: number; count: number; max: number }> = {};
      for (const response of responses) {
        const catId = Math.ceil(response.questionId / 4);
        if (!categoryScores[catId]) {
          categoryScores[catId] = { total: 0, count: 0, max: 0 };
        }
        categoryScores[catId].total += response.selectedLevel;
        categoryScores[catId].count += 1;
        categoryScores[catId].max += 5;
      }

      const categories = Object.entries(categoryScores).map(([catId, data]) => ({
        name: categoryNames[parseInt(catId)] || `Categoria ${catId}`,
        score: data.total,
        maxScore: data.max,
        percentage: data.max > 0 ? (data.total / data.max) * 100 : 0,
      }));

      let avgProbability = 3;
      let avgImpact = 3;
      if (responses.length > 0) {
        avgProbability = Math.round(responses.reduce((sum, r) => sum + r.probabilityScore, 0) / responses.length);
        avgImpact = Math.round(responses.reduce((sum, r) => sum + r.impactScore, 0) / responses.length);
      }

      const typeLabels: Record<string, string> = {
        'fornecedor': 'Fornecedor',
        'parceiro': 'Parceiro',
        'suboperador': 'Suboperador',
        'outro': 'Outro',
      };

      const riskLabels: Record<string, string> = {
        'baixo': 'Baixo',
        'moderado': 'Moderado',
        'alto': 'Alto',
        'critico': 'Crítico',
      };

      const html = generateDueDiligencePremiumReport({
        organizationName: organization?.name || 'Organização',
        thirdPartyName: thirdParty?.name || 'Terceiro',
        thirdPartyType: typeLabels[thirdParty?.type || 'fornecedor'] || 'Fornecedor',
        assessmentDate: new Date(assessment.createdAt).toISOString(),
        overallRiskScore: assessment.overallRiskScore || avgProbability * avgImpact,
        riskClassification: riskLabels[assessment.riskClassification || 'moderado'] || 'Moderado',
        probabilityScore: avgProbability,
        impactScore: avgImpact,
        categories,
        criticalFindings: assessment.overallRiskScore && assessment.overallRiskScore >= 15 ? ['Nível de risco elevado identificado', 'Requer ações corretivas imediatas', 'Monitoramento contínuo recomendado'] : [],
        recommendations: ['Realizar auditorias periódicas de conformidade', 'Solicitar evidências de certificações de segurança', 'Revisar cláusulas contratuais de proteção de dados', 'Estabelecer SLAs para resposta a incidentes', 'Implementar programa de monitoramento contínuo'],
        consultantName: ctx.user.name || 'Consultor Seusdados',
        consultantEmail: ctx.user.email || 'dpo@seusdados.com',
      });

      return {
        html,
        filename: `relatorio-due-diligence-premium-${thirdParty?.name?.replace(/\s+/g, '-') || assessment.id}.html`,
      };
    }),
});

// ==================== ACTION PLAN ROUTER ====================
const actionPlanRouter = router({
  list: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (!isInternalActionPlanRole(ctx.user.role) && ctx.user.organizationId !== input.organizationId) {
        return [];
      }

      const plans = await db.getActionPlansByOrganization(input.organizationId);
      const isClientUser = isClientActionPlanRole(ctx.user.role);
      const filteredPlans = isClientUser
        ? plans.filter((p: any) => p.assessmentType === 'compliance')
        : plans;

      const database = await db.getDb();
      if (!database || filteredPlans.length === 0) return filteredPlans;

      const complianceIds = Array.from(new Set(filteredPlans.filter((p: any) => p.assessmentType === 'compliance').map((p: any) => p.assessmentId)));
      const contractIds = Array.from(new Set(filteredPlans.filter((p: any) => p.assessmentType === 'contract_analysis').map((p: any) => p.assessmentId)));
      const thirdPartyIds = Array.from(new Set(filteredPlans.filter((p: any) => p.assessmentType === 'third_party').map((p: any) => p.assessmentId)));

      const originNames: Record<string, string> = {};
      if (complianceIds.length > 0) {
        try {
          const { rows: uaRows } = await database.execute(`SELECT id, "assessmentCode", framework FROM ua_assessments WHERE id IN (${complianceIds.join(',')})`) as any;
          (uaRows as any[]).forEach((r) => {
            const frameworkLabel: Record<string, string> = { seusdados: 'Seusdados', sgd: 'SGD', misto: 'Misto', ico: 'ICO', cnil: 'CNIL' };
            originNames[`compliance_${r.id}`] = `Avaliação ${frameworkLabel[r.framework] || r.framework} (${r.assessmentCode})`;
          });
        } catch (_) {
          /* tabela pode não existir */
        }
        const missingIds = complianceIds.filter((id) => !originNames[`compliance_${id}`]);
        if (missingIds.length > 0) {
          try {
            const { rows: caRows } = await database.execute(`SELECT id, title, framework FROM compliance_assessments WHERE id IN (${missingIds.join(',')})`) as any;
            (caRows as any[]).forEach((r) => {
              originNames[`compliance_${r.id}`] = r.title || r.framework || 'Avaliação';
            });
          } catch (_) {
            /* tabela pode não existir */
          }
        }
      }
      if (contractIds.length > 0) {
        const { rows: rows } = await database.execute(`SELECT id, "contractName" FROM contract_analyses WHERE id IN (${contractIds.join(',')})`) as any;
        (rows as any[]).forEach((r) => {
          originNames[`contract_analysis_${r.id}`] = r.contractName || 'Contrato';
        });
      }
      if (thirdPartyIds.length > 0) {
        const { rows: rows } = await database.execute(`SELECT id, name FROM third_parties WHERE id IN (${thirdPartyIds.join(',')})`) as any;        (rows as any[]).forEach((r) => {
          originNames[`third_party_${r.id}`] = r.name || 'Terceiro';
        });
      }

      return filteredPlans.map((p: any) => ({
        ...p,
        originName: originNames[`${p.assessmentType}_${p.assessmentId}`] || null,
      }));
    }),

  listByAssessment: protectedProcedure
    .input(z.object({
      assessmentType: z.enum(['compliance', 'third_party', 'contract_analysis', 'dpia']),
      assessmentId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const plans = await db.getActionPlansByAssessment(input.assessmentType as any, input.assessmentId);
      if (plans.length === 0) return [];
      const firstPlan = plans[0] as any;
      if (!canUserAccessActionPlan(ctx.user as any, firstPlan, { allowResponsible: false, allowSameOrgClient: true })) {
        return [];
      }
      const isClientUser = ['sponsor', 'comite', 'lider_processo', 'gestor_area', 'respondente'].includes(ctx.user.role);
      return isClientUser ? plans.filter((p: any) => p.assessmentType === 'compliance') : plans;
    }),

  listByType: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      assessmentType: z.enum(['compliance', 'contract_analysis', 'third_party', 'dpia']),
    }))
    .query(async ({ input, ctx }) => {
      if (!isInternalActionPlanRole(ctx.user.role) && ctx.user.organizationId !== input.organizationId) {
        return [];
      }
      if (isClientActionPlanRole(ctx.user.role) && input.assessmentType !== 'compliance') {
        return [];
      }
      const plans = await db.getActionPlansByOrganization(input.organizationId);
      return plans.filter((p: any) => p.assessmentType === input.assessmentType);
    }),

  create: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      assessmentType: z.enum(['compliance', 'third_party', 'contract_analysis', 'dpia']),
      assessmentId: z.number(),
      title: z.string().min(1),
      description: z.string().optional(),
      priority: z.enum(['baixa', 'media', 'alta', 'critica']).default('media'),
      responsibleId: z.number().optional(),
      dueDate: z.date().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const isInternal = isInternalActionPlanRole(ctx.user.role);
      const isSameOrg = ctx.user.organizationId === input.organizationId;
      const canClientCreate = ['sponsor', 'comite'].includes(ctx.user.role);

      if (!isInternal && (!isSameOrg || !canClientCreate)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para criar plano de ação nesta organização.' });
      }
      if (!isInternal && input.assessmentType !== 'compliance') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Perfis cliente só podem criar ações de maturidade.' });
      }

      const data = {
        ...input,
        dueDate: input.dueDate ? input.dueDate.toISOString() : undefined,
      };
      const id = await db.createActionPlan(data as any);
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      priority: z.enum(['baixa', 'media', 'alta', 'critica']).optional(),
      status: z.enum(['pendente', 'em_andamento', 'concluida_cliente', 'pendente_validacao_dpo', 'concluida', 'cancelada', 'recusada_cliente', 'aguardando_validacao', 'aguardando_nova_validacao', 'em_validacao', 'ajustes_solicitados']).optional(),
      responsibleId: z.number().optional(),
      dueDate: z.date().optional(),
      notes: z.string().optional(),
      observations: z.string().optional(),
      clientRejectionReason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const action = await getActionPlanById(id);
      if (!action) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
      }
      assertUserCanAccessActionPlan(ctx.user as any, action, { allowResponsible: true, allowSameOrgClient: true });

      const isInternal = isInternalActionPlanRole(ctx.user.role);
      const isResponsible = action.responsibleId === ctx.user.id;
      const canEditDueDate = ['admin_global', 'sponsor', 'comite'].includes(ctx.user.role);

      const restrictedForClients = ['title', 'description', 'priority', 'responsibleId', 'clientRejectionReason'] as const;
      if (!isInternal) {
        for (const field of restrictedForClients) {
          if ((rest as any)[field] !== undefined) {
            throw new TRPCError({ code: 'FORBIDDEN', message: `O campo ${field} só pode ser alterado pela equipe interna.` });
          }
        }
      }

      if (rest.dueDate !== undefined && !canEditDueDate) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas Administrador Global, Sponsor ou Comitê podem editar o prazo de uma ação.' });
      }

      if (!isInternal && (rest.status !== undefined || rest.notes !== undefined || rest.observations !== undefined) && !isResponsible) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Somente o responsável pela ação pode registrar andamento, observações ou alterar seu status.' });
      }

      if (!isInternal && rest.status !== undefined) {
        const allowedClientStatuses = ['em_andamento', 'concluida_cliente'];
        if (!allowedClientStatuses.includes(rest.status)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Perfis cliente não podem definir este status manualmente.' });
        }
      }

      let dueDateHistoryEntry: string | null = null;
      if (rest.dueDate !== undefined) {
        const currentDueDate = action.dueDate;
        const oldDateStr = currentDueDate ? new Date(currentDueDate).toLocaleDateString('pt-BR') : 'sem prazo';
        const newDateStr = rest.dueDate.toLocaleDateString('pt-BR');
        if (oldDateStr !== newDateStr) {
          dueDateHistoryEntry = `Prazo alterado de ${oldDateStr} para ${newDateStr}`;
        }
      }

      const data: any = {};
      for (const key of ['title', 'description', 'priority', 'status', 'responsibleId', 'notes', 'observations', 'clientRejectionReason'] as const) {
        if ((rest as any)[key] !== undefined) {
          data[key] = (rest as any)[key];
        }
      }
      if (rest.dueDate !== undefined) {
        data.dueDate = rest.dueDate ? rest.dueDate.toISOString() : null;
      }

      if (data.status === 'concluida_cliente') {
        data.clientCompletedAt = new Date().toISOString();
        data.clientCompletedById = ctx.user.id;
      }
      if (data.status === 'concluida') {
        data.completedAt = new Date().toISOString();
        data.dpoValidatedAt = new Date().toISOString();
        data.dpoValidatedById = ctx.user.id;
      }
      if (data.status === 'recusada_cliente') {
        data.clientCompletedAt = new Date().toISOString();
        data.clientCompletedById = ctx.user.id;
      }

      await db.updateActionPlan(id, data);

      if (dueDateHistoryEntry) {
        try {
          const database = await db.getDb();
          if (database) {
            const oldDate = dueDateHistoryEntry.match(/de (.+?) para/)?.[1] || null;
            const newDate = dueDateHistoryEntry.match(/para (.+)$/)?.[1] || null;
            await database.execute(sql`
              INSERT INTO action_plan_history ("actionPlanId", "changedById", "changeType", "previousValue", "newValue", notes, "createdAt") VALUES (${id}, ${ctx.user.id}, 'prazo', ${oldDate}, ${newDate}, ${`${dueDateHistoryEntry}. Alterado por: ${ctx.user.name || ctx.user.email} (${ctx.user.role})`}, NOW())
            `);
          }
        } catch (_) { /* não bloquear a operação */ }
      }

      return { success: true };
    }),

  completeByClient: protectedProcedure
    .input(z.object({
      id: z.number(),
      evidence: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const action = await getActionPlanById(input.id);
      if (!action) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
      }
      assertResponsibleOrInternal(ctx.user as any, action);
      await db.updateActionPlan(input.id, {
        status: 'concluida_cliente',
        clientCompletedAt: new Date().toISOString(),
        clientCompletedById: ctx.user.id,
        notes: input.evidence ? `Evidência: ${input.evidence}` : action.notes,
      } as any);
      return { success: true };
    }),

  requestDPOValidation: protectedProcedure
    .input(z.object({
      assessmentType: z.enum(['compliance', 'third_party', 'contract_analysis']),
      assessmentId: z.number(),
      organizationId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const actions = await db.getActionPlansByAssessment(input.assessmentType, input.assessmentId);
      if (!actions.length) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Nenhuma ação encontrada para esta avaliação.' });
      }

      const firstAction = actions[0] as any;
      const isInternal = isInternalActionPlanRole(ctx.user.role);
      if (!isInternal && ctx.user.organizationId !== firstAction.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para solicitar validação desta organização.' });
      }
      if (!isInternal && firstAction.assessmentType !== 'compliance') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Perfis cliente só podem solicitar validação para ações de maturidade.' });
      }
      if (input.organizationId !== firstAction.organizationId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'organizationId divergente da organização da ação.' });
      }

      const ticketService = await import('./ticketService');
      const { id: ticketId, ticketNumber } = await ticketService.createTicket({
        organizationId: firstAction.organizationId,
        title: `Validação de Plano de Ação - ${input.assessmentType}`,
        description: `O cliente concluiu o plano de ação e solicita validação do DPO.

Tipo: ${input.assessmentType}
ID da Avaliação: ${input.assessmentId}`,
        priority: 'media',
        status: 'aberto',
        category: 'conformidade',
        createdById: ctx.user.id,
        source: 'plano_acao_validacao',
        sourceReferenceId: input.assessmentId,
        slaLevel: 'padrao',
      } as any);

      for (const action of actions) {
        if ((action as any).status === 'concluida_cliente') {
          await db.updateActionPlan((action as any).id, {
            status: 'pendente_validacao_dpo',
            dpoValidationTicketId: ticketId,
          } as any);
        }
      }

      return {
        success: true,
        ticketId,
        ticketNumber,
        message: `Ticket #${ticketNumber} criado para validação do DPO`,
      };
    }),

  validateByDPO: protectedProcedure
    .input(z.object({
      assessmentType: z.enum(['compliance', 'third_party', 'contract_analysis']),
      assessmentId: z.number(),
      approved: z.boolean(),
      comments: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!isInternalActionPlanRole(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas DPO ou consultores podem validar planos de ação' });
      }

      const actions = await db.getActionPlansByAssessment(input.assessmentType, input.assessmentId);
      if (!actions.length) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Nenhuma ação encontrada para esta avaliação.' });
      }

      const now = new Date().toISOString();
      for (const action of actions) {
        if ((action as any).status === 'pendente_validacao_dpo') {
          await db.updateActionPlan((action as any).id, {
            status: input.approved ? 'concluida' : 'pendente',
            dpoValidatedAt: now,
            dpoValidatedById: ctx.user.id,
            completedAt: input.approved ? now : null,
            notes: input.comments ? `Validação DPO: ${input.comments}` : (action as any).notes,
          } as any);
        }
      }

      return {
        success: true,
        message: input.approved ? 'Plano de ação validado com sucesso' : 'Plano de ação devolvido para revisão',
      };
    }),

  rejectByClient: protectedProcedure
    .input(z.object({
      id: z.number(),
      reason: z.string().min(10, 'Motivo deve ter pelo menos 10 caracteres'),
    }))
    .mutation(async ({ input, ctx }) => {
      const action = await getActionPlanById(input.id);
      if (!action) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
      }
      assertResponsibleOrInternal(ctx.user as any, action);
      await db.updateActionPlan(input.id, {
        status: 'recusada_cliente',
        clientCompletedAt: new Date().toISOString(),
        clientCompletedById: ctx.user.id,
        clientRejectionReason: input.reason,
      } as any);
      return { success: true };
    }),

  checkDeadlines: protectedProcedure
    .input(z.object({
      daysThreshold: z.number().default(7),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!isInternalActionPlanRole(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas a equipe interna pode executar a verificação de prazos.' });
      }
      const { checkAndNotifyUpcomingDeadlines } = await import('./actionPlanNotifications');
      return checkAndNotifyUpcomingDeadlines(input.daysThreshold);
    }),

  getDeadlinesReport: protectedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      daysThreshold: z.number().default(7),
    }))
    .query(async ({ input, ctx }) => {
      const { getUpcomingDeadlinesReport } = await import('./actionPlanNotifications');
      if (isInternalActionPlanRole(ctx.user.role)) {
        return getUpcomingDeadlinesReport(input.organizationId, input.daysThreshold);
      }
      if (!ctx.user.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Usuário sem organização vinculada.' });
      }
      if (input.organizationId && input.organizationId !== ctx.user.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para acessar prazos desta organização.' });
      }
      const report = await getUpcomingDeadlinesReport(ctx.user.organizationId, input.daysThreshold);
      return {
        overdue: report.overdue.filter((item: any) => item.assessmentType === 'compliance'),
        dueToday: report.dueToday.filter((item: any) => item.assessmentType === 'compliance'),
        dueSoon: report.dueSoon.filter((item: any) => item.assessmentType === 'compliance'),
        summary: {
          totalOverdue: report.overdue.filter((item: any) => item.assessmentType === 'compliance').length,
          totalDueToday: report.dueToday.filter((item: any) => item.assessmentType === 'compliance').length,
          totalDueSoon: report.dueSoon.filter((item: any) => item.assessmentType === 'compliance').length,
          criticalCount: [
            ...report.overdue,
            ...report.dueToday,
            ...report.dueSoon,
          ].filter((item: any) => item.assessmentType === 'compliance' && item.priority === 'critica').length,
        },
      };
    }),

  getCronJobStatus: protectedProcedure
    .query(async ({ ctx }) => {
      if (!isInternalActionPlanRole(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas a equipe interna pode consultar o status do cron.' });
      }
      const { getCronJobStatus } = await import('./actionPlanCronJob');
      return getCronJobStatus();
    }),

  triggerManualCheck: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (!isInternalActionPlanRole(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas a equipe interna pode executar a verificação manual.' });
      }
      const { triggerManualCheck } = await import('./actionPlanCronJob');
      return triggerManualCheck();
    }),

  updateCronJobConfig: adminProcedure
    .input(z.object({
      intervalMs: z.number().optional(),
      daysThreshold: z.number().optional(),
      enabled: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { updateCronJobConfig } = await import('./actionPlanCronJob');
      updateCronJobConfig(input);
      return { success: true };
    }),

  // Listar tarefas pendentes (para dashboard de pendências)

  getPendingTasks: protectedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      if (!isInternalActionPlanRole(ctx.user.role) && input?.organizationId && input.organizationId !== ctx.user.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para acessar pendências desta organização.' });
      }

      const orgs = await db.getAllOrganizations();
      let plans: any[] = [];
      for (const org of orgs) {
        const orgPlans = await db.getActionPlansByOrganization(org.id);
        plans = plans.concat(orgPlans);
      }

      plans = plans.filter((p: any) =>
        p.status === 'pendente' ||
        p.status === 'em_andamento' ||
        p.status === 'pendente_validacao_dpo'
      );

      if (input?.organizationId) {
        plans = plans.filter((p: any) => p.organizationId === input.organizationId);
      }

      if (!isInternalActionPlanRole(ctx.user.role) && ctx.user.organizationId) {
        plans = plans.filter((p: any) => p.organizationId === ctx.user.organizationId && p.assessmentType === 'compliance');
      }

      const enrichedPlans = await Promise.all(plans.map(async (plan: any) => {
        const org = await db.getOrganizationById(plan.organizationId);
        const responsible = plan.responsibleId ? await db.getUserById(plan.responsibleId) : null;
        return {
          ...plan,
          organizationName: org?.name || 'Desconhecida',
          responsibleName: responsible?.name || null,
        };
      }));

      return enrichedPlans.slice(0, 50);
    }),

  assignResponsible: protectedProcedure
    .input(z.object({
      actionPlanId: z.number(),
      responsibleId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!['sponsor', 'admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas Sponsor, Admin Global ou Consultor podem alterar o responsável de uma ação.' });
      }
      const action = await getActionPlanById(input.actionPlanId);
      if (!action) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
      }
      assertUserCanAccessActionPlan(ctx.user as any, action, { allowResponsible: false, allowSameOrgClient: true });

      const responsible = await db.getUserById(input.responsibleId);
      if (!responsible) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário responsável não encontrado' });
      }
      if (responsible.organizationId !== action.organizationId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'O responsável deve pertencer à mesma organização da ação.' });
      }

      const isReassignment = !!action.responsibleId && action.responsibleId !== input.responsibleId;
      const changeType = isReassignment ? 'reatribuicao' : 'atribuicao';
      const previousResponsible = isReassignment ? await db.getUserById(action.responsibleId) : null;

      try {
        const dbConn = await db.getDb();
        if (dbConn) {
          await dbConn.insert(actionPlanHistory).values({
            actionPlanId: input.actionPlanId,
            changedById: ctx.user.id,
            changeType,
            previousValue: previousResponsible ? (previousResponsible.name || previousResponsible.email || '') : null,
            newValue: responsible.name || responsible.email || '',
            notes: isReassignment
              ? `Responsável alterado de "${previousResponsible?.name || previousResponsible?.email || 'anterior'}" para "${responsible.name || responsible.email}" por ${ctx.user.name || ctx.user.email}. Status resetado para Pendente.`
              : `Responsável "${responsible.name || responsible.email}" vinculado por ${ctx.user.name || ctx.user.email}.`,
          });
        }
      } catch (histErr) {
        console.error('Erro ao registrar histórico de atribuição:', histErr);
      }

      const updateData: any = { responsibleId: input.responsibleId };
      if (isReassignment) {
        updateData.status = 'pendente';
        updateData.clientCompletedAt = null;
        updateData.clientCompletedById = null;
        updateData.clientRejectionReason = null;
      }
      await db.updateActionPlan(input.actionPlanId, updateData);

      const org = await db.getOrganizationById(action.organizationId);
      try {
        const { sendActionPlanResponsibleEmail } = await import('./emailService');
        const baseUrl = getAppBaseUrl();

        await sendActionPlanResponsibleEmail({
          responsibleName: responsible.name || responsible.email,
          responsibleEmail: responsible.email,
          actionTitle: action.title,
          actionDescription: action.description || '',
          actionPriority: action.priority,
          dueDate: action.dueDate,
          assessmentTitle: `Avaliação #${action.assessmentId}`,
          organizationName: org?.name || 'Organização',
          assignedByName: ctx.user.name || ctx.user.email || 'Seusdados',
          platformUrl: `${baseUrl}/avaliacoes/${action.assessmentId}/consultor?tab=plano-de-acao&actionId=${input.actionPlanId}`,
        });
      } catch (err) {
        console.error('Erro ao enviar notificação de responsável:', err);
      }

      return {
        success: true,
        responsibleName: responsible.name || responsible.email,
        message: `Responsável ${responsible.name || responsible.email} atribuído com sucesso`,
      };
    }),

  uploadEvidence: protectedProcedure
    .input(z.object({
      actionPlanId: z.number(),
      fileName: z.string().min(1),
      fileData: z.string(),
      mimeType: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const action = await getActionPlanById(input.actionPlanId);
      if (!action) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
      }
      assertResponsibleOrInternal(ctx.user as any, action);

      const assessmentFolder = await gedService.getOrCreateEvidenceFolderForAssessment(
        ctx.user.id,
        action.organizationId,
        action.assessmentId,
        'plano_acao'
      );

      const { storagePut } = await import('./storage');
      const buffer = Buffer.from(input.fileData, 'base64');
      const randomSuffix = Math.random().toString(36).substring(2, 10);
      const fileKey = `ged/org-${action.organizationId}/evidencias-plano-acao/${assessmentFolder.name}/${input.fileName}-${randomSuffix}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      void url;

      const gedUserRole = (ctx.user.role || 'sponsor') as gedService.UserRole;
      const gedDoc = await gedService.uploadDocument(
        { id: ctx.user.id, role: gedUserRole, organizationId: action.organizationId },
        {
          name: input.fileName,
          description: input.description || `Evidência do plano de ação #${input.actionPlanId}`,
          folderId: assessmentFolder.id,
          file: buffer,
          fileName: input.fileName,
          mimeType: input.mimeType,
          tags: ['evidência', 'plano-de-ação'],
          linkedEntityType: 'action_plan',
          linkedEntityId: input.actionPlanId,
        }
      );

      const evidenceId = await db.addActionPlanEvidence({
        actionPlanId: input.actionPlanId,
        documentId: gedDoc.id,
        description: input.description || null,
        addedById: ctx.user.id,
      });

      return {
        success: true,
        evidenceId,
        documentId: gedDoc.id,
        fileUrl: gedDoc.fileUrl,
        gedFolderId: assessmentFolder.id,
      };
    }),

  linkGedDocument: protectedProcedure
    .input(z.object({
      actionPlanId: z.number(),
      documentId: z.number(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const action = await getActionPlanById(input.actionPlanId);
      if (!action) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
      }
      assertResponsibleOrInternal(ctx.user as any, action);
      const gedModule = await import('./gedService');
      const doc = await gedModule.getDocumentById(
        { id: ctx.user.id, role: (ctx.user.role || 'sponsor') as gedModule.UserRole, organizationId: action.organizationId },
        input.documentId
      );
      if (!doc) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Documento não encontrado no GED' });
      }
      const evidenceId = await db.addActionPlanEvidence({
        actionPlanId: input.actionPlanId,
        documentId: input.documentId,
        description: input.description || doc.name,
        addedById: ctx.user.id,
      });
      return { success: true, evidenceId };
    }),

  listGedDocumentsForEvidence: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      folderId: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      // Verificar acesso: admin_global/consultor podem acessar qualquer org, demais só a própria
      const userRole = ctx.user.role || 'sponsor';
      const isGlobalAccess = ['admin_global', 'consultor'].includes(userRole);
      if (!isGlobalAccess && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para acessar documentos desta organização' });
      }
      const gedService = await import('./gedService');
      const docs = await gedService.listOrganizationDocuments(input.organizationId, input.folderId);
      return docs;
    }),

  // Listar pastas do GED da organização (com isolamento por organização)

  listGedFoldersForEvidence: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      parentFolderId: z.number().optional().nullable(),
    }))
    .query(async ({ input, ctx }) => {
      // Verificar acesso: admin_global/consultor podem acessar qualquer org, demais só a própria
      const userRole = ctx.user.role || 'sponsor';
      const isGlobalAccess = ['admin_global', 'consultor'].includes(userRole);
      if (!isGlobalAccess && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para acessar pastas desta organização' });
      }
      const gedService = await import('./gedService');
      return gedService.listOrganizationFolders(input.organizationId, input.parentFolderId);
    }),

  // Listar evidências de uma ação do plano

  getActionEvidences: protectedProcedure
    .input(z.object({ actionPlanId: z.number() }))
    .query(async ({ input, ctx }) => {
      const action = await getActionPlanById(input.actionPlanId);
      if (!action) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
      }
      assertUserCanAccessActionPlan(ctx.user as any, action, { allowResponsible: true, allowSameOrgClient: true });
      return db.getActionPlanEvidences(input.actionPlanId);
    }),

  removeEvidence: protectedProcedure
    .input(z.object({ evidenceId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const evidence = await getActionPlanEvidenceById(input.evidenceId);
      if (!evidence) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Evidência não encontrada' });
      }
      assertResponsibleOrInternal(ctx.user as any, evidence);
      await db.removeActionPlanEvidence(input.evidenceId);
      return { success: true };
    }),

  getOrCreateAssessmentFolder: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      assessmentId: z.number(),
      assessmentDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!isInternalActionPlanRole(ctx.user.role) && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para acessar a pasta desta organização.' });
      }
      const gedService = await import('./gedService');
      const folder = await gedService.getOrCreateAssessmentFolder(
        ctx.user.id,
        input.organizationId,
        input.assessmentId,
        input.assessmentDate,
      );
      return folder;
    }),

  getMyDeadlines: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Usuario nao autenticado' });
      }
      const plans = await db.getActionPlansByResponsible(ctx.user.id);
      if (isInternalActionPlanRole(ctx.user.role)) {
        return plans || [];
      }
      return (plans || []).filter((plan: any) => plan.assessmentType === 'compliance');
    }),

  delegateTask: protectedProcedure
    .input(z.object({
      actionPlanId: z.number(),
      newResponsibleId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const action = await getActionPlanById(input.actionPlanId);
      if (!action) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
      }
      const isInternal = isInternalActionPlanRole(ctx.user.role);
      const isResponsible = action.responsibleId === ctx.user.id;
      if (!isInternal && !isResponsible) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para delegar esta tarefa.' });
      }
      const newResponsible = await db.getUserById(input.newResponsibleId);
      if (!newResponsible || newResponsible.organizationId !== action.organizationId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'O novo responsável deve pertencer à mesma organização da ação.' });
      }
      const previousResponsible = action.responsibleId ? await db.getUserById(action.responsibleId) : null;
      const dbConn = await db.getDb();
      if (dbConn) {
        try {
          await dbConn.insert(actionPlanHistory).values({
            actionPlanId: input.actionPlanId,
            changedById: ctx.user.id,
            changeType: 'reatribuicao',
            previousValue: previousResponsible ? (previousResponsible.name || previousResponsible.email || '') : null,
            newValue: newResponsible.name || newResponsible.email || '',
            notes: `Tarefa delegada de "${previousResponsible?.name || previousResponsible?.email || 'sem responsável'}" para "${newResponsible.name || newResponsible.email}" por ${ctx.user.name || ctx.user.email}. Status resetado para Pendente.`,
          });
        } catch (histErr) {
          console.error('Erro ao registrar histórico de delegação:', histErr);
        }
      }
      await db.updateActionPlan(input.actionPlanId, {
        responsibleId: input.newResponsibleId,
        status: 'pendente',
        clientCompletedAt: null,
        clientCompletedById: null,
        clientRejectionReason: null,
      } as any);
      try {
        const org = await db.getOrganizationById(action.organizationId);
        const { sendActionPlanResponsibleEmail } = await import('./emailService');
        const baseUrl = getAppBaseUrl();
        await sendActionPlanResponsibleEmail({
          responsibleName: newResponsible.name || newResponsible.email,
          responsibleEmail: newResponsible.email,
          actionTitle: action.title,
          actionDescription: action.description || '',
          actionPriority: action.priority,
          dueDate: action.dueDate,
          assessmentTitle: `Avaliação #${action.assessmentId}`,
          organizationName: org?.name || 'Organização',
          assignedByName: ctx.user.name || ctx.user.email || 'Seusdados',
          platformUrl: `${baseUrl}/avaliacoes/${action.assessmentId}/consultor?tab=plano-de-acao&actionId=${input.actionPlanId}`,
        });
      } catch (err) {
        console.error('Erro ao enviar notificação de delegação:', err);
      }
      return { success: true };
    }),

  getOrganizationUsers: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (!isInternalActionPlanRole(ctx.user.role) && ctx.user.organizationId !== input.organizationId) {
        return [];
      }
      return db.getUsersByOrganization(input.organizationId);
    }),

  // ─── Observações de Andamento (histórico incremental) ───────────────────────
  getHistory: protectedProcedure
    .input(z.object({ actionPlanId: z.number() }))
    .query(async ({ input, ctx }) => {
      const action = await getActionPlanById(input.actionPlanId);
      if (!action) return [];
      if (!canUserAccessActionPlan(ctx.user as any, action, { allowResponsible: true, allowSameOrgClient: true })) return [];
      const database = await db.getDb();
      if (!database) return [];
      const { rows } = await database.execute(sql`
        SELECT h.id, h."actionPlanId", h."changedById", h."changeType", h."previousValue", h."newValue", h.notes, h."createdAt",
                u.name as "changedByName", u.role as "changedByRole"
         FROM action_plan_history h
         LEFT JOIN users u ON h."changedById" = u.id
         WHERE h."actionPlanId" = ${input.actionPlanId}
         ORDER BY h."createdAt" ASC
      `) as any;
      return (rows as any[]).map((r: any) => ({
        id: r.id,
        changeType: r.changeType,
        previousValue: r.previousValue,
        newValue: r.newValue,
        notes: r.notes,
        changedByName: r.changedByName,
        changedByRole: r.changedByRole,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      }));
    }),

  addObservation: protectedProcedure
    .input(z.object({
      actionPlanId: z.number(),
      text: z.string().min(1).max(5000),
    }))
    .mutation(async ({ input, ctx }) => {
      const action = await getActionPlanById(input.actionPlanId);
      if (!action) throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
      assertUserCanAccessActionPlan(ctx.user as any, action, { allowResponsible: true, allowSameOrgClient: true });
      // Apenas responsável, sponsor, comite, consultor e admin podem registrar observações
      const canObserve = isInternalActionPlanRole(ctx.user.role) ||
        ['sponsor', 'comite'].includes(ctx.user.role) ||
        action.responsibleId === ctx.user.id;
      if (!canObserve) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas o responsável pela ação, Sponsor, Comitê ou equipe interna podem registrar observações.' });
      }
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Banco de dados indisponível' });
      await database.execute(sql`
        INSERT INTO action_plan_observations ("actionPlanId", "userId", "userName", "userRole", text, "createdAt") VALUES (${input.actionPlanId}, ${ctx.user.id}, ${ctx.user.name || ctx.user.email}, ${ctx.user.role}, ${input.text}, NOW())
      `);
      return { success: true };
    }),

  listObservations: protectedProcedure
    .input(z.object({ actionPlanId: z.number() }))
    .query(async ({ input, ctx }) => {
      const action = await getActionPlanById(input.actionPlanId);
      if (!action) return [];
      if (!canUserAccessActionPlan(ctx.user as any, action, { allowResponsible: true, allowSameOrgClient: true })) return [];
      const database = await db.getDb();
      if (!database) return [];
      const { rows } = await database.execute(sql`
        SELECT id, "actionPlanId", "userId", "userName", "userRole", text, "createdAt" FROM action_plan_observations WHERE "actionPlanId" = ${input.actionPlanId} ORDER BY "createdAt" ASC
      `) as any;
      return (rows as any[]).map((r: any) => ({
        id: r.id,
        actionPlanId: r.actionPlanId,
        userId: r.userId,
        userName: r.userName,
        userRole: r.userRole,
        text: r.text,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      }));
    }),
});
// ==================== ADMIN ROUTER =====================
const adminRouter = router({
  getGlobalStats: adminProcedure.query(async () => {
    return db.getGlobalStats();
  }),

  getAllOrganizations: adminProcedure.query(async () => {
    return db.getAllOrganizations();
  }),

  getAllUsers: adminProcedure.query(async () => {
    return db.getAllUsers();
  }),

  // Consolidação de registros duplicados
  detectDuplicateUsers: adminProcedure.query(async () => {
    const { dryRunReport } = await import('./userConsolidationService');
    return dryRunReport();
  }),

  consolidateDuplicateUsers: adminProcedure.mutation(async () => {
    const { consolidateAllDuplicates } = await import('./userConsolidationService');
    return consolidateAllDuplicates();
  }),
});

// ==================== ACCESS LINK ROUTER ====================
import { nanoid } from 'nanoid';

const accessLinkRouter = router({
  create: protectedProcedure
    .input(z.object({
      thirdPartyId: z.number(),
      organizationId: z.number(),
      assessmentId: z.number().optional(),
      type: z.enum(['due_diligence', 'conformidade']).default('due_diligence'),
      expiresInDays: z.number().default(30),
    }))
    .mutation(async ({ input, ctx }) => {
      const thirdParty = await getAuthorizedThirdPartyOrThrow(input.thirdPartyId, ctx);
      if (thirdParty.organizationId !== input.organizationId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Terceiro não pertence à organização informada' });
      }
      const token = nanoid(32);
      const expiresAtDate = new Date();
      expiresAtDate.setDate(expiresAtDate.getDate() + input.expiresInDays);
      const expiresAt = expiresAtDate.toISOString().slice(0, 19).replace('T', ' ');
      
      // Create assessment for this third party if not exists
      let assessmentId: number | undefined = input.assessmentId;
      if (input.type === 'due_diligence' && !assessmentId) {
        const reusableAssessment = await db.getReusableThirdPartyAssessment(input.organizationId, input.thirdPartyId);
        if (reusableAssessment) {
          assessmentId = reusableAssessment.id;
        } else {
          assessmentId = await db.createThirdPartyAssessment({
            organizationId: input.organizationId,
            thirdPartyId: input.thirdPartyId,
            title: `Avaliação Due Diligence - ${thirdParty.tradeName || thirdParty.name}`,
            status: 'rascunho',
            createdById: ctx.user.id,
            totalQuestions: getTotalDueDiligenceQuestions(),
            answeredQuestions: 0,
          });
          
          await maturityEvents.onTerceiroAvaliacaoCriada(
            String(input.organizationId),
            String(assessmentId),
            thirdParty.tradeName || thirdParty.name || 'Terceiro'
          );
        }
      }
      
      await db.createAccessLink({
        token,
        thirdPartyId: input.thirdPartyId,
        organizationId: input.organizationId,
        assessmentId,
        type: input.type,
        expiresAt,
        createdById: ctx.user.id,
      });
      
      const baseUrl = getAppBaseUrl();
      return { 
        token, 
        link: `${baseUrl}/avaliacao/${token}`,
        expiresAt 
      };
    }),

  validate: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const link = await db.getAccessLinkByToken(input.token);
      if (!link) return null;
      if (link.type !== 'due_diligence') return null;
      if (!link.isActive || new Date() > new Date(link.expiresAt)) {
        return null;
      }
      
      const thirdParty = await db.getThirdPartyById(link.thirdPartyId);
      const organization = await db.getOrganizationById(link.organizationId);
      
      return {
        valid: true,
        thirdPartyId: link.thirdPartyId,
        thirdPartyName: thirdParty?.tradeName || thirdParty?.name || 'Terceiro',
        thirdPartyType: thirdParty?.type || 'fornecedor',
        organizationId: link.organizationId,
        organizationName: organization?.name || 'Organização',
        assessmentId: link.assessmentId,
        type: link.type,
        expiresAt: link.expiresAt,
      };
    }),

  listByThirdParty: protectedProcedure
    .input(z.object({ thirdPartyId: z.number() }))
    .query(async ({ input, ctx }) => {
      const thirdParty = await getAuthorizedThirdPartyOrThrow(input.thirdPartyId, ctx);
      return db.getAccessLinksByThirdParty(thirdParty.id);
    }),

  sendEmail: protectedProcedure
    .input(z.object({
      thirdPartyId: z.number(),
      organizationId: z.number(),
      assessmentId: z.number().optional(),
      token: z.string().optional(),
      expiresInDays: z.number().default(30),
    }))
    .mutation(async ({ input, ctx }) => {
      const thirdParty = await getAuthorizedThirdPartyOrThrow(input.thirdPartyId, ctx);
      if (thirdParty.organizationId !== input.organizationId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Terceiro não pertence à organização informada' });
      }
      const organization = await db.getOrganizationById(input.organizationId);
      
      if (!thirdParty || !organization) {
        return { success: false, message: 'Terceiro ou organização não encontrado' };
      }
      
      if (!thirdParty.contactEmail) {
        return { success: false, message: 'Terceiro não possui e-mail de contato cadastrado' };
      }
      
      // Create or use existing link
      let token = input.token;
      const expiresAtDate = new Date();
      expiresAtDate.setDate(expiresAtDate.getDate() + input.expiresInDays);
      const expiresAt = expiresAtDate.toISOString();
      
      if (!token) {
        token = nanoid(32);
        
        let assessmentId = input.assessmentId;
        if (!assessmentId) {
          const reusableAssessment = await db.getReusableThirdPartyAssessment(input.organizationId, input.thirdPartyId);
          if (reusableAssessment) {
            assessmentId = reusableAssessment.id;
          } else {
            assessmentId = await db.createThirdPartyAssessment({
            organizationId: input.organizationId,
            thirdPartyId: input.thirdPartyId,
            title: `Avaliação Due Diligence - ${thirdParty.tradeName || thirdParty.name}`,
            status: 'rascunho',
            createdById: ctx.user.id,
            totalQuestions: getTotalDueDiligenceQuestions(),
            answeredQuestions: 0,
          });
          }
        }
        
        await db.createAccessLink({
          token,
          thirdPartyId: input.thirdPartyId,
          organizationId: input.organizationId,
          assessmentId,
          type: 'due_diligence',
          expiresAt,
          createdById: ctx.user.id,
        });
      }
      
      const baseUrl = getAppBaseUrl();
      const assessmentLink = `${baseUrl}/avaliacao/${token}`;
      
      const result = await sendAssessmentEmailLegacy({
        thirdPartyName: thirdParty.tradeName || thirdParty.name,
        thirdPartyEmail: thirdParty.contactEmail,
        organizationName: organization.name,
        assessmentLink,
        expiresAt,
        senderName: ctx.user.name || 'Seusdados',
      });
      
      // Update link to mark as sent
      if (result.success) {
        await db.updateAccessLinkSentAt(token);
      }
      
      return { ...result, link: assessmentLink, token };
    }),

  // Endpoint para obter estatísticas de links
  stats: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        return null;
      }
      return db.getAccessLinkStats(input.organizationId);
    }),

  // Endpoint para listar links com detalhes e status calculado
  listWithDetails: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        return [];
      }
      const links = await db.getAccessLinksWithDetails(input.organizationId);
      const now = new Date();
      
      return links.map(link => {
        let status: 'pendente' | 'enviado' | 'visualizado' | 'respondido' | 'expirado' = 'pendente';
        
        if (link.completedAt) {
          status = 'respondido';
        } else if (new Date(link.expiresAt) < now) {
          status = 'expirado';
        } else if (link.viewedAt) {
          status = 'visualizado';
        } else if (link.sentAt) {
          status = 'enviado';
        }
        
        return {
          ...link,
          status,
        };
      });
    }),

  // Endpoint para marcar link como visualizado
  markViewed: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      await db.updateAccessLinkViewedAt(input.token);
      return { success: true };
    }),

  // Endpoint para marcar link como completado
  markCompleted: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      await db.updateAccessLinkCompletedAt(input.token);
      return { success: true };
    }),

  sendBulkEmails: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      thirdPartyIds: z.array(z.number()),
      expiresInDays: z.number().default(30),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!isInternalTeamRole(ctx.user.role) && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      const organization = await db.getOrganizationById(input.organizationId);
      if (!organization) {
        return { success: false, results: [], message: 'Organização não encontrada' };
      }
      
      const results: Array<{ thirdPartyId: number; success: boolean; message: string; link?: string }> = [];
      
      for (const thirdPartyId of input.thirdPartyIds) {
        const thirdParty = await db.getThirdPartyById(thirdPartyId);
        
        if (!thirdParty) {
          results.push({ thirdPartyId, success: false, message: 'Terceiro não encontrado' });
          continue;
        }
        
        if (!thirdParty.contactEmail) {
          results.push({ thirdPartyId, success: false, message: 'Sem e-mail de contato' });
          continue;
        }
        
        const token = nanoid(32);
        const expiresAtDate = new Date();
        expiresAtDate.setDate(expiresAtDate.getDate() + input.expiresInDays);
        const expiresAt = expiresAtDate.toISOString();
        
        const assessmentId = await db.createThirdPartyAssessment({
          organizationId: input.organizationId,
          thirdPartyId,
          title: `Avaliação Due Diligence - ${thirdParty.tradeName || thirdParty.name}`,
          status: 'rascunho',
          createdById: ctx.user.id,
          totalQuestions: getTotalDueDiligenceQuestions(),
          answeredQuestions: 0,
        });
        
        await db.createAccessLink({
          token,
          thirdPartyId,
          organizationId: input.organizationId,
          assessmentId,
          type: 'due_diligence',
          expiresAt,
          createdById: ctx.user.id,
        });
        
        const baseUrl = getAppBaseUrl();
        const assessmentLink = `${baseUrl}/avaliacao/${token}`;
        
        const result = await sendAssessmentEmailLegacy({
          thirdPartyName: thirdParty.tradeName || thirdParty.name,
          thirdPartyEmail: thirdParty.contactEmail,
          organizationName: organization.name,
          assessmentLink,
          expiresAt,
          senderName: ctx.user.name || 'Seusdados',
        });
        
        if (result.success) {
          await db.updateAccessLinkSentAt(token);
        }
        
        results.push({ thirdPartyId, success: result.success, message: result.message, link: assessmentLink });
      }
      
      const successCount = results.filter(r => r.success).length;
      return { 
        success: successCount > 0, 
        results,
        message: `${successCount} de ${results.length} links enviados com sucesso`
      };
    }),

  // Endpoint para enviar lembrete individual
  sendReminder: protectedProcedure
    .input(z.object({
      token: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const link = await getAuthorizedAccessLinkOrThrow(input.token, ctx);
      if (!link) {
        return { success: false, message: 'Link não encontrado' };
      }
      
      if (link.completedAt) {
        return { success: false, message: 'Avaliação já foi concluída' };
      }
      
      const thirdParty = await db.getThirdPartyById(link.thirdPartyId);
      const organization = await db.getOrganizationById(link.organizationId);
      
      if (!thirdParty || !organization) {
        return { success: false, message: 'Terceiro ou organização não encontrado' };
      }
      
      if (!thirdParty.contactEmail) {
        return { success: false, message: 'Terceiro não possui e-mail de contato' };
      }
      
      const now = new Date();
      const expiresAt = new Date(link.expiresAt);
      const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysRemaining <= 0) {
        return { success: false, message: 'Link já expirou' };
      }
      
      const baseUrl = getAppBaseUrl();
      const assessmentLink = `${baseUrl}/avaliacao/${input.token}`;
      
      const result = await sendReminderEmail({
        thirdPartyName: thirdParty.tradeName || thirdParty.name,
        thirdPartyEmail: thirdParty.contactEmail,
        organizationName: organization.name,
        assessmentLink,
        expiresAt,
        daysRemaining,
      });
      
      return result;
    }),

  // Endpoint para buscar links pendentes que precisam de lembrete
  getPendingReminders: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      daysThreshold: z.number().default(7), // Links enviados há mais de X dias sem resposta
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        return [];
      }
      
      const links = await db.getAccessLinksWithDetails(input.organizationId);
      const now = new Date();
      
      return links.filter(link => {
        // Apenas links enviados, não completados e não expirados
        if (!link.sentAt || link.completedAt) return false;
        if (new Date(link.expiresAt) < now) return false;
        
        // Enviado há mais de X dias
        const sentAt = new Date(link.sentAt);
        const daysSinceSent = Math.floor((now.getTime() - sentAt.getTime()) / (1000 * 60 * 60 * 24));
        
        return daysSinceSent >= input.daysThreshold;
      });
    }),

  // Endpoint para enviar lembretes em massa
  sendBulkReminders: protectedProcedure
    .input(z.object({
      tokens: z.array(z.string()),
    }))
    .mutation(async ({ input, ctx }) => {
      const results: Array<{ token: string; success: boolean; message: string }> = [];
      
      for (const token of input.tokens) {
        const link = await db.getAccessLinkByToken(token);
        if (!link || (!isInternalTeamRole(ctx.user.role) && ctx.user.organizationId !== link.organizationId) || link.completedAt) {
          results.push({ token, success: false, message: 'Link inválido ou já completado' });
          continue;
        }
        
        const thirdParty = await db.getThirdPartyById(link.thirdPartyId);
        const organization = await db.getOrganizationById(link.organizationId);
        
        if (!thirdParty || !organization || !thirdParty.contactEmail) {
          results.push({ token, success: false, message: 'Dados incompletos' });
          continue;
        }
        
        const now = new Date();
        const expiresAt = new Date(link.expiresAt);
        const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysRemaining <= 0) {
          results.push({ token, success: false, message: 'Link expirado' });
          continue;
        }
        
        const baseUrl = getAppBaseUrl();
        const assessmentLink = `${baseUrl}/avaliacao/${token}`;
        
        const result = await sendReminderEmail({
          thirdPartyName: thirdParty.tradeName || thirdParty.name,
          thirdPartyEmail: thirdParty.contactEmail,
          organizationName: organization.name,
          assessmentLink,
          expiresAt,
          daysRemaining,
        });
        
        results.push({ token, ...result });
      }
      
      const successCount = results.filter(r => r.success).length;
      return {
        success: successCount > 0,
        results,
        message: `${successCount} de ${results.length} lembretes enviados`
      };
    }),

  // Endpoint público para obter estado da avaliação due diligence
  getDueDiligenceState: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const link = await db.getAccessLinkByToken(input.token);
      if (!link) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Link inválido ou não encontrado' });
      }
      
      if (link.type !== 'due_diligence') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Link inválido para due diligence' });
      }
      if (link.type !== 'due_diligence') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Link inválido para due diligence' });
      }
      if (!link.isActive || new Date() > new Date(link.expiresAt)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Link expirado ou inativo' });
      }
      
      if (link.completedAt) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Avaliação já foi concluída' });
      }
      
      const thirdParty = await db.getThirdPartyById(link.thirdPartyId);
      const organization = await db.getOrganizationById(link.organizationId);
      
      // Buscar respostas existentes
      const responses = link.assessmentId 
        ? await db.getThirdPartyAssessmentResponses(link.assessmentId)
        : [];
      
      // Marcar como visualizado
      await db.updateAccessLinkViewedAt(input.token);
      
      return {
        thirdPartyId: link.thirdPartyId,
        thirdPartyName: thirdParty?.tradeName || thirdParty?.name || 'Terceiro',
        organizationId: link.organizationId,
        organizationName: organization?.name || 'Organização',
        assessmentId: link.assessmentId,
        type: link.type,
        expiresAt: link.expiresAt,
        responses: responses.map(r => ({
          questionId: r.questionId,
          answer: r.selectedLevel,
          notes: r.notes,
          evidence: r.evidenceUrls,
        })),
      };
    }),

  // Endpoint público para salvar resposta de due diligence
  saveDueDiligenceResponse: publicProcedure
    .input(z.object({
      token: z.string(),
      questionId: z.number(),
      answer: z.number(),
      notes: z.string().optional(),
      evidence: z.string().optional(),
      responderName: z.string().optional(),
      responderEmail: z.string().email().optional().or(z.literal('')).optional(),
      responderRole: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const link = await db.getAccessLinkByToken(input.token);
      if (!link) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Link inválido ou não encontrado' });
      }
      
      if (link.type !== 'due_diligence') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Link inválido para due diligence' });
      }
      if (!link.isActive || new Date() > new Date(link.expiresAt)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Link expirado ou inativo' });
      }
      
      if (link.completedAt) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Avaliação já foi concluída' });
      }
      
      if (!link.assessmentId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Avaliação não encontrada' });
      }
      
      const question = getQuestionByNumber(input.questionId);
      const option = question?.options.find(o => o.level === input.answer);
      if (!question || !option) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Questão ou resposta inválida' });
      }

      const responderSummary = [input.responderName, input.responderEmail, input.responderRole].filter(Boolean).join(' | ');
      const composedNotes = [input.notes?.trim(), responderSummary ? `Respondente: ${responderSummary}` : null].filter(Boolean).join('\n');

      await db.upsertThirdPartyAssessmentResponse({
        assessmentId: link.assessmentId,
        questionId: input.questionId,
        selectedLevel: input.answer,
        impactScore: option.impact,
        probabilityScore: option.probability,
        riskScore: option.impact * option.probability,
        notes: composedNotes || null,
        evidenceUrls: input.evidence ? [input.evidence] : null,
      });
      
      // Atualizar contador de respostas
      const responses = await db.getThirdPartyAssessmentResponses(link.assessmentId);
      await db.updateThirdPartyAssessment(link.assessmentId, {
        answeredQuestions: responses.length,
      });
      
      return { success: true };
    }),

  // Endpoint público para concluir avaliação due diligence
  completeDueDiligence: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const link = await db.getAccessLinkByToken(input.token);
      if (!link) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Link inválido ou não encontrado' });
      }
      
      if (!link.isActive || new Date() > new Date(link.expiresAt)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Link expirado ou inativo' });
      }
      
      if (link.completedAt) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Avaliação já foi concluída' });
      }
      
      if (!link.assessmentId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Avaliação não encontrada' });
      }
      
      const responses = await db.getThirdPartyAssessmentResponses(link.assessmentId);
      const totalQuestions = getTotalDueDiligenceQuestions();
      if (responses.length < totalQuestions) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Avaliação incompleta. Responda todas as ${totalQuestions} questões antes de concluir.` });
      }
      
      // Calcular score e classificação de risco
      const responsesForCalc: Record<string, number> = {};
      responses.forEach(r => {
        responsesForCalc[`DD-${String(r.questionId).padStart(2, '0')}`] = r.selectedLevel;
      });
      const calcResult = calculateDueDiligenceRiskScore(responsesForCalc);
      const riskScore = calcResult.totalScore;
      const riskLevel = calcResult.riskLevel;
      const overallScore = calcResult.percentage;
      
      // Atualizar assessment
      await db.updateThirdPartyAssessment(link.assessmentId, {
        status: 'concluida',
        completedAt: new Date().toISOString(),
        overallRiskScore: riskScore,
        riskClassification: riskLevel as 'baixo' | 'moderado' | 'alto' | 'critico',
        answeredQuestions: totalQuestions,
        totalQuestions,
      });
      
      // Marcar link como completado
      await db.updateAccessLinkCompletedAt(input.token);
      
      return { success: true, riskScore, riskLevel, overallScore };
    }),
});

// ==================== REMINDER SETTINGS ROUTER ====================
const reminderSettingsRouter = router({
  get: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        return null;
      }
      return db.getReminderSettings(input.organizationId);
    }),

  upsert: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      isEnabled: z.boolean().default(true),
      daysAfterSent: z.number().min(1).max(30).default(7),
      maxReminders: z.number().min(1).max(10).default(3),
      reminderInterval: z.number().min(1).max(30).default(7),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Acesso negado' });
      }
      await db.upsertReminderSettings({
        ...input,
        isEnabled: !!input.isEnabled
      });
      return { success: true };
    }),

  // Endpoint para processar lembretes automáticos de uma organização
  processAutoReminders: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Acesso negado' });
      }
      
      const settings = await db.getReminderSettings(input.organizationId);
      if (!settings || !settings.isEnabled) {
        return { success: false, message: 'Lembretes automáticos desativados', processed: 0 };
      }
      
      const pendingLinks = await db.getPendingReminders(
        input.organizationId,
        settings.daysAfterSent,
        settings.maxReminders,
        settings.reminderInterval
      );
      
      const results: Array<{ linkId: number; success: boolean; message: string }> = [];
      
      for (const link of pendingLinks) {
        const thirdParty = await db.getThirdPartyById(link.thirdPartyId);
        const organization = await db.getOrganizationById(link.organizationId);
        
        if (!thirdParty || !organization || !thirdParty.contactEmail) {
          await db.createReminderLog({
            accessLinkId: link.id,
            organizationId: link.organizationId,
            thirdPartyId: link.thirdPartyId,
            reminderNumber: link.reminderNumber,
            status: 'skipped',
            errorMessage: 'Dados incompletos',
          });
          results.push({ linkId: link.id, success: false, message: 'Dados incompletos' });
          continue;
        }
        
        const expiresAt = new Date(link.expiresAt);
        const now = new Date();
        const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        const baseUrl = getAppBaseUrl();
        const assessmentLink = `${baseUrl}/avaliacao/${link.token}`;
        
        try {
          const result = await sendReminderEmail({
            thirdPartyName: thirdParty.tradeName || thirdParty.name,
            thirdPartyEmail: thirdParty.contactEmail,
            organizationName: organization.name,
            assessmentLink,
            expiresAt,
            daysRemaining,
          });
          
          await db.createReminderLog({
            accessLinkId: link.id,
            organizationId: link.organizationId,
            thirdPartyId: link.thirdPartyId,
            reminderNumber: link.reminderNumber,
            status: result.success ? 'sent' : 'failed',
            errorMessage: result.success ? undefined : result.message,
          });
          
          results.push({ linkId: link.id, success: result.success, message: result.message });
        } catch (error: any) {
          await db.createReminderLog({
            accessLinkId: link.id,
            organizationId: link.organizationId,
            thirdPartyId: link.thirdPartyId,
            reminderNumber: link.reminderNumber,
            status: 'failed',
            errorMessage: error.message,
          });
          results.push({ linkId: link.id, success: false, message: error.message });
        }
      }
      
      await db.updateReminderSettingsLastProcessed(input.organizationId);
      
      const successCount = results.filter(r => r.success).length;
      return {
        success: true,
        processed: results.length,
        sent: successCount,
        failed: results.length - successCount,
        message: `${successCount} lembretes enviados de ${results.length} pendentes`,
        results,
      };
    }),

  // Endpoint público para execução via cron/scheduler (protegido por API key)
  processAllAutoReminders: publicProcedure
    .input(z.object({ apiKey: z.string() }))
    .mutation(async ({ input }) => {
      // Verificar API key (usar uma chave secreta configurada)
      const expectedKey = process.env.REMINDER_API_KEY || 'seusdados-reminder-secret-key';
      if (input.apiKey !== expectedKey) {
        return { success: false, message: 'API key inválida' };
      }
      
      const allSettings = await db.getAllActiveReminderSettings();
      const allResults: Array<{ organizationId: number; processed: number; sent: number }> = [];
      
      for (const settings of allSettings) {
        const pendingLinks = await db.getPendingReminders(
          settings.organizationId,
          settings.daysAfterSent,
          settings.maxReminders,
          settings.reminderInterval
        );
        
        let sent = 0;
        
        for (const link of pendingLinks) {
          const thirdParty = await db.getThirdPartyById(link.thirdPartyId);
          const organization = await db.getOrganizationById(link.organizationId);
          
          if (!thirdParty || !organization || !thirdParty.contactEmail) {
            await db.createReminderLog({
              accessLinkId: link.id,
              organizationId: link.organizationId,
              thirdPartyId: link.thirdPartyId,
              reminderNumber: link.reminderNumber,
              status: 'skipped',
              errorMessage: 'Dados incompletos',
            });
            continue;
          }
          
          const expiresAt = new Date(link.expiresAt);
          const now = new Date();
          const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          const baseUrl = getAppBaseUrl();
          const assessmentLink = `${baseUrl}/avaliacao/${link.token}`;
          
          try {
            const result = await sendReminderEmail({
              thirdPartyName: thirdParty.tradeName || thirdParty.name,
              thirdPartyEmail: thirdParty.contactEmail,
              organizationName: organization.name,
              assessmentLink,
              expiresAt,
              daysRemaining,
            });
            
            await db.createReminderLog({
              accessLinkId: link.id,
              organizationId: link.organizationId,
              thirdPartyId: link.thirdPartyId,
              reminderNumber: link.reminderNumber,
              status: result.success ? 'sent' : 'failed',
              errorMessage: result.success ? undefined : result.message,
            });
            
            if (result.success) sent++;
          } catch (error: any) {
            await db.createReminderLog({
              accessLinkId: link.id,
              organizationId: link.organizationId,
              thirdPartyId: link.thirdPartyId,
              reminderNumber: link.reminderNumber,
              status: 'failed',
              errorMessage: error.message,
            });
          }
        }
        
        await db.updateReminderSettingsLastProcessed(settings.organizationId);
        allResults.push({ organizationId: settings.organizationId, processed: pendingLinks.length, sent });
      }
      
      const totalProcessed = allResults.reduce((sum, r) => sum + r.processed, 0);
      const totalSent = allResults.reduce((sum, r) => sum + r.sent, 0);
      
      return {
        success: true,
        organizations: allResults.length,
        totalProcessed,
        totalSent,
        message: `Processados ${totalProcessed} lembretes em ${allResults.length} organizações, ${totalSent} enviados`,
        results: allResults,
      };
    }),

  // Endpoint para buscar histórico de lembretes
  getLogs: protectedProcedure
    .input(z.object({ accessLinkId: z.number() }))
    .query(async ({ input }) => {
      return db.getReminderLogsByAccessLink(input.accessLinkId);
    }),
});

// ==================== EVIDENCE ROUTER ====================
// ==================== VALIDAÇÃO DE FORMATOS DE EVIDÊNCIAS ====================
const ALLOWED_EVIDENCE_MIMES: Record<string, { maxSizeMB: number; category: string; label: string }> = {
  // Imagens
  'image/jpeg': { maxSizeMB: 10, category: 'imagem', label: 'JPEG' },
  'image/jpg': { maxSizeMB: 10, category: 'imagem', label: 'JPG' },
  'image/png': { maxSizeMB: 10, category: 'imagem', label: 'PNG' },
  'image/gif': { maxSizeMB: 10, category: 'imagem', label: 'GIF' },
  'image/bmp': { maxSizeMB: 10, category: 'imagem', label: 'BMP' },
  'image/webp': { maxSizeMB: 10, category: 'imagem', label: 'WebP' },
  // Documentos
  'application/pdf': { maxSizeMB: 25, category: 'documento', label: 'PDF' },
  'application/msword': { maxSizeMB: 25, category: 'documento', label: 'DOC' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { maxSizeMB: 25, category: 'documento', label: 'DOCX' },
  // Planilhas
  'application/vnd.ms-excel': { maxSizeMB: 25, category: 'planilha', label: 'XLS' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { maxSizeMB: 25, category: 'planilha', label: 'XLSX' },
  'application/vnd.oasis.opendocument.spreadsheet': { maxSizeMB: 25, category: 'planilha', label: 'ODS' },
  'text/csv': { maxSizeMB: 10, category: 'planilha', label: 'CSV' },
  // Apresentações
  'application/vnd.ms-powerpoint': { maxSizeMB: 50, category: 'apresentacao', label: 'PPT' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { maxSizeMB: 50, category: 'apresentacao', label: 'PPTX' },
  'application/vnd.oasis.opendocument.presentation': { maxSizeMB: 50, category: 'apresentacao', label: 'ODP' },
  // Compactados
  'application/zip': { maxSizeMB: 50, category: 'compactado', label: 'ZIP' },
  'application/x-zip-compressed': { maxSizeMB: 50, category: 'compactado', label: 'ZIP' },
  'application/x-rar-compressed': { maxSizeMB: 50, category: 'compactado', label: 'RAR' },
  'application/vnd.rar': { maxSizeMB: 50, category: 'compactado', label: 'RAR' },
  'application/x-7z-compressed': { maxSizeMB: 50, category: 'compactado', label: '7Z' },
};

// Extensões perigosas que devem ser bloqueadas independentemente do MIME
const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif', '.vbs', '.js', '.ws', '.wsf', '.ps1', '.sh', '.cgi', '.php', '.asp', '.aspx', '.jsp'];

function validateEvidenceFile(fileName: string, mimeType: string, fileSize: number): { valid: boolean; error?: string } {
  // 1. Verificar extensão perigosa
  const ext = ('.' + fileName.split('.').pop()?.toLowerCase()) || '';
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Extensão "${ext}" não é permitida por motivos de segurança.` };
  }

  // 2. Verificar tipo MIME
  const mimeConfig = ALLOWED_EVIDENCE_MIMES[mimeType.toLowerCase()];
  if (!mimeConfig) {
    const allowedLabels = [...new Set(Object.values(ALLOWED_EVIDENCE_MIMES).map(v => v.label))];
    return { valid: false, error: `Formato "${mimeType}" não é aceito. Formatos permitidos: ${allowedLabels.join(', ')}.` };
  }

  // 3. Verificar tamanho máximo
  const maxBytes = mimeConfig.maxSizeMB * 1024 * 1024;
  if (fileSize > maxBytes) {
    return { valid: false, error: `Arquivo excede o tamanho máximo de ${mimeConfig.maxSizeMB}MB para ${mimeConfig.category}s. Tamanho atual: ${(fileSize / (1024 * 1024)).toFixed(1)}MB.` };
  }

  return { valid: true };
}

const evidenceRouter = router({
  // Endpoint para listar formatos aceitos (usado pelo frontend)
  getAllowedFormats: protectedProcedure.query(() => {
    const categories: Record<string, { extensions: string[]; maxSizeMB: number; label: string }> = {};
    for (const [mime, config] of Object.entries(ALLOWED_EVIDENCE_MIMES)) {
      if (!categories[config.category]) {
        categories[config.category] = { extensions: [], maxSizeMB: config.maxSizeMB, label: config.category };
      }
      if (!categories[config.category].extensions.includes(config.label)) {
        categories[config.category].extensions.push(config.label);
      }
    }
    return categories;
  }),

  upload: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      assessmentType: z.enum(['compliance', 'third_party', 'contract_analysis']),
      assessmentId: z.number(),
      questionId: z.string().optional(),
      fileName: z.string(),
      fileData: z.string(), // base64 encoded
      mimeType: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { storagePut } = await import('./storage');
      const { nanoid } = await import('nanoid');
      
      // Decode base64 file data
      const fileBuffer = Buffer.from(input.fileData, 'base64');
      const fileSize = fileBuffer.length;

      // Validação de formato, MIME e tamanho
      const validation = validateEvidenceFile(input.fileName, input.mimeType, fileSize);
      if (!validation.valid) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: validation.error || 'Formato de arquivo inválido.' });
      }
      
      // Sanitizar nome do arquivo (remover caracteres especiais)
      const sanitizedName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      
      // Generate unique file key
      const fileKey = `evidences/${input.organizationId}/${input.assessmentType}/${input.assessmentId}/${nanoid()}-${sanitizedName}`;
      
      // Upload to S3
      const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);
      
      // Save to database
      const id = await db.createEvidence({
        organizationId: input.organizationId,
        assessmentType: input.assessmentType,
        assessmentId: input.assessmentId,
        questionId: input.questionId || null,
        fileName: input.fileName,
        fileKey,
        fileUrl: url,
        fileSize,
        mimeType: input.mimeType,
        description: input.description || null,
        uploadedById: ctx.user.id,
      });
      
      return { id, url, fileName: input.fileName };
    }),

  listByAssessment: protectedProcedure
    .input(z.object({
      assessmentType: z.enum(['compliance', 'third_party', 'contract_analysis']),
      assessmentId: z.number(),
    }))
    .query(async ({ input }) => {
      return db.getEvidencesByAssessment(input.assessmentType, input.assessmentId);
    }),

  listByQuestion: protectedProcedure
    .input(z.object({
      assessmentType: z.enum(['compliance', 'third_party', 'contract_analysis']),
      assessmentId: z.number(),
      questionId: z.string(),
    }))
    .query(async ({ input }) => {
      return db.getEvidencesByQuestion(input.assessmentType, input.assessmentId, input.questionId);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteEvidence(input.id);
      return { success: true };
    }),
});

// ==================== AI ROUTER (CONSULTORES ONLY) ====================
// Procedimento que verifica se é consultor ou admin
const consultorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Acesso restrito a consultores Seusdados' });
  }
  return next({ ctx });
});

const aiRouter = router({
  // ==================== PROVIDER CONFIGS ====================
  getProviderConfigs: consultorProcedure.query(async () => {
    return db.getAiProviderConfigs();
  }),

  getEnabledProviders: consultorProcedure.query(async () => {
    return db.getEnabledAiProviders();
  }),

  createProviderConfig: adminProcedure
    .input(z.object({
      provider: z.enum(['openai', 'gemini', 'claude', 'perplexity']),
      apiKey: z.string().optional(),
      model: z.string().optional(),
      isEnabled: z.boolean().default(false),
      isDefault: z.boolean().default(false),
      maxTokens: z.number().optional(),
      temperature: z.number().min(0).max(100).optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await db.createAiProviderConfig({
        ...input,
        isEnabled: !!input.isEnabled,
        isDefault: !!input.isDefault
      });
      return { id };
    }),

  updateProviderConfig: adminProcedure
    .input(z.object({
      id: z.number(),
      apiKey: z.string().optional(),
      model: z.string().optional(),
      isEnabled: z.boolean().optional(),
      isDefault: z.boolean().optional(),
      maxTokens: z.number().optional(),
      temperature: z.number().min(0).max(100).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateAiProviderConfig(id, {
        ...data,
        isEnabled: data.isEnabled,
        isDefault: data.isDefault
      });
      return { success: true };
    }),

  deleteProviderConfig: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteAiProviderConfig(input.id);
      return { success: true };
    }),

  // ==================== ORGANIZATION INSTRUCTIONS ====================
  getOrganizationInstructions: consultorProcedure
    .input(z.object({
      organizationId: z.number(),
      module: z.enum(['compliance', 'due_diligence', 'action_plans', 'general']).optional(),
    }))
    .query(async ({ input }) => {
      return db.getAiOrganizationInstructions(input.organizationId, input.module);
    }),

  createOrganizationInstruction: consultorProcedure
    .input(z.object({
      organizationId: z.number(),
      module: z.enum(['compliance', 'due_diligence', 'action_plans', 'general']).default('general'),
      systemPrompt: z.string().optional(),
      contextInstructions: z.string().optional(),
      responseStyle: z.enum(['formal', 'tecnico', 'executivo', 'simplificado']).default('formal'),
      language: z.string().default('pt-BR'),
      includeRecommendations: z.boolean().default(true),
      includeRiskAnalysis: z.boolean().default(true),
      includeActionPlan: z.boolean().default(true),
      customFields: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await db.createAiOrganizationInstruction({
        ...input,
        createdById: ctx.user.id,
        includeRecommendations: !!input.includeRecommendations,
        includeRiskAnalysis: !!input.includeRiskAnalysis,
        includeActionPlan: !!input.includeActionPlan,
      });
      return { id };
    }),

  updateOrganizationInstruction: consultorProcedure
    .input(z.object({
      id: z.number(),
      systemPrompt: z.string().optional(),
      contextInstructions: z.string().optional(),
      responseStyle: z.enum(['formal', 'tecnico', 'executivo', 'simplificado']).optional(),
      language: z.string().optional(),
      includeRecommendations: z.boolean().optional(),
      includeRiskAnalysis: z.boolean().optional(),
      includeActionPlan: z.boolean().optional(),
      customFields: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const convertedData = {
        ...data,
        includeRecommendations: data.includeRecommendations !== undefined ? !!data.includeRecommendations : undefined,
        includeRiskAnalysis: data.includeRiskAnalysis !== undefined ? !!data.includeRiskAnalysis : undefined,
        includeActionPlan: data.includeActionPlan !== undefined ? !!data.includeActionPlan : undefined,
      };
      await db.updateAiOrganizationInstruction(id, convertedData);
      return { success: true };
    }),

  deleteOrganizationInstruction: consultorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteAiOrganizationInstruction(input.id);
      return { success: true };
    }),

  // ==================== CHAT SESSIONS ====================
  getChatSessions: consultorProcedure
    .input(z.object({ organizationId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      return db.getAiChatSessions(ctx.user.id, input.organizationId);
    }),

  getChatSession: consultorProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const session = await db.getAiChatSessionById(input.id);
      if (!session || session.userId !== ctx.user.id) {
        return null;
      }
      const messages = await db.getAiChatMessages(input.id);
      return { session, messages };
    }),

  createChatSession: consultorProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      module: z.enum(['compliance', 'due_diligence', 'action_plans', 'general']).default('general'),
      entityType: z.string().optional(),
      entityId: z.number().optional(),
      title: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await db.createAiChatSession({
        userId: ctx.user.id,
        organizationId: input.organizationId,
        module: input.module,
        entityType: input.entityType,
        entityId: input.entityId,
        title: input.title || `Nova conversa - ${new Date().toLocaleDateString('pt-BR')}`,
        provider: 'gemini', // Default provider via Manus Forge
        model: 'gemini-2.5-flash',
        status: 'active',
        totalTokensUsed: 0,
      });
      return { id };
    }),

  archiveChatSession: consultorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await db.getAiChatSessionById(input.id);
      if (!session || session.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Sessão não encontrada' });
      }
      await db.updateAiChatSession(input.id, { status: 'archived' });
      return { success: true };
    }),

  deleteChatSession: consultorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await db.getAiChatSessionById(input.id);
      if (!session || session.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Sessão não encontrada' });
      }
      await db.deleteAiChatSession(input.id);
      return { success: true };
    }),

  // ==================== CHAT MESSAGES ====================
  sendMessage: consultorProcedure
    .input(z.object({
      sessionId: z.number(),
      content: z.string().min(1),
      isRefinement: z.boolean().default(false),
      parentMessageId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await db.getAiChatSessionById(input.sessionId);
      if (!session || session.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Sessão não encontrada' });
      }

      // Salvar mensagem do usuário
      await db.createAiChatMessage({
        sessionId: input.sessionId,
        role: 'user',
        content: input.content,
        isRefinement: !!input.isRefinement,
        parentMessageId: input.parentMessageId,
      });

      // Buscar histórico de mensagens
      const messages = await db.getAiChatMessages(input.sessionId);
      const chatMessages: aiService.ChatMessage[] = messages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }));

      // Buscar configurações personalizadas da organização
      let orgConfig: aiService.AIOrganizationConfig | undefined;
      if (session.organizationId) {
        const instructions = await db.getAiOrganizationInstructions(session.organizationId, session.module);
        if (instructions.length > 0) {
          const inst = instructions[0];
          orgConfig = {
            organizationId: inst.organizationId,
            module: inst.module as aiService.AIModule,
            systemPrompt: inst.systemPrompt || undefined,
            contextInstructions: inst.contextInstructions || undefined,
            responseStyle: inst.responseStyle as aiService.ResponseStyle,
            includeRecommendations: !!inst.includeRecommendations,
            includeRiskAnalysis: !!inst.includeRiskAnalysis,
            includeActionPlan: !!inst.includeActionPlan,
          };
        }
      }

      // Buscar dados da entidade se houver
      let assessmentData: Record<string, unknown> | undefined;
      let organizationName: string | undefined;

      if (session.organizationId) {
        const org = await db.getOrganizationById(session.organizationId);
        organizationName = org?.tradeName || org?.name;
      }

      if (session.entityType === 'compliance_assessment' && session.entityId) {
        const assessment = await db.getComplianceAssessmentById(session.entityId);
        if (assessment) {
          const responses = await db.getComplianceResponsesByAssessment(session.entityId);
          assessmentData = {
            ...assessment,
            responses,
          };
        }
      } else if (session.entityType === 'third_party_assessment' && session.entityId) {
        const assessment = await db.getThirdPartyAssessmentById(session.entityId);
        if (assessment) {
          const thirdParty = await db.getThirdPartyById(assessment.thirdPartyId);
          const responses = await db.getThirdPartyResponsesByAssessment(session.entityId);
          assessmentData = {
            ...assessment,
            thirdPartyName: thirdParty?.tradeName || thirdParty?.name,
            thirdPartyCnpj: thirdParty?.cnpj,
            thirdPartyType: thirdParty?.type,
            responses,
          };
        }
      }

      // Chamar o serviço de IA
      const context: aiService.ChatContext = {
        organizationId: session.organizationId || undefined,
        organizationName,
        module: session.module as aiService.AIModule,
        entityType: session.entityType || undefined,
        entityId: session.entityId || undefined,
        assessmentData,
      };

      const response = await aiService.chatWithAI(chatMessages, context, orgConfig);

      // Salvar resposta do assistente
      const messageId = await db.createAiChatMessage({
        sessionId: input.sessionId,
        role: 'assistant',
        content: response.content,
        tokensUsed: response.tokensUsed || 0,
        metadata: { model: response.model, provider: response.provider },
      });

      // Atualizar tokens usados na sessão
      await db.updateAiChatSession(input.sessionId, {
        totalTokensUsed: (session.totalTokensUsed || 0) + (response.tokensUsed || 0),
      });

      return {
        messageId,
        content: response.content,
        tokensUsed: response.tokensUsed,
      };
    }),

  // ==================== QUICK ANALYSIS ====================
  analyzeCompliance: consultorProcedure
    .input(z.object({
      assessmentId: z.number(),
      organizationId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const assessment = await db.getComplianceAssessmentById(input.assessmentId);
      if (!assessment) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Avaliação não encontrada' });
      }

      const org = await db.getOrganizationById(input.organizationId);
      const responses = await db.getComplianceResponsesByAssessment(input.assessmentId);

      const assessmentData = {
        ...assessment,
        responses,
      };

      // Buscar configurações personalizadas
      let orgConfig: aiService.AIOrganizationConfig | undefined;
      const instructions = await db.getAiOrganizationInstructions(input.organizationId, 'compliance');
      if (instructions.length > 0) {
        const inst = instructions[0];
        orgConfig = {
          organizationId: inst.organizationId,
          module: 'compliance',
          systemPrompt: inst.systemPrompt || undefined,
          contextInstructions: inst.contextInstructions || undefined,
          responseStyle: inst.responseStyle as aiService.ResponseStyle,
          includeRecommendations: !!inst.includeRecommendations,
          includeRiskAnalysis: !!inst.includeRiskAnalysis,
          includeActionPlan: !!inst.includeActionPlan,
        };
      }

      const response = await aiService.generateComplianceAnalysis(
        assessmentData,
        org?.tradeName || org?.name || 'Organização',
        orgConfig
      );

      // Salvar resultado gerado
      const resultId = await db.createAiGeneratedResult({
        organizationId: input.organizationId,
        module: 'compliance',
        entityType: 'compliance_assessment',
        entityId: input.assessmentId,
        resultType: 'analysis',
        title: `Análise de Conformidade - ${assessment.title}`,
        content: response.content,
        createdById: ctx.user.id,
      });

      return {
        resultId,
        content: response.content,
        tokensUsed: response.tokensUsed,
      };
    }),

  analyzeThirdParty: consultorProcedure
    .input(z.object({
      assessmentId: z.number(),
      organizationId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const assessment = await db.getThirdPartyAssessmentById(input.assessmentId);
      if (!assessment) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Avaliação não encontrada' });
      }

      const org = await db.getOrganizationById(input.organizationId);
      const thirdParty = await db.getThirdPartyById(assessment.thirdPartyId);
      const responses = await db.getThirdPartyResponsesByAssessment(input.assessmentId);

      const assessmentData = {
        ...assessment,
        thirdPartyName: thirdParty?.tradeName || thirdParty?.name,
        thirdPartyCnpj: thirdParty?.cnpj,
        thirdPartyType: thirdParty?.type,
        responses,
      };

      // Buscar configurações personalizadas
      let orgConfig: aiService.AIOrganizationConfig | undefined;
      const instructions = await db.getAiOrganizationInstructions(input.organizationId, 'due_diligence');
      if (instructions.length > 0) {
        const inst = instructions[0];
        orgConfig = {
          organizationId: inst.organizationId,
          module: 'due_diligence',
          systemPrompt: inst.systemPrompt || undefined,
          contextInstructions: inst.contextInstructions || undefined,
          responseStyle: inst.responseStyle as aiService.ResponseStyle,
          includeRecommendations: !!inst.includeRecommendations,
          includeRiskAnalysis: !!inst.includeRiskAnalysis,
          includeActionPlan: !!inst.includeActionPlan,
        };
      }

      const response = await aiService.generateThirdPartyAnalysis(
        assessmentData,
        org?.tradeName || org?.name || 'Organização',
        orgConfig
      );

      // Salvar resultado gerado
      const resultId = await db.createAiGeneratedResult({
        organizationId: input.organizationId,
        module: 'due_diligence',
        entityType: 'third_party_assessment',
        entityId: input.assessmentId,
        resultType: 'analysis',
        title: `Análise de Due Diligence - ${thirdParty?.tradeName || thirdParty?.name}`,
        content: response.content,
        createdById: ctx.user.id,
      });

      return {
        resultId,
        content: response.content,
        tokensUsed: response.tokensUsed,
      };
    }),

  // ==================== GENERATED RESULTS ====================
  getGeneratedResults: consultorProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      module: z.enum(['compliance', 'due_diligence', 'action_plans', 'general']).optional(),
      entityType: z.string().optional(),
      entityId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return db.getAiGeneratedResults(
        input.organizationId,
        input.module,
        input.entityType,
        input.entityId
      );
    }),

  getGeneratedResult: consultorProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getAiGeneratedResultById(input.id);
    }),

  approveResult: consultorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.approveAiGeneratedResult(input.id, ctx.user.id);
      return { success: true };
    }),

  applyResult: consultorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.applyAiGeneratedResult(input.id);
      return { success: true };
    }),

  // ==================== PROMPT TEMPLATES ====================
  getPromptTemplates: consultorProcedure
    .input(z.object({
      module: z.enum(['compliance', 'due_diligence', 'action_plans', 'general']).optional(),
      isSystem: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      return db.getAiPromptTemplates(input.module, input.isSystem);
    }),

  createPromptTemplate: consultorProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      module: z.enum(['compliance', 'due_diligence', 'action_plans', 'general']).default('general'),
      category: z.string().optional(),
      promptTemplate: z.string().min(1),
      variables: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await db.createAiPromptTemplate({
        ...input,
        isSystem: false,
        createdById: ctx.user.id,
      });
      return { id };
    }),

  updatePromptTemplate: consultorProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      promptTemplate: z.string().optional(),
      variables: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateAiPromptTemplate(id, data);
      return { success: true };
    }),

  deletePromptTemplate: consultorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteAiPromptTemplate(input.id);
      return { success: true };
    }),

  // ==================== ACTION PLAN GENERATION ====================
  generateComplianceActionPlan: consultorProcedure
    .input(z.object({
      assessmentId: z.number(),
      organizationId: z.number(),
      maturityThreshold: z.number().min(1).max(5).default(3),
    }))
    .mutation(async ({ input, ctx }) => {
      const assessment = await db.getComplianceAssessmentById(input.assessmentId);
      if (!assessment) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Avaliação não encontrada' });
      }

      const org = await db.getOrganizationById(input.organizationId);
      const responses = await db.getComplianceResponsesByAssessment(input.assessmentId);

      // Extrair gaps das respostas
      const gaps = aiService.extractComplianceGaps(
        responses.map(r => ({
          questionId: typeof r.questionId === 'string' ? parseInt(r.questionId) : r.questionId,
          questionText: `Questão ${r.questionId}`,
          domain: `Domínio ${r.domainId}`,
          answer: r.selectedLevel,
          maturityLevel: r.selectedLevel,
          riskLevel: r.riskScore ? (r.riskScore >= 4 ? 'alto' : r.riskScore >= 2 ? 'medio' : 'baixo') : undefined,
          observation: r.notes || undefined,
        })),
        input.maturityThreshold
      );

      if (gaps.length === 0) {
        return {
          success: false,
          message: 'Nenhuma lacuna identificada com o nível de maturidade definido.',
          gapsCount: 0,
        };
      }

      // Buscar configurações personalizadas
      let orgConfig: aiService.AIOrganizationConfig | undefined;
      const instructions = await db.getAiOrganizationInstructions(input.organizationId, 'action_plans');
      if (instructions.length > 0) {
        const inst = instructions[0];
        orgConfig = {
          organizationId: inst.organizationId,
          module: 'action_plans',
          systemPrompt: inst.systemPrompt || undefined,
          contextInstructions: inst.contextInstructions || undefined,
          responseStyle: inst.responseStyle as aiService.ResponseStyle,
          includeRecommendations: Boolean(inst.includeRecommendations),
          includeRiskAnalysis: Boolean(inst.includeRiskAnalysis),
          includeActionPlan: Boolean(inst.includeActionPlan),
        };
      }

      const assessmentData = {
        id: assessment.id,
        title: assessment.title,
        framework: assessment.framework,
        maturityLevel: assessment.maturityLevel || 0,
        overallScore: assessment.overallScore || 0,
        organizationName: org?.tradeName || org?.name || 'Organização',
      };

      const result = await aiService.generateComplianceActionPlan(
        assessmentData,
        gaps,
        orgConfig
      );

      // Salvar resultado gerado
      const resultId = await db.createAiGeneratedResult({
        organizationId: input.organizationId,
        module: 'action_plans',
        entityType: 'compliance_assessment',
        entityId: input.assessmentId,
        resultType: 'action_plan',
        title: `Plano de Ação - ${assessment.title}`,
        content: result.response.content,
        structuredData: {
          gapsCount: gaps.length,
          parsedPlan: result.parsedPlan,
          maturityThreshold: input.maturityThreshold,
        },
        createdById: ctx.user.id,
      });

      return {
        success: true,
        resultId,
        content: result.response.content,
        gapsCount: gaps.length,
        parsedPlan: result.parsedPlan,
        tokensUsed: result.response.tokensUsed,
      };
    }),

  generateDueDiligenceActionPlan: consultorProcedure
    .input(z.object({
      assessmentId: z.number(),
      organizationId: z.number(),
      riskThreshold: z.number().min(1).max(5).default(3),
    }))
    .mutation(async ({ input, ctx }) => {
      const assessment = await db.getThirdPartyAssessmentById(input.assessmentId);
      if (!assessment) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Avaliação não encontrada' });
      }

      const org = await db.getOrganizationById(input.organizationId);
      const thirdParty = await db.getThirdPartyById(assessment.thirdPartyId);
      const responses = await db.getThirdPartyResponsesByAssessment(input.assessmentId);

      // Extrair gaps das respostas
      const gapsResult = aiService.extractDueDiligenceGaps(
        responses.map(r => ({
          questionId: r.questionId,
          questionText: `Questão ${r.questionId}`,
          category: 'Due Diligence',
          answer: String(r.selectedLevel),
          riskScore: r.riskScore,
          observation: r.notes || undefined,
        })),
        input.riskThreshold
      );
      const gaps = gapsResult.gaps;

      if (gaps.length === 0) {
        return {
          success: false,
          message: 'Nenhum risco identificado com o nível definido.',
          gapsCount: 0,
        };
      }

      // Buscar configurações personalizadas
      let orgConfig: aiService.AIOrganizationConfig | undefined;
      const instructions = await db.getAiOrganizationInstructions(input.organizationId, 'action_plans');
      if (instructions.length > 0) {
        const inst = instructions[0];
        orgConfig = {
          organizationId: inst.organizationId,
          module: 'action_plans',
          systemPrompt: inst.systemPrompt || undefined,
          contextInstructions: inst.contextInstructions || undefined,
          responseStyle: inst.responseStyle as aiService.ResponseStyle,
          includeRecommendations: Boolean(inst.includeRecommendations),
          includeRiskAnalysis: Boolean(inst.includeRiskAnalysis),
          includeActionPlan: Boolean(inst.includeActionPlan),
        };
      }

      const assessmentData = {
        id: assessment.id,
        title: assessment.title || 'Avaliação de Due Diligence',
        thirdPartyName: thirdParty?.tradeName || thirdParty?.name || 'Terceiro',
        thirdPartyType: thirdParty?.type || 'fornecedor',
        riskClassification: assessment.riskClassification || 'Não classificado',
        overallRiskScore: assessment.overallRiskScore || 0,
        organizationName: org?.tradeName || org?.name || 'Organização',
      };

      const result = await aiService.generateDueDiligenceActionPlan(
        assessmentData,
        gaps as any,
        orgConfig
      );

      // Salvar resultado gerado
      const resultId = await db.createAiGeneratedResult({
        organizationId: input.organizationId,
        module: 'action_plans',
        entityType: 'third_party_assessment',
        entityId: input.assessmentId,
        resultType: 'action_plan',
        title: `Plano de Ação - ${thirdParty?.tradeName || thirdParty?.name}`,
        content: result.response.content,
        structuredData: {
          gapsCount: gaps.length,
          parsedPlan: result.parsedPlan,
          riskThreshold: input.riskThreshold,
          thirdPartyId: thirdParty?.id,
        },
        createdById: ctx.user.id,
      });

      return {
        success: true,
        resultId,
        content: result.response.content,
        gapsCount: gaps.length,
        parsedPlan: result.parsedPlan,
        tokensUsed: result.response.tokensUsed,
      };
    }),

  refineActionPlan: consultorProcedure
    .input(z.object({
      resultId: z.number(),
      refinementRequest: z.string().min(1),
      organizationId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const existingResult = await db.getAiGeneratedResultById(input.resultId);
      if (!existingResult) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Resultado não encontrado' });
      }

      const org = await db.getOrganizationById(input.organizationId);

      // Buscar configurações personalizadas
      let orgConfig: aiService.AIOrganizationConfig | undefined;
      const instructions = await db.getAiOrganizationInstructions(input.organizationId, 'action_plans');
      if (instructions.length > 0) {
        const inst = instructions[0];
        orgConfig = {
          organizationId: inst.organizationId,
          module: 'action_plans',
          systemPrompt: inst.systemPrompt || undefined,
          contextInstructions: inst.contextInstructions || undefined,
          responseStyle: inst.responseStyle as aiService.ResponseStyle,
          includeRecommendations: Boolean(inst.includeRecommendations),
          includeRiskAnalysis: Boolean(inst.includeRiskAnalysis),
          includeActionPlan: Boolean(inst.includeActionPlan),
        };
      }

      const context: aiService.ChatContext = {
        organizationId: input.organizationId,
        organizationName: org?.tradeName || org?.name,
        module: 'action_plans',
        entityType: existingResult.entityType || undefined,
        entityId: existingResult.entityId || undefined,
      };

      const response = await aiService.refineActionPlan(
        existingResult.content,
        input.refinementRequest,
        context,
        orgConfig
      );

      // Criar novo resultado com o refinamento
      const newResultId = await db.createAiGeneratedResult({
        organizationId: input.organizationId,
        module: 'action_plans',
        entityType: existingResult.entityType,
        entityId: existingResult.entityId,
        resultType: 'action_plan',
        title: `${existingResult.title} (Refinado)`,
        content: response.content,
        structuredData: {
          ...(existingResult.structuredData as Record<string, unknown> || {}),
          refinedFrom: input.resultId,
          refinementRequest: input.refinementRequest,
        },
        createdById: ctx.user.id,
      });

      return {
        success: true,
        resultId: newResultId,
        content: response.content,
        tokensUsed: response.tokensUsed,
      };
    }),

  applyActionPlanToModule: consultorProcedure
    .input(z.object({
      resultId: z.number(),
      organizationId: z.number(),
      actions: z.array(z.object({
        title: z.string(),
        description: z.string(),
        priority: z.enum(['critica', 'alta', 'media', 'baixa']),
        dueDate: z.string().optional(),
        responsibleRole: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.getAiGeneratedResultById(input.resultId);
      if (!result) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Resultado não encontrado' });
      }

      // Determinar tipo de avaliação
      const assessmentType = result.entityType === 'compliance_assessment' ? 'compliance' : 'third_party';
      const assessmentId = result.entityId || 0;

      // Criar ações no módulo de planos de ação
      const createdActions: number[] = [];
      for (const action of input.actions) {
        const actionId = await db.createActionPlan({
          organizationId: input.organizationId,
          assessmentType,
          assessmentId,
          title: action.title,
          description: action.description,
          priority: action.priority,
          status: 'pendente',
          dueDate: action.dueDate ? new Date(action.dueDate).toISOString() : undefined,
          responsibleId: null,
          notes: action.responsibleRole ? `Responsável sugerido: ${action.responsibleRole}` : null,
        });
        createdActions.push(actionId);
      }

      // Marcar resultado como aplicado
      await db.applyAiGeneratedResult(input.resultId);

      return {
        success: true,
        createdActions,
        totalCreated: createdActions.length,
      };
    }),

  // ==================== SYSTEM TEMPLATES ====================
  getSystemTemplates: consultorProcedure
    .input(z.object({
      module: z.enum(['compliance', 'due_diligence', 'action_plans', 'general']).optional(),
    }))
    .query(async ({ input }) => {
      const templates = aiService.getAvailableTemplates(input.module as aiService.AIModule | undefined);
      return templates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        module: t.module,
        category: t.category,
        variables: t.variables,
      }));
    }),

  generateFromTemplate: consultorProcedure
    .input(z.object({
      templateId: z.string(),
      organizationId: z.number(),
      assessmentId: z.number(),
      assessmentType: z.enum(['compliance', 'due_diligence']),
      variables: z.record(z.string(), z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const org = await db.getOrganizationById(input.organizationId);
      let assessmentData: Record<string, unknown> = {};
      let entityName = '';

      if (input.assessmentType === 'compliance') {
        const assessment = await db.getComplianceAssessmentById(input.assessmentId);
        if (!assessment) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Avaliação não encontrada' });
        const responses = await db.getComplianceResponsesByAssessment(input.assessmentId);
        assessmentData = { ...assessment, responses };
        entityName = assessment.title || 'Avaliação de Conformidade';
      } else {
        const assessment = await db.getThirdPartyAssessmentById(input.assessmentId);
        if (!assessment) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Avaliação não encontrada' });
        const thirdParty = await db.getThirdPartyById(assessment.thirdPartyId);
        const responses = await db.getThirdPartyResponsesByAssessment(input.assessmentId);
        assessmentData = { ...assessment, thirdParty, responses };
        entityName = thirdParty?.tradeName || thirdParty?.name || 'Terceiro';
      }

      // Buscar configurações personalizadas
      let orgConfig: aiService.AIOrganizationConfig | undefined;
      const instructions = await db.getAiOrganizationInstructions(input.organizationId, input.assessmentType === 'compliance' ? 'compliance' : 'due_diligence');
      if (instructions.length > 0) {
        const inst = instructions[0];
        orgConfig = {
          organizationId: inst.organizationId,
          module: input.assessmentType === 'compliance' ? 'compliance' : 'due_diligence',
          systemPrompt: inst.systemPrompt || undefined,
          contextInstructions: inst.contextInstructions || undefined,
          responseStyle: inst.responseStyle as aiService.ResponseStyle,
          includeRecommendations: Boolean(inst.includeRecommendations),
          includeRiskAnalysis: Boolean(inst.includeRiskAnalysis),
          includeActionPlan: Boolean(inst.includeActionPlan),
        };
      }

      const variables = {
        organizationName: org?.tradeName || org?.name || 'Organização',
        thirdPartyName: entityName,
        maturityThreshold: '3',
        riskThreshold: '10',
        ...input.variables,
      };

      const response = await aiService.generateFromTemplate(
        input.templateId,
        variables,
        assessmentData,
        orgConfig
      );

      // Salvar resultado gerado
      const template = aiService.SYSTEM_PROMPT_TEMPLATES.find(t => t.id === input.templateId);
      const resultId = await db.createAiGeneratedResult({
        organizationId: input.organizationId,
        module: input.assessmentType === 'compliance' ? 'compliance' : 'due_diligence',
        entityType: input.assessmentType === 'compliance' ? 'compliance_assessment' : 'third_party_assessment',
        entityId: input.assessmentId,
        resultType: template?.category || 'analysis',
        title: `${template?.name || 'Análise'} - ${entityName}`,
        content: response.content,
        structuredData: { templateId: input.templateId, variables },
        createdById: ctx.user.id,
      });

      return {
        success: true,
        resultId,
        content: response.content,
        tokensUsed: response.tokensUsed,
      };
    }),

  // ==================== PARSE ACTIONS FROM PLAN ====================
  parseActionsFromPlan: consultorProcedure
    .input(z.object({
      content: z.string(),
    }))
    .mutation(async ({ input }) => {
      const parsed = aiService.parseActionsFromPlan(input.content);
      return parsed;
    }),

  // ==================== APPLY PARSED ACTIONS ====================
  applyParsedActions: consultorProcedure
    .input(z.object({
      resultId: z.number(),
      organizationId: z.number(),
      assessmentType: z.enum(['compliance', 'third_party', 'contract_analysis']),
      assessmentId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.getAiGeneratedResultById(input.resultId);
      if (!result) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Resultado não encontrado' });
      }

      // Fazer parse das ações do conteúdo
      const parsed = aiService.parseActionsFromPlan(result.content);

      if (parsed.actions.length === 0) {
        return {
          success: false,
          message: 'Nenhuma ação estruturada encontrada no plano.',
          totalCreated: 0,
        };
      }

      // Criar ações no módulo de planos de ação
      const createdActions: number[] = [];
      for (const action of parsed.actions) {
        // Calcular data de vencimento baseada nos dias estimados
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + action.estimatedDays);

        const actionId = await db.createActionPlan({
          organizationId: input.organizationId,
          assessmentType: input.assessmentType,
          assessmentId: input.assessmentId,
          title: action.title,
          description: action.description,
          priority: action.priority,
          status: 'pendente',
          dueDate: dueDate.toISOString(),
          responsibleId: null,
          notes: [
            action.responsibleRole ? `Responsável sugerido: ${action.responsibleRole}` : '',
            action.resources ? `Recursos: ${action.resources}` : '',
            action.successCriteria ? `Critérios de sucesso: ${action.successCriteria}` : '',
            action.dependencies ? `Dependências: ${action.dependencies}` : '',
          ].filter(Boolean).join('\n'),
        });
        createdActions.push(actionId);
      }

      // Marcar resultado como aplicado
      await db.applyAiGeneratedResult(input.resultId);

      return {
        success: true,
        createdActions,
        totalCreated: createdActions.length,
        parsedSummary: parsed.summary,
        recommendations: parsed.recommendations,
      };
    }),

  // ==================== EXPORT ACTION PLAN PDF ====================
  exportActionPlanPdf: consultorProcedure
    .input(z.object({
      resultId: z.number(),
      organizationId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const result = await db.getAiGeneratedResultById(input.resultId);
      if (!result) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Resultado não encontrado' });
      }

      const org = await db.getOrganizationById(input.organizationId);
      const parsed = aiService.parseActionsFromPlan(result.content);

      // Gerar HTML do plano de ação
      const html = generateActionPlanHTML({
        title: result.title || 'Plano de Ação',
        organizationName: org?.tradeName || org?.name || 'Organização',
        generatedAt: result.createdAt ? new Date(result.createdAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
        content: result.content,
        parsedPlan: parsed,
      });

      const pdfBuffer = await generatePDF(html);

      return {
        data: pdfBuffer.toString('base64'),
        contentType: 'application/pdf',
        filename: `plano-acao-${result.id}-${Date.now()}.pdf`,
      };
    }),
});

// ==================== EXECUTIVE DASHBOARD ROUTER ====================
const executiveDashboardRouter = router({
  getData: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        return null;
      }
      return db.getExecutiveDashboardData(input.organizationId);
    }),

  getRecentAssessments: protectedProcedure
    .input(z.object({ organizationId: z.number(), limit: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        return { compliance: [], thirdParty: [] };
      }
      return db.getRecentAssessments(input.organizationId, input.limit || 5);
    }),
});

// ==================== USER INVITE ROUTER ====================
const userInviteRouter = router({
  create: adminProcedure
    .input(z.object({
      email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'E-mail inválido'),
      name: z.string().optional(),
      role: z.enum(['admin_global', 'consultor', 'sponsor', 'comite', 'lider_processo', 'gestor_area', 'terceiro']),
      organizationId: z.number().optional(),
      message: z.string().optional(),
      expiresInDays: z.number().default(7),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verificar se já existe convite pendente para este e-mail
      const existingInvite = await db.getUserInviteByEmail(input.email);
      if (existingInvite) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Já existe um convite pendente para este e-mail' });
      }
      
      // Verificar se já existe usuário com este e-mail na mesma organização (multi-tenant)
      const existingUser = await db.getUserByEmailAndOrg(input.email, input.organizationId || null);
      if (existingUser) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Já existe um usuário com este e-mail nesta empresa.' });
      }
      
      // Gerar token único
      const token = Array.from({ length: 32 }, () => 
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(
          Math.floor(Math.random() * 62)
        )
      ).join('');
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);
      
      const inviteId = await db.createUserInvite({
        email: input.email,
        name: input.name,
        token,
        role: input.role,
        organizationId: input.organizationId,
        invitedById: ctx.user.id,
        status: 'pending',
        expiresAt: expiresAt.toISOString(),
        message: input.message,
      });
      
      // Obter nome da organização se houver
      let organizationName: string | undefined;
      if (input.organizationId) {
        const org = await db.getOrganizationById(input.organizationId);
        organizationName = org?.name;
      }
      
      // Enviar e-mail de convite
      const baseUrl = getAppBaseUrl();
      const inviteLink = `${baseUrl}/convite/${token}`;
      
      await sendUserInviteEmail({
        inviteeEmail: input.email,
        inviteeName: input.name,
        inviterName: ctx.user.name || 'Administrador',
        organizationName,
        role: input.role,
        inviteLink,
        expiresAt,
        customMessage: input.message,
      });
      
      // Marcar e-mail como enviado
      if (inviteId) {
        await db.markInviteEmailSent(inviteId);
      }
      
      return { 
        id: inviteId, 
        token, 
        link: inviteLink,
        expiresAt 
      };
    }),

  list: adminProcedure
    .input(z.object({ organizationId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      if (input?.organizationId) {
        return db.getUserInvitesByOrganization(input.organizationId);
      }
      return db.getAllUserInvites();
    }),

  validate: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const invite = await db.getUserInviteByToken(input.token);
      if (!invite) {
        return { valid: false, reason: 'not_found' };
      }
      
      if (invite.status !== 'pending') {
        return { valid: false, reason: invite.status };
      }
      
      if (new Date() > new Date(invite.expiresAt)) {
        return { valid: false, reason: 'expired' };
      }
      
      // Obter nome da organização
      let organizationName: string | undefined;
      if (invite.organizationId) {
        const org = await db.getOrganizationById(invite.organizationId);
        organizationName = org?.name;
      }
      
      return {
        valid: true,
        email: invite.email,
        name: invite.name,
        role: invite.role,
        organizationId: invite.organizationId,
        organizationName,
        expiresAt: invite.expiresAt,
      };
    }),

  resend: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const invite = await db.getUserInviteByToken('');
      // Buscar pelo ID
      const invites = await db.getAllUserInvites();
      const targetInvite = invites.find(i => i.id === input.id);
      
      if (!targetInvite) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Convite não encontrado' });
      }
      
      if (targetInvite.status !== 'pending') {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Este convite não está mais pendente' });
      }
      
      // Obter nome da organização
      let organizationName: string | undefined;
      if (targetInvite.organizationId) {
        const org = await db.getOrganizationById(targetInvite.organizationId);
        organizationName = org?.name;
      }
      
      const baseUrl = getAppBaseUrl();
      const inviteLink = `${baseUrl}/convite/${targetInvite.token}`;
      
      await sendUserInviteEmail({
        inviteeEmail: targetInvite.email,
        inviteeName: targetInvite.name || undefined,
        inviterName: ctx.user.name || 'Administrador',
        organizationName,
        role: targetInvite.role,
        inviteLink,
        expiresAt: new Date(targetInvite.expiresAt),
        customMessage: targetInvite.message || undefined,
      });
      
      await db.markInviteEmailSent(input.id);
      
      return { success: true };
    }),

  cancel: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.cancelUserInvite(input.id);
      return { success: true };
    }),
});

// ==================== GED ROUTER ====================
const gedRouter = router({
  // Listar pastas
  listFolders: protectedProcedure
    .input(z.object({
      spaceType: z.enum(["organization", "seusdados"]),
      organizationId: z.number().optional().nullable(),
      parentFolderId: z.number().optional().nullable(),
    }))
    .query(async ({ input, ctx }) => {
      const user: gedService.GedUser = {
        id: ctx.user.id,
        role: ctx.user.role as gedService.UserRole,
        organizationId: ctx.user.organizationId,
      };
      return gedService.listFolders(user, input.spaceType, input.organizationId, input.parentFolderId);
    }),

  // Obter pasta por ID
  getFolderById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const user: gedService.GedUser = {
        id: ctx.user.id,
        role: ctx.user.role as gedService.UserRole,
        organizationId: ctx.user.organizationId,
      };
      return gedService.getFolderById(user, input.id);
    }),

  // Criar pasta
  createFolder: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      spaceType: z.enum(["organization", "seusdados"]),
      organizationId: z.number().optional().nullable(),
      parentFolderId: z.number().optional().nullable(),
      icon: z.string().optional(),
      color: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const user: gedService.GedUser = {
        id: ctx.user.id,
        role: ctx.user.role as gedService.UserRole,
        organizationId: ctx.user.organizationId,
      };
      return gedService.createFolder(user, input);
    }),

  // Excluir pasta
  deleteFolder: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const user: gedService.GedUser = {
        id: ctx.user.id,
        role: ctx.user.role as gedService.UserRole,
        organizationId: ctx.user.organizationId,
      };
      await gedService.deleteFolder(user, input.id);
      return { success: true };
    }),

  // Listar documentos de uma pasta
  listDocuments: protectedProcedure
    .input(z.object({ folderId: z.number() }))
    .query(async ({ input, ctx }) => {
      const user: gedService.GedUser = {
        id: ctx.user.id,
        role: ctx.user.role as gedService.UserRole,
        organizationId: ctx.user.organizationId,
      };
      return gedService.listDocuments(user, input.folderId);
    }),

  // Obter documento por ID
  getDocumentById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const user: gedService.GedUser = {
        id: ctx.user.id,
        role: ctx.user.role as gedService.UserRole,
        organizationId: ctx.user.organizationId,
      };
      return gedService.getDocumentById(user, input.id);
    }),

  // Obter URL de download
  getDownloadUrl: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const user: gedService.GedUser = {
        id: ctx.user.id,
        role: ctx.user.role as gedService.UserRole,
        organizationId: ctx.user.organizationId,
      };
      const url = await gedService.getDocumentDownloadUrl(user, input.id);
      return { url };
    }),

  // Upload de documento (recebe base64)
  uploadDocument: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      folderId: z.number(),
      fileData: z.string(), // Base64
      fileName: z.string(),
      mimeType: z.string(),
      tags: z.array(z.string()).optional(),
      linkedEntityType: z.string().optional(),
      linkedEntityId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const user: gedService.GedUser = {
        id: ctx.user.id,
        role: ctx.user.role as gedService.UserRole,
        organizationId: ctx.user.organizationId,
      };
      const buffer = Buffer.from(input.fileData, "base64");
      return gedService.uploadDocument(user, {
        name: input.name,
        description: input.description,
        folderId: input.folderId,
        file: buffer,
        fileName: input.fileName,
        mimeType: input.mimeType,
        tags: input.tags,
        linkedEntityType: input.linkedEntityType,
        linkedEntityId: input.linkedEntityId,
      });
    }),

  // Compartilhar documento com cliente
  shareWithClient: protectedProcedure
    .input(z.object({
      documentId: z.number(),
      share: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const user: gedService.GedUser = {
        id: ctx.user.id,
        role: ctx.user.role as gedService.UserRole,
        organizationId: ctx.user.organizationId,
      };
      return gedService.shareDocumentWithClient(user, input.documentId, input.share);
    }),

  // Excluir documento
  deleteDocument: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const user: gedService.GedUser = {
        id: ctx.user.id,
        role: ctx.user.role as gedService.UserRole,
        organizationId: ctx.user.organizationId,
      };
      await gedService.deleteDocument(user, input.id);
      return { success: true };
    }),

  // Mover documento
  moveDocument: protectedProcedure
    .input(z.object({
      documentId: z.number(),
      targetFolderId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const user: gedService.GedUser = {
        id: ctx.user.id,
        role: ctx.user.role as gedService.UserRole,
        organizationId: ctx.user.organizationId,
      };
      return gedService.moveDocument(user, input.documentId, input.targetFolderId);
    }),

  // Buscar documentos
  searchDocuments: protectedProcedure
    .input(z.object({
      spaceType: z.enum(["organization", "seusdados"]),
      organizationId: z.number().optional().nullable(),
      searchTerm: z.string().min(1),
    }))
    .query(async ({ input, ctx }) => {
      const user: gedService.GedUser = {
        id: ctx.user.id,
        role: ctx.user.role as gedService.UserRole,
        organizationId: ctx.user.organizationId,
      };
      return gedService.searchDocuments(user, input.spaceType, input.organizationId ?? null, input.searchTerm);
    }),

  // Obter estatísticas do GED
  getStats: protectedProcedure
    .input(z.object({
      spaceType: z.enum(["organization", "seusdados"]),
      organizationId: z.number().optional().nullable(),
    }))
    .query(async ({ input, ctx }) => {
      const user: gedService.GedUser = {
        id: ctx.user.id,
        role: ctx.user.role as gedService.UserRole,
        organizationId: ctx.user.organizationId,
      };
      return gedService.getGedStats(user, input.spaceType, input.organizationId);
    }),

  // Criar pastas padrão para organização
  initializeOrganizationFolders: adminProcedure
    .input(z.object({ organizationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await gedService.createDefaultFoldersForOrganization(input.organizationId, ctx.user.id);
      return { success: true };
    }),

  // Criar pastas padrão do GED Seusdados
  initializeSeusdadosFolders: adminProcedure
    .mutation(async ({ ctx }) => {
      await gedService.createDefaultSeusdadosFolders(ctx.user.id);
      return { success: true };
    }),

  // Upload direto para o GED do cliente (para consultores)
  uploadToClientGed: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      organizationId: z.number(),
      fileData: z.string(), // Base64
      fileName: z.string(),
      mimeType: z.string(),
      tags: z.array(z.string()).optional(),
      folderName: z.string().default("Contratos"), // Pasta destino no GED do cliente
    }))
    .mutation(async ({ input, ctx }) => {
      // Apenas consultores e admins podem fazer upload para GED de clientes
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas consultores podem fazer upload para o GED de clientes' });
      }

      const user: gedService.GedUser = {
        id: ctx.user.id,
        role: ctx.user.role as gedService.UserRole,
        organizationId: ctx.user.organizationId,
      };

      // Buscar ou criar a pasta destino no GED do cliente
      const folder = await gedService.getOrCreateClientFolder(user, input.organizationId, input.folderName);

      const buffer = Buffer.from(input.fileData, "base64");
      const document = await gedService.uploadDocument(user, {
        name: input.name,
        description: input.description,
        folderId: folder.id,
        file: buffer,
        fileName: input.fileName,
        mimeType: input.mimeType,
        tags: input.tags,
      });

      return {
        document,
        folderName: folder.name,
        organizationId: input.organizationId,
      };
    }),

  // ==================== VINCULAÇÃO DE DOCUMENTOS ÀS AVALIAÇÕES ====================

  // Vincular documento a uma avaliação
  linkDocumentToAssessment: protectedProcedure
    .input(z.object({
      assessmentType: z.enum(["conformidade", "due_diligence"]),
      assessmentId: z.number(),
      documentId: z.number(),
      category: z.enum([
        "evidencia_conformidade",
        "documento_suporte",
        "relatorio_auditoria",
        "politica_procedimento",
        "contrato",
        "termo_responsabilidade",
        "outro"
      ]).optional().default("documento_suporte"),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verificar se o usuário tem acesso ao documento
      const user: gedService.GedUser = {
        id: ctx.user.id,
        role: ctx.user.role as gedService.UserRole,
        organizationId: ctx.user.organizationId,
      };
      
      const document = await gedService.getDocumentById(user, input.documentId);
      if (!document) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Documento não encontrado' });
      }
      
      // Verificar acesso ao documento
      const canAccess = gedService.canAccessSpace(
        user, 
        document.spaceType as "organization" | "seusdados", 
        document.organizationId
      );
      if (!canAccess) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Sem permissão para acessar este documento' });
      }
      
      const id = await db.linkDocumentToAssessment({
        assessmentType: input.assessmentType,
        assessmentId: input.assessmentId,
        documentId: input.documentId,
        category: input.category,
        description: input.description || null,
        linkedById: ctx.user.id,
      });
      
      return { id, success: true };
    }),

  // Desvincular documento de uma avaliação
  unlinkDocumentFromAssessment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const link = await db.getAssessmentDocumentById(input.id);
      if (!link) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Vínculo não encontrado' });
      }
      
      // Apenas quem vinculou ou admin/consultor pode desvincular
      if (link.linkedById !== ctx.user.id && 
          ctx.user.role !== 'admin_global' && 
          ctx.user.role !== 'consultor') {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Sem permissão para remover este vínculo' });
      }
      
      await db.unlinkDocumentFromAssessment(input.id);
      return { success: true };
    }),

  // Listar documentos vinculados a uma avaliação
  getAssessmentDocuments: protectedProcedure
    .input(z.object({
      assessmentType: z.enum(["conformidade", "due_diligence"]),
      assessmentId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const links = await db.getAssessmentDocuments(input.assessmentType, input.assessmentId);
      
      // Buscar detalhes dos documentos
      const user: gedService.GedUser = {
        id: ctx.user.id,
        role: ctx.user.role as gedService.UserRole,
        organizationId: ctx.user.organizationId,
      };
      
      const documentsWithDetails = await Promise.all(
        links.map(async (link) => {
          try {
            const document = await gedService.getDocumentById(user, link.documentId);
            return {
              ...link,
              document,
            };
          } catch {
            return {
              ...link,
              document: null,
            };
          }
        })
      );
      
      return documentsWithDetails.filter(d => d.document !== null);
    }),

  // Listar documentos disponíveis para vincular (do GED da organização)
  getAvailableDocumentsForAssessment: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      folderId: z.number().optional().nullable(),
    }))
    .query(async ({ input, ctx }) => {
      const user: gedService.GedUser = {
        id: ctx.user.id,
        role: ctx.user.role as gedService.UserRole,
        organizationId: ctx.user.organizationId,
      };
      
      // Verificar acesso à organização
      if (!gedService.canAccessSpace(user, "organization", input.organizationId)) {
        return { folders: [], documents: [] };
      }
      
      // Listar pastas e documentos da pasta atual
      const folders = await gedService.listFolders(
        user,
        "organization",
        input.organizationId,
        input.folderId ?? null
      );
      
      let documents: any[] = [];
      if (input.folderId) {
        documents = await gedService.listDocuments(user, input.folderId);
      }
      
      return { folders, documents };
    }),

  // Renomear pasta
  renameFolder: protectedProcedure
    .input(z.object({
      folderId: z.number(),
      newName: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const user: gedService.GedUser = {
        id: ctx.user.id,
        role: ctx.user.role as gedService.UserRole,
        organizationId: ctx.user.organizationId,
      };
      
      // Verificar se a pasta existe e o usuário tem permissão
      const folder = await gedService.getFolderById(user, input.folderId);
      if (!folder) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Pasta não encontrada' });
      }
      
      // Verificar permissão
      if (!gedService.canEditFolder(user, folder)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para renomear esta pasta' });
      }
      
      await gedService.renameFolder(input.folderId, input.newName);
      await gedService.logAccess(ctx.user.id, 'folder', input.folderId, 'rename', { newName: input.newName });
      
      return { success: true };
    }),

  // Renomear documento
  renameDocument: protectedProcedure
    .input(z.object({
      documentId: z.number(),
      newName: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const user: gedService.GedUser = {
        id: ctx.user.id,
        role: ctx.user.role as gedService.UserRole,
        organizationId: ctx.user.organizationId,
      };
      
      // Verificar se o documento existe
      const document = await gedService.getDocumentById(user, input.documentId);
      if (!document) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Documento não encontrado' });
      }
      
      // Verificar permissão
      if (!gedService.canEditDocument(user, document)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para renomear este documento' });
      }
      
      await gedService.renameDocument(input.documentId, input.newName);
      await gedService.logAccess(ctx.user.id, 'document', input.documentId, 'rename', { newName: input.newName });
      
      return { success: true };
    }),

  // Listar versões de um documento
  listVersions: protectedProcedure
    .input(z.object({
      documentId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const user: gedService.GedUser = {
        id: ctx.user.id,
        role: ctx.user.role as gedService.UserRole,
        organizationId: ctx.user.organizationId,
      };
      
      return gedService.listDocumentVersions(user, input.documentId);
    }),

  // Restaurar versão anterior de um documento
  restoreVersion: protectedProcedure
    .input(z.object({
      documentId: z.number(),
      versionId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const user: gedService.GedUser = {
        id: ctx.user.id,
        role: ctx.user.role as gedService.UserRole,
        organizationId: ctx.user.organizationId,
      };
      
      // Verificar se o documento existe
      const document = await gedService.getDocumentById(user, input.documentId);
      if (!document) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Documento não encontrado' });
      }
      
      // Verificar permissão
      if (!gedService.canEditDocument(user, document)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para restaurar versão' });
      }
      
      await gedService.restoreDocumentVersion(user, input.documentId, input.versionId);
      await gedService.logAccess(ctx.user.id, 'document', input.documentId, 'edit', { action: 'restore_version', versionId: input.versionId });
      
      return { success: true };
    }),
});

// ==================== AUDIT ROUTER ====================
const auditRouter = router({
  list: adminProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      entityType: z.string().optional(),
      entityId: z.number().optional(),
      action: z.string().optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      return db.getAuditLogsWithUser(input);
    }),
    
  getByEntity: adminProcedure
    .input(z.object({
      entityType: z.string(),
      entityId: z.number(),
    }))
    .query(async ({ input }) => {
      return db.getAuditLogs({
        entityType: input.entityType,
        entityId: input.entityId,
        limit: 50
      });
    }),
});

// ==================== MAIN ROUTER ====================
export const appRouter = router({
  orgSync: orgSyncRouter,
  taxonomy: taxonomyRouter,
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(async (opts) => {
      const user = opts.ctx.user;
      if (!user) return null;
      
      // Buscar mustChangePassword do banco para incluir na resposta
      try {
        const database = await db.getDb();
        const { sql: sqlTag } = await import('drizzle-orm');
        const result = await database.execute(sqlTag`
          SELECT must_change_password as "mustChangePassword" 
          FROM users WHERE id = ${user.id} LIMIT 1
        `);
        const dbUser = (result.rows as any)?.[0];
        return {
          ...user,
          mustChangePassword: dbUser?.mustChangePassword === true,
        };
      } catch {
        return { ...user, mustChangePassword: false };
      }
    }),
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(1, 'Nome é obrigatório').max(200).optional(),
        phone: z.string().max(20).optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const updateData: Record<string, unknown> = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.phone !== undefined) updateData.phone = input.phone || null;

        if (Object.keys(updateData).length === 0) {
          return { success: true, message: 'Nenhuma alteração detectada' };
        }

        await db.updateUser(ctx.user.id, updateData as any);
        return { success: true, message: 'Perfil atualizado com sucesso' };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  organization: organizationRouter,
  user: userRouter,
  thirdParty: thirdPartyRouter,
  compliance: complianceRouter,
  thirdPartyAssessment: thirdPartyAssessmentRouter,
  actionPlan: actionPlanRouter,
  admin: adminRouter,
  accessLink: accessLinkRouter,
  evidence: evidenceRouter,
  reminderSettings: reminderSettingsRouter,
  executiveDashboard: executiveDashboardRouter,
  ai: aiRouter,
  userInvite: userInviteRouter,
  ged: gedRouter,
  contractAnalysis: contractAnalysisRouter,
  lgpdTemplate: lgpdTemplateRouter,
  simulador: simuladorRouter,
  scenario: scenarioRouter,
  governanca: governancaRouter,
  tickets: ticketsRouter,
  notifications: notificationsRouter,
  rot: rotRouter,
  mapeamento: mapeamentoRouter,
  fase3: fase3Router,
  cppdInitiative: cppdInitiativeRouter,
  govbrSignature: govbrSignatureRouter,
  alerts: alertsRouter,
  maturityEngine: maturityEngineRouter,
  maturityIndicator: maturityIndicatorRouter,
  localAuth: localAuthRouter,
  incidents: incidentsRouter,
  serviceCatalog: serviceCatalogRouter,
  userPreferences: userPreferencesRouter,
  audit: auditRouter,
  clauseComments: clauseCommentsRouter,
  clauseAnnotations: clauseAnnotationsRouter,
  commentNotifications: commentNotificationsRouter,

  dpia: dpiaRouter,
  seusdados: seusdadosRouter,
  paAnpd: paAnpdRouter,
  assessments: assessmentsRouter,
  reports: reportRouter,
  review: reviewRouter,
  ripdEvidence: ripdEvidenceRouter,
  ripdAi: ripdAiRouter,
  ripdWorkflowPremium: ripdWorkflowRouterPremium,
  ripdSignature: ripdSignatureRouter,
  ripdReport: ripdReportRouter,
  ripdTasks: ripdTasksRouter,
  ripdContractIntegration: ripdContractIntegrationRouter,
  ripdAdmin: ripdAdminRouter,
  rotDocument: rotDocumentRouter,
  deadlines: deadlinesRouter,
  dashboardData: dashboardRouter,
  userProfiles: userProfilesRouter,
});

export type AppRouter = typeof appRouter;
