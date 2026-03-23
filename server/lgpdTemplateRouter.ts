import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "./_core/trpc";
import {
  getLgpdClauseTemplates,
  getLgpdClauseTemplateById,
  getLgpdClauseTemplateByTemplateId,
  createLgpdClauseTemplate,
  updateLgpdClauseTemplate,
  deleteLgpdClauseTemplate,
  createLgpdClauseTemplateHistory,
  getLgpdClauseTemplateHistory
} from "./db";
// Tipo para contexto normalizado
type ContextoNormalizado = Record<string, any>;

// Definição dos templates padrão disponíveis
const DEFAULT_TEMPLATES = [
  { id: "bloco_01", name: "Bloco 01 - Identificação das Partes", description: "Identificação e papéis das partes (controlador/operador)" },
  { id: "bloco_02", name: "Bloco 02 - Finalidades", description: "Finalidades do tratamento de dados pessoais" },
  { id: "bloco_03", name: "Bloco 03 - Bases Legais", description: "Bases legais para o tratamento" },
  { id: "bloco_04", name: "Bloco 04 - Categorias de Dados", description: "Categorias de dados e titulares" },
  { id: "bloco_05", name: "Bloco 05 - Menores", description: "Tratamento de dados de crianças e adolescentes" },
  { id: "bloco_06", name: "Bloco 06 - Segurança", description: "Medidas de segurança da informação" },
  { id: "bloco_07_08", name: "Blocos 07/08 - Compartilhamento", description: "Compartilhamento e suboperadores" },
  { id: "bloco_09", name: "Bloco 09 - Transferência Internacional", description: "Transferência internacional de dados" },
  { id: "bloco_10", name: "Bloco 10 - Registros", description: "Registros e evidências de tratamento" },
  { id: "bloco_11", name: "Bloco 11 - Direitos dos Titulares", description: "Direitos dos titulares de dados" },
  { id: "bloco_12", name: "Bloco 12 - Incidentes", description: "Gestão de incidentes de segurança" },
  { id: "bloco_13", name: "Bloco 13 - Auditoria", description: "Auditoria e fiscalização" },
  { id: "bloco_14", name: "Bloco 14 - Obrigações", description: "Obrigações das partes" },
  { id: "bloco_15", name: "Bloco 15 - Responsabilidade", description: "Responsabilidade civil" },
  { id: "bloco_16", name: "Bloco 16 - Retenção", description: "Retenção e eliminação de dados" },
  { id: "bloco_17", name: "Bloco 17 - Governança", description: "Governança de dados" },
  { id: "bloco_18", name: "Bloco 18 - Devolução", description: "Devolução e portabilidade" },
  { id: "clausula_minima", name: "Cláusula Mínima", description: "Cláusula para contratos sem dados pessoais" },
];

// Variáveis disponíveis para os templates
const TEMPLATE_VARIABLES = {
  // Identificação
  "A1_papel_contratante": "Papel do contratante (controlador/operador/co-controlador)",
  "A2_papel_contratado": "Papel do contratado (controlador/operador/co-controlador)",
  "A3_nome_contratante": "Nome do contratante",
  "A4_nome_contratado": "Nome do contratado",
  
  // Tratamento de dados
  "B1_trata_dados_pessoais": "Se trata dados pessoais (boolean)",
  "B2_finalidades": "Lista de finalidades do tratamento",
  "B3_bases_legais": "Lista de bases legais aplicáveis",
  "B4_categorias_dados": "Categorias de dados tratados",
  "B5_categorias_titulares": "Categorias de titulares",
  "B6_trata_criancas": "Se trata dados de crianças (boolean)",
  "B7_trata_adolescentes": "Se trata dados de adolescentes (boolean)",
  
  // Segurança
  "F1_medidas_tecnicas": "Medidas técnicas de segurança",
  "F2_medidas_organizacionais": "Medidas organizacionais",
  "F3_criptografia": "Se usa criptografia (boolean)",
  "F4_backup": "Política de backup",
  
  // Compartilhamento
  "E1_compartilha_terceiros": "Se compartilha com terceiros (boolean)",
  "E2_suboperadores": "Lista de suboperadores",
  "E3_transferencia_internacional": "Se há transferência internacional (boolean)",
  
  // Incidentes
  "G1_prazo_notificacao": "Prazo para notificação de incidentes",
  "G2_canal_comunicacao": "Canal de comunicação para incidentes",
  
  // Retenção
  "H1_prazo_retencao": "Prazo de retenção dos dados",
  "H2_criterios_eliminacao": "Critérios para eliminação",
  
  // Outros
  "nivel_risco": "Nível de risco calculado",
  "score_risco": "Score numérico de risco",
};

