// server/mapeamentoRouter.ts
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import * as mapeamentoService from "./mapeamentoService";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import * as maturityEvents from './maturityEventIntegration';
import * as dataUseService from "./dataUseService";

const listProcessesByAreasSchema = z.object({
  organizationId: z.number().positive(),
  contextId: z.number().positive(),
  areaIds: z.array(z.number().positive()).optional(),
});

// ==========================
// SCHEMAS DE VALIDAÇÃO
// ==========================

const saveContextSchema = z.object({
  organizationId: z.number().positive(),
  segment: z.string().min(1),
  businessType: z.string().min(1),
  employeesRange: z.string().optional(),
  unitsCount: z.number().positive().optional(),
  hasDataProtectionOfficer: z.boolean().optional(),
  dataProtectionOfficerName: z.string().optional(),
  dataProtectionOfficerEmail: z.string().email().optional().or(z.literal('')),
});

const confirmAreasSchema = z.object({
  organizationId: z.number().positive(),
  contextId: z.number().positive(),
  areas: z.array(
    z.object({
      name: z.string().min(1),
      isCustom: z.boolean().optional(),
    })
  ).min(1),
});

const createRespondentSchema = z.object({
  organizationId: z.number().positive(),
  areaId: z.number().positive(),
  processId: z.number().positive().optional(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.string().optional(),
});

const saveResponseSchema = z.object({
  token: z.string().min(32),
  processId: z.number().positive(),
  completed: z.boolean().optional(),
  data: z.object({
    dataCategories: z.array(
      z.object({ name: z.string(), sensivel: z.boolean() })
    ).optional(),
    titularCategories: z.array(z.string()).optional(),
    legalBase: z.string().optional(),
    sharing: z.array(z.string()).optional(),
    consentObtained: z.boolean().optional(),
    retentionPeriod: z.string().optional(),
    storageLocation: z.string().optional(),
    securityMeasures: z.array(z.string()).optional(),
    internationalTransfer: z.boolean().optional(),
    internationalCountries: z.array(z.string()).optional(),
    notes: z.string().optional(),
  ropaData: z.object({
    collectionSources: z.array(z.string()).optional(),
    collectionChannels: z.array(z.string()).optional(),
    systemsUsed: z.array(z.string()).optional(),
    paperRecords: z.boolean().optional(),
    accessProfiles: z.array(z.string()).optional(),
    volumeFrequency: z.string().optional(),
    retentionLegalBasis: z.string().optional(),
    disposalCriteria: z.string().optional(),
    logsAndTraceability: z.string().optional(),
    additionalNotes: z.string().optional(),
    childrenOrTeens: z.boolean().optional(),
    systematicMonitoring: z.boolean().optional(),
    largeScale: z.boolean().optional(),
    operators: z.array(z.object({
      name: z.string(),
      role: z.enum(["operador", "suboperador", "destinatario", "controlador_conjunto", "outro"]).optional(),
      serviceType: z.string().optional(),
      dataShared: z.array(z.string()).optional(),
      country: z.string().optional(),
      hasContract: z.boolean().optional(),
      hasDpa: z.boolean().optional(),
      hasSecurityAnnex: z.boolean().optional(),
      notes: z.string().optional(),
    })).optional(),
    processSteps: z.array(z.object({
      title: z.string().optional(),
      actor: z.string().optional(),
      channel: z.array(z.string()).optional(),
      channels: z.array(z.string()).optional(),
      systems: z.array(z.string()).optional(),
      dataUsed: z.array(z.string()).optional(),
      dataItems: z.array(z.string()).optional(),
      operations: z.array(z.string()).optional(),
      sharing: z.array(z.string()).optional(),
      controls: z.string().optional(),
      notes: z.string().optional(),
    })).optional(),
    // FUNIL DATA USE (átomo): titular + dado + finalidade + (sugestões base legal e risco)
    dataUses: z.array(z.object({
      subjectGroup: z.string(),
      dataElement: z.string(),
      purposes: z.array(z.string()), // FIN-xx
      operations: z.array(z.string()).optional(),
      systems: z.array(z.string()).optional(),
      channels: z.array(z.string()).optional(),
      recipients: z.array(z.string()).optional(),
      retentionPeriod: z.string().optional().nullable(),
      necessity: z.object({
        required: z.boolean().optional(),
        lessInvasiveAlt: z.boolean().optional(),
        legalOrContractual: z.boolean().optional(),
      }).optional(),
      riskSignals: z.any().optional(),
      legalBasisSuggested: z.any().optional(),
      legalBasisValidated: z.object({
        code: z.string(),
        justification: z.string().optional(),
        status: z.enum(["accepted", "adjusted", "rejected"]).optional()
      }).optional(),
    })).optional(),
  }).optional(),
  }),
});

// ==========================
// ROUTER
// ==========================

export const mapeamentoRouter = router({
  // ==================== DATA USE FUNNEL ====================
  getPurposeCatalog: publicProcedure.query(() => dataUseService.listPurposes()),

  suggestDataUses: publicProcedure
    .input(z.object({
      subjectGroups: z.array(z.string()),
      dataElements: z.array(z.object({ name: z.string(), sensivel: z.boolean().optional() })),
      purposeByDataElement: z.record(z.string(), z.array(z.string())),
      systems: z.array(z.string()).optional(),
      channels: z.array(z.string()).optional(),
      recipients: z.array(z.string()).optional(),
      internationalTransfer: z.boolean().optional(),
      operatorsCount: z.number().optional(),
      volumeFrequency: z.string().optional(),
      monitoring: z.boolean().optional(),
    }))
    .mutation(({ input }) => dataUseService.suggestDataUses(input)),

  // ==================== FASE 0 ====================

  // Obter contexto organizacional
  getContext: protectedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return mapeamentoService.getContext(input.organizationId);
    }),

  // Salvar contexto organizacional
  saveContext: protectedProcedure
    .input(saveContextSchema)
    .mutation(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const id = await mapeamentoService.saveContext(input);
      return { id };
    }),

  // Sugerir áreas baseado no segmento
  suggestAreas: protectedProcedure
    .input(z.object({ segment: z.string(), businessType: z.string() }))
    .query(({ input }) => {
      return mapeamentoService.suggestAreas(input.segment, input.businessType);
    }),

  // Confirmar áreas selecionadas
  confirmAreas: protectedProcedure
    .input(confirmAreasSchema)
    .mutation(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const result = await mapeamentoService.confirmAreas(
        input.organizationId,
        input.contextId,
        input.areas
      );
      
      // Registrar eventos de maturidade para cada área mapeada
      for (const area of input.areas) {
        await maturityEvents.onMapeamentoCriado(
          String(input.organizationId),
          `area-${input.contextId}-${area.name}`,
          area.name
        );
      }
      
      return result;
    }),

  // Listar áreas
  listAreas: protectedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return mapeamentoService.listAreas(input.organizationId);
    }),

  // ==================== FASE 1 ====================

  // Criar respondente
  createRespondent: protectedProcedure
    .input(createRespondentSchema)
    .mutation(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return mapeamentoService.createRespondent(input);
    }),

  // PREMIUM: reatribuir processo (respondente redireciona)
  reassignProcess: publicProcedure
    .input(z.object({ token: z.string().min(10), newName: z.string().min(2), newEmail: z.string().email() }))
    .mutation(async ({ input }) => {
      return mapeamentoService.reassignProcessByToken(input);
    }),

  // Listar respondentes
  listRespondents: protectedProcedure
    .input(z.object({ 
      organizationId: z.number().positive(),
      areaId: z.number().positive().optional()
    }))
    .query(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return mapeamentoService.listRespondents(input.organizationId, input.areaId);
    }),

  // Marcar convite como enviado
  markInviteSent: protectedProcedure
    .input(z.object({ respondentId: z.number().positive() }))
    .mutation(async ({ input }) => {
      await mapeamentoService.markInviteSent(input.respondentId);
      return { success: true };
    }),

  // Renovar token do respondente (gera novo token e estende validade)
  renewToken: protectedProcedure
    .input(z.object({ respondentId: z.number().positive() }))
    .mutation(async ({ input }) => {
      return mapeamentoService.renewRespondentToken(input.respondentId);
    }),

  // Reenviar convite por email
  resendInvite: protectedProcedure
    .input(z.object({ respondentId: z.number().positive() }))
    .mutation(async ({ input }) => {
      return mapeamentoService.resendInvite(input.respondentId);
    }),

  // Excluir respondente
  deleteRespondent: protectedProcedure
    .input(z.object({ respondentId: z.number().positive() }))
    .mutation(async ({ input }) => {
      return mapeamentoService.deleteRespondent(input.respondentId);
    }),

  // ==================== FASE 2 - ENTREVISTA ====================

  // Acessar entrevista via token (público)
  getInterview: publicProcedure
    .input(z.object({ token: z.string().min(32) }))
    .query(async ({ input }) => {
      const interview = await mapeamentoService.getInterviewByToken(input.token);
      if (!interview) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Convite inválido ou expirado" });
      }
      return interview;
    }),

  // Salvar resposta (público)
  saveResponse: publicProcedure
    .input(saveResponseSchema)
    .mutation(async ({ input }) => {
      return mapeamentoService.saveResponse(input.token, input.processId, input.data, { completed: input.completed });
}),

  // Finalizar entrevista (público)
  finalizeInterview: publicProcedure
    .input(z.object({ token: z.string().min(32) }))
    .mutation(async ({ input }) => {
      return mapeamentoService.finalizeInterview(input.token);
    }),

  // ==================== ESTATÍSTICAS ====================

  // Obter estatísticas do mapeamento
  getStats: protectedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return mapeamentoService.getMapeamentoStats(input.organizationId);
    }),

  // ==================== PLANOS DE AÇÃO ====================

  // Listar planos de ação
  listActionPlans: protectedProcedure
    .input(z.object({ 
      organizationId: z.number().positive(),
      status: z.string().optional()
    }))
    .query(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return mapeamentoService.listActionPlans(input.organizationId, input.status);
    }),

  // Atualizar plano de ação
  updateActionPlan: protectedProcedure
    .input(z.object({
      id: z.number().positive(),
      status: z.enum(["pendente", "em_andamento", "concluida", "cancelada"]).optional(),
      evidence: z.string().optional(),
      evidenceFileKey: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const updateData: any = { ...input };
      delete updateData.id;

      if (input.status === "concluida") {
        updateData.completedAt = new Date();
        updateData.completedById = ctx.user.id;
      }

      await mapeamentoService.updateActionPlan(input.id, updateData);
      return { success: true };
    }),

  // Listar ações próximas do vencimento
  listOverdueActions: protectedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return mapeamentoService.getOverdueActions(input.organizationId);
    }),

  // ==================== GERAÇÃO DE DOCUMENTOS ====================

  // Gerar ROT a partir de resposta
  generateROT: protectedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      responseId: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return mapeamentoService.generateROTFromResponse(
        input.organizationId,
        input.responseId
      );
    }),

  // Gerar POP a partir de ROT
  generatePOP: protectedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      rotId: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return mapeamentoService.generatePOPFromROT(
        input.organizationId,
        input.rotId
      );
    }),

  // Exportar ROT como documento
  exportROT: protectedProcedure
    .input(z.object({ rot: z.any() }))
    .query(({ input }) => {
      return mapeamentoService.generateROTDocument(input.rot);
    }),

  // Exportar POP como documento
  exportPOP: protectedProcedure
    .input(z.object({ pop: z.any() }))
    .query(({ input }) => {
      return mapeamentoService.generatePOPDocument(input.pop);
    }),

  // Exportar ROPA como Markdown
  exportROPA: protectedProcedure
    .input(z.object({ rot: z.any() }))
    .query(({ input }) => {
      return mapeamentoService.generateROPADocument(input.rot);
    }),

  // ==================== NOTIFICAÇÕES ====================

  // Enviar convite de entrevista para um responsável
  sendInterviewInvitation: protectedProcedure
    .input(z.object({
      respondentId: z.number().positive(),
      baseUrl: z.string().url(),
    }))
    .mutation(async ({ input }) => {
      return mapeamentoService.sendInterviewInvitation(
        input.respondentId,
        input.baseUrl
      );
    }),

  // Enviar convites em massa para todos os responsáveis pendentes
  sendBulkInterviewInvitations: protectedProcedure
    .input(z.object({
      contextId: z.number().positive(),
      baseUrl: z.string().url(),
    }))
    .mutation(async ({ input }) => {
      return mapeamentoService.sendBulkInterviewInvitations(
        input.contextId,
        input.baseUrl
      );
    }),

  // ==================== LEMBRETES AUTOMÁTICOS ====================

  // Obter configuração de lembretes
  getReminderConfig: protectedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return mapeamentoService.getReminderConfig(input.organizationId);
    }),

  // Salvar configuração de lembretes
  saveReminderConfig: protectedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      daysBeforeReminder: z.number().min(1).max(30),
      reminderFrequencyDays: z.number().min(1).max(14),
      maxReminders: z.number().min(1).max(10),
      emailTemplate: z.string().optional(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await mapeamentoService.saveReminderConfig(input);
      return { success: true };
    }),

  // Listar lembretes pendentes
  getPendingReminders: protectedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return mapeamentoService.getPendingReminders(input.organizationId);
    }),

  // Enviar lembrete
  sendReminder: protectedProcedure
    .input(z.object({
      respondentId: z.number().positive(),
      organizationId: z.number().positive(),
      email: z.string().email(),
      name: z.string(),
      areaName: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const success = await mapeamentoService.sendReminder(
        input.respondentId,
        input.organizationId,
        input.email,
        input.name,
        input.areaName
      );
      return { success };
    }),

  // Histórico de lembretes
  getReminderHistory: protectedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return mapeamentoService.getReminderHistory(input.organizationId);
    }),

  // Obter contratos vinculados a um mapeamento (integração reversa)
  getLinkedContracts: protectedProcedure
    .input(z.object({ responseId: z.number().positive().optional(), rotId: z.number().positive().optional() }).refine(v => !!v.responseId || !!v.rotId, { message: "Informe responseId ou rotId" }))
    .query(async ({ input, ctx }) => {
      const { getLinkedContractsForMapeamento } = await import('./contractMapeamentoIntegrationService');
      return getLinkedContractsForMapeamento({ responseId: input.responseId, rotId: input.rotId });
    }),

  // ==========================
  // INTEGRAÇÃO COM MAPEAMENTOS DE CONTRATOS
  // ==========================

  // Listar todos os mapeamentos de contratos aprovados para a organização
  listContractMapeamentos: protectedProcedure
    .input(z.object({ 
      organizationId: z.number().positive(),
      status: z.enum(['pending', 'created', 'reviewed', 'error', 'draft', 'approved', 'rejected', 'all']).optional().default('all')
    }))
    .query(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      const db = await import('./db').then(m => m.getDb());
      const { contractMapeamentoLinks, contractAnalyses, mapeamentoResponses } = await import('../drizzle/schema');
      const { eq, and, desc, sql } = await import('drizzle-orm');
      
      let query = db
        .select({
          id: contractMapeamentoLinks.id,
          contractAnalysisId: contractMapeamentoLinks.contractAnalysisId,
          responseId: contractMapeamentoLinks.responseId,
          rotId: contractMapeamentoLinks.rotId,
          status: contractMapeamentoLinks.linkStatus,
          extractedData: contractMapeamentoLinks.extractedData,
          createdAt: contractMapeamentoLinks.createdAt,
          contractTitle: contractAnalyses.contractName,
          contractStatus: contractAnalyses.contractAnalysisStatus,
        })
        .from(contractMapeamentoLinks)
        .innerJoin(contractAnalyses, eq(contractMapeamentoLinks.contractAnalysisId, contractAnalyses.id))
        .where(eq(contractAnalyses.organizationId, input.organizationId))
        .orderBy(desc(contractMapeamentoLinks.createdAt));
      
      const results = await query;
      
      // Filtrar por status se especificado
      if (input.status && input.status !== 'all') {
        const normalized = input.status === 'rejected' ? 'error' : input.status;
        return results.filter(r => r.status === normalized);
      }
      
      return results;
    }),

  // Obter estatísticas unificadas de mapeamentos (manuais + contratos)
  getUnifiedStats: protectedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      const db = await import('./db').then(m => m.getDb());
      const { rotOperations, contractMapeamentoLinks, contractAnalyses, mapeamentoResponses } = await import('../drizzle/schema');
      const { eq, and, sql, count } = await import('drizzle-orm');
      
      // Estatísticas de ROTs (mapeamentos manuais)
      const [rotStats] = await db
        .select({
          total: count(),
          rascunho: sql<number>`SUM(CASE WHEN status = 'rascunho' THEN 1 ELSE 0 END)`,
          em_revisao: sql<number>`SUM(CASE WHEN status = 'em_revisao' THEN 1 ELSE 0 END)`,
          aprovado: sql<number>`SUM(CASE WHEN status = 'aprovado' THEN 1 ELSE 0 END)`,
          arquivado: sql<number>`SUM(CASE WHEN status = 'arquivado' THEN 1 ELSE 0 END)`,
        })
        .from(rotOperations)
        .where(eq(rotOperations.organizationId, input.organizationId));
      
      // Estatísticas de mapeamentos de contratos
      const [contractStats] = await db
        .select({
          total: count(),
          draft: sql<number>`SUM(CASE WHEN ${contractMapeamentoLinks.linkStatus} = 'draft' THEN 1 ELSE 0 END)`,
          approved: sql<number>`SUM(CASE WHEN ${contractMapeamentoLinks.linkStatus} = 'approved' THEN 1 ELSE 0 END)`,
          rejected: sql<number>`SUM(CASE WHEN ${contractMapeamentoLinks.linkStatus} = 'error' THEN 1 ELSE 0 END)`,
        })
        .from(contractMapeamentoLinks)
        .innerJoin(contractAnalyses, eq(contractMapeamentoLinks.contractAnalysisId, contractAnalyses.id))
        .where(eq(contractAnalyses.organizationId, input.organizationId));
      
      // Estatísticas de entrevistas/responses
      const [responseStats] = await db
        .select({
          total: count(),
          pendente: sql<number>`SUM(CASE WHEN ${mapeamentoResponses.completed} = false OR ${mapeamentoResponses.completed} IS NULL THEN 1 ELSE 0 END)`,
          concluido: sql<number>`SUM(CASE WHEN ${mapeamentoResponses.completed} = true THEN 1 ELSE 0 END)`,
        })
        .from(mapeamentoResponses)
        .where(eq(mapeamentoResponses.organizationId, input.organizationId));
      
      return {
        manuais: {
          total: Number(rotStats?.total || 0),
          rascunho: Number(rotStats?.rascunho || 0),
          em_revisao: Number(rotStats?.em_revisao || 0),
          aprovado: Number(rotStats?.aprovado || 0),
          arquivado: Number(rotStats?.arquivado || 0),
        },
        contratos: {
          total: Number(contractStats?.total || 0),
          draft: Number(contractStats?.draft || 0),
          approved: Number(contractStats?.approved || 0),
          rejected: Number(contractStats?.rejected || 0),
        },
        entrevistas: {
          total: Number(responseStats?.total || 0),
          pendente: Number(responseStats?.pendente || 0),
          concluido: Number(responseStats?.concluido || 0),
        },
        totalGeral: Number(rotStats?.total || 0) + Number(contractStats?.total || 0) + Number(responseStats?.total || 0),
      };
    }),

  // Converter mapeamento de contrato aprovado em ROT
  convertContractMapeamentoToRot: protectedProcedure
    .input(z.object({ linkId: z.number().positive() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas consultores podem converter mapeamentos" });
      }
      
      const db = await import('./db').then(m => m.getDb());
      const { contractMapeamentoLinks, contractAnalyses, rotOperations } = await import('../drizzle/schema');
      const { eq, sql } = await import('drizzle-orm');
      
      // Buscar o link do mapeamento
      const [link] = await db
        .select()
        .from(contractMapeamentoLinks)
        .where(eq(contractMapeamentoLinks.id, input.linkId));
      
      if (!link) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Mapeamento não encontrado" });
      }
      
      if (link.linkStatus !== 'approved') {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Apenas mapeamentos aprovados podem ser convertidos" });
      }
      
      // Buscar a análise de contrato para obter organizationId
      const [analysis] = await db
        .select()
        .from(contractAnalyses)
        .where(eq(contractAnalyses.id, link.contractAnalysisId));
      
      if (!analysis) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Análise de contrato não encontrada" });
      }
      
      const extractedData = link.extractedData as any;
      
      // Criar ROT a partir dos dados extraídos
      const [result] = await db.insert(rotOperations).values({
        organizationId: analysis.organizationId,
        title: extractedData.processTitle || `Mapeamento - ${analysis.contractName}`,
        description: extractedData.processDescription || '',
        department: extractedData.department || '',
        titularCategory: (extractedData.titularCategories || []).join(', ') || 'Não especificado',
        dataCategories: extractedData.dataCategories || [],
        purpose: extractedData.processPurpose || '',
        legalBase: extractedData.legalBase || 'execucao_contrato',
        requiresConsent: extractedData.legalBase === 'consentimento' ? 1 : 0,
        status: 'aprovado',
        createdById: ctx.user.id,
        approvedById: ctx.user.id,
      }).returning({ id: rotOperations.id });
      
      const rotId = Number(result.id || 0);
      
      // Atualizar o link com referência ao ROT criado
      await db
        .update(contractMapeamentoLinks)
        .set({ 
          rotId: rotId,
          updatedAt: sql`NOW()`
        })
        .where(eq(contractMapeamentoLinks.id, input.linkId));
      
      return { rotId, success: true };
    }),

  listProcessesByAreas: protectedProcedure
    .input(listProcessesByAreasSchema)
    .query(async ({ input }) => {
      const db = await mapeamentoService.getDbSafe();
      const whereArea = input.areaIds?.length
        ? sql`AND a.id IN (${sql.join(input.areaIds.map((x) => sql`${x}`), sql`,`)})`
        : sql``;

      const areas = await db.execute(sql`
        SELECT a.id as areaId, a.name as areaName
        FROM mapeamento_areas a
        WHERE a."organizationId"=${input.organizationId}
          AND a."contextId"=${input.contextId}
          AND a."isActive"=1
          ${whereArea}
        ORDER BY a.name ASC
      `);

      const result: any[] = [];
      for (const a of (areas as any[])) {
        const procs = await db.execute(sql`
          SELECT p.id, p.title
          FROM mapeamento_processes p
          WHERE p."organizationId"=${input.organizationId}
            AND p."areaId"=${a.areaId}
            AND p."isActive"=1
          ORDER BY p.title ASC
        `);
        result.push({
          areaId: a.areaId,
          areaName: a.areaName,
          processCount: (procs as any[]).length,
          processes: (procs as any[]).map((x: any) => ({ id: x.id, title: x.title })),
        });
      }

      return { ok: true, items: result };
    }),

  // PREMIUM: listar eventos da timeline
  listTimeline: protectedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      contextId: z.number().positive().optional(),
      areaId: z.number().positive().optional(),
      processId: z.number().positive().optional(),
      respondentId: z.number().positive().optional(),
      limit: z.number().min(1).max(200).optional(),
    }))
    .query(async ({ input }) => {
      const db = await mapeamentoService.getDbSafe();
      const conditions = [sql`organizationId = ${input.organizationId}`];
      if (input.contextId) conditions.push(sql`contextId = ${input.contextId}`);
      if (input.areaId) conditions.push(sql`areaId = ${input.areaId}`);
      if (input.processId) conditions.push(sql`processId = ${input.processId}`);
      if (input.respondentId) conditions.push(sql`respondentId = ${input.respondentId}`);
      const where = sql.join(conditions, sql` AND `);
      const lim = input.limit || 50;
      const rows = await db.execute(sql`
        SELECT id, "organizationId", "contextId", "areaId", "processId", "respondentId",
               "eventType", title, message, metadata, "createdById", "createdAt"
        FROM mapeamento_timeline_events
        WHERE ${where}
        ORDER BY "createdAt" DESC
        LIMIT ${lim}
      `);
      return { ok: true, events: rows as any[] };
    }),

  // ==================== COBERTURA DE FINALIDADES ====================

  getCoverageSummary: protectedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role === "sponsor" && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return mapeamentoService.getCoverageSummary(input.organizationId);
    }),

  // ==================== EDIÇÃO PÓS-FINALIZAÇÃO ====================

  reopenInterview: protectedProcedure
    .input(z.object({
      respondentId: z.number().positive(),
      organizationId: z.number().positive(),
      reason: z.string().min(1).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role === "sponsor") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas consultores podem reabrir entrevistas." });
      }
      return mapeamentoService.reopenInterview(input.respondentId, input.organizationId, ctx.user.id, input.reason);
    }),

  updateDataUses: protectedProcedure
    .input(z.object({
      responseId: z.number().positive(),
      organizationId: z.number().positive(),
      dataUses: z.array(z.object({
        dataCategory: z.string(),
        purposeCode: z.string(),
        purposeLabel: z.string(),
        suggestedLegalBasis: z.string(),
        legalBasisValidated: z.object({
          status: z.enum(['accepted', 'adjusted', 'rejected']),
          code: z.string(),
          label: z.string().optional(),
          justification: z.string().optional(),
        }).optional(),
        purposes: z.array(z.string()).optional(),
      })),
      regenerateDocuments: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role === "sponsor") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas consultores podem editar finalidades." });
      }
      return mapeamentoService.updateDataUses(input.responseId, input.organizationId, input.dataUses, ctx.user.id, input.regenerateDocuments);
    }),

  // ==================== EXPORTAÇÃO PDF POP ====================
  exportPopPdf: publicProcedure
    .input(z.object({
      processTitle: z.string(),
      department: z.string().optional(),
      organizationName: z.string().optional(),
      steps: z.array(z.object({
        title: z.string(),
        actor: z.string().optional(),
        channel: z.array(z.string()).optional(),
        systems: z.array(z.string()).optional(),
        dataUsed: z.array(z.string()).optional(),
        operations: z.array(z.string()).optional(),
        sharing: z.array(z.string()).optional(),
        controls: z.string().optional(),
        notes: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const { generatePopPdfHtml } = await import('./popPdfService');
      const html = generatePopPdfHtml(input);
      return { html };
    }),
});
