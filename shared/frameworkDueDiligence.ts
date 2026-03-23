/**
 * Framework de Due Diligence de Terceiros - LGPD
 * 
 * Questionário para avaliação de riscos de proteção de dados pessoais
 * na relação de parceria com fornecedores e terceiros.
 * 
 * Baseado nas melhores práticas de:
 * - LGPD (Lei Geral de Proteção de Dados)
 * - ISO 27001/27002 (Segurança da Informação)
 * - ISO 27701 (Gestão de Privacidade)
 * - NIST Privacy Framework
 */

export interface DueDiligenceOption {
  level: number; // 1-5 (1 = menor risco, 5 = maior risco para perguntas de contexto; inverso para controles)
  letter: string; // a, b, c, d, e
  text: string;
  impact: number; // 1-5
  probability: number; // 1-5
  lgpdRefs: string[];
  isoRefs: string[];
  nistRefs: string[];
}

export interface DueDiligenceEvidence {
  prompt: string;
  examples: string[];
}

export interface DueDiligenceQuestion {
  id: string; // DD-01, DD-02, etc.
  number: number;
  section: string;
  sectionId: string;
  question: string;
  intent: string;
  help: string;
  options: DueDiligenceOption[];
  evidence: DueDiligenceEvidence;
  type: 'inherent' | 'control'; // Risco inerente ou controle
}

export interface DueDiligenceSection {
  id: string;
  name: string;
  description: string;
  questions: DueDiligenceQuestion[];
}

// Seções do questionário
export const DUE_DILIGENCE_SECTIONS: DueDiligenceSection[] = [
  {
    id: 'DD-S1',
    name: 'Contexto do Tratamento',
    description: 'Avaliação do risco inerente baseado no tipo de dados, nível de acesso e cadeia de subcontratação',
    questions: []
  },
  {
    id: 'DD-S2',
    name: 'Governança LGPD',
    description: 'Verificação da estrutura de governança mínima para proteção de dados pessoais',
    questions: []
  },
  {
    id: 'DD-S3',
    name: 'Controles Práticos',
    description: 'Avaliação das medidas de segurança e processos operacionais implementados',
    questions: []
  },
  {
    id: 'DD-S4',
    name: 'Incidentes e Resposta',
    description: 'Capacidade de resposta a incidentes e histórico de ocorrências',
    questions: []
  }
];

