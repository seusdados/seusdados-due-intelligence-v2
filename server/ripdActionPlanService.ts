import { sql } from "drizzle-orm";
import { getDb } from "./db";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

/**
 * Serviço Premium: RIPD/DPIA → Action Plans → Tickets
 * 
 * Idempotência:
 * - action_plans não tem unique constraints por mitigation.
 * - Usamos um marcador fixo no campo notes:
 *     [SRC:DPIA_MITIGATION id=<mitigationId>]
 * - Para evitar duplicatas: buscamos por assessmentType+assessmentId+marker.
 */

function marker(mitigationId: number) {
  return `[SRC:DPIA_MITIGATION id=${mitigationId}]`;
}

function mapPriority(p?: string | null): "baixa" | "media" | "alta" | "critica" {
  const s = String(p || "").toLowerCase();
  if (s.includes("crit")) return "critica";
  if (s.includes("alto") || s.includes("alta")) return "alta";
  if (s.includes("baix")) return "baixa";
  return "media";
}

/**
 * Sincroniza mitigações do DPIA/RIPD para action_plans (idempotente).
 * Cria novos action_plans para mitigações sem correspondência,
 * atualiza existentes se já houver.
 */
export async function ensureActionPlansFromDpia(params: {
  organizationId: number;
  dpiaId: number;
  actorUserId: number;
  defaultResponsibleId?: number | null;
}) {
  const db = await getDb();
  const orgId = params.organizationId;
  const dpiaId = params.dpiaId;

  // Busca mitigações do DPIA
  const { rows: mitRows } = await db.execute(sql`
    SELECT id, title, description, status, priority, "dueDate"
    FROM dpia_mitigations
    WHERE dpia_id = ${dpiaId}
    ORDER BY id ASC
  `);
  const mitigations = (mitRows as any[]) || [];

  let created = 0;
  let updated = 0;

  for (const m of mitigations) {
    const mId = Number(m.id);
    const mTitle = String(m.title || "").trim() || `Mitigação ${mId}`;
    const mDesc = String(m.description || "").trim();
    const mDue = (m.dueDate ?? null) as string | null;

    const mMark = marker(mId);

    // Procura action_plan existente pelo marcador
    const { rows: exRows } = await db.execute(sql`
      SELECT id
      FROM action_plans
      WHERE "organizationId" = ${orgId}
        AND "assessmentType" = 'dpia'
        AND "assessmentId" = ${dpiaId}
        AND notes LIKE ${"%" + mMark + "%"}
      LIMIT 1
    `);

    const existing = (exRows as any[])[0];
    const prio = mapPriority(m.priority);

    if (existing?.id) {
      // Atualiza action_plan existente
      await db.execute(sql`
        UPDATE action_plans
        SET
          title = ${mTitle},
          description = ${mDesc || null},
          priority = ${prio},
          "dueDate" = ${mDue},
          "updatedAt" = NOW()
        WHERE id = ${Number(existing.id)}
          AND "organizationId" = ${orgId}
      `);
      updated++;
    } else {
      // Cria novo action_plan
      const notes = `${mMark}\nAUTO: criado a partir do RIPD/DPIA ${dpiaId}.\n`;
      await db.execute(sql`
        INSERT INTO action_plans
          ("organizationId", "assessmentType", "assessmentId", title, description, priority, status, "responsibleId", "dueDate", notes, "actionCategory", "outputType", "createdAt", "updatedAt")
        VALUES
          (${orgId}, 'dpia', ${dpiaId}, ${mTitle}, ${mDesc || null}, ${prio},
           'pendente', ${params.defaultResponsibleId ?? null}, ${mDue}, ${notes},
           'operacional', 'tarefa_operacional', NOW(), NOW())
      `);
      created++;
    }
  }

  return { created, updated, total: mitigations.length };
}

/**
 * Converte action_plan em ticket, preenchendo convertedToTicketId e metadados.
 */
