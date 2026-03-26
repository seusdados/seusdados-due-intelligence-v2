/**
 * Chunking Rastreável para Análise de Contratos LGPD
 * ====================================================
 * Seusdados Consultoria em Gestão de Dados Limitada
 * CNPJ 33.899.116/0001-63 | seusdados.com
 *
 * Implementa o Termo 1 (Engenharia Cognitiva):
 * - Chunking rastreável com AuditableChunk
 * - buildSearchTrace para mapear evidências
 * - Redução inteligente com rastreabilidade
 */

import { createHash } from "crypto";
import type { AuditableChunk, SearchTrace, EvidencePack } from "../shared/contractAnalysisTypes";
import { LGPD_KEYWORDS, MAX_CONTRACT_TEXT_LENGTH } from "../shared/contractAnalysisTypes";

// ==================== CHUNKING RASTREÁVEL ====================

/**
 * Detecta a região do documento com base na posição relativa.
 */
function detectRegion(
  paragraphIndex: number,
  totalParagraphs: number
): AuditableChunk["region"] {
  const ratio = paragraphIndex / totalParagraphs;
  if (ratio < 0.10) return "cabecalho";
  if (ratio > 0.85) return "rodape";
  return "corpo";
}

/**
 * Gera hash SHA-256 de um texto.
 */
function hashText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16);
}

/**
 * Divide o contrato em chunks rastreáveis.
 * Cada chunk sabe sua posição original, palavras-chave e região.
 */
export function buildAuditableChunks(fullText: string): AuditableChunk[] {
  const text = (fullText || "").trim();
  if (!text) return [];

  // Quebra em parágrafos
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: AuditableChunk[] = [];
  let currentOffset = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const startOffset = text.indexOf(para, currentOffset);
    const endOffset = startOffset + para.length;
    currentOffset = endOffset;

    // Identificar palavras-chave encontradas
    const paraLower = para.toLowerCase();
    const matched = LGPD_KEYWORDS.filter((kw) => paraLower.includes(kw));

    chunks.push({
      chunkId: `CHK-${String(i + 1).padStart(4, "0")}`,
      text: para,
      startOffset: Math.max(0, startOffset),
      endOffset,
      paragraphIndex: i,
      matchedKeywords: matched,
      region: detectRegion(i, paragraphs.length),
      textHash: hashText(para),
    });
  }

  return chunks;
}

/**
 * Seleciona chunks relevantes para análise LGPD, respeitando o limite de caracteres.
 * Prioriza: cabeçalho + rodapé + corpo com palavras-chave.
 * Retorna os chunks selecionados E o texto montado para envio à IA.
 */