// Framework completo de perguntas
export const DUE_DILIGENCE_FRAMEWORK: DueDiligenceQuestion[] = [
  // BLOCO 1 - CONTEXTO DO TRATAMENTO (RISCO INERENTE)
  {
    id: 'DD-01',
    number: 1,
    section: 'Contexto do Tratamento',
    sectionId: 'DD-S1',
    question: 'Que tipo de dados pessoais você trata em nome da organização cliente?',
    intent: 'Identificar a natureza dos dados (comuns, financeiros/localização, sensíveis, crianças/adolescentes), pois isso eleva ou reduz o risco inerente.',
    help: 'Se houver dúvida, escolha a opção mais restritiva (mais sensível) ou "Não tenho certeza".',
    type: 'inherent',
    options: [
      {
        level: 1,
        letter: 'a',
        text: 'Apenas dados comuns (ex.: nome, e-mail, telefone).',
        impact: 2,
        probability: 2,
        lgpdRefs: ['Art. 6º (necessidade/adequação)'],
        isoRefs: [],
        nistRefs: ['Identify-P']
      },
      {
        level: 2,
        letter: 'b',
        text: 'Dados financeiros, profissionais ou de localização.',
        impact: 3,
        probability: 3,
        lgpdRefs: ['Art. 6º', 'Art. 46'],
        isoRefs: ['A.9', 'A.12'],
        nistRefs: ['Identify-P', 'Protect-P']
      },
      {
        level: 3,
        letter: 'c',
        text: 'Dados sensíveis (ex.: saúde, biometria, religião, orientação etc.).',
        impact: 5,
        probability: 3,
        lgpdRefs: ['Art. 6º', 'Art. 46'],
        isoRefs: ['A.9', 'A.12'],
        nistRefs: ['Identify-P', 'Protect-P']
      },
      {
        level: 4,
        letter: 'd',
        text: 'Dados de crianças ou adolescentes.',
        impact: 5,
        probability: 4,
        lgpdRefs: ['Art. 6º', 'Art. 46'],
        isoRefs: ['A.9', 'A.12'],
        nistRefs: ['Identify-P', 'Protect-P']
      },
      {
        level: 5,
        letter: 'e',
        text: 'Não tenho certeza quais dados tratamos.',
        impact: 4,
        probability: 4,
        lgpdRefs: ['Art. 6º (transparência/adequação)'],
        isoRefs: ['A.8'],
        nistRefs: ['Identify-P', 'Govern-P']
      }
    ],
    evidence: {
      prompt: 'Anexe ou descreva uma evidência que comprove a resposta.',
      examples: [
        'Descrição do serviço/escopo (proposta, pedido, SOW)',
        'Prints do sistema/telas mostrando os campos de dados',
        'Fluxo de processo (passo a passo) indicando quais dados entram/saem',
        'Trecho de contrato ou anexo técnico com o tipo de dado'
      ]
    }
  },
  {
    id: 'DD-02',
    number: 2,
    section: 'Contexto do Tratamento',
    sectionId: 'DD-S1',
    question: 'Qual é o seu nível de acesso aos dados da organização cliente?',
    intent: 'Avaliar profundidade do acesso e criticidade (pontual, armazenamento, contínuo, acesso a sistemas, acesso administrativo).',
    help: 'Considere o maior nível de acesso existente em qualquer fase do serviço.',
    type: 'inherent',
    options: [
      {
        level: 1,
        letter: 'a',
        text: 'Apenas recebo dados pontualmente (ex.: 1 arquivo eventual) e não armazeno.',
        impact: 2,
        probability: 2,
        lgpdRefs: ['Art. 6º'],
        isoRefs: [],
        nistRefs: ['Identify-P']
      },
      {
        level: 2,
        letter: 'b',
        text: 'Armazeno dados por um período limitado (ex.: dias/semanas) para executar o serviço.',
        impact: 3,
        probability: 3,
        lgpdRefs: ['Art. 6º', 'Art. 46'],
        isoRefs: ['A.9'],
        nistRefs: ['Identify-P', 'Protect-P']
      },
      {
        level: 3,
        letter: 'c',
        text: 'Trato dados de forma contínua (rotina diária/semanal) e mantenho histórico.',
        impact: 4,
        probability: 3,
        lgpdRefs: ['Art. 6º', 'Art. 46'],
        isoRefs: ['A.9', 'A.12'],
        nistRefs: ['Identify-P', 'Protect-P']
      },
      {
        level: 4,
        letter: 'd',
        text: 'Tenho acesso a sistemas da organização cliente (login/perfil de usuário).',
        impact: 4,
        probability: 4,
        lgpdRefs: ['Art. 46', 'Art. 49'],
        isoRefs: ['A.9', 'A.12'],
        nistRefs: ['Protect-P', 'Control-P']
      },
      {
        level: 5,
        letter: 'e',
        text: 'Tenho acesso técnico ou administrativo amplo (ex.: admin, suporte, credenciais elevadas).',
        impact: 5,
        probability: 4,
        lgpdRefs: ['Art. 46', 'Art. 49'],
        isoRefs: ['A.9', 'A.12'],
        nistRefs: ['Protect-P', 'Control-P']
      }
    ],
    evidence: {
      prompt: 'Anexe ou descreva uma evidência que comprove a resposta.',
      examples: [
        'Perfil/permissões (print do sistema, lista de roles)',
        'Contrato/SLA descrevendo nível de acesso',
        'Checklist de onboarding/offboarding de acessos',
        'Documento técnico de integração (API, SSO, VPN)'
      ]
    }
  },
  {
    id: 'DD-03',
    number: 3,
    section: 'Contexto do Tratamento',
    sectionId: 'DD-S1',
    question: 'Você utiliza subcontratados ou outros fornecedores para prestar esse serviço?',
    intent: 'Identificar suboperadores e risco em cadeia (quem mais acessa dados, direta ou indiretamente).',
    help: 'Subcontratado é qualquer fornecedor que ajuda você a entregar o serviço (ex.: cloud, call center, suporte, subprestadores).',
    type: 'inherent',
    options: [
      {
        level: 1,
        letter: 'a',
        text: 'Não utilizamos terceiros/subcontratados.',
        impact: 2,
        probability: 2,
        lgpdRefs: ['Art. 6º'],
        isoRefs: [],
        nistRefs: ['Identify-P']
      },
      {
        level: 2,
        letter: 'b',
        text: 'Sim, mas eles não têm acesso a dados pessoais.',
        impact: 3,
        probability: 2,
        lgpdRefs: ['Art. 39'],
        isoRefs: ['A.6'],
        nistRefs: ['Govern-P', 'Control-P']
      },
      {
        level: 3,
        letter: 'c',
        text: 'Sim, com acesso limitado a dados pessoais (somente o necessário).',
        impact: 4,
        probability: 3,
        lgpdRefs: ['Art. 39', 'Art. 46'],
        isoRefs: ['A.5', 'A.6'],
        nistRefs: ['Govern-P', 'Protect-P']
      },
      {
        level: 4,
        letter: 'd',
        text: 'Sim, com acesso relevante a dados pessoais.',
        impact: 5,
        probability: 4,
        lgpdRefs: ['Art. 39', 'Art. 46'],
        isoRefs: ['A.5', 'A.6'],
        nistRefs: ['Govern-P', 'Protect-P']
      },
      {
        level: 5,
        letter: 'e',
        text: 'Não sei informar com segurança.',
        impact: 4,
        probability: 4,
        lgpdRefs: ['Art. 6º (transparência)', 'Art. 39'],
        isoRefs: ['A.6'],
        nistRefs: ['Identify-P', 'Govern-P']
      }
    ],
    evidence: {
      prompt: 'Anexe ou descreva uma evidência que comprove a resposta.',
      examples: [
        'Lista de subcontratados/suboperadores envolvidos',
        'Contratos com subcontratados (ou cláusulas relevantes)',
        'Arquitetura/diagrama indicando serviços de terceiros (cloud, suporte)',
        'Declaração formal de inexistência de subcontratação com acesso a dados'
      ]
    }
  },

  // BLOCO 2 - GOVERNANÇA MÍNIMA LGPD
  {
    id: 'DD-04',
    number: 4,
    section: 'Governança LGPD',
    sectionId: 'DD-S2',
    question: 'Existe um responsável interno por proteção de dados pessoais (ponto focal)?',
    intent: 'Verificar se existe governança mínima (alguém responsável por políticas, decisões e atendimento a demandas).',
    help: 'Pode ser uma pessoa da área jurídica, compliance, TI ou segurança — o importante é ter responsabilidade definida.',
    type: 'control',
    options: [
      {
        level: 1,
        letter: 'a',
        text: 'Não existe responsável.',
        impact: 4,
        probability: 4,
        lgpdRefs: ['Art. 41'],
        isoRefs: ['A.5', 'A.6'],
        nistRefs: ['Govern-P']
      },
      {
        level: 2,
        letter: 'b',
        text: 'Existe alguém informalmente (sem designação/atribuições).',
        impact: 3,
        probability: 3,
        lgpdRefs: ['Art. 41'],
        isoRefs: ['A.5', 'A.6'],
        nistRefs: ['Govern-P']
      },
      {
        level: 3,
        letter: 'c',
        text: 'Existe responsável definido, mas sem atribuições claras.',
        impact: 3,
        probability: 2,
        lgpdRefs: ['Art. 41'],
        isoRefs: ['A.5', 'A.6'],
        nistRefs: ['Govern-P']
      },
      {
        level: 4,
        letter: 'd',
        text: 'Existe responsável com atribuições definidas.',
        impact: 2,
        probability: 2,
        lgpdRefs: ['Art. 41'],
        isoRefs: ['A.5', 'A.6'],
        nistRefs: ['Govern-P']
      },
      {
        level: 5,
        letter: 'e',
        text: 'Existe responsável com atuação ativa e documentada (rotina, registros, indicadores).',
        impact: 1,
        probability: 1,
        lgpdRefs: ['Art. 41'],
        isoRefs: ['A.5', 'A.6'],
        nistRefs: ['Govern-P']
      }
    ],
    evidence: {
      prompt: 'Anexe ou descreva uma evidência que comprove a resposta.',
      examples: [
        'Ato de designação / e-mail formal / ata',
        'Organograma ou descrição de função',
        'Política interna indicando o ponto focal',
        'Registro de comitês/reuniões/relatórios do tema'
      ]
    }
  },
  {
    id: 'DD-05',
    number: 5,
    section: 'Governança LGPD',
    sectionId: 'DD-S2',
    question: 'Você possui políticas ou documentos internos sobre proteção de dados pessoais?',
    intent: 'Avaliar formalização e maturidade documental (políticas, normas, treinamentos).',
    help: 'Documentos podem ser simples, mas precisam existir e ser aplicados.',
    type: 'control',
    options: [
      {
        level: 1,
        letter: 'a',
        text: 'Não possuímos documentos/políticas sobre o tema.',
        impact: 4,
        probability: 4,
        lgpdRefs: ['Art. 50'],
        isoRefs: ['A.5'],
        nistRefs: ['Govern-P']
      },
      {
        level: 2,
        letter: 'b',
        text: 'Temos orientações informais (sem documento oficial).',
        impact: 3,
        probability: 3,
        lgpdRefs: ['Art. 50'],
        isoRefs: ['A.5'],
        nistRefs: ['Govern-P']
      },
      {
        level: 3,
        letter: 'c',
        text: 'Temos políticas/documentos, mas estão desatualizados.',
        impact: 3,
        probability: 2,
        lgpdRefs: ['Art. 50'],
        isoRefs: ['A.5'],
        nistRefs: ['Govern-P']
      },
      {
        level: 4,
        letter: 'd',
        text: 'Temos políticas/documentos atualizados.',
        impact: 2,
        probability: 2,
        lgpdRefs: ['Art. 50'],
        isoRefs: ['A.5'],
        nistRefs: ['Govern-P']
      },
      {
        level: 5,
        letter: 'e',
        text: 'Temos políticas/documentos e treinamentos periódicos com registro.',
        impact: 1,
        probability: 1,
        lgpdRefs: ['Art. 50'],
        isoRefs: ['A.5', 'A.7'],
        nistRefs: ['Govern-P', 'Communicate-P']
      }
    ],
    evidence: {
      prompt: 'Anexe ou descreva uma evidência que comprove a resposta.',
      examples: [
        'Política de privacidade interna / segurança da informação',
        'Código de conduta / norma interna',
        'Registro de treinamento (lista de presença, certificado)',
        'Comunicados internos sobre regras de dados'
      ]
    }
  },
  {
    id: 'DD-06',
    number: 6,
    section: 'Governança LGPD',
    sectionId: 'DD-S2',
    question: 'O contrato com a organização cliente trata de proteção de dados pessoais?',
    intent: 'Confirmar base contratual (obrigações, responsabilidades, incidentes, auditoria).',
    help: 'Se houver anexo específico (DPA / aditivo LGPD), considere como parte do contrato.',
    type: 'control',
    options: [
      {
        level: 1,
        letter: 'a',
        text: 'Não existe contrato assinado.',
        impact: 5,
        probability: 4,
        lgpdRefs: ['Art. 39'],
        isoRefs: ['A.5'],
        nistRefs: ['Govern-P']
      },
      {
        level: 2,
        letter: 'b',
        text: 'Existe contrato, mas sem cláusulas sobre dados pessoais.',
        impact: 4,
        probability: 3,
        lgpdRefs: ['Art. 39'],
        isoRefs: ['A.5'],
        nistRefs: ['Govern-P']
      },
      {
        level: 3,
        letter: 'c',
        text: 'Existe cláusula genérica (sem detalhes de obrigações e responsabilidades).',
        impact: 3,
        probability: 2,
        lgpdRefs: ['Art. 39'],
        isoRefs: ['A.5'],
        nistRefs: ['Govern-P']
      },
      {
        level: 4,
        letter: 'd',
        text: 'Existe cláusula específica de LGPD (obrigações e responsabilidades).',
        impact: 2,
        probability: 2,
        lgpdRefs: ['Art. 39'],
        isoRefs: ['A.5'],
        nistRefs: ['Govern-P']
      },
      {
        level: 5,
        letter: 'e',
        text: 'Existe cláusula específica + regras de incidentes e auditoria (ou direito de verificação).',
        impact: 1,
        probability: 1,
        lgpdRefs: ['Art. 39', 'Art. 48'],
        isoRefs: ['A.5', 'A.16'],
        nistRefs: ['Govern-P', 'Respond-P']
      }
    ],
    evidence: {
      prompt: 'Anexe ou descreva uma evidência que comprove a resposta.',
      examples: [
        'Contrato assinado (ou páginas relevantes)',
        'Aditivo/DPA/Anexo de proteção de dados',
        'SLA com requisitos de segurança e notificação',
        'Termos e condições aceitos formalmente'
      ]
    }
  },

  // BLOCO 3 - CONTROLES PRÁTICOS
  {
    id: 'DD-07',
    number: 7,
    section: 'Controles Práticos',
    sectionId: 'DD-S3',
    question: 'Quais medidas de segurança você aplica hoje para proteger os dados pessoais?',
    intent: 'Avaliar controles reais (acesso, backup, logs, criptografia, segregação, revisões).',
    help: 'Não precisa ser perfeito — seja objetivo sobre o que existe hoje.',
    type: 'control',
    options: [
      {
        level: 1,
        letter: 'a',
        text: 'Nenhuma medida específica além do básico do dia a dia.',
        impact: 5,
        probability: 4,
        lgpdRefs: ['Art. 46'],
        isoRefs: ['A.9', 'A.12'],
        nistRefs: ['Protect-P']
      },
      {
        level: 2,
        letter: 'b',
        text: 'Medidas básicas (ex.: senha, antivírus), sem padronização.',
        impact: 4,
        probability: 3,
        lgpdRefs: ['Art. 46'],
        isoRefs: ['A.9', 'A.12'],
        nistRefs: ['Protect-P']
      },
      {
        level: 3,
        letter: 'c',
        text: 'Controles definidos, mas sem documentação formal.',
        impact: 3,
        probability: 2,
        lgpdRefs: ['Art. 46'],
        isoRefs: ['A.9', 'A.12'],
        nistRefs: ['Protect-P']
      },
      {
        level: 4,
        letter: 'd',
        text: 'Controles documentados e aplicados na rotina.',
        impact: 2,
        probability: 2,
        lgpdRefs: ['Art. 46'],
        isoRefs: ['A.9', 'A.12'],
        nistRefs: ['Protect-P']
      },
      {
        level: 5,
        letter: 'e',
        text: 'Controles testados e revisados periodicamente (evidências e melhorias contínuas).',
        impact: 1,
        probability: 1,
        lgpdRefs: ['Art. 46', 'Art. 49'],
        isoRefs: ['A.9', 'A.12', 'A.18'],
        nistRefs: ['Protect-P', 'Control-P']
      }
    ],
    evidence: {
      prompt: 'Anexe ou descreva uma evidência que comprove a resposta.',
      examples: [
        'Política de segurança / procedimento de controle de acesso',
        'Prints de MFA/SSO/gestão de usuários',
        'Relatórios de backup e restauração (ou política)',
        'Relatório de testes/varreduras/auditorias (quando houver)'
      ]
    }
  },
  {
    id: 'DD-08',
    number: 8,
    section: 'Controles Práticos',
    sectionId: 'DD-S3',
    question: 'Você consegue atender pedidos de titulares de dados pessoais (ex.: acesso, correção, exclusão)?',
    intent: 'Verificar capacidade de cumprir direitos do titular e prazos internos.',
    help: 'Considere se existe processo repetível e quem executa.',
    type: 'control',
    options: [
      {
        level: 1,
        letter: 'a',
        text: 'Não conseguimos atender pedidos de titulares.',
        impact: 5,
        probability: 4,
        lgpdRefs: ['Art. 18', 'Art. 19'],
        isoRefs: [],
        nistRefs: ['Communicate-P']
      },
      {
        level: 2,
        letter: 'b',
        text: 'Atendemos de forma improvisada (caso a caso).',
        impact: 4,
        probability: 3,
        lgpdRefs: ['Art. 18', 'Art. 19'],
        isoRefs: [],
        nistRefs: ['Communicate-P']
      },
      {
        level: 3,
        letter: 'c',
        text: 'Atendemos, mas sem processo definido e sem prazos claros.',
        impact: 3,
        probability: 2,
        lgpdRefs: ['Art. 18', 'Art. 19'],
        isoRefs: [],
        nistRefs: ['Communicate-P']
      },
      {
        level: 4,
        letter: 'd',
        text: 'Temos processo definido e conseguimos cumprir na prática.',
        impact: 2,
        probability: 2,
        lgpdRefs: ['Art. 18', 'Art. 19'],
        isoRefs: [],
        nistRefs: ['Communicate-P']
      },
      {
        level: 5,
        letter: 'e',
        text: 'Temos processo, prazos e registros (log) dos atendimentos.',
        impact: 1,
        probability: 1,
        lgpdRefs: ['Art. 18', 'Art. 19'],
        isoRefs: [],
        nistRefs: ['Communicate-P', 'Control-P']
      }
    ],
    evidence: {
      prompt: 'Anexe ou descreva uma evidência que comprove a resposta.',
      examples: [
        'Procedimento interno (passo a passo)',
        'Modelo de resposta ao titular',
        'Registro de solicitações atendidas (anonimizado)',
        'Canal oficial (e-mail, portal) de recebimento e tratamento'
      ]
    }
  },
  {
    id: 'DD-09',
    number: 9,
    section: 'Controles Práticos',
    sectionId: 'DD-S3',
    question: 'O que acontece com os dados pessoais ao final do contrato com a organização cliente?',
    intent: 'Avaliar gestão do ciclo de vida (retenção, exclusão, devolução, anonimização) e evidências.',
    help: 'Se existem obrigações legais de retenção, descreva como é feito e por quanto tempo.',
    type: 'control',
    options: [
      {
        level: 1,
        letter: 'a',
        text: 'Não há regra definida para o fim do contrato.',
        impact: 4,
        probability: 4,
        lgpdRefs: ['Art. 15', 'Art. 16'],
        isoRefs: ['A.8'],
        nistRefs: ['Control-P']
      },
      {
        level: 2,
        letter: 'b',
        text: 'Os dados são mantidos sem critério claro.',
        impact: 4,
        probability: 3,
        lgpdRefs: ['Art. 15', 'Art. 16'],
        isoRefs: ['A.8'],
        nistRefs: ['Control-P']
      },
      {
        level: 3,
        letter: 'c',
        text: 'Existe regra, mas não conseguimos comprovar a execução.',
        impact: 3,
        probability: 2,
        lgpdRefs: ['Art. 15', 'Art. 16'],
        isoRefs: ['A.8'],
        nistRefs: ['Control-P']
      },
      {
        level: 4,
        letter: 'd',
        text: 'Os dados são excluídos/devolvidos conforme regra definida.',
        impact: 2,
        probability: 2,
        lgpdRefs: ['Art. 15', 'Art. 16'],
        isoRefs: ['A.8'],
        nistRefs: ['Control-P']
      },
      {
        level: 5,
        letter: 'e',
        text: 'Exclusão/devolução com comprovação (logs, declaração, evidência técnica).',
        impact: 1,
        probability: 1,
        lgpdRefs: ['Art. 15', 'Art. 16'],
        isoRefs: ['A.8'],
        nistRefs: ['Control-P']
      }
    ],
    evidence: {
      prompt: 'Anexe ou descreva uma evidência que comprove a resposta.',
      examples: [
        'Política de retenção e descarte',
        'Cláusula contratual de devolução/exclusão',
        'Logs de exclusão (quando aplicável)',
        'Declaração de descarte/eliminação assinada'
      ]
    }
  },

  // BLOCO 4 - INCIDENTES E RESPOSTA
  {
    id: 'DD-10',
    number: 10,
    section: 'Incidentes e Resposta',
    sectionId: 'DD-S4',
    question: 'Existe um processo para lidar com incidentes ou vazamentos de dados pessoais?',
    intent: 'Verificar preparo para resposta a incidentes (detecção, contenção, comunicação, lições aprendidas).',
    help: 'Incidente é acesso indevido, perda, vazamento, indisponibilidade ou ataque (ex.: ransomware).',
    type: 'control',
    options: [
      {
        level: 1,
        letter: 'a',
        text: 'Não existe processo/plano para incidentes.',
        impact: 5,
        probability: 4,
        lgpdRefs: ['Art. 48'],
        isoRefs: ['A.16'],
        nistRefs: ['Respond-P']
      },
      {
        level: 2,
        letter: 'b',
        text: 'Existe um processo informal (sem documento/sem responsáveis).',
        impact: 4,
        probability: 3,
        lgpdRefs: ['Art. 48'],
        isoRefs: ['A.16'],
        nistRefs: ['Respond-P']
      },
      {
        level: 3,
        letter: 'c',
        text: 'Existe um plano básico documentado, mas nunca foi testado.',
        impact: 3,
        probability: 2,
        lgpdRefs: ['Art. 48'],
        isoRefs: ['A.16'],
        nistRefs: ['Respond-P']
      },
      {
        level: 4,
        letter: 'd',
        text: 'Existe plano definido e responsáveis claros.',
        impact: 2,
        probability: 2,
        lgpdRefs: ['Art. 48'],
        isoRefs: ['A.16'],
        nistRefs: ['Respond-P']
      },
      {
        level: 5,
        letter: 'e',
        text: 'Existe plano testado e com registros (simulados/real), incluindo comunicação ao cliente.',
        impact: 1,
        probability: 1,
        lgpdRefs: ['Art. 48'],
        isoRefs: ['A.16'],
        nistRefs: ['Respond-P']
      }
    ],
    evidence: {
      prompt: 'Anexe ou descreva uma evidência que comprove a resposta.',
      examples: [
        'Plano de resposta a incidentes (IRP)',
        'Playbook/fluxo de comunicação',
        'Registros de simulações/testes (tabletop)',
        'Registro de incidentes anteriores (anonimizado)'
      ]
    }
  },
  {
    id: 'DD-11',
    number: 11,
    section: 'Incidentes e Resposta',
    sectionId: 'DD-S4',
    question: 'Já houve incidentes relevantes envolvendo dados pessoais nos últimos anos?',
    intent: 'Avaliar histórico de risco e transparência (ocorrência, gravidade, correção).',
    help: 'Se houve incidentes, foque em como foi tratado e quais melhorias foram implementadas.',
    type: 'control',
    options: [
      {
        level: 1,
        letter: 'a',
        text: 'Sim, houve incidentes graves e não foram resolvidos adequadamente.',
        impact: 5,
        probability: 5,
        lgpdRefs: ['Art. 48'],
        isoRefs: ['A.16'],
        nistRefs: ['Respond-P']
      },
      {
        level: 2,
        letter: 'b',
        text: 'Sim, houve incidentes e foram resolvidos parcialmente.',
        impact: 4,
        probability: 3,
        lgpdRefs: ['Art. 48'],
        isoRefs: ['A.16'],
        nistRefs: ['Respond-P']
      },
      {
        level: 3,
        letter: 'c',
        text: 'Sim, houve incidentes e foram resolvidos.',
        impact: 3,
        probability: 2,
        lgpdRefs: ['Art. 48'],
        isoRefs: ['A.16'],
        nistRefs: ['Respond-P']
      },
      {
        level: 4,
        letter: 'd',
        text: 'Não houve incidentes relevantes.',
        impact: 1,
        probability: 1,
        lgpdRefs: [],
        isoRefs: [],
        nistRefs: []
      },
      {
        level: 5,
        letter: 'e',
        text: 'Prefiro não informar.',
        impact: 4,
        probability: 4,
        lgpdRefs: ['Art. 6º (transparência)'],
        isoRefs: [],
        nistRefs: ['Communicate-P']
      }
    ],
    evidence: {
      prompt: 'Anexe ou descreva uma evidência que comprove a resposta.',
      examples: [
        'Relatório/registro de incidente (anonimizado)',
        'Plano de ação/correção (CAPA)',
        'Comprovantes de melhorias (patches, mudanças de processo)',
        'Declaração formal (quando não houve incidentes relevantes)'
      ]
    }
  },
  {
    id: 'DD-12',
    number: 12,
    section: 'Incidentes e Resposta',
    sectionId: 'DD-S4',
    question: 'Em caso de incidente, em quanto tempo você comunicaria a organização cliente?',
    intent: 'Avaliar tempo de reação e comunicação com o controlador (para mitigação e obrigações legais).',
    help: 'Considere a comunicação inicial ao cliente (aviso) mesmo que a investigação continue depois.',
    type: 'control',
    options: [
      {
        level: 1,
        letter: 'a',
        text: 'Não saberia informar.',
        impact: 5,
        probability: 4,
        lgpdRefs: ['Art. 48'],
        isoRefs: ['A.16'],
        nistRefs: ['Respond-P', 'Communicate-P']
      },
      {
        level: 2,
        letter: 'b',
        text: 'Somente após análise interna completa.',
        impact: 4,
        probability: 3,
        lgpdRefs: ['Art. 48'],
        isoRefs: ['A.16'],
        nistRefs: ['Respond-P', 'Communicate-P']
      },
      {
        level: 3,
        letter: 'c',
        text: 'Em alguns dias.',
        impact: 3,
        probability: 2,
        lgpdRefs: ['Art. 48'],
        isoRefs: ['A.16'],
        nistRefs: ['Respond-P', 'Communicate-P']
      },
      {
        level: 4,
        letter: 'd',
        text: 'Em até 48 horas.',
        impact: 2,
        probability: 2,
        lgpdRefs: ['Art. 48'],
        isoRefs: ['A.16'],
        nistRefs: ['Respond-P', 'Communicate-P']
      },
      {
        level: 5,
        letter: 'e',
        text: 'Em até 24 horas (ou menos).',
        impact: 1,
        probability: 1,
        lgpdRefs: ['Art. 48'],
        isoRefs: ['A.16'],
        nistRefs: ['Respond-P', 'Communicate-P']
      }
    ],
    evidence: {
      prompt: 'Anexe ou descreva uma evidência que comprove a resposta.',
      examples: [
        'Política de incidentes com SLA de comunicação',
        'Cláusula contratual de notificação',
        'Fluxo de escalonamento e responsáveis',
        'Registros de simulações/testes de comunicação'
      ]
    }
  }
];

