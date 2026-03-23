/**
 * deadlinesRouter.ts
 * Endpoint unificado de prazos que agrega dados de:
 * - action_plans (planos de ação de conformidade/contratos/terceiros)
 * - ir_deadlines (prazos de processos administrativos ANPD)
 * - cppd_initiative_tasks (tarefas de iniciativas CPPD)
 */
import { z } from 'zod';
import { router, protectedProcedure } from './_core/trpc';
import * as db from './db';
import { sql } from 'drizzle-orm';

// Shape unificado de prazo
export interface UnifiedDeadlineItem {
  id: string;
  source: 'action_plan' | 'incident_deadline' | 'cppd_task';
  title: string;
  description?: string;
  dueDate: string; // ISO
  status: 'overdue' | 'due_soon' | 'ok';
  severity: 'VENCIDO' | 'CRITICO' | 'URGENTE' | 'ATENCAO' | 'NO_PRAZO';
  priority?: string;
  organizationId: number;
  organizationName?: string;
  ownerUserId?: number;
  ownerUserName?: string;
  daysUntilDue: number;
  related: {
    module: string;
    entityId?: string;
    assessmentId?: string;
    actionPlanId?: string;
    route?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

function computeSeverity(daysLeft: number): { status: UnifiedDeadlineItem['status']; severity: UnifiedDeadlineItem['severity'] } {
  if (daysLeft <= 0) return { status: 'overdue', severity: 'VENCIDO' };
  if (daysLeft === 1) return { status: 'due_soon', severity: 'CRITICO' };
  if (daysLeft === 2) return { status: 'due_soon', severity: 'URGENTE' };
  if (daysLeft <= 5) return { status: 'due_soon', severity: 'ATENCAO' };
  return { status: 'ok', severity: 'NO_PRAZO' };
}

function diffDays(dueDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export const deadlinesRouter = router({
  /**
   * Lista unificada de prazos de todas as fontes
   */
  list: protectedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      rangeDays: z.number().default(90),
      statusFilter: z.enum(['all', 'overdue', 'due_soon', 'ok']).default('all'),
    }))
    .query(async ({ input, ctx }) => {
      const database = await db.getDb();
      if (!database) return { items: [], summary: { total: 0, overdue: 0, dueSoon: 0, ok: 0, critical: 0 } };

      // Determinar filtros por perfil:
      // - admin_global/consultor: podem filtrar por qualquer org
      // - sponsor: vê todos os prazos da sua org (orgFilter)
      // - demais clientes: veem apenas seus próprios prazos (orgFilter + userFilter)
      let orgFilter: number | undefined = input.organizationId;
      let userFilter: number | undefined = undefined;
      
      if (ctx.user.role === 'admin_global' || ctx.user.role === 'consultor') {
        // Admin/consultor pode filtrar por qualquer org, sem filtro de usuário
        orgFilter = input.organizationId || undefined;
      } else if (ctx.user.role === 'sponsor') {
        // Sponsor vê todos os prazos da sua organização
        orgFilter = input.organizationId || ctx.user.organizationId || undefined;
        userFilter = undefined; // Sem filtro de usuário
      } else {
        // Demais clientes veem apenas seus próprios prazos
        orgFilter = input.organizationId || ctx.user.organizationId || undefined;
        userFilter = ctx.user.id; // Filtrar por userId
      }

      const items: UnifiedDeadlineItem[] = [];

      // Cache de nomes de organizações
      const orgNameCache = new Map<number, string>();
      const getOrgName = async (orgId: number): Promise<string> => {
        if (orgNameCache.has(orgId)) return orgNameCache.get(orgId)!;
        try {
          const { rows: rows } = await database.execute(sql`SELECT name FROM organizations WHERE id = ${orgId} LIMIT 1`);
          const name = (rows as any)?.[0]?.name || 'N/A';
          orgNameCache.set(orgId, name);
          return name;
        } catch {
          return 'N/A';
        }
      };

      // Cache de nomes de usuários
      const userNameCache = new Map<number, string>();
      const getUserName = async (userId: number): Promise<string> => {
        if (userNameCache.has(userId)) return userNameCache.get(userId)!;
        try {
          const { rows: rows } = await database.execute(sql`SELECT name FROM users WHERE id = ${userId} LIMIT 1`);
          const name = (rows as any)?.[0]?.name || 'Não atribuído';
          userNameCache.set(userId, name);
          return name;
        } catch {
          return 'Não atribuído';
        }
      };

      // ===== 1. ACTION_PLANS =====
      try {
        let apRows: any[] = [];
        if (orgFilter && userFilter) {
          // Cliente: vê apenas seus prazos
          const { rows: rows } = await database.execute(sql`
            SELECT ap.id, ap.title, ap.description, ap."dueDate", ap.status, ap.priority,
                   ap."organizationId", ap."responsibleId", ap."assessmentType", ap."assessmentId",
                   ap."createdAt", ap."updatedAt"
            FROM action_plans ap
            WHERE ap."dueDate" IS NOT NULL
              AND ap.status NOT IN ('concluida', 'cancelada')
              AND ap."organizationId" = ${orgFilter}
              AND ap."responsibleId" = ${userFilter}
            ORDER BY ap."dueDate" ASC
          `);
          apRows = rows as any[];
        } else if (orgFilter) {
          // Sponsor/admin: vê todos os prazos da org
          const { rows: rows } = await database.execute(sql`
            SELECT ap.id, ap.title, ap.description, ap."dueDate", ap.status, ap.priority,
                   ap."organizationId", ap."responsibleId", ap."assessmentType", ap."assessmentId",
                   ap."createdAt", ap."updatedAt"
            FROM action_plans ap
            WHERE ap."dueDate" IS NOT NULL
              AND ap.status NOT IN ('concluida', 'cancelada')
              AND ap."organizationId" = ${orgFilter}
            ORDER BY ap."dueDate" ASC
          `);
          apRows = rows as any[];
        } else if (userFilter) {
          // Cliente sem org: vê apenas seus prazos
          const { rows: rows } = await database.execute(sql`
            SELECT ap.id, ap.title, ap.description, ap."dueDate", ap.status, ap.priority,
                   ap."organizationId", ap."responsibleId", ap."assessmentType", ap."assessmentId",
                   ap."createdAt", ap."updatedAt"
            FROM action_plans ap
            WHERE ap."dueDate" IS NOT NULL
              AND ap.status NOT IN ('concluida', 'cancelada')
              AND ap."responsibleId" = ${userFilter}
            ORDER BY ap."dueDate" ASC
          `);
          apRows = rows as any[];
        }
        
        for (const row of apRows || []) {
          const days = diffDays(row.dueDate);
          if (days > input.rangeDays) continue;
          
          const { status, severity } = computeSeverity(days);
          const orgName = await getOrgName(row.organizationId);
          const userName = row.responsibleId ? await getUserName(row.responsibleId) : undefined;

          items.push({
            id: `ap_${row.id}`,
            source: 'action_plan',
            title: row.title,
            description: row.description || undefined,
            dueDate: row.dueDate,
            status,
            severity,
            priority: row.priority,
            organizationId: row.organizationId,
            organizationName: orgName,
            ownerUserId: row.responsibleId || undefined,
            ownerUserName: userName,
            daysUntilDue: days,
            related: {
              module: 'Plano de Ação',
              entityId: String(row.id),
              assessmentId: row.assessmentId ? String(row.assessmentId) : undefined,
              actionPlanId: String(row.id),
              route: row.assessmentId
                ? `/avaliacoes/${row.assessmentId}/consultor?tab=plano-de-acao&actionId=${row.id}`
                : `/plano-acao`,
            },
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          });
        }
      } catch (e) {
        console.error('[Deadlines] Erro ao buscar action_plans:', e);
      }

      // ===== 2. IR_DEADLINES (Prazos de Processos ANPD) =====
      try {
        let irRows: any[] = [];
        if (orgFilter && userFilter) {
          // Cliente: vê apenas seus prazos
          const { rows: rows } = await database.execute(sql`
            SELECT d.id, d."caseId", d.category, d."dueDate", d.status as dlStatus,
                   d."createdAt", d."updatedAt",
                   c.title as caseTitle, c."incidentId",
                   i."organizationId", i.title as incidentTitle
            FROM ir_deadlines d
            JOIN ir_cases c ON c.id = d."caseId"
            JOIN ir_incidents i ON i.id = c."incidentId"
            WHERE d.status NOT IN ('cumprido')
              AND i."organizationId" = ${orgFilter}
              AND c."assignedToId" = ${userFilter}
            ORDER BY d."dueDate" ASC
          `);
          irRows = rows as any[];
        } else if (orgFilter) {
          // Sponsor/admin: vê todos os prazos da org
          const { rows: rows } = await database.execute(sql`
            SELECT d.id, d."caseId", d.category, d."dueDate", d.status as dlStatus,
                   d."createdAt", d."updatedAt",
                   c.title as caseTitle, c."incidentId",
                   i."organizationId", i.title as incidentTitle
            FROM ir_deadlines d
            JOIN ir_cases c ON c.id = d."caseId"
            JOIN ir_incidents i ON i.id = c."incidentId"
            WHERE d.status NOT IN ('cumprido')
              AND i."organizationId" = ${orgFilter}
            ORDER BY d."dueDate" ASC
          `);
          irRows = rows as any[];
        } else if (userFilter) {
          // Cliente sem org: vê apenas seus prazos
          const { rows: rows } = await database.execute(sql`
            SELECT d.id, d."caseId", d.category, d."dueDate", d.status as dlStatus,
                   d."createdAt", d."updatedAt",
                   c.title as caseTitle, c."incidentId",
                   i."organizationId", i.title as incidentTitle
            FROM ir_deadlines d
            JOIN ir_cases c ON c.id = d."caseId"
            JOIN ir_incidents i ON i.id = c."incidentId"
            WHERE d.status NOT IN ('cumprido')
              AND c."assignedToId" = ${userFilter}
            ORDER BY d."dueDate" ASC
          `);
          irRows = rows as any[];
        }
        
        for (const row of irRows || []) {
          const days = diffDays(row.dueDate);
          if (days > input.rangeDays) continue;
          
          const { status, severity } = computeSeverity(days);
          const orgName = await getOrgName(row.organizationId);

          items.push({
            id: `ir_${row.id}`,
            source: 'incident_deadline',
            title: `${row.category} — ${row.caseTitle || row.incidentTitle || 'Processo ANPD'}`,
            description: `Prazo processual: ${row.category}`,
            dueDate: row.dueDate,
            status,
            severity,
            priority: row.dlStatus === 'vencido' ? 'critica' : row.dlStatus === 'em_alerta' ? 'alta' : 'media',
            organizationId: row.organizationId,
            organizationName: orgName,
            daysUntilDue: days,
            related: {
              module: 'Processo Administrativo ANPD',
              entityId: row.caseId,
              route: `/pa-anpd/caso/${row.caseId}`,
            },
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          });
        }
      } catch (e) {
        console.error('[Deadlines] Erro ao buscar ir_deadlines:', e);
      }

      // ===== 3. CPPD_INITIATIVE_TASKS =====
      try {
        let cppdRows: any[] = [];
        if (orgFilter && userFilter) {
          // Cliente: vê apenas suas tarefas
          const { rows: rows } = await database.execute(sql`
            SELECT t.id, t.title, t.description, t."dueDate", t.status as taskStatus,
                   t."assignedToId", t."assignedToName", t."createdAt", t."updatedAt",
                   i."organizationId", i.title as initiativeTitle, i.priority
            FROM cppd_initiative_tasks t
            JOIN cppd_initiatives i ON i.id = t."initiativeId"
            WHERE t."dueDate" IS NOT NULL
              AND t.status NOT IN ('concluida', 'cancelada')
              AND i."organizationId" = ${orgFilter}
              AND t."assignedToId" = ${userFilter}
            ORDER BY t."dueDate" ASC
          `);
          cppdRows = rows as any[];
        } else if (orgFilter) {
          // Sponsor/admin: vê todas as tarefas da org
          const { rows: rows } = await database.execute(sql`
            SELECT t.id, t.title, t.description, t."dueDate", t.status as taskStatus,
                   t."assignedToId", t."assignedToName", t."createdAt", t."updatedAt",
                   i."organizationId", i.title as initiativeTitle, i.priority
            FROM cppd_initiative_tasks t
            JOIN cppd_initiatives i ON i.id = t."initiativeId"
            WHERE t."dueDate" IS NOT NULL
              AND t.status NOT IN ('concluida', 'cancelada')
              AND i."organizationId" = ${orgFilter}
            ORDER BY t."dueDate" ASC
          `);
          cppdRows = rows as any[];
        } else if (userFilter) {
          // Cliente sem org: vê apenas suas tarefas
          const { rows: rows } = await database.execute(sql`
            SELECT t.id, t.title, t.description, t."dueDate", t.status as taskStatus,
                   t."assignedToId", t."assignedToName", t."createdAt", t."updatedAt",
                   i."organizationId", i.title as initiativeTitle, i.priority
            FROM cppd_initiative_tasks t
            JOIN cppd_initiatives i ON i.id = t."initiativeId"
            WHERE t."dueDate" IS NOT NULL
              AND t.status NOT IN ('concluida', 'cancelada')
              AND t."assignedToId" = ${userFilter}
            ORDER BY t."dueDate" ASC
          `);
          cppdRows = rows as any[];
        }
        
        for (const row of cppdRows || []) {
          const days = diffDays(row.dueDate);
          if (days > input.rangeDays) continue;
          
          const { status, severity } = computeSeverity(days);
          const orgName = await getOrgName(row.organizationId);
          const userName = row.assignedToName || (row.assignedToId ? await getUserName(row.assignedToId) : undefined);

          items.push({
            id: `cppd_${row.id}`,
            source: 'cppd_task',
            title: row.title,
            description: row.description || `Iniciativa: ${row.initiativeTitle}`,
            dueDate: row.dueDate,
            status,
            severity,
            priority: row.priority || 'media',
            organizationId: row.organizationId,
            organizationName: orgName,
            ownerUserId: row.assignedToId || undefined,
            ownerUserName: userName,
            daysUntilDue: days,
            related: {
              module: 'Plano CPPD',
              entityId: String(row.id),
              route: '/governanca',
            },
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          });
        }
      } catch (e) {
        console.error('[Deadlines] Erro ao buscar cppd_initiative_tasks:', e);
      }

      // Ordenar por daysUntilDue (mais urgentes primeiro)
      items.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

      // Aplicar filtro de status
      const filtered = input.statusFilter === 'all'
        ? items
        : items.filter(i => i.status === input.statusFilter);

      // Calcular resumo
      const summary = {
        total: items.length,
        overdue: items.filter(i => i.status === 'overdue').length,
        dueSoon: items.filter(i => i.status === 'due_soon').length,
        ok: items.filter(i => i.status === 'ok').length,
        critical: items.filter(i => i.severity === 'VENCIDO' || i.severity === 'CRITICO').length,
      };

      return { items: filtered, summary };
    }),
});
