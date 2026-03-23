import { getAppBaseUrl } from "./appUrl";
// server/contractAnalysisRouter.ts
//
// Router integrado (SEM IIFE):
// - startAnalysis cria registro e enfileira GUARANTIDO (await)
// - getById retorna error legível
// - getResults/list/cancel/reanalyze
//
// Observação: este arquivo é o "corte" que remove a causa raiz do loop silencioso (IIFE sem garantia).

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { logger } from "./_core/logger";
import * as db from "./db";
import * as gedService from "./gedService";
import * as analysisQueue from "./contractAnalysisQueue";
import { resolveDocumentForAnalysis } from "./contractAnalysisDocument";
import { generateContractAnalysisPremiumReport } from "./premiumReportService";
import { syncLayers, saveRiskDecision, applyRecalibration, generateConsolidatedDocument, type RiskDecision } from "./contractLayerSync";
import { enhanceAnalysisMap } from "./contractMapEnhancer";
import { sql } from "drizzle-orm";

async function getDbConnOrThrow(): Promise<any> {
  const database = await db.getDb();
  if (database) return database;
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB connection não disponível." });
}

function rowsFromExecute(result: any): any[] {
  if (result?.rows && Array.isArray(result.rows)) return result.rows;
  if (result?.[0]?.rows && Array.isArray(result[0].rows)) return result[0].rows;
  if (Array.isArray(result)) return result;
  return [];
}

