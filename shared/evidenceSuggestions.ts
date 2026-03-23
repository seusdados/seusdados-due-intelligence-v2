// Sugestões de evidências por pergunta e nível de maturidade
// Arquivo somente de dados visuais — não altera nenhuma lógica de avaliação

export type EvidenceSuggestion = {
  level: number;
  suggestions: string[];
};

export const EVIDENCE_SUGGESTIONS: Record<string, EvidenceSuggestion[]> = {

  // ─── IA-01: Governança de Dados Pessoais ───────────────────────────────────

  "IA-01-Q01": [
    {
      level: 1,
      suggestions: [
        "Declaração interna informando a inexistência de política de privacidade",
        "Plano de criação da política de privacidade (cronograma ou proposta)",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Rascunho ou versão preliminar da política de privacidade",
        "Registro de reunião ou e-mail discutindo a elaboração da política",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Documento da política de privacidade aprovado internamente",
        "Registro de comunicação interna sobre a política (e-mail, intranet)",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Política de privacidade assinada pela alta direção",
        "Registro de comunicação formal aos colaboradores (e-mail, treinamento)",
        "Ata de reunião de aprovação da política",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Histórico de versões da política com datas de revisão",
        "Relatório de verificação de aderência à política",
        "Calendário de revisões periódicas documentado",
      ],
    },
  ],

  "IA-01-Q02": [
    {
      level: 1,
      suggestions: [
        "Declaração interna informando a ausência de responsável pela proteção de dados",
        "Plano de nomeação do encarregado (cronograma ou proposta)",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Documento interno identificando o responsável informal pela privacidade",
        "Registro de e-mail ou comunicado designando a pessoa responsável",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Ato formal de nomeação do encarregado (portaria, resolução ou contrato)",
        "Descrição das atribuições do encarregado",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Ato de nomeação formal do encarregado",
        "Comprovante de comunicação à Autoridade Nacional de Proteção de Dados",
        "Currículo ou certificado de qualificação técnica do encarregado",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Relatórios periódicos elaborados pelo encarregado para a alta direção",
        "Estrutura organizacional com canal direto do encarregado à diretoria",
        "Orçamento ou recursos dedicados ao encarregado documentados",
      ],
    },
  ],

  "IA-01-Q03": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a inexistência de comitê ou grupo de privacidade",
        "Proposta de criação de comitê de privacidade",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Registros de reuniões informais sobre privacidade (e-mails, anotações)",
        "Lista de participantes de discussões sobre proteção de dados",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Ata de reunião do comitê informal de privacidade",
        "Lista de membros do comitê e suas áreas",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Ato formal de criação do comitê de privacidade",
        "Atas de reuniões periódicas com assinatura dos participantes",
        "Calendário de reuniões do comitê",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Painel de indicadores de privacidade apresentado ao comitê",
        "Relatório executivo de privacidade para a alta gestão",
        "Registro de participação de membros da diretoria nas reuniões",
      ],
    },
  ],

  "IA-01-Q04": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de papéis definidos para proteção de dados",
        "Proposta de definição de responsabilidades",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Registro informal de responsabilidades conhecidas (e-mail, anotação)",
        "Organograma sem papéis de privacidade formalizados",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Documento parcial de papéis e responsabilidades em privacidade",
        "Descrições de cargo com menção a proteção de dados",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Matriz de responsabilidades de privacidade documentada",
        "Descrições de cargo com responsabilidades de proteção de dados",
        "Registros de treinamentos específicos por função",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Avaliações de desempenho com indicadores de privacidade",
        "Relatório de revisão periódica dos papéis de privacidade",
        "Plano de melhoria contínua de responsabilidades",
      ],
    },
  ],

  // ─── IA-02: Inventário e Mapeamento de Dados ──────────────────────────────

  "IA-02-Q01": [
    {
      level: 1,
      suggestions: [
        "Declaração interna informando a inexistência de inventário de dados",
        "Plano de criação do inventário de dados pessoais",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Planilha simples com alguns dados mapeados informalmente",
        "Documento interno descrevendo tratamentos de dados conhecidos",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Planilha ou documento com mapeamento parcial de dados pessoais",
        "Relatório de levantamento inicial de dados pessoais por área",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Registro de atividades de tratamento de dados (inventário completo)",
        "Inventário de dados pessoais documentado conforme o artigo 37 da Lei Geral de Proteção de Dados",
        "Mapeamento de dados aprovado pela organização",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Captura de tela da ferramenta de mapeamento automatizado em uso",
        "Relatório automático gerado pela ferramenta de inventário",
        "Documentação da integração da ferramenta com os sistemas da organização",
      ],
    },
  ],

  "IA-02-Q02": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de classificação de dados pessoais",
        "Proposta de criação de política de classificação",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Lista informal de categorias de dados tratados pela organização",
        "Registro de discussão sobre categorias de dados sensíveis",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Documento de classificação parcial com foco em dados sensíveis",
        "Planilha com categorias de dados identificadas para processos críticos",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Política de classificação de dados pessoais documentada",
        "Inventário com categorias de dados (sensíveis, de crianças, financeiros etc.)",
        "Procedimento de classificação aplicado a todos os sistemas",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Captura de tela do sistema de classificação automatizada",
        "Relatório de dados classificados por rótulo de sensibilidade",
        "Documentação dos controles diferenciados por categoria de dado",
      ],
    },
  ],

  "IA-02-Q03": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de mapeamento de fluxo de dados",
        "Proposta de criação de diagrama de fluxo de dados",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Descrição textual informal dos fluxos de dados conhecidos",
        "Registro de e-mail ou reunião discutindo fluxos de dados",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Diagrama de fluxo de dados para processos críticos",
        "Documento descrevendo os principais fluxos de dados pessoais",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Diagrama completo de fluxo de dados incluindo terceiros e transferências",
        "Mapeamento de dados com identificação de transferências internacionais",
        "Documento de fluxo de dados aprovado e atualizado",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Captura de tela do sistema de monitoramento de fluxos em tempo real",
        "Relatório de alertas de transferências não autorizadas",
        "Documentação da integração do monitoramento com os sistemas",
      ],
    },
  ],

  "IA-02-Q04": [
    {
      level: 1,
      suggestions: [
        "Declaração informando que o inventário não é atualizado",
        "Proposta de criação de processo de atualização periódica",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Registro de atualização realizada após incidente ou auditoria",
        "E-mail solicitando atualização do inventário após evento específico",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Procedimento de atualização do inventário documentado",
        "Registro de tentativa de atualização periódica",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Procedimento de atualização periódica com responsáveis definidos",
        "Histórico de atualizações do inventário com datas e responsáveis",
        "Calendário de revisões periódicas do inventário",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Documentação da integração do inventário com processos de mudança",
        "Relatório de atualização automática do inventário",
        "Registro de atualização automática vinculada ao desenvolvimento de sistemas",
      ],
    },
  ],

  "IA-02-Q05": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de identificação de bases legais",
        "Proposta de mapeamento de bases legais para os tratamentos",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Lista informal de tratamentos com bases legais identificadas",
        "Registro de discussão sobre bases legais aplicáveis",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Documento com bases legais identificadas para processos principais",
        "Planilha parcial de tratamentos com base legal correspondente",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Inventário completo com base legal documentada para cada tratamento",
        "Mapeamento de bases legais conforme os artigos 7 e 11 da Lei Geral de Proteção de Dados",
        "Parecer jurídico sobre as bases legais aplicadas",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Relatório de revisão periódica das bases legais",
        "Análise de proporcionalidade e necessidade dos tratamentos documentada",
        "Histórico de revisões de bases legais com justificativas",
      ],
    },
  ],

  // ─── IA-03: Gestão de Consentimento ───────────────────────────────────────

  "IA-03-Q01": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de processo de obtenção de consentimento",
        "Proposta de criação de mecanismo de consentimento",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Formulário genérico de consentimento utilizado atualmente",
        "Exemplo de termo de aceite genérico sem granularidade",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Procedimento documentado de obtenção de consentimento",
        "Formulário de consentimento com finalidades específicas",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Formulário de consentimento livre, informado e inequívoco",
        "Registro de consentimentos obtidos com granularidade por finalidade",
        "Procedimento documentado de gestão de consentimentos",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Captura de tela do sistema de gestão de consentimentos",
        "Relatório da central de preferências de privacidade",
        "Documentação do sistema automatizado de gestão de consentimentos",
      ],
    },
  ],

  "IA-03-Q02": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de mecanismo de revogação de consentimento",
        "Proposta de criação de canal de revogação",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Registro de solicitação de revogação atendida por e-mail ou telefone",
        "Procedimento informal de revogação por contato direto",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Canal de revogação existente (formulário, e-mail dedicado)",
        "Procedimento documentado de revogação de consentimento",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Canal de revogação acessível e gratuito documentado",
        "Registro de revogação atendida dentro do prazo definido",
        "Política de revogação com prazo de resposta estabelecido",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Captura de tela do portal de autoatendimento de revogação",
        "Relatório de revogações processadas automaticamente",
        "Confirmação automática de revogação enviada ao titular",
      ],
    },
  ],

  "IA-03-Q03": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de registro de consentimentos",
        "Proposta de criação de sistema de registro",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Planilha ou sistema parcial com alguns registros de consentimento",
        "Registro de consentimentos de um sistema específico",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Sistema centralizado de registro de consentimentos",
        "Banco de dados ou planilha com histórico de consentimentos",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Registro histórico completo de consentimentos com trilha de auditoria",
        "Relatório de consentimentos obtidos e revogados com datas",
        "Documentação do sistema de registro com controles de acesso",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Documentação do sistema de gestão de consentimentos com prova criptográfica",
        "Relatório de integridade dos registros de consentimento",
        "Certificado ou log de auditoria do sistema de consentimentos",
      ],
    },
  ],

  "IA-03-Q04": [
    {
      level: 1,
      suggestions: [
        "Declaração informando que dados sensíveis são tratados sem consentimento específico",
        "Proposta de adequação do processo de consentimento para dados sensíveis",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Formulário genérico que inclui dados sensíveis sem destaque",
        "Registro de consentimento que mistura dados comuns e sensíveis",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Formulário separado para consentimento de dados sensíveis",
        "Cláusula específica para dados sensíveis no termo de consentimento",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Formulário de consentimento específico e destacado para dados sensíveis",
        "Registro de consentimentos de dados sensíveis separado dos demais",
        "Procedimento documentado conforme o artigo 11 da Lei Geral de Proteção de Dados",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Sistema de gestão granular de consentimentos sensíveis",
        "Relatório de revalidação periódica de consentimentos de dados sensíveis",
        "Documentação do processo de revalidação automática",
      ],
    },
  ],

  // ─── IA-04: Direitos dos Titulares ────────────────────────────────────────

  "IA-04-Q01": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de canal para titulares",
        "Proposta de criação de canal de atendimento a titulares",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Registro de solicitação atendida por canal genérico (central de atendimento)",
        "Exemplo de resposta a titular por canal não dedicado",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Canal dedicado para titulares (e-mail, formulário)",
        "Procedimento documentado de atendimento a titulares",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Canal dedicado com processo documentado e prazos definidos",
        "Registro de solicitações atendidas dentro do prazo de 15 dias",
        "Política de atendimento a titulares publicada",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Captura de tela do portal de autoatendimento para titulares",
        "Relatório de solicitações processadas automaticamente",
        "Documentação do sistema de rastreamento de solicitações",
      ],
    },
  ],

  "IA-04-Q02": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a impossibilidade de atender solicitações de acesso",
        "Proposta de criação de processo de atendimento ao direito de acesso",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Registro de acesso fornecido manualmente sem prazo definido",
        "Exemplo de resposta informal a solicitação de acesso",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Procedimento documentado de atendimento ao direito de acesso",
        "Registro de solicitação atendida com prazo",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Registro de acesso fornecido dentro do prazo legal de 15 dias",
        "Modelo de resposta ao direito de acesso com dados completos",
        "Procedimento documentado de geração de relatório de dados do titular",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Captura de tela do portal de acesso instantâneo aos dados",
        "Relatório de solicitações de acesso processadas automaticamente",
        "Documentação do sistema de download automático de dados pelo titular",
      ],
    },
  ],

  "IA-04-Q03": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a impossibilidade de atender solicitações de correção",
        "Proposta de criação de processo de correção de dados",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Registro de correção realizada manualmente sem processo formal",
        "Exemplo de resposta informal a solicitação de correção",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Procedimento documentado de correção de dados",
        "Registro de correção realizada em sistema principal",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Registro de correção com propagação para todos os sistemas",
        "Comprovante de notificação a terceiros sobre a correção",
        "Procedimento documentado de propagação de correções",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Captura de tela do portal de correção por autoatendimento",
        "Relatório de correções propagadas automaticamente",
        "Documentação do processo de validação e propagação automática",
      ],
    },
  ],

  "IA-04-Q04": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de portabilidade de dados",
        "Proposta de criação de processo de portabilidade",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Exemplo de dados fornecidos em formato não estruturado (PDF, e-mail)",
        "Registro de solicitação de portabilidade atendida informalmente",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Exemplo de dados fornecidos em formato estruturado (planilha, arquivo de dados)",
        "Procedimento documentado de portabilidade em formato estruturado",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Exemplo de arquivo de portabilidade em formato estruturado e interoperável",
        "Procedimento documentado de portabilidade com formato padronizado",
        "Registro de portabilidade realizada conforme solicitação",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Documentação da interface de portabilidade direta entre controladores",
        "Relatório de transferências de portabilidade realizadas",
        "Especificação técnica do formato de portabilidade adotado",
      ],
    },
  ],

  "IA-04-Q05": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a impossibilidade de atender solicitações de exclusão",
        "Proposta de criação de processo de exclusão de dados",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Registro de exclusão realizada manualmente sem garantia de completude",
        "Exemplo de resposta informal a solicitação de exclusão",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Procedimento documentado de exclusão de dados",
        "Registro de exclusão realizada em sistemas principais",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Registro de exclusão completa incluindo cópias de segurança e terceiros",
        "Comprovante de notificação a terceiros sobre a exclusão",
        "Procedimento documentado de exclusão completa e rastreável",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Certificado de destruição de dados emitido automaticamente",
        "Relatório de exclusões automatizadas com trilha de auditoria",
        "Documentação do processo automatizado de exclusão e certificação",
      ],
    },
  ],

  // ─── IA-05: Segurança da Informação ───────────────────────────────────────

  "IA-05-Q01": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de medidas de segurança para dados pessoais",
        "Proposta de criação de política de segurança da informação",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Licença ou comprovante de antivírus e firewall instalados",
        "Registro de medidas básicas de segurança implementadas",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Política de segurança da informação documentada",
        "Procedimentos de segurança documentados para dados pessoais",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Política de segurança da informação aprovada e implementada",
        "Relatório de testes periódicos de segurança",
        "Registro de medidas técnicas e administrativas implementadas",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Relatório de monitoramento contínuo de segurança",
        "Documentação do sistema de resposta automatizada a incidentes",
        "Relatório de auditoria de segurança em camadas",
      ],
    },
  ],

  "IA-05-Q02": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de controles de acesso a dados pessoais",
        "Proposta de implementação de controles de acesso",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Captura de tela do sistema de login básico (usuário e senha)",
        "Registro de usuários com acesso a dados pessoais",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Documentação dos perfis de acesso definidos por função",
        "Relatório de usuários e seus perfis de acesso",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Política de controle de acesso baseado em função documentada",
        "Relatório de revisão periódica de acessos",
        "Registro de revogação de acessos de colaboradores desligados",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Relatório de monitoramento de comportamento de acesso",
        "Documentação do sistema de autenticação multifator",
        "Relatório de controle de acesso dinâmico e adaptativo",
      ],
    },
  ],

  "IA-05-Q03": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de criptografia de dados pessoais",
        "Proposta de implementação de criptografia",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Comprovante de certificado de segurança para transmissão de dados",
        "Documentação de criptografia em trânsito implementada",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Documentação de criptografia em trânsito e em repouso para sistemas críticos",
        "Relatório de sistemas com criptografia implementada",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Política de criptografia documentada para dados em trânsito e em repouso",
        "Documentação do sistema de gestão de chaves criptográficas",
        "Relatório de auditoria de criptografia implementada",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Documentação do sistema de criptografia de ponta a ponta",
        "Relatório de rotação automática de chaves criptográficas",
        "Auditoria de criptografia com cobertura completa dos sistemas",
      ],
    },
  ],

  "IA-05-Q04": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de gestão de vulnerabilidades",
        "Proposta de criação de processo de gestão de vulnerabilidades",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Registro de atualização de sistema realizada após incidente",
        "Comprovante de atualização de software básico",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Procedimento documentado de gestão de vulnerabilidades",
        "Relatório de varredura de vulnerabilidades realizada",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Relatório de análise periódica de vulnerabilidades",
        "Registro de aplicação de atualizações de segurança",
        "Procedimento documentado de gestão de vulnerabilidades com prazos",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Relatório de monitoramento contínuo de vulnerabilidades",
        "Documentação do sistema automatizado de aplicação de atualizações",
        "Relatório de correlação de eventos de segurança",
      ],
    },
  ],

  "IA-05-Q05": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de registros de acesso a dados pessoais",
        "Proposta de implementação de registros de auditoria",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Registros básicos de sistema (logs de acesso genéricos)",
        "Exemplo de log de sistema sem foco em dados pessoais",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Registros de acesso a dados pessoais existentes",
        "Relatório de logs de acesso a sistemas com dados pessoais",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Relatório de análise periódica de registros de acesso",
        "Política de retenção de logs documentada",
        "Registro completo de acessos com usuário, data e ação realizada",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Relatório do sistema de gestão de eventos de segurança",
        "Documentação de alertas em tempo real para acessos suspeitos",
        "Relatório de correlação de eventos de segurança",
      ],
    },
  ],

  // ─── IA-06: Gestão de Incidentes ──────────────────────────────────────────

  "IA-06-Q01": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de processo de gestão de incidentes",
        "Proposta de criação de plano de resposta a incidentes",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Registro de incidente tratado de forma reativa sem processo formal",
        "Relato de ação tomada após incidente de segurança",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Plano de resposta a incidentes documentado",
        "Procedimento de gestão de incidentes de privacidade",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Plano de resposta a incidentes implementado e testado",
        "Relatório de simulação ou teste do plano de resposta",
        "Registro de incidente tratado conforme o plano",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Documentação do centro de operações de segurança dedicado",
        "Relatório de simulações regulares de resposta a incidentes",
        "Documentação de procedimentos automatizados de resposta",
      ],
    },
  ],

  "IA-06-Q02": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de procedimento de notificação à Autoridade Nacional de Proteção de Dados",
        "Proposta de criação de procedimento de notificação",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Registro de conhecimento da obrigação de notificação sem procedimento formal",
        "Anotação ou e-mail sobre a obrigação de notificar a autoridade",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Procedimento documentado de notificação à Autoridade Nacional de Proteção de Dados",
        "Modelo de comunicação de incidente para a autoridade",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Procedimento de notificação com modelos e responsáveis definidos",
        "Registro de notificação realizada à Autoridade Nacional de Proteção de Dados",
        "Modelo de comunicação de incidente aprovado",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Documentação do sistema automatizado de avaliação de risco de incidentes",
        "Relatório de notificação realizada dentro do prazo de 72 horas",
        "Sistema de triagem automática de incidentes com obrigação de notificação",
      ],
    },
  ],

  "IA-06-Q03": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de procedimento de comunicação aos titulares",
        "Proposta de criação de procedimento de comunicação",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Registro de comunicação pontual realizada a titulares afetados",
        "Exemplo de comunicação informal a titular sobre incidente",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Modelo de comunicação de incidente para titulares",
        "Procedimento documentado de comunicação a titulares",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Procedimento de comunicação a titulares documentado e testado",
        "Registro de comunicação realizada a titulares afetados",
        "Modelo de comunicação aprovado com canais definidos",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Documentação do sistema automatizado de notificação por múltiplos canais",
        "Relatório de notificações enviadas a titulares com confirmação de recebimento",
        "Sistema de rastreamento de comunicações a titulares",
      ],
    },
  ],

  "IA-06-Q04": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de registro de incidentes de privacidade",
        "Proposta de criação de registro de incidentes",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Planilha ou e-mail com registro de incidentes ocorridos",
        "Anotação de incidente sem análise formal",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Sistema de registro de incidentes existente",
        "Relatório de incidentes registrados sem análise de tendências",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Relatório de análise de causa raiz de incidentes",
        "Registro de ações corretivas implementadas após incidentes",
        "Relatório de lições aprendidas de incidentes anteriores",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Relatório do sistema integrado de detecção proativa de incidentes",
        "Documentação de análise preditiva de riscos de incidentes",
        "Painel de monitoramento de incidentes em tempo real",
      ],
    },
  ],

  // ─── IA-07: Gestão de Terceiros ───────────────────────────────────────────

  "IA-07-Q01": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de processo de avaliação de privacidade para terceiros",
        "Proposta de criação de processo de avaliação de terceiros",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Registro de avaliação informal de terceiro baseada em reputação",
        "E-mail ou anotação sobre avaliação informal de fornecedor",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Questionário de avaliação de privacidade aplicado a terceiros",
        "Relatório de avaliação de terceiro sem análise estruturada",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Relatório de avaliação completa de terceiro com classificação de risco",
        "Plano de ação de mitigação de riscos de terceiro",
        "Procedimento documentado de avaliação de terceiros",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Relatório de monitoramento contínuo de terceiros",
        "Documentação do sistema de avaliação periódica de certificações de terceiros",
        "Painel de conformidade de terceiros atualizado",
      ],
    },
  ],

  "IA-07-Q02": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de cláusulas de privacidade em contratos com terceiros",
        "Proposta de inclusão de cláusulas de privacidade nos contratos",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Contrato com cláusula genérica de confidencialidade",
        "Exemplo de contrato sem cláusulas específicas de proteção de dados",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Contrato com cláusulas de privacidade específicas",
        "Modelo de cláusula de privacidade utilizado em alguns contratos",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Modelo padronizado de cláusulas de privacidade para contratos",
        "Contrato com cláusulas de privacidade completas e padronizadas",
        "Registro de contratos revisados com cláusulas de privacidade",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Acordo de tratamento de dados completo com terceiro",
        "Contrato com cláusulas de privacidade, prazos e penalidades",
        "Registro de acordos de tratamento de dados firmados",
      ],
    },
  ],

  "IA-07-Q03": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de inventário de terceiros",
        "Proposta de criação de inventário de terceiros",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Lista parcial de terceiros conhecidos informalmente",
        "Planilha com alguns fornecedores identificados",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Inventário parcial de terceiros documentado",
        "Planilha de terceiros sem categorização completa",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Inventário completo de terceiros com categorização e dados compartilhados",
        "Planilha ou sistema de gestão de terceiros atualizado",
        "Relatório de terceiros que tratam dados pessoais",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Captura de tela do sistema automatizado de gestão de terceiros",
        "Relatório de integração do inventário de terceiros com o mapeamento de dados",
        "Documentação do sistema de gestão automatizada de terceiros",
      ],
    },
  ],

  "IA-07-Q04": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de monitoramento de terceiros",
        "Proposta de criação de processo de monitoramento",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Registro de ação tomada após incidente com terceiro",
        "E-mail de comunicação com terceiro após problema identificado",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Relatório de auditoria realizada em terceiro crítico",
        "Questionário de conformidade respondido por terceiro",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Relatório de auditoria periódica em terceiros",
        "Registro de ações corretivas exigidas de terceiros",
        "Calendário de auditorias de terceiros documentado",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Painel de conformidade de terceiros com alertas automáticos",
        "Relatório de monitoramento contínuo de terceiros",
        "Documentação do sistema de alertas automáticos de conformidade de terceiros",
      ],
    },
  ],

  // ─── IA-08: Treinamento e Conscientização ─────────────────────────────────

  "IA-08-Q01": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de programa de treinamento em proteção de dados",
        "Proposta de criação de programa de treinamento",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Registro de treinamento pontual realizado",
        "Material de treinamento utilizado de forma esporádica",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Programa de treinamento documentado",
        "Material de treinamento em proteção de dados desenvolvido",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Registro de participação em treinamento obrigatório",
        "Lista de presença ou certificado de conclusão de treinamento",
        "Programa de treinamento com cronograma e público-alvo definidos",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Documentação do programa com trilhas personalizadas por função",
        "Certificados de conclusão de treinamento com avaliação",
        "Relatório de cobertura do programa de treinamento",
      ],
    },
  ],

  "IA-08-Q02": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de treinamento de privacidade no processo de integração",
        "Proposta de inclusão de treinamento de privacidade no processo de integração",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Registro de orientação informal sobre privacidade durante integração",
        "Material de integração sem módulo específico de privacidade",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Material de treinamento de privacidade incluído no processo de integração",
        "Registro de treinamento de privacidade realizado durante integração",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Registro de conclusão de treinamento de privacidade no processo de integração",
        "Material específico de privacidade para novos colaboradores",
        "Procedimento documentado de treinamento obrigatório na integração",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Captura de tela do sistema de integração digital com módulo de privacidade",
        "Relatório de avaliação de conhecimento de novos colaboradores",
        "Registro de aceite de políticas de privacidade na integração",
      ],
    },
  ],

  "IA-08-Q03": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de campanhas de conscientização",
        "Proposta de criação de programa de conscientização",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Registro de comunicação esporádica sobre privacidade",
        "E-mail ou comunicado pontual sobre proteção de dados",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Material de campanha anual de conscientização sobre privacidade",
        "Registro de evento de conscientização realizado",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Calendário de campanhas periódicas de conscientização",
        "Material de campanha de conscientização desenvolvido",
        "Registro de participação em eventos de conscientização",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Relatório de métricas de engajamento do programa de conscientização",
        "Documentação do programa contínuo com representantes de privacidade",
        "Painel de indicadores de conscientização da organização",
      ],
    },
  ],

  "IA-08-Q04": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de avaliação de efetividade dos treinamentos",
        "Proposta de criação de processo de avaliação de treinamentos",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Registro de retorno informal de participantes de treinamento",
        "E-mail ou comentário sobre treinamento realizado",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Formulário de avaliação de satisfação de treinamento",
        "Relatório de satisfação de participantes de treinamento",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Resultado de teste de conhecimento aplicado após treinamento",
        "Relatório de indicadores de desempenho dos treinamentos",
        "Análise de evolução do conhecimento antes e após treinamento",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Relatório de simulações e avaliações comportamentais",
        "Plano de melhoria contínua baseado em resultados de avaliação",
        "Documentação de metodologia de avaliação comportamental de privacidade",
      ],
    },
  ],

  // ─── IA-09: Privacidade desde a Concepção ─────────────────────────────────

  "IA-09-Q01": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de avaliação de impacto em novos projetos",
        "Proposta de criação de processo de avaliação de impacto",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Registro de avaliação de impacto realizada apenas para projeto de alto risco",
        "Relatório de avaliação de impacto de projeto específico",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Processo de avaliação de impacto documentado",
        "Modelo de avaliação de impacto à proteção de dados",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Avaliação de impacto à proteção de dados concluída para novo projeto",
        "Critérios documentados de aplicação da avaliação de impacto",
        "Registro de aprovação da avaliação de impacto pelo encarregado",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Documentação da integração da avaliação de impacto ao ciclo de desenvolvimento",
        "Relatório de avaliações de impacto realizadas no período",
        "Processo automatizado de triagem de projetos para avaliação de impacto",
      ],
    },
  ],

  "IA-09-Q02": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de lista de verificação de privacidade no desenvolvimento",
        "Proposta de criação de lista de verificação de privacidade",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Registro de considerações informais de privacidade em projeto",
        "E-mail ou anotação sobre requisitos de privacidade discutidos",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Lista de verificação de privacidade desenvolvida",
        "Registro de uso da lista de verificação em projeto",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Lista de verificação de privacidade integrada à metodologia de desenvolvimento",
        "Registro de uso obrigatório da lista de verificação em projetos",
        "Documentação dos requisitos de privacidade no processo de desenvolvimento",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Documentação do processo automatizado de privacidade desde a concepção",
        "Relatório de etapas de aprovação de privacidade no processo de entrega",
        "Captura de tela do sistema de gestão de requisitos de privacidade",
      ],
    },
  ],

  "IA-09-Q03": [
    {
      level: 1,
      suggestions: [
        "Declaração informando que a minimização de dados não é considerada",
        "Proposta de criação de política de minimização de dados",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Registro de discussão informal sobre necessidade de dados coletados",
        "E-mail ou anotação sobre redução de dados desnecessários",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Política de minimização de dados documentada",
        "Registro de revisão de dados coletados por processo",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Relatório de revisão de minimização em novos projetos",
        "Registro de dados removidos ou não coletados por aplicação do princípio",
        "Procedimento documentado de revisão de minimização em sistemas existentes",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Relatório de ferramenta automatizada para detecção de coleta excessiva",
        "Documentação do sistema de monitoramento de minimização de dados",
        "Relatório de alertas de coleta excessiva identificados automaticamente",
      ],
    },
  ],

  "IA-09-Q04": [
    {
      level: 1,
      suggestions: [
        "Declaração informando a ausência de política de retenção de dados",
        "Proposta de criação de política de retenção",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Registro de dados retidos indefinidamente sem política formal",
        "Inventário de dados sem prazos de retenção definidos",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Política de retenção de dados documentada",
        "Tabela de prazos de retenção por tipo de dado",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Política de retenção implementada com prazos definidos",
        "Registro de exclusão periódica de dados conforme a política",
        "Relatório de dados excluídos por vencimento do prazo de retenção",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Relatório de exclusão automatizada de dados com auditoria",
        "Documentação do sistema automatizado de gestão de retenção",
        "Relatório de conformidade de retenção gerado automaticamente",
      ],
    },
  ],

  "IA-09-Q05": [
    {
      level: 1,
      suggestions: [
        "Declaração informando que a privacidade não é considerada na arquitetura de sistemas",
        "Proposta de adoção de padrões de privacidade na arquitetura",
      ],
    },
    {
      level: 2,
      suggestions: [
        "Registro de consideração de privacidade em projeto específico",
        "Documentação de requisito de privacidade atendido pontualmente",
      ],
    },
    {
      level: 3,
      suggestions: [
        "Padrões de privacidade documentados para desenvolvimento",
        "Guia de privacidade desde a concepção para desenvolvedores",
      ],
    },
    {
      level: 4,
      suggestions: [
        "Arquitetura de referência com padrões de privacidade obrigatórios",
        "Documentação de configurações padrão mais restritivas implementadas",
        "Registro de aprovação de arquitetura com requisitos de privacidade",
      ],
    },
    {
      level: 5,
      suggestions: [
        "Documentação de tecnologias de aprimoramento de privacidade integradas",
        "Relatório de auditoria de privacidade da arquitetura de sistemas",
        "Captura de tela de configurações padrão restritivas implementadas",
      ],
    },
  ],
};
