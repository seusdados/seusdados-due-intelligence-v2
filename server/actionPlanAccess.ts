import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { getDb } from "./db";

export const INTERNAL_ACTION_PLAN_ROLES = ["admin_global", "consultor"] as const;
export const CLIENT_ACTION_PLAN_ROLES = ["sponsor", "comite", "lider_processo", "gestor_area", "respondente"] as const;
export const ACTION_PLAN_VALIDATION_AWAITING_STATUSES = ["aguardando_validacao", "aguardando_nova_validacao"] as const;
export const ACTION_PLAN_VALIDATION_OPEN_STATUSES = ["em_validacao", ...ACTION_PLAN_VALIDATION_AWAITING_STATUSES] as const;
export const ACTION_PLAN_VALIDATION_COMPLETED_STATUSES = ["ajustes_solicitados", "concluida"] as const;
export const ACTION_PLAN_SUBMIT_ALLOWED_STATUSES = ["em_andamento", "ajustes_solicitados"] as const;

export type ActionPlanAccessUser = {
  id: number;
  role: string;
  organizationId?: number | null;
  name?: string | null;
  email?: string | null;
};

export type ActionPlanRecord = {
  id: number;
  organizationId: number;
  assessmentType?: string | null;
  responsibleId?: number | null;
  validatorId?: number | null;
  validatorName?: string | null;
  status?: string | null;
  title?: string | null;
  description?: string | null;
  assessmentId?: number | null;
  sourceTable?: string | null;
};

export function isInternalActionPlanRole(role?: string | null): boolean {
  return INTERNAL_ACTION_PLAN_ROLES.includes((role || "") as (typeof INTERNAL_ACTION_PLAN_ROLES)[number]);
}

export function isClientActionPlanRole(role?: string | null): boolean {
  return CLIENT_ACTION_PLAN_ROLES.includes((role || "") as (typeof CLIENT_ACTION_PLAN_ROLES)[number]);
}

export function canUserAccessActionPlan(
  user: ActionPlanAccessUser,
  action: ActionPlanRecord,
  options?: {
    allowResponsible?: boolean;
    allowSameOrgClient?: boolean;
    restrictClientToCompliance?: boolean;
    requireInternal?: boolean;
  },
): boolean {
  const opts = {
    allowResponsible: true,
    allowSameOrgClient: true,
    restrictClientToCompliance: true,
    requireInternal: false,
    ...options,
  };

  if (opts.requireInternal) {
    return isInternalActionPlanRole(user.role);
  }

  if (isInternalActionPlanRole(user.role)) {
    return true;
  }

  if (opts.allowResponsible && action.responsibleId && action.responsibleId === user.id) {
    return true;
  }

  if (
    opts.allowSameOrgClient &&
    user.organizationId &&
    user.organizationId === action.organizationId &&
    isClientActionPlanRole(user.role)
  ) {
    if (!opts.restrictClientToCompliance) {
      return true;
    }
    return action.assessmentType === "compliance";
  }

  return false;
}

export function assertUserCanAccessActionPlan(
  user: ActionPlanAccessUser,
  action: ActionPlanRecord,
  options?: Parameters<typeof canUserAccessActionPlan>[2],
): void {
  if (!canUserAccessActionPlan(user, action, options)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Sem permissão para acessar este plano de ação.",
    });
  }
}

/**
 * Busca uma ação pelo ID, primeiro em action_plans, depois em ua_action_plan.
 * Retorna o registro com o campo sourceTable indicando a tabela de origem.
 */
export async function getActionPlanById(actionId: number): Promise<any | null> {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
  }

  // Primeiro buscar em action_plans
  const { rows: rows1 } = await db.execute(sql`
    SELECT ap.*, u.name as "responsibleUserName", u.email as "responsibleEmail",
           org."tradeName" as "organizationName", org.name as "organizationLegalName",
           'action_plans' as "sourceTable"
    FROM action_plans ap
    LEFT JOIN users u ON ap."responsibleId" = u.id
    LEFT JOIN organizations org ON ap."organizationId" = org.id
    WHERE ap.id = ${actionId}
    LIMIT 1
  `) as any;
  const fromActionPlans = Array.isArray(rows1) ? rows1[0] ?? null : null;
  if (fromActionPlans) return fromActionPlans;

  // Se não encontrou, buscar em ua_action_plan
  const { rows: rows2 } = await db.execute(sql`
    SELECT uap.*,
           uap."responsibleUserId" as "responsibleId",
           u.name as "responsibleUserName", u.email as "responsibleEmail",
           org."tradeName" as "organizationName", org.name as "organizationLegalName",
           ua."organizationId" as "organizationId",
           ua."assessmentCode" as "assessmentCode",
           'ua_action_plan' as "sourceTable",
           'maturidade' as "assessmentType"
    FROM ua_action_plan uap
    LEFT JOIN users u ON uap."responsibleUserId" = u.id
    LEFT JOIN ua_assessments ua ON uap."assessmentId" = ua.id
    LEFT JOIN organizations org ON ua."organizationId" = org.id
    WHERE uap.id = ${actionId}
    LIMIT 1
  `) as any;
  return Array.isArray(rows2) ? rows2[0] ?? null : null;
}

export async function getActionPlanEvidenceById(evidenceId: number): Promise<any | null> {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
  }

  const { rows: rows } = await db.execute(sql`
    SELECT e.*, ap."organizationId", ap."assessmentType", ap."assessmentId", ap."responsibleId", ap.status,
           ap."validatorId", ap."validatorName", ap.title
    FROM action_plan_evidence e
    INNER JOIN action_plans ap ON ap.id = e."actionPlanId"
    WHERE e.id = ${evidenceId}
    LIMIT 1
  `) as any;

  return Array.isArray(rows) ? rows[0] ?? null : null;
}

export function assertResponsibleOrInternal(user: ActionPlanAccessUser, action: ActionPlanRecord): void {
  const isInternal = isInternalActionPlanRole(user.role);
  const isResponsible = !!action.responsibleId && action.responsibleId === user.id;

  if (!isInternal && !isResponsible) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas o responsável pela ação ou a equipe interna pode executar esta operação.",
    });
  }
}
