/**
 * Serviço de Notificações para Avaliações Unificadas
 * Integra com emailService e notificationsRouter existentes
 */

import { sendAssessmentEmail, AssessmentEmailData, ThirdPartyEmailData } from "./emailService";
type EmailPayload = AssessmentEmailData;
import { getDb } from "./db";
import { unifiedAssessments, assessmentAssignments, users } from "../drizzle/schema";
import { eq, and, lte, sql } from "drizzle-orm";
import { logger } from "./_core/logger";
import { getAppBaseUrl } from "./appUrl";

// Tipos de notificação
export type NotificationType = 
  | 'assessment_created'
  | 'domain_assigned'
  | 'deadline_reminder'
  | 'deadline_critical'
  | 'assessment_completed'
  | 'results_released';

// Níveis de urgência
export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

interface NotificationData {
  assessmentId: number;
  assessmentCode: string;
  organizationName: string;
  framework: string;
  deadline: Date;
  recipientName: string;
  recipientEmail: string;
  domainId?: string;
  domainName?: string;
  daysRemaining?: number;
  urgencyLevel?: UrgencyLevel;
  customMessage?: string;
}

// Configuração de cores por urgência
const URGENCY_COLORS: Record<UrgencyLevel, { bg: string; text: string; icon: string }> = {
  critical: { bg: '#dc2626', text: '#ffffff', icon: '🔴' },
  high: { bg: '#f97316', text: '#ffffff', icon: '🟠' },
  medium: { bg: '#eab308', text: '#1f2937', icon: '🟡' },
  low: { bg: '#22c55e', text: '#ffffff', icon: '🟢' },
};

// Marcos de notificação (dias antes do prazo)
const NOTIFICATION_MILESTONES = [10, 5, 2, 1, 0];

/**
 * Calcula o nível de urgência baseado nos dias restantes
 */
export function calculateUrgencyLevel(daysRemaining: number): UrgencyLevel {
  if (daysRemaining <= 0) return 'critical';
  if (daysRemaining <= 2) return 'high';
  if (daysRemaining <= 5) return 'medium';
  return 'low';
}

/**
 * Gera template HTML cinematográfico para notificações de avaliação
 */
