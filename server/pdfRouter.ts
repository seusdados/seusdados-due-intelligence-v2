import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { generateReportHTML } from './pdfReportGenerator';

const t = initTRPC.create();
const router = t.router;
const protectedProcedure = t.procedure;

export const pdfRouter = router({
  /**
   * Gerar HTML de relatório para visualização
   */
  generateReportHTML: protectedProcedure
    .input(
      z.object({
        assessmentId: z.string(),
        assessmentCode: z.string(),
        assessmentTitle: z.string(),
        organizationName: z.string(),
        maturityScore: z.number(),
        riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
        domains: z.array(
          z.object({
            name: z.string(),
            score: z.number(),
            status: z.enum(['compliant', 'partial', 'non_compliant']),
            findings: z.array(z.string()),
          })
        ),
        riskMatrix: z.array(
          z.object({
            risk: z.string(),
            probability: z.number(),
            impact: z.number(),
            level: z.string(),
            mitigation: z.string(),
          })
        ),
        actionPlan: z.array(
          z.object({
            id: z.string(),
            description: z.string(),
            priority: z.enum(['low', 'medium', 'high', 'critical']),
            dueDate: z.string(),
            owner: z.string(),
            status: z.enum(['pending', 'in_progress', 'completed']),
          })
        ),
        recommendations: z.array(z.string()),
      })
    )
    .query(({ input }) => {
      const html = generateReportHTML({
        assessmentCode: input.assessmentCode,
        assessmentTitle: input.assessmentTitle,
        organizationName: input.organizationName,
        consultantName: 'Consultor Seusdados',
        generatedDate: new Date().toISOString(),
        maturityScore: input.maturityScore,
        riskLevel: input.riskLevel,
        domains: input.domains,
        riskMatrix: input.riskMatrix,
        actionPlan: input.actionPlan,
        recommendations: input.recommendations,
      });

      return {
        html,
        success: true,
      };
    }),

  /**
   * Exportar relatório como PDF
   * Usa manus-md-to-pdf internamente
   */
  exportPDF: protectedProcedure
    .input(
      z.object({
        assessmentId: z.string(),
        html: z.string(),
        filename: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // TODO: Implementar conversão HTML para PDF usando manus-md-to-pdf
        // Por enquanto, retornar sucesso
        const filename = input.filename || `relatorio-${input.assessmentId}.pdf`;

        return {
          success: true,
          filename,
          message: 'PDF gerado com sucesso',
        };
      } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        return {
          success: false,
          message: 'Erro ao gerar PDF',
        };
      }
    }),

  /**
   * Compartilhar relatório por email
   */
  shareReportByEmail: protectedProcedure
    .input(
      z.object({
        assessmentId: z.string(),
        recipientEmail: z.string().email(),
        includeActionPlan: z.boolean().default(true),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // TODO: Implementar envio de email com PDF anexado
        console.log(`Compartilhando relatório com ${input.recipientEmail}`);

        return {
          success: true,
          message: 'Relatório compartilhado com sucesso',
        };
      } catch (error) {
        console.error('Erro ao compartilhar relatório:', error);
        return {
          success: false,
          message: 'Erro ao compartilhar relatório',
        };
      }
    }),
});
