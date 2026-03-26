/**
 * Modelo de Risco v3.1 — Clusters + Pisos Jurídicos + Consistência
 * =================================================================
 * Seusdados Consultoria em Gestão de Dados Limitada
 * CNPJ 33.899.116/0001-63 | seusdados.com
 *
 * PATCH 2026-02-21: Correção definitiva do modelo matemático.
 * - P1: mapChecklistToMacroBlocks usa analysisBlock real (não fórmula proporcional)
 * - P3: Normalização central de checklistStatus
 * - P4: Cobertura dos 18 macro-blocos (blocos sem checklist = coverage "no_checklist_item")
 * - P5: Pesos reais do checklist (weight 1-5) no cálculo de gapScore
 * - Integração com riskScale.ts para conversão de escala
 *
 * Fluxo: checklist_for_risk → gaps → clusters → riskScore/riskLevel
 */

import {
  type RiskTextLevel,
  type RiskDbLevel,
  normalizeRiskText,
  riskTextToDbEnum,
  riskDbEnumToText,
  riskLevelLabel,
  maxRiskLevel,
  isMoreSevere,
  riskToPriority,
} from "./riskScale";

// Re-exportar riskScale para consumidores que importam deste módulo
export { normalizeRiskText, riskTextToDbEnum, riskDbEnumToText, riskLevelLabel };

// ── Tipos ──────────────────────────────────────────────────────────────

export type ChecklistStatus = "atende" | "parcial" | "nao_atende" | "nao_identificado";

export interface ChecklistForRisk {
  macroBlock: number;       // analysisBlock real (1..18)
  itemNumber: number;       // itemNumber do checklist
  status: ChecklistStatus;
  weight: number;           // peso do item (1..5)
  itemKey: string;
  question: string;
  evidence?: string;
}

export interface MacroCoverage {
  macroBlock: number;
  coverage: "covered" | "no_checklist_item";
  gapScore: number | null;  // null se não coberto
  items: ChecklistForRisk[];
}

export interface RiskCluster {
  id: string;
  label: string;
  macroBlocks: number[];
  gapScore: number;           // 0-100 (maior = pior)
  riskLevel: RiskTextLevel;
  riskLevelDb: RiskDbLevel;
  gapCount: number;
  totalItems: number;
  recommendation: string;
  description: string;
  relatedGaps: string[];
  coverage: Array<{ macroBlock: number; coverage: string }>;
}

export interface RiskModelResult {
  riskScore: number;            // 0-100
  riskLevel: RiskTextLevel;
  riskLevelDb: RiskDbLevel;
  clusters: RiskCluster[];
  pisoAplicado: string | null;
  consistencyNotes: string[];
  macroCoverage: MacroCoverage[];
}

export interface ContextoRisco {
  A8_setor_regulado?: string[];
  B1_trata_dados_pessoais?: boolean;
  B3_trata_dados_sensiveis?: boolean;
  B4_trata_dados_sensiveis_em_larga_escala?: string;
  B6_trata_dados_criancas_0_12?: boolean;
  B7_trata_dados_adolescentes_13_17?: boolean;
  E4_ha_transferencia_internacional?: boolean;
  R1_nivel_risco_global_estimado?: string;
}

// ── Constantes ─────────────────────────────────────────────────────────

/**
 * Mapeamento oficial itemNumber → analysisBlock do CHECKLIST_V2.
 * Source of truth: server/contractChecklist.ts
 */
const ITEM_TO_ANALYSIS_BLOCK: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 5,
  5: 6,
  6: 7,
  7: 11,
  8: 12,
  9: 13,
  10: 16,
  11: 9,
  12: 17,
  13: 15,
  14: 18,
};

/**
 * Pesos oficiais do CHECKLIST_V2.
 */
const ITEM_WEIGHTS: Record<number, number> = {
  1: 4,
  2: 5,
  3: 4,
  4: 5,
  5: 5,
  6: 4,
  7: 4,
  8: 5,
  9: 3,
  10: 4,
  11: 4,
  12: 3,
  13: 4,
  14: 3,
};

