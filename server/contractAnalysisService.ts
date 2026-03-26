/**
 * Serviço de Análise de Contratos LGPD
 * ======================================
 * Seusdados Consultoria em Gestão de Dados Limitada
 * CNPJ 33.899.116/0001-63 | seusdados.com
 * Responsabilidade técnica: Marcelo Fattori
 *
 * Implementa:
 * - Termo 1: Engenharia Cognitiva (chunking rastreável, prompts com cadeia de raciocínio, validação pós-IA)
 * - Termo 2: Governança Algorítmica (checklist versionado, árvore de decisão, fontes normativas)
 * - Termo 3: Framework Seusdados (SDG, DPPA, linguagem para leigos)
 *
 * Versão: 2.0.0
 */

import { invokeLLM } from "./_core/llm";
import { logger } from "./_core/logger";
import { TRPCError } from '@trpc/server';
import { upsertOutputsManifest, buildFaithfulFallbackMap, buildFaithfulFallbackChecklist, buildFaithfulFallbackRisks, buildFaithfulFallbackClauses } from "./contractAnalysisOutputs";

// Novos módulos (Termos 1, 2, 3)
import { buildAuditableChunks, selectChunksForAnalysis, buildEvidencePack, buildSearchTrace } from "./contractChunking";
import { buildSystemPrompt, buildAnalysisUserPrompt, buildClauseGenerationPrompt, buildRefinementPrompt } from "./contractPrompts";
import { validateAndFixAIOutput, formatValidationLog } from "./contractValidation";
import { getCurrentChecklist, calculateWeightedScore, getChecklistQuestionsForPrompt } from "./contractChecklist";
import type { AuditableChunk, EvidencePack, SearchTrace } from "../shared/contractAnalysisTypes";
import { CURRENT_CHECKLIST_VERSION, MAX_CONTRACT_TEXT_LENGTH } from "../shared/contractAnalysisTypes";

// ==================== TIPOS ====================

export interface ContractAnalysisRequest {
  contractText: string;
  contractName: string;
  organizationName: string;
}

export interface AnalysisMapResult {
  // Identificação
  partnerName: string | null;
  contractType: string | null;
  contractingParty: string | null;
  contractedParty: string | null;
  
  // Papel na LGPD
  agentType: "controlador" | "operador" | "controlador_conjunto" | "suboperador" | null;
  agentTypeJustification: string | null;
  
  // Vigência e Objeto
  contractObject: string | null;
  startDate: string | null;
  endDate: string | null;
  
  // Dados Tratados
  commonData: string | null;
  commonDataLargeScale: boolean;
  sensitiveData: string | null;
  sensitiveDataLargeScale: boolean;
  
  // Grupos Vulneráveis
  hasElderlyData: boolean;
  elderlyDataDetails: string | null;
  hasMinorData: boolean;
  minorDataDetails: string | null;
  
  // Direitos e Ciclo de Vida
  titularRightsStatus: "sim" | "nao" | "parcial" | null;
  titularRightsDetails: string | null;
  dataEliminationStatus: "sim" | "nao" | "parcial" | null;
  dataEliminationDetails: string | null;
  
  // Análise de Riscos
  legalRisks: string | null;
  securityRisks: string | null;
  
  // Adequação Contratual
  hasProtectionClause: "sim" | "nao" | "parcial" | null;
  protectionClauseDetails: string | null;
  suggestedClause: string | null;
  
  // Gestão da Ação
  actionStatus: "adequado" | "ajustar";
  actionPlan: string | null;
  suggestedDeadline: string | null;

  /**
   * Evidências de suporte (XAI leve): para cada campo crítico, trazer um trecho do contrato
   * e uma confiança (0-100). Isso reduz retrabalho do consultor e melhora defensabilidade.
   */
  fieldEvidence?: Record<
    string,
    {
      excerpt: string | null;
      clauseRef?: string | null;
      confidence?: number | null;
      note?: string | null;
    }
  >;
}

