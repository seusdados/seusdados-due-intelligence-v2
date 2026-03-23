import { eq, and, desc, sql, isNull, or } from "drizzle-orm";
import { getDb } from "./db";
import { notifications, users, tickets, meudpoSettings } from "../drizzle/schema";
import { TRPCError } from '@trpc/server';

// Tipos de notificação do MEUDPO
export type MeudpoNotificationType = 
  | "ticket_created"
  | "ticket_updated"
  | "ticket_comment"
  | "ticket_resolved"
  | "ticket_assigned"
  | "sla_warning"
  | "sla_breach"
  | "report_ready";

interface CreateNotificationParams {
  userId: number;
  organizationId?: number;
  type: MeudpoNotificationType;
  title: string;
  message: string;
  link?: string;
  entityType?: string;
  entityId?: number;
}

// Criar uma notificação
export async function createNotification(params: CreateNotificationParams) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const [notification] = await db.insert(notifications).values({
    userId: params.userId,
    organizationId: params.organizationId,
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link,
    entityType: params.entityType,
    entityId: params.entityId,
    isRead: 0,
  });

  return notification;
}

// Criar notificações em lote para múltiplos usuários
export async function createBulkNotifications(
  userIds: number[],
  params: Omit<CreateNotificationParams, "userId">
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const notificationsToInsert = userIds.map((userId) => ({
    userId,
    organizationId: params.organizationId,
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link,
    entityType: params.entityType,
    entityId: params.entityId,
    isRead: 0,
  }));

  await db.insert(notifications).values(notificationsToInsert);
}

// Buscar notificações do usuário
export async function getUserNotifications(
  userId: number,
  options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const { limit = 20, offset = 0, unreadOnly = false } = options;

  const conditions = [eq(notifications.userId, userId)];
  if (unreadOnly) {
    conditions.push(eq(notifications.isRead, 0));
  }

  const result = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);

  return result;
}

// Contar notificações não lidas
export async function getUnreadCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0)));

  return result[0]?.count || 0;
}

// Marcar notificação como lida
export async function markAsRead(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  await db
    .update(notifications)
    .set({ isRead: 1, readAt: new Date().toISOString() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

// Marcar todas as notificações como lidas
export async function markAllAsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  await db
    .update(notifications)
    .set({ isRead: 1, readAt: new Date().toISOString() })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0)));
}

// Deletar notificação
export async function deleteNotification(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  await db
    .delete(notifications)
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

// ==================== NOTIFICAÇÕES AUTOMÁTICAS DE TICKETS ====================

// Notificar sobre novo ticket
export async function notifyTicketCreated(
  ticketId: number,
  ticketTitle: string,
  organizationId: number,
  creatorId: number
) {
  const db = await getDb();
  if (!db) return;

  // Buscar configurações da organização
  const settings = await getOrganizationSettings(organizationId);
  if (!settings?.notifyOnCreate) return;

  // Buscar admins e consultores para notificar
  const adminsAndConsultants = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        or(eq(users.role, "admin_global"), eq(users.role, "consultor")),
        eq(users.isActive, 1)
      )
    );

  const userIds = adminsAndConsultants
    .map((u) => u.id)
    .filter((id) => id !== creatorId);

  if (userIds.length > 0) {
    await createBulkNotifications(userIds, {
      organizationId,
      type: "ticket_created",
      title: "Novo Ticket Criado",
      message: `Um novo ticket foi aberto: "${ticketTitle}"`,
      link: `/meudpo/${ticketId}`,
      entityType: "ticket",
      entityId: ticketId,
    });
  }
}

// Notificar sobre atualização de ticket
export async function notifyTicketUpdated(
  ticketId: number,
  ticketTitle: string,
  organizationId: number,
  updaterId: number,
  assignedToId?: number,
  createdById?: number
) {
  const db = await getDb();
  if (!db) return;

  const settings = await getOrganizationSettings(organizationId);
  if (!settings?.notifyOnUpdate) return;

  const userIdsToNotify: number[] = [];
  if (assignedToId && assignedToId !== updaterId) userIdsToNotify.push(assignedToId);
  if (createdById && createdById !== updaterId) userIdsToNotify.push(createdById);

  if (userIdsToNotify.length > 0) {
    await createBulkNotifications(userIdsToNotify, {
      organizationId,
      type: "ticket_updated",
      title: "Ticket Atualizado",
      message: `O ticket "${ticketTitle}" foi atualizado`,
      link: `/meudpo/${ticketId}`,
      entityType: "ticket",
      entityId: ticketId,
    });
  }
}

// Notificar sobre novo comentário
export async function notifyTicketComment(
  ticketId: number,
  ticketTitle: string,
  organizationId: number,
  commenterId: number,
  assignedToId?: number,
  createdById?: number
) {
  const db = await getDb();
  if (!db) return;

  const settings = await getOrganizationSettings(organizationId);
  if (!settings?.notifyOnComment) return;

  const userIdsToNotify: number[] = [];
  if (assignedToId && assignedToId !== commenterId) userIdsToNotify.push(assignedToId);
  if (createdById && createdById !== commenterId) userIdsToNotify.push(createdById);

  if (userIdsToNotify.length > 0) {
    await createBulkNotifications(userIdsToNotify, {
      organizationId,
      type: "ticket_comment",
      title: "Novo Comentário",
      message: `Novo comentário no ticket "${ticketTitle}"`,
      link: `/meudpo/${ticketId}`,
      entityType: "ticket",
      entityId: ticketId,
    });
  }
}