/**
 * Mapeamento dos 18 macro-blocos para domínios de risco (clusters).
 */
const MACRO_TO_DOMAIN: Record<number, string> = {
  1: "identificacao_partes",
  2: "identificacao_partes",
  3: "finalidade_tratamento",
  4: "finalidade_tratamento",
  5: "base_legal",
  6: "seguranca_tecnica",
  7: "seguranca_tecnica",
  8: "direitos_titular",
  9: "direitos_titular",
  10: "incidentes_notificacao",
  11: "incidentes_notificacao",
  12: "incidentes_notificacao",
  13: "retencao_eliminacao",
  14: "retencao_eliminacao",
  15: "transferencia_internacional",
  16: "transferencia_internacional",
  17: "governanca_conformidade",
  18: "governanca_conformidade",
};

const DOMAIN_LABELS: Record<string, string> = {
  identificacao_partes: "Identificação das Partes e Papéis LGPD",
  finalidade_tratamento: "Finalidade e Escopo do Tratamento",
  base_legal: "Base Legal e Consentimento",
  seguranca_tecnica: "Segurança Técnica e Organizacional",
  direitos_titular: "Direitos do Titular de Dados",
  incidentes_notificacao: "Incidentes e Notificação",
  retencao_eliminacao: "Retenção e Eliminação de Dados",
  transferencia_internacional: "Transferência Internacional",
  governanca_conformidade: "Governança e Conformidade",
};

const DOMAIN_RECOMMENDATIONS: Record<string, string> = {
  identificacao_partes: "capitulo_lgpd",
  finalidade_tratamento: "capitulo_lgpd",
  base_legal: "capitulo_lgpd",
  seguranca_tecnica: "dpa",
  direitos_titular: "capitulo_lgpd",
  incidentes_notificacao: "dpa",
  retencao_eliminacao: "aditamento",
  transferencia_internacional: "dpa",
  governanca_conformidade: "aditamento",
};

/**
 * Peso de cada status para cálculo do gapScore.
 * v(atende)=0, v(parcial)=0.5, v(nao_atende)=1, v(nao_identificado)=0.7
 */
const STATUS_VALUE: Record<ChecklistStatus, number> = {
  atende: 0,
  parcial: 0.5,
  nao_atende: 1.0,
  nao_identificado: 0.7,
};

/**
 * Pisos jurídicos: condições que elevam o nível mínimo de risco.
 */
interface PisoJuridico {
  id: string;
  label: string;
  condition: (checklist: ChecklistForRisk[], ctx: ContextoRisco, macroCoverage: MacroCoverage[]) => boolean;
  minLevel: RiskTextLevel;
}

