// Sugestões de evidências para a Avaliação de Conformidade LGPD
// Baseado nos domínios do assessmentData.ts (IDs "1.1", "1.2", "2.1" etc.)
// Arquivo somente de dados visuais — não altera nenhuma lógica de avaliação

export type EvidenceSuggestionConformidade = {
  nivel: number;
  sugestoes: string[];
};

export const EVIDENCE_SUGGESTIONS_CONFORMIDADE: Record<string, EvidenceSuggestionConformidade[]> = {

  // ─── Domínio 1: Governança e Responsabilização ────────────────────────────

  "1.1": [
    {
      nivel: 1,
      sugestoes: [
        "Declaração interna informando a ausência de estrutura de governança de privacidade",
        "Proposta de criação de estrutura de governança de privacidade",
      ],
    },
    {
      nivel: 2,
      sugestoes: [
        "Registro de iniciativas isoladas de privacidade (e-mails, atas de reunião)",
        "Documento de diagnóstico inicial de privacidade sem coordenação central",
      ],
    },
    {
      nivel: 3,
      sugestoes: [
        "Organograma com papéis de privacidade definidos no papel",
        "Política de privacidade aprovada mas sem recursos ou equipe dedicada",
      ],
    },
    {
      nivel: 4,
      sugestoes: [
        "Organograma com papéis e responsabilidades de privacidade formalizados",
        "Orçamento dedicado à privacidade documentado",
        "Política de privacidade aprovada pela alta direção com papéis claros",
      ],
    },
    {
      nivel: 5,
      sugestoes: [
        "Painel de métricas de governança de privacidade integrado à estratégia",
        "Relatório executivo de privacidade com indicadores automatizados",
        "Documentação da integração da privacidade ao planejamento estratégico",
      ],
    },
  ],

  "1.2": [
    {
      nivel: 1,
      sugestoes: [
        "Declaração informando a ausência de encarregado nomeado",
        "Proposta de nomeação do encarregado de proteção de dados",
      ],
    },
    {
      nivel: 2,
      sugestoes: [
        "Registro de consulta ao encarregado após ocorrência de problema",
        "E-mail de acionamento do encarregado em situação reativa",
      ],
    },
    {
      nivel: 3,
      sugestoes: [
        "Registro de consulta ao encarregado em projetos selecionados",
        "Ata de reunião com participação do encarregado em projeto específico",
      ],
    },
    {
      nivel: 4,
      sugestoes: [
        "Procedimento formal de consulta ao encarregado antes de novos projetos",
        "Registro de parecer do encarregado em projeto relevante",
        "Fluxo de aprovação documentado com etapa obrigatória do encarregado",
      ],
    },
    {
      nivel: 5,
      sugestoes: [
        "Captura de tela do sistema de gestão de projetos com etapa automática do encarregado",
        "Relatório de pareceres emitidos pelo encarregado no período",
        "Documentação da integração do encarregado ao fluxo de gestão de projetos",
      ],
    },
  ],

  "1.3": [
    {
      nivel: 1,
      sugestoes: [
        "Declaração informando a ausência de processo de avaliação de impacto",
        "Proposta de criação de metodologia de avaliação de impacto",
      ],
    },
    {
      nivel: 2,
      sugestoes: [
        "Avaliação de impacto improvisada realizada para projeto específico",
        "Documento de análise de risco sem modelo padronizado",
      ],
    },
    {
      nivel: 3,
      sugestoes: [
        "Modelo de avaliação de impacto à proteção de dados existente",
        "Avaliação de impacto preenchida burocraticamente para projeto",
      ],
    },
    {
      nivel: 4,
      sugestoes: [
        "Avaliação de impacto à proteção de dados concluída com metodologia formalizada",
        "Registro de aprovação da avaliação de impacto antes do início do tratamento",
        "Modelo padronizado de avaliação de impacto aprovado pela organização",
      ],
    },
    {
      nivel: 5,
      sugestoes: [
        "Documentação da integração da avaliação de impacto ao ciclo de desenvolvimento",
        "Relatório de avaliações de impacto realizadas no período",
        "Captura de tela do sistema ágil com etapa de avaliação de impacto integrada",
      ],
    },
  ],

  // ─── Domínio 2: Gestão de Registros ──────────────────────────────────────

  "2.1": [
    {
      nivel: 1,
      sugestoes: [
        "Declaração informando a ausência de inventário de dados pessoais",
        "Proposta de criação do registro de atividades de tratamento",
      ],
    },
    {
      nivel: 2,
      sugestoes: [
        "Planilha parcial e desatualizada com alguns dados mapeados",
        "Documento informal com lista de alguns tratamentos de dados",
      ],
    },
    {
      nivel: 3,
      sugestoes: [
        "Registro de atividades de tratamento cobrindo a maioria dos processos",
        "Inventário de dados com revisão esporádica documentada",
      ],
    },
    {
      nivel: 4,
      sugestoes: [
        "Registro completo de atividades de tratamento com responsáveis definidos",
        "Histórico de revisões periódicas do inventário com datas",
        "Inventário de dados aprovado e atualizado conforme o artigo 37 da Lei Geral de Proteção de Dados",
      ],
    },
    {
      nivel: 5,
      sugestoes: [
        "Captura de tela do sistema automatizado de gestão de inventário",
        "Relatório de alertas de mudanças no inventário gerado automaticamente",
        "Documentação da integração do inventário com os sistemas da organização",
      ],
    },
  ],

  "2.2": [
    {
      nivel: 1,
      sugestoes: [
        "Declaração informando que dados são mantidos indefinidamente sem política de descarte",
        "Proposta de criação de política de retenção e descarte",
      ],
    },
    {
      nivel: 2,
      sugestoes: [
        "Registro de descarte realizado de forma pontual sem critérios formais",
        "E-mail ou anotação sobre exclusão de dados realizada ad-hoc",
      ],
    },
    {
      nivel: 3,
      sugestoes: [
        "Política de retenção documentada mas não aplicada consistentemente",
        "Tabela de prazos de retenção por tipo de dado",
      ],
    },
    {
      nivel: 4,
      sugestoes: [
        "Política de retenção formalizada com prazos definidos por categoria de dado",
        "Registro de descarte automatizado realizado conforme a política",
        "Relatório de dados excluídos por vencimento do prazo de retenção",
      ],
    },
    {
      nivel: 5,
      sugestoes: [
        "Relatório de auditoria do ciclo de vida dos dados totalmente automatizado",
        "Documentação do sistema de gestão automatizada de retenção e descarte",
        "Certificado de destruição de dados gerado automaticamente",
      ],
    },
  ],

  // ─── Domínio 3: Segurança da Informação ──────────────────────────────────

  "3.1": [
    {
      nivel: 1,
      sugestoes: [
        "Declaração informando a ausência de medidas de segurança para dados pessoais",
        "Proposta de criação de programa de segurança da informação",
      ],
    },
    {
      nivel: 2,
      sugestoes: [
        "Licença ou comprovante de antivírus e firewall instalados",
        "Registro de medidas básicas de segurança implementadas",
      ],
    },
    {
      nivel: 3,
      sugestoes: [
        "Política de segurança da informação documentada",
        "Registro de controles de segurança existentes sem testes regulares",
      ],
    },
    {
      nivel: 4,
      sugestoes: [
        "Relatório de teste de penetração ou auditoria de segurança realizada",
        "Programa de segurança documentado com controles técnicos e organizacionais",
        "Certificado de auditoria de segurança da informação",
      ],
    },
    {
      nivel: 5,
      sugestoes: [
        "Documentação da segurança integrada ao ciclo de desenvolvimento",
        "Relatório de resposta automatizada a incidentes de segurança",
        "Painel de monitoramento contínuo de segurança da informação",
      ],
    },
  ],

  "3.2": [
    {
      nivel: 1,
      sugestoes: [
        "Declaração informando a ausência de processo de gestão de incidentes",
        "Proposta de criação de plano de resposta a incidentes",
      ],
    },
    {
      nivel: 2,
      sugestoes: [
        "Registro de incidente tratado de forma reativa sem processo formal",
        "E-mail ou relato de ação tomada após descoberta de incidente",
      ],
    },
    {
      nivel: 3,
      sugestoes: [
        "Plano de resposta a incidentes documentado",
        "Procedimento de gestão de incidentes existente mas não testado",
      ],
    },
    {
      nivel: 4,
      sugestoes: [
        "Plano de resposta a incidentes com equipe e comunicação definidas",
        "Registro de incidente tratado conforme o processo formalizado",
        "Ata de simulação ou teste do plano de resposta a incidentes",
      ],
    },
    {
      nivel: 5,
      sugestoes: [
        "Relatório de simulações regulares de resposta a incidentes",
        "Documentação do sistema automatizado de gestão de incidentes",
        "Painel de monitoramento de incidentes com resposta automatizada",
      ],
    },
  ],

  // ─── Domínio 4: Direitos dos Titulares ───────────────────────────────────

  "4.1": [
    {
      nivel: 1,
      sugestoes: [
        "Declaração informando a ausência de canal para exercício de direitos dos titulares",
        "Proposta de criação de canal de atendimento a titulares",
      ],
    },
    {
      nivel: 2,
      sugestoes: [
        "Registro de solicitação atendida por canal genérico sem divulgação",
        "Exemplo de resposta a titular por canal de difícil acesso",
      ],
    },
    {
      nivel: 3,
      sugestoes: [
        "Canal de atendimento a titulares disponível e divulgado",
        "Registro de solicitação atendida com tempo de resposta inconsistente",
      ],
    },
    {
      nivel: 4,
      sugestoes: [
        "Canal formalizado com prazo de resposta definido e documentado",
        "Registro de solicitações atendidas dentro do prazo legal de 15 dias",
        "Relatório de rastreamento de solicitações de titulares",
      ],
    },
    {
      nivel: 5,
      sugestoes: [
        "Captura de tela do portal de autoatendimento para titulares",
        "Relatório de métricas de satisfação no atendimento a titulares",
        "Documentação do sistema automatizado de atendimento a solicitações",
      ],
    },
  ],

  "4.2": [
    {
      nivel: 1,
      sugestoes: [
        "Declaração informando a impossibilidade de exportar dados dos titulares",
        "Proposta de criação de processo de portabilidade de dados",
      ],
    },
    {
      nivel: 2,
      sugestoes: [
        "Registro de exportação manual de dados realizada sem formato padrão",
        "Exemplo de dados fornecidos em formato não estruturado",
      ],
    },
    {
      nivel: 3,
      sugestoes: [
        "Registro de exportação de dados com intervenção técnica necessária",
        "Procedimento documentado de portabilidade que requer suporte técnico",
      ],
    },
    {
      nivel: 4,
      sugestoes: [
        "Exemplo de arquivo de portabilidade em formato estruturado (planilha ou arquivo de dados)",
        "Procedimento automatizado de exportação de dados documentado",
        "Registro de portabilidade realizada dentro do prazo",
      ],
    },
    {
      nivel: 5,
      sugestoes: [
        "Documentação da interface de programação de portabilidade disponível",
        "Especificação técnica do formato interoperável adotado",
        "Relatório de transferências de portabilidade realizadas",
      ],
    },
  ],

  // ─── Domínio 5: Transparência e Comunicação ──────────────────────────────

  "5.1": [
    {
      nivel: 1,
      sugestoes: [
        "Declaração informando a ausência de política de privacidade publicada",
        "Proposta de criação e publicação de política de privacidade",
      ],
    },
    {
      nivel: 2,
      sugestoes: [
        "Política de privacidade genérica ou desatualizada publicada",
        "Exemplo da política existente com linguagem inadequada ou desatualizada",
      ],
    },
    {
      nivel: 3,
      sugestoes: [
        "Política de privacidade específica publicada com linguagem técnica",
        "Documento da política com linguagem jurídica de difícil compreensão",
      ],
    },
    {
      nivel: 4,
      sugestoes: [
        "Política de privacidade em linguagem acessível publicada e revisada",
        "Histórico de revisões periódicas da política com datas",
        "Registro de comunicação proativa da política aos titulares",
      ],
    },
    {
      nivel: 5,
      sugestoes: [
        "Política de privacidade em múltiplos formatos (texto, vídeo, resumo)",
        "Histórico de versões com controle de mudanças documentado",
        "Registro de comunicação proativa de atualizações da política",
      ],
    },
  ],

  // ─── Domínio 6: Gestão de Terceiros ──────────────────────────────────────

  "6.1": [
    {
      nivel: 1,
      sugestoes: [
        "Declaração informando a ausência de avaliação de fornecedores quanto a dados pessoais",
        "Proposta de criação de processo de avaliação de fornecedores",
      ],
    },
    {
      nivel: 2,
      sugestoes: [
        "Registro de avaliação informal realizada para fornecedor crítico",
        "E-mail ou anotação sobre avaliação ad-hoc de fornecedor",
      ],
    },
    {
      nivel: 3,
      sugestoes: [
        "Questionário de avaliação de privacidade de fornecedores existente",
        "Registro de questionário aplicado a fornecedor sem obrigatoriedade formal",
      ],
    },
    {
      nivel: 4,
      sugestoes: [
        "Processo formalizado de avaliação de fornecedores com critérios de aprovação",
        "Relatório de avaliação de fornecedor com classificação de risco",
        "Procedimento documentado de avaliação prévia à contratação",
      ],
    },
    {
      nivel: 5,
      sugestoes: [
        "Painel de monitoramento contínuo de conformidade de fornecedores",
        "Relatório de reavaliação periódica de fornecedores",
        "Documentação do sistema automatizado de avaliação e monitoramento",
      ],
    },
  ],

  "6.2": [
    {
      nivel: 1,
      sugestoes: [
        "Contrato com fornecedor que não menciona proteção de dados",
        "Declaração informando a ausência de cláusulas de proteção de dados nos contratos",
      ],
    },
    {
      nivel: 2,
      sugestoes: [
        "Contrato com cláusula genérica de confidencialidade",
        "Exemplo de contrato com proteção de dados apenas superficial",
      ],
    },
    {
      nivel: 3,
      sugestoes: [
        "Contrato com cláusulas de proteção de dados específicas mas inconsistentes",
        "Modelo de cláusula de privacidade utilizado em alguns contratos",
      ],
    },
    {
      nivel: 4,
      sugestoes: [
        "Modelo padronizado de acordo de processamento de dados utilizado nos contratos",
        "Contrato com cláusulas completas de proteção de dados",
        "Registro de contratos revisados com cláusulas de privacidade padronizadas",
      ],
    },
    {
      nivel: 5,
      sugestoes: [
        "Captura de tela do sistema de gestão contratual com alertas de vencimento",
        "Relatório de contratos com cláusulas de privacidade atualizadas",
        "Documentação do processo automatizado de renovação e revisão de contratos",
      ],
    },
  ],
};
