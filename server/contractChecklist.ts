/**
 * Checklist Versionado e Árvore de Decisão para Análise de Contratos LGPD
 * =========================================================================
 * Seusdados Consultoria em Gestão de Dados Limitada
 * CNPJ 33.899.116/0001-63 | seusdados.com
 *
 * Implementa o Termo 2 (Governança Algorítmica):
 * - Checklist versionado com fontes normativas (policySources)
 * - Árvore de decisão para classificação de riscos
 * - Trilha de auditoria de mudanças
 */

import type {
  VersionedChecklistItem,
  ChecklistVersion,
  DecisionNode,
  PolicySource,
} from "../shared/contractAnalysisTypes";
import { CURRENT_CHECKLIST_VERSION } from "../shared/contractAnalysisTypes";

// ==================== FONTES NORMATIVAS ====================

const SOURCES: Record<string, PolicySource> = {
  LGPD_ART6: {
    sourceId: "LGPD-ART6",
    name: "LGPD",
    article: "Art. 6",
    requirement: "Princípios do tratamento: finalidade, adequação, necessidade, livre acesso, qualidade, transparência, segurança, prevenção, não discriminação, responsabilização.",
    type: "lei",
    effectiveDate: "2020-09-18",
    officialUrl: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm",
  },
  LGPD_ART7: {
    sourceId: "LGPD-ART7",
    name: "LGPD",
    article: "Art. 7",
    requirement: "Bases legais para tratamento de dados pessoais comuns.",
    type: "lei",
    effectiveDate: "2020-09-18",
    officialUrl: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm",
  },
  LGPD_ART11: {
    sourceId: "LGPD-ART11",
    name: "LGPD",
    article: "Art. 11",
    requirement: "Bases legais para tratamento de dados pessoais sensíveis.",
    type: "lei",
    effectiveDate: "2020-09-18",
    officialUrl: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm",
  },
  LGPD_ART14: {
    sourceId: "LGPD-ART14",
    name: "LGPD",
    article: "Art. 14",
    requirement: "Tratamento de dados de crianças e adolescentes: melhor interesse.",
    type: "lei",
    effectiveDate: "2020-09-18",
    officialUrl: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm",
  },
  LGPD_ART18: {
    sourceId: "LGPD-ART18",
    name: "LGPD",
    article: "Art. 18",
    requirement: "Direitos dos titulares: confirmação, acesso, correção, anonimização, portabilidade, eliminação, informação, revogação.",
    type: "lei",
    effectiveDate: "2020-09-18",
    officialUrl: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm",
  },
  LGPD_ART33_36: {
    sourceId: "LGPD-ART33-36",
    name: "LGPD",
    article: "Arts. 33-36",
    requirement: "Transferência internacional de dados: mecanismos de adequação.",
    type: "lei",
    effectiveDate: "2020-09-18",
    officialUrl: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm",
  },
  LGPD_ART37_42: {
    sourceId: "LGPD-ART37-42",
    name: "LGPD",
    article: "Arts. 37-42",
    requirement: "Responsabilidade e ressarcimento de danos.",
    type: "lei",
    effectiveDate: "2020-09-18",
    officialUrl: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm",
  },
  LGPD_ART46: {
    sourceId: "LGPD-ART46",
    name: "LGPD",
    article: "Art. 46",
    requirement: "Medidas de segurança técnicas e administrativas para proteção de dados.",
    type: "lei",
    effectiveDate: "2020-09-18",
    officialUrl: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm",
  },
  LGPD_ART48: {
    sourceId: "LGPD-ART48",
    name: "LGPD",
    article: "Art. 48",
    requirement: "Comunicação de incidente de segurança à ANPD e ao titular.",
    type: "lei",
    effectiveDate: "2020-09-18",
    officialUrl: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm",
  },
  LGPD_ART50: {
    sourceId: "LGPD-ART50",
    name: "LGPD",
    article: "Art. 50",
    requirement: "Boas práticas e governança: regras, normas, procedimentos, mecanismos de supervisão.",
    type: "lei",
    effectiveDate: "2020-09-18",
    officialUrl: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm",
  },
  RES_ANPD_2: {
    sourceId: "RES-ANPD-2",
    name: "Resolução CD/ANPD nº 2",
    article: "Regulamento de fiscalização",
    requirement: "Regulamenta o processo de fiscalização e sanções pela ANPD.",
    type: "resolucao",
    effectiveDate: "2022-01-28",
    officialUrl: "https://www.gov.br/anpd/pt-br",
  },
  RES_ANPD_4: {
    sourceId: "RES-ANPD-4",
    name: "Resolução CD/ANPD nº 4",
    article: "Dosimetria de sanções",
    requirement: "Critérios para aplicação de sanções administrativas.",
    type: "resolucao",
    effectiveDate: "2023-02-27",
    officialUrl: "https://www.gov.br/anpd/pt-br",
  },
  RES_ANPD_15: {
    sourceId: "RES-ANPD-15",
    name: "Resolução CD/ANPD nº 15",
    article: "Comunicação de incidentes",
    requirement: "Prazo de 3 dias úteis para comunicação de incidentes à ANPD.",
    type: "resolucao",
    effectiveDate: "2024-04-24",
    officialUrl: "https://www.gov.br/anpd/pt-br",
  },
  RES_ANPD_19: {
    sourceId: "RES-ANPD-19",
    name: "Resolução CD/ANPD nº 19",
    article: "Transferência internacional",
    requirement: "Regulamenta mecanismos de transferência internacional de dados.",
    type: "resolucao",
    effectiveDate: "2024-08-23",
    officialUrl: "https://www.gov.br/anpd/pt-br",
  },
  ENUNCIADO_ANPD_1: {
    sourceId: "ENUNCIADO-ANPD-1",
    name: "Enunciado CD/ANPD nº 1",
    article: "Crianças e adolescentes",
    requirement: "Tratamento de dados de crianças e adolescentes: melhor interesse como critério primário.",
    type: "enunciado",
    effectiveDate: "2023-05-22",
    officialUrl: "https://www.gov.br/anpd/pt-br",
  },
  ECA_DIGITAL: {
    sourceId: "ECA-DIGITAL",
    name: "ECA Digital (Lei 15.211/2025)",
    article: "Proteção digital de menores",
    requirement: "Proteção de crianças e adolescentes em ambientes digitais.",
    type: "lei",
    effectiveDate: "2025-01-13",
    officialUrl: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15211.htm",
  },
  ISO_27001: {
    sourceId: "ISO-27001",
    name: "ISO/IEC 27001:2022",
    article: "Sistema de gestão de segurança da informação",
    requirement: "Requisitos para estabelecer, implementar, manter e melhorar um SGSI.",
    type: "norma_tecnica",
    effectiveDate: "2022-10-25",
    officialUrl: null,
  },
  ISO_27002: {
    sourceId: "ISO-27002",
    name: "ISO/IEC 27002:2022",
    article: "Controles de segurança da informação",
    requirement: "Referência de controles de segurança da informação.",
    type: "norma_tecnica",
    effectiveDate: "2022-02-15",
    officialUrl: null,
  },
  ISO_27701: {
    sourceId: "ISO-27701",
    name: "ISO/IEC 27701:2019",
    article: "Gestão de privacidade da informação",
    requirement: "Extensão da ISO 27001/27002 para gestão de privacidade.",
    type: "norma_tecnica",
    effectiveDate: "2019-08-05",
    officialUrl: null,
  },
};

