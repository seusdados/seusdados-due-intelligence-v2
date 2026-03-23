import { logger } from "./_core/logger";
// server/rotRouter.ts
import { router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import * as rotService from "./rotService";
import * as ropaExportService from "./ropaExportService";
import * as mapeamentoGedService from "./mapeamentoGedService";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import * as db from "./db";
import { riskAnalyses, riskActionPlans, mapeamentoResponses, mapeamentoRespondents } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

// Validação com Zod
const dataCategorySchema = z.object({
  name: z.string().min(1),
  sensivel: z.boolean().default(false),
});

const createRotSchema = z.object({
  organizationId: z.number().positive(),
  title: z.string().min(1),
  description: z.string().optional(),
  department: z.string().optional(),
  titularCategory: z.string().min(1),
  dataCategories: z.array(dataCategorySchema).min(1),
  purpose: z.string().min(1),
  legalBase: z.string().min(1),
  requiresConsent: z.preprocess(
    (val) => !!val,
    z.boolean()
  ),
  alternativeBases: z.array(z.string()).optional(),
  risksIfNoConsent: z.array(z.string()).optional(),
  justification: z.string().optional(),
});

const updateRotSchema = z.object({
  id: z.number().positive(),
  title: z.string().optional(),
  description: z.string().optional(),
  department: z.string().optional(),
  titularCategory: z.string().optional(),
  dataCategories: z.array(dataCategorySchema).optional(),
  purpose: z.string().optional(),
  legalBase: z.string().optional(),
  requiresConsent: z.boolean().optional(),
  status: z.enum(["rascunho", "em_revisao", "aprovado", "arquivado"]).optional(),
  approvedById: z.number().optional(),
});

const assignTaskSchema = z.object({
  rotId: z.number().positive(),
  assigneeId: z.number().positive(),
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["baixa", "media", "alta", "critica"]),
});