const PISOS_JURIDICOS: PisoJuridico[] = [
  {
    id: "incidentes_ausente",
    label: "Ausência de cláusula de notificação de incidentes",
    condition: (cl, _ctx, coverage) => {
      // Macro-blocos 10-12: verificar apenas os que têm cobertura
      const incItems = cl.filter((c) => [10, 11, 12].includes(c.macroBlock));
      if (incItems.length > 0) {
        return incItems.every((c) => c.status === "nao_atende" || c.status === "nao_identificado");
      }
      // Se não há itens diretos, verificar se os macros sem cobertura existem
      const uncoveredMacros = coverage.filter(
        (mc) => [10, 11, 12].includes(mc.macroBlock) && mc.coverage === "no_checklist_item"
      );
      // Se todos os macros deste domínio estão sem cobertura, não disparar piso
      // (não há evidência suficiente para afirmar ausência)
      return uncoveredMacros.length < 3 && incItems.length > 0;
    },
    minLevel: "alto",
  },
  {
    id: "seguranca_ausente",
    label: "Ausência de medidas de segurança técnica",
    condition: (cl) => {
      const secItems = cl.filter((c) => [6, 7].includes(c.macroBlock));
      return secItems.length > 0 && secItems.every((c) => c.status === "nao_atende" || c.status === "nao_identificado");
    },
    minLevel: "alto",
  },
  {
    id: "direitos_titular_ausente",
    label: "Ausência de garantia de direitos do titular",
    condition: (cl) => {
      const dirItems = cl.filter((c) => [8, 9].includes(c.macroBlock));
      return dirItems.length > 0 && dirItems.every((c) => c.status === "nao_atende" || c.status === "nao_identificado");
    },
    minLevel: "alto",
  },
  {
    id: "transferencia_internacional_ausente",
    label: "Transferência internacional sem salvaguardas",
    condition: (cl, ctx) => {
      if (!ctx.E4_ha_transferencia_internacional) return false;
      const tiItems = cl.filter((c) => [15, 16].includes(c.macroBlock));
      return tiItems.length > 0 && tiItems.every((c) => c.status === "nao_atende" || c.status === "nao_identificado");
    },
    minLevel: "critico",
  },
  {
    id: "dados_sensiveis_larga_escala",
    label: "Dados sensíveis em larga escala sem proteção adequada",
    condition: (cl, ctx) => {
      if (!ctx.B3_trata_dados_sensiveis || ctx.B4_trata_dados_sensiveis_em_larga_escala !== "sim") return false;
      const secItems = cl.filter((c) => [6, 7].includes(c.macroBlock));
      return secItems.some((c) => c.status === "nao_atende" || c.status === "nao_identificado");
    },
    minLevel: "critico",
  },
  {
    id: "dados_menores",
    label: "Tratamento de dados de crianças/adolescentes sem proteção específica",
    condition: (cl, ctx) => {
      if (!ctx.B6_trata_dados_criancas_0_12 && !ctx.B7_trata_dados_adolescentes_13_17) return false;
      const badItems = cl.filter((c) => c.status === "nao_atende" || c.status === "nao_identificado");
      return badItems.length >= 3;
    },
    minLevel: "alto",
  },
  {
    id: "retencao_eliminacao_ausente",
    label: "Ausência de política de retenção e eliminação",
    condition: (cl) => {
      const retItems = cl.filter((c) => [13, 14].includes(c.macroBlock));
      return retItems.length > 0 && retItems.every((c) => c.status === "nao_atende" || c.status === "nao_identificado");
    },
    minLevel: "medio",
  },
];

// ── Funções Públicas ──────────────────────────────────────────────────

/**
 * Normaliza o status do checklist para os 4 valores aceitos.
 * Aceita: "sim", "nao", "parcial", null, undefined, "atende", "nao_atende", etc.
 */
export function normalizeChecklistStatus(raw: string | null | undefined): ChecklistStatus {
  if (!raw) return "nao_identificado";
  const lower = raw.toLowerCase().trim();
  const map: Record<string, ChecklistStatus> = {
    // Do banco (checklistStatus)
    sim: "atende",
    nao: "nao_atende",
    parcial: "parcial",
    // Do modelo (status normalizado)
    atende: "atende",
    conforme: "atende",
    nao_atende: "nao_atende",
    "não atende": "nao_atende",
    "nao atende": "nao_atende",
    "não": "nao_atende",
    parcialmente: "parcial",
    nao_identificado: "nao_identificado",
    "não identificado": "nao_identificado",
    "nao identificado": "nao_identificado",
    "não se aplica": "nao_identificado",
    na: "nao_identificado",
    "n/a": "nao_identificado",
  };
  return map[lower] || "nao_identificado";
}

// Alias para compatibilidade
export const normalizeStatus = normalizeChecklistStatus;

/**
 * Mapeia itens de checklist para macro-blocos usando analysisBlock REAL.
 * NÃO usa fórmula proporcional — usa o campo analysisBlock do CHECKLIST_V2.
 *
 * @param checklistItems - Itens respondidos (do banco ou da IA)
 * @returns Array de ChecklistForRisk com macroBlock = analysisBlock real
 */