export interface ChecklistItem {
  itemNumber: number;
  question: string;
  status: "sim" | "nao" | "parcial";
  observations: string | null;
  contractExcerpt: string | null;
  /** Novo: referência à cláusula do contrato */
  clauseRef?: string | null;
  /** Novo: confiança da IA (0-100) */
  confidence?: number | null;
  /** Novo: fontes normativas aplicáveis */
  policySources?: string[];
}

export interface RiskItem {
  contractArea: string | null;
  analysisBlock: number | null;
  riskDescription: string;
  riskLevel: "1" | "2" | "3" | "4" | "5"; // 1=Crítico, 5=Muito baixo
  potentialImpact: string | null;
  requiredAction: string;
  suggestedDeadline: string | null;
  legalReference: string | null;
  /** Novo: fontes normativas */
  policySources?: string[];
}

export interface ContractAnalysisResult {
  executiveSummary: string;
  complianceScore: number;
  analysisMap: AnalysisMapResult;
  checklist: ChecklistItem[];
  risks: RiskItem[];
  criticalRisks: number;
  highRisks: number;
  mediumRisks: number;
  lowRisks: number;
  veryLowRisks: number;
  /** Novo: versão do checklist usado */
  checklistVersion?: string;
  /** Novo: caminho percorrido na árvore de decisão */
  decisionTreePath?: string[];
  /** Novo: pacote de evidências rastreáveis */
  evidencePack?: EvidencePack;
  /** Novo: log de validação pós-IA */
  validationLog?: string;
  /** Novo: score ponderado pelo checklist versionado */
  weightedScore?: number;
}

// ==================== HARDENING: garantir outputs fiéis (não vazios) ====================

async function ensureFaithfulOutputs(params: {
  organizationId: number;
  analysisId: number;
  contractName: string;
  analysisMap?: any;
  checklist?: any[];
  risks?: any[];
  clauses?: any[];
}) {
  const { organizationId, analysisId, contractName } = params;

  if (!params.analysisMap) {
    params.analysisMap = buildFaithfulFallbackMap(contractName);
  }
  if (!params.checklist || params.checklist.length === 0) {
    params.checklist = buildFaithfulFallbackChecklist();
  }
  if (!params.risks || params.risks.length === 0) {
    params.risks = buildFaithfulFallbackRisks();
  }
  if (!params.clauses || params.clauses.length === 0) {
    params.clauses = buildFaithfulFallbackClauses();
  }

  return params;
}

// ==================== FUNÇÃO DE ANÁLISE (v2 — com Engenharia Cognitiva) ====================

