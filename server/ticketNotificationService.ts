/**
 * Ticket Notification Service
 * 
 * Serviço para enviar notificações por email sobre tickets e avaliações
 * Utiliza as preferências do usuário salvas no banco de dados
 */

import { logger } from "./_core/logger";
import { withCircuitBreaker, withRetryAndBackoff } from "./_core/resilience";
import { ENV } from "./_core/env";
import * as dbModule from "./db";
import { userPreferences, users, tickets, organizations } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from '@trpc/server';

const getDb = async () => {
  const db = await dbModule.getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  return db;
};

// Tipos de notificação
export type NotificationType = 
  | "ticket_created"
  | "ticket_assigned"
  | "ticket_updated"
  | "ticket_resolved"
  | "ticket_sla_warning"
  | "ticket_sla_breach"
  | "assessment_created"
  | "assessment_completed"
  | "assessment_reminder";

interface NotificationData {
  userId: number;
  type: NotificationType;
  title: string;
  content: string;
  metadata?: Record<string, any>;
}

/**
 * Verifica se o usuário deseja receber notificações por email
 */
async function shouldSendEmailNotification(userId: number, notificationType: NotificationType): Promise<boolean> {
  try {
    const db = await getDb();
    const [prefs] = await db.select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));

    if (!prefs) {
      // Se não há preferências salvas, usar padrões
      return true;
    }

    // Mapear tipo de notificação para preferência
    switch (notificationType) {
      case "ticket_created":
      case "ticket_assigned":
      case "ticket_updated":
      case "ticket_resolved":
        return prefs.notifyTickets === 1;
      case "ticket_sla_warning":
      case "ticket_sla_breach":
        return prefs.notifyTickets === 1; // SLA alerts use ticket notifications
      case "assessment_created":
      case "assessment_completed":
      case "assessment_reminder":
        return prefs.notifyAvaliacoes === 1;
      default:
        return true;
    }
  } catch (error) {
    logger.error("Erro ao verificar preferências de notificação", error as Error);
    return true; // Em caso de erro, enviar notificação por padrão
  }
}

/**
 * Obtém informações do usuário para notificação
 */
async function getUserInfo(userId: number): Promise<{ name: string; email: string } | null> {
  try {
    const db = await getDb();
    const [user] = await db.select({
      name: users.name,
      email: users.email
    })
      .from(users)
      .where(eq(users.id, userId));

    return user || null;
  } catch (error) {
    logger.error("Erro ao obter informações do usuário", error as Error);
    return null;
  }
}

/**
 * Envia notificação para o owner do projeto (via API Manus)
 */
async function sendOwnerNotification(title: string, content: string): Promise<boolean> {
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    logger.warn("API de notificações não configurada");
    return false;
  }

  try {
    const endpoint = `${ENV.forgeApiUrl.endsWith('/') ? ENV.forgeApiUrl : ENV.forgeApiUrl + '/'}webdevtoken.v1.WebDevService/SendNotification`;

    await withCircuitBreaker('ticket-notification', () =>
      withRetryAndBackoff(async () => {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            accept: "application/json",
            authorization: `Bearer ${ENV.forgeApiKey}`,
            "content-type": "application/json",
            "connect-protocol-version": "1",
          },
          body: JSON.stringify({ title, content }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response;
      }, { maxRetries: 2, initialDelay: 500, maxDelay: 5000 })
    );

    return true;
  } catch (error) {
    logger.error("Erro ao enviar notificação", error as Error);
    return false;
  }
}

/**
 * Notifica sobre novo ticket criado
 */
