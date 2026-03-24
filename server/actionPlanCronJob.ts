import { checkAndNotifyUpcomingDeadlines, getUpcomingDeadlinesReport } from './actionPlanNotifications';
import * as db from './db';
import { notifyOwner } from './_core/notification';
import { sendActionPlanAlertEmail } from './emailService';

// Intervalo padrão: 24 horas em milissegundos
const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000;

// Intervalo mínimo: 1 hora (para evitar sobrecarga)
const MIN_INTERVAL_MS = 60 * 60 * 1000;

let cronJobInterval: NodeJS.Timeout | null = null;
let lastRunTimestamp: number | null = null;
let isRunning = false;

interface CronJobConfig {
  intervalMs?: number;
  daysThreshold?: number;
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
  daysThreshold: 7,
  enabled: true,
};

/**
 * Executa a verificação de prazos
 */
async function runDeadlineCheck(): Promise<{
  success: boolean;
  checked: number;
  notified: number;
  error?: string;
}> {
  if (isRunning) {
    console.log('[ActionPlanCron] Verificação já em andamento, ignorando...');
    return { success: false, checked: 0, notified: 0, error: 'Já em execução' };
  }

  isRunning = true;
  lastRunTimestamp = Date.now();
  
  console.log('[ActionPlanCron] Iniciando verificação de prazos...');
  
  try {
    const result = await checkAndNotifyUpcomingDeadlines(currentConfig.daysThreshold || 7);
    
    console.log(`[ActionPlanCron] Verificação concluída: ${result.checked} ações verificadas, ${result.notified} notificações enviadas`);
    
    // Se houver ações críticas atrasadas, enviar resumo ao owner
    const report = await getUpcomingDeadlinesReport(undefined, currentConfig.daysThreshold || 7);
    
    // Enviar e-mails para responsáveis das ações
    let emailsSent = 0;
    for (const action of [...report.overdue, ...report.dueToday, ...report.dueSoon]) {
      if (action.responsibleId && action.responsibleEmail) {
        const alertType = action.daysUntilDue < 0 ? 'overdue' 
          : action.daysUntilDue === 0 ? 'due_today' 
          : 'due_soon';
        
        const emailResult = await sendActionPlanAlertEmail(
          {
            recipientName: action.responsibleName || action.responsibleEmail,
            recipientEmail: action.responsibleEmail,
            actionId: action.id,
            actionTitle: action.title,
            actionDescription: action.description,
            priority: action.priority,
            dueDate: action.dueDate,
            daysUntilDue: action.daysUntilDue,
            organizationName: action.organizationName || 'N/A',
            category: action.actionCategory || 'contratual',
          },
          alertType
        );
        
        if (emailResult.success) {
          emailsSent++;
        }
      }
    }
    
    console.log(`[ActionPlanCron] E-mails enviados: ${emailsSent}`);
    
    if (report.summary.totalOverdue > 0 || report.summary.criticalCount > 0) {
      await notifyOwner({
        title: '📊 Resumo Diário - Plano de Ação',
        content: `
**Resumo de Prazos:**
- Ações atrasadas: ${report.summary.totalOverdue}
- Vencem hoje: ${report.summary.totalDueToday}
- Vencem em até 7 dias: ${report.summary.totalDueSoon}
- Ações críticas pendentes: ${report.summary.criticalCount}
- E-mails enviados: ${emailsSent}

${report.summary.totalOverdue > 0 ? '⚠️ Atenção: Existem ações atrasadas que precisam de ação imediata.' : ''}
        `.trim(),
      });
    }
    
    return {
      success: true,
      checked: result.checked,
      notified: result.notified,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[ActionPlanCron] Erro na verificação de prazos:', errorMessage);
    
    return {
      success: false,
      checked: 0,
      notified: 0,
      error: errorMessage,
    };
  } finally {
    isRunning = false;
  }
}

/**
 * Inicia o cron job de verificação de prazos
 */
export function startActionPlanCronJob(config?: CronJobConfig): void {
  // Parar job existente se houver
  stopActionPlanCronJob();
  
  // Aplicar configuração
  if (config) {
    currentConfig = { ...currentConfig, ...config };
  }
  
  if (!currentConfig.enabled) {
    console.log('[ActionPlanCron] Cron job desabilitado');
    return;
  }
  
  const intervalMs = Math.max(currentConfig.intervalMs || DEFAULT_INTERVAL_MS, MIN_INTERVAL_MS);
  
  console.log(`[ActionPlanCron] Iniciando cron job com intervalo de ${intervalMs / 1000 / 60} minutos`);
  
  // Executar imediatamente na primeira vez
  runDeadlineCheck();
  
  // Configurar intervalo
  cronJobInterval = setInterval(() => {
    runDeadlineCheck();
  }, intervalMs);
  
  console.log('[ActionPlanCron] Cron job iniciado com sucesso');
}

/**
 * Para o cron job
 */
export function stopActionPlanCronJob(): void {
  if (cronJobInterval) {
    clearInterval(cronJobInterval);
    cronJobInterval = null;
    console.log('[ActionPlanCron] Cron job parado');
  }
}

/**
 * Retorna o status atual do cron job
 */
export function getCronJobStatus(): CronJobStatus {
  const intervalMs = currentConfig.intervalMs || DEFAULT_INTERVAL_MS;
  
  return {
    isRunning,
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
export function updateCronJobConfig(config: CronJobConfig): void {
  const wasEnabled = currentConfig.enabled;
  currentConfig = { ...currentConfig, ...config };
  
  // Reiniciar se estava habilitado ou se foi habilitado agora
  if (wasEnabled || config.enabled) {
    startActionPlanCronJob();
  }
}

/**
 * Executa verificação manual (fora do intervalo)
 */
export async function triggerManualCheck(): Promise<{
  success: boolean;
  checked: number;
  notified: number;
  error?: string;
}> {
  return runDeadlineCheck();
}

// Exportar função para inicialização no servidor
export function initializeActionPlanCronJob(): void {
  // === BLOQUEADO DEFINITIVAMENTE ===
  // E-mails de alerta de prazo/vencimento do plano de ação desativados por solicitação.
  // Nenhum perfil deve receber e-mails de prazo/vencimento.
  console.log('[ActionPlanCron] Serviço de verificação de prazos DESATIVADO permanentemente.');
  return;
}
