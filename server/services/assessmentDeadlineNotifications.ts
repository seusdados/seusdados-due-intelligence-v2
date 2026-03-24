/**
 * Serviço de Notificações de Prazo para Avaliações de Conformidade
 * 
 * Envia alertas automáticos quando prazos de avaliação estão próximos:
 * - 10 dias antes: Lembrete inicial (verde)
 * - 5 dias antes: Atenção (amarelo)
 * - 2 dias antes: Urgente (laranja)
 * - 1 dia antes: Crítico (vermelho)
 */

import { getDb } from '../db';
import { unifiedAssessments, assessmentAssignments, users } from '../../drizzle/schema';
import { eq, and, lt, gt, sql, inArray } from 'drizzle-orm';
import { notifyOwner } from '../_core/notification';
import { logger } from '../_core/logger';

interface DeadlineAlert {
  assessmentId: number;
  assessmentCode: string;
  daysRemaining: number;
  urgencyLevel: 'lembrete' | 'atencao' | 'urgente' | 'critico';
  urgencyColor: string;
  urgencyEmoji: string;
  dueDate: Date;
  assignedUsers: Array<{
    userId: number;
    userName: string;
    userEmail: string;
    domainId: string;
  }>;
}

/**
 * Calcula o nível de urgência baseado nos dias restantes
 */
function getUrgencyLevel(daysRemaining: number): { level: DeadlineAlert['urgencyLevel']; color: string; emoji: string } {
  if (daysRemaining <= 1) {
    return { level: 'critico', color: '#dc2626', emoji: '🔴' };
  } else if (daysRemaining <= 2) {
    return { level: 'urgente', color: '#ea580c', emoji: '🟠' };
  } else if (daysRemaining <= 5) {
    return { level: 'atencao', color: '#ca8a04', emoji: '🟡' };
  } else {
    return { level: 'lembrete', color: '#16a34a', emoji: '🟢' };
  }
}

/**
 * Gera template HTML cinematográfico para notificação de prazo
 */