export async function analyzeContract(
  request: ContractAnalysisRequest
): Promise<ContractAnalysisResult> {
  logger.debug(' [v2] Iniciando análise do contrato:', request.contractName);
  logger.debug(` Tamanho do texto original: ${request.contractText.length} caracteres`);
  logger.debug(` Versão do checklist: ${CURRENT_CHECKLIST_VERSION}`);

  // ETAPA 1: Chunking rastreável
  const allChunks = buildAuditableChunks(request.contractText);
  logger.debug(` Chunks gerados: ${allChunks.length}`);

  // ETAPA 2: Seleção inteligente de chunks (com rastreabilidade)
  const { selectedChunks, assembledText } = selectChunksForAnalysis(allChunks, MAX_CONTRACT_TEXT_LENGTH);
  logger.debug(` Chunks selecionados: ${selectedChunks.length}/${allChunks.length}`);
  logger.debug(` Texto montado: ${assembledText.length} caracteres`);

  // ETAPA 3: Construir prompts com engenharia cognitiva
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildAnalysisUserPrompt(assembledText, request.contractName);

  try {
    logger.debug(' Chamando modelo de IA com prompts refatorados...');
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    logger.debug(' Resposta recebida da IA');

    if (!response?.choices?.length) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Resposta da IA sem conteúdo' });
    }

    const messageContent = response.choices[0]?.message?.content;
    if (!messageContent) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Resposta vazia da IA' });
    }

    // ETAPA 4: Limpar e parsear JSON
    let content = typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent);
    content = content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
    content = content.replace(/[\x00-\x1F\x7F]/g, (char) => {
      if (char === '\n' || char === '\r' || char === '\t') return char;
      return '';
    });
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) content = jsonMatch[0];

    logger.debug(` Conteúdo limpo: ${content.length} caracteres`);

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      logger.error(' Erro ao parsear JSON. Tentando limpeza agressiva...');
      try {
        const cleanedContent = content
          .replace(/'([^']+)':/g, '"$1":')
          .replace(/:\s*'([^']*)'/g, ': "$1"');
        parsed = JSON.parse(cleanedContent);
      } catch (secondError) {
        throw new Error(`Erro ao parsear resposta da IA: ${parseError}`);
      }
    }

    logger.debug(' JSON parseado com sucesso');

    // ETAPA 5: Validação pós-IA (Termo 1)
    const validationResult = validateAndFixAIOutput(parsed);
    const validationLog = formatValidationLog(validationResult);
    logger.debug(` Validação pós-IA: ${validationResult.issues.length} problemas, ${validationResult.autoFixCount} corrigidos`);

    const validated = validationResult.output;

    // ETAPA 6: Construir EvidencePack (rastreabilidade)
    const evidencePack = buildEvidencePack({
      analysisId: 0, // será preenchido pelo pipeline
      allChunks,
      selectedChunks,
      fieldEvidences: validated.analysisMap?.fieldEvidence || {},
      originalLength: request.contractText.length,
      reducedLength: assembledText.length,
    });

    // ETAPA 7: Calcular score ponderado pelo checklist versionado (Termo 2)
    let weightedScore = 0;
    if (validated.checklist && Array.isArray(validated.checklist)) {
      const checklistResults = validated.checklist.map((item: any) => ({
        itemNumber: item.itemNumber,
        status: item.status as "sim" | "nao" | "parcial",
      }));
      weightedScore = calculateWeightedScore(checklistResults);
    }

    // ETAPA 8: Contar riscos por nível
    const riskCounts = {
      criticalRisks: 0,
      highRisks: 0,
      mediumRisks: 0,
      lowRisks: 0,
      veryLowRisks: 0
    };

    if (validated.risks && Array.isArray(validated.risks)) {
      for (const risk of validated.risks) {
        switch (String(risk.riskLevel)) {
          case "1": riskCounts.criticalRisks++; break;
          case "2": riskCounts.highRisks++; break;
          case "3": riskCounts.mediumRisks++; break;
          case "4": riskCounts.lowRisks++; break;
          case "5": riskCounts.veryLowRisks++; break;
        }
      }
    }

    logger.debug(` Análise v2 concluída. Score: ${validated.complianceScore}, Ponderado: ${weightedScore}`);

    return {
      executiveSummary: validated.executiveSummary,
      complianceScore: validated.complianceScore,
      analysisMap: validated.analysisMap,
      checklist: validated.checklist || [],
      risks: validated.risks || [],
      ...riskCounts,
      checklistVersion: CURRENT_CHECKLIST_VERSION,
      decisionTreePath: validated.decisionTreePath || [],
      evidencePack,
      validationLog,
      weightedScore,
    };
  } catch (error) {
    logger.error(' Erro na análise v2:', error);
    throw error;
  }
}

// ==================== FUNÇÃO DE REFINAMENTO (v2) ====================

