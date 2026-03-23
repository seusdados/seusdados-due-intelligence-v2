/**
 * Router do Framework SeusDados - Maturidade LGPD
 * 
 * Endpoints para gerenciar avaliações de maturidade usando o Framework SeusDados
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb, extractInsertId } from "./db";
import { 
  seusdadosDomains, 
  seusdadosQuestions, 
  seusdadosOptions,
  seusdadosAssessments,
  seusdadosAnswers,
  seusdadosDomainScores
} from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { 
  SEUSDADOS_DOMAINS, 
  SEUSDADOS_MATURITY_LEVELS,
  getAllQuestions,
  getQuestionById,
  getDomainByCode,
  getMaturityLevelLabel,
  calculateDomainScore,
  calculateOverallScore,
  calculateAllDomainScores,
  generateActionPlan
} from "./frameworks/seusdados-framework";
import { seedSeusdadosFramework } from "./frameworks/seed-seusdados";

export const seusdadosRouter = router({
  // ==================== DADOS DO FRAMEWORK ====================
  
  // Obter todos os domínios e perguntas do framework
  getFrameworkData: protectedProcedure
    .query(async () => {
      return {
        version: "seusdados-maturidade-lgpd-v1",
        title: "Questionário de Maturidade - Privacidade, Segurança e IA (5 níveis)",
        maturityLevels: SEUSDADOS_MATURITY_LEVELS,
        domains: SEUSDADOS_DOMAINS,
        totalQuestions: getAllQuestions().length
      };
    }),
  
  // Obter domínios
  getDomains: protectedProcedure
    .query(async () => {
      return SEUSDADOS_DOMAINS.map(d => ({
        id: d.id,
        code: d.code,
        label: d.label,
        weight: d.weight,
        questionCount: d.questions.length
      }));
    }),
  
  // Obter perguntas de um domínio
  getQuestionsByDomain: protectedProcedure
    .input(z.object({ domainCode: z.string() }))
    .query(async ({ input }) => {
      const domain = getDomainByCode(input.domainCode);
      if (!domain) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Domínio não encontrado' });
      }
      return {
        domain: {
          id: domain.id,
          code: domain.code,
          label: domain.label
        },
        questions: domain.questions
      };
    }),
  
  // Obter uma pergunta específica
  getQuestion: protectedProcedure
    .input(z.object({ questionId: z.string() }))
    .query(async ({ input }) => {
      const question = getQuestionById(input.questionId);
      if (!question) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Pergunta não encontrada' });
      }
      return question;
    }),
  
  // Obter as opções de uma questão do banco de dados (com textos atualizados)
  getQuestionOptions: protectedProcedure
    .input(z.object({ questionCode: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const options = await db.select().from(seusdadosOptions)
        .where(eq(seusdadosOptions.questionCode, input.questionCode))
        .orderBy(seusdadosOptions.level);
      
      return options;
    }),
  
  // Obter todas as opções de todas as questões (para carregar de uma vez)
  getAllQuestionOptions: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const options = await db.select().from(seusdadosOptions)
        .orderBy(seusdadosOptions.questionCode, seusdadosOptions.level);
      
      // Agrupar por questionCode
      const grouped: Record<string, typeof options> = {};
      for (const opt of options) {
        if (!grouped[opt.questionCode]) {
          grouped[opt.questionCode] = [];
        }
        grouped[opt.questionCode].push(opt);
      }
      
      return grouped;
    }),
  
  // ==================== AVALIAÇÕES ====================
  
  // Criar nova avaliação
  create: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      title: z.string().min(1)
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const result = await db.insert(seusdadosAssessments).values({
        organizationId: input.organizationId,
        createdById: ctx.user.id,
        title: input.title,
        status: 'rascunho',
        totalQuestions: getAllQuestions().length,
        answeredQuestions: 0
      }) as any;
      
      return { id: extractInsertId(result) };
    }),
  
  // Listar avaliações de uma organização
  list: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      status: z.enum(['rascunho', 'em_andamento', 'concluida', 'arquivada']).optional()
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      let query = db.select().from(seusdadosAssessments)
        .where(eq(seusdadosAssessments.organizationId, input.organizationId))
        .orderBy(desc(seusdadosAssessments.createdAt));
      
      if (input.status) {
        query = db.select().from(seusdadosAssessments)
          .where(and(
            eq(seusdadosAssessments.organizationId, input.organizationId),
            eq(seusdadosAssessments.status, input.status)
          ))
          .orderBy(desc(seusdadosAssessments.createdAt));
      }
      
      const assessments = await query;
      
      return assessments.map(a => ({
        ...a,
        maturityLevelLabel: a.overallLevelRounded ? getMaturityLevelLabel(Number(a.overallLevelRounded)) : null
      }));
    }),
  
  // Obter detalhes de uma avaliação
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const [assessment] = await db.select().from(seusdadosAssessments)
        .where(eq(seusdadosAssessments.id, input.id));
      
      if (!assessment) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Avaliação não encontrada' });
      }
      
      // Buscar respostas
      const answers = await db.select().from(seusdadosAnswers)
        .where(eq(seusdadosAnswers.assessmentId, input.id));
      
      // Buscar scores por domínio
      const domainScores = await db.select().from(seusdadosDomainScores)
        .where(eq(seusdadosDomainScores.assessmentId, input.id));
      
      return {
        ...assessment,
        maturityLevelLabel: assessment.overallLevelRounded ? getMaturityLevelLabel(Number(assessment.overallLevelRounded)) : null,
        answers,
        domainScores: domainScores.map(ds => ({
          ...ds,
          levelLabel: getMaturityLevelLabel(ds.levelRounded)
        }))
      };
    }),
  
  // Salvar resposta
  saveAnswer: protectedProcedure
    .input(z.object({
      assessmentId: z.number(),
      questionCode: z.string(),
      selectedOptionCode: z.string(),
      selectedLevel: z.number().min(1).max(5),
      observations: z.string().optional(),
      evidence: z.object({
        links: z.array(z.string()).optional(),
        files: z.array(z.string()).optional(),
        metadata: z.record(z.string(), z.unknown()).optional()
      }).optional()
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      // Verificar se a avaliação existe
      const [assessment] = await db.select().from(seusdadosAssessments)
        .where(eq(seusdadosAssessments.id, input.assessmentId));
      
      if (!assessment) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Avaliação não encontrada' });
      }
      
      // Verificar se a pergunta existe
      const question = getQuestionById(input.questionCode);
      if (!question) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Pergunta não encontrada' });
      }
      
      // Inserir ou atualizar resposta
      await db.insert(seusdadosAnswers).values({
        assessmentId: input.assessmentId,
        questionCode: input.questionCode,
        selectedOptionCode: input.selectedOptionCode,
        selectedLevel: input.selectedLevel,
        observations: input.observations || null,
        evidence: input.evidence || {}
      }).onConflictDoUpdate({ target: [], set: {
          selectedOptionCode: input.selectedOptionCode,
          selectedLevel: input.selectedLevel,
          observations: input.observations || null,
          evidence: input.evidence || {}
        }
      });
      
      // Recalcular scores
      await recalculateScores(input.assessmentId);
      
      return { success: true };
    }),
  
  // Atualizar status da avaliação
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['rascunho', 'em_andamento', 'concluida', 'arquivada'])
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const updateData: any = { status: input.status };
      if (input.status === 'concluida') {
        updateData.completedAt = sql`NOW()`;
      }
      
      await db.update(seusdadosAssessments)
        .set(updateData)
        .where(eq(seusdadosAssessments.id, input.id));
      
      return { success: true };
    }),
  
  // ==================== RELATÓRIOS ====================
  
  // Obter relatório executivo
  getExecutiveReport: protectedProcedure
    .input(z.object({ assessmentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      // Buscar avaliação
      const [assessment] = await db.select().from(seusdadosAssessments)
        .where(eq(seusdadosAssessments.id, input.assessmentId));
      
      if (!assessment) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Avaliação não encontrada' });
      }
      
      // Buscar respostas
      const answers = await db.select().from(seusdadosAnswers)
        .where(eq(seusdadosAnswers.assessmentId, input.assessmentId));
      
      // Calcular scores
      const answersForCalc = answers.map(a => ({
        questionCode: a.questionCode,
        selectedLevel: a.selectedLevel
      }));
      
      const overallScore = calculateOverallScore(answersForCalc);
      const domainScores = calculateAllDomainScores(answersForCalc);
      
      // Identificar pontos fortes e gaps por domínio
      const domainSummary = domainScores.map(ds => {
        const domainAnswers = answers.filter(a => {
          const question = getQuestionById(a.questionCode);
          const domain = SEUSDADOS_DOMAINS.find(d => d.questions.some(q => q.id === a.questionCode));
          return domain?.code === ds.domainCode;
        });
        
        const strengths = domainAnswers
          .filter(a => a.selectedLevel >= 4)
          .map(a => getQuestionById(a.questionCode)?.prompt.substring(0, 100) + '...')
          .slice(0, 3);
        
        const gaps = domainAnswers
          .filter(a => a.selectedLevel <= 2)
          .map(a => getQuestionById(a.questionCode)?.prompt.substring(0, 100) + '...')
          .slice(0, 3);
        
        return {
          domainCode: ds.domainCode,
          domainLabel: ds.domainLabel,
          scoreAvg: ds.scoreAvg,
          levelRounded: ds.levelRounded,
          levelLabel: getMaturityLevelLabel(ds.levelRounded),
          topStrengths: strengths,
          topGaps: gaps
        };
      });
      
      // Identificar achados críticos
      const criticalFindings = answers
        .filter(a => a.selectedLevel <= 2)
        .map(a => {
          const question = getQuestionById(a.questionCode);
          return {
            severity: a.selectedLevel === 1 ? 'CRITICAL' : 'HIGH',
            title: question?.prompt.substring(0, 100) + '...',
            evidence: a.observations || 'Sem observações',
            relatedQuestionIds: [a.questionCode],
            recommendedFocus: `Elevar de nível ${a.selectedLevel} para nível 4`
          };
        })
        .slice(0, 10);
      
      // Gerar recomendações 30/60/90 dias
      const actionPlan = generateActionPlan(answersForCalc);
      const p0Actions = actionPlan.filter(a => a.priority === 'P0').slice(0, 3);
      const p1Actions = actionPlan.filter(a => a.priority === 'P1').slice(0, 3);
      const p2Actions = actionPlan.filter(a => a.priority === 'P2').slice(0, 3);
      
      return {
        contract: 'report.executive.v1',
        title: `Relatório Executivo - ${assessment.title}`,
        generatedAt: new Date().toISOString(),
        overallMaturity: {
          scoreAvg: overallScore.scoreAvg,
          levelRounded: overallScore.levelRounded,
          label: getMaturityLevelLabel(overallScore.levelRounded)
        },
        domainSummary,
        criticalFindings,
        next30_60_90Days: {
          d30: p0Actions.map(a => a.title),
          d60: p1Actions.map(a => a.title),
          d90: p2Actions.map(a => a.title)
        }
      };
    }),
  
  // Obter relatório técnico
  getTechnicalReport: protectedProcedure
    .input(z.object({ assessmentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      // Buscar avaliação
      const [assessment] = await db.select().from(seusdadosAssessments)
        .where(eq(seusdadosAssessments.id, input.assessmentId));
      
      if (!assessment) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Avaliação não encontrada' });
      }
      
      // Buscar respostas
      const answers = await db.select().from(seusdadosAnswers)
        .where(eq(seusdadosAnswers.assessmentId, input.assessmentId));
      
      // Calcular scores
      const answersForCalc = answers.map(a => ({
        questionCode: a.questionCode,
        selectedLevel: a.selectedLevel
      }));
      
      const overallScore = calculateOverallScore(answersForCalc);
      
      // Detalhes por domínio
      const byDomain = SEUSDADOS_DOMAINS.map(domain => {
        const domainScore = calculateDomainScore(answersForCalc, domain.code);
        
        const questionDetails = domain.questions.map(q => {
          const answer = answers.find(a => a.questionCode === q.id);
          return {
            questionId: q.id,
            prompt: q.prompt,
            selectedLevel: answer?.selectedLevel || null,
            selectedOptionCode: answer?.selectedOptionCode || null,
            observations: answer?.observations || null,
            evidenceLinks: (answer?.evidence as any)?.links || [],
            frameworkMetadata: q.frameworkMetadata
          };
        });
        
        return {
          domainCode: domain.code,
          domainLabel: domain.label,
          scoreAvg: domainScore.scoreAvg,
          levelRounded: domainScore.levelRounded,
          levelLabel: getMaturityLevelLabel(domainScore.levelRounded),
          distribution: domainScore.distribution,
          questionDetails
        };
      });
      
      // Visões por framework
      const frameworkViews = {
        ISO: {
          coverageNotes: 'Cobertura de controles ISO 27001/27701/27002',
          mappedItems: getAllQuestions()
            .filter(q => q.frameworkTags.includes('ISO'))
            .map(q => q.id)
        },
        NIST: {
          coverageNotes: 'Cobertura de funções NIST Privacy Framework',
          mappedItems: getAllQuestions()
            .filter(q => q.frameworkTags.includes('NIST'))
            .map(q => q.id)
        },
        LGPD: {
          coverageNotes: 'Cobertura de requisitos LGPD',
          mappedItems: getAllQuestions()
            .filter(q => q.frameworkTags.includes('LGPD'))
            .map(q => q.id)
        },
        IA: {
          coverageNotes: 'Cobertura de governança de IA',
          mappedItems: getAllQuestions()
            .filter(q => q.frameworkTags.includes('IA'))
            .map(q => q.id)
        }
      };
      
      return {
        contract: 'report.technical.v1',
        overall: {
          scoreAvg: overallScore.scoreAvg,
          levelRounded: overallScore.levelRounded,
          levelLabel: getMaturityLevelLabel(overallScore.levelRounded),
          method: 'level_value'
        },
        byDomain,
        frameworkViews
      };
    }),
  
  // Obter plano de ação
  getActionPlan: protectedProcedure
    .input(z.object({ assessmentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      // Buscar respostas
      const answers = await db.select().from(seusdadosAnswers)
        .where(eq(seusdadosAnswers.assessmentId, input.assessmentId));
      
      const answersForCalc = answers.map(a => ({
        questionCode: a.questionCode,
        selectedLevel: a.selectedLevel
      }));
      
      const actionPlan = generateActionPlan(answersForCalc);
      
      return {
        contract: 'plan.action.v1',
        prioritizationRule: 'RiskBasedThenEffort',
        items: actionPlan
      };
    }),
  
  // ==================== ADMINISTRAÇÃO ====================
  
  // Seed do framework (popular banco com dados)
  seedFramework: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Verificar se é admin
      if (ctx.user.role !== 'admin_global') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores podem executar o seed' });
      }
      
      return await seedSeusdadosFramework();
    }),
  
  // Deletar avaliação
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      // Deletar respostas primeiro
      await db.delete(seusdadosAnswers)
        .where(eq(seusdadosAnswers.assessmentId, input.id));
      
      // Deletar scores
      await db.delete(seusdadosDomainScores)
        .where(eq(seusdadosDomainScores.assessmentId, input.id));
      
      // Deletar avaliação
      await db.delete(seusdadosAssessments)
        .where(eq(seusdadosAssessments.id, input.id));
      
      return { success: true };
    })
});

// Função auxiliar para recalcular scores
async function recalculateScores(assessmentId: number) {
  const db = await getDb();
  if (!db) return;
  
  // Buscar todas as respostas
  const answers = await db.select().from(seusdadosAnswers)
    .where(eq(seusdadosAnswers.assessmentId, assessmentId));
  
  const answersForCalc = answers.map(a => ({
    questionCode: a.questionCode,
    selectedLevel: a.selectedLevel
  }));
  
  // Calcular score geral
  const overallScore = calculateOverallScore(answersForCalc);
  
  // Atualizar avaliação
  await db.update(seusdadosAssessments)
    .set({
      overallScoreAvg: String(overallScore.scoreAvg),
      overallLevelRounded: overallScore.levelRounded,
      answeredQuestions: answers.length,
      status: answers.length > 0 ? 'em_andamento' : 'rascunho'
    })
    .where(eq(seusdadosAssessments.id, assessmentId));
  
  // Calcular e salvar scores por domínio
  const domainScores = calculateAllDomainScores(answersForCalc);
  
  for (const ds of domainScores) {
    await db.insert(seusdadosDomainScores).values({
      assessmentId,
      domainCode: ds.domainCode,
      scoreAvg: String(ds.scoreAvg),
      levelRounded: ds.levelRounded,
      answeredQuestions: ds.answeredQuestions,
      totalQuestions: ds.totalQuestions,
      distribution: ds.distribution
    }).onConflictDoUpdate({ target: [], set: {
        scoreAvg: String(ds.scoreAvg),
        levelRounded: ds.levelRounded,
        answeredQuestions: ds.answeredQuestions,
        totalQuestions: ds.totalQuestions,
        distribution: ds.distribution
      }
    });
  }
}
