/**
 * PATCH-2-RIPD-AUTOMATION: Router de Relatórios ANPD para RIPD
 * 
 * Desenvolvido por: Seusdados Consultoria em Gestão de Dados Limitada
 * CNPJ: 33.899.116/0001-63 | www.seusdados.com
 * Responsabilidade Técnica: Marcelo Fattori
 */
import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { 
  generateFullPdf, 
  generateSimplifiedPdf, 
  generateAnpdPackage 
} from "./ripdPdfService";

export const ripdReportRouter = router({
  /**
   * Gera PDF Completo do RIPD e salva no GED
   * Inclui: Capa, Resumo Executivo, Matriz de Risco, Lista de Riscos, Mitigações, Índice de Evidências
   */
  generateFullPdf: protectedProcedure
    .input(z.object({ ripdId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.user.organizationId;
      if (!organizationId) throw new Error("Usuário sem organização");
      
      const db = await getDb();
      
      // Verificar se RIPD existe e pertence à organização
      const result = await db.execute(sql`
        SELECT id, "workflowStatus" FROM dpia_assessments 
        WHERE id = ${input.ripdId} AND "organizationId" = ${organizationId}
      `);
      const ripd = (result as unknown as any[])[0];
      if (!ripd) throw new Error("RIPD não encontrado");
      
      // Gerar PDF completo e salvar no GED
      const { gedDocumentId, url } = await generateFullPdf(
        input.ripdId,
        organizationId,
        ctx.user.id
      );
      
      return {
        success: true,
        gedDocumentId,
        pdfUrl: url,
        message: "PDF completo gerado e salvo no GED com sucesso"
      };
    }),

  /**
   * Gera PDF Simplificado do RIPD e salva no GED
   * Versão resumida para leigos com Top 5 riscos
   */
  generateSimplifiedPdf: protectedProcedure
    .input(z.object({ ripdId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.user.organizationId;
      if (!organizationId) throw new Error("Usuário sem organização");
      
      const db = await getDb();
      
      // Verificar se RIPD existe e pertence à organização
      const result = await db.execute(sql`
        SELECT id, "workflowStatus" FROM dpia_assessments 
        WHERE id = ${input.ripdId} AND "organizationId" = ${organizationId}
      `);
      const ripd = (result as unknown as any[])[0];
      if (!ripd) throw new Error("RIPD não encontrado");
      
      // Gerar PDF simplificado e salvar no GED
      const { gedDocumentId, url } = await generateSimplifiedPdf(
        input.ripdId,
        organizationId,
        ctx.user.id
      );
      
      return {
        success: true,
        gedDocumentId,
        pdfUrl: url,
        message: "PDF simplificado gerado e salvo no GED com sucesso"
      };
    }),

  /**
   * Gera Pacote ANPD (ZIP) contendo:
   * - ripd_completo.pdf
   * - ripd_simplificado.pdf
   * - evidencias_index.json
   * - audit_trail.json
   */
  generateAnpdPackage: protectedProcedure
    .input(z.object({ ripdId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.user.organizationId;
      if (!organizationId) throw new Error("Usuário sem organização");
      
      const db = await getDb();
      
      // Verificar se RIPD existe e pertence à organização
      const result = await db.execute(sql`
        SELECT id, "workflowStatus" FROM dpia_assessments 
        WHERE id = ${input.ripdId} AND "organizationId" = ${organizationId}
      `);
      const ripd = (result as unknown as any[])[0];
      if (!ripd) throw new Error("RIPD não encontrado");
      
      // Gerar pacote ANPD e salvar no GED
      const { gedDocumentId, url } = await generateAnpdPackage(
        input.ripdId,
        organizationId,
        ctx.user.id
      );
      
      return {
        success: true,
        gedDocumentId,
        zipUrl: url,
        contents: [
          "ripd_completo.pdf",
          "ripd_simplificado.pdf",
          "evidencias_index.json",
          "audit_trail.json"
        ],
        message: "Pacote ANPD gerado e salvo no GED com sucesso"
      };
    }),

  /**
   * Obtém os IDs dos documentos PDF já gerados para um RIPD
   */
  getGeneratedDocuments: protectedProcedure
    .input(z.object({ ripdId: z.number() }))
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.user.organizationId;
      if (!organizationId) throw new Error("Usuário sem organização");
      
      const db = await getDb();
      
      const result = await db.execute(sql`
        SELECT "finalPdfGedId", "simplifiedPdfGedId", "anpdPackageGedId" 
        FROM dpia_assessments 
        WHERE id = ${input.ripdId} AND "organizationId" = ${organizationId}
      `);
      const ripd = (result as unknown as any[])[0];
      if (!ripd) throw new Error("RIPD não encontrado");
      
      return {
        fullPdfGedId: ripd.finalPdfGedId || null,
        simplifiedPdfGedId: ripd.simplifiedPdfGedId || null,
        anpdPackageGedId: ripd.anpdPackageGedId || null,
      };
    }),
});