export const rotRouter = router({
  // Listar ROTs por organização
  list: protectedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      // Verificar acesso à organização
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return rotService.listRots(input.organizationId);
    }),

  // Obter recomendações do ROT
  getRecommendations: protectedProcedure
    .input(z.object({ rotId: z.number().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      // Buscar análises de risco vinculadas ao ROT (via responses)
      const analyses = await db
        .select()
        .from(riskAnalyses)
        .where(
          and(
            eq(riskAnalyses.sourceType, "response"),
            eq(riskAnalyses.status, "pendente")
          )
        )
        .orderBy(desc(riskAnalyses.createdAt))
        .limit(50);
      
      // Buscar planos de ação para cada análise
      const recommendations: any[] = [];
      for (const analysis of analyses) {
        const actions = await db
          .select()
          .from(riskActionPlans)
          .where(eq(riskActionPlans.analysisId, analysis.id));
        
        for (const action of actions) {
          recommendations.push({
            id: action.id,
            title: action.title,
            description: action.description,
            priority: action.priority,
            status: action.status,
            dueDate: action.dueDate,
            riskLevel: analysis.riskLevel,
            riskScore: analysis.riskScore,
            createdAt: action.createdAt,
          });
        }
      }
      
      // Se não houver recomendações das análises, gerar recomendações padrão baseadas no ROT
      if (recommendations.length === 0) {
        const rot = await rotService.getRotByIdSimple(input.rotId);
        if (rot) {
          const dataCategories = (rot.dataCategories || []) as any[];
          const hasSensitiveData = dataCategories.some((d: any) => d.sensivel);
          
          // Recomendações padrão baseadas nos dados do ROT
          if (hasSensitiveData) {
            recommendations.push({
              id: 0,
              title: "Implementar medidas de segurança reforçadas para dados sensíveis",
              description: "Conforme art. 46 da LGPD, dados sensíveis requerem medidas técnicas e administrativas aptas a proteger os dados pessoais.",
              priority: "alta",
              status: "pendente",
              riskLevel: "alta",
              createdAt: new Date().toISOString(),
            });
          }
          
          if (rot.requiresConsent) {
            recommendations.push({
              id: 0,
              title: "Implementar mecanismo de coleta de consentimento",
              description: "O tratamento requer consentimento do titular conforme art. 7º, I da LGPD. Implemente formulário de consentimento claro e específico.",
              priority: "alta",
              status: "pendente",
              riskLevel: "media",
              createdAt: new Date().toISOString(),
            });
          }
          
          if (!rot.legalBase || rot.legalBase === "Consentimento") {
            recommendations.push({
              id: 0,
              title: "Documentar base legal alternativa",
              description: "Considere documentar bases legais alternativas para o tratamento, como legítimo interesse ou execução de contrato.",
              priority: "media",
              status: "pendente",
              riskLevel: "baixa",
              createdAt: new Date().toISOString(),
            });
          }
          
          // Recomendação geral de revisão periódica
          recommendations.push({
            id: 0,
            title: "Agendar revisão periódica do tratamento",
            description: "Estabeleça uma rotina de revisão periódica (anual) para verificar se o tratamento continua necessário e adequado.",
            priority: "baixa",
            status: "pendente",
            riskLevel: "baixa",
            createdAt: new Date().toISOString(),
          });
        }
      }
      
      return recommendations;
    }),

  // Obter ROT por ID
  getById: protectedProcedure
    .input(z.object({ 
      id: z.number().positive()
    }))
    .query(async ({ input, ctx }) => {
      const rot = await rotService.getRotByIdSimple(input.id);
      if (!rot) {
        throw new TRPCError({ code: "NOT_FOUND", message: "ROT não encontrado" });
      }
      // Verificar permissão
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== rot.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return rot;
    }),

  // Criar ROT manualmente
  create: protectedProcedure
    .input(createRotSchema)
    .mutation(async ({ input, ctx }) => {
      const rotId = await rotService.createRot({
        ...input,
        requiresConsent: input.requiresConsent ?? false,
        createdById: ctx.user.id,
      });
      return { id: rotId };
    }),

  // Gerar ROT com IA
  generateWithIA: protectedProcedure
    .input(
      z.object({
        organizationId: z.number().positive(),
        title: z.string().min(1),
        activityDescription: z.string().min(10),
        titularCategory: z.string().min(1),
        department: z.string().optional(),
        dataCategories: z.array(dataCategorySchema).min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { activityDescription, titularCategory, dataCategories, organizationId, title, department } = input;

      // Analisar com IA
      const analysis = await rotService.analyzeWithAI(
        activityDescription,
        dataCategories,
        titularCategory
      );

      // Criar ROT com dados da IA
      const rotId = await rotService.createRot({
        organizationId,
        createdById: ctx.user.id,
        title,
        description: activityDescription,
        department,
        titularCategory,
        dataCategories,
        purpose: activityDescription,
        legalBase: analysis.legalBasis,
        requiresConsent: !!analysis.requiresConsent,
        alternativeBases: analysis.alternativeBases,
        risksIfNoConsent: analysis.risksIfNoConsent,
        justification: analysis.justification,
        aiAnalysis: analysis,
        aiGeneratedAt: new Date().toISOString(),
      });

      return { id: rotId, analysis };
    }),

  // Atualizar ROT
  update: protectedProcedure
    .input(updateRotSchema)
    .mutation(async ({ input, ctx }) => {
      const updateData: any = { ...input };
      delete updateData.id;

      if (input.status === "aprovado") {
        updateData.approvedById = input.approvedById ?? ctx.user.id;
        updateData.approvedAt = new Date().toISOString();
      }

      await rotService.updateRot(input.id, updateData);
      return { success: true };
    }),

  // Aprovar ROT
  approve: protectedProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(async ({ input, ctx }) => {
      await rotService.updateRot(input.id, {
        status: "aprovado",
        approvedById: ctx.user.id,
        approvedAt: new Date().toISOString(),
      });
      return { success: true };
    }),

  // Excluir ROT (apenas admin)
  delete: protectedProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role === "sponsor") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await rotService.deleteRot(input.id);
      return { success: true };
    }),

  // ==================== TASKS ====================

  // Listar tarefas de um ROT
  listTasks: protectedProcedure
    .input(z.object({ rotId: z.number().positive() }))
    .query(async ({ input }) => {
      return rotService.listTasks(input.rotId);
    }),

  // Criar tarefa
  createTask: protectedProcedure
    .input(assignTaskSchema)
    .mutation(async ({ input }) => {
      const taskId = await rotService.createTask({
        ...input,
        dueDate: input.dueDate || undefined,
      });
      return { id: taskId };
    }),

  // Completar tarefa
  completeTask: protectedProcedure
    .input(z.object({ taskId: z.number().positive() }))
    .mutation(async ({ input }) => {
      await rotService.completeTask(input.taskId);
      return { success: true };
    }),

  // Atualizar status da tarefa
  updateTaskStatus: protectedProcedure
    .input(z.object({ 
      taskId: z.number().positive(),
      completed: z.boolean()
    }))
    .mutation(async ({ input }) => {
      await rotService.updateTaskStatus(input.taskId, input.completed);
      return { success: true };
    }),

  // Excluir tarefa
  deleteTask: protectedProcedure
    .input(z.object({ taskId: z.number().positive() }))
    .mutation(async ({ input }) => {
      await rotService.deleteTask(input.taskId);
      return { success: true };
    }),

  // ==================== ESTATÍSTICAS ====================

  // Obter estatísticas
  getStats: protectedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return rotService.getRotStats(input.organizationId);
    }),

  // ==================== GERAÇÃO COM IA ====================

  // Gerar base legal e análise de risco com IA
  generateBaseLegal: protectedProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(async ({ input }) => {
      const result = await rotService.generateBaseLegalWithAI(input.id);
      return result;
    }),

  // ==================== EXPORTAÇÃO ROPA ====================

  // Obter dados para exportação ROPA
  getROPAData: protectedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return rotService.getRotsForROPA(input.organizationId);
    }),

  // Exportar ROPA em PDF
  exportROPAPDF: protectedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .mutation(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const buffer = await ropaExportService.generateROPAPDF(input.organizationId);
      return {
        data: buffer.toString("base64"),
        filename: `ROPA_${new Date().toISOString().split("T")[0]}.pdf`,
        mimeType: "application/pdf"
      };
    }),

  // Exportar todos os documentos em ZIP
  exportAllDocumentsZip: protectedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .mutation(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { buffer, filename } = await rotService.exportAllDocumentsZip(input.organizationId);
      return {
        data: buffer.toString("base64"),
        filename,
        contentType: "application/zip",
      };
    }),

  // Exportar ROPA em Excel
  exportROPAExcel: protectedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .mutation(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const buffer = await ropaExportService.generateROPAExcel(input.organizationId);
      return {
        data: buffer.toString("base64"),
        filename: `ROPA_${new Date().toISOString().split("T")[0]}.xlsx`,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      };
    }),

  // ==================== INTEGRAÇÃO GED ====================

  // Salvar documento ROT no GED
  saveToGed: protectedProcedure
    .input(z.object({
      rotId: z.number().positive(),
      organizationId: z.number().positive(),
      documentType: z.enum(["rot", "pop", "ropa", "evidence"]),
      title: z.string().min(1),
      content: z.string().min(1),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return mapeamentoGedService.saveDocumentToGed({
        ...input,
        userId: ctx.user.id,
      });
    }),

  // Listar documentos vinculados a um ROT
  getLinkedDocuments: protectedProcedure
    .input(z.object({ rotId: z.number().positive() }))
    .query(async ({ input }) => {
      return mapeamentoGedService.getLinkedDocuments(input.rotId);
    }),

  // Obter documentos mais recentes por tipo
  getLatestDocuments: protectedProcedure
    .input(z.object({ rotId: z.number().positive() }))
    .query(async ({ input }) => {
      return mapeamentoGedService.getLatestDocuments(input.rotId);
    }),

  // Contar documentos por tipo
  countDocumentsByType: protectedProcedure
    .input(z.object({ rotId: z.number().positive() }))
    .query(async ({ input }) => {
      return mapeamentoGedService.countDocumentsByType(input.rotId);
    }),

  // Estatísticas de documentos GED da organização
  getOrganizationGedStats: protectedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return mapeamentoGedService.getOrganizationGedStats(input.organizationId);
    }),

  // Gerar e salvar ROT no GED automaticamente
  generateAndSaveToGed: protectedProcedure
    .input(z.object({
      rotId: z.number().positive(),
      organizationId: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        if (
          ctx.user.role === "sponsor" &&
          ctx.user.organizationId !== input.organizationId
        ) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        // Buscar o ROT
        logger.info("[ROT-GEN] Buscando ROT:", input.rotId);
        const rot = await rotService.getRotByIdSimple(input.rotId);
        if (!rot) {
          throw new TRPCError({ code: "NOT_FOUND", message: "ROT não encontrado" });
        }
        logger.info("[ROT-GEN] ROT encontrado:", rot.title);
        
        // Gerar conteúdo do documento ROT
        logger.info("[ROT-GEN] Gerando markdown...");
        const rotContent = generateRotMarkdown(rot);
        logger.info("[ROT-GEN] Markdown gerado, tamanho:", rotContent.length);
        
        // Salvar no GED
        logger.info("[ROT-GEN] Salvando no GED...");
        const result = await mapeamentoGedService.saveDocumentToGed({
          rotId: input.rotId,
          organizationId: input.organizationId,
          documentType: "rot",
          title: `ROT - ${rot.title}`,
          content: rotContent,
          description: rot.description || `Registro de Operação de Tratamento: ${rot.title}`,
          userId: ctx.user.id,
          tags: ["rot", "lgpd", rot.titularCategory, rot.department || "geral"],
        });
        logger.info("[ROT-GEN] Documento salvo com sucesso:", result.id);
        return result;
      } catch (error) {
        logger.error("[ROT-GEN] Erro ao gerar ROT:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: `Erro ao gerar ROT: ${error instanceof Error ? error.message : "Erro desconhecido"}` 
        });
      }
    }),

  // Gerar POP com IA e salvar no GED
  generatePOPAndSaveToGed: protectedProcedure
    .input(z.object({
      rotId: z.number().positive(),
      organizationId: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      logger.info("[POP-GEN] Iniciando geração de POP para rotId:", input.rotId);
      
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      try {
        // Buscar o ROT
        logger.info("[POP-GEN] Buscando ROT...");
        const rot = await rotService.getRotByIdSimple(input.rotId);
        if (!rot) {
          throw new TRPCError({ code: "NOT_FOUND", message: "ROT não encontrado" });
        }
        logger.info("[POP-GEN] ROT encontrado:", rot.title);
        
        // Gerar POP com IA
        logger.info("[POP-GEN] Gerando POP com IA...");
        const popContent = await rotService.generatePOPWithAI(input.rotId);
        logger.info("[POP-GEN] POP gerado:", popContent.title);
      
        // Converter para Markdown
        const popMarkdown = rotService.convertPOPToMarkdown(popContent);
        
        // Salvar no GED
        logger.info("[POP-GEN] Salvando no GED...");
        const result = await mapeamentoGedService.saveDocumentToGed({
          rotId: input.rotId,
          organizationId: input.organizationId,
          documentType: "pop",
          title: popContent.title,
          content: popMarkdown,
          description: popContent.objective,
          userId: ctx.user.id,
          tags: ["pop", "lgpd", "procedimento", rot.department || "geral"],
        });
        logger.info("[POP-GEN] POP salvo com sucesso!");
        return result;
      } catch (error) {
        logger.error("[POP-GEN] Erro ao gerar POP:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao gerar POP: " + (error instanceof Error ? error.message : String(error)) });
      }
    }),

  // Obter histórico de versões de um documento
  getDocumentVersionHistory: protectedProcedure
    .input(z.object({
      rotId: z.number().positive(),
      documentType: z.enum(["rot", "pop", "ropa", "evidence"]),
    }))
    .query(async ({ input }) => {
      return mapeamentoGedService.getVersionHistory(input.rotId, input.documentType);
    }),

  // Obter conteúdo de uma versão específica
  getVersionContent: protectedProcedure
    .input(z.object({ versionId: z.number().positive() }))
    .query(async ({ input }) => {
      return mapeamentoGedService.getVersionContent(input.versionId);
    }),

  // Comparar duas versões
  compareVersions: protectedProcedure
    .input(z.object({
      versionId1: z.number().positive(),
      versionId2: z.number().positive(),
    }))
    .query(async ({ input }) => {
      return mapeamentoGedService.compareVersions(input.versionId1, input.versionId2);
    }),

  // Dashboard de Mapeamentos
  getDashboardStats: protectedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return rotService.getDashboardStats(input.organizationId);
    }),

  // Timeline de atividades
  getTimeline: protectedProcedure
    .input(z.object({ 
      organizationId: z.number().positive(),
      limit: z.number().positive().optional().default(20)
    }))
    .query(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return rotService.getTimeline(input.organizationId, input.limit);
    }),

  // Mapa de calor de riscos
  getRiskHeatmap: protectedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return rotService.getRiskHeatmap(input.organizationId);
    }),

  // Notificar DPO sobre novo documento (chamado automaticamente)
  notifyDPOAboutDocument: protectedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      documentType: z.enum(["rot", "pop", "ropa", "evidence"]),
      documentTitle: z.string(),
      rotTitle: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return mapeamentoGedService.notifyDPOAboutNewDocument(
        input.organizationId,
        input.documentType,
        input.documentTitle,
        input.rotTitle
      );
    }),

  // Gerar ROT Premium em PDF
  generateRotPremium: protectedProcedure
    .input(z.object({
      rotId: z.number().positive(),
      organizationId: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const rot = await rotService.getRotByIdSimple(input.rotId);
      if (!rot) {
        throw new TRPCError({ code: "NOT_FOUND", message: "ROT não encontrado" });
      }

      const organization = await db.getOrganizationById(input.organizationId);
      const { generateRotPremiumHTML } = await import('./rotPremiumService');
      const { generatePDF } = await import('./pdfService');

      const html = generateRotPremiumHTML({
        rot,
        organizationName: organization?.name || 'Organização',
        consultantName: ctx.user.name || 'Consultor Seusdados',
        consultantEmail: ctx.user.email || 'dpo@seusdados.com',
      });

      const pdfBuffer = await generatePDF(html);
      const base64 = pdfBuffer.toString('base64');

      return {
        filename: `ROT-Premium-${rot.title.replace(/\s+/g, '-')}-${Date.now()}.pdf`,
        contentType: 'application/pdf',
        data: base64,
      };
    }),

  // Gerar POP Premium em PDF
  generatePopPremium: protectedProcedure
    .input(z.object({
      rotId: z.number().positive(),
      organizationId: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const rot = await rotService.getRotByIdSimple(input.rotId);
      if (!rot) {
        throw new TRPCError({ code: "NOT_FOUND", message: "ROT não encontrado" });
      }

      const organization = await db.getOrganizationById(input.organizationId);
      const { generatePopPremiumHTML } = await import('./rotPremiumService');
      const { generatePDF } = await import('./pdfService');

      const html = generatePopPremiumHTML({
        rot,
        organizationName: organization?.name || 'Organização',
        consultantName: ctx.user.name || 'Consultor Seusdados',
        consultantEmail: ctx.user.email || 'dpo@seusdados.com',
      });

      const pdfBuffer = await generatePDF(html);
      const base64 = pdfBuffer.toString('base64');

      return {
        filename: `POP-Premium-${rot.title.replace(/\s+/g, '-')}-${Date.now()}.pdf`,
        contentType: 'application/pdf',
        data: base64,
      };
    }),
});

