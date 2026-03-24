/**
 * Review Cron Job - Job automático para alertas de revisão periódica
 * 
 * Correções aplicadas (03/02/2026):
 * 1. Colunas camelCase padronizadas conforme schema Drizzle
 * 2. Idempotência reforçada via campo notes com chave determinística
 * 3. Cron automático com env flag ENABLE_REVIEW_CRON=true
 * 4. Inicialização automática na startup do servidor
 */

import { processReviewAlerts, getReviewStats } from './reviewScheduleService';
import { notifyOwner } from './_core/notification';
import { getDb } from './db';
import { sql, eq, and, lte, or } from 'drizzle-orm';
import { users, dpiaAssessments, actionPlans } from '../drizzle/schema';
import { TRPCError } from '@trpc/server';

// Intervalo padrão: 24 horas em milissegundos
const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000;

// Intervalo mínimo: 1 hora (para evitar sobrecarga)
const MIN_INTERVAL_MS = 60 * 60 * 1000;

let cronJobInterval: NodeJS.Timeout | null = null;
let lastRunTimestamp: number | null = null;
let isRunning = false;
let cronEnabled = false;

interface CronJobConfig {
  intervalMs?: number;
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
  enabled: false,
};

// ============================================
// CHAVE DE IDEMPOTÊNCIA
// ============================================

/**
 * Gera chave determinística para idempotência
 * Formato: origin:review:<type>:<entityId>
 */
function generateIdempotencyKey(type: 'mapeamento' | 'ripd', entityId: number): string {
  return `origin:review:${type}:${entityId}`;
}

/**
 * Executa a verificação de revisões pendentes e envia alertas
 */
