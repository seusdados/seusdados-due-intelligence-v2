// contractAnalysisQueue.ts — Pipeline automático de 8 fases
//
// Fila em memória (single-node). Pipeline sequencial:
// EXTRACTION → ANALYSIS → MAPPING → RISKS → CLAUSES → ACTION_PLAN → REPORTS → COMPLETED
//
// Persistência por fase + idempotência:
// - Cada fase grava stage + stageProgress no banco
// - Se reiniciar, retoma da fase seguinte pendente
// - Nunca duplica action_plans (usa chave determinística)

import { logger } from "./_core/logger";
import * as db from "./db";
import * as contractAnalysisService from "./contractAnalysisService";
import { resolveDocumentForAnalysis } from "./contractAnalysisDocument";
import { sql } from "drizzle-orm";
import { gerarClausulasLGPD, normalizarContextoGlobal } from "./lgpd";
import { autoFillAnalysisMap } from "./contractMapAutoFill";
import { generateClausulaWithXai, generateAcaoPlanoWithXai, analyzeContractWithXai } from "./xai/xaiEngine";
import { storagePut } from "./storage";
import { assertOutputsOrThrow } from "./contractAnalysisOutputs";
import { buildAuditableChunks, buildSearchTrace, buildEvidencePack, selectChunksForAnalysis } from "./contractChunking";
import { validateAndFixAIOutput } from "./contractValidation";
import { CHECKLIST_REGISTRY, getLatestChecklist, resolveDecisionTree, getChecklistVersion } from "./contractChecklist";
import { CURRENT_CHECKLIST_VERSION } from "../shared/contractAnalysisTypes";
import type { AuditableChunk, SearchTrace } from "../shared/contractAnalysisTypes";
import { inferirRiscoV31, mapChecklistToMacroBlocks, generateClusterActionPlan } from "./riskModelV31";
import type { RiskModelResult, RiskCluster } from "./riskModelV31";
import { applyOverlaysToClauses } from "./overlayEngine";
import type { OverlayResult, ContextoGlobalForOverlay } from "./overlayEngine";

// ---- Tipos ----

type ErrorCode =
  | "DOCUMENT_URL_NOT_FOUND"
  | "EXTRACTION_FAILED"
  | "LLM_ERROR"
  | "PERSISTENCE_ERROR"
  | "ANALYSIS_TIMEOUT"
  | "ORPHANED_JOB"
  | "MAX_ATTEMPTS_EXCEEDED"
  | "CANCELED"
  | "UNKNOWN";

// Pipeline stages (ordem fixa)
const PIPELINE_STAGES = [
  "extraction",
  "analysis",
  "mapping",
  "risks",
  "clauses",
  "action_plan",
  "reports",
  "completed",
] as const;

type PipelineStage = (typeof PIPELINE_STAGES)[number] | "queued";

// Mapeamento stage → progresso global (0-100)
const STAGE_PROGRESS: Record<PipelineStage, number> = {
  queued: 0,
  extraction: 5,
  analysis: 15,
  mapping: 35,
  risks: 50,
  clauses: 60,
  action_plan: 75,
  reports: 85,
  completed: 100,
};

export interface AnalysisJob {
  id: string;
  analysisId: number;
  organizationId: number;
  documentId: number;
  contractName: string;
  organizationName: string;
  userId: number;
  createdAt: Date;
  status: "pending" | "processing" | "completed" | "failed" | "canceled";
  error?: string;
  abortController?: AbortController;
}

const analysisQueue: Map<string, AnalysisJob> = new Map();
let isProcessing = false;

const ANALYSIS_TIMEOUT_MS = Number(process.env.CONTRACT_ANALYSIS_TIMEOUT_MS || 10 * 60 * 1000);
const HEARTBEAT_INTERVAL_MS = Number(process.env.CONTRACT_ANALYSIS_HEARTBEAT_MS || 15 * 1000);
const ORPHAN_SWEEP_MS = Number(process.env.CONTRACT_ANALYSIS_ORPHAN_SWEEP_MS || 60 * 1000);
const MAX_JOB_AGE_MS = Number(process.env.CONTRACT_ANALYSIS_QUEUE_MAX_JOB_AGE_MS || 24 * 60 * 60 * 1000);

const RETRY_ENABLED = String(process.env.CONTRACT_ANALYSIS_RETRY_ENABLED || "true") === "true";
const RETRY_BASE_DELAY_MS = Number(process.env.CONTRACT_ANALYSIS_RETRY_BASE_DELAY_MS || 5000);
const RETRY_ON_TIMEOUT = String(process.env.CONTRACT_ANALYSIS_RETRY_ON_TIMEOUT || "false") === "true";

// ---- Helpers ----

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function asMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

class TimeoutError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "TimeoutError";
  }
}
class CancelError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "CancelError";
  }
}

function classifyError(err: unknown): { code: ErrorCode; message: string } {
  const message = asMsg(err);
  if (err instanceof TimeoutError) return { code: "ANALYSIS_TIMEOUT", message };
  if (err instanceof CancelError) return { code: "CANCELED", message };
  if (message.toLowerCase().includes("resolve") && message.toLowerCase().includes("url")) return { code: "DOCUMENT_URL_NOT_FOUND", message };
  if (message.toLowerCase().includes("document url")) return { code: "DOCUMENT_URL_NOT_FOUND", message };
  if (message.toLowerCase().includes("extra") && message.toLowerCase().includes("texto")) return { code: "EXTRACTION_FAILED", message };
  if (message.includes("OUTPUT_MISSING")) return { code: "PERSISTENCE_ERROR", message };
  if (message.toLowerCase().includes("llm") || message.toLowerCase().includes("json")) return { code: "LLM_ERROR", message };
  return { code: "UNKNOWN", message };
}

async function getDbConnOrNull(): Promise<any | null> {
  try {
    const conn = await db.getDb();
    return conn;
  } catch {}
  return null;
}

function rowsFromExecute(result: any): any[] {
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0];
  }
  if (Array.isArray(result)) return result;
  if (result?.rows && Array.isArray(result.rows)) return result.rows;
  if (result?.[0]?.rows && Array.isArray(result[0].rows)) return result[0].rows;
  return [];
}

// ==================== HARDENING: OUTPUT ASSERT + FALLBACK ====================
// Objetivo: impedir "pipeline completed" com abas vazias.
// Regras:
// - Cada fase crítica deve garantir persistência real antes de marcar 100%.
// - Se a IA não trouxer dados, geramos fallback mínimo (para não ficar vazio).