// Função auxiliar para gerar Markdown do ROT
function generateRotMarkdown(rot: any): string {
  const dataCategories = rot.dataCategories || [];
  const sensiveisCount = dataCategories.filter((d: any) => d.sensivel).length;
  
  return `# Registro de Operação de Tratamento (ROT)

## Informações Gerais

| Campo | Valor |
|-------|-------|
| **Título** | ${rot.title} |
| **Departamento** | ${rot.department || "Não especificado"} |
| **Categoria de Titular** | ${rot.titularCategory} |
| **Status** | ${rot.status} |
| **Data de Criação** | ${new Date(rot.createdAt).toLocaleDateString("pt-BR")} |

## Descrição

${rot.description || "Sem descrição disponível."}

## Finalidade do Tratamento

${rot.purpose || "Não especificada."}

## Base Legal

**Base Legal Principal:** ${rot.legalBase || "Não especificada"}

${rot.requiresConsent ? "⚠️ **Requer Consentimento do Titular**" : "✅ Não requer consentimento específico"}

${rot.justification ? `**Justificativa:** ${rot.justification}` : ""}

## Dados Tratados

| Categoria de Dado | Sensível |
|-------------------|----------|
${dataCategories.map((d: any) => `| ${d.name} | ${d.sensivel ? "⚠️ Sim" : "Não"} |`).join("\n")}

**Total de categorias:** ${dataCategories.length}
**Dados sensíveis:** ${sensiveisCount}

## Análise de Risco

| Indicador | Valor |
|-----------|-------|
| **Nível de Risco** | ${rot.riskLevel || "Não avaliado"} |
| **Score de Risco** | ${rot.riskScore || "N/A"} |

${rot.recommendations ? `### Recomendações\n\n${rot.recommendations}` : ""}

---

*Documento gerado automaticamente pelo Sistema Seusdados Due Diligence*
*Data de geração: ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}*
`;
}
