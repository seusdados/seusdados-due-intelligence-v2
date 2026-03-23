/**
 * Seusdados Due Diligence - Incident Response Module
 * Default Data for Phases and Checklists
 */

import { Phase, PhaseStatus, EmergencyContact } from '../types';

/**
 * Generate unique ID
 */
const generateId = (prefix: string): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Default phases based on NIST + LGPD/ANPD requirements
 */
export function getDefaultPhases(): Phase[] {
  return [
    {
      id: 0,
      name: 'Preparação',
      description: 'Estabelecer postura de segurança e resiliência organizacional',
      status: PhaseStatus.COMPLETED, // Assumed prepared
      items: [
        {
          id: generateId('item'),
          title: 'PRIDP disponível',
          description: 'Plano de Resposta a Incidentes de Dados Pessoais acessível',
          isChecked: true,
          isRequired: true
        },
        {
          id: generateId('item'),
          title: 'Inventário de dados atualizado',
          description: 'IDP - Inventário de Dados Pessoais revisado',
          isChecked: true,
          isRequired: true
        },
        {
          id: generateId('item'),
          title: 'SIEM configurado',
          description: 'Sistema de monitoramento ativo e funcional',
          isChecked: true,
          isRequired: false
        },
        {
          id: generateId('item'),
          title: 'Equipe TRI definida',
          description: 'Time de Resposta a Incidentes identificado e treinado',
          isChecked: true,
          isRequired: true
        },
        {
          id: generateId('item'),
          title: 'Canais de comunicação testados',
          description: 'E-mail, telefone e chat de emergência verificados',
          isChecked: true,
          isRequired: false
        }
      ],
      completedAt: new Date()
    },
    {
      id: 1,
      name: 'Identificação',
      description: 'Detecção e Análise - Detectar, analisar e classificar o evento',
      status: PhaseStatus.ACTIVE,
      items: [
        {
          id: generateId('item'),
          title: 'Evento detectado',
          description: 'Alerta recebido via SIEM, relato ou outra fonte',
          isChecked: false,
          isRequired: true
        },
        {
          id: generateId('item'),
          title: 'Falso positivo descartado',
          description: 'Confirmação de que é um incidente real',
          isChecked: false,
          isRequired: true
        },
        {
          id: generateId('item'),
          title: 'Escopo inicial definido',
          description: 'Sistemas e dados potencialmente afetados identificados',
          isChecked: false,
          isRequired: true
        },
        {
          id: generateId('item'),
          title: 'Classificação de criticidade',
          description: 'Nível de impacto definido (Alto/Médio/Baixo)',
          isChecked: false,
          isRequired: true
        },
        {
          id: generateId('item'),
          title: 'Triagem LGPD realizada',
          description: 'Verificação se envolve dados pessoais e nível de risco',
          isChecked: false,
          isRequired: true
        },
        {
          id: generateId('item'),
          title: 'Encarregado notificado',
          description: 'DPO informado do incidente',
          isChecked: false,
          isRequired: true
        }
      ]
    },
    {
      id: 2,
      name: 'Contenção',
      description: 'Isolar o incidente e limitar danos',
      status: PhaseStatus.PENDING,
      items: [
        {
          id: generateId('item'),
          title: 'Estratégia de contenção definida',
          description: 'Plano de isolamento aprovado pela equipe',
          isChecked: false,
          isRequired: true
        },
        {
          id: generateId('item'),
          title: 'Sistemas isolados',
          description: 'Rede/dispositivos comprometidos segregados',
          isChecked: false,
          isRequired: true
        },
        {
          id: generateId('item'),
          title: 'Propagação interrompida',
          description: 'Movimento lateral do atacante bloqueado',
          isChecked: false,
          isRequired: true
        },
        {
          id: generateId('item'),
          title: 'Evidências preservadas',
          description: 'Snapshots, logs e hashes coletados',
          isChecked: false,
          isRequired: true
        },
        {
          id: generateId('item'),
          title: 'Cadeia de custódia iniciada',
          description: 'Documentação formal de posse das provas',
          isChecked: false,
          isRequired: false
        }
      ]
    },
    {
      id: 3,
      name: 'Remediação',
      description: 'Erradicação e Recuperação - Eliminar causa raiz e restaurar',
      status: PhaseStatus.PENDING,
      items: [
        {
          id: generateId('item'),
          title: 'Causa raiz identificada',
          description: 'ACR - Análise de Causa Raiz concluída',
          isChecked: false,
          isRequired: true
        },
        {
          id: generateId('item'),
          title: 'Vulnerabilidade corrigida',
          description: 'Patches e reconfigurações aplicados',
          isChecked: false,
          isRequired: true
        },
        {
          id: generateId('item'),
          title: 'ANPD comunicada',
          description: 'Formulário CIS enviado (prazo: 3 dias úteis)',
          isChecked: false,
          isRequired: false // Depends on triage
        },
        {
          id: generateId('item'),
          title: 'Titulares notificados',
          description: 'Comunicação individual ou por meios amplos',
          isChecked: false,
          isRequired: false // Depends on triage
        },
        {
          id: generateId('item'),
          title: 'Sistemas restaurados',
          description: 'Backups validados e restauração completa',
          isChecked: false,
          isRequired: true
        },
        {
          id: generateId('item'),
          title: 'Testes de integridade',
          description: 'Verificação de funcionamento normal',
          isChecked: false,
          isRequired: true
        }
      ]
    },
    {
      id: 4,
      name: 'Monitoramento',
      description: 'Vigilância reforçada pós-incidente',
      status: PhaseStatus.PENDING,
      items: [
        {
          id: generateId('item'),
          title: 'Vigilância reforçada ativa',
          description: 'Monitoramento intensificado nos sistemas afetados',
          isChecked: false,
          isRequired: true
        },
        {
          id: generateId('item'),
          title: 'Medidas temporárias revertidas',
          description: 'Configurações de emergência normalizadas',
          isChecked: false,
          isRequired: false
        },
        {
          id: generateId('item'),
          title: 'KPIs coletados',
          description: 'MTTD, MTTC, MTTR documentados',
          isChecked: false,
          isRequired: false
        },
        {
          id: generateId('item'),
          title: 'Sem atividade residual',
          description: 'Confirmação de erradicação total da ameaça',
          isChecked: false,
          isRequired: true
        }
      ]
    },
    {
      id: 5,
      name: 'Encerramento',
      description: 'Aprendizado e fechamento do ciclo',
      status: PhaseStatus.PENDING,
      items: [
        {
          id: generateId('item'),
          title: 'Reunião pós-morte realizada',
          description: 'Análise de lições aprendidas com a equipe',
          isChecked: false,
          isRequired: true
        },
        {
          id: generateId('item'),
          title: 'RTI elaborado',
          description: 'Relatório de Tratamento de Incidente completo',
          isChecked: false,
          isRequired: true
        },
        {
          id: generateId('item'),
          title: 'Procedimentos atualizados',
          description: 'Melhorias incorporadas à Fase 0',
          isChecked: false,
          isRequired: true
        },
        {
          id: generateId('item'),
          title: 'Registro arquivado (5 anos)',
          description: 'Documentação completa armazenada conforme LGPD',
          isChecked: false,
          isRequired: true
        },
        {
          id: generateId('item'),
          title: 'Processo ANPD encerrado',
          description: 'Comunicação final à autoridade (se aplicável)',
          isChecked: false,
          isRequired: false
        }
      ]
    }
  ];
}

