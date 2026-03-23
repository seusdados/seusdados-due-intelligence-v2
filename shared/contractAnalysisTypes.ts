/**
 * Tipos Formais do Módulo de Análise de Contratos LGPD
 * =====================================================
 * Seusdados Consultoria em Gestão de Dados Limitada
 * CNPJ 33.899.116/0001-63 | www.seusdados.com
 * Responsabilidade técnica: Marcelo Fattori
 *
 * Implementa:
 * - Termo 1: Engenharia Cognitiva (SearchTrace, EvidencePack, AuditableChunk)
 * - Termo 2: Governança Algorítmica (ChecklistVersion, DecisionNode, PolicySource)
 * - Termo 3: Framework Seusdados (módulos F1-F9, SDG, DPPA)
 */

// ==================== RASTREABILIDADE (TERMO 1) ====================

/**
 * Trecho rastreável do contrato: cada chunk sabe de onde veio
 * (posição no documento original, palavras-chave que o selecionaram).
 */
export interface AuditableChunk {
  /** Identificador único do chunk (ex: "CHK-001") */
  chunkId: string;
  /** Texto do trecho */
  text: string;
  /** Posição inicial no documento original (caractere) */
  startOffset: number;
  /** Posição final no documento original (caractere) */
  endOffset: number;
  /** Número do parágrafo no documento original */
  paragraphIndex: number;
  /** Palavras-chave LGPD que selecionaram este trecho */
  matchedKeywords: string[];
  /** Região do documento: "cabecalho", "corpo", "rodape", "anexo" */
  region: "cabecalho" | "corpo" | "rodape" | "anexo";
  /** Hash SHA-256 do texto para integridade */
  textHash: string;
}

/**
 * Rastro de busca: documenta como cada campo do resultado foi encontrado.
 * Permite ao consultor verificar de onde veio cada conclusão da IA.
 */
export interface SearchTrace {
  /** Campo do resultado que esta evidência sustenta */
  fieldName: string;
  /** Trecho literal extraído do contrato */
  excerpt: string;
  /** Referência à cláusula/seção (ex: "Cláusula 5.2") */
  clauseRef: string | null;
  /** ID do chunk de onde veio (referência ao AuditableChunk) */
  sourceChunkId: string | null;
  /** Confiança da IA nesta extração (0-100) */
  confidence: number;
  /** Nota explicativa da IA sobre a extração */
  reasoning: string | null;
  /** Referência legal aplicável (ex: "LGPD art. 7º, II") */
  legalBasis: string | null;
}

/**
 * Pacote de evidências: agrupa todas as evidências de uma análise.
 */
export interface EvidencePack {
  /** ID da análise */
  analysisId: number;
  /** Versão do pacote */
  version: number;
  /** Data de geração */
  generatedAt: string;
  /** Chunks auditáveis usados na análise */
  chunks: AuditableChunk[];
  /** Rastros de busca por campo */
  traces: SearchTrace[];
  /** Metadados do documento original */
  documentMeta: {
    originalLength: number;
    reducedLength: number;
    chunksTotal: number;
    chunksSelected: number;
    reductionRatio: number;
  };
}

// ==================== GOVERNANÇA ALGORÍTMICA (TERMO 2) ====================

/**
 * Fonte normativa: cada regra do checklist referencia suas fontes.
 */
export interface PolicySource {
  /** Identificador único (ex: "LGPD-ART7") */
  sourceId: string;
  /** Nome da norma/regulamento */
  name: string;
  /** Artigo/seção específica */
  article: string;
  /** Texto resumido da exigência */
  requirement: string;
  /** Tipo da fonte */
  type: "lei" | "resolucao" | "enunciado" | "norma_tecnica" | "guia";
  /** Data de vigência */
  effectiveDate: string | null;
  /** URL oficial (quando disponível) */
  officialUrl: string | null;
}

