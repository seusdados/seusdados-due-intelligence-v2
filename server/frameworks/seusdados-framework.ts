/**
 * Framework SeusDados - Maturidade LGPD
 * Questionário de Maturidade - Privacidade, Segurança e IA (5 níveis)
 * 
 * 5 Domínios:
 * - Cultura Organizacional (8 perguntas)
 * - Processos de Negócio (4 perguntas)
 * - Governança de TI (10 perguntas)
 * - Segurança da Informação (8 perguntas)
 * - Inteligência Artificial (9 perguntas)
 * 
 * Total: 39 perguntas
 */

// Tipos
export interface SeusdadosOption {
  id: string;
  level: number;
  text: string;
}

export interface SeusdadosQuestion {
  id: string;
  index: number;
  prompt: string;
  frameworkTags: string[];
  frameworkMetadata: {
    iso?: { family: string[]; topics: string[] };
    nist_privacy?: { functions: string[]; categories: string[] };
    lgpd?: { topics: string[] };
    ia?: { topics: string[] };
  };
  options: SeusdadosOption[];
}

export interface SeusdadosDomain {
  id: string;
  code: string;
  label: string;
  weight: number;
  questions: SeusdadosQuestion[];
}

export interface SeusdadosMaturityLevel {
  level: number;
  code: string;
  label: string;
}

// Níveis de Maturidade
export const SEUSDADOS_MATURITY_LEVELS: SeusdadosMaturityLevel[] = [
  { level: 1, code: 'NAO_INICIADO', label: 'Nível 1 - Não Iniciado' },
  { level: 2, code: 'INICIADO', label: 'Nível 2 - Iniciado' },
  { level: 3, code: 'EMERGENTE', label: 'Nível 3 - Emergente' },
  { level: 4, code: 'DESENVOLVIDO', label: 'Nível 4 - Desenvolvido' },
  { level: 5, code: 'OTIMIZADO', label: 'Nível 5 - Otimizado' },
];