/**
 * Default emergency contacts template
 */
export function getDefaultEmergencyContacts(): EmergencyContact[] {
  return [
    {
      id: generateId('contact'),
      role: 'Encarregado (DPO)',
      name: '[Nome do Encarregado]',
      email: 'dpo@empresa.com',
      phone: '(11) 9999-9999',
      priority: 1,
      isAvailable: true
    },
    {
      id: generateId('contact'),
      role: 'Segurança da Informação',
      name: '[Nome do CISO]',
      email: 'ciso@empresa.com',
      phone: '(11) 9999-9999',
      priority: 2,
      isAvailable: true
    },
    {
      id: generateId('contact'),
      role: 'Jurídico',
      name: '[Nome do Advogado]',
      email: 'juridico@empresa.com',
      phone: '(11) 9999-9999',
      priority: 3,
      isAvailable: true
    },
    {
      id: generateId('contact'),
      role: 'TI / Infraestrutura',
      name: '[Nome do Responsável]',
      email: 'ti@empresa.com',
      phone: '(11) 9999-9999',
      priority: 4,
      isAvailable: true
    }
  ];
}

/**
 * Triage questions
 */
export const TRIAGE_QUESTIONS = [
  {
    id: 1,
    question: 'O incidente envolve dados pessoais?',
    helpText: 'Dados pessoais são qualquer informação que possa identificar uma pessoa natural direta ou indiretamente.',
    yesLeadsTo: 2,
    noResult: 'not_required'
  },
  {
    id: 2,
    question: 'Pode causar risco ou dano relevante aos titulares?',
    helpText: 'Considere impactos como: discriminação, danos financeiros, danos à reputação, perda de confidencialidade.',
    yesLeadsTo: 3,
    noResult: 'not_required'
  },
  {
    id: 3,
    question: 'Envolve dados sensíveis, crianças/idosos, financeiros, sigilo legal ou larga escala?',
    helpText: 'Dados sensíveis incluem: origem racial/étnica, religião, política, saúde, vida sexual, biometria, genética.',
    yesResult: 'required',
    noResult: 'not_required'
  }
];

/**
 * ANPD Form URL
 */
export const ANPD_FORM_URL = 'https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis';

/**
 * Risk level configurations
 */
export const RISK_LEVEL_CONFIG = {
  low: {
    label: 'Baixo',
    color: '#059669',
    description: 'Impacto limitado, sem dados sensíveis'
  },
  medium: {
    label: 'Médio',
    color: '#d4a847',
    description: 'Impacto moderado, requer atenção'
  },
  high: {
    label: 'Alto',
    color: '#f59e0b',
    description: 'Impacto significativo, ação prioritária'
  },
  critical: {
    label: 'Crítico',
    color: '#dc2626',
    description: 'Impacto severo, ação imediata obrigatória'
  }
};