/**
 * Item do checklist versionado: cada pergunta tem versão, fontes e peso.
 */
export interface VersionedChecklistItem {
  /** Número sequencial do item */
  itemNumber: number;
  /** Bloco de análise (1-18) ao qual pertence */
  analysisBlock: number;
  /** Pergunta do checklist */
  question: string;
  /** Descrição detalhada do que verificar */
  verificationGuide: string;
  /** Fontes normativas que fundamentam este item */
  policySources: PolicySource[];
  /** Peso do item na pontuação (1-5, onde 5 = crítico) */
  weight: number;
  /** Versão do item */
  version: string;
  /** Data da última atualização */
  updatedAt: string;
}

/**
 * Nó da árvore de decisão: guia a classificação de risco.
 */
export interface DecisionNode {
  /** Identificador único do nó */
  nodeId: string;
  /** Pergunta/condição a avaliar */
  condition: string;
  /** Descrição para o consultor */
  description: string;
  /** ID do nó se a condição for verdadeira */
  trueNodeId: string | null;
  /** ID do nó se a condição for falsa */
  falseNodeId: string | null;
  /** Se é nó terminal, qual a classificação resultante */
  terminalClassification: "critico" | "alto" | "medio" | "baixo" | "muito_baixo" | null;
  /** Ação recomendada no nó terminal */
  terminalAction: string | null;
  /** Prazo recomendado no nó terminal */
  terminalDeadline: string | null;
  /** Fontes normativas */
  policySources: PolicySource[];
}

/**
 * Versão do checklist completo (para auditoria de mudanças).
 */
export interface ChecklistVersion {
  /** Identificador da versão (ex: "v2.1.0") */
  versionId: string;
  /** Data de criação */
  createdAt: string;
  /** Descrição das mudanças */
  changelog: string;
  /** Itens do checklist nesta versão */
  items: VersionedChecklistItem[];
  /** Árvore de decisão para classificação de riscos */
  decisionTree: DecisionNode[];
  /** Autor da versão */
  author: string;
}

// ==================== FRAMEWORK SEUSDADOS (TERMO 3) ====================

/**
 * Módulo do Framework Seusdados (F1-F9).
 */
export interface FrameworkModule {
  /** Código do módulo (F1 a F9) */
  code: string;
  /** Nome do módulo */
  name: string;
  /** Descrição para leigo */
  layDescription: string;
  /** Ícone representativo */
  icon: string;
  /** Blocos de análise cobertos (1-18) */
  analysisBlocks: number[];
}

/**
 * Problema identificado (linguagem leiga).
 */
export interface IdentifiedProblem {
  /** ID único */
  problemId: string;
  /** Módulo do framework (F1-F9) */
  frameworkModule: string;
  /** Título curto e claro */
  title: string;
  /** Descrição em linguagem leiga (sem termos técnicos) */
  layDescription: string;
  /** Exemplo cotidiano para facilitar entendimento */
  everydayExample: string;
  /** Nível de gravidade */
  severity: "critico" | "alto" | "medio" | "baixo" | "muito_baixo";
  /** Referência legal simplificada */
  legalRef: string;
  /** Trecho do contrato que evidencia o problema */
  contractExcerpt: string | null;
  /** ID do SearchTrace associado */
  traceId: string | null;
}

/**
 * Solução proposta (linguagem leiga).
 */
export interface ProposedSolution {
  /** ID único */
  solutionId: string;
  /** ID do problema que resolve */
  problemId: string;
  /** Título da solução */
  title: string;
  /** Descrição em linguagem leiga */
  layDescription: string;
  /** Passos práticos para implementar */
  practicalSteps: string[];
  /** Prazo sugerido */
  suggestedDeadline: string;
  /** Prioridade (1=urgente, 5=pode esperar) */
  priority: number;
  /** Cláusula modelo associada (se houver) */
  modelClauseId: string | null;
}