// Domínios e Perguntas
export const SEUSDADOS_DOMAINS: SeusdadosDomain[] = [
  {
    id: 'DOM-CO',
    code: 'CULTURA_ORGANIZACIONAL',
    label: 'Cultura Organizacional',
    weight: 1.0,
    questions: [
      {
        id: 'CO-01',
        index: 1,
        prompt: 'O CPPD (Comitê de Privacidade e Proteção de Dados) é tratado pela alta gestão como órgão estratégico, e as ações de privacidade/proteção de dados são acompanhadas de forma recorrente e continuada?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27701-PIMS', '27001-Governanca'], topics: ['governanca', 'papel_da_alta_gestao', 'accountability'] },
          nist_privacy: { functions: ['GV-P'], categories: ['GV.PO-P', 'GV.MT-P', 'GV.OV-P'] },
          lgpd: { topics: ['prestacao_de_contas', 'governanca', 'seguranca'] }
        },
        options: [
          { id: 'CO-01-L1', level: 1, text: 'Privacidade e proteção de dados não fazem parte dos objetivos estratégicos.' },
          { id: 'CO-01-L2', level: 2, text: 'Privacidade e proteção de dados são discutidas pontualmente, sem acompanhamento estruturado pela alta gestão.' },
          { id: 'CO-01-L3', level: 3, text: 'Privacidade e proteção de dados fazem parte dos objetivos estratégicos, porém as ações não são acompanhadas.' },
          { id: 'CO-01-L4', level: 4, text: 'Privacidade e segurança fazem parte dos objetivos estratégicos e o órgão decisor acompanha a execução das ações, de forma esporádica.' },
          { id: 'CO-01-L5', level: 5, text: 'Privacidade e segurança fazem parte dos objetivos estratégicos e o órgão decisor acompanha a execução das ações de forma recorrente e continuada, com métricas e revisão periódica.' }
        ]
      },
      {
        id: 'CO-02',
        index: 2,
        prompt: 'A Política de Proteção de Dados (ou Código de Conduta com capítulo de privacidade) foi divulgada às partes aplicáveis e existe registro de ciência?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27701-PIMS', '27002-Politicas'], topics: ['politicas', 'conscientizacao', 'comunicacao'] },
          nist_privacy: { functions: ['GV-P', 'CT-P'], categories: ['GV.PO-P', 'CT.PO-P'] },
          lgpd: { topics: ['transparencia', 'prestacao_de_contas', 'seguranca'] }
        },
        options: [
          { id: 'CO-02-L1', level: 1, text: 'A organização não possui política de proteção de dados.' },
          { id: 'CO-02-L2', level: 2, text: 'A política existe, mas não foi disponibilizada/divulgada às partes aplicáveis.' },
          { id: 'CO-02-L3', level: 3, text: 'A política foi disponibilizada às partes aplicáveis, porém sem registro de disponibilização/ciência.' },
          { id: 'CO-02-L4', level: 4, text: 'A política foi disponibilizada às partes aplicáveis e há registro de disponibilização/ciência.' },
          { id: 'CO-02-L5', level: 5, text: 'A política foi disponibilizada, há registro auditável de ciência, revisões periódicas e mecanismos de verificação de entendimento/aderência.' }
        ]
      },
      {
        id: 'CO-03',
        index: 3,
        prompt: 'A organização possui NDA (Termo de Confidencialidade) vigente para partes internas e externas, com controle de ciência?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27002-RH', '27701-Relacionamento_com_terceiros'], topics: ['confidencialidade', 'contratos', 'terceiros'] },
          nist_privacy: { functions: ['GV-P', 'CT-P'], categories: ['GV.PO-P', 'CT.PO-P'] },
          lgpd: { topics: ['seguranca', 'confidencialidade', 'prestacao_de_contas'] }
        },
        options: [
          { id: 'CO-03-L1', level: 1, text: 'Não existe termo de confidencialidade.' },
          { id: 'CO-03-L2', level: 2, text: 'Existe termo, porém não é aplicado de forma consistente a todas as partes (internas e externas) e não há controle de ciência.' },
          { id: 'CO-03-L3', level: 3, text: 'Existe termo vigente e está em fase de disponibilização.' },
          { id: 'CO-03-L4', level: 4, text: 'Existe termo vigente, disponibilizado às partes internas e externas, com registro de ciência.' },
          { id: 'CO-03-L5', level: 5, text: 'Existe termo vigente com registro auditável, revisão periódica, trilhas por categoria de acesso e gestão de exceções.' }
        ]
      },
      {
        id: 'CO-04',
        index: 4,
        prompt: 'A organização implementou, nos contratos de trabalho e na integração de novos colaboradores, regras e orientações para conformidade com a LGPD?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27002-RH', '27701-PIMS'], topics: ['treinamento', 'requisitos_contratuais', 'onboarding'] },
          nist_privacy: { functions: ['GV-P', 'CT-P'], categories: ['GV.PO-P', 'CT.PO-P'] },
          lgpd: { topics: ['prestacao_de_contas', 'seguranca', 'governanca'] }
        },
        options: [
          { id: 'CO-04-L1', level: 1, text: 'Não existe referência à LGPD nos contratos de trabalho e integração.' },
          { id: 'CO-04-L2', level: 2, text: 'A organização está em processo inicial de adequação dos contratos dos colaboradores.' },
          { id: 'CO-04-L3', level: 3, text: 'A organização possui contrato adaptado à LGPD, porém não possui ação no processo de integração.' },
          { id: 'CO-04-L4', level: 4, text: 'A organização tem contrato de trabalho e integração de colaboradores já adaptados à LGPD.' },
          { id: 'CO-04-L5', level: 5, text: 'Além de contratos e integração adaptados, existe trilha de onboarding recorrente, checagem de entendimento e atualização contínua conforme mudanças internas.' }
        ]
      },
      {
        id: 'CO-05',
        index: 5,
        prompt: 'A capacitação dos colaboradores sobre LGPD, tratamento de dados pessoais e boas práticas de segurança da informação ocorre de forma periódica e recorrente?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27002-Conscientizacao', '27701-PIMS'], topics: ['treinamento', 'conscientizacao'] },
          nist_privacy: { functions: ['GV-P'], categories: ['GV.AT-P', 'GV.MT-P'] },
          lgpd: { topics: ['seguranca', 'prestacao_de_contas'] }
        },
        options: [
          { id: 'CO-05-L1', level: 1, text: 'Não são realizados treinamentos.' },
          { id: 'CO-05-L2', level: 2, text: 'Ocorre ocasionalmente, sem periodicidade definida.' },
          { id: 'CO-05-L3', level: 3, text: 'Ocorre ao menos uma capacitação anual.' },
          { id: 'CO-05-L4', level: 4, text: 'Ocorre de forma recorrente por meio de plano de conscientização.' },
          { id: 'CO-05-L5', level: 5, text: 'Plano recorrente com métricas, simulações/avaliações, trilhas por perfil e melhoria contínua baseada em incidentes e auditorias.' }
        ]
      },
      {
        id: 'CO-06',
        index: 6,
        prompt: 'O CPPD atua de forma efetiva no desenvolvimento das ações de conformidade com a LGPD junto às áreas, além das reuniões de governança com a DPO?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27701-PIMS', '27001-Governanca'], topics: ['governanca', 'comite', 'accountability'] },
          nist_privacy: { functions: ['GV-P'], categories: ['GV.OV-P', 'GV.MT-P'] },
          lgpd: { topics: ['prestacao_de_contas', 'governanca'] }
        },
        options: [
          { id: 'CO-06-L1', level: 1, text: 'O CPPD não tem atuado efetivamente.' },
          { id: 'CO-06-L2', level: 2, text: 'A atuação é limitada a reuniões de governança com a DPO, sem desdobramento nas áreas.' },
          { id: 'CO-06-L3', level: 3, text: 'O CPPD atua além das reuniões, porém com pouca efetividade nas ações.' },
          { id: 'CO-06-L4', level: 4, text: 'O CPPD cumpre sua função e seus membros disseminam a cultura de proteção de dados em todas as áreas.' },
          { id: 'CO-06-L5', level: 5, text: 'Atuação efetiva com metas por área, indicadores, ritos de acompanhamento e integração com gestão de riscos e estratégia organizacional.' }
        ]
      },
      {
        id: 'CO-07',
        index: 7,
        prompt: 'A organização possui procedimento formalizado para elaboração do RIPD e Avaliação do Legítimo Interesse (LIA), e as áreas estão capacitadas para utilizá-lo?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27701-Avaliacao_de_impacto', '27001-Riscos'], topics: ['ripd', 'lia', 'avaliacao_de_risco'] },
          nist_privacy: { functions: ['ID-P', 'GV-P'], categories: ['ID.RA-P', 'GV.RM-P'] },
          lgpd: { topics: ['ripd', 'legitimo_interesse', 'prestacao_de_contas'] }
        },
        options: [
          { id: 'CO-07-L1', level: 1, text: 'A organização não possui procedimento.' },
          { id: 'CO-07-L2', level: 2, text: 'Existe intenção ou discussão inicial, sem procedimento formal e sem treinamento.' },
          { id: 'CO-07-L3', level: 3, text: 'O procedimento existe, mas não houve treinamento e as áreas não estão aptas a preenchê-lo.' },
          { id: 'CO-07-L4', level: 4, text: 'O procedimento existe, houve treinamento, mas as áreas ainda não se consideram aptas a preenchê-lo com segurança.' },
          { id: 'CO-07-L5', level: 5, text: 'O procedimento existe, houve treinamento e as áreas estão aptas; há revisão, qualidade, trilha de aprovação e reuso de lições aprendidas.' }
        ]
      },
      {
        id: 'CO-08',
        index: 8,
        prompt: 'O CPPD estimula e cobra as áreas para realização de RIPD/LIA em novos processos ou desenvolvimentos, e as áreas atendem à demanda?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27701-Avaliacao_de_impacto', '27001-Riscos'], topics: ['ripd', 'lia', 'privacy_by_design'] },
          nist_privacy: { functions: ['ID-P', 'GV-P'], categories: ['ID.RA-P', 'GV.RM-P'] },
          lgpd: { topics: ['ripd', 'legitimo_interesse', 'privacy_by_design'] }
        },
        options: [
          { id: 'CO-08-L1', level: 1, text: 'Não há estímulo ou cobrança para realização de RIPD/LIA.' },
          { id: 'CO-08-L2', level: 2, text: 'O CPPD estimula, mas as áreas não atendem ou atendem de forma muito limitada.' },
          { id: 'CO-08-L3', level: 3, text: 'O CPPD estimula e as áreas atendem parcialmente, sem consistência.' },
          { id: 'CO-08-L4', level: 4, text: 'O CPPD estimula e as áreas atendem de forma consistente na maioria dos casos.' },
          { id: 'CO-08-L5', level: 5, text: 'Processo integrado ao ciclo de desenvolvimento, com gatilhos automáticos, revisão de qualidade e melhoria contínua.' }
        ]
      }
    ]
  },
  {
    id: 'DOM-PN',
    code: 'PROCESSOS_DE_NEGOCIO',
    label: 'Processos de Negócio',
    weight: 1.0,
    questions: [
      {
        id: 'PN-01',
        index: 1,
        prompt: 'A organização possui política ou norma sobre gerenciamento de documentos físicos e de todas as etapas do ciclo de vida de um dado pessoal (coleta, guarda, consulta, compartilhamento, eliminação)?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27701-PIMS', '27002-Gestao_de_ativos'], topics: ['ciclo_de_vida', 'retencao', 'descarte'] },
          nist_privacy: { functions: ['CT-P', 'PR-P'], categories: ['CT.DM-P', 'PR.DS-P'] },
          lgpd: { topics: ['ciclo_de_vida', 'retencao', 'eliminacao'] }
        },
        options: [
          { id: 'PN-01-L1', level: 1, text: 'Não existe política ou norma.' },
          { id: 'PN-01-L2', level: 2, text: 'Existe política ou norma, mas não contempla todas as etapas do ciclo de vida.' },
          { id: 'PN-01-L3', level: 3, text: 'Existe política ou norma que contempla todas as etapas, mas não está implementada.' },
          { id: 'PN-01-L4', level: 4, text: 'Existe política ou norma implementada que contempla todas as etapas do ciclo de vida.' },
          { id: 'PN-01-L5', level: 5, text: 'Política implementada, auditada, com automação de controles e melhoria contínua baseada em incidentes e auditorias.' }
        ]
      },
      {
        id: 'PN-02',
        index: 2,
        prompt: 'A organização possui procedimento para atender às solicitações de titulares de dados (acesso, retificação, exclusão, portabilidade, etc.)?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27701-PIMS', '27701-Direitos_do_titular'], topics: ['direitos_do_titular', 'acesso', 'retificacao', 'exclusao'] },
          nist_privacy: { functions: ['CT-P', 'CM-P'], categories: ['CT.DP-P', 'CM.AW-P'] },
          lgpd: { topics: ['direitos_do_titular', 'acesso', 'retificacao', 'exclusao', 'portabilidade'] }
        },
        options: [
          { id: 'PN-02-L1', level: 1, text: 'Não existe procedimento.' },
          { id: 'PN-02-L2', level: 2, text: 'Existe procedimento, mas não está implementado ou é desconhecido pelas áreas.' },
          { id: 'PN-02-L3', level: 3, text: 'Existe procedimento implementado, mas sem SLA ou métricas de atendimento.' },
          { id: 'PN-02-L4', level: 4, text: 'Existe procedimento implementado com SLA e métricas de atendimento.' },
          { id: 'PN-02-L5', level: 5, text: 'Procedimento automatizado, com portal de autoatendimento, SLA, métricas, auditoria e melhoria contínua.' }
        ]
      },
      {
        id: 'PN-03',
        index: 3,
        prompt: 'A organização possui procedimento para comunicação de incidentes de segurança envolvendo dados pessoais à ANPD e aos titulares afetados?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27701-PIMS', '27001-Gestao_de_incidentes'], topics: ['incidentes', 'notificacao', 'comunicacao'] },
          nist_privacy: { functions: ['RS-P', 'CM-P'], categories: ['RS.CO-P', 'CM.AW-P'] },
          lgpd: { topics: ['incidentes', 'notificacao', 'comunicacao_anpd'] }
        },
        options: [
          { id: 'PN-03-L1', level: 1, text: 'Não existe procedimento.' },
          { id: 'PN-03-L2', level: 2, text: 'Existe procedimento, mas não está implementado ou é desconhecido.' },
          { id: 'PN-03-L3', level: 3, text: 'Existe procedimento implementado, mas sem simulações ou testes.' },
          { id: 'PN-03-L4', level: 4, text: 'Existe procedimento implementado e testado periodicamente.' },
          { id: 'PN-03-L5', level: 5, text: 'Procedimento automatizado, com simulações, playbooks, integração com SOC e melhoria contínua baseada em incidentes reais.' }
        ]
      },
      {
        id: 'PN-04',
        index: 4,
        prompt: 'A organização possui mapeamento atualizado de todos os processos que tratam dados pessoais (inventário de dados)?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27701-PIMS', '27001-Inventario'], topics: ['inventario', 'mapeamento', 'registro_de_tratamento'] },
          nist_privacy: { functions: ['ID-P'], categories: ['ID.IM-P', 'ID.DE-P'] },
          lgpd: { topics: ['registro_de_tratamento', 'inventario', 'mapeamento'] }
        },
        options: [
          { id: 'PN-04-L1', level: 1, text: 'Não existe mapeamento.' },
          { id: 'PN-04-L2', level: 2, text: 'Existe mapeamento parcial ou desatualizado.' },
          { id: 'PN-04-L3', level: 3, text: 'Existe mapeamento completo, mas sem revisão periódica.' },
          { id: 'PN-04-L4', level: 4, text: 'Existe mapeamento completo e atualizado periodicamente.' },
          { id: 'PN-04-L5', level: 5, text: 'Mapeamento automatizado, integrado aos sistemas, com alertas de mudanças e revisão contínua.' }
        ]
      }
    ]
  },
  {
    id: 'DOM-GT',
    code: 'GOVERNANCA_DE_TI',
    label: 'Governança de TI',
    weight: 1.0,
    questions: [
      {
        id: 'GT-01',
        index: 1,
        prompt: 'Foi estabelecida uma Política de Segurança da Informação (PSI), aprovada pelo órgão decisor da organização?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27001-PSI', '27002-Politicas'], topics: ['psi', 'governanca', 'aprovacao'] },
          nist_privacy: { functions: ['GV-P'], categories: ['GV.PO-P'] },
          lgpd: { topics: ['seguranca', 'governanca'] }
        },
        options: [
          { id: 'GT-01-L1', level: 1, text: 'Não existe PSI.' },
          { id: 'GT-01-L2', level: 2, text: 'Existe PSI, mas não foi aprovada pelo órgão decisor.' },
          { id: 'GT-01-L3', level: 3, text: 'Existe PSI aprovada, mas não está implementada ou divulgada.' },
          { id: 'GT-01-L4', level: 4, text: 'Existe PSI aprovada, implementada e divulgada.' },
          { id: 'GT-01-L5', level: 5, text: 'PSI aprovada, implementada, divulgada, com revisão periódica, métricas de aderência e melhoria contínua.' }
        ]
      },
      {
        id: 'GT-02',
        index: 2,
        prompt: 'A organização possui processo formalizado para criação, alteração, revogação e revisão periódica de acessos?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27001-Controle_de_acesso', '27002-Gestao_de_identidade'], topics: ['controle_de_acesso', 'gestao_de_identidade', 'revisao_de_acessos'] },
          nist_privacy: { functions: ['PR-P'], categories: ['PR.AC-P', 'PR.PT-P'] },
          lgpd: { topics: ['seguranca', 'controle_de_acesso'] }
        },
        options: [
          { id: 'GT-02-L1', level: 1, text: 'Não existe processo formalizado.' },
          { id: 'GT-02-L2', level: 2, text: 'Existe processo, mas não contempla todas as etapas (criação, alteração, revogação, revisão).' },
          { id: 'GT-02-L3', level: 3, text: 'Existe processo que contempla todas as etapas, mas não está implementado.' },
          { id: 'GT-02-L4', level: 4, text: 'Existe processo implementado que contempla todas as etapas.' },
          { id: 'GT-02-L5', level: 5, text: 'Processo automatizado, com IAM, revisão periódica, segregação de funções e auditoria contínua.' }
        ]
      },
      {
        id: 'GT-03',
        index: 3,
        prompt: 'A organização possui processo de gestão de mudanças em sistemas e infraestrutura?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27001-Gestao_de_mudancas', '27002-Gestao_de_mudancas'], topics: ['gestao_de_mudancas', 'change_management'] },
          nist_privacy: { functions: ['PR-P'], categories: ['PR.IP-P'] },
          lgpd: { topics: ['seguranca'] }
        },
        options: [
          { id: 'GT-03-L1', level: 1, text: 'Não existe processo de gestão de mudanças.' },
          { id: 'GT-03-L2', level: 2, text: 'Existe processo, mas não é seguido de forma consistente.' },
          { id: 'GT-03-L3', level: 3, text: 'Existe processo seguido de forma consistente, mas sem registro ou aprovação formal.' },
          { id: 'GT-03-L4', level: 4, text: 'Existe processo com registro e aprovação formal.' },
          { id: 'GT-03-L5', level: 5, text: 'Processo automatizado, com CAB, análise de impacto, rollback e melhoria contínua.' }
        ]
      },
      {
        id: 'GT-04',
        index: 4,
        prompt: 'A organização possui processo de gestão de vulnerabilidades e patches?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27001-Vulnerabilidades', '27002-Gestao_de_vulnerabilidades'], topics: ['vulnerabilidades', 'patches', 'atualizacoes'] },
          nist_privacy: { functions: ['ID-P', 'PR-P'], categories: ['ID.RA-P', 'PR.IP-P'] },
          lgpd: { topics: ['seguranca'] }
        },
        options: [
          { id: 'GT-04-L1', level: 1, text: 'Não existe processo de gestão de vulnerabilidades.' },
          { id: 'GT-04-L2', level: 2, text: 'Existe processo, mas não é seguido de forma consistente.' },
          { id: 'GT-04-L3', level: 3, text: 'Existe processo seguido de forma consistente, mas sem SLA ou métricas.' },
          { id: 'GT-04-L4', level: 4, text: 'Existe processo com SLA e métricas de remediação.' },
          { id: 'GT-04-L5', level: 5, text: 'Processo automatizado, com scan contínuo, priorização por risco, SLA e melhoria contínua.' }
        ]
      },
      {
        id: 'GT-05',
        index: 5,
        prompt: 'A organização possui processo de backup e recuperação de dados?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27001-Backup', '27002-Backup'], topics: ['backup', 'recuperacao', 'continuidade'] },
          nist_privacy: { functions: ['PR-P', 'RC-P'], categories: ['PR.IP-P', 'RC.RP-P'] },
          lgpd: { topics: ['seguranca', 'disponibilidade'] }
        },
        options: [
          { id: 'GT-05-L1', level: 1, text: 'Não existe processo de backup.' },
          { id: 'GT-05-L2', level: 2, text: 'Existe processo, mas não contempla todos os sistemas críticos.' },
          { id: 'GT-05-L3', level: 3, text: 'Existe processo que contempla todos os sistemas críticos, mas sem testes de recuperação.' },
          { id: 'GT-05-L4', level: 4, text: 'Existe processo com testes de recuperação periódicos.' },
          { id: 'GT-05-L5', level: 5, text: 'Processo automatizado, com testes de recuperação, RPO/RTO definidos, criptografia e melhoria contínua.' }
        ]
      },
      {
        id: 'GT-06',
        index: 6,
        prompt: 'A organização possui processo de gestão de terceiros (fornecedores, parceiros) que tratam dados pessoais?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27701-Terceiros', '27001-Fornecedores'], topics: ['terceiros', 'fornecedores', 'due_diligence'] },
          nist_privacy: { functions: ['GV-P', 'ID-P'], categories: ['GV.SC-P', 'ID.SC-P'] },
          lgpd: { topics: ['operador', 'terceiros', 'compartilhamento'] }
        },
        options: [
          { id: 'GT-06-L1', level: 1, text: 'Não existe processo de gestão de terceiros.' },
          { id: 'GT-06-L2', level: 2, text: 'Existe processo, mas não contempla avaliação de riscos de privacidade.' },
          { id: 'GT-06-L3', level: 3, text: 'Existe processo com avaliação de riscos, mas sem monitoramento contínuo.' },
          { id: 'GT-06-L4', level: 4, text: 'Existe processo com avaliação de riscos e monitoramento periódico.' },
          { id: 'GT-06-L5', level: 5, text: 'Processo automatizado, com due diligence, cláusulas contratuais, monitoramento contínuo e melhoria contínua.' }
        ]
      },
      {
        id: 'GT-07',
        index: 7,
        prompt: 'A organização possui processo de desenvolvimento seguro (SDLC) com privacy by design?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27001-Desenvolvimento_seguro', '27701-Privacy_by_design'], topics: ['sdlc', 'privacy_by_design', 'desenvolvimento_seguro'] },
          nist_privacy: { functions: ['PR-P', 'ID-P'], categories: ['PR.DS-P', 'ID.BE-P'] },
          lgpd: { topics: ['privacy_by_design', 'seguranca'] }
        },
        options: [
          { id: 'GT-07-L1', level: 1, text: 'Não existe processo de desenvolvimento seguro.' },
          { id: 'GT-07-L2', level: 2, text: 'Existe processo, mas não contempla privacy by design.' },
          { id: 'GT-07-L3', level: 3, text: 'Existe processo com privacy by design, mas não é seguido de forma consistente.' },
          { id: 'GT-07-L4', level: 4, text: 'Existe processo com privacy by design seguido de forma consistente.' },
          { id: 'GT-07-L5', level: 5, text: 'Processo automatizado, com SAST/DAST, revisão de código, threat modeling e melhoria contínua.' }
        ]
      },
      {
        id: 'GT-08',
        index: 8,
        prompt: 'A organização possui processo de gestão de logs e trilhas de auditoria?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27001-Logs', '27002-Monitoramento'], topics: ['logs', 'auditoria', 'monitoramento'] },
          nist_privacy: { functions: ['DE-P', 'PR-P'], categories: ['DE.CM-P', 'PR.PT-P'] },
          lgpd: { topics: ['seguranca', 'prestacao_de_contas'] }
        },
        options: [
          { id: 'GT-08-L1', level: 1, text: 'Não existe processo de gestão de logs.' },
          { id: 'GT-08-L2', level: 2, text: 'Existe processo, mas não contempla todos os sistemas críticos.' },
          { id: 'GT-08-L3', level: 3, text: 'Existe processo que contempla todos os sistemas críticos, mas sem análise ou retenção adequada.' },
          { id: 'GT-08-L4', level: 4, text: 'Existe processo com análise e retenção adequada.' },
          { id: 'GT-08-L5', level: 5, text: 'Processo automatizado, com SIEM, correlação de eventos, alertas e melhoria contínua.' }
        ]
      },
      {
        id: 'GT-09',
        index: 9,
        prompt: 'A organização possui processo de gestão de continuidade de negócios (PCN) e recuperação de desastres (DRP)?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27001-Continuidade', '22301-BCM'], topics: ['continuidade', 'drp', 'bcm'] },
          nist_privacy: { functions: ['RC-P'], categories: ['RC.RP-P', 'RC.IM-P'] },
          lgpd: { topics: ['seguranca', 'disponibilidade'] }
        },
        options: [
          { id: 'GT-09-L1', level: 1, text: 'Não existe PCN/DRP.' },
          { id: 'GT-09-L2', level: 2, text: 'Existe PCN/DRP, mas não contempla dados pessoais.' },
          { id: 'GT-09-L3', level: 3, text: 'Existe PCN/DRP que contempla dados pessoais, mas sem testes.' },
          { id: 'GT-09-L4', level: 4, text: 'Existe PCN/DRP com testes periódicos.' },
          { id: 'GT-09-L5', level: 5, text: 'PCN/DRP automatizado, com testes, simulações, RTO/RPO definidos e melhoria contínua.' }
        ]
      },
      {
        id: 'GT-10',
        index: 10,
        prompt: 'A organização possui processo de classificação da informação?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27001-Classificacao', '27002-Classificacao'], topics: ['classificacao', 'rotulagem'] },
          nist_privacy: { functions: ['ID-P'], categories: ['ID.AM-P'] },
          lgpd: { topics: ['seguranca', 'dados_sensiveis'] }
        },
        options: [
          { id: 'GT-10-L1', level: 1, text: 'Não existe processo de classificação.' },
          { id: 'GT-10-L2', level: 2, text: 'Existe processo, mas não contempla dados pessoais.' },
          { id: 'GT-10-L3', level: 3, text: 'Existe processo que contempla dados pessoais, mas não está implementado.' },
          { id: 'GT-10-L4', level: 4, text: 'Existe processo implementado com rotulagem.' },
          { id: 'GT-10-L5', level: 5, text: 'Processo automatizado, com DLP, rotulagem automática e melhoria contínua.' }
        ]
      }
    ]
  },
  {
    id: 'DOM-SI',
    code: 'SEGURANCA_DA_INFORMACAO',
    label: 'Segurança da Informação',
    weight: 1.0,
    questions: [
      {
        id: 'SI-01',
        index: 1,
        prompt: 'A organização possui criptografia de dados em repouso para dados pessoais?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27001-Criptografia', '27002-Criptografia'], topics: ['criptografia', 'dados_em_repouso'] },
          nist_privacy: { functions: ['PR-P'], categories: ['PR.DS-P'] },
          lgpd: { topics: ['seguranca', 'criptografia'] }
        },
        options: [
          { id: 'SI-01-L1', level: 1, text: 'Não há criptografia de dados em repouso.' },
          { id: 'SI-01-L2', level: 2, text: 'Há criptografia parcial, apenas em alguns sistemas.' },
          { id: 'SI-01-L3', level: 3, text: 'Há criptografia em todos os sistemas críticos, mas sem gestão de chaves.' },
          { id: 'SI-01-L4', level: 4, text: 'Há criptografia em todos os sistemas críticos com gestão de chaves.' },
          { id: 'SI-01-L5', level: 5, text: 'Criptografia com gestão de chaves automatizada, HSM, rotação de chaves e auditoria.' }
        ]
      },
      {
        id: 'SI-02',
        index: 2,
        prompt: 'A organização possui criptografia de dados em trânsito para dados pessoais?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27001-Criptografia', '27002-Criptografia'], topics: ['criptografia', 'dados_em_transito'] },
          nist_privacy: { functions: ['PR-P'], categories: ['PR.DS-P'] },
          lgpd: { topics: ['seguranca', 'criptografia'] }
        },
        options: [
          { id: 'SI-02-L1', level: 1, text: 'Não há criptografia de dados em trânsito.' },
          { id: 'SI-02-L2', level: 2, text: 'Há criptografia parcial, apenas em alguns canais.' },
          { id: 'SI-02-L3', level: 3, text: 'Há criptografia em todos os canais críticos, mas sem certificados válidos.' },
          { id: 'SI-02-L4', level: 4, text: 'Há criptografia em todos os canais com certificados válidos.' },
          { id: 'SI-02-L5', level: 5, text: 'Criptografia com TLS 1.3, certificados gerenciados, HSTS e auditoria contínua.' }
        ]
      },
      {
        id: 'SI-03',
        index: 3,
        prompt: 'A organização possui controle de acesso baseado em papéis (RBAC) ou atributos (ABAC)?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27001-Controle_de_acesso', '27002-Controle_de_acesso'], topics: ['rbac', 'abac', 'controle_de_acesso'] },
          nist_privacy: { functions: ['PR-P'], categories: ['PR.AC-P'] },
          lgpd: { topics: ['seguranca', 'controle_de_acesso'] }
        },
        options: [
          { id: 'SI-03-L1', level: 1, text: 'Não há controle de acesso baseado em papéis.' },
          { id: 'SI-03-L2', level: 2, text: 'Há controle parcial, apenas em alguns sistemas.' },
          { id: 'SI-03-L3', level: 3, text: 'Há controle em todos os sistemas críticos, mas sem revisão periódica.' },
          { id: 'SI-03-L4', level: 4, text: 'Há controle em todos os sistemas com revisão periódica.' },
          { id: 'SI-03-L5', level: 5, text: 'Controle automatizado, com IAM, segregação de funções, revisão contínua e auditoria.' }
        ]
      },
      {
        id: 'SI-04',
        index: 4,
        prompt: 'A organização possui autenticação multifator (MFA) para acesso a sistemas com dados pessoais?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27001-Autenticacao', '27002-Autenticacao'], topics: ['mfa', 'autenticacao'] },
          nist_privacy: { functions: ['PR-P'], categories: ['PR.AC-P'] },
          lgpd: { topics: ['seguranca', 'autenticacao'] }
        },
        options: [
          { id: 'SI-04-L1', level: 1, text: 'Não há MFA.' },
          { id: 'SI-04-L2', level: 2, text: 'Há MFA parcial, apenas em alguns sistemas.' },
          { id: 'SI-04-L3', level: 3, text: 'Há MFA em todos os sistemas críticos, mas sem gestão centralizada.' },
          { id: 'SI-04-L4', level: 4, text: 'Há MFA em todos os sistemas com gestão centralizada.' },
          { id: 'SI-04-L5', level: 5, text: 'MFA com gestão centralizada, autenticação adaptativa, biometria e auditoria.' }
        ]
      },
      {
        id: 'SI-05',
        index: 5,
        prompt: 'A organização possui auditoria de acessos a dados pessoais?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27001-Auditoria', '27002-Monitoramento'], topics: ['auditoria', 'monitoramento'] },
          nist_privacy: { functions: ['DE-P'], categories: ['DE.CM-P'] },
          lgpd: { topics: ['seguranca', 'prestacao_de_contas'] }
        },
        options: [
          { id: 'SI-05-L1', level: 1, text: 'Não há auditoria de acessos.' },
          { id: 'SI-05-L2', level: 2, text: 'Há auditoria parcial, apenas em alguns sistemas.' },
          { id: 'SI-05-L3', level: 3, text: 'Há auditoria em todos os sistemas críticos, mas sem análise.' },
          { id: 'SI-05-L4', level: 4, text: 'Há auditoria em todos os sistemas com análise periódica.' },
          { id: 'SI-05-L5', level: 5, text: 'Auditoria automatizada, com SIEM, alertas, correlação de eventos e melhoria contínua.' }
        ]
      },
      {
        id: 'SI-06',
        index: 6,
        prompt: 'A organização possui gestão de vulnerabilidades com scan periódico?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27001-Vulnerabilidades', '27002-Vulnerabilidades'], topics: ['vulnerabilidades', 'scan'] },
          nist_privacy: { functions: ['ID-P'], categories: ['ID.RA-P'] },
          lgpd: { topics: ['seguranca'] }
        },
        options: [
          { id: 'SI-06-L1', level: 1, text: 'Não há gestão de vulnerabilidades.' },
          { id: 'SI-06-L2', level: 2, text: 'Há scan esporádico, sem processo definido.' },
          { id: 'SI-06-L3', level: 3, text: 'Há scan periódico, mas sem SLA de remediação.' },
          { id: 'SI-06-L4', level: 4, text: 'Há scan periódico com SLA de remediação.' },
          { id: 'SI-06-L5', level: 5, text: 'Scan contínuo, com priorização por risco, SLA, automação de remediação e melhoria contínua.' }
        ]
      },
      {
        id: 'SI-07',
        index: 7,
        prompt: 'A organização realiza testes de segurança (pentest, red team) periodicamente?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27001-Testes', '27002-Testes'], topics: ['pentest', 'red_team', 'testes'] },
          nist_privacy: { functions: ['ID-P', 'DE-P'], categories: ['ID.RA-P', 'DE.DP-P'] },
          lgpd: { topics: ['seguranca'] }
        },
        options: [
          { id: 'SI-07-L1', level: 1, text: 'Não são realizados testes de segurança.' },
          { id: 'SI-07-L2', level: 2, text: 'São realizados testes esporádicos, sem processo definido.' },
          { id: 'SI-07-L3', level: 3, text: 'São realizados testes periódicos, mas sem plano de remediação.' },
          { id: 'SI-07-L4', level: 4, text: 'São realizados testes periódicos com plano de remediação.' },
          { id: 'SI-07-L5', level: 5, text: 'Testes contínuos, com red team, bug bounty, automação e melhoria contínua.' }
        ]
      },
      {
        id: 'SI-08',
        index: 8,
        prompt: 'A organização possui isolamento de sistemas que tratam dados pessoais sensíveis?',
        frameworkTags: ['ISO', 'NIST', 'LGPD'],
        frameworkMetadata: {
          iso: { family: ['27001-Segmentacao', '27002-Redes'], topics: ['segmentacao', 'isolamento'] },
          nist_privacy: { functions: ['PR-P'], categories: ['PR.AC-P', 'PR.DS-P'] },
          lgpd: { topics: ['seguranca', 'dados_sensiveis'] }
        },
        options: [
          { id: 'SI-08-L1', level: 1, text: 'Não há isolamento de sistemas.' },
          { id: 'SI-08-L2', level: 2, text: 'Há isolamento parcial, apenas em alguns sistemas.' },
          { id: 'SI-08-L3', level: 3, text: 'Há isolamento em todos os sistemas críticos, mas sem monitoramento.' },
          { id: 'SI-08-L4', level: 4, text: 'Há isolamento em todos os sistemas com monitoramento.' },
          { id: 'SI-08-L5', level: 5, text: 'Isolamento com micro-segmentação, zero trust, monitoramento contínuo e melhoria contínua.' }
        ]
      }
    ]
  },
  {
    id: 'DOM-IA',
    code: 'INTELIGENCIA_ARTIFICIAL',
    label: 'Inteligência Artificial',
    weight: 1.0,
    questions: [
      {
        id: 'IA-01',
        index: 1,
        prompt: 'A organização possui inventário de sistemas de IA que tratam dados pessoais?',
        frameworkTags: ['ISO', 'NIST', 'LGPD', 'IA'],
        frameworkMetadata: {
          iso: { family: ['27001-Inventario', '42001-IA'], topics: ['inventario', 'ia'] },
          nist_privacy: { functions: ['ID-P'], categories: ['ID.AM-P'] },
          lgpd: { topics: ['registro_de_tratamento', 'ia'] },
          ia: { topics: ['inventario', 'governanca'] }
        },
        options: [
          { id: 'IA-01-L1', level: 1, text: 'Não há inventário de sistemas de IA.' },
          { id: 'IA-01-L2', level: 2, text: 'Há inventário parcial ou desatualizado.' },
          { id: 'IA-01-L3', level: 3, text: 'Há inventário completo, mas sem classificação de risco.' },
          { id: 'IA-01-L4', level: 4, text: 'Há inventário completo com classificação de risco.' },
          { id: 'IA-01-L5', level: 5, text: 'Inventário automatizado, com classificação de risco, monitoramento contínuo e melhoria contínua.' }
        ]
      },
      {
        id: 'IA-02',
        index: 2,
        prompt: 'A organização possui processo de avaliação de impacto de IA (AIA) para sistemas que tratam dados pessoais?',
        frameworkTags: ['ISO', 'NIST', 'LGPD', 'IA'],
        frameworkMetadata: {
          iso: { family: ['27701-Avaliacao_de_impacto', '42001-IA'], topics: ['aia', 'avaliacao_de_impacto'] },
          nist_privacy: { functions: ['ID-P', 'GV-P'], categories: ['ID.RA-P', 'GV.RM-P'] },
          lgpd: { topics: ['ripd', 'ia'] },
          ia: { topics: ['aia', 'avaliacao_de_impacto'] }
        },
        options: [
          { id: 'IA-02-L1', level: 1, text: 'Não há processo de AIA.' },
          { id: 'IA-02-L2', level: 2, text: 'Há processo, mas não é aplicado de forma consistente.' },
          { id: 'IA-02-L3', level: 3, text: 'Há processo aplicado de forma consistente, mas sem revisão periódica.' },
          { id: 'IA-02-L4', level: 4, text: 'Há processo com revisão periódica.' },
          { id: 'IA-02-L5', level: 5, text: 'Processo automatizado, com revisão contínua, métricas e melhoria contínua.' }
        ]
      },
      {
        id: 'IA-03',
        index: 3,
        prompt: 'A organização possui processo de explicabilidade e transparência para decisões automatizadas que afetam titulares?',
        frameworkTags: ['ISO', 'NIST', 'LGPD', 'IA'],
        frameworkMetadata: {
          iso: { family: ['42001-IA'], topics: ['explicabilidade', 'transparencia'] },
          nist_privacy: { functions: ['CT-P'], categories: ['CT.DP-P'] },
          lgpd: { topics: ['decisao_automatizada', 'transparencia'] },
          ia: { topics: ['explicabilidade', 'transparencia', 'xai'] }
        },
        options: [
          { id: 'IA-03-L1', level: 1, text: 'Não há processo de explicabilidade.' },
          { id: 'IA-03-L2', level: 2, text: 'Há processo, mas não é aplicado de forma consistente.' },
          { id: 'IA-03-L3', level: 3, text: 'Há processo aplicado de forma consistente, mas sem documentação.' },
          { id: 'IA-03-L4', level: 4, text: 'Há processo com documentação e comunicação aos titulares.' },
          { id: 'IA-03-L5', level: 5, text: 'Processo automatizado, com XAI, documentação, comunicação proativa e melhoria contínua.' }
        ]
      },
      {
        id: 'IA-04',
        index: 4,
        prompt: 'A organização possui processo de supervisão humana para decisões automatizadas de alto impacto?',
        frameworkTags: ['ISO', 'NIST', 'LGPD', 'IA'],
        frameworkMetadata: {
          iso: { family: ['42001-IA'], topics: ['supervisao_humana', 'human_in_the_loop'] },
          nist_privacy: { functions: ['GV-P'], categories: ['GV.OV-P'] },
          lgpd: { topics: ['decisao_automatizada', 'revisao_humana'] },
          ia: { topics: ['supervisao_humana', 'human_in_the_loop'] }
        },
        options: [
          { id: 'IA-04-L1', level: 1, text: 'Não há supervisão humana.' },
          { id: 'IA-04-L2', level: 2, text: 'Há supervisão parcial, apenas em alguns casos.' },
          { id: 'IA-04-L3', level: 3, text: 'Há supervisão em todos os casos de alto impacto, mas sem processo definido.' },
          { id: 'IA-04-L4', level: 4, text: 'Há supervisão com processo definido e documentado.' },
          { id: 'IA-04-L5', level: 5, text: 'Supervisão automatizada, com alertas, escalação, auditoria e melhoria contínua.' }
        ]
      },
      {
        id: 'IA-05',
        index: 5,
        prompt: 'A organização possui processo de monitoramento de viés e discriminação em sistemas de IA?',
        frameworkTags: ['ISO', 'NIST', 'LGPD', 'IA'],
        frameworkMetadata: {
          iso: { family: ['42001-IA'], topics: ['vies', 'discriminacao', 'fairness'] },
          nist_privacy: { functions: ['ID-P', 'GV-P'], categories: ['ID.RA-P', 'GV.RM-P'] },
          lgpd: { topics: ['discriminacao', 'dados_sensiveis'] },
          ia: { topics: ['vies', 'discriminacao', 'fairness'] }
        },
        options: [
          { id: 'IA-05-L1', level: 1, text: 'Não há monitoramento de viés.' },
          { id: 'IA-05-L2', level: 2, text: 'Há monitoramento esporádico, sem processo definido.' },
          { id: 'IA-05-L3', level: 3, text: 'Há monitoramento periódico, mas sem métricas de fairness.' },
          { id: 'IA-05-L4', level: 4, text: 'Há monitoramento com métricas de fairness.' },
          { id: 'IA-05-L5', level: 5, text: 'Monitoramento contínuo, com métricas de fairness, alertas, remediação e melhoria contínua.' }
        ]
      },
      {
        id: 'IA-06',
        index: 6,
        prompt: 'A organização possui processo de gestão de dados de treinamento de IA?',
        frameworkTags: ['ISO', 'NIST', 'LGPD', 'IA'],
        frameworkMetadata: {
          iso: { family: ['42001-IA', '27001-Gestao_de_dados'], topics: ['dados_de_treinamento', 'qualidade_de_dados'] },
          nist_privacy: { functions: ['CT-P'], categories: ['CT.DM-P'] },
          lgpd: { topics: ['qualidade', 'finalidade'] },
          ia: { topics: ['dados_de_treinamento', 'qualidade_de_dados'] }
        },
        options: [
          { id: 'IA-06-L1', level: 1, text: 'Não há gestão de dados de treinamento.' },
          { id: 'IA-06-L2', level: 2, text: 'Há gestão parcial, sem processo definido.' },
          { id: 'IA-06-L3', level: 3, text: 'Há gestão com processo definido, mas sem controle de qualidade.' },
          { id: 'IA-06-L4', level: 4, text: 'Há gestão com controle de qualidade.' },
          { id: 'IA-06-L5', level: 5, text: 'Gestão automatizada, com controle de qualidade, lineage, versionamento e melhoria contínua.' }
        ]
      },
      {
        id: 'IA-07',
        index: 7,
        prompt: 'A organização possui processo de gestão de modelos de IA (MLOps)?',
        frameworkTags: ['ISO', 'NIST', 'LGPD', 'IA'],
        frameworkMetadata: {
          iso: { family: ['42001-IA'], topics: ['mlops', 'gestao_de_modelos'] },
          nist_privacy: { functions: ['PR-P'], categories: ['PR.IP-P'] },
          lgpd: { topics: ['seguranca'] },
          ia: { topics: ['mlops', 'gestao_de_modelos'] }
        },
        options: [
          { id: 'IA-07-L1', level: 1, text: 'Não há gestão de modelos.' },
          { id: 'IA-07-L2', level: 2, text: 'Há gestão parcial, sem processo definido.' },
          { id: 'IA-07-L3', level: 3, text: 'Há gestão com processo definido, mas sem versionamento.' },
          { id: 'IA-07-L4', level: 4, text: 'Há gestão com versionamento e monitoramento.' },
          { id: 'IA-07-L5', level: 5, text: 'MLOps completo, com CI/CD, versionamento, monitoramento, rollback e melhoria contínua.' }
        ]
      },
      {
        id: 'IA-08',
        index: 8,
        prompt: 'A organização possui processo de segurança de IA (adversarial attacks, model poisoning)?',
        frameworkTags: ['ISO', 'NIST', 'LGPD', 'IA'],
        frameworkMetadata: {
          iso: { family: ['42001-IA', '27001-Seguranca'], topics: ['seguranca_ia', 'adversarial'] },
          nist_privacy: { functions: ['PR-P', 'DE-P'], categories: ['PR.DS-P', 'DE.CM-P'] },
          lgpd: { topics: ['seguranca'] },
          ia: { topics: ['seguranca_ia', 'adversarial', 'model_poisoning'] }
        },
        options: [
          { id: 'IA-08-L1', level: 1, text: 'Não há processo de segurança de IA.' },
          { id: 'IA-08-L2', level: 2, text: 'Há processo, mas não contempla ameaças específicas de IA.' },
          { id: 'IA-08-L3', level: 3, text: 'Há processo que contempla ameaças específicas, mas sem testes.' },
          { id: 'IA-08-L4', level: 4, text: 'Há processo com testes periódicos.' },
          { id: 'IA-08-L5', level: 5, text: 'Processo automatizado, com red team de IA, testes contínuos e melhoria contínua.' }
        ]
      },
      {
        id: 'IA-09',
        index: 9,
        prompt: 'A organização possui processo de gestão de fornecedores de IA (SaaS, APIs)?',
        frameworkTags: ['ISO', 'NIST', 'LGPD', 'IA'],
        frameworkMetadata: {
          iso: { family: ['42001-IA', '27001-Fornecedores'], topics: ['fornecedores_ia', 'terceiros'] },
          nist_privacy: { functions: ['GV-P', 'ID-P'], categories: ['GV.SC-P', 'ID.SC-P'] },
          lgpd: { topics: ['operador', 'terceiros', 'compartilhamento'] },
          ia: { topics: ['fornecedores_ia', 'saas', 'apis'] }
        },
        options: [
          { id: 'IA-09-L1', level: 1, text: 'Não há gestão de fornecedores de IA.' },
          { id: 'IA-09-L2', level: 2, text: 'Há gestão parcial, sem avaliação de riscos.' },
          { id: 'IA-09-L3', level: 3, text: 'Há gestão com avaliação de riscos, mas sem monitoramento.' },
          { id: 'IA-09-L4', level: 4, text: 'Há gestão com avaliação de riscos e monitoramento periódico.' },
          { id: 'IA-09-L5', level: 5, text: 'Gestão automatizada, com due diligence, cláusulas contratuais, monitoramento contínuo e melhoria contínua.' }
        ]
      }
    ]
  }
];

