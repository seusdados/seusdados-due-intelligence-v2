/**
 * PATCH-2-RIPD-AUTOMATION: Router de IA para RIPD
 */
import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";

export const ripdAiRouter = router({
  validateAnswer: protectedProcedure
    .input(z.object({ ripdId: z.number(), questionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { rows: responseResult } = await db.execute(sql`SELECT r.*, q.text as questionText FROM dpia_responses r JOIN dpia_questions q ON r."questionId" = q.id WHERE r."assessmentId" = ${input.ripdId} AND r."questionId" = ${input.questionId}`);
      const response = (responseResult as unknown as any[])[0];
      if (!response) throw new Error("Resposta não encontrada");
      
      const llmResponse = await invokeLLM({
        messages: [
          { role: "system", content: "Você é um especialista em LGPD. Valide se a resposta está adequada à pergunta do RIPD. Retorne JSON: {valid: boolean, score: number (0-100), feedback: string, suggestions: string[]}" },
          { role: "user", content: `Pergunta: ${(response as any).questionText}\nResposta: ${(response as any).answer}` }
        ],
        response_format: { type: "json_object" }
      });
      
      const validation = JSON.parse(String(llmResponse.choices[0].message.content) || "{}");
      await db.execute(sql`UPDATE dpia_responses SET "aiValidation" = ${JSON.stringify(validation)} WHERE "assessmentId" = ${input.ripdId} AND "questionId" = ${input.questionId}`);
      return validation;
    }),

  suggestRisks: protectedProcedure
    .input(z.object({ ripdId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { rows: responses } = await db.execute(sql`SELECT r.answer, q.text FROM dpia_responses r JOIN dpia_questions q ON r."questionId" = q.id WHERE r."assessmentId" = ${input.ripdId}`);
      
      const llmResponse = await invokeLLM({
        messages: [
          { role: "system", content: "Você é um especialista em LGPD. Analise as respostas do RIPD e sugira riscos. Retorne JSON: {risks: [{title: string, description: string, likelihood: number (1-5), impact: number (1-5), category: string}]}" },
          { role: "user", content: `Respostas do RIPD:\n${(responses as unknown as any[]).map(r => `P: ${r.text}\nR: ${r.answer}`).join('\n\n')}` }
        ],
        response_format: { type: "json_object" }
      });
      
      return JSON.parse(String(llmResponse.choices[0].message.content) || '{"risks":[]}');
    }),

  suggestMitigations: protectedProcedure
    .input(z.object({ riskId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { rows: riskResult } = await db.execute(sql`SELECT * FROM dpia_risks WHERE id = ${input.riskId}`);
      const risk = (riskResult as unknown as any[])[0];
      if (!risk) throw new Error("Risco não encontrado");
      
      const llmResponse = await invokeLLM({
        messages: [
          { role: "system", content: "Você é um especialista em LGPD. Sugira mitigações para o risco. Retorne JSON: {mitigations: [{title: string, description: string, effectiveness: string, estimatedCost: string, timeframe: string}]}" },
          { role: "user", content: `Risco: ${(risk as any).title}\nDescrição: ${(risk as any).description}\nImpacto: ${(risk as any).impact}\nProbabilidade: ${(risk as any).likelihood}` }
        ],
        response_format: { type: "json_object" }
      });
      
      return JSON.parse(String(llmResponse.choices[0].message.content) || '{"mitigations":[]}');
    }),

  evaluateResidual: protectedProcedure
    .input(z.object({ riskId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { rows: riskResult2 } = await db.execute(sql`SELECT * FROM dpia_risks WHERE id = ${input.riskId}`);
      const risk = (riskResult2 as unknown as any[])[0];
      const { rows: mitigationsResult } = await db.execute(sql`SELECT * FROM dpia_mitigations WHERE "riskId" = ${input.riskId} AND status = 'implementada'`);
      const mitigations = mitigationsResult as unknown as any[];
      
      const llmResponse = await invokeLLM({
        messages: [
          { role: "system", content: "Avalie o risco residual após mitigações. Retorne JSON: {residualLikelihood: number (1-5), residualImpact: number (1-5), justification: string}" },
          { role: "user", content: `Risco: ${JSON.stringify(risk)}\nMitigações implementadas: ${JSON.stringify(mitigations)}` }
        ],
        response_format: { type: "json_object" }
      });
      
      const evaluation = JSON.parse(String(llmResponse.choices[0].message.content) || "{}");
      const score = evaluation.residualLikelihood * evaluation.residualImpact;
      const level = score >= 20 ? 'muito_critico' : score >= 15 ? 'critico' : score >= 10 ? 'alto' : score >= 5 ? 'moderado' : 'baixo';
      
      await db.execute(sql`UPDATE dpia_risks SET "residualLikelihood" = ${evaluation.residualLikelihood}, "residualImpact" = ${evaluation.residualImpact}, "residualScore" = ${score}, "residualLevel" = ${level} WHERE id = ${input.riskId}`);
      return { ...evaluation, score, level };
    }),
});