export function mapChecklistToMacroBlocks(
  checklistItems: Array<{
    itemNumber: number;
    question?: string;
    checklistStatus?: string;
    status?: string;          // alias (compatibilidade com IA)
    observations?: string;
    contractExcerpt?: string;
    weight?: number;
  }>
): ChecklistForRisk[] {
  const warnings: string[] = [];

  return checklistItems.map((item) => {
    // Obter analysisBlock real do checklist oficial
    const officialBlock = ITEM_TO_ANALYSIS_BLOCK[item.itemNumber];
    let macroBlock: number;

    if (officialBlock !== undefined) {
      macroBlock = officialBlock;
    } else {
      // Edge case: itemNumber não existe no checklist oficial
      macroBlock = 14; // Fallback para bloco 14 (retencao_eliminacao)
      warnings.push(`Item ${item.itemNumber} não encontrado no checklist oficial; mapeado para bloco 14.`);
    }

    // Normalizar status (aceita tanto checklistStatus quanto status)
    const rawStatus = item.checklistStatus || item.status || null;
    const status = normalizeChecklistStatus(rawStatus);

    // Obter peso real do checklist oficial
    const weight = item.weight || ITEM_WEIGHTS[item.itemNumber] || 3;

    return {
      macroBlock,
      itemNumber: item.itemNumber,
      status,
      weight,
      itemKey: `ITEM_${String(item.itemNumber).padStart(2, "0")}`,
      question: item.question || "",
      evidence: item.contractExcerpt || item.observations || undefined,
    };
  });
}

/**
 * Calcula a cobertura dos 18 macro-blocos.
 * Blocos sem item de checklist recebem coverage = "no_checklist_item" e gapScore = null.
 */
function buildMacroCoverage(checklist: ChecklistForRisk[]): MacroCoverage[] {
  const coverage: MacroCoverage[] = [];

  for (let block = 1; block <= 18; block++) {
    const items = checklist.filter((c) => c.macroBlock === block);
    if (items.length > 0) {
      // Calcular gapScore ponderado: G = sum(weight_i * v(status_i)) / sum(weight_i)
      const weightedSum = items.reduce((sum, it) => sum + it.weight * STATUS_VALUE[it.status], 0);
      const totalWeight = items.reduce((sum, it) => sum + it.weight, 0);
      const gapScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;

      coverage.push({
        macroBlock: block,
        coverage: "covered",
        gapScore,
        items,
      });
    } else {
      coverage.push({
        macroBlock: block,
        coverage: "no_checklist_item",
        gapScore: null,
        items: [],
      });
    }
  }

  return coverage;
}

/**
 * Agrupa macro-blocos em domínios e calcula o gapScore ponderado de cada domínio.
 * Usa a fórmula: G = sum(weight_i * v(status_i)) / sum(weight_i)
 */
function buildDomainGaps(
  checklist: ChecklistForRisk[],
  macroCoverage: MacroCoverage[]
): Map<string, { items: ChecklistForRisk[]; gapScore: number; coveredMacros: number[]; uncoveredMacros: number[] }> {
  const domains = new Map<string, { items: ChecklistForRisk[]; gapScore: number; coveredMacros: number[]; uncoveredMacros: number[] }>();

  // Inicializar todos os domínios
  for (const [block, domain] of Object.entries(MACRO_TO_DOMAIN)) {
    if (!domains.has(domain)) {
      domains.set(domain, { items: [], gapScore: 0, coveredMacros: [], uncoveredMacros: [] });
    }
    const mc = macroCoverage.find((m) => m.macroBlock === Number(block));
    if (mc?.coverage === "covered") {
      domains.get(domain)!.coveredMacros.push(Number(block));
    } else {
      domains.get(domain)!.uncoveredMacros.push(Number(block));
    }
  }

  // Adicionar itens aos domínios
  for (const item of checklist) {
    const domain = MACRO_TO_DOMAIN[item.macroBlock] || "governanca_conformidade";
    if (!domains.has(domain)) {
      domains.set(domain, { items: [], gapScore: 0, coveredMacros: [], uncoveredMacros: [] });
    }
    domains.get(domain)!.items.push(item);
  }

  // Calcular gapScore ponderado por domínio
  for (const [, data] of Array.from(domains)) {
    if (data.items.length === 0) {
      data.gapScore = 0; // Sem itens = sem evidência de gap
      continue;
    }
    const weightedSum = data.items.reduce((sum, it) => sum + it.weight * STATUS_VALUE[it.status], 0);
    const totalWeight = data.items.reduce((sum, it) => sum + it.weight, 0);
    data.gapScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;
  }

  return domains;
}