export const contractAnalysisRouter = router({
  startAnalysis: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      documentId: z.number(),
      contractName: z.string().min(3),
    }))
    .mutation(async ({ input, ctx }) => {
      logger.info('[contractAnalysisRouter] startAnalysis CALLED', {
        organizationId: input.organizationId,
        documentId: input.documentId,
        contractName: input.contractName,
        userId: ctx.user.id,
        userOrganizationId: ctx.user.organizationId,
        timestamp: new Date().toISOString(),
      });
      
      if (ctx.user.role !== "admin_global" && ctx.user.role !== "consultor") {
        logger.warn('[contractAnalysisRouter] startAnalysis FORBIDDEN', {
          userId: ctx.user.id,
          role: ctx.user.role,
        });
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Validar organizationId
      if (ctx.user.role !== "admin_global" && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Permissao negada" });
      }

      const analysisId = await db.createContractAnalysis({
        organizationId: input.organizationId,
        documentId: input.documentId,
        contractName: input.contractName,
        contractAnalysisStatus: "queued" as any,
        progress: 0,
        createdById: ctx.user.id,
      } as any);

      await db.createContractAnalysisHistoryEntry({
        analysisId,
        historyActionType: "created",
        description: "Análise criada e enfileirada.",
        userId: ctx.user.id,
      });

      // validação rápida (não extrai nem chama IA)
      try {
        const doc = await resolveDocumentForAnalysis(input.documentId);
        if (!doc?.fileUrl) {
          await db.updateContractAnalysis(analysisId, {
            contractAnalysisStatus: "error" as any,
            progress: 0,
            errorCode: "DOCUMENT_URL_NOT_FOUND" as any,
            errorMessage: "Não foi possível resolver URL do documento. Verifique upload/storage/presign.",
            finishedAt: new Date().toISOString(),
          } as any);

          await db.createContractAnalysisHistoryEntry({
            analysisId,
            historyActionType: "analysis_error",
            description: "Documento sem URL resolvível no startAnalysis.",
            userId: ctx.user.id,
          });

          return { id: analysisId, contractAnalysisStatus: "error", progress: 0 };
        }
      } catch (e) {
        logger.warn("[ContractAnalysis] Validação de documento falhou no startAnalysis; worker tratará.", {
          analysisId,
          message: e instanceof Error ? e.message : String(e),
        });
      }

      try {
        logger.info('[contractAnalysisRouter] Enqueuing analysis', {
          analysisId,
          organizationId: input.organizationId,
          documentId: input.documentId,
        });
        
        await analysisQueue.enqueueAnalysis({
          analysisId,
          organizationId: input.organizationId,
          documentId: input.documentId,
          contractName: input.contractName,
          organizationName: (ctx as any)?.organization?.name || "Cliente",
          userId: ctx.user.id,
        });
        
        logger.info('[contractAnalysisRouter] Analysis enqueued successfully', {
          analysisId,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);

        await db.updateContractAnalysis(analysisId, {
          contractAnalysisStatus: "error" as any,
          progress: 0,
          errorCode: "PERSISTENCE_ERROR" as any,
          errorMessage: `Falha ao enfileirar: ${msg}`,
          finishedAt: new Date().toISOString(),
        } as any);

        await db.createContractAnalysisHistoryEntry({
          analysisId,
          historyActionType: "analysis_error",
          description: `Falha ao enfileirar: ${msg}`,
          userId: ctx.user.id,
        });

        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao enfileirar a análise." });
      }

      const result = { id: analysisId, contractAnalysisStatus: "queued", progress: 0 };
      logger.info('[contractAnalysisRouter] startAnalysis RETURNING', {
        analysisId,
        status: result.contractAnalysisStatus,
        progress: result.progress,
      });
      return result;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.id);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });

      if (ctx.user.organizationId !== (analysis as any).organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return {
        ...(analysis as any),
        error: (analysis as any).errorMessage ?? null,
        stage: (analysis as any).stage ?? 'queued',
        stageProgress: (analysis as any).stageProgress ?? 0,
        reportUrl: (analysis as any).reportUrl ?? null,
      };
    }),

  getResults: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.id);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });

      if (ctx.user.organizationId !== (analysis as any).organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const conn = await getDbConnOrThrow();

      const map = rowsFromExecute(await conn.execute(sql`SELECT * FROM contract_analysis_maps WHERE "analysisId" = ${input.id} LIMIT 1`))[0] ?? null;
      const checklist = rowsFromExecute(await conn.execute(sql`SELECT * FROM contract_checklist_items WHERE "analysisId" = ${input.id}`));
      const risks = rowsFromExecute(await conn.execute(sql`SELECT * FROM contract_risk_items WHERE "analysisId" = ${input.id}`));
      const evidence: any[] = []; // contract_evidence_items: tabela ainda não existe (feature futura)

      let clauses: any[] = [];
      try {
        clauses = rowsFromExecute(await conn.execute(sql`SELECT * FROM contract_analysis_clauses WHERE "analysisId" = ${input.id} ORDER BY "sequenceNumber" ASC`));
      } catch {}

      let actionPlans: any[] = [];
      try {
        actionPlans = rowsFromExecute(await conn.execute(sql`SELECT * FROM action_plans WHERE "assessmentType" = 'contract_analysis' AND "assessmentId" = ${input.id} ORDER BY id ASC`));
      } catch {}

      return {
        analysis: {
          ...(analysis as any),
          stage: (analysis as any).stage ?? 'queued',
          stageProgress: (analysis as any).stageProgress ?? 0,
          reportUrl: (analysis as any).reportUrl ?? null,
        },
        map,
        checklist,
        risks,
        evidence,
        clauses,
        actionPlans,
      };
    }),


  getStageCounts: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.id);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });

      if (ctx.user.organizationId !== (analysis as any).organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const conn = await getDbConnOrThrow();

      const maps = rowsFromExecute(await conn.execute(sql`SELECT COUNT(*) as cnt FROM contract_analysis_maps WHERE "analysisId" = ${input.id}`))[0]?.cnt ?? 0;
      const checklist = rowsFromExecute(await conn.execute(sql`SELECT COUNT(*) as cnt FROM contract_checklist_items WHERE "analysisId" = ${input.id}`))[0]?.cnt ?? 0;
      const risks = rowsFromExecute(await conn.execute(sql`SELECT COUNT(*) as cnt FROM contract_risk_items WHERE "analysisId" = ${input.id}`))[0]?.cnt ?? 0;
      let clauses = 0;
      try {
        clauses = rowsFromExecute(await conn.execute(sql`SELECT COUNT(*) as cnt FROM contract_analysis_clauses WHERE "analysisId" = ${input.id}`))[0]?.cnt ?? 0;
      } catch {}
      let actions = 0;
      try {
        actions = rowsFromExecute(await conn.execute(sql`SELECT COUNT(*) as cnt FROM action_plans WHERE "assessmentType"='contract_analysis' AND "assessmentId" = ${input.id}`))[0]?.cnt ?? 0;
      } catch {}

      return {
        maps: Number(maps) || 0,
        checklist: Number(checklist) || 0,
        risks: Number(risks) || 0,
        clauses: Number(clauses) || 0,
        actions: Number(actions) || 0,
        reportUrl: (analysis as any).reportUrl ?? null,
      };
    }),


  getFullResults: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.id);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });

      const orgId = (analysis as any).organizationId;
      if (ctx.user.role !== "admin_global" && ctx.user.organizationId !== orgId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Manifest
      const conn = await getDbConnOrThrow();
      let manifest: any = null;
      try {
        const mRes = await conn.execute(sql`
          SELECT * FROM contract_analysis_outputs_manifest
          WHERE "analysisId" = ${input.id}
          LIMIT 1
        `);
        const mRows = rowsFromExecute(mRes);
        manifest = mRows?.[0] ?? null;
      } catch {}

      if (!manifest) {
        manifest = {
          analysisId: input.id,
          organizationId: orgId,
          mapCount: 0,
          checklistCount: 0,
          riskCount: 0,
          clauseCount: 0,
          actionPlanCount: 0,
          reportUrl: (analysis as any).reportUrl ?? null,
        };
      }

      // Outputs reais
      const mapRes = await conn.execute(sql`SELECT * FROM contract_analysis_maps WHERE "analysisId" = ${input.id} ORDER BY id DESC LIMIT 2000`);
      const checklistRes = await conn.execute(sql`SELECT * FROM contract_checklist_items WHERE "analysisId" = ${input.id} ORDER BY "itemNumber" ASC LIMIT 2000`);
      const risksRes = await conn.execute(sql`SELECT * FROM contract_risk_items WHERE "analysisId" = ${input.id} ORDER BY id ASC LIMIT 2000`);
      let clausesRows: any[] = [];
      try {
        const clausesRes = await conn.execute(sql`SELECT * FROM contract_analysis_clauses WHERE "analysisId" = ${input.id} ORDER BY "sequenceNumber" ASC LIMIT 2000`);
        clausesRows = rowsFromExecute(clausesRes);
      } catch { clausesRows = []; }

      const apRes = await conn.execute(sql`
        SELECT * FROM action_plans
        WHERE "assessmentType"='contract_analysis' AND "assessmentId" = ${input.id}
        ORDER BY "createdAt" DESC LIMIT 2000
      `);

      // Buscar governanceMetadata para clusters v3.1 e overlays v4
      let governanceMetadata: any = null;
      try {
        const gmRes = await conn.execute(sql`SELECT "governanceMetadata" FROM contract_analyses WHERE id = ${input.id}`);
        const gmRows = rowsFromExecute(gmRes);
        if (gmRows[0] && (gmRows[0] as any).governanceMetadata) {
          governanceMetadata = typeof (gmRows[0] as any).governanceMetadata === 'string'
            ? JSON.parse((gmRows[0] as any).governanceMetadata)
            : (gmRows[0] as any).governanceMetadata;
        }
      } catch {}

      return {
        analysis,
        manifest,
        mapItems: rowsFromExecute(mapRes),
        checklistItems: rowsFromExecute(checklistRes),
        riskItems: rowsFromExecute(risksRes),
        clauses: clausesRows,
        actionPlans: rowsFromExecute(apRes),
        reportUrl: (analysis as any).reportUrl ?? null,
        governanceMetadata,
      };
    }),

  list: protectedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      const conn = await getDbConnOrThrow();
      const orgId =
        ctx.user.role === "admin_global"
          ? (input.organizationId ?? ctx.user.organizationId)
          : ctx.user.organizationId;

      const rows = rowsFromExecute(await conn.execute(sql`
        SELECT * FROM contract_analyses
        WHERE "organizationId" = ${orgId}
        ORDER BY "createdAt" DESC
        LIMIT ${input.limit} OFFSET ${input.offset}
      `));

      return rows;
    }),

  cancelAnalysis: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.id);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });

      if (ctx.user.organizationId !== (analysis as any).organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const status = String((analysis as any).contractAnalysisStatus);
      if (!["queued", "pending", "analyzing"].includes(status)) {
        return { ok: false, message: "Análise não está em estado cancelável." };
      }

      await db.updateContractAnalysis(input.id, {
        contractAnalysisStatus: "canceled" as any,
        progress: 0,
        errorCode: "CANCELED" as any,
        errorMessage: "Análise cancelada pelo usuário.",
        canceledAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
      } as any);

      await db.createContractAnalysisHistoryEntry({
        analysisId: input.id,
        historyActionType: "analysis_error",
        description: "Cancelada pelo usuário.",
        userId: ctx.user.id,
      });

      await analysisQueue.cancelAnalysis(input.id);
      return { ok: true };
    }),

  reanalyze: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const prev = await db.getContractAnalysisById(input.id);
      if (!prev) throw new TRPCError({ code: "NOT_FOUND" });

      if (ctx.user.organizationId !== (prev as any).organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (ctx.user.role !== "admin_global" && ctx.user.role !== "consultor") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const newId = await db.createContractAnalysis({
        organizationId: Number((prev as any).organizationId),
        documentId: Number((prev as any).documentId),
        contractName: String((prev as any).contractName),
        contractAnalysisStatus: "queued" as any,
        progress: 0,
        createdById: ctx.user.id,
      } as any);

      await db.createContractAnalysisHistoryEntry({
        analysisId: newId,
        historyActionType: "created",
        description: `Reanálise criada a partir da análise ${input.id}.`,
        userId: ctx.user.id,
      });

      await analysisQueue.enqueueAnalysis({
        analysisId: newId,
        organizationId: Number((prev as any).organizationId),
        documentId: Number((prev as any).documentId),
        contractName: String((prev as any).contractName),
        organizationName: (ctx as any)?.organization?.name || "Cliente",
        userId: ctx.user.id,
      });

      return { id: newId };
    }),

  // ==================== ENDPOINTS DE GERAÇÃO MANUAL ====================

  // Gerar Plano de Ação (baseado em riscos da análise)
  generateActionPlan: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND", message: "Análise não encontrada" });
      if (ctx.user.organizationId !== (analysis as any).organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const risks = await db.getContractRiskItems(input.analysisId);
      const checklistItems = await db.getContractChecklistItems(input.analysisId);

      if ((!risks || risks.length === 0) && (!checklistItems || checklistItems.length === 0)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhum risco ou item de checklist encontrado para gerar plano de ação" });
      }

      const originKey = `contract_analysis:${input.analysisId}`;

      // Verificar duplicatas
      const existing = await db.getActionPlansByAssessment('contract_analysis', input.analysisId);
      if (existing && existing.length > 0) {
        return { actionsCreated: existing.length, message: "Plano de ação já existe" };
      }

      let actionsCreated = 0;

      // 1) Ações a partir da Matriz de Riscos (riscos críticos e altos)
      for (const risk of (risks || [])) {
        const r = risk as any;
        if (r.riskLevel === 'critico' || r.riskLevel === 'alto' || r.riskLevel === '1' || r.riskLevel === '2') {
          try {
            await db.createActionPlan({
              organizationId: Number((analysis as any).organizationId),
              assessmentType: "contract_analysis",
              assessmentId: input.analysisId,
              title: `Corrigir: ${(r.riskDescription || r.description || 'Risco identificado').slice(0, 255)}`,
              description: `${r.potentialImpact || r.impact || ''}\n\nAção requerida: ${r.requiredAction || r.recommendation || 'Avaliar e mitigar'}`,
              priority: (r.riskLevel === 'critico' || r.riskLevel === '1') ? 'critica' as any : 'alta' as any,
              status: 'pendente' as any,
              notes: `[Origem: Matriz de Riscos - ${originKey}] Referência: ${r.legalReference || 'LGPD'}. Área: ${r.contractArea || 'Geral'}`,
              dueDate: r.suggestedDeadline || null,
            } as any);
            actionsCreated++;
          } catch (e) {
            logger.warn("[Router:generateActionPlan] Falha ao criar plano de risco", { message: String(e) });
          }
        }
      }

      // 2) Ações a partir do Checklist (itens com status 'nao' ou 'parcial')
      for (const item of (checklistItems || [])) {
        const ci = item as any;
        if (ci.checklistStatus === 'nao' || ci.checklistStatus === 'parcial') {
          try {
            const priorityLevel = ci.checklistStatus === 'nao' ? 'alta' : 'media';
            const statusLabel = ci.checklistStatus === 'nao' ? 'Não atendido' : 'Parcialmente atendido';
            await db.createActionPlan({
              organizationId: Number((analysis as any).organizationId),
              assessmentType: "contract_analysis",
              assessmentId: input.analysisId,
              title: `Checklist: ${(ci.question || 'Item de verificação').slice(0, 255)}`,
              description: `Status: ${statusLabel}\n\n${ci.observations || 'Adequar o contrato para atender este requisito de conformidade.'}\n\n${ci.contractExcerpt ? 'Trecho do contrato: ' + ci.contractExcerpt : ''}`,
              priority: priorityLevel as any,
              status: 'pendente' as any,
              notes: `[Origem: Checklist item #${ci.itemNumber || ci.id} - ${originKey}]`,
              dueDate: null,
            } as any);
            actionsCreated++;
          } catch (e) {
            logger.warn("[Router:generateActionPlan] Falha ao criar plano de checklist", { message: String(e) });
          }
        }
      }

      // Se nenhum risco crítico/alto e nenhum checklist reprovado, criar pelo menos um plano geral
      if (actionsCreated === 0) {
        await db.createActionPlan({
          organizationId: Number((analysis as any).organizationId),
          assessmentType: "contract_analysis",
          assessmentId: input.analysisId,
          title: "Revisar contrato para conformidade LGPD",
          description: "A análise identificou riscos que requerem atenção. Revisar o contrato e implementar cláusulas de proteção de dados.",
          priority: 'media' as any,
          status: 'pendente' as any,
          notes: `[Origem: ${originKey}]`,
          dueDate: null,
        } as any);
        actionsCreated = 1;
      }

      return { actionsCreated };
    }),

  // Gerar Plano de Ação com XAI (IA Explicável)
  generateActionPlanWithXai: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { analyzeContractWithXai, generateAcaoPlanoWithXai } = await import("./xai/xaiEngine");
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND", message: "Análise não encontrada" });
      if (ctx.user.organizationId !== (analysis as any).organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Buscar texto extraído
      const conn = await getDbConnOrThrow();
      const textRes = await conn.execute(sql`SELECT "extractedText" FROM contract_analyses WHERE id = ${input.analysisId}`);
      const textRows = rowsFromExecute(textRes);
      const extractedText = textRows[0]?.extractedText || '';

      if (!extractedText) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Texto do contrato não disponível para análise XAI" });
      }

      const alertas = await analyzeContractWithXai(extractedText.slice(0, 15000));
      const acoes = await generateAcaoPlanoWithXai({ alertas });

      return { acoes, alertas };
    }),

  // Gerar Cláusulas LGPD (determinísticas)
  lgpdGerarClausulasPorAnalise: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { gerarClausulasLGPD } = await import("./lgpd");
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND", message: "Análise não encontrada" });
      if (ctx.user.organizationId !== (analysis as any).organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const map = await db.getContractAnalysisMap(input.analysisId);

      const lgpdContext = {
        A1_tipo_contrato_juridico: (map as any)?.contractType || "prestação de serviços",
        A3_papel_global_cliente: (map as any)?.lgpdAgentType === 'operador' ? 'operador' : 'controlador',
        A4_papel_global_contraparte: (map as any)?.lgpdAgentType === 'operador' ? 'controlador' : 'operador',
        B1_trata_dados_pessoais: true,
        B2_trata_dados_comuns: !!((map as any)?.commonData),
        B3_trata_dados_sensiveis: !!((map as any)?.sensitiveData),
        B4_trata_dados_sensiveis_em_larga_escala: (map as any)?.sensitiveDataLargeScale ? "sim" as const : "nao" as const,
        B6_trata_dados_criancas_0_12: !!((map as any)?.hasMinorData),
        B7_trata_dados_adolescentes_13_17: !!((map as any)?.hasMinorData),
      };

      const resultado = gerarClausulasLGPD(lgpdContext as any);
      const clausulas = (resultado.clausulas || []).map((c: any, idx: number) => ({
        clauseId: `lgpd-${c.bloco}-${idx + 1}`,
        sequenceNumber: idx + 1,
        title: c.titulo,
        content: c.texto,
        id: `lgpd-${c.bloco}-${idx + 1}`,
        titulo: c.titulo,
        conteudo: c.texto,
        aplicavel: true,
        bloco: c.bloco,
      }));

      // Salvar no banco
      if (clausulas.length > 0) {
        await db.saveContractAnalysisClauses(input.analysisId, clausulas.map((c: any) => ({
          clauseId: c.clauseId,
          sequenceNumber: c.sequenceNumber,
          title: c.title,
          content: c.content,
        })));
      }

      return { clausulas, analysis: { id: input.analysisId } };
    }),

  // Gerar Cláusulas com XAI (IA Explicável)
  generateLgpdClausesWithXai: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { analyzeContractWithXai, generateClausulaWithXai } = await import("./xai/xaiEngine");
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND", message: "Análise não encontrada" });
      if (ctx.user.organizationId !== (analysis as any).organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Buscar texto extraído
      const conn = await getDbConnOrThrow();
      const textRes = await conn.execute(sql`SELECT "extractedText" FROM contract_analyses WHERE id = ${input.analysisId}`);
      const textRows = rowsFromExecute(textRes);
      const extractedText = textRows[0]?.extractedText || '';

      if (!extractedText) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Texto do contrato não disponível para análise XAI" });
      }

      const alertas = await analyzeContractWithXai(extractedText.slice(0, 15000));
      const clausulas = [];

      for (const alerta of alertas.slice(0, 10)) {
        const clausula = await generateClausulaWithXai({
          titulo: alerta.titulo || alerta.id,
          contexto: { contractName: (analysis as any).contractName },
          alertas: [alerta],
        });
        clausulas.push(clausula);
      }

      return { clausulas, alertas };
    }),

  // Analisar com XAI
  analyzeWithXai: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { analyzeContractWithXai } = await import("./xai/xaiEngine");
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.organizationId !== (analysis as any).organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const conn = await getDbConnOrThrow();
      const textRes = await conn.execute(sql`SELECT "extractedText" FROM contract_analyses WHERE id = ${input.analysisId}`);
      const textRows = rowsFromExecute(textRes);
      const extractedText = textRows[0]?.extractedText || '';

      if (!extractedText) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Texto do contrato não disponível" });
      }

      const alertas = await analyzeContractWithXai(extractedText.slice(0, 15000));
      return { alertas };
    }),

  // Listar planos de ação de uma análise
  listActionPlans: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .query(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.organizationId !== (analysis as any).organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.getActionPlansByAssessment('contract_analysis', input.analysisId);
    }),

  // Obter cláusulas salvas
  getClauses: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .query(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.organizationId !== (analysis as any).organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.getContractAnalysisClauses(input.analysisId);
    }),

  // Atualizar mapa de análise
  updateMap: protectedProcedure
    .input(z.object({
      analysisId: z.number(),
       data: z.record(z.string(), z.any()),
    }))
    .mutation(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.organizationId !== (analysis as any).organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await db.updateContractAnalysisMap(input.analysisId, input.data as any);
      return { ok: true };
    }),
  // Atualizar item de checklist
  updateChecklistItem: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: z.record(z.string(), z.any()).optional(),
      status: z.string().optional(),
      observations: z.string().optional(),
      responsibleName: z.string().optional(),
      responsibleId: z.number().nullable().optional(),
      analysisId: z.number().optional(),
    }).passthrough())
    .mutation(async ({ input, ctx }) => {
      const { id, data, analysisId: inputAnalysisId, ...rest } = input;
      const updateData = data || rest;
      // Map 'status' to 'checklistStatus' for DB column
      if (updateData.status && !updateData.checklistStatus) {
        updateData.checklistStatus = updateData.status;
        delete updateData.status;
      }
      // Remove analysisId from updateData (not a column)
      delete (updateData as any).analysisId;
      await db.updateContractChecklistItem(id, updateData as any);

      // Buscar dados do item e da análise para e-mail e plano de ação
      let analysis: any = null;
      let checklistItem: any = null;
      if (inputAnalysisId) {
        analysis = await db.getContractAnalysisById(inputAnalysisId);
        const items = await db.getContractChecklistItems(inputAnalysisId);
        checklistItem = items.find((i: any) => i.id === id);
      }

      // Enviar e-mail ao responsável se responsibleId foi definido
      if (input.responsibleId && inputAnalysisId && analysis) {
        try {
          const { sendResponsibleAssignmentEmail } = await import('./emailService');
          const responsibleUser = await db.getUserById(input.responsibleId);
          if (responsibleUser?.email) {
            const org = await db.getOrganizationById((analysis as any).organizationId);
            await sendResponsibleAssignmentEmail({
              responsibleName: responsibleUser.name || responsibleUser.email,
              responsibleEmail: responsibleUser.email,
              itemType: 'checklist',
              itemDescription: checklistItem?.question || `Item #${id}`,
              contractName: (analysis as any).contractName || 'Contrato',
              organizationName: org?.name || 'Organização',
              assignedByName: ctx.user.name || ctx.user.email || 'Sistema',
              platformUrl: `${getAppBaseUrl()}/analise-contratos/${inputAnalysisId}`,
            });
          }
        } catch (emailError) {
          console.error('Erro ao enviar e-mail de atribuição (checklist):', emailError);
        }
      }

      // Geração automática de Plano de Ação ao preencher status do checklist
      const effectiveStatus = updateData.checklistStatus || input.status;
      if (effectiveStatus && inputAnalysisId && analysis && (effectiveStatus === 'nao' || effectiveStatus === 'parcial')) {
        try {
          const originTag = `[Origem: Checklist item #${checklistItem?.itemNumber || id} - contract_analysis:${inputAnalysisId}]`;
          // Verificar se já existe plano de ação para este item específico
          const existingPlans = await db.getActionPlansByAssessment('contract_analysis', inputAnalysisId);
          const alreadyExists = existingPlans.some((p: any) => 
            p.notes && p.notes.includes(`Checklist item #${checklistItem?.itemNumber || id} -`)
          );
          if (!alreadyExists) {
            const priorityLevel = effectiveStatus === 'nao' ? 'alta' : 'media';
            const statusLabel = effectiveStatus === 'nao' ? 'Não atendido' : 'Parcialmente atendido';
            await db.createActionPlan({
              organizationId: Number((analysis as any).organizationId),
              assessmentType: 'contract_analysis',
              assessmentId: inputAnalysisId,
              title: `Checklist: ${(checklistItem?.question || 'Item de verificação').slice(0, 255)}`,
              description: `Status: ${statusLabel}\n\n${checklistItem?.observations || input.observations || 'Adequar o contrato para atender este requisito de conformidade.'}`,
              priority: priorityLevel as any,
              status: 'pendente' as any,
              responsibleId: input.responsibleId || null,
              notes: originTag,
              dueDate: null,
            } as any);
            logger.info('[AutoActionPlan] Plano de ação criado automaticamente a partir do checklist', { itemId: id, analysisId: inputAnalysisId, status: effectiveStatus });
          }
        } catch (planError) {
          logger.warn('[AutoActionPlan] Falha ao criar plano de ação automático (checklist)', { message: String(planError) });
        }
      }

      // Se o status mudou para 'sim' (conforme), remover plano de ação pendente associado
      if (effectiveStatus === 'sim' && inputAnalysisId) {
        try {
          const existingPlans = await db.getActionPlansByAssessment('contract_analysis', inputAnalysisId);
          const relatedPlan = existingPlans.find((p: any) => 
            p.notes && p.notes.includes(`Checklist item #${checklistItem?.itemNumber || id} -`) && 
            (p.status === 'pendente' || p.status === 'em_andamento')
          );
          if (relatedPlan) {
            await db.updateActionPlan((relatedPlan as any).id, { status: 'concluida' as any, completedAt: new Date().toISOString() as any });
            logger.info('[AutoActionPlan] Plano de ação concluído automaticamente (checklist conforme)', { planId: (relatedPlan as any).id, itemId: id });
          }
        } catch (planError) {
          logger.warn('[AutoActionPlan] Falha ao concluir plano de ação automático', { message: String(planError) });
        }
      }

      return { ok: true };
    }),
  // Atualizar item de risco
  updateRiskItem: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: z.record(z.string(), z.any()).optional(),
      riskLevel: z.string().optional(),
      requiredAction: z.string().optional(),
      suggestedDeadline: z.string().optional(),
      actionStatus: z.string().optional(),
      responsibleName: z.string().optional(),
      responsibleId: z.number().nullable().optional(),
      analysisId: z.number().optional(),
    }).passthrough())
    .mutation(async ({ input, ctx }) => {
      const { id, data, analysisId: inputAnalysisId, ...rest } = input;
      const updateData = data || rest;
      // Map 'actionStatus' to 'riskActionStatus' for DB column
      if (updateData.actionStatus && !updateData.riskActionStatus) {
        updateData.riskActionStatus = updateData.actionStatus;
        delete updateData.actionStatus;
      }
      // Remove analysisId from updateData (not a column)
      delete (updateData as any).analysisId;
      await db.updateContractRiskItem(id, updateData as any);

      // Buscar dados do risco e da análise para e-mail e plano de ação
      let riskAnalysis: any = null;
      let riskItem: any = null;
      if (inputAnalysisId) {
        riskAnalysis = await db.getContractAnalysisById(inputAnalysisId);
        const riskItems = await db.getContractRiskItems(inputAnalysisId);
        riskItem = riskItems.find((r: any) => r.id === id);
      }

      // Enviar e-mail ao responsável se responsibleId foi definido
      if (input.responsibleId && inputAnalysisId && riskAnalysis) {
        try {
          const { sendResponsibleAssignmentEmail } = await import('./emailService');
          const responsibleUser = await db.getUserById(input.responsibleId);
          if (responsibleUser?.email) {
            const org = await db.getOrganizationById((riskAnalysis as any).organizationId);
            await sendResponsibleAssignmentEmail({
              responsibleName: responsibleUser.name || responsibleUser.email,
              responsibleEmail: responsibleUser.email,
              itemType: 'risco',
              itemDescription: riskItem?.riskDescription || (input as any).riskDescription || `Risco #${id}`,
              contractName: (riskAnalysis as any).contractName || 'Contrato',
              organizationName: org?.name || 'Organização',
              assignedByName: ctx.user.name || ctx.user.email || 'Sistema',
              platformUrl: `${getAppBaseUrl()}/analise-contratos/${inputAnalysisId}`,
            });
          }
        } catch (emailError) {
          console.error('Erro ao enviar e-mail de atribuição (risco):', emailError);
        }
      }

      // Geração automática de Plano de Ação ao preencher nível de risco
      const effectiveRiskLevel = input.riskLevel || (updateData as any).riskLevel || riskItem?.riskLevel;
      if (effectiveRiskLevel && inputAnalysisId && riskAnalysis && 
          (effectiveRiskLevel === 'critico' || effectiveRiskLevel === 'alto' || effectiveRiskLevel === '1' || effectiveRiskLevel === '2')) {
        try {
          const originTag = `[Origem: Matriz de Riscos item #${riskItem?.itemNumber || id} - contract_analysis:${inputAnalysisId}]`;
          // Verificar se já existe plano de ação para este risco específico
          const existingPlans = await db.getActionPlansByAssessment('contract_analysis', inputAnalysisId);
          const alreadyExists = existingPlans.some((p: any) => 
            p.notes && p.notes.includes(`Matriz de Riscos item #${riskItem?.itemNumber || id} -`)
          );
          if (!alreadyExists) {
            const priorityLevel = (effectiveRiskLevel === 'critico' || effectiveRiskLevel === '1') ? 'critica' : 'alta';
            const riskDesc = riskItem?.riskDescription || riskItem?.description || 'Risco identificado';
            await db.createActionPlan({
              organizationId: Number((riskAnalysis as any).organizationId),
              assessmentType: 'contract_analysis',
              assessmentId: inputAnalysisId,
              title: `Corrigir: ${riskDesc.slice(0, 255)}`,
              description: `${riskItem?.potentialImpact || riskItem?.impact || ''}\n\nAção requerida: ${riskItem?.requiredAction || input.requiredAction || 'Avaliar e mitigar'}`,
              priority: priorityLevel as any,
              status: 'pendente' as any,
              responsibleId: input.responsibleId || null,
              notes: originTag,
              dueDate: input.suggestedDeadline || riskItem?.suggestedDeadline || null,
            } as any);
            logger.info('[AutoActionPlan] Plano de ação criado automaticamente a partir da matriz de riscos', { itemId: id, analysisId: inputAnalysisId, riskLevel: effectiveRiskLevel });
          }
        } catch (planError) {
          logger.warn('[AutoActionPlan] Falha ao criar plano de ação automático (risco)', { message: String(planError) });
        }
      }

      // Se o risco foi rebaixado para médio/baixo/muito_baixo, concluir plano de ação pendente
      if (effectiveRiskLevel && inputAnalysisId && 
          (effectiveRiskLevel === 'medio' || effectiveRiskLevel === 'baixo' || effectiveRiskLevel === 'muito_baixo' || 
           effectiveRiskLevel === '3' || effectiveRiskLevel === '4' || effectiveRiskLevel === '5')) {
        try {
          const existingPlans = await db.getActionPlansByAssessment('contract_analysis', inputAnalysisId);
          const relatedPlan = existingPlans.find((p: any) => 
            p.notes && p.notes.includes(`Matriz de Riscos item #${riskItem?.itemNumber || id} -`) && 
            (p.status === 'pendente' || p.status === 'em_andamento')
          );
          if (relatedPlan) {
            await db.updateActionPlan((relatedPlan as any).id, { status: 'concluida' as any, completedAt: new Date().toISOString() as any });
            logger.info('[AutoActionPlan] Plano de ação concluído automaticamente (risco rebaixado)', { planId: (relatedPlan as any).id, itemId: id });
          }
        } catch (planError) {
          logger.warn('[AutoActionPlan] Falha ao concluir plano de ação automático (risco)', { message: String(planError) });
        }
      }

      return { ok: true };
    }),

  // Refinar análise
  refineAnalysis: protectedProcedure
    .input(z.object({
      analysisId: z.number(),
      refinementRequest: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const { refineContractAnalysis } = await import("./contractAnalysisService");
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.organizationId !== (analysis as any).organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const conn = await getDbConnOrThrow();
      const textRes = await conn.execute(sql`SELECT "extractedText" FROM contract_analyses WHERE id = ${input.analysisId}`);
      const textRows = rowsFromExecute(textRes);
      const extractedText = textRows[0]?.extractedText || '';

      const originalResult = (analysis as any).analysisResult ? JSON.parse((analysis as any).analysisResult) : {};
      const refined = await refineContractAnalysis(originalResult, extractedText, input.refinementRequest);

      await db.updateContractAnalysis(input.analysisId, {
        analysisResult: JSON.stringify(refined) as any,
        overallScore: (refined as any).overallScore || (analysis as any).overallScore,
        criticalRisks: refined.criticalRisks || 0,
        highRisks: refined.highRisks || 0,
        mediumRisks: refined.mediumRisks || 0,
        lowRisks: refined.lowRisks || 0,
        veryLowRisks: refined.veryLowRisks || 0,
      } as any);

      await db.createContractAnalysisHistoryEntry({
        analysisId: input.analysisId,
        historyActionType: "refinement_completed" as any,
        description: `Análise refinada: ${input.refinementRequest.slice(0, 200)}`,
        userId: ctx.user.id,
      });

      return { ok: true };
    }),

  // Revisar análise
  reviewAnalysis: protectedProcedure
    .input(z.object({
      analysisId: z.number(),
      notes: z.string().optional(),
      approved: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.organizationId !== (analysis as any).organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const newStatus = input.approved ? 'reviewed' : 'rejected';
      await db.updateContractAnalysis(input.analysisId, {
        contractAnalysisStatus: newStatus as any,
      } as any);

      await db.createContractAnalysisHistoryEntry({
        analysisId: input.analysisId,
        historyActionType: input.approved ? "reviewed" : "rejected",
        description: input.notes || (input.approved ? "Análise revisada e aprovada" : "Análise rejeitada"),
        userId: ctx.user.id,
      });

      return { ok: true };
    }),

  // Obter mapeamentos vinculados
  getLinkedMapeamentos: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .query(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.organizationId !== (analysis as any).organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const conn = await getDbConnOrThrow();
      const res = await conn.execute(sql`
        SELECT * FROM contract_mapeamento_links
        WHERE "contractAnalysisId" = ${input.analysisId}
        ORDER BY id DESC
      `);
      const links = rowsFromExecute(res);
      return links.map((link: any) => {
        let parsed = link.extractedData;
        if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch { parsed = null; } }
        // NORMALIZAÇÃO: converter dados legados (analysisMap bruto) para formato estruturado
        if (parsed && parsed.contractType && !parsed.department) {
          const am = parsed;
          parsed = {
            department: am.contractType || 'Geral',
            departmentJustification: `Identificado a partir do tipo de contrato: ${am.contractType || 'N/A'}`,
            processTitle: `Tratamento de dados - ${am.partnerName || 'Parceiro'}`,
            processDescription: am.contractObject || 'Objeto do contrato',
            processPurpose: am.contractObject || 'Finalidade do tratamento conforme contrato',
            dataCategories: [
              ...(am.commonData ? [{ name: am.commonData, sensivel: false, source: 'mapa_analise' }] : []),
              ...(am.sensitiveData ? [{ name: am.sensitiveData, sensivel: true, source: 'mapa_analise' }] : []),
            ],
            titularCategories: ['Titulares relacionados ao contrato'],
            legalBase: 'execucao_contrato',
            legalBaseJustification: 'Tratamento realizado para execução de contrato entre as partes.',
            sharing: [am.contractingParty, am.contractedParty].filter(Boolean),
            retentionPeriod: am.endDate || 'Conforme vigência do contrato',
            storageLocation: 'Sistemas do contratado',
            securityMeasures: ['Controles de acesso', 'Criptografia de dados'],
            internationalTransfer: false,
            internationalCountries: [],
            agentType: am.agentType || am.lgpdAgentType || null,
            actionPlan: am.actionPlan || null,
          };
        }
        return {
          ...link,
          extractedData: parsed,
          processTitle: parsed?.processTitle || 'Processo de Tratamento',
          processDescription: parsed?.processDescription || null,
          areaName: parsed?.department || link.identifiedDepartment || 'Não identificada',
        };
      });
    }),

  // Preview de extração de mapeamento
  previewMapeamentoExtraction: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .query(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.organizationId !== (analysis as any).organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const map = await db.getContractAnalysisMap(input.analysisId);
      if (!map) return null;
      return {
        department: (map as any).contractType || 'Geral',
        processName: (map as any).contractObject || 'Processo extraído do contrato',
        dataCategories: [(map as any).commonData, (map as any).sensitiveData].filter(Boolean),
        legalBasis: (map as any).legalBasis || 'consentimento',
      };
    }),

  // Gerar mapeamento a partir do contrato
  generateMapeamento: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.organizationId !== (analysis as any).organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const map = await db.getContractAnalysisMap(input.analysisId);
      if (!map) throw new TRPCError({ code: "NOT_FOUND", message: "Mapa de análise não encontrado" });
      return {
        ok: true,
        extractedData: {
          department: (map as any).contractType || 'Geral',
          processName: (map as any).contractObject || 'Processo extraído',
        }
      };
    }),

  // Exportar PDF
  exportPdf: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.organizationId !== (analysis as any).organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Retornar URL do relatório se já existir
      if ((analysis as any).reportUrl) {
        return { url: (analysis as any).reportUrl };
      }
      throw new TRPCError({ code: "NOT_FOUND", message: "Relatório PDF ainda não foi gerado. Aguarde a conclusão do pipeline." });
    }),

  // Histórico de auditoria de cláusulas
  getClauseAuditHistory: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .query(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.organizationId !== (analysis as any).organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.getClauseAuditHistory(input.analysisId);
    }),

  // ===== ENDPOINTS DO MapeamentoAutoEditor =====

  // Obter mapeamento draft (rascunho) para edição
  getDraftMapeamento: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .query(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.organizationId !== (analysis as any).organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const conn = await getDbConnOrThrow();
      const res = await conn.execute(sql`
        SELECT * FROM contract_mapeamento_links
        WHERE "contractAnalysisId" = ${input.analysisId}
        ORDER BY id DESC LIMIT 1
      `);
      const rows = rowsFromExecute(res);
      if (!rows.length) {
        return { status: 'not_generated' as const, canGenerate: true };
      }
      const link = rows[0] as any;
      let extractedData = link.extractedData;
      if (typeof extractedData === 'string') {
        try { extractedData = JSON.parse(extractedData); } catch { extractedData = null; }
      }

      // NORMALIZAÇÃO: converter dados legados (analysisMap bruto) para formato estruturado
      // Se extractedData tem contractType mas não tem department, é formato legado
      if (extractedData && extractedData.contractType && !extractedData.department) {
        const am = extractedData;
        extractedData = {
          department: am.contractType || 'Geral',
          departmentJustification: `Identificado automaticamente a partir do tipo de contrato: ${am.contractType || 'N/A'}`,
          processTitle: `Tratamento de dados - ${am.partnerName || 'Parceiro'}`,
          processDescription: am.contractObject || 'Objeto do contrato',
          processPurpose: am.contractObject || 'Finalidade do tratamento conforme contrato',
          dataCategories: [
            ...(am.commonData ? [{ name: am.commonData, sensivel: false, source: 'mapa_analise' }] : []),
            ...(am.sensitiveData ? [{ name: am.sensitiveData, sensivel: true, source: 'mapa_analise' }] : []),
          ],
          titularCategories: [
            'Titulares relacionados ao contrato',
            ...(am.hasMinorData ? ['Menores de idade'] : []),
            ...(am.hasElderlyData ? ['Idosos'] : []),
          ].filter(Boolean),
          legalBase: 'execucao_contrato',
          legalBaseJustification: 'Tratamento realizado para execução de contrato entre as partes.',
          sharing: [am.contractingParty, am.contractedParty].filter(Boolean),
          retentionPeriod: am.endDate || 'Conforme vigência do contrato',
          storageLocation: 'Sistemas do contratado',
          securityMeasures: [
            ...(am.securityRisks ? [`Mitigação: ${String(am.securityRisks).substring(0, 200)}`] : ['Controles de acesso']),
            'Criptografia de dados',
          ],
          internationalTransfer: false,
          internationalCountries: [],
          dataSource: 'contract_analysis',
          contractAnalysisId: input.analysisId,
          agentType: am.agentType || am.lgpdAgentType || null,
          agentTypeJustification: am.agentTypeJustification || null,
          titularRightsStatus: am.titularRightsStatus || null,
          titularRightsDetails: am.titularRightsDetails || null,
          dataEliminationStatus: am.dataEliminationStatus || null,
          dataEliminationDetails: am.dataEliminationDetails || null,
          hasProtectionClause: am.hasProtectionClause || null,
          protectionClauseDetails: am.protectionClauseDetails || null,
          suggestedClause: am.suggestedClause || null,
          legalRisks: am.legalRisks || null,
          actionPlan: am.actionPlan || null,
        };
        // Atualizar no banco para não precisar normalizar novamente
        try {
          await conn.execute(sql`
            UPDATE contract_mapeamento_links
            SET "extractedData" = ${JSON.stringify(extractedData)},
                "identifiedDepartment" = ${extractedData.department},
                "updatedAt" = NOW()
            WHERE id = ${link.id}
          `);
        } catch { /* ignora erro de update */ }
      }

      // Determinar status baseado no linkStatus
      let status: 'not_generated' | 'draft' | 'pending' | 'approved' | 'created' | 'reviewed' | 'error' = link.linkStatus || 'pending';
      if (!extractedData) status = 'not_generated';
      return {
        status,
        linkId: link.id,
        extractedData,
        identifiedDepartment: link.identifiedDepartment || extractedData?.department || null,
        extractionSource: link.extractionSource,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
        canGenerate: true,
      };
    }),

  // Atualizar mapeamento draft
  updateDraftMapeamento: protectedProcedure
    .input(z.object({
      analysisId: z.number(),
      linkId: z.number(),
      extractedData: z.any(),
    }))
    .mutation(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.organizationId !== (analysis as any).organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const conn = await getDbConnOrThrow();
      const dataStr = JSON.stringify(input.extractedData);
      const dept = (input.extractedData as any)?.department || null;
      await conn.execute(sql`
        UPDATE contract_mapeamento_links
        SET "extractedData" = ${dataStr},
            "identifiedDepartment" = ${dept},
            "updatedAt" = NOW()
        WHERE id = ${input.linkId} AND "contractAnalysisId" = ${input.analysisId}
      `);
      return { ok: true };
    }),

  // Refinar mapeamento com IA
  refineMapeamentoWithAI: protectedProcedure
    .input(z.object({
      analysisId: z.number(),
      linkId: z.number(),
      instructions: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.organizationId !== (analysis as any).organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const conn = await getDbConnOrThrow();
      // Buscar dados atuais
      const res = await conn.execute(sql`
        SELECT "extractedData" FROM contract_mapeamento_links WHERE id = ${input.linkId}
      `);
      const rows = rowsFromExecute(res);
      if (!rows.length) throw new TRPCError({ code: 'NOT_FOUND' });
      let currentData = (rows[0] as any).extractedData;
      if (typeof currentData === 'string') {
        try { currentData = JSON.parse(currentData); } catch { currentData = {}; }
      }
      // Usar IA para refinar
      const { invokeLLM } = await import('./_core/llm');
      const response = await invokeLLM({
        messages: [
          { role: 'system', content: 'Você é um especialista em LGPD e mapeamento de dados pessoais. Refine o mapeamento de dados abaixo conforme as instruções do consultor. Retorne APENAS o JSON refinado, sem explicações.' },
          { role: 'user', content: `Mapeamento atual:\n${JSON.stringify(currentData, null, 2)}\n\nInstruções de refinamento:\n${input.instructions}` },
        ],
      });
      let refinedData = currentData;
      try {
        const content = (response as any).choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) refinedData = JSON.parse(jsonMatch[0]);
      } catch { /* mantém dados originais se parsing falhar */ }
      // Salvar dados refinados
      const dataStr = JSON.stringify(refinedData);
      const dept = refinedData?.department || null;
      await conn.execute(sql`
        UPDATE contract_mapeamento_links
        SET "extractedData" = ${dataStr},
            "identifiedDepartment" = ${dept},
            "updatedAt" = NOW()
        WHERE id = ${input.linkId}
      `);
      return { refinedData, ok: true };
    }),

  // Aprovar mapeamento e incorporar ao módulo
  approveMapeamento: protectedProcedure
    .input(z.object({
      analysisId: z.number(),
      linkId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.organizationId !== (analysis as any).organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const conn = await getDbConnOrThrow();
      await conn.execute(sql`
        UPDATE contract_mapeamento_links
        SET "linkStatus" = 'approved',
            "updatedAt" = NOW()
        WHERE id = ${input.linkId} AND "contractAnalysisId" = ${input.analysisId}
      `);
      return { ok: true };
    }),

  // Regenerar mapeamento a partir da análise
  regenerateMapeamento: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.organizationId !== (analysis as any).organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Buscar mapa de análise
      const map = await db.getContractAnalysisMap(input.analysisId);
      if (!map) throw new TRPCError({ code: 'NOT_FOUND', message: 'Mapa de análise não encontrado' });
      // Gerar dados de mapeamento a partir do mapa
      const extractedData = {
        department: (map as any).contractType || 'Geral',
        departmentJustification: 'Identificado automaticamente a partir do tipo de contrato',
        processTitle: `Tratamento de dados - ${(map as any).partnerName || 'Parceiro'}`,
        processDescription: (map as any).contractObject || 'Objeto do contrato',
        processPurpose: (map as any).contractObject || 'Finalidade do tratamento',
        dataCategories: [
          ...((map as any).commonData ? [{ name: (map as any).commonData, sensivel: false, source: 'mapa_analise' }] : []),
          ...((map as any).sensitiveData ? [{ name: (map as any).sensitiveData, sensivel: true, source: 'mapa_analise' }] : []),
        ],
        titularCategories: ['Titulares relacionados ao contrato'],
        legalBase: 'execucao_contrato',
        legalBaseJustification: 'Tratamento realizado para execução de contrato.',
        sharing: [(map as any).contractingParty, (map as any).contractedParty].filter(Boolean),
        retentionPeriod: (map as any).endDate || 'Não especificado',
        storageLocation: 'Sistemas do contratado',
        securityMeasures: ['Controles de acesso', 'Criptografia de dados'],
        internationalTransfer: false,
        internationalCountries: [],
        dataSource: 'contract_analysis',
        contractAnalysisId: input.analysisId,
      };
      const dataStr = JSON.stringify(extractedData);
      const conn = await getDbConnOrThrow();
      // Verificar se já existe um link
      const existing = await conn.execute(sql`
        SELECT id FROM contract_mapeamento_links WHERE "contractAnalysisId" = ${input.analysisId} LIMIT 1
      `);
      const existingRows = rowsFromExecute(existing);
      if (existingRows.length > 0) {
        await conn.execute(sql`
          UPDATE contract_mapeamento_links
          SET "extractedData" = ${dataStr},
              "identifiedDepartment" = ${extractedData.department},
              "linkStatus" = 'pending',
              "updatedAt" = NOW()
          WHERE "contractAnalysisId" = ${input.analysisId}
        `);
      } else {
        await conn.execute(sql`
          INSERT INTO contract_mapeamento_links ("contractAnalysisId", "extractionSource", "extractedData", "identifiedDepartment", "linkStatus", "createdAt", "updatedAt")
          VALUES (${input.analysisId}, 'contract_map', ${dataStr}, ${extractedData.department}, 'pending', NOW(), NOW())
        `);
      }
      return { ok: true };
    }),

  // === Excluir análise de contrato ===
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const conn = await getDbConnOrThrow();

      // Verificar se a análise existe e pertence à organização do usuário
      const [existing] = rowsFromExecute(
        await conn.execute(sql`SELECT id, "organizationId", "contractName" FROM contract_analyses WHERE id = ${input.id}`)
      );
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Análise não encontrada." });
      }

      // Verificar permissão: admin ou consultor da mesma organização
      const userRole = ctx.user.role;
      const userOrgId = (ctx.user as any).organizationId;
      if (userRole !== 'admin_global' && userRole !== 'consultor' && existing.organizationId !== userOrgId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para excluir esta análise." });
      }

      // Excluir registros relacionados em ordem (tabelas filhas primeiro)
      await conn.execute(sql`DELETE FROM contract_analysis_history WHERE "analysisId" = ${input.id}`);
      await conn.execute(sql`DELETE FROM contract_analysis_clauses WHERE "analysisId" = ${input.id}`);
      await conn.execute(sql`DELETE FROM contract_analysis_maps WHERE "analysisId" = ${input.id}`);
      await conn.execute(sql`DELETE FROM contract_clause_versions WHERE "analysisId" = ${input.id}`);
      await conn.execute(sql`DELETE FROM clause_audit_log WHERE "analysisId" = ${input.id}`);
      // action_plans usa assessmentId + assessmentType para referenciar a análise
      await conn.execute(sql`DELETE FROM action_plan_evidence WHERE "actionPlanId" IN (SELECT id FROM action_plans WHERE "assessmentType" = 'contract_analysis' AND "assessmentId" = ${input.id})`);
      await conn.execute(sql`DELETE FROM action_plans WHERE "assessmentType" = 'contract_analysis' AND "assessmentId" = ${input.id}`);
      await conn.execute(sql`DELETE FROM contract_mapeamento_links WHERE "contractAnalysisId" = ${input.id}`);
      await conn.execute(sql`DELETE FROM contract_analysis_outputs_manifest WHERE "analysisId" = ${input.id}`);
      await conn.execute(sql`DELETE FROM contract_share_tokens WHERE "analysisId" = ${input.id}`);
      await conn.execute(sql`DELETE FROM dpa_approvals WHERE "analysisId" = ${input.id}`);
      await conn.execute(sql`DELETE FROM dpa_approval_requests WHERE "analysisId" = ${input.id}`);

      // Excluir a análise principal
      await conn.execute(sql`DELETE FROM contract_analyses WHERE id = ${input.id}`);

      logger.info("Análise excluída", {
        analysisId: input.id,
        contractName: existing.contractName,
        deletedBy: ctx.user.id,
      });

      return { success: true };
    }),

  // Adicionar evidência a uma ação do plano
  addActionEvidence: protectedProcedure
    .input(z.object({
      actionPlanId: z.number(),
      documentId: z.number().optional(),
      description: z.string().optional(),
      fileUrl: z.string().optional(),
      fileName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Validar que o plano de ação pertence à organização do usuário via SQL
      const conn = await getDbConnOrThrow();
      const planRes = await conn.execute(sql`SELECT "organizationId" FROM action_plans WHERE id = ${input.actionPlanId} LIMIT 1`);
      const planRows = rowsFromExecute(planRes);
      if (!planRows.length) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.organizationId !== planRows[0].organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const evidenceId = await db.addActionPlanEvidence({
        actionPlanId: input.actionPlanId,
        documentId: input.documentId || 0,
        description: input.description || null,
        addedById: ctx.user.id,
      });
      return { id: evidenceId };
    }),

  // Listar evidências de uma ação
  getActionEvidences: protectedProcedure
    .input(z.object({ actionPlanId: z.number() }))
    .query(async ({ input, ctx }) => {
      const conn = await getDbConnOrThrow();
      const planRes = await conn.execute(sql`SELECT "organizationId" FROM action_plans WHERE id = ${input.actionPlanId} LIMIT 1`);
      const planRows = rowsFromExecute(planRes);
      if (!planRows.length) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.organizationId !== planRows[0].organizationId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.getActionPlanEvidences(input.actionPlanId);
    }),

  // ==================== Rastreabilidade - EvidencePack (Termo 1) ====================
  getEvidencePack: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .query(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
      const orgId = (analysis as any).organizationId;
      if (ctx.user.organizationId !== orgId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Buscar governanceMetadata que contém os metadados de rastreabilidade
      const conn = await getDbConnOrThrow();
      const rows = rowsFromExecute(await conn.execute(sql`
        SELECT "governanceMetadata", "aiResponse", "extractedText"
        FROM contract_analyses WHERE id = ${input.analysisId} LIMIT 1
      `));
      const row = rows[0];
      if (!row) return { traces: [], chunks: [], documentMeta: null };

      // Extrair fieldEvidence do aiResponse
      let aiResponse: any = null;
      try {
        aiResponse = typeof row.aiResponse === 'string' ? JSON.parse(row.aiResponse) : row.aiResponse;
      } catch {}

      const fieldEvidence = aiResponse?.analysisMap?.fieldEvidence || {};

      // Construir traces a partir do fieldEvidence
      const traces = Object.entries(fieldEvidence).map(([fieldName, ev]: [string, any]) => ({
        fieldName,
        excerpt: ev?.excerpt || '',
        clauseRef: ev?.clauseRef || null,
        sourceChunkId: null,
        confidence: ev?.confidence ?? 70,
        reasoning: ev?.note || null,
        legalBasis: null,
      })).filter(t => t.excerpt && t.excerpt.length > 0);

      // Metadados do documento
      let governanceMeta: any = null;
      try {
        governanceMeta = typeof row.governanceMetadata === 'string' ? JSON.parse(row.governanceMetadata) : row.governanceMetadata;
      } catch {}

      const textLength = row.extractedText ? String(row.extractedText).length : 0;

      const documentMeta = governanceMeta ? {
        originalLength: textLength,
        reducedLength: Math.round(textLength * 0.7),
        chunksTotal: governanceMeta.auditableChunksCount || 0,
        chunksSelected: Math.round((governanceMeta.auditableChunksCount || 0) * 0.6),
        reductionRatio: 0.7,
      } : null;

      return { traces, chunks: [], documentMeta };
    }),

  // ==================== DPPA - Documento Pronto + Plano de Ação (Framework Seusdados) ====================
  getDPPA: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .query(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
      const orgId = (analysis as any).organizationId;
      if (ctx.user.organizationId !== orgId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const conn = await getDbConnOrThrow();

      // Buscar dados brutos
      const map = rowsFromExecute(await conn.execute(sql`SELECT * FROM contract_analysis_maps WHERE "analysisId" = ${input.analysisId} LIMIT 1`))[0] ?? null;
      const checklist = rowsFromExecute(await conn.execute(sql`SELECT * FROM contract_checklist_items WHERE "analysisId" = ${input.analysisId}`));
      const risks = rowsFromExecute(await conn.execute(sql`SELECT * FROM contract_risk_items WHERE "analysisId" = ${input.analysisId}`));
      let clauses: any[] = [];
      try {
        clauses = rowsFromExecute(await conn.execute(sql`SELECT * FROM contract_analysis_clauses WHERE "analysisId" = ${input.analysisId} ORDER BY "sequenceNumber" ASC`));
      } catch {}
      let actionPlans: any[] = [];
      try {
        actionPlans = rowsFromExecute(await conn.execute(sql`SELECT * FROM action_plans WHERE "assessmentType" = 'contract_analysis' AND "assessmentId" = ${input.analysisId} ORDER BY id ASC`));
      } catch {}

      // Framework F1-F9: mapear blocos de análise para módulos
      const FRAMEWORK_MODULES = [
        { code: "F1", name: "Quem Faz o Quê", blocks: [1, 14] },
        { code: "F2", name: "Para Quê Usam os Dados", blocks: [2, 3] },
        { code: "F3", name: "Quais Dados São Tratados", blocks: [4, 5] },
        { code: "F4", name: "Proteção e Segurança", blocks: [6, 12] },
        { code: "F5", name: "Quem Mais Tem Acesso", blocks: [7, 8, 9] },
        { code: "F6", name: "Direitos das Pessoas", blocks: [11] },
        { code: "F7", name: "Registro e Documentação", blocks: [10, 13] },
        { code: "F8", name: "Ciclo de Vida dos Dados", blocks: [16, 18] },
        { code: "F9", name: "Governança e Responsabilidade", blocks: [15, 17] },
      ];

      function getModuleForBlock(block: number): string {
        for (const m of FRAMEWORK_MODULES) {
          if (m.blocks.includes(block)) return m.code;
        }
        return "F9";
      }

      // Traduzir riscos em problemas para leigos
      const problems = risks.map((risk: any, idx: number) => {
        const block = Number(risk.analysisBlock) || 0;
        const moduleCode = getModuleForBlock(block);
        const level = String(risk.riskLevel);
        const severityMap: Record<string, string> = { "1": "critico", "2": "alto", "3": "medio", "4": "baixo", "5": "muito_baixo" };
        return {
          problemId: `P-${String(idx + 1).padStart(3, '0')}`,
          frameworkModule: moduleCode,
          title: risk.contractArea || risk.riskDescription?.substring(0, 80) || `Problema ${idx + 1}`,
          layDescription: risk.riskDescription || "Problema identificado na análise do contrato.",
          everydayExample: risk.potentialImpact || "Se não corrigido, pode gerar multas ou exposição de dados pessoais.",
          severity: severityMap[level] || "medio",
          legalRef: risk.legalReference || "Lei Geral de Proteção de Dados (Lei 13.709/2018)",
          contractExcerpt: risk.contractExcerpt || null,
          traceId: null,
        };
      });

      // Traduzir action_plans em soluções para leigos
      const solutions = actionPlans.map((ap: any, idx: number) => {
        const relatedProblem = problems[idx] || problems[0];
        const steps = ap.description
          ? ap.description.split(/[.;]/).filter((s: string) => s.trim().length > 5).slice(0, 5).map((s: string) => s.trim())
          : ["Revisar o contrato com o departamento jurídico"];
        return {
          solutionId: `S-${String(idx + 1).padStart(3, '0')}`,
          problemId: relatedProblem?.problemId || `P-${String(idx + 1).padStart(3, '0')}`,
          title: ap.title || `Ação ${idx + 1}`,
          layDescription: ap.description || "Ação corretiva recomendada.",
          practicalSteps: steps,
          suggestedDeadline: ap.deadline || "30 dias",
          priority: ap.priority || 3,
          modelClauseId: null,
        };
      });

      // Traduzir cláusulas para formato copiável
      const copyableClauses = clauses.map((c: any, idx: number) => ({
        clauseId: c.clauseId || `CL-${String(idx + 1).padStart(3, '0')}`,
        sequenceNumber: c.sequenceNumber || idx + 1,
        title: c.title || `Cláusula ${idx + 1}`,
        content: c.content || "",
        frameworkModule: getModuleForBlock(Number(c.analysisBlock) || 0),
        problemId: problems[idx]?.problemId || null,
        necessity: c.isApplicable ? "obrigatoria" : "recomendada",
        version: 1,
        isAccepted: c.isAccepted ?? true,
      }));

      // Checklist não-conforme como problemas adicionais
      const checklistProblems = checklist
        .filter((item: any) => (item.checklistStatus || item.status) === 'nao')
        .map((item: any, idx: number) => {
          const block = Number(item.analysisBlock || item.itemNumber) || 0;
          return {
            problemId: `PC-${String(idx + 1).padStart(3, '0')}`,
            frameworkModule: getModuleForBlock(block),
            title: item.question?.substring(0, 80) || `Item ${item.itemNumber}`,
            layDescription: item.observations || item.question || "Item não conforme no checklist de análise.",
            everydayExample: "Este item não foi encontrado no contrato e precisa ser incluído para garantir a proteção dos dados.",
            severity: "medio",
            legalRef: "Lei Geral de Proteção de Dados (Lei 13.709/2018)",
            contractExcerpt: item.contractExcerpt || null,
            traceId: null,
          };
        });

      const allProblems = [...problems, ...checklistProblems];

      return {
        analysisId: input.analysisId,
        executiveSummaryLay: (analysis as any).executiveSummary || null,
        complianceScore: (analysis as any).complianceScore ?? null,
        problems: allProblems,
        solutions,
        clauses: copyableClauses,
        checklistVersion: (analysis as any).checklistVersion || "v2.0.0",
        generatedAt: new Date().toISOString(),
      };
    }),

  // ==================== EXPORTAÇÃO CARTA SIMPLIFICADA ====================
  exportLetter: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Reutilizar a mesma abordagem do getDPPA - buscar das tabelas reais
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND", message: "Análise não encontrada" });
      const orgId = (analysis as any).organizationId;
      if (ctx.user.organizationId !== orgId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const conn = await getDbConnOrThrow();

      // Buscar organização
      let orgName = "";
      if (orgId) {
        const orgRows = rowsFromExecute(await conn.execute(sql`SELECT name FROM organizations WHERE id = ${orgId}`));
        orgName = orgRows[0]?.name || "";
      }

      // Buscar dados das tabelas reais (mesma abordagem do getDPPA)
      const risks = rowsFromExecute(await conn.execute(sql`SELECT * FROM contract_risk_items WHERE "analysisId" = ${input.analysisId}`));
      let clauses: any[] = [];
      try {
        clauses = rowsFromExecute(await conn.execute(sql`SELECT * FROM contract_analysis_clauses WHERE "analysisId" = ${input.analysisId} ORDER BY "sequenceNumber" ASC`));
      } catch {}
      let actionPlans: any[] = [];
      try {
        actionPlans = rowsFromExecute(await conn.execute(sql`SELECT * FROM action_plans WHERE "assessmentType" = 'contract_analysis' AND "assessmentId" = ${input.analysisId} ORDER BY id ASC`));
      } catch {}

      // Framework F1-F9: mapear blocos de análise para módulos
      const FRAMEWORK_MODULES = [
        { code: "F1", name: "Quem Faz o Quê", blocks: [1, 14] },
        { code: "F2", name: "Para Quê Usam os Dados", blocks: [2, 3] },
        { code: "F3", name: "Quais Dados São Tratados", blocks: [4, 5] },
        { code: "F4", name: "Proteção e Segurança", blocks: [6, 12] },
        { code: "F5", name: "Quem Mais Tem Acesso", blocks: [7, 8, 9] },
        { code: "F6", name: "Direitos das Pessoas", blocks: [11] },
        { code: "F7", name: "Registro e Documentação", blocks: [10, 13] },
        { code: "F8", name: "Ciclo de Vida dos Dados", blocks: [16, 18] },
        { code: "F9", name: "Governança e Responsabilidade", blocks: [15, 17] },
      ];

      function getModuleForBlock(block: number): string {
        for (const m of FRAMEWORK_MODULES) {
          if (m.blocks.includes(block)) return m.code;
        }
        return "F9";
      }

      // Traduzir riscos em problemas para leigos (mesma lógica do getDPPA)
      const problems = risks.map((risk: any, idx: number) => {
        const block = Number(risk.analysisBlock) || 0;
        const moduleCode = getModuleForBlock(block);
        const level = String(risk.riskLevel);
        const severityMap: Record<string, string> = { "1": "critico", "2": "alto", "3": "medio", "4": "baixo", "5": "muito_baixo" };
        return {
          problemId: `P-${String(idx + 1).padStart(3, '0')}`,
          frameworkModule: moduleCode,
          title: risk.contractArea || risk.riskDescription?.substring(0, 80) || `Problema ${idx + 1}`,
          layDescription: risk.riskDescription || "Problema identificado na análise do contrato.",
          everydayExample: risk.potentialImpact || "Se não corrigido, pode gerar multas ou exposição de dados pessoais.",
          severity: severityMap[level] || "medio",
          legalRef: risk.legalReference || "Lei Geral de Proteção de Dados (Lei 13.709/2018)",
          contractExcerpt: risk.contractExcerpt || null,
        };
      });

      // Traduzir soluções a partir de ações e recomendações dos riscos
      const solutions = risks.map((risk: any, idx: number) => {
        const block = Number(risk.analysisBlock) || 0;
        const moduleCode = getModuleForBlock(block);
        const level = String(risk.riskLevel);
        const severityMap: Record<string, string> = { "1": "critico", "2": "alto", "3": "medio", "4": "baixo", "5": "muito_baixo" };
        const sev = severityMap[level] || "medio";
        return {
          solutionId: `S-P-${String(idx + 1).padStart(3, '0')}`,
          problemId: `P-${String(idx + 1).padStart(3, '0')}`,
          title: `Correção: ${(risk.contractArea || risk.riskDescription?.substring(0, 60) || `Problema ${idx + 1}`)}`,
          layDescription: risk.recommendation || risk.mitigationMeasure || "Revisar e corrigir o contrato conforme a legislação.",
          practicalSteps: risk.recommendation ? [risk.recommendation] : ["Revisar o contrato", "Adequar conforme a legislação"],
          suggestedDeadline: sev === "critico" ? "15 dias" : sev === "alto" ? "30 dias" : "60 dias",
          priority: sev === "critico" ? 1 : sev === "alto" ? 2 : sev === "medio" ? 3 : 4,
        };
      });

      // Cláusulas copiáveis
      const copyableClauses = clauses.map((cl: any, idx: number) => {
        const block = Number(cl.analysisBlock) || 0;
        return {
          clauseId: `CL-${String(idx + 1).padStart(3, '0')}`,
          sequenceNumber: cl.sequenceNumber || idx + 1,
          title: cl.title || cl.clauseTitle || `Cláusula ${idx + 1}`,
          content: cl.content || cl.clauseContent || cl.suggestedText || "",
          frameworkModule: getModuleForBlock(block),
          problemId: null,
          necessity: cl.necessity || "recomendada",
        };
      });

      // Gerar HTML e PDF
      const { generateLetterHtml } = await import('./contractLetterExportService');
      const { generatePDF } = await import('./pdfService');

      const html = generateLetterHtml({
        contractName: (analysis as any).contractName || (analysis as any).name || 'Contrato',
        organizationName: orgName,
        complianceScore: (analysis as any).complianceScore ?? null,
        executiveSummary: (analysis as any).executiveSummary || null,
        problems,
        solutions,
        clauses: copyableClauses,
        generatedAt: new Date().toISOString(),
      });

      const pdf = await generatePDF(html);

      // Upload para S3
      const { storagePut } = await import('./storage');
      const timestamp = Date.now();
      const fileKey = `contract-letters/${input.analysisId}/carta-simplificada-${timestamp}.pdf`;
      const { url: pdfUrl } = await storagePut(fileKey, pdf, 'application/pdf');

      // Também salvar o HTML
      const htmlKey = `contract-letters/${input.analysisId}/carta-simplificada-${timestamp}.html`;
      const { url: htmlUrl } = await storagePut(htmlKey, Buffer.from(html, 'utf-8'), 'text/html');

      logger.info('[LETTER-EXPORT] Carta simplificada exportada', {
        analysisId: input.analysisId,
        pdfSize: pdf.length,
        htmlSize: html.length,
        problemCount: problems.length,
        clauseCount: copyableClauses.length,
      });

      return {
        pdfUrl,
        htmlUrl,
        fileName: `carta-simplificada-${(analysis as any).contractName || 'contrato'}-${timestamp}.pdf`,
        problemCount: problems.length,
        clauseCount: copyableClauses.length,
        solutionCount: solutions.length,
      };
    }),

  // ==================== RELATÓRIO PREMIUM HTML ====================
  exportPremiumHtml: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND", message: "Análise não encontrada" });
      const orgId = (analysis as any).organizationId;
      if (ctx.user.organizationId !== orgId && ctx.user.role !== "admin_global") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const conn = await getDbConnOrThrow();

      // Buscar organização
      let orgName = "";
      if (orgId) {
        const orgRows = rowsFromExecute(await conn.execute(sql`SELECT name FROM organizations WHERE id = ${orgId}`));
        orgName = orgRows[0]?.name || "";
      }

      // Buscar dados das tabelas reais
      const mapRow = rowsFromExecute(await conn.execute(sql`SELECT * FROM contract_analysis_maps WHERE "analysisId" = ${input.analysisId} LIMIT 1`))[0] ?? null;
      const checklistRows = rowsFromExecute(await conn.execute(sql`SELECT * FROM contract_checklist_items WHERE "analysisId" = ${input.analysisId}`));
      const riskRows = rowsFromExecute(await conn.execute(sql`SELECT * FROM contract_risk_items WHERE "analysisId" = ${input.analysisId}`));

      // Montar analysisMap
      const analysisMap: Record<string, string | null> = {};
      if (mapRow) {
        const mapData = typeof mapRow.data === 'string' ? JSON.parse(mapRow.data) : mapRow.data;
        if (mapData && typeof mapData === 'object') {
          for (const [key, val] of Object.entries(mapData)) {
            analysisMap[key] = val as string | null;
          }
        }
      }

      // Montar checklist
      const checklist = checklistRows.map((item: any) => ({
        item: item.itemDescription || item.description || item.title || 'Item de verificação',
        status: (item.status === 'conforme' || item.status === 'parcial' || item.status === 'nao_conforme' || item.status === 'nao_aplicavel')
          ? item.status as 'conforme' | 'parcial' | 'nao_conforme' | 'nao_aplicavel'
          : 'nao_conforme' as const,
        observation: item.observation || item.notes || undefined,
      }));

      // Montar riscos
      const risks = riskRows.map((risk: any) => ({
        description: risk.riskDescription || risk.description || 'Risco identificado',
        level: risk.riskLevel === 1 ? 'Crítico' : risk.riskLevel === 2 ? 'Alto' : risk.riskLevel === 3 ? 'Médio' : risk.riskLevel === 4 ? 'Baixo' : 'Muito Baixo',
        area: risk.contractArea || risk.area || 'Geral',
        action: risk.recommendation || risk.mitigationMeasure || 'Revisar e adequar',
      }));

      const html = generateContractAnalysisPremiumReport({
        organizationName: orgName || 'Organização',
        contractName: (analysis as any).contractName || (analysis as any).name || 'Contrato',
        analysisDate: new Date((analysis as any).createdAt || Date.now()).toISOString(),
        complianceScore: (analysis as any).complianceScore || 0,
        executiveSummary: (analysis as any).executiveSummary || 'Resumo executivo não disponível.',
        analysisMap,
        checklist,
        risks,
        consultantName: ctx.user.name || 'Consultor Seusdados',
        consultantEmail: ctx.user.email || 'dpo@seusdados.com',
      });

      logger.info('[PREMIUM-REPORT] Relatório premium de análise de contrato gerado', {
        analysisId: input.analysisId,
        htmlSize: html.length,
        checklistCount: checklist.length,
        riskCount: risks.length,
      });

      return {
        html,
        filename: `relatorio-contrato-premium-${input.analysisId}.html`,
      };
    }),

  // ==================== SINCRONIZAÇÃO DE CAMADAS ====================
  getLayerSync: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .query(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
      const orgId = (analysis as any).organizationId;
      if (ctx.user.organizationId !== orgId && ctx.user.role !== "admin_global" && ctx.user.role !== "consultor") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return syncLayers(input.analysisId);
    }),

  // Salvar decisão por risco
  saveRiskDecision: protectedProcedure
    .input(z.object({
      riskId: z.number(),
      decision: z.enum(["capitulo_lgpd", "celebrar_dpa", "aditamento", "risco_assumido", "em_negociacao"]).nullable(),
      decisionNotes: z.string().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await saveRiskDecision(input.riskId, input.decision as RiskDecision, input.decisionNotes || null);
      logger.info("[Router] Decisão de risco salva", { riskId: input.riskId, decision: input.decision, userId: ctx.user.id });
      return { success: true };
    }),

  // Aplicar recalibração de severidade
  applyRecalibration: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
      const orgId = (analysis as any).organizationId;
      if (ctx.user.organizationId !== orgId && ctx.user.role !== "admin_global" && ctx.user.role !== "consultor") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const result = await applyRecalibration(input.analysisId);
      return result;
    }),

  // Documento consolidado por decisão
  getConsolidatedDocument: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .query(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
      const orgId = (analysis as any).organizationId;
      if (ctx.user.organizationId !== orgId && ctx.user.role !== "admin_global" && ctx.user.role !== "consultor") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const sync = await syncLayers(input.analysisId);
      return generateConsolidatedDocument(sync.risks);
    }),

  // Melhorias automáticas no mapa
  enhanceMap: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const analysis = await db.getContractAnalysisById(input.analysisId);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
      const orgId = (analysis as any).organizationId;
      if (ctx.user.organizationId !== orgId && ctx.user.role !== "admin_global" && ctx.user.role !== "consultor") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const conn = await getDbConnOrThrow();

      // Buscar mapa atual
      const mapRow = rowsFromExecute(await conn.execute(sql`SELECT * FROM contract_analysis_maps WHERE "analysisId" = ${input.analysisId} LIMIT 1`))[0];
      if (!mapRow) throw new TRPCError({ code: "NOT_FOUND", message: "Mapa de análise não encontrado" });

      const mapData = typeof mapRow.data === 'string' ? JSON.parse(mapRow.data) : (mapRow.data || {});

      // Buscar texto extraído para análise de vigência
      const contractText = (analysis as any).extractedText || null;

      // Aplicar melhorias
      const result = enhanceAnalysisMap(mapData, contractText);

      // Salvar mapa melhorado
      await conn.execute(
        sql`UPDATE contract_analysis_maps SET data = ${JSON.stringify(result.enhancedMap)}, "updatedAt" = NOW() WHERE "analysisId" = ${input.analysisId}`
      );

      logger.info("[MapEnhancer] Mapa melhorado", {
        analysisId: input.analysisId,
        enhancements: result.enhancements,
      });

      return {
        enhancedMap: result.enhancedMap,
        lgpdRole: result.lgpdRole,
        dateExtraction: result.dateExtraction,
        personalData: result.personalData,
        enhancements: result.enhancements,
      };
    }),

  // ========== Upload direto + análise (sem GED prévio) ==========
  uploadAndAnalyze: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      contractName: z.string().min(1),
      fileData: z.string(), // Base64
      fileName: z.string(),
      mimeType: z.string().optional().default('application/pdf'),
    }))
    .mutation(async ({ input, ctx }) => {
      logger.info('[contractAnalysisRouter] uploadAndAnalyze CALLED', {
        organizationId: input.organizationId,
        contractName: input.contractName,
        fileName: input.fileName,
        userId: ctx.user.id,
      });

      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas consultores podem fazer upload de contratos' });
      }

      const user: gedService.GedUser = {
        id: ctx.user.id,
        role: ctx.user.role as gedService.UserRole,
        organizationId: ctx.user.organizationId,
      };

      // Buscar ou criar pasta "Contratos" no GED do cliente
      const folder = await gedService.getOrCreateClientFolder(user, input.organizationId, "Contratos");

      // Fazer upload do documento para o GED
      const buffer = Buffer.from(input.fileData, 'base64');
      const document = await gedService.uploadDocument(user, {
        name: input.contractName,
        description: 'Contrato enviado para análise LGPD',
        folderId: folder.id,
        file: buffer,
        fileName: input.fileName,
        mimeType: input.mimeType || 'application/pdf',
        tags: ['contrato', 'lgpd', 'análise'],
      });

      logger.info('[contractAnalysisRouter] Document uploaded to GED', {
        documentId: document.id,
        folderId: folder.id,
      });

      // Criar análise de contrato (status queued para o worker processar)
      const analysisId = await db.createContractAnalysis({
        organizationId: input.organizationId,
        documentId: document.id,
        contractName: input.contractName,
        contractAnalysisStatus: 'queued' as any,
        progress: 0,
        createdById: ctx.user.id,
      } as any);

      await db.createContractAnalysisHistoryEntry({
        analysisId,
        historyActionType: 'created',
        description: 'Análise criada via upload direto e enfileirada.',
        userId: ctx.user.id,
      });

      // Enfileirar para o worker processar
      try {
        await analysisQueue.enqueueAnalysis({
          analysisId,
          organizationId: input.organizationId,
          documentId: document.id,
          contractName: input.contractName,
          organizationName: 'Cliente',
          userId: ctx.user.id,
        });

        logger.info('[contractAnalysisRouter] uploadAndAnalyze enqueued', { analysisId });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.error('[contractAnalysisRouter] uploadAndAnalyze enqueue failed', { analysisId, error: msg });

        await db.updateContractAnalysis(analysisId, {
          contractAnalysisStatus: 'error' as any,
          progress: 0,
          errorCode: 'ENQUEUE_ERROR' as any,
          errorMessage: `Falha ao enfileirar: ${msg}`,
          finishedAt: new Date().toISOString(),
        } as any);

        await db.createContractAnalysisHistoryEntry({
          analysisId,
          historyActionType: 'analysis_error',
          description: `Falha ao enfileirar análise: ${msg}`,
          userId: ctx.user.id,
        });

        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao iniciar análise.' });
      }

      // Log de atividade
      try {
        const { logActivity } = await import('./dashboardRouter');
        await logActivity({
          organizationId: input.organizationId,
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email,
          activityType: 'contrato_enviado',
          module: 'contratos',
          description: `Contrato enviado para análise: ${input.contractName}`,
          entityType: 'contract_analysis',
          entityId: analysisId,
          entityName: input.contractName,
        });
      } catch (e) { /* silencioso */ }

      return {
        id: analysisId,
        analysisId,
        documentId: document.id,
        contractAnalysisStatus: 'queued',
        progress: 0,
        jobId: `upload-${analysisId}`,
      };
    }),

  getStats: protectedProcedure
    .input(z.object({ organizationId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const database = await getDbConnOrThrow();
      const orgId = input?.organizationId ?? ctx.user.organizationId;

      const result = await database.execute(sql`
        SELECT
          "contractAnalysisStatus" as status,
          COUNT(*)::int as count
        FROM contract_analyses
        WHERE (${orgId}::int IS NULL OR "organizationId" = ${orgId})
        GROUP BY "contractAnalysisStatus"
      `);

      const rows = rowsFromExecute(result);
      const stats: Record<string, number> = {
        total: 0, pending: 0, analyzing: 0, completed: 0,
        reviewed: 0, approved: 0, rejected: 0, error: 0, queued: 0
      };
      for (const row of rows) {
        const s = row.status as string;
        if (s in stats) stats[s] = Number(row.count);
        stats.total += Number(row.count);
      }
      return stats;
    }),
});