export async function convertActionPlanToTicket(params: {
  organizationId: number;
  actionPlanId: number;
  actorUserId: number;
  assignedToId?: number | null;
  clientId?: number | null;
  serviceCatalogItemId?: number | null;
}) {
  const db = await getDb();
  const orgId = params.organizationId;

  const { rows: apRows } = await db.execute(sql`
    SELECT *
    FROM action_plans
    WHERE id = ${params.actionPlanId}
      AND "organizationId" = ${orgId}
    LIMIT 1
  `);
  const ap = (apRows as any[])[0];
  if (!ap) throw new Error("Plano de Ação não encontrado");

  // Se já foi convertido, retorna o ticket existente
  if (ap.convertedToTicketId) {
    return { ok: true, ticketId: Number(ap.convertedToTicketId), alreadyConverted: true };
  }

  const priority = ap.priority || "media";
  const ticketType = "documentacao";
  const title = ap.title;
  const description = `${ap.description || ""}\n\n[Origem] action_plans.id=${ap.id} | assessmentType=${ap.assessmentType} | assessmentId=${ap.assessmentId}`;

  const sourceContext = {
    source: "action_plan",
    actionPlanId: Number(ap.id),
    assessmentType: String(ap.assessmentType),
    assessmentId: Number(ap.assessmentId),
  };

  const metadata = {
    generatedBy: "ripdActionPlanService",
    convertedAt: new Date().toISOString(),
  };

  // Insere ticket
  const insertResult = await db.execute(sql`
    INSERT INTO tickets
      ("organizationId", "createdById", "assignedToId", "clientId", title, description, "ticketType", priority, status, "slaLevel", deadline, "serviceCatalogItemId", "sourceContext", metadata, "createdAt", "updatedAt")
    VALUES
      (${orgId}, ${params.actorUserId}, ${params.assignedToId ?? null}, ${params.clientId ?? null},
       ${title}, ${description}, ${ticketType}, ${priority}, 'novo', 'padrao',
       ${ap.dueDate ?? null}, ${params.serviceCatalogItemId ?? null},
       ${JSON.stringify(sourceContext)}, ${JSON.stringify(metadata)}, NOW(), NOW())
    RETURNING id
  `);

  // Recupera id inserido
  const idRows = (insertResult as any).rows ?? insertResult[0];
  const ticketId = Number((idRows as any[])[0]?.id);

  // Atualiza action_plan com referência ao ticket
  await db.execute(sql`
    UPDATE action_plans
    SET "convertedToTicketId" = ${ticketId}, "updatedAt" = NOW()
    WHERE id = ${params.actionPlanId} AND "organizationId" = ${orgId}
  `);

  return { ok: true, ticketId, alreadyConverted: false };
}

/**
 * Cria ticket de validação do DPO (dpoValidationTicketId), ajusta status.
 */
export async function requestDpoValidation(params: {
  organizationId: number;
  actionPlanId: number;
  actorUserId: number;
  assignedToId?: number | null;
}) {
  const db = await getDb();
  const orgId = params.organizationId;

  const { rows: apRows } = await db.execute(sql`
    SELECT *
    FROM action_plans
    WHERE id = ${params.actionPlanId}
      AND "organizationId" = ${orgId}
    LIMIT 1
  `);
  const ap = (apRows as any[])[0];
  if (!ap) throw new Error("Plano de Ação não encontrado");

  // Se já existe ticket de validação, apenas atualiza status
  if (ap.dpoValidationTicketId) {
    await db.execute(sql`
      UPDATE action_plans
      SET status = 'pendente_validacao_dpo', "updatedAt" = NOW()
      WHERE id = ${params.actionPlanId} AND "organizationId" = ${orgId}
    `);
    return { ok: true, ticketId: Number(ap.dpoValidationTicketId), alreadyExists: true };
  }

  const title = `Validação DPO: ${ap.title}`;
  const description = `Solicitação de validação do DPO para ação concluída pelo cliente.\n\n${ap.description || ""}\n\n[Origem] action_plans.id=${ap.id}`;

  const sourceContext = {
    source: "dpo_validation",
    actionPlanId: Number(ap.id),
    assessmentType: String(ap.assessmentType),
    assessmentId: Number(ap.assessmentId),
  };

  const insertResult2 = await db.execute(sql`
    INSERT INTO tickets
      ("organizationId", "createdById", "assignedToId", title, description, "ticketType", priority, status, "slaLevel", deadline, "sourceContext", metadata, "createdAt", "updatedAt")
    VALUES
      (${orgId}, ${params.actorUserId}, ${params.assignedToId ?? null},
       ${title}, ${description}, 'auditoria', ${ap.priority || "media"}, 'novo', 'padrao',
       ${ap.dueDate ?? null}, ${JSON.stringify(sourceContext)}, ${JSON.stringify({ kind: "dpo_validation" })}, NOW(), NOW())
    RETURNING id
  `);

  const idRows2 = (insertResult2 as any).rows ?? insertResult2[0];
  const ticketId = Number((idRows2 as any[])[0]?.id);

  await db.execute(sql`
    UPDATE action_plans
    SET "dpoValidationTicketId" = ${ticketId}, status='pendente_validacao_dpo', "updatedAt" = NOW()
    WHERE id = ${params.actionPlanId} AND "organizationId" = ${orgId}
  `);

  return { ok: true, ticketId, alreadyExists: false };
}

