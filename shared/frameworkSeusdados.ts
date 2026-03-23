// Framework Seusdados - Avaliação de Maturidade LGPD
// 39 questões estruturadas em 9 domínios (IA-01 a IA-09)

export interface Question {
  id: string;
  text: string;
  description?: string;
  requiresEvidence: boolean;
  evidenceType: "pdf" | "link" | "both" | "none";
  lgpdArticles?: string[];
  isoControls?: string[];
  nistControls?: string[];
  maturityLevels: {
    level: number;
    title: string;
    description: string;
  }[];
}

export interface Domain {
  id: string;
  name: string;
  description: string;
  questions: Question[];
}

// Níveis de maturidade padrão (aplicável a todas as questões)
export const MATURITY_LEVELS = [
  { level: 1, title: "Inexistente", description: "Não existe processo ou controle implementado" },
  { level: 2, title: "Inicial", description: "Processo ad-hoc, não documentado, dependente de indivíduos" },
  { level: 3, title: "Definido", description: "Processo documentado e padronizado, mas não monitorado" },
  { level: 4, title: "Gerenciado", description: "Processo monitorado com métricas e indicadores" },
  { level: 5, title: "Otimizado", description: "Processo em melhoria contínua com automação" },
];

// Opções específicas por questão (textos descritivos completos)
export const QUESTION_OPTIONS: Record<string, { level: number; text: string }[]> = {
  // IA-01: Governança de Dados Pessoais
  "IA-01-Q01": [
    { level: 1, text: "A organização não possui Política de Privacidade e Proteção de Dados documentada." },
    { level: 2, text: "Existe uma política em elaboração ou rascunho, mas não foi formalizada." },
    { level: 3, text: "A política está documentada, mas não foi aprovada pela alta direção." },
    { level: 4, text: "A política está documentada, aprovada pela alta direção e comunicada aos colaboradores." },
    { level: 5, text: "A política é revisada periodicamente, com versões controladas e mecanismos de verificação de aderência." }
  ],
  "IA-01-Q02": [
    { level: 1, text: "Não existe Encarregado de Proteção de Dados (DPO) designado." },
    { level: 2, text: "Existe uma pessoa informalmente responsável, mas sem nomeação formal." },
    { level: 3, text: "O DPO foi formalmente nomeado, mas não comunicado à ANPD." },
    { level: 4, text: "O DPO foi formalmente nomeado, comunicado à ANPD e possui qualificação técnica adequada." },
    { level: 5, text: "O DPO atua de forma independente, com recursos dedicados, relatórios periódicos e canal direto com a alta direção." }
  ],
  "IA-01-Q03": [
    { level: 1, text: "Não existe Comitê de Privacidade ou estrutura equivalente." },
    { level: 2, text: "Discussões sobre privacidade ocorrem de forma esporádica, sem estrutura definida." },
    { level: 3, text: "Existe um comitê informal que se reúne ocasionalmente." },
    { level: 4, text: "O Comitê de Privacidade é formal, multidisciplinar, com reuniões periódicas e atas documentadas." },
    { level: 5, text: "O Comitê possui KPIs definidos, relatórios executivos e participação ativa da alta gestão." }
  ],
  "IA-01-Q04": [
    { level: 1, text: "Não existem papéis e responsabilidades definidos para proteção de dados." },
    { level: 2, text: "Algumas responsabilidades são conhecidas informalmente, mas não documentadas." },
    { level: 3, text: "Existe documentação parcial de papéis, mas sem matriz RACI completa." },
    { level: 4, text: "Matriz RACI documentada, com descrições de cargo e treinamentos específicos." },
    { level: 5, text: "Papéis revisados periodicamente, com avaliação de desempenho e melhoria contínua." }
  ],
  // IA-02: Inventário e Mapeamento de Dados
  "IA-02-Q01": [
    { level: 1, text: "Não existe inventário de dados pessoais." },
    { level: 2, text: "Existe conhecimento informal sobre alguns dados tratados, sem documentação." },
    { level: 3, text: "Inventário parcial documentado, cobrindo apenas algumas áreas." },
    { level: 4, text: "Inventário completo (data mapping) documentado conforme Art. 37 da LGPD." },
    { level: 5, text: "Inventário automatizado, integrado aos sistemas, com atualização em tempo real." }
  ],
  "IA-02-Q02": [
    { level: 1, text: "Não há identificação das categorias de dados pessoais." },
    { level: 2, text: "Algumas categorias são conhecidas, mas sem classificação formal." },
    { level: 3, text: "Classificação parcial implementada para dados sensíveis." },
    { level: 4, text: "Classificação completa por categoria (sensíveis, crianças, etc.) documentada." },
    { level: 5, text: "Classificação automatizada com rótulos de sensibilidade e controles diferenciados." }
  ],
  "IA-02-Q03": [
    { level: 1, text: "Não existe mapeamento de fluxo de dados." },
    { level: 2, text: "Fluxos conhecidos informalmente, sem documentação." },
    { level: 3, text: "Diagramas de fluxo parciais para alguns processos críticos." },
    { level: 4, text: "Mapeamento completo de fluxos, incluindo transferências internacionais e terceiros." },
    { level: 5, text: "Fluxos monitorados em tempo real com alertas para desvios e transferências não autorizadas." }
  ],
  "IA-02-Q04": [
    { level: 1, text: "O inventário não é atualizado." },
    { level: 2, text: "Atualizações ocorrem apenas quando há incidentes ou auditorias." },
    { level: 3, text: "Existe procedimento de atualização, mas não é seguido consistentemente." },
    { level: 4, text: "Atualização periódica documentada com responsáveis definidos." },
    { level: 5, text: "Atualização automática integrada aos processos de mudança e desenvolvimento." }
  ],
  "IA-02-Q05": [
    { level: 1, text: "Não há identificação de bases legais." },
    { level: 2, text: "Bases legais conhecidas para alguns tratamentos, sem documentação." },
    { level: 3, text: "Documentação parcial das bases legais para processos principais." },
    { level: 4, text: "Todas as atividades de tratamento possuem base legal documentada (Art. 7 e 11)." },
    { level: 5, text: "Bases legais revisadas periodicamente com análise de proporcionalidade e necessidade." }
  ],
  // IA-03: Gestão de Consentimento
  "IA-03-Q01": [
    { level: 1, text: "Não existe processo para obtenção de consentimento." },
    { level: 2, text: "Consentimento é obtido de forma genérica, sem granularidade." },
    { level: 3, text: "Processo documentado, mas sem mecanismos de registro adequados." },
    { level: 4, text: "Consentimento livre, informado e inequívoco com registro e granularidade." },
    { level: 5, text: "Sistema automatizado de gestão de consentimentos com preferência center." }
  ],
  "IA-03-Q02": [
    { level: 1, text: "Não existe mecanismo de revogação de consentimento." },
    { level: 2, text: "Revogação possível apenas por contato direto (e-mail, telefone)." },
    { level: 3, text: "Canal de revogação existe, mas não é fácil de usar." },
    { level: 4, text: "Revogação fácil, gratuita e com tempo de resposta definido." },
    { level: 5, text: "Revogação instantânea via self-service com confirmação automática." }
  ],
  "IA-03-Q03": [
    { level: 1, text: "Não existe registro de consentimentos." },
    { level: 2, text: "Registros parciais em sistemas isolados." },
    { level: 3, text: "Registro centralizado, mas sem histórico completo." },
    { level: 4, text: "Registro histórico completo com trilha de auditoria." },
    { level: 5, text: "Sistema de gestão de consentimentos com blockchain ou prova criptográfica." }
  ],
  "IA-03-Q04": [
    { level: 1, text: "Dados sensíveis são tratados sem consentimento específico." },
    { level: 2, text: "Consentimento genérico inclui dados sensíveis." },
    { level: 3, text: "Consentimento separado para dados sensíveis, mas não destacado." },
    { level: 4, text: "Consentimento específico e destacado para dados sensíveis conforme Art. 11." },
    { level: 5, text: "Gestão granular de consentimentos sensíveis com revalidação periódica." }
  ],
  // IA-04: Direitos dos Titulares
  "IA-04-Q01": [
    { level: 1, text: "Não existe canal para atendimento aos titulares." },
    { level: 2, text: "Atendimento apenas por canais genéricos (SAC)." },
    { level: 3, text: "Canal dedicado existe, mas sem processo estruturado." },
    { level: 4, text: "Canal dedicado com processo documentado e SLAs definidos." },
    { level: 5, text: "Portal self-service com automação de respostas e rastreamento." }
  ],
  "IA-04-Q02": [
    { level: 1, text: "Não é possível atender solicitações de acesso aos dados." },
    { level: 2, text: "Acesso fornecido manualmente, sem prazo definido." },
    { level: 3, text: "Processo existe, mas não cumpre o prazo de 15 dias." },
    { level: 4, text: "Acesso fornecido dentro do prazo legal com formato adequado." },
    { level: 5, text: "Acesso instantâneo via portal com download automático dos dados." }
  ],
  "IA-04-Q03": [
    { level: 1, text: "Não é possível atender solicitações de correção." },
    { level: 2, text: "Correções realizadas manualmente, sem processo." },
    { level: 3, text: "Processo existe, mas sem propagação para todos os sistemas." },
    { level: 4, text: "Correção com propagação para todos os sistemas e terceiros." },
    { level: 5, text: "Correção self-service com validação e propagação automática." }
  ],
  "IA-04-Q04": [
    { level: 1, text: "Não é possível atender solicitações de exclusão." },
    { level: 2, text: "Exclusão realizada manualmente, sem garantia de completude." },
    { level: 3, text: "Processo existe, mas sem exclusão de backups e terceiros." },
    { level: 4, text: "Exclusão completa com propagação para backups e terceiros." },
    { level: 5, text: "Exclusão automatizada com certificado de destruição e auditoria." }
  ],
  "IA-04-Q05": [
    { level: 1, text: "Não existe portabilidade de dados." },
    { level: 2, text: "Dados fornecidos em formato não estruturado." },
    { level: 3, text: "Portabilidade em formato estruturado, mas não interoperável." },
    { level: 4, text: "Portabilidade em formato estruturado e interoperável." },
    { level: 5, text: "API de portabilidade com transferência direta para outros controladores." }
  ],
  // IA-05: Segurança da Informação
  "IA-05-Q01": [
    { level: 1, text: "Não existem medidas de segurança para dados pessoais." },
    { level: 2, text: "Medidas básicas de segurança (antivírus, firewall) sem foco em dados pessoais." },
    { level: 3, text: "Medidas de segurança documentadas, mas não testadas." },
    { level: 4, text: "Medidas técnicas e administrativas implementadas e testadas periodicamente." },
    { level: 5, text: "Segurança em camadas com monitoramento contínuo e resposta automatizada." }
  ],
  "IA-05-Q02": [
    { level: 1, text: "Dados pessoais não são criptografados." },
    { level: 2, text: "Criptografia apenas em trânsito (HTTPS)." },
    { level: 3, text: "Criptografia em trânsito e em repouso para alguns sistemas." },
    { level: 4, text: "Criptografia completa em trânsito e repouso com gestão de chaves." },
    { level: 5, text: "Criptografia fim-a-fim com HSM e rotação automática de chaves." }
  ],
  "IA-05-Q03": [
    { level: 1, text: "Não existe controle de acesso a dados pessoais." },
    { level: 2, text: "Controle de acesso básico (usuário/senha) sem segmentação." },
    { level: 3, text: "Controle de acesso baseado em perfis, mas sem revisão periódica." },
    { level: 4, text: "Controle de acesso baseado em função (RBAC) com revisão periódica." },
    { level: 5, text: "Controle de acesso dinâmico (ABAC) com MFA e monitoramento de comportamento." }
  ],
  "IA-05-Q04": [
    { level: 1, text: "Não existem logs de acesso a dados pessoais." },
    { level: 2, text: "Logs básicos de sistema, sem foco em dados pessoais." },
    { level: 3, text: "Logs de acesso a dados pessoais, mas sem análise." },
    { level: 4, text: "Logs completos com análise periódica e retenção adequada." },
    { level: 5, text: "SIEM com correlação de eventos e alertas em tempo real." }
  ],
  "IA-05-Q05": [
    { level: 1, text: "Não existe processo de backup para dados pessoais." },
    { level: 2, text: "Backups realizados, mas sem teste de restauração." },
    { level: 3, text: "Backups com teste de restauração ocasional." },
    { level: 4, text: "Backups criptografados com testes periódicos e DR documentado." },
    { level: 5, text: "Backup automatizado com replicação geográfica e RTO/RPO definidos." }
  ],
  // IA-06: Gestão de Incidentes
  "IA-06-Q01": [
    { level: 1, text: "Não existe processo de gestão de incidentes de privacidade." },
    { level: 2, text: "Incidentes tratados de forma reativa, sem processo definido." },
    { level: 3, text: "Processo documentado, mas não testado." },
    { level: 4, text: "Processo de resposta a incidentes implementado e testado periodicamente." },
    { level: 5, text: "SOC dedicado com playbooks automatizados e simulações regulares." }
  ],
  "IA-06-Q02": [
    { level: 1, text: "Não existe procedimento de notificação à ANPD." },
    { level: 2, text: "Conhecimento da obrigação, mas sem procedimento documentado." },
    { level: 3, text: "Procedimento documentado, mas nunca testado." },
    { level: 4, text: "Procedimento de notificação implementado com templates e responsáveis." },
    { level: 5, text: "Sistema automatizado de avaliação de risco e notificação com SLA de 72h." }
  ],
  "IA-06-Q03": [
    { level: 1, text: "Não existe procedimento de comunicação aos titulares." },
    { level: 2, text: "Comunicação realizada de forma ad-hoc quando necessário." },
    { level: 3, text: "Templates de comunicação existem, mas sem processo definido." },
    { level: 4, text: "Procedimento de comunicação aos titulares documentado e testado." },
    { level: 5, text: "Sistema automatizado de notificação multicanal com rastreamento." }
  ],
  "IA-06-Q04": [
    { level: 1, text: "Não existe registro de incidentes de privacidade." },
    { level: 2, text: "Incidentes registrados em planilhas ou e-mails." },
    { level: 3, text: "Sistema de registro existe, mas sem análise de tendências." },
    { level: 4, text: "Registro completo com análise de causa raiz e ações corretivas." },
    { level: 5, text: "Sistema integrado com IA para detecção proativa e análise preditiva." }
  ],
  // IA-07: Gestão de Terceiros
  "IA-07-Q01": [
    { level: 1, text: "Não existem cláusulas de privacidade em contratos com terceiros." },
    { level: 2, text: "Cláusulas genéricas de confidencialidade, sem foco em LGPD." },
    { level: 3, text: "Cláusulas de privacidade em alguns contratos, sem padronização." },
    { level: 4, text: "Cláusulas padronizadas de privacidade em todos os contratos relevantes." },
    { level: 5, text: "Acordos de Tratamento de Dados (DPA) completos com SLAs e penalidades." }
  ],
  "IA-07-Q02": [
    { level: 1, text: "Não existe avaliação de risco de terceiros." },
    { level: 2, text: "Avaliação informal baseada em reputação." },
    { level: 3, text: "Questionário de due diligence aplicado, mas sem análise estruturada." },
    { level: 4, text: "Due diligence completa com classificação de risco e ações mitigatórias." },
    { level: 5, text: "Avaliação contínua de terceiros com monitoramento de certificações e incidentes." }
  ],
  "IA-07-Q03": [
    { level: 1, text: "Não existe inventário de terceiros que tratam dados pessoais." },
    { level: 2, text: "Lista parcial de terceiros conhecidos informalmente." },
    { level: 3, text: "Inventário parcial documentado, sem categorização." },
    { level: 4, text: "Inventário completo com categorização e dados compartilhados." },
    { level: 5, text: "Gestão automatizada de terceiros com integração ao data mapping." }
  ],
  "IA-07-Q04": [
    { level: 1, text: "Terceiros não são monitorados quanto à conformidade." },
    { level: 2, text: "Monitoramento apenas quando há incidentes." },
    { level: 3, text: "Auditorias ocasionais em terceiros críticos." },
    { level: 4, text: "Auditorias periódicas com relatórios e ações corretivas." },
    { level: 5, text: "Monitoramento contínuo com dashboards e alertas automáticos." }
  ],
  // IA-08: Treinamento e Conscientização
  "IA-08-Q01": [
    { level: 1, text: "Não existe programa de treinamento em proteção de dados." },
    { level: 2, text: "Treinamentos pontuais, sem programa estruturado." },
    { level: 3, text: "Programa de treinamento existe, mas não é obrigatório." },
    { level: 4, text: "Programa obrigatório para todos os colaboradores com registro de participação." },
    { level: 5, text: "Programa gamificado com trilhas personalizadas e certificação." }
  ],
  "IA-08-Q02": [
    { level: 1, text: "Novos colaboradores não recebem treinamento de privacidade." },
    { level: 2, text: "Treinamento informal durante o onboarding." },
    { level: 3, text: "Treinamento de privacidade no onboarding, mas não obrigatório." },
    { level: 4, text: "Treinamento obrigatório no onboarding com materiais específicos." },
    { level: 5, text: "Onboarding digital com avaliação de conhecimento e aceite de políticas." }
  ],
  "IA-08-Q03": [
    { level: 1, text: "Não existem campanhas de conscientização sobre privacidade." },
    { level: 2, text: "Comunicações esporádicas sobre privacidade." },
    { level: 3, text: "Campanhas anuais de conscientização." },
    { level: 4, text: "Campanhas periódicas com eventos e materiais de sensibilização." },
    { level: 5, text: "Programa contínuo com embaixadores de privacidade e métricas de engajamento." }
  ],
  "IA-08-Q04": [
    { level: 1, text: "A efetividade dos treinamentos não é avaliada." },
    { level: 2, text: "Feedback informal dos participantes." },
    { level: 3, text: "Avaliações de satisfação após treinamentos." },
    { level: 4, text: "Testes de conhecimento com indicadores de desempenho." },
    { level: 5, text: "Simulações de phishing e avaliações comportamentais com melhoria contínua." }
  ],
  // IA-09: Privacy by Design
  "IA-09-Q01": [
    { level: 1, text: "Novos projetos não passam por avaliação de impacto (RIPD/DPIA)." },
    { level: 2, text: "RIPD realizado apenas para projetos de alto risco." },
    { level: 3, text: "Processo de RIPD existe, mas não é consistentemente aplicado." },
    { level: 4, text: "RIPD obrigatório para novos projetos com critérios claros de aplicação." },
    { level: 5, text: "RIPD integrado ao ciclo de desenvolvimento com aprovação do DPO." }
  ],
  "IA-09-Q02": [
    { level: 1, text: "Não existe checklist de privacidade para desenvolvimento." },
    { level: 2, text: "Requisitos de privacidade considerados informalmente." },
    { level: 3, text: "Checklist existe, mas não é obrigatório." },
    { level: 4, text: "Checklist obrigatório integrado à metodologia de desenvolvimento." },
    { level: 5, text: "Privacy by Design automatizado com gates de aprovação no CI/CD." }
  ],
  "IA-09-Q03": [
    { level: 1, text: "Minimização de dados não é considerada." },
    { level: 2, text: "Discussões informais sobre necessidade de dados." },
    { level: 3, text: "Princípio documentado, mas não verificado." },
    { level: 4, text: "Revisão de minimização em novos projetos e sistemas existentes." },
    { level: 5, text: "Ferramentas automatizadas para detectar coleta excessiva de dados." }
  ],
  "IA-09-Q04": [
    { level: 1, text: "Não existe política de retenção de dados." },
    { level: 2, text: "Dados retidos indefinidamente." },
    { level: 3, text: "Política de retenção documentada, mas não implementada." },
    { level: 4, text: "Política implementada com prazos definidos e exclusão periódica." },
    { level: 5, text: "Exclusão automatizada com auditoria e relatórios de conformidade." }
  ],
  "IA-09-Q05": [
    { level: 1, text: "Privacidade não é considerada na arquitetura de sistemas." },
    { level: 2, text: "Considerações de privacidade apenas quando exigido." },
    { level: 3, text: "Padrões de privacidade documentados, mas não obrigatórios." },
    { level: 4, text: "Arquitetura de referência com padrões de privacidade obrigatórios." },
    { level: 5, text: "Privacy Engineering com PETs (Privacy Enhancing Technologies) integradas." }
  ]
};