// ==================== CHECKLIST VERSIONADO v2.0.0 ====================

const CHECKLIST_V2: VersionedChecklistItem[] = [
  {
    itemNumber: 1,
    analysisBlock: 1,
    question: "O contrato identifica claramente as partes e seus papéis no tratamento de dados (quem é o responsável e quem executa)?",
    verificationGuide: "Verificar se o contrato define explicitamente quem é controlador, operador ou controlador conjunto. Verificar se há justificativa para a classificação.",
    policySources: [SOURCES.LGPD_ART7, SOURCES.LGPD_ART37_42],
    weight: 4,
    version: "2.0.0",
    updatedAt: "2026-02-20",
  },
  {
    itemNumber: 2,
    analysisBlock: 2,
    question: "O contrato explica para que os dados pessoais serão usados (finalidade) e se há permissão legal para isso (base legal)?",
    verificationGuide: "Verificar se as finalidades são claras, específicas e não genéricas. Verificar se as bases legais do art. 7 ou 11 são citadas corretamente. Atenção: consentimento é base residual.",
    policySources: [SOURCES.LGPD_ART6, SOURCES.LGPD_ART7, SOURCES.LGPD_ART11],
    weight: 5,
    version: "2.0.0",
    updatedAt: "2026-02-20",
  },
  {
    itemNumber: 3,
    analysisBlock: 4,
    question: "O contrato lista quais dados pessoais são coletados e se há dados sensíveis (saúde, religião, biometria, etc.)?",
    verificationGuide: "Verificar se há lista de categorias de dados. Verificar se dados sensíveis são identificados separadamente com base legal específica (art. 11). Verificar larga escala.",
    policySources: [SOURCES.LGPD_ART11],
    weight: 4,
    version: "2.0.0",
    updatedAt: "2026-02-20",
  },
  {
    itemNumber: 4,
    analysisBlock: 5,
    question: "Se o contrato envolve dados de crianças, adolescentes ou idosos, há proteção especial prevista?",
    verificationGuide: "Verificar se há referência ao melhor interesse (crianças). Verificar se bases legais específicas são aplicadas. Verificar conformidade com ECA Digital.",
    policySources: [SOURCES.LGPD_ART14, SOURCES.ENUNCIADO_ANPD_1, SOURCES.ECA_DIGITAL],
    weight: 5,
    version: "2.0.0",
    updatedAt: "2026-02-20",
  },
  {
    itemNumber: 5,
    analysisBlock: 6,
    question: "O contrato prevê medidas de proteção contra vazamentos e ataques (segurança da informação)?",
    verificationGuide: "Verificar se há cláusula de segurança com medidas técnicas e administrativas. Verificar referência a padrões (ISO 27001/27002). Verificar criptografia, controle de acesso, logs.",
    policySources: [SOURCES.LGPD_ART46, SOURCES.ISO_27001, SOURCES.ISO_27002],
    weight: 5,
    version: "2.0.0",
    updatedAt: "2026-02-20",
  },
  {
    itemNumber: 6,
    analysisBlock: 7,
    question: "Se os dados são repassados a terceiros ou subcontratados, há regras claras para isso?",
    verificationGuide: "Verificar se há autorização prévia para subcontratação. Verificar se obrigações LGPD são repassadas (flow-down). Verificar compartilhamento com terceiros.",
    policySources: [SOURCES.LGPD_ART7, SOURCES.LGPD_ART37_42],
    weight: 4,
    version: "2.0.0",
    updatedAt: "2026-02-20",
  },
  {
    itemNumber: 7,
    analysisBlock: 11,
    question: "O contrato garante que as pessoas possam acessar, corrigir ou apagar seus dados?",
    verificationGuide: "Verificar se há canal para exercício de direitos. Verificar prazos de resposta. Verificar cooperação entre as partes para atendimento.",
    policySources: [SOURCES.LGPD_ART18],
    weight: 4,
    version: "2.0.0",
    updatedAt: "2026-02-20",
  },
  {
    itemNumber: 8,
    analysisBlock: 12,
    question: "O contrato prevê aviso rápido em caso de vazamento ou incidente de segurança (prazo definido)?",
    verificationGuide: "Verificar se há cláusula de notificação de incidente. Verificar se o prazo é de até 48 horas da ciência. Prazo maior ou genérico = não conforme. Verificar Resolução ANPD 15.",
    policySources: [SOURCES.LGPD_ART48, SOURCES.RES_ANPD_15],
    weight: 5,
    version: "2.0.0",
    updatedAt: "2026-02-20",
  },
  {
    itemNumber: 9,
    analysisBlock: 13,
    question: "O contrato permite verificação e auditoria do cumprimento das regras de proteção de dados?",
    verificationGuide: "Verificar se há direito de auditoria do controlador sobre o operador. Verificar se há obrigação de manter registros e evidências.",
    policySources: [SOURCES.LGPD_ART50, SOURCES.ISO_27001],
    weight: 3,
    version: "2.0.0",
    updatedAt: "2026-02-20",
  },
  {
    itemNumber: 10,
    analysisBlock: 16,
    question: "O contrato define por quanto tempo os dados ficam guardados e como são eliminados quando não são mais necessários?",
    verificationGuide: "Verificar se há critérios de retenção (prazo ou evento). Verificar se há procedimento de eliminação/descarte seguro. Verificar devolução de dados ao término.",
    policySources: [SOURCES.LGPD_ART6],
    weight: 4,
    version: "2.0.0",
    updatedAt: "2026-02-20",
  },
  {
    itemNumber: 11,
    analysisBlock: 9,
    question: "Se os dados são enviados para outros países, há mecanismo de proteção adequado?",
    verificationGuide: "Verificar se há transferência internacional. Se sim, verificar mecanismos de adequação (cláusulas padrão, certificação, etc.). Verificar Resolução ANPD 19.",
    policySources: [SOURCES.LGPD_ART33_36, SOURCES.RES_ANPD_19],
    weight: 4,
    version: "2.0.0",
    updatedAt: "2026-02-20",
  },
  {
    itemNumber: 12,
    analysisBlock: 17,
    question: "O contrato prevê governança de dados (políticas internas, responsável pela proteção, certificações)?",
    verificationGuide: "Verificar se há referência a políticas de privacidade, DPO/encarregado, programa de governança, certificações.",
    policySources: [SOURCES.LGPD_ART50, SOURCES.ISO_27701],
    weight: 3,
    version: "2.0.0",
    updatedAt: "2026-02-20",
  },
  {
    itemNumber: 13,
    analysisBlock: 15,
    question: "O contrato define quem é responsável em caso de problemas com dados pessoais (responsabilidade civil)?",
    verificationGuide: "Verificar se há cláusula de responsabilidade civil. Verificar se é coerente com o papel LGPD (controlador/operador). Verificar direito de regresso.",
    policySources: [SOURCES.LGPD_ART37_42],
    weight: 4,
    version: "2.0.0",
    updatedAt: "2026-02-20",
  },
  {
    itemNumber: 14,
    analysisBlock: 18,
    question: "O contrato prevê devolução, portabilidade ou eliminação dos dados ao término da relação?",
    verificationGuide: "Verificar se há procedimento de encerramento com devolução/eliminação de dados. Verificar portabilidade. Verificar prazo para cumprimento.",
    policySources: [SOURCES.LGPD_ART18, SOURCES.LGPD_ART6],
    weight: 3,
    version: "2.0.0",
    updatedAt: "2026-02-20",
  },
];