function generateDeadlineEmailTemplate(alert: DeadlineAlert): { html: string; text: string } {
  const urgencyLabels = {
    critico: 'CRÍTICO - PRAZO FINAL',
    urgente: 'URGENTE - AÇÃO IMEDIATA',
    atencao: 'ATENÇÃO - PRAZO PRÓXIMO',
    lembrete: 'LEMBRETE - AVALIAÇÃO PENDENTE',
  };

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerta de Prazo - Avaliação ${alert.assessmentCode}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header com cor de urgência -->
          <tr>
            <td style="background: ${alert.urgencyColor}; padding: 30px 40px; text-align: center;">
              <p style="color: rgba(255,255,255,0.8); font-size: 14px; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 10px 0;">
                ${alert.urgencyEmoji} ${urgencyLabels[alert.urgencyLevel]}
              </p>
              <h1 style="color: #ffffff; font-size: 28px; font-weight: 600; margin: 0;">
                ${alert.daysRemaining === 1 ? 'Último dia!' : `${alert.daysRemaining} dias restantes`}
              </h1>
            </td>
          </tr>
          
          <!-- Informações da Avaliação -->
          <tr>
            <td style="padding: 40px;">
              <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="50%">
                      <p style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px 0;">Código</p>
                      <p style="color: #1e293b; font-size: 18px; font-weight: 600; margin: 0;">${alert.assessmentCode}</p>
                    </td>
                    <td width="50%" align="right">
                      <p style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px 0;">Prazo</p>
                      <p style="color: #1e293b; font-size: 18px; font-weight: 600; margin: 0;">${alert.dueDate.toLocaleDateString('pt-BR')}</p>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Respondentes Pendentes -->
              <h3 style="color: #1e293b; font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">
                Respondentes Pendentes (${alert.assignedUsers.length})
              </h3>
              
              ${alert.assignedUsers.map(user => `
                <div style="display: flex; align-items: center; padding: 12px; background: #fef3c7; border-radius: 8px; margin-bottom: 8px;">
                  <div style="width: 40px; height: 40px; background: ${alert.urgencyColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                    <span style="color: white; font-weight: 600;">${user.userName.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p style="color: #1e293b; font-size: 14px; font-weight: 500; margin: 0;">${user.userName}</p>
                    <p style="color: #64748b; font-size: 12px; margin: 0;">${user.userEmail} • ${user.domainId}</p>
                  </div>
                </div>
              `).join('')}
              
              <!-- Call to Action -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <a href="https://dll.seusdados.com/avaliacoes" 
                       style="display: inline-block; background: ${alert.urgencyColor}; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Acessar Avaliações
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #1e293b; padding: 20px 40px; text-align: center;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                Seusdados Due Diligence • Notificação Automática de Prazo
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
${alert.urgencyEmoji} ${urgencyLabels[alert.urgencyLevel]}

Avaliação: ${alert.assessmentCode}
Prazo: ${alert.dueDate.toLocaleDateString('pt-BR')}
Dias restantes: ${alert.daysRemaining}

Respondentes Pendentes:
${alert.assignedUsers.map(u => `- ${u.userName} (${u.userEmail}) - ${u.domainId}`).join('\n')}

Acesse: https://dll.seusdados.com/avaliacoes

---
Seusdados Due Diligence
  `.trim();

  return { html, text };
}

/**
 * Busca avaliações com prazos próximos (10, 5, 2, 1 dias)
 */
export async function getUpcomingDeadlines(): Promise<DeadlineAlert[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const now = new Date();
    const tenDaysFromNow = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

    // Buscar avaliações com prazo nos próximos 10 dias
    const assessments = await db
      .select({
        id: unifiedAssessments.id,
        assessmentCode: unifiedAssessments.assessmentCode,
        dueDate: unifiedAssessments.deadline,
        status: unifiedAssessments.status,
      })
      .from(unifiedAssessments)
      .where(
        and(
          inArray(unifiedAssessments.status, ['programada', 'iniciada']),
          gt(unifiedAssessments.deadline, now.toISOString()),
          lt(unifiedAssessments.deadline, tenDaysFromNow.toISOString())
        )
      );

    const alerts: DeadlineAlert[] = [];

    for (const assessment of assessments) {
      const dueDate = new Date(assessment.dueDate);
      const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      // Só alertar em marcos específicos: 10, 5, 2, 1 dias
      if (![10, 5, 2, 1].includes(daysRemaining)) continue;

      // Buscar usuários atribuídos que ainda não completaram
      const assignments = await db
        .select({
          userId: assessmentAssignments.assignedToUserId,
          domainId: assessmentAssignments.domainId,
          status: assessmentAssignments.status,
        })
        .from(assessmentAssignments)
        .where(
          and(
            eq(assessmentAssignments.assessmentId, assessment.id),
            inArray(assessmentAssignments.status, ['pendente', 'em_andamento'])
          )
        );

      if (assignments.length === 0) continue;

      // Buscar informações dos usuários
      const userIds = assignments.map(a => a.userId).filter(Boolean) as number[];
      const usersData = userIds.length > 0 
        ? await db.select().from(users).where(inArray(users.id, userIds))
        : [];

      const assignedUsers = assignments.map(a => {
        const user = usersData.find(u => u.id === a.userId);
        return {
          userId: a.userId || 0,
          userName: user?.name || 'Usuário',
          userEmail: user?.email || '',
          domainId: a.domainId,
        };
      });

      const { level, color, emoji } = getUrgencyLevel(daysRemaining);

      alerts.push({
        assessmentId: assessment.id,
        assessmentCode: assessment.assessmentCode,
        daysRemaining,
        urgencyLevel: level,
        urgencyColor: color,
        urgencyEmoji: emoji,
        dueDate,
        assignedUsers,
      });
    }

    return alerts;
  } catch (error) {
    logger.error('Erro ao buscar prazos próximos', error as Error);
    return [];
  }
}

/**
 * Processa e envia notificações de prazo
 */
export async function processDeadlineNotifications(): Promise<{ sent: number; errors: number }> {
  // === BLOQUEADO DEFINITIVAMENTE ===
  // E-mails de alerta de prazo de avaliações desativados por solicitação.
  // Nenhum perfil deve receber e-mails de prazo/vencimento.
  logger.info('[AssessmentDeadline] Notificações de prazo de avaliações DESATIVADAS permanentemente.');
  return { sent: 0, errors: 0 };
}

/**
 * Obtém resumo de alertas de prazo para exibição no dashboard
 */
export async function getDeadlineAlertsSummary(): Promise<{
  total: number;
  criticos: number;
  urgentes: number;
  atencao: number;
  lembretes: number;
  alerts: DeadlineAlert[];
}> {
  const alerts = await getUpcomingDeadlines();

  return {
    total: alerts.length,
    criticos: alerts.filter(a => a.urgencyLevel === 'critico').length,
    urgentes: alerts.filter(a => a.urgencyLevel === 'urgente').length,
    atencao: alerts.filter(a => a.urgencyLevel === 'atencao').length,
    lembretes: alerts.filter(a => a.urgencyLevel === 'lembrete').length,
    alerts,
  };
}
