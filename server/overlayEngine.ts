/**
 * Motor de Overlays Setoriais v4
 *
 * Aplica overlays setoriais (~200) aos macro-blocos de cláusulas LGPD.
 * Cada overlay é um "acréscimo setorial" que só é aplicado se determinadas
 * condições do ContextoGlobal forem atendidas (setor, tipo contrato, risco, etc.).
 *
 * Overlays NÃO substituem a LGPD — apenas adicionam camada setorial
 * (ANS, MEC, BACEN, SUSEP, ANATEL, etc.).
 */

import { readFileSync } from "fs";
import { join } from "path";

// ── Tipos ──────────────────────────────────────────────────────────────

export interface OverlayMatch {
  [key: string]: string[];
}

export interface OverlayApplyTo {
  [macroBlock: string]: {
    append: string;
  };
}

export interface Overlay {
  id: string;
  descricao: string;
  match: OverlayMatch;
  apply_to_macros: OverlayApplyTo;
}

export interface OverlaysData {
  overlays: Overlay[];
  total: number;
}

export interface OverlayResult {
  appliedOverlayIds: string[];
  macroAppends: Record<string, string[]>;
  totalApplied: number;
}

export interface ContextoGlobalForOverlay {
  A1_tipo_contrato_juridico?: string;
  A2_natureza_relacao?: string;
  A8_setor_regulado?: string[];
  R1_nivel_risco_global_estimado?: string;
  B1_trata_dados_pessoais?: boolean;
  [key: string]: any;
}

// ── Carregamento ───────────────────────────────────────────────────────

let cachedOverlays: Overlay[] | null = null;

export function loadOverlays(): Overlay[] {
  if (cachedOverlays) return cachedOverlays;
  try {
    const filePath = join(__dirname, "lgpd_data", "overlays_v4.json");
    const raw = readFileSync(filePath, "utf-8");
    const data: OverlaysData = JSON.parse(raw);
    cachedOverlays = data.overlays || [];
    return cachedOverlays;
  } catch (e) {
    console.warn("[OverlayEngine] Falha ao carregar overlays_v4.json:", e);
    return [];
  }
}

// ── Matching ───────────────────────────────────────────────────────────

/**
 * Normaliza um valor do contexto para array de strings lowercase.
 * Ex: "prestacao_servico" → ["prestacao_servico"]
 *     ["saude_ANS", "financeiro_BACEN"] → ["saude_ans", "financeiro_bacen"]
 */
function normalizeToArray(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).toLowerCase().trim());
  return [String(value).toLowerCase().trim()];
}

/**
 * Mapeia chaves do ContextoGlobal para as chaves de match dos overlays.
 * Os overlays usam sufixo "_qualquer" nas chaves de match.
 */
function resolveContextValue(ctx: ContextoGlobalForOverlay, matchKey: string): string[] {
  // Remover sufixo "_qualquer" para buscar no contexto
  const baseKey = matchKey.replace(/_qualquer$/, "");

  // Mapeamento direto
  const directValue = ctx[baseKey];
  if (directValue !== undefined) return normalizeToArray(directValue);

  // Mapeamentos especiais
  const mappings: Record<string, string[]> = {
    A1_tipo_contrato_juridico: normalizeToArray(ctx.A1_tipo_contrato_juridico),
    A2_natureza_relacao: normalizeToArray(ctx.A2_natureza_relacao),
    A8_setor_regulado: normalizeToArray(ctx.A8_setor_regulado),
    R1_nivel_risco_global: normalizeToArray(ctx.R1_nivel_risco_global_estimado),
  };

  return mappings[baseKey] || [];
}

/**
 * Verifica se um overlay é aplicável ao contexto dado.
 * TODAS as condições do match devem ser satisfeitas (AND lógico).
 * Para cada condição, pelo menos um valor do contexto deve estar na lista (OR lógico).
 */