export async function refineContractAnalysis(
  originalAnalysis: ContractAnalysisResult,
  contractText: string,
  refinementRequest: string
): Promise<ContractAnalysisResult> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildRefinementPrompt(
    JSON.stringify(originalAnalysis, null, 2),
    refinementRequest
  );

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" }
  });

  const messageContent = response.choices[0]?.message?.content;
  if (!messageContent) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Resposta vazia da IA' });
  }

  const content = typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent);
  let jsonContent = content;
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) jsonContent = jsonMatch[1];

  const parsed = JSON.parse(jsonContent);

  // Validação pós-IA
  const validationResult = validateAndFixAIOutput(parsed);
  const validated = validationResult.output;

  // Recontar riscos
  const riskCounts = {
    criticalRisks: 0,
    highRisks: 0,
    mediumRisks: 0,
    lowRisks: 0,
    veryLowRisks: 0
  };

  for (const risk of validated.risks || []) {
    switch (String(risk.riskLevel)) {
      case "1": riskCounts.criticalRisks++; break;
      case "2": riskCounts.highRisks++; break;
      case "3": riskCounts.mediumRisks++; break;
      case "4": riskCounts.lowRisks++; break;
      case "5": riskCounts.veryLowRisks++; break;
    }
  }

  return {
    ...validated,
    ...riskCounts,
    checklistVersion: CURRENT_CHECKLIST_VERSION,
  };
}

// ==================== GERAÇÃO DE CLÁUSULAS (v2 — SDG/DPPA) ====================

export async function generateContractClauses(params: {
  checklist: Array<{ itemNumber: number; status: string; observations: string }>;
  risks: Array<{ riskDescription: string; riskLevel: string; requiredAction: string }>;
  analysisMap: Record<string, any>;
  contractName: string;
}): Promise<any> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildClauseGenerationPrompt(
    {
      checklist: params.checklist,
      risks: params.risks,
      analysisMap: params.analysisMap,
    },
    params.contractName
  );

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" }
  });

  const messageContent = response.choices[0]?.message?.content;
  if (!messageContent) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Resposta vazia da IA' });
  }

  const content = typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent);
  let jsonContent = content;
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) jsonContent = jsonMatch[1];

  return JSON.parse(jsonContent);
}

// ==================== EXTRAÇÃO DE TEXTO ====================

export async function extractTextFromDocument(
  documentUrl: string,
  mimeType: string
): Promise<string> {
  logger.debug(' Iniciando extração de texto do documento');
  logger.debug(' URL:', documentUrl);
  logger.debug(' MimeType:', mimeType);
  
  try {
    if (mimeType === "application/pdf" || mimeType.includes("word")) {
      logger.debug(' Usando modelo de IA para extrair texto de PDF/Word');
      
      const response = await invokeLLM({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extraia todo o texto deste documento contratual, mantendo a estrutura. Retorne apenas o texto extraído, sem comentários. Se o documento for muito longo, priorize as cláusulas relacionadas a: proteção de dados, LGPD, privacidade, tratamento de dados pessoais, direitos dos titulares, segurança da informação, confidencialidade, transferência de dados, subcontratação e responsabilidades."
              },
              {
                type: "file_url",
                file_url: {
                  url: documentUrl,
                  mime_type: mimeType as "application/pdf"
                }
              }
            ]
          }
        ],
        max_tokens: 32000
      });
      
      if (!response?.choices?.length) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Resposta inválida na extração de texto' });
      }
      
      const extractedContent = response.choices[0]?.message?.content;
      const text = typeof extractedContent === 'string' ? extractedContent : "";
      logger.debug(` Texto extraído com sucesso. Tamanho: ${text.length} caracteres`);
      return text;
    }
    
    logger.debug(' Usando busca direta para tipo:', mimeType);
    const fetchResponse = await fetch(documentUrl);
    const text = await fetchResponse.text();
    logger.debug(` Texto obtido via busca. Tamanho: ${text.length} caracteres`);
    return text;
  } catch (error) {
    logger.error(' Erro na extração de texto:', error);
    throw error;
  }
}

// ==================== GERAÇÃO DE PDF ====================

