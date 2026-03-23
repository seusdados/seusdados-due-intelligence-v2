/**
 * Seusdados Due Diligence - Incident Response Module
 * Main React Components
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useIncidentModule } from '../context/IncidentContext';
import { TRIAGE_QUESTIONS, ANPD_FORM_URL } from '../utils/defaultData';
import { formatCountdown } from '../utils/calculations';
import type { CountdownState, Phase, LogEntry, EmergencyContact } from '../types';

// ============================================================
// COUNTDOWN COMPONENT
// ============================================================
interface CountdownDisplayProps {
  countdown: CountdownState | null;
  label?: string;
}

export const CountdownDisplay: React.FC<CountdownDisplayProps> = ({ 
  countdown, 
  label = 'Prazo ANPD' 
}) => {
  if (!countdown) {
    return (
      <div className="sd-countdown-box safe">
        <div className="sd-countdown-label">Nenhum incidente ativo</div>
        <div className="sd-countdown-display">
          <div className="sd-countdown-unit">
            <div className="sd-countdown-number">--</div>
            <div className="sd-countdown-text">Dias</div>
          </div>
          <div className="sd-countdown-unit">
            <div className="sd-countdown-number">--</div>
            <div className="sd-countdown-text">Horas</div>
          </div>
          <div className="sd-countdown-unit">
            <div className="sd-countdown-number">--</div>
            <div className="sd-countdown-text">Min</div>
          </div>
        </div>
      </div>
    );
  }

  const urgencyClass = countdown.isExpired ? '' : countdown.urgencyLevel;
  const displayLabel = countdown.isExpired 
    ? 'PRAZO EXPIRADO!' 
    : countdown.urgencyLevel === 'critical'
    ? 'URGENTE - Menos de 24h!'
    : countdown.urgencyLevel === 'warning'
    ? 'ATENÇÃO - Prazo curto'
    : label;

  return (
    <div className={`sd-countdown-box ${urgencyClass}`}>
      <div className="sd-countdown-label">{displayLabel}</div>
      <div className="sd-countdown-display">
        <div className="sd-countdown-unit">
          <div className="sd-countdown-number">
            {String(countdown.days).padStart(2, '0')}
          </div>
          <div className="sd-countdown-text">Dias</div>
        </div>
        <div className="sd-countdown-unit">
          <div className="sd-countdown-number">
            {String(countdown.hours).padStart(2, '0')}
          </div>
          <div className="sd-countdown-text">Horas</div>
        </div>
        <div className="sd-countdown-unit">
          <div className="sd-countdown-number">
            {String(countdown.minutes).padStart(2, '0')}
          </div>
          <div className="sd-countdown-text">Min</div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// TRIAGE DECISION TREE
// ============================================================
export const TriageDecisionTree: React.FC = () => {
  const { state, answerTriageQuestion, resetTriage } = useIncidentModule();
  const { activeIncident } = state;

  const getAnswer = (questionId: number): boolean | undefined => {
    const answer = activeIncident?.triageAnswers.find(
      (a) => a.questionId === questionId
    );
    return answer?.answer;
  };

  const shouldShowQuestion = (questionId: number): boolean => {
    if (questionId === 1) return true;
    if (questionId === 2) return getAnswer(1) === true;
    if (questionId === 3) return getAnswer(1) === true && getAnswer(2) === true;
    return false;
  };

  const result = activeIncident?.triageResult;

  return (
    <div className="sd-card">
      <div className="sd-panel-title" style={{ marginBottom: '15px' }}>
        Triagem LGPD
      </div>

      {TRIAGE_QUESTIONS.map((q) => (
        shouldShowQuestion(q.id) && (
          <div key={q.id} style={{ marginBottom: '15px' }}>
            <div style={{ 
              fontSize: '13px', 
              fontWeight: 600, 
              marginBottom: '8px',
              color: 'white'
            }}>
              {q.id}. {q.question}
            </div>
            {q.helpText && (
              <div style={{ 
                fontSize: '11px', 
                color: '#94a3b8', 
                marginBottom: '10px' 
              }}>
                {q.helpText}
              </div>
            )}
            <div className="sd-decision-buttons">
              <button
                className={`sd-btn-decision ${getAnswer(q.id) === true ? 'selected-yes' : ''}`}
                onClick={() => answerTriageQuestion(q.id, true)}
              >
                SIM
              </button>
              <button
                className={`sd-btn-decision ${getAnswer(q.id) === false ? 'selected-no' : ''}`}
                onClick={() => answerTriageQuestion(q.id, false)}
              >
                NÃO
              </button>
            </div>
          </div>
        )
      ))}

      {result && result.completedAt && (
        <div 
          className={`sd-alert-box ${
            result.anpdRequired ? 'critical' : 'success'
          }`}
          style={{ marginTop: '15px' }}
        >
          <div>
            <div style={{ fontWeight: 700, marginBottom: '5px' }}>
              {result.anpdRequired 
                ? '⚠ COMUNICAÇÃO OBRIGATÓRIA' 
                : '✓ Comunicação NÃO obrigatória'}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>
              {result.reasoning}
            </div>
          </div>
        </div>
      )}

      {activeIncident?.triageAnswers.length > 0 && (
        <button
          className="sd-btn"
          style={{ 
            marginTop: '10px', 
            background: 'transparent',
            border: '1px solid #334155',
            color: '#94a3b8',
            width: '100%'
          }}
          onClick={resetTriage}
        >
          Refazer Triagem
        </button>
      )}
    </div>
  );
};

// ============================================================
// PHASE PROGRESS BAR
// ============================================================
export const PhaseProgressBar: React.FC = () => {
  const { state, setCurrentPhase, getTotalProgress } = useIncidentModule();
  const { activeIncident, currentPhaseId } = state;

  const phases = activeIncident?.phases || [];
  const progress = getTotalProgress();

  return (
    <div className="sd-card">
      <div className="sd-panel-title">Progresso do Ciclo</div>
      
      <div 
        className="sd-progress-track" 
        style={{ 
          marginTop: '20px',
          '--progress': `${(currentPhaseId / 5) * 100}%` 
        } as React.CSSProperties}
      >
        {phases.map((phase) => (
          <div
            key={phase.id}
            className={`sd-phase-dot ${
              phase.id === currentPhaseId ? 'active' : ''
            } ${phase.id < currentPhaseId ? 'completed' : ''}`}
            onClick={() => setCurrentPhase(phase.id)}
            title={phase.name}
          >
            {phase.id}
          </div>
        ))}
      </div>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        fontSize: '10px',
        textTransform: 'uppercase',
        color: '#94a3b8'
      }}>
        {phases.map((phase) => (
          <div 
            key={phase.id}
            style={{ 
              width: '50px', 
              textAlign: 'center',
              color: phase.id === currentPhaseId ? '#33ccff' : 
                     phase.id < currentPhaseId ? '#059669' : undefined
            }}
          >
            {phase.name.substring(0, 5)}
          </div>
        ))}
      </div>

      <div style={{ 
        marginTop: '15px',
        padding: '10px',
        background: '#0a1628',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '24px', fontWeight: 800, color: '#33ccff' }}>
          {progress}%
        </div>
        <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>
          Progresso Total
        </div>
      </div>
    </div>
  );
};

// ============================================================
// PHASE CARD WITH CHECKLIST
// ============================================================
interface PhaseCardProps {
  phase: Phase;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

export const PhaseCard: React.FC<PhaseCardProps> = ({
  phase,
  isActive,
  isExpanded,
  onToggle
}) => {
  const { toggleChecklistItem, getPhaseProgress } = useIncidentModule();
  const progress = getPhaseProgress(phase.id);

  return (
    <div className={`sd-phase-card ${isActive ? 'active' : ''} ${
      phase.status === 'completed' ? 'completed' : ''
    }`}>
      <div className="sd-phase-card-header" onClick={onToggle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="sd-phase-badge">{phase.id}</div>
          <span style={{ fontWeight: 700, fontSize: '14px' }}>{phase.name}</span>
        </div>
        <span style={{
          fontSize: '10px',
          fontWeight: 600,
          padding: '4px 10px',
          borderRadius: '4px',
          background: isActive ? 'rgba(51, 204, 255, 0.2)' : 
                     phase.status === 'completed' ? 'rgba(5, 150, 105, 0.2)' : '#334155',
          color: isActive ? '#33ccff' : 
                 phase.status === 'completed' ? '#6ee7b7' : '#94a3b8'
        }}>
          {progress.completed}/{progress.total}
        </span>
      </div>

      {isExpanded && (
        <div style={{ padding: '16px' }}>
          <div style={{ 
            fontSize: '12px', 
            color: '#94a3b8', 
            marginBottom: '15px' 
          }}>
            {phase.description}
          </div>
          
          <div className="sd-checklist">
            {phase.items.map((item) => (
              <div
                key={item.id}
                className={`sd-checklist-item ${item.isChecked ? 'checked' : ''}`}
                onClick={() => toggleChecklistItem(phase.id, item.id)}
              >
                <div className="sd-check-box">
                  {item.isChecked && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontWeight: 600, 
                    fontSize: '13px',
                    textDecoration: item.isChecked ? 'line-through' : 'none',
                    color: item.isChecked ? '#059669' : 'white'
                  }}>
                    {item.title}
                    {item.isRequired && (
                      <span style={{ color: '#dc2626', marginLeft: '5px' }}>*</span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {item.description}
                  </div>
                </div>
                {item.checkedAt && (
                  <div style={{ fontSize: '10px', color: '#059669' }}>
                    {new Date(item.checkedAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// PHASES LIST
// ============================================================
export const PhasesList: React.FC = () => {
  const { state } = useIncidentModule();
  const { activeIncident, currentPhaseId } = state;
  const [expandedPhase, setExpandedPhase] = useState<number>(currentPhaseId);

  useEffect(() => {
    setExpandedPhase(currentPhaseId);
  }, [currentPhaseId]);

  if (!activeIncident) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {activeIncident.phases.map((phase) => (
        <PhaseCard
          key={phase.id}
          phase={phase}
          isActive={phase.id === currentPhaseId}
          isExpanded={phase.id === expandedPhase}
          onToggle={() => setExpandedPhase(
            expandedPhase === phase.id ? -1 : phase.id
          )}
        />
      ))}
    </div>
  );
};

// ============================================================
// INCIDENT LOG
// ============================================================
export const IncidentLog: React.FC = () => {
  const { state, addLogEntry } = useIncidentModule();
  const [inputValue, setInputValue] = useState('');
  const logs = state.activeIncident?.logs || [];

  const handleSubmit = () => {
    if (inputValue.trim()) {
      addLogEntry(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="sd-card" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div className="sd-panel-title">Log do Incidente</div>
      
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        marginTop: '15px',
        maxHeight: '250px'
      }}>
        {logs.length === 0 ? (
          <div className="sd-log-entry">
            <span className="sd-log-time">--:--</span>
            <span style={{ color: '#94a3b8' }}>Aguardando início do protocolo...</span>
          </div>
        ) : (
          logs.slice().reverse().map((log) => (
            <div key={log.id} className="sd-log-entry">
              <span className="sd-log-time">
                {new Date(log.timestamp).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              <span style={{ color: '#94a3b8' }}>{log.message}</span>
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Registrar ação..."
          style={{
            flex: 1,
            background: '#0a1628',
            border: '2px solid #334155',
            borderRadius: '8px',
            padding: '10px 12px',
            color: 'white',
            fontFamily: 'inherit',
            fontSize: '12px'
          }}
        />
        <button
          className="sd-btn sd-btn-primary"
          onClick={handleSubmit}
          style={{ padding: '10px 16px' }}
        >
          +
        </button>
      </div>
    </div>
  );
};

// ============================================================
// QUICK ACTIONS
// ============================================================
export const QuickActions: React.FC = () => {
  const { exportIncidentData, addLogEntry } = useIncidentModule();

  const openANPDForm = () => {
    window.open(ANPD_FORM_URL, '_blank');
    addLogEntry('Formulário ANPD acessado', 'action');
  };

  const handleExport = async () => {
    const blob = await exportIncidentData();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `incidente_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addLogEntry('Dados do incidente exportados', 'action');
    }
  };

  return (
    <div className="sd-card">
      <div className="sd-panel-title">Ações Rápidas</div>
      
      <div className="sd-action-grid" style={{ marginTop: '15px' }}>
        <button className="sd-action-btn critical" onClick={openANPDForm}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" style={{ margin: '0 auto 8px', display: 'block' }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6"/>
            <path d="M12 18v-6"/>
            <path d="M9 15h6"/>
          </svg>
          <span style={{ fontSize: '11px', fontWeight: 600 }}>Form. ANPD</span>
        </button>

        <button className="sd-action-btn" onClick={() => addLogEntry('Template de notificação gerado', 'action')}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#33ccff" strokeWidth="2" style={{ margin: '0 auto 8px', display: 'block' }}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          <span style={{ fontSize: '11px', fontWeight: 600 }}>Notif. Titular</span>
        </button>

        <button className="sd-action-btn" onClick={() => addLogEntry('Template RTI aberto', 'action')}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#33ccff" strokeWidth="2" style={{ margin: '0 auto 8px', display: 'block' }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6"/>
            <path d="M16 13H8"/>
            <path d="M16 17H8"/>
            <path d="M10 9H8"/>
          </svg>
          <span style={{ fontSize: '11px', fontWeight: 600 }}>Relatório RTI</span>
        </button>

        <button className="sd-action-btn" onClick={handleExport}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#33ccff" strokeWidth="2" style={{ margin: '0 auto 8px', display: 'block' }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span style={{ fontSize: '11px', fontWeight: 600 }}>Exportar</span>
        </button>
      </div>
    </div>
  );
};

// ============================================================
// EMERGENCY CONTACTS
// ============================================================
export const EmergencyContacts: React.FC = () => {
  const { state, updateEmergencyContacts } = useIncidentModule();
  const contacts = state.emergencyContacts;

  return (
    <div>
      <div className="sd-panel-title" style={{ marginBottom: '10px' }}>
        Contatos de Emergência
      </div>
      
      {contacts.map((contact) => (
        <div key={contact.id} className="sd-contact-card">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}>
            <span style={{ 
              fontSize: '10px', 
              fontWeight: 600, 
              textTransform: 'uppercase',
              color: '#33ccff'
            }}>
              {contact.role}
            </span>
            <span style={{
              fontSize: '9px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '4px',
              background: 'rgba(220, 38, 38, 0.2)',
              color: '#fca5a5'
            }}>
              {contact.priority}º Contato
            </span>
          </div>
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
            {contact.name}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            {contact.email} | {contact.phone}
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================
// INCIDENT CONTROL HEADER
// ============================================================
interface IncidentHeaderProps {
  onStartIncident?: () => void;
  onEndIncident?: () => void;
}

export const IncidentHeader: React.FC<IncidentHeaderProps> = ({
  onStartIncident,
  onEndIncident
}) => {
  const { state } = useIncidentModule();
  const isActive = state.activeIncident?.status === 'active';
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sd-incident-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ 
          fontSize: '24px', 
          fontWeight: 800, 
          color: '#33ccff',
          letterSpacing: '2px'
        }}>
          SEUSDADOS
        </div>
        
        <div className={`sd-status-indicator ${isActive ? 'active' : 'standby'}`}>
          <div className={`sd-status-dot ${isActive ? 'red' : 'green'}`} />
          <span>{isActive ? 'INCIDENTE ATIVO' : 'STANDBY'}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ 
            fontSize: '20px', 
            fontWeight: 700, 
            color: '#33ccff',
            fontVariantNumeric: 'tabular-nums'
          }}>
            {currentTime.toLocaleTimeString('pt-BR')}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            {currentTime.toLocaleDateString('pt-BR')}
          </div>
        </div>
      </div>
    </header>
  );
};

// ============================================================
// MAIN MODULE COMPONENT
// ============================================================
export const IncidentControlPanel: React.FC = () => {
  const { 
    state, 
    startIncident, 
    closeIncident 
  } = useIncidentModule();
  
  const [knowledgeDateTime, setKnowledgeDateTime] = useState(
    new Date().toISOString().slice(0, 16)
  );

  const handleStartIncident = () => {
    startIncident(
      'Incidente de Segurança',
      new Date(knowledgeDateTime)
    );
  };

  const isActive = state.activeIncident?.status === 'active';

  return (
    <div className="sd-incident-module">
      <IncidentHeader />
      
      <main className="sd-main-container">
        {/* Left Panel */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="sd-card">
            <div className="sd-panel-title">Prazo ANPD</div>
            <div style={{ marginTop: '15px' }}>
              <CountdownDisplay countdown={state.countdown} />
            </div>
          </div>

          <div className="sd-card">
            <label style={{
              display: 'block',
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: '#94a3b8',
              marginBottom: '8px'
            }}>
              Data/Hora do Conhecimento
            </label>
            <input
              type="datetime-local"
              value={knowledgeDateTime}
              onChange={(e) => setKnowledgeDateTime(e.target.value)}
              disabled={isActive}
              style={{
                width: '100%',
                background: '#0a1628',
                border: '2px solid #334155',
                borderRadius: '8px',
                padding: '12px',
                color: 'white',
                fontFamily: 'inherit',
                fontSize: '14px'
              }}
            />
          </div>

          <button
            className={`sd-btn ${isActive ? 'sd-btn-success' : 'sd-btn-danger'}`}
            onClick={isActive ? closeIncident : handleStartIncident}
            style={{ 
              width: '100%', 
              padding: '14px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
          >
            {isActive ? 'Encerrar Incidente' : 'Iniciar Protocolo'}
          </button>

          <TriageDecisionTree />
        </aside>

        {/* Center Panel */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <PhaseProgressBar />
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <PhasesList />
          </div>
        </section>

        {/* Right Panel */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <QuickActions />
          <EmergencyContacts />
          <IncidentLog />
        </aside>
      </main>
    </div>
  );
};

export default IncidentControlPanel;
