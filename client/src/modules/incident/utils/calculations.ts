/**
 * Seusdados Due Diligence - Incident Response Module
 * Calculation Utilities
 */

import {
  CountdownState,
  TriageAnswer,
  TriageResult,
  NotificationRequirement
} from '../types';

/**
 * Calculate countdown to ANPD deadline (3 business days)
 * Simplified: uses 72 hours instead of actual business days
 */
export function calculateCountdown(knowledgeAt: Date): CountdownState {
  const now = new Date();
  const deadline = new Date(knowledgeAt);
  deadline.setDate(deadline.getDate() + 3); // 3 days (simplified)
  
  const diff = deadline.getTime() - now.getTime();
  
  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      urgencyLevel: 'expired'
    };
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  let urgencyLevel: CountdownState['urgencyLevel'] = 'safe';
  if (days < 1) {
    urgencyLevel = 'critical';
  } else if (days < 2) {
    urgencyLevel = 'warning';
  }
  
  return {
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
    urgencyLevel
  };
}

/**
 * Calculate business days deadline (more accurate version)
 */
export function calculateBusinessDaysDeadline(
  startDate: Date,
  businessDays: number
): Date {
  const result = new Date(startDate);
  let daysAdded = 0;
  
  while (daysAdded < businessDays) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }
  
  return result;
}

/**
 * Determine if ANPD/Titular notification is required based on triage
 */
export function calculateTriageResult(answers: TriageAnswer[]): TriageResult | undefined {
  const q1 = answers.find((a) => a.questionId === 1);
  const q2 = answers.find((a) => a.questionId === 2);
  const q3 = answers.find((a) => a.questionId === 3);
  
  // Not enough answers yet
  if (!q1) {
    return undefined;
  }
  
  // Q1: Does it involve personal data?
  if (!q1.answer) {
    return {
      notificationRequired: NotificationRequirement.NOT_REQUIRED,
      anpdRequired: false,
      titularRequired: false,
      reasoning: 'Incidente não envolve dados pessoais. Não há obrigação de comunicação à ANPD ou titulares sob a LGPD.',
      completedAt: new Date()
    };
  }
  
  // Q2: Can it cause relevant risk/damage?
  if (!q2) {
    return {
      notificationRequired: NotificationRequirement.PENDING_EVALUATION,
      anpdRequired: false,
      titularRequired: false,
      reasoning: 'Aguardando avaliação de risco relevante.',
      completedAt: undefined
    };
  }
  
  if (!q2.answer) {
    return {
      notificationRequired: NotificationRequirement.NOT_REQUIRED,
      anpdRequired: false,
      titularRequired: false,
      reasoning: 'Incidente envolve dados pessoais, mas não representa risco ou dano relevante aos titulares. Manter registro interno por 5 anos.',
      completedAt: new Date()
    };
  }
  
  // Q3: Does it involve sensitive data, children/elderly, financial, legal secrecy, or large scale?
  if (!q3) {
    return {
      notificationRequired: NotificationRequirement.PENDING_EVALUATION,
      anpdRequired: false,
      titularRequired: false,
      reasoning: 'Aguardando classificação dos tipos de dados afetados.',
      completedAt: undefined
    };
  }
  
  if (q3.answer) {
    return {
      notificationRequired: NotificationRequirement.REQUIRED,
      anpdRequired: true,
      titularRequired: true,
      reasoning: 'COMUNICAÇÃO OBRIGATÓRIA. Incidente envolve dados pessoais com risco relevante e categorias especiais (dados sensíveis, crianças/idosos, financeiros, sigilo legal ou larga escala). Prazo: 3 dias úteis para ANPD e titulares.',
      completedAt: new Date()
    };
  }
  
  return {
    notificationRequired: NotificationRequirement.NOT_REQUIRED,
    anpdRequired: false,
    titularRequired: false,
    reasoning: 'Incidente envolve dados pessoais com potencial risco, mas não se enquadra nas categorias que exigem comunicação obrigatória. Recomenda-se documentação interna detalhada e guarda por 5 anos.',
    completedAt: new Date()
  };
}

/**
 * Format countdown for display
 */
export function formatCountdown(countdown: CountdownState): string {
  if (countdown.isExpired) {
    return 'PRAZO EXPIRADO';
  }
  
  const parts: string[] = [];
  
  if (countdown.days > 0) {
    parts.push(`${countdown.days}d`);
  }
  parts.push(`${countdown.hours.toString().padStart(2, '0')}h`);
  parts.push(`${countdown.minutes.toString().padStart(2, '0')}m`);
  parts.push(`${countdown.seconds.toString().padStart(2, '0')}s`);
  
  return parts.join(' ');
}

/**
 * Calculate phase completion percentage
 */
export function calculatePhaseCompletion(
  phases: Array<{ items: Array<{ isChecked: boolean }> }>
): number {
  const totalItems = phases.reduce((sum, p) => sum + p.items.length, 0);
  const checkedItems = phases.reduce(
    (sum, p) => sum + p.items.filter((i) => i.isChecked).length,
    0
  );
  
  return totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;
}

/**
 * Estimate incident resolution time based on severity
 */
export function estimateResolutionTime(
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
): { minHours: number; maxHours: number } {
  const estimates = {
    low: { minHours: 4, maxHours: 24 },
    medium: { minHours: 24, maxHours: 72 },
    high: { minHours: 48, maxHours: 168 },
    critical: { minHours: 72, maxHours: 336 }
  };
  
  return estimates[riskLevel];
}