interface PdfGenerationInput {
  analysis: {
    id: number;
    contractName: string;
    status: string;
    executiveSummary: string | null;
    complianceScore: number | null;
    criticalRisks: number;
    highRisks: number;
    mediumRisks: number;
    lowRisks: number;
    veryLowRisks: number;
    createdAt: Date;
    completedAt: Date | null;
  };
  map: Record<string, unknown> | null;
  checklist: ChecklistItem[];
  risks: RiskItem[];
}

/**
 * Gera um relatório PDF profissional da análise de contrato
 */
export async function generateContractAnalysisPdf(input: PdfGenerationInput): Promise<Buffer> {
  logger.debug(' Iniciando geração de PDF para análise:', input.analysis?.id);
  const { analysis, map, checklist, risks } = input;
  
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 10pt;
      font-weight: 300;
      line-height: 1.5;
      color: #1f2937;
      background: white;
    }
    
    .page { padding: 40px; min-height: 100vh; }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #6B3FD9;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .logo-area { display: flex; align-items: center; gap: 15px; }
    
    .logo-icon {
      width: 50px; height: 50px;
      background: linear-gradient(135deg, #6B3FD9, #00A8E8);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      color: white; font-weight: 700; font-size: 20px;
    }
    
    .company-name { font-size: 24px; font-weight: 200; color: #6B3FD9; letter-spacing: 0.05em; }
    .company-subtitle { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.2em; }
    .report-info { text-align: right; }
    .report-date { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; }
    .report-id { font-size: 12px; font-weight: 500; color: #374151; }
    
    .title-section { text-align: center; margin-bottom: 40px; }
    .report-type { font-size: 10px; font-weight: 500; color: #6B3FD9; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 10px; }
    .contract-name { font-size: 28px; font-weight: 200; color: #111827; margin-bottom: 5px; }
    
    .status-badge {
      display: inline-block; padding: 6px 16px; border-radius: 20px;
      font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em;
    }
    .status-completed { background: #dcfce7; color: #166534; }
    .status-reviewed { background: #f3e8ff; color: #7c3aed; }
    .status-approved { background: #d1fae5; color: #065f46; }
    .status-rejected { background: #fee2e2; color: #991b1b; }
    
    .score-section {
      display: flex; justify-content: center; gap: 30px; margin: 30px 0; padding: 30px;
      background: linear-gradient(135deg, #f5f3ff, #ede9fe); border-radius: 16px;
    }
    
    .score-card {
      text-align: center; padding: 20px 30px; background: white;
      border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    
    .score-value { font-size: 48px; font-weight: 200; line-height: 1; }
    .score-high { color: #16a34a; }
    .score-medium { color: #ca8a04; }
    .score-low { color: #dc2626; }
    .score-label { font-size: 9px; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 8px; }
    
    .risk-cards { display: flex; justify-content: center; gap: 15px; margin: 20px 0; }
    .risk-card { text-align: center; padding: 15px 25px; border-radius: 10px; min-width: 80px; }
    .risk-critical { background: #fef2f2; border: 1px solid #fecaca; }
    .risk-high { background: #fff7ed; border: 1px solid #fed7aa; }
    .risk-medium { background: #fefce8; border: 1px solid #fef08a; }
    .risk-low { background: #eff6ff; border: 1px solid #bfdbfe; }
    .risk-very-low { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .risk-value { font-size: 28px; font-weight: 200; }
    .risk-critical .risk-value { color: #dc2626; }
    .risk-high .risk-value { color: #ea580c; }
    .risk-medium .risk-value { color: #ca8a04; }
    .risk-low .risk-value { color: #2563eb; }
    .risk-very-low .risk-value { color: #16a34a; }
    .risk-label { font-size: 8px; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; }
    
    .section { margin: 30px 0; page-break-inside: avoid; }
    .section-header {
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;
    }
    .section-number {
      width: 28px; height: 28px;
      background: linear-gradient(135deg, #6B3FD9, #00A8E8);
      border-radius: 8px; color: white; font-weight: 500; font-size: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    .section-title { font-size: 14px; font-weight: 400; color: #111827; }
    .section-content { padding: 15px; background: #f9fafb; border-radius: 10px; }
    
    .field-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
    .field { padding: 12px; background: white; border-radius: 8px; }
    .field-label { font-size: 8px; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
    .field-value { font-size: 11px; color: #374151; font-weight: 300; }
    .field-full { grid-column: span 2; }
    
    .executive-summary {
      padding: 20px; background: linear-gradient(135deg, #f5f3ff, #ede9fe);
      border-radius: 12px; border-left: 4px solid #6B3FD9;
    }
    .summary-text { font-size: 11px; line-height: 1.7; color: #374151; font-weight: 300; white-space: pre-wrap; }
    
    .checklist-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .checklist-table th {
      background: #f3f4f6; padding: 10px; text-align: left;
      font-size: 9px; font-weight: 500; color: #374151; text-transform: uppercase; letter-spacing: 0.05em;
    }
    .checklist-table td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 10px; font-weight: 300; }
    
    .status-icon {
      width: 24px; height: 24px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 600; font-size: 12px;
    }
    .status-sim { background: #dcfce7; color: #16a34a; }
    .status-nao { background: #fee2e2; color: #dc2626; }
    .status-parcial { background: #fef3c7; color: #ca8a04; }
    
    .risk-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .risk-table th {
      background: #fef2f2; padding: 10px; text-align: left;
      font-size: 9px; font-weight: 500; color: #991b1b; text-transform: uppercase; letter-spacing: 0.05em;
    }
    .risk-table td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 10px; font-weight: 300; }
    
    .risk-level-badge {
      display: inline-block; padding: 4px 10px; border-radius: 12px;
      font-size: 9px; font-weight: 500;
    }
    .level-1 { background: #dc2626; color: white; }
    .level-2 { background: #ea580c; color: white; }
    .level-3 { background: #ca8a04; color: white; }
    .level-4 { background: #2563eb; color: white; }
    .level-5 { background: #16a34a; color: white; }
    
    .version-info {
      margin-top: 20px; padding: 12px; background: #f5f3ff; border-radius: 8px;
      font-size: 9px; color: #6b7280;
    }
    
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; }
    .footer-text { font-size: 9px; color: #9ca3af; font-weight: 300; }
    .confidential {
      display: inline-block; padding: 4px 12px; background: #fef3c7; color: #92400e;
      border-radius: 4px; font-size: 8px; font-weight: 500; text-transform: uppercase;
      letter-spacing: 0.1em; margin-bottom: 10px;
    }
    
    @media print { .page { padding: 20px; } .section { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="logo-area">
        <div class="logo-icon">SD</div>
        <div>
          <div class="company-name">Seusdados</div>
          <div class="company-subtitle">Consultoria em Gestão de Dados</div>
        </div>
      </div>
      <div class="report-info">
        <div class="report-date">Gerado em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
        <div class="report-id">Análise #${String(analysis.id).padStart(4, '0')}</div>
      </div>
    </div>
    
    <div class="title-section">
      <div class="confidential">Documento Confidencial</div>
      <div class="report-type">Relatório de Análise Contratual LGPD</div>
      <h1 class="contract-name">${analysis.contractName}</h1>
      <span class="status-badge status-${analysis.status}">${analysis.status === 'completed' ? 'Concluída' : analysis.status === 'reviewed' ? 'Revisada' : analysis.status === 'approved' ? 'Aprovada' : analysis.status}</span>
    </div>
    
    <div class="score-section">
      <div class="score-card">
        <div class="score-value ${(analysis.complianceScore || 0) >= 80 ? 'score-high' : (analysis.complianceScore || 0) >= 60 ? 'score-medium' : 'score-low'}">${analysis.complianceScore || 0}%</div>
        <div class="score-label">Conformidade LGPD</div>
      </div>
    </div>
    
    <div class="risk-cards">
      <div class="risk-card risk-critical">
        <div class="risk-value">${String(analysis.criticalRisks).padStart(2, '0')}</div>
        <div class="risk-label">Críticos</div>
      </div>
      <div class="risk-card risk-high">
        <div class="risk-value">${String(analysis.highRisks).padStart(2, '0')}</div>
        <div class="risk-label">Altos</div>
      </div>
      <div class="risk-card risk-medium">
        <div class="risk-value">${String(analysis.mediumRisks).padStart(2, '0')}</div>
        <div class="risk-label">Médios</div>
      </div>
      <div class="risk-card risk-low">
        <div class="risk-value">${String(analysis.lowRisks).padStart(2, '0')}</div>
        <div class="risk-label">Baixos</div>
      </div>
      <div class="risk-card risk-very-low">
        <div class="risk-value">${String(analysis.veryLowRisks).padStart(2, '0')}</div>
        <div class="risk-label">Muito Baixos</div>
      </div>
    </div>
    
    ${analysis.executiveSummary ? `
    <div class="section">
      <div class="section-header">
        <div class="section-number">★</div>
        <div class="section-title">Resumo Executivo</div>
      </div>
      <div class="executive-summary">
        <p class="summary-text">${analysis.executiveSummary}</p>
      </div>
    </div>
    ` : ''}
    
    ${map ? `
    <div class="section">
      <div class="section-header">
        <div class="section-number">1</div>
        <div class="section-title">Mapa de Análise Contratual</div>
      </div>
      <div class="section-content">
        <div class="field-grid">
          <div class="field">
            <div class="field-label">Tipo de Contrato</div>
            <div class="field-value">${map.contractType || '-'}</div>
          </div>
          <div class="field">
            <div class="field-label">Parceiro Comercial</div>
            <div class="field-value">${map.partnerName || '-'}</div>
          </div>
          <div class="field">
            <div class="field-label">Parte Contratante</div>
            <div class="field-value">${map.contractingParty || '-'}</div>
          </div>
          <div class="field">
            <div class="field-label">Parte Contratada</div>
            <div class="field-value">${map.contractedParty || '-'}</div>
          </div>
          <div class="field field-full">
            <div class="field-label">Objeto do Contrato</div>
            <div class="field-value">${map.contractObject || '-'}</div>
          </div>
          <div class="field">
            <div class="field-label">Tipo de Agente LGPD</div>
            <div class="field-value">${map.agentType ? String(map.agentType).charAt(0).toUpperCase() + String(map.agentType).slice(1).replace('_', ' ') : '-'}</div>
          </div>
          <div class="field">
            <div class="field-label">Vigência</div>
            <div class="field-value">${map.startDate && map.endDate ? (map.startDate + ' a ' + map.endDate) : '-'}</div>
          </div>
          <div class="field field-full">
            <div class="field-label">Dados Pessoais Comuns</div>
            <div class="field-value">${map.commonData || '-'}${map.commonDataLargeScale ? ' (Larga Escala)' : ''}</div>
          </div>
          <div class="field field-full">
            <div class="field-label">Dados Sensíveis</div>
            <div class="field-value">${map.sensitiveData || '-'}${map.sensitiveDataLargeScale ? ' (Larga Escala)' : ''}</div>
          </div>
        </div>
      </div>
    </div>
    ` : ''}
    
    ${checklist && checklist.length > 0 ? `
    <div class="section">
      <div class="section-header">
        <div class="section-number">2</div>
        <div class="section-title">Verificação de Conformidade LGPD</div>
      </div>
      <table class="checklist-table">
        <thead>
          <tr>
            <th style="width: 40px">#</th>
            <th>Pergunta</th>
            <th style="width: 60px; text-align: center">Resultado</th>
            <th>Observações</th>
          </tr>
        </thead>
        <tbody>
          ${checklist.map(item => `
          <tr>
            <td style="font-weight: 500; color: #6B3FD9">${String(item.itemNumber).padStart(2, '0')}</td>
            <td>${item.question}</td>
            <td style="text-align: center">
              <div class="status-icon status-${item.status}">${item.status === 'sim' ? '✓' : item.status === 'nao' ? '✗' : '−'}</div>
            </td>
            <td style="color: #6b7280; font-size: 9px">${item.observations || '-'}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}
    
    ${risks && risks.length > 0 ? `
    <div class="section">
      <div class="section-header">
        <div class="section-number">3</div>
        <div class="section-title">Riscos Identificados e Ações Recomendadas</div>
      </div>
      <table class="risk-table">
        <thead>
          <tr>
            <th>Área</th>
            <th>Descrição do Risco</th>
            <th style="width: 80px">Nível</th>
            <th>Ação Recomendada</th>
            <th style="width: 80px">Prazo</th>
          </tr>
        </thead>
        <tbody>
          ${risks.map(risk => `
          <tr>
            <td style="font-weight: 400">${risk.contractArea}</td>
            <td>${risk.riskDescription}</td>
            <td><span class="risk-level-badge level-${risk.riskLevel}">${risk.riskLevel === '1' ? 'Crítico' : risk.riskLevel === '2' ? 'Alto' : risk.riskLevel === '3' ? 'Médio' : risk.riskLevel === '4' ? 'Baixo' : 'Muito Baixo'}</span></td>
            <td style="font-size: 9px">${risk.requiredAction || '-'}</td>
            <td style="font-size: 9px; color: #6b7280">${risk.suggestedDeadline || '-'}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}
    
    <div class="version-info">
      Versão do checklist: ${CURRENT_CHECKLIST_VERSION} | Gerado por: Seusdados Consultoria em Gestão de Dados Limitada | CNPJ: 33.899.116/0001-63 | seusdados.com | Responsável Técnico: Marcelo Fattori
    </div>
    
    <div class="footer">
      <p class="footer-text">
        Este relatório foi gerado pelo sistema Seusdados Due Diligence.<br>
        A análise foi realizada com base nos 18 blocos de regras LGPD/ANPD da instrução técnica Seusdados.<br>
        Seusdados Consultoria em Gestão de Dados Limitada. CNPJ 33.899.116/0001-63. seusdados.com
      </p>
    </div>
  </div>
</body>
</html>
`;

  logger.debug(` HTML gerado, tamanho: ${html.length} caracteres`);
  try {
    const { generatePDF } = await import('./pdfService');
    const pdfBuffer = await generatePDF(html);
    logger.debug(` PDF gerado com sucesso, tamanho: ${pdfBuffer.length} bytes`);
    return pdfBuffer;
  } catch (error) {
    if (String(process.env.CONTRACT_ANALYSIS_REPORT_REQUIRED || 'false') === 'true') {
      if (!input?.analysis) throw new Error('PDF_INPUT_MISSING:analysis');
      if (!input?.map) throw new Error('PDF_INPUT_MISSING:map');
      if (!Array.isArray(input?.checklist) || input.checklist.length === 0) throw new Error('PDF_INPUT_MISSING:checklist');
      if (!Array.isArray(input?.risks) || input.risks.length === 0) throw new Error('PDF_INPUT_MISSING:risks');
    }
    logger.error(' Erro ao gerar PDF:', error);
    throw error;
  }
}

// Atualiza manifest (contagens reais) após fases do pipeline
export async function updateOutputsManifest(organizationId: number, analysisId: number, reportUrl?: string | null) {
  return upsertOutputsManifest({ analysisId, organizationId, reportUrl: reportUrl ?? null });
}

// Expor helper de fallback fiel para o pipeline
export async function ensureFaithfulContractOutputs(input: {
  organizationId: number;
  analysisId: number;
  contractName: string;
  analysisMap?: any;
  checklist?: any[];
  risks?: any[];
  clauses?: any[];
}) {
  return ensureFaithfulOutputs(input);
}
