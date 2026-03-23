/**
 * contractLayerSync.ts
 * 
 * Sincronização entre camadas do módulo de Análise Contratual:
 * Checklist → Gaps → Riscos → Decisão → Documento
 * 
 * PATCH 2026-02-21: Integração com riskScale.ts para conversão centralizada.
 * Recalibração de severidade mínima conforme regras obrigatórias.
 * Decisão por risco: Inserir Capítulo LGPD, Celebrar DPA, Aditamento, Risco assumido, Em negociação.
 */

import { sql } from "drizzle-orm";
import { logger } from "./_core/logger";
import * as db from "./db";
import {
  riskLevelLabel as riskLevelLabelFromScale,
  riskDbEnumToText,
  riskTextToDbEnum,
  normalizeRiskText,
  type RiskDbLevel,
  type RiskTextLevel,
} from "./riskScale";

// ==================== TIPOS ====================

export type RiskDecision = 
  | "capitulo_lgpd"      // Inserir Capítulo LGPD
  | "celebrar_dpa"       // Celebrar DPA
  | "aditamento"         // Aditamento contratual
  | "risco_assumido"     // Risco assumido pela organização
  | "em_negociacao"      // Em negociação com a contraparte
  | null;                // Sem decisão ainda

export interface Gap {
  checklistItemId: number;
  checklistItemNumber: number;
  question: string;
  status: "nao" | "parcial";
  observations: string | null;
  contractExcerpt: string | null;
  linkedRiskIds: number[];
}

export interface RiskWithDecision {
  id: number;
  analysisId: number;
  contractArea: string | null;
  analysisBlock: number | null;
  riskDescription: string;
  riskLevel: string;               // DB enum ("1".."5")
  riskLevelText: RiskTextLevel;    // Texto normalizado
  originalRiskLevel: string;
  recalibratedRiskLevel: string;
  potentialImpact: string | null;
  requiredAction: string;
  suggestedDeadline: string | null;
  legalReference: string | null;
  decision: RiskDecision;
  decisionNotes: string | null;
  linkedGapIds: number[];
  linkedClauseIds: number[];
}

export interface LayerSyncResult {
  gaps: Gap[];
  risks: RiskWithDecision[];
  orphanRisks: number[];        // riscos sem gap correspondente
  orphanClauses: number[];      // cláusulas sem risco vinculado
  orphanPlans: number[];        // planos sem risco correspondente
  consistency: {
    isConsistent: boolean;
    issues: string[];
  };
}

// ==================== TABELA DE PONDERAÇÃO DE SEVERIDADE ====================

interface SeverityRule {
  pattern: RegExp;
  minLevel: number; // 1=Crítico, 2=Alto, 3=Médio, 4=Baixo, 5=Muito Baixo
  description: string;
}

const SEVERITY_RULES: SeverityRule[] = [
  // Ausência de notificação de incidente → mínimo ALTO (2)
  {
    pattern: /incidente|notifica[çc][ãa]o.*incidente|comunica[çc][ãa]o.*viola[çc][ãa]o|data.?breach|vazamento/i,
    minLevel: 2,
    description: "Ausência de notificação de incidente"
  },
  // Ausência de direitos do titular → mínimo ALTO (2)
  {
    pattern: /direito.*titular|titular.*direito|acesso.*dados|retifica[çc][ãa]o|portabilidade|oposi[çc][ãa]o|elimina[çc][ãa]o.*dados.*titular/i,
    minLevel: 2,
    description: "Ausência de direitos do titular"
  },
  // Ausência de cláusula LGPD → mínimo MÉDIO (3)
  {
    pattern: /cl[áa]usula.*lgpd|lgpd.*cl[áa]usula|prote[çc][ãa]o.*dados|tratamento.*dados.*pessoais|base.*legal|finalidade.*tratamento/i,
    minLevel: 3,
    description: "Ausência de cláusula LGPD"
  },
  // Ausência de retenção/eliminação → mínimo MÉDIO (3)
  {
    pattern: /reten[çc][ãa]o|elimina[çc][ãa]o|descarte|armazenamento.*prazo|prazo.*armazenamento|ciclo.*vida.*dado/i,
    minLevel: 3,
    description: "Ausência de retenção/eliminação"
  },
  // Ausência de segurança → mínimo MÉDIO (3)
  {
    pattern: /seguran[çc]a.*informa[çc][ãa]o|medida.*t[ée]cnica|medida.*organizacional|criptografia|controle.*acesso/i,
    minLevel: 3,
    description: "Ausência de medidas de segurança"
  },
  // Transferência internacional sem salvaguardas → mínimo ALTO (2)
  {
    pattern: /transfer[êe]ncia.*internacional|dados.*exterior|cross.?border|pa[ií]s.*terceiro/i,
    minLevel: 2,
    description: "Transferência internacional sem salvaguardas"
  },
  // Subcontratação/suboperador sem controle → mínimo MÉDIO (3)
  {
    pattern: /subcontrata[çc][ãa]o|suboperador|sub.?processador|terceiro.*acesso|compartilhamento/i,
    minLevel: 3,
    description: "Subcontratação sem controle"
  },
];

