// Sugestões de evidências para a Avaliação de Maturidade LGPD
// Baseado no frameworkSeusdados.ts (IDs "IA-01-Q01", "IA-02-Q01" etc.)
// Arquivo somente de dados visuais — não altera nenhuma lógica de avaliação

export type EvidenceSuggestionFramework = {
  level: number;
  suggestions: string[];
};

export const EVIDENCE_SUGGESTIONS_FRAMEWORK: Record<string, EvidenceSuggestionFramework[]> = {

  // ─── IA-01: Governança de Dados Pessoais ─────────────────────────────────

  "IA-01-Q01": [
    { level: 1, suggestions: ["Declaração interna informando a ausência de política de privacidade", "Proposta de criação de política de privacidade"] },
    { level: 2, suggestions: ["Rascunho ou versão preliminar de política de privacidade", "E-mail ou registro de iniciativa de criação da política"] },
    { level: 3, suggestions: ["Política de privacidade documentada mas não aprovada formalmente", "Registro de revisão da política sem aprovação da alta direção"] },
    { level: 4, suggestions: ["Política de privacidade aprovada e assinada pela alta direção", "Ata de reunião de aprovação da política de privacidade", "Comprovante de publicação da política para os colaboradores"] },
    { level: 5, suggestions: ["Histórico de versões da política com controle de mudanças", "Relatório de comunicação proativa de atualizações da política", "Documentação da integração da política ao sistema de gestão"] },
  ],

  "IA-01-Q02": [
    { level: 1, suggestions: ["Declaração informando a ausência de encarregado nomeado", "Proposta de nomeação do encarregado de proteção de dados"] },
    { level: 2, suggestions: ["Registro de pessoa responsável por privacidade sem nomeação formal", "E-mail ou comunicado informal sobre responsável por privacidade"] },
    { level: 3, suggestions: ["Ato de nomeação do encarregado sem comunicação à autoridade nacional", "Documento de designação interna do encarregado"] },
    { level: 4, suggestions: ["Ato formal de nomeação do encarregado publicado", "Comprovante de comunicação do encarregado à autoridade nacional de proteção de dados", "Publicação do nome e contato do encarregado no site da organização"] },
    { level: 5, suggestions: ["Relatório de atividades do encarregado com métricas de desempenho", "Documentação da integração do encarregado ao planejamento estratégico", "Painel de acompanhamento das atividades do encarregado"] },
  ],

  "IA-01-Q03": [
    { level: 1, suggestions: ["Declaração informando a ausência de comitê de privacidade", "Proposta de criação de comitê ou estrutura de governança de privacidade"] },
    { level: 2, suggestions: ["Registro de reunião informal sobre privacidade sem estrutura formal", "E-mail de convocação de reunião sobre proteção de dados"] },
    { level: 3, suggestions: ["Ata de reunião do comitê de privacidade existente mas sem regularidade", "Regimento interno do comitê sem atividade comprovada"] },
    { level: 4, suggestions: ["Regimento do comitê de privacidade aprovado e em vigor", "Atas de reuniões regulares do comitê de privacidade", "Registro de decisões tomadas pelo comitê de privacidade"] },
    { level: 5, suggestions: ["Relatório de indicadores de governança de privacidade do comitê", "Documentação da integração do comitê à estratégia corporativa", "Painel de acompanhamento das decisões e ações do comitê"] },
  ],

  "IA-01-Q04": [
    { level: 1, suggestions: ["Declaração informando a ausência de papéis definidos para proteção de dados", "Proposta de definição de responsabilidades de privacidade"] },
    { level: 2, suggestions: ["Descrição informal de responsabilidades de privacidade para algumas áreas", "E-mail ou comunicado sobre responsável de privacidade em área específica"] },
    { level: 3, suggestions: ["Organograma com papéis de privacidade definidos para áreas principais", "Descrição de cargo com responsabilidades de privacidade para alguns cargos"] },
    { level: 4, suggestions: ["Matriz de responsabilidades de privacidade para todos os níveis", "Descrições de cargo atualizadas com responsabilidades de privacidade", "Registro de comunicação formal dos papéis de privacidade"] },
    { level: 5, suggestions: ["Sistema automatizado de gestão de responsabilidades de privacidade", "Relatório de desempenho por papel de privacidade", "Documentação da integração de responsabilidades ao sistema de avaliação de desempenho"] },
  ],

  // ─── IA-02: Inventário e Mapeamento de Dados ─────────────────────────────

  "IA-02-Q01": [
    { level: 1, suggestions: ["Declaração informando a ausência de inventário de dados pessoais", "Proposta de criação do inventário de dados pessoais"] },
    { level: 2, suggestions: ["Planilha simples com alguns dados mapeados de forma informal", "Documento interno descrevendo alguns tratamentos de dados conhecidos"] },
    { level: 3, suggestions: ["Inventário parcial em planilha cobrindo algumas áreas", "Relatório de levantamento inicial de dados pessoais"] },
    { level: 4, suggestions: ["Registro de atividades de tratamento completo conforme o artigo 37 da Lei Geral de Proteção de Dados", "Inventário de dados pessoais documentado e aprovado pela organização", "Mapeamento de dados com responsáveis e datas de revisão definidos"] },
    { level: 5, suggestions: ["Captura de tela da ferramenta automatizada de inventário de dados", "Relatório automático de mapeamento de dados gerado pelo sistema", "Documentação da integração do inventário com os sistemas da organização"] },
  ],

  "IA-02-Q02": [
    { level: 1, suggestions: ["Declaração informando a ausência de identificação de categorias de dados", "Proposta de categorização dos dados pessoais tratados"] },
    { level: 2, suggestions: ["Lista informal de alguns tipos de dados tratados sem categorização", "E-mail ou anotação sobre tipos de dados tratados em área específica"] },
    { level: 3, suggestions: ["Tabela de categorias de dados pessoais cobrindo as principais áreas", "Inventário parcial com identificação de dados sensíveis"] },
    { level: 4, suggestions: ["Inventário completo com categorias de dados pessoais e sensíveis identificados", "Registro de dados de crianças e adolescentes com controles específicos", "Documentação das categorias especiais de dados com bases legais correspondentes"] },
    { level: 5, suggestions: ["Relatório automatizado de categorias de dados com alertas de risco", "Sistema de classificação automática de dados pessoais por categoria", "Documentação do processo automatizado de identificação de novas categorias"] },
  ],

  "IA-02-Q03": [
    { level: 1, suggestions: ["Declaração informando a ausência de mapeamento de fluxo de dados", "Proposta de criação de diagrama de fluxo de dados"] },
    { level: 2, suggestions: ["Diagrama informal de fluxo de dados para processo específico", "Descrição textual de como os dados fluem entre alguns sistemas"] },
    { level: 3, suggestions: ["Diagrama de fluxo de dados cobrindo os principais processos", "Mapeamento de compartilhamento de dados com terceiros principais"] },
    { level: 4, suggestions: ["Diagrama completo de fluxo de dados entre todos os sistemas e terceiros", "Mapeamento de transferências internacionais de dados documentado", "Registro de todos os pontos de entrada e saída de dados pessoais"] },
    { level: 5, suggestions: ["Sistema automatizado de mapeamento de fluxo de dados em tempo real", "Relatório de fluxo de dados gerado automaticamente pelo sistema", "Documentação da integração do mapeamento com a arquitetura de sistemas"] },
  ],

  "IA-02-Q04": [
    { level: 1, suggestions: ["Declaração informando que o inventário não é atualizado", "Proposta de criação de processo de atualização periódica do inventário"] },
    { level: 2, suggestions: ["Registro de atualização pontual do inventário sem periodicidade definida", "E-mail ou anotação sobre atualização realizada após mudança de processo"] },
    { level: 3, suggestions: ["Procedimento de atualização do inventário com periodicidade definida", "Registro de revisão do inventário realizada no período"] },
    { level: 4, suggestions: ["Histórico de atualizações do inventário com datas e responsáveis", "Procedimento formal de atualização após mudanças de processo documentado", "Ata de revisão periódica do inventário com aprovação"] },
    { level: 5, suggestions: ["Sistema de alertas automáticos de atualização do inventário", "Relatório de mudanças no inventário gerado automaticamente", "Documentação da integração do inventário com o processo de gestão de mudanças"] },
  ],

  "IA-02-Q05": [
    { level: 1, suggestions: ["Declaração informando a ausência de identificação de bases legais", "Proposta de mapeamento de bases legais para os tratamentos"] },
    { level: 2, suggestions: ["Lista informal de bases legais para alguns tratamentos", "Documento interno descrevendo a base legal para tratamento principal"] },
    { level: 3, suggestions: ["Tabela de bases legais cobrindo os principais tratamentos de dados", "Inventário parcial com bases legais identificadas"] },
    { level: 4, suggestions: ["Registro completo de bases legais para todas as atividades de tratamento", "Documentação da análise jurídica das bases legais aplicáveis", "Mapeamento de bases legais aprovado pelo encarregado ou jurídico"] },
    { level: 5, suggestions: ["Sistema automatizado de gestão de bases legais com alertas de vencimento", "Relatório de revisão de bases legais gerado automaticamente", "Documentação do processo automatizado de verificação de bases legais"] },
  ],

  // ─── IA-03: Gestão de Consentimento ──────────────────────────────────────

  "IA-03-Q01": [
    { level: 1, suggestions: ["Declaração informando a ausência de processo de obtenção de consentimento", "Proposta de criação de processo de consentimento"] },
    { level: 2, suggestions: ["Formulário de consentimento genérico sem especificidade", "Caixa de seleção de aceite de termos sem linguagem clara"] },
    { level: 3, suggestions: ["Formulário de consentimento específico para algumas finalidades", "Registro de consentimento obtido com linguagem acessível"] },
    { level: 4, suggestions: ["Formulário de consentimento livre, informado e inequívoco documentado", "Registro de consentimento obtido com data e finalidade específica", "Procedimento formal de obtenção de consentimento aprovado"] },
    { level: 5, suggestions: ["Sistema automatizado de gestão de consentimentos com registro completo", "Relatório de consentimentos obtidos e revogados gerado automaticamente", "Documentação da integração do sistema de consentimento com os processos de negócio"] },
  ],

  "IA-03-Q02": [
    { level: 1, suggestions: ["Declaração informando a ausência de mecanismo de revogação de consentimento", "Proposta de criação de canal de revogação de consentimento"] },
    { level: 2, suggestions: ["Registro de revogação atendida manualmente sem processo formal", "E-mail de resposta a solicitação de revogação de consentimento"] },
    { level: 3, suggestions: ["Canal de revogação disponível mas com processo manual e demorado", "Procedimento de revogação documentado sem automação"] },
    { level: 4, suggestions: ["Canal de revogação fácil e gratuito disponível e documentado", "Registro de revogação atendida dentro do prazo legal", "Procedimento formal de revogação com confirmação ao titular"] },
    { level: 5, suggestions: ["Portal de autoatendimento para revogação de consentimento", "Relatório de revogações processadas automaticamente", "Documentação do sistema automatizado de revogação e seus efeitos"] },
  ],

  "IA-03-Q03": [
    { level: 1, suggestions: ["Declaração informando a ausência de registro de consentimentos", "Proposta de criação de registro histórico de consentimentos"] },
    { level: 2, suggestions: ["Planilha informal com alguns registros de consentimento", "Arquivo de e-mails de confirmação de consentimento sem organização"] },
    { level: 3, suggestions: ["Banco de dados parcial de consentimentos obtidos", "Registro de consentimentos para as principais finalidades"] },
    { level: 4, suggestions: ["Registro completo de todos os consentimentos obtidos e revogados", "Histórico de consentimentos com data, finalidade e canal de obtenção", "Relatório de consentimentos ativos por finalidade"] },
    { level: 5, suggestions: ["Sistema automatizado de registro e auditoria de consentimentos", "Relatório de trilha de auditoria de consentimentos gerado automaticamente", "Documentação da integração do registro com o sistema de gestão de dados"] },
  ],

  "IA-03-Q04": [
    { level: 1, suggestions: ["Declaração informando que dados sensíveis são tratados sem consentimento específico", "Proposta de criação de processo de consentimento específico para dados sensíveis"] },
    { level: 2, suggestions: ["Formulário genérico usado para dados sensíveis sem destaque", "Registro de consentimento para dados sensíveis sem especificidade"] },
    { level: 3, suggestions: ["Formulário com destaque para dados sensíveis em alguns processos", "Registro de consentimento específico para dados sensíveis em processo principal"] },
    { level: 4, suggestions: ["Formulário de consentimento específico e destacado para dados sensíveis", "Registro de consentimento para dados sensíveis com finalidade específica", "Procedimento formal de obtenção de consentimento para dados sensíveis"] },
    { level: 5, suggestions: ["Sistema automatizado de gestão de consentimentos para dados sensíveis", "Relatório de consentimentos para dados sensíveis com auditoria completa", "Documentação do processo automatizado de verificação de consentimento para dados sensíveis"] },
  ],

  // ─── IA-04: Direitos dos Titulares ───────────────────────────────────────

  "IA-04-Q01": [
    { level: 1, suggestions: ["Declaração informando a ausência de canal para exercício de direitos", "Proposta de criação de canal de atendimento a titulares"] },
    { level: 2, suggestions: ["Canal existente mas não divulgado ou de difícil acesso", "Endereço de e-mail genérico usado para solicitações de titulares"] },
    { level: 3, suggestions: ["Canal disponível e divulgado com tempo de resposta inconsistente", "Página de contato com menção ao exercício de direitos dos titulares"] },
    { level: 4, suggestions: ["Canal formalizado com prazo de resposta definido e documentado", "Registro de solicitações atendidas dentro do prazo legal de 15 dias", "Relatório de rastreamento de solicitações de titulares"] },
    { level: 5, suggestions: ["Portal de autoatendimento para exercício de direitos dos titulares", "Relatório de métricas de atendimento a titulares", "Documentação do sistema automatizado de atendimento a solicitações"] },
  ],

  "IA-04-Q02": [
    { level: 1, suggestions: ["Declaração informando a ausência de processo para atendimento a titulares", "Proposta de criação de procedimento de atendimento a solicitações"] },
    { level: 2, suggestions: ["Registro de solicitação atendida de forma improvisada", "E-mail de resposta a titular sem processo formal"] },
    { level: 3, suggestions: ["Procedimento de atendimento documentado mas com aplicação inconsistente", "Registro de solicitação atendida conforme procedimento parcial"] },
    { level: 4, suggestions: ["Procedimento formal de atendimento a solicitações de titulares aprovado", "Registro de solicitação atendida dentro do prazo com documentação completa", "Relatório de solicitações recebidas e respondidas no período"] },
    { level: 5, suggestions: ["Sistema automatizado de gestão de solicitações de titulares", "Relatório de métricas de atendimento com tempo médio de resposta", "Documentação da integração do sistema com o canal de atendimento"] },
  ],

  "IA-04-Q03": [
    { level: 1, suggestions: ["Declaração informando a impossibilidade de atender solicitações de acesso", "Proposta de criação de processo de atendimento ao direito de acesso"] },
    { level: 2, suggestions: ["Registro de acesso fornecido manualmente sem processo formal", "E-mail com dados fornecidos ao titular de forma improvisada"] },
    { level: 3, suggestions: ["Processo de acesso documentado com intervenção técnica necessária", "Registro de acesso fornecido com atraso ou de forma incompleta"] },
    { level: 4, suggestions: ["Processo automatizado de fornecimento de acesso aos dados pessoais", "Registro de acesso fornecido dentro do prazo legal em formato estruturado", "Relatório de solicitações de acesso atendidas no período"] },
    { level: 5, suggestions: ["Portal de autoatendimento para acesso aos dados pessoais", "Relatório de acessos fornecidos automaticamente com auditoria", "Documentação da interface de acesso disponível para os titulares"] },
  ],

  "IA-04-Q04": [
    { level: 1, suggestions: ["Declaração informando a impossibilidade de atender solicitações de portabilidade", "Proposta de criação de processo de portabilidade de dados"] },
    { level: 2, suggestions: ["Registro de exportação manual de dados sem formato padrão", "Exemplo de dados fornecidos em formato não estruturado"] },
    { level: 3, suggestions: ["Processo de portabilidade documentado com intervenção técnica necessária", "Registro de portabilidade realizada com atraso"] },
    { level: 4, suggestions: ["Processo automatizado de portabilidade em formato estruturado", "Exemplo de arquivo de portabilidade em formato de planilha ou dados", "Registro de portabilidade realizada dentro do prazo legal"] },
    { level: 5, suggestions: ["Documentação da interface de programação de portabilidade disponível", "Especificação técnica do formato interoperável adotado", "Relatório de transferências de portabilidade realizadas automaticamente"] },
  ],

  "IA-04-Q05": [
    { level: 1, suggestions: ["Declaração informando a impossibilidade de atender solicitações de eliminação", "Proposta de criação de processo de eliminação de dados"] },
    { level: 2, suggestions: ["Registro de eliminação manual de dados sem processo formal", "E-mail de confirmação de exclusão realizada de forma improvisada"] },
    { level: 3, suggestions: ["Processo de eliminação documentado com intervenção técnica necessária", "Registro de eliminação realizada com atraso ou de forma parcial"] },
    { level: 4, suggestions: ["Processo formal de eliminação de dados com confirmação ao titular", "Registro de eliminação realizada dentro do prazo legal", "Certificado de eliminação de dados emitido para o titular"] },
    { level: 5, suggestions: ["Sistema automatizado de eliminação de dados com auditoria completa", "Relatório de eliminações realizadas automaticamente no período", "Documentação do processo automatizado de eliminação e seus efeitos"] },
  ],

  // ─── IA-05: Segurança da Informação ──────────────────────────────────────

  "IA-05-Q01": [
    { level: 1, suggestions: ["Declaração informando a ausência de política de segurança da informação", "Proposta de criação de política de segurança da informação"] },
    { level: 2, suggestions: ["Regras informais de segurança sem documentação formal", "E-mail ou comunicado sobre boas práticas de segurança"] },
    { level: 3, suggestions: ["Política de segurança documentada mas não implementada completamente", "Registro de controles de segurança existentes sem cobertura total"] },
    { level: 4, suggestions: ["Política de segurança da informação aprovada e implementada", "Relatório de auditoria de segurança realizada", "Registro de controles de segurança implementados e testados"] },
    { level: 5, suggestions: ["Relatório de monitoramento contínuo de segurança da informação", "Documentação da segurança integrada ao ciclo de desenvolvimento", "Painel de indicadores de segurança com alertas automatizados"] },
  ],

  "IA-05-Q02": [
    { level: 1, suggestions: ["Declaração informando a ausência de controles de acesso a dados pessoais", "Proposta de implementação de controles de acesso"] },
    { level: 2, suggestions: ["Registro de controles básicos de acesso sem gestão formal", "Lista de usuários com acesso a dados pessoais sem política formal"] },
    { level: 3, suggestions: ["Política de controle de acesso documentada para sistemas principais", "Registro de revisão de acessos realizada"] },
    { level: 4, suggestions: ["Política de controle de acesso implementada com autenticação e autorização", "Relatório de revisão periódica de acessos a dados pessoais", "Registro de controles de acesso por perfil de usuário"] },
    { level: 5, suggestions: ["Sistema automatizado de gestão de identidade e acesso", "Relatório de auditoria de acessos gerado automaticamente", "Documentação da integração do controle de acesso com o sistema de gestão"] },
  ],

  "IA-05-Q03": [
    { level: 1, suggestions: ["Declaração informando que dados pessoais não são criptografados", "Proposta de implementação de criptografia para dados pessoais"] },
    { level: 2, suggestions: ["Registro de criptografia aplicada a alguns dados em trânsito", "Comprovante de uso de protocolo seguro para transmissão de dados"] },
    { level: 3, suggestions: ["Registro de criptografia aplicada a dados em trânsito e alguns em repouso", "Política de criptografia documentada para sistemas principais"] },
    { level: 4, suggestions: ["Política de criptografia implementada para dados em repouso e em trânsito", "Relatório de auditoria de criptografia realizada", "Documentação dos algoritmos e chaves de criptografia utilizados"] },
    { level: 5, suggestions: ["Sistema automatizado de gestão de chaves de criptografia", "Relatório de auditoria de criptografia gerado automaticamente", "Documentação da integração da criptografia com o ciclo de desenvolvimento"] },
  ],

  "IA-05-Q04": [
    { level: 1, suggestions: ["Declaração informando a ausência de processo de gestão de vulnerabilidades", "Proposta de criação de processo de gestão de vulnerabilidades"] },
    { level: 2, suggestions: ["Registro de correção de vulnerabilidade realizada de forma reativa", "E-mail ou ticket de correção de vulnerabilidade sem processo formal"] },
    { level: 3, suggestions: ["Processo de gestão de vulnerabilidades documentado sem regularidade", "Registro de varredura de vulnerabilidades realizada"] },
    { level: 4, suggestions: ["Processo formal de gestão de vulnerabilidades e aplicação de correções", "Relatório de varredura de vulnerabilidades com correções aplicadas", "Registro de aplicação de correções dentro do prazo definido"] },
    { level: 5, suggestions: ["Sistema automatizado de detecção e correção de vulnerabilidades", "Relatório de vulnerabilidades detectadas e corrigidas automaticamente", "Documentação do processo automatizado de gestão de vulnerabilidades"] },
  ],

  "IA-05-Q05": [
    { level: 1, suggestions: ["Declaração informando a ausência de logs de acesso a dados pessoais", "Proposta de implementação de logs de acesso e auditoria"] },
    { level: 2, suggestions: ["Registro de logs básicos de acesso sem gestão formal", "Arquivo de logs de sistema sem foco em dados pessoais"] },
    { level: 3, suggestions: ["Logs de acesso a dados pessoais implementados para sistemas principais", "Política de retenção de logs documentada"] },
    { level: 4, suggestions: ["Logs de acesso e auditoria implementados para todos os sistemas com dados pessoais", "Relatório de auditoria de acessos baseado em logs", "Política de retenção e proteção de logs aprovada"] },
    { level: 5, suggestions: ["Sistema automatizado de análise de logs com alertas de anomalias", "Relatório de auditoria de acessos gerado automaticamente", "Documentação da integração dos logs com o sistema de monitoramento"] },
  ],

  // ─── IA-06: Gestão de Incidentes ─────────────────────────────────────────

  "IA-06-Q01": [
    { level: 1, suggestions: ["Declaração informando a ausência de plano de resposta a incidentes", "Proposta de criação de plano de resposta a incidentes"] },
    { level: 2, suggestions: ["Registro de incidente tratado de forma reativa sem processo formal", "E-mail ou relato de ação tomada após descoberta de incidente"] },
    { level: 3, suggestions: ["Plano de resposta a incidentes documentado mas não testado", "Procedimento de gestão de incidentes existente sem regularidade"] },
    { level: 4, suggestions: ["Plano de resposta a incidentes aprovado com equipe e responsabilidades definidas", "Ata de simulação ou teste do plano de resposta a incidentes", "Registro de incidente tratado conforme o plano formalizado"] },
    { level: 5, suggestions: ["Relatório de simulações regulares de resposta a incidentes", "Sistema automatizado de gestão de incidentes com alertas", "Documentação do processo de melhoria contínua baseado em incidentes"] },
  ],

  "IA-06-Q02": [
    { level: 1, suggestions: ["Declaração informando a ausência de processo de comunicação de incidentes", "Proposta de criação de procedimento de notificação à autoridade nacional"] },
    { level: 2, suggestions: ["Registro de comunicação de incidente realizada sem processo formal", "E-mail de notificação de incidente enviado de forma improvisada"] },
    { level: 3, suggestions: ["Procedimento de notificação documentado mas não testado", "Modelo de notificação à autoridade nacional e aos titulares"] },
    { level: 4, suggestions: ["Procedimento formal de comunicação de incidentes à autoridade nacional e titulares", "Registro de notificação de incidente realizada dentro do prazo legal", "Modelo aprovado de comunicação de incidente a titulares"] },
    { level: 5, suggestions: ["Sistema automatizado de geração de notificações de incidentes", "Relatório de notificações enviadas com rastreamento de confirmação", "Documentação do processo automatizado de comunicação de incidentes"] },
  ],

  "IA-06-Q03": [
    { level: 1, suggestions: ["Declaração informando a ausência de registro de incidentes", "Proposta de criação de registro e análise de incidentes"] },
    { level: 2, suggestions: ["Registro informal de incidente sem análise de causa raiz", "E-mail ou anotação sobre incidente ocorrido sem documentação formal"] },
    { level: 3, suggestions: ["Registro de incidentes com análise parcial de causa raiz", "Relatório de incidente com lições aprendidas para alguns casos"] },
    { level: 4, suggestions: ["Registro completo de incidentes com análise de causa raiz e lições aprendidas", "Relatório de melhoria contínua baseado em análise de incidentes", "Procedimento formal de registro e análise de incidentes aprovado"] },
    { level: 5, suggestions: ["Sistema automatizado de registro e análise de incidentes", "Relatório de tendências de incidentes gerado automaticamente", "Documentação do processo de melhoria contínua baseado em análise de incidentes"] },
  ],

  "IA-06-Q04": [
    { level: 1, suggestions: ["Declaração informando a ausência de monitoramento de incidentes", "Proposta de implementação de monitoramento contínuo de segurança"] },
    { level: 2, suggestions: ["Registro de verificação manual de segurança sem regularidade", "Relatório de verificação pontual de segurança sem continuidade"] },
    { level: 3, suggestions: ["Ferramentas de monitoramento implementadas para sistemas principais", "Relatório de alertas de segurança gerados no período"] },
    { level: 4, suggestions: ["Sistema de monitoramento contínuo implementado para todos os sistemas", "Relatório de alertas de segurança com respostas documentadas", "Procedimento de resposta a alertas de monitoramento aprovado"] },
    { level: 5, suggestions: ["Sistema automatizado de detecção e resposta a incidentes", "Relatório de incidentes detectados e respondidos automaticamente", "Documentação da integração do monitoramento com o sistema de resposta a incidentes"] },
  ],

  // ─── IA-07: Gestão de Terceiros ──────────────────────────────────────────

  "IA-07-Q01": [
    { level: 1, suggestions: ["Declaração informando a ausência de processo de avaliação de terceiros", "Proposta de criação de processo de avaliação de privacidade para terceiros"] },
    { level: 2, suggestions: ["Registro de avaliação informal realizada para terceiro específico", "E-mail ou anotação sobre avaliação ad-hoc de fornecedor"] },
    { level: 3, suggestions: ["Questionário de avaliação de privacidade de terceiros existente", "Registro de questionário aplicado a terceiro sem obrigatoriedade formal"] },
    { level: 4, suggestions: ["Processo formalizado de avaliação de privacidade para seleção de terceiros", "Relatório de avaliação de terceiro com classificação de risco de privacidade", "Procedimento documentado de avaliação prévia à contratação"] },
    { level: 5, suggestions: ["Painel de monitoramento contínuo de conformidade de terceiros", "Relatório de reavaliação periódica de terceiros", "Documentação do sistema automatizado de avaliação e monitoramento de terceiros"] },
  ],

  "IA-07-Q02": [
    { level: 1, suggestions: ["Contrato com terceiro que não menciona proteção de dados", "Declaração informando a ausência de cláusulas de proteção de dados nos contratos"] },
    { level: 2, suggestions: ["Contrato com cláusula genérica de confidencialidade apenas", "Exemplo de contrato com proteção de dados apenas superficial"] },
    { level: 3, suggestions: ["Contrato com cláusulas de proteção de dados específicas mas inconsistentes", "Modelo de cláusula de privacidade utilizado em alguns contratos"] },
    { level: 4, suggestions: ["Modelo padronizado de acordo de processamento de dados utilizado nos contratos", "Contrato com cláusulas completas de proteção de dados aprovado", "Registro de contratos revisados com cláusulas de privacidade padronizadas"] },
    { level: 5, suggestions: ["Sistema automatizado de gestão contratual com verificação de cláusulas de privacidade", "Relatório de contratos com cláusulas de privacidade atualizadas", "Documentação do processo automatizado de renovação e revisão de contratos"] },
  ],

  "IA-07-Q03": [
    { level: 1, suggestions: ["Declaração informando a ausência de inventário de terceiros", "Proposta de criação de inventário de terceiros que tratam dados pessoais"] },
    { level: 2, suggestions: ["Lista informal de alguns fornecedores que acessam dados pessoais", "E-mail ou planilha com alguns terceiros identificados"] },
    { level: 3, suggestions: ["Inventário parcial de terceiros que tratam dados pessoais", "Tabela de terceiros com tipos de dados compartilhados"] },
    { level: 4, suggestions: ["Inventário completo de todos os terceiros que tratam dados pessoais", "Registro de dados compartilhados com cada terceiro e base legal", "Procedimento formal de atualização do inventário de terceiros"] },
    { level: 5, suggestions: ["Sistema automatizado de gestão do inventário de terceiros", "Relatório de terceiros com dados pessoais gerado automaticamente", "Documentação da integração do inventário com o processo de contratação"] },
  ],

  "IA-07-Q04": [
    { level: 1, suggestions: ["Declaração informando que terceiros não são monitorados quanto à conformidade", "Proposta de criação de processo de monitoramento de terceiros"] },
    { level: 2, suggestions: ["Registro de verificação pontual de terceiro sem processo formal", "E-mail ou anotação sobre verificação de conformidade de fornecedor"] },
    { level: 3, suggestions: ["Processo de monitoramento de terceiros documentado sem regularidade", "Relatório de verificação de conformidade de alguns terceiros"] },
    { level: 4, suggestions: ["Processo formal de monitoramento periódico de terceiros quanto à conformidade", "Relatório de monitoramento de terceiros com ações corretivas documentadas", "Registro de reavaliação de terceiros realizada no período"] },
    { level: 5, suggestions: ["Sistema automatizado de monitoramento contínuo de conformidade de terceiros", "Relatório de conformidade de terceiros gerado automaticamente", "Documentação do processo automatizado de alertas de não conformidade de terceiros"] },
  ],

  // ─── IA-08: Treinamento e Conscientização ────────────────────────────────

  "IA-08-Q01": [
    { level: 1, suggestions: ["Declaração informando a ausência de programa de treinamento em proteção de dados", "Proposta de criação de programa de treinamento em privacidade"] },
    { level: 2, suggestions: ["Registro de treinamento pontual realizado sem programa formal", "Material de treinamento informal sobre proteção de dados"] },
    { level: 3, suggestions: ["Programa de treinamento documentado para algumas áreas", "Registro de treinamento realizado para colaboradores de áreas específicas"] },
    { level: 4, suggestions: ["Programa de treinamento em proteção de dados para todos os colaboradores", "Registro de participação de todos os colaboradores no treinamento", "Certificado de conclusão de treinamento em proteção de dados"] },
    { level: 5, suggestions: ["Plataforma de treinamento com módulos automatizados de privacidade", "Relatório de conclusão de treinamentos com métricas de desempenho", "Documentação do programa de treinamento integrado ao sistema de gestão de pessoas"] },
  ],

  "IA-08-Q02": [
    { level: 1, suggestions: ["Declaração informando que novos colaboradores não recebem treinamento de privacidade", "Proposta de inclusão de treinamento de privacidade no processo de integração"] },
    { level: 2, suggestions: ["Registro de treinamento de privacidade realizado para alguns novos colaboradores", "Material de integração com menção superficial à proteção de dados"] },
    { level: 3, suggestions: ["Módulo de privacidade incluído no processo de integração de novos colaboradores", "Registro de treinamento de privacidade realizado na integração"] },
    { level: 4, suggestions: ["Treinamento de privacidade obrigatório no processo de integração documentado", "Registro de conclusão do treinamento de privacidade por todos os novos colaboradores", "Certificado de conclusão do treinamento de integração em privacidade"] },
    { level: 5, suggestions: ["Módulo automatizado de treinamento de privacidade no sistema de integração", "Relatório de conclusão de treinamento de privacidade por novos colaboradores", "Documentação da integração do treinamento com o sistema de gestão de pessoas"] },
  ],

  "IA-08-Q03": [
    { level: 1, suggestions: ["Declaração informando a ausência de campanhas de conscientização sobre privacidade", "Proposta de criação de programa de conscientização em privacidade"] },
    { level: 2, suggestions: ["Registro de comunicado pontual sobre privacidade enviado aos colaboradores", "E-mail ou boletim informativo sobre proteção de dados enviado"] },
    { level: 3, suggestions: ["Registro de campanha de conscientização realizada no período", "Material de campanha de conscientização sobre privacidade"] },
    { level: 4, suggestions: ["Programa de campanhas periódicas de conscientização documentado", "Registro de campanhas realizadas com alcance documentado", "Relatório de engajamento nas campanhas de conscientização"] },
    { level: 5, suggestions: ["Plataforma automatizada de campanhas de conscientização em privacidade", "Relatório de alcance e engajamento das campanhas gerado automaticamente", "Documentação do programa de conscientização integrado ao calendário corporativo"] },
  ],

  "IA-08-Q04": [
    { level: 1, suggestions: ["Declaração informando que a efetividade dos treinamentos não é avaliada", "Proposta de criação de processo de avaliação de efetividade de treinamentos"] },
    { level: 2, suggestions: ["Registro de avaliação informal de treinamento sem critérios formais", "Pesquisa de satisfação aplicada após treinamento sem análise de efetividade"] },
    { level: 3, suggestions: ["Avaliação de conhecimento aplicada ao final dos treinamentos", "Relatório de resultados de avaliações de treinamento"] },
    { level: 4, suggestions: ["Processo formal de avaliação de efetividade de treinamentos com métricas definidas", "Relatório de efetividade dos treinamentos com plano de melhoria", "Registro de avaliações de conhecimento com resultados documentados"] },
    { level: 5, suggestions: ["Sistema automatizado de avaliação de efetividade de treinamentos", "Relatório de métricas de efetividade gerado automaticamente", "Documentação do processo de melhoria contínua dos treinamentos baseado em métricas"] },
  ],

  // ─── IA-09: Privacy by Design ─────────────────────────────────────────────

  "IA-09-Q01": [
    { level: 1, suggestions: ["Declaração informando que novos projetos não passam por avaliação de impacto", "Proposta de criação de processo de avaliação de impacto à proteção de dados"] },
    { level: 2, suggestions: ["Registro de avaliação de impacto realizada de forma improvisada para projeto específico", "Documento de análise de risco sem metodologia padronizada"] },
    { level: 3, suggestions: ["Modelo de avaliação de impacto existente mas não obrigatório", "Avaliação de impacto realizada para alguns projetos de alto risco"] },
    { level: 4, suggestions: ["Avaliação de impacto à proteção de dados obrigatória para novos projetos", "Registro de avaliação de impacto concluída antes do início do tratamento", "Procedimento formal de avaliação de impacto aprovado pela organização"] },
    { level: 5, suggestions: ["Avaliação de impacto integrada ao ciclo de desenvolvimento ágil", "Relatório de avaliações de impacto realizadas no período", "Documentação da integração da avaliação de impacto ao processo de gestão de projetos"] },
  ],

  "IA-09-Q02": [
    { level: 1, suggestions: ["Declaração informando a ausência de checklist de privacidade para desenvolvimento", "Proposta de criação de checklist de privacidade para novos sistemas"] },
    { level: 2, suggestions: ["Lista informal de verificações de privacidade para desenvolvimento", "E-mail ou anotação sobre verificações de privacidade realizadas em projeto"] },
    { level: 3, suggestions: ["Checklist de privacidade documentado para desenvolvimento de sistemas", "Registro de checklist aplicado em projeto de desenvolvimento"] },
    { level: 4, suggestions: ["Checklist de privacidade obrigatório integrado ao processo de desenvolvimento", "Registro de checklist concluído para todos os novos sistemas", "Procedimento formal de revisão de privacidade no desenvolvimento aprovado"] },
    { level: 5, suggestions: ["Sistema automatizado de verificação de privacidade no desenvolvimento", "Relatório de verificações de privacidade realizadas automaticamente", "Documentação da integração do checklist com o sistema de gestão de desenvolvimento"] },
  ],

  "IA-09-Q03": [
    { level: 1, suggestions: ["Declaração informando que minimização de dados não é considerada", "Proposta de implementação do princípio de minimização de dados"] },
    { level: 2, suggestions: ["Registro de revisão pontual de dados coletados sem processo formal", "E-mail ou anotação sobre redução de dados coletados em processo específico"] },
    { level: 3, suggestions: ["Política de minimização de dados documentada para alguns processos", "Registro de revisão de dados coletados com redução documentada"] },
    { level: 4, suggestions: ["Política de minimização de dados implementada em todos os processos", "Relatório de revisão de dados coletados com justificativa de necessidade", "Registro de dados eliminados por não serem necessários à finalidade"] },
    { level: 5, suggestions: ["Sistema automatizado de verificação de minimização de dados", "Relatório de dados coletados versus dados necessários gerado automaticamente", "Documentação do processo automatizado de revisão de minimização de dados"] },
  ],

  "IA-09-Q04": [
    { level: 1, suggestions: ["Declaração informando a ausência de política de retenção de dados", "Proposta de criação de política de retenção e descarte de dados"] },
    { level: 2, suggestions: ["Registro de descarte realizado de forma pontual sem critérios formais", "E-mail ou anotação sobre exclusão de dados realizada ad-hoc"] },
    { level: 3, suggestions: ["Política de retenção documentada mas não aplicada consistentemente", "Tabela de prazos de retenção por tipo de dado"] },
    { level: 4, suggestions: ["Política de retenção formalizada com prazos definidos e processo de descarte", "Registro de revisão periódica da necessidade de retenção de dados", "Relatório de dados descartados conforme a política de retenção"] },
    { level: 5, suggestions: ["Sistema automatizado de gestão de retenção e descarte de dados", "Relatório de dados descartados automaticamente por vencimento do prazo", "Documentação do processo automatizado de revisão e descarte de dados"] },
  ],

  "IA-09-Q05": [
    { level: 1, suggestions: ["Declaração informando que privacidade não é considerada na arquitetura de sistemas", "Proposta de implementação de privacidade por padrão nos sistemas"] },
    { level: 2, suggestions: ["Registro de configuração de privacidade ajustada manualmente em sistema específico", "E-mail ou anotação sobre configuração de privacidade realizada"] },
    { level: 3, suggestions: ["Política de privacidade por padrão documentada para alguns sistemas", "Registro de configurações de privacidade mais restritivas aplicadas"] },
    { level: 4, suggestions: ["Política de privacidade por padrão implementada em todos os sistemas", "Documentação das configurações de privacidade padrão de cada sistema", "Relatório de revisão de configurações de privacidade realizada"] },
    { level: 5, suggestions: ["Sistema automatizado de verificação de configurações de privacidade por padrão", "Relatório de configurações de privacidade auditadas automaticamente", "Documentação da integração da privacidade por padrão com o processo de desenvolvimento"] },
  ],
};