// ==================== ÁRVORE DE DECISÃO ====================

const DECISION_TREE: DecisionNode[] = [
  {
    nodeId: "ROOT",
    condition: "O contrato trata dados pessoais sensíveis ou de menores/idosos?",
    description: "Ponto de partida: verificar se há dados de alto risco envolvidos.",
    trueNodeId: "SENSIVEL_CHECK",
    falseNodeId: "COMUM_CHECK",
    terminalClassification: null,
    terminalAction: null,
    terminalDeadline: null,
    policySources: [SOURCES.LGPD_ART11, SOURCES.LGPD_ART14],
  },
  {
    nodeId: "SENSIVEL_CHECK",
    condition: "Há base legal específica (art. 11) e proteção especial documentada?",
    description: "Dados sensíveis exigem base legal específica e proteção reforçada.",
    trueNodeId: "SENSIVEL_SEGURANCA",
    falseNodeId: "CRITICO_SENSIVEL",
    terminalClassification: null,
    terminalAction: null,
    terminalDeadline: null,
    policySources: [SOURCES.LGPD_ART11, SOURCES.ENUNCIADO_ANPD_1],
  },
  {
    nodeId: "CRITICO_SENSIVEL",
    condition: "",
    description: "Dados sensíveis/menores sem base legal adequada: risco máximo.",
    trueNodeId: null,
    falseNodeId: null,
    terminalClassification: "critico",
    terminalAction: "Incluir imediatamente base legal específica (art. 11 LGPD), cláusula de proteção especial para menores/idosos e medidas de segurança reforçadas.",
    terminalDeadline: "15 dias",
    policySources: [SOURCES.LGPD_ART11, SOURCES.LGPD_ART14, SOURCES.ECA_DIGITAL],
  },
  {
    nodeId: "SENSIVEL_SEGURANCA",
    condition: "Há cláusula de segurança com medidas técnicas e notificação de incidente em até 48h?",
    description: "Mesmo com base legal, segurança e incidentes são obrigatórios.",
    trueNodeId: "MEDIO_SENSIVEL",
    falseNodeId: "ALTO_SENSIVEL",
    terminalClassification: null,
    terminalAction: null,
    terminalDeadline: null,
    policySources: [SOURCES.LGPD_ART46, SOURCES.LGPD_ART48, SOURCES.RES_ANPD_15],
  },
  {
    nodeId: "ALTO_SENSIVEL",
    condition: "",
    description: "Dados sensíveis com base legal mas sem segurança/incidentes adequados.",
    trueNodeId: null,
    falseNodeId: null,
    terminalClassification: "alto",
    terminalAction: "Incluir cláusula de segurança da informação (referência ISO 27001/27002) e notificação de incidente em até 48h da ciência.",
    terminalDeadline: "30 dias",
    policySources: [SOURCES.LGPD_ART46, SOURCES.LGPD_ART48, SOURCES.ISO_27001],
  },
  {
    nodeId: "MEDIO_SENSIVEL",
    condition: "",
    description: "Dados sensíveis com proteção adequada: risco residual médio (monitorar).",
    trueNodeId: null,
    falseNodeId: null,
    terminalClassification: "medio",
    terminalAction: "Monitorar conformidade, verificar auditoria periódica e atualizar cláusulas conforme novas regulamentações.",
    terminalDeadline: "90 dias",
    policySources: [SOURCES.LGPD_ART50],
  },
  {
    nodeId: "COMUM_CHECK",
    condition: "O contrato tem cláusula de proteção de dados (DPA) com finalidade, base legal e responsabilidades?",
    description: "Para dados comuns, verificar se há mínimo de proteção contratual.",
    trueNodeId: "COMUM_SEGURANCA",
    falseNodeId: "ALTO_COMUM",
    terminalClassification: null,
    terminalAction: null,
    terminalDeadline: null,
    policySources: [SOURCES.LGPD_ART7, SOURCES.LGPD_ART6],
  },
  {
    nodeId: "ALTO_COMUM",
    condition: "",
    description: "Dados comuns sem cláusula de proteção: risco alto.",
    trueNodeId: null,
    falseNodeId: null,
    terminalClassification: "alto",
    terminalAction: "Incluir aditivo/DPA com: finalidade, base legal, responsabilidades, segurança, incidentes, direitos dos titulares, retenção/eliminação.",
    terminalDeadline: "60 dias",
    policySources: [SOURCES.LGPD_ART7, SOURCES.LGPD_ART37_42],
  },
  {
    nodeId: "COMUM_SEGURANCA",
    condition: "Há cláusula de segurança, notificação de incidente e direitos dos titulares?",
    description: "Verificar se a proteção contratual é completa.",
    trueNodeId: "COMUM_RETENCAO",
    falseNodeId: "MEDIO_COMUM",
    terminalClassification: null,
    terminalAction: null,
    terminalDeadline: null,
    policySources: [SOURCES.LGPD_ART46, SOURCES.LGPD_ART48, SOURCES.LGPD_ART18],
  },
  {
    nodeId: "MEDIO_COMUM",
    condition: "",
    description: "Dados comuns com DPA mas sem segurança/incidentes/direitos completos.",
    trueNodeId: null,
    falseNodeId: null,
    terminalClassification: "medio",
    terminalAction: "Complementar DPA com cláusulas de segurança, notificação de incidente (48h) e canal para direitos dos titulares.",
    terminalDeadline: "60 dias",
    policySources: [SOURCES.LGPD_ART46, SOURCES.LGPD_ART48, SOURCES.LGPD_ART18],
  },
  {
    nodeId: "COMUM_RETENCAO",
    condition: "Há critérios de retenção, eliminação e auditoria previstos?",
    description: "Verificar ciclo de vida dos dados e governança.",
    trueNodeId: "BAIXO_COMUM",
    falseNodeId: "BAIXO_AJUSTE",
    terminalClassification: null,
    terminalAction: null,
    terminalDeadline: null,
    policySources: [SOURCES.LGPD_ART6, SOURCES.LGPD_ART50],
  },
  {
    nodeId: "BAIXO_AJUSTE",
    condition: "",
    description: "Contrato bem estruturado mas com ajustes menores necessários.",
    trueNodeId: null,
    falseNodeId: null,
    terminalClassification: "baixo",
    terminalAction: "Incluir critérios de retenção/eliminação e cláusula de auditoria. Ajustes de redação.",
    terminalDeadline: "90 dias",
    policySources: [SOURCES.LGPD_ART6, SOURCES.LGPD_ART50],
  },
  {
    nodeId: "BAIXO_COMUM",
    condition: "",
    description: "Contrato com proteção completa: risco muito baixo.",
    trueNodeId: null,
    falseNodeId: null,
    terminalClassification: "muito_baixo",
    terminalAction: "Manter monitoramento periódico. Atualizar conforme novas regulamentações da ANPD.",
    terminalDeadline: "180 dias",
    policySources: [SOURCES.LGPD_ART50],
  },
];

