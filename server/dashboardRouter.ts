import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

// ==================== ACTIVITY LOG SERVICE ====================

export async function logActivity(params: {
  organizationId: number;
  userId: number;
  userName?: string;
  activityType: string;
  module: string;
  description: string;
  entityType?: string;
  entityId?: number;
  entityName?: string;
  metadata?: Record<string, any>;
}) {
  try {
    const database = await getDb();
    await database.execute(sql`
      INSERT INTO activity_log ("organizationId", "userId", "userName", "activityType", module, description, "entityType", "entityId", "entityName", metadata)
      VALUES (${params.organizationId}, ${params.userId}, ${params.userName || null}, ${params.activityType}, ${params.module}, ${params.description}, ${params.entityType || null}, ${params.entityId || null}, ${params.entityName || null}, ${params.metadata ? JSON.stringify(params.metadata) : null})
    `);
  } catch (e) {
    console.error('[ActivityLog] Erro ao registrar atividade:', e);
  }
}

// ==================== DASHBOARD ROUTER ====================

export const dashboardRouter = router({

  // ── Atividade Recente (multi-fonte) ─────────────────────────────
  getRecentActivity: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ ctx, input }) => {
      const database = await getDb();
      const orgId = input.organizationId;
      const userId = ctx.user.id;
      const userRole = ctx.user.role;
      const isAdmin = ['admin_global', 'consultor'].includes(userRole);

      // Buscar atividades reais de múltiplas tabelas via UNION ALL
      // Cada sub-query retorna: id, description, activityType, module, userName, eventDate
      const { rows: rows } = await database.execute(sql`
        (
          SELECT
            ap.id as "entityId",
            ap.title as description,
            CASE
              WHEN ap.status = 'concluida' THEN 'tarefa_concluida'
              WHEN ap.status = 'em_andamento' THEN 'plano_acao_criado'
              ELSE 'plano_acao_criado'
            END as "activityType",
            'plano_acao' as module,
            COALESCE(u.name, 'Sistema') as "userName",
            COALESCE(ap."updatedAt", ap."createdAt") as "createdAt"
          FROM action_plans ap
          LEFT JOIN users u ON ap."responsibleId" = u.id
          WHERE ap."organizationId" = ${orgId}
          ORDER BY COALESCE(ap."updatedAt", ap."createdAt") DESC
          LIMIT 5
        )
        UNION ALL
        (
          SELECT
            ca.id as "entityId",
            CONCAT(ca.title, ' (', ca.framework, ')') as description,
            CASE
              WHEN ca.status = 'concluida' THEN 'avaliacao_concluida'
              ELSE 'avaliacao_criada'
            END as "activityType",
            'conformidade' as module,
            COALESCE(u.name, 'Sistema') as "userName",
            COALESCE(ca."updatedAt", ca."createdAt") as "createdAt"
          FROM compliance_assessments ca
          LEFT JOIN users u ON ca."createdById" = u.id
          WHERE ca."organizationId" = ${orgId}
          ORDER BY COALESCE(ca."updatedAt", ca."createdAt") DESC
          LIMIT 5
        )
        UNION ALL
        (
          SELECT
            ct.id as "entityId",
            ct."contractName" as description,
            'contrato_enviado' as "activityType",
            'contratos' as module,
            COALESCE(u.name, 'Sistema') as "userName",
            COALESCE(ct."updatedAt", ct."createdAt") as "createdAt"
          FROM contract_analyses ct
          LEFT JOIN users u ON ct."createdById" = u.id
          WHERE ct."organizationId" = ${orgId}
          ORDER BY COALESCE(ct."updatedAt", ct."createdAt") DESC
          LIMIT 5
        )
        UNION ALL
        (
          SELECT
            t.id as "entityId",
            t.title as description,
            CASE
              WHEN t.status = 'resolvido' THEN 'ticket_resolvido'
              WHEN t.status IN ('em_analise', 'aguardando_cliente') THEN 'ticket_respondido'
              ELSE 'ticket_criado'
            END as "activityType",
            'meudpo' as module,
            COALESCE(u.name, 'Sistema') as "userName",
            COALESCE(t."updatedAt", t."createdAt") as "createdAt"
          FROM tickets t
          LEFT JOIN users u ON t."createdById" = u.id
          WHERE t."organizationId" = ${orgId}
          ORDER BY COALESCE(t."updatedAt", t."createdAt") DESC
          LIMIT 5
        )
        UNION ALL
        (
          SELECT
            gm.id as "entityId",
            COALESCE(gm."agendaTitle", 'Reunião CPPD') as description,
            'reuniao_agendada' as "activityType",
            'governanca' as module,
            COALESCE(u.name, 'Sistema') as "userName",
            COALESCE(gm."updatedAt", gm."createdAt") as "createdAt"
          FROM governanca_meetings gm
          LEFT JOIN users u ON gm."createdById" = u.id
          WHERE gm."organizationId" = ${orgId}
          ORDER BY COALESCE(gm."updatedAt", gm."createdAt") DESC
          LIMIT 5
        )
        UNION ALL
        (
          SELECT
            gd.id as "entityId",
            gd.name as description,
            'documento_ged' as "activityType",
            'ged' as module,
            COALESCE(u.name, 'Sistema') as "userName",
            COALESCE(gd."updatedAt", gd."createdAt") as "createdAt"
          FROM ged_documents gd
          LEFT JOIN users u ON gd."createdById" = u.id
          WHERE gd."organizationId" = ${orgId}
          ORDER BY COALESCE(gd."updatedAt", gd."createdAt") DESC
          LIMIT 5
        )
        UNION ALL
        (
          SELECT
            ua.id as "entityId",
            CONCAT('Avaliação ', ua."assessmentCode") as description,
            CASE
              WHEN ua.status = 'concluida' THEN 'avaliacao_concluida'
              ELSE 'avaliacao_criada'
            END as "activityType",
            'conformidade' as module,
            COALESCE(u.name, 'Sistema') as "userName",
            COALESCE(ua."updatedAt", ua."createdAt") as "createdAt"
          FROM ua_assessments ua
          LEFT JOIN users u ON ua."createdById" = u.id
          WHERE ua."organizationId" = ${orgId}
          ORDER BY COALESCE(ua."updatedAt", ua."createdAt") DESC
          LIMIT 5
        )
        UNION ALL
        (
          SELECT
            al.id as "entityId",
            CASE
              WHEN al.action = 'CREATE' THEN CONCAT('Criação de ', al."entityType")
              WHEN al.action = 'UPDATE' THEN CONCAT('Atualização de ', al."entityType")
              WHEN al.action LIKE 'cppd_%' THEN REPLACE(al.action, '_', ' ')
              ELSE al.action
            END as description,
            CASE
              WHEN al.action = 'CREATE' AND al."entityType" = 'third_party' THEN 'terceiro_avaliado'
              WHEN al.action LIKE 'cppd_%' THEN 'reuniao_agendada'
              WHEN al.action = 'CREATE' THEN 'plano_acao_criado'
              ELSE 'tarefa_concluida'
            END as "activityType",
            CASE
              WHEN al."entityType" = 'third_party' THEN 'due_diligence'
              WHEN al."entityType" = 'third_party_assessment' THEN 'due_diligence'
              WHEN al."entityType" IN ('meeting', 'governanca_meeting') THEN 'governanca'
              WHEN al."entityType" = 'user' THEN 'administracao'
              WHEN al."entityType" = 'organization' THEN 'administracao'
              ELSE 'plano_acao'
            END as module,
            COALESCE(u.name, 'Sistema') as "userName",
            al."createdAt" as "createdAt"
          FROM audit_logs al
          LEFT JOIN users u ON al."userId" = u.id
          WHERE al."organizationId" = ${orgId}
          ORDER BY al."createdAt" DESC
          LIMIT 5
        )
        ORDER BY "createdAt" DESC
        LIMIT ${input.limit}
      `);
      // Para perfis Cliente (sponsor, comite, etc.), filtrar apenas módulos relevantes
      const clientRoles = ['sponsor', 'comite', 'lider_processo', 'gestor_area'];
      const isClientRole = clientRoles.includes(userRole);
      const allowedModules = isClientRole
        ? ['conformidade', 'plano_acao', 'meudpo', 'governanca', 'ged']
        : null; // null = sem restrição (admin/consultor vêem tudo)

      const allRows = (rows as any[]) || [];
      const filteredRows = allowedModules
        ? allRows.filter((r: any) => allowedModules.includes(r.module))
        : allRows;

      return filteredRows;
    }),

  // ── Minhas Tarefas (ações atribuídas ao usuário) ─────────────────
  getMyTasks: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const database = await getDb();
      const userId = ctx.user.id;
      const userRole = ctx.user.role;
      // Admin/consultor veem TODAS as tarefas da organização
      const isAdmin = ['admin_global', 'consultor'].includes(userRole);

      // Buscar ações do plano de ação (responsibleId é a coluna correta)
      const { rows: actionPlanRows } = isAdmin
        ? await database.execute(sql`
            SELECT 
              ap.id, ap.title, ap.description, ap.status, ap.priority, ap."dueDate", ap."assessmentType",
              'plano_acao' as source
            FROM action_plans ap
            WHERE ap."organizationId" = ${input.organizationId}
              AND ap.status NOT IN ('concluida', 'cancelada')
            ORDER BY 
              CASE WHEN ap."dueDate" IS NOT NULL AND ap."dueDate" < NOW() THEN 0 ELSE 1 END,
              ap."dueDate" ASC
            LIMIT 20
          `)
        : await database.execute(sql`
            SELECT 
              ap.id, ap.title, ap.description, ap.status, ap.priority, ap."dueDate", ap."assessmentType",
              'plano_acao' as source
            FROM action_plans ap
            WHERE ap."organizationId" = ${input.organizationId}
              AND ap."responsibleId" = ${userId}
              AND ap.status NOT IN ('concluida', 'cancelada')
            ORDER BY 
              CASE WHEN ap."dueDate" IS NOT NULL AND ap."dueDate" < NOW() THEN 0 ELSE 1 END,
              ap."dueDate" ASC
            LIMIT 20
          `);

      // Buscar tickets
      const { rows: ticketRows } = isAdmin
        ? await database.execute(sql`
            SELECT 
              t.id, t.title, t.description, t.status, t.priority, t.deadline as "dueDate",
              'ticket' as source
            FROM tickets t
            WHERE t."organizationId" = ${input.organizationId}
              AND t.status NOT IN ('resolvido', 'cancelado')
            ORDER BY 
              CASE WHEN t.deadline IS NOT NULL AND t.deadline < NOW() THEN 0 ELSE 1 END,
              t.deadline ASC
            LIMIT 10
          `)
        : await database.execute(sql`
            SELECT 
              t.id, t.title, t.description, t.status, t.priority, t.deadline as "dueDate",
              'ticket' as source
            FROM tickets t
            WHERE t."organizationId" = ${input.organizationId}
              AND t."assignedToId" = ${userId}
              AND t.status NOT IN ('resolvido', 'cancelado')
            ORDER BY 
              CASE WHEN t.deadline IS NOT NULL AND t.deadline < NOW() THEN 0 ELSE 1 END,
              t.deadline ASC
            LIMIT 10
          `);

      // Buscar tarefas CPPD
      const { rows: cppdRows } = isAdmin
        ? await database.execute(sql`
            SELECT 
              ct.id, ct.title, ct.description, ct.status, 'media' as priority, ct."dueDate",
              'cppd' as source
            FROM cppd_initiative_tasks ct
            INNER JOIN cppd_initiatives ci ON ct."initiativeId" = ci.id
            WHERE ci."organizationId" = ${input.organizationId}
              AND ct.status NOT IN ('concluida', 'cancelada')
            ORDER BY ct."dueDate" ASC
            LIMIT 10
          `)
        : await database.execute(sql`
            SELECT 
              ct.id, ct.title, ct.description, ct.status, 'media' as priority, ct."dueDate",
              'cppd' as source
            FROM cppd_initiative_tasks ct
            INNER JOIN cppd_initiatives ci ON ct."initiativeId" = ci.id
            WHERE ci."organizationId" = ${input.organizationId}
              AND ct."assignedToId" = ${userId}
              AND ct.status NOT IN ('concluida', 'cancelada')
            ORDER BY ct."dueDate" ASC
            LIMIT 10
          `);

      return {
        actionPlans: (actionPlanRows as any[]) || [],
        tickets: (ticketRows as any[]) || [],
        cppdTasks: (cppdRows as any[]) || [],
        totalPending: ((actionPlanRows as any[])?.length || 0) + ((ticketRows as any[])?.length || 0) + ((cppdRows as any[])?.length || 0),
      };
    }),

  // ── Agenda (prazos + reuniões para calendário) ─────────────────
  getAgendaItems: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const userRole = ctx.user.role;
      const isAdmin = ['admin_global', 'consultor'].includes(userRole);
      const database = await getDb();
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const today = now.toISOString().split('T')[0];
      // Buscar 14 dias para frente
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + 14);
      const endFuture = futureDate.toISOString().split('T')[0];
      // Para passados, buscar últimos 30 dias
      const pastDate = new Date(now);
      pastDate.setDate(pastDate.getDate() - 30);
      const startPast = pastDate.toISOString().split('T')[0];
      const start = input.startDate || today;
      const end = input.endDate || endFuture;

      // Prazos de planos de ação (futuros) - clientes veem apenas os seus
      const { rows: actionDeadlines } = isAdmin
        ? await database.execute(sql`
          SELECT 
            ap.id, ap.title, ap."dueDate" as date, ap.status, ap.priority,
            'prazo_acao' as type, 'plano_acao' as module
          FROM action_plans ap
          WHERE ap."organizationId" = ${input.organizationId}
            AND ap."dueDate" IS NOT NULL
            AND ap."dueDate" >= ${today}
            AND ap."dueDate" <= ${endFuture}
            AND ap.status NOT IN ('concluida', 'cancelada')
          ORDER BY ap."dueDate" ASC
        `)
        : await database.execute(sql`
          SELECT 
            ap.id, ap.title, ap."dueDate" as date, ap.status, ap.priority,
            'prazo_acao' as type, 'plano_acao' as module
          FROM action_plans ap
          WHERE ap."organizationId" = ${input.organizationId}
            AND ap."responsibleId" = ${userId}
            AND ap."dueDate" IS NOT NULL
            AND ap."dueDate" >= ${today}
            AND ap."dueDate" <= ${endFuture}
            AND ap.status NOT IN ('concluida', 'cancelada')
          ORDER BY ap."dueDate" ASC
        `);
      
      // Prazos de planos de ação (passados) - clientes veem apenas os seus
      const { rows: actionDeadlinesPast } = isAdmin
        ? await database.execute(sql`
          SELECT 
            ap.id, ap.title, ap."dueDate" as date, ap.status, ap.priority,
            'prazo_acao' as type, 'plano_acao' as module
          FROM action_plans ap
          WHERE ap."organizationId" = ${input.organizationId}
            AND ap."dueDate" IS NOT NULL
            AND ap."dueDate" >= ${startPast}
            AND ap."dueDate" < ${today}
            AND ap.status NOT IN ('cancelada')
          ORDER BY ap."dueDate" DESC
        `)
        : await database.execute(sql`
          SELECT 
            ap.id, ap.title, ap."dueDate" as date, ap.status, ap.priority,
            'prazo_acao' as type, 'plano_acao' as module
          FROM action_plans ap
          WHERE ap."organizationId" = ${input.organizationId}
            AND ap."responsibleId" = ${userId}
            AND ap."dueDate" IS NOT NULL
            AND ap."dueDate" >= ${startPast}
            AND ap."dueDate" < ${today}
            AND ap.status NOT IN ('cancelada')
          ORDER BY ap."dueDate" DESC
        `);

      // Reuniões de governança (futuras)
      const { rows: meetings } = await database.execute(sql`
        SELECT 
          gm.id, gm."agendaTitle" as title, gm.date as date, gm.status, 'media' as priority,
          'reuniao' as type, 'governanca' as module
        FROM governanca_meetings gm
        WHERE gm."organizationId" = ${input.organizationId}
          AND gm.date >= ${today}
          AND gm.date <= ${endFuture}
        ORDER BY gm.date ASC
      `);
      
      // Reuniões de governança (passadas)
      const { rows: meetingsPast } = await database.execute(sql`
        SELECT 
          gm.id, gm."agendaTitle" as title, gm.date as date, gm.status, 'media' as priority,
          'reuniao' as type, 'governanca' as module
        FROM governanca_meetings gm
        WHERE gm."organizationId" = ${input.organizationId}
          AND gm.date >= ${startPast}
          AND gm.date < ${today}
        ORDER BY gm.date DESC
      `)

      // Prazos de tickets (futuros)
      const { rows: ticketDeadlines } = await database.execute(sql`
        SELECT 
          t.id, t.title, t.deadline as date, t.status, t.priority,
          'prazo_ticket' as type, 'meudpo' as module
        FROM tickets t
        WHERE t."organizationId" = ${input.organizationId}
          AND t.deadline IS NOT NULL
          AND t.deadline >= ${today}
          AND t.deadline <= ${endFuture}
          AND t.status NOT IN ('resolvido', 'cancelado')
        ORDER BY t.deadline ASC
      `);
      
      // Prazos de tickets (passados)
      const { rows: ticketDeadlinesPast } = await database.execute(sql`
        SELECT 
          t.id, t.title, t.deadline as date, t.status, t.priority,
          'prazo_ticket' as type, 'meudpo' as module
        FROM tickets t
        WHERE t."organizationId" = ${input.organizationId}
          AND t.deadline IS NOT NULL
          AND t.deadline >= ${startPast}
          AND t.deadline < ${today}
          AND t.status NOT IN ('cancelado')
        ORDER BY t.deadline DESC
      `)

      // Prazos de incidentes (ir_deadlines) (futuros)
      const { rows: incidentDeadlines } = await database.execute(sql`
        SELECT 
          ird.id, ird.category as title, ird."dueDate" as date, ird.status, 'alta' as priority,
          'prazo_incidente' as type, 'incidentes' as module
        FROM ir_deadlines ird
        INNER JOIN ir_cases irc ON ird."caseId" = irc.id
        INNER JOIN ir_incidents iri ON irc."incidentId" = iri.id
        WHERE iri."organizationId" = ${input.organizationId}
          AND ird."dueDate" >= ${today}
          AND ird."dueDate" <= ${endFuture}
          AND ird.status != 'completed'
        ORDER BY ird."dueDate" ASC
      `);
      
      // Prazos de incidentes (ir_deadlines) (passados)
      const { rows: incidentDeadlinesPast } = await database.execute(sql`
        SELECT 
          ird.id, ird.category as title, ird."dueDate" as date, ird.status, 'alta' as priority,
          'prazo_incidente' as type, 'incidentes' as module
        FROM ir_deadlines ird
        INNER JOIN ir_cases irc ON ird."caseId" = irc.id
        INNER JOIN ir_incidents iri ON irc."incidentId" = iri.id
        WHERE iri."organizationId" = ${input.organizationId}
          AND ird."dueDate" >= ${startPast}
          AND ird."dueDate" < ${today}
        ORDER BY ird."dueDate" DESC
      `)

      const allItems = [
        ...((actionDeadlines as any[]) || []),
        ...((meetings as any[]) || []),
        ...((ticketDeadlines as any[]) || []),
        ...((incidentDeadlines as any[]) || []),
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const allItemsPast = [
        ...((actionDeadlinesPast as any[]) || []),
        ...((meetingsPast as any[]) || []),
        ...((ticketDeadlinesPast as any[]) || []),
        ...((incidentDeadlinesPast as any[]) || []),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return {
        items: allItems,
        itemsPast: allItemsPast,
        summary: {
          futureCount: allItems.length,
          pastCount: allItemsPast.length,
          totalItems: allItems.length + allItemsPast.length,
        },
      };
    }),

  // ── Resumo de SLA ──────────────────────────────────────────────
  getSlaOverview: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const userRole = ctx.user.role;
      const userId = ctx.user.id;
      const isAdmin = ['admin_global', 'consultor'].includes(userRole);
      const database = await getDb();

      // Métricas de SLA dos tickets
      const { rows: slaRows } = await database.execute(sql`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status NOT IN ('resolvido', 'cancelado') THEN 1 ELSE 0 END) as abertos,
          SUM(CASE WHEN deadline IS NOT NULL AND deadline < NOW() AND status NOT IN ('resolvido', 'cancelado') THEN 1 ELSE 0 END) as violados,
          SUM(CASE WHEN deadline IS NOT NULL AND deadline >= NOW() AND (deadline::date - CURRENT_DATE) <= 2 AND status NOT IN ('resolvido', 'cancelado') THEN 1 ELSE 0 END) as "emRisco",
          SUM(CASE WHEN deadline IS NOT NULL AND (deadline::date - CURRENT_DATE) > 2 AND status NOT IN ('resolvido', 'cancelado') THEN 1 ELSE 0 END) as "noPrazo",
          SUM(CASE WHEN status = 'resolvido' THEN 1 ELSE 0 END) as resolvidos
        FROM tickets
        WHERE "organizationId" = ${input.organizationId}
      `);

      // Tempo médio de resolução (últimos 30 dias)
      const { rows: avgRows } = await database.execute(sql`
        SELECT 
          AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600) as "avgResolutionHours"
        FROM tickets
        WHERE "organizationId" = ${input.organizationId}
          AND status = 'resolvido'
          AND "resolvedAt" >= NOW() - INTERVAL '30 DAY'
      `);

      const sla = (slaRows as any[])?.[0] || {};
      const avg = (avgRows as any[])?.[0] || {};

      return {
        total: Number(sla.total) || 0,
        abertos: Number(sla.abertos) || 0,
        violados: Number(sla.violados) || 0,
        emRisco: Number(sla.emRisco) || 0,
        noPrazo: Number(sla.noPrazo) || 0,
        resolvidos: Number(sla.resolvidos) || 0,
        tempoMedioResolucaoHoras: Math.round(Number(avg.avgResolutionHours) || 0),
        taxaCumprimento: sla.total > 0 
          ? Math.round(((Number(sla.noPrazo) || 0) / (Number(sla.total) || 1)) * 100) 
          : 100,
      };
    }),

  // ── Resumo Consolidado (para cards do topo) ────────────────────
  getSummary: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const userRole = ctx.user.role;
      const userId = ctx.user.id;
      const isAdmin = ['admin_global', 'consultor'].includes(userRole);
      const database = await getDb();

      // Garantir que não-admins só vejam dados da própria organização
      if (!isAdmin && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso não autorizado a esta organização.' });
      }

      // Avaliações
      const { rows: assessmentRows } = await database.execute(sql`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'em_andamento' THEN 1 ELSE 0 END) as "emAndamento",
          SUM(CASE WHEN status = 'concluida' THEN 1 ELSE 0 END) as concluidas
        FROM compliance_assessments
        WHERE "organizationId" = ${input.organizationId}
      `);

      // Terceiros
      const { rows: thirdPartyRows } = await database.execute(sql`
        SELECT COUNT(*) as total FROM third_parties WHERE "organizationId" = ${input.organizationId}
      `);

      // Ações pendentes - clientes veem apenas as suas
      const { rows: actionRows } = isAdmin
        ? await database.execute(sql`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status NOT IN ('concluida', 'cancelada') THEN 1 ELSE 0 END) as pendentes,
            SUM(CASE WHEN "dueDate" IS NOT NULL AND "dueDate" < NOW() AND status NOT IN ('concluida', 'cancelada') THEN 1 ELSE 0 END) as vencidas
          FROM action_plans
          WHERE "organizationId" = ${input.organizationId}
        `)
        : await database.execute(sql`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status NOT IN ('concluida', 'cancelada') THEN 1 ELSE 0 END) as pendentes,
            SUM(CASE WHEN "dueDate" IS NOT NULL AND "dueDate" < NOW() AND status NOT IN ('concluida', 'cancelada') THEN 1 ELSE 0 END) as vencidas
          FROM action_plans
          WHERE "organizationId" = ${input.organizationId}
            AND "responsibleId" = ${userId}
        `);

      // Contratos analisados
      const { rows: contractRows } = await database.execute(sql`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN "contractAnalysisStatus" = 'completed' THEN 1 ELSE 0 END) as concluidos
        FROM contract_analyses
        WHERE "organizationId" = ${input.organizationId}
      `);

      // Incidentes
      const { rows: incidentRows } = await database.execute(sql`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status NOT IN ('closed', 'resolved') THEN 1 ELSE 0 END) as ativos
        FROM ir_incidents
        WHERE "organizationId" = ${input.organizationId}
      `);

      const assessments = (assessmentRows as any[])?.[0] || {};
      const thirdParties = (thirdPartyRows as any[])?.[0] || {};
      const actions = (actionRows as any[])?.[0] || {};
      const contracts = (contractRows as any[])?.[0] || {};
      const incidents = (incidentRows as any[])?.[0] || {};

      return {
        avaliacoes: { total: Number(assessments.total) || 0, emAndamento: Number(assessments.emAndamento) || 0, concluidas: Number(assessments.concluidas) || 0 },
        terceiros: { total: Number(thirdParties.total) || 0 },
        acoes: { total: Number(actions.total) || 0, pendentes: Number(actions.pendentes) || 0, vencidas: Number(actions.vencidas) || 0 },
        contratos: { total: Number(contracts.total) || 0, concluidos: Number(contracts.concluidos) || 0 },
        incidentes: { total: Number(incidents.total) || 0, ativos: Number(incidents.ativos) || 0 },
      };
    }),

  // ── Prazos Consolidados (top urgentes) ─────────────────────────
  getUrgentDeadlines: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      limit: z.number().min(1).max(20).default(5),
    }))
    .query(async ({ ctx, input }) => {
      const database = await getDb();
      const userId = ctx.user.id;
      const userRole = ctx.user.role;
      const isAdmin = ['admin_global', 'consultor'].includes(userRole);

      // Para clientes, filtrar apenas prazos atribuídos a eles
      const { rows } = isAdmin
        ? await database.execute(sql`
            SELECT * FROM (
              SELECT 
                ap.id::text as id, ap.title, ap."dueDate" as date, ap.status, ap.priority,
                'plano_acao' as source,
                (ap."dueDate"::date - CURRENT_DATE) as "diasRestantes"
              FROM action_plans ap
              WHERE ap."organizationId" = ${input.organizationId}
                AND ap."dueDate" IS NOT NULL
                AND ap.status NOT IN ('concluida', 'cancelada')
              UNION ALL
              SELECT 
                t.id::text as id, t.title, t.deadline as date, t.status, t.priority,
                'ticket' as source,
                (t.deadline::date - CURRENT_DATE) as "diasRestantes"
              FROM tickets t
              WHERE t."organizationId" = ${input.organizationId}
                AND t.deadline IS NOT NULL
                AND t.status NOT IN ('resolvido', 'cancelado')
              UNION ALL
              SELECT 
                ird.id, ird.category as title, ird."dueDate" as date, ird.status, 'alta' as priority,
                'incidente' as source,
                (ird."dueDate"::date - CURRENT_DATE) as "diasRestantes"
              FROM ir_deadlines ird
              INNER JOIN ir_cases irc ON ird."caseId" = irc.id
              INNER JOIN ir_incidents iri ON irc."incidentId" = iri.id
              WHERE iri."organizationId" = ${input.organizationId}
                AND ird.status != 'completed'
            ) combined
            ORDER BY "diasRestantes" ASC
            LIMIT ${input.limit}
          `)
        : await database.execute(sql`
            SELECT * FROM (
              SELECT 
                ap.id::text as id, ap.title, ap."dueDate" as date, ap.status, ap.priority,
                'plano_acao' as source,
                (ap."dueDate"::date - CURRENT_DATE) as "diasRestantes"
              FROM action_plans ap
              WHERE ap."organizationId" = ${input.organizationId}
                AND ap."responsibleId" = ${userId}
                AND ap."dueDate" IS NOT NULL
                AND ap.status NOT IN ('concluida', 'cancelada')
              UNION ALL
              SELECT 
                t.id::text as id, t.title, t.deadline as date, t.status, t.priority,
                'ticket' as source,
                (t.deadline::date - CURRENT_DATE) as "diasRestantes"
              FROM tickets t
              WHERE t."organizationId" = ${input.organizationId}
                AND t."assignedToId" = ${userId}
                AND t.deadline IS NOT NULL
                AND t.status NOT IN ('resolvido', 'cancelado')
              UNION ALL
              SELECT 
                ird.id, ird.category as title, ird."dueDate" as date, ird.status, 'alta' as priority,
                'incidente' as source,
                (ird."dueDate"::date - CURRENT_DATE) as "diasRestantes"
              FROM ir_deadlines ird
              INNER JOIN ir_cases irc ON ird."caseId" = irc.id
              INNER JOIN ir_incidents iri ON irc."incidentId" = iri.id
              WHERE iri."organizationId" = ${input.organizationId}
                AND ird.status != 'completed'
            ) combined
            ORDER BY "diasRestantes" ASC
            LIMIT ${input.limit}
          `);

      // Contagem de vencidos e críticos (mesma lógica de filtro)
      const { rows: countRows } = isAdmin
        ? await database.execute(sql`
            SELECT 
              SUM(CASE WHEN "diasRestantes" < 0 THEN 1 ELSE 0 END) as vencidos,
              SUM(CASE WHEN "diasRestantes" >= 0 AND "diasRestantes" <= 3 THEN 1 ELSE 0 END) as criticos,
              SUM(CASE WHEN "diasRestantes" > 3 AND "diasRestantes" <= 7 THEN 1 ELSE 0 END) as proximos,
              COUNT(*) as total
            FROM (
              SELECT (ap."dueDate"::date - CURRENT_DATE) as "diasRestantes"
              FROM action_plans ap
              WHERE ap."organizationId" = ${input.organizationId}
                AND ap."dueDate" IS NOT NULL AND ap.status NOT IN ('concluida', 'cancelada')
              UNION ALL
              SELECT (t.deadline::date - CURRENT_DATE) as "diasRestantes"
              FROM tickets t
              WHERE t."organizationId" = ${input.organizationId}
                AND t.deadline IS NOT NULL AND t.status NOT IN ('resolvido', 'cancelado')
              UNION ALL
              SELECT (ird."dueDate"::date - CURRENT_DATE) as "diasRestantes"
              FROM ir_deadlines ird
              INNER JOIN ir_cases irc ON ird."caseId" = irc.id
              INNER JOIN ir_incidents iri ON irc."incidentId" = iri.id
              WHERE iri."organizationId" = ${input.organizationId} AND ird.status != 'completed'
            ) all_deadlines
          `)
        : await database.execute(sql`
            SELECT 
              SUM(CASE WHEN "diasRestantes" < 0 THEN 1 ELSE 0 END) as vencidos,
              SUM(CASE WHEN "diasRestantes" >= 0 AND "diasRestantes" <= 3 THEN 1 ELSE 0 END) as criticos,
              SUM(CASE WHEN "diasRestantes" > 3 AND "diasRestantes" <= 7 THEN 1 ELSE 0 END) as proximos,
              COUNT(*) as total
            FROM (
              SELECT (ap."dueDate"::date - CURRENT_DATE) as "diasRestantes"
              FROM action_plans ap
              WHERE ap."organizationId" = ${input.organizationId}
                AND ap."responsibleId" = ${userId}
                AND ap."dueDate" IS NOT NULL AND ap.status NOT IN ('concluida', 'cancelada')
              UNION ALL
              SELECT (t.deadline::date - CURRENT_DATE) as "diasRestantes"
              FROM tickets t
              WHERE t."organizationId" = ${input.organizationId}
                AND t."assignedToId" = ${userId}
                AND t.deadline IS NOT NULL AND t.status NOT IN ('resolvido', 'cancelado')
              UNION ALL
              SELECT (ird."dueDate"::date - CURRENT_DATE) as "diasRestantes"
              FROM ir_deadlines ird
              INNER JOIN ir_cases irc ON ird."caseId" = irc.id
              INNER JOIN ir_incidents iri ON irc."incidentId" = iri.id
              WHERE iri."organizationId" = ${input.organizationId} AND ird.status != 'completed'
            ) all_deadlines
          `);

      const counts = (countRows as any[])?.[0] || {};

      return {
        items: (rows as any[]) || [],
        vencidos: Number(counts.vencidos) || 0,
        criticos: Number(counts.criticos) || 0,
        proximos: Number(counts.proximos) || 0,
        total: Number(counts.total) || 0,
      };
    }),
});
