// ==================== NÍVEIS DE MATURIDADE (Conformidade PPPD) ====================
export const niveisMaturidade = [
  { nivel: 1, nome: 'Não Iniciado', risco: 25, probabilidade: 5, impacto: 5, cor: '#dc2626', corFundo: '#fef2f2', descricao: 'Ações inexistentes ou totalmente improvisadas' },
  { nivel: 2, nome: 'Iniciado', risco: 16, probabilidade: 4, impacto: 4, cor: '#ea580c', corFundo: '#fff7ed', descricao: 'Iniciativas isoladas, sem coordenação central' },
  { nivel: 3, nome: 'Emergente', risco: 9, probabilidade: 3, impacto: 3, cor: '#eab308', corFundo: '#fefce8', descricao: 'Estrutura existe, mas carece de recursos efetivos' },
  { nivel: 4, nome: 'Desenvolvido', risco: 4, probabilidade: 2, impacto: 2, cor: '#22c55e', corFundo: '#f0fdf4', descricao: 'Resposta esperada - Controles operacionais robustos' },
  { nivel: 5, nome: 'Otimizado', risco: 1, probabilidade: 1, impacto: 1, cor: '#0ea5e9', corFundo: '#f0f9ff', descricao: 'Referência de excelência com melhoria contínua' }
];

// ==================== FRAMEWORKS DE AVALIAÇÃO ====================
export const frameworksDisponiveis = {
  misto: {
    id: 'misto',
    nome: 'Modelo Integrado',
    descricao: 'Combina as melhores práticas dos modelos SGD (Brasil), ICO (Reino Unido) e CNIL (França)',
    cor: '#5f29cc',
    icone: '🌐'
  },
  sgd: {
    id: 'sgd',
    nome: 'SGD Brasil',
    descricao: 'Modelo de Maturidade em Dados da Secretaria de Governo Digital do Brasil',
    cor: '#009c3b',
    icone: '🇧🇷'
  },
  ico: {
    id: 'ico',
    nome: 'ICO Reino Unido',
    descricao: 'Accountability Framework do Information Commissioner Office',
    cor: '#1d4ed8',
    icone: '🇬🇧'
  },
  cnil: {
    id: 'cnil',
    nome: 'CNIL França',
    descricao: 'Modelo de Maturidade da Commission Nationale de Informatique et des Libertés',
    cor: '#0055a4',
    icone: '🇫🇷'
  },
  seusdados: {
    id: 'seusdados',
    nome: 'Framework SeusDados',
    descricao: 'Avaliação de Maturidade em Privacidade, Segurança e IA - 5 domínios e 39 questões',
    cor: '#7c3aed',
    icone: '📊'
  }
};

// ==================== CLASSIFICAÇÃO DE RISCO (Due Diligence Terceiros) ====================
export const classificacaoRisco = [
  { min: 1, max: 4, nome: 'Baixo', cor: '#22c55e', corFundo: '#f0fdf4', descricao: 'Risco aceitável; conformidade padrão' },
  { min: 5, max: 9, nome: 'Moderado', cor: '#eab308', corFundo: '#fefce8', descricao: 'Requer cláusulas contratuais de indenização ou ajustes operacionais' },
  { min: 10, max: 14, nome: 'Alto', cor: '#f97316', corFundo: '#fff7ed', descricao: 'Requer Plano de Ação obrigatório antes da assinatura' },
  { min: 15, max: 19, nome: 'Crítico', cor: '#dc2626', corFundo: '#fef2f2', descricao: 'Riscos elevados que exigem ação imediata e monitoramento contínuo' },
  { min: 20, max: 25, nome: 'Muito Crítico', cor: '#991b1b', corFundo: '#fef2f2', descricao: 'Inviabiliza a contratação - Riscos inaceitáveis' }
];

export const getClassificacaoRisco = (pontuacao: number) => {
  return classificacaoRisco.find(c => pontuacao >= c.min && pontuacao <= c.max) || classificacaoRisco[0];
};