/**
 * Converte gapScore em riskLevel textual.
 */
function gapScoreToLevel(score: number): RiskTextLevel {
  if (score >= 80) return "critico";
  if (score >= 60) return "alto";
  if (score >= 30) return "medio";
  return "baixo";
}

/**
 * Função principal: infere risco v3.1 a partir do contexto e checklist.
 */
export function inferirRiscoV31(
  contexto: ContextoRisco,
  checklist: ChecklistForRisk[]
): RiskModelResult {
  const consistencyNotes: string[] = [];

  // 1. Calcular cobertura dos 18 macro-blocos
  const macroCoverage = buildMacroCoverage(checklist);
  const uncoveredBlocks = macroCoverage.filter((mc) => mc.coverage === "no_checklist_item").map((mc) => mc.macroBlock);
  if (uncoveredBlocks.length > 0) {
    consistencyNotes.push(
      `Macro-blocos sem cobertura direta no checklist: [${uncoveredBlocks.join(", ")}]. Inferência baseada em mapa/riscos.`
    );
  }

  // 2. Agrupar em domínios
  const domainGaps = buildDomainGaps(checklist, macroCoverage);

  // 3. Criar clusters (apenas domínios com gaps reais)
  const clusters: RiskCluster[] = [];
  let clusterIdx = 0;

  for (const [domain, data] of Array.from(domainGaps)) {
    if (data.gapScore <= 0) continue; // Domínio sem gaps

    clusterIdx++;
    const gapItems = data.items.filter((it) => it.status !== "atende");
    const clusterRiskLevel = gapScoreToLevel(data.gapScore);

    clusters.push({
      id: `cluster_${String(clusterIdx).padStart(2, "0")}`,
      label: DOMAIN_LABELS[domain] || domain,
      macroBlocks: Array.from(new Set(data.items.map((it) => it.macroBlock))).sort(),
      gapScore: data.gapScore,
      riskLevel: clusterRiskLevel,
      riskLevelDb: riskTextToDbEnum(clusterRiskLevel),
      gapCount: gapItems.length,
      totalItems: data.items.length,
      recommendation: DOMAIN_RECOMMENDATIONS[domain] || "aditamento",
      description: `${gapItems.length} de ${data.items.length} itens com lacunas no domínio "${DOMAIN_LABELS[domain] || domain}"`,
      relatedGaps: gapItems.map((it) => it.itemKey),
      coverage: [...data.coveredMacros.map((b) => ({ macroBlock: b, coverage: "covered" })),
                 ...data.uncoveredMacros.map((b) => ({ macroBlock: b, coverage: "no_checklist_item" }))],
    });
  }

  // 4. Garantir mínimo de 3 clusters quando houver múltiplos problemas
  const badItemCount = checklist.filter((c) => c.status === "nao_atende" || c.status === "nao_identificado").length;
  if (badItemCount >= 3 && clusters.length < 3) {
    consistencyNotes.push(
      `Ajuste de consistência: ${badItemCount} itens problemáticos mas apenas ${clusters.length} clusters. Domínios insuficientes para fragmentar.`
    );
  }

  // 5. Calcular riskScore global (média ponderada dos clusters usando peso dos itens)
  let riskScore: number;
  if (clusters.length === 0) {
    riskScore = 0;
  } else {
    let totalWeightedGap = 0;
    let totalWeight = 0;
    for (const cluster of clusters) {
      // Buscar itens originais do cluster para usar pesos reais
      const clusterItems = checklist.filter((c) => cluster.macroBlocks.includes(c.macroBlock));
      const clusterWeight = clusterItems.reduce((sum, it) => sum + it.weight, 0);
      totalWeightedGap += cluster.gapScore * clusterWeight;
      totalWeight += clusterWeight;
    }
    riskScore = totalWeight > 0 ? Math.round(totalWeightedGap / totalWeight) : 0;
  }

  // 6. Determinar riskLevel base
  let riskLevel: RiskTextLevel = gapScoreToLevel(riskScore);

  // 7. Aplicar regra de consistência: >=3 itens ruins → não pode ser "baixo" ou "muito_baixo"
  if (badItemCount >= 3 && (riskLevel === "baixo" || riskLevel === "muito_baixo")) {
    riskLevel = "medio";
    consistencyNotes.push(
      `Regra de consistência: ${badItemCount} itens não conformes — nível elevado para "médio".`
    );
  }

  // 8. Aplicar pisos jurídicos
  let pisoAplicado: string | null = null;
  for (const piso of PISOS_JURIDICOS) {
    if (piso.condition(checklist, contexto, macroCoverage)) {
      const newLevel = maxRiskLevel(riskLevel, piso.minLevel);
      if (isMoreSevere(newLevel, riskLevel)) {
        consistencyNotes.push(
          `Piso jurídico "${piso.label}": nível elevado de "${riskLevel}" para "${newLevel}".`
        );
        riskLevel = newLevel;
        pisoAplicado = piso.id;
      }
    }
  }

  // 9. Ajustar riskScore para refletir o riskLevel final
  const levelMinScores: Record<RiskTextLevel, number> = {
    critico: 80,
    alto: 60,
    medio: 30,
    baixo: 10,
    muito_baixo: 0,
  };
  if (riskScore < levelMinScores[riskLevel]) {
    riskScore = levelMinScores[riskLevel];
  }

  // 10. Ordenar clusters por gapScore (pior primeiro)
  clusters.sort((a, b) => b.gapScore - a.gapScore);

  // 11. Calcular componentes G/E/A para explicabilidade
  const gapCount = checklist.filter((c) => c.status === "nao_atende" || c.status === "nao_identificado").length;
  const exposureFactors: string[] = [];
  if (contexto.B3_trata_dados_sensiveis) exposureFactors.push("Dados sensíveis");
  if (contexto.B4_trata_dados_sensiveis_em_larga_escala === "sim") exposureFactors.push("Larga escala");
  if (contexto.B6_trata_dados_criancas_0_12 || contexto.B7_trata_dados_adolescentes_13_17) exposureFactors.push("Menores");
  if (contexto.E4_ha_transferencia_internacional) exposureFactors.push("Transferência internacional");
  if (contexto.A8_setor_regulado?.length > 0) exposureFactors.push(`Setor regulado: ${contexto.A8_setor_regulado.join(", ")}`);
  
  const aggravatingFactors: string[] = [];
  if (pisoAplicado) aggravatingFactors.push(`Piso jurídico: ${pisoAplicado}`);
  if (badItemCount >= 3) aggravatingFactors.push(`${badItemCount} itens não conformes`);
  if (uncoveredBlocks.length > 0) aggravatingFactors.push(`${uncoveredBlocks.length} blocos sem cobertura`);

  return {
    riskScore,
    riskLevel,
    riskLevelDb: riskTextToDbEnum(riskLevel),
    clusters,
    pisoAplicado,
    consistencyNotes,
    macroCoverage,
    components: {
      G: `${gapCount} gaps`,
      E: exposureFactors.length > 0 ? exposureFactors.join("; ") : "Sem fatores de exposição",
      A: aggravatingFactors.length > 0 ? aggravatingFactors.join("; ") : "Sem agravantes",
    },
  };
}

/**
 * Gera plano de ação derivado dos clusters (1 ação por cluster).
 * Usa riskScale.ts para conversão de prioridade.
 */
export function generateClusterActionPlan(clusters: RiskCluster[]): Array<{
  clusterId: string;
  title: string;
  description: string;
  priority: string;
  recommendation: string;
  status: string;
}> {
  const recLabel: Record<string, string> = {
    capitulo_lgpd: "Capítulo LGPD",
    dpa: "DPA (Acordo de Processamento de Dados)",
    aditamento: "Aditamento Contratual",
  };

  return clusters.map((cluster) => ({
    clusterId: cluster.id,
    title: `Adequar: ${cluster.label}`,
    description: cluster.description,
    priority: riskToPriority(cluster.riskLevel),
    recommendation: recLabel[cluster.recommendation] || cluster.recommendation,
    status: "pendente",
  }));
}
