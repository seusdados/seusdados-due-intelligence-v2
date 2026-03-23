// Tipos compartilhados entre frontend e backend do módulo Simulador

export interface SimulationPhaseTimings {
  detection?: number;
  triage?: number;
  containment?: number;
  recovery?: number;
}

export interface SimulationKpiValues {
  [kpiId: string]: number;
}

export interface SimulationMetrics {
  totalSimulations: number;
  completedSimulations: number;
  averageMttd: number;
  averageMttr: number;
  averagePlaybookAdherence: number;
  averageRecordsCompleteness: number;
  trendsData: {
    period: string;
    mttd: number;
    mttr: number;
    playbookAdherence: number;
  }[];
}

export interface SimulationSummary {
  id: number;
  scenarioName: string;
  status: string;
  startTime: Date;
  endTime?: Date;
  quarter?: string;
  participants?: string[];
  playbookAdherence?: number;
  recordsCompleteness?: number;
}

export interface ScenarioTemplate {
  nome: string;
  tipoIncidente: string;
  descricao: string;
  areasEnvolvidas: string[];
  sistemasAfetados: string[];
  objetivos: string[];
  papeisChave: string[];
  criteriosSucesso: string[];
  trimestre?: string;
}

export interface DecisionInput {
  phase: string;
  description: string;
  decisionMaker: string;
  decisionType: "operational" | "strategic" | "communication";
  notes?: string;
}

export interface EventInput {
  phase: string;
  eventType: string;
  title: string;
  description: string;
  severity: "baixa" | "media" | "alta" | "critica";
}

export interface FeedbackInput {
  participantRole: string;
  clarityScore: number;
  communicationScore: number;
  toolsScore: number;
  strengths?: string;
  weaknesses?: string;
  suggestions?: string;
}

export interface ChecklistItem {
  category: "before" | "during" | "after";
  description: string;
  completed: boolean;
  responsible?: string;
  notes?: string;
}

export interface StakeholderInput {
  name: string;
  role: string;
  department?: string;
  email?: string;
  phone?: string;
}

export const SIMULATION_PHASES = ["detection", "triage", "containment", "recovery"] as const;
export type SimulationPhase = typeof SIMULATION_PHASES[number];

export const SIMULATION_STATUSES = ["planejada", "em_andamento", "pausada", "concluida", "cancelada"] as const;
export type SimulationStatus = typeof SIMULATION_STATUSES[number];

export const EVENT_SEVERITIES = ["baixa", "media", "alta", "critica"] as const;
export type EventSeverity = typeof EVENT_SEVERITIES[number];

export const DECISION_TYPES = ["operational", "strategic", "communication"] as const;
export type DecisionType = typeof DECISION_TYPES[number];
