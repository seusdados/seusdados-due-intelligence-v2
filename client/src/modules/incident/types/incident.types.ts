/**
 * Seusdados Due Diligence - Incident Response Module
 * Type Definitions
 */

// Enums
export enum IncidentStatus {
  STANDBY = 'standby',
  ACTIVE = 'active',
  CONTAINED = 'contained',
  REMEDIATED = 'remediated',
  CLOSED = 'closed'
}

export enum PhaseStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  SKIPPED = 'skipped'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum NotificationRequirement {
  REQUIRED = 'required',
  NOT_REQUIRED = 'not_required',
  PENDING_EVALUATION = 'pending_evaluation'
}

// Interfaces
export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  isChecked: boolean;
  checkedAt?: Date;
  checkedBy?: string;
  notes?: string;
  isRequired: boolean;
}

export interface Phase {
  id: number;
  name: string;
  description: string;
  status: PhaseStatus;
  items: ChecklistItem[];
  startedAt?: Date;
  completedAt?: Date;
  completedBy?: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  userId?: string;
  userName?: string;
  type: 'action' | 'system' | 'alert' | 'communication';
  phaseId?: number;
  metadata?: Record<string, unknown>;
}

export interface EmergencyContact {
  id: string;
  role: string;
  name: string;
  email: string;
  phone: string;
  priority: number;
  isAvailable: boolean;
}

export interface TriageAnswer {
  questionId: number;
  answer: boolean;
  answeredAt: Date;
  answeredBy?: string;
}

export interface TriageResult {
  notificationRequired: NotificationRequirement;
  anpdRequired: boolean;
  titularRequired: boolean;
  reasoning: string;
  completedAt?: Date;
}

export interface Deadline {
  type: 'anpd' | 'titular' | 'internal';
  dueDate: Date;
  status: 'pending' | 'met' | 'missed';
  description: string;
}

export interface Incident {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  status: IncidentStatus;
  riskLevel: RiskLevel;
  
  // Timestamps
  detectedAt: Date;
  knowledgeAt: Date; // Data do conhecimento (para contagem ANPD)
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  
  // Progress
  currentPhaseId: number;
  phases: Phase[];
  
  // Triage
  triageAnswers: TriageAnswer[];
  triageResult?: TriageResult;
  
  // Deadlines
  deadlines: Deadline[];
  
  // Log
  logs: LogEntry[];
  
  // Contacts
  assignedDpoId?: string;
  assignedTeamIds?: string[];
  
  // LGPD Specific
  affectedDataCategories?: string[];
  estimatedAffectedTitulars?: number;
  dataProcessorInvolved?: boolean;
  
  // Communications
  anpdCommunicationId?: string;
  anpdCommunicationSentAt?: Date;
  titularCommunicationSentAt?: Date;
  
  // Metadata
  tags?: string[];
  externalReferences?: string[];
  attachments?: string[];
}

// API Response Types
export interface IncidentListResponse {
  incidents: Incident[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IncidentCreateRequest {
  organizationId: string;
  title: string;
  description?: string;
  detectedAt: Date;
  knowledgeAt: Date;
  riskLevel?: RiskLevel;
}

export interface IncidentUpdateRequest {
  title?: string;
  description?: string;
  status?: IncidentStatus;
  riskLevel?: RiskLevel;
  currentPhaseId?: number;
}

// Module Configuration
export interface IncidentModuleConfig {
  apiBaseUrl: string;
  organizationId: string;
  userId: string;
  userName: string;
  
  // Feature flags
  enableAutoSave?: boolean;
  enableNotifications?: boolean;
  enableExport?: boolean;
  
  // Customization
  theme?: 'dark' | 'light';
  language?: 'pt-BR' | 'en-US';
  
  // Callbacks
  onIncidentCreate?: (incident: Incident) => void;
  onIncidentUpdate?: (incident: Incident) => void;
  onIncidentClose?: (incident: Incident) => void;
  onPhaseComplete?: (incident: Incident, phase: Phase) => void;
  onDeadlineAlert?: (incident: Incident, deadline: Deadline) => void;
  
  // External integrations
  anpdFormUrl?: string;
  customContacts?: EmergencyContact[];
}

// Countdown Types
export interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  urgencyLevel: 'safe' | 'warning' | 'critical' | 'expired';
}

// Dashboard Stats
export interface IncidentStats {
  totalActive: number;
  totalClosed: number;
  averageResolutionTime: number; // in hours
  complianceRate: number; // percentage
  byRiskLevel: Record<RiskLevel, number>;
  byPhase: Record<number, number>;
}
