/**
 * RIPD Admin Router - Painel de administração para RIPDs gerados automaticamente
 */

import { z } from "zod";
import { sql } from "drizzle-orm";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";

type AnyRow = Record<string, any>;

export const ripdAdminRouter = router({
  // Listar todos os RIPDs com filtros
  listAll: protectedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      status: z.string().optional(),
      riskLevel: z.string().optional(),
      sourceType: z.string().optional(),
      search: z.string().optional(),
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
    }).optional())
    .query(async ({ ctx, input }) => {
      // Apenas admin/consultor
      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para acessar o painel de RIPDs" });
      }

      const db = await getDb();
      const conditions: any[] = [];

      // Filtro por organização (se não admin global, filtra pela org do usuário)
      if (input?.organizationId) {
        conditions.push(sql`d."organizationId" = ${input.organizationId}`);
      } else if (ctx.user.role !== 'admin_global') {
        if (ctx.user.organizationId) {
          conditions.push(sql`d."organizationId" = ${ctx.user.organizationId}`);
        }
      }

      if (input?.status && input.status !== 'all') {
        conditions.push(sql`d.status = ${input.status}`);
      }
      if (input?.riskLevel && input.riskLevel !== 'all') {
        conditions.push(sql`d."riskLevel" = ${input.riskLevel}`);
      }
      if (input?.sourceType && input.sourceType !== 'all') {
        conditions.push(sql`d."sourceType" = ${input.sourceType}`);
      }
      if (input?.search) {
        conditions.push(sql`(d.title LIKE ${'%' + input.search + '%'} OR d.description LIKE ${'%' + input.search + '%'})`);
      }

      const whereClause = conditions.length > 0
        ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
        : sql``;

      const page = input?.page || 1;
      const pageSize = input?.pageSize || 20;
      const offset = (page - 1) * pageSize;

      // Total count
      const { rows: countResult } = await db.execute(sql`
        SELECT COUNT(*) as total
        FROM dpia_assessments d
        ${whereClause}
      `);
      const total = Number((countResult as AnyRow[])[0]?.total || 0);

      // Lista com join na organização e usuário criador
      const { rows: rows } = await db.execute(sql`
        SELECT
          d.id,
          d."organizationId" as organizationId,
          d.title,
          d.description,
          d."sourceType" as sourceType,
          d."sourceId" as sourceId,
          d."riskLevel" as riskLevel,
          d."overallScore" as overallScore,
          d.status,
          d."workflowStatus",
          d.version,
          d."dpoId" as dpoId,
          d."createdById" as createdById,
          d."reviewedById" as reviewedById,
          d."approvedById" as approvedById,
          d."reviewedAt" as reviewedAt,
          d."approvedAt" as approvedAt,
          d."nextReviewDate" as nextReviewDate,
          d."createdAt" as createdAt,
          d."updatedAt" as updatedAt,
          o.name as organizationName,
          o.cnpj as organizationCnpj,
          u.name as createdByName,
          (SELECT COUNT(*) FROM dpia_risks WHERE "dpiaId" = d.id) as risksCount,
          (SELECT COUNT(*) FROM dpia_mitigations WHERE "dpiaId" = d.id) as mitigationsCount,
          (SELECT COUNT(*) FROM dpia_responses WHERE "dpiaId" = d.id) as responsesCount,
          (SELECT COUNT(*) FROM ripd_evidences WHERE "ripdId" = d.id) as evidencesCount
        FROM dpia_assessments d
        LEFT JOIN organizations o ON o.id = d."organizationId"
        LEFT JOIN users u ON u.id = d."createdById"
        ${whereClause}
        ORDER BY d."createdAt" DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `);

      return {
        items: (rows as AnyRow[]) || [],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      };
    }),

  // Estatísticas consolidadas do painel
  getStats: protectedProcedure
    .input(z.object({
      organizationId: z.number().optional()
    }).optional())
    .query(async ({ ctx, input }) => {
      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      const orgFilter = input?.organizationId
        ? sql`WHERE d."organizationId" = ${input.organizationId}`
        : (ctx.user.role !== 'admin_global' && ctx.user.organizationId)
          ? sql`WHERE d."organizationId" = ${ctx.user.organizationId}`
          : sql``;

      // Contadores por status
      const { rows: statusRows } = await db.execute(sql`
        SELECT
          d.status,
          COUNT(*) as count
        FROM dpia_assessments d
        ${orgFilter}
        GROUP BY d.status
      `);

      // Contadores por risco
      const { rows: riskRows } = await db.execute(sql`
        SELECT
          d."riskLevel" as riskLevel,
          COUNT(*) as count
        FROM dpia_assessments d
        ${orgFilter}
        GROUP BY d."riskLevel"
      `);

      // Contadores por origem
      const { rows: sourceRows } = await db.execute(sql`
        SELECT
          d."sourceType" as sourceType,
          COUNT(*) as count
        FROM dpia_assessments d
        ${orgFilter}
        GROUP BY d."sourceType"
      `);

      // Total de riscos e mitigações
      const { rows: riskMitRows } = await db.execute(sql`
        SELECT
          (SELECT COUNT(*) FROM dpia_risks) as totalRisks,
          (SELECT COUNT(*) FROM dpia_mitigations) as totalMitigations
      `);

      // Score médio
      const { rows: avgRows } = await db.execute(sql`
        SELECT
          COALESCE(AVG(d."overallScore"), 0) as avgScore,
          COUNT(*) as total
        FROM dpia_assessments d
        ${orgFilter}
      `);

      // RIPDs criados nos últimos 30 dias
      const recentWhere = input?.organizationId
        ? sql`WHERE d."organizationId" = ${input.organizationId} AND d."createdAt" >= NOW() - INTERVAL '30 DAY'`
        : (ctx.user.role !== 'admin_global' && ctx.user.organizationId)
          ? sql`WHERE d."organizationId" = ${ctx.user.organizationId} AND d."createdAt" >= NOW() - INTERVAL '30 DAY'`
          : sql`WHERE d."createdAt" >= NOW() - INTERVAL '30 DAY'`;
      const { rows: recentRows } = await db.execute(sql`
        SELECT COUNT(*) as recentCount
        FROM dpia_assessments d
        ${recentWhere}
      `);

      // Organizações com RIPD
      const { rows: orgRows } = await db.execute(sql`
        SELECT COUNT(DISTINCT d."organizationId") as orgCount
        FROM dpia_assessments d
        ${orgFilter}
      `);

      // Evidências totais
      const { rows: evRows } = await db.execute(sql`
        SELECT COUNT(*) as totalEvidences
        FROM ripd_evidences
      `);

      const statusMap: Record<string, number> = {};
      for (const r of (statusRows as AnyRow[])) {
        statusMap[r.status] = Number(r.count);
      }

      const riskMap: Record<string, number> = {};
      for (const r of (riskRows as AnyRow[])) {
        riskMap[r.riskLevel] = Number(r.count);
      }

      const sourceMap: Record<string, number> = {};
      for (const r of (sourceRows as AnyRow[])) {
        sourceMap[r.sourceType] = Number(r.count);
      }

      const total = Number((avgRows as AnyRow[])[0]?.total || 0);

      return {
        total,
        avgScore: Math.round(Number((avgRows as AnyRow[])[0]?.avgScore || 0)),
        recentCount: Number((recentRows as AnyRow[])[0]?.recentCount || 0),
        organizationsCount: Number((orgRows as AnyRow[])[0]?.orgCount || 0),
        totalEvidences: Number((evRows as AnyRow[])[0]?.totalEvidences || 0),
        byStatus: {
          draft: statusMap['draft'] || 0,
          in_progress: statusMap['in_progress'] || 0,
          pending_review: statusMap['pending_review'] || 0,
          approved: statusMap['approved'] || 0,
          rejected: statusMap['rejected'] || 0,
          archived: statusMap['archived'] || 0,
        },
        byRisk: {
          baixo: riskMap['baixo'] || 0,
          moderado: (riskMap['moderado'] || 0) + (riskMap['medio'] || 0),
          alto: riskMap['alto'] || 0,
          critico: riskMap['critico'] || 0,
        },
        bySource: {
          manual: sourceMap['manual'] || 0,
          mapeamento: sourceMap['mapeamento'] || 0,
          contrato: sourceMap['contrato'] || 0,
          incidente: sourceMap['incidente'] || 0,
        }
      };
    }),

  // Ações em lote: aprovar, rejeitar, arquivar
  batchAction: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()).min(1),
      action: z.enum(['approve', 'reject', 'archive', 'reopen', 'start_review'])
    }))
    .mutation(async ({ ctx, input }) => {
      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para esta ação" });
      }

      const db = await getDb();
      const statusMap: Record<string, string> = {
        approve: 'approved',
        reject: 'rejected',
        archive: 'archived',
        reopen: 'draft',
        start_review: 'pending_review'
      };

      const newStatus = statusMap[input.action];
      const now = new Date().toISOString();

      for (const id of input.ids) {
        if (input.action === 'approve') {
          await db.execute(sql`
            UPDATE dpia_assessments
            SET status = ${newStatus}, "approvedById" = ${ctx.user.id}, "approvedAt" = ${now}, "updatedAt" = NOW()
            WHERE id = ${id}
          `);
        } else if (input.action === 'reject') {
          await db.execute(sql`
            UPDATE dpia_assessments
            SET status = ${newStatus}, "reviewedById" = ${ctx.user.id}, "reviewedAt" = ${now}, "updatedAt" = NOW()
            WHERE id = ${id}
          `);
        } else if (input.action === 'start_review') {
          await db.execute(sql`
            UPDATE dpia_assessments
            SET status = ${newStatus}, "reviewedById" = ${ctx.user.id}, "reviewedAt" = ${now}, "updatedAt" = NOW()
            WHERE id = ${id}
          `);
        } else {
          await db.execute(sql`
            UPDATE dpia_assessments
            SET status = ${newStatus}, "updatedAt" = NOW()
            WHERE id = ${id}
          `);
        }
      }

      return { success: true, count: input.ids.length, newStatus };
    }),

  // Timeline de criação (últimos 12 meses)
  getTimeline: protectedProcedure
    .input(z.object({
      organizationId: z.number().optional()
    }).optional())
    .query(async ({ ctx, input }) => {
      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      const orgFilter = input?.organizationId
        ? sql`AND d."organizationId" = ${input.organizationId}`
        : (ctx.user.role !== 'admin_global' && ctx.user.organizationId)
          ? sql`AND d."organizationId" = ${ctx.user.organizationId}`
          : sql``;

      const { rows: rows } = await db.execute(sql`
        SELECT
          TO_CHAR(d."createdAt", 'YYYY-MM') as month,
          COUNT(*) as count,
          SUM(CASE WHEN d."sourceType" = 'mapeamento' THEN 1 ELSE 0 END) as autoCount,
          SUM(CASE WHEN d."sourceType" = 'manual' THEN 1 ELSE 0 END) as manualCount
        FROM dpia_assessments d
        WHERE d."createdAt" >= NOW() - INTERVAL '12 months'
        ${orgFilter}
        GROUP BY TO_CHAR(d."createdAt", 'YYYY-MM')
        ORDER BY month ASC
      `);

      return (rows as AnyRow[]) || [];
    }),

  // Organizações com RIPDs (para filtro)
  getOrganizations: protectedProcedure
    .query(async ({ ctx }) => {
      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      const { rows: rows } = await db.execute(sql`
        SELECT DISTINCT
          o.id,
          o.name,
          o.cnpj,
          COUNT(d.id) as ripdCount
        FROM organizations o
        INNER JOIN dpia_assessments d ON d."organizationId" = o.id
        GROUP BY o.id, o.name, o.cnpj
        ORDER BY o.name ASC
      `);

      return (rows as AnyRow[]) || [];
    }),
});