async function countOrZero(conn: any, query: any): Promise<number> {
  try {
    const res = await conn.execute(query);
    const rows = rowsFromExecute(res);
    const v = rows?.[0];
    const n = v ? Number(Object.values(v)[0] ?? 0) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

async function assertStageOutputsOrThrow(conn: any, analysisId: number, stage: string, opts?: { requireReportUrl?: boolean }) {
  const requireReportUrl = opts?.requireReportUrl ?? (String(process.env.CONTRACT_ANALYSIS_REPORT_REQUIRED || "false") === "true");

  // tabela/mapa
  const maps = await countOrZero(conn, sql`SELECT COUNT(*) as cnt FROM contract_analysis_maps WHERE "analysisId" = ${analysisId}`);
  // checklist / riscos
  const checklist = await countOrZero(conn, sql`SELECT COUNT(*) as cnt FROM contract_checklist_items WHERE "analysisId" = ${analysisId}`);
  const risks = await countOrZero(conn, sql`SELECT COUNT(*) as cnt FROM contract_risk_items WHERE "analysisId" = ${analysisId}`);
  // clausulas
  const clauses = await countOrZero(conn, sql`SELECT COUNT(*) as cnt FROM contract_analysis_clauses WHERE "analysisId" = ${analysisId}`);

  // action plans (somente se houver riscos relevantes)
  const actionPlans = await countOrZero(conn, sql`SELECT COUNT(*) as cnt FROM action_plans WHERE "assessmentType"='contract_analysis' AND "assessmentId" = ${analysisId}`);

  // reportUrl (se exigido)
  let reportOk = true;
  if (requireReportUrl) {
    const r = await conn.execute(sql`SELECT "reportUrl" FROM contract_analyses WHERE id = ${analysisId} LIMIT 1`);
    const rows = rowsFromExecute(r);
    const reportUrl = rows?.[0]?.reportUrl ?? null;
    reportOk = !!reportUrl;
  }

  // regras por stage (mínimo)
  if (stage === "mapping" && maps <= 0) throw new Error("OUTPUT_MISSING:MAPPING");
  if (stage === "risks" && (checklist <= 0 || risks <= 0)) throw new Error("OUTPUT_MISSING:RISKS");
  if (stage === "clauses" && clauses <= 0) throw new Error("OUTPUT_MISSING:CLAUSES");
  // action_plan pode ser 0 se realmente não houver riscos, mas se há riscos e não há ações, é bug
  if (stage === "action_plan" && risks > 0 && actionPlans <= 0) throw new Error("OUTPUT_MISSING:ACTION_PLAN");
  if (stage === "reports" && requireReportUrl && !reportOk) throw new Error("OUTPUT_MISSING:REPORT_URL");
  if (stage === "completed") {
    // completed exige o pacote mínimo existir (sem abas vazias)
    if (maps <= 0) throw new Error("OUTPUT_MISSING:MAPPING");
    if (checklist <= 0) throw new Error("OUTPUT_MISSING:CHECKLIST");
    if (risks <= 0) throw new Error("OUTPUT_MISSING:RISKS");
    if (clauses <= 0) throw new Error("OUTPUT_MISSING:CLAUSES");
    if (risks > 0 && actionPlans <= 0) throw new Error("OUTPUT_MISSING:ACTION_PLAN");
    if (requireReportUrl && !reportOk) throw new Error("OUTPUT_MISSING:REPORT_URL");
  }
}

function fallbackAnalysisMap(contractName: string) {
  return {
    partnerName: null,
    contractType: "indefinido",
    contractingParty: null,
    contractedParty: null,
    lgpdAgentType: null,
    agentTypeJustification: "Não foi possível inferir com confiança a partir do documento fornecido.",
    contractObject: contractName || "Contrato analisado",
    startDate: null,
    endDate: null,
    commonData: null,
    commonDataLargeScale: 0,
    sensitiveData: null,
    sensitiveDataLargeScale: 0,
    hasElderlyData: 0,
    elderlyDataDetails: null,
    hasMinorData: 0,
    minorDataDetails: null,
    titularRightsStatus: null,
    titularRightsDetails: null,
    dataEliminationStatus: null,
    dataEliminationDetails: null,
    legalRisks: "Documento insuficiente para confirmar cláusulas LGPD essenciais.",
    securityRisks: "Documento insuficiente para confirmar medidas de segurança.",
    hasProtectionClause: "nao",
    protectionClauseDetails: "Não identificado no documento fornecido.",
    suggestedClause: "Recomenda-se incluir DPA/Cláusulas de proteção de dados conforme LGPD.",
    actionStatus: "ajustar",
    actionPlan: "Solicitar DPA/Aditivo LGPD, cláusulas de segurança, incidente, retenção, direitos do titular.",
    suggestedDeadline: "30 dias",
  };
}

function fallbackChecklist() {
  const qs = [
    "O contrato define claramente a finalidade do tratamento de dados?",
    "As bases legais para o tratamento estão especificadas?",
    "Há cláusula de responsabilidade de cada parte quanto ao tratamento?",
    "O contrato prevê regras para compartilhamento de dados?",
    "Existe cláusula de segurança da informação (medidas técnicas e administrativas)?",
    "Há previsão sobre prazo de retenção e eliminação dos dados?",
    "O contrato contempla direitos dos titulares de dados (acesso, retificação, exclusão)?",
    "Existe cláusula de notificação em caso de incidente de segurança?",
    "Há previsão de auditoria ou fiscalização do cumprimento da LGPD?",
    "O contrato estabelece foro e legislação aplicável considerando a LGPD?",
  ];
  return qs.map((q: string, idx: number) => ({
    itemNumber: idx + 1,
    question: q,
    status: "nao",
    observations: "Não identificado com clareza no documento fornecido.",
    contractExcerpt: null,
  }));
}

function fallbackRisks() {
  return [
    {
      contractArea: "Geral",
      analysisBlock: 1,
      riskDescription: "Documento insuficiente/sem cláusulas essenciais de proteção de dados (DPA, segurança, incidentes, direitos do titular).",
      riskLevel: "1",
      potentialImpact: "Risco elevado de não conformidade LGPD e exposição a sanções/indenizações.",
      requiredAction: "Solicitar DPA ou aditivo LGPD com cláusulas de segurança, incidente (48h), retenção, direitos do titular e auditoria.",
      suggestedDeadline: "30 dias",
      legalReference: "LGPD arts. 6, 37-42; ANPD boas práticas; ISO 27001/27002.",
    }
  ];
}

function fallbackClauses() {
  return [
    {
      clauseId: "fallback-lgpd-1",
      sequenceNumber: 1,
      title: "Cláusula de Proteção de Dados (DPA obrigatório)",
      content:
        "As Partes concordam em cumprir a LGPD. O Operador tratará dados pessoais apenas conforme instruções do Controlador, adotará medidas de segurança (ISO 27001/27002), notificará incidentes em até 48h da ciência, garantirá subcontratação com flow-down e suportará direitos dos titulares. Retenção e eliminação conforme instruções do Controlador.",
    }
  ];
}


function isAlreadyQueued(analysisId: number): boolean {
  for (const j of Array.from(analysisQueue.values())) {
    if (j.analysisId === analysisId && (j.status === "pending" || j.status === "processing")) return true;
  }
  return false;
}

async function tryNotifyEmail(params: { analysisId: number; userId: number; status: string; errorMessage?: string | null }) {
  try {
    const mod: any = await import("./contractAnalysisEmailService");
    const fn = mod.sendAnalysisNotificationEmail || mod.notifyAnalysisCompletion || mod.sendContractAnalysisEmail || mod.sendEmail;
    if (typeof fn !== "function") return;
    try {
      if (fn.length >= 4) { await fn(params.analysisId, params.userId, params.status, params.errorMessage || undefined); return; }
      if (fn.length === 3) { await fn(params.analysisId, params.userId, params.status); return; }
      await fn(params);
    } catch (e) {
      logger.warn("[AnalysisQueue] Falha ao enviar email", { analysisId: params.analysisId, message: asMsg(e) });
    }
  } catch { /* serviço não existe */ }
}

// ---- Stage persistence helpers ----

async function updateStage(analysisId: number, stage: PipelineStage, stageProgress: number = 0) {
  const progress = STAGE_PROGRESS[stage] + Math.round(stageProgress * (
    stage === "completed" ? 0 :
    (STAGE_PROGRESS[PIPELINE_STAGES[PIPELINE_STAGES.indexOf(stage as any) + 1] || "completed"] - STAGE_PROGRESS[stage]) / 100
  ));

  await db.updateContractAnalysis(analysisId, {
    stage: stage as any,
    stageProgress,
    progress: Math.min(progress, 100),
    contractAnalysisStatus: stage === "completed" ? "completed" as any : "analyzing" as any,
    lastHeartbeatAt: nowIso(),
  } as any);

  logger.info(`[Pipeline] ${stage} (${stageProgress}%) → progress ${progress}%`, { analysisId });
}

function getNextStage(currentStage: string): PipelineStage | null {
  const idx = PIPELINE_STAGES.indexOf(currentStage as any);
  if (idx < 0 || idx >= PIPELINE_STAGES.length - 1) return null;
  return PIPELINE_STAGES[idx + 1];
}

function getResumeStage(savedStage: string): PipelineStage {
  // Se a análise já estava em uma fase, retoma dela (não repete fases concluídas)
  const idx = PIPELINE_STAGES.indexOf(savedStage as any);
  if (idx >= 0) return PIPELINE_STAGES[idx];
  return "extraction"; // default: começa do início
}

// ---- Queue API ----

export async function enqueueAnalysis(job: Omit<AnalysisJob, "id" | "createdAt" | "status">): Promise<string> {
  const jobId = `analysis-${job.analysisId}-${Date.now()}`;
  const fullJob: AnalysisJob = {
    ...job,
    id: jobId,
    createdAt: new Date(),
    status: "pending",
    abortController: new AbortController(),
  };

  analysisQueue.set(jobId, fullJob);
  logger.info("[AnalysisQueue] Enfileirado", { jobId, analysisId: job.analysisId });

  if (!isProcessing) {
    void processQueue();
  }

  return jobId;
}

export async function cancelAnalysis(analysisId: number): Promise<void> {
  for (const [jobId, job] of Array.from(analysisQueue.entries())) {
    if (job.analysisId === analysisId && (job.status === "pending" || job.status === "processing")) {
      job.status = "canceled";
      job.abortController?.abort();
      analysisQueue.set(jobId, job);
      logger.info("[AnalysisQueue] Cancelamento best-effort", { analysisId, jobId });
    }
  }
}

export function getQueueStats() {
  const jobs = Array.from(analysisQueue.values());
  return {
    total: jobs.length,
    pending: jobs.filter((j) => j.status === "pending").length,
    processing: jobs.filter((j) => j.status === "processing").length,
    completed: jobs.filter((j) => j.status === "completed").length,
    failed: jobs.filter((j) => j.status === "failed").length,
    canceled: jobs.filter((j) => j.status === "canceled").length,
    isProcessing,
  };
}

export function cleanupOldJobs(maxAgeMs: number = MAX_JOB_AGE_MS): number {
  const now = Date.now();
  let removed = 0;
  for (const [jobId, job] of Array.from(analysisQueue.entries())) {
    if (now - job.createdAt.getTime() > maxAgeMs) {
      analysisQueue.delete(jobId);
      removed++;
    }
  }
  if (removed > 0) logger.info("[AnalysisQueue] Limpeza jobs antigos", { removed });
  return removed;
}

setInterval(() => cleanupOldJobs(), 60 * 60 * 1000);

// ---- Process Queue ----

async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    while (analysisQueue.size > 0) {
      let nextJob: AnalysisJob | null = null;
      let nextJobId: string | null = null;

      for (const [jobId, job] of Array.from(analysisQueue.entries())) {
        if (job.status === "pending") {
          nextJob = job;
          nextJobId = jobId;
          break;
        }
      }

      if (!nextJob || !nextJobId) break;

      try {
        nextJob.status = "processing";
        analysisQueue.set(nextJobId, nextJob);

        const analysis = await db.getContractAnalysisById(nextJob.analysisId);
        if (!analysis) throw new Error("Análise não encontrada no banco.");

        const status = String((analysis as any).contractAnalysisStatus);
        if (["completed", "error", "canceled"].includes(status)) {
          logger.info("[AnalysisQueue] Skip (já finalizado)", { analysisId: nextJob.analysisId, status });
          nextJob.status = "completed";
          analysisQueue.set(nextJobId, nextJob);
          continue;
        }

        const attempts = Number((analysis as any).attempts ?? 0);
        const maxAttempts = Number((analysis as any).maxAttempts ?? 3);
        if (attempts >= maxAttempts) throw new Error(`Tentativas esgotadas (${attempts}/${maxAttempts}).`);

        // Marca início real
        await db.updateContractAnalysis(nextJob.analysisId, {
          contractAnalysisStatus: "analyzing" as any,
          progress: 5,
          stage: "extraction" as any,
          stageProgress: 0,
          startedAt: (analysis as any).startedAt || nowIso(),
          lastHeartbeatAt: nowIso(),
          attempts: attempts + 1,
          maxAttempts: maxAttempts || 3,
          errorCode: null as any,
          errorMessage: null as any,
          finishedAt: null as any,
        } as any);

        await db.createContractAnalysisHistoryEntry({
          analysisId: nextJob.analysisId,
          historyActionType: "analysis_started",
          description: `Pipeline iniciado (tentativa ${attempts + 1}/${maxAttempts || 3})`,
          userId: nextJob.userId,
        });

        // heartbeat timer
        const hb = setInterval(() => {
          void db.updateContractAnalysis(nextJob!.analysisId, { lastHeartbeatAt: nowIso() } as any).catch(() => void 0);
        }, HEARTBEAT_INTERVAL_MS);

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new TimeoutError("Pipeline excedeu o tempo limite (10 min)")), ANALYSIS_TIMEOUT_MS);
        });

        try {
          // Determinar fase de retomada (idempotência)
          const savedStage = String((analysis as any).stage || "queued");
          const resumeStage = savedStage === "queued" ? "extraction" : getResumeStage(savedStage);

          await Promise.race([executePipeline(nextJob, resumeStage), timeoutPromise]);
        } finally {
          clearInterval(hb);
        }

        nextJob.status = "completed";
        analysisQueue.set(nextJobId, nextJob);
        logger.info("[AnalysisQueue] Pipeline concluído", { analysisId: nextJob.analysisId });

      } catch (error) {
        const { code, message } = classifyError(error);
        nextJob.status = code === "CANCELED" ? "canceled" : "failed";
        nextJob.error = message;
        analysisQueue.set(nextJobId, nextJob);

        try {
          const analysis = await db.getContractAnalysisById(nextJob.analysisId);
          const attempts = Number((analysis as any)?.attempts ?? 0);
          const maxAttempts = Number((analysis as any)?.maxAttempts ?? 3);

          const isTimeout = code === "ANALYSIS_TIMEOUT";
          const isCanceled = code === "CANCELED";

          const canRetry = RETRY_ENABLED && !isCanceled && (!isTimeout || RETRY_ON_TIMEOUT) && attempts < maxAttempts;

          if (canRetry) {
            const delay = RETRY_BASE_DELAY_MS * Math.max(1, attempts);
            await db.updateContractAnalysis(nextJob.analysisId, {
              contractAnalysisStatus: "queued" as any,
              progress: 0,
              stage: "queued" as any,
              stageProgress: 0,
              errorCode: code as any,
              errorMessage: message,
              lastHeartbeatAt: nowIso(),
            } as any);

            await db.createContractAnalysisHistoryEntry({
              analysisId: nextJob.analysisId,
              historyActionType: "analysis_error",
              description: `Erro (retry em ${Math.round(delay / 1000)}s): ${message}`,
              userId: nextJob.userId,
            });

            setTimeout(() => {
              if (!isAlreadyQueued(nextJob!.analysisId)) {
                void enqueueAnalysis({
                  analysisId: nextJob!.analysisId,
                  organizationId: nextJob!.organizationId,
                  documentId: nextJob!.documentId,
                  contractName: nextJob!.contractName,
                  organizationName: nextJob!.organizationName,
                  userId: nextJob!.userId,
                });
              }
            }, delay);

          } else {
            if (isCanceled) {
              await db.updateContractAnalysis(nextJob.analysisId, {
                contractAnalysisStatus: "canceled" as any,
                progress: 0,
                stage: "queued" as any,
                errorCode: "CANCELED" as any,
                errorMessage: "Análise cancelada pelo usuário.",
                finishedAt: nowIso(),
                lastHeartbeatAt: nowIso(),
              } as any);
              await tryNotifyEmail({ analysisId: nextJob.analysisId, userId: nextJob.userId, status: "canceled" });
            } else {
              const finalCode: ErrorCode = (code === "UNKNOWN" && attempts >= maxAttempts) ? "MAX_ATTEMPTS_EXCEEDED" : code;
              await db.updateContractAnalysis(nextJob.analysisId, {
                contractAnalysisStatus: "error" as any,
                progress: 0,
                stage: "queued" as any,
                errorCode: finalCode as any,
                errorMessage: message,
                finishedAt: nowIso(),
                lastHeartbeatAt: nowIso(),
              } as any);
              await tryNotifyEmail({ analysisId: nextJob.analysisId, userId: nextJob.userId, status: "error", errorMessage: message });
            }

            await db.createContractAnalysisHistoryEntry({
              analysisId: nextJob.analysisId,
              historyActionType: "analysis_error",
              description: `Erro: ${message}`,
              userId: nextJob.userId,
            });
          }
        } catch (dbError) {
          logger.error("[AnalysisQueue] Falha ao gravar erro no banco", { analysisId: nextJob.analysisId, message: asMsg(dbError) });
        }
      }

      await sleep(50);
    }
  } finally {
    isProcessing = false;
    const hasPending = Array.from(analysisQueue.values()).some((j) => j.status === "pending");
    if (hasPending) setTimeout(() => void processQueue(), 300);
  }
}

