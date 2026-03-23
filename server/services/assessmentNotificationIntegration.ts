import { getAppBaseUrl } from "../appUrl";
/**
 * Serviço de Integração de Notificações de Avaliação
 * 
 * Este serviço integra as notificações de avaliação com:
 * - emailService para envio de emails com link direto
 * - notificationsRouter para notificações in-app
 */

import { getDb } from '../db';
import { notifications, unifiedAssessments, assessmentAssignments, users, organizations } from '../../drizzle/schema';
import { eq, and, lte, isNull, desc } from 'drizzle-orm';
import { sendAssessmentEmailLegacy, generateReminderEmailTemplate } from '../emailService';
import { notifyOwner } from '../_core/notification';
import { logger } from '../_core/logger';

// Tipos de notificação
export type NotificationType = 
  | 'assessment_created'
  | 'assessment_reminder'
  | 'assessment_deadline_critical'
  | 'assessment_completed'
  | 'assessment_released'
  | 'evidence_pending'
  | 'evidence_uploaded';

// Níveis de urgência
export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

interface NotificationPayload {
  type: NotificationType;
  urgency: UrgencyLevel;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

interface AssessmentNotificationData {
  assessmentId: number;
  assessmentCode: string;
  organizationId: number;
  organizationName: string;
  thirdPartyId?: number;
  thirdPartyName?: string;
  thirdPartyEmail?: string;
  respondentId?: number;
  respondentName?: string;
  respondentEmail?: string;
  deadline?: Date;
  daysRemaining?: number;
}

/**
 * Calcula o nível de urgência baseado nos dias restantes
 */
export function calculateUrgency(daysRemaining: number): UrgencyLevel {
  if (daysRemaining <= 1) return 'critical';
  if (daysRemaining <= 2) return 'high';
  if (daysRemaining <= 5) return 'medium';
  return 'low';
}

/**
 * Gera o link direto para a avaliação
 */
export function generateAssessmentLink(assessmentId: number, token?: string): string {
  const baseUrl = getAppBaseUrl();
  if (token) {
    return `${baseUrl}/assessment/${assessmentId}?token=${token}`;
  }
  return `${baseUrl}/avaliacoes/${assessmentId}`;
}

/**
 * Cria uma notificação in-app no banco de dados
 */
export async function createInAppNotification(
  userId: number,
  payload: NotificationPayload
): Promise<{ success: boolean; notificationId?: number }> {
  try {
    const db = await getDb();
    
    // Mapear urgência para prioridade numérica
    const priorityMap: Record<UrgencyLevel, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    
    const result = await db.insert(notifications).values({
      userId,
      type: 'system' as const,
      title: payload.title,
      message: payload.message,
      link: payload.link || null,
      isRead: 0,
      notificationType: payload.type,
      entityType: 'assessment',
      createdAt: new Date().toISOString(),
    }).returning({ id: notifications.id });
    
    const notificationId = result[0]?.id;
    
    logger.info('Notificação in-app criada', {
      userId,
      type: payload.type,
      urgency: payload.urgency,
    });
    
    return { success: true, notificationId };
  } catch (error) {
    logger.error('Erro ao criar notificação in-app', error as Error);
    return { success: false };
  }
}

/**
 * Envia notificação de criação de avaliação
 */
export async function notifyAssessmentCreated(data: AssessmentNotificationData): Promise<void> {
  const link = generateAssessmentLink(data.assessmentId);
  
  // Notificação in-app para o respondente
  if (data.respondentId) {
    await createInAppNotification(data.respondentId, {
      type: 'assessment_created',
      urgency: 'medium',
      title: '📋 Nova Avaliação Atribuída',
      message: `Você foi designado para responder a avaliação ${data.assessmentCode} da organização ${data.organizationName}.`,
      link,
      metadata: {
        assessmentId: data.assessmentId,
        assessmentCode: data.assessmentCode,
        organizationId: data.organizationId,
      },
    });
  }
  
  // Email para terceiro (se aplicável)
  if (data.thirdPartyEmail && data.thirdPartyName) {
    await sendAssessmentEmailLegacy({
      thirdPartyName: data.thirdPartyName,
      thirdPartyEmail: data.thirdPartyEmail,
      organizationName: data.organizationName,
      assessmentLink: link,
      expiresAt: data.deadline,
    });
  }
  
  // Notificar owner sobre nova avaliação
  await notifyOwner({
    title: `📋 Nova Avaliação Criada - ${data.assessmentCode}`,
    content: `Uma nova avaliação foi criada para ${data.thirdPartyName || data.respondentName || 'N/A'} na organização ${data.organizationName}.`,
  });
}

/**
 * Envia lembrete de prazo de avaliação
 */
export async function notifyAssessmentReminder(data: AssessmentNotificationData): Promise<void> {
  if (!data.daysRemaining) return;
  
  const urgency = calculateUrgency(data.daysRemaining);
  const link = generateAssessmentLink(data.assessmentId);
  
  // Emojis baseados na urgência
  const urgencyEmoji: Record<UrgencyLevel, string> = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
  };
  