/**
 * Recalibra o nível de risco com base nas regras de severidade mínima.
 * Se o risco atual é mais brando que o mínimo exigido, eleva para o mínimo.
 * Aceita tanto enum numérico ("1".."5") quanto texto ("critico", "alto", etc.).
 */
export function recalibrateRiskLevel(riskDescription: string, currentLevel: string): string {
  // Normalizar para numérico
  let currentNum: number;
  const parsed = parseInt(currentLevel);
  if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
    currentNum = parsed;
  } else {
    // Converter de texto para numérico
    currentNum = parseInt(riskTextToDbEnum(normalizeRiskText(currentLevel)));
  }

  let minRequired = 5; // Muito Baixo por padrão

  for (const rule of SEVERITY_RULES) {
    if (rule.pattern.test(riskDescription)) {
      if (rule.minLevel < minRequired) {
        minRequired = rule.minLevel;
      }
    }
  }

  // Se o nível atual é mais brando (número maior) que o mínimo exigido, recalibrar
  const finalLevel = Math.min(currentNum, minRequired);
  return String(finalLevel);
}

/**
 * Retorna a descrição legível do nível de risco.
 * Usa riskScale.ts como source of truth.
 */
export function riskLevelLabel(level: string): string {
  return riskLevelLabelFromScale(level);
}

// ==================== SINCRONIZAÇÃO DE CAMADAS ====================

/**
 * Executa a sincronização completa entre camadas para uma análise.
 * Retorna gaps, riscos com decisão, e relatório de consistência.
 */
