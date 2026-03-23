/**
 * Cron Job para envio de lembretes automáticos de avaliações pendentes
 * 
 * Este módulo verifica periodicamente avaliações com prazo próximo do vencimento
 * e envia lembretes automáticos para os responsáveis.
 */

import { getDb, toSqlTimestamp, nowSql } from './db';
import { logger } from './_core/logger';
import { sendReminderEmail, createEmailLog, updateEmailLogStatus } from './emailService';
import { assessmentAssignments, organizations, unifiedAssessments } from '../drizzle/schema';
import { eq, and, lt, gt, sql, inArray } from 'drizzle-orm';
import { notifyOwner } from './_core/notification';
import { getAppBaseUrl } from './appUrl';

// Intervalo padrão: 6 horas em milissegundos
const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;

// Intervalo mínimo: 1 hora (para evitar sobrecarga)
const MIN_INTERVAL_MS = 60 * 60 * 1000;

let cronJobInterval: NodeJS.Timeout | null = null;
let lastRunTimestamp: number | null = null;
let isRunning = false;

interface CronJobConfig {
  intervalMs?: number;
  daysBeforeDeadline?: number[];  // Dias antes do prazo para enviar lembretes (ex: [7, 3, 1])
  maxRemindersPerAssessment?: number;
  enabled?: boolean;
}

interface CronJobStatus {
  isRunning: boolean;
  lastRun: string | null;
  nextRun: string | null;
  intervalMs: number;
  enabled: boolean;
}

let currentConfig: CronJobConfig = {
  intervalMs: DEFAULT_INTERVAL_MS,
  daysBeforeDeadline: [7, 3, 1],  // Enviar lembretes 7, 3 e 1 dia antes do prazo
  maxRemindersPerAssessment: 3,
  enabled: true,
};

interface PendingAssignment {
  id: number;
  assessmentId: number;
  userId: number;
  userName: string;
  userEmail: string;
  organizationId: number;
  organizationName: string;
  deadline: Date;
  daysUntilDeadline: number;
  domainId: string;
  domainName: string;
}

/**
 * Busca atribuições pendentes com prazo próximo
 */
async function getPendingAssignmentsNearDeadline(): Promise<PendingAssignment[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const now = new Date();
    const maxDays = Math.max(...(currentConfig.daysBeforeDeadline || [7]));
    const futureDate = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);
    
    const results = await db.select({
      id: assessmentAssignments.id,
      assessmentId: assessmentAssignments.assessmentId,
      assignedToUserId: assessmentAssignments.assignedToUserId,
      deadline: assessmentAssignments.deadline,
      domainId: assessmentAssignments.domainId,
      domainName: assessmentAssignments.domainName,
      assignedToName: assessmentAssignments.assignedToName,
      assignedToEmail: assessmentAssignments.assignedToEmail,
      organizationId: unifiedAssessments.organizationId,
      organizationName: organizations.name,
    })
    .from(assessmentAssignments)
    .leftJoin(unifiedAssessments, eq(assessmentAssignments.assessmentId, unifiedAssessments.id))
    .leftJoin(organizations, eq(unifiedAssessments.organizationId, organizations.id))
    .where(
      and(
        eq(assessmentAssignments.status, 'pendente'),
        gt(assessmentAssignments.deadline, toSqlTimestamp(now)),
        lt(assessmentAssignments.deadline, toSqlTimestamp(futureDate))
      )
    );
    
    return results.map(r => ({
      id: r.id,
      assessmentId: r.assessmentId,
      userId: r.assignedToUserId,
      userName: r.assignedToName || 'Usuário',
      userEmail: r.assignedToEmail || '',
      organizationId: r.organizationId || 0,
      organizationName: r.organizationName || 'Organização',
      deadline: new Date(r.deadline as any),
      daysUntilDeadline: Math.ceil((new Date(r.deadline as any).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
      domainId: r.domainId,
      domainName: r.domainName || r.domainId,
    })).filter(a => a.userEmail);
  } catch (error) {
    logger.error('[AssessmentReminderCron] Error fetching pending assignments', error as Error);
    return [];
  }
}

/**
 * Verifica se deve enviar lembrete para uma avaliação específica
 */
function shouldSendReminder(daysUntilDeadline: number): boolean {
  const thresholds = currentConfig.daysBeforeDeadline || [7, 3, 1];
  return thresholds.includes(daysUntilDeadline);
}

/**
 * Executa a verificação e envio de lembretes
 */