// Mapeamento de opções por questão (para uso na interface)
export const DD_QUESTION_OPTIONS: Record<string, { letter: string; text: string; level: number }[]> = {};
DUE_DILIGENCE_FRAMEWORK.forEach(q => {
  DD_QUESTION_OPTIONS[q.id] = q.options.map(opt => ({
    letter: opt.letter,
    text: opt.text,
    level: opt.level
  }));
});

// Funções auxiliares
export function getDueDiligenceQuestionById(id: string): DueDiligenceQuestion | undefined {
  return DUE_DILIGENCE_FRAMEWORK.find(q => q.id === id);
}

export function getDueDiligenceQuestionByNumber(number: number): DueDiligenceQuestion | undefined {
  return DUE_DILIGENCE_FRAMEWORK.find(q => q.number === number);
}

export function getDueDiligenceQuestionsBySection(sectionId: string): DueDiligenceQuestion[] {
  return DUE_DILIGENCE_FRAMEWORK.filter(q => q.sectionId === sectionId);
}

export function getTotalDueDiligenceQuestions(): number {
  return DUE_DILIGENCE_FRAMEWORK.length;
}

/**
 * Calcula o score de risco baseado nas respostas
 * @param responses Mapa de questionId -> level selecionado
 * @returns Score de risco (1-25 por pergunta, média geral)
 */
