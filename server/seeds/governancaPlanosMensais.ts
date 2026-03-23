/**
 * Seed data para os templates de planos mensais de governança CPPD
 * Baseado no arquivo de especificação: seusdados-due-dilligence_governança_atividades-entregaveis.txt
 */

export interface MesTemplate {
  templateKey: string;
  monthNumber: number;
  macroBlock: string;
  title: string;
  theme: string;
  activities: string[];
  deliverables: string[];
  blockColor: string;
  icon: string;
}

export interface PlanoAnualTemplate {
  templateKey: string;
  programModel: "ano1" | "em_curso";
  label: string;
  description: string;
  totalMonths: number;
  months: MesTemplate[];
}

// ==================== MODELO ANO 1 ====================
export const planoAno1: PlanoAnualTemplate = {
  templateKey: "governanca_cppd_ano1",
  programModel: "ano1",
  label: "Programa de Governança em Privacidade - Ano 1 (10 meses)",
  description: "Programa completo de implementação de governança em privacidade para organizações que estão iniciando sua jornada de conformidade com a LGPD. Abrange desde o diagnóstico inicial até a auditoria e melhoria contínua.",
  totalMonths: 10,
  months: [
    {
      templateKey: "governanca_cppd_ano1_m01",
      monthNumber: 1,
      macroBlock: "Fundamentos e Mapeamento",
      title: "Diagnóstico e Estruturação da Governança",
      theme: "Fundação do Programa de Privacidade",
      activities: [
        "Reunião de abertura com stakeholders e definição de escopo",
        "Avaliação de maturidade atual em privacidade (assessment)",
        "Estruturação do CPPD: definição de membros e papéis",
        "Designação formal do Encarregado (DPO)",
        "Elaboração do cronograma detalhado de implementação"
      ],
      deliverables: [
        "Relatório de Maturidade",
        "Ata de Constituição CPPD",
        "Regimento Interno",
        "Cronograma Executivo"
      ],
      blockColor: "#5f29cc",
      icon: "FileSearch"
    },
    {
      templateKey: "governanca_cppd_ano1_m02",
      monthNumber: 2,
      macroBlock: "Fundamentos e Mapeamento",
      title: "Mapeamento de Dados e Processos",
      theme: "Inventário Completo de Tratamentos",
      activities: [
        "Levantamento de todos os processos que tratam dados pessoais",
        "Identificação de dados coletados, fontes e destinatários",
        "Mapeamento de sistemas e ferramentas utilizados",
        "Classificação de dados por categoria e sensibilidade",
        "Documentação de fluxos de dados (data flow)"
      ],
      deliverables: [
        "ROPA - Inventário de Dados",
        "Fluxograma de Dados",
        "Matriz de Sistemas",
        "Catálogo de Dados"
      ],
      blockColor: "#5f29cc",
      icon: "Database"
    },
    {
      templateKey: "governanca_cppd_ano1_m03",
      monthNumber: 3,
      macroBlock: "Conformidade Legal",
      title: "Bases Legais e Finalidades",
      theme: "Fundamentação Jurídica dos Tratamentos",
      activities: [
        "Análise das bases legais aplicáveis a cada tratamento",
        "Documentação das finalidades específicas e legítimas",
        "Avaliação de adequação e necessidade dos dados",
        "Revisão de termos de consentimento existentes",
        "Definição de prazos de retenção por categoria"
      ],
      deliverables: [
        "Matriz de Bases Legais",
        "Registro de Finalidades",
        "Tabela de Retenção",
        "Modelos de Consentimento"
      ],
      blockColor: "#0ea5e9",
      icon: "Scale"
    },
    {
      templateKey: "governanca_cppd_ano1_m04",
      monthNumber: 4,
      macroBlock: "Conformidade Legal",
      title: "Gestão de Terceiros e Operadores",
      theme: "Cadeia de Responsabilidade",
      activities: [
        "Inventário de fornecedores que tratam dados pessoais",
        "Classificação de criticidade de terceiros",
        "Revisão e adequação de contratos existentes",
        "Elaboração de cláusulas padrão de proteção de dados",
        "Definição de processo de avaliação de novos fornecedores"
      ],
      deliverables: [
        "Inventário de Operadores",
        "Cláusulas Contratuais Padrão",
        "Checklist de Avaliação",
        "Matriz de Terceiros Críticos"
      ],
      blockColor: "#0ea5e9",
      icon: "Users"
    },
    {
      templateKey: "governanca_cppd_ano1_m05",
      monthNumber: 5,
      macroBlock: "Riscos e Políticas",
      title: "Avaliação de Riscos e RIPD",
      theme: "Gestão de Riscos de Privacidade",
      activities: [
        "Análise de impacto à proteção de dados (PIA)",
        "Identificação de tratamentos de alto risco",
        "Elaboração de RIPD para processos críticos",
        "Definição de medidas de mitigação de riscos",
        "Matriz de riscos residuais e plano de ação"
      ],
      deliverables: [
        "Relatório PIA",
        "RIPD - Relatórios de Impacto",
        "Matriz de Riscos",
        "Plano de Mitigação"
      ],
      blockColor: "#f59e0b",
      icon: "AlertTriangle"
    },
    {
      templateKey: "governanca_cppd_ano1_m06",
      monthNumber: 6,
      macroBlock: "Riscos e Políticas",
      title: "Políticas e Procedimentos",
      theme: "Framework Normativo",
      activities: [
        "Elaboração/revisão da Política de Privacidade",
        "Desenvolvimento de procedimentos operacionais",
        "Criação de normas internas específicas",
        "Guias de boas práticas por área",
        "Validação e aprovação pelo CPPD"
      ],
      deliverables: [
        "Política de Privacidade",
        "POPs - Procedimentos",
        "Normas Internas",
        "Guias de Boas Práticas"
      ],
      blockColor: "#f59e0b",
      icon: "FileText"
    },
    {
      templateKey: "governanca_cppd_ano1_m07",
      monthNumber: 7,
      macroBlock: "Pessoas e Segurança",
      title: "Capacitação e Cultura",
      theme: "Conscientização Organizacional",
      activities: [
        "Desenvolvimento de trilha de treinamentos",
        "Treinamento específico para áreas críticas",
        "Capacitação da alta liderança",
        "Campanhas de conscientização interna",
        "Elaboração de materiais educativos"
      ],
      deliverables: [
        "Trilha de Treinamentos",
        "Material Didático",
        "Campanha de Comunicação",
        "Relatório de Participação"
      ],
      blockColor: "#10b981",
      icon: "GraduationCap"
    },
    {
      templateKey: "governanca_cppd_ano1_m08",
      monthNumber: 8,
      macroBlock: "Pessoas e Segurança",
      title: "Segurança e Resposta a Incidentes",
      theme: "Proteção Técnica e Resiliência",
      activities: [
        "Revisão de controles de segurança da informação",
        "Alinhamento SI x Privacidade",
        "Elaboração do Plano de Resposta a Incidentes",
        "Procedimento de notificação à ANPD",
        "Simulação de resposta a incidente"
      ],
      deliverables: [
        "Plano de Resposta a Incidentes",
        "Procedimento ANPD",
        "Checklist de Segurança",
        "Relatório de Simulação"
      ],
      blockColor: "#10b981",
      icon: "Shield"
    },
    {
      templateKey: "governanca_cppd_ano1_m09",
      monthNumber: 9,
      macroBlock: "Direitos e Auditoria",
      title: "Direitos dos Titulares",
      theme: "Canal de Atendimento e Fluxos",
      activities: [
        "Estruturação do canal de atendimento a titulares",
        "Definição de fluxos para cada direito da LGPD",
        "Elaboração de modelos de resposta padronizados",
        "Definição de prazos e responsáveis por etapa",
        "Treinamento da equipe de atendimento"
      ],
      deliverables: [
        "Canal de Atendimento",
        "Fluxos por Direito",
        "Modelos de Resposta",
        "SLA de Atendimento"
      ],
      blockColor: "#ec4899",
      icon: "UserCheck"
    },
    {
      templateKey: "governanca_cppd_ano1_m10",
      monthNumber: 10,
      macroBlock: "Direitos e Auditoria",
      title: "Auditoria e Melhoria Contínua",
      theme: "Consolidação e Próximos Passos",
      activities: [
        "Auditoria interna de conformidade",
        "Avaliação de maturidade final",
        "Identificação de gaps remanescentes",
        "Elaboração do relatório final de gestão",
        "Definição do plano de melhoria contínua"
      ],
      deliverables: [
        "Relatório de Auditoria",
        "Avaliação de Maturidade Final",
        "Relatório de Gestão",
        "Plano de Melhoria Contínua"
      ],
      blockColor: "#ec4899",
      icon: "ClipboardCheck"
    }
  ]
};

