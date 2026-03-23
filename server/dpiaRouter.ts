/**
 * DPIA Router - Endpoints para Data Protection Impact Assessment
 */

import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as dpiaService from "./dpiaService";
import { ensureRipdFromRot } from "./ripdAutomationService";
import * as reviewService from "./reviewScheduleService";

export const dpiaRouter = router({
  // ==================== DPIA ====================
  
  // Listar DPIAs da organização
  list: protectedProcedure
    .input(z.object({
      organizationId: z.number().optional()
    }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = input?.organizationId || ctx.user.organizationId;
      if (!orgId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Organização não especificada" });
      }
      
      // Verificar permissão
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== orgId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para acessar esta organização" });
      }
      
      return dpiaService.getDpiaAssessments(orgId);
    }),

  // Obter DPIA por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const dpia = await dpiaService.getDpiaById(input.id);
      if (!dpia) {
        throw new TRPCError({ code: "NOT_FOUND", message: "DPIA não encontrado" });
      }
      
      // Verificar permissão
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== dpia.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para acessar este DPIA" });
      }
      
      return dpia;
    }),

  // Obter detalhes completos do DPIA
  getDetails: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const dpia = await dpiaService.getDpiaById(input.id);
      if (!dpia) {
        throw new TRPCError({ code: "NOT_FOUND", message: "DPIA não encontrado" });
      }
      
      // Verificar permissão
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== dpia.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para acessar este DPIA" });
      }
      
      const [questions, responses, risks, mitigations] = await Promise.all([
        dpiaService.getDpiaQuestions(),
        dpiaService.getDpiaResponses(input.id),
        dpiaService.getDpiaRisks(input.id),
        dpiaService.getDpiaMitigations(input.id)
      ]);
      
      return {
        dpia,
        questions,
        responses,
        risks,
        mitigations
      };
    }),

  // Obter perguntas do questionário DPIA
  getQuestions: protectedProcedure
    .query(async () => {
      return dpiaService.getDpiaQuestions();
    }),

  // Criar DPIA manualmente
  create: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      title: z.string().min(1),
      description: z.string().optional(),
      dpoId: z.number().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Verificar permissão
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas consultores podem criar DPIAs" });
      }
      
      const dpiaId = await dpiaService.createDpia({
        organizationId: input.organizationId,
        title: input.title,
        description: input.description,
        sourceType: 'manual',
        createdById: ctx.user.id,
        dpoId: input.dpoId
      });
      
      return { dpiaId };
    }),

  // Gerar DPIA automaticamente a partir de mapeamento
  generateFromMapeamento: protectedProcedure
    .input(z.object({
      rotId: z.number(),
      organizationId: z.number()
    }))
    .mutation(async ({ ctx, input }) => {
      // Verificar permissão
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas consultores podem gerar DPIAs" });
      }
      
      const result = await ensureRipdFromRot({
        rotId: input.rotId,
        organizationId: input.organizationId,
        actorUserId: ctx.user.id
      });

      return { dpiaId: result.dpiaId };
    }),

  // Salvar resposta do questionário
  saveResponse: protectedProcedure
    .input(z.object({
      dpiaId: z.number(),
      questionId: z.number(),
      responseText: z.string().optional(),
      responseValue: z.string().optional(),
      responseJson: z.any().optional(),
      riskScore: z.number().optional(),
      notes: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Verificar permissão
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas consultores podem editar DPIAs" });
      }
      
      const responseId = await dpiaService.saveDpiaResponse({
        dpiaId: input.dpiaId,
        questionId: input.questionId,
        responseText: input.responseText,
        responseValue: input.responseValue,
        responseJson: input.responseJson,
        riskScore: input.riskScore,
        notes: input.notes,
        answeredById: ctx.user.id
      });
      
      return { responseId };
    }),

  // Adicionar risco
  addRisk: protectedProcedure
    .input(z.object({
      dpiaId: z.number(),
      title: z.string().min(1),
      description: z.string().min(1),
      riskCategory: z.string(),
      likelihood: z.string(),
      impact: z.string(),
      legalReference: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas consultores podem editar DPIAs" });
      }
      
      const riskId = await dpiaService.saveDpiaRisk(input);
      return { riskId };
    }),

  // Adicionar medida de mitigação
  addMitigation: protectedProcedure
    .input(z.object({
      dpiaId: z.number(),
      riskId: z.number(),
      title: z.string().min(1),
      description: z.string().min(1),
      mitigationType: z.string(),
      responsibleId: z.number().optional(),
      dueDate: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas consultores podem editar DPIAs" });
      }
      
      const mitigationId = await dpiaService.saveDpiaMitigation(input);
      return { mitigationId };
    }),

  // Atualizar status do DPIA
  updateStatus: protectedProcedure
    .input(z.object({
      dpiaId: z.number(),
      status: z.enum(['draft', 'in_progress', 'pending_review', 'approved', 'rejected', 'archived'])
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas consultores podem alterar status de DPIAs" });
      }
      
      await dpiaService.updateDpiaStatus(input.dpiaId, input.status, ctx.user.id);
      return { success: true };
    }),

  // Obter mapeamentos de alto risco sem DPIA
  getHighRiskMapeamentos: protectedProcedure
    .input(z.object({
      organizationId: z.number()
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      return dpiaService.getHighRiskMapeamentos(input.organizationId);
    }),

  // Exportar DPIA em PDF
  exportPDF: protectedProcedure
    .input(z.object({ dpiaId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dpia = await dpiaService.getDpiaById(input.dpiaId);
      if (!dpia) {
        throw new TRPCError({ code: "NOT_FOUND", message: "DPIA não encontrado" });
      }
      
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== dpia.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      const pdfBuffer = await dpiaService.generateDpiaPDF(input.dpiaId);
      return { 
        pdf: pdfBuffer.toString('base64'),
        filename: `DPIA_${dpia.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      };
    }),

  // ==================== REVISÃO PERIÓDICA ====================

  // Obter configuração de revisão
  getReviewConfig: protectedProcedure
    .input(z.object({
      organizationId: z.number()
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      return reviewService.getReviewConfig(input.organizationId);
    }),

  // Salvar configuração de revisão
  saveReviewConfig: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      reviewPeriodDays: z.number().min(30).max(730),
      alertDaysBefore: z.number().min(1).max(90),
      sendEmailAlerts: z.boolean(),
      defaultReviewerId: z.number().optional(),
      isActive: z.boolean()
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas consultores podem configurar revisões" });
      }
      
      const configId = await reviewService.createOrUpdateReviewConfig(input);
      return { configId };
    }),

  // Listar agendamentos de revisão
  getReviewSchedules: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      status: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      return reviewService.getReviewSchedules(input.organizationId, input.status);
    }),

  // Obter revisões pendentes
  getPendingReviews: protectedProcedure
    .input(z.object({
      organizationId: z.number().optional()
    }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = input?.organizationId || ctx.user.organizationId;
      
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== orgId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      return reviewService.getPendingReviews(orgId);
    }),

  // Obter revisões próximas
  getUpcomingReviews: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      daysAhead: z.number().optional()
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      return reviewService.getUpcomingReviews(input.organizationId, input.daysAhead);
    }),

  // Criar agendamento de revisão
  createReviewSchedule: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      mapeamentoType: z.enum(['rot', 'processo', 'area']),
      mapeamentoId: z.number(),
      nextReviewDate: z.string(),
      reviewerId: z.number().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      const scheduleId = await reviewService.createReviewSchedule(input);
      return { scheduleId };
    }),

  // Completar revisão
  completeReview: protectedProcedure
    .input(z.object({
      scheduleId: z.number(),
      organizationId: z.number(),
      mapeamentoType: z.enum(['rot', 'processo', 'area']),
      mapeamentoId: z.number(),
      reviewResult: z.enum(['approved', 'updated', 'archived', 'flagged']),
      notes: z.string().optional(),
      changesDescription: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      const historyId = await reviewService.completeReview({
        ...input,
        reviewedById: ctx.user.id
      });
      
      return { historyId };
    }),

  // Obter histórico de revisões
  getReviewHistory: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      mapeamentoType: z.string().optional(),
      mapeamentoId: z.number().optional()
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      return reviewService.getReviewHistory(
        input.organizationId,
        input.mapeamentoType,
        input.mapeamentoId
      );
    }),

  // Obter estatísticas de revisão
  getReviewStats: protectedProcedure
    .input(z.object({
      organizationId: z.number()
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      return reviewService.getReviewStats(input.organizationId);
    }),

  // Processar alertas de revisão (admin only)
  processReviewAlerts: adminProcedure
    .mutation(async () => {
      return reviewService.processReviewAlerts();
    }),

  // ==================== DASHBOARD CONSOLIDADO ====================
  
  // Obter métricas consolidadas de compliance
  getComplianceMetrics: protectedProcedure
    .input(z.object({
      organizationId: z.number().optional()
    }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = input?.organizationId || ctx.user.organizationId;
      if (!orgId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Organização não especificada" });
      }
      
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== orgId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      return dpiaService.getComplianceMetrics(orgId);
    }),

  // Obter atividades recentes de compliance
  getRecentActivities: protectedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      limit: z.number().min(1).max(50).optional()
    }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = input?.organizationId || ctx.user.organizationId;
      if (!orgId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Organização não especificada" });
      }
      
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== orgId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      return dpiaService.getRecentComplianceActivities(orgId, input?.limit || 10);
    }),

  // ==================== INTEGRAÇÃO COM PLANOS DE AÇÃO ====================
  
  // Gerar ações a partir das mitigações do DPIA
  generateActions: protectedProcedure
    .input(z.object({ dpiaId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dpia = await dpiaService.getDpiaById(input.dpiaId);
      if (!dpia) {
        throw new TRPCError({ code: "NOT_FOUND", message: "DPIA não encontrado" });
      }
      
      // Verificar permissão
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== dpia.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para acessar este DPIA" });
      }
      
      return dpiaService.generateActionsFromDpia(input.dpiaId, ctx.user.id);
    }),

  // Listar ações geradas a partir de um DPIA
  getActions: protectedProcedure
    .input(z.object({ dpiaId: z.number() }))
    .query(async ({ ctx, input }) => {
      const dpia = await dpiaService.getDpiaById(input.dpiaId);
      if (!dpia) {
        throw new TRPCError({ code: "NOT_FOUND", message: "DPIA não encontrado" });
      }
      
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== dpia.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      return dpiaService.getActionsFromDpia(input.dpiaId);
    }),

  // ==================== CRON JOB ====================
  
  // Executar verificação manual de alertas
  triggerReviewAlertCheck: adminProcedure
    .mutation(async () => {
      const { triggerManualCheck } = await import('./reviewCronJob');
      return triggerManualCheck();
    }),

  // Obter status do cron job
  getCronJobStatus: adminProcedure
    .query(async () => {
      const { getReviewCronJobStatus } = await import('./reviewCronJob');
      return getReviewCronJobStatus();
    }),

  // Iniciar cron job
  startCronJob: adminProcedure
    .input(z.object({
      intervalMs: z.number().min(3600000).optional() // mínimo 1 hora
    }).optional())
    .mutation(async ({ input }) => {
      const { startReviewCronJob } = await import('./reviewCronJob');
      startReviewCronJob(input);
      return { success: true, message: 'Cron job iniciado' };
    }),

  // Parar cron job
  stopCronJob: adminProcedure
    .mutation(async () => {
      const { stopReviewCronJob } = await import('./reviewCronJob');
      stopReviewCronJob();
      return { success: true, message: 'Cron job parado' };
    }),

  // Atualizar configuração do cron job
  updateCronJobConfig: adminProcedure
    .input(z.object({
      intervalMs: z.number().min(3600000).optional(),
      enabled: z.boolean().optional()
    }))
    .mutation(async ({ input }) => {
      const { updateReviewCronJobConfig, getReviewCronJobStatus } = await import('./reviewCronJob');
      updateReviewCronJobConfig(input);
      return getReviewCronJobStatus();
    })
});