export function selectChunksForAnalysis(
  chunks: AuditableChunk[],
  maxChars: number = MAX_CONTRACT_TEXT_LENGTH
): { selectedChunks: AuditableChunk[]; assembledText: string } {
  if (chunks.length === 0) return { selectedChunks: [], assembledText: "" };

  // Calcular texto total
  const totalLength = chunks.reduce((sum, c) => sum + c.text.length, 0);
  if (totalLength <= maxChars) {
    // Cabe tudo: retornar todos os chunks
    const assembledText = chunks.map((c) => c.text).join("\n\n");
    return { selectedChunks: [...chunks], assembledText };
  }

  // Orçamento por região
  const HEAD_BUDGET = Math.min(18000, Math.floor(maxChars * 0.35));
  const TAIL_BUDGET = Math.min(18000, Math.floor(maxChars * 0.35));
  const MIDDLE_BUDGET = Math.max(0, maxChars - HEAD_BUDGET - TAIL_BUDGET - 2000);

  const selected: AuditableChunk[] = [];
  let usedHead = 0;
  let usedTail = 0;
  let usedMiddle = 0;

  // 1. Selecionar cabeçalho
  for (const chunk of chunks) {
    if (chunk.region !== "cabecalho") continue;
    if (usedHead + chunk.text.length > HEAD_BUDGET) break;
    selected.push(chunk);
    usedHead += chunk.text.length;
  }

  // 2. Selecionar rodapé (do final para o início)
  const tailChunks = chunks.filter((c) => c.region === "rodape").reverse();
  for (const chunk of tailChunks) {
    if (usedTail + chunk.text.length > TAIL_BUDGET) break;
    selected.push(chunk);
    usedTail += chunk.text.length;
  }

  // 3. Selecionar corpo com palavras-chave (priorizar mais keywords)
  const bodyChunks = chunks
    .filter((c) => c.region === "corpo" && !selected.includes(c))
    .sort((a, b) => b.matchedKeywords.length - a.matchedKeywords.length);

  for (const chunk of bodyChunks) {
    if (chunk.matchedKeywords.length === 0) continue;
    if (usedMiddle + chunk.text.length > MIDDLE_BUDGET) continue;
    selected.push(chunk);
    usedMiddle += chunk.text.length;
  }

  // Ordenar por posição original
  selected.sort((a, b) => a.paragraphIndex - b.paragraphIndex);

  // Montar texto com marcadores de rastreabilidade
  const parts: string[] = [];
  let lastRegion = "";

  for (const chunk of selected) {
    if (chunk.region !== lastRegion) {
      if (chunk.region === "cabecalho") {
        parts.push("### [INÍCIO DO CONTRATO — TRECHO PRESERVADO]");
      } else if (chunk.region === "corpo") {
        parts.push("\n### [TRECHOS SELECIONADOS POR RELEVÂNCIA LGPD]");
      } else if (chunk.region === "rodape") {
        parts.push("\n### [FIM DO CONTRATO — TRECHO PRESERVADO]");
      }
      lastRegion = chunk.region;
    }
    parts.push(`\n[${chunk.chunkId}]\n${chunk.text}`);
  }

  parts.push(
    "\n\n[NOTA: Texto reduzido automaticamente para análise. " +
    `${selected.length}/${chunks.length} trechos selecionados. ` +
    "Solicite auditoria manual do documento completo quando necessário.]"
  );

  return {
    selectedChunks: selected,
    assembledText: parts.join("\n"),
  };
}

// ==================== SEARCH TRACE ====================

/**
 * Constrói um SearchTrace a partir da resposta da IA.
 * Mapeia cada campo do resultado para o trecho do contrato que o sustenta.
 */
export function buildSearchTrace(
  fieldName: string,
  evidence: {
    excerpt: string | null;
    clauseRef?: string | null;
    confidence?: number | null;
    note?: string | null;
  } | null,
  chunks: AuditableChunk[]
): SearchTrace {
  if (!evidence || !evidence.excerpt) {
    return {
      fieldName,
      excerpt: "",
      clauseRef: null,
      sourceChunkId: null,
      confidence: 0,
      reasoning: "Não identificado no contrato",
      legalBasis: null,
    };
  }

  // Tentar localizar o chunk de origem pelo trecho
  let sourceChunkId: string | null = null;
  if (evidence.excerpt && chunks.length > 0) {
    const excerptLower = evidence.excerpt.toLowerCase().slice(0, 100);
    const match = chunks.find((c) =>
      c.text.toLowerCase().includes(excerptLower)
    );
    if (match) {
      sourceChunkId = match.chunkId;
    }
  }

  return {
    fieldName,
    excerpt: evidence.excerpt || "",
    clauseRef: evidence.clauseRef || null,
    sourceChunkId,
    confidence: evidence.confidence ?? 50,
    reasoning: evidence.note || null,
    legalBasis: null,
  };
}

/**
 * Constrói o EvidencePack completo a partir dos resultados da análise.
 */
export function buildEvidencePack(params: {
  analysisId: number;
  allChunks: AuditableChunk[];
  selectedChunks: AuditableChunk[];
  fieldEvidences: Record<string, {
    excerpt: string | null;
    clauseRef?: string | null;
    confidence?: number | null;
    note?: string | null;
  }>;
  originalLength: number;
  reducedLength: number;
}): EvidencePack {
  const traces: SearchTrace[] = [];

  for (const [fieldName, evidence] of Object.entries(params.fieldEvidences || {})) {
    traces.push(buildSearchTrace(fieldName, evidence, params.selectedChunks));
  }

  return {
    analysisId: params.analysisId,
    version: 1,
    generatedAt: new Date().toISOString(),
    chunks: params.selectedChunks,
    traces,
    documentMeta: {
      originalLength: params.originalLength,
      reducedLength: params.reducedLength,
      chunksTotal: params.allChunks.length,
      chunksSelected: params.selectedChunks.length,
      reductionRatio: params.originalLength > 0
        ? Math.round((params.reducedLength / params.originalLength) * 100) / 100
        : 1,
    },
  };
}