// ==================== PIPELINE DE 8 FASES ====================

interface PipelineContext {
  analysisId: number;
  job: AnalysisJob;
  extractedText: string;
  analysisResult: any;
  mapData: any;
  xaiAlerts: any[];
  /** Chunks rastreáveis do documento (Termo 1) */
  auditableChunks: AuditableChunk[];
  /** Rastros de busca (Termo 1) */
  searchTraces: SearchTrace[];
  /** Versão do checklist usado (Termo 2) */
  checklistVersion: string;
  /** Caminho da árvore de decisão (Termo 2) */
  decisionTreePath: string[];
  /** Resultado do modelo de risco v3.1 (clusters + pisos) */
  riskModelResult: RiskModelResult | null;
  /** IDs dos overlays v4 aplicados */
  appliedOverlayIds: string[];
}

async function executePipeline(job: AnalysisJob, startFrom: PipelineStage): Promise<void> {
  const ctx: PipelineContext = {
    analysisId: job.analysisId,
    job,
    extractedText: "",
    analysisResult: null,
    mapData: null,
    xaiAlerts: [],
    auditableChunks: [],
    searchTraces: [],
    checklistVersion: CURRENT_CHECKLIST_VERSION,
    decisionTreePath: [],
    riskModelResult: null,
    appliedOverlayIds: [],
  };

  const startIdx = PIPELINE_STAGES.indexOf(startFrom as (typeof PIPELINE_STAGES)[number]);
  logger.info(`[Pipeline] Iniciando da fase: ${startFrom} (idx ${startIdx})`, { analysisId: job.analysisId });

  // Se retomando de fase posterior, carregar dados das fases anteriores do banco
  if (startIdx > 0) {
    await loadPreviousPhaseData(ctx);
  }

  for (let i = startIdx; i < PIPELINE_STAGES.length; i++) {
    const stage = PIPELINE_STAGES[i];
    if (job.status === "canceled") throw new CancelError("Cancelado em memória.");

    logger.info(`[Pipeline] === FASE: ${stage} ===`, { analysisId: job.analysisId });

    switch (stage) {
      case "extraction":
        await phaseExtraction(ctx);
        break;
      case "analysis":
        await phaseAnalysis(ctx);
        break;
      case "mapping":
        await phaseMapping(ctx);
        break;
      case "risks":
        await phaseRisks(ctx);
        break;
      case "clauses":
        await phaseClauses(ctx);
        break;
      case "action_plan":
        await phaseActionPlan(ctx);
        break;
      case "reports":
        await phaseReports(ctx);
        break;
      case "completed":
        await phaseCompleted(ctx);
        break;
    }
  }
}