export const lgpdTemplateRouter = router({
  // Listar templates disponíveis (padrão + personalizados)
  list: protectedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Apenas consultores e admin podem acessar
      if (ctx.user.role !== "admin_global" && ctx.user.role !== "consultor") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      
      const customTemplates = await getLgpdClauseTemplates(input.organizationId);
      
      // Combina templates padrão com personalizados
      const result = DEFAULT_TEMPLATES.map(defaultTemplate => {
        const customTemplate = customTemplates.find(
          t => t.templateId === defaultTemplate.id && t.organizationId === input.organizationId
        );
        
        return {
          ...defaultTemplate,
          customTemplateId: customTemplate?.id || null,
          isCustomized: !!customTemplate,
          customContent: customTemplate?.content || null,
          version: customTemplate?.version || 1,
          updatedAt: customTemplate?.updatedAt || null,
        };
      });
      
      return result;
    }),

  // Obter template específico
  get: protectedProcedure
    .input(z.object({
      templateId: z.string(),
      organizationId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin_global" && ctx.user.role !== "consultor") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      
      const template = await getLgpdClauseTemplateByTemplateId(input.templateId, input.organizationId);
      const defaultTemplate = DEFAULT_TEMPLATES.find(t => t.id === input.templateId);
      
      if (!defaultTemplate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template não encontrado" });
      }
      
      return {
        ...defaultTemplate,
        customTemplateId: template?.id || null,
        isCustomized: !!template,
        content: template?.content || getDefaultTemplateContent(input.templateId),
        variables: TEMPLATE_VARIABLES,
        version: template?.version || 1,
        updatedAt: template?.updatedAt || null,
      };
    }),

  // Salvar template personalizado
  save: protectedProcedure
    .input(z.object({
      templateId: z.string(),
      organizationId: z.number(),
      content: z.string(),
      changeReason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin_global" && ctx.user.role !== "consultor") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      
      const defaultTemplate = DEFAULT_TEMPLATES.find(t => t.id === input.templateId);
      if (!defaultTemplate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template não encontrado" });
      }
      
      // Verifica se já existe template personalizado
      const existingTemplate = await getLgpdClauseTemplateByTemplateId(input.templateId, input.organizationId);
      
      if (existingTemplate && existingTemplate.organizationId === input.organizationId) {
        // Atualiza template existente
        const previousContent = existingTemplate.content;
        const newVersion = existingTemplate.version + 1;
        
        await updateLgpdClauseTemplate(existingTemplate.id, {
          content: input.content,
          version: newVersion,
          updatedBy: ctx.user.id,
        });
        
        // Salva histórico
        await createLgpdClauseTemplateHistory({
          templateId: existingTemplate.id,
          organizationId: input.organizationId,
          previousContent,
          newContent: input.content,
          changedBy: ctx.user.id,
          changeReason: input.changeReason || null,
          version: newVersion,
        });
        
        return { success: true, templateId: existingTemplate.id, version: newVersion };
      } else {
        // Cria novo template personalizado
        const templateId = await createLgpdClauseTemplate({
          organizationId: input.organizationId,
          templateId: input.templateId,
          templateName: defaultTemplate.name,
          templateDescription: defaultTemplate.description,
          content: input.content,
          variables: JSON.stringify(TEMPLATE_VARIABLES),
          isActive: true,
          version: 1,
          createdBy: ctx.user.id,
        });
        
        return { success: true, templateId, version: 1 };
      }
    }),

  // Restaurar template ao padrão
  restore: protectedProcedure
    .input(z.object({
      templateId: z.string(),
      organizationId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin_global" && ctx.user.role !== "consultor") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      
      const existingTemplate = await getLgpdClauseTemplateByTemplateId(input.templateId, input.organizationId);
      
      if (existingTemplate && existingTemplate.organizationId === input.organizationId) {
        await deleteLgpdClauseTemplate(existingTemplate.id);
        return { success: true, message: "Template restaurado ao padrão" };
      }
      
      return { success: true, message: "Template já está no padrão" };
    }),

  // Obter histórico de alterações
  history: protectedProcedure
    .input(z.object({
      customTemplateId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin_global" && ctx.user.role !== "consultor") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      
      return getLgpdClauseTemplateHistory(input.customTemplateId);
    }),

  // Preview de template renderizado
  preview: protectedProcedure
    .input(z.object({
      templateId: z.string(),
      content: z.string(),
      sampleContext: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin_global" && ctx.user.role !== "consultor") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      
      // Usa contexto de exemplo se não fornecido
      const context = input.sampleContext || getSampleContext();
      
      try {
        // Renderiza o template com o contexto
        const rendered = renderTemplateWithContext(input.content, context as ContextoNormalizado);
        return { success: true, rendered };
      } catch (error) {
        return { success: false, error: String(error), rendered: null };
      }
    }),

  // Listar variáveis disponíveis
  variables: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "admin_global" && ctx.user.role !== "consultor") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      
      return TEMPLATE_VARIABLES;
    }),
});