export function calculateDueDiligenceRiskScore(responses: Record<string, number>): {
  totalScore: number;
  maxScore: number;
  percentage: number;
  riskLevel: 'baixo' | 'moderado' | 'alto' | 'critico';
  inherentRisk: number;
  controlRisk: number;
} {
  let totalImpact = 0;
  let totalProbability = 0;
  let inherentImpact = 0;
  let inherentProbability = 0;
  let controlImpact = 0;
  let controlProbability = 0;
  let inherentCount = 0;
  let controlCount = 0;

  Object.entries(responses).forEach(([questionId, level]) => {
    const question = getDueDiligenceQuestionById(questionId);
    if (!question) return;

    const option = question.options.find(o => o.level === level);
    if (!option) return;

    totalImpact += option.impact;
    totalProbability += option.probability;

    if (question.type === 'inherent') {
      inherentImpact += option.impact;
      inherentProbability += option.probability;
      inherentCount++;
    } else {
      controlImpact += option.impact;
      controlProbability += option.probability;
      controlCount++;
    }
  });

  const questionCount = Object.keys(responses).length;
  const avgImpact = questionCount > 0 ? totalImpact / questionCount : 0;
  const avgProbability = questionCount > 0 ? totalProbability / questionCount : 0;
  const totalScore = avgImpact * avgProbability;
  const maxScore = 25;
  const percentage = (totalScore / maxScore) * 100;

  const inherentRisk = inherentCount > 0 
    ? (inherentImpact / inherentCount) * (inherentProbability / inherentCount)
    : 0;
  
  const controlRisk = controlCount > 0
    ? (controlImpact / controlCount) * (controlProbability / controlCount)
    : 0;

  let riskLevel: 'baixo' | 'moderado' | 'alto' | 'critico';
  if (totalScore <= 6) {
    riskLevel = 'baixo';
  } else if (totalScore <= 12) {
    riskLevel = 'moderado';
  } else if (totalScore <= 18) {
    riskLevel = 'alto';
  } else {
    riskLevel = 'critico';
  }

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    maxScore,
    percentage: Math.round(percentage * 100) / 100,
    riskLevel,
    inherentRisk: Math.round(inherentRisk * 100) / 100,
    controlRisk: Math.round(controlRisk * 100) / 100
  };
}