export const SEUSDADOS_FRAMEWORK: Domain[] = [
  {
    id: "IA-01",
    name: "Governança de Dados Pessoais",
    description: "Estrutura organizacional e políticas para proteção de dados pessoais",
    questions: [
      {
        id: "IA-01-Q01",
        text: "A organização possui uma Política de Privacidade e Proteção de Dados documentada e aprovada pela alta direção?",
        description: "Verificar existência de política formal, aprovação executiva e comunicação aos colaboradores",
        requiresEvidence: true,
        evidenceType: "pdf",
        lgpdArticles: ["Art. 50"],
        isoControls: ["A.5.1.1"],
        nistControls: ["ID.GV-1"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-01-Q02",
        text: "Existe um Encarregado de Proteção de Dados (DPO) formalmente nomeado e comunicado à ANPD?",
        description: "Verificar nomeação formal, qualificação técnica e registro junto à autoridade",
        requiresEvidence: true,
        evidenceType: "both",
        lgpdArticles: ["Art. 41"],
        isoControls: ["A.6.1.1"],
        nistControls: ["ID.GV-2"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-01-Q03",
        text: "A organização possui um Comitê de Privacidade ou estrutura equivalente para governança de dados?",
        description: "Verificar existência de comitê multidisciplinar, reuniões periódicas e atas",
        requiresEvidence: true,
        evidenceType: "pdf",
        lgpdArticles: ["Art. 50"],
        isoControls: ["A.6.1.2"],
        nistControls: ["ID.GV-3"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-01-Q04",
        text: "Existem papéis e responsabilidades claramente definidos para proteção de dados em todos os níveis da organização?",
        description: "Verificar matriz RACI, descrições de cargo e treinamentos específicos",
        requiresEvidence: true,
        evidenceType: "pdf",
        lgpdArticles: ["Art. 50"],
        isoControls: ["A.6.1.1"],
        nistControls: ["ID.AM-6"],
        maturityLevels: MATURITY_LEVELS,
      },
    ],
  },
  {
    id: "IA-02",
    name: "Inventário e Mapeamento de Dados",
    description: "Identificação e catalogação de dados pessoais tratados pela organização",
    questions: [
      {
        id: "IA-02-Q01",
        text: "A organização possui um inventário completo de dados pessoais (data mapping)?",
        description: "Verificar existência de registro de atividades de tratamento conforme Art. 37",
        requiresEvidence: true,
        evidenceType: "both",
        lgpdArticles: ["Art. 37"],
        isoControls: ["A.8.1.1"],
        nistControls: ["ID.AM-1"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-02-Q02",
        text: "O inventário identifica as categorias de dados pessoais tratados (sensíveis, crianças, etc.)?",
        description: "Verificar classificação de dados por categoria e nível de sensibilidade",
        requiresEvidence: true,
        evidenceType: "pdf",
        lgpdArticles: ["Art. 5", "Art. 11", "Art. 14"],
        isoControls: ["A.8.2.1"],
        nistControls: ["ID.AM-2"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-02-Q03",
        text: "Existe mapeamento do fluxo de dados pessoais entre sistemas e terceiros?",
        description: "Verificar diagramas de fluxo, transferências internacionais e compartilhamentos",
        requiresEvidence: true,
        evidenceType: "both",
        lgpdArticles: ["Art. 33", "Art. 37"],
        isoControls: ["A.8.1.3"],
        nistControls: ["ID.AM-3"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-02-Q04",
        text: "O inventário é atualizado periodicamente e quando há mudanças nos processos?",
        description: "Verificar procedimento de atualização, frequência e responsáveis",
        requiresEvidence: true,
        evidenceType: "pdf",
        lgpdArticles: ["Art. 37"],
        isoControls: ["A.8.1.1"],
        nistControls: ["ID.AM-4"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-02-Q05",
        text: "Existe identificação clara das bases legais para cada atividade de tratamento?",
        description: "Verificar documentação das bases legais (Art. 7 e 11) para cada finalidade",
        requiresEvidence: true,
        evidenceType: "pdf",
        lgpdArticles: ["Art. 7", "Art. 11"],
        isoControls: ["A.18.1.4"],
        nistControls: ["ID.GV-3"],
        maturityLevels: MATURITY_LEVELS,
      },
    ],
  },
  {
    id: "IA-03",
    name: "Gestão de Consentimento",
    description: "Processos para obtenção, gestão e revogação de consentimento",
    questions: [
      {
        id: "IA-03-Q01",
        text: "Existe processo documentado para obtenção de consentimento livre, informado e inequívoco?",
        description: "Verificar mecanismos de coleta, granularidade e registro de consentimentos",
        requiresEvidence: true,
        evidenceType: "both",
        lgpdArticles: ["Art. 7", "Art. 8"],
        isoControls: ["A.18.1.4"],
        nistControls: ["PR.IP-1"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-03-Q02",
        text: "O titular pode revogar o consentimento de forma fácil e gratuita?",
        description: "Verificar canais de revogação, facilidade de uso e tempo de resposta",
        requiresEvidence: true,
        evidenceType: "link",
        lgpdArticles: ["Art. 8, §5º"],
        isoControls: ["A.18.1.4"],
        nistControls: ["PR.IP-2"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-03-Q03",
        text: "Existe registro histórico de todos os consentimentos obtidos e revogados?",
        description: "Verificar sistema de gestão de consentimentos, logs e trilha de auditoria",
        requiresEvidence: true,
        evidenceType: "pdf",
        lgpdArticles: ["Art. 8"],
        isoControls: ["A.12.4.1"],
        nistControls: ["PR.PT-1"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-03-Q04",
        text: "O consentimento para dados sensíveis é obtido de forma específica e destacada?",
        description: "Verificar tratamento diferenciado para dados sensíveis conforme Art. 11",
        requiresEvidence: true,
        evidenceType: "both",
        lgpdArticles: ["Art. 11"],
        isoControls: ["A.18.1.4"],
        nistControls: ["PR.IP-1"],
        maturityLevels: MATURITY_LEVELS,
      },
    ],
  },
  {
    id: "IA-04",
    name: "Direitos dos Titulares",
    description: "Processos para atendimento aos direitos dos titulares de dados",
    questions: [
      {
        id: "IA-04-Q01",
        text: "Existe canal acessível para que titulares exerçam seus direitos (portal, email, telefone)?",
        description: "Verificar disponibilidade, acessibilidade e divulgação dos canais",
        requiresEvidence: true,
        evidenceType: "link",
        lgpdArticles: ["Art. 18"],
        isoControls: ["A.18.1.4"],
        nistControls: ["PR.IP-4"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-04-Q02",
        text: "Existe processo documentado para atendimento às solicitações dos titulares?",
        description: "Verificar procedimentos, prazos (15 dias) e responsáveis",
        requiresEvidence: true,
        evidenceType: "pdf",
        lgpdArticles: ["Art. 18", "Art. 19"],
        isoControls: ["A.18.1.4"],
        nistControls: ["PR.IP-4"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-04-Q03",
        text: "A organização consegue atender ao direito de acesso aos dados pessoais?",
        description: "Verificar capacidade técnica de extrair e fornecer dados ao titular",
        requiresEvidence: true,
        evidenceType: "both",
        lgpdArticles: ["Art. 18, II"],
        isoControls: ["A.18.1.4"],
        nistControls: ["PR.DS-5"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-04-Q04",
        text: "A organização consegue atender ao direito de portabilidade dos dados?",
        description: "Verificar capacidade de exportar dados em formato estruturado e interoperável",
        requiresEvidence: true,
        evidenceType: "both",
        lgpdArticles: ["Art. 18, V"],
        isoControls: ["A.18.1.4"],
        nistControls: ["PR.DS-5"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-04-Q05",
        text: "A organização consegue atender ao direito de eliminação dos dados?",
        description: "Verificar processo de exclusão, propagação para terceiros e exceções legais",
        requiresEvidence: true,
        evidenceType: "pdf",
        lgpdArticles: ["Art. 18, VI"],
        isoControls: ["A.8.3.2"],
        nistControls: ["PR.IP-6"],
        maturityLevels: MATURITY_LEVELS,
      },
    ],
  },
  {
    id: "IA-05",
    name: "Segurança da Informação",
    description: "Medidas técnicas e administrativas de segurança para proteção de dados",
    questions: [
      {
        id: "IA-05-Q01",
        text: "Existe Política de Segurança da Informação documentada e implementada?",
        description: "Verificar existência, aprovação, comunicação e revisão periódica",
        requiresEvidence: true,
        evidenceType: "pdf",
        lgpdArticles: ["Art. 46"],
        isoControls: ["A.5.1.1"],
        nistControls: ["ID.GV-1"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-05-Q02",
        text: "Existem controles de acesso implementados para dados pessoais (autenticação, autorização)?",
        description: "Verificar gestão de identidades, perfis de acesso e segregação de funções",
        requiresEvidence: true,
        evidenceType: "both",
        lgpdArticles: ["Art. 46"],
        isoControls: ["A.9.1.1", "A.9.2.1"],
        nistControls: ["PR.AC-1"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-05-Q03",
        text: "Dados pessoais são criptografados em repouso e em trânsito?",
        description: "Verificar algoritmos utilizados, gestão de chaves e cobertura",
        requiresEvidence: true,
        evidenceType: "pdf",
        lgpdArticles: ["Art. 46"],
        isoControls: ["A.10.1.1"],
        nistControls: ["PR.DS-1", "PR.DS-2"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-05-Q04",
        text: "Existe processo de gestão de vulnerabilidades e patches?",
        description: "Verificar varreduras periódicas, priorização e aplicação de correções",
        requiresEvidence: true,
        evidenceType: "pdf",
        lgpdArticles: ["Art. 46"],
        isoControls: ["A.12.6.1"],
        nistControls: ["ID.RA-1"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-05-Q05",
        text: "Existem logs de acesso e auditoria para dados pessoais?",
        description: "Verificar registro de acessos, retenção de logs e monitoramento",
        requiresEvidence: true,
        evidenceType: "both",
        lgpdArticles: ["Art. 46"],
        isoControls: ["A.12.4.1"],
        nistControls: ["PR.PT-1"],
        maturityLevels: MATURITY_LEVELS,
      },
    ],
  },
  {
    id: "IA-06",
    name: "Gestão de Incidentes",
    description: "Processos para detecção, resposta e comunicação de incidentes de segurança",
    questions: [
      {
        id: "IA-06-Q01",
        text: "Existe Plano de Resposta a Incidentes de Segurança documentado?",
        description: "Verificar procedimentos, equipe de resposta e testes periódicos",
        requiresEvidence: true,
        evidenceType: "pdf",
        lgpdArticles: ["Art. 48"],
        isoControls: ["A.16.1.1"],
        nistControls: ["RS.RP-1"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-06-Q02",
        text: "Existe processo para comunicação de incidentes à ANPD e aos titulares?",
        description: "Verificar critérios de comunicação, prazos e templates",
        requiresEvidence: true,
        evidenceType: "pdf",
        lgpdArticles: ["Art. 48"],
        isoControls: ["A.16.1.2"],
        nistControls: ["RS.CO-2"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-06-Q03",
        text: "Incidentes de segurança são registrados e analisados para melhoria contínua?",
        description: "Verificar registro de incidentes, análise de causa raiz e lições aprendidas",
        requiresEvidence: true,
        evidenceType: "pdf",
        lgpdArticles: ["Art. 48"],
        isoControls: ["A.16.1.6"],
        nistControls: ["RS.IM-1"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-06-Q04",
        text: "Existe monitoramento contínuo para detecção de incidentes de segurança?",
        description: "Verificar ferramentas de SIEM, SOC e alertas automatizados",
        requiresEvidence: true,
        evidenceType: "both",
        lgpdArticles: ["Art. 46"],
        isoControls: ["A.12.4.1"],
        nistControls: ["DE.CM-1"],
        maturityLevels: MATURITY_LEVELS,
      },
    ],
  },
  {
    id: "IA-07",
    name: "Gestão de Terceiros",
    description: "Controles para compartilhamento de dados com operadores e parceiros",
    questions: [
      {
        id: "IA-07-Q01",
        text: "Existe processo de due diligence de privacidade para seleção de terceiros?",
        description: "Verificar critérios de avaliação, questionários e aprovação",
        requiresEvidence: true,
        evidenceType: "pdf",
        lgpdArticles: ["Art. 39"],
        isoControls: ["A.15.1.1"],
        nistControls: ["ID.SC-1"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-07-Q02",
        text: "Contratos com terceiros incluem cláusulas de proteção de dados?",
        description: "Verificar cláusulas padrão, obrigações do operador e direito de auditoria",
        requiresEvidence: true,
        evidenceType: "pdf",
        lgpdArticles: ["Art. 39"],
        isoControls: ["A.15.1.2"],
        nistControls: ["ID.SC-2"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-07-Q03",
        text: "Existe inventário de todos os terceiros que tratam dados pessoais?",
        description: "Verificar lista atualizada, categorização e dados compartilhados",
        requiresEvidence: true,
        evidenceType: "both",
        lgpdArticles: ["Art. 37"],
        isoControls: ["A.15.1.3"],
        nistControls: ["ID.SC-3"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-07-Q04",
        text: "Terceiros são monitorados quanto à conformidade com requisitos de privacidade?",
        description: "Verificar auditorias periódicas, relatórios e ações corretivas",
        requiresEvidence: true,
        evidenceType: "pdf",
        lgpdArticles: ["Art. 39"],
        isoControls: ["A.15.2.1"],
        nistControls: ["ID.SC-4"],
        maturityLevels: MATURITY_LEVELS,
      },
    ],
  },
  {
    id: "IA-08",
    name: "Treinamento e Conscientização",
    description: "Programas de capacitação em proteção de dados para colaboradores",
    questions: [
      {
        id: "IA-08-Q01",
        text: "Existe programa de treinamento em proteção de dados para todos os colaboradores?",
        description: "Verificar conteúdo, frequência, público-alvo e registro de participação",
        requiresEvidence: true,
        evidenceType: "pdf",
        lgpdArticles: ["Art. 50"],
        isoControls: ["A.7.2.2"],
        nistControls: ["PR.AT-1"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-08-Q02",
        text: "Novos colaboradores recebem treinamento de privacidade no onboarding?",
        description: "Verificar inclusão no processo de integração e materiais específicos",
        requiresEvidence: true,
        evidenceType: "pdf",
        lgpdArticles: ["Art. 50"],
        isoControls: ["A.7.2.2"],
        nistControls: ["PR.AT-2"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-08-Q03",
        text: "Existem campanhas periódicas de conscientização sobre privacidade?",
        description: "Verificar comunicações, eventos e materiais de sensibilização",
        requiresEvidence: true,
        evidenceType: "both",
        lgpdArticles: ["Art. 50"],
        isoControls: ["A.7.2.2"],
        nistControls: ["PR.AT-1"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-08-Q04",
        text: "A efetividade dos treinamentos é avaliada (testes, métricas)?",
        description: "Verificar avaliações de conhecimento, indicadores e melhorias",
        requiresEvidence: true,
        evidenceType: "pdf",
        lgpdArticles: ["Art. 50"],
        isoControls: ["A.7.2.2"],
        nistControls: ["PR.AT-5"],
        maturityLevels: MATURITY_LEVELS,
      },
    ],
  },
  {
    id: "IA-09",
    name: "Privacy by Design",
    description: "Incorporação de privacidade desde a concepção de produtos e serviços",
    questions: [
      {
        id: "IA-09-Q01",
        text: "Novos projetos passam por avaliação de impacto à proteção de dados (RIPD/DPIA)?",
        description: "Verificar processo de RIPD, critérios de aplicação e aprovações",
        requiresEvidence: true,
        evidenceType: "pdf",
        lgpdArticles: ["Art. 38"],
        isoControls: ["A.18.1.4"],
        nistControls: ["ID.RA-1"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-09-Q02",
        text: "Existe checklist de privacidade para desenvolvimento de novos sistemas?",
        description: "Verificar requisitos de privacidade em metodologias de desenvolvimento",
        requiresEvidence: true,
        evidenceType: "pdf",
        lgpdArticles: ["Art. 46"],
        isoControls: ["A.14.1.1"],
        nistControls: ["PR.IP-2"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-09-Q03",
        text: "O princípio de minimização de dados é aplicado na coleta e tratamento?",
        description: "Verificar coleta apenas de dados necessários para a finalidade",
        requiresEvidence: true,
        evidenceType: "both",
        lgpdArticles: ["Art. 6, III"],
        isoControls: ["A.18.1.4"],
        nistControls: ["PR.DS-5"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-09-Q04",
        text: "Existe processo de revisão periódica da necessidade de retenção de dados?",
        description: "Verificar política de retenção, prazos e descarte seguro",
        requiresEvidence: true,
        evidenceType: "pdf",
        lgpdArticles: ["Art. 15", "Art. 16"],
        isoControls: ["A.8.3.2"],
        nistControls: ["PR.IP-6"],
        maturityLevels: MATURITY_LEVELS,
      },
      {
        id: "IA-09-Q05",
        text: "Configurações de privacidade são definidas como padrão mais restritivo (Privacy by Default)?",
        description: "Verificar configurações padrão de sistemas e opt-in para coletas adicionais",
        requiresEvidence: true,
        evidenceType: "both",
        lgpdArticles: ["Art. 46"],
        isoControls: ["A.14.1.1"],
        nistControls: ["PR.IP-1"],
        maturityLevels: MATURITY_LEVELS,
      },
    ],
  },
];

// Função para obter total de questões
export function getTotalQuestions(): number {
  return SEUSDADOS_FRAMEWORK.reduce((sum, domain) => sum + domain.questions.length, 0);
}

// Função para obter questões por domínio
export function getQuestionsByDomain(domainId: string): Question[] {
  const domain = SEUSDADOS_FRAMEWORK.find(d => d.id === domainId);
  return domain?.questions || [];
}

// Função para obter todos os domínios
export function getAllDomains(): Domain[] {
  return SEUSDADOS_FRAMEWORK;
}

// Função para calcular maturidade média de um domínio
export function calculateDomainMaturity(domainId: string, responses: Record<string, number>): number {
  const questions = getQuestionsByDomain(domainId);
  if (questions.length === 0) return 0;
  
  const answeredQuestions = questions.filter(q => responses[q.id] !== undefined);
  if (answeredQuestions.length === 0) return 0;
  
  const sum = answeredQuestions.reduce((acc, q) => acc + (responses[q.id] || 0), 0);
  return sum / answeredQuestions.length;
}

// Função para calcular maturidade geral
export function calculateOverallMaturity(responses: Record<string, number>): number {
  const allQuestions = SEUSDADOS_FRAMEWORK.flatMap(d => d.questions);
  const answeredQuestions = allQuestions.filter(q => responses[q.id] !== undefined);
  if (answeredQuestions.length === 0) return 0;
  
  const sum = answeredQuestions.reduce((acc, q) => acc + (responses[q.id] || 0), 0);
  return sum / answeredQuestions.length;
}

// Exportar contagem total
export const TOTAL_QUESTIONS = getTotalQuestions(); // 39 questões
export const TOTAL_DOMAINS = SEUSDADOS_FRAMEWORK.length; // 9 domínios