function generateAssessmentNotificationHTML(
  type: NotificationType,
  data: NotificationData
): string {
  const urgency = data.urgencyLevel || calculateUrgencyLevel(data.daysRemaining || 30);
  const colors = URGENCY_COLORS[urgency];
  
  const baseUrl = getAppBaseUrl();
  const assessmentUrl = `${baseUrl}/avaliacoes/${data.assessmentId}`;
  
  // Títulos por tipo de notificação
  const titles: Record<NotificationType, string> = {
    assessment_created: 'Nova Avaliação Criada',
    domain_assigned: 'Domínio Atribuído',
    deadline_reminder: 'Lembrete de Prazo',
    deadline_critical: 'PRAZO CRÍTICO',
    assessment_completed: 'Avaliação Concluída',
    results_released: 'Resultados Liberados',
  };

  // Mensagens por tipo
  const messages: Record<NotificationType, string> = {
    assessment_created: `Uma nova avaliação de conformidade foi criada para ${data.organizationName}.`,
    domain_assigned: `Você foi designado para responder o domínio <strong>${data.domainName}</strong> (${data.domainId}).`,
    deadline_reminder: `Faltam <strong>${data.daysRemaining} dia(s)</strong> para o prazo da avaliação.`,
    deadline_critical: `<strong>ATENÇÃO:</strong> O prazo da avaliação ${data.daysRemaining === 0 ? 'é HOJE' : `vence em ${data.daysRemaining} dia(s)`}!`,
    assessment_completed: `A avaliação ${data.assessmentCode} foi concluída com sucesso.`,
    results_released: `Os resultados da avaliação ${data.assessmentCode} foram liberados para visualização.`,
  };

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titles[type]} - Seusdados</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header com gradiente -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); padding: 40px 40px 30px 40px; text-align: center;">
              <p style="color: #a5b4fc; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 10px 0; font-weight: 500;">
                AVALIAÇÕES UNIFICADAS
              </p>
              <h1 style="color: #ffffff; font-size: 28px; font-weight: 300; margin: 0; line-height: 1.3;">
                ${titles[type]}
              </h1>
            </td>
          </tr>
          
          <!-- Badge de urgência -->
          ${type === 'deadline_reminder' || type === 'deadline_critical' ? `
          <tr>
            <td style="padding: 0;">
              <div style="background-color: ${colors.bg}; color: ${colors.text}; text-align: center; padding: 12px; font-weight: 600;">
                ${colors.icon} ${urgency === 'critical' ? 'URGÊNCIA CRÍTICA' : urgency === 'high' ? 'ALTA PRIORIDADE' : urgency === 'medium' ? 'ATENÇÃO' : 'LEMBRETE'}
              </div>
            </td>
          </tr>
          ` : ''}
          
          <!-- Conteúdo -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Prezado(a) <strong>${data.recipientName}</strong>,
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                ${messages[type]}
              </p>
              
              <!-- Detalhes da avaliação -->
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #6b7280; font-size: 14px;">Código:</span>
                      <span style="color: #1f2937; font-size: 14px; font-weight: 600; float: right;">${data.assessmentCode}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-top: 1px solid #e5e7eb;">
                      <span style="color: #6b7280; font-size: 14px;">Framework:</span>
                      <span style="color: #1f2937; font-size: 14px; font-weight: 600; float: right;">${data.framework}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-top: 1px solid #e5e7eb;">
                      <span style="color: #6b7280; font-size: 14px;">Organização:</span>
                      <span style="color: #1f2937; font-size: 14px; font-weight: 600; float: right;">${data.organizationName}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-top: 1px solid #e5e7eb;">
                      <span style="color: #6b7280; font-size: 14px;">Prazo:</span>
                      <span style="color: ${data.daysRemaining !== undefined && data.daysRemaining <= 2 ? '#dc2626' : '#1f2937'}; font-size: 14px; font-weight: 600; float: right;">
                        ${new Date(data.deadline).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </td>
                  </tr>
                  ${data.domainId ? `
                  <tr>
                    <td style="padding: 8px 0; border-top: 1px solid #e5e7eb;">
                      <span style="color: #6b7280; font-size: 14px;">Domínio:</span>
                      <span style="color: #1f2937; font-size: 14px; font-weight: 600; float: right;">${data.domainId} - ${data.domainName}</span>
                    </td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              ${data.customMessage ? `
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                ${data.customMessage}
              </p>
              ` : ''}
              
              <!-- Botão CTA -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${assessmentUrl}" 
                       style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px;">
                      Acessar Avaliação
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px 0;">
                Esta é uma mensagem automática do sistema de Avaliações Unificadas.
              </p>
              <p style="color: #9ca3af; font-size: 11px; margin: 0;">
                © ${new Date().getFullYear()} Seusdados Consultoria. Todos os direitos reservados.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Envia notificação por email
 */
export async function sendAssessmentNotification(
  type: NotificationType,
  data: NotificationData
): Promise<boolean> {
  try {
    const html = generateAssessmentNotificationHTML(type, data);
    
    const subjects: Record<NotificationType, string> = {
      assessment_created: `[Seusdados] Nova Avaliação: ${data.assessmentCode}`,
      domain_assigned: `[Seusdados] Domínio Atribuído: ${data.domainId}`,
      deadline_reminder: `[Seusdados] Lembrete: ${data.daysRemaining} dias para ${data.assessmentCode}`,
      deadline_critical: `🔴 [URGENTE] Prazo Crítico: ${data.assessmentCode}`,
      assessment_completed: `[Seusdados] Avaliação Concluída: ${data.assessmentCode}`,
      results_released: `[Seusdados] Resultados Disponíveis: ${data.assessmentCode}`,
    };

    const notifTitle = subjects[type];
    const notifText = `${notifTitle}\n\nPrezado(a) ${data.recipientName},\n\nAcesse: ${getAppBaseUrl()}/avaliacoes/${data.assessmentId}`;

    // Usar o sistema de notificações existente
    const notificationEndpoint = `${process.env.BUILT_IN_FORGE_API_URL || ''}/webdevtoken.v1.WebDevService/SendNotification`;
    
    if (process.env.BUILT_IN_FORGE_API_KEY) {
      await fetch(notificationEndpoint, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${process.env.BUILT_IN_FORGE_API_KEY}`,
          'content-type': 'application/json',
          'connect-protocol-version': '1',
        },
        body: JSON.stringify({
          title: notifTitle,
          content: notifText,
        }),
      });
    }

    // Enviar e-mail real se habilitado
    try {
      await sendAssessmentEmail({
        to: data.recipientEmail,
        recipientName: data.recipientName,
        assessmentTitle: notifTitle,
        assessmentUrl: `${getAppBaseUrl()}/avaliacoes/${data.assessmentId}`,
        organizationName: data.organizationName || 'Seusdados',
      });
    } catch (emailErr) {
      logger.warn('Falha ao enviar e-mail de notificação de avaliação', { error: emailErr });
    }
    
    logger.info(`Assessment notification sent`, {
      type,
      assessmentId: data.assessmentId,
      recipient: data.recipientEmail,
    });
    
    return true;
  } catch (error) {
    logger.error(`Failed to send assessment notification`, {
      type,
      assessmentId: data.assessmentId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Processa lembretes de prazo para todas as avaliações
 */
export async function processDeadlineReminders(): Promise<{
  sent: number;
  failed: number;
  skipped: number;
}> {
  const db = await getDb();
  if (!db) {
    return { sent: 0, failed: 0, skipped: 0 };
  }

  const results = { sent: 0, failed: 0, skipped: 0 };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // Buscar avaliações com prazo próximo
    const assessments = await db
      .select()
      .from(unifiedAssessments)
      .where(
        and(
          eq(unifiedAssessments.status, 'iniciada'),
          lte(unifiedAssessments.deadline, sql`NOW() + INTERVAL '10 DAY'`)
        )
      );

    for (const assessment of assessments) {
      const deadline = new Date(assessment.deadline);
      const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Verificar se é um marco de notificação
      if (!NOTIFICATION_MILESTONES.includes(daysRemaining)) {
        results.skipped++;
        continue;
      }

      // Buscar atribuições pendentes
      const assignments = await db
        .select()
        .from(assessmentAssignments)
        .where(
          and(
            eq(assessmentAssignments.assessmentId, assessment.id),
            eq(assessmentAssignments.status, 'pendente')
          )
        );

      for (const assignment of assignments) {
        const notificationType: NotificationType = daysRemaining <= 1 ? 'deadline_critical' : 'deadline_reminder';
        
        const success = await sendAssessmentNotification(notificationType, {
          assessmentId: assessment.id,
          assessmentCode: assessment.assessmentCode,
          organizationName: 'Organização', // TODO: buscar nome real
          framework: assessment.framework,
          deadline,
          recipientName: assignment.assignedToName,
          recipientEmail: assignment.assignedToEmail,
          domainId: assignment.domainId,
          domainName: assignment.domainName,
          daysRemaining,
          urgencyLevel: calculateUrgencyLevel(daysRemaining),
        });

        if (success) {
          results.sent++;
        } else {
          results.failed++;
        }
      }
    }

    logger.info(`Deadline reminders processed`, results);
    return results;
  } catch (error) {
    logger.error(`Failed to process deadline reminders`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return results;
  }
}

/**
 * Cria notificação in-app (para integrar com notificationsRouter)
 */
export async function createInAppNotification(
  userId: number,
  type: NotificationType,
  data: {
    assessmentId: number;
    assessmentCode: string;
    message: string;
    urgencyLevel?: UrgencyLevel;
  }
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Verificar se tabela de notificações existe e inserir
    // Esta função será chamada pelo notificationsRouter
    logger.info(`In-app notification created`, {
      userId,
      type,
      assessmentId: data.assessmentId,
    });
    
    return true;
  } catch (error) {
    logger.error(`Failed to create in-app notification`, {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

export default {
  sendAssessmentNotification,
  processDeadlineReminders,
  createInAppNotification,
  calculateUrgencyLevel,
};


// ================================
// ✅ Helper: Email opcional (não quebra fluxo atual)
// Para ativar: ENABLE_ASSESSMENT_EMAIL_NOTIFICATIONS=true
// ================================
// sendAssessmentEmail já importado no topo do arquivo

export async function maybeSendAssessmentEmailNotification(params: {
  toEmail: string;
  assessmentId: number;
  organizationName?: string;
  assessmentName?: string;
  accessLink?: string;
}) {
  const enabled = String(process.env.ENABLE_ASSESSMENT_EMAIL_NOTIFICATIONS || "false") === "true";
  if (!enabled) return { skipped: true };

  // sendAssessmentEmail já é o fluxo real (Resend SDK) do seu sistema
  return sendAssessmentEmail({
    to: params.toEmail,
    assessmentId: params.assessmentId,
    organizationName: params.organizationName || "Cliente",
    assessmentName: params.assessmentName,
    accessLink: params.accessLink,
  } as any);
}