/**
 * Gera recomendações baseadas nas respostas
 */
export function generateDueDiligenceRecommendations(responses: Record<string, number>): {
  questionId: string;
  question: string;
  currentLevel: number;
  recommendation: string;
  priority: 'alta' | 'media' | 'baixa';
  lgpdRefs: string[];
}[] {
  const recommendations: {
    questionId: string;
    question: string;
    currentLevel: number;
    recommendation: string;
    priority: 'alta' | 'media' | 'baixa';
    lgpdRefs: string[];
  }[] = [];

  Object.entries(responses).forEach(([questionId, level]) => {
    const question = getDueDiligenceQuestionById(questionId);
    if (!question) return;

    const option = question.options.find(o => o.level === level);
    if (!option) return;

    // Gerar recomendação apenas se o risco for significativo
    const riskScore = option.impact * option.probability;
    if (riskScore > 6) {
      let priority: 'alta' | 'media' | 'baixa';
      if (riskScore >= 16) {
        priority = 'alta';
      } else if (riskScore >= 9) {
        priority = 'media';
      } else {
        priority = 'baixa';
      }

      // Encontrar a melhor opção (nível 5 para controles, nível 1 para inerentes)
      const targetLevel = question.type === 'control' ? 5 : 1;
      const targetOption = question.options.find(o => o.level === targetLevel);

      recommendations.push({
        questionId,
        question: question.question,
        currentLevel: level,
        recommendation: targetOption 
          ? `Evoluir de "${option.text}" para "${targetOption.text}"`
          : `Melhorar os controles relacionados a: ${question.intent}`,
        priority,
        lgpdRefs: option.lgpdRefs
      });
    }
  });

  // Ordenar por prioridade
  return recommendations.sort((a, b) => {
    const priorityOrder = { alta: 0, media: 1, baixa: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}