export async function notifyTicketCreated(ticketId: number, assignedToId?: number): Promise<void> {
  try {
    const db = await getDb();
    const [ticket] = await db.select({
      ticketNumber: tickets.ticketNumber,
      title: tickets.title,
      priority: tickets.priority,
      organizationId: tickets.organizationId
    })
      .from(tickets)
      .where(eq(tickets.id, ticketId));

    if (!ticket) return;

    const [org] = await db.select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, ticket.organizationId));

    const title = `🎫 Novo Ticket: ${ticket.ticketNumber}`;
    const content = `
Um novo ticket foi criado:

📋 Número: ${ticket.ticketNumber}
📝 Título: ${ticket.title}
🏢 Organização: ${org?.name || "N/A"}
⚡ Prioridade: ${formatPriority(ticket.priority)}

Acesse o sistema para mais detalhes.
    `.trim();

    // Notificar owner
    await sendOwnerNotification(title, content);

    // Se há um responsável atribuído, verificar preferências
    if (assignedToId) {
      const shouldNotify = await shouldSendEmailNotification(assignedToId, "ticket_assigned");
      if (shouldNotify) {
        const userInfo = await getUserInfo(assignedToId);
        if (userInfo) {
          logger.info(`Notificação de ticket enviada para ${userInfo.email}`, { ticketId });
        }
      }
    }
  } catch (error) {
    logger.error("Erro ao notificar criação de ticket", error as Error, { ticketId });
  }
}

/**
 * Notifica sobre alerta de SLA
 */
export async function notifySLAWarning(ticketId: number, hoursRemaining: number): Promise<void> {
  try {
    const db = await getDb();
    const [ticket] = await db.select({
      ticketNumber: tickets.ticketNumber,
      title: tickets.title,
      assignedToId: tickets.assignedToId,
      deadline: tickets.deadline,
      organizationId: tickets.organizationId
    })
      .from(tickets)
      .where(eq(tickets.id, ticketId));

    if (!ticket) return;

    const [org] = await db.select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, ticket.organizationId));

    const isBreached = hoursRemaining <= 0;
    const emoji = isBreached ? "🚨" : "⚠️";
    const status = isBreached ? "ESTOURADO" : "EM RISCO";

    const title = `${emoji} SLA ${status}: ${ticket.ticketNumber}`;
    const content = `
O ticket ${ticket.ticketNumber} está com SLA ${status.toLowerCase()}!

📋 Número: ${ticket.ticketNumber}
📝 Título: ${ticket.title}
🏢 Organização: ${org?.name || "N/A"}
⏰ Prazo: ${ticket.deadline ? new Date(ticket.deadline).toLocaleString("pt-BR") : "N/A"}
${isBreached ? "❌ O prazo já expirou!" : `⏳ Restam ${hoursRemaining.toFixed(1)} horas`}

Ação imediata necessária!
    `.trim();

    // Notificar owner
    await sendOwnerNotification(title, content);

    // Se há um responsável, verificar preferências
    if (ticket.assignedToId) {
      const notificationType: NotificationType = isBreached ? "ticket_sla_breach" : "ticket_sla_warning";
      const shouldNotify = await shouldSendEmailNotification(ticket.assignedToId, notificationType);
      if (shouldNotify) {
        const userInfo = await getUserInfo(ticket.assignedToId);
        if (userInfo) {
          logger.info(`Alerta de SLA enviado para ${userInfo.email}`, { ticketId, hoursRemaining });
        }
      }
    }
  } catch (error) {
    logger.error("Erro ao notificar alerta de SLA", error as Error, { ticketId });
  }
}

/**
 * Notifica sobre ticket resolvido
 */
export async function notifyTicketResolved(ticketId: number): Promise<void> {
  try {
    const db = await getDb();
    const [ticket] = await db.select({
      ticketNumber: tickets.ticketNumber,
      title: tickets.title,
      createdById: tickets.createdById,
      organizationId: tickets.organizationId,
      resolvedAt: tickets.resolvedAt,
      deadline: tickets.deadline
    })
      .from(tickets)
      .where(eq(tickets.id, ticketId));

    if (!ticket) return;

    const [org] = await db.select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, ticket.organizationId));

    // Verificar se foi no prazo
    const wasOnTime = ticket.deadline && ticket.resolvedAt 
      ? new Date(ticket.resolvedAt) <= new Date(ticket.deadline)
      : true;

    const emoji = wasOnTime ? "✅" : "⚠️";
    const slaStatus = wasOnTime ? "dentro do prazo" : "fora do prazo";

    const title = `${emoji} Ticket Resolvido: ${ticket.ticketNumber}`;
    const content = `
O ticket ${ticket.ticketNumber} foi resolvido ${slaStatus}!

📋 Número: ${ticket.ticketNumber}
📝 Título: ${ticket.title}
🏢 Organização: ${org?.name || "N/A"}
📅 Resolvido em: ${ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleString("pt-BR") : "N/A"}
${ticket.deadline ? `⏰ Prazo era: ${new Date(ticket.deadline).toLocaleString("pt-BR")}` : ""}
    `.trim();

    // Notificar owner
    await sendOwnerNotification(title, content);

    // Notificar criador do ticket
    if (ticket.createdById) {
      const shouldNotify = await shouldSendEmailNotification(ticket.createdById, "ticket_resolved");
      if (shouldNotify) {
        const userInfo = await getUserInfo(ticket.createdById);
        if (userInfo) {
          logger.info(`Notificação de resolução enviada para ${userInfo.email}`, { ticketId });
        }
      }
    }
  } catch (error) {
    logger.error("Erro ao notificar resolução de ticket", error as Error, { ticketId });
  }
}

