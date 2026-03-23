/**
 * Review Schedule Service - Sistema de Revisão Periódica de Mapeamentos
 * Gerencia alertas e agendamento de revisões de mapeamentos
 */

import { getDb } from "./db";
import { eq, and, sql, lte, gte, desc } from "drizzle-orm";
import { rotOperations, organizations, users } from "../drizzle/schema";
import { sendAssessmentEmail } from "./emailService";
import { TRPCError } from '@trpc/server';

// ============================================
// TIPOS
// ============================================

export interface ReviewConfig {
  id: number;
  organizationId: number;
  reviewPeriodDays: number;
  alertDaysBefore: number;
  sendEmailAlerts: boolean;
  defaultReviewerId: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewSchedule {
  id: number;
  organizationId: number;
  mapeamentoType: 'rot' | 'processo' | 'area';
  mapeamentoId: number;
  lastReviewDate: string | null;
  nextReviewDate: string;
  status: 'scheduled' | 'pending' | 'overdue' | 'completed' | 'skipped';
  reviewerId: number | null;
  alertsSent: number;
  lastAlertSentAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Campos adicionais para exibição
  mapeamentoTitle?: string;
  reviewerName?: string;
  organizationName?: string;
}

export interface ReviewHistory {
  id: number;
  scheduleId: number;
  organizationId: number;
  mapeamentoType: 'rot' | 'processo' | 'area';
  mapeamentoId: number;
  reviewedById: number;
  reviewedAt: string;
  reviewResult: 'approved' | 'updated' | 'archived' | 'flagged';
  notes: string | null;
  changesDescription: string | null;
  previousState: any;
  createdAt: string;
  // Campos adicionais
  reviewerName?: string;
}

// ============================================
// CONFIGURAÇÃO DE REVISÃO
// ============================================

export async function getReviewConfig(organizationId: number): Promise<ReviewConfig | null> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const results = await db.execute(sql`
    SELECT * FROM mapeamento_review_config 
    WHERE "organizationId" = ${organizationId}
    LIMIT 1
  `);

  const rows = (results as any).rows as any[];
  if (rows.length === 0) return null;

  return mapConfigFromDb(rows[0]);
}

