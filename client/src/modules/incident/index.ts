/**
 * Seusdados Due Diligence - Incident Response Module
 * 
 * A comprehensive React module for LGPD/ANPD compliant incident response management.
 * 
 * @packageDocumentation
 * @module @seusdados/incident-module
 */

// Types
export * from './types';

// Context & Provider
export { IncidentProvider, useIncidentModule, IncidentContext } from './context';

// Components
export {
  IncidentControlPanel,
  CountdownDisplay,
  TriageDecisionTree,
  PhaseProgressBar,
  PhaseCard,
  PhasesList,
  IncidentLog,
  QuickActions,
  EmergencyContacts,
  IncidentHeader
} from './components';

// Services
export {
  IncidentApiService,
  getIncidentApiService,
  initIncidentApiService,
  localStorageService,
  LocalStorageService
} from './services';

// Utilities
export {
  calculateCountdown,
  calculateBusinessDaysDeadline,
  calculateTriageResult,
  formatCountdown,
  calculatePhaseCompletion,
  estimateResolutionTime,
  getDefaultPhases,
  getDefaultEmergencyContacts,
  TRIAGE_QUESTIONS,
  ANPD_FORM_URL,
  RISK_LEVEL_CONFIG
} from './utils';

// CSS
import './styles/incident-module.css';

// Version
export const VERSION = '1.0.0';
