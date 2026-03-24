/**
 * Serviço de Verificação de Ações Vencidas — CPPD
 * 
 * Rotina diária que:
 * 1. Busca ações do CPPD com dueDate < hoje e status != concluida/cancelada
 * 2. Envia e-mail de alerta ao responsável
 * 3. Registra na trilha de auditoria
 * 4. Pode ser executada manualmente via endpoint protegido
 * 
 * Integra com:
 *   - emailService (sendGenericEmail)
 *   - audit/cppdAudit (logCppdEvent)
 *   - setInterval (padrão do projeto)
 */

import { logger } from '../_core/logger';
import { sendGenericEmail } from '../emailService';
import { logCppdEvent } from '../audit/cppdAudit';

let overdueInterval: NodeJS.Timeout | null = null;
let lastRunTimestamp: string | null = null;

// Intervalo padrão: 24 horas
const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Dados de uma ação vencida
 */
interface OverdueAction {
  id: number;
  organizationId: number;
  meetingId: number | null;
  title: string;
  description: string | null;
  assignedToUserId: number | null;
  assignedToName: string | null;
  assignedToEmail?: string | null;
  dueDate: string;
  priority: string;
  status: string;
  daysOverdue: number;
}

/**
 * Busca todas as ações vencidas do CPPD no banco de dados.
 */