/**
 * Marca Action Plan como concluído pelo cliente e cria (se necessário) o ticket de validação do DPO.
 * - idempotente: se já estiver pendente_validacao_dpo e/ou já tiver dpoValidationTicketId, apenas atualiza timestamps.
 */
export async function markClientCompletedAndRequestDpoValidation(params: {
  organizationId: number;
  actionPlanId: number;
  actorUserId: number;      // cliente ou usuário que concluiu
  assignedToId?: number | null; // DPO/consultor para receber o ticket
}) {
  const db = await getDb();
  const orgId = params.organizationId;

  const { rows: apRows } = await db.execute(sql`
    SELECT *
    FROM action_plans
    WHERE id = ${params.actionPlanId}
      AND "organizationId" = ${orgId}
    LIMIT 1
  `);
  const ap = (apRows as any[])[0];
  if (!ap) throw new Error("Action Plan não encontrado");

  // Atualiza como concluído pelo cliente
  await db.execute(sql`
    UPDATE action_plans
    SET
      status = 'pendente_validacao_dpo',
      "clientCompletedAt" = COALESCE("clientCompletedAt", NOW()),
      "clientCompletedById" = COALESCE("clientCompletedById", ${params.actorUserId}),
      "updatedAt" = NOW()
    WHERE id = ${params.actionPlanId}
      AND "organizationId" = ${orgId}
  `);

  // Cria ticket de validação (idempotente)
  const res = await requestDpoValidation({
    organizationId: orgId,
    actionPlanId: params.actionPlanId,
    actorUserId: params.actorUserId,
    assignedToId: params.assignedToId ?? null,
  });

  return { ok: true, validationTicketId: res.ticketId, alreadyExists: res.alreadyExists };
}

/**
 * Validação do DPO: seta dpoValidatedAt/dpoValidatedById e status=concluida.
 * Também resolve o ticket de validação (se existir).
 */
export async function validateActionPlanAsDpo(params: {
  organizationId: number;
  actionPlanId: number;
  dpoUserId: number;
  resolution?: string | null;
}) {
  const db = await getDb();
  const orgId = params.organizationId;

  const { rows: apRows } = await db.execute(sql`
    SELECT id, "dpoValidationTicketId"
    FROM action_plans
    WHERE id = ${params.actionPlanId}
      AND "organizationId" = ${orgId}
    LIMIT 1
  `);
  const ap = (apRows as any[])[0];
  if (!ap) throw new Error("Action Plan não encontrado");

  await db.execute(sql`
    UPDATE action_plans
    SET
      status = 'concluida',
      "dpoValidatedAt" = NOW(),
      "dpoValidatedById" = ${params.dpoUserId},
      "updatedAt" = NOW()
    WHERE id = ${params.actionPlanId}
      AND "organizationId" = ${orgId}
  `);

  // Resolve ticket de validação se existir
  if (ap.dpoValidationTicketId) {
    await db.execute(sql`
      UPDATE tickets
      SET
        status = 'resolvido',
        "resolvedAt" = NOW(),
        resolution = ${params.resolution || "Validação DPO concluída."},
        "updatedAt" = NOW()
      WHERE id = ${Number(ap.dpoValidationTicketId)}
        AND "organizationId" = ${orgId}
    `);
  }

  return { ok: true, ticketResolved: !!ap.dpoValidationTicketId };
}

/**
 * Rejeição pelo cliente: seta clientRejectionReason e volta status para em_andamento.
 */
export async function rejectActionPlanAsClient(params: {
  organizationId: number;
  actionPlanId: number;
  actorUserId: number;
  rejectionReason: string;
}) {
  const db = await getDb();
  const orgId = params.organizationId;

  await db.execute(sql`
    UPDATE action_plans
    SET
      status = 'recusada_cliente',
      "clientRejectionReason" = ${params.rejectionReason},
      "updatedAt" = NOW()
    WHERE id = ${params.actionPlanId}
      AND "organizationId" = ${orgId}
  `);

  return { ok: true };
}
