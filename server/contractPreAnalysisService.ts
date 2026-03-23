import { logger } from "./_core/logger";
/**
 * Serviço de Pré-Análise de Contratos para MeuDPO
 * Realiza análise prévia de contratos anexados em chamados
 */

import { invokeLLM } from "./_core/llm";
import { TRPCError } from '@trpc/server';

export interface ContractPreAnalysisResult {
  // Identificação
  contractType: string;
  contractParties: {
    contratante: string;
    contratada: string;
  };
  
  // Objeto do contrato
  objectSummary: string;
  
  // Dados pessoais identificados
  personalDataCategories: Array<{
    category: string;
    sensitive: boolean;
    examples: string[];
  }>;
  
  // Titulares identificados
  dataSubjects: string[];
  
  // Base legal sugerida
  suggestedLegalBasis: string;
  legalBasisJustification: string;
  
  // Cláusulas LGPD identificadas
  lgpdClauses: Array<{
    type: string;
    present: boolean;
    excerpt?: string;
    recommendation?: string;
  }>;
  
  // Riscos preliminares
  preliminaryRisks: Array<{
    level: 'critico' | 'alto' | 'medio' | 'baixo';
    description: string;
    recommendation: string;
  }>;
  
  // Recomendações gerais
  recommendations: string[];
  
  // Confiança da análise
  confidenceScore: number;
  analysisNotes: string;
}

/**
 * Realiza pré-análise de contrato a partir do texto extraído
 */
export async function preAnalyzeContract(
  contractText: string,
  ticketContext?: {
    title?: string;
    description?: string;
    ticketType?: string;
  }
): Promise<ContractPreAnalysisResult> {
  const systemPrompt = `Você é um especialista em LGPD e análise de contratos. Sua tarefa é realizar uma pré-análise rápida de um contrato para identificar informações relevantes sobre proteção de dados.

Analise o contrato e extraia as seguintes informações:
1. Tipo de contrato e partes envolvidas
2. Resumo do objeto do contrato
3. Categorias de dados pessoais tratados (identificar se são sensíveis)
4. Categorias de titulares de dados
5. Base legal mais apropriada para o tratamento
6. Cláusulas LGPD presentes ou ausentes
7. Riscos preliminares identificados
8. Recomendações gerais

Responda APENAS em JSON válido no formato especificado.`;

  const userPrompt = `Analise o seguinte contrato e forneça uma pré-análise estruturada:

${ticketContext ? `
CONTEXTO DO CHAMADO:
- Título: ${ticketContext.title || 'Não informado'}
- Descrição: ${ticketContext.description || 'Não informado'}
- Tipo: ${ticketContext.ticketType || 'Não informado'}
` : ''}

TEXTO DO CONTRATO:
${contractText.substring(0, 15000)}

Responda em JSON com a seguinte estrutura:
{
  "contractType": "string - tipo do contrato",
  "contractParties": {
    "contratante": "string - nome do contratante",
    "contratada": "string - nome da contratada"
  },
  "objectSummary": "string - resumo do objeto do contrato",
  "personalDataCategories": [
    {
      "category": "string - categoria de dados",
      "sensitive": boolean,
      "examples": ["string - exemplos de dados"]
    }
  ],
  "dataSubjects": ["string - categorias de titulares"],
  "suggestedLegalBasis": "string - base legal sugerida",
  "legalBasisJustification": "string - justificativa",
  "lgpdClauses": [
    {
      "type": "string - tipo de cláusula",
      "present": boolean,
      "excerpt": "string - trecho se presente",
      "recommendation": "string - recomendação se ausente"
    }
  ],
  "preliminaryRisks": [
    {
      "level": "critico|alto|medio|baixo",
      "description": "string - descrição do risco",
      "recommendation": "string - recomendação"
    }
  ],
  "recommendations": ["string - recomendações gerais"],
  "confidenceScore": number (0-100),
  "analysisNotes": "string - notas sobre a análise"
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "contract_pre_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              contractType: { type: "string" },
              contractParties: {
                type: "object",
                properties: {
                  contratante: { type: "string" },
                  contratada: { type: "string" }
                },
                required: ["contratante", "contratada"],
                additionalProperties: false
              },
              objectSummary: { type: "string" },
              personalDataCategories: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    category: { type: "string" },
                    sensitive: { type: "boolean" },
                    examples: { type: "array", items: { type: "string" } }
                  },
                  required: ["category", "sensitive", "examples"],
                  additionalProperties: false
                }
              },
              dataSubjects: { type: "array", items: { type: "string" } },
              suggestedLegalBasis: { type: "string" },
              legalBasisJustification: { type: "string" },
              lgpdClauses: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    present: { type: "boolean" },
                    excerpt: { type: "string" },
                    recommendation: { type: "string" }
                  },
                  required: ["type", "present"],
                  additionalProperties: false
                }
              },
              preliminaryRisks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    level: { type: "string", enum: ["critico", "alto", "medio", "baixo"] },
                    description: { type: "string" },
                    recommendation: { type: "string" }
                  },
                  required: ["level", "description", "recommendation"],
                  additionalProperties: false
                }
              },
              recommendations: { type: "array", items: { type: "string" } },
              confidenceScore: { type: "number" },
              analysisNotes: { type: "string" }
            },
            required: [
              "contractType", "contractParties", "objectSummary",
              "personalDataCategories", "dataSubjects", "suggestedLegalBasis",
              "legalBasisJustification", "lgpdClauses", "preliminaryRisks",
              "recommendations", "confidenceScore", "analysisNotes"
            ],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Resposta vazia da IA' });
    }

    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    return JSON.parse(contentStr) as ContractPreAnalysisResult;
  } catch (error: any) {
    logger.error("Erro na pré-análise de contrato:", error);
    
    // Retornar resultado padrão em caso de erro
    return {
      contractType: "Não identificado",
      contractParties: {
        contratante: "Não identificado",
        contratada: "Não identificado"
      },
      objectSummary: "Não foi possível analisar o contrato automaticamente.",
      personalDataCategories: [],
      dataSubjects: [],
      suggestedLegalBasis: "Não determinado",
      legalBasisJustification: "Análise automática não disponível",
      lgpdClauses: [],
      preliminaryRisks: [{
        level: "medio",
        description: "Análise automática não disponível",
        recommendation: "Solicitar análise manual do contrato"
      }],
      recommendations: ["Solicitar análise manual do contrato pelo DPO"],
      confidenceScore: 0,
      analysisNotes: `Erro na análise: ${error.message}`
    };
  }
}

/**
 * Verifica se um arquivo é um contrato baseado no nome e tipo
 */
export function isContractFile(filename: string, mimeType?: string): boolean {
  const contractPatterns = [
    /contrato/i,
    /acordo/i,
    /termo/i,
    /aditivo/i,
    /convenio/i,
    /parceria/i,
    /prestacao.*servico/i,
    /fornecimento/i,
    /licenca/i,
    /nda/i,
    /confidencialidade/i
  ];
  
  const isContractName = contractPatterns.some(pattern => pattern.test(filename));
  const isDocumentType = mimeType ? 
    ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'].includes(mimeType) :
    /\.(pdf|docx?|txt)$/i.test(filename);
  
  return isContractName && isDocumentType;
}

/**
 * Verifica se o tipo de ticket pode envolver contratos
 */
export function ticketMayInvolveContract(ticketType: string): boolean {
  const contractRelatedTypes = [
    'documentacao',
    'duvida_juridica',
    'consultoria_geral',
    'auditoria'
  ];
  
  return contractRelatedTypes.includes(ticketType);
}
