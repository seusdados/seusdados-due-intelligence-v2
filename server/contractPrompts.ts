/**
 * Prompts Refatorados para Análise de Contratos LGPD
 * =====================================================
 * Seusdados Consultoria em Gestão de Dados Limitada
 * CNPJ 33.899.116/0001-63 | seusdados.com
 *
 * Implementa o Termo 1 (Engenharia Cognitiva):
 * - Prompts com cadeia de raciocínio obrigatória
 * - Instruções de "pensar antes de responder"
 * - Schema de output JSON formal
 * - Referência ao checklist versionado e fontes normativas
 */

import { getChecklistQuestionsForPrompt, getDecisionTreeForPrompt } from "./contractChecklist";
import { CURRENT_CHECKLIST_VERSION } from "../shared/contractAnalysisTypes";

// ==================== PROMPT DO SISTEMA ====================

export function buildSystemPrompt(): string {
  return `Você é um consultor jurídico especializado em proteção de dados pessoais (LGPD - Lei 13.709/2018) e normas técnicas de segurança da informação (ISO 27001, ISO 27002, ISO 27701).

REGRAS OBRIGATÓRIAS:
1. Responda EXCLUSIVAMENTE em português brasileiro.
2. Use linguagem clara e acessível, como se estivesse explicando para alguém que não é da área jurídica.
3. NUNCA invente informações. Se não encontrar algo no contrato, responda "Não identificado no documento analisado".
4. Para cada resposta do checklist, CITE o trecho exato do contrato que sustenta sua conclusão (entre aspas).
5. PENSE ANTES DE RESPONDER: para cada item, primeiro identifique o trecho relevante, depois analise, depois conclua.
6. Classifique riscos usando a árvore de decisão fornecida.

VERSÃO DO CHECKLIST: ${CURRENT_CHECKLIST_VERSION}

FONTES NORMATIVAS APLICÁVEIS:
- LGPD (Lei 13.709/2018): Arts. 6, 7, 11, 14, 18, 33-36, 37-42, 46, 48, 50
- Resolução CD/ANPD nº 2 (Fiscalização)
- Resolução CD/ANPD nº 4 (Dosimetria de sanções)
- Resolução CD/ANPD nº 15 (Comunicação de incidentes - prazo 3 dias úteis)
- Resolução CD/ANPD nº 19 (Transferência internacional)
- Enunciado CD/ANPD nº 1 (Crianças e adolescentes)
- ECA Digital (Lei 15.211/2025)
- ISO/IEC 27001:2022, ISO/IEC 27002:2022, ISO/IEC 27701:2019`;
}

// ==================== PROMPT DE ANÁLISE PRINCIPAL ====================

export function buildAnalysisUserPrompt(contractText: string, contractName: string): string {
  const checklistQuestions = getChecklistQuestionsForPrompt();
  const decisionTree = getDecisionTreeForPrompt();

  return `CONTRATO PARA ANÁLISE: "${contractName}"

TEXTO DO CONTRATO:
---
${contractText}
---

INSTRUÇÕES DE ANÁLISE:

ETAPA 1 - LEITURA COMPLETA:
Leia o contrato inteiro antes de responder qualquer item. Identifique:
- Quem são as partes
- Qual é o objeto
- Se há cláusula de proteção de dados
- Se há dados sensíveis, de menores ou idosos

ETAPA 2 - CHECKLIST (responda item por item):
${checklistQuestions}

Para CADA item do checklist, responda no formato:
- status: "sim" (encontrado e adequado), "nao" (não encontrado ou inadequado), "parcial" (encontrado mas incompleto)
- observations: Explicação clara do que encontrou ou não encontrou
- excerpt: Trecho EXATO do contrato que sustenta a resposta (entre aspas). Se não encontrou, use null.
- clauseRef: Referência à cláusula/seção do contrato (ex: "Cláusula 5ª, §2º"). Se não encontrou, use null.
- confidence: Nível de confiança de 0 a 100 na resposta.

ETAPA 3 - CLASSIFICAÇÃO DE RISCO:
Use a árvore de decisão abaixo para classificar o risco geral:
${decisionTree}

ETAPA 4 - MAPEAMENTO:
Extraia as informações do contrato para o mapa de análise.

ETAPA 5 - RISCOS ESPECÍFICOS:
Liste os riscos identificados com nível (1=muito baixo a 5=crítico) e ação recomendada.

FORMATO DE RESPOSTA (JSON):
{
  "checklistVersion": "${CURRENT_CHECKLIST_VERSION}",
  "executiveSummary": "Resumo executivo da análise em 3-5 parágrafos, linguagem acessível",
  "complianceScore": 0-100,
  "decisionTreePath": ["ROOT", "...", "TERMINAL_NODE"],
  "checklist": [
    {
      "itemNumber": 1,
      "question": "texto da pergunta",
      "status": "sim|nao|parcial",
      "observations": "explicação clara",
      "excerpt": "trecho exato do contrato ou null",
      "clauseRef": "referência à cláusula ou null",
      "confidence": 0-100,
      "policySources": ["LGPD-ART7"]
    }
  ],
  "analysisMap": {
    "partnerName": "nome do parceiro/contratado",
    "contractType": "tipo do contrato",
    "contractingParty": "parte contratante",
    "contractedParty": "parte contratada",
    "agentType": "controlador|operador|controlador_conjunto|suboperador|null",
    "agentTypeJustification": "justificativa do papel na LGPD",
    "contractObject": "objeto do contrato",
    "commonData": "dados pessoais comuns identificados",
    "commonDataLargeScale": false,
    "sensitiveData": "dados sensíveis identificados ou null",
    "sensitiveDataLargeScale": false,
    "hasElderlyData": false,
    "hasMinorData": false,
    "legalBasis": "base legal identificada",
    "purpose": "finalidade do tratamento",
    "titularRightsStatus": "sim|nao|parcial",
    "titularRightsDetails": "detalhes dos direitos dos titulares",
    "dataEliminationStatus": "sim|nao|parcial",
    "dataEliminationDetails": "detalhes da eliminação de dados",
    "hasProtectionClause": "sim|nao|parcial",
    "protectionClauseDetails": "detalhes da cláusula de proteção",
    "legalRisks": "riscos legais identificados",
    "securityRisks": "riscos de segurança identificados",
    "actionStatus": "adequado|ajustar"
  },
  "risks": [
    {
      "riskDescription": "descrição clara do risco",
      "riskLevel": "1-5",
      "requiredAction": "ação recomendada",
      "policySources": ["LGPD-ART46"],
      "deadline": "prazo sugerido"
    }
  ]
}

IMPORTANTE: Responda APENAS com o JSON, sem texto adicional antes ou depois.`;
}