// ==================== MODELO EM CURSO ====================
export const planoEmCurso: PlanoAnualTemplate = {
  templateKey: "governanca_cppd_em_curso",
  programModel: "em_curso",
  label: "Programa de Governança em Privacidade - Em Curso (10 meses)",
  description: "Programa de manutenção e evolução contínua da governança em privacidade para organizações que já possuem estrutura básica implementada. Foco em monitoramento, atualização e melhoria dos controles existentes.",
  totalMonths: 10,
  months: [
    {
      templateKey: "governanca_cppd_em_curso_m01",
      monthNumber: 1,
      macroBlock: "Planejamento e Revisão",
      title: "Revisão Anual e Planejamento",
      theme: "Kick-off do Ciclo Anual",
      activities: [
        "Revisão do Plano Anual de Privacidade anterior",
        "Análise de indicadores e metas do ciclo passado",
        "Definição de prioridades e orçamento para o novo ciclo",
        "Atualização do cronograma de reuniões do CPPD",
        "Revisão da composição e papéis do comitê"
      ],
      deliverables: [
        "Plano Anual de Privacidade",
        "Cronograma de Reuniões CPPD",
        "Relatório de Indicadores",
        "Ata de Kick-off"
      ],
      blockColor: "#5f29cc",
      icon: "Calendar"
    },
    {
      templateKey: "governanca_cppd_em_curso_m02",
      monthNumber: 2,
      macroBlock: "Planejamento e Revisão",
      title: "Atualização do Inventário de Dados",
      theme: "ROPA e Fluxos de Dados",
      activities: [
        "Revisão e atualização do ROPA existente",
        "Identificação de novos tratamentos iniciados",
        "Verificação de tratamentos descontinuados",
        "Atualização de fluxos de dados e sistemas",
        "Validação com áreas de negócio"
      ],
      deliverables: [
        "ROPA Atualizado",
        "Relatório de Alterações",
        "Fluxogramas Revisados",
        "Ata de Validação"
      ],
      blockColor: "#5f29cc",
      icon: "RefreshCw"
    },
    {
      templateKey: "governanca_cppd_em_curso_m03",
      monthNumber: 3,
      macroBlock: "Conformidade e Contratos",
      title: "Revisão de Bases Legais",
      theme: "Conformidade Jurídica",
      activities: [
        "Revisão das bases legais em uso",
        "Análise de novas regulamentações e jurisprudência",
        "Atualização de termos de consentimento",
        "Revisão de prazos de retenção",
        "Validação jurídica das alterações"
      ],
      deliverables: [
        "Matriz de Bases Legais Atualizada",
        "Parecer Jurídico",
        "Termos de Consentimento Revisados",
        "Tabela de Retenção Atualizada"
      ],
      blockColor: "#0ea5e9",
      icon: "Scale"
    },
    {
      templateKey: "governanca_cppd_em_curso_m04",
      monthNumber: 4,
      macroBlock: "Conformidade e Contratos",
      title: "Gestão de Terceiros",
      theme: "Due Diligence e Contratos",
      activities: [
        "Revisão do inventário de operadores",
        "Due diligence de terceiros críticos",
        "Verificação de cláusulas contratuais",
        "Avaliação de novos fornecedores",
        "Plano de ação para gaps identificados"
      ],
      deliverables: [
        "Inventário de Operadores Atualizado",
        "Relatório de Due Diligence",
        "Checklist de Verificação",
        "Plano de Adequação Contratual"
      ],
      blockColor: "#0ea5e9",
      icon: "Users"
    },
    {
      templateKey: "governanca_cppd_em_curso_m05",
      monthNumber: 5,
      macroBlock: "Privacy by Design",
      title: "Novos Projetos e Privacy by Design",
      theme: "Inovação com Privacidade",
      activities: [
        "Revisão de projetos em andamento",
        "Aplicação de Privacy by Design em novos projetos",
        "Atualização de EIPDs para projetos de alto risco",
        "Diretrizes de IA e ética em dados",
        "Validação de controles em novos sistemas"
      ],
      deliverables: [
        "Checklists de Privacy by Design",
        "EIPDs Atualizadas",
        "Diretrizes de IA",
        "Relatório de Projetos"
      ],
      blockColor: "#f59e0b",
      icon: "Lightbulb"
    },
    {
      templateKey: "governanca_cppd_em_curso_m06",
      monthNumber: 6,
      macroBlock: "Terceiros e TID",
      title: "Terceiros e Transferências Internacionais",
      theme: "Operadores e TID",
      activities: [
        "Revisão de transferências internacionais",
        "Verificação de garantias (SCC, BCR)",
        "Avaliação de medidas suplementares",
        "Atualização de contratos internacionais",
        "Plano de ação para adequações"
      ],
      deliverables: [
        "Relatório de TID",
        "Medidas Suplementares",
        "Contratos Atualizados",
        "Plano de Adequação"
      ],
      blockColor: "#f59e0b",
      icon: "Globe"
    },
    {
      templateKey: "governanca_cppd_em_curso_m07",
      monthNumber: 7,
      macroBlock: "Riscos e EIPD",
      title: "Impacto, Riscos e Consulta Prévia",
      theme: "Gestão de Riscos",
      activities: [
        "Seleção de tratamentos para revisão de EIPD",
        "Reavaliação de riscos intrínsecos e residuais",
        "Atualização de planos de mitigação",
        "Avaliação de necessidade de consulta prévia",
        "Monitoramento de controles"
      ],
      deliverables: [
        "EIPDs Atualizadas",
        "Matriz de Riscos Revisada",
        "Plano de Tratamento",
        "Minuta de Consulta Prévia"
      ],
      blockColor: "#10b981",
      icon: "AlertTriangle"
    },
    {
      templateKey: "governanca_cppd_em_curso_m08",
      monthNumber: 8,
      macroBlock: "Direitos e Transparência",
      title: "Direitos, Documentação e Transparência",
      theme: "Gestão de Direitos",
      activities: [
        "Revisão de procedimentos de atendimento a direitos",
        "Análise de indicadores de atendimento",
        "Atualização de matriz de documentação",
        "Revisão de políticas de privacidade",
        "Ajustes em comunicações aos titulares"
      ],
      deliverables: [
        "Relatório de Gestão de Direitos",
        "Matriz de Documentação",
        "Políticas Atualizadas",
        "FAQs Revisados"
      ],
      blockColor: "#10b981",
      icon: "UserCheck"
    },
    {
      templateKey: "governanca_cppd_em_curso_m09",
      monthNumber: 9,
      macroBlock: "Auditoria e Monitoramento",
      title: "Auditoria, Monitoramento e Resiliência",
      theme: "Verificação Independente",
      activities: [
        "Auditoria interna ou revisão independente",
        "Consolidação de indicadores de maturidade",
        "Testes de continuidade e resiliência",
        "Verificação de controles de segurança",
        "Plano de ação para não-conformidades"
      ],
      deliverables: [
        "Relatório de Auditoria",
        "Painel de Maturidade",
        "Evidências de Testes",
        "Plano de Ação"
      ],
      blockColor: "#ec4899",
      icon: "ClipboardCheck"
    },
    {
      templateKey: "governanca_cppd_em_curso_m10",
      monthNumber: 10,
      macroBlock: "Consolidação",
      title: "Consolidação e Planejamento do Próximo Ciclo",
      theme: "Encerramento Anual",
      activities: [
        "Revisão Anual do Sistema de Gestão",
        "Consolidação de ROPA, incidentes e ações",
        "Elaboração do Relatório Anual de Conformidade",
        "Definição de prioridades para próximo ano",
        "Aprovação pela Alta Administração"
      ],
      deliverables: [
        "Relatório Anual de Conformidade",
        "Proposta de Plano Anual",
        "ROPA Consolidado",
        "Ata de Aprovação"
      ],
      blockColor: "#ec4899",
      icon: "Award"
    }
  ]
};

// Exportar todos os templates
export const allPlanoTemplates = [planoAno1, planoEmCurso];