// Funções auxiliares
export function getAllQuestions(): SeusdadosQuestion[] {
  return SEUSDADOS_DOMAINS.flatMap(domain => domain.questions);
}

export function getQuestionById(questionId: string): SeusdadosQuestion | undefined {
  return getAllQuestions().find(q => q.id === questionId);
}

export function getDomainByCode(domainCode: string): SeusdadosDomain | undefined {
  return SEUSDADOS_DOMAINS.find(d => d.code === domainCode);
}

export function getQuestionsByDomain(domainCode: string): SeusdadosQuestion[] {
  const domain = getDomainByCode(domainCode);
  return domain ? domain.questions : [];
}

export function getMaturityLevelLabel(level: number): string {
  const maturityLevel = SEUSDADOS_MATURITY_LEVELS.find(l => l.level === level);
  return maturityLevel ? maturityLevel.label : 'Desconhecido';
}

export function getMaturityLevelCode(level: number): string {
  const maturityLevel = SEUSDADOS_MATURITY_LEVELS.find(l => l.level === level);
  return maturityLevel ? maturityLevel.code : 'UNKNOWN';
}

// Cálculo de scores
export interface DomainScore {
  domainCode: string;
  domainLabel: string;
  scoreAvg: number;
  levelRounded: number;
  answeredQuestions: number;
  totalQuestions: number;
  distribution: { l1: number; l2: number; l3: number; l4: number; l5: number };
}

