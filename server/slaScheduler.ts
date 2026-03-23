/**
 * Scheduler de Verificação de SLA
 * 
 * Job periódico que verifica tickets próximos do vencimento do SLA
 * e envia alertas automáticos para tickets críticos.
 * 
 * Execução: A cada hora
 */

import { logger } from './_core/logger';
import * as slaMonitoring from './slaMonitoringService';
import { sendDailySLASummary } from './ticketNotificationService';

// Configuração do scheduler
const SLA_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hora em milissegundos
const DAILY_SUMMARY_HOUR = 8; // Hora do resumo diário (8:00)
const DAILY_SUMMARY_MINUTE = 0;

let schedulerInterval: NodeJS.Timeout | null = null;
let dailySummaryInterval: NodeJS.Timeout | null = null;
let isRunning = false;
let lastRunTime: Date | null = null;
let lastRunResult: { sent: number; errors: number } | null = null;
let lastDailySummaryDate: string | null = null;

/**
 * Executa a verificação de SLA e envia alertas
 */
async function runSLACheck(): Promise<void> {
  if (isRunning) {
    logger.warn('Verificação de SLA já está em execução, pulando...');
    return;
  }

  isRunning = true;
  const startTime = new Date();
  
  logger.info('Iniciando verificação periódica de SLA', { 
    timestamp: startTime.toISOString() 
  });

  try {
    // Enviar alertas para tickets críticos
    const result = await slaMonitoring.sendSLAAlerts();
    
    lastRunTime = startTime;
    lastRunResult = result;
    
    logger.info('Verificação de SLA concluída', {
      timestamp: new Date().toISOString(),
      duration: `${Date.now() - startTime.getTime()}ms`,
      alertsSent: result.sent,
      errors: result.errors
    });
  } catch (error) {
    logger.error('Erro na verificação periódica de SLA', error as Error);
    lastRunResult = { sent: 0, errors: 1 };
  } finally {
    isRunning = false;
  }
}

/**
 * Verifica e envia o resumo diário de SLA
 */
async function checkAndSendDailySummary(): Promise<void> {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const today = now.toISOString().split('T')[0];
  
  // Verifica se é o horário correto e se ainda não foi enviado hoje
  if (currentHour === DAILY_SUMMARY_HOUR && 
      currentMinute >= DAILY_SUMMARY_MINUTE && 
      currentMinute < DAILY_SUMMARY_MINUTE + 5 && // Janela de 5 minutos
      lastDailySummaryDate !== today) {
    try {
      logger.info('Enviando resumo diário de SLA...');
      await sendDailySLASummary();
      lastDailySummaryDate = today;
      logger.info('Resumo diário de SLA enviado com sucesso');
    } catch (error) {
      logger.error('Erro ao enviar resumo diário de SLA', error as Error);
    }
  }
}

/**
 * Inicia o scheduler de verificação de SLA
 */
export function startSLAScheduler(): void {
  if (schedulerInterval) {
    logger.warn('Scheduler de SLA já está ativo');
    return;
  }

  logger.info('Iniciando scheduler de verificação de SLA', {
    interval: `${SLA_CHECK_INTERVAL_MS / 1000 / 60} minutos`,
    dailySummaryTime: `${DAILY_SUMMARY_HOUR}:${DAILY_SUMMARY_MINUTE.toString().padStart(2, '0')}`
  });

  // Executar imediatamente na primeira vez
  runSLACheck();

  // Agendar execuções periódicas
  schedulerInterval = setInterval(runSLACheck, SLA_CHECK_INTERVAL_MS);
  
  // Agendar verificação do resumo diário a cada minuto
  dailySummaryInterval = setInterval(checkAndSendDailySummary, 60 * 1000);
  
  // Verificar se deve enviar o resumo agora
  checkAndSendDailySummary();
  
  logger.info('Scheduler de SLA iniciado com sucesso');
}

/**
 * Para o scheduler de verificação de SLA
 */
export function stopSLAScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
  if (dailySummaryInterval) {
    clearInterval(dailySummaryInterval);
    dailySummaryInterval = null;
  }
  logger.info('Scheduler de SLA parado');
}

/**
 * Retorna o status do scheduler
 */
export function getSchedulerStatus(): {
  isActive: boolean;
  isRunning: boolean;
  lastRunTime: Date | null;
  lastRunResult: { sent: number; errors: number } | null;
  nextRunTime: Date | null;
  lastDailySummaryDate: string | null;
  nextDailySummaryTime: string;
} {
  const now = new Date();
  const nextSummary = new Date(now);
  
  // Se já passou do horário hoje, agenda para amanhã
  if (now.getHours() > DAILY_SUMMARY_HOUR || 
      (now.getHours() === DAILY_SUMMARY_HOUR && now.getMinutes() >= DAILY_SUMMARY_MINUTE)) {
    nextSummary.setDate(nextSummary.getDate() + 1);
  }
  nextSummary.setHours(DAILY_SUMMARY_HOUR, DAILY_SUMMARY_MINUTE, 0, 0);
  
  return {
    isActive: schedulerInterval !== null,
    isRunning,
    lastRunTime,
    lastRunResult,
    nextRunTime: lastRunTime 
      ? new Date(lastRunTime.getTime() + SLA_CHECK_INTERVAL_MS) 
      : null,
    lastDailySummaryDate,
    nextDailySummaryTime: nextSummary.toISOString()
  };
}

/**
 * Força uma execução imediata da verificação de SLA
 */
export async function triggerSLACheck(): Promise<{ sent: number; errors: number }> {
  logger.info('Execução manual de verificação de SLA solicitada');
  await runSLACheck();
  return lastRunResult || { sent: 0, errors: 0 };
}

/**
 * Força o envio do resumo diário de SLA
 */
export async function triggerDailySummary(): Promise<void> {
  logger.info('Envio manual do resumo diário de SLA solicitado');
  await sendDailySLASummary();
  lastDailySummaryDate = new Date().toISOString().split('T')[0];
}

export default {
  startSLAScheduler,
  stopSLAScheduler,
  getSchedulerStatus,
  triggerSLACheck
};
