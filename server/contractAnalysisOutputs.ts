import { sql } from "drizzle-orm";
import { getDb } from "./db";

/**
 * Fonte de verdade: contagens reais de outputs.
 * Objetivo: impedir pipeline "100%" com abas vazias.
 */

export type OutputStage = "mapping" | "risks" | "clauses" | "action_plan" | "reports" | "completed";

async function rowsFromExecute(result: any): Promise<any[]> {
  if (result?.rows && Array.isArray(result.rows)) return result.rows;
  if (Array.isArray(result)) return result;
  return [];
}

export async function computeOutputCounts(analysisId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB_NOT_AVAILABLE");

  const exec = (q: any) => (db as any).execute(q);

  const [m] = await Promise.all([
    exec(sql`SELECT COUNT(*) as cnt FROM contract_analysis_maps WHERE "analysisId" = ${analysisId}`),
  ]);
  const [c] = await Promise.all([
    exec(sql`SELECT COUNT(*) as cnt FROM contract_checklist_items WHERE "analysisId" = ${analysisId}`),
  ]);
  const [r] = await Promise.all([
    exec(sql`SELECT COUNT(*) as cnt FROM contract_risk_items WHERE "analysisId" = ${analysisId}`),
  ]);

  let clauses = 0;
  try {
    const res = await exec(sql`SELECT COUNT(*) as cnt FROM contract_analysis_clauses WHERE "analysisId" = ${analysisId}`);
    const rows = await rowsFromExecute(res);
    clauses = Number(rows?.[0]?.cnt ?? 0) || 0;
  } catch {}

  let actions = 0;
  try {
    const res = await exec(sql`SELECT COUNT(*) as cnt FROM action_plans WHERE "assessmentType"='contract_analysis' AND "assessmentId" = ${analysisId}`);
    const rows = await rowsFromExecute(res);
    actions = Number(rows?.[0]?.cnt ?? 0) || 0;
  } catch {}

  const rowsM = await rowsFromExecute(m);
  const rowsC = await rowsFromExecute(c);
  const rowsR = await rowsFromExecute(r);

  return {
    mapCount: Number(rowsM?.[0]?.cnt ?? 0) || 0,
    checklistCount: Number(rowsC?.[0]?.cnt ?? 0) || 0,
    riskCount: Number(rowsR?.[0]?.cnt ?? 0) || 0,
    clauseCount: clauses,
    actionPlanCount: actions,
  };
}