async function loadPreviousPhaseData(ctx: PipelineContext): Promise<void> {
  logger.info("[Pipeline] Carregando dados de fases anteriores para retomada", { analysisId: ctx.analysisId });

  const analysis = await db.getContractAnalysisById(ctx.analysisId);
  if (analysis) {
    ctx.extractedText = (analysis as any).extractedText || "";
    ctx.analysisResult = (analysis as any).aiResponse || null;
  }

  // Carregar mapa se existir
  const conn = await getDbConnOrNull();
  if (conn) {
    try {
      const mapRes = await conn.execute(sql`SELECT * FROM contract_analysis_maps WHERE "analysisId" = ${ctx.analysisId} LIMIT 1`);
      const mapRows = rowsFromExecute(mapRes);
      if (mapRows.length > 0) ctx.mapData = mapRows[0];
    } catch { /* tabela pode não ter dados */ }
  }
}

// ---- FASE 1: EXTRACTION ----

async function phaseExtraction(ctx: PipelineContext): Promise<void> {
  await updateStage(ctx.analysisId, "extraction", 0);

  const doc = await resolveDocumentForAnalysis(ctx.job.documentId);
  if (!doc?.fileUrl) throw new Error("Document URL not found (não foi possível resolver URL do documento).");

  await updateStage(ctx.analysisId, "extraction", 30);

  try {
    ctx.extractedText = await contractAnalysisService.extractTextFromDocument(
      doc.fileUrl,
      doc.mimeType || "application/pdf"
    );

    await db.updateContractAnalysis(ctx.analysisId, {
      extractedText: ctx.extractedText,
      lastHeartbeatAt: nowIso(),
    } as any);
  } catch (e) {
    logger.warn("[Pipeline:extraction] Extração falhou; seguindo com file_url", { analysisId: ctx.analysisId, message: asMsg(e) });
    ctx.extractedText = "";
  }

  // Criar chunks rastreáveis (Termo 1 - Engenharia Cognitiva)
  if (ctx.extractedText.length > 0) {
    try {
      ctx.auditableChunks = buildAuditableChunks(ctx.extractedText);
      logger.info("[Pipeline:extraction] Chunks rastreáveis criados", {
        analysisId: ctx.analysisId,
        totalChunks: ctx.auditableChunks.length,
        relevantChunks: ctx.auditableChunks.filter(c => c.matchedKeywords.length > 0).length,
      });
    } catch (e) {
      logger.warn("[Pipeline:extraction] Falha ao criar chunks rastreáveis", { message: asMsg(e) });
    }
  }

  await updateStage(ctx.analysisId, "extraction", 100);
  logger.info("[Pipeline:extraction] Concluída", { analysisId: ctx.analysisId, textLen: ctx.extractedText.length, chunks: ctx.auditableChunks.length });
}

// ---- FASE 2: ANALYSIS ----

async function phaseAnalysis(ctx: PipelineContext): Promise<void> {
  await updateStage(ctx.analysisId, "analysis", 0);

  const doc = await resolveDocumentForAnalysis(ctx.job.documentId);

  const rawResult = await contractAnalysisService.analyzeContract({
    contractText: ctx.extractedText ? ctx.extractedText.slice(0, 20000) : undefined,
    contractName: ctx.job.contractName,
    organizationName: ctx.job.organizationName || "Cliente",
    contractFile: doc ? { url: doc.fileUrl, mimeType: doc.mimeType } : undefined,
  } as any);

  await updateStage(ctx.analysisId, "analysis", 40);

  // Termo 1: Validação pós-IA (nenhum campo obrigatório em branco)
  let validationLog: any = null;
  try {
    const validation = validateAndFixAIOutput(rawResult);
    ctx.analysisResult = validation.output;
    validationLog = {
      isValid: validation.isValid,
      autoFixCount: validation.autoFixCount,
      issues: validation.issues.map(i => ({ field: i.field, severity: i.severity, message: i.message, autoFixed: i.autoFixed })),
    };
    if (validation.autoFixCount > 0) {
      logger.info("[Pipeline:analysis] Validação pós-IA corrigiu campos", { analysisId: ctx.analysisId, fixes: validation.autoFixCount });
    }
  } catch (e) {
    logger.warn("[Pipeline:analysis] Falha na validação pós-IA, usando resultado bruto", { message: asMsg(e) });
    ctx.analysisResult = rawResult;
  }

  await updateStage(ctx.analysisId, "analysis", 60);

  // Termo 2: Resolver árvore de decisão para determinar checklist aplicável
  try {
    const map = ctx.analysisResult?.analysisMap;
    const decisionResult = resolveDecisionTree({
      hasSensitiveData: !!(map?.sensitiveData),
      hasMinorData: !!(map?.hasMinorData),
      hasElderlyData: !!(map?.hasElderlyData),
      hasInternationalTransfer: false,
      isLargeScale: !!(map?.commonDataLargeScale || map?.sensitiveDataLargeScale),
      agentType: map?.agentType || null,
    });
    ctx.decisionTreePath = decisionResult.path;
    ctx.analysisResult.decisionTreePath = decisionResult.path;
    ctx.analysisResult.checklistVersion = ctx.checklistVersion;
    logger.info("[Pipeline:analysis] Árvore de decisão resolvida", {
      analysisId: ctx.analysisId,
      path: decisionResult.path,
      classification: decisionResult.classification,
    });
  } catch (e) {
    logger.warn("[Pipeline:analysis] Falha ao resolver árvore de decisão", { message: asMsg(e) });
  }

  await updateStage(ctx.analysisId, "analysis", 80);

  // Termo 1: Construir rastros de busca (SearchTrace) via EvidencePack
  try {
    if (ctx.auditableChunks.length > 0 && ctx.analysisResult) {
      // Extrair evidências dos campos da análise para gerar traces
      const fieldEvidences: Record<string, { excerpt: string | null; clauseRef?: string | null; confidence?: number | null; note?: string | null }> = {};
      const result = ctx.analysisResult as any;
      if (result.blocos) {
        for (const bloco of result.blocos) {
          const key = bloco.titulo || bloco.bloco || `bloco_${bloco.numero || 'unknown'}`;
          fieldEvidences[key] = {
            excerpt: bloco.trecho_contrato || bloco.excerpt || null,
            clauseRef: bloco.clausula_ref || null,
            confidence: bloco.confianca || null,
            note: bloco.observacao || null,
          };
        }
      }
      const { selectedChunks, assembledText } = selectChunksForAnalysis(ctx.auditableChunks);
      const evidencePack = buildEvidencePack({
        analysisId: ctx.analysisId,
        allChunks: ctx.auditableChunks,
        selectedChunks,
        fieldEvidences,
        originalLength: ctx.extractedText.length,
        reducedLength: assembledText.length,
      });
      ctx.searchTraces = evidencePack.traces;
      logger.info("[Pipeline:analysis] Rastros de busca constru\u00eddos via EvidencePack", {
        analysisId: ctx.analysisId,
        totalTraces: ctx.searchTraces.length,
        chunksUsed: evidencePack.documentMeta.chunksSelected,
        reductionRatio: evidencePack.documentMeta.reductionRatio,
      });
    }
  } catch (e) {
    logger.warn("[Pipeline:analysis] Falha ao construir rastros de busca", { message: asMsg(e) });
  }

  // Salvar resultado validado da IA + metadados de governança
  await db.updateContractAnalysis(ctx.analysisId, {
    aiResponse: ctx.analysisResult as any,
    aiModel: process.env.CONTRACT_ANALYSIS_MODEL || "gemini-2.5-flash",
    executiveSummary: ctx.analysisResult?.executiveSummary || null,
    complianceScore: ctx.analysisResult?.complianceScore || null,
    criticalRisks: ctx.analysisResult?.criticalRisks || 0,
    highRisks: ctx.analysisResult?.highRisks || 0,
    mediumRisks: ctx.analysisResult?.mediumRisks || 0,
    lowRisks: ctx.analysisResult?.lowRisks || 0,
    veryLowRisks: ctx.analysisResult?.veryLowRisks || 0,
    lastHeartbeatAt: nowIso(),
  } as any);

  // Persistir metadados de governança algorítmica
  const conn = await getDbConnOrNull();
  if (conn) {
    try {
      const governanceMetadata = JSON.stringify({
        checklistVersion: ctx.checklistVersion,
        decisionTreePath: ctx.decisionTreePath,
        validationLog,
        searchTracesCount: ctx.searchTraces.length,
        auditableChunksCount: ctx.auditableChunks.length,
        timestamp: nowIso(),
      });
      await conn.execute(sql`
        UPDATE contract_analyses
        SET "governanceMetadata" = ${governanceMetadata},
            "lastHeartbeatAt" = ${nowIso()}
        WHERE id = ${ctx.analysisId}
      `);
    } catch (e) {
      logger.warn("[Pipeline:analysis] Falha ao salvar metadados de governança", { message: asMsg(e) });
    }
  }

  await updateStage(ctx.analysisId, "analysis", 100);
  logger.info("[Pipeline:analysis] Concluída", {
    analysisId: ctx.analysisId,
    score: ctx.analysisResult?.complianceScore,
    checklistVersion: ctx.checklistVersion,
    decisionPath: ctx.decisionTreePath.length,
    searchTraces: ctx.searchTraces.length,
  });
}

