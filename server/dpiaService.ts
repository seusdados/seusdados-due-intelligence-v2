/**
 * DPIA Service - Data Protection Impact Assessment
 * Serviço para geração automática de DPIAs a partir de mapeamentos de alto risco
 */

import { getDb } from "./db";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { TRPCError } from '@trpc/server';
import { ensureActionPlansFromDpia } from "./ripdActionPlanService";
import {
  rotOperations, 
  organizations, 
  users,
  mapeamentoResponses,
  mapeamentoProcesses,
  mapeamentoAreas,
  mapeamentoContexts,
  actionPlans
} from "../drizzle/schema";

// ============================================
// TIPOS
// ============================================

export interface DpiaAssessment {
  id: number;
  organizationId: number;
  title: string;
  description: string | null;
  sourceType: 'manual' | 'mapeamento' | 'contrato' | 'incidente';
  sourceId: number | null;
  riskLevel: 'baixo' | 'moderado' | 'alto' | 'critico';
  overallScore: number;
  status: 'draft' | 'in_progress' | 'pending_review' | 'approved' | 'rejected' | 'archived';
  dpoId: number | null;
  createdById: number;
  reviewedById: number | null;
  approvedById: number | null;
  reviewedAt: string | null;
  approvedAt: string | null;
  nextReviewDate: string | null;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

export interface DpiaQuestion {
  id: number;
  category: string;
  questionText: string;
  helpText: string | null;
  questionType: string;
  options: any;
  riskWeight: number;
  displayOrder: number;
  isActive: number;
  isRequired: number;
  legalReference: string | null;
}

export interface DpiaResponse {
  id: number;
  dpiaId: number;
  questionId: number;
  responseText: string | null;
  responseValue: string | null;
  responseJson: any;
  riskScore: number;
  notes: string | null;
  answeredById: number;
}

export interface DpiaRisk {
  id: number;
  dpiaId: number;
  title: string;
  description: string;
  riskCategory: string;
  likelihood: string;
  impact: string;
  riskLevel: string;
  riskScore: number;
  status: string;
  legalReference: string | null;
}

export interface DpiaMitigation {
  id: number;
  dpiaId: number;
  riskId: number;
  title: string;
  description: string;
  mitigationType: string;
  status: string;
  responsibleId: number | null;
  dueDate: string | null;
  completedAt: string | null;
  effectivenessRating: string | null;
  actionPlanId: number | null;
}

// ============================================
// FUNÇÕES DE BANCO DE DADOS
// ============================================

export async function getDpiaAssessments(organizationId: number): Promise<DpiaAssessment[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const results = await db.execute(sql`
    SELECT * FROM dpia_assessments 
    WHERE "organizationId" = ${organizationId}
    ORDER BY "createdAt" DESC
  `);

  return ((results as any).rows as any[]).map(mapDpiaFromDb);
}

export async function getDpiaById(id: number): Promise<DpiaAssessment | null> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const results = await db.execute(sql`
    SELECT * FROM dpia_assessments WHERE id = ${id}
  `);

  const rows = (results as any).rows as any[];
  if (rows.length === 0) return null;
  return mapDpiaFromDb(rows[0]);
}

export async function getDpiaQuestions(): Promise<DpiaQuestion[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const results = await db.execute(sql`
    SELECT * FROM dpia_questions 
    WHERE "isActive" = true 
    ORDER BY "displayOrder" ASC
  `);

  return ((results as any).rows as any[]).map(row => ({
    id: row.id,
    category: row.category,
    questionText: row.questionText,
    helpText: row.helpText,
    questionType: row.questionType,
    options: row.options,
    riskWeight: row.riskWeight,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    isRequired: row.isRequired,
    legalReference: row.legalReference
  }));
}

export async function getDpiaResponses(dpiaId: number): Promise<DpiaResponse[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const results = await db.execute(sql`
    SELECT * FROM dpia_responses WHERE "dpiaId" = ${dpiaId}
  `);

  return ((results as any).rows as any[]).map(row => ({
    id: row.id,
    dpiaId: row.dpiaId,
    questionId: row.questionId,
    responseText: row.responseText,
    responseValue: row.responseValue,
    responseJson: row.responseJson,
    riskScore: row.riskScore,
    notes: row.notes,
    answeredById: row.answeredById
  }));
}

export async function getDpiaRisks(dpiaId: number): Promise<DpiaRisk[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const results = await db.execute(sql`
    SELECT * FROM dpia_risks WHERE "dpiaId" = ${dpiaId} ORDER BY "riskScore" DESC
  `);

  return ((results as any).rows as any[]).map(row => ({
    id: row.id,
    dpiaId: row.dpiaId,
    title: row.title,
    description: row.description,
    riskCategory: row.riskCategory,
    likelihood: row.likelihood,
    impact: row.impact,
    riskLevel: row.riskLevel,
    riskScore: row.riskScore,
    status: row.status,
    legalReference: row.legalReference
  }));
}

export async function getDpiaMitigations(dpiaId: number): Promise<DpiaMitigation[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const results = await db.execute(sql`
    SELECT * FROM dpia_mitigations WHERE "dpiaId" = ${dpiaId}
  `);

  return ((results as any).rows as any[]).map(row => ({
    id: row.id,
    dpiaId: row.dpiaId,
    riskId: row.riskId,
    title: row.title,
    description: row.description,
    mitigationType: row.mitigationType,
    status: row.status,
    responsibleId: row.responsibleId,
    dueDate: row.dueDate,
    completedAt: row.completedAt,
    effectivenessRating: row.effectivenessRating,
    actionPlanId: row.actionPlanId
  }));
}