export interface OverallScore {
  scoreAvg: number;
  levelRounded: number;
  answeredQuestions: number;
  totalQuestions: number;
}

export function calculateDomainScore(answers: { questionCode: string; selectedLevel: number }[], domainCode: string): DomainScore {
  const domain = getDomainByCode(domainCode);
  if (!domain) {
    return {
      domainCode,
      domainLabel: 'Desconhecido',
      scoreAvg: 0,
      levelRounded: 0,
      answeredQuestions: 0,
      totalQuestions: 0,
      distribution: { l1: 0, l2: 0, l3: 0, l4: 0, l5: 0 }
    };
  }

  const domainQuestionIds = domain.questions.map(q => q.id);
  const domainAnswers = answers.filter(a => domainQuestionIds.includes(a.questionCode));
  
  const distribution = { l1: 0, l2: 0, l3: 0, l4: 0, l5: 0 };
  let totalLevel = 0;
  
  domainAnswers.forEach(a => {
    totalLevel += a.selectedLevel;
    const key = `l${a.selectedLevel}` as keyof typeof distribution;
    distribution[key]++;
  });

  const scoreAvg = domainAnswers.length > 0 ? totalLevel / domainAnswers.length : 0;
  const levelRounded = Math.round(scoreAvg);

  return {
    domainCode,
    domainLabel: domain.label,
    scoreAvg: Number(scoreAvg.toFixed(2)),
    levelRounded,
    answeredQuestions: domainAnswers.length,
    totalQuestions: domain.questions.length,
    distribution
  };
}

