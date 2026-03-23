import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  incidentService,
  caseService,
  actService,
  deadlineService,
  cisService,
  tacService,
  sanctionService,
  evidenceService,
} from "./pa-anpd/services";

/** Resolve organizationId: usa o do user, ou para admin_global busca a primeira org */
async function resolveOrgId(user: { organizationId?: number | null; role: string }): Promise<number> {
  if (user.organizationId) return user.organizationId;
  if (user.role === 'admin_global' || user.role === 'consultor') {
    const db = await getDb();
    const { rows } = await db.execute(sql`SELECT id FROM organizations ORDER BY id ASC LIMIT 1`);
    if ((rows as any[])[0]?.id) return (rows as any[])[0].id;
  }
  throw new TRPCError({ code: "FORBIDDEN", message: "Organização não identificada" });
}

/**
 * Router PA ANPD - Gestão de Incidentes e Processos Administrativos ANPD
 * 11 endpoints para gerenciar o ciclo de vida de incidentes e casos
 */
export const paAnpdRouter = router({
  // ==================== INCIDENTES ====================

  /**
   * Criar novo incidente
   * POST /api/trpc/paAnpd.createIncident
   */
  createIncident: protectedProcedure
    .input(
      z.object({
        title: z.string().min(3, "Título mínimo 3 caracteres"),
        description: z.string().optional(),
        incidentType: z.string(),
        severity: z.string(),
        discoveryDate: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {

      try {
        const incident = await incidentService.createIncident(
          await resolveOrgId(ctx.user),
          {
            title: input.title,
            description: input.description,
            incidentType: input.incidentType,
            severity: input.severity,
            discoveryDate: input.discoveryDate,
            reportedBy: ctx.user.id as any,
          }
        );

        return { success: true, data: incident };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao criar incidente: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        });
      }
    }),

  /**
   * 2. Listar incidentes da organização
   * GET /api/trpc/paAnpd.listIncidents
   */
  listIncidents: protectedProcedure
    .input(
      z.object({
        status: z.enum(["aberto", "em_investigacao", "resolvido", "encerrado"]).optional(),
        severity: z.enum(["baixa", "media", "alta", "critica"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {

      try {
        const incidents = await incidentService.listIncidents(
          await resolveOrgId(ctx.user),
          input.status as any,
          input.severity as any
        );
        return incidents;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao listar incidentes: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        });
      }
    }),

  /**
   * Obter detalhes de um incidente
   * GET /api/trpc/paAnpd.getIncident
   */
  getIncident: protectedProcedure
    .input(z.object({ incidentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        const incident = await incidentService.getIncidentById(await resolveOrgId(ctx.user), input.incidentId);
        if (!incident) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Incidente não encontrado" });
        }
        return incident;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao obter incidente: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        });
      }
    }),

  // ==================== CASOS ====================

  /**
   * Criar caso a partir de incidente
   * POST /api/trpc/paAnpd.createCase
   */
  createCase: protectedProcedure
    .input(
      z.object({
        incidentId: z.string().uuid(),
        title: z.string().min(3, "Título mínimo 3 caracteres"),
        description: z.string().optional(),
        caseNumber: z.string().min(1, "Número do caso obrigatório"),
      })
    )
    .mutation(async ({ ctx, input }) => {

      try {
        const caseData = await caseService.createCaseFromIncident(
          input.incidentId,
          await resolveOrgId(ctx.user),
          {
            title: input.title,
            description: input.description,
            caseNumber: input.caseNumber,
          }
        );

        return { success: true, data: caseData };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao criar caso: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        });
      }
    }),

  /**
   * Listar casos de um incidente
   * GET /api/trpc/paAnpd.listCases
   */
  listCases: protectedProcedure
    .input(z.object({ incidentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        const cases = await caseService.listCasesByIncident(await resolveOrgId(ctx.user), input.incidentId);
        return cases;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao listar casos: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        });
      }
    }),

  /**
   * Obter detalhes de um caso
   * GET /api/trpc/paAnpd.getCase
   */
  getCase: protectedProcedure
    .input(z.object({ caseId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        const caseData = await caseService.getCaseById(await resolveOrgId(ctx.user), input.caseId);
        if (!caseData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Caso não encontrado" });
        }
        return caseData;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao obter caso: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        });
      }
    }),

  // ==================== ATOS PROCESSUAIS ====================

  /**
   * Adicionar ato processual ao caso
   * POST /api/trpc/paAnpd.addAct
   */
  addAct: protectedProcedure
    .input(
      z.object({
        caseId: z.string().uuid(),
        actType: z.string(),
        description: z.string().min(1, "Descrição obrigatória"),
        actDate: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const act = await actService.addAct(await resolveOrgId(ctx.user), input.caseId, {
          actType: input.actType,
          description: input.description,
          actDate: input.actDate,
          recordedBy: ctx.user.id as any,
        });

        return { success: true, data: act };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao adicionar ato: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        });
      }
    }),

  /**
   * Listar atos de um caso
   * GET /api/trpc/paAnpd.listActs
   */
  listActs: protectedProcedure
    .input(z.object({ caseId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        const acts = await actService.listActsByCase(await resolveOrgId(ctx.user), input.caseId);
        return acts;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao listar atos: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        });
      }
    }),

  // ==================== PRAZOS ====================

  /**
   * Adicionar prazo ao caso
   * POST /api/trpc/paAnpd.addDeadline
   */
  addDeadline: protectedProcedure
    .input(
      z.object({
        caseId: z.string().uuid(),
        category: z.string(),
        dueDate: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const deadline = await deadlineService.addDeadline(await resolveOrgId(ctx.user), input.caseId, {
          category: input.category,
          dueDate: input.dueDate,
        });

        return { success: true, data: deadline };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao adicionar prazo: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        });
      }
    }),

  /**
   * Listar prazos de um caso com status
   * GET /api/trpc/paAnpd.listDeadlines
   */
  listDeadlines: protectedProcedure
    .input(z.object({ caseId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        const deadlines = await deadlineService.listDeadlinesByCase(await resolveOrgId(ctx.user), input.caseId);
        return deadlines;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao listar prazos: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        });
      }
    }),

  // ==================== CIS (COMUNICAÇÃO DE INCIDENTE DE SEGURANÇA) ====================

  /**
   * CIS - Novo fluxo seguro (rascunho -> revisão -> finalizado -> enviado)
   */

  cisSaveDraft: protectedProcedure
    .input(
      z.object({
        caseId: z.string().uuid(),
        affectedDataTypes: z.array(z.string()).default([]),
        affectedIndividuals: z.number().int().nonnegative().default(0),
        riskAssessment: z.string().optional().default(""),
        mitigationMeasures: z.array(z.string()).default([]),
        content: z.string().optional(),
        aiDraft: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
            try {
        const current = await cisService.saveDraft(await resolveOrgId(ctx.user), input.caseId, {
          affectedDataTypes: input.affectedDataTypes,
          affectedIndividuals: input.affectedIndividuals,
          riskAssessment: input.riskAssessment,
          mitigationMeasures: input.mitigationMeasures,
          content: input.content,
          aiDraft: input.aiDraft,
        });
        return { success: true, data: current };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao salvar rascunho CIS: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        });
      }
    }),

  cisGetCurrent: protectedProcedure
    .input(z.object({ caseId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
            return await cisService.getCurrent(await resolveOrgId(ctx.user), input.caseId);
    }),

  cisGetPrefill: protectedProcedure
    .input(z.object({ caseId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
            return await cisService.getPrefill(await resolveOrgId(ctx.user), input.caseId);
    }),

  cisListVersions: protectedProcedure
    .input(z.object({ caseId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
            return await cisService.listVersions(await resolveOrgId(ctx.user), input.caseId);
    }),

  cisSubmitForReview: protectedProcedure
    .input(z.object({ caseId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
            await cisService.submitForReview(await resolveOrgId(ctx.user), input.caseId, ctx.user.id);
      return { success: true };
    }),

  cisFinalize: protectedProcedure
    .input(z.object({ caseId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
            await cisService.finalize(await resolveOrgId(ctx.user), input.caseId, ctx.user.id);
      return { success: true };
    }),

  cisMarkAsSent: protectedProcedure
    .input(z.object({ caseId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
            await cisService.markAsSent(await resolveOrgId(ctx.user), input.caseId, ctx.user.id);
      return { success: true };
    }),

  /**
   * Backwards compatible endpoint (legacy):
   * antes fazia "gera e envia" em um clique; agora faz "salva rascunho + envia para revisão".
   */
  generateAndSubmitCis: protectedProcedure
    .input(
      z.object({
        caseId: z.string().uuid(),
        affectedDataTypes: z.array(z.string()).default([]),
        affectedIndividuals: z.number().int().nonnegative().default(0),
        riskAssessment: z.string().optional().default(""),
        mitigationMeasures: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = await resolveOrgId(ctx.user);
      const current = await cisService.saveDraft(orgId, input.caseId, {
        affectedDataTypes: input.affectedDataTypes,
        affectedIndividuals: input.affectedIndividuals,
        riskAssessment: input.riskAssessment,
        mitigationMeasures: input.mitigationMeasures,
      });
      await cisService.submitForReview(orgId, input.caseId, ctx.user.id);
      return { success: true, data: current };
    }),

  // ==================== EVIDÊNCIAS ====================

  /**
   * Listar evidências de um caso
   * GET /api/trpc/paAnpd.listEvidences
   */
  listEvidences: protectedProcedure
    .input(z.object({ caseId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        const evidences = await evidenceService.listEvidencesByCase(await resolveOrgId(ctx.user), input.caseId);
        return evidences;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao listar evidências: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        });
      }
    }),

  /**
   * Atualizar status de evidência
   * PATCH /api/trpc/paAnpd.updateEvidenceStatus
   */
  updateEvidenceStatus: protectedProcedure
    .input(
      z.object({
        evidenceId: z.string().uuid(),
        status: z.enum(["coletada", "analisada", "arquivada"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await evidenceService.updateEvidenceStatus(await resolveOrgId(ctx.user), input.evidenceId, input.status, ctx.user.id as any);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao atualizar evidência: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        });
      }
    }),

  // ==================== SANÇÕES ====================

  /**
   * Calcular sanção para um caso
   * POST /api/trpc/paAnpd.calculateSanction
   */
  calculateSanction: protectedProcedure
    .input(
      z.object({
        caseId: z.string().uuid(),
        gravity: z.string(),
        damage: z.string(),
        economicAdvantage: z.number().optional(),
        annualRevenue: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const sanction = await sanctionService.calculateSanction(await resolveOrgId(ctx.user), input.caseId, {
          gravity: input.gravity,
          damage: input.damage,
          economicAdvantage: input.economicAdvantage || 0,
          annualRevenue: input.annualRevenue || 0,
        });

        return { success: true, data: sanction };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao calcular sanção: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        });
      }
    }),

  // ==================== DASHBOARD ====================

  /**
   * Obter resumo do dashboard PA ANPD
   * GET /api/trpc/paAnpd.getDashboardSummary
   */
  getDashboardSummary: protectedProcedure.query(async ({ ctx }) => {

    try {
      const incidents = await incidentService.listIncidents(await resolveOrgId(ctx.user));
      const openIncidents = incidents.filter((i: any) => i.status === "aberto").length;
      const criticalIncidents = incidents.filter((i: any) => i.severity === "critica").length;

      return {
        totalIncidents: incidents.length,
        openIncidents,
        criticalIncidents,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Erro ao obter resumo: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      });
    }
  }),

  // ==================== SINCRONIZAÇÃO ====================

  /**
   * Sincronizar prazos (verificar alertas e vencimentos)
   * POST /api/trpc/paAnpd.syncDeadlines
   */
  syncDeadlines: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      await deadlineService.checkAlertDeadlines();
      return { success: true, message: "Prazos sincronizados com sucesso" };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Erro ao sincronizar prazos: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      });
    }
  }),

  // ==================== RELATORIOS ====================

  /**
   * Exportar relatorio completo de incidente com CIS
   * GET /api/trpc/paAnpd.exportIncidentReport
   */
  exportIncidentReport: protectedProcedure
    .input(z.object({ incidentId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const { generateIncidentReportPDF } = await import('./pa-anpd/cisReportService');
        const pdfBuffer = await generateIncidentReportPDF(input.incidentId);
        return {
          success: true,
          pdf: pdfBuffer.toString('base64'),
          filename: `relatorio-incidente-${input.incidentId}.pdf`,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao gerar relatorio: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        });
      }
    }),
});
