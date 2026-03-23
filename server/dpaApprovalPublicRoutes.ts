import { logger } from "./_core/logger";
import { Express, Request, Response } from "express";
import { getDb, getContractAnalysisClauses, getContractAnalysisMap } from "./db";
import { eq } from "drizzle-orm";
import { dpaApprovalRequests, contractAnalyses, organizations } from "../drizzle/schema";
import crypto from "crypto";

export function registerDpaApprovalPublicRoutes(app: Express) {
  // Obter dados da aprovação pelo token
  app.get("/api/dpa-approval/public/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const db = await getDb();
      
      // Buscar solicitação pelo token
      const [request] = await db
        .select()
        .from(dpaApprovalRequests)
        .where(eq(dpaApprovalRequests.accessToken, token))
        .limit(1);
      
      if (!request) {
        return res.status(404).json({ error: "Solicitação não encontrada" });
      }
      
      // Verificar se expirou
      if (new Date(request.expiresAt) < new Date()) {
        await db
          .update(dpaApprovalRequests)
          .set({ status: 'expired' })
          .where(eq(dpaApprovalRequests.id, request.id));
        
        return res.status(410).json({ error: "Este link de aprovação expirou" });
      }
      
      // Buscar dados da análise
      const [analysis] = await db
        .select()
        .from(contractAnalyses)
        .where(eq(contractAnalyses.id, request.analysisId))
        .limit(1);
      
      if (!analysis) {
        return res.status(404).json({ error: "Análise não encontrada" });
      }
      
      // Buscar organização
      let organizationName = "Organização";
      if (analysis.organizationId) {
        const [org] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, analysis.organizationId))
          .limit(1);
        if (org) {
          organizationName = org.name;
        }
      }
      
      // Buscar cláusulas da análise
      let clausulas: any[] = [];
      try {
        const analysisClauses = await getContractAnalysisClauses(analysis.id);
        clausulas = analysisClauses?.map((c: any) => ({
          id: c.clauseId,
          title: c.title,
          content: c.content,
          isAccepted: c.isAccepted === 1,
        })) || [];
      } catch (e) {
        logger.error("Erro ao buscar cláusulas:", e);
      }
      
      // Buscar mapa de análise para dados adicionais
      const analysisMap = await getContractAnalysisMap(analysis.id);
      
      // Retornar dados
      res.json({
        id: request.id,
        analysisId: request.analysisId,
        contractTitle: analysis.contractName || "Contrato",
        contractObject: analysisMap?.contractObject || "",
        organizationName,
        operatorName: analysisMap?.contractedParty || "Operador",
        controllerName: analysisMap?.contractingParty || "Controlador",
        requestedByName: request.requestedByName || "Solicitante",
        approverName: request.approverName,
        approverEmail: request.approverEmail,
        approverRole: request.approverRole,
        status: request.status,
        message: request.message,
        expiresAt: request.expiresAt,
        clausulas,
        analysisDate: analysis.createdAt,
        version: "1.0"
      });
    } catch (error: any) {
      logger.error("Erro ao buscar aprovação:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Marcar como visualizado
  app.post("/api/dpa-approval/public/:token/view", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const db = await getDb();
      
      const [request] = await db
        .select()
        .from(dpaApprovalRequests)
        .where(eq(dpaApprovalRequests.accessToken, token))
        .limit(1);
      
      if (!request) {
        return res.status(404).json({ error: "Solicitação não encontrada" });
      }
      
      if (request.status === 'pending') {
        await db
          .update(dpaApprovalRequests)
          .set({ 
            status: 'viewed',
            viewedAt: new Date().toISOString()
          })
          .where(eq(dpaApprovalRequests.id, request.id));
      }
      
      res.json({ success: true });
    } catch (error: any) {
      logger.error("Erro ao marcar como visualizado:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Aprovar DPA
  app.post("/api/dpa-approval/public/:token/approve", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const db = await getDb();
      
      const [request] = await db
        .select()
        .from(dpaApprovalRequests)
        .where(eq(dpaApprovalRequests.accessToken, token))
        .limit(1);
      
      if (!request) {
        return res.status(404).json({ error: "Solicitação não encontrada" });
      }
      
      if (request.status === 'approved' || request.status === 'rejected') {
        return res.status(400).json({ error: "Esta solicitação já foi processada" });
      }
      
      if (new Date(request.expiresAt) < new Date()) {
        await db
          .update(dpaApprovalRequests)
          .set({ status: 'expired' })
          .where(eq(dpaApprovalRequests.id, request.id));
        
        return res.status(410).json({ error: "Este link de aprovação expirou" });
      }
      
      await db
        .update(dpaApprovalRequests)
        .set({ 
          status: 'approved',
          respondedAt: new Date().toISOString()
        })
        .where(eq(dpaApprovalRequests.id, request.id));
      
      res.json({ success: true, message: "Acordo aprovado com sucesso" });
    } catch (error: any) {
      logger.error("Erro ao aprovar:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Rejeitar DPA
  app.post("/api/dpa-approval/public/:token/reject", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { reason } = req.body;
      const db = await getDb();
      
      const [request] = await db
        .select()
        .from(dpaApprovalRequests)
        .where(eq(dpaApprovalRequests.accessToken, token))
        .limit(1);
      
      if (!request) {
        return res.status(404).json({ error: "Solicitação não encontrada" });
      }
      
      if (request.status === 'approved' || request.status === 'rejected') {
        return res.status(400).json({ error: "Esta solicitação já foi processada" });
      }
      
      if (new Date(request.expiresAt) < new Date()) {
        await db
          .update(dpaApprovalRequests)
          .set({ status: 'expired' })
          .where(eq(dpaApprovalRequests.id, request.id));
        
        return res.status(410).json({ error: "Este link de aprovação expirou" });
      }
      
      await db
        .update(dpaApprovalRequests)
        .set({ 
          status: 'rejected',
          respondedAt: new Date().toISOString()
        })
        .where(eq(dpaApprovalRequests.id, request.id));
      
      res.json({ success: true, message: "Acordo rejeitado" });
    } catch (error: any) {
      logger.error("Erro ao rejeitar:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Gerar token único
  app.post("/api/dpa-approval/generate-token", async (_req: Request, res: Response) => {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      res.json({ token });
    } catch (error: any) {
      logger.error("Erro ao gerar token:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
}