  const emoji = urgencyEmoji[urgency];
  
  // Notificação in-app
  if (data.respondentId) {
    await createInAppNotification(data.respondentId, {
      type: data.daysRemaining <= 1 ? 'assessment_deadline_critical' : 'assessment_reminder',
      urgency,
      title: `${emoji} Prazo de Avaliação - ${data.daysRemaining} dia(s)`,
      message: `A avaliação ${data.assessmentCode} vence em ${data.daysRemaining} dia(s). Complete o questionário para evitar atrasos.`,
      link,
      metadata: {
        assessmentId: data.assessmentId,
        daysRemaining: data.daysRemaining,
      },
    });
  }
  
  // Email de lembrete para terceiro
  if (data.thirdPartyEmail && data.thirdPartyName) {
    const { html, text } = generateReminderEmailTemplate({
      thirdPartyName: data.thirdPartyName,
      thirdPartyEmail: data.thirdPartyEmail,
      organizationName: data.organizationName,
      assessmentLink: link,
      daysRemaining: data.daysRemaining,
    });
    
    // Notificar owner sobre lembrete enviado
    await notifyOwner({
      title: `${emoji} Lembrete Enviado - ${data.assessmentCode}`,
      content: `Lembrete de prazo enviado para ${data.thirdPartyName} (${data.thirdPartyEmail}). Prazo: ${data.daysRemaining} dia(s).`,
    });
  }
}

/**
 * Notifica sobre conclusão de avaliação
 */
export async function notifyAssessmentCompleted(data: AssessmentNotificationData): Promise<void> {
  const link = generateAssessmentLink(data.assessmentId);
  
  // Notificar owner
  await notifyOwner({
    title: `✅ Avaliação Concluída - ${data.assessmentCode}`,
    content: `A avaliação ${data.assessmentCode} foi concluída por ${data.respondentName || data.thirdPartyName || 'N/A'}. Acesse o painel do consultor para revisar os resultados.`,
  });
}

/**
 * Notifica sobre liberação de resultados
 */
export async function notifyResultsReleased(
  data: AssessmentNotificationData,
  recipientIds: number[]
): Promise<void> {
  const link = generateAssessmentLink(data.assessmentId);
  
  // Notificação in-app para cada destinatário
  for (const userId of recipientIds) {
    await createInAppNotification(userId, {
      type: 'assessment_released',
      urgency: 'medium',
      title: '📊 Resultados de Avaliação Liberados',
      message: `Os resultados da avaliação ${data.assessmentCode} foram liberados. Clique para visualizar o relatório completo.`,
      link: `${link}/resultados`,
      metadata: {
        assessmentId: data.assessmentId,
        assessmentCode: data.assessmentCode,
      },
    });
  }
  
  // Notificar owner
  await notifyOwner({
    title: `📊 Resultados Liberados - ${data.assessmentCode}`,
    content: `Os resultados da avaliação ${data.assessmentCode} foram liberados para ${recipientIds.length} destinatário(s).`,
  });
}

/**
 * Notifica sobre evidência pendente
 */