// Função auxiliar para obter conteúdo padrão do template
function getDefaultTemplateContent(templateId: string): string {
  // Retorna uma descrição do template padrão
  const templates: Record<string, string> = {
    "bloco_01": `## CLÁUSULA {{numero}} – IDENTIFICAÇÃO DAS PARTES E PAPÉIS

Para os fins da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), as partes declaram:

**{{A3_nome_contratante}}** atua como **{{A1_papel_contratante}}** dos dados pessoais objeto deste contrato.

**{{A4_nome_contratado}}** atua como **{{A2_papel_contratado}}** dos dados pessoais objeto deste contrato.

As partes se comprometem a observar todas as disposições legais aplicáveis ao tratamento de dados pessoais.`,

    "bloco_02": `## CLÁUSULA {{numero}} – FINALIDADES DO TRATAMENTO

O tratamento de dados pessoais objeto deste contrato será realizado exclusivamente para as seguintes finalidades:

{{#each B2_finalidades}}
- {{this}}
{{/each}}

É vedado o tratamento de dados pessoais para finalidades diversas das aqui estabelecidas, salvo mediante prévia e expressa autorização do CONTROLADOR.`,

    "bloco_03": `## CLÁUSULA {{numero}} – BASES LEGAIS

O tratamento de dados pessoais objeto deste contrato está fundamentado nas seguintes bases legais previstas na LGPD:

{{#each B3_bases_legais}}
- {{this}}
{{/each}}

As partes declaram que o tratamento observará os princípios da necessidade, adequação e proporcionalidade.`,

    "bloco_04": `## CLÁUSULA {{numero}} – CATEGORIAS DE DADOS E TITULARES

**Categorias de dados pessoais tratados:**
{{#each B4_categorias_dados}}
- {{this}}
{{/each}}

**Categorias de titulares:**
{{#each B5_categorias_titulares}}
- {{this}}
{{/each}}`,

    "bloco_05": `## CLÁUSULA {{numero}} – TRATAMENTO DE DADOS DE MENORES

{{#if B6_trata_criancas}}
O tratamento de dados de crianças (menores de 12 anos) será realizado mediante consentimento específico e em destaque dado por pelo menos um dos pais ou pelo responsável legal, nos termos do art. 14 da LGPD.
{{/if}}

{{#if B7_trata_adolescentes}}
O tratamento de dados de adolescentes (entre 12 e 18 anos) observará seu melhor interesse, nos termos do Estatuto da Criança e do Adolescente e da LGPD.
{{/if}}

As partes se comprometem a adotar medidas reforçadas de segurança para proteção dos dados de menores.`,

    "bloco_06": `## CLÁUSULA {{numero}} – SEGURANÇA DA INFORMAÇÃO

O OPERADOR se compromete a implementar medidas técnicas e administrativas aptas a proteger os dados pessoais, incluindo:

**Medidas técnicas:**
{{#each F1_medidas_tecnicas}}
- {{this}}
{{/each}}

**Medidas organizacionais:**
{{#each F2_medidas_organizacionais}}
- {{this}}
{{/each}}

{{#if F3_criptografia}}
Os dados pessoais serão armazenados e transmitidos com uso de criptografia.
{{/if}}`,

    "bloco_07_08": `## CLÁUSULA {{numero}} – COMPARTILHAMENTO E SUBOPERADORES

{{#if E1_compartilha_terceiros}}
O OPERADOR poderá compartilhar dados pessoais com os seguintes suboperadores, mediante prévia autorização do CONTROLADOR:

{{#each E2_suboperadores}}
- {{this}}
{{/each}}

Os suboperadores estarão sujeitos às mesmas obrigações de proteção de dados estabelecidas neste contrato.
{{else}}
O OPERADOR não está autorizado a compartilhar dados pessoais com terceiros sem prévia e expressa autorização do CONTROLADOR.
{{/if}}`,

    "bloco_09": `## CLÁUSULA {{numero}} – TRANSFERÊNCIA INTERNACIONAL

{{#if E3_transferencia_internacional}}
A transferência internacional de dados pessoais observará as disposições do Capítulo V da LGPD, sendo permitida apenas para países ou organismos internacionais que proporcionem grau de proteção adequado, ou mediante garantias específicas previstas em lei.
{{else}}
Não está autorizada a transferência internacional de dados pessoais objeto deste contrato.
{{/if}}`,

    "bloco_10": `## CLÁUSULA {{numero}} – REGISTROS E EVIDÊNCIAS

O OPERADOR manterá registro das operações de tratamento de dados pessoais que realizar, contendo:
- Descrição das categorias de dados tratados
- Finalidades do tratamento
- Período de retenção
- Medidas de segurança adotadas

Os registros serão mantidos pelo prazo mínimo de 5 (cinco) anos e disponibilizados ao CONTROLADOR mediante solicitação.`,

    "bloco_11": `## CLÁUSULA {{numero}} – DIREITOS DOS TITULARES

O OPERADOR auxiliará o CONTROLADOR no atendimento às solicitações dos titulares de dados, incluindo:
- Confirmação da existência de tratamento
- Acesso aos dados
- Correção de dados incompletos, inexatos ou desatualizados
- Anonimização, bloqueio ou eliminação
- Portabilidade
- Eliminação dos dados tratados com consentimento
- Revogação do consentimento`,

    "bloco_12": `## CLÁUSULA {{numero}} – INCIDENTES DE SEGURANÇA

Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos titulares, o OPERADOR deverá:

1. Comunicar o CONTROLADOR em até {{G1_prazo_notificacao}} após tomar conhecimento do incidente
2. Fornecer informações detalhadas sobre a natureza dos dados afetados, titulares envolvidos e medidas adotadas
3. Cooperar com as investigações e medidas de contenção

Canal de comunicação para incidentes: {{G2_canal_comunicacao}}`,

    "bloco_13": `## CLÁUSULA {{numero}} – AUDITORIA

O CONTROLADOR poderá realizar auditorias para verificar o cumprimento das obrigações de proteção de dados, mediante notificação prévia de 15 (quinze) dias.

O OPERADOR disponibilizará:
- Acesso às instalações onde os dados são tratados
- Documentação de políticas e procedimentos
- Registros de operações de tratamento
- Evidências de medidas de segurança`,

    "bloco_14": `## CLÁUSULA {{numero}} – OBRIGAÇÕES DAS PARTES

**Obrigações do CONTROLADOR:**
- Fornecer instruções claras sobre o tratamento
- Garantir a licitude das bases legais
- Atender às solicitações dos titulares

**Obrigações do OPERADOR:**
- Tratar dados apenas conforme instruções do CONTROLADOR
- Garantir confidencialidade dos dados
- Implementar medidas de segurança adequadas
- Auxiliar no atendimento aos direitos dos titulares`,

    "bloco_15": `## CLÁUSULA {{numero}} – RESPONSABILIDADE CIVIL

As partes responderão pelos danos causados em razão do tratamento de dados pessoais em desconformidade com a LGPD, nos termos dos arts. 42 a 45 da Lei.

O OPERADOR indenizará o CONTROLADOR por quaisquer perdas, danos ou despesas decorrentes de:
- Tratamento em desconformidade com as instruções recebidas
- Falha nas medidas de segurança
- Violação das obrigações contratuais`,

    "bloco_16": `## CLÁUSULA {{numero}} – RETENÇÃO E ELIMINAÇÃO

Os dados pessoais serão retidos pelo prazo de {{H1_prazo_retencao}}, ou pelo tempo necessário ao cumprimento das finalidades estabelecidas.

Ao término do tratamento, os dados serão:
{{H2_criterios_eliminacao}}

O OPERADOR fornecerá ao CONTROLADOR certificado de eliminação dos dados, quando solicitado.`,

    "bloco_17": `## CLÁUSULA {{numero}} – GOVERNANÇA DE DADOS

As partes se comprometem a manter programa de governança em privacidade que inclua:
- Políticas e procedimentos de proteção de dados
- Treinamento periódico de colaboradores
- Avaliação de impacto à proteção de dados quando aplicável
- Designação de encarregado (DPO) quando exigido por lei`,

    "bloco_18": `## CLÁUSULA {{numero}} – DEVOLUÇÃO E PORTABILIDADE

Ao término do contrato, o OPERADOR deverá:
- Devolver ao CONTROLADOR todos os dados pessoais em formato estruturado e interoperável
- Eliminar as cópias em sua posse, salvo obrigação legal de retenção
- Fornecer certificado de devolução/eliminação

O prazo para devolução/eliminação será de 30 (trinta) dias após o término do contrato.`,

    "clausula_minima": `## CLÁUSULA {{numero}} – PROTEÇÃO DE DADOS

As partes declaram que o objeto deste contrato não envolve o tratamento de dados pessoais, conforme definido pela Lei Geral de Proteção de Dados (Lei nº 13.709/2018).

Caso, no decorrer da execução contratual, venha a ocorrer tratamento de dados pessoais, as partes se comprometem a celebrar aditivo contratual estabelecendo as obrigações específicas de proteção de dados.`,
  };
  
  return templates[templateId] || "Template não disponível";
}