export async function upsertOutputsManifest(params: {
  analysisId: number;
  organizationId: number;
  reportUrl?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB_NOT_AVAILABLE");

  const counts = await computeOutputCounts(params.analysisId);

  const integrity = `${counts.mapCount}|${counts.checklistCount}|${counts.riskCount}|${counts.clauseCount}|${counts.actionPlanCount}|${params.reportUrl ?? ""}`;

  await (db as any).execute(sql`
    INSERT INTO contract_analysis_outputs_manifest
      ("analysisId", "organizationId", "mapCount", "checklistCount", "riskCount", "clauseCount", "actionPlanCount", "reportUrl", "integrityHash", "generatedAt")
    VALUES
      (${params.analysisId}, ${params.organizationId}, ${counts.mapCount}, ${counts.checklistCount}, ${counts.riskCount}, ${counts.clauseCount}, ${counts.actionPlanCount}, ${params.reportUrl ?? null}, encode(digest(${integrity}::bytea, 'sha256'), 'hex'), NOW())
    ON CONFLICT ("analysisId") DO UPDATE SET
      "organizationId" = EXCLUDED."organizationId",
      "mapCount" = EXCLUDED."mapCount",
      "checklistCount" = EXCLUDED."checklistCount",
      "riskCount" = EXCLUDED."riskCount",
      "clauseCount" = EXCLUDED."clauseCount",
      "actionPlanCount" = EXCLUDED."actionPlanCount",
      "reportUrl" = EXCLUDED."reportUrl",
      "integrityHash" = EXCLUDED."integrityHash",
      "generatedAt" = NOW()
  `);

  return counts;
}

export async function assertOutputsOrThrow(params: {
  analysisId: number;
  stage: OutputStage;
  requireReport?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB_NOT_AVAILABLE");

  const counts = await computeOutputCounts(params.analysisId);

  // Regras mínimas por etapa (fidelidade)
  if (params.stage === "mapping" && counts.mapCount <= 0) throw new Error("OUTPUT_MISSING:MAPPING");
  if (params.stage === "risks" && (counts.checklistCount <= 0 || counts.riskCount <= 0)) throw new Error("OUTPUT_MISSING:RISKS");
  if (params.stage === "clauses" && counts.clauseCount <= 0) throw new Error("OUTPUT_MISSING:CLAUSES");
  if (params.stage === "action_plan" && counts.riskCount > 0 && counts.actionPlanCount <= 0) throw new Error("OUTPUT_MISSING:ACTION_PLAN");

  if (params.stage === "reports" || params.stage === "completed") {
    if (params.requireReport) {
      const res = await (db as any).execute(sql`SELECT "reportUrl" FROM contract_analyses WHERE id = ${params.analysisId} LIMIT 1`);
      const rows = await rowsFromExecute(res);
      const reportUrl = rows?.[0]?.reportUrl ?? null;
      if (!reportUrl) throw new Error("OUTPUT_MISSING:REPORT_URL");
    }
  }

  if (params.stage === "completed") {
    if (counts.mapCount <= 0) throw new Error("OUTPUT_MISSING:MAPPING");
    if (counts.checklistCount <= 0) throw new Error("OUTPUT_MISSING:CHECKLIST");
    if (counts.riskCount <= 0) throw new Error("OUTPUT_MISSING:RISKS");
    if (counts.clauseCount <= 0) throw new Error("OUTPUT_MISSING:CLAUSES");
  }

  return counts;
}

// ======== Fallback "fiel" (não inventa: registra ausência e recomendações) ========

export function buildFaithfulFallbackMap(contractName: string) {
  return {
    contractObject: contractName || "Contrato analisado",
    contractType: "nao_identificado",
    agentTypeJustification: "Não foi possível inferir com segurança a partir do documento fornecido. O documento pode ser certificado/licença/termo incompleto.",
    hasProtectionClause: "nao_identificado",
    protectionClauseDetails: "Não foi identificado trecho claro de cláusulas LGPD/DPA no documento fornecido.",
    legalRisks: "Ausência/insuficiência de cláusulas LGPD essenciais (finalidade, bases legais, direitos do titular, retenção, incidentes, segurança).",
    securityRisks: "Não foi possível confirmar medidas de segurança contratuais; recomenda-se DPA/Aditivo com controles mínimos.",
    suggestedClause: "Recomenda-se DPA/Aditivo LGPD com segurança, incidentes (48h), subcontratação, retenção, direitos do titular e auditoria.",
    actionStatus: "ajustar",
    suggestedDeadline: "30 dias",
  };
}

export function buildFaithfulFallbackChecklist() {
  const questions = [
    "Finalidade do tratamento de dados está definida?",
    "Bases legais do tratamento estão definidas?",
    "Papéis e responsabilidades (Controlador/Operador) estão definidos?",
    "Compartilhamento e subcontratação estão regulados?",
    "Medidas de segurança da informação estão previstas?",
    "Retenção e eliminação de dados estão previstas?",
    "Direitos dos titulares (acesso, correção, exclusão) estão contemplados?",
    "Notificação de incidente está prevista?",
    "Auditoria/fiscalização de conformidade está prevista?",
    "Cláusulas LGPD/DPA específicas constam no contrato?",
  ];
  return questions.map((q: string, idx: number) => ({
    itemNumber: idx + 1,
    question: q,
    status: "nao_identificado",
    observations: "Não identificado com clareza no documento fornecido.",
    contractExcerpt: null,
  }));
}

export function buildFaithfulFallbackRisks() {
  return [
    {
      contractArea: "Geral",
      analysisBlock: 1,
      riskDescription: "Contrato/documento insuficiente para demonstrar conformidade LGPD (ausência de DPA, segurança, incidentes, direitos do titular).",
      riskLevel: "alto",
      potentialImpact: "Risco de não conformidade LGPD, sanções, responsabilização civil, incidentes sem governança contratual.",
      requiredAction: "Solicitar DPA/Aditivo LGPD e anexos de segurança e incidentes; revisar com Jurídico e DPO.",
      suggestedDeadline: "30 dias",
      legalReference: "LGPD arts. 6, 37-42; boas práticas ANPD; ISO 27001/27002.",
    },
  ];
}

export function buildFaithfulFallbackClauses() {
  return [
    {
      clauseId: "recomendacao-lgpd-1",
      sequenceNumber: 1,
      title: "Recomendação de Cláusula de Proteção de Dados (DPA)",
      content:
        "Recomendação: Inserir cláusula DPA com: (i) tratamento apenas sob instruções do Controlador; (ii) medidas de segurança (ISO 27001/27002); (iii) notificação de incidente em até 48h; (iv) subcontratação com flow-down; (v) apoio aos direitos do titular; (vi) retenção/eliminação; (vii) auditoria.",
    },
  ];
}
