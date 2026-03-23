/**
 * deadlineNotificationService.ts
 * Serviço de notificações automáticas por severidade de prazos.
 * Monitora mudanças de severidade e envia e-mails quando um prazo
 * muda para "CRITICO" ou "VENCIDO".
 * 
 * Integra com:
 * - deadlinesRouter.ts (busca prazos unificados)
 * - emailService.ts (envia e-mails via Resend)
 * - notifyOwner (notifica o dono do projeto)
 */
import { logger } from './_core/logger';
import { notifyOwner } from './_core/notification';
import { sendGenericEmail } from './emailService';
import * as db from './db';
import { sql } from 'drizzle-orm';

// ===== Tabela de estado de severidade (em memória, persistida no banco) =====
// Armazena a última severidade conhecida de cada prazo para detectar transições

interface SeverityState {
  lastSeverity: string;
  lastChecked: number; // timestamp
  notifiedAt?: number; // timestamp do último e-mail enviado
}

// Cache em memória (recarregado do banco no bootstrap)
const severityCache = new Map<string, SeverityState>();

// ===== Configuração =====
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 horas
const MIN_NOTIFY_INTERVAL_MS = 24 * 60 * 60 * 1000; // Não reenviar e-mail para o mesmo prazo em menos de 24h
let checkInterval: NodeJS.Timeout | null = null;
let isRunning = false;

// ===== Funções de severidade =====
function computeSeverity(daysLeft: number): string {
  if (daysLeft <= 0) return 'VENCIDO';
  if (daysLeft === 1) return 'CRITICO';
  if (daysLeft === 2) return 'URGENTE';
  if (daysLeft <= 5) return 'ATENCAO';
  return 'NO_PRAZO';
}