export async function createOrUpdateReviewConfig(data: {
  organizationId: number;
  reviewPeriodDays: number;
  alertDaysBefore: number;
  sendEmailAlerts: boolean;
  defaultReviewerId?: number;
  isActive: boolean;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Verificar se já existe configuração
  const existing = await getReviewConfig(data.organizationId);

  if (existing) {
    // Atualizar
    await db.execute(sql`
      UPDATE mapeamento_review_config SET
        "reviewPeriodDays" = ${data.reviewPeriodDays},
        "alertDaysBefore" = ${data.alertDaysBefore},
        "sendEmailAlerts" = ${data.sendEmailAlerts},
        "defaultReviewerId" = ${data.defaultReviewerId || null},
        "isActive" = ${data.isActive}
      WHERE "organizationId" = ${data.organizationId}
    `);
    return existing.id;
  }

  // Criar novo
  const result = await db.execute(sql`
    INSERT INTO mapeamento_review_config (
      "organizationId", "reviewPeriodDays", "alertDaysBefore",
      "sendEmailAlerts", "defaultReviewerId", "isActive"
    ) VALUES (
      ${data.organizationId}, ${data.reviewPeriodDays}, ${data.alertDaysBefore},
      ${data.sendEmailAlerts}, ${data.defaultReviewerId || null}, ${data.isActive}
    ) RETURNING id
  `);

  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
}

function mapConfigFromDb(row: any): ReviewConfig {
  return {
    id: row.id,
    organizationId: row.organizationId,
    reviewPeriodDays: row.reviewPeriodDays,
    alertDaysBefore: row.alertDaysBefore,
    sendEmailAlerts: !!row.sendEmailAlerts,
    defaultReviewerId: row.defaultReviewerId,
    isActive: !!row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

// ============================================
// AGENDAMENTO DE REVISÕES
// ============================================

export async function getReviewSchedules(
  organizationId: number,
  status?: string
): Promise<ReviewSchedule[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  let query = sql`
    SELECT 
      s.*,
      r.title as mapeamento_title,
      u.name as reviewer_name,
      o.name as organization_name
    FROM mapeamento_review_schedule s
    LEFT JOIN rot_operations r ON s."mapeamentoType" = 'rot' AND s."mapeamentoId" = r.id
    LEFT JOIN users u ON s."reviewerId" = u.id
    LEFT JOIN organizations o ON s."organizationId" = o.id
    WHERE s."organizationId" = ${organizationId}
  `;

  if (status) {
    query = sql`${query} AND s.status = ${status}`;
  }

  query = sql`${query} ORDER BY s."nextReviewDate" ASC`;

  const results = await db.execute(query);
  return ((results as any).rows as any[]).map(mapScheduleFromDb);
}

export async function getPendingReviews(organizationId?: number): Promise<ReviewSchedule[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const today = new Date().toISOString().split('T')[0];
  
  let query = sql`
    SELECT 
      s.*,
      r.title as mapeamento_title,
      u.name as reviewer_name,
      o.name as organization_name
    FROM mapeamento_review_schedule s
    LEFT JOIN rot_operations r ON s."mapeamentoType" = 'rot' AND s."mapeamentoId" = r.id
    LEFT JOIN users u ON s."reviewerId" = u.id
    LEFT JOIN organizations o ON s."organizationId" = o.id
    WHERE s.status IN ('pending', 'overdue')
    AND s."nextReviewDate" <= ${today}
  `;

  if (organizationId) {
    query = sql`${query} AND s."organizationId" = ${organizationId}`;
  }

  query = sql`${query} ORDER BY s."nextReviewDate" ASC`;

  const results = await db.execute(query);
  return ((results as any).rows as any[]).map(mapScheduleFromDb);
}

export async function getUpcomingReviews(
  organizationId: number,
  daysAhead: number = 30
): Promise<ReviewSchedule[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const today = new Date();
  const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  
  const results = await db.execute(sql`
    SELECT 
      s.*,
      r.title as mapeamento_title,
      u.name as reviewer_name,
      o.name as organization_name
    FROM mapeamento_review_schedule s
    LEFT JOIN rot_operations r ON s."mapeamentoType" = 'rot' AND s."mapeamentoId" = r.id
    LEFT JOIN users u ON s."reviewerId" = u.id
    LEFT JOIN organizations o ON s."organizationId" = o.id
    WHERE s."organizationId" = ${organizationId}
    AND s.status = 'scheduled'
    AND s."nextReviewDate" BETWEEN ${today.toISOString().split('T')[0]} AND ${futureDate.toISOString().split('T')[0]}
    ORDER BY s."nextReviewDate" ASC
  `);

  return ((results as any).rows as any[]).map(mapScheduleFromDb);
}

export async function createReviewSchedule(data: {
  organizationId: number;
  mapeamentoType: 'rot' | 'processo' | 'area';
  mapeamentoId: number;
  nextReviewDate: string;
  reviewerId?: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const result = await db.execute(sql`
    INSERT INTO mapeamento_review_schedule (
      "organizationId", "mapeamentoType", "mapeamentoId",
      "nextReviewDate", "reviewerId", status
    ) VALUES (
      ${data.organizationId}, ${data.mapeamentoType}, ${data.mapeamentoId},
      ${data.nextReviewDate}, ${data.reviewerId || null}, 'scheduled'
    ) RETURNING id
  `);

  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
}

export async function scheduleReviewForRot(
  rotId: number,
  organizationId: number
): Promise<number | null> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Buscar configuração da organização
  const config = await getReviewConfig(organizationId);
  if (!config || !config.isActive) return null;

  // Calcular próxima data de revisão
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + config.reviewPeriodDays);

  // Verificar se já existe agendamento para este ROT
  const existing = await db.execute(sql`
    SELECT id FROM mapeamento_review_schedule
    WHERE "mapeamentoType" = 'rot' AND "mapeamentoId" = ${rotId}
    AND status NOT IN ('completed', 'skipped')
  `);

  if (((existing as any).rows as any[]).length > 0) {
    return null; // Já existe agendamento ativo
  }

  return createReviewSchedule({
    organizationId,
    mapeamentoType: 'rot',
    mapeamentoId: rotId,
    nextReviewDate: nextReviewDate.toISOString().split('T')[0],
    reviewerId: config.defaultReviewerId || undefined
  });
}

export async function updateScheduleStatus(
  scheduleId: number,
  status: 'scheduled' | 'pending' | 'overdue' | 'completed' | 'skipped'
): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  await db.execute(sql`
    UPDATE mapeamento_review_schedule
    SET status = ${status}
    WHERE id = ${scheduleId}
  `);
}

function mapScheduleFromDb(row: any): ReviewSchedule {
  return {
    id: row.id,
    organizationId: row.organizationId,
    mapeamentoType: row.mapeamentoType,
    mapeamentoId: row.mapeamentoId,
    lastReviewDate: row.lastReviewDate,
    nextReviewDate: row.nextReviewDate,
    status: row.status,
    reviewerId: row.reviewerId,
    alertsSent: row.alertsSent,
    lastAlertSentAt: row.lastAlertSentAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    mapeamentoTitle: row.mapeamento_title,
    reviewerName: row.reviewer_name,
    organizationName: row.organization_name
  };
}

// ============================================
// HISTÓRICO DE REVISÕES
// ============================================

export async function getReviewHistory(
  organizationId: number,
  mapeamentoType?: string,
  mapeamentoId?: number
): Promise<ReviewHistory[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  let query = sql`
    SELECT 
      h.*,
      u.name as reviewer_name
    FROM mapeamento_review_history h
    LEFT JOIN users u ON h."reviewedById" = u.id
    WHERE h."organizationId" = ${organizationId}
  `;

  if (mapeamentoType && mapeamentoId) {
    query = sql`${query} AND h."mapeamentoType" = ${mapeamentoType} AND h."mapeamentoId" = ${mapeamentoId}`;
  }

  query = sql`${query} ORDER BY h."reviewedAt" DESC`;

  const results = await db.execute(query);
  return ((results as any).rows as any[]).map(mapHistoryFromDb);
}

export async function completeReview(data: {
  scheduleId: number;
  organizationId: number;
  mapeamentoType: 'rot' | 'processo' | 'area';
  mapeamentoId: number;
  reviewedById: number;
  reviewResult: 'approved' | 'updated' | 'archived' | 'flagged';
  notes?: string;
  changesDescription?: string;
  previousState?: any;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Criar registro no histórico
  const result = await db.execute(sql`
    INSERT INTO mapeamento_review_history (
      "scheduleId", "organizationId", "mapeamentoType", "mapeamentoId",
      "reviewedById", "reviewedAt", "reviewResult", notes, "changesDescription", "previousState"
    ) VALUES (
      ${data.scheduleId}, ${data.organizationId}, ${data.mapeamentoType}, ${data.mapeamentoId},
      ${data.reviewedById}, NOW(), ${data.reviewResult}, ${data.notes || null},
      ${data.changesDescription || null}, ${data.previousState ? JSON.stringify(data.previousState) : null}
    ) RETURNING id
  `);

  // Atualizar o agendamento
  const config = await getReviewConfig(data.organizationId);
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + (config?.reviewPeriodDays || 365));

  await db.execute(sql`
    UPDATE mapeamento_review_schedule SET
      status = 'completed',
      "lastReviewDate" = NOW(),
      "nextReviewDate" = ${nextReviewDate.toISOString().split('T')[0]},
      "alertsSent" = 0
    WHERE id = ${data.scheduleId}
  `);

  // Criar novo agendamento para próxima revisão
  if (data.reviewResult !== 'archived') {
    await db.execute(sql`
      UPDATE mapeamento_review_schedule SET
        status = 'scheduled'
      WHERE id = ${data.scheduleId}
    `);
  }

  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
}

function mapHistoryFromDb(row: any): ReviewHistory {
  return {
    id: row.id,
    scheduleId: row.scheduleId,
    organizationId: row.organizationId,
    mapeamentoType: row.mapeamentoType,
    mapeamentoId: row.mapeamentoId,
    reviewedById: row.reviewedById,
    reviewedAt: row.reviewedAt,
    reviewResult: row.reviewResult,
    notes: row.notes,
    changesDescription: row.changesDescription,
    previousState: row.previousState,
    createdAt: row.createdAt,
    reviewerName: row.reviewer_name
  };
}

// ============================================
// PROCESSAMENTO DE ALERTAS
// ============================================

export async function processReviewAlerts(): Promise<{
  processed: number;
  alertsSent: number;
  errors: string[];
}> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const today = new Date();
  let processed = 0;
  let alertsSent = 0;
  const errors: string[] = [];

  // Buscar todas as configurações ativas
  const configs = await db.execute(sql`
    SELECT * FROM mapeamento_review_config WHERE "isActive" = true
  `);

  for (const config of (configs as any).rows as any[]) {
    try {
      // Calcular data de alerta
      const alertDate = new Date(today);
      alertDate.setDate(alertDate.getDate() + config.alertDaysBefore);

      // Buscar agendamentos que precisam de alerta
      const schedules = await db.execute(sql`
        SELECT s.*, r.title as mapeamento_title, o.name as org_name
        FROM mapeamento_review_schedule s
        LEFT JOIN rot_operations r ON s."mapeamentoType" = 'rot' AND s."mapeamentoId" = r.id
        LEFT JOIN organizations o ON s."organizationId" = o.id
        WHERE s."organizationId" = ${config.organizationId}
        AND s.status = 'scheduled'
        AND s."nextReviewDate" <= ${alertDate.toISOString().split('T')[0]}
        AND (s."lastAlertSentAt" IS NULL OR DATE(s."lastAlertSentAt") < ${today.toISOString().split('T')[0]})
      `);

      for (const schedule of (schedules as any).rows as any[]) {
        processed++;

        // Atualizar status se vencido
        const nextReviewDate = new Date(schedule.nextReviewDate);
        if (nextReviewDate < today) {
          await db.execute(sql`
            UPDATE mapeamento_review_schedule
            SET status = 'overdue'
            WHERE id = ${schedule.id}
          `);
        } else {
          await db.execute(sql`
            UPDATE mapeamento_review_schedule
            SET status = 'pending'
            WHERE id = ${schedule.id}
          `);
        }

        // Enviar alerta por e-mail se configurado
        if (config.sendEmailAlerts && schedule.reviewerId) {
          try {
            const [reviewer] = await db
              .select()
              .from(users)
              .where(eq(users.id, schedule.reviewerId));

            if (reviewer?.email) {
              const daysUntilDue = Math.ceil((nextReviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const isOverdue = daysUntilDue < 0;

              // Usar notifyOwner para enviar alerta (simplificado)
              const { notifyOwner } = await import('./_core/notification');
              await notifyOwner({
                title: isOverdue 
                  ? `[URGENTE] Revisão de mapeamento vencida - ${schedule.mapeamento_title}`
                  : `Lembrete: Revisão de mapeamento em ${daysUntilDue} dias`,
                content: `Mapeamento: ${schedule.mapeamento_title}\nOrganização: ${schedule.org_name}\nData de Revisão: ${new Date(schedule.nextReviewDate).toLocaleDateString('pt-BR')}\nResponsável: ${reviewer.name || 'Não definido'}`
              });

              alertsSent++;
            }
          } catch (emailError) {
            errors.push(`Erro ao enviar e-mail para schedule ${schedule.id}: ${emailError}`);
          }
        }

        // Atualizar contador de alertas
        await db.execute(sql`
          UPDATE mapeamento_review_schedule
          SET "alertsSent" = "alertsSent" + 1, "lastAlertSentAt" = NOW()
          WHERE id = ${schedule.id}
        `);
      }
    } catch (configError) {
      errors.push(`Erro ao processar config ${config.id}: ${configError}`);
    }
  }

  return { processed, alertsSent, errors };
}

function generateReviewAlertEmail(data: {
  reviewerName: string;
  mapeamentoTitle: string;
  organizationName: string;
  dueDate: string;
  isOverdue: boolean;
  daysUntilDue: number;
}): string {
  const urgencyColor = data.isOverdue ? '#DC2626' : '#F59E0B';
  const statusText = data.isOverdue 
    ? `VENCIDA há ${data.daysUntilDue} dias`
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
    .alert-badge { display: inline-block; background: ${urgencyColor}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin-bottom: 20px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6B21A8; }
    .footer { text-align: center; color: #9CA3AF; font-size: 12px; margin-top: 20px; }
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
      
      <p>Olá, <strong>${data.reviewerName}</strong>!</p>
      
      <p>Este é um lembrete sobre a revisão periódica de um mapeamento de dados pessoais.</p>
      
      <div class="info-box">
        <p><strong>Mapeamento:</strong> ${data.mapeamentoTitle}</p>
        <p><strong>Organização:</strong> ${data.organizationName}</p>
        <p><strong>Data de Revisão:</strong> ${new Date(data.dueDate).toLocaleDateString('pt-BR')}</p>
      </div>
      
      <p>Por favor, acesse o sistema para realizar a revisão do mapeamento e garantir que as informações estejam atualizadas.</p>
      
      <p style="margin-top: 30px;">Atenciosamente,<br><strong>Equipe Seusdados</strong></p>
    </div>
    <div class="footer">
      <p>Este é um e-mail automático do sistema Seusdados Due Diligence.</p>
      <p>© ${new Date().getFullYear()} Seusdados Consultoria</p>
    </div>
  </div>
</body>
</html>
  `;
}

// ============================================
// ESTATÍSTICAS
// ============================================

export async function getReviewStats(organizationId: number): Promise<{
  totalScheduled: number;
  pending: number;
  overdue: number;
  completedThisMonth: number;
  avgReviewTime: number;
}> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);

  // Contagens de status
  const statusCounts = await db.execute(sql`
    SELECT 
      status,
      COUNT(*) as count
    FROM mapeamento_review_schedule
    WHERE "organizationId" = ${organizationId}
    GROUP BY status
  `);

  const counts: Record<string, number> = {};
  for (const row of (statusCounts as any).rows as any[]) {
    counts[row.status] = row.count;
  }

  // Revisões completadas este mês
  const completedThisMonth = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM mapeamento_review_history
    WHERE "organizationId" = ${organizationId}
    AND "reviewedAt" >= ${firstDayOfMonth.toISOString()}
  `);

  return {
    totalScheduled: (counts['scheduled'] || 0) + (counts['pending'] || 0) + (counts['overdue'] || 0),
    pending: counts['pending'] || 0,
    overdue: counts['overdue'] || 0,
    completedThisMonth: ((completedThisMonth as any).rows as any[])[0]?.count || 0,
    avgReviewTime: 0 // Pode ser calculado com base no histórico
  };
}