// ==================== VERSÃO ATUAL DO CHECKLIST ====================

export const CHECKLIST_VERSION_CURRENT: ChecklistVersion = {
  versionId: CURRENT_CHECKLIST_VERSION,
  createdAt: "2026-02-20T00:00:00Z",
  changelog: "Versão 2.0.0: Checklist expandido de 10 para 14 itens, cobrindo todos os 18 blocos de análise. Adicionadas fontes normativas (policySources) para cada item. Incluída árvore de decisão para classificação de riscos. Adicionados pesos por item. Compatível com Resolução ANPD 15 e ECA Digital.",
  items: CHECKLIST_V2,
  decisionTree: DECISION_TREE,
  author: "Seusdados Consultoria - Marcelo Fattori",
};

// ==================== FUNÇÕES UTILITÁRIAS ====================

/**
 * Retorna o checklist atual.
 */
export function getCurrentChecklist(): ChecklistVersion {
  return CHECKLIST_VERSION_CURRENT;
}

/**
 * Retorna as perguntas do checklist para uso no prompt da IA.
 */
export function getChecklistQuestionsForPrompt(): string {
  return CHECKLIST_V2.map(
    (item) =>
      `${item.itemNumber}. [Bloco ${item.analysisBlock}] ${item.question}\n   Verificar: ${item.verificationGuide}\n   Fontes: ${item.policySources.map((s) => s.sourceId).join(", ")}\n   Peso: ${item.weight}/5`
  ).join("\n\n");
}