// Função auxiliar para obter contexto de exemplo
function getSampleContext(): ContextoNormalizado {
  return {
    A1_papel_contratante: "controlador",
    A2_papel_contratado: "operador",
    A3_nome_contratante: "Empresa Contratante Ltda.",
    A4_nome_contratado: "Empresa Contratada S.A.",
    B1_trata_dados_pessoais: true,
    B2_finalidades: ["Execução do contrato", "Cumprimento de obrigação legal"],
    B3_bases_legais: ["Execução de contrato", "Cumprimento de obrigação legal"],
    B4_categorias_dados: ["Dados cadastrais", "Dados de contato"],
    B5_categorias_titulares: ["Funcionários", "Clientes"],
    B6_trata_criancas: false,
    B7_trata_adolescentes: false,
    E1_compartilha_terceiros: false,
    E2_suboperadores: [],
    E3_transferencia_internacional: false,
    F1_medidas_tecnicas: ["Criptografia", "Controle de acesso"],
    F2_medidas_organizacionais: ["Política de segurança", "Treinamento"],
    F3_criptografia: true,
    G1_prazo_notificacao: "48 horas",
    G2_canal_comunicacao: "dpo@empresa.com.br",
    H1_prazo_retencao: "5 anos",
    H2_criterios_eliminacao: "Eliminação segura após término do prazo legal",
    nivel_risco: "medio",
    score_risco: 45,
  };
}