function mapDpiaFromDb(row: any): DpiaAssessment {
  return {
    id: row.id,
    organizationId: row.organizationId,
    title: row.title,
    description: row.description,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    riskLevel: row.riskLevel,
    overallScore: row.overallScore,
    status: row.status,
    dpoId: row.dpoId,
    createdById: row.createdById,
    reviewedById: row.reviewedById,
    approvedById: row.approvedById,
    reviewedAt: row.reviewedAt,
    approvedAt: row.approvedAt,
    nextReviewDate: row.nextReviewDate,
    metadata: row.metadata,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

// ============================================
// CRIAÇÃO DE DPIA
// ============================================

export async function createDpia(data: {
  organizationId: number;
  title: string;
  description?: string;
  sourceType: 'manual' | 'mapeamento' | 'contrato' | 'incidente';
  sourceId?: number;
  createdById: number;
  dpoId?: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const result = await db.execute(sql`
    INSERT INTO dpia_assessments (
      "organizationId", title, description, "sourceType", "sourceId", 
      "createdById", "dpoId", status, "riskLevel"
    ) VALUES (
      ${data.organizationId}, ${data.title}, ${data.description || null}, 
      ${data.sourceType}, ${data.sourceId || null}, ${data.createdById}, 
      ${data.dpoId || null}, 'draft', 'moderado'
    ) RETURNING id
  `);

  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
}

export async function updateDpiaStatus(
  dpiaId: number, 
  status: string, 
  userId?: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  let updateQuery = sql`UPDATE dpia_assessments SET status = ${status}`;
  
  if (status === 'approved' && userId) {
    updateQuery = sql`UPDATE dpia_assessments SET status = ${status}, "approvedById" = ${userId}, "approvedAt" = NOW()`;
  } else if (status === 'pending_review' && userId) {
    updateQuery = sql`UPDATE dpia_assessments SET status = ${status}, "reviewedById" = ${userId}, "reviewedAt" = NOW()`;
  }

  await db.execute(sql`${updateQuery} WHERE id = ${dpiaId}`);
}

export async function saveDpiaResponse(data: {
  dpiaId: number;
  questionId: number;
  responseText?: string;
  responseValue?: string;
  responseJson?: any;
  riskScore?: number;
  notes?: string;
  answeredById: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Verificar se já existe resposta para esta pergunta
  const existing = await db.execute(sql`
    SELECT id FROM dpia_responses 
    WHERE "dpiaId" = ${data.dpiaId} AND "questionId" = ${data.questionId}
  `);

  const existingRows = (existing as any).rows as any[];
  if (existingRows.length > 0) {
    // Atualizar resposta existente
    await db.execute(sql`
      UPDATE dpia_responses SET
        "responseText" = ${data.responseText || null},
        "responseValue" = ${data.responseValue || null},
        "responseJson" = ${data.responseJson ? JSON.stringify(data.responseJson) : null},
        "riskScore" = ${data.riskScore || 0},
        notes = ${data.notes || null},
        "answeredById" = ${data.answeredById}
      WHERE "dpiaId" = ${data.dpiaId} AND "questionId" = ${data.questionId}
    `);
    return existingRows[0].id;
  }

  // Criar nova resposta
  const result = await db.execute(sql`
    INSERT INTO dpia_responses (
      "dpiaId", "questionId", "responseText", "responseValue", "responseJson",
      "riskScore", notes, "answeredById"
    ) VALUES (
      ${data.dpiaId}, ${data.questionId}, ${data.responseText || null},
      ${data.responseValue || null}, ${data.responseJson ? JSON.stringify(data.responseJson) : null},
      ${data.riskScore || 0}, ${data.notes || null}, ${data.answeredById}
    ) RETURNING id
  `);

  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
}

export async function saveDpiaRisk(data: {
  dpiaId: number;
  title: string;
  description: string;
  riskCategory: string;
  likelihood: string;
  impact: string;
  legalReference?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Normalização defensiva: o DB real usa moderada/moderado
  const normalizeLikelihood = (v: string) => {
    const s = String(v || "").trim().toLowerCase();
    if (s === "media") return "moderada";
    if (s === "média") return "moderada";
    return s;
  };
  const normalizeImpact = (v: string) => {
    const s = String(v || "").trim().toLowerCase();
    if (s === "medio") return "moderado";
    if (s === "médio") return "moderado";
    return s;
  };

  const likelihoodNorm = normalizeLikelihood(data.likelihood);
  const impactNorm = normalizeImpact(data.impact);

  // Calcular nível de risco e score
  const likelihoodScores: Record<string, number> = {
    muito_baixa: 1, baixa: 2, moderada: 3, alta: 4, muito_alta: 5
  };
  const impactScores: Record<string, number> = {
    muito_baixo: 1, baixo: 2, moderado: 3, alto: 4, muito_alto: 5
  };

  const riskScore = (likelihoodScores[likelihoodNorm] || 3) * (impactScores[impactNorm] || 3);
  
  let riskLevel = 'baixo';
  if (riskScore >= 20) riskLevel = 'muito_critico';
  else if (riskScore >= 15) riskLevel = 'critico';
  else if (riskScore >= 10) riskLevel = 'alto';
  else if (riskScore >= 5) riskLevel = 'moderado';

  const result = await db.execute(sql`
    INSERT INTO dpia_risks (
      "dpiaId", title, description, "riskCategory", likelihood, impact,
      "riskLevel", "riskScore", status, "legalReference"
    ) VALUES (
      ${data.dpiaId}, ${data.title}, ${data.description}, ${data.riskCategory},
      ${likelihoodNorm}, ${impactNorm}, ${riskLevel}, ${riskScore},
      'identificado', ${data.legalReference || null}
    ) RETURNING id
  `);

  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
}

export async function saveDpiaMitigation(data: {
  dpiaId: number;
  riskId: number;
  title: string;
  description: string;
  mitigationType: string;
  responsibleId?: number;
  dueDate?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const result = await db.execute(sql`
    INSERT INTO dpia_mitigations (
      "dpiaId", "riskId", title, description, "mitigationType",
      status, "responsibleId", "dueDate"
    ) VALUES (
      ${data.dpiaId}, ${data.riskId}, ${data.title}, ${data.description},
      ${data.mitigationType}, 'planejada', ${data.responsibleId || null},
      ${data.dueDate || null}
    ) RETURNING id
  `);

  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
}

// ============================================
// GERAÇÃO AUTOMÁTICA DE DPIA A PARTIR DE MAPEAMENTO
// ============================================

export async function generateDpiaFromMapeamento(
  rotId: number,
  organizationId: number,
  userId: number
): Promise<{ dpiaId: number; risks: DpiaRisk[]; mitigations: DpiaMitigation[] }> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Buscar dados do ROT (mapeamento)
  const [rot] = await db
    .select()
    .from(rotOperations)
    .where(eq(rotOperations.id, rotId));

  if (!rot) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Mapeamento não encontrado' });
  }

  /**
   * Buscar respostas do mapeamento:
   * - CORRETO: por rotId (um processo = um conjunto coerente de respostas)
   * - Fallback: por organizationId (modo compatibilidade, caso rotId não exista no ambiente)
   */
  let responses: any[] = [];
  try {
    const results = await db.execute(sql`
      SELECT *
      FROM mapeamento_responses
      WHERE "rotId" = ${rotId}
      LIMIT 200
    `);
    responses = ((results as any).rows as any[]) || [];
  } catch (_) {
    // fallback total
    const fallback = await db
      .select()
      .from(mapeamentoResponses)
      .where(eq(mapeamentoResponses.organizationId, organizationId));
    responses = fallback as any[];
  }

  // Criar DPIA
  const dpiaId = await createDpia({
    organizationId,
    title: `DPIA - ${rot.title}`,
    description: `Relatório de Impacto à Proteção de Dados Pessoais gerado automaticamente a partir do mapeamento "${rot.title}"`,
    sourceType: 'mapeamento',
    sourceId: rotId,
    createdById: userId
  });

  // Preparar contexto para análise de IA
  const mapeamentoContext = {
    titulo: rot.title,
    descricao: rot.description,
    departamento: rot.department,
    categoriaTitular: rot.titularCategory,
    finalidade: rot.purpose,
    baseLegal: rot.legalBase,
    categoriasDados: rot.dataCategories,
    respostas: responses.map(r => ({
      categoriasDados: r.dataCategories,
      baseLegal: r.legalBase,
      nivelRisco: r.riskLevel,
      notas: r.notes,
      ropaData: (r as any).ropaData || null,
      dataUses: (r as any).ropaData?.dataUses || null
    }))
  };

  // Gerar análise de riscos com IA
  const aiAnalysis = await generateDpiaRisksWithAI(mapeamentoContext);

  // Salvar riscos identificados
  const savedRisks: DpiaRisk[] = [];
  for (const risk of aiAnalysis.risks) {
    const riskId = await saveDpiaRisk({
      dpiaId,
      title: risk.title,
      description: risk.description,
      riskCategory: risk.category,
      likelihood: risk.likelihood,
      impact: risk.impact,
      legalReference: risk.legalReference
    });
    
    const savedRisk = await getDpiaRiskById(riskId);
    if (savedRisk) savedRisks.push(savedRisk);
  }

  // Salvar medidas de mitigação
  const savedMitigations: DpiaMitigation[] = [];
  for (const mitigation of aiAnalysis.mitigations) {
    const riskId = savedRisks.find(r => r.title === mitigation.riskTitle)?.id;
    if (!riskId) continue;

    const mitigationId = await saveDpiaMitigation({
      dpiaId,
      riskId,
      title: mitigation.title,
      description: mitigation.description,
      mitigationType: mitigation.type
    });

    const savedMitigation = await getDpiaMitigationById(mitigationId);
    if (savedMitigation) savedMitigations.push(savedMitigation);
  }

  /**
   * PREMIUM: gerar Action Plans automaticamente a partir das mitigations do DPIA.
   * - idempotente (não duplica)
   * - conecta execução operacional ao RIPD/DPIA
   */
  try {
    await ensureActionPlansFromDpia({
      organizationId,
      dpiaId,
      actorUserId: userId,
      defaultResponsibleId: null,
    });
  } catch (e) {
    console.error("[DPIA->ACTION_PLANS] Falha ao sincronizar action_plans:", e);
  }

  // Calcular score geral e atualizar DPIA
  const overallScore = calculateOverallScore(savedRisks);
  const riskLevel = determineRiskLevel(overallScore);

  await db.execute(sql`
    UPDATE dpia_assessments 
    SET "overallScore" = ${overallScore}, "riskLevel" = ${riskLevel}, status = 'in_progress'
    WHERE id = ${dpiaId}
  `);

  return {
    dpiaId,
    risks: savedRisks,
    mitigations: savedMitigations
  };
}

async function getDpiaRiskById(id: number): Promise<DpiaRisk | null> {
  const db = await getDb();
  if (!db) return null;

  const results = await db.execute(sql`SELECT * FROM dpia_risks WHERE id = ${id}`);
  const rows = (results as any).rows as any[];
  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    dpiaId: row.dpiaId,
    title: row.title,
    description: row.description,
    riskCategory: row.riskCategory,
    likelihood: row.likelihood,
    impact: row.impact,
    riskLevel: row.riskLevel,
    riskScore: row.riskScore,
    status: row.status,
    legalReference: row.legalReference
  };
}

async function getDpiaMitigationById(id: number): Promise<DpiaMitigation | null> {
  const db = await getDb();
  if (!db) return null;

  const results = await db.execute(sql`SELECT * FROM dpia_mitigations WHERE id = ${id}`);
  const rows = (results as any).rows as any[];
  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    dpiaId: row.dpiaId,
    riskId: row.riskId,
    title: row.title,
    description: row.description,
    mitigationType: row.mitigationType,
    status: row.status,
    responsibleId: row.responsibleId,
    dueDate: row.dueDate,
    completedAt: row.completedAt,
    effectivenessRating: row.effectivenessRating,
    actionPlanId: row.actionPlanId
  };
}

// ============================================
// ANÁLISE DE RISCOS COM IA
// ============================================

interface AIRiskAnalysis {
  risks: Array<{
    title: string;
    description: string;
    category: string;
    likelihood: string;
    impact: string;
    legalReference?: string;
  }>;
  mitigations: Array<{
    riskTitle: string;
    title: string;
    description: string;
    type: string;
  }>;
}

async function generateDpiaRisksWithAI(context: any): Promise<AIRiskAnalysis> {
  const prompt = `Você é um especialista em proteção de dados pessoais e LGPD. Analise o seguinte mapeamento de tratamento de dados e identifique os riscos aos titulares e medidas de mitigação.

MAPEAMENTO:
- Título: ${context.titulo}
- Descrição: ${context.descricao || 'Não informada'}
- Departamento: ${context.departamento || 'Não informado'}
- Categoria de Titular: ${context.categoriaTitular || 'Não informada'}
- Finalidade: ${context.finalidade || 'Não informada'}
- Base Legal: ${context.baseLegal || 'Não definida'}
- Categorias de Dados: ${JSON.stringify(context.categoriasDados || [])}

Com base nessas informações, identifique:
1. Os principais riscos aos direitos e liberdades dos titulares
2. Medidas de mitigação para cada risco

Responda APENAS em JSON válido no seguinte formato:
{
  "risks": [
    {
      "title": "Título do risco",
      "description": "Descrição detalhada do risco",
      "category": "acesso_nao_autorizado|perda_dados|uso_indevido|violacao_privacidade|discriminacao|dano_financeiro|dano_reputacional|nao_conformidade_legal|outro",
      "likelihood": "muito_baixa|baixa|moderada|alta|muito_alta",
      "impact": "muito_baixo|baixo|moderado|alto|muito_alto",
      "legalReference": "Referência legal (ex: Art. 46, LGPD)"
    }
  ],
  "mitigations": [
    {
      "riskTitle": "Título do risco relacionado",
      "title": "Título da medida",
      "description": "Descrição da medida de mitigação",
      "type": "tecnica|organizacional|juridica|fisica|treinamento|monitoramento|outro"
    }
  ]
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Você é um especialista em LGPD e proteção de dados. Responda sempre em JSON válido." },
        { role: "user", content: prompt }
      ]
    });

    const rawContent = response.choices[0]?.message?.content || '{"risks":[],"mitigations":[]}';
    const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
    
    // Tentar extrair JSON da resposta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return getDefaultRisks();
    }

    const parsed = JSON.parse(jsonMatch[0]) as AIRiskAnalysis;
    return parsed;
  } catch (error) {
    console.error("Erro ao gerar análise de riscos com IA:", error);
    return getDefaultRisks();
  }
}

function getDefaultRisks(): AIRiskAnalysis {
  return {
    risks: [
      {
        title: "Acesso não autorizado aos dados pessoais",
        description: "Risco de acesso indevido aos dados pessoais por pessoas não autorizadas, seja por falhas de segurança ou controle de acesso inadequado.",
        category: "acesso_nao_autorizado",
        likelihood: "moderada",
        impact: "alto",
        legalReference: "Art. 46, LGPD"
      },
      {
        title: "Uso dos dados para finalidade diversa",
        description: "Risco de utilização dos dados pessoais para finalidades diferentes das informadas ao titular.",
        category: "uso_indevido",
        likelihood: "baixa",
        impact: "alto",
        legalReference: "Art. 6º, I, LGPD"
      },
      {
        title: "Retenção excessiva de dados",
        description: "Risco de manter os dados pessoais por período superior ao necessário para a finalidade do tratamento.",
        category: "nao_conformidade_legal",
        likelihood: "moderada",
        impact: "moderado",
        legalReference: "Art. 16, LGPD"
      }
    ],
    mitigations: [
      {
        riskTitle: "Acesso não autorizado aos dados pessoais",
        title: "Implementar controle de acesso baseado em papéis",
        description: "Estabelecer matriz de acesso com perfis de usuário e permissões específicas para cada função.",
        type: "tecnica"
      },
      {
        riskTitle: "Uso dos dados para finalidade diversa",
        title: "Documentar e comunicar finalidades",
        description: "Manter registro claro das finalidades e comunicar aos titulares através de política de privacidade.",
        type: "organizacional"
      },
      {
        riskTitle: "Retenção excessiva de dados",
        title: "Implementar política de retenção",
        description: "Definir prazos de retenção e procedimentos de eliminação segura dos dados.",
        type: "organizacional"
      }
    ]
  };
}

function calculateOverallScore(risks: DpiaRisk[]): number {
  if (risks.length === 0) return 0;
  
  const totalScore = risks.reduce((sum, risk) => sum + risk.riskScore, 0);
  const maxPossibleScore = risks.length * 25; // 5 * 5 = 25 max por risco
  
  return Math.round((totalScore / maxPossibleScore) * 100);
}

function determineRiskLevel(score: number): 'baixo' | 'moderado' | 'alto' | 'critico' {
  if (score >= 75) return 'critico';
  if (score >= 50) return 'alto';
  if (score >= 25) return 'moderado';
  return 'baixo';
}

// ============================================
// VERIFICAR MAPEAMENTOS DE ALTO RISCO
// ============================================

export async function getHighRiskMapeamentos(organizationId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Buscar ROTs com nível de risco alto ou crítico que não têm DPIA
  const results = await db.execute(sql`
    SELECT r.* FROM rot_operations r
    LEFT JOIN dpia_assessments d ON d."sourceType" = 'mapeamento' AND d."sourceId" = r.id
    WHERE r."organizationId" = ${organizationId}
    AND r.status = 'aprovado'
    AND d.id IS NULL
    ORDER BY r."createdAt" DESC
  `);

  return (results as any).rows as any[];
}

// ============================================
// EXPORTAÇÃO DPIA PDF
// ============================================

export async function generateDpiaPDF(dpiaId: number): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;
  
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const dpia = await getDpiaById(dpiaId);
  if (!dpia) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DPIA não encontrado' });

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, dpia.organizationId));

  const questions = await getDpiaQuestions();
  const responses = await getDpiaResponses(dpiaId);
  const risks = await getDpiaRisks(dpiaId);
  const mitigations = await getDpiaMitigations(dpiaId);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ 
      size: "A4", 
      margin: 50,
      info: {
        Title: dpia.title,
        Author: "Seusdados Consultoria",
        Subject: "Relatório de Impacto à Proteção de Dados Pessoais"
      }
    });

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#6B21A8")
       .text("RELATÓRIO DE IMPACTO À PROTEÇÃO DE DADOS PESSOAIS", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(12).font("Helvetica").fillColor("#374151")
       .text("(DPIA - Data Protection Impact Assessment)", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#6B7280")
       .text(`Conforme Art. 38 da LGPD (Lei nº 13.709/2018)`, { align: "center" });
    doc.moveDown(2);

    // Informações do DPIA
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#1F2937")
       .text(dpia.title);
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica").fillColor("#374151");
    doc.text(`Organização: ${org?.name || "Não informado"}`);
    doc.text(`Status: ${getStatusLabel(dpia.status)}`);
    doc.text(`Nível de Risco: ${getRiskLabel(dpia.riskLevel)}`);
    doc.text(`Score Geral: ${dpia.overallScore}%`);
    doc.text(`Data de Criação: ${new Date(dpia.createdAt).toLocaleDateString("pt-BR")}`);
    doc.moveDown(2);

    // Descrição
    if (dpia.description) {
      doc.fontSize(12).font("Helvetica-Bold").fillColor("#1F2937")
         .text("DESCRIÇÃO");
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica").fillColor("#374151")
         .text(dpia.description);
      doc.moveDown(2);
    }

    // Riscos Identificados
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#1F2937")
       .text("RISCOS IDENTIFICADOS");
    doc.moveDown(0.5);

    risks.forEach((risk, index) => {
      if (doc.y > 700) doc.addPage();

      doc.fontSize(10).font("Helvetica-Bold").fillColor("#6B21A8")
         .text(`${index + 1}. ${risk.title}`);
      doc.fontSize(9).font("Helvetica").fillColor("#374151");
      doc.text(risk.description);
      doc.text(`Categoria: ${getCategoryLabel(risk.riskCategory)} | Probabilidade: ${getLikelihoodLabel(risk.likelihood)} | Impacto: ${getImpactLabel(risk.impact)}`);
      doc.text(`Nível: ${getRiskLabel(risk.riskLevel)} | Score: ${risk.riskScore}`);
      if (risk.legalReference) {
        doc.text(`Referência Legal: ${risk.legalReference}`);
      }
      doc.moveDown();
    });

    doc.moveDown();

    // Medidas de Mitigação
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#1F2937")
       .text("MEDIDAS DE MITIGAÇÃO");
    doc.moveDown(0.5);

    mitigations.forEach((mitigation, index) => {
      if (doc.y > 700) doc.addPage();

      doc.fontSize(10).font("Helvetica-Bold").fillColor("#6B21A8")
         .text(`${index + 1}. ${mitigation.title}`);
      doc.fontSize(9).font("Helvetica").fillColor("#374151");
      doc.text(mitigation.description);
      doc.text(`Tipo: ${getMitigationTypeLabel(mitigation.mitigationType)} | Status: ${getMitigationStatusLabel(mitigation.status)}`);
      doc.moveDown();
    });

    // Rodapé
    doc.fontSize(8).fillColor("#9CA3AF")
       .text("Documento gerado automaticamente pelo sistema Seusdados Due Diligence", 50, 780, { align: "center" });

    doc.end();
  });
}

// Labels helpers
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "Rascunho",
    in_progress: "Em Andamento",
    pending_review: "Aguardando Revisão",
    approved: "Aprovado",
    rejected: "Rejeitado",
    archived: "Arquivado"
  };
  return labels[status] || status;
}

function getRiskLabel(level: string): string {
  const labels: Record<string, string> = {
    baixo: "Baixo",
    moderado: "Moderado",
    alto: "Alto",
    critico: "Crítico"
  };
  return labels[level] || level;
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    acesso_nao_autorizado: "Acesso Não Autorizado",
    perda_dados: "Perda de Dados",
    uso_indevido: "Uso Indevido",
    violacao_privacidade: "Violação de Privacidade",
    discriminacao: "Discriminação",
    dano_financeiro: "Dano Financeiro",
    dano_reputacional: "Dano Reputacional",
    nao_conformidade_legal: "Não Conformidade Legal",
    outro: "Outro"
  };
  return labels[category] || category;
}

function getLikelihoodLabel(likelihood: string): string {
  const labels: Record<string, string> = {
    muito_baixa: "Muito Baixa",
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
    muito_alta: "Muito Alta"
  };
  return labels[likelihood] || likelihood;
}

function getImpactLabel(impact: string): string {
  const labels: Record<string, string> = {
    muito_baixo: "Muito Baixo",
    baixo: "Baixo",
    medio: "Médio",
    alto: "Alto",
    muito_alto: "Muito Alto"
  };
  return labels[impact] || impact;
}

function getMitigationTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    tecnica: "Técnica",
    organizacional: "Organizacional",
    juridica: "Jurídica",
    fisica: "Física",
    treinamento: "Treinamento",
    monitoramento: "Monitoramento",
    outro: "Outro"
  };
  return labels[type] || type;
}

function getMitigationStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    planejada: "Planejada",
    em_implementacao: "Em Implementação",
    implementada: "Implementada",
    verificada: "Verificada",
    cancelada: "Cancelada"
  };
  return labels[status] || status;
}


// ============================================
// INTEGRAÇÃO COM PLANOS DE AÇÃO
// ============================================

/**
 * Gera ações no módulo de Planos de Ação a partir das mitigações do DPIA
 */
export async function generateActionsFromDpia(
  dpiaId: number,
  userId: number
): Promise<{
  success: boolean;
  actionsCreated: number;
  actionIds: number[];
  errors: string[];
}> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const errors: string[] = [];
  const actionIds: number[] = [];

  // Buscar DPIA
  const dpiaResults = await db.execute(sql`
    SELECT * FROM dpia_assessments WHERE id = ${dpiaId}
  `);
  const dpias = (dpiaResults as any).rows as any[];
  
  if (dpias.length === 0) {
    return { success: false, actionsCreated: 0, actionIds: [], errors: ['DPIA não encontrado'] };
  }
  
  const dpia = dpias[0];

  // Buscar mitigações do DPIA
  const mitigationResults = await db.execute(sql`
    SELECT m.*, r.title as risk_title, r.description as risk_description, r.likelihood, r.impact
    FROM dpia_mitigations m
    LEFT JOIN dpia_risks r ON m."riskId" = r.id
    WHERE m."dpiaId" = ${dpiaId}
    AND m.status IN ('planejada', 'em_implementacao')
  `);
  const mitigations = (mitigationResults as any).rows as any[];

  if (mitigations.length === 0) {
    return { success: false, actionsCreated: 0, actionIds: [], errors: ['Nenhuma mitigação pendente encontrada'] };
  }

  // Mapear prioridade baseada no risco (com normalização defensiva)
  const normLikelihood = (v: string) => {
    const s = String(v || '').trim().toLowerCase();
    if (s === 'media' || s === 'média') return 'moderada';
    return s;
  };
  const normImpact = (v: string) => {
    const s = String(v || '').trim().toLowerCase();
    if (s === 'medio' || s === 'médio') return 'moderado';
    return s;
  };
  const mapPriority = (likelihood: string, impact: string): 'baixa' | 'media' | 'alta' | 'critica' => {
    const likelihoodScore: Record<string, number> = {
      muito_baixa: 1, baixa: 2, moderada: 3, alta: 4, muito_alta: 5
    };
    const impactScore: Record<string, number> = {
      muito_baixo: 1, baixo: 2, moderado: 3, alto: 4, muito_alto: 5
    };
    
    const score = (likelihoodScore[normLikelihood(likelihood)] || 3) * (impactScore[normImpact(impact)] || 3);
    
    if (score >= 20) return 'muito_critica';
    if (score >= 15) return 'critica';
    if (score >= 10) return 'alta';
    if (score >= 5) return 'media';
    return 'baixa';
  };

  // Criar ações para cada mitigação
  for (const mitigation of mitigations) {
    try {
      // Calcular data de vencimento (30 dias para mitigações planejadas, 15 para em implementação)
      const daysToAdd = mitigation.status === 'planejada' ? 30 : 15;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + daysToAdd);

      const priority = mapPriority(mitigation.likelihood, mitigation.impact);

      const insertResult = await db.execute(sql`
        INSERT INTO action_plans (
          "organizationId",
          "assessmentType",
          "assessmentId",
          title,
          description,
          priority,
          status,
          "responsibleId",
          "dueDate",
          notes,
          "actionCategory",
          "outputType",
          "createdAt",
          "updatedAt"
        ) VALUES (
          ${dpia.organizationId},
          'compliance',
          ${dpiaId},
          ${`[DPIA] ${mitigation.title}`},
          ${`Mitigação de risco: ${mitigation.risk_title || 'Risco identificado'}\n\n${mitigation.description || ''}\n\nRisco original: ${mitigation.risk_description || 'N/A'}`},
          ${priority},
          'pendente',
          ${mitigation.responsibleId || null},
          ${dueDate.toISOString().split('T')[0]},
          ${`Origem: DPIA #${dpiaId} - ${dpia.title}\nTipo de mitigação: ${getMitigationTypeLabel(mitigation.mitigationType)}\nEficácia esperada: ${mitigation.effectivenessRating || 'N/A'}%`},
          'operacional',
          'tarefa_operacional',
          NOW(),
          NOW()
        ) RETURNING id
      `);

      const insertId = (insertResult as any).rows?.[0]?.id ?? (insertResult as any)[0]?.id;
      if (insertId) {
        actionIds.push(insertId);
      }
    } catch (error) {
      errors.push(`Erro ao criar ação para mitigação ${mitigation.id}: ${error}`);
    }
  }

  return {
    success: actionIds.length > 0,
    actionsCreated: actionIds.length,
    actionIds,
    errors
  };
}

/**
 * Busca ações já criadas a partir de um DPIA
 */
export async function getActionsFromDpia(dpiaId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const results = await db.execute(sql`
    SELECT ap.*, u.name as responsible_name
    FROM action_plans ap
    LEFT JOIN users u ON ap."responsibleId" = u.id
    WHERE ap."assessmentType" = 'compliance'
    AND ap."assessmentId" = ${dpiaId}
    AND ap.title LIKE '[DPIA]%'
    ORDER BY ap.priority DESC, ap."dueDate" ASC
  `);

  return (results as any).rows as any[];
}

/**
 * Atualiza status da mitigação quando ação é concluída
 */
export async function syncMitigationStatus(actionId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Buscar ação
  const actionResults = await db.execute(sql`
    SELECT * FROM action_plans WHERE id = ${actionId}
  `);
  const actions = (actionResults as any).rows as any[];
  
  if (actions.length === 0 || !actions[0].title.startsWith('[DPIA]')) {
    return;
  }

  const action = actions[0];
  
  // Se ação foi concluída, atualizar mitigação correspondente
  if (action.status === 'concluida') {
    // Buscar mitigação pelo título (remover prefixo [DPIA])
    const mitigationTitle = action.title.replace('[DPIA] ', '');
    
    await db.execute(sql`
      UPDATE dpia_mitigations
      SET status = 'implementada', "updatedAt" = NOW()
      WHERE "dpiaId" = ${action.assessmentId}
      AND title = ${mitigationTitle}
    `);
  }
}


// ============================================
// DASHBOARD CONSOLIDADO DE COMPLIANCE
// ============================================

export interface ComplianceMetrics {
  // DPIA
  dpia: {
    total: number;
    draft: number;
    inProgress: number;
    pendingReview: number;
    approved: number;
    avgRiskScore: number;
    criticalRisks: number;
    highRisks: number;
  };
  // ROPA
  ropa: {
    total: number;
    rascunho: number;
    emRevisao: number;
    aprovado: number;
    arquivado: number;
    withSensitiveData: number;
  };
  // Revisões
  reviews: {
    totalScheduled: number;
    pending: number;
    overdue: number;
    completedThisMonth: number;
    upcomingThisWeek: number;
  };
  // Score Geral
  overallScore: number;
  complianceLevel: 'critico' | 'baixo' | 'moderado' | 'alto' | 'excelente';
  lastUpdated: string;
}

/**
 * Obtém métricas consolidadas de compliance para uma organização
 */
export async function getComplianceMetrics(organizationId: number): Promise<ComplianceMetrics> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Métricas DPIA
  const dpiaResults = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'pending_review' THEN 1 ELSE 0 END) as pending_review,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
      AVG("overallScore") as avg_score
    FROM dpia_assessments
    WHERE "organizationId" = ${organizationId}
  `);
  const dpiaStats = ((dpiaResults as any).rows as any[])[0] || {};

  // Riscos críticos e altos
  const riskResults = await db.execute(sql`
    SELECT 
      SUM(CASE WHEN r."riskLevel" = 'critico' THEN 1 ELSE 0 END) as critical,
      SUM(CASE WHEN r."riskLevel" = 'alto' THEN 1 ELSE 0 END) as high
    FROM dpia_risks r
    INNER JOIN dpia_assessments d ON r."dpiaId" = d.id
    WHERE d."organizationId" = ${organizationId}
    AND r.status != 'mitigated'
  `);
  const riskStats = ((riskResults as any).rows as any[])[0] || {};

  // Métricas ROPA
  const ropaResults = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'rascunho' THEN 1 ELSE 0 END) as rascunho,
      SUM(CASE WHEN status = 'em_revisao' THEN 1 ELSE 0 END) as em_revisao,
      SUM(CASE WHEN status = 'aprovado' THEN 1 ELSE 0 END) as aprovado,
      SUM(CASE WHEN status = 'arquivado' THEN 1 ELSE 0 END) as arquivado
    FROM rot_operations
    WHERE "organizationId" = ${organizationId}
  `);
  const ropaStats = ((ropaResults as any).rows as any[])[0] || {};

  // ROTs com dados sensíveis
  const sensitiveResults = await db.execute(sql`
    SELECT COUNT(DISTINCT r.id) as count
    FROM rot_operations r
    WHERE r."organizationId" = ${organizationId}
    AND r."dataCategories"::jsonb @> '[{"sensivel": true}]'::jsonb
  `);
  const sensitiveCount = ((sensitiveResults as any).rows as any[])[0]?.count || 0;

  // Métricas de Revisão
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  const reviewResults = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue,
      SUM(CASE WHEN "nextReviewDate" <= ${nextWeekStr} AND status = 'scheduled' THEN 1 ELSE 0 END) as upcoming_week
    FROM mapeamento_review_schedule
    WHERE "organizationId" = ${organizationId}
  `);
  const reviewStats = ((reviewResults as any).rows as any[])[0] || {};

  // Revisões concluídas este mês
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  const completedResults = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM mapeamento_review_history
    WHERE "organizationId" = ${organizationId}
    AND "reviewedAt" >= ${firstDayOfMonth.toISOString().split('T')[0]}
  `);
  const completedThisMonth = ((completedResults as any).rows as any[])[0]?.count || 0;

  // Calcular score geral de compliance
  const dpiaScore = dpiaStats.total > 0 
    ? (Number(dpiaStats.approved) / Number(dpiaStats.total)) * 100 
    : 0;
  const ropaScore = ropaStats.total > 0 
    ? (Number(ropaStats.aprovado) / Number(ropaStats.total)) * 100 
    : 0;
  const reviewScore = reviewStats.total > 0 
    ? Math.max(0, 100 - (Number(reviewStats.overdue) / Number(reviewStats.total)) * 100)
    : 100;
  const riskPenalty = (Number(riskStats.critical) * 10) + (Number(riskStats.high) * 5);

  const overallScore = Math.max(0, Math.min(100, 
    (dpiaScore * 0.3 + ropaScore * 0.4 + reviewScore * 0.3) - riskPenalty
  ));

  // Determinar nível de compliance
  let complianceLevel: ComplianceMetrics['complianceLevel'];
  if (overallScore >= 90) complianceLevel = 'excelente';
  else if (overallScore >= 70) complianceLevel = 'alto';
  else if (overallScore >= 50) complianceLevel = 'moderado';
  else if (overallScore >= 30) complianceLevel = 'baixo';
  else complianceLevel = 'critico';

  return {
    dpia: {
      total: Number(dpiaStats.total) || 0,
      draft: Number(dpiaStats.draft) || 0,
      inProgress: Number(dpiaStats.in_progress) || 0,
      pendingReview: Number(dpiaStats.pending_review) || 0,
      approved: Number(dpiaStats.approved) || 0,
      avgRiskScore: Number(dpiaStats.avg_score) || 0,
      criticalRisks: Number(riskStats.critical) || 0,
      highRisks: Number(riskStats.high) || 0,
    },
    ropa: {
      total: Number(ropaStats.total) || 0,
      rascunho: Number(ropaStats.rascunho) || 0,
      emRevisao: Number(ropaStats.em_revisao) || 0,
      aprovado: Number(ropaStats.aprovado) || 0,
      arquivado: Number(ropaStats.arquivado) || 0,
      withSensitiveData: sensitiveCount,
    },
    reviews: {
      totalScheduled: Number(reviewStats.total) || 0,
      pending: Number(reviewStats.pending) || 0,
      overdue: Number(reviewStats.overdue) || 0,
      completedThisMonth,
      upcomingThisWeek: Number(reviewStats.upcoming_week) || 0,
    },
    overallScore: Math.round(overallScore),
    complianceLevel,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Obtém atividades recentes de compliance
 */
export async function getRecentComplianceActivities(
  organizationId: number,
  limit: number = 10
): Promise<Array<{
  id: number;
  type: 'dpia' | 'ropa' | 'review';
  title: string;
  description: string;
  status: string;
  createdAt: string;
}>> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const activities: Array<{
    id: number;
    type: 'dpia' | 'ropa' | 'review';
    title: string;
    description: string;
    status: string;
    createdAt: string;
  }> = [];

  // DPIAs recentes
  const dpiaResults = await db.execute(sql`
    SELECT id, title, status, "createdAt"
    FROM dpia_assessments
    WHERE "organizationId" = ${organizationId}
    ORDER BY "createdAt" DESC
    LIMIT 5
  `);
  for (const dpia of (dpiaResults as any).rows as any[]) {
    activities.push({
      id: dpia.id,
      type: 'dpia',
      title: dpia.title,
      description: 'Avaliação de Impacto à Proteção de Dados',
      status: dpia.status,
      createdAt: dpia.createdAt,
    });
  }

  // ROTs recentes
  const rotResults = await db.execute(sql`
    SELECT id, title, status, "createdAt"
    FROM rot_operations
    WHERE "organizationId" = ${organizationId}
    ORDER BY "createdAt" DESC
    LIMIT 5
  `);
  for (const rot of (rotResults as any).rows as any[]) {
    activities.push({
      id: rot.id,
      type: 'ropa',
      title: rot.title,
      description: 'Registro de Operação de Tratamento',
      status: rot.status,
      createdAt: rot.createdAt,
    });
  }

  // Revisões recentes
  const reviewResults = await db.execute(sql`
    SELECT h.id, r.title as mapeamento_title, h."reviewResult", h."reviewedAt"
    FROM mapeamento_review_history h
    LEFT JOIN rot_operations r ON h."mapeamentoType" = 'rot' AND h."mapeamentoId" = r.id
    WHERE h."organizationId" = ${organizationId}
    ORDER BY h."reviewedAt" DESC
    LIMIT 5
  `);
  for (const review of (reviewResults as any).rows as any[]) {
    activities.push({
      id: review.id,
      type: 'review',
      title: review.mapeamento_title || 'Revisão de Mapeamento',
      description: 'Revisão periódica concluída',
      status: review.reviewResult,
      createdAt: review.reviewedAt,
    });
  }

  // Ordenar por data e limitar
  return activities
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}


// ============================================
// INTEGRAÇÃO COM GED - DOCUMENTOS RIPD
// ============================================

import * as gedService from './gedService';

/**
 * Salva o PDF do RIPD no GED
 * @param dpiaId ID do DPIA/RIPD
 * @param userId ID do usuário que está gerando
 * @param pdfBuffer Buffer do PDF gerado
 * @param documentType Tipo de documento (completo, simplificado, anpd)
 */
export async function saveRipdToGed(
  dpiaId: number,
  userId: number,
  pdfBuffer: Buffer,
  documentType: 'completo' | 'simplificado' | 'anpd' = 'completo'
): Promise<{ documentId: number; url: string } | null> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  try {
    // Buscar DPIA
    const dpia = await getDpiaById(dpiaId);
    if (!dpia) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'RIPD não encontrado' });
    }

    // Buscar usuário
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
    }

    // Obter ou criar pasta do cliente para RIPDs
    const gedUser: gedService.GedUser = {
      id: user.id,
      role: user.role as gedService.UserRole,
      organizationId: user.organizationId
    };
    const folder = await gedService.getOrCreateClientFolder(
      gedUser,
      dpia.organizationId,
      'ripd'
    );

    if (!folder) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Não foi possível criar pasta no GED' });
    }

    // Nome do arquivo
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const typeLabel = documentType === 'completo' ? 'Completo' 
      : documentType === 'simplificado' ? 'Simplificado' 
      : 'ANPD';
    const fileName = `RIPD_${typeLabel}_${dpia.title.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.pdf`;

    // Upload do documento
    const document = await gedService.uploadDocument(gedUser, {
      name: `RIPD ${typeLabel} - ${dpia.title}`,
      folderId: folder.id,
      file: pdfBuffer,
      fileName: fileName,
      mimeType: 'application/pdf',
      tags: ['ripd', 'dpia', documentType, `ripd-${dpiaId}`],
      linkedEntityType: 'ripd',
      linkedEntityId: dpiaId,
    });

    if (!document) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao salvar documento no GED' });
    }

    console.log(`[RIPD] Documento salvo no GED: ${document.id} - ${fileName}`);

    return {
      documentId: document.id,
      url: document.fileUrl || ''
    };
  } catch (error) {
    console.error('[RIPD] Erro ao salvar no GED:', error);
    throw error;
  }
}

/**
 * Lista documentos do RIPD no GED
 */
export async function getRipdDocuments(dpiaId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  try {
    const results = await db.execute(sql`
      SELECT * FROM ged_documents
      WHERE "linkedEntityType" = 'ripd'
      AND "linkedEntityId" = ${dpiaId}
      ORDER BY "createdAt" DESC
    `);

    return (results as any).rows as any[];
  } catch (error) {
    console.error('[RIPD] Erro ao buscar documentos:', error);
    return [];
  }
}

/**
 * Gera e salva o PDF do RIPD no GED
 * Função de conveniência que combina geração + salvamento
 */
export async function generateAndSaveRipdPdf(
  dpiaId: number,
  userId: number,
  documentType: 'completo' | 'simplificado' | 'anpd' = 'completo'
): Promise<{ documentId: number; url: string; pdfBuffer: Buffer }> {
  // Gerar PDF
  const pdfBuffer = await generateDpiaPDF(dpiaId);

  // Salvar no GED
  const result = await saveRipdToGed(dpiaId, userId, pdfBuffer, documentType);

  if (!result) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao salvar RIPD no GED' });
  }

  return {
    ...result,
    pdfBuffer
  };
}

/**
 * Adiciona evidência ao RIPD (para futura implementação de ripd_evidences)
 */
export async function addRipdEvidence(
  dpiaId: number,
  userId: number,
  questionId: number,
  file: Buffer,
  fileName: string,
  mimeType: string,
  description?: string
): Promise<{ documentId: number; url: string } | null> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  try {
    // Buscar DPIA
    const dpia = await getDpiaById(dpiaId);
    if (!dpia) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'RIPD não encontrado' });
    }

    // Buscar usuário
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
    }

    // Obter ou criar pasta de evidências do RIPD
    const gedUser: gedService.GedUser = {
      id: user.id,
      role: user.role as gedService.UserRole,
      organizationId: user.organizationId
    };
    const folder = await gedService.getOrCreateClientFolder(
      gedUser,
      dpia.organizationId,
      'ripd'
    );

    if (!folder) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Não foi possível criar pasta no GED' });
    }

    // Upload do documento
    const document = await gedService.uploadDocument(gedUser, {
      name: description || `Evidência RIPD - Questão ${questionId}`,
      folderId: folder.id,
      file: file,
      fileName: fileName,
      mimeType: mimeType,
      tags: ['ripd', 'evidencia', `ripd-${dpiaId}`, `questao-${questionId}`],
      linkedEntityType: 'ripd',
      linkedEntityId: dpiaId,
    });

    if (!document) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao salvar evidência no GED' });
    }

    console.log(`[RIPD] Evidência salva no GED: ${document.id} - ${fileName}`);

    return {
      documentId: document.id,
      url: document.fileUrl || ''
    };
  } catch (error) {
    console.error('[RIPD] Erro ao salvar evidência:', error);
    throw error;
  }
}