export async function runReviewAlertCheck(): Promise<{
  success: boolean;
  processed: number;
  alertsSent: number;
  emailsSent: number;
  tasksCreated: number;
  ripdProcessed: number;
  errors: string[];
}> {
  if (isRunning) {
    console.log('[ReviewCron] Verificação já em andamento, ignorando...');
    return { success: false, processed: 0, alertsSent: 0, emailsSent: 0, tasksCreated: 0, ripdProcessed: 0, errors: ['Já em execução'] };
  }

  isRunning = true;
  lastRunTimestamp = Date.now();
  
  console.log('[ReviewCron] Iniciando verificação de revisões pendentes...');
  
  try {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

    const today = new Date();
    let processed = 0;
    let alertsSent = 0;
    let emailsSent = 0;
    let tasksCreated = 0;
    let ripdProcessed = 0;
    const errors: string[] = [];

    // Buscar todas as configurações ativas
    // NOTA: Tabela usa snake_case no MySQL, mas Drizzle mapeia para camelCase
    const configResults = await db.execute(sql`
      SELECT id, "organizationId", "reviewPeriodDays", "alertDaysBefore", "sendEmailAlerts", "defaultReviewerId", "isActive"
      FROM mapeamento_review_config WHERE "isActive" = true
    `);
    const configs = (configResults as any[])[0] as any[];

    for (const config of configs) {
      try {
        // Calcular data de alerta
        const alertDate = new Date(today);
        alertDate.setDate(alertDate.getDate() + (config.alertDaysBefore || 30));

        // Buscar agendamentos que precisam de alerta
        const scheduleResults = await db.execute(sql`
          SELECT s.id, s."organizationId", s."mapeamentoType", s."mapeamentoId", s."nextReviewDate", s.status, s."reviewerId", s."alertsSent", s."lastAlertSentAt",
                 r.title as mapeamentoTitle, o.name as orgName, o.id as orgId
          FROM mapeamento_review_schedule s
          LEFT JOIN rot_operations r ON s."mapeamentoType" = 'rot' AND s."mapeamentoId" = r.id
          LEFT JOIN organizations o ON s."organizationId" = o.id
          WHERE s."organizationId" = ${config.organizationId}
          AND s.status IN ('scheduled', 'pending')
          AND s."nextReviewDate" <= ${alertDate.toISOString().split('T')[0]}
          AND (s."lastAlertSentAt" IS NULL OR DATE(s."lastAlertSentAt") < ${today.toISOString().split('T')[0]})
        `);
        const schedules = (scheduleResults as any[])[0] as any[];

        for (const schedule of schedules) {
          processed++;

          // Calcular dias até vencimento
          const nextReviewDate = new Date(schedule.nextReviewDate);
          const daysUntilDue = Math.ceil((nextReviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const isOverdue = daysUntilDue < 0;

          // Atualizar status se vencido
          if (isOverdue) {
            await db.execute(sql`
              UPDATE mapeamento_review_schedule
              SET status = 'overdue', "updatedAt" = NOW()
              WHERE id = ${schedule.id}
            `);
          } else {
            await db.execute(sql`
              UPDATE mapeamento_review_schedule
              SET status = 'pending', "updatedAt" = NOW()
              WHERE id = ${schedule.id}
            `);
          }

          // Criar tarefa no action_plans (idempotente)
          const taskCreated = await createReviewTaskIdempotent(db, {
            type: 'mapeamento',
            entityId: schedule.mapeamentoId,
            entityType: schedule.mapeamentoType,
            entityTitle: schedule.mapeamentoTitle || `Mapeamento #${schedule.mapeamentoId}`,
            organizationId: schedule.orgId,
            nextReviewDate: schedule.nextReviewDate,
            isOverdue,
            reviewerId: schedule.reviewerId,
          });
          if (taskCreated) tasksCreated++;

          // Enviar alerta por e-mail se configurado
          if (config.sendEmailAlerts) {
            try {
              // Buscar responsável ou usar DPO/admin da organização
              let recipientEmail: string | null = null;
              let recipientName: string | null = null;

              if (schedule.reviewerId) {
                const [reviewer] = await db
                  .select()
                  .from(users)
                  .where(eq(users.id, schedule.reviewerId));
                if (reviewer) {
                  recipientEmail = reviewer.email;
                  recipientName = reviewer.name;
                }
              }

              // Se não tem responsável definido, buscar admin da organização
              if (!recipientEmail) {
                const adminResults = await db.execute(sql`
                  SELECT email, name FROM users 
                  WHERE "organizationId" = ${schedule.orgId} 
                  AND role IN ('admin_global', 'consultor')
                  LIMIT 1
                `);
                const admins = (adminResults as any[])[0] as any[];
                if (admins.length > 0) {
                  recipientEmail = admins[0].email;
                  recipientName = admins[0].name;
                }
              }

              if (recipientEmail) {
                // Usar notifyOwner para enviar notificação
                const subject = isOverdue 
                  ? `[URGENTE] Revisão de mapeamento vencida - ${schedule.mapeamentoTitle}`
                  : `Lembrete: Revisão de mapeamento em ${daysUntilDue} dias`;
                
                const content = `Mapeamento: ${schedule.mapeamentoTitle}\\nOrganização: ${schedule.orgName}\\nData de Revisão: ${new Date(schedule.nextReviewDate).toLocaleDateString('pt-BR')}\\nResponsável: ${recipientName || 'Não definido'}\\nStatus: ${isOverdue ? 'VENCIDA' : 'Pendente'}`;

                await notifyOwner({
                  title: subject,
                  content: content
                });

                emailsSent++;
              }

              alertsSent++;
            } catch (emailError) {
              errors.push(`Erro ao enviar e-mail para schedule ${schedule.id}: ${emailError}`);
            }
          }

          // Atualizar contador de alertas
          await db.execute(sql`
            UPDATE mapeamento_review_schedule
            SET "alertsSent" = alertsSent + 1, "lastAlertSentAt" = NOW()
            WHERE id = ${schedule.id}
          `);
        }
      } catch (configError) {
        errors.push(`Erro ao processar config ${config.id}: ${configError}`);
      }
    }

    // Processar revisões de RIPD/DPIA
    const ripdResult = await processRipdReviewAlerts(db, today);
    ripdProcessed = ripdResult.processed;
    tasksCreated += ripdResult.tasksCreated;
    errors.push(...ripdResult.errors);

    console.log(`[ReviewCron] Verificação concluída: ${processed} mapeamentos, ${ripdProcessed} RIPDs, ${alertsSent} alertas, ${emailsSent} e-mails, ${tasksCreated} tarefas criadas`);

    // Enviar resumo ao owner se houver revisões vencidas
    if (alertsSent > 0 || tasksCreated > 0) {
      await notifyOwner({
        title: 'Resumo de Alertas de Revisão Periódica',
        content: `Mapeamentos processados: ${processed}\\nRIPDs processados: ${ripdProcessed}\\nAlertas enviados: ${alertsSent}\\nE-mails enviados: ${emailsSent}\\nTarefas criadas: ${tasksCreated}\\nErros: ${errors.length}`
      });
    }

    return { success: true, processed, alertsSent, emailsSent, tasksCreated, ripdProcessed, errors };
  } catch (error) {
    console.error('[ReviewCron] Erro na verificação:', error);
    return { 
      success: false, 
      processed: 0, 
      alertsSent: 0, 
      emailsSent: 0, 
      tasksCreated: 0,
      ripdProcessed: 0,
      errors: [String(error)] 
    };
  } finally {
    isRunning = false;
  }
}

/**
 * Gera HTML do e-mail de alerta de revisão
 */
function generateReviewAlertEmailHtml(data: {
  reviewerName: string;
  mapeamentoTitle: string;
  organizationName: string;
  dueDate: string;
  isOverdue: boolean;
  daysUntilDue: number;
}): string {
  const urgencyColor = data.isOverdue ? '#DC2626' : '#F59E0B';
  const statusText = data.isOverdue 
    ? `VENCIDA há ${Math.abs(data.daysUntilDue)} dias`
    : `Vence em ${data.daysUntilDue} dias`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #374151; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6B21A8 0%, #3B82F6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #F9FAFB; padding: 30px; border-radius: 0 0 8px 8px; }
    .alert-badge { display: inline-block; background: ${urgencyColor}; color: white; padding: 4px 12px; border-radius: 4px; font-weight: 600; margin-bottom: 20px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #6B21A8; margin: 20px 0; }
    .footer { text-align: center; color: #9CA3AF; font-size: 12px; margin-top: 20px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #6B21A8 0%, #3B82F6 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Seusdados Due Diligence</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Sistema de Revisão Periódica</p>
    </div>
    <div class="content">
      <div class="alert-badge">${statusText}</div>
      
      <p>Olá ${data.reviewerName},</p>
      
      <p>Este é um lembrete sobre a revisão periódica do mapeamento:</p>
      
      <div class="info-box">
        <p><strong>Mapeamento:</strong> ${data.mapeamentoTitle}</p>
        <p><strong>Organização:</strong> ${data.organizationName}</p>
        <p><strong>Data de Revisão:</strong> ${data.dueDate}</p>
      </div>
      
      <p>Por favor, acesse o sistema para realizar a revisão.</p>
      
      <a href="#" class="btn">Acessar Sistema</a>
    </div>
    <div class="footer">
      <p>Seusdados Consultoria em Gestão de Dados Limitada</p>
      <p>CNPJ: 33.899.116/0001-63 | www.seusdados.com</p>
    </div>
  </div>
</body>
</html>
`;
}

// ============================================
// CONTROLE DO CRON JOB
// ============================================

/**
 * Inicia o cron job de verificação de revisões
 */
export function startReviewCronJob(config?: CronJobConfig): void {
  if (cronJobInterval) {
    console.log('[ReviewCron] Cron job já está rodando');
    return;
  }

  const intervalMs = Math.max(config?.intervalMs || DEFAULT_INTERVAL_MS, MIN_INTERVAL_MS);
  currentConfig = { ...currentConfig, ...config, intervalMs };
  cronEnabled = true;

  console.log(`[ReviewCron] Iniciando cron job com intervalo de ${intervalMs / 1000 / 60} minutos`);

  // Executar imediatamente na primeira vez
  runReviewAlertCheck().catch(console.error);

  // Agendar execuções periódicas
  cronJobInterval = setInterval(() => {
    runReviewAlertCheck().catch(console.error);
  }, intervalMs);

  console.log('[ReviewCron] Cron job iniciado com sucesso');
}

/**
 * Para o cron job de verificação de revisões
 */
export function stopReviewCronJob(): void {
  if (cronJobInterval) {
    clearInterval(cronJobInterval);
    cronJobInterval = null;
    cronEnabled = false;
    console.log('[ReviewCron] Cron job parado');
  }
}

/**
 * Retorna o status atual do cron job
 */
export function getCronJobStatus(): CronJobStatus {
  const nextRunTime = cronJobInterval && lastRunTimestamp
    ? new Date(lastRunTimestamp + (currentConfig.intervalMs || DEFAULT_INTERVAL_MS))
    : null;

  return {
    isRunning: cronEnabled && cronJobInterval !== null,
    lastRun: lastRunTimestamp ? new Date(lastRunTimestamp).toISOString() : null,
    nextRun: nextRunTime ? nextRunTime.toISOString() : null,
    intervalMs: currentConfig.intervalMs || DEFAULT_INTERVAL_MS,
    enabled: cronEnabled,
  };
}

/**
 * Atualiza a configuração do cron job
 */
export function updateCronJobConfig(config: CronJobConfig): void {
  const wasRunning = cronJobInterval !== null;
  
  if (wasRunning) {
    stopReviewCronJob();
  }

  currentConfig = { ...currentConfig, ...config };

  if (wasRunning && config.enabled !== false) {
    startReviewCronJob(currentConfig);
  }
}

/**
 * Executa uma verificação manual (trigger)
 */
export async function triggerManualCheck(): Promise<{
  success: boolean;
  processed: number;
  alertsSent: number;
  emailsSent: number;
  tasksCreated: number;
  ripdProcessed: number;
  errors: string[];
}> {
  return runReviewAlertCheck();
}

// ============================================
// PROCESSAMENTO DE RIPD/DPIA
// ============================================

/**
 * Processa alertas de revisão de RIPD/DPIA
 * Usa colunas camelCase conforme schema Drizzle
 */
async function processRipdReviewAlerts(db: any, today: Date): Promise<{
  processed: number;
  tasksCreated: number;
  errors: string[];
}> {
  let processed = 0;
  let tasksCreated = 0;
  const errors: string[] = [];

  try {
    // Buscar RIPDs com nextReviewDate definido e status ativo
    // REGRA: alertDate = hoje + 30 dias (PENDING se <= 30 dias)
    const alertDate = new Date(today);
    alertDate.setDate(alertDate.getDate() + 30);

    // Usar colunas camelCase conforme schema Drizzle (dpia_assessments)
    const ripdResults = await db.execute(sql`
      SELECT d.id, d.title, d.status, d."nextReviewDate", d."organizationId", d."dpoId", o.name as orgName
      FROM dpia_assessments d
      LEFT JOIN organizations o ON d."organizationId" = o.id
      WHERE d.status IN ('approved', 'in_progress')
      AND d."nextReviewDate" IS NOT NULL
      AND d."nextReviewDate" <= ${alertDate.toISOString().split('T')[0]}
    `);
    const ripds = (ripdResults as any[])[0] as any[];

    for (const ripd of ripds) {
      try {
        const nextReviewDate = new Date(ripd.nextReviewDate);
        // REGRA: isOverdue = nextReviewDate < today (< 0 dias)
        const isOverdue = nextReviewDate < today;

        // Criar tarefa no action_plans (idempotente via notes)
        const taskCreated = await createReviewTaskIdempotent(db, {
          type: 'ripd',
          entityId: ripd.id,
          entityType: 'dpia',
          entityTitle: ripd.title,
          organizationId: ripd.organizationId,
          nextReviewDate: ripd.nextReviewDate,
          isOverdue,
          reviewerId: ripd.dpoId,
        });

        if (taskCreated) tasksCreated++;
        processed++;

        console.log(`[ReviewCron] RIPD #${ripd.id} processado: ${isOverdue ? 'OVERDUE' : 'PENDING'}`);
      } catch (ripdError) {
        errors.push(`Erro ao processar RIPD ${ripd.id}: ${ripdError}`);
      }
    }
  } catch (error) {
    errors.push(`Erro ao buscar RIPDs: ${error}`);
  }

  return { processed, tasksCreated, errors };
}

// ============================================
// CRIAÇÃO DE TAREFAS IDEMPOTENTE
// ============================================

/**
 * Cria tarefa de revisão no action_plans de forma idempotente
 * 
 * IDEMPOTÊNCIA REFORÇADA:
 * - Usa campo notes com chave determinística: origin:review:<type>:<entityId>
 * - SELECT exato por notes + organizationId + status
 * - Não cria duplicatas se já existir tarefa pendente
 */
async function createReviewTaskIdempotent(db: any, params: {
  type: 'mapeamento' | 'ripd';
  entityId: number;
  entityType: string;
  entityTitle: string;
  organizationId: number;
  nextReviewDate: string;
  isOverdue: boolean;
  reviewerId?: number | null;
}): Promise<boolean> {
  const { type, entityId, entityType, entityTitle, organizationId, nextReviewDate, isOverdue, reviewerId } = params;

  // Gerar chave de idempotência determinística
  const idempotencyKey = generateIdempotencyKey(type, entityId);

  try {
    // Verificar se já existe tarefa para esta revisão (idempotência via notes)
    // CHAVE: notes = idempotencyKey + organizationId + status IN ('pendente', 'em_andamento')
    const existingResults = await db.execute(sql`
      SELECT id, priority FROM action_plans
      WHERE "organizationId" = ${organizationId}
      AND notes = ${idempotencyKey}
      AND status IN ('pendente', 'em_andamento')
      LIMIT 1
    `);
    const existingTasks = (existingResults as any[])[0] as any[];

    if (existingTasks.length > 0) {
      // Atualizar prioridade se ficou overdue
      if (isOverdue && existingTasks[0].priority !== 'critica' && existingTasks[0].priority !== 'alta') {
        await db.execute(sql`
          UPDATE action_plans
          SET priority = 'alta', "updatedAt" = NOW()
          WHERE id = ${existingTasks[0].id}
        `);
        console.log(`[ReviewCron] Tarefa #${existingTasks[0].id} atualizada para prioridade ALTA (overdue)`);
      }
      return false; // Tarefa já existe - NÃO DUPLICA
    }

    // Criar nova tarefa com chave de idempotência no campo notes
    const taskTitle = type === 'ripd'
      ? `[Revisão RIPD] ${entityTitle}`
      : `[Revisão Mapeamento] ${entityType.toUpperCase()} - ${entityTitle}`;

    const taskDescription = type === 'ripd'
      ? `Revisão anual do RIPD/DPIA "${entityTitle}" conforme Art. 38 da LGPD. Data limite: ${new Date(nextReviewDate).toLocaleDateString('pt-BR')}.`
      : `Revisão periódica do mapeamento ${entityType.toUpperCase()} "${entityTitle}". Data limite: ${new Date(nextReviewDate).toLocaleDateString('pt-BR')}.`;

    // REGRA: isOverdue = prioridade 'alta', senão 'media'
    const priority = isOverdue ? 'alta' : 'media';

    // Usar colunas camelCase conforme schema Drizzle (action_plans)
    await db.execute(sql`
      INSERT INTO action_plans (
        "organizationId", "assessmentType", "assessmentId",
        title, description, priority, status,
        "responsibleId", "dueDate", "actionCategory", notes
      ) VALUES (
        ${organizationId}, 'compliance', ${entityId},
        ${taskTitle}, ${taskDescription}, ${priority}, 'pendente',
        ${reviewerId || null}, ${nextReviewDate}, 'operacional', ${idempotencyKey}
      )
    `);

    console.log(`[ReviewCron] Tarefa criada: ${taskTitle} (prioridade: ${priority}, key: ${idempotencyKey})`);
    return true;
  } catch (error) {
    console.error(`[ReviewCron] Erro ao criar tarefa: ${error}`);
    return false;
  }
}

// ============================================
// INICIALIZAÇÃO AUTOMÁTICA VIA ENV FLAG
// ============================================

/**
 * Inicializa o cron job automaticamente se ENABLE_REVIEW_CRON=true
 * Deve ser chamado na inicialização do servidor
 */
export function initializeReviewCron(): void {
  // === BLOQUEADO DEFINITIVAMENTE ===
  // E-mails de alerta de revisão periódica/prazo desativados por solicitação.
  // Nenhum perfil deve receber e-mails de prazo/vencimento.
  console.log('[ReviewCron] Cron de revisão DESATIVADO permanentemente (bloqueio de e-mails de prazo).');
  return;
}


// ============================================
// ALIASES DE EXPORTAÇÃO (compatibilidade)
// ============================================

// Aliases para manter compatibilidade com código existente
export const getReviewCronJobStatus = getCronJobStatus;
export const updateReviewCronJobConfig = updateCronJobConfig;