export function isOverlayApplicable(overlay: Overlay, ctx: ContextoGlobalForOverlay): boolean {
  // Se não trata dados pessoais, nenhum overlay se aplica
  if (ctx.B1_trata_dados_pessoais === false) return false;

  const matchEntries = Object.entries(overlay.match);
  if (matchEntries.length === 0) return false;

  for (const [matchKey, matchValues] of matchEntries) {
    const contextValues = resolveContextValue(ctx, matchKey);
    const normalizedMatchValues = matchValues.map((v) => v.toLowerCase().trim());

    // Pelo menos um valor do contexto deve estar na lista de match
    const hasMatch = contextValues.some((cv) => normalizedMatchValues.includes(cv));
    if (!hasMatch) return false;
  }

  return true;
}

// ── Aplicação ──────────────────────────────────────────────────────────

/**
 * Aplica todos os overlays aplicáveis ao contexto dado.
 * Retorna os IDs aplicados e os textos de append por macro-bloco.
 */
export function applyOverlays(ctx: ContextoGlobalForOverlay): OverlayResult {
  const overlays = loadOverlays();
  const appliedOverlayIds: string[] = [];
  const macroAppends: Record<string, string[]> = {};

  for (const overlay of overlays) {
    if (isOverlayApplicable(overlay, ctx)) {
      appliedOverlayIds.push(overlay.id);

      for (const [macroBlock, action] of Object.entries(overlay.apply_to_macros)) {
        if (action.append) {
          if (!macroAppends[macroBlock]) macroAppends[macroBlock] = [];
          macroAppends[macroBlock].push(action.append);
        }
      }
    }
  }

  return {
    appliedOverlayIds,
    macroAppends,
    totalApplied: appliedOverlayIds.length,
  };
}

/**
 * Aplica overlays a cláusulas já renderizadas.
 * Recebe as cláusulas geradas pelo motor v3 e concatena os appends setoriais.
 */
export function applyOverlaysToClauses(
  clauses: Array<{ clauseId: string; sequenceNumber: number; title: string; content: string; macroBlock?: string }>,
  ctx: ContextoGlobalForOverlay
): {
  clauses: Array<{ clauseId: string; sequenceNumber: number; title: string; content: string; macroBlock?: string }>;
  overlayResult: OverlayResult;
} {
  const overlayResult = applyOverlays(ctx);

  if (overlayResult.totalApplied === 0) {
    return { clauses, overlayResult };
  }

  const updatedClauses = clauses.map((clause) => {
    // Tentar identificar o macro-bloco da cláusula
    const macroBlock = clause.macroBlock || extractMacroBlockFromClauseId(clause.clauseId);
    if (!macroBlock) return clause;

    const appends = overlayResult.macroAppends[macroBlock];
    if (!appends || appends.length === 0) return clause;

    // Concatenar overlays ao conteúdo da cláusula
    const overlayText = appends.join("\n\n");
    return {
      ...clause,
      content: `${clause.content}\n\n--- Complemento Setorial ---\n\n${overlayText}`,
    };
  });

  return { clauses: updatedClauses, overlayResult };
}

/**
 * Extrai o número do macro-bloco a partir do clauseId.
 * Ex: "lgpd-06-1" → "06", "lgpd-17-3" → "17"
 */
function extractMacroBlockFromClauseId(clauseId: string): string | null {
  const match = clauseId.match(/lgpd-(\d+)/);
  if (match) {
    return match[1].padStart(2, "0");
  }
  return null;
}

// ── Utilitários ────────────────────────────────────────────────────────

/**
 * Lista todos os setores disponíveis nos overlays.
 */
export function getAvailableSectors(): string[] {
  const overlays = loadOverlays();
  const sectors = new Set<string>();
  for (const o of overlays) {
    const sectorValues = o.match?.A8_setor_regulado_qualquer || [];
    sectorValues.forEach((s) => sectors.add(s));
  }
  return Array.from(sectors).sort();
}

/**
 * Conta quantos overlays seriam aplicáveis para um dado contexto.
 */
export function countApplicableOverlays(ctx: ContextoGlobalForOverlay): number {
  const overlays = loadOverlays();
  return overlays.filter((o) => isOverlayApplicable(o, ctx)).length;
}