// ==================== DOMÍNIOS DE CONFORMIDADE PPPD ====================
export const dominiosConformidade = [
  {
    id: 1,
    titulo: "Governança e Responsabilização",
    tituloICO: "Leadership and Oversight",
    responsavel: "Alta Direção / Encarregado",
    objetivo: "Estrutura organizacional para proteção de dados",
    questoes: [
      {
        id: "1.1",
        questao: "A organização possui estrutura de governança de privacidade formalizada?",
        frameworks: {
          sgd: { fundamento: "Modelo de Maturidade em Dados - Tema Estrutura Organizacional", regra: "Nível 4 exige estrutura formalizada com papéis e responsabilidades definidos." },
          ico: { fundamento: "Accountability Framework - Leadership and Oversight", regra: "A alta administração deve demonstrar comprometimento com a proteção de dados." },
          cnil: { fundamento: "Atividade Tipo 1: Pilotage de la Conformité", regra: "A função de pilotagem deve ser padronizada e não depender apenas da pessoa do Encarregado." }
        },
        opcoes: [
          { nivel: 1, texto: "Não existe estrutura de governança de privacidade. Proteção de dados é tratada de forma ad-hoc." },
          { nivel: 2, texto: "Iniciativas isoladas existem, sem coordenação central ou orçamento definido. Gestão é reativa." },
          { nivel: 3, texto: "A estrutura existe no papel, mas carece de recursos efetivos ou adesão cultural." },
          { nivel: 4, texto: "Estrutura formalizada, com papéis claros, recursos alocados e documentação robusta." },
          { nivel: 5, texto: "Governança é referência, integrada à estratégia de negócio, com automação de métricas." }
        ]
      },
      {
        id: "1.2",
        questao: "O Encarregado é consultado formalmente em projetos e mudanças de processos?",
        frameworks: {
          sgd: { fundamento: "Modelo de Maturidade em Dados - Tema Estrutura Organizacional", regra: "O nível 4 exige que o Encarregado tenha competência e responsabilidade formalizada." },
          ico: { fundamento: "Accountability Framework - Data Protection Officers", regra: "O Encarregado deve reportar ao mais alto nível e operar com independência funcional." },
          cnil: { fundamento: "Atividade Tipo 1: Pilotage", regra: "A função de pilotagem deve ser padronizada." }
        },
        opcoes: [
          { nivel: 1, texto: "Encarregado não nomeado ou totalmente ignorado pela gestão." },
          { nivel: 2, texto: "Encarregado é consultado apenas quando ocorrem problemas (reativo)." },
          { nivel: 3, texto: "Encarregado é consultado na maioria dos projetos, mas o processo não é obrigatório." },
          { nivel: 4, texto: "Processo formal exige parecer do Encarregado antes do início de projetos relevantes." },
          { nivel: 5, texto: "A consulta ao Encarregado é automatizada no fluxo de gestão de projetos." }
        ]
      },
      {
        id: "1.3",
        questao: "Existe um processo documentado para realização de Relatório de Impacto à Proteção de Dados?",
        frameworks: {
          sgd: { fundamento: "Guia de Elaboração de RIPD", regra: "Ausência de RIPD em alto risco é infração grave." },
          ico: { fundamento: "Accountability Framework e Artigo 35 UK GDPR", regra: "Obrigatório para alto risco." },
          cnil: { fundamento: "Metodologia de Análise de Impacto", regra: "O processo deve determinar medidas para reduzir riscos." }
        },
        opcoes: [
          { nivel: 1, texto: "Não se sabe o que é RIPD. Novos tratamentos de alto risco iniciam sem análise prévia." },
          { nivel: 2, texto: "RIPD é feito de forma improvisada, sem modelo padrão." },
          { nivel: 3, texto: "Existe modelo de RIPD, mas é preenchido apenas burocraticamente." },
          { nivel: 4, texto: "Metodologia de RIPD formalizada é aplicada antes do tratamento." },
          { nivel: 5, texto: "O RIPD é integrado ao ciclo de vida de desenvolvimento ágil." }
        ]
      }
    ]
  },
  {
    id: 2,
    titulo: "Gestão de Registros",
    tituloICO: "Records Management",
    responsavel: "Gestão da Informação / Encarregado",
    objetivo: "Mapeamento do ciclo de vida dos dados e inventário completo",
    questoes: [
      {
        id: "2.1",
        questao: "A organização mantém um Registro das Operações de Tratamento atualizado?",
        frameworks: {
          sgd: { fundamento: "Modelo de Maturidade em Dados - Dimensão Conhecimento sobre os Dados", regra: "Nível 4 exige que a maioria dos dados críticos esteja documentada." },
          ico: { fundamento: "Artigo 30 UK GDPR", regra: "Deve cobrir propósitos, compartilhamento e retenção." },
          cnil: { fundamento: "Atividade Tipo 2: Registre des Traitements", regra: "O registro deve ser mantido atualizado." }
        },
        opcoes: [
          { nivel: 1, texto: "Não existe inventário de dados. Desconhece-se quais dados são tratados." },
          { nivel: 2, texto: "Inventário parcial existe em planilhas isoladas, desatualizado." },
          { nivel: 3, texto: "Registro existe e cobre a maioria dos tratamentos, mas revisão é esporádica." },
          { nivel: 4, texto: "Registro completo, revisado periodicamente, com responsáveis definidos." },
          { nivel: 5, texto: "Registro automatizado, integrado aos sistemas, com alertas de mudanças." }
        ]
      },
      {
        id: "2.2",
        questao: "Existe política de retenção e descarte de dados pessoais?",
        frameworks: {
          sgd: { fundamento: "Modelo de Maturidade em Dados - Ciclo de Vida", regra: "Nível 4 exige política de retenção documentada." },
          ico: { fundamento: "Storage Limitation Principle", regra: "Dados não devem ser mantidos por mais tempo que o necessário." },
          cnil: { fundamento: "Atividade Tipo 3: Gestion des Durées", regra: "Períodos de retenção devem ser definidos e respeitados." }
        },
        opcoes: [
          { nivel: 1, texto: "Dados são mantidos indefinidamente. Não há política de descarte." },
          { nivel: 2, texto: "Descarte ocorre de forma ad-hoc, sem critérios claros." },
          { nivel: 3, texto: "Política existe, mas não é aplicada consistentemente." },
          { nivel: 4, texto: "Política formalizada com prazos definidos e descarte automatizado." },
          { nivel: 5, texto: "Gestão do ciclo de vida totalmente automatizada com auditoria." }
        ]
      }
    ]
  },
  {
    id: 3,
    titulo: "Segurança da Informação",
    tituloICO: "Security",
    responsavel: "TI / Segurança da Informação",
    objetivo: "Proteção técnica e organizacional dos dados",
    questoes: [
      {
        id: "3.1",
        questao: "A organização implementa medidas técnicas de segurança adequadas?",
        frameworks: {
          sgd: { fundamento: "Modelo de Maturidade em Dados - Segurança", regra: "Nível 4 exige controles técnicos robustos." },
          ico: { fundamento: "Security Principle", regra: "Medidas apropriadas ao risco devem ser implementadas." },
          cnil: { fundamento: "Atividade Tipo 4: Sécurité", regra: "Medidas de segurança devem ser proporcionais aos riscos." }
        },
        opcoes: [
          { nivel: 1, texto: "Nenhuma medida de segurança específica para dados pessoais." },
          { nivel: 2, texto: "Medidas básicas (antivírus, firewall) sem foco em dados pessoais." },
          { nivel: 3, texto: "Controles de segurança existem, mas não são testados regularmente." },
          { nivel: 4, texto: "Programa de segurança robusto com testes de penetração e auditorias." },
          { nivel: 5, texto: "Segurança integrada ao desenvolvimento, com automação e resposta a incidentes." }
        ]
      },
      {
        id: "3.2",
        questao: "Existe processo de gestão de incidentes de segurança envolvendo dados pessoais?",
        frameworks: {
          sgd: { fundamento: "Modelo de Maturidade - Gestão de Incidentes", regra: "Nível 4 exige processo formalizado de resposta." },
          ico: { fundamento: "Breach Notification Requirements", regra: "Incidentes devem ser notificados em 72 horas." },
          cnil: { fundamento: "Atividade Tipo 5: Gestion des Violations", regra: "Processo de notificação deve ser documentado." }
        },
        opcoes: [
          { nivel: 1, texto: "Não existe processo de gestão de incidentes." },
          { nivel: 2, texto: "Incidentes são tratados de forma ad-hoc quando descobertos." },
          { nivel: 3, texto: "Processo existe, mas não é testado ou atualizado regularmente." },
          { nivel: 4, texto: "Processo formalizado com equipe de resposta e comunicação definida." },
          { nivel: 5, texto: "Gestão de incidentes automatizada com simulações regulares." }
        ]
      }
    ]
  },
  {
    id: 4,
    titulo: "Direitos dos Titulares",
    tituloICO: "Individual Rights",
    responsavel: "Atendimento / Encarregado",
    objetivo: "Garantia dos direitos previstos na legislação",
    questoes: [
      {
        id: "4.1",
        questao: "A organização possui canal de atendimento para exercício de direitos dos titulares?",
        frameworks: {
          sgd: { fundamento: "LGPD Arts. 17-22", regra: "Direitos devem ser garantidos de forma facilitada." },
          ico: { fundamento: "Individual Rights Framework", regra: "Canais claros devem estar disponíveis." },
          cnil: { fundamento: "Atividade Tipo 6: Droits des Personnes", regra: "Processo de atendimento deve ser documentado." }
        },
        opcoes: [
          { nivel: 1, texto: "Não existe canal específico para direitos dos titulares." },
          { nivel: 2, texto: "Canal existe, mas não é divulgado ou é de difícil acesso." },
          { nivel: 3, texto: "Canal disponível, mas tempo de resposta é inconsistente." },
          { nivel: 4, texto: "Canal formalizado com SLA definido e rastreamento de solicitações." },
          { nivel: 5, texto: "Portal de autoatendimento com automação e métricas de satisfação." }
        ]
      },
      {
        id: "4.2",
        questao: "A organização consegue atender solicitações de portabilidade de dados?",
        frameworks: {
          sgd: { fundamento: "LGPD Art. 18, V", regra: "Portabilidade deve ser garantida." },
          ico: { fundamento: "Right to Data Portability", regra: "Dados devem ser fornecidos em formato estruturado." },
          cnil: { fundamento: "Droit à la Portabilité", regra: "Formato interoperável deve ser utilizado." }
        },
        opcoes: [
          { nivel: 1, texto: "Não é possível exportar dados dos titulares." },
          { nivel: 2, texto: "Exportação é manual e demorada, sem formato padrão." },
          { nivel: 3, texto: "Exportação possível, mas requer intervenção técnica." },
          { nivel: 4, texto: "Processo automatizado com formato estruturado (JSON/CSV)." },
          { nivel: 5, texto: "API de portabilidade disponível com formatos interoperáveis." }
        ]
      }
    ]
  },
  {
    id: 5,
    titulo: "Transparência e Comunicação",
    tituloICO: "Transparency",
    responsavel: "Comunicação / Jurídico",
    objetivo: "Informação clara aos titulares sobre o tratamento",
    questoes: [
      {
        id: "5.1",
        questao: "A organização possui Política de Privacidade clara e acessível?",
        frameworks: {
          sgd: { fundamento: "LGPD Arts. 6, 9", regra: "Informações devem ser claras e acessíveis." },
          ico: { fundamento: "Transparency Principle", regra: "Avisos devem ser concisos e compreensíveis." },
          cnil: { fundamento: "Atividade Tipo 7: Information", regra: "Informação deve ser adaptada ao público." }
        },
        opcoes: [
          { nivel: 1, texto: "Não existe Política de Privacidade publicada." },
          { nivel: 2, texto: "Política existe, mas é genérica ou desatualizada." },
          { nivel: 3, texto: "Política específica existe, mas linguagem é técnica/jurídica." },
          { nivel: 4, texto: "Política clara, em linguagem acessível, revisada periodicamente." },
          { nivel: 5, texto: "Política em múltiplos formatos com versionamento e comunicação proativa." }
        ]
      }
    ]
  },
  {
    id: 6,
    titulo: "Gestão de Terceiros",
    tituloICO: "Third Parties",
    responsavel: "Compras / Jurídico / Encarregado",
    objetivo: "Controle sobre operadores e compartilhamento",
    questoes: [
      {
        id: "6.1",
        questao: "A organização avalia fornecedores quanto à proteção de dados antes da contratação?",
        frameworks: {
          sgd: { fundamento: "LGPD Art. 39", regra: "Operadores devem oferecer garantias suficientes." },
          ico: { fundamento: "Processor Due Diligence", regra: "Avaliação prévia é obrigatória." },
          cnil: { fundamento: "Atividade Tipo 8: Sous-traitants", regra: "Due diligence deve ser documentada." }
        },
        opcoes: [
          { nivel: 1, texto: "Não há avaliação de fornecedores quanto a dados pessoais." },
          { nivel: 2, texto: "Avaliação é feita apenas para fornecedores críticos, de forma ad-hoc." },
          { nivel: 3, texto: "Questionário de avaliação existe, mas não é obrigatório." },
          { nivel: 4, texto: "Processo formalizado de due diligence com critérios de aprovação." },
          { nivel: 5, texto: "Avaliação contínua com monitoramento e reavaliação periódica." }
        ]
      },
      {
        id: "6.2",
        questao: "Contratos com operadores incluem cláusulas de proteção de dados?",
        frameworks: {
          sgd: { fundamento: "LGPD Art. 39", regra: "Contrato deve vincular operador às instruções." },
          ico: { fundamento: "Processor Contracts", regra: "Cláusulas obrigatórias devem estar presentes." },
          cnil: { fundamento: "Clauses Contractuelles", regra: "Modelo de cláusulas deve ser utilizado." }
        },
        opcoes: [
          { nivel: 1, texto: "Contratos não mencionam proteção de dados." },
          { nivel: 2, texto: "Cláusulas genéricas de confidencialidade apenas." },
          { nivel: 3, texto: "Cláusulas de proteção de dados existem, mas são inconsistentes." },
          { nivel: 4, texto: "Modelo padrão de DPA utilizado em todos os contratos relevantes." },
          { nivel: 5, texto: "Gestão contratual automatizada com alertas de vencimento e renovação." }
        ]
      }
    ]
  }
];