/**
 * Cláusula copiável (SDG - Solução Documental Guiada).
 */
export interface CopyableClause {
  /** ID da cláusula */
  clauseId: string;
  /** Número sequencial */
  sequenceNumber: number;
  /** Título da cláusula */
  title: string;
  /** Conteúdo da cláusula (texto completo, pronto para copiar) */
  content: string;
  /** Módulo do framework que fundamenta */
  frameworkModule: string;
  /** Problema que esta cláusula resolve */
  problemId: string | null;
  /** Se é obrigatória ou recomendada */
  necessity: "obrigatoria" | "recomendada" | "opcional";
  /** Fontes normativas */
  policySources: PolicySource[];
  /** Versão da cláusula */
  version: number;
  /** Se foi aceita pelo usuário */
  isAccepted: boolean;
}

/**
 * DPPA - Documento Pronto + Plano de Ação.
 * Resultado final consolidado para o cliente.
 */
export interface DPPA {
  /** ID da análise */
  analysisId: number;
  /** Resumo executivo em linguagem leiga */
  executiveSummaryLay: string;
  /** Pontuação de conformidade (0-100) */
  complianceScore: number;
  /** Problemas identificados */
  problems: IdentifiedProblem[];
  /** Soluções propostas */
  solutions: ProposedSolution[];
  /** Cláusulas copiáveis (SDG) */
  clauses: CopyableClause[];
  /** Pacote de evidências */
  evidencePack: EvidencePack;
  /** Versão do checklist usado */
  checklistVersion: string;
  /** Data de geração */
  generatedAt: string;
}

// ==================== ESTRUTURA DE OUTPUT DA IA ====================

/**
 * Schema formal do JSON que a IA deve retornar.
 * Usado para validação pós-IA (nenhum campo pode ficar em branco).
 */
export interface AIAnalysisOutput {
  executiveSummary: string;
  complianceScore: number;
  analysisMap: {
    partnerName: string | null;
    contractType: string | null;
    contractingParty: string | null;
    contractedParty: string | null;
    agentType: "controlador" | "operador" | "controlador_conjunto" | "suboperador" | null;
    agentTypeJustification: string | null;
    contractObject: string | null;
    startDate: string | null;
    endDate: string | null;
    commonData: string | null;
    commonDataLargeScale: boolean;
    sensitiveData: string | null;
    sensitiveDataLargeScale: boolean;
    hasElderlyData: boolean;
    elderlyDataDetails: string | null;
    hasMinorData: boolean;
    minorDataDetails: string | null;
    titularRightsStatus: "sim" | "nao" | "parcial" | null;
    titularRightsDetails: string | null;
    dataEliminationStatus: "sim" | "nao" | "parcial" | null;
    dataEliminationDetails: string | null;
    legalRisks: string | null;
    securityRisks: string | null;
    hasProtectionClause: "sim" | "nao" | "parcial" | null;
    protectionClauseDetails: string | null;
    suggestedClause: string | null;
    actionStatus: "adequado" | "ajustar";
    actionPlan: string | null;
    suggestedDeadline: string | null;
    fieldEvidence?: Record<string, {
      excerpt: string | null;
      clauseRef?: string | null;
      confidence?: number | null;
      note?: string | null;
    }>;
  };
  checklist: Array<{
    itemNumber: number;
    question: string;
    status: "sim" | "nao" | "parcial";
    observations: string | null;
    contractExcerpt: string | null;
    clauseRef?: string | null;
    confidence?: number | null;
    policySources?: string[];
  }>;
  risks: Array<{
    contractArea: string | null;
    analysisBlock: number | null;
    riskDescription: string;
    riskLevel: "1" | "2" | "3" | "4" | "5";
    potentialImpact: string | null;
    requiredAction: string;
    suggestedDeadline: string | null;
    legalReference: string | null;
    policySources?: string[];
  }>;
  /** Caminho percorrido na árvore de decisão */
  decisionTreePath?: string[];
  /** Versão do checklist usado */
  checklistVersion?: string;
}