export function calculateOverallScore(answers: { questionCode: string; selectedLevel: number }[]): OverallScore {
  const totalQuestions = getAllQuestions().length;
  
  if (answers.length === 0) {
    return {
      scoreAvg: 0,
      levelRounded: 0,
      answeredQuestions: 0,
      totalQuestions
    };
  }

  const totalLevel = answers.reduce((sum, a) => sum + a.selectedLevel, 0);
  const scoreAvg = totalLevel / answers.length;
  const levelRounded = Math.round(scoreAvg);

  return {
    scoreAvg: Number(scoreAvg.toFixed(2)),
    levelRounded,
    answeredQuestions: answers.length,
    totalQuestions
  };
}

export function calculateAllDomainScores(answers: { questionCode: string; selectedLevel: number }[]): DomainScore[] {
  return SEUSDADOS_DOMAINS.map(domain => calculateDomainScore(answers, domain.code));
}

// Geração de plano de ação
export interface ActionPlanItem {
  actionId: string;
  title: string;
  domainCode: string;
  relatedQuestionIds: string[];
  targetLevel: number;
  currentLevel: number;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  effort: 'S' | 'M' | 'L' | 'XL';
  ownerRole: string;
  acceptanceCriteria: string[];
  evidenceRequired: string[];
}

export function generateActionPlan(answers: { questionCode: string; selectedLevel: number }[]): ActionPlanItem[] {
  const actionPlan: ActionPlanItem[] = [];
  
  // Identificar gaps (perguntas com nível < 4)
  const gaps = answers.filter(a => a.selectedLevel < 4);
  
  gaps.forEach(gap => {
    const question = getQuestionById(gap.questionCode);
    if (!question) return;
    
    const domain = SEUSDADOS_DOMAINS.find(d => d.questions.some(q => q.id === gap.questionCode));
    if (!domain) return;
    
    // Determinar prioridade baseada no nível atual
    let priority: 'P0' | 'P1' | 'P2' | 'P3';
    if (gap.selectedLevel === 1) priority = 'P0';
    else if (gap.selectedLevel === 2) priority = 'P1';
    else priority = 'P2';
    
    // Determinar esforço baseado no gap
    const gapSize = 4 - gap.selectedLevel;
    let effort: 'S' | 'M' | 'L' | 'XL';
    if (gapSize === 1) effort = 'S';
    else if (gapSize === 2) effort = 'M';
    else effort = 'L';
    
    actionPlan.push({
      actionId: `ACT-${gap.questionCode}`,
      title: `Elevar maturidade: ${question.prompt.substring(0, 100)}...`,
      domainCode: domain.code,
      relatedQuestionIds: [gap.questionCode],
      targetLevel: 4,
      currentLevel: gap.selectedLevel,
      priority,
      effort,
      ownerRole: 'DPO/CPPD',
      acceptanceCriteria: [
        `Atingir nível 4 (Desenvolvido) na questão ${gap.questionCode}`,
        'Documentar evidências de implementação'
      ],
      evidenceRequired: [
        'Documentação de processo',
        'Registros de implementação',
        'Evidências de treinamento (se aplicável)'
      ]
    });
  });
  
  // Ordenar por prioridade
  return actionPlan.sort((a, b) => {
    const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}
