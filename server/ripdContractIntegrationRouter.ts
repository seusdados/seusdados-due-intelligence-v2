/**
 * PATCH-2-RIPD-AUTOMATION: Router de Integração RIPD com Análise de Contratos
 */
import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

export const ripdContractIntegrationRouter = router({
  generateFromContract: protectedProcedure
    .input(z.object({ contractAnalysisId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { rows: contractResult } = await db.execute(sql`SELECT * FROM contract_analyses WHERE id = ${input.contractAnalysisId} AND "organizationId" = ${ctx.user.organizationId}`);
      const contract = (contractResult as unknown as any[])[0];
      if (!contract) throw new Error("Análise de contrato não encontrada");
      
      const { rows: existingRipd } = await db.execute(sql`SELECT id FROM dpia_assessments WHERE "linkedContractAnalysisId" = ${input.contractAnalysisId}`);
      if ((existingRipd as unknown as any[]).length > 0) {
        return { success: true, alreadyExists: true, ripdId: (existingRipd as unknown as any[])[0].id };
      }
      
      const { rows: ripdResult } = await db.execute(sql`INSERT INTO dpia_assessments ("organizationId", title, description, "workflowStatus", "linkedContractAnalysisId", "createdByUserId") VALUES (${ctx.user.organizationId}, ${`RIPD - ${contract.contractName || contract.fileName}`}, ${`RIPD gerado automaticamente a partir da análise de contrato #${input.contractAnalysisId}`}, 'draft', ${input.contractAnalysisId}, ${ctx.user.id}) RETURNING id`);
      const ripdId = (ripdResult as any)[0]?.id;
      
      await db.execute(sql`UPDATE contract_analyses SET "linkedRipdId" = ${ripdId} WHERE id = ${input.contractAnalysisId}`);
      
      return { success: true, ripdId, contractName: contract.contractName || contract.fileName };
    }),

  lockContract: protectedProcedure
    .input(z.object({ contractAnalysisId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { rows: contractResult } = await db.execute(sql`SELECT "linkedRipdId" FROM contract_analyses WHERE id = ${input.contractAnalysisId} AND "organizationId" = ${ctx.user.organizationId}`);
      const contract = (contractResult as unknown as any[])[0];
      if (!contract || !contract.linkedRipdId) return { isLocked: false, reason: null };
      
      const { rows: ripdResult } = await db.execute(sql`SELECT "workflowStatus" FROM dpia_assessments WHERE id = ${contract.linkedRipdId}`);
      const ripd = (ripdResult as unknown as any[])[0];
      if (!ripd) return { isLocked: false, reason: null };
      
      const isLocked = ripd.workflowStatus !== 'signed';
      return { isLocked, reason: isLocked ? `RIPD vinculado (ID: ${contract.linkedRipdId}) ainda não foi assinado. Status atual: ${ripd.workflowStatus}` : null, ripdId: contract.linkedRipdId, ripdStatus: ripd.workflowStatus };
    }),

  syncData: protectedProcedure
    .input(z.object({ ripdId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { rows: ripdResult } = await db.execute(sql`SELECT "linkedContractAnalysisId" FROM dpia_assessments WHERE id = ${input.ripdId} AND "organizationId" = ${ctx.user.organizationId}`);
      const ripd = (ripdResult as unknown as any[])[0];
      if (!ripd || !ripd.linkedContractAnalysisId) throw new Error("RIPD não possui contrato vinculado");
      
      const { rows: contractResult } = await db.execute(sql`SELECT * FROM contract_analyses WHERE id = ${ripd.linkedContractAnalysisId}`);
      const contract = (contractResult as unknown as any[])[0];
      if (!contract) throw new Error("Contrato vinculado não encontrado");
      
      return {
        success: true,
        syncedData: {
          contractName: contract.contractName || contract.fileName,
          contractType: contract.contractType,
          parties: contract.parties,
          analysisDate: contract.createdAt
        }
      };
    }),

  checkRipdRequired: protectedProcedure
    .input(z.object({ contractAnalysisId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { rows: contractResult } = await db.execute(sql`SELECT "riskLevel", "hasPersonalData", "hasSensitiveData" FROM contract_analyses WHERE id = ${input.contractAnalysisId} AND "organizationId" = ${ctx.user.organizationId}`);
      const contract = (contractResult as unknown as any[])[0];
      if (!contract) return { required: false, reason: "Contrato não encontrado" };
      
      const isRequired = contract.riskLevel === 'alto' || contract.riskLevel === 'critico' || contract.hasSensitiveData;
      return {
        required: isRequired,
        reason: isRequired ? `RIPD obrigatório: ${contract.hasSensitiveData ? 'contrato envolve dados sensíveis' : `nível de risco ${contract.riskLevel}`}` : "RIPD não obrigatório para este contrato"
      };
    }),
});