// ---- FASE 3: MAPPING ----

async function phaseMapping(ctx: PipelineContext): Promise<void> {
  await updateStage(ctx.analysisId, "mapping", 0);

  const result = ctx.analysisResult;
  if (!result?.analysisMap) {
    logger.warn("[Pipeline:mapping] Sem dados de mapeamento da IA — aplicando fallback", { analysisId: ctx.analysisId });
    result.analysisMap = fallbackAnalysisMap(ctx.job.contractName);
  }

  // Aplicar autopreenchimento obrigatório
  const autoFilled = autoFillAnalysisMap({
    contractText: ctx.extractedText || ctx.contractText,
    contractType: result.analysisMap?.contractType,
    partnerName: result.analysisMap?.partnerName,
    contractName: ctx.job.contractName,
    analysisMap: result.analysisMap
  });

  // Mesclar com dados da IA, mas garantir que campos obrigatórios nunca são null
  result.analysisMap = {
    ...result.analysisMap,
    lgpdAgentType: result.analysisMap?.lgpdAgentType || autoFilled.lgpdAgentType,
    agentTypeJustification: result.analysisMap?.agentTypeJustification || autoFilled.agentTypeJustification,
    startDate: result.analysisMap?.startDate || autoFilled.startDate,
    endDate: result.analysisMap?.endDate || autoFilled.endDate,
    commonData: result.analysisMap?.commonData || autoFilled.commonData,
    sensitiveData: result.analysisMap?.sensitiveData || autoFilled.sensitiveData,
  };

  logger.info("[Pipeline:mapping] Autopreenchimento aplicado", {
    analysisId: ctx.analysisId,
    lgpdAgentType: result.analysisMap.lgpdAgentType,
    startDate: result.analysisMap.startDate,
    endDate: result.analysisMap.endDate
  });


  // Limpar artefatos anteriores (idempotência)
  const conn = await getDbConnOrNull();
  if (conn) {
    try { await conn.execute(sql`DELETE FROM contract_analysis_maps WHERE "analysisId" = ${ctx.analysisId}`); } catch {}
    try { await conn.execute(sql`DELETE FROM contract_mapeamento_links WHERE "contractAnalysisId" = ${ctx.analysisId}`); } catch {}
  }

  await updateStage(ctx.analysisId, "mapping", 30);

  // Salvar mapa (NUNCA permitir null em campos críticos)
  const mapId = await db.createContractAnalysisMap({
    analysisId: ctx.analysisId,
    partnerName: result.analysisMap?.partnerName ?? null,
    contractType: result.analysisMap?.contractType ?? 'indefinido',
    contractingParty: (result.analysisMap as any)?.contractingParty ?? null,
    contractedParty: (result.analysisMap as any)?.contractedParty ?? null,
    lgpdAgentType: (result.analysisMap as any)?.lgpdAgentType ?? 'controlador',
    agentTypeJustification: (result.analysisMap as any)?.agentTypeJustification ?? 'Não foi possível inferir com confiança a partir do documento fornecido.',
    contractObject: (result.analysisMap as any)?.contractObject ?? 'Contrato analisado',
    startDate: (result.analysisMap as any)?.startDate ?? 'NÃO IDENTIFICADO',
    endDate: (result.analysisMap as any)?.endDate ?? 'NÃO IDENTIFICADO',
    commonData: (result.analysisMap as any)?.commonData ?? 'NÃO IDENTIFICADO (sem sinais no texto)',
    commonDataLargeScale: (result.analysisMap as any)?.commonDataLargeScale ? 1 : 0,
    sensitiveData: (result.analysisMap as any)?.sensitiveData ?? 'NÃO IDENTIFICADO',
    sensitiveDataLargeScale: (result.analysisMap as any)?.sensitiveDataLargeScale ? 1 : 0,
    hasElderlyData: (result.analysisMap as any)?.hasElderlyData ? 1 : 0,
    elderlyDataDetails: (result.analysisMap as any)?.elderlyDataDetails ?? null,
    hasMinorData: (result.analysisMap as any)?.hasMinorData ? 1 : 0,
    minorDataDetails: (result.analysisMap as any)?.minorDataDetails ?? null,
    titularRightsStatus: (result.analysisMap as any)?.titularRightsStatus ?? null,
    titularRightsDetails: (result.analysisMap as any)?.titularRightsDetails ?? null,
    dataEliminationStatus: (result.analysisMap as any)?.dataEliminationStatus ?? null,
    dataEliminationDetails: (result.analysisMap as any)?.dataEliminationDetails ?? null,
    legalRisks: (result.analysisMap as any)?.legalRisks ?? null,
    securityRisks: (result.analysisMap as any)?.securityRisks ?? null,
    hasProtectionClause: (result.analysisMap as any)?.hasProtectionClause ?? null,
    protectionClauseDetails: (result.analysisMap as any)?.protectionClauseDetails ?? null,
    suggestedClause: (result.analysisMap as any)?.suggestedClause ?? null,
    actionStatus: (result.analysisMap as any)?.actionStatus ?? "ajustar",
    actionPlan: (result.analysisMap as any)?.actionPlan ?? null,
    suggestedDeadline: (result.analysisMap as any)?.suggestedDeadline ?? null,
  } as any);

  ctx.mapData = result.analysisMap;

  await updateStage(ctx.analysisId, "mapping", 70);

  // Criar link de mapeamento (se possível)
  // IMPORTANTE: transformar analysisMap bruto em dados estruturados de mapeamento
  // O MapeamentoAutoEditor espera: department, processTitle, dataCategories, legalBase, etc.
  if (conn && mapId) {
    try {
      const am = result.analysisMap as any;
      const structuredMapeamento = {
        department: am?.contractType || 'Geral',
        departmentJustification: `Identificado automaticamente a partir do tipo de contrato: ${am?.contractType || 'N/A'}`,
        processTitle: `Tratamento de dados - ${am?.partnerName || 'Parceiro'}`,
        processDescription: am?.contractObject || 'Objeto do contrato',
        processPurpose: am?.contractObject || 'Finalidade do tratamento conforme contrato',
        dataCategories: [
          ...(am?.commonData ? [{ name: am.commonData, sensivel: false, source: 'mapa_analise' }] : []),
          ...(am?.sensitiveData ? [{ name: am.sensitiveData, sensivel: true, source: 'mapa_analise' }] : []),
        ],
        titularCategories: [
          'Titulares relacionados ao contrato',
          ...(am?.hasMinorData ? ['Menores de idade'] : []),
          ...(am?.hasElderlyData ? ['Idosos'] : []),
        ].filter(Boolean),
        legalBase: 'execucao_contrato',
        legalBaseJustification: 'Tratamento realizado para execução de contrato entre as partes.',
        sharing: [am?.contractingParty, am?.contractedParty].filter(Boolean),
        retentionPeriod: am?.endDate || 'Conforme vigência do contrato',
        storageLocation: 'Sistemas do contratado',
        securityMeasures: [
          ...(am?.securityRisks ? [`Mitigação: ${String(am.securityRisks).substring(0, 200)}`] : ['Controles de acesso']),
          'Criptografia de dados',
        ],
        internationalTransfer: false,
        internationalCountries: [],
        dataSource: 'contract_analysis',
        contractAnalysisId: ctx.analysisId,
        // Campos adicionais do mapa original para referência
        agentType: am?.agentType || am?.lgpdAgentType || null,
        agentTypeJustification: am?.agentTypeJustification || null,
        titularRightsStatus: am?.titularRightsStatus || null,
        titularRightsDetails: am?.titularRightsDetails || null,
        dataEliminationStatus: am?.dataEliminationStatus || null,
        dataEliminationDetails: am?.dataEliminationDetails || null,
        hasProtectionClause: am?.hasProtectionClause || null,
        protectionClauseDetails: am?.protectionClauseDetails || null,
        suggestedClause: am?.suggestedClause || null,
        legalRisks: am?.legalRisks || null,
        actionPlan: am?.actionPlan || null,
      };
      const dept = structuredMapeamento.department;
      await conn.execute(sql`
        INSERT INTO contract_mapeamento_links ("contractAnalysisId", "extractionSource", "extractedData", "identifiedDepartment", "linkStatus", "createdAt", "updatedAt")
        VALUES (${ctx.analysisId}, 'contract_map', ${JSON.stringify(structuredMapeamento)}, ${dept}, 'pending', NOW(), NOW())
      `);
      logger.info("[Pipeline:mapping] Mapeamento estruturado criado", { analysisId: ctx.analysisId, department: dept });
    } catch (e) {
      logger.warn("[Pipeline:mapping] Falha ao criar mapeamento link", { message: asMsg(e) });
    }
  }

  // HARDENING: garantir persistência real (mapa) antes de concluir
  if (conn) {
    await assertStageOutputsOrThrow(conn, ctx.analysisId, "mapping");
  }

      await contractAnalysisService.updateOutputsManifest(ctx.job.organizationId, ctx.analysisId, null);
    await updateStage(ctx.analysisId, "mapping", 100);
  logger.info("[Pipeline:mapping] Concluída", { analysisId: ctx.analysisId });
}