async function runReminderCheck(): Promise<{
  success: boolean;
  checked: number;
  sent: number;
  errors: number;
}> {
  if (isRunning) {
    logger.info('[AssessmentReminderCron] Check already running, skipping...');
    return { success: false, checked: 0, sent: 0, errors: 0 };
  }
  
  isRunning = true;
  lastRunTimestamp = Date.now();
  
  logger.info('[AssessmentReminderCron] Starting reminder check...');
  
  let checked = 0;
  let sent = 0;
  let errors = 0;
  
  try {
    const pendingAssignments = await getPendingAssignmentsNearDeadline();
    checked = pendingAssignments.length;
    
    logger.info(`[AssessmentReminderCron] Found ${checked} pending assignments near deadline`);
    
    for (const assignment of pendingAssignments) {
      if (!shouldSendReminder(assignment.daysUntilDeadline)) {
        continue;
      }
      
      try {
        // Criar log do e-mail
        const logId = await createEmailLog({
          organizationId: assignment.organizationId,
          recipientEmail: assignment.userEmail,
          recipientName: assignment.userName,
          subject: `Lembrete: Avaliação de ${assignment.domainName} - ${assignment.daysUntilDeadline} dias restantes`,
          emailType: 'lembrete_avaliacao',
          relatedEntityType: 'compliance_assessment',
          relatedEntityId: assignment.assessmentId,
          metadata: {
            assessmentId: assignment.assessmentId,
          },
        });
        
        // Construir link de acesso
        const baseUrl = getAppBaseUrl();
        const accessLink = `${baseUrl}/avaliacoes/${assignment.assessmentId}`;
        
        // Enviar lembrete usando o template genérico
        const result = await sendReminderEmail({
          thirdPartyName: assignment.userName,
          thirdPartyEmail: assignment.userEmail,
          organizationName: assignment.organizationName,
          assessmentLink: accessLink,
          daysRemaining: assignment.daysUntilDeadline,
        });
        
        if (result.success) {
          await updateEmailLogStatus(logId, 'sent');
          sent++;
          logger.info(`[AssessmentReminderCron] Reminder sent to ${assignment.userEmail} for domain ${assignment.domainName}`);
        } else {
          await updateEmailLogStatus(logId, 'failed', { errorMessage: result.message });
          errors++;
          logger.warn(`[AssessmentReminderCron] Failed to send reminder: ${result.message}`);
        }
      } catch (error) {
        errors++;
        logger.error(`[AssessmentReminderCron] Error sending reminder for assignment ${assignment.id}`, error as Error);
      }
    }
    
    // Enviar resumo ao owner se houver lembretes enviados
    if (sent > 0) {
      await notifyOwner({
        title: '📧 Lembretes de Avaliação Enviados',
        content: `**Resumo do envio automático de lembretes:**\n\n- Avaliações verificadas: ${checked}\n- Lembretes enviados: ${sent}\n- Erros: ${errors}\n\nOs terceiros foram notificados sobre os prazos de suas avaliações pendentes.`,
      });
    }
    
    logger.info(`[AssessmentReminderCron] Check completed: ${checked} checked, ${sent} sent, ${errors} errors`);
    
    return { success: true, checked, sent, errors };
  } catch (error) {
    logger.error('[AssessmentReminderCron] Error during reminder check', error as Error);
    return { success: false, checked, sent, errors };
  } finally {
    isRunning = false;
  }
}

/**
 * Inicia o cron job de lembretes
 */
export function startAssessmentReminderCronJob(config?: CronJobConfig): void {
  if (cronJobInterval) {
    logger.info('[AssessmentReminderCron] Stopping existing cron job before restart...');
    stopAssessmentReminderCronJob();
  }
  
  if (config) {
    currentConfig = { ...currentConfig, ...config };
  }
  
  if (!currentConfig.enabled) {
    logger.info('[AssessmentReminderCron] Cron job is disabled');
    return;
  }
  
  const intervalMs = Math.max(currentConfig.intervalMs || DEFAULT_INTERVAL_MS, MIN_INTERVAL_MS);
  
  logger.info(`[AssessmentReminderCron] Starting cron job with interval of ${intervalMs / 1000 / 60} minutes`);
  
  // Executar imediatamente na primeira vez
  runReminderCheck();
  
  // Configurar intervalo
  cronJobInterval = setInterval(() => {
    runReminderCheck();
  }, intervalMs);
}

/**
 * Para o cron job
 */
export function stopAssessmentReminderCronJob(): void {
  if (cronJobInterval) {
    clearInterval(cronJobInterval);
    cronJobInterval = null;
    logger.info('[AssessmentReminderCron] Cron job stopped');
  }
}

/**
 * Retorna o status atual do cron job
 */
export function getAssessmentReminderCronJobStatus(): CronJobStatus {
  const intervalMs = currentConfig.intervalMs || DEFAULT_INTERVAL_MS;
  
  return {
    isRunning: cronJobInterval !== null,
    lastRun: lastRunTimestamp ? new Date(lastRunTimestamp).toISOString() : null,
    nextRun: lastRunTimestamp && cronJobInterval 
      ? new Date(lastRunTimestamp + intervalMs).toISOString() 
      : null,
    intervalMs,
    enabled: currentConfig.enabled ?? true,
  };
}

/**
 * Atualiza a configuração do cron job
 */
export function updateAssessmentReminderCronJobConfig(config: Partial<CronJobConfig>): void {
  const wasRunning = cronJobInterval !== null;
  
  currentConfig = { ...currentConfig, ...config };
  
  if (wasRunning) {
    startAssessmentReminderCronJob();
  }
}

/**
 * Executa verificação manual
 */
export async function triggerManualReminderCheck(): Promise<{
  success: boolean;
  checked: number;
  sent: number;
  errors: number;
}> {
  return runReminderCheck();
}