// ==================== QUESTÕES DE DUE DILIGENCE DE TERCEIROS ====================
// Questões antigas de Due Diligence (mantidas para compatibilidade)
export const questoesDueDiligenceAntigo = [
  {
    id: 1,
    secao: "Governança e Contrato",
    titulo: "Acordo de Processamento de Dados",
    pergunta: "O parceiro aceita assinar um Acordo de Processamento de Dados com todas as cláusulas exigidas pela legislação?",
    respostaEsperada: "Opção 1 - Acordo completo aceito sem restrições",
    fundamentoLegal: "O Controlador só pode usar operadores que ofereçam garantias suficientes. O contrato é obrigatório para vincular o operador às instruções documentadas.",
    evidenciaRequerida: "Minuta do Acordo de Processamento de Dados ou Contrato Assinado",
    opcoes: [
      { nivel: 1, texto: "Sim, acordo completo aceito sem restrições.", impacto: 1, probabilidade: 1 },
      { nivel: 2, texto: "Sim, mas exige uso do modelo dele (necessária revisão jurídica).", impacto: 2, probabilidade: 2 },
      { nivel: 3, texto: "Aceita apenas cláusulas genéricas de confidencialidade.", impacto: 3, probabilidade: 3 },
      { nivel: 4, texto: "Recusa cláusulas de responsabilidade ou segurança.", impacto: 4, probabilidade: 4 },
      { nivel: 5, texto: "Não aceita assinar contrato formal de dados.", impacto: 5, probabilidade: 5 }
    ]
  },
  {
    id: 2,
    secao: "Objeto e Minimização",
    titulo: "Escopo dos Dados Coletados",
    pergunta: "O escopo dos dados coletados é estritamente necessário para a finalidade do serviço?",
    respostaEsperada: "Opção 1 - Minimizado e documentado (apenas dados essenciais)",
    fundamentoLegal: "O contrato deve definir natureza, finalidade e tipo de dados. O uso fora das instruções torna o operador um controlador ilegal.",
    evidenciaRequerida: "Tabela de Tipos de Dados no Anexo do Contrato",
    opcoes: [
      { nivel: 1, texto: "Sim, minimizado e documentado (apenas dados essenciais).", impacto: 1, probabilidade: 1 },
      { nivel: 2, texto: "Coleta alguns dados adicionais por conveniência, mas não sensíveis.", impacto: 2, probabilidade: 2 },
      { nivel: 3, texto: "Coleta dados excessivos sem justificativa clara.", impacto: 4, probabilidade: 3 },
      { nivel: 4, texto: "Reutiliza dados para fins próprios (marketing/venda) sem base legal.", impacto: 5, probabilidade: 5 },
      { nivel: 5, texto: "Coleta dados sensíveis desnecessários ou indefinidos.", impacto: 5, probabilidade: 5 }
    ]
  },
  {
    id: 3,
    secao: "Segurança da Informação",
    titulo: "Medidas Técnicas de Proteção",
    pergunta: "Quais medidas técnicas o parceiro implementa para garantir Confidencialidade, Integridade e Disponibilidade?",
    respostaEsperada: "Opção 1 ou 2 - Certificação ou políticas robustas alinhadas à norma",
    fundamentoLegal: "Obrigação de implementar medidas adequadas ao risco, incluindo cifragem e resiliência dos sistemas.",
    evidenciaRequerida: "Certificado ISO 27001, Relatório SOC 2 Tipo II ou Política de Segurança da Informação",
    opcoes: [
      { nivel: 1, texto: "Certificação ISO 27001/SOC 2, Criptografia (repouso/trânsito) e gestão de acessos.", impacto: 1, probabilidade: 1 },
      { nivel: 2, texto: "Políticas robustas alinhadas à ISO, mas sem certificação formal.", impacto: 2, probabilidade: 2 },
      { nivel: 3, texto: "Medidas básicas (firewall/antivírus), sem criptografia em repouso.", impacto: 3, probabilidade: 3 },
      { nivel: 4, texto: "Senhas fracas/compartilhadas e ausência de política de segurança.", impacto: 4, probabilidade: 4 },
      { nivel: 5, texto: "Nenhuma medida de segurança documentada.", impacto: 5, probabilidade: 5 }
    ]
  },
  {
    id: 4,
    secao: "Gestão de Suboperadores",
    titulo: "Controle de Subcontratados",
    pergunta: "Como o parceiro controla a contratação de terceiros (subcontratados) que acessam os dados?",
    respostaEsperada: "Opção 1 ou 2 - Autorização prévia com replicação de obrigações contratuais",
    fundamentoLegal: "O operador não pode engajar outro processador sem autorização. Deve impor as mesmas obrigações de proteção de dados ao subcontratado.",
    evidenciaRequerida: "Cláusula de Subcontratação e Lista de Subprocessadores",
    opcoes: [
      { nivel: 1, texto: "Exige autorização prévia por escrito e replica obrigações contratuais (flow-down).", impacto: 1, probabilidade: 1 },
      { nivel: 2, texto: "Autorização geral com aviso prévio e direito de objeção do Controlador.", impacto: 2, probabilidade: 2 },
      { nivel: 3, texto: "Avisa sobre subcontratados, mas não garante contrato espelhado.", impacto: 4, probabilidade: 3 },
      { nivel: 4, texto: "Subcontrata livremente sem aviso ao Controlador.", impacto: 5, probabilidade: 4 },
      { nivel: 5, texto: "Não sabe quem são seus subcontratados.", impacto: 5, probabilidade: 5 }
    ]
  },
  {
    id: 5,
    secao: "Transferência Internacional",
    titulo: "Localização e Transferência de Dados",
    pergunta: "Onde os dados são armazenados e processados? Há transferência internacional?",
    respostaEsperada: "Opção 1 ou 2 - Brasil ou país com adequação/cláusulas padrão",
    fundamentoLegal: "Transferência internacional só é permitida para países com nível adequado ou mediante garantias apropriadas.",
    evidenciaRequerida: "Declaração de Localização de Dados ou Cláusulas Contratuais Padrão",
    opcoes: [
      { nivel: 1, texto: "Dados armazenados apenas no Brasil ou em país com decisão de adequação.", impacto: 1, probabilidade: 1 },
      { nivel: 2, texto: "Transferência para país sem adequação, mas com Cláusulas Contratuais Padrão.", impacto: 2, probabilidade: 2 },
      { nivel: 3, texto: "Transferência internacional sem mecanismo formal, mas para país com legislação similar.", impacto: 3, probabilidade: 3 },
      { nivel: 4, texto: "Dados em múltiplos países sem controle ou documentação.", impacto: 4, probabilidade: 4 },
      { nivel: 5, texto: "Desconhece onde os dados são armazenados.", impacto: 5, probabilidade: 5 }
    ]
  },
  {
    id: 6,
    secao: "Direitos dos Titulares",
    titulo: "Suporte ao Exercício de Direitos",
    pergunta: "O parceiro possui capacidade de auxiliar no atendimento a solicitações de titulares?",
    respostaEsperada: "Opção 1 ou 2 - Processo formalizado com SLA definido",
    fundamentoLegal: "O operador deve auxiliar o controlador a cumprir suas obrigações perante os titulares.",
    evidenciaRequerida: "Procedimento de Atendimento a Titulares ou SLA Contratual",
    opcoes: [
      { nivel: 1, texto: "Processo formalizado com SLA definido para atendimento a solicitações.", impacto: 1, probabilidade: 1 },
      { nivel: 2, texto: "Capacidade de atendimento existe, mas sem SLA formal.", impacto: 2, probabilidade: 2 },
      { nivel: 3, texto: "Atendimento é feito caso a caso, sem processo definido.", impacto: 3, probabilidade: 3 },
      { nivel: 4, texto: "Dificuldade em localizar ou extrair dados de titulares específicos.", impacto: 4, probabilidade: 4 },
      { nivel: 5, texto: "Não possui capacidade técnica para atender solicitações.", impacto: 5, probabilidade: 5 }
    ]
  },
  {
    id: 7,
    secao: "Gestão de Incidentes",
    titulo: "Notificação de Incidentes",
    pergunta: "O parceiro possui processo de notificação de incidentes de segurança?",
    respostaEsperada: "Opção 1 - Notificação em até 24h com informações completas",
    fundamentoLegal: "O operador deve notificar o controlador sem demora injustificada após tomar conhecimento de violação.",
    evidenciaRequerida: "Procedimento de Gestão de Incidentes ou Cláusula Contratual",
    opcoes: [
      { nivel: 1, texto: "Notificação em até 24h com informações completas sobre o incidente.", impacto: 1, probabilidade: 1 },
      { nivel: 2, texto: "Notificação em até 48h com informações básicas.", impacto: 2, probabilidade: 2 },
      { nivel: 3, texto: "Notificação sem prazo definido, quando conveniente.", impacto: 3, probabilidade: 3 },
      { nivel: 4, texto: "Histórico de incidentes não comunicados ou comunicados tardiamente.", impacto: 4, probabilidade: 4 },
      { nivel: 5, texto: "Não possui processo de detecção ou notificação de incidentes.", impacto: 5, probabilidade: 5 }
    ]
  },
  {
    id: 8,
    secao: "Auditoria e Conformidade",
    titulo: "Direito de Auditoria",
    pergunta: "O parceiro permite auditorias ou inspeções pelo Controlador?",
    respostaEsperada: "Opção 1 ou 2 - Auditoria permitida com acesso a evidências",
    fundamentoLegal: "O controlador deve poder verificar a conformidade do operador, incluindo através de auditorias.",
    evidenciaRequerida: "Cláusula de Auditoria no Contrato ou Relatório de Auditoria Anterior",
    opcoes: [
      { nivel: 1, texto: "Auditoria presencial permitida com acesso total a sistemas e documentos.", impacto: 1, probabilidade: 1 },
      { nivel: 2, texto: "Auditoria remota ou questionário detalhado com evidências.", impacto: 2, probabilidade: 2 },
      { nivel: 3, texto: "Apenas relatórios de auditoria de terceiros são disponibilizados.", impacto: 3, probabilidade: 3 },
      { nivel: 4, texto: "Auditoria permitida com restrições significativas.", impacto: 4, probabilidade: 4 },
      { nivel: 5, texto: "Não permite nenhum tipo de auditoria ou verificação.", impacto: 5, probabilidade: 5 }
    ]
  },
  {
    id: 9,
    secao: "Término do Contrato",
    titulo: "Devolução e Eliminação de Dados",
    pergunta: "O parceiro possui processo de devolução e eliminação de dados ao término do contrato?",
    respostaEsperada: "Opção 1 - Devolução em formato estruturado e eliminação certificada",
    fundamentoLegal: "Ao término do contrato, o operador deve devolver ou eliminar os dados, conforme escolha do controlador.",
    evidenciaRequerida: "Procedimento de Offboarding ou Cláusula Contratual",
    opcoes: [
      { nivel: 1, texto: "Devolução em formato estruturado e eliminação certificada com prazo definido.", impacto: 1, probabilidade: 1 },
      { nivel: 2, texto: "Eliminação garantida, mas sem certificação formal.", impacto: 2, probabilidade: 2 },
      { nivel: 3, texto: "Dados são eliminados eventualmente, sem prazo ou confirmação.", impacto: 3, probabilidade: 3 },
      { nivel: 4, texto: "Dados são retidos para fins próprios após término.", impacto: 4, probabilidade: 4 },
      { nivel: 5, texto: "Não há processo de eliminação ou devolução de dados.", impacto: 5, probabilidade: 5 }
    ]
  },
  {
    id: 10,
    secao: "Histórico e Reputação",
    titulo: "Histórico de Conformidade",
    pergunta: "O parceiro possui histórico de incidentes de privacidade ou sanções regulatórias?",
    respostaEsperada: "Opção 1 - Sem histórico de incidentes ou sanções",
    fundamentoLegal: "O controlador deve avaliar se o operador oferece garantias suficientes, incluindo histórico de conformidade.",
    evidenciaRequerida: "Pesquisa de Histórico ou Declaração do Parceiro",
    opcoes: [
      { nivel: 1, texto: "Sem histórico de incidentes ou sanções. Boa reputação no mercado.", impacto: 1, probabilidade: 1 },
      { nivel: 2, texto: "Incidentes menores no passado, todos resolvidos adequadamente.", impacto: 2, probabilidade: 2 },
      { nivel: 3, texto: "Incidentes relevantes, mas com plano de remediação implementado.", impacto: 3, probabilidade: 3 },
      { nivel: 4, texto: "Sanções regulatórias recentes ou incidentes graves não resolvidos.", impacto: 4, probabilidade: 4 },
      { nivel: 5, texto: "Múltiplas sanções ou vazamentos de dados significativos.", impacto: 5, probabilidade: 5 }
    ]
  }
];

// Alias para compatibilidade com código existente
export const questoesDueDiligence = questoesDueDiligenceAntigo;

export type NivelMaturidade = typeof niveisMaturidade[number];
export type Framework = keyof typeof frameworksDisponiveis;
export type DominioConformidade = typeof dominiosConformidade[number];
export type QuestaoDueDiligence = typeof questoesDueDiligenceAntigo[number];