/**
 * Retorna a árvore de decisão para uso no prompt da IA.
 */
export function getDecisionTreeForPrompt(): string {
  const lines: string[] = ["ÁRVORE DE DECISÃO PARA CLASSIFICAÇÃO DE RISCO:"];
  for (const node of DECISION_TREE) {
    if (node.terminalClassification) {
      lines.push(
        `  [${node.nodeId}] → ${node.terminalClassification.toUpperCase()}: ${node.description}`
      );
      lines.push(`    Ação: ${node.terminalAction}`);
      lines.push(`    Prazo: ${node.terminalDeadline}`);
    } else {
      lines.push(
        `  [${node.nodeId}] ${node.condition}`
      );
      lines.push(`    SIM → ${node.trueNodeId} | NÃO → ${node.falseNodeId}`);
    }
  }
  return lines.join("\n");
}

/**
 * Retorna todas as fontes normativas disponíveis.
 */
export function getAllPolicySources(): PolicySource[] {
  return Object.values(SOURCES);
}

/**
 * Retorna uma fonte normativa por ID.
 */
export function getPolicySourceById(sourceId: string): PolicySource | undefined {
  return SOURCES[sourceId];
}

/**
 * Calcula o score ponderado do checklist com base nos resultados.
 */
export function calculateWeightedScore(
  results: Array<{ itemNumber: number; status: "sim" | "nao" | "parcial" }>
): number {
  let totalWeight = 0;
  let earnedWeight = 0;

  for (const result of results) {
    const item = CHECKLIST_V2.find((i) => i.itemNumber === result.itemNumber);
    if (!item) continue;
    totalWeight += item.weight;
    if (result.status === "sim") {
      earnedWeight += item.weight;
    } else if (result.status === "parcial") {
      earnedWeight += item.weight * 0.5;
    }
  }

  if (totalWeight === 0) return 0;
  return Math.round((earnedWeight / totalWeight) * 100);
}