function diffDays(dueDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// Severidades que disparam notificação
const ALERT_SEVERITIES = new Set(['VENCIDO', 'CRITICO']);

// Transições que disparam notificação (de -> para)
function shouldNotify(oldSeverity: string | undefined, newSeverity: string): boolean {
  // Se não tinha estado anterior, notifica se já é crítico/vencido
  if (!oldSeverity) return ALERT_SEVERITIES.has(newSeverity);
  // Se mudou para pior, notifica
  if (oldSeverity !== newSeverity && ALERT_SEVERITIES.has(newSeverity)) return true;
  return false;
}

// ===== Template de e-mail =====
function generateDeadlineAlertHtml(item: {
  title: string;
  dueDate: string;
  daysUntilDue: number;
  severity: string;
  module: string;
  organizationName: string;
  ownerUserName?: string;
}): string {
  const dueDateFormatted = new Date(item.dueDate).toLocaleDateString('pt-BR');
  const severityLabel = item.severity === 'VENCIDO' ? 'VENCIDO' : 'CRITICO (1 dia)';
  const severityColor = item.severity === 'VENCIDO' ? '#dc2626' : '#ea580c';
  const daysText = item.daysUntilDue <= 0 
    ? `${Math.abs(item.daysUntilDue)} dia(s) atrás` 
    : `${item.daysUntilDue} dia(s) restante(s)`;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:'Inter','Segoe UI',sans-serif;background:#f8fafc;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:linear-gradient(135deg,#6B3FD9,#00A8E8);padding:24px;border-radius:12px 12px 0 0;">
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:300;">Seusdados Due Diligence</h1>
      <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:14px;">Alerta de Prazo</p>
    </div>
    <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;">
      <div style="background:${severityColor}10;border-left:4px solid ${severityColor};padding:16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
        <span style="display:inline-block;background:${severityColor};color:#fff;padding:2px 10px;border-radius:4px;font-size:12px;font-weight:600;margin-bottom:8px;">
          ${severityLabel}
        </span>
        <h2 style="margin:8px 0 4px;font-size:16px;color:#1e293b;">${item.title}</h2>
        <p style="margin:0;font-size:14px;color:#64748b;">${daysText}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr>
          <td style="padding:8px 0;color:#64748b;width:140px;">Prazo:</td>
          <td style="padding:8px 0;color:#1e293b;font-weight:500;">${dueDateFormatted}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748b;">Fonte:</td>
          <td style="padding:8px 0;color:#1e293b;">${item.module}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748b;">Organização:</td>
          <td style="padding:8px 0;color:#1e293b;">${item.organizationName}</td>
        </tr>
        ${item.ownerUserName ? `
        <tr>
          <td style="padding:8px 0;color:#64748b;">Responsável:</td>
          <td style="padding:8px 0;color:#1e293b;">${item.ownerUserName}</td>
        </tr>` : ''}
      </table>
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;">
        <p style="font-size:13px;color:#94a3b8;margin:0;">
          Este alerta foi gerado automaticamente pelo sistema de monitoramento de prazos da Seusdados.
          Acesse a plataforma para tomar as providências necessárias.
        </p>
      </div>
    </div>
    <div style="padding:16px;text-align:center;">
      <p style="font-size:12px;color:#94a3b8;margin:0;">
        Seusdados Consultoria em Gestão de Dados Ltda. — CNPJ 33.899.116/0001-63
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ===== Lógica principal de verificação =====
export async function checkDeadlineSeverityChanges(): Promise<{
  checked: number;
  notified: number;
  errors: number;
}> {
  if (isRunning) {
    logger.info('[DeadlineNotify] Verificação já em andamento, ignorando...');
    return { checked: 0, notified: 0, errors: 0 };
  }

  isRunning = true;
  let checked = 0;
  let notified = 0;
  let errors = 0;

  try {
    const database = await db.getDb();
    if (!database) {
      logger.warn('[DeadlineNotify] Banco de dados não disponível');
      return { checked: 0, notified: 0, errors: 0 };
    }

    // Buscar todos os action_plans com prazo e não concluídos
    const { rows: apRows } = await database.execute(sql`
      SELECT ap.id, ap.title, ap."dueDate", ap.status, ap.priority,
             ap."organizationId", ap."responsibleId",
             o.name as "organizationName"
      FROM action_plans ap
      LEFT JOIN organizations o ON o.id = ap."organizationId"
      WHERE ap."dueDate" IS NOT NULL
        AND ap.status NOT IN ('concluida', 'cancelada')
      ORDER BY ap."dueDate" ASC
    `);

    // Buscar ir_deadlines
    const { rows: irRows } = await database.execute(sql`
      SELECT d.id, d.category, d."dueDate", d.status as "dlStatus",
             c.title as "caseTitle",
             i."organizationId", i.title as "incidentTitle",
             o.name as "organizationName"
      FROM ir_deadlines d
      JOIN ir_cases c ON c.id = d."caseId"
      JOIN ir_incidents i ON i.id = c."incidentId"
      LEFT JOIN organizations o ON o.id = i."organizationId"
      WHERE d.status NOT IN ('cumprido')
    `);

    // Buscar cppd_initiative_tasks
    const { rows: cppdRows } = await database.execute(sql`
      SELECT t.id, t.title, t."dueDate", t.status as "taskStatus",
             t."assignedToId", t."assignedToName",
             i."organizationId", i.title as "initiativeTitle",
             o.name as "organizationName"
      FROM cppd_initiative_tasks t
      JOIN cppd_initiatives i ON i.id = t."initiativeId"
      LEFT JOIN organizations o ON o.id = i."organizationId"
      WHERE t."dueDate" IS NOT NULL
        AND t.status NOT IN ('concluida', 'cancelada')
    `);

    // Processar action_plans
    for (const row of (apRows as any[]) || []) {
      checked++;
      const itemId = `ap_${row.id}`;
      const days = diffDays(row.dueDate);
      const newSeverity = computeSeverity(days);
      const cached = severityCache.get(itemId);

      if (shouldNotify(cached?.lastSeverity, newSeverity)) {
        // Verificar se já notificou recentemente
        if (cached?.notifiedAt && (Date.now() - cached.notifiedAt) < MIN_NOTIFY_INTERVAL_MS) {
          severityCache.set(itemId, { ...cached, lastSeverity: newSeverity, lastChecked: Date.now() });
          continue;
        }

        // Buscar e-mail do responsável
        let responsibleEmail: string | undefined;
        let responsibleName: string | undefined;
        if (row.responsibleId) {
          try {
            const user = await db.getUserById(row.responsibleId);
            responsibleEmail = user?.email;
            responsibleName = user?.name;
          } catch { /* ignore */ }
        }

        // Enviar e-mail ao responsável
        if (responsibleEmail) {
          try {
            await sendGenericEmail({
              to: responsibleEmail,
              subject: `[Seusdados] Alerta de Prazo: ${row.title?.substring(0, 60)}`,
              html: generateDeadlineAlertHtml({
                title: row.title,
                dueDate: row.dueDate,
                daysUntilDue: days,
                severity: newSeverity,
                module: 'Plano de Ação',
                organizationName: row.organizationName || 'N/A',
                ownerUserName: responsibleName,
              }),
            });
            notified++;
            logger.info('[DeadlineNotify] E-mail enviado', { itemId, to: responsibleEmail, severity: newSeverity });
          } catch (e: any) {
            errors++;
            logger.error('[DeadlineNotify] Erro ao enviar e-mail', { itemId, error: e.message });
          }
        }

        // Notificar owner do projeto
        try {
          await notifyOwner({
            title: `Prazo ${newSeverity}: ${row.title?.substring(0, 80)}`,
            content: `Prazo: ${new Date(row.dueDate).toLocaleDateString('pt-BR')}\nOrganização: ${row.organizationName || 'N/A'}\nResponsável: ${responsibleName || 'Não atribuído'}\nDias: ${days <= 0 ? Math.abs(days) + ' dia(s) atrás' : days + ' dia(s) restante(s)'}`,
          });
        } catch { /* ignore */ }

        severityCache.set(itemId, { lastSeverity: newSeverity, lastChecked: Date.now(), notifiedAt: Date.now() });
      } else {
        severityCache.set(itemId, { lastSeverity: newSeverity, lastChecked: Date.now(), notifiedAt: cached?.notifiedAt });
      }
    }

    // Processar ir_deadlines
    for (const row of (irRows as any[]) || []) {
      checked++;
      const itemId = `ir_${row.id}`;
      const days = diffDays(row.dueDate);
      const newSeverity = computeSeverity(days);
      const cached = severityCache.get(itemId);

      if (shouldNotify(cached?.lastSeverity, newSeverity)) {
        if (cached?.notifiedAt && (Date.now() - cached.notifiedAt) < MIN_NOTIFY_INTERVAL_MS) {
          severityCache.set(itemId, { ...cached, lastSeverity: newSeverity, lastChecked: Date.now() });
          continue;
        }

        try {
          await notifyOwner({
            title: `Prazo Processual ${newSeverity}: ${row.category} — ${row.caseTitle || row.incidentTitle}`,
            content: `Prazo: ${new Date(row.dueDate).toLocaleDateString('pt-BR')}\nOrganização: ${row.organizationName || 'N/A'}\nDias: ${days <= 0 ? Math.abs(days) + ' dia(s) atrás' : days + ' dia(s) restante(s)'}`,
          });
          notified++;
        } catch { errors++; }

        severityCache.set(itemId, { lastSeverity: newSeverity, lastChecked: Date.now(), notifiedAt: Date.now() });
      } else {
        severityCache.set(itemId, { lastSeverity: newSeverity, lastChecked: Date.now(), notifiedAt: cached?.notifiedAt });
      }
    }

    // Processar cppd_initiative_tasks
    for (const row of (cppdRows as any[]) || []) {
      checked++;
      const itemId = `cppd_${row.id}`;
      const days = diffDays(row.dueDate);
      const newSeverity = computeSeverity(days);
      const cached = severityCache.get(itemId);

      if (shouldNotify(cached?.lastSeverity, newSeverity)) {
        if (cached?.notifiedAt && (Date.now() - cached.notifiedAt) < MIN_NOTIFY_INTERVAL_MS) {
          severityCache.set(itemId, { ...cached, lastSeverity: newSeverity, lastChecked: Date.now() });
          continue;
        }

        // Buscar e-mail do responsável
        let responsibleEmail: string | undefined;
        let responsibleName = row.assignedToName;
        if (row.assignedToId) {
          try {
            const user = await db.getUserById(row.assignedToId);
            responsibleEmail = user?.email;
            responsibleName = responsibleName || user?.name;
          } catch { /* ignore */ }
        }

        if (responsibleEmail) {
          try {
            await sendGenericEmail({
              to: responsibleEmail,
              subject: `[Seusdados] Alerta de Prazo CPPD: ${row.title?.substring(0, 60)}`,
              html: generateDeadlineAlertHtml({
                title: row.title,
                dueDate: row.dueDate,
                daysUntilDue: days,
                severity: newSeverity,
                module: 'Plano CPPD',
                organizationName: row.organizationName || 'N/A',
                ownerUserName: responsibleName,
              }),
            });
            notified++;
          } catch (e: any) {
            errors++;
            logger.error('[DeadlineNotify] Erro ao enviar e-mail CPPD', { itemId, error: e.message });
          }
        }

        try {
          await notifyOwner({
            title: `Prazo CPPD ${newSeverity}: ${row.title?.substring(0, 80)}`,
            content: `Prazo: ${new Date(row.dueDate).toLocaleDateString('pt-BR')}\nOrganização: ${row.organizationName || 'N/A'}\nResponsável: ${responsibleName || 'Não atribuído'}`,
          });
        } catch { /* ignore */ }

        severityCache.set(itemId, { lastSeverity: newSeverity, lastChecked: Date.now(), notifiedAt: Date.now() });
      } else {
        severityCache.set(itemId, { lastSeverity: newSeverity, lastChecked: Date.now(), notifiedAt: cached?.notifiedAt });
      }
    }

    // Enviar resumo consolidado ao owner se houve notificações
    if (notified > 0) {
      const overdueCount = Array.from(severityCache.values()).filter(s => s.lastSeverity === 'VENCIDO').length;
      const criticalCount = Array.from(severityCache.values()).filter(s => s.lastSeverity === 'CRITICO').length;

      await notifyOwner({
        title: `Resumo de Alertas de Prazos`,
        content: `Verificação concluída:\n- Prazos verificados: ${checked}\n- Alertas enviados: ${notified}\n- Erros: ${errors}\n- Total vencidos: ${overdueCount}\n- Total críticos: ${criticalCount}`,
      }).catch(() => {});
    }

    logger.info('[DeadlineNotify] Verificação concluída', { checked, notified, errors });
    return { checked, notified, errors };

  } catch (error: any) {
    logger.error('[DeadlineNotify] Erro na verificação', { error: error.message });
    return { checked, notified, errors: errors + 1 };
  } finally {
    isRunning = false;
  }
}

// ===== Inicialização e controle do serviço =====
export function startDeadlineNotificationService(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
  }

  logger.info('[DeadlineNotify] Iniciando serviço de notificações de prazos (intervalo: 6h)');

  // Executar primeira verificação após 2 minutos (dar tempo do servidor estabilizar)
  setTimeout(() => {
    checkDeadlineSeverityChanges().catch(e => {
      logger.error('[DeadlineNotify] Erro na verificação inicial', { error: e.message });
    });
  }, 2 * 60 * 1000);

  // Configurar intervalo regular
  checkInterval = setInterval(() => {
    checkDeadlineSeverityChanges().catch(e => {
      logger.error('[DeadlineNotify] Erro na verificação periódica', { error: e.message });
    });
  }, CHECK_INTERVAL_MS);
}

export function stopDeadlineNotificationService(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    logger.info('[DeadlineNotify] Serviço parado');
  }
}

export function getDeadlineNotificationStatus(): {
  isRunning: boolean;
  cacheSize: number;
  overdueCount: number;
  criticalCount: number;
} {
  const overdueCount = Array.from(severityCache.values()).filter(s => s.lastSeverity === 'VENCIDO').length;
  const criticalCount = Array.from(severityCache.values()).filter(s => s.lastSeverity === 'CRITICO').length;

  return {
    isRunning: !!checkInterval,
    cacheSize: severityCache.size,
    overdueCount,
    criticalCount,
  };
}