export async function syncLayers(analysisId: number): Promise<LayerSyncResult> {
  const conn = await db.getDb();
  if (!conn) throw new Error("DB não disponível");

  // 1. Buscar checklist items
  const checklistRaw = await conn.execute(sql`SELECT * FROM contract_checklist_items WHERE "analysisId" = ${analysisId} ORDER BY "itemNumber" ASC`);
  const checklistItems = Array.isArray(checklistRaw) && Array.isArray(checklistRaw[0]) ? checklistRaw[0] : (Array.isArray(checklistRaw) ? checklistRaw : []);

  // 2. Buscar riscos
  const risksRaw = await conn.execute(sql`SELECT * FROM contract_risk_items WHERE "analysisId" = ${analysisId} ORDER BY id ASC`);
  const riskItems = Array.isArray(risksRaw) && Array.isArray(risksRaw[0]) ? risksRaw[0] : (Array.isArray(risksRaw) ? risksRaw : []);

  // 3. Buscar cláusulas
  const clausesRaw = await conn.execute(sql`SELECT * FROM contract_analysis_clauses WHERE "analysisId" = ${analysisId} ORDER BY "sequenceNumber" ASC`);
  const clauseItems = Array.isArray(clausesRaw) && Array.isArray(clausesRaw[0]) ? clausesRaw[0] : (Array.isArray(clausesRaw) ? clausesRaw : []);

  // 4. Buscar planos de ação
  const plansRaw = await conn.execute(sql`SELECT * FROM action_plans WHERE "assessmentType" = 'contract_analysis' AND "assessmentId" = ${analysisId} ORDER BY id ASC`);
  const planItems = Array.isArray(plansRaw) && Array.isArray(plansRaw[0]) ? plansRaw[0] : (Array.isArray(plansRaw) ? plansRaw : []);

  // 5. Extrair gaps (checklist items com status "nao" ou "parcial")
  const gaps: Gap[] = (checklistItems as any[])
    .filter((item: any) => item.checklistStatus === "nao" || item.checklistStatus === "parcial")
    .map((item: any) => ({
      checklistItemId: item.id,
      checklistItemNumber: item.itemNumber,
      question: item.question,
      status: item.checklistStatus as "nao" | "parcial",
      observations: item.observations || null,
      contractExcerpt: item.contractExcerpt || null,
      linkedRiskIds: [],
    }));

  // 6. Vincular riscos a gaps pelo analysisBlock/itemNumber
  const risks: RiskWithDecision[] = (riskItems as any[]).map((risk: any) => {
    const originalLevel = String(risk.riskLevel);
    const recalibrated = recalibrateRiskLevel(risk.riskDescription || "", originalLevel);
    const riskLevelText = riskDbEnumToText(recalibrated);

    // Vincular ao gap correspondente pelo analysisBlock
    const linkedGapIds: number[] = [];
    for (const gap of gaps) {
      if (risk.analysisBlock && risk.analysisBlock === gap.checklistItemNumber) {
        linkedGapIds.push(gap.checklistItemId);
        gap.linkedRiskIds.push(risk.id);
      }
    }

    // Se não encontrou vinculação por bloco, tentar por correspondência textual
    if (linkedGapIds.length === 0) {
      for (const gap of gaps) {
        const riskWords = (risk.riskDescription || "").toLowerCase().split(/\s+/).filter((w: string) => w.length > 4);
        const gapWords = (gap.question || "").toLowerCase();
        const matches = riskWords.filter((w: string) => gapWords.includes(w));
        if (matches.length >= 2) {
          linkedGapIds.push(gap.checklistItemId);
          gap.linkedRiskIds.push(risk.id);
        }
      }
    }

    // Vincular cláusulas ao risco
    const linkedClauseIds: number[] = [];
    for (const clause of clauseItems as any[]) {
      const clauseContent = (clause.content || "").toLowerCase();
      const riskDesc = (risk.riskDescription || "").toLowerCase();
      const riskArea = (risk.contractArea || "").toLowerCase();
      if (riskArea && clauseContent.includes(riskArea)) {
        linkedClauseIds.push(clause.id);
      }
    }

    return {
      id: risk.id,
      analysisId: risk.analysisId,
      contractArea: risk.contractArea || null,
      analysisBlock: risk.analysisBlock || null,
      riskDescription: risk.riskDescription,
      riskLevel: recalibrated,
      riskLevelText,
      originalRiskLevel: originalLevel,
      recalibratedRiskLevel: recalibrated,
      potentialImpact: risk.potentialImpact || null,
      requiredAction: risk.requiredAction,
      suggestedDeadline: risk.suggestedDeadline || null,
      legalReference: risk.legalReference || null,
      decision: (risk.riskDecision as RiskDecision) || null,
      decisionNotes: risk.decisionNotes || null,
      linkedGapIds,
      linkedClauseIds,
    };
  });

  // 7. Verificar consistência
  const issues: string[] = [];

  // Riscos sem gap correspondente
  const orphanRisks = risks.filter(r => r.linkedGapIds.length === 0).map(r => r.id);
  if (orphanRisks.length > 0) {
    issues.push(`${orphanRisks.length} risco(s) sem lacuna correspondente no checklist`);
  }

  // Cláusulas sem risco vinculado
  const allLinkedClauseIds = new Set(risks.flatMap(r => r.linkedClauseIds));
  const orphanClauses = (clauseItems as any[])
    .filter((c: any) => !allLinkedClauseIds.has(c.id))
    .map((c: any) => c.id);
  if (orphanClauses.length > 0) {
    issues.push(`${orphanClauses.length} cláusula(s) sem risco vinculado`);
  }

  // Planos sem risco correspondente
  const riskIds = new Set(risks.map(r => r.id));
  const orphanPlans = (planItems as any[])
    .filter((p: any) => p.riskItemId && !riskIds.has(p.riskItemId))
    .map((p: any) => p.id);
  if (orphanPlans.length > 0) {
    issues.push(`${orphanPlans.length} plano(s) de ação sem risco correspondente`);
  }

  // Verificar consistência entre riskLevel do DB e governanceMetadata
  // (risco numérico no DB deve corresponder ao texto no metadata)

  return {
    gaps,
    risks,
    orphanRisks,
    orphanClauses,
    orphanPlans,
    consistency: {
      isConsistent: issues.length === 0,
      issues,
    },
  };
}