async function findOverdueActions(): Promise<OverdueAction[]> {
  try {
    const { getDb } = await import('../db');
    const db = await getDb();
    if (!db) return [];

    const { governancaActionItems } = await import('../../drizzle/schema');
    const { and, lt, notInArray, isNotNull, sql } = await import('drizzle-orm');

    const today = new Date().toISOString().split('T')[0] + 'T00:00:00';

    const overdueRows = await db
      .select()
      .from(governancaActionItems)
      .where(
        and(
          lt(governancaActionItems.dueDate, today),
          notInArray(governancaActionItems.status, ['concluida', 'cancelada']),
          isNotNull(governancaActionItems.dueDate),
        )
      );

    // Enriquecer com e-mail do responsável
    const userIds = Array.from(new Set(overdueRows.map(r => r.assignedToUserId).filter(Boolean))) as number[];
    let userEmailMap: Record<number, string> = {};

    if (userIds.length > 0) {
      try {
        const { users } = await import('../../drizzle/schema');
        const userRows = await db
          .select({ id: users.id, email: users.email })
          .from(users)
          .where(sql`${users.id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);
        userEmailMap = Object.fromEntries(userRows.map(u => [u.id, u.email || '']));
      } catch { /* ignorar */ }
    }

    return overdueRows.map(row => {
      const dueDate = new Date(row.dueDate!);
      const now = new Date();
      const diffMs = now.getTime() - dueDate.getTime();
      const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      return {
        id: row.id,
        organizationId: row.organizationId,
        meetingId: row.meetingId,
        title: row.title,
        description: row.description,
        assignedToUserId: row.assignedToUserId,
        assignedToName: row.assignedToName,
        assignedToEmail: row.assignedToUserId ? (userEmailMap[row.assignedToUserId] || null) : null,
        dueDate: row.dueDate!,
        priority: row.priority,
        status: row.status,
        daysOverdue,
      };
    });
  } catch (error: any) {
    logger.error('[CPPD Overdue] Falha ao buscar ações vencidas', { error: error?.message });
    return [];
  }
}

/**
 * Template HTML do e-mail de alerta de ação vencida
 */
function buildOverdueEmailHtml(action: OverdueAction): string {
  const priorityColors: Record<string, string> = {
    critica: '#DC2626',
    alta: '#F59E0B',
    media: '#3B82F6',
    baixa: '#6B7280',
  };
  const priorityLabels: Record<string, string> = {
    critica: 'Critica',
    alta: 'Alta',
    media: 'Media',
    baixa: 'Baixa',
  };
  const priorityColor = priorityColors[action.priority] || '#6B7280';
  const priorityLabel = priorityLabels[action.priority] || action.priority;

  const dueDate = new Date(action.dueDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F4F4F5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#DC2626 0%,#F59E0B 100%);padding:28px 40px;text-align:center;">
            <p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;color:rgba(255,255,255,0.8);text-transform:uppercase;">ALERTA DE PRAZO VENCIDO</p>
            <h1 style="margin:0;font-size:20px;color:#FFFFFF;font-weight:600;">Acao do CPPD com prazo expirado</h1>
          </td>
        </tr>

        <!-- Corpo -->
        <tr>
          <td style="padding:32px 40px;">
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
              Prezado(a) <strong>${action.assignedToName || 'Responsavel'}</strong>,
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              A seguinte acao do Comite de Privacidade e Protecao de Dados (CPPD) esta com o prazo vencido ha <strong style="color:#DC2626;">${action.daysOverdue} dia(s)</strong>.
            </p>

            <!-- Detalhes -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#FEF2F2;border-radius:8px;padding:20px;margin-bottom:24px;border:1px solid #FECACA;">
              <tr>
                <td style="padding:8px 20px;">
                  <p style="margin:0;font-size:13px;color:#6B7280;">Acao</p>
                  <p style="margin:4px 0 0;font-size:15px;color:#111827;font-weight:600;">${action.title}</p>
                </td>
              </tr>
              ${action.description ? `
              <tr>
                <td style="padding:8px 20px;">
                  <p style="margin:0;font-size:13px;color:#6B7280;">Descricao</p>
                  <p style="margin:4px 0 0;font-size:14px;color:#374151;">${action.description}</p>
                </td>
              </tr>` : ''}
              <tr>
                <td style="padding:8px 20px;">
                  <p style="margin:0;font-size:13px;color:#6B7280;">Prazo original</p>
                  <p style="margin:4px 0 0;font-size:15px;color:#DC2626;font-weight:600;">${dueDate}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 20px;">
                  <p style="margin:0;font-size:13px;color:#6B7280;">Prioridade</p>
                  <p style="margin:4px 0 0;font-size:14px;color:${priorityColor};font-weight:600;">${priorityLabel}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 20px;">
                  <p style="margin:0;font-size:13px;color:#6B7280;">Dias em atraso</p>
                  <p style="margin:4px 0 0;font-size:20px;color:#DC2626;font-weight:700;">${action.daysOverdue}</p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 16px;font-size:14px;color:#6B7280;line-height:1.5;">
              Solicitamos que a acao seja concluida o mais breve possivel ou que o prazo seja renegociado junto ao Comite.
            </p>

            ${process.env.PUBLIC_APP_URL ? `
            <div style="text-align:center;margin:24px 0;">
              <a href="${process.env.PUBLIC_APP_URL}/governanca" style="display:inline-block;background:linear-gradient(135deg,#6B3FD9 0%,#00A8E8 100%);color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
                Acessar Plataforma
              </a>
            </div>` : ''}
          </td>
        </tr>

        <!-- Rodapé -->
        <tr>
          <td style="background:#F9FAFB;padding:20px 40px;border-top:1px solid #E5E7EB;">
            <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">
              Seusdados Consultoria em Gestao de Dados Ltda. | CNPJ 33.899.116/0001-63
              <br>www.seusdados.com | Responsabilidade tecnica: Marcelo Fattori
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Executa a verificação de ações vencidas e envia notificações.
 */
export async function runCppdOverdueCheck(): Promise<{
  success: boolean;
  checked: number;
  notified: number;
  errors: number;
  details: Array<{ actionId: number; title: string; email: string | null; sent: boolean; error?: string }>;
}> {
  logger.info('[CPPD Overdue] Iniciando verificação de ações vencidas...');
  const startTime = Date.now();

  const overdueActions = await findOverdueActions();
  const details: Array<{ actionId: number; title: string; email: string | null; sent: boolean; error?: string }> = [];
  let notified = 0;
  let errors = 0;

  for (const action of overdueActions) {
    if (!action.assignedToEmail) {
      details.push({
        actionId: action.id,
        title: action.title,
        email: null,
        sent: false,
        error: 'Responsavel sem e-mail cadastrado',
      });
      continue;
    }

    try {
      const html = buildOverdueEmailHtml(action);

      await sendGenericEmail({
        to: action.assignedToEmail,
        subject: `[CPPD] Acao vencida: ${action.title} (${action.daysOverdue} dia(s) em atraso)`,
        html,
        tags: [
          { name: 'type', value: 'cppd-overdue-alert' },
          { name: 'actionId', value: String(action.id) },
        ],
      });

      // Registrar auditoria
      await logCppdEvent({
        organizationId: action.organizationId,
        userId: 0, // Sistema
        action: 'acao_vencida_notificada',
        entityType: 'governanca_action_item',
        entityId: action.id,
        details: {
          title: action.title,
          daysOverdue: action.daysOverdue,
          assignedTo: action.assignedToName,
          email: action.assignedToEmail,
          priority: action.priority,
        },
      });

      details.push({ actionId: action.id, title: action.title, email: action.assignedToEmail, sent: true });
      notified++;
    } catch (error: any) {
      logger.error('[CPPD Overdue] Falha ao notificar ação vencida', {
        actionId: action.id,
        error: error?.message,
      });
      details.push({
        actionId: action.id,
        title: action.title,
        email: action.assignedToEmail,
        sent: false,
        error: error?.message || 'Erro desconhecido',
      });
      errors++;
    }
  }

  const duration = Date.now() - startTime;
  lastRunTimestamp = new Date().toISOString();

  logger.info('[CPPD Overdue] Verificação concluída', {
    checked: overdueActions.length,
    notified,
    errors,
    duration: `${duration}ms`,
  });

  return {
    success: true,
    checked: overdueActions.length,
    notified,
    errors,
    details,
  };
}

/**
 * Inicia a rotina diária de verificação de ações vencidas.
 */
export function initializeCppdOverdueJob(intervalMs?: number): void {
  // === BLOQUEADO DEFINITIVAMENTE ===
  // E-mails de alerta de ações vencidas do CPPD desativados por solicitação.
  // Nenhum perfil deve receber e-mails de prazo/vencimento.
  logger.info('[CPPD Overdue] Rotina de verificação de ações vencidas DESATIVADA permanentemente.');
  return;
}

/**
 * Para a rotina de verificação.
 */
export function stopCppdOverdueJob(): void {
  if (overdueInterval) {
    clearInterval(overdueInterval);
    overdueInterval = null;
    logger.info('[CPPD Overdue] Rotina parada');
  }
}

/**
 * Retorna o status atual do job.
 */
export function getCppdOverdueJobStatus(): {
  running: boolean;
  lastRun: string | null;
} {
  return {
    running: overdueInterval !== null,
    lastRun: lastRunTimestamp,
  };
}