// ==================== PROMPT DE GERAÇÃO DE CLÁUSULAS ====================

export function buildClauseGenerationPrompt(
  analysisResults: {
    checklist: Array<{ itemNumber: number; status: string; observations: string }>;
    risks: Array<{ riskDescription: string; riskLevel: string; requiredAction: string }>;
    analysisMap: Record<string, any>;
  },
  contractName: string
): string {
  const nonCompliantItems = analysisResults.checklist
    .filter((item) => item.status === "nao" || item.status === "parcial")
    .map((item) => `- Item ${item.itemNumber}: ${item.observations}`)
    .join("\n");

  const highRisks = analysisResults.risks
    .filter((r) => parseInt(r.riskLevel) >= 3)
    .map((r) => `- [Nível ${r.riskLevel}] ${r.riskDescription}: ${r.requiredAction}`)
    .join("\n");

  return `Com base na análise do contrato "${contractName}", gere cláusulas de proteção de dados pessoais para corrigir as não conformidades identificadas.

NÃO CONFORMIDADES IDENTIFICADAS:
${nonCompliantItems || "Nenhuma não conformidade identificada."}

RISCOS DE NÍVEL ALTO OU SUPERIOR:
${highRisks || "Nenhum risco de nível alto identificado."}

INFORMAÇÕES DO CONTRATO:
- Tipo de agente: ${analysisResults.analysisMap.agentType || "Não identificado"}
- Dados sensíveis: ${analysisResults.analysisMap.sensitiveData || "Não identificado"}
- Menores: ${analysisResults.analysisMap.hasMinorData ? "Sim" : "Não"}
- Idosos: ${analysisResults.analysisMap.hasElderlyData ? "Sim" : "Não"}

INSTRUÇÕES:
1. Gere cláusulas PRONTAS PARA USO, que podem ser copiadas e coladas diretamente no contrato.
2. Use linguagem jurídica formal mas compreensível.
3. Cada cláusula deve ter: título, texto completo, e referência à fonte normativa.
4. Organize por blocos temáticos (proteção de dados, segurança, incidentes, direitos, etc.).
5. Inclua cláusula de definições no início.

FORMATO DE RESPOSTA (JSON):
{
  "clauses": [
    {
      "clauseNumber": 1,
      "title": "Título da cláusula",
      "text": "Texto completo da cláusula, pronto para uso",
      "block": "definicoes|protecao_dados|seguranca|incidentes|direitos_titulares|retencao|transferencia|responsabilidade|governanca|encerramento",
      "policySources": ["LGPD-ART46"],
      "addressesItems": [5, 8],
      "addressesRisks": [0]
    }
  ],
  "dpaSummary": "Resumo do aditivo de proteção de dados sugerido"
}

IMPORTANTE: Responda APENAS com o JSON, sem texto adicional.`;
}

// ==================== PROMPT DE REFINAMENTO ====================

export function buildRefinementPrompt(
  originalAnalysis: string,
  userFeedback: string
): string {
  return `ANÁLISE ORIGINAL:
${originalAnalysis}

OBSERVAÇÕES DO CONSULTOR:
${userFeedback}

INSTRUÇÕES:
1. Revise a análise considerando as observações do consultor.
2. Mantenha o mesmo formato JSON de resposta.
3. Atualize apenas os campos afetados pelas observações.
4. Se o consultor discordar de uma classificação, ajuste conforme solicitado.
5. Mantenha a rastreabilidade: preserve os trechos citados e referências.

Responda APENAS com o JSON atualizado.`;
}