// Função auxiliar para renderizar template com contexto
function renderTemplateWithContext(template: string, context: ContextoNormalizado): string {
  let result = template;
  
  // Substitui variáveis simples {{variavel}}
  for (const [key, value] of Object.entries(context)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    if (typeof value === 'string' || typeof value === 'number') {
      result = result.replace(regex, String(value));
    } else if (typeof value === 'boolean') {
      result = result.replace(regex, value ? 'Sim' : 'Não');
    }
  }
  
  // Processa blocos condicionais {{#if variavel}}...{{/if}}
  const ifRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  result = result.replace(ifRegex, (match, varName, content) => {
    const value = context[varName as keyof ContextoNormalizado];
    if (value && (typeof value !== 'object' || (Array.isArray(value) && value.length > 0))) {
      return content;
    }
    return '';
  });
  
  // Processa blocos de iteração {{#each variavel}}...{{/each}}
  const eachRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
  result = result.replace(eachRegex, (match, varName, content) => {
    const value = context[varName as keyof ContextoNormalizado];
    if (Array.isArray(value)) {
      return value.map(item => content.replace(/\{\{this\}\}/g, String(item))).join('\n');
    }
    return '';
  });
  
  // Remove variáveis não substituídas
  result = result.replace(/\{\{[^}]+\}\}/g, '');
  
  // Limpa linhas vazias extras
  result = result.replace(/\n{3,}/g, '\n\n');
  
  return result.trim();
}

export default lgpdTemplateRouter;