// ==================== MÓDULOS DO FRAMEWORK F1-F9 ====================

export const FRAMEWORK_MODULES: FrameworkModule[] = [
  {
    code: "F1",
    name: "Quem Faz o Quê",
    layDescription: "Identifica quem são as partes do contrato e qual o papel de cada uma no tratamento dos dados pessoais.",
    icon: "Users",
    analysisBlocks: [1, 14],
  },
  {
    code: "F2",
    name: "Para Quê Usam os Dados",
    layDescription: "Verifica se o contrato explica claramente para que os dados pessoais serão usados e se há permissão legal para isso.",
    icon: "Target",
    analysisBlocks: [2, 3],
  },
  {
    code: "F3",
    name: "Quais Dados São Tratados",
    layDescription: "Identifica quais dados pessoais são coletados, se há dados sensíveis (saúde, religião, etc.) e se envolvem crianças ou idosos.",
    icon: "Database",
    analysisBlocks: [4, 5],
  },
  {
    code: "F4",
    name: "Proteção e Segurança",
    layDescription: "Verifica se o contrato prevê medidas para proteger os dados contra vazamentos, ataques e acessos não autorizados.",
    icon: "Shield",
    analysisBlocks: [6, 12],
  },
  {
    code: "F5",
    name: "Quem Mais Tem Acesso",
    layDescription: "Analisa se os dados são compartilhados com terceiros, subcontratados ou enviados para outros países, e se há regras para isso.",
    icon: "Share2",
    analysisBlocks: [7, 8, 9],
  },
  {
    code: "F6",
    name: "Direitos das Pessoas",
    layDescription: "Verifica se o contrato garante que as pessoas possam acessar, corrigir ou apagar seus dados quando quiserem.",
    icon: "UserCheck",
    analysisBlocks: [11],
  },
  {
    code: "F7",
    name: "Registro e Documentação",
    layDescription: "Analisa se há obrigação de manter registros das atividades de tratamento e evidências de conformidade.",
    icon: "FileText",
    analysisBlocks: [10, 13],
  },
  {
    code: "F8",
    name: "Ciclo de Vida dos Dados",
    layDescription: "Verifica se o contrato define por quanto tempo os dados ficam guardados e como são eliminados quando não são mais necessários.",
    icon: "Clock",
    analysisBlocks: [16, 18],
  },
  {
    code: "F9",
    name: "Governança e Responsabilidade",
    layDescription: "Analisa se há políticas internas, responsável pela proteção de dados e previsão de indenização em caso de problemas.",
    icon: "Building",
    analysisBlocks: [15, 17],
  },
];

// ==================== CONSTANTES ====================

/** Versão atual do checklist */
export const CURRENT_CHECKLIST_VERSION = "v2.0.0";

/** Limite máximo de caracteres para análise */
export const MAX_CONTRACT_TEXT_LENGTH = 55000;

/** Palavras-chave LGPD para seleção de trechos */
export const LGPD_KEYWORDS = [
  "lgpd", "lei geral de proteção de dados", "dados pessoais", "dados sensíveis",
  "crianças", "adolescentes", "menor", "idoso",
  "controlador", "operador", "suboperador", "controlador conjunto",
  "finalidade", "base legal", "consentimento", "legítimo interesse",
  "compartilhamento", "terceiro", "subcontrat", "transferência internacional",
  "segurança da informação", "incidente", "violação", "vazamento", "notificação",
  "auditoria", "fiscalização",
  "retenção", "eliminação", "descarte", "devolução",
  "confidencialidade", "sigilo",
  "anpd", "art.", "dpa", "aditivo",
  "encarregado", "dpo", "comitê", "governança",
  "portabilidade", "anonimização", "pseudonimização",
  "relatório de impacto", "ripd", "dpia",
];