/**
 * Resolve a árvore de decisão com base nas respostas do checklist.
 * Percorre os nós da árvore seguindo as respostas (sim/não) até chegar
 * a um nó terminal com classificação de risco.
 *
 * @param answers - Mapa de nodeId → boolean (true = sim, false = não)
 * @returns Caminho percorrido e classificação final
 */
export function resolveDecisionTree(
  answers: Record<string, boolean>
): {
  path: string[];
  classification: string;
  action: string;
  deadline: string;
  policySources: PolicySource[];
} {
  const path: string[] = [];
  let currentNodeId = DECISION_TREE[0]?.nodeId;

  const maxIterations = 50;
  let iterations = 0;

  while (currentNodeId && iterations < maxIterations) {
    iterations++;
    const node = DECISION_TREE.find((n) => n.nodeId === currentNodeId);
    if (!node) break;

    path.push(node.nodeId);

    // Nó terminal: retorna classificação
    if (node.terminalClassification) {
      return {
        path,
        classification: node.terminalClassification,
        action: node.terminalAction || "",
        deadline: node.terminalDeadline || "",
        policySources: node.policySources,
      };
    }

    // Nó de decisão: seguir para o próximo nó com base na resposta
    const answer = answers[node.nodeId];
    if (answer === true && node.trueNodeId) {
      currentNodeId = node.trueNodeId;
    } else if (answer === false && node.falseNodeId) {
      currentNodeId = node.falseNodeId;
    } else {
      // Sem resposta definida: assumir o pior caso (falseNodeId)
      currentNodeId = node.falseNodeId || node.trueNodeId || null;
    }
  }

  // Fallback: se não chegou a um terminal, retornar risco alto
  return {
    path,
    classification: "alto",
    action: "Não foi possível determinar a classificação automaticamente. Revisão manual necessária.",
    deadline: "30 dias",
    policySources: [],
  };
}

/**
 * Registro de versões do checklist (para auditoria e rastreabilidade).
 * Atualmente contém apenas a versão atual, mas pode ser expandido
 * para manter histórico de versões anteriores.
 */
export const CHECKLIST_REGISTRY: Record<string, ChecklistVersion> = {
  [CURRENT_CHECKLIST_VERSION]: CHECKLIST_VERSION_CURRENT,
};

/**
 * Retorna uma versão específica do checklist pelo versionId.
 */
export function getChecklistVersion(versionId: string): ChecklistVersion | undefined {
  return CHECKLIST_REGISTRY[versionId];
}

/**
 * Retorna o checklist mais recente do registro.
 */
export function getLatestChecklist(): ChecklistVersion {
  return CHECKLIST_VERSION_CURRENT;
}