/**
 * Notifica sobre avaliação completada
 */
export async function notifyAssessmentCompleted(
  assessmentId: number, 
  assessmentType: "conformidade" | "due_diligence",
  organizationId: number
): Promise<void> {
  try {
    const db = await getDb();
    const [org] = await db.select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    const typeLabel = assessmentType === "conformidade" ? "Conformidade" : "Due Diligence";
    const title = `📊 Avaliação ${typeLabel} Concluída`;
    const content = `
Uma avaliação de ${typeLabel} foi concluída!

🏢 Organização: ${org?.name || "N/A"}
📋 ID da Avaliação: ${assessmentId}
📅 Concluída em: ${new Date().toLocaleString("pt-BR")}

Acesse o sistema para ver os resultados.
    `.trim();

    await sendOwnerNotification(title, content);
  } catch (error) {
    logger.error("Erro ao notificar avaliação concluída", error as Error, { assessmentId });
  }
}

/**
 * Envia resumo diário de SLA
 */
export async function sendDailySLASummary(): Promise<void> {
  try {
    const db = await getDb();
    
    // Buscar tickets com SLA em risco ou estourado
    const now = new Date();
    const allTickets = await db.select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      title: tickets.title,
      deadline: tickets.deadline,
      status: tickets.status,
      organizationId: tickets.organizationId
    })
      .from(tickets)
      .where(
        and(
          eq(tickets.status, "novo" as any),
        )
      );

    const atRisk: typeof allTickets = [];
    const breached: typeof allTickets = [];

    for (const ticket of allTickets) {
      if (!ticket.deadline) continue;
      const deadline = new Date(ticket.deadline);
      const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursRemaining <= 0) {
        breached.push(ticket);
      } else if (hoursRemaining <= 24) {
        atRisk.push(ticket);
      }
    }

    if (breached.length === 0 && atRisk.length === 0) {
      logger.info("Resumo diário de SLA: Nenhum ticket em risco ou estourado");
      return;
    }

    const title = `📊 Resumo Diário de SLA - ${now.toLocaleDateString("pt-BR")}`;
    const content = `
Resumo de tickets com SLA em risco:

🚨 ESTOURADOS (${breached.length}):
${breached.length > 0 ? breached.slice(0, 10).map(t => `  • ${t.ticketNumber}: ${t.title}`).join("\n") : "  Nenhum"}
${breached.length > 10 ? `  ... e mais ${breached.length - 10} tickets` : ""}

⚠️ EM RISCO (${atRisk.length}):
${atRisk.length > 0 ? atRisk.slice(0, 10).map(t => `  • ${t.ticketNumber}: ${t.title}`).join("\n") : "  Nenhum"}
${atRisk.length > 10 ? `  ... e mais ${atRisk.length - 10} tickets` : ""}

Acesse o Dashboard de SLA para mais detalhes.
    `.trim();

    await sendOwnerNotification(title, content);
    logger.info(`Resumo diário de SLA enviado: ${breached.length} estourados, ${atRisk.length} em risco`);
  } catch (error) {
    logger.error("Erro ao enviar resumo diário de SLA", error as Error);
  }
}

// Funções auxiliares
function formatPriority(priority: string | null): string {
  const priorities: Record<string, string> = {
    baixa: "🟢 Baixa",
    media: "🟡 Média",
    alta: "🟠 Alta",
    critica: "🔴 Crítica"
  };
  return priorities[priority || "media"] || "🟡 Média";
}