/**
 * Salva a decisão do usuário para um risco específico.
 */
export async function saveRiskDecision(
  riskId: number,
  decision: RiskDecision,
  decisionNotes: string | null
): Promise<void> {
  const conn = await db.getDb();
  if (!conn) throw new Error("DB não disponível");

  await conn.execute(
    sql`UPDATE contract_risk_items SET "riskDecision" = ${decision}, "decisionNotes" = ${decisionNotes}, "updatedAt" = NOW() WHERE id = ${riskId}`
  );

  logger.info("[LayerSync] Decisão salva para risco", { riskId, decision });
}

/**
 * Aplica a recalibração de severidade em todos os riscos de uma análise.
 * Atualiza o banco de dados com os novos níveis.
 */
export async function applyRecalibration(analysisId: number): Promise<{ updated: number; details: Array<{ riskId: number; from: string; to: string; fromText: string; toText: string }> }> {
  const conn = await db.getDb();
  if (!conn) throw new Error("DB não disponível");

  const risksRaw = await conn.execute(sql`SELECT id, "riskDescription", "riskLevel" FROM contract_risk_items WHERE "analysisId" = ${analysisId}`);
  const riskItems = Array.isArray(risksRaw) && Array.isArray(risksRaw[0]) ? risksRaw[0] : (Array.isArray(risksRaw) ? risksRaw : []);

  const details: Array<{ riskId: number; from: string; to: string; fromText: string; toText: string }> = [];

  for (const risk of riskItems as any[]) {
    const newLevel = recalibrateRiskLevel(risk.riskDescription, String(risk.riskLevel));
    if (newLevel !== String(risk.riskLevel)) {
      await conn.execute(
        sql`UPDATE contract_risk_items SET "riskLevel" = ${newLevel}, "updatedAt" = NOW() WHERE id = ${risk.id}`
      );
      details.push({
        riskId: risk.id,
        from: String(risk.riskLevel),
        to: newLevel,
        fromText: riskDbEnumToText(String(risk.riskLevel)),
        toText: riskDbEnumToText(newLevel),
      });
    }
  }

  logger.info("[LayerSync] Recalibração aplicada", { analysisId, updated: details.length });

  return { updated: details.length, details };
}

/**
 * Gera documento consolidado com base nas decisões tomadas.
 * Agrupa riscos por tipo de decisão e gera as seções correspondentes.
 */
export function generateConsolidatedDocument(risks: RiskWithDecision[]): {
  capitulo_lgpd: RiskWithDecision[];
  celebrar_dpa: RiskWithDecision[];
  aditamento: RiskWithDecision[];
  risco_assumido: RiskWithDecision[];
  em_negociacao: RiskWithDecision[];
  sem_decisao: RiskWithDecision[];
  summary: string;
} {
  const groups = {
    capitulo_lgpd: risks.filter(r => r.decision === "capitulo_lgpd"),
    celebrar_dpa: risks.filter(r => r.decision === "celebrar_dpa"),
    aditamento: risks.filter(r => r.decision === "aditamento"),
    risco_assumido: risks.filter(r => r.decision === "risco_assumido"),
    em_negociacao: risks.filter(r => r.decision === "em_negociacao"),
    sem_decisao: risks.filter(r => !r.decision),
  };

  const parts: string[] = [];
  if (groups.capitulo_lgpd.length) parts.push(`${groups.capitulo_lgpd.length} risco(s) requerem inserção de Capítulo LGPD`);
  if (groups.celebrar_dpa.length) parts.push(`${groups.celebrar_dpa.length} risco(s) requerem celebração de DPA`);
  if (groups.aditamento.length) parts.push(`${groups.aditamento.length} risco(s) requerem aditamento contratual`);
  if (groups.risco_assumido.length) parts.push(`${groups.risco_assumido.length} risco(s) com risco assumido`);
  if (groups.em_negociacao.length) parts.push(`${groups.em_negociacao.length} risco(s) em negociação`);
  if (groups.sem_decisao.length) parts.push(`${groups.sem_decisao.length} risco(s) aguardando decisão`);

  return {
    ...groups,
    summary: parts.join(". ") + ".",
  };
}