// Notificar sobre ticket resolvido
export async function notifyTicketResolved(
  ticketId: number,
  ticketTitle: string,
  organizationId: number,
  resolverId: number,
  createdById: number
) {
  const db = await getDb();
  if (!db) return;

  const settings = await getOrganizationSettings(organizationId);
  if (!settings?.notifyOnResolve) return;

  if (createdById !== resolverId) {
    await createNotification({
      userId: createdById,
      organizationId,
      type: "ticket_resolved",
      title: "Ticket Resolvido",
      message: `O ticket "${ticketTitle}" foi resolvido`,
      link: `/meudpo/${ticketId}`,
      entityType: "ticket",
      entityId: ticketId,
    });
  }
}

// Notificar sobre aviso de SLA
export async function notifySlaWarning(
  ticketId: number,
  ticketTitle: string,
  organizationId: number,
  assignedToId: number,
  percentageUsed: number
) {
  const db = await getDb();
  if (!db) return;

  const settings = await getOrganizationSettings(organizationId);
  if (!settings?.notifySlaWarning) return;

  await createNotification({
    userId: assignedToId,
    organizationId,
    type: "sla_warning",
    title: "Aviso de SLA",
    message: `O ticket "${ticketTitle}" está com ${percentageUsed}% do SLA consumido`,
    link: `/meudpo/${ticketId}`,
    entityType: "ticket",
    entityId: ticketId,
  });
}

// Notificar sobre violação de SLA
export async function notifySlaBreach(
  ticketId: number,
  ticketTitle: string,
  organizationId: number,
  assignedToId: number
) {
  const db = await getDb();
  if (!db) return;

  await createNotification({
    userId: assignedToId,
    organizationId,
    type: "sla_breach",
    title: "SLA Violado",
    message: `O ticket "${ticketTitle}" ultrapassou o prazo de SLA`,
    link: `/meudpo/${ticketId}`,
    entityType: "ticket",
    entityId: ticketId,
  });

  // Também notificar admins
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin_global"), eq(users.isActive, 1)));

  const adminIds = admins.map((a) => a.id).filter((id) => id !== assignedToId);
  if (adminIds.length > 0) {
    await createBulkNotifications(adminIds, {
      organizationId,
      type: "sla_breach",
      title: "Violação de SLA",
      message: `O ticket "${ticketTitle}" ultrapassou o prazo de SLA`,
      link: `/meudpo/${ticketId}`,
      entityType: "ticket",
      entityId: ticketId,
    });
  }
}

// ==================== CONFIGURAÇÕES ====================

// Buscar configurações da organização
export async function getOrganizationSettings(organizationId: number) {
  const db = await getDb();
  if (!db) return null;

  const [settings] = await db
    .select()
    .from(meudpoSettings)
    .where(eq(meudpoSettings.organizationId, organizationId));

  // Retornar configurações padrão se não existir
  if (!settings) {
    return {
      slaCritica: 4,
      slaAlta: 8,
      slaMedia: 24,
      slaBaixa: 72,
      notifyOnCreate: true,
      notifyOnUpdate: true,
      notifyOnComment: true,
      notifyOnResolve: true,
      notifySlaWarning: true,
      slaWarningThreshold: 80,
      autoReportEnabled: false,
      autoReportFrequency: "mensal" as const,
      reportRecipients: [],
      customCategories: [],
    };
  }

  return settings;
}

// Salvar configurações da organização
export async function saveOrganizationSettings(
  organizationId: number,
  settings: Partial<{
    slaCritica: number;
    slaAlta: number;
    slaMedia: number;
    slaBaixa: number;
    notifyOnCreate: boolean;
    notifyOnUpdate: boolean;
    notifyOnComment: boolean;
    notifyOnResolve: boolean;
    notifySlaWarning: boolean;
    slaWarningThreshold: number;
    autoReportEnabled: boolean;
    autoReportFrequency: "diario" | "semanal" | "quinzenal" | "mensal";
    reportRecipients: string[];
    customCategories: string[];
  }>
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Verificar se já existe
  const [existing] = await db
    .select()
    .from(meudpoSettings)
    .where(eq(meudpoSettings.organizationId, organizationId));

  // Converter boolean para number para compatibilidade com tinyint
  const dbSettings: Record<string, any> = {};
  for (const [key, value] of Object.entries(settings)) {
    if (typeof value === 'boolean') {
      dbSettings[key] = value ? 1 : 0;
    } else {
      dbSettings[key] = value;
    }
  }

  if (existing) {
    await db
      .update(meudpoSettings)
      .set(dbSettings as any)
      .where(eq(meudpoSettings.organizationId, organizationId));
  } else {
    await db.insert(meudpoSettings).values({
      organizationId,
      ...dbSettings,
    } as any);
  }
}
