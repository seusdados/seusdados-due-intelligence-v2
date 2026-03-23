import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import {
  ensureActionPlansFromDpia,
  convertActionPlanToTicket,
  requestDpoValidation,
  markClientCompletedAndRequestDpoValidation,
  validateActionPlanAsDpo,
  rejectActionPlanAsClient,
} from "./ripdActionPlanService";

/**
 * Router premium focado em operacionalização do RIPD/DPIA:
 * - Gera action_plans a partir de mitigations (idempotente)
 * - Converte action_plan em ticket
 * - Solicita validação DPO (ticket + status pendente_validacao_dpo)
 * - Workflow completo: cliente conclui → DPO valida → ticket resolvido
 * - Fila de validação DPO com filtros e estatísticas
 */

// ---- RBAC helpers ----
function isPrivilegedForDpoValidation(role?: string) {
  const r = String(role || "").toLowerCase();
  return ["admin_global", "consultor", "sponsor"].includes(r);
}

function isClient(role?: string) {
  const r = String(role || "").toLowerCase();
  return r === "cliente" || r === "sponsor" || r === "user";
}

export const ripdWorkflowRouterPremium = router({
  // -------------------- DPO Queue --------------------
  listPendingDpoValidations: protectedProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(200).optional(),
      offset: z.number().int().min(0).optional(),
      priority: z.enum(["baixa", "media", "alta", "critica"]).optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;
      if (!orgId) throw new TRPCError({ code: "FORBIDDEN" });
      if (!isPrivilegedForDpoValidation(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Somente DPO/Consultor/Admin pode acessar a fila." });
      }

      const db = await getDb();
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      const whereParts: any[] = [
        sql`ap."organizationId" = ${orgId}`,
        sql`ap.status = 'pendente_validacao_dpo'`,
      ];
      if (input?.priority) whereParts.push(sql`ap.priority = ${input.priority}`);
      if (input?.search && input.search.trim()) {
        const q = `%${input.search.trim()}%`;
        whereParts.push(sql`(ap.title LIKE ${q} OR ap.description LIKE ${q})`);
      }

      const whereSql = sql.join(whereParts, sql` AND `);

      const { rows: rows } = await db.execute(sql`
        SELECT
          ap.id,
          ap."organizationId",
          ap."assessmentType",
          ap."assessmentId",
          ap.title,
          ap.description,
          ap.priority,
          ap.status,
          ap."responsibleId",
          ap."dueDate",
          ap."clientCompletedAt",
          ap."clientCompletedById",
          ap."dpoValidatedAt",
          ap."dpoValidatedById",
          ap."clientRejectionReason",
          ap."dpoValidationTicketId",
          ap.notes,
          ap."actionCategory",
          ap."outputType",
          ap."createdAt",
          ap."updatedAt",
          t."ticketNumber",
          t.status as ticketStatus,
          t."assignedToId" as ticketAssignedToId,
          t.priority as ticketPriority,
          t."slaLevel" as ticketSlaLevel,
          t.deadline as ticketDeadline,
          t."createdAt" as ticketCreatedAt,
          t."updatedAt" as ticketUpdatedAt
        FROM action_plans ap
        LEFT JOIN tickets t ON t.id = ap."dpoValidationTicketId"
        WHERE ${whereSql}
        ORDER BY
          (ap."dueDate" IS NULL) ASC,
          ap."dueDate" ASC,
          ap."updatedAt" DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `);

      return { ok: true, items: (rows as any[]) || [], limit, offset };
    }),

  getDpoValidationQueueStats: protectedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const orgId = ctx.user.organizationId;
      if (!orgId) throw new TRPCError({ code: "FORBIDDEN" });
      if (!isPrivilegedForDpoValidation(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Somente DPO/Consultor/Admin pode acessar estatísticas." });
      }
      const db = await getDb();
      const { rows: rows } = await db.execute(sql`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN priority='baixa' THEN 1 ELSE 0 END) as baixa,
          SUM(CASE WHEN priority='media' THEN 1 ELSE 0 END) as media,
          SUM(CASE WHEN priority='alta' THEN 1 ELSE 0 END) as alta,
          SUM(CASE WHEN priority='critica' THEN 1 ELSE 0 END) as critica
        FROM action_plans
        WHERE "organizationId"=${orgId}
          AND status='pendente_validacao_dpo'
      `);
      const r = (rows as any[])[0] || {};
      return {
        ok: true,
        total: Number(r.total || 0),
        byPriority: {
          baixa: Number(r.baixa || 0),
          media: Number(r.media || 0),
          alta: Number(r.alta || 0),
          critica: Number(r.critica || 0),
        }
      };
    }),

  // -------------------- Sync & Convert --------------------
  /**
   * Sincroniza mitigações do DPIA para action_plans.
   * Idempotente: pode ser chamado múltiplas vezes sem duplicar.
   */
  syncActionPlansFromDpia: protectedProcedure
    .input(
      z.object({
        dpiaId: z.number().int().positive(),
        defaultResponsibleId: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;
      if (!orgId)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Usuário sem organização",
        });

      // Valida que o DPIA pertence à organização
      const db = await getDb();
      const { rows: rows } = await db.execute(sql`
        SELECT id
        FROM dpia_assessments
        WHERE id = ${input.dpiaId} AND organization_id = ${orgId}
        LIMIT 1
      `);
      if (!(rows as any[])[0]?.id)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "RIPD/DPIA não encontrado nesta organização",
        });

      const res = await ensureActionPlansFromDpia({
        organizationId: orgId,
        dpiaId: input.dpiaId,
        actorUserId: ctx.user.id,
        defaultResponsibleId: input.defaultResponsibleId ?? null,
      });
      return { ok: true, ...res };
    }),

  /**
   * Converte um action_plan em ticket do MeuDPO.
   * Preenche convertedToTicketId no action_plan.
   */
  convertActionPlanToTicket: protectedProcedure
    .input(
      z.object({
        actionPlanId: z.number().int().positive(),
        assignedToId: z.number().int().optional(),
        clientId: z.number().int().optional(),
        serviceCatalogItemId: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;
      if (!orgId)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Usuário sem organização",
        });

      const res = await convertActionPlanToTicket({
        organizationId: orgId,
        actionPlanId: input.actionPlanId,
        actorUserId: ctx.user.id,
        assignedToId: input.assignedToId ?? null,
        clientId: input.clientId ?? null,
        serviceCatalogItemId: input.serviceCatalogItemId ?? null,
      });

      return res;
    }),

  // -------------------- Client Workflow --------------------
  /**
   * Trigger lógico via endpoint:
   * - cliente conclui ação => status pendente_validacao_dpo
   * - cria ticket de validação (dpoValidationTicketId)
   */
  onClientCompletedActionPlan: protectedProcedure
    .input(z.object({
      actionPlanId: z.number().int().positive(),
      assignedToId: z.number().int().optional(), // DPO/consultor
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;
      if (!orgId) throw new TRPCError({ code: "FORBIDDEN" });

      const res = await markClientCompletedAndRequestDpoValidation({
        organizationId: orgId,
        actionPlanId: input.actionPlanId,
        actorUserId: ctx.user.id,
        assignedToId: input.assignedToId ?? null,
      });
      return res;
    }),

  /**
   * Rejeição pelo cliente: volta status para recusada_cliente com motivo.
   */
  rejectActionPlanAsClient: protectedProcedure
    .input(z.object({
      actionPlanId: z.number().int().positive(),
      rejectionReason: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;
      if (!orgId) throw new TRPCError({ code: "FORBIDDEN" });

      const res = await rejectActionPlanAsClient({
        organizationId: orgId,
        actionPlanId: input.actionPlanId,
        actorUserId: ctx.user.id,
        rejectionReason: input.rejectionReason,
      });
      return res;
    }),

  // -------------------- DPO Validation --------------------
  /**
   * Validação DPO:
   * - seta dpoValidatedAt/dpoValidatedById
   * - status = concluida
   * - resolve ticket de validação (status resolvido)
   */
  validateActionPlanAsDpo: protectedProcedure
    .input(z.object({
      actionPlanId: z.number().int().positive(),
      resolution: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;
      if (!orgId) throw new TRPCError({ code: "FORBIDDEN" });

      // RBAC: apenas DPO/consultor/admin pode validar
      if (!isPrivilegedForDpoValidation(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Somente DPO/Consultor/Admin pode validar ações." });
      }

      const res = await validateActionPlanAsDpo({
        organizationId: orgId,
        actionPlanId: input.actionPlanId,
        dpoUserId: ctx.user.id,
        resolution: input.resolution ?? null,
      });
      return res;
    }),

  /**
   * Solicita validação do DPO para um action_plan concluído pelo cliente.
   * Cria ticket de auditoria e muda status para pendente_validacao_dpo.
   */
  requestDpoValidation: protectedProcedure
    .input(
      z.object({
        actionPlanId: z.number().int().positive(),
        assignedToId: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;
      if (!orgId)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Usuário sem organização",
        });

      const res = await requestDpoValidation({
        organizationId: orgId,
        actionPlanId: input.actionPlanId,
        actorUserId: ctx.user.id,
        assignedToId: input.assignedToId ?? null,
      });
      return res;
    }),

  // -------------------- Traceability --------------------
  /**
   * Rastreabilidade completa: DPIA → Riscos → Mitigações → Action Plans → Tickets
   * Retorna a cadeia completa para visualização no painel.
   */
  getTraceability: protectedProcedure
    .input(
      z.object({
        dpiaId: z.number().int().positive(),
      })
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;
      if (!orgId)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Usuário sem organização",
        });

      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Banco de dados indisponível",
        });

      // Buscar DPIA
      const { rows: dpiaRows } = await db.execute(sql`
        SELECT d.id, d.title, d.status, d.risk_level AS riskLevel, d.overall_score AS overallScore,
               d.created_at AS createdAt, o.name AS organizationName
        FROM dpia_assessments d
        LEFT JOIN organizations o ON o.id = d.organization_id
        WHERE d.id = ${input.dpiaId} AND d.organization_id = ${orgId}
        LIMIT 1
      `);
      const dpia = (dpiaRows as any[])[0];
      if (!dpia)
        throw new TRPCError({ code: "NOT_FOUND", message: "RIPD/DPIA não encontrado" });

      // Buscar riscos com mitigações
      const { rows: riskRows } = await db.execute(sql`
        SELECT r.id, r.title, r.risk_category AS riskCategory, r.likelihood, r.impact,
               r.risk_level AS riskLevel, r.risk_score AS riskScore, r.status
        FROM dpia_risks r
        WHERE r.dpia_id = ${input.dpiaId}
        ORDER BY r.risk_score DESC
      `);
      const risks = (riskRows as any[]) || [];

      // Buscar mitigações
      const { rows: mitRows } = await db.execute(sql`
        SELECT m.id, m.risk_id AS riskId, m.title, m.description, m.mitigation_type AS mitigationType,
               m.status, m.priority, m.responsible_area AS responsibleArea
        FROM dpia_mitigations m
        WHERE m.dpia_id = ${input.dpiaId}
        ORDER BY m.priority DESC
      `);
      const mitigations = (mitRows as any[]) || [];

      // Buscar action_plans vinculados ao DPIA
      const { rows: apRows } = await db.execute(sql`
        SELECT ap.id, ap.title, ap.description, ap.priority, ap.status,
               ap."dueDate", ap."completedAt",
               ap."convertedToTicketId",
               ap."dpoValidationTicketId",
               ap."clientCompletedAt", ap."clientCompletedById",
               ap."dpoValidatedAt", ap."dpoValidatedById",
               ap."clientRejectionReason",
               ap."actionCategory", ap."outputType",
               u.name AS responsibleName
        FROM action_plans ap
        LEFT JOIN users u ON u.id = ap."responsibleId"
        WHERE ap."organizationId" = ${orgId}
          AND ap."assessmentType" = 'dpia'
          AND ap."assessmentId" = ${input.dpiaId}
        ORDER BY ap.priority DESC, ap."createdAt" ASC
      `);
      const actionPlans = (apRows as any[]) || [];

      // Buscar tickets vinculados
      const ticketIds = actionPlans
        .flatMap((ap: any) => [ap.convertedToTicketId, ap.dpoValidationTicketId])
        .filter(Boolean);

      let tickets: any[] = [];
      if (ticketIds.length > 0) {
        const idList = ticketIds.join(',');
        const { rows: ticketRows } = await db.execute(sql`
          SELECT t.id, t.title, t.status, t.priority, t."ticketType",
                 t."createdAt", t."resolvedAt", t.resolution,
                 u.name AS assignedToName
          FROM tickets t
          LEFT JOIN users u ON u.id = t."assignedToId"
          WHERE FIND_IN_SET(t.id, ${idList})
        `);
        tickets = (ticketRows as any[]) || [];
      }

      // Montar mapa de tickets
      const ticketMap = new Map(tickets.map((t: any) => [t.id, t]));

      // Montar árvore de rastreabilidade
      const traceTree = risks.map((risk: any) => {
        const riskMitigations = mitigations.filter((m: any) => m.riskId === risk.id);
        const riskActionPlans = actionPlans.filter((ap: any) => {
          return ap.title?.includes(risk.title?.substring(0, 30)) ||
                 riskMitigations.some((m: any) => ap.title?.includes(m.title?.substring(0, 30)));
        });

        return {
          risk: {
            id: risk.id,
            title: risk.title,
            riskCategory: risk.riskCategory,
            riskLevel: risk.riskLevel,
            riskScore: risk.riskScore,
            status: risk.status,
          },
          mitigations: riskMitigations.map((m: any) => ({
            id: m.id,
            title: m.title,
            mitigationType: m.mitigationType,
            status: m.status,
            priority: m.priority,
            responsibleArea: m.responsibleArea,
          })),
          actionPlans: riskActionPlans.map((ap: any) => ({
            id: ap.id,
            title: ap.title,
            priority: ap.priority,
            status: ap.status,
            dueDate: ap.dueDate,
            completedAt: ap.completedAt,
            clientCompletedAt: ap.clientCompletedAt,
            dpoValidatedAt: ap.dpoValidatedAt,
            clientRejectionReason: ap.clientRejectionReason,
            actionCategory: ap.actionCategory,
            outputType: ap.outputType,
            responsibleName: ap.responsibleName,
            ticket: ap.convertedToTicketId ? ticketMap.get(ap.convertedToTicketId) || null : null,
            dpoValidationTicket: ap.dpoValidationTicketId ? ticketMap.get(ap.dpoValidationTicketId) || null : null,
          })),
        };
      });

      // Estatísticas resumidas
      const summary = {
        totalRisks: risks.length,
        totalMitigations: mitigations.length,
        totalActionPlans: actionPlans.length,
        totalTickets: ticketIds.length,
        actionPlansByStatus: {
          pendente: actionPlans.filter((ap: any) => ap.status === 'pendente').length,
          em_andamento: actionPlans.filter((ap: any) => ap.status === 'em_andamento').length,
          concluida: actionPlans.filter((ap: any) => ['concluida', 'concluida_cliente'].includes(ap.status)).length,
          pendente_validacao: actionPlans.filter((ap: any) => ap.status === 'pendente_validacao_dpo').length,
          recusada_cliente: actionPlans.filter((ap: any) => ap.status === 'recusada_cliente').length,
        },
      };

      return {
        dpia,
        traceTree,
        summary,
        actionPlans,
        tickets,
      };
    }),
});