// ---- FASE 4: RISKS ----

async function phaseRisks(ctx: PipelineContext): Promise<void> {
  await updateStage(ctx.analysisId, "risks", 0);

  const result = ctx.analysisResult;

  // Limpar artefatos anteriores (idempotência)
  const conn = await getDbConnOrNull();
  if (conn) {
    try { await conn.execute(sql`DELETE FROM contract_checklist_items WHERE "analysisId" = ${ctx.analysisId}`); } catch {}
    try { await conn.execute(sql`DELETE FROM contract_risk_items WHERE "analysisId" = ${ctx.analysisId}`); } catch {}
  }

  await updateStage(ctx.analysisId, "risks", 30);


  // HARDENING: se a IA não retornou checklist/risks, aplicar fallback mínimo (para não ficar vazio)
  if (!result?.checklist || !Array.isArray(result.checklist) || result.checklist.length === 0) {
    logger.warn("[Pipeline:risks] Checklist vazio — aplicando fallback", { analysisId: ctx.analysisId });
    result.checklist = fallbackChecklist();
  }
  if (!result?.risks || !Array.isArray(result.risks) || result.risks.length === 0) {
    logger.warn("[Pipeline:risks] Riscos vazios — aplicando fallback", { analysisId: ctx.analysisId });
    result.risks = fallbackRisks();
  }

  // Salvar checklist
  if (result?.checklist?.length) {
    await db.createContractChecklistItems(
      result.checklist.map((it: any) => ({
        analysisId: ctx.analysisId,
        itemNumber: it.itemNumber,
        question: it.question,
        checklistStatus: it.status,
        observations: it.observations ?? null,
        contractExcerpt: it.contractExcerpt ?? null,
      }))
    );
  }

  await updateStage(ctx.analysisId, "risks", 60);

  // Salvar riscos
  if (result?.risks?.length) {
    await db.createContractRiskItems(
      result.risks.map((r: any) => ({
        analysisId: ctx.analysisId,
        contractArea: r.contractArea,
        analysisBlock: r.analysisBlock,
        riskDescription: r.riskDescription,
        riskLevel: r.riskLevel,
        potentialImpact: r.potentialImpact ?? null,
        requiredAction: r.requiredAction ?? null,
        suggestedDeadline: r.suggestedDeadline ?? null,
        legalReference: r.legalReference ?? null,
      }))
    );
  }

  // HARDENING: garantir persistência real (checklist + riscos)
  if (conn) {
    await assertStageOutputsOrThrow(conn, ctx.analysisId, "risks");
  }

  await updateStage(ctx.analysisId, "risks", 80);

  // ── Risco v3.1: clusters + pisos jurídicos ──
  try {
    const map = ctx.mapData || ctx.analysisResult?.analysisMap;
    const contextoRisco = {
      A8_setor_regulado: map?.regulatedSectors || [],
      B1_trata_dados_pessoais: true,
      B3_trata_dados_sensiveis: !!(map?.sensitiveData),
      B4_trata_dados_sensiveis_em_larga_escala: map?.sensitiveDataLargeScale ? "sim" : "nao",
      B6_trata_dados_criancas_0_12: !!(map?.hasMinorData),
      B7_trata_dados_adolescentes_13_17: !!(map?.hasMinorData),
      E4_ha_transferencia_internacional: !!(map?.internationalTransfer),
    };

    // PATCH v3.1: usar checklistStatus (campo persistido no DB), não "it.status" (campo da IA)
    const checklistForRisk = mapChecklistToMacroBlocks(
      (result.checklist || []).map((it: any) => ({
        itemNumber: it.itemNumber,
        question: it.question,
        checklistStatus: it.checklistStatus || it.status,
        observations: it.observations,
        contractExcerpt: it.contractExcerpt,
      }))
    );

    const riskModelResult = inferirRiscoV31(contextoRisco, checklistForRisk);
    ctx.riskModelResult = riskModelResult;

    // Persistir clusters e riskScore no banco (com riskLevelDb para consistência)
    if (conn) {
      await conn.execute(sql`
        UPDATE contract_analyses
        SET "governanceMetadata" = ${JSON.stringify({
          riskModelVersion: "v3.1",
          riskScore: riskModelResult.riskScore,
          riskLevelText: riskModelResult.riskLevel,
          riskLevelDb: riskModelResult.riskLevelDb,
          riskLevel: riskModelResult.riskLevel,
          clusters: riskModelResult.clusters.map((c: any) => ({
            ...c,
            riskLevelText: c.riskLevel,
            riskLevelDb: c.riskLevelDb,
          })),
          pisoAplicado: riskModelResult.pisoAplicado,
          consistencyNotes: riskModelResult.consistencyNotes,
          macroCoverage: riskModelResult.macroCoverage?.map((mc: any) => ({
            macroBlock: mc.macroBlock,
            coverage: mc.coverage,
            gapScore: mc.gapScore,
          })),
        })}
        WHERE id = ${ctx.analysisId}
      `);
    }

    logger.info("[Pipeline:risks] Risco v3.1 aplicado", {
      analysisId: ctx.analysisId,
      riskScore: riskModelResult.riskScore,
      riskLevel: riskModelResult.riskLevel,
      clusters: riskModelResult.clusters.length,
      pisoAplicado: riskModelResult.pisoAplicado,
    });
  } catch (e) {
    logger.warn("[Pipeline:risks] Falha ao aplicar risco v3.1 (não-bloqueante)", { message: asMsg(e) });
  }

  await contractAnalysisService.updateOutputsManifest(ctx.job.organizationId, ctx.analysisId, null);
  await updateStage(ctx.analysisId, "risks", 100);
  logger.info("[Pipeline:risks] Concluída", { analysisId: ctx.analysisId, checklist: result?.checklist?.length || 0, risks: result?.risks?.length || 0 });
}

// ---- FASE 5: CLAUSES ----

async function phaseClauses(ctx: PipelineContext): Promise<void> {
  await updateStage(ctx.analysisId, "clauses", 0);

  const map = ctx.mapData || ctx.analysisResult?.analysisMap;

  // Limpar cláusulas anteriores (idempotência)
  const conn = await getDbConnOrNull();
  if (conn) {
    try { await conn.execute(sql`DELETE FROM contract_analysis_clauses WHERE "analysisId" = ${ctx.analysisId}`); } catch {}
  }

  await updateStage(ctx.analysisId, "clauses", 20);

  // 1. Gerar cláusulas LGPD determinísticas
  const lgpdContext = {
    A1_tipo_contrato_juridico: map?.contractType || "prestação de serviços",
    A3_papel_global_cliente: mapLgpdRole(map?.lgpdAgentType, "controlador"),
    A4_papel_global_contraparte: mapLgpdRole(map?.lgpdAgentType, "operador"),
    B1_trata_dados_pessoais: true,
    B2_trata_dados_comuns: !!(map?.commonData),
    B3_trata_dados_sensiveis: !!(map?.sensitiveData),
    B4_trata_dados_sensiveis_em_larga_escala: map?.sensitiveDataLargeScale ? "sim" as const : "nao" as const,
    B6_trata_dados_criancas_0_12: !!(map?.hasMinorData),
    B7_trata_dados_adolescentes_13_17: !!(map?.hasMinorData),
  };

  let clausulas: Array<{ clauseId: string; sequenceNumber: number; title: string; content: string }> = [];

  try {
    const resultado = gerarClausulasLGPD(lgpdContext as any);
    clausulas = (resultado.clausulas || []).map((c: any, idx: number) => ({
      clauseId: `lgpd-${c.bloco}-${idx + 1}`,
      sequenceNumber: idx + 1,
      title: c.titulo,
      content: c.texto,
    }));
  } catch (e) {
    logger.warn("[Pipeline:clauses] Falha ao gerar cláusulas LGPD", { message: asMsg(e) });
  }

  await updateStage(ctx.analysisId, "clauses", 50);

  // 2. Gerar cláusulas XAI (baseadas em alertas)
  try {
    if (ctx.extractedText) {
      ctx.xaiAlerts = await analyzeContractWithXai(ctx.extractedText.slice(0, 15000));

      for (const alerta of ctx.xaiAlerts.slice(0, 5)) {
        const xaiClause = await generateClausulaWithXai({
          titulo: alerta.titulo || alerta.id,
          contexto: { contractName: ctx.job.contractName },
          alertas: [alerta],
        });

        clausulas.push({
          clauseId: `xai-${xaiClause.id}`,
          sequenceNumber: clausulas.length + 1,
          title: xaiClause.titulo,
          content: xaiClause.conteudo,
        });
      }
    }
  } catch (e) {
    logger.warn("[Pipeline:clauses] Falha ao gerar cláusulas XAI", { message: asMsg(e) });
  }

  await updateStage(ctx.analysisId, "clauses", 80);

  // HARDENING: se não gerou nenhuma cláusula, aplicar fallback mínimo
  if (!clausulas || clausulas.length === 0) {
    logger.warn("[Pipeline:clauses] Nenhuma cláusula gerada — aplicando fallback de cláusulas", { analysisId: ctx.analysisId });
    clausulas = fallbackClauses();
  }

  // ── Overlays v4: aplicar complementos setoriais ──
  try {
    const overlayCtx: ContextoGlobalForOverlay = {
      A1_tipo_contrato_juridico: lgpdContext.A1_tipo_contrato_juridico,
      A2_natureza_relacao: map?.contractNature || "prestacao_servico",
      A8_setor_regulado: map?.regulatedSectors || [],
      R1_nivel_risco_global_estimado: ctx.riskModelResult?.riskLevel || "medio",
      B1_trata_dados_pessoais: true,
    };

    const clausulasComMacro = clausulas.map(c => ({
      ...c,
      macroBlock: c.clauseId.match(/lgpd-(\d+)/)?.[1]?.padStart(2, "0") || undefined,
    }));

    const { clauses: clausulasComOverlay, overlayResult } = applyOverlaysToClauses(clausulasComMacro, overlayCtx);
    clausulas = clausulasComOverlay;
    ctx.appliedOverlayIds = overlayResult.appliedOverlayIds;

    if (overlayResult.totalApplied > 0) {
      logger.info("[Pipeline:clauses] Overlays v4 aplicados", {
        analysisId: ctx.analysisId,
        overlaysApplied: overlayResult.totalApplied,
        overlayIds: overlayResult.appliedOverlayIds.slice(0, 10),
      });

      // Persistir IDs dos overlays aplicados
      if (conn) {
        try {
          const existingMeta = await conn.execute(sql`SELECT "governanceMetadata" FROM contract_analyses WHERE id = ${ctx.analysisId}`);
          const existingRows = rowsFromExecute(existingMeta);
          let meta: any = {};
          try { meta = JSON.parse((existingRows[0] as any)?.governanceMetadata || "{}"); } catch {}
          meta.overlaysV4 = {
            appliedIds: overlayResult.appliedOverlayIds,
            totalApplied: overlayResult.totalApplied,
            macrosAffected: Object.keys(overlayResult.macroAppends),
          };
          await conn.execute(sql`UPDATE contract_analyses SET "governanceMetadata" = ${JSON.stringify(meta)} WHERE id = ${ctx.analysisId}`);
        } catch (e2) {
          logger.warn("[Pipeline:clauses] Falha ao persistir metadata de overlays", { message: asMsg(e2) });
        }
      }
    }
  } catch (e) {
    logger.warn("[Pipeline:clauses] Falha ao aplicar overlays v4 (não-bloqueante)", { message: asMsg(e) });
  }

  // 3. Persistir cláusulas
  if (clausulas.length > 0) {
    await db.saveContractAnalysisClauses(ctx.analysisId, clausulas);
  }

  // HARDENING: garantir persistência real (cláusulas)
  if (conn) {
    await assertStageOutputsOrThrow(conn, ctx.analysisId, "clauses");
  }

      await contractAnalysisService.updateOutputsManifest(ctx.job.organizationId, ctx.analysisId, null);
    await updateStage(ctx.analysisId, "clauses", 100);
  logger.info("[Pipeline:clauses] Concluída", { analysisId: ctx.analysisId, totalClauses: clausulas.length });
}

