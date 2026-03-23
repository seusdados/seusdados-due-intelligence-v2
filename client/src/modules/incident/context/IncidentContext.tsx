/**
 * Seusdados Due Diligence - Incident Response Module
 * React Context for Global State Management
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode
} from 'react';

import {
  Incident,
  IncidentStatus,
  Phase,
  PhaseStatus,
  LogEntry,
  TriageAnswer,
  TriageResult,
  NotificationRequirement,
  EmergencyContact,
  IncidentModuleConfig,
  CountdownState
} from '../types';

import { initIncidentApiService, IncidentApiService } from '../services/incident.service';
import { localStorageService } from '../services/storage.service';
import { getDefaultPhases } from '../utils/defaultData';
import { calculateCountdown, calculateTriageResult } from '../utils/calculations';

// State Interface
interface IncidentModuleState {
  // Config
  config: IncidentModuleConfig | null;
  isInitialized: boolean;
  
  // Current Incident
  activeIncident: Incident | null;
  
  // UI State
  currentPhaseId: number;
  isLoading: boolean;
  error: string | null;
  
  // Countdown
  countdown: CountdownState | null;
  
  // Contacts
  emergencyContacts: EmergencyContact[];
  
  // Offline
  isOffline: boolean;
  pendingSyncCount: number;
}

// Actions
type IncidentAction =
  | { type: 'INITIALIZE'; payload: IncidentModuleConfig }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ACTIVE_INCIDENT'; payload: Incident | null }
  | { type: 'UPDATE_INCIDENT'; payload: Partial<Incident> }
  | { type: 'SET_CURRENT_PHASE'; payload: number }
  | { type: 'UPDATE_PHASE'; payload: { phaseId: number; data: Partial<Phase> } }
  | { type: 'TOGGLE_CHECKLIST_ITEM'; payload: { phaseId: number; itemId: string } }
  | { type: 'ADD_LOG_ENTRY'; payload: LogEntry }
  | { type: 'SET_TRIAGE_ANSWER'; payload: TriageAnswer }
  | { type: 'SET_COUNTDOWN'; payload: CountdownState | null }
  | { type: 'SET_EMERGENCY_CONTACTS'; payload: EmergencyContact[] }
  | { type: 'SET_OFFLINE'; payload: boolean }
  | { type: 'SET_PENDING_SYNC'; payload: number }
  | { type: 'RESET' };

// Initial State
const initialState: IncidentModuleState = {
  config: null,
  isInitialized: false,
  activeIncident: null,
  currentPhaseId: 0,
  isLoading: false,
  error: null,
  countdown: null,
  emergencyContacts: [],
  isOffline: false,
  pendingSyncCount: 0
};

// Reducer
function incidentReducer(
  state: IncidentModuleState,
  action: IncidentAction
): IncidentModuleState {
  switch (action.type) {
    case 'INITIALIZE':
      return {
        ...state,
        config: action.payload,
        isInitialized: true
      };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_ACTIVE_INCIDENT':
      return {
        ...state,
        activeIncident: action.payload,
        currentPhaseId: action.payload?.currentPhaseId || 0
      };

    case 'UPDATE_INCIDENT':
      if (!state.activeIncident) return state;
      return {
        ...state,
        activeIncident: {
          ...state.activeIncident,
          ...action.payload,
          updatedAt: new Date()
        }
      };

    case 'SET_CURRENT_PHASE':
      return {
        ...state,
        currentPhaseId: action.payload,
        activeIncident: state.activeIncident
          ? { ...state.activeIncident, currentPhaseId: action.payload }
          : null
      };

    case 'UPDATE_PHASE': {
      if (!state.activeIncident) return state;
      const phases = state.activeIncident.phases.map((phase) =>
        phase.id === action.payload.phaseId
          ? { ...phase, ...action.payload.data }
          : phase
      );
      return {
        ...state,
        activeIncident: { ...state.activeIncident, phases }
      };
    }

    case 'TOGGLE_CHECKLIST_ITEM': {
      if (!state.activeIncident) return state;
      const phases = state.activeIncident.phases.map((phase) => {
        if (phase.id !== action.payload.phaseId) return phase;
        
        const items = phase.items.map((item) => {
          if (item.id !== action.payload.itemId) return item;
          return {
            ...item,
            isChecked: !item.isChecked,
            checkedAt: !item.isChecked ? new Date() : undefined,
            checkedBy: !item.isChecked ? state.config?.userName : undefined
          };
        });
        
        // Check if all required items are checked
        const allRequiredChecked = items
          .filter((i) => i.isRequired)
          .every((i) => i.isChecked);
        
        return {
          ...phase,
          items,
          status: allRequiredChecked ? PhaseStatus.COMPLETED : phase.status,
          completedAt: allRequiredChecked ? new Date() : undefined
        };
      });
      
      return {
        ...state,
        activeIncident: { ...state.activeIncident, phases }
      };
    }

    case 'ADD_LOG_ENTRY':
      if (!state.activeIncident) return state;
      return {
        ...state,
        activeIncident: {
          ...state.activeIncident,
          logs: [...state.activeIncident.logs, action.payload]
        }
      };

    case 'SET_TRIAGE_ANSWER': {
      if (!state.activeIncident) return state;
      const existingAnswers = state.activeIncident.triageAnswers.filter(
        (a) => a.questionId !== action.payload.questionId
      );
      const triageAnswers = [...existingAnswers, action.payload];
      
      // Calculate triage result if we have enough answers
      const triageResult = calculateTriageResult(triageAnswers);
      
      return {
        ...state,
        activeIncident: {
          ...state.activeIncident,
          triageAnswers,
          triageResult
        }
      };
    }

    case 'SET_COUNTDOWN':
      return { ...state, countdown: action.payload };

    case 'SET_EMERGENCY_CONTACTS':
      return { ...state, emergencyContacts: action.payload };

    case 'SET_OFFLINE':
      return { ...state, isOffline: action.payload };

    case 'SET_PENDING_SYNC':
      return { ...state, pendingSyncCount: action.payload };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// Context
interface IncidentContextValue {
  state: IncidentModuleState;
  
  // Initialization
  initialize: (config: IncidentModuleConfig) => void;
  
  // Incident Management
  startIncident: (title: string, knowledgeAt?: Date) => Promise<void>;
  loadIncident: (incidentId: string) => Promise<void>;
  updateIncident: (data: Partial<Incident>) => Promise<void>;
  closeIncident: () => Promise<void>;
  
  // Phase Management
  setCurrentPhase: (phaseId: number) => void;
  advanceToNextPhase: () => void;
  
  // Checklist
  toggleChecklistItem: (phaseId: number, itemId: string) => void;
  
  // Triage
  answerTriageQuestion: (questionId: number, answer: boolean) => void;
  resetTriage: () => void;
  
  // Logging
  addLogEntry: (message: string, type?: LogEntry['type']) => void;
  
  // Contacts
  updateEmergencyContacts: (contacts: EmergencyContact[]) => void;
  
  // Export
  exportIncidentData: () => Promise<Blob | null>;
  
  // Utils
  getPhaseProgress: (phaseId: number) => { completed: number; total: number };
  getTotalProgress: () => number;
}

const IncidentContext = createContext<IncidentContextValue | null>(null);

// Provider Component
interface IncidentProviderProps {
  children: ReactNode;
  config?: IncidentModuleConfig;
}

export function IncidentProvider({ children, config }: IncidentProviderProps) {
  const [state, dispatch] = useReducer(incidentReducer, initialState);
  let apiService: IncidentApiService | null = null;

  // Initialize
  const initialize = useCallback((cfg: IncidentModuleConfig) => {
    apiService = initIncidentApiService(cfg.apiBaseUrl);
    dispatch({ type: 'INITIALIZE', payload: cfg });
    
    // Load saved contacts
    const savedContacts = localStorageService.getEmergencyContacts();
    if (savedContacts.length > 0) {
      dispatch({ type: 'SET_EMERGENCY_CONTACTS', payload: savedContacts as EmergencyContact[] });
    } else if (cfg.customContacts) {
      dispatch({ type: 'SET_EMERGENCY_CONTACTS', payload: cfg.customContacts });
    }
    
    // Check for active incident
    const activeId = localStorageService.getActiveIncidentId();
    if (activeId) {
      const savedIncident = localStorageService.getIncidentById(activeId);
      if (savedIncident) {
        dispatch({ type: 'SET_ACTIVE_INCIDENT', payload: savedIncident });
      }
    }
    
    // Check offline status
    dispatch({ type: 'SET_OFFLINE', payload: !navigator.onLine });
    
    window.addEventListener('online', () => dispatch({ type: 'SET_OFFLINE', payload: false }));
    window.addEventListener('offline', () => dispatch({ type: 'SET_OFFLINE', payload: true }));
  }, []);

  // Auto-initialize if config provided
  useEffect(() => {
    if (config && !state.isInitialized) {
      initialize(config);
    }
  }, [config, state.isInitialized, initialize]);

  // Countdown timer
  useEffect(() => {
    if (!state.activeIncident?.knowledgeAt) return;
    
    const updateCountdown = () => {
      const countdown = calculateCountdown(new Date(state.activeIncident!.knowledgeAt));
      dispatch({ type: 'SET_COUNTDOWN', payload: countdown });
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [state.activeIncident?.knowledgeAt]);

  // Auto-save
  useEffect(() => {
    if (state.activeIncident && state.config?.enableAutoSave !== false) {
      localStorageService.saveIncident(state.activeIncident);
      localStorageService.setActiveIncident(state.activeIncident.id);
    }
  }, [state.activeIncident, state.config?.enableAutoSave]);

  // Start new incident
  const startIncident = useCallback(async (title: string, knowledgeAt?: Date) => {
    if (!state.config) throw new Error('Module not initialized');
    
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const now = new Date();
      const incident: Incident = {
        id: `inc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        organizationId: state.config.organizationId,
        title,
        status: IncidentStatus.ACTIVE,
        riskLevel: 'medium' as any,
        detectedAt: now,
        knowledgeAt: knowledgeAt || now,
        createdAt: now,
        updatedAt: now,
        currentPhaseId: 1,
        phases: getDefaultPhases(),
        triageAnswers: [],
        deadlines: [
          {
            type: 'anpd',
            dueDate: new Date(
              (knowledgeAt || now).getTime() + 3 * 24 * 60 * 60 * 1000
            ),
            status: 'pending',
            description: 'Comunicação à ANPD (3 dias úteis)'
          },
          {
            type: 'titular',
            dueDate: new Date(
              (knowledgeAt || now).getTime() + 3 * 24 * 60 * 60 * 1000
            ),
            status: 'pending',
            description: 'Comunicação aos Titulares (3 dias úteis)'
          }
        ],
        logs: [
          {
            id: `log_${Date.now()}`,
            timestamp: now,
            message: 'Protocolo de incidente iniciado',
            type: 'system',
            userId: state.config.userId,
            userName: state.config.userName
          }
        ]
      };
      
      dispatch({ type: 'SET_ACTIVE_INCIDENT', payload: incident });
      state.config.onIncidentCreate?.(incident);
      
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.config]);

  // Load existing incident
  const loadIncident = useCallback(async (incidentId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // Try local first
      let incident = localStorageService.getIncidentById(incidentId);
      
      // Then try API if online
      if (!incident && !state.isOffline && apiService) {
        incident = await apiService.getIncident(incidentId);
      }
      
      if (incident) {
        dispatch({ type: 'SET_ACTIVE_INCIDENT', payload: incident });
      } else {
        throw new Error('Incident not found');
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.isOffline]);

  // Update incident
  const updateIncident = useCallback(async (data: Partial<Incident>) => {
    dispatch({ type: 'UPDATE_INCIDENT', payload: data });
    state.config?.onIncidentUpdate?.(state.activeIncident!);
  }, [state.config, state.activeIncident]);

  // Close incident
  const closeIncident = useCallback(async () => {
    if (!state.activeIncident) return;
    
    const closedIncident: Incident = {
      ...state.activeIncident,
      status: IncidentStatus.CLOSED,
      closedAt: new Date(),
      updatedAt: new Date()
    };
    
    dispatch({ type: 'SET_ACTIVE_INCIDENT', payload: closedIncident });
    localStorageService.clearActiveIncident();
    state.config?.onIncidentClose?.(closedIncident);
    
    addLogEntry('Protocolo de incidente encerrado', 'system');
  }, [state.activeIncident, state.config]);

  // Phase management
  const setCurrentPhase = useCallback((phaseId: number) => {
    dispatch({ type: 'SET_CURRENT_PHASE', payload: phaseId });
    addLogEntry(`Fase ${phaseId} iniciada`, 'system');
  }, []);

  const advanceToNextPhase = useCallback(() => {
    const nextPhase = state.currentPhaseId + 1;
    if (nextPhase <= 5) {
      setCurrentPhase(nextPhase);
      state.config?.onPhaseComplete?.(
        state.activeIncident!,
        state.activeIncident!.phases[state.currentPhaseId]
      );
    }
  }, [state.currentPhaseId, state.activeIncident, state.config, setCurrentPhase]);

  // Checklist
  const toggleChecklistItem = useCallback((phaseId: number, itemId: string) => {
    dispatch({ type: 'TOGGLE_CHECKLIST_ITEM', payload: { phaseId, itemId } });
    
    const phase = state.activeIncident?.phases.find((p) => p.id === phaseId);
    const item = phase?.items.find((i) => i.id === itemId);
    
    if (item && !item.isChecked) {
      addLogEntry(`✓ ${phase?.name}: ${item.title}`, 'action');
    }
  }, [state.activeIncident]);

  // Triage
  const answerTriageQuestion = useCallback((questionId: number, answer: boolean) => {
    if (!state.config) return;
    
    dispatch({
      type: 'SET_TRIAGE_ANSWER',
      payload: {
        questionId,
        answer,
        answeredAt: new Date(),
        answeredBy: state.config.userId
      }
    });
    
    // Log significant answers
    if (questionId === 1 && !answer) {
      addLogEntry('Triagem: Incidente NÃO envolve dados pessoais', 'system');
    } else if (questionId === 3) {
      addLogEntry(
        answer
          ? 'TRIAGEM: COMUNICAÇÃO OBRIGATÓRIA - ANPD + Titulares'
          : 'Triagem: Comunicação NÃO obrigatória',
        'alert'
      );
    }
  }, [state.config]);

  const resetTriage = useCallback(() => {
    if (!state.activeIncident) return;
    dispatch({
      type: 'UPDATE_INCIDENT',
      payload: { triageAnswers: [], triageResult: undefined }
    });
  }, [state.activeIncident]);

  // Logging
  const addLogEntry = useCallback((message: string, type: LogEntry['type'] = 'action') => {
    if (!state.config) return;
    
    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      message,
      type,
      userId: state.config.userId,
      userName: state.config.userName
    };
    
    dispatch({ type: 'ADD_LOG_ENTRY', payload: entry });
  }, [state.config]);

  // Contacts
  const updateEmergencyContacts = useCallback((contacts: EmergencyContact[]) => {
    dispatch({ type: 'SET_EMERGENCY_CONTACTS', payload: contacts });
    localStorageService.saveEmergencyContacts(contacts);
  }, []);

  // Export
  const exportIncidentData = useCallback(async (): Promise<Blob | null> => {
    if (!state.activeIncident) return null;
    
    const data = {
      exportedAt: new Date().toISOString(),
      incident: state.activeIncident,
      countdown: state.countdown
    };
    
    return new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
  }, [state.activeIncident, state.countdown]);

  // Utils
  const getPhaseProgress = useCallback((phaseId: number) => {
    const phase = state.activeIncident?.phases.find((p) => p.id === phaseId);
    if (!phase) return { completed: 0, total: 0 };
    
    return {
      completed: phase.items.filter((i) => i.isChecked).length,
      total: phase.items.length
    };
  }, [state.activeIncident]);

  const getTotalProgress = useCallback(() => {
    if (!state.activeIncident) return 0;
    
    const totalItems = state.activeIncident.phases.reduce(
      (sum, phase) => sum + phase.items.length,
      0
    );
    const checkedItems = state.activeIncident.phases.reduce(
      (sum, phase) => sum + phase.items.filter((i) => i.isChecked).length,
      0
    );
    
    return totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;
  }, [state.activeIncident]);

  const value: IncidentContextValue = {
    state,
    initialize,
    startIncident,
    loadIncident,
    updateIncident,
    closeIncident,
    setCurrentPhase,
    advanceToNextPhase,
    toggleChecklistItem,
    answerTriageQuestion,
    resetTriage,
    addLogEntry,
    updateEmergencyContacts,
    exportIncidentData,
    getPhaseProgress,
    getTotalProgress
  };

  return (
    <IncidentContext.Provider value={value}>
      {children}
    </IncidentContext.Provider>
  );
}

// Hook
export function useIncidentModule(): IncidentContextValue {
  const context = useContext(IncidentContext);
  if (!context) {
    throw new Error('useIncidentModule must be used within IncidentProvider');
  }
  return context;
}

export { IncidentContext };
