/**
 * riskScale.ts — Conversor Central de Escala de Risco
 * =====================================================
 * Seusdados Consultoria em Gestão de Dados Limitada
 * CNPJ 33.899.116/0001-63 | www.seusdados.com
 *
 * Source of truth para conversão entre:
 * - Texto descritivo: "critico" | "alto" | "medio" | "baixo" | "muito_baixo"
 * - Enum numérico do banco: "1" | "2" | "3" | "4" | "5"
 * - Prioridade do plano de ação: "critica" | "alta" | "media" | "baixa"
 *
 * REGRA: Toda conversão de escala de risco no sistema DEVE usar este módulo.
 */

// ── Tipos ──────────────────────────────────────────────────────────────

export type RiskTextLevel = "critico" | "alto" | "medio" | "baixo" | "muito_baixo";
export type RiskDbLevel = "1" | "2" | "3" | "4" | "5";
export type RiskPriority = "critica" | "alta" | "media" | "baixa";

// ── Tabelas de Conversão ──────────────────────────────────────────────

const TEXT_TO_DB: Record<RiskTextLevel, RiskDbLevel> = {
  critico: "1",
  alto: "2",
  medio: "3",
  baixo: "4",
  muito_baixo: "5",
};

const DB_TO_TEXT: Record<RiskDbLevel, RiskTextLevel> = {
  "1": "critico",
  "2": "alto",
  "3": "medio",
  "4": "baixo",
  "5": "muito_baixo",
};

const TEXT_TO_LABEL: Record<RiskTextLevel, string> = {
  critico: "Crítico",
  alto: "Alto",
  medio: "Médio",
  baixo: "Baixo",
  muito_baixo: "Muito Baixo",
};

const TEXT_TO_PRIORITY: Record<RiskTextLevel, RiskPriority> = {
  critico: "critica",
  alto: "alta",
  medio: "media",
  baixo: "baixa",
  muito_baixo: "baixa",
};

/**
 * Ordem numérica para comparação de severidade.
 * Menor número = mais severo.
 */
const SEVERITY_ORDER: Record<RiskTextLevel, number> = {
  critico: 1,
  alto: 2,
  medio: 3,
  baixo: 4,
  muito_baixo: 5,
};

// ── Normalização de Variações ─────────────────────────────────────────

const TEXT_ALIASES: Record<string, RiskTextLevel> = {
  // Padrão
  critico: "critico",
  alto: "alto",
  medio: "medio",
  baixo: "baixo",
  muito_baixo: "muito_baixo",
  // Variações com acento
  "crítico": "critico",
  "médio": "medio",
  moderado: "medio",
  // Variações com espaço/hífen
  "muito baixo": "muito_baixo",
  "muito-baixo": "muito_baixo",
  // Variações de outros módulos
  extrema: "critico",
  extremo: "critico",
  "muito critico": "critico",
  "muito_critico": "critico",
  // Inglês (legado)
  critical: "critico",
  high: "alto",
  medium: "medio",
  low: "baixo",
  "very_low": "muito_baixo",
  "very low": "muito_baixo",
};

// ── Funções Públicas ──────────────────────────────────────────────────

/**
 * Normaliza qualquer variação de texto para o formato padrão.
 * Aceita: "médio", "moderado", "Crítico", "ALTO", "muito_baixo", "medium", etc.
 * Retorna: "critico" | "alto" | "medio" | "baixo" | "muito_baixo"
 * Fallback: "medio" se não reconhecido.
 */
export function normalizeRiskText(raw: string | null | undefined): RiskTextLevel {
  if (!raw) return "medio";
  const lower = raw.toLowerCase().trim().replace(/\s+/g, " ");
  // Tentar lookup direto
  if (TEXT_ALIASES[lower]) return TEXT_ALIASES[lower];
  // Tentar sem acentos
  const noAccent = lower
    .replace(/[áàâã]/g, "a")
    .replace(/[éèê]/g, "e")
    .replace(/[íìî]/g, "i")
    .replace(/[óòôõ]/g, "o")
    .replace(/[úùû]/g, "u")
    .replace(/[ç]/g, "c");
  if (TEXT_ALIASES[noAccent]) return TEXT_ALIASES[noAccent];
  // Tentar com underscore
  const underscored = noAccent.replace(/ /g, "_");
  if (TEXT_ALIASES[underscored]) return TEXT_ALIASES[underscored];
  // Tentar numérico
  const dbResult = DB_TO_TEXT[lower as RiskDbLevel];
  if (dbResult) return dbResult;
  return "medio";
}

/**
 * Converte texto normalizado para enum numérico do banco.
 * "critico" → "1", "alto" → "2", etc.
 */
export function riskTextToDbEnum(text: RiskTextLevel | string): RiskDbLevel {
  const normalized = normalizeRiskText(text);
  return TEXT_TO_DB[normalized];
}

/**
 * Converte enum numérico do banco para texto normalizado.
 * "1" → "critico", "2" → "alto", etc.
 */
export function riskDbEnumToText(db: RiskDbLevel | string): RiskTextLevel {
  const str = String(db).trim();
  if (DB_TO_TEXT[str as RiskDbLevel]) return DB_TO_TEXT[str as RiskDbLevel];
  // Se já é texto, normalizar
  return normalizeRiskText(str);
}

/**
 * Retorna o label legível em português.
 * "critico" → "Crítico", "2" → "Alto", etc.
 */
export function riskLevelLabel(levelOrDb: string): string {
  // Tentar como DB enum primeiro
  const asDb = DB_TO_TEXT[levelOrDb as RiskDbLevel];
  if (asDb) return TEXT_TO_LABEL[asDb];
  // Tentar como texto
  const normalized = normalizeRiskText(levelOrDb);
  return TEXT_TO_LABEL[normalized];
}

/**
 * Converte nível de risco para prioridade do plano de ação.
 * "critico" → "critica", "alto" → "alta", etc.
 */
export function riskToPriority(levelOrDb: string): RiskPriority {
  const text = riskDbEnumToText(levelOrDb);
  return TEXT_TO_PRIORITY[text];
}

/**
 * Compara dois níveis de risco e retorna o mais severo.
 * Aceita tanto texto quanto enum numérico.
 */
export function maxRiskLevel(a: string, b: string): RiskTextLevel {
  const textA = normalizeRiskText(a);
  const textB = normalizeRiskText(b);
  return SEVERITY_ORDER[textA] <= SEVERITY_ORDER[textB] ? textA : textB;
}

/**
 * Verifica se nível A é mais severo que nível B.
 */
export function isMoreSevere(a: string, b: string): boolean {
  const textA = normalizeRiskText(a);
  const textB = normalizeRiskText(b);
  return SEVERITY_ORDER[textA] < SEVERITY_ORDER[textB];
}

/**
 * Verifica se nível A é pelo menos tão severo quanto nível B.
 */
export function isAtLeastAsSevere(a: string, b: string): boolean {
  const textA = normalizeRiskText(a);
  const textB = normalizeRiskText(b);
  return SEVERITY_ORDER[textA] <= SEVERITY_ORDER[textB];
}

/**
 * Retorna todos os níveis válidos em ordem de severidade (mais severo primeiro).
 */
export function allRiskLevels(): RiskTextLevel[] {
  return ["critico", "alto", "medio", "baixo", "muito_baixo"];
}

/**
 * Retorna todos os enums de banco válidos.
 */
export function allDbEnums(): RiskDbLevel[] {
  return ["1", "2", "3", "4", "5"];
}