function mapLgpdRole(agentType: string | null | undefined, fallback: string): any {
  const map: Record<string, string> = {
    controlador: "controlador",
    operador: "operador",
    controlador_conjunto: "controlador_conjunto",
    suboperador: "suboperador",
  };
  return map[agentType || ""] || fallback;
}

// ---- FASE 6: ACTION_PLAN ----

async function phaseActionPlan(ctx: PipelineContext): Promise<void> {
  await updateStage(ctx.analysisId, "action_plan", 0);

  const result = ctx.analysisResult;
  const risks = result?.risks || [];

  // Chave determinística para evitar duplicatas
  const originKey = `contract_analysis:${ctx.analysisId}`;

  // Verificar se já existem action plans para esta análise (idempotência)
  const conn = await getDbConnOrNull();
  if (conn) {
    try {
      const existingRes = await conn.execute(sql`
        SELECT COUNT(*) as cnt FROM action_plans
        WHERE "assessmentType" = 'contract_analysis' AND "assessmentId" = ${ctx.analysisId}
      `);
      const existingRows = rowsFromExecute(existingRes);
      const existingCount = Number(existingRows[0]?.cnt || 0);
      if (existingCount > 0) {
        logger.info("[Pipeline:action_plan] Planos já existem, pulando (idempotência)", { analysisId: ctx.analysisId, count: existingCount });
        await updateStage(ctx.analysisId, "action_plan", 100);
        return;
      }
    } catch {}
  }

  await updateStage(ctx.analysisId, "action_plan", 20);

  // 1. Gerar planos via XAI
  let xaiPlans: any[] = [];
  try {
    if (ctx.xaiAlerts.length > 0) {
      xaiPlans = await generateAcaoPlanoWithXai({ alertas: ctx.xaiAlerts });
    }
  } catch (e) {
    logger.warn("[Pipeline:action_plan] Falha ao gerar planos XAI", { message: asMsg(e) });
  }

  await updateStage(ctx.analysisId, "action_plan", 50);

  // 2. Gerar planos baseados nos riscos da análise
  const riskPlans = risks
    .filter((r: any) => r.riskLevel === "critico" || r.riskLevel === "alto")
    .map((r: any) => ({
      title: `Corrigir: ${r.riskDescription?.slice(0, 200) || "Risco identificado"}`,
      description: `${r.potentialImpact || ""}\n\nAção requerida: ${r.requiredAction || "Avaliar e mitigar"}`,
      priority: r.riskLevel === "critico" ? "critica" : "alta",
      dueDate: r.suggestedDeadline || null,
      notes: `[Origem: ${originKey}] Referência: ${r.legalReference || "LGPD"}. Área: ${r.contractArea || "Geral"}`,
    }));

  // 2b. Gerar planos derivados de clusters v3.1
  let clusterPlans: any[] = [];
  if (ctx.riskModelResult?.clusters?.length) {
    clusterPlans = generateClusterActionPlan(ctx.riskModelResult.clusters)
      .filter(cp => cp.priority === "critica" || cp.priority === "alta")
      .map(cp => ({
        title: cp.title.slice(0, 255),
        description: `${cp.description}\n\nRecomendação: ${cp.recommendation}`,
        priority: cp.priority,
        notes: `[Origem: ${originKey}] [Cluster: ${cp.clusterId}] Modelo de Risco v3.1`,
      }));
    logger.info("[Pipeline:action_plan] Planos de clusters v3.1 gerados", { count: clusterPlans.length });
  }

  await updateStage(ctx.analysisId, "action_plan", 70);

  // 3. Persistir action plans
  const allPlans = [
    ...xaiPlans.map((p: any) => ({
      title: p.titulo,
      description: p.descricao,
      priority: p.prioridade === "alta" ? "alta" : p.prioridade === "media" ? "media" : "baixa",
      notes: `[Origem: ${originKey}] ${p.justificativa || ""}`,
    })),
    ...riskPlans,
    ...clusterPlans,
  ];

  for (const plan of allPlans) {
    try {
      await db.createActionPlan({
        organizationId: ctx.job.organizationId,
        assessmentType: "contract_analysis",
        assessmentId: ctx.analysisId,
        title: (plan.title || "Ação de conformidade").slice(0, 255),
        description: plan.description || null,
        priority: (plan.priority || "media") as any,
        status: "pendente" as any,
        notes: plan.notes || null,
        dueDate: plan.dueDate || null,
      } as any);
    } catch (e) {
      logger.warn("[Pipeline:action_plan] Falha ao criar plano", { title: plan.title, message: asMsg(e) });
    }
  }

  // HARDENING: se existirem riscos e nenhum action plan foi criado, criar um fallback
  if (conn) {
    const riskCnt = await countOrZero(conn, sql`SELECT COUNT(*) as cnt FROM contract_risk_items WHERE "analysisId" = ${ctx.analysisId}`);
    const apCnt = await countOrZero(conn, sql`SELECT COUNT(*) as cnt FROM action_plans WHERE "assessmentType"='contract_analysis' AND "assessmentId" = ${ctx.analysisId}`);
    if (riskCnt > 0 && apCnt <= 0) {
      logger.warn("[Pipeline:action_plan] Nenhum plano criado apesar de riscos — criando fallback", { analysisId: ctx.analysisId });
      await db.createActionPlan({
        organizationId: ctx.job.organizationId,
        assessmentType: "contract_analysis",
        assessmentId: ctx.analysisId,
        title: "Criar/solicitar DPA e aditivo LGPD (fallback)",
        description: "A análise identificou riscos, mas nenhum plano foi persistido. Criar/solicitar DPA e aditivo LGPD com cláusulas de segurança, incidentes (48h), retenção e direitos do titular.",
        priority: "alta" as any,
        status: "pendente" as any,
        notes: `[Origem: contract_analysis:${ctx.analysisId}] fallback`,
        dueDate: null,
      } as any);
    }

    await assertStageOutputsOrThrow(conn, ctx.analysisId, "action_plan");
  }

      await contractAnalysisService.updateOutputsManifest(ctx.job.organizationId, ctx.analysisId, null);
    await updateStage(ctx.analysisId, "action_plan", 100);
  logger.info("[Pipeline:action_plan] Concluída", { analysisId: ctx.analysisId, totalPlans: allPlans.length });
}