export async function notifyEvidencePending(
  data: AssessmentNotificationData,
  questionId: string,
  questionText: string
): Promise<void> {
  const link = generateAssessmentLink(data.assessmentId);
  
  if (data.respondentId) {
    await createInAppNotification(data.respondentId, {
      type: 'evidence_pending',
      urgency: 'high',
      title: '📎 Evidência Pendente',
      message: `A questão "${questionText}" requer uma evidência que ainda não foi anexada na avaliação ${data.assessmentCode}.`,
      link: `${link}?question=${questionId}`,
      metadata: {
        assessmentId: data.assessmentId,
        questionId,
      },
    });
  }
}

/**
 * Notifica sobre evidência enviada
 */
export async function notifyEvidenceUploaded(
  data: AssessmentNotificationData,
  evidenceType: 'pdf' | 'link',
  fileName?: string
): Promise<void> {
  // Notificar owner sobre nova evidência
  await notifyOwner({
    title: `📄 Nova Evidência - ${data.assessmentCode}`,
    content: `Uma nova evidência (${evidenceType.toUpperCase()}${fileName ? `: ${fileName}` : ''}) foi enviada para a avaliação ${data.assessmentCode}.`,
  });
}

/**
 * Processa lembretes de prazo em lote
 * Deve ser executado diariamente via cron job
 */
export async function processDeadlineReminders(): Promise<{
  processed: number;
  notified: number;
  errors: number;
}> {
  const db = await getDb();
  const now = new Date();
  const stats = { processed: 0, notified: 0, errors: 0 };
  
  try {
    // Buscar avaliações com prazo próximo
    const assessments = await db
      .select({
        id: unifiedAssessments.id,
        code: unifiedAssessments.assessmentCode,
        organizationId: unifiedAssessments.organizationId,
        deadline: unifiedAssessments.deadline,
        status: unifiedAssessments.status,
      })
      .from(unifiedAssessments)
      .where(
        and(
          eq(unifiedAssessments.status, 'iniciada'),
          lte(unifiedAssessments.deadline, new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString())
        )
      );
    
    for (const assessment of assessments) {
      stats.processed++;
      
      try {
        const deadline = new Date(assessment.deadline);
        const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Verificar se deve enviar lembrete (10, 5, 2, 1, 0 dias)
        const reminderDays = [10, 5, 2, 1, 0];
        if (!reminderDays.includes(daysRemaining)) continue;
        
        // Buscar organização
        const [org] = await db
          .select({ name: organizations.name })
          .from(organizations)
          .where(eq(organizations.id, assessment.organizationId))
          .limit(1);
        
        // Buscar atribuições
        const assignments = await db
          .select({
            respondentId: assessmentAssignments.assignedToUserId,
          })
          .from(assessmentAssignments)
          .where(eq(assessmentAssignments.assessmentId, assessment.id));
        
        for (const assignment of assignments) {
          // Buscar dados do respondente
          const [respondent] = await db
            .select({ name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, assignment.respondentId))
            .limit(1);
          
          await notifyAssessmentReminder({
            assessmentId: assessment.id,
            assessmentCode: assessment.code,
            organizationId: assessment.organizationId,
            organizationName: org?.name || 'N/A',
            respondentId: assignment.respondentId,
            respondentName: respondent?.name,
            respondentEmail: respondent?.email,
            deadline,
            daysRemaining,
          });
          
          stats.notified++;
        }
      } catch (error) {
        logger.error('Erro ao processar lembrete de avaliação', error as Error, {
          assessmentId: assessment.id,
        });
        stats.errors++;
      }
    }
    
    logger.info('Processamento de lembretes concluído', stats);
    return stats;
  } catch (error) {
    logger.error('Erro ao processar lembretes em lote', error as Error);
    throw error;
  }
}

export default {
  calculateUrgency,
  generateAssessmentLink,
  createInAppNotification,
  notifyAssessmentCreated,
  notifyAssessmentReminder,
  notifyAssessmentCompleted,
  notifyResultsReleased,
  notifyEvidencePending,
  notifyEvidenceUploaded,
  processDeadlineReminders,
};
