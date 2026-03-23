/**
 * Serviço de Integração Multi-Provedor de IA
 * 
 * Suporta: OpenAI, Gemini, Claude, Perplexity
 * Funcionalidades:
 * - Configuração de provedores
 * - Instruções personalizadas por organização
 * - Chat com contexto de avaliações
 * - Refinamentos ilimitados
 * - Geração de análises e recomendações
 */

import { invokeLLM, Message, InvokeResult } from "./_core/llm";
import { logger } from "./_core/logger";
import * as db from "./db";

// ==================== TIPOS ====================
export type AIProvider = "openai" | "gemini" | "claude" | "perplexity";
export type AIModule = "compliance" | "due_diligence" | "action_plans" | "general";
export type ResponseStyle = "formal" | "tecnico" | "executivo" | "simplificado";

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  isEnabled: boolean;
  isDefault: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface AIOrganizationConfig {
  organizationId: number;
  module: AIModule;
  systemPrompt?: string;
  contextInstructions?: string;
  responseStyle: ResponseStyle;
  includeRecommendations: boolean;
  includeRiskAnalysis: boolean;
  includeActionPlan: boolean;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatContext {
  organizationId?: number;
  organizationName?: string;
  module: AIModule;
  entityType?: string;
  entityId?: number;
  assessmentData?: Record<string, unknown>;
  customInstructions?: string;
}

export interface AIResponse {
  content: string;
  tokensUsed?: number;
  model?: string;
  provider: AIProvider;
}

// ==================== PROMPTS BASE ====================
const BASE_SYSTEM_PROMPTS: Record<AIModule, string> = {
  compliance: `Você é um especialista em proteção de dados e privacidade, com profundo conhecimento em LGPD, GDPR e outras regulamentações internacionais.
Sua função é analisar avaliações de conformidade e maturidade em proteção de dados, identificar gaps, riscos e oportunidades de melhoria.
Você deve fornecer recomendações práticas, priorizadas e alinhadas com as melhores práticas do mercado.
Sempre considere o contexto específico da organização ao fazer suas análises.`,

  due_diligence: `Você é um especialista em gestão de riscos de terceiros e due diligence de parceiros e fornecedores.
Sua função é analisar avaliações de terceiros, classificar riscos, identificar pontos críticos e propor medidas de mitigação.
Você deve considerar aspectos de proteção de dados, segurança da informação, compliance e continuidade de negócios.
Forneça recomendações claras sobre a gestão do relacionamento com cada terceiro.`,

  action_plans: `Você é um especialista em gestão de projetos e planos de ação para conformidade e proteção de dados.
Sua função é ajudar a estruturar, priorizar e acompanhar planos de ação para remediar gaps identificados em avaliações.
Você deve considerar recursos disponíveis, prazos, dependências e impacto no negócio.
Forneça orientações práticas para implementação das ações recomendadas.`,

  general: `Você é um assistente especializado em proteção de dados, privacidade e gestão de riscos.
Você trabalha para a Seusdados Consultoria, uma empresa especializada em consultoria de proteção de dados.
Sua função é auxiliar consultores na análise de dados, geração de insights e elaboração de recomendações para clientes.
Sempre forneça respostas precisas, fundamentadas e alinhadas com as melhores práticas do mercado.`
};

const RESPONSE_STYLE_INSTRUCTIONS: Record<ResponseStyle, string> = {
  formal: "Use linguagem formal e técnica, adequada para documentos oficiais e relatórios executivos.",
  tecnico: "Use linguagem técnica detalhada, com referências a normas e regulamentações específicas.",
  executivo: "Use linguagem objetiva e direta, focando em pontos-chave e recomendações acionáveis para a alta gestão.",
  simplificado: "Use linguagem acessível e didática, explicando conceitos técnicos de forma clara para não-especialistas."
};

// ==================== FUNÇÕES AUXILIARES ====================

/**
 * Constrói o prompt do sistema baseado no módulo e configurações
 */
export function buildSystemPrompt(
  module: AIModule,
  organizationConfig?: AIOrganizationConfig,
  context?: ChatContext
): string {
  let prompt = BASE_SYSTEM_PROMPTS[module];

  // Adicionar estilo de resposta
  const style = organizationConfig?.responseStyle || "formal";
  prompt += `\n\n${RESPONSE_STYLE_INSTRUCTIONS[style]}`;

  // Adicionar instruções personalizadas da organização
  if (organizationConfig?.systemPrompt) {
    prompt += `\n\nInstruções adicionais do consultor:\n${organizationConfig.systemPrompt}`;
  }

  // Adicionar contexto específico do cliente
  if (organizationConfig?.contextInstructions) {
    prompt += `\n\nContexto específico do cliente:\n${organizationConfig.contextInstructions}`;
  }

  // Adicionar informações de contexto
  if (context?.organizationName) {
    prompt += `\n\nVocê está analisando dados da organização: ${context.organizationName}`;
  }

  // Configurar o que incluir nas respostas
  const includes: string[] = [];
  if (organizationConfig?.includeRecommendations !== false) {
    includes.push("recomendações práticas e priorizadas");
  }
  if (organizationConfig?.includeRiskAnalysis !== false) {
    includes.push("análise de riscos identificados");
  }
  if (organizationConfig?.includeActionPlan !== false) {
    includes.push("sugestões de plano de ação");
  }
  
  if (includes.length > 0) {
    prompt += `\n\nSuas respostas devem incluir: ${includes.join(", ")}.`;
  }

  // Instruções de refinamento
  prompt += `\n\nO consultor pode solicitar refinamentos e aprofundamentos ilimitados. Esteja preparado para:
- Detalhar pontos específicos quando solicitado
- Reformular respostas com diferentes abordagens
- Aprofundar análises em áreas específicas
- Ajustar o nível de detalhe conforme necessário
- Fornecer exemplos práticos quando solicitado`;

  return prompt;
}

/**
 * Formata dados de avaliação para contexto do chat
 */
export function formatAssessmentContext(
  entityType: string,
  assessmentData: Record<string, unknown>
): string {
  let context = "";

  if (entityType === "compliance_assessment") {
    context = `
## Dados da Avaliação de Conformidade

**Título:** ${assessmentData.title || "N/A"}
**Framework:** ${assessmentData.framework || "N/A"}
**Status:** ${assessmentData.status || "N/A"}
**Nível de Maturidade:** ${assessmentData.maturityLevel || "N/A"}/5
**Score Geral:** ${assessmentData.overallScore || "N/A"}%
**Score de Risco:** ${assessmentData.riskScore || "N/A"}

${assessmentData.responses ? `
### Respostas por Domínio
${JSON.stringify(assessmentData.responses, null, 2)}
` : ""}
`;
  } else if (entityType === "third_party_assessment") {
    context = `
## Dados da Avaliação de Terceiro

**Terceiro:** ${assessmentData.thirdPartyName || "N/A"}
**CNPJ:** ${assessmentData.thirdPartyCnpj || "N/A"}
**Tipo:** ${assessmentData.thirdPartyType || "N/A"}
**Título da Avaliação:** ${assessmentData.title || "N/A"}
**Status:** ${assessmentData.status || "N/A"}
**Score de Risco:** ${assessmentData.overallRiskScore || "N/A"}
**Classificação:** ${assessmentData.riskClassification || "N/A"}

${assessmentData.responses ? `
### Respostas da Avaliação
${JSON.stringify(assessmentData.responses, null, 2)}
` : ""}
`;
  }

  return context;
}

// ==================== FUNÇÃO PRINCIPAL DE CHAT ====================

/**
 * Envia mensagem para o agente de IA e retorna resposta
 */
export async function chatWithAI(
  messages: ChatMessage[],
  context: ChatContext,
  organizationConfig?: AIOrganizationConfig
): Promise<AIResponse> {
  // Construir prompt do sistema
  const systemPrompt = buildSystemPrompt(context.module, organizationConfig, context);

  // Adicionar contexto de avaliação se disponível
  let contextMessage = "";
  if (context.entityType && context.assessmentData) {
    contextMessage = formatAssessmentContext(context.entityType, context.assessmentData);
  }

  // Montar mensagens para o LLM
  const llmMessages: Message[] = [
    { role: "system", content: systemPrompt }
  ];

  // Adicionar contexto como mensagem do sistema se houver
  if (contextMessage) {
    llmMessages.push({
      role: "system",
      content: `Dados para análise:\n${contextMessage}`
    });
  }

  // Adicionar instruções customizadas se houver
  if (context.customInstructions) {
    llmMessages.push({
      role: "system",
      content: `Instruções adicionais para esta sessão:\n${context.customInstructions}`
    });
  }

  // Adicionar histórico de mensagens
  for (const msg of messages) {
    llmMessages.push({
      role: msg.role,
      content: msg.content
    });
  }

  try {
    const result = await invokeLLM({ messages: llmMessages });

    const content = typeof result.choices[0]?.message?.content === "string"
      ? result.choices[0].message.content
      : Array.isArray(result.choices[0]?.message?.content)
        ? result.choices[0].message.content
            .filter((c): c is { type: "text"; text: string } => c.type === "text")
            .map(c => c.text)
            .join("\n")
        : "";

    return {
      content,
      tokensUsed: result.usage?.total_tokens,
      model: result.model,
      provider: "gemini" // Usando Gemini via Manus Forge
    };
  } catch (error) {
    logger.error('Erro ao chamar LLM', error as Error);
    throw new Error(`Erro ao comunicar com o agente de IA: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
  }
}

// ==================== FUNÇÕES DE ANÁLISE ESPECÍFICAS ====================

/**
 * Gera análise de conformidade
 */
export async function generateComplianceAnalysis(
  assessmentData: Record<string, unknown>,
  organizationName: string,
  organizationConfig?: AIOrganizationConfig
): Promise<AIResponse> {
  const context: ChatContext = {
    module: "compliance",
    organizationName,
    entityType: "compliance_assessment",
    assessmentData
  };

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: `Por favor, analise esta avaliação de conformidade e forneça:
1. Resumo executivo do estado atual de maturidade
2. Principais gaps identificados
3. Riscos mais críticos
4. Recomendações priorizadas para evolução
5. Próximos passos sugeridos

Seja específico e considere o contexto da organização.`
    }
  ];

  return chatWithAI(messages, context, organizationConfig);
}

/**
 * Gera análise de due diligence de terceiro
 */
export async function generateThirdPartyAnalysis(
  assessmentData: Record<string, unknown>,
  organizationName: string,
  organizationConfig?: AIOrganizationConfig
): Promise<AIResponse> {
  const context: ChatContext = {
    module: "due_diligence",
    organizationName,
    entityType: "third_party_assessment",
    assessmentData
  };

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: `Por favor, analise esta avaliação de due diligence do terceiro e forneça:
1. Resumo do perfil de risco do terceiro
2. Principais pontos de atenção identificados
3. Classificação de risco recomendada e justificativa
4. Medidas de mitigação sugeridas
5. Recomendação sobre continuidade do relacionamento

Seja específico e considere os riscos para a organização contratante.`
    }
  ];

  return chatWithAI(messages, context, organizationConfig);
}

/**
 * Gera sugestões de plano de ação
 */
export async function generateActionPlanSuggestions(
  gaps: Array<{ area: string; description: string; severity: string }>,
  organizationName: string,
  organizationConfig?: AIOrganizationConfig
): Promise<AIResponse> {
  const context: ChatContext = {
    module: "action_plans",
    organizationName,
    assessmentData: { gaps }
  };

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: `Com base nos gaps identificados abaixo, sugira um plano de ação estruturado:

${gaps.map((g, i) => `${i + 1}. **${g.area}** (${g.severity}): ${g.description}`).join("\n")}

Para cada ação, inclua:
- Descrição da ação
- Responsável sugerido (perfil/área)
- Prazo estimado
- Prioridade
- Recursos necessários
- Critérios de sucesso`
    }
  ];

  return chatWithAI(messages, context, organizationConfig);
}

/**
 * Refina uma resposta anterior
 */
export async function refineResponse(
  previousMessages: ChatMessage[],
  refinementRequest: string,
  context: ChatContext,
  organizationConfig?: AIOrganizationConfig
): Promise<AIResponse> {
  const messages: ChatMessage[] = [
    ...previousMessages,
    {
      role: "user",
      content: refinementRequest
    }
  ];

  return chatWithAI(messages, context, organizationConfig);
}

// ==================== TEMPLATES DE PROMPTS ====================

export const PROMPT_TEMPLATES = {
  compliance_summary: {
    name: "Resumo Executivo de Conformidade",
    category: "resumo_executivo",
    module: "compliance" as AIModule,
    template: `Analise a avaliação de conformidade e gere um resumo executivo de no máximo 500 palavras, incluindo:
- Estado atual de maturidade
- Top 3 riscos identificados
- Top 3 recomendações prioritárias
- Próximos passos imediatos`
  },

  compliance_gap_analysis: {
    name: "Análise de Gaps de Conformidade",
    category: "analise_risco",
    module: "compliance" as AIModule,
    template: `Realize uma análise detalhada dos gaps identificados na avaliação, organizando por:
- Domínio/área afetada
- Descrição do gap
- Impacto potencial
- Complexidade de remediação
- Prazo sugerido para correção`
  },

  third_party_risk: {
    name: "Análise de Risco de Terceiro",
    category: "analise_risco",
    module: "due_diligence" as AIModule,
    template: `Analise o perfil de risco do terceiro avaliado considerando:
- Criticidade do serviço/produto fornecido
- Acesso a dados pessoais
- Histórico de conformidade
- Capacidade de resposta a incidentes
- Recomendação de classificação de risco`
  },

  action_plan_generation: {
    name: "Geração de Plano de Ação",
    category: "plano_acao",
    module: "action_plans" as AIModule,
    template: `Com base nos gaps identificados, gere um plano de ação estruturado com:
- Ações priorizadas por criticidade
- Responsáveis sugeridos
- Prazos estimados
- Recursos necessários
- Métricas de acompanhamento`
  }
};


// ==================== GERAÇÃO DE PLANOS DE AÇÃO ====================

export interface ActionItem {
  title: string;
  description: string;
  area: string;
  priority: "critica" | "alta" | "media" | "baixa";
  estimatedDays: number;
  responsibleRole: string;
  resources: string[];
  successCriteria: string;
  dependencies?: string[];
  relatedGapId?: number;
}

export interface GeneratedActionPlan {
  summary: string;
  totalActions: number;
  criticalActions: number;
  estimatedTotalDays: number;
  actions: ActionItem[];
  recommendations: string[];
}

/**
 * Extrai gaps de uma avaliação de conformidade
 */
export function extractComplianceGaps(
  responses: Array<{
    questionId: number;
    questionText: string;
    domain: string;
    answer: number;
    maturityLevel?: number;
    riskLevel?: string;
    observation?: string;
  }>,
  maturityThreshold: number = 3
): Array<{ area: string; description: string; severity: string; questionId: number; currentLevel: number }> {
  const gaps: Array<{ area: string; description: string; severity: string; questionId: number; currentLevel: number }> = [];

  for (const response of responses) {
    const level = response.maturityLevel ?? response.answer;
    if (level < maturityThreshold) {
      let severity = "baixa";
      if (level <= 1) severity = "critica";
      else if (level <= 2) severity = "alta";
      
      gaps.push({
        area: response.domain || "Geral",
        description: response.questionText,
        severity,
        questionId: response.questionId,
        currentLevel: level
      });
    }
  }

  return gaps;
}

/**
 * Extrai gaps de uma avaliação de due diligence
 */
export function extractDueDiligenceGaps(responses: any[], riskThreshold: number = 10) {
  const gaps: any[] = [];
  const categories = new Map<string, any>();

  // Normalize response records
  for (const response of responses) {
    const impact = Number(response.impactScore ?? response.impact ?? 0);
    const probability = Number(response.probabilityScore ?? response.probability ?? 0);
    const riskScore = Number(response.riskScore ?? (impact * probability));

    if (!riskScore || riskScore < riskThreshold) continue;

    const category = String(response.category || response.section || response.secao || 'Geral');

    // Severity based on the 1..25 matrix
    let severity: 'baixo' | 'moderado' | 'alto' | 'critico' = 'moderado';
    if (riskScore >= 20) severity = 'critico';
    else if (riskScore >= 15) severity = 'alto';
    else if (riskScore >= 10) severity = 'moderado';
    else severity = 'baixo';

    const gap = {
      questionId: response.questionId,
      questionText: response.questionText || response.question || `Questão ${response.questionId}`,
      category,
      currentLevel: response.selectedLevel,
      impactScore: impact,
      probabilityScore: probability,
      riskScore,
      severity,
      evidence: response.evidence || response.evidencia,
      legalBasis: response.legalBasis || response.fundamentoLegal,
      recommendations: response.recommendations || [],
    };

    gaps.push(gap);

    if (!categories.has(category)) {
      categories.set(category, {
        category,
        totalRiskScore: 0,
        count: 0,
        maxRiskScore: 0,
        averageRiskScore: 0,
        severityDistribution: { baixo: 0, moderado: 0, alto: 0, critico: 0 },
      });
    }

    const cat = categories.get(category)!;
    cat.totalRiskScore += riskScore;
    cat.count += 1;
    cat.maxRiskScore = Math.max(cat.maxRiskScore, riskScore);
    cat.severityDistribution[severity] += 1;
  }

  // Finalize category stats
  for (const cat of Array.from(categories.values())) {
    cat.averageRiskScore = cat.count ? Math.round((cat.totalRiskScore / cat.count) * 10) / 10 : 0;
  }

  gaps.sort((a, b) => b.riskScore - a.riskScore);

  return {
    gaps,
    categories: Array.from(categories.values()).sort((a, b) => b.maxRiskScore - a.maxRiskScore),
    summary: {
      totalGaps: gaps.length,
      criticalGaps: gaps.filter(g => g.severity === 'critico').length,
      highGaps: gaps.filter(g => g.severity === 'alto').length,
      moderateGaps: gaps.filter(g => g.severity === 'moderado').length,
      averageRiskScore: gaps.length ? Math.round((gaps.reduce((sum, g) => sum + g.riskScore, 0) / gaps.length) * 10) / 10 : 0,
      maxRiskScore: gaps.length ? gaps[0].riskScore : 0,
    }
  };
}

/**
 * Gera plano de ação detalhado para avaliação de conformidade
 */
export async function generateComplianceActionPlan(
  assessmentData: {
    id: number;
    title: string;
    framework: string;
    maturityLevel: number;
    overallScore: number;
    organizationName: string;
  },
  gaps: Array<{ area: string; description: string; severity: string; questionId: number; currentLevel: number }>,
  organizationConfig?: AIOrganizationConfig
): Promise<{ response: AIResponse; parsedPlan?: GeneratedActionPlan }> {
  const context: ChatContext = {
    module: "action_plans",
    organizationName: assessmentData.organizationName,
    entityType: "compliance_assessment",
    assessmentData: {
      ...assessmentData,
      gaps
    }
  };

  const gapsByArea = gaps.reduce((acc, gap) => {
    if (!acc[gap.area]) acc[gap.area] = [];
    acc[gap.area].push(gap);
    return acc;
  }, {} as Record<string, typeof gaps>);

  const gapsFormatted = Object.entries(gapsByArea).map(([area, areaGaps]) => {
    return `### ${area}
${areaGaps.map((g, i) => `${i + 1}. [${g.severity.toUpperCase()}] ${g.description} (Nível atual: ${g.currentLevel}/5)`).join("\n")}`;
  }).join("\n\n");

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: `## Contexto da Avaliação de Conformidade

**Organização:** ${assessmentData.organizationName}
**Título da Avaliação:** ${assessmentData.title}
**Framework:** ${assessmentData.framework}
**Nível de Maturidade Atual:** ${assessmentData.maturityLevel}/5
**Score Geral:** ${assessmentData.overallScore}%
**Total de Gaps Identificados:** ${gaps.length}

## Gaps Identificados por Área

${gapsFormatted}

## Solicitação

Com base nos gaps identificados acima, gere um **plano de ação detalhado e estruturado** para elevar o nível de maturidade da organização. 

Para cada ação, forneça obrigatoriamente:
1. **Título da Ação** - Nome claro e objetivo
2. **Descrição** - O que precisa ser feito em detalhes
3. **Área/Domínio** - Área de conformidade relacionada
4. **Prioridade** - crítica, alta, média ou baixa
5. **Prazo Estimado** - Em dias úteis
6. **Responsável Sugerido** - Perfil ou área responsável (ex: DPO, TI, Jurídico, RH)
7. **Recursos Necessários** - O que será preciso para executar
8. **Critérios de Sucesso** - Como saber que a ação foi concluída com êxito
9. **Dependências** - Outras ações que precisam ser concluídas antes (se houver)

Organize as ações por prioridade (críticas primeiro) e agrupe por área quando fizer sentido.

Ao final, inclua:
- **Resumo Executivo** do plano
- **Recomendações Gerais** para o sucesso da implementação
- **Estimativa Total** de prazo para conclusão de todas as ações

Responda em formato estruturado e profissional, adequado para apresentação à alta gestão.`
    }
  ];

  const response = await chatWithAI(messages, context, organizationConfig);

  // Tentar extrair plano estruturado da resposta
  const parsedPlan = parseActionPlanFromResponse(response.content, gaps.length);

  return { response, parsedPlan };
}

/**
 * Gera plano de ação detalhado para avaliação de due diligence
 */
export async function generateDueDiligenceActionPlan(
  assessmentData: {
    id: number;
    title: string;
    thirdPartyName: string;
    thirdPartyType: string;
    riskClassification: string;
    overallRiskScore: number;
    organizationName: string;
  },
  gaps: Array<{ area: string; description: string; severity: string; questionId: number; riskScore: number }>,
  organizationConfig?: AIOrganizationConfig
): Promise<{ response: AIResponse; parsedPlan?: GeneratedActionPlan }> {
  const context: ChatContext = {
    module: "action_plans",
    organizationName: assessmentData.organizationName,
    entityType: "third_party_assessment",
    assessmentData: {
      ...assessmentData,
      gaps
    }
  };

  const gapsByArea = gaps.reduce((acc, gap) => {
    if (!acc[gap.area]) acc[gap.area] = [];
    acc[gap.area].push(gap);
    return acc;
  }, {} as Record<string, typeof gaps>);

  const gapsFormatted = Object.entries(gapsByArea).map(([area, areaGaps]) => {
    return `### ${area}
${areaGaps.map((g, i) => `${i + 1}. [${g.severity.toUpperCase()}] ${g.description} (Score de Risco: ${g.riskScore}/25)`).join("\n")}`;
  }).join("\n\n");

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: `## Contexto da Avaliação de Due Diligence

**Organização Contratante:** ${assessmentData.organizationName}
**Terceiro Avaliado:** ${assessmentData.thirdPartyName}
**Tipo de Terceiro:** ${assessmentData.thirdPartyType}
**Título da Avaliação:** ${assessmentData.title}
**Classificação de Risco:** ${assessmentData.riskClassification}
**Score de Risco Geral:** ${assessmentData.overallRiskScore}/25
**Total de Riscos Identificados:** ${gaps.length}

## Riscos Identificados por Categoria

${gapsFormatted}

## Solicitação

Com base nos riscos identificados acima, gere um **plano de ação detalhado** para mitigar os riscos do relacionamento com este terceiro.

Para cada ação, forneça obrigatoriamente:
1. **Título da Ação** - Nome claro e objetivo
2. **Descrição** - O que precisa ser feito em detalhes
3. **Categoria** - Área de risco relacionada
4. **Prioridade** - crítica, alta, média ou baixa
5. **Prazo Estimado** - Em dias úteis
6. **Responsável Sugerido** - Perfil ou área responsável (ex: Compras, Jurídico, TI, Compliance)
7. **Recursos Necessários** - O que será preciso para executar
8. **Critérios de Sucesso** - Como saber que a ação foi concluída com êxito
9. **Dependências** - Outras ações que precisam ser concluídas antes (se houver)

Considere também:
- Ações que devem ser exigidas do próprio terceiro
- Cláusulas contratuais a serem incluídas/revisadas
- Monitoramento contínuo necessário
- Plano de contingência em caso de incidentes

Organize as ações por prioridade (críticas primeiro).

Ao final, inclua:
- **Resumo Executivo** do plano
- **Recomendação sobre o relacionamento** (manter, manter com restrições, encerrar)
- **Recomendações Gerais** para gestão do terceiro
- **Estimativa Total** de prazo para implementação

Responda em formato estruturado e profissional.`
    }
  ];

  const response = await chatWithAI(messages, context, organizationConfig);

  // Tentar extrair plano estruturado da resposta
  const parsedPlan = parseActionPlanFromResponse(response.content, gaps.length);

  return { response, parsedPlan };
}

/**
 * Tenta extrair um plano estruturado da resposta do LLM
 */
function parseActionPlanFromResponse(content: string, expectedActions: number): GeneratedActionPlan | undefined {
  try {
    // Extrair resumo (primeiro parágrafo ou seção de resumo)
    const summaryMatch = content.match(/(?:resumo executivo|resumo|sumário)[:\s]*\n?([\s\S]*?)(?=\n##|\n\*\*|$)/i);
    const summary = summaryMatch?.[1]?.trim() || content.substring(0, 500);

    // Contar ações mencionadas
    const actionMatches = content.match(/(?:ação|action|item)\s*\d+/gi) || [];
    const totalActions = Math.max(actionMatches.length, expectedActions);

    // Contar ações críticas
    const criticalMatches = content.match(/(?:crítica|critical|urgente)/gi) || [];
    const criticalActions = Math.min(criticalMatches.length, totalActions);

    // Estimar dias totais (procurar por menções de prazo)
    const daysMatches = content.match(/(\d+)\s*(?:dias?|days?)/gi) || [];
    let estimatedTotalDays = 0;
    for (const match of daysMatches) {
      const num = parseInt(match.match(/\d+/)?.[0] || "0");
      if (num > 0 && num < 365) estimatedTotalDays += num;
    }
    if (estimatedTotalDays === 0) estimatedTotalDays = totalActions * 15; // Estimativa padrão

    // Extrair recomendações
    const recsMatch = content.match(/(?:recomendações?|recommendations?)[:\s]*\n?([\s\S]*?)(?=\n##|$)/i);
    const recommendations = recsMatch?.[1]
      ?.split(/\n[-•*]\s*/)
      .filter(r => r.trim().length > 10)
      .slice(0, 5) || [];

    return {
      summary,
      totalActions,
      criticalActions,
      estimatedTotalDays,
      actions: [], // Ações detalhadas requerem parsing mais complexo
      recommendations
    };
  } catch {
    return undefined;
  }
}

/**
 * Refina um plano de ação existente com base em feedback
 */
export async function refineActionPlan(
  previousPlan: string,
  refinementRequest: string,
  context: ChatContext,
  organizationConfig?: AIOrganizationConfig
): Promise<AIResponse> {
  const messages: ChatMessage[] = [
    {
      role: "assistant",
      content: previousPlan
    },
    {
      role: "user",
      content: `Por favor, refine o plano de ação com base no seguinte feedback:\n\n${refinementRequest}\n\nMantenha a estrutura do plano e faça os ajustes solicitados.`
    }
  ];

  return chatWithAI(messages, { ...context, module: "action_plans" }, organizationConfig);
}


// ==================== GERAÇÃO DE AÇÃO EXECUTÁVEL POR DOMÍNIO ====================

export interface DomainActionResult {
  title: string;
  description: string;
  resources: string;
  successCriteria: string;
  notes: string;
}

/**
 * Gera uma ação executável e orientada à correção para um domínio com gap.
 * Usa o LLM para produzir conteúdo prático, não apenas repetir as perguntas da avaliação.
 *
 * @param domainName - Nome do domínio (ex: "Governança de Dados")
 * @param domainId - ID do domínio (ex: "IA-01")
 * @param organizationName - Nome da organização
 * @param worstLevel - Pior nível de maturidade encontrado no domínio (1-5)
 * @param avgLevel - Nível médio do domínio
 * @param questions - Perguntas com gap (para contexto interno do LLM, não para exibir)
 * @param priority - Prioridade calculada
 */
export async function generateActionItemForDomain(
  domainName: string,
  domainId: string,
  organizationName: string,
  worstLevel: number,
  avgLevel: number,
  questions: Array<{ questionText: string; level: number; severity: string }>,
  priority: 'critica' | 'alta' | 'media' | 'baixa'
): Promise<DomainActionResult> {
  const levelLabel = (level: number) =>
    level <= 1 ? 'Inexistente (nível 1)' :
    level === 2 ? 'Inicial (nível 2)' :
    level === 3 ? 'Definido (nível 3)' :
    level === 4 ? 'Gerenciado (nível 4)' : 'Otimizado (nível 5)';

  const priorityLabel = priority === 'critica' ? 'CRÍTICA' : priority === 'alta' ? 'ALTA' : priority === 'media' ? 'MÉDIA' : 'BAIXA';

  const gapsContext = questions
    .sort((a, b) => a.level - b.level)
    .map(q => `- Controle: "${q.questionText}" | Situação atual: ${levelLabel(q.level)}`)
    .join('\n');

  const systemPrompt = `Você é um especialista em conformidade com a LGPD e gestão de proteção de dados.
Sua função é gerar planos de ação práticos e executáveis para organizações que precisam elevar sua maturidade em proteção de dados.
Você trabalha para a Seusdados Consultoria.
Sempre responda em português brasileiro.`;

  const userPrompt = `A organização "${organizationName}" foi avaliada no domínio "${domainName}" (${domainId}) e apresentou os seguintes gaps:

Nível médio atual do domínio: ${avgLevel.toFixed(1)}/5 (${levelLabel(Math.round(avgLevel))})
Prioridade da ação: ${priorityLabel}

Controles com gap identificado:
${gapsContext}

Gere uma ação de melhoria EXECUTÁVEL para este domínio. A ação deve ser prática e orientada à correção real dos problemas identificados.

Responda EXATAMENTE neste formato JSON (sem markdown, sem texto antes ou depois):
{
  "titulo": "Título claro e objetivo da ação (máximo 100 caracteres)",
  "descricao": "Descrição detalhada do que precisa ser feito. Explique qual melhoria deve ser implementada, qual problema foi identificado e como corrigi-lo. Seja prático e direto. Mínimo 3 frases.",
  "recursos": "Quais recursos, ferramentas, pessoas ou insumos são necessários para executar esta ação.",
  "criterio_sucesso": "Qual é o resultado esperado e como saber que a ação foi concluída com êxito. Seja mensurável.",
  "notas": "Observações adicionais, dependências ou cuidados importantes para a execução."
}`;

  try {
    const { invokeLLM } = await import('./_core/llm');
    const result = await invokeLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'domain_action',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              titulo: { type: 'string' },
              descricao: { type: 'string' },
              recursos: { type: 'string' },
              criterio_sucesso: { type: 'string' },
              notas: { type: 'string' },
            },
            required: ['titulo', 'descricao', 'recursos', 'criterio_sucesso', 'notas'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = result.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    return {
      title: (parsed.titulo || `Elevar maturidade em ${domainName}`).substring(0, 255),
      description: parsed.descricao || `Implementar melhorias no domínio ${domainName} para elevar o nível de maturidade.`,
      resources: parsed.recursos || 'A definir com a equipe responsável.',
      successCriteria: parsed.criterio_sucesso || 'Controles implementados e documentados.',
      notes: parsed.notas || '',
    };
  } catch (err) {
    // Fallback: retornar conteúdo estruturado sem LLM
    console.error('[generateActionItemForDomain] Erro ao chamar LLM, usando fallback:', err);
    return {
      title: `Elevar maturidade em ${domainName}`,
      description: `Implementar melhorias no domínio "${domainName}" para corrigir os gaps identificados na avaliação de maturidade LGPD. Nível atual médio: ${avgLevel.toFixed(1)}/5. São necessárias ações de documentação, implementação de controles e treinamento da equipe responsável.`,
      resources: 'DPO, área jurídica, TI e lideranças de área conforme domínio.',
      successCriteria: `Controles do domínio "${domainName}" implementados, documentados e validados pelo DPO.`,
      notes: `${questions.length} controle(s) com gap identificado(s). Prioridade: ${priorityLabel}.`,
    };
  }
}

/**
 * Gera o conteúdo executável de uma ação para uma PERGUNTA específica com gap
 * Usado na geração do Plano de Ação por pergunta (em vez de por domínio)
 */
export async function generateActionItemForQuestion(
  questionId: string,
  questionText: string,
  domainName: string,
  domainId: string,
  organizationName: string,
  currentLevel: number,
  priority: 'critica' | 'alta' | 'media' | 'baixa'
): Promise<DomainActionResult> {
  const levelLabel = (level: number) =>
    level <= 1 ? 'Inexistente (nível 1)' :
    level === 2 ? 'Inicial (nível 2)' :
    level === 3 ? 'Definido (nível 3)' :
    level === 4 ? 'Gerenciado (nível 4)' : 'Otimizado (nível 5)';

  const priorityLabel = priority === 'critica' ? 'CRÍTICA' : priority === 'alta' ? 'ALTA' : priority === 'media' ? 'MÉDIA' : 'BAIXA';

  const systemPrompt = `Você é um especialista em conformidade com a LGPD e gestão de proteção de dados.
Sua função é gerar planos de ação práticos e executáveis para organizações que precisam elevar sua maturidade em proteção de dados.
Você trabalha para a Seusdados Consultoria.
Sempre responda em português brasileiro.`;

  const userPrompt = `A organização "${organizationName}" foi avaliada e apresentou gap no seguinte controle:

Domínio: ${domainName} (${domainId})
Controle: "${questionText}"
Situação atual: ${levelLabel(currentLevel)}
Prioridade: ${priorityLabel}

Gere uma ação de melhoria EXECUTÁVEL e ESPECÍFICA para este controle. A ação deve ser focada exclusivamente neste controle, prática e orientada à correção real do problema identificado.

Responda EXATAMENTE neste formato JSON (sem markdown, sem texto antes ou depois):
{
  "titulo": "Título claro e objetivo da ação (máximo 100 caracteres)",
  "descricao": "Descrição detalhada do que precisa ser feito para corrigir especificamente este controle. Explique qual melhoria deve ser implementada, qual problema foi identificado e como corrigi-lo. Seja prático e direto. Mínimo 3 frases.",
  "recursos": "Quais recursos, ferramentas, pessoas ou insumos são necessários para executar esta ação.",
  "criterio_sucesso": "Qual é o resultado esperado e como saber que a ação foi concluída com êxito. Seja mensurável.",
  "notas": "Observações adicionais, dependências ou cuidados importantes para a execução."
}`;

  try {
    const { invokeLLM } = await import('./_core/llm');
    const result = await invokeLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'question_action',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              titulo: { type: 'string' },
              descricao: { type: 'string' },
              recursos: { type: 'string' },
              criterio_sucesso: { type: 'string' },
              notas: { type: 'string' },
            },
            required: ['titulo', 'descricao', 'recursos', 'criterio_sucesso', 'notas'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = result.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    return {
      title: (parsed.titulo || `Corrigir controle: ${questionText.substring(0, 60)}`).substring(0, 255),
      description: parsed.descricao || `Implementar melhorias no controle "${questionText}" para elevar o nível de maturidade.`,
      resources: parsed.recursos || 'A definir com a equipe responsável.',
      successCriteria: parsed.criterio_sucesso || 'Controle implementado e documentado.',
      notes: parsed.notas || '',
    };
  } catch (err) {
    console.error('[generateActionItemForQuestion] Erro ao chamar LLM, usando fallback:', err);
    return {
      title: `Corrigir: ${questionText.substring(0, 80)}`,
      description: `Implementar melhorias para o controle "${questionText}" no domínio "${domainName}". Situação atual: ${levelLabel(currentLevel)}. São necessárias ações de documentação, implementação de controles e validação pelo DPO.`,
      resources: 'DPO, área jurídica, TI e lideranças de área conforme domínio.',
      successCriteria: `Controle "${questionText.substring(0, 60)}" implementado, documentado e validado pelo DPO.`,
      notes: `Domínio: ${domainName}. Prioridade: ${priorityLabel}.`,
    };
  }
}

// ==================== PARSER DE AÇÕES ESTRUTURADAS ====================

export interface ParsedAction {
  title: string;
  description: string;
  priority: "critica" | "alta" | "media" | "baixa";
  estimatedDays: number;
  responsibleRole: string;
  resources?: string;
  successCriteria?: string;
  dependencies?: string;
}

export interface ParsedActionPlan {
  summary: string;
  actions: ParsedAction[];
  recommendations: string[];
  totalEstimatedDays: number;
  executiveSummary?: string;
  relationshipRecommendation?: string;
}

/**
 * Parser avançado para extrair ações estruturadas do plano gerado pela IA
 */
export function parseActionsFromPlan(content: string): ParsedActionPlan {
  const actions: ParsedAction[] = [];
  let summary = "";
  let executiveSummary = "";
  let relationshipRecommendation = "";
  const recommendations: string[] = [];

  // Extrair resumo executivo
  const execSummaryMatch = content.match(/(?:##?\s*)?(?:resumo executivo|executive summary)[:\s]*\n?([\s\S]*?)(?=\n##|\n\*\*ação|\n\*\*action|$)/i);
  if (execSummaryMatch) {
    executiveSummary = execSummaryMatch[1].trim().replace(/\*\*/g, '').substring(0, 1000);
  }

  // Extrair resumo geral (primeiro parágrafo significativo)
  const lines = content.split('\n').filter(l => l.trim().length > 20);
  if (lines.length > 0) {
    summary = lines[0].replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
  }

  // Padrões para identificar ações
  const actionPatterns = [
    /(?:###?\s*)?(?:ação|action)\s*(\d+)[:\s-]*([^\n]+)\n([\s\S]*?)(?=(?:###?\s*)?(?:ação|action)\s*\d+|##\s*|$)/gi,
    /(?:\*\*)?(?:ação|action)\s*(\d+)[:\s-]*([^\n*]+)(?:\*\*)?\n([\s\S]*?)(?=(?:\*\*)?(?:ação|action)\s*\d+|##\s*|$)/gi,
    /(\d+)\.\s*\*\*([^*\n]+)\*\*\n([\s\S]*?)(?=\d+\.\s*\*\*|##\s*|$)/g
  ];

  for (const pattern of actionPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const actionNumber = match[1];
      const title = match[2].trim().replace(/\*\*/g, '');
      const body = match[3];

      if (title.length < 5 || actions.some(a => a.title === title)) continue;

      // Extrair campos da ação
      const priority = extractPriority(body);
      const estimatedDays = extractDays(body);
      const responsibleRole = extractResponsible(body);
      const description = extractDescription(body, title);
      const resources = extractField(body, ['recursos necessários', 'recursos', 'resources']);
      const successCriteria = extractField(body, ['critérios de sucesso', 'critério de sucesso', 'success criteria']);
      const dependencies = extractField(body, ['dependências', 'dependência', 'dependencies']);

      actions.push({
        title: title.substring(0, 255),
        description: description.substring(0, 2000),
        priority,
        estimatedDays,
        responsibleRole: responsibleRole.substring(0, 100),
        resources: resources?.substring(0, 500),
        successCriteria: successCriteria?.substring(0, 500),
        dependencies: dependencies?.substring(0, 500)
      });
    }
  }

  // Extrair recomendações
  const recsMatch = content.match(/(?:##?\s*)?(?:recomendações?|recommendations?)\s*(?:gerais?)?\s*[:\s]*\n?([\s\S]*?)(?=##|$)/i);
  if (recsMatch) {
    const recsText = recsMatch[1];
    const recLines = recsText.split(/\n[-•*]\s*|\n\d+\.\s*/).filter(r => r.trim().length > 10);
    recommendations.push(...recLines.slice(0, 10).map(r => r.trim().replace(/\*\*/g, '').substring(0, 500)));
  }

  // Extrair recomendação sobre relacionamento (para due diligence)
  const relMatch = content.match(/(?:recomendação sobre o relacionamento|relationship recommendation)[:\s]*\n?([^\n]+)/i);
  if (relMatch) {
    relationshipRecommendation = relMatch[1].trim().replace(/\*\*/g, '');
  }

  // Calcular total de dias
  const totalEstimatedDays = actions.reduce((sum, a) => sum + a.estimatedDays, 0);

  return {
    summary,
    actions,
    recommendations,
    totalEstimatedDays: totalEstimatedDays || actions.length * 15,
    executiveSummary,
    relationshipRecommendation
  };
}

function extractPriority(text: string): "critica" | "alta" | "media" | "baixa" {
  const lower = text.toLowerCase();
  if (lower.includes('crítica') || lower.includes('critical') || lower.includes('urgente')) return 'critica';
  if (lower.includes('alta') || lower.includes('high')) return 'alta';
  if (lower.includes('baixa') || lower.includes('low')) return 'baixa';
  return 'media';
}

function extractDays(text: string): number {
  const match = text.match(/(?:prazo|deadline|tempo)[:\s]*(\d+)\s*(?:dias?|days?)/i);
  if (match) return Math.min(parseInt(match[1]), 365);
  
  const daysMatch = text.match(/(\d+)\s*(?:dias?|days?)/i);
  if (daysMatch) return Math.min(parseInt(daysMatch[1]), 365);
  
  return 30; // Padrão
}

function extractResponsible(text: string): string {
  const match = text.match(/(?:responsável|responsible|owner)[:\s]*([^\n,]+)/i);
  if (match) return match[1].trim().replace(/\*\*/g, '');
  
  // Tentar identificar áreas comuns
  const areas = ['DPO', 'TI', 'Jurídico', 'Compliance', 'RH', 'Compras', 'Segurança', 'Gestão'];
  for (const area of areas) {
    if (text.includes(area)) return area;
  }
  
  return 'A definir';
}

function extractDescription(text: string, title: string): string {
  // Remover campos estruturados e manter descrição
  let desc = text
    .replace(/(?:\*\*)?(?:prioridade|priority)[:\s]*[^\n]+/gi, '')
    .replace(/(?:\*\*)?(?:prazo|deadline)[:\s]*[^\n]+/gi, '')
    .replace(/(?:\*\*)?(?:responsável|responsible)[:\s]*[^\n]+/gi, '')
    .replace(/(?:\*\*)?(?:recursos)[:\s]*[^\n]+/gi, '')
    .replace(/(?:\*\*)?(?:critérios?)[:\s]*[^\n]+/gi, '')
    .replace(/(?:\*\*)?(?:dependências?)[:\s]*[^\n]+/gi, '')
    .replace(/[-•*]\s*/g, '')
    .replace(/\*\*/g, '')
    .trim();
  
  // Se muito curto, usar título como base
  if (desc.length < 20) {
    desc = `Implementar: ${title}`;
  }
  
  return desc.split('\n').filter(l => l.trim()).slice(0, 3).join(' ').trim();
}

function extractField(text: string, fieldNames: string[]): string | undefined {
  for (const name of fieldNames) {
    const regex = new RegExp(`(?:\\*\\*)?${name}[:\\s]*([^\\n]+)`, 'i');
    const match = text.match(regex);
    if (match) return match[1].trim().replace(/\*\*/g, '');
  }
  return undefined;
}

// ==================== TEMPLATES DE PROMPTS ====================

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  module: AIModule;
  category: "analysis" | "summary" | "recommendations" | "action_plan";
  promptTemplate: string;
  variables: string[];
}

export const SYSTEM_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "exec_summary_compliance",
    name: "Resumo Executivo - Conformidade",
    description: "Gera um resumo executivo da avaliação de conformidade para apresentação à alta gestão",
    module: "compliance",
    category: "summary",
    promptTemplate: `Analise a avaliação de conformidade da organização {{organizationName}} e gere um RESUMO EXECUTIVO conciso para apresentação à alta gestão.

O resumo deve conter:
1. **Situação Atual** - Nível de maturidade geral e pontuação
2. **Principais Conquistas** - Pontos fortes identificados
3. **Gaps Críticos** - 3-5 principais lacunas que requerem atenção imediata
4. **Riscos Associados** - Consequências de não tratar os gaps
5. **Recomendações Prioritárias** - Top 3 ações recomendadas
6. **Próximos Passos** - Cronograma sugerido

Mantenha o texto objetivo, direto e adequado para executivos C-level.
Limite: máximo 500 palavras.`,
    variables: ["organizationName"]
  },
  {
    id: "exec_summary_due_diligence",
    name: "Resumo Executivo - Due Diligence",
    description: "Gera um resumo executivo da avaliação de terceiro para tomada de decisão",
    module: "due_diligence",
    category: "summary",
    promptTemplate: `Analise a avaliação de due diligence do terceiro {{thirdPartyName}} e gere um RESUMO EXECUTIVO para tomada de decisão.

O resumo deve conter:
1. **Classificação de Risco** - Nível geral e justificativa
2. **Perfil do Terceiro** - Tipo, criticidade para o negócio
3. **Pontos de Atenção** - Principais riscos identificados
4. **Pontos Positivos** - Aspectos favoráveis
5. **Recomendação** - Manter, manter com restrições, ou encerrar relacionamento
6. **Condições** - Requisitos para continuidade (se aplicável)

Seja objetivo e forneça uma recomendação clara.
Limite: máximo 400 palavras.`,
    variables: ["thirdPartyName"]
  },
  {
    id: "gap_analysis_compliance",
    name: "Análise de Gaps - Conformidade",
    description: "Análise detalhada das lacunas identificadas na avaliação de conformidade",
    module: "compliance",
    category: "analysis",
    promptTemplate: `Realize uma ANÁLISE DETALHADA DE GAPS da avaliação de conformidade da organização {{organizationName}}.

Para cada domínio com maturidade abaixo de {{maturityThreshold}}:
1. **Domínio** - Nome e descrição
2. **Nível Atual** - Maturidade identificada
3. **Gap** - Diferença para o nível desejado
4. **Causas Prováveis** - Por que o gap existe
5. **Impacto** - Consequências do gap
6. **Esforço de Remediação** - Baixo/Médio/Alto
7. **Quick Wins** - Ações rápidas possíveis

Ao final, inclua uma matriz de priorização (Impacto x Esforço).`,
    variables: ["organizationName", "maturityThreshold"]
  },
  {
    id: "gap_analysis_due_diligence",
    name: "Análise de Riscos - Due Diligence",
    description: "Análise detalhada dos riscos identificados na avaliação de terceiro",
    module: "due_diligence",
    category: "analysis",
    promptTemplate: `Realize uma ANÁLISE DETALHADA DE RISCOS da avaliação de due diligence do terceiro {{thirdPartyName}}.

Para cada questão com risco acima de {{riskThreshold}}:
1. **Categoria** - Área de risco
2. **Risco Identificado** - Descrição clara
3. **Probabilidade** - De materialização
4. **Impacto** - Se materializado
5. **Controles Existentes** - O que já mitiga
6. **Controles Faltantes** - O que precisa ser implementado
7. **Ação Recomendada** - Específica e acionável

Inclua uma matriz de riscos ao final.`,
    variables: ["thirdPartyName", "riskThreshold"]
  },
  {
    id: "recommendations_compliance",
    name: "Recomendações Priorizadas - Conformidade",
    description: "Lista de recomendações priorizadas para melhoria da conformidade",
    module: "compliance",
    category: "recommendations",
    promptTemplate: `Gere uma lista de RECOMENDAÇÕES PRIORIZADAS para a organização {{organizationName}} melhorar sua conformidade.

Estruture as recomendações em 3 categorias:

**CURTO PRAZO (0-30 dias)**
- Quick wins e ações urgentes
- Foco em riscos críticos

**MÉDIO PRAZO (30-90 dias)**
- Melhorias estruturais
- Implementação de controles

**LONGO PRAZO (90-180 dias)**
- Transformações culturais
- Certificações e auditorias

Para cada recomendação, indique:
- Ação específica
- Responsável sugerido
- Recursos necessários
- Resultado esperado`,
    variables: ["organizationName"]
  },
  {
    id: "recommendations_due_diligence",
    name: "Recomendações Priorizadas - Due Diligence",
    description: "Lista de recomendações para gestão do relacionamento com terceiro",
    module: "due_diligence",
    category: "recommendations",
    promptTemplate: `Gere RECOMENDAÇÕES PRIORIZADAS para gestão do relacionamento com o terceiro {{thirdPartyName}}.

Estruture em:

**AÇÕES IMEDIATAS**
- Medidas de contenção de riscos críticos
- Comunicações necessárias

**CONTROLES CONTRATUAIS**
- Cláusulas a incluir/revisar
- SLAs recomendados
- Penalidades sugeridas

**MONITORAMENTO CONTÍNUO**
- Indicadores a acompanhar
- Frequência de reavaliação
- Gatilhos de alerta

**PLANO DE CONTINGÊNCIA**
- Cenários de risco
- Ações de resposta
- Alternativas ao terceiro`,
    variables: ["thirdPartyName"]
  },
  {
    id: "action_plan_quick",
    name: "Plano de Ação Rápido",
    description: "Gera um plano de ação simplificado com foco em quick wins",
    module: "action_plans",
    category: "action_plan",
    promptTemplate: `Gere um PLANO DE AÇÃO RÁPIDO focado em quick wins para {{organizationName}}.

Identifique as 5 ações de maior impacto que podem ser implementadas em até 30 dias.

Para cada ação:
1. **Título** - Claro e objetivo
2. **Descrição** - O que fazer
3. **Prazo** - Em dias
4. **Responsável** - Área/perfil
5. **Resultado Esperado** - Benefício concreto

Priorize ações que:
- Não requerem investimento significativo
- Podem ser implementadas com recursos existentes
- Geram resultados visíveis rapidamente`,
    variables: ["organizationName"]
  }
];

/**
 * Busca templates de prompts disponíveis
 */
export function getAvailableTemplates(module?: AIModule): PromptTemplate[] {
  if (module) {
    return SYSTEM_PROMPT_TEMPLATES.filter(t => t.module === module || t.module === "action_plans");
  }
  return SYSTEM_PROMPT_TEMPLATES;
}

/**
 * Aplica variáveis a um template de prompt
 */
export function applyTemplateVariables(template: PromptTemplate, variables: Record<string, string>): string {
  let prompt = template.promptTemplate;
  for (const [key, value] of Object.entries(variables)) {
    prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return prompt;
}

/**
 * Gera conteúdo usando um template específico
 */
export async function generateFromTemplate(
  templateId: string,
  variables: Record<string, string>,
  assessmentData: Record<string, unknown>,
  organizationConfig?: AIOrganizationConfig
): Promise<AIResponse> {
  const template = SYSTEM_PROMPT_TEMPLATES.find(t => t.id === templateId);
  if (!template) {
    throw new Error(`Template não encontrado: ${templateId}`);
  }

  const prompt = applyTemplateVariables(template, variables);

  const context: ChatContext = {
    module: template.module,
    organizationName: variables.organizationName,
    assessmentData
  };

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: `${prompt}\n\nDados da avaliação:\n${JSON.stringify(assessmentData, null, 2)}`
    }
  ];

  return chatWithAI(messages, context, organizationConfig);
}