// ---- FASE 7: REPORTS ----

async function phaseReports(ctx: PipelineContext): Promise<void> {
  await updateStage(ctx.analysisId, "reports", 0);

  const analysis = await db.getContractAnalysisById(ctx.analysisId);
  if (!analysis) {
    logger.warn("[Pipeline:reports] Análise não encontrada", { analysisId: ctx.analysisId });
    await updateStage(ctx.analysisId, "reports", 100);
    return;
  }

  await updateStage(ctx.analysisId, "reports", 20);

  // Carregar dados para o PDF
  const conn = await getDbConnOrNull();
  let mapData: any = null;
  let checklistData: any[] = [];
  let risksData: any[] = [];

  if (conn) {
    try {
      const mapRes = await conn.execute(sql`SELECT * FROM contract_analysis_maps WHERE "analysisId" = ${ctx.analysisId} LIMIT 1`);
      const mapRows = rowsFromExecute(mapRes);
      mapData = mapRows[0] || null;
    } catch {}

    try {
      const clRes = await conn.execute(sql`SELECT * FROM contract_checklist_items WHERE "analysisId" = ${ctx.analysisId}`);
      checklistData = rowsFromExecute(clRes);
    } catch {}

    try {
      const riskRes = await conn.execute(sql`SELECT * FROM contract_risk_items WHERE "analysisId" = ${ctx.analysisId}`);
      risksData = rowsFromExecute(riskRes);
    } catch {}
  }

  await updateStage(ctx.analysisId, "reports", 50);

  // Gerar PDF
  try {
    const pdfBuffer = await contractAnalysisService.generateContractAnalysisPdf({
      analysis: {
        id: ctx.analysisId,
        contractName: ctx.job.contractName,
        status: "completed",
        executiveSummary: (analysis as any).executiveSummary || null,
        complianceScore: (analysis as any).complianceScore || null,
        criticalRisks: (analysis as any).criticalRisks || 0,
        highRisks: (analysis as any).highRisks || 0,
        mediumRisks: (analysis as any).mediumRisks || 0,
        lowRisks: (analysis as any).lowRisks || 0,
        veryLowRisks: (analysis as any).veryLowRisks || 0,
        createdAt: new Date((analysis as any).createdAt),
        completedAt: new Date(),
      },
      map: mapData,
      checklist: checklistData,
      risks: risksData,
    });

    await updateStage(ctx.analysisId, "reports", 80);

    // Upload para S3
    const suffix = Math.random().toString(36).slice(2, 8);
    const fileKey = `contract-analysis/${ctx.analysisId}/relatorio-${ctx.analysisId}-${suffix}.pdf`;
    const { url: reportUrl } = await storagePut(fileKey, pdfBuffer, "application/pdf");

    await db.updateContractAnalysis(ctx.analysisId, {
      reportUrl: reportUrl as any,
      lastHeartbeatAt: nowIso(),
    } as any);

    logger.info("[Pipeline:reports] PDF gerado e enviado ao S3", { analysisId: ctx.analysisId, reportUrl });
  } catch (e) {
    logger.warn("[Pipeline:reports] Falha ao gerar PDF", { analysisId: ctx.analysisId, message: asMsg(e) });
    // Se relatórios forem obrigatórios, falhar a pipeline aqui.
    if (String(process.env.CONTRACT_ANALYSIS_REPORT_REQUIRED || "false") === "true") {
      throw new Error("OUTPUT_MISSING:REPORT_URL");
    }
  }

  // HARDENING: se reportUrl for obrigatório, validar antes de concluir
  if (conn) {
    await assertStageOutputsOrThrow(conn, ctx.analysisId, "reports");
  }

      await contractAnalysisService.updateOutputsManifest(ctx.job.organizationId, ctx.analysisId, (ctx as any).reportUrl ?? null);
    await updateStage(ctx.analysisId, "reports", 100);
  logger.info("[Pipeline:reports] Concluída", { analysisId: ctx.analysisId });
}

// ---- FASE 8: COMPLETED ----

async function phaseCompleted(ctx: PipelineContext): Promise<void> {
  const connCheck = await getDbConnOrNull();
  if (connCheck) {
    // HARDENING: não concluir se outputs estiverem vazios
    await assertStageOutputsOrThrow(connCheck, ctx.analysisId, "completed");
    await contractAnalysisService.updateOutputsManifest(ctx.job.organizationId, ctx.analysisId, (ctx as any).reportUrl ?? null);

  }
  await db.updateContractAnalysis(ctx.analysisId, {
    contractAnalysisStatus: "completed" as any,
    progress: 100,
    stage: "completed" as any,
    stageProgress: 100,
    completedAt: nowIso(),
    finishedAt: nowIso(),
    lastHeartbeatAt: nowIso(),
  } as any);

  await db.createContractAnalysisHistoryEntry({
    analysisId: ctx.analysisId,
    historyActionType: "analysis_completed",
    description: `Pipeline completo. Score: ${ctx.analysisResult?.complianceScore || "N/A"}%`,
    userId: ctx.job.userId,
  });

  await tryNotifyEmail({ analysisId: ctx.analysisId, userId: ctx.job.userId, status: "completed" });

  logger.info("[Pipeline:completed] === PIPELINE FINALIZADO ===", { analysisId: ctx.analysisId });
}

// ---- Orphan sweep + bootstrap ----

async function sweepOrphansAndBootstrap(): Promise<void> {
  logger.info("[AnalysisQueue] sweepOrphansAndBootstrap STARTED");
  const conn = await getDbConnOrNull();
  if (!conn) {
    logger.error("[AnalysisQueue] sweepOrphansAndBootstrap: conn is null!");
    return;
  }

  try {
    const qRes = await conn.execute(sql`
      SELECT id, "organizationId", "documentId", "contractName", "createdById"
      FROM contract_analyses
      WHERE "contractAnalysisStatus" IN ('queued','pending')
      ORDER BY "createdAt" DESC
      LIMIT 50
    `);
    const queuedRows = rowsFromExecute(qRes);
    logger.info("[AnalysisQueue] Bootstrap found queued rows", { count: queuedRows.length });

    for (const a of queuedRows) {
      const id = Number(a.id);
      if (!id || isAlreadyQueued(id)) continue;

      void enqueueAnalysis({
        analysisId: id,
        organizationId: Number(a.organizationId),
        documentId: Number(a.documentId),
        contractName: String(a.contractName),
        organizationName: "Cliente",
        userId: Number(a.createdById || 0),
      });
    }
  } catch (err) {
    logger.error("[AnalysisQueue] sweepOrphansAndBootstrap bootstrap error", { message: asMsg(err) });
  }

  try {
    const oRes = await conn.execute(sql`
      SELECT id, "organizationId", "documentId", "contractName", "createdById", attempts, "maxAttempts", "lastHeartbeatAt"
      FROM contract_analyses
      WHERE "contractAnalysisStatus" = 'analyzing'
        AND ("lastHeartbeatAt" IS NULL OR "lastHeartbeatAt" < (NOW() - INTERVAL '5 minutes'))
      LIMIT 200
    `);
    const staleRows = rowsFromExecute(oRes);

    for (const a of staleRows) {
      const id = Number(a.id);
      if (!id) continue;

      const attempts = Number(a.attempts ?? 0);
      const maxAttempts = Number(a.maxAttempts ?? 3);

      logger.warn("[AnalysisQueue] Órfão detectado", { analysisId: id, attempts, maxAttempts });

      if (attempts < maxAttempts) {
        await db.updateContractAnalysis(id, {
          contractAnalysisStatus: "queued" as any,
          progress: 0,
          stage: "queued" as any,
          stageProgress: 0,
          errorCode: "ORPHANED_JOB" as any,
          errorMessage: "Job órfão detectado (reinício/trava). Reenfileirando.",
          lastHeartbeatAt: nowIso(),
        } as any);

        if (!isAlreadyQueued(id)) {
          void enqueueAnalysis({
            analysisId: id,
            organizationId: Number(a.organizationId),
            documentId: Number(a.documentId),
            contractName: String(a.contractName),
            organizationName: "Cliente",
            userId: Number(a.createdById || 0),
          });
        }
      } else {
        await db.updateContractAnalysis(id, {
          contractAnalysisStatus: "error" as any,
          progress: 0,
          stage: "queued" as any,
          errorCode: "MAX_ATTEMPTS_EXCEEDED" as any,
          errorMessage: `Job órfão + tentativas esgotadas (${attempts}/${maxAttempts}).`,
          finishedAt: nowIso(),
          lastHeartbeatAt: nowIso(),
        } as any);

        await tryNotifyEmail({ analysisId: id, userId: Number(a.createdById || 0), status: "error", errorMessage: "MAX_ATTEMPTS_EXCEEDED" });
      }
    }
  } catch { /* ignore */ }
}

if (process.env.DATABASE_URL) {
  setInterval(() => void sweepOrphansAndBootstrap(), ORPHAN_SWEEP_MS);
  setTimeout(() => void sweepOrphansAndBootstrap(), 1500);
}
