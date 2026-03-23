// server/ticketService.ts
// Service Layer para o módulo MeuDPO - Lógica de Negócio Especializada

import { getDb, extractInsertId } from "./db";
import { logger } from "./_core/logger";
import { 
  tickets, 
  ticketComments, 
  ticketAttachments,
  meudpoSettings,
  responseTemplates,
  users,
  organizations,
} from "../drizzle/schema";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

type Ticket = InferSelectModel<typeof tickets>;
type InsertTicket = InferInsertModel<typeof tickets>;
type TicketComment = InferSelectModel<typeof ticketComments>;
type InsertTicketComment = InferInsertModel<typeof ticketComments>;
type TicketAttachment = InferSelectModel<typeof ticketAttachments>;
import { and, eq, desc, gte, lte, sql, inArray, or, isNull } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { storagePut } from "./storage";
import * as gedService from "./gedService";
import { appendTicketAuditLog, getTicketAuditLog } from "./ticketAuditService";
export { getTicketAuditLog };
import { TRPCError } from '@trpc/server';

// ==================== CONSTANTES DE SLA ====================

const SLA_HOURS: Record<string, number> = {
  urgente: 24,
  prioritario: 48,
  padrao: 120 // 5 dias úteis
};

const SLA_MATRIX: Record<string, Record<string, string>> = {
  incidente_seguranca: {
    critica: "urgente",
    alta: "urgente",
    media: "prioritario",
    baixa: "padrao"
  },
  solicitacao_titular: {
    critica: "urgente",
    alta: "prioritario",
    media: "padrao",
    baixa: "padrao"
  },
  duvida_juridica: {
    critica: "urgente",
    alta: "prioritario",
    media: "padrao",
    baixa: "padrao"
  },
  default: {
    critica: "urgente",
    alta: "prioritario",
    media: "padrao",
    baixa: "padrao"
  }
};

// ==================== FUNÇÕES DE SLA ====================

export function determineSLA(ticketType: string, priority: string): string {
  const matrix = SLA_MATRIX[ticketType] || SLA_MATRIX.default;
  return matrix[priority] || "padrao";
}

export async function calculateSLA(ticketData: InsertTicket & { slaLevel: string }): Promise<InsertTicket & { deadline: string }> {
  const now = new Date();
  const hoursToAdd = SLA_HOURS[ticketData.slaLevel] || SLA_HOURS.padrao;
  
  // Calcular deadline considerando dias úteis
  const deadline = new Date(now);
  let businessHoursLeft = hoursToAdd;
  
  while (businessHoursLeft > 0) {
    deadline.setHours(deadline.getHours() + 1);
    businessHoursLeft--;
    
    // Pular finais de semana
    const dayOfWeek = deadline.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      deadline.setHours(deadline.getHours() + 24);
    }
  }
  
  return {
    ...ticketData,
    deadline: deadline.toISOString()
  };
}

export async function updateSLATimeline(ticketId: number, newStatus: string): Promise<void> {
  // Registrar mudança de status no histórico
  logger.info(`Ticket ${ticketId} mudou para status ${newStatus}`);
}

// ==================== CRUD DE TICKETS ====================

/**
 * Obtém o próximo número sequencial de chamado
 * O número é imutável e não reaproveitável
 * Formato: #NNNNNN (ex: #020000)
 */
async function getNextTicketNumber(): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  // Usar transação para garantir atomicidade
  // Incrementa e retorna o próximo número
  await db.execute(sql`UPDATE ticket_sequence SET next_number = next_number + 1 WHERE id = 1`);
  const { rows: result } = await db.execute(sql`SELECT next_number - 1 as current_number FROM ticket_sequence WHERE id = 1`);
  
  const rows = result as unknown as any[];
  if (rows.length === 0) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Sequência de tickets não inicializada' });
  }
  
  return rows[0].current_number;
}

/**
 * Formata o número do chamado no padrão #NNNNNN
 */
export function formatTicketNumber(ticketNumber: number): string {
  return `#${ticketNumber.toString().padStart(6, '0')}`;
}

export async function createTicket(data: InsertTicket): Promise<{ id: number; ticketNumber: number }> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  // Obter próximo número sequencial
  const ticketNumber = await getNextTicketNumber();
  
  // Inserir ticket com número sequencial
  const [result] = await db.insert(tickets).values({
    ...data,
    ticketNumber,
  }).returning({ id: tickets.id });

  // Auditoria imutável (cadeia de hash)
  try {
    await appendTicketAuditLog({
      db,
      ticketId: result.id,
      action: 'ticket_created',
      actorId: (data as any).createdById ?? null,
      actorRole: (data as any).createdByRole ?? null,
      payload: {
        title: (data as any).title,
        ticketType: (data as any).ticketType,
        priority: (data as any).priority,
        status: (data as any).status,
        sourceContext: (data as any).sourceContext ?? null,
      }
    });
  } catch (e) {
    logger.warn('[Audit] Falha ao registrar audit log (createTicket):', e);
  }
  
  return { id: result.id, ticketNumber };
}

export async function getTicketById(id: number): Promise<(Ticket & { 
  comments?: TicketComment[]; 
  attachments?: TicketAttachment[]; 
  createdByName?: string; 
  assignedToName?: string; 
  organizationName?: string;
  serviceCatalogItem?: {
    id: number;
    code: string;
    name: string;
    description: string | null;
    slaHours: number;
    legalDeadlineDays: number | null;
    deliverable: string | null;
    priority: string;
    blockCode: string;
    blockName: string;
  } | null;
}) | null> {
  const db = await getDb();
  if (!db) {
    logger.info('[getTicketById] Database não disponível');
    return null;
  }
  const result = await db.select()
    .from(tickets)
    .where(eq(tickets.id, id))
    .limit(1);
    
  if (result.length === 0) return null;
  
  const ticket = result[0];
  
  // Buscar comentários e anexos
  const comments = await getTicketComments(id);
  const attachments = await getTicketAttachments(id);
  
  // Buscar nome do criador
  let createdByName = "Usuário";
  if (ticket.createdById) {
    const creator = await db.select({ name: users.name }).from(users).where(eq(users.id, ticket.createdById)).limit(1);
    if (creator.length > 0 && creator[0].name) {
      createdByName = creator[0].name;
    }
  }
  
  // Buscar nome do responsável
  let assignedToName: string | undefined;
  if (ticket.assignedToId) {
    const assignee = await db.select({ name: users.name }).from(users).where(eq(users.id, ticket.assignedToId)).limit(1);
    if (assignee.length > 0 && assignee[0].name) {
      assignedToName = assignee[0].name;
    }
  }
  
  // Buscar nome da organização
  let organizationName = "Organização";
  const org = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, ticket.organizationId)).limit(1);
  if (org.length > 0) {
    organizationName = org[0].name;
  }
  
  // Buscar dados do serviço do catálogo CSC vinculado
  let serviceCatalogItem: {
    id: number;
    code: string;
    name: string;
    description: string | null;
    slaHours: number;
    legalDeadlineDays: number | null;
    deliverable: string | null;
    priority: string;
    blockCode: string;
    blockName: string;
  } | null = null;
  
  if (ticket.serviceCatalogItemId) {
    const { getServiceById, getBlockById } = await import('./serviceCatalogService');
    const service = await getServiceById(ticket.serviceCatalogItemId);
    if (service) {
      const block = await getBlockById(service.blockId);
      serviceCatalogItem = {
        id: service.id,
        code: service.code,
        name: service.name,
        description: service.description,
        slaHours: service.slaHours,
        legalDeadlineDays: service.legalDeadlineDays,
        deliverable: service.deliverable,
        priority: service.priority,
        blockCode: block?.code || 'N/A',
        blockName: block?.name || 'N/A'
      };
    }
  }
  
  return {
    ...ticket,
    comments,
    attachments,
    createdByName,
    assignedToName,
    organizationName,
    serviceCatalogItem
  };
}

export async function updateTicket(id: number, data: Partial<Ticket>): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  await db.update(tickets)
    .set({
      ...data,
      updatedAt: new Date().toISOString()
    })
    .where(eq(tickets.id, id));
}

export async function deleteTicket(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  // Deletar anexos primeiro
  await db.delete(ticketAttachments).where(eq(ticketAttachments.ticketId, id));
  // Deletar comentários
  await db.delete(ticketComments).where(eq(ticketComments.ticketId, id));
  // Deletar ticket
  await db.delete(tickets).where(eq(tickets.id, id));
}

// ==================== LISTAGEM DE TICKETS ====================

interface ListFilters {
  status?: string;
  ticketType?: string;
  priority?: string;
  search?: string;
  assignedToId?: number;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
}

export async function listOrganizationTickets(
  organizationId: number, 
  filters: ListFilters
): Promise<{ tickets: Ticket[]; total: number }> {
  const db = await getDb();
  if (!db) return { tickets: [], total: 0 };
  const { status, ticketType, priority, search, assignedToId, dateFrom, dateTo, page = 1, pageSize = 20 } = filters;
  const offset = (page - 1) * pageSize;
  
  const conditions: any[] = [eq(tickets.organizationId, organizationId)];
  
  if (status) {
    conditions.push(eq(tickets.status, status as any));
  }
  
  if (ticketType) {
    conditions.push(eq(tickets.ticketType, ticketType as any));
  }
  
  if (priority) {
    conditions.push(eq(tickets.priority, priority as any));
  }
  
  if (assignedToId) {
    conditions.push(eq(tickets.assignedToId, assignedToId));
  }
  
  if (dateFrom) {
    conditions.push(gte(tickets.createdAt, dateFrom instanceof Date ? dateFrom.toISOString() : dateFrom));
  }
  
  if (dateTo) {
    conditions.push(lte(tickets.createdAt, dateTo instanceof Date ? dateTo.toISOString() : dateTo));
  }
  
  if (search) {
    conditions.push(
      or(
        sql`${tickets.title} LIKE ${`%${search}%`}`,
        sql`${tickets.description} LIKE ${`%${search}%`}`
      )
    );
  }
  
  const result = await db.select()
    .from(tickets)
    .where(and(...conditions))
    .orderBy(desc(tickets.createdAt))
    .limit(pageSize)
    .offset(offset);
  
  // Contar total
  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(tickets)
    .where(and(...conditions));
  
  return {
    tickets: result,
    total: countResult[0]?.count || 0
  };
}

export async function listTicketsForClient(
  organizationId: number,
  userId: number,
  filters: ListFilters
): Promise<{ tickets: Ticket[]; total: number }> {
  const db = await getDb();
  if (!db) return { tickets: [], total: 0 };
  const { status, ticketType, priority, search, dateFrom, dateTo, page = 1, pageSize = 20 } = filters;
  const offset = (page - 1) * pageSize;
  
  const conditions: any[] = [
    eq(tickets.organizationId, organizationId),
    eq(tickets.createdById, userId)
  ];
  
  if (status) {
    conditions.push(eq(tickets.status, status as any));
  }
  
  if (ticketType) {
    conditions.push(eq(tickets.ticketType, ticketType as any));
  }
  
  if (priority) {
    conditions.push(eq(tickets.priority, priority as any));
  }
  
  if (dateFrom) {
    conditions.push(gte(tickets.createdAt, dateFrom instanceof Date ? dateFrom.toISOString() : dateFrom));
  }
  
  if (dateTo) {
    conditions.push(lte(tickets.createdAt, dateTo instanceof Date ? dateTo.toISOString() : dateTo));
  }
  
  if (search) {
    conditions.push(
      or(
        sql`${tickets.title} LIKE ${`%${search}%`}`,
        sql`${tickets.description} LIKE ${`%${search}%`}`
      )
    );
  }
  
  const result = await db.select()
    .from(tickets)
    .where(and(...conditions))
    .orderBy(desc(tickets.createdAt))
    .limit(pageSize)
    .offset(offset);
  
  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(tickets)
    .where(and(...conditions));
  
  return {
    tickets: result,
    total: countResult[0]?.count || 0
  };
}

// ==================== SPONSOR / CHAMADO ATIVO ====================

/**
 * Lista usuários considerados "sponsor" para receber chamados ativos.
 * Heurística: role em {sponsor, sponsor_organizacao, owner, responsavel} OU flag isSponsor.
 */
export async function listOrganizationSponsors(organizationId: number): Promise<Array<{ id: number; name: string; email: string | null }>> {
  const db = await getDb();
  if (!db) return [];

  // Tenta por coluna isSponsor (se existir) com fallback para role
  try {
    const rows = await db.select({ id: users.id, name: users.name, email: (users as any).email })
      .from(users)
      .where(and(
        eq(users.organizationId, organizationId),
        or(
          // @ts-ignore - pode não existir em alguns schemas
          eq((users as any).isSponsor, 1),
          inArray(users.role as any, ['sponsor', 'sponsor_organizacao', 'owner', 'responsavel', 'admin_organizacao'] as any)
        )
      ))
      .orderBy(users.name);
    return rows as any;
  } catch (e) {
    // Fallback: qualquer usuário com role admin_organizacao/owner
    const rows = await db.select({ id: users.id, name: users.name, email: (users as any).email })
      .from(users)
      .where(and(
        eq(users.organizationId, organizationId),
        inArray(users.role as any, ['admin_organizacao', 'owner', 'sponsor'] as any)
      ))
      .orderBy(users.name);
    return rows as any;
  }
}

export async function isUserInOrganization(userId: number, organizationId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const row = await db.select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.organizationId, organizationId)))
    .limit(1);
  return row.length > 0;
}

/**
 * Cria tarefa e evento de calendário para o sponsor (quando o consultor abre um "chamado ativo").
 * Integra com:
 * - Dashboard/NotificationCenter (via ticketNotificationService)
 * - Calendar (tabela ticket_calendar_events, se existir)
 */
export async function createClientTaskAndCalendarEvent(data: {
  ticketId: number;
  organizationId: number;
  sponsorUserId: number;
  title: string;
  dueAt: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // 1) Notificação interna
  try {
    await notifyOwner({
      title: 'Ação solicitada (MeuDPO)',
      content: `${data.title}\nPrazo: ${new Date(data.dueAt).toLocaleString('pt-BR')}\nAcesse: /meudpo/${data.ticketId}`
    });
  } catch (e) {
    logger.warn('[ClientTask] Falha ao notificar sponsor:', e);
  }

  // 2) Calendar event (se tabela existir)
  try {
    const { ticketCalendarEvents } = await import('../drizzle/schema');
    await db.insert(ticketCalendarEvents).values({
      organizationId: data.organizationId,
      userId: data.sponsorUserId,
      ticketId: data.ticketId,
      title: data.title,
      dueAt: data.dueAt,
      status: 'open',
      createdAt: new Date().toISOString()
    } as any);
  } catch (e) {
    // Se não existir, não falha
    logger.info('[ClientTask] ticketCalendarEvents indisponível, ignorando.');
  }
}

export async function notifySponsorAboutActiveTicket(ticketId: number, sponsorUserId: number, meta: { title: string; dueAt: string }): Promise<void> {
  // Email (se existir) + notificação interna
  try {
    const { getTicketEmailData, notifyTicketCreated } = await import('./emailService');
    const emailData = await getTicketEmailData(ticketId);
    if (emailData) {
      // Ajusta destinatário para sponsor (quando a infra permitir)
      await notifyTicketCreated(emailData);
    }
  } catch (e) {
    logger.info('[ActiveTicket] Email service indisponível/erro:', e);
  }

  try {
    await notifyOwner({
      title: 'Novo chamado ativo (MeuDPO)',
      content: `${meta.title}\nPrazo: ${new Date(meta.dueAt).toLocaleString('pt-BR')}\nAcesse: /meudpo/${ticketId}`
    });
  } catch (e) {
    logger.warn('[ActiveTicket] Falha ao notificar sponsor:', e);
  }
}

export async function listTicketsAssignedToUser(
  organizationId: number,
  userId: number,
  filters: ListFilters
): Promise<{ tickets: Ticket[]; total: number }> {
  const db = await getDb();
  if (!db) return { tickets: [], total: 0 };
  const { status, ticketType, priority, search, dateFrom, dateTo, page = 1, pageSize = 20 } = filters;
  const offset = (page - 1) * pageSize;
  
  const conditions: any[] = [
    eq(tickets.organizationId, organizationId),
    eq(tickets.assignedToId, userId)
  ];
  
  if (status) {
    conditions.push(eq(tickets.status, status as any));
  }
  
  if (ticketType) {
    conditions.push(eq(tickets.ticketType, ticketType as any));
  }
  
  if (priority) {
    conditions.push(eq(tickets.priority, priority as any));
  }
  
  if (dateFrom) {
    conditions.push(gte(tickets.createdAt, dateFrom instanceof Date ? dateFrom.toISOString() : dateFrom));
  }
  
  if (dateTo) {
    conditions.push(lte(tickets.createdAt, dateTo instanceof Date ? dateTo.toISOString() : dateTo));
  }
  
  if (search) {
    conditions.push(
      or(
        sql`${tickets.title} LIKE ${`%${search}%`}`,
        sql`${tickets.description} LIKE ${`%${search}%`}`
      )
    );
  }
  
  const result = await db.select()
    .from(tickets)
    .where(and(...conditions))
    .orderBy(desc(tickets.createdAt))
    .limit(pageSize)
    .offset(offset);
  
  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(tickets)
    .where(and(...conditions));
  
  return {
    tickets: result,
    total: countResult[0]?.count || 0
  };
}

// Listar todos os tickets (para admin_global)
export async function listAllTickets(
  filters: ListFilters & { organizationId?: number }
): Promise<{ tickets: Ticket[]; total: number }> {
  const db = await getDb();
  if (!db) return { tickets: [], total: 0 };
  const { status, ticketType, priority, search, assignedToId, dateFrom, dateTo, organizationId, page = 1, pageSize = 20 } = filters;
  const offset = (page - 1) * pageSize;
  
  const conditions: any[] = [];
  
  if (organizationId) {
    conditions.push(eq(tickets.organizationId, organizationId));
  }
  
  if (status) {
    conditions.push(eq(tickets.status, status as any));
  }
  
  if (ticketType) {
    conditions.push(eq(tickets.ticketType, ticketType as any));
  }
  
  if (priority) {
    conditions.push(eq(tickets.priority, priority as any));
  }
  
  if (assignedToId) {
    conditions.push(eq(tickets.assignedToId, assignedToId));
  }
  
  if (dateFrom) {
    conditions.push(gte(tickets.createdAt, dateFrom instanceof Date ? dateFrom.toISOString() : dateFrom));
  }
  
  if (dateTo) {
    conditions.push(lte(tickets.createdAt, dateTo instanceof Date ? dateTo.toISOString() : dateTo));
  }
  
  if (search) {
    conditions.push(
      or(
        sql`${tickets.title} LIKE ${`%${search}%`}`,
        sql`${tickets.description} LIKE ${`%${search}%`}`
      )
    );
  }
  
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  const result = await db.select()
    .from(tickets)
    .where(whereClause)
    .orderBy(desc(tickets.createdAt))
    .limit(pageSize)
    .offset(offset);
  
  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(tickets)
    .where(whereClause);
  
  return {
    tickets: result,
    total: countResult[0]?.count || 0
  };
}

// ==================== COMENTÁRIOS ====================

export async function addComment(data: InsertTicketComment): Promise<TicketComment> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  const [result] = await db.insert(ticketComments).values(data).returning({ id: ticketComments.id });
  
  return {
    id: result.id,
    ...data,
    createdAt: new Date().toISOString()
  } as TicketComment;
}

export async function getTicketComments(ticketId: number): Promise<(TicketComment & { authorName?: string })[]> {
  const db = await getDb();
  if (!db) return [];
  const comments = await db.select()
    .from(ticketComments)
    .where(eq(ticketComments.ticketId, ticketId))
    .orderBy(desc(ticketComments.createdAt));
  
  // Buscar nomes dos autores
  const commentsWithNames = await Promise.all(comments.map(async (comment) => {
    let authorName = "Usuário";
    if (comment.authorId) {
      const author = await db.select({ name: users.name }).from(users).where(eq(users.id, comment.authorId)).limit(1);
      if (author.length > 0 && author[0].name) {
        authorName = author[0].name;
      }
    }
    return { ...comment, authorName };
  }));
  
  return commentsWithNames;
}

// ==================== ANEXOS ====================

// Alias para compatibilidade
export const uploadAttachment = processAttachmentUpload;

export async function processAttachmentUpload(data: {
  ticketId: number;
  commentId?: number;
  organizationId: number;
  uploadedById: number;
  fileName: string;
  mimeType: string;
  fileContent: string;
}): Promise<TicketAttachment> {
  const { ticketId, commentId, organizationId, uploadedById, fileName, mimeType, fileContent } = data;
  
  // Converter base64 para buffer
  const fileBuffer = Buffer.from(fileContent, 'base64');
  
  // Gerar chave única para o arquivo
  const sanitizedFileName = fileName.replace(/\s+/g, '_');
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const fileKey = `${organizationId}/tickets/${ticketId}/${Date.now()}-${randomSuffix}-${sanitizedFileName}`;
  
  // Upload para S3
  const { url } = await storagePut(
    fileKey,
    fileBuffer,
    mimeType
  );
  
  // Salvar referência no banco
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  const [result] = await db.insert(ticketAttachments).values({
    ticketId,
    commentId: commentId || null,
    organizationId,
    uploadedById,
    filename: fileKey,
    originalFilename: fileName,
    mimeType,
    fileSize: fileBuffer.length,
    storageUrl: url
  }).returning({ id: ticketAttachments.id });
  
  // Integrar com GED - salvar na pasta meudpo/2.subsidios dos chamados
  try {
    await saveAttachmentToGed({
      organizationId,
      ticketId,
      uploadedById,
      fileName,
      mimeType,
      fileBuffer,
      storageUrl: url
    });
  } catch (error) {
    logger.error('[TicketService] Erro ao salvar no GED:', error);
    // Não falhar o upload se o GED falhar
  }
  
  return {
    id: result.id,
    ticketId,
    organizationId,
    uploadedById,
    filename: fileKey,
    originalFilename: fileName,
    mimeType,
    fileSize: fileBuffer.length,
    storageUrl: url,
    createdAt: new Date().toISOString()
  } as TicketAttachment;
}

/**
 * Salva o anexo do ticket no GED da organização
 * Pasta: meudpo/2.subsidios dos chamados/Ticket #{ticketId}
 */
async function saveAttachmentToGed(data: {
  organizationId: number;
  ticketId: number;
  uploadedById: number;
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
  storageUrl: string;
}): Promise<void> {
  const { organizationId, ticketId, uploadedById, fileName, mimeType, fileBuffer, storageUrl } = data;
  
  const db = await getDb();
  if (!db) return;
  
  // Buscar ou criar a estrutura de pastas no GED
  const gedUser: gedService.GedUser = {
    id: uploadedById,
    role: 'sponsor', // Assumir cliente para ter permissões mínimas
    organizationId
  };
  
  // 1. Buscar pasta raiz "meudpo" ou criar
  let meudpoFolder = await findOrCreateFolder(db, {
    name: 'meudpo',
    path: '/meudpo',
    organizationId,
    parentFolderId: null,
    createdById: uploadedById
  });
  
  // 2. Buscar ou criar pasta "2.subsidios dos chamados"
  let subsidiosFolder = await findOrCreateFolder(db, {
    name: '2.subsidios dos chamados',
    path: '/meudpo/2.subsidios dos chamados',
    organizationId,
    parentFolderId: meudpoFolder.id,
    createdById: uploadedById
  });
  
  // 3. Buscar ou criar pasta do ticket específico
  let ticketFolder = await findOrCreateFolder(db, {
    name: `Ticket #${ticketId}`,
    path: `/meudpo/2.subsidios dos chamados/Ticket #${ticketId}`,
    organizationId,
    parentFolderId: subsidiosFolder.id,
    createdById: uploadedById
  });
  
  // 4. Criar o documento no GED
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const extension = fileName.split('.').pop() || '';
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileKey = `ged/organization/${organizationId}/${timestamp}-${randomSuffix}-${sanitizedName}`;
  
  // Inserir documento no GED (reutilizando a URL do S3 já existente)
  const { gedDocuments } = await import('../drizzle/schema');
  await db.insert(gedDocuments).values({
    name: fileName,
    description: `Anexo do Ticket #${ticketId}`,
    spaceType: 'organization',
    organizationId,
    folderId: ticketFolder.id,
    fileName: fileName,
    fileKey: fileKey,
    fileUrl: storageUrl,
    fileSize: fileBuffer.length,
    mimeType,
    fileExtension: extension,
    version: 1,
    isLatestVersion: 1,
    status: 'active',
    tags: ['ticket', `ticket-${ticketId}`, 'subsidio'],
    linkedEntityType: 'ticket',
    linkedEntityId: ticketId,
    createdById: uploadedById,
    lastModifiedById: uploadedById
  });
}

/**
 * Arquiva automaticamente o ticket resolvido no GED (pasta: /meudpo/1.chamados concluidos/Ticket #X)
 * Inclui um relatório HTML com resumo + comentários (exclui comentários internos).
 */
export async function archiveClosedTicketToGED(ticketId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const ticket = await getTicketById(ticketId);
  if (!ticket) return;

  // Somente tickets resolvidos/cancelados são arquivados
  if (ticket.status !== 'resolvido' && ticket.status !== 'cancelado') return;

  const comments = await getTicketComments(ticketId);
  const publicComments = (comments ?? []).filter((c: any) => !c.isInternal);

  const html = generateTicketArchiveHTML({
    ticket,
    comments: publicComments,
  });

  const fileName = `Ticket-${ticket.ticketNumber ?? ticketId}-relatorio.html`;
  const fileBuffer = Buffer.from(html, 'utf-8');

  // 1) Storage
  const key = `meudpo/closed/${ticket.organizationId}/ticket-${ticketId}/${Date.now()}-${fileName}`;
  const { url } = await storagePut(key, fileBuffer, 'text/html');

  // 2) GED folders
  const createdById = (ticket as any).createdById ?? (ticket as any).assignedToId ?? 0;

  let meudpoFolder = await findOrCreateFolder(db, {
    name: 'meudpo',
    path: '/meudpo',
    organizationId: ticket.organizationId,
    parentFolderId: null,
    createdById
  });

  let closedFolder = await findOrCreateFolder(db, {
    name: '1.chamados concluidos',
    path: '/meudpo/1.chamados concluidos',
    organizationId: ticket.organizationId,
    parentFolderId: meudpoFolder.id,
    createdById
  });

  let ticketFolder = await findOrCreateFolder(db, {
    name: `Ticket #${ticket.ticketNumber ?? ticketId}`,
    path: `/meudpo/1.chamados concluidos/Ticket #${ticket.ticketNumber ?? ticketId}`,
    organizationId: ticket.organizationId,
    parentFolderId: closedFolder.id,
    createdById
  });

  // 3) GED document
  const { gedDocuments } = await import('../drizzle/schema');
  await db.insert(gedDocuments).values({
    name: fileName,
    description: `Relatório de encerramento do Ticket #${ticket.ticketNumber ?? ticketId}`,
    spaceType: 'organization',
    organizationId: ticket.organizationId,
    folderId: ticketFolder.id,
    fileName,
    fileKey: key,
    fileUrl: url,
    fileSize: fileBuffer.length,
    mimeType: 'text/html',
    fileExtension: 'html',
    version: 1,
    isLatestVersion: 1,
    status: 'active',
    tags: ['meudpo', 'ticket', 'concluido', `ticket-${ticketId}`],
    linkedEntityType: 'ticket',
    linkedEntityId: ticketId,
    createdById,
    lastModifiedById: createdById
  } as any);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateTicketArchiveHTML(args: { ticket: any; comments: any[] }): string {
  const { ticket, comments } = args;
  const ctx = ticket?.sourceContext ? JSON.stringify(ticket.sourceContext, null, 2) : '';
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MeuDPO - Ticket #${ticket.ticketNumber ?? ticket.id}</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 24px; color: #0f172a; }
    h1 { margin: 0 0 8px; }
    .meta { color: #475569; font-size: 13px; margin-bottom: 16px; }
    .box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0; }
    .label { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #64748b; margin-bottom: 6px; }
    pre { background: #0b1220; color: #e2e8f0; padding: 12px; border-radius: 10px; overflow: auto; }
    .comment { border-top: 1px solid #e2e8f0; padding: 12px 0; }
    .comment:first-child { border-top: none; padding-top: 0; }
    .who { font-weight: 600; }
    .when { color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Ticket #${ticket.ticketNumber ?? ticket.id}</h1>
  <div class="meta">Gerado automaticamente pelo MeuDPO • ${new Date().toLocaleString('pt-BR')}</div>

  <div class="box">
    <div class="label">Resumo</div>
    <div><strong>${escapeHtml(ticket.title ?? '')}</strong></div>
    <div class="meta">Tipo: ${escapeHtml(ticket.ticketType ?? '')} • Prioridade: ${escapeHtml(ticket.priority ?? '')} • Status: ${escapeHtml(ticket.status ?? '')}</div>
    ${ticket.resolution ? `<div class="label">Resolução</div><div>${escapeHtml(ticket.resolution)}</div>` : ''}
  </div>

  ${ticket.description ? `<div class="box"><div class="label">Descrição</div><div>${escapeHtml(ticket.description)}</div></div>` : ''}

  ${ctx ? `<div class="box"><div class="label">Contexto (JSON)</div><pre>${escapeHtml(ctx)}</pre></div>` : ''}

  <div class="box">
    <div class="label">Interações (comentários)</div>
    ${(comments ?? []).length ? (comments ?? []).map((c: any) => {
      return `<div class="comment">
        <div class="who">${escapeHtml(c.createdByName ?? 'Usuário')} <span class="when">• ${escapeHtml(new Date(c.createdAt).toLocaleString('pt-BR'))}</span></div>
        <div>${escapeHtml(c.content ?? '')}</div>
      </div>`;
    }).join('') : '<div class="meta">Nenhum comentário público registrado.</div>'}
  </div>
</body>
</html>`;
}

/**
 * Busca ou cria uma pasta no GED
 */
async function findOrCreateFolder(db: any, data: {
  name: string;
  path: string;
  organizationId: number;
  parentFolderId: number | null;
  createdById: number;
}): Promise<{ id: number }> {
  const { gedFolders } = await import('../drizzle/schema');
  
  // Buscar pasta existente
  const [existing] = await db.select()
    .from(gedFolders)
    .where(and(
      eq(gedFolders.organizationId, data.organizationId),
      eq(gedFolders.path, data.path),
      eq(gedFolders.spaceType, 'organization')
    ))
    .limit(1);
  
  if (existing) {
    return { id: existing.id };
  }
  
  // Criar nova pasta
  const depth = data.path.split('/').filter(Boolean).length - 1;
  const result = await db.insert(gedFolders).values({
    name: data.name,
    path: data.path,
    spaceType: 'organization',
    organizationId: data.organizationId,
    parentFolderId: data.parentFolderId,
    depth,
    isSystemFolder: true,
    icon: 'Folder',
    color: '#5f29cc',
    sortOrder: 0,
    createdById: data.createdById
  }) as any;
  
  return { id: extractInsertId(result) };
}

export async function getTicketAttachments(ticketId: number): Promise<TicketAttachment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select()
    .from(ticketAttachments)
    .where(eq(ticketAttachments.ticketId, ticketId))
    .orderBy(desc(ticketAttachments.createdAt));
}

// ==================== ANÁLISE COM IA ====================

export async function analyzeFileForSensitiveData(
  fileContent: string, 
  mimeType: string
): Promise<boolean> {
  try {
    // Apenas para documentos de texto
    if (mimeType.startsWith('text/') || mimeType === 'application/pdf' || mimeType.includes('document')) {
      const contentPreview = fileContent.substring(0, 2000);
      
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `Você é um especialista em proteção de dados. Analise o conteúdo e identifique se há dados pessoais sensíveis conforme LGPD (dados sobre origem racial ou étnica, convicção religiosa, opinião política, filiação sindical, questões de saúde ou vida sexual, dado genético ou biométrico). Responda apenas com 'sim' ou 'não'.`
          },
          {
            role: "user",
            content: `Analise este conteúdo e determine se contém dados pessoais sensíveis:\n\n${contentPreview}`
          }
        ]
      });
      
      const content = response.choices[0]?.message?.content;
      const llmResponse = typeof content === 'string' ? content.trim().toLowerCase() : '';
      return llmResponse === "sim";
    }
    
    // Por segurança, considerar outros tipos como sensíveis
    return true;
  } catch (error) {
    logger.error("Erro ao analisar arquivo:", error);
    return true; // Por segurança
  }
}

// ==================== NOTIFICAÇÕES ====================

export async function notifyTeamAboutUrgentTicket(ticketId: number, ticket: any): Promise<void> {
  await notifyOwner({
    title: `🚨 Ticket Urgente #${ticketId}`,
    content: `Novo ticket de alta prioridade: ${ticket.title}\nTipo: ${formatTicketType(ticket.ticketType)}\nPrioridade: ${ticket.priority}`
  });
}

export async function notifyAboutNewComment(comment: TicketComment, ticket: any): Promise<void> {
  // Notificar apenas se não for comentário interno
  if (!comment.isInternal) {
    await notifyOwner({
      title: `Novo comentário no Ticket #${ticket.id}`,
      content: `O ticket "${ticket.title}" recebeu um novo comentário.`
    });
  }
}

export async function notifyAboutNewAttachment(ticket: any, attachment: TicketAttachment): Promise<void> {
  await notifyOwner({
    title: `Novo anexo no Ticket #${ticket.id}`,
    content: `Arquivo "${attachment.originalFilename}" foi anexado ao ticket "${ticket.title}".`
  });
}

export async function notifyAboutStatusChange(
  ticketId: number, 
  oldStatus: string, 
  newStatus: string
): Promise<void> {
  await notifyOwner({
    title: `Status alterado - Ticket #${ticketId}`,
    content: `Status alterado de "${formatStatus(oldStatus)}" para "${formatStatus(newStatus)}".`
  });
}

export async function sendResolutionNotification(ticketId: number, userId: number): Promise<void> {
  // Implementar envio de e-mail ao cliente sobre resolução
  logger.info(`Enviando notificação de resolução do ticket ${ticketId} para usuário ${userId}`);
}

export async function notifyAssignment(ticketId: number, assignedToId: number): Promise<void> {
  await notifyOwner({
    title: `Ticket #${ticketId} atribuído`,
    content: `Você foi atribuído como responsável pelo ticket.`
  });
}

// ==================== MÉTRICAS ====================

export async function getDashboardMetrics(organizationId: number | null, period: string) {
  const db = await getDb();
  if (!db) return { openTickets: 0, overdueTickets: 0, resolvedInPeriod: 0, totalInPeriod: 0, ticketsByType: [], ticketsByStatus: [], period };
  const now = new Date();
  let startDate: Date;
  
  switch (period) {
    case 'ultimos_7_dias':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'ultimos_30_dias':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'este_mes':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'este_ano':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  
  const baseConditions = organizationId ? [eq(tickets.organizationId, organizationId)] : [];
  
  // Tickets abertos
  const openTickets = await db.select({ count: sql<number>`count(*)` })
    .from(tickets)
    .where(and(
      ...baseConditions,
      inArray(tickets.status, ['novo', 'em_analise', 'aguardando_cliente', 'aguardando_terceiro'])
    ));
  
  // Tickets em atraso
  const overdueTickets = await db.select({ count: sql<number>`count(*)` })
    .from(tickets)
    .where(and(
      ...baseConditions,
      inArray(tickets.status, ['novo', 'em_analise', 'aguardando_cliente', 'aguardando_terceiro']),
      lte(tickets.deadline, now.toISOString())
    ));
  
  // Resolvidos no período
  const resolvedTickets = await db.select({ count: sql<number>`count(*)` })
    .from(tickets)
    .where(and(
      ...baseConditions,
      eq(tickets.status, 'resolvido'),
      gte(tickets.updatedAt, startDate.toISOString())
    ));
  
  // Total no período
  const totalTickets = await db.select({ count: sql<number>`count(*)` })
    .from(tickets)
    .where(and(
      ...baseConditions,
      gte(tickets.createdAt, startDate.toISOString())
    ));
  
  // Tickets por tipo
  const ticketsByType = await db.select({
    ticketType: tickets.ticketType,
    count: sql<number>`count(*)`
  })
    .from(tickets)
    .where(and(
      ...baseConditions,
      gte(tickets.createdAt, startDate.toISOString())
    ))
    .groupBy(tickets.ticketType);
  
  // Tickets por status
  const ticketsByStatus = await db.select({
    status: tickets.status,
    count: sql<number>`count(*)`
  })
    .from(tickets)
    .where(baseConditions.length > 0 ? and(...baseConditions) : undefined)
    .groupBy(tickets.status);
  
  return {
    openTickets: openTickets[0]?.count || 0,
    overdueTickets: overdueTickets[0]?.count || 0,
    resolvedInPeriod: resolvedTickets[0]?.count || 0,
    totalInPeriod: totalTickets[0]?.count || 0,
    ticketsByType,
    ticketsByStatus,
    period
  };
}

// ==================== FUNÇÕES AUXILIARES ====================

function formatTicketType(type: string): string {
  const labels: Record<string, string> = {
    solicitacao_titular: 'Solicitação de Titular',
    incidente_seguranca: 'Incidente de Segurança',
    duvida_juridica: 'Dúvida Jurídica',
    consultoria_geral: 'Consultoria Geral',
    auditoria: 'Auditoria',
    treinamento: 'Treinamento',
    documentacao: 'Documentação'
  };
  return labels[type] || type;
}

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    novo: 'Novo',
    em_analise: 'Em Análise',
    aguardando_cliente: 'Aguardando Cliente',
    aguardando_terceiro: 'Aguardando Terceiro',
    resolvido: 'Resolvido',
    cancelado: 'Cancelado'
  };
  return labels[status] || status;
}

// ==================== GERAÇÃO DE DOCUMENTOS (Placeholder) ====================

export async function generateLegalDocument(ticketId: number): Promise<string | null> {
  // Placeholder - implementar geração de PDF quando necessário
  logger.info(`Gerando documento legal para ticket ${ticketId}`);
  return null;
}

export async function generateInitialIncidentReport(ticketId: number): Promise<void> {
  // Placeholder - implementar geração de relatório de incidente
  logger.info(`Gerando relatório inicial de incidente para ticket ${ticketId}`);
}


// ==================== FUNÇÕES DE VALIDAÇÃO E UTILIDADE ====================

// Tipos válidos de ticket
const VALID_TICKET_TYPES = ['solicitacao_titular', 'incidente_seguranca', 'duvida_juridica', 'consultoria_geral', 'auditoria', 'treinamento', 'documentacao'];

// Prioridades válidas
const VALID_PRIORITIES = ['baixa', 'media', 'alta', 'critica'];

// Transições de status válidas
const STATUS_TRANSITIONS: Record<string, string[]> = {
  novo: ['em_analise', 'cancelado'],
  em_analise: ['aguardando_cliente', 'aguardando_terceiro', 'resolvido', 'cancelado'],
  aguardando_cliente: ['em_analise', 'resolvido', 'cancelado'],
  aguardando_terceiro: ['em_analise', 'resolvido', 'cancelado'],
  resolvido: [],
  cancelado: []
};

// Objeto exportado com funções de utilidade para testes
export const ticketService = {
  // Calcular SLA baseado em prioridade e tipo
  calculateSLA(priority: string, ticketType: string): { slaLevel: string; deadline: Date } {
    let slaLevel: string;
    
    // Incidentes de segurança sempre urgentes
    if (ticketType === 'incidente_seguranca') {
      slaLevel = 'urgente';
    }
    // Solicitações de titular sempre prioritárias
    else if (ticketType === 'solicitacao_titular') {
      slaLevel = 'prioritario';
    }
    // Baseado na prioridade
    else {
      switch (priority) {
        case 'critica':
          slaLevel = 'urgente';
          break;
        case 'alta':
          slaLevel = 'prioritario';
          break;
        case 'media':
          slaLevel = 'padrao';
          break;
        case 'baixa':
        default:
          slaLevel = 'basico';
          break;
      }
    }
    
    // Calcular deadline
    const deadline = new Date();
    const hoursToAdd = {
      urgente: 24,
      prioritario: 48,
      padrao: 120,
      basico: 168 // 7 dias
    }[slaLevel] || 120;
    
    deadline.setHours(deadline.getHours() + hoursToAdd);
    
    return { slaLevel, deadline };
  },
  
  // Validar dados do ticket
  validateTicketData(data: {
    organizationId: number;
    title: string;
    description: string;
    ticketType: string;
    priority: string;
  }): void {
    if (!data.title || data.title.trim() === '') {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Título é obrigatório' });
    }
    
    if (!data.description || data.description.trim() === '') {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Descrição é obrigatória' });
    }
    
    if (!VALID_TICKET_TYPES.includes(data.ticketType)) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Tipo de ticket inválido' });
    }
    
    if (!VALID_PRIORITIES.includes(data.priority)) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Prioridade inválida' });
    }
  },
  
  // Verificar se usuário pode acessar ticket
  canUserAccessTicket(
    user: { id: number; role: string; organizationId: number | null },
    ticket: { organizationId: number; createdBy: number }
  ): boolean {
    // Admin global e consultores podem acessar todos
    if (user.role === 'admin_global' || user.role === 'consultor') {
      return true;
    }
    
    // Criador do ticket sempre pode acessar
    if (user.id === ticket.createdBy) {
      return true;
    }
    
    // Cliente só pode acessar tickets da sua organização
    return user.organizationId === ticket.organizationId;
  },
  
  // Verificar se usuário pode gerenciar ticket
  canUserManageTicket(user: { id: number; role: string }): boolean {
    return user.role === 'admin_global' || user.role === 'consultor';
  },
  
  // Obter transições de status válidas
  getStatusTransitions(currentStatus: string): string[] {
    return STATUS_TRANSITIONS[currentStatus] || [];
  },
  
  // Formatar número do ticket
  formatTicketNumber(id: number): string {
    return `TKT-${id.toString().padStart(6, '0')}`;
  },
  
  // Verificar se ticket está em atraso
  isTicketOverdue(deadline: Date, status: string): boolean {
    // Tickets finalizados não podem estar em atraso
    if (status === 'resolvido' || status === 'cancelado') {
      return false;
    }
    
    return deadline < new Date();
  }
};


// ==================== CONFIGURAÇÕES DE SLA ====================

export interface MeudpoSettingsData {
  slaUrgentHours: number;
  slaPrioritarioHours: number;
  slaPadraoHours: number;
  notifyOnCreate: boolean;
  notifyOnUpdate: boolean;
  notifyOnResolve: boolean;
  autoReportFrequency: 'diario' | 'semanal' | 'mensal' | 'desativado';
  autoReportRecipients: string[];
  customCategories: string[];
  autoAssignEnabled: boolean;
  autoAssignRules: {
    ticketType?: string;
    priority?: string;
    assignToUserId?: number;
  }[];
}

const DEFAULT_SETTINGS: MeudpoSettingsData = {
  slaUrgentHours: 24,
  slaPrioritarioHours: 48,
  slaPadraoHours: 120,
  notifyOnCreate: true,
  notifyOnUpdate: true,
  notifyOnResolve: true,
  autoReportFrequency: 'semanal',
  autoReportRecipients: [],
  customCategories: [],
  autoAssignEnabled: false,
  autoAssignRules: []
};

export async function getOrganizationSettings(organizationId: number): Promise<MeudpoSettingsData> {
  const db = await getDb();
  if (!db) return DEFAULT_SETTINGS;
  
  const result = await db.select()
    .from(meudpoSettings)
    .where(eq(meudpoSettings.organizationId, organizationId))
    .limit(1);
  
  if (result.length === 0) {
    return DEFAULT_SETTINGS;
  }
  
  const settings = result[0] as any;
  return {
    slaUrgentHours: settings.slaUrgentHours || settings.slaCritica || 24,
    slaPrioritarioHours: settings.slaPrioritarioHours || settings.slaAlta || 48,
    slaPadraoHours: settings.slaPadraoHours || settings.slaMedia || 120,
    notifyOnCreate: settings.notifyOnCreate ?? true,
    notifyOnUpdate: settings.notifyOnUpdate ?? true,
    notifyOnResolve: settings.notifyOnResolve ?? true,
    autoReportFrequency: (settings.autoReportFrequency || 'semanal') as MeudpoSettingsData['autoReportFrequency'],
    autoReportRecipients: (settings.reportRecipients || settings.autoReportRecipients || []) as string[],
    customCategories: (settings.customCategories || []) as string[],
    autoAssignEnabled: settings.autoAssignEnabled || false,
    autoAssignRules: settings.autoAssignRules || []
  };
}

export async function saveOrganizationSettings(organizationId: number, data: Partial<MeudpoSettingsData>): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  // Verificar se já existe configuração
  const existing = await db.select({ id: meudpoSettings.id })
    .from(meudpoSettings)
    .where(eq(meudpoSettings.organizationId, organizationId))
    .limit(1);
  
  const updateData = {
    slaUrgentHours: data.slaUrgentHours,
    slaPrioritarioHours: data.slaPrioritarioHours,
    slaPadraoHours: data.slaPadraoHours,
    notifyOnCreate: data.notifyOnCreate,
    notifyOnUpdate: data.notifyOnUpdate,
    notifyOnResolve: data.notifyOnResolve,
    autoReportFrequency: data.autoReportFrequency,
    autoReportRecipients: data.autoReportRecipients,
    customCategories: data.customCategories
  };
  
  if (existing.length > 0) {
    await db.update(meudpoSettings)
      .set(updateData as any)
      .where(eq(meudpoSettings.organizationId, organizationId));
  } else {
    await db.insert(meudpoSettings).values({
      organizationId,
      ...updateData
    } as any);
  }
}

// ==================== ATRIBUIÇÃO AUTOMÁTICA ====================

export async function getAvailableConsultants(organizationId: number): Promise<{ id: number; name: string; ticketCount: number }[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar consultores e admin_global
  const consultants = await db.select({
    id: users.id,
    name: users.name
  })
    .from(users)
    .where(
      sql`${users.role} IN ('consultor', 'admin_global')`
    );
  
  // Contar tickets atribuídos a cada consultor (não resolvidos)
  const result = await Promise.all(
    consultants.map(async (consultant) => {
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(tickets)
        .where(
          and(
            eq(tickets.assignedToId, consultant.id),
            sql`${tickets.status} NOT IN ('resolvido', 'cancelado')`
          )
        );
      
      return {
        id: consultant.id,
        name: consultant.name || 'Consultor',
        ticketCount: Number(countResult[0]?.count || 0)
      };
    })
  );
  
  // Ordenar por quantidade de tickets (menor primeiro)
  return result.sort((a, b) => a.ticketCount - b.ticketCount);
}

export async function autoAssignTicket(ticketId: number, organizationId: number, ticketType: string, priority: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  
  const settings = await getOrganizationSettings(organizationId);
  
  if (!settings.autoAssignEnabled) {
    return null;
  }
  
  // Verificar regras de atribuição
  const matchingRule = settings.autoAssignRules.find(rule => {
    const typeMatch = !rule.ticketType || rule.ticketType === ticketType;
    const priorityMatch = !rule.priority || rule.priority === priority;
    return typeMatch && priorityMatch && rule.assignToUserId;
  });
  
  if (matchingRule && matchingRule.assignToUserId) {
    // Atribuir conforme regra
    await db.update(tickets)
      .set({ assignedToId: matchingRule.assignToUserId })
      .where(eq(tickets.id, ticketId));
    return matchingRule.assignToUserId;
  }
  
  // Se não há regra específica, atribuir ao consultor com menos tickets
  const consultants = await getAvailableConsultants(organizationId);
  
  if (consultants.length > 0) {
    const leastBusy = consultants[0];
    await db.update(tickets)
      .set({ assignedToId: leastBusy.id })
      .where(eq(tickets.id, ticketId));
    return leastBusy.id;
  }
  
  return null;
}

// Função para calcular SLA usando configurações personalizadas
export async function calculateSLAWithSettings(
  ticketData: InsertTicket & { slaLevel: string },
  organizationId: number
): Promise<InsertTicket & { deadline: string }> {
  const settings = await getOrganizationSettings(organizationId);
  
  const slaHours: Record<string, number> = {
    urgente: settings.slaUrgentHours,
    prioritario: settings.slaPrioritarioHours,
    padrao: settings.slaPadraoHours
  };
  
  const now = new Date();
  const hoursToAdd = slaHours[ticketData.slaLevel] || slaHours.padrao;
  
  // Calcular deadline considerando dias úteis
  const deadline = new Date(now);
  let businessHoursLeft = hoursToAdd;
  
  while (businessHoursLeft > 0) {
    deadline.setHours(deadline.getHours() + 1);
    businessHoursLeft--;
    
    // Pular finais de semana
    const dayOfWeek = deadline.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      deadline.setHours(deadline.getHours() + 24);
    }
  }
  
  return {
    ...ticketData,
    deadline: deadline.toISOString()
  };
}


// ==================== ESCALONAMENTO AUTOMÁTICO ====================

export interface EscalationRule {
  percentageThreshold: number; // % do SLA consumido para escalonar
  escalateToRole: 'senior' | 'manager' | 'admin_global';
  notifyManager: boolean;
  notifyOwner: boolean;
}

const DEFAULT_ESCALATION_RULES: EscalationRule[] = [
  { percentageThreshold: 75, escalateToRole: 'senior', notifyManager: false, notifyOwner: false },
  { percentageThreshold: 90, escalateToRole: 'manager', notifyManager: true, notifyOwner: false },
  { percentageThreshold: 100, escalateToRole: 'admin_global', notifyManager: true, notifyOwner: true }
];

export async function checkTicketEscalation(ticketId: number): Promise<{
  shouldEscalate: boolean;
  escalationLevel: number;
  percentageConsumed: number;
  rule?: EscalationRule;
}> {
  const db = await getDb();
  if (!db) return { shouldEscalate: false, escalationLevel: 0, percentageConsumed: 0 };
  
  const [ticket] = await db.select()
    .from(tickets)
    .where(eq(tickets.id, ticketId));
  
  if (!ticket || !ticket.deadline || ticket.status === 'resolvido' || ticket.status === 'cancelado') {
    return { shouldEscalate: false, escalationLevel: 0, percentageConsumed: 0 };
  }
  
  const now = new Date();
  const createdAt = new Date(ticket.createdAt);
  const deadline = new Date(ticket.deadline);
  
  const totalTime = deadline.getTime() - createdAt.getTime();
  const elapsedTime = now.getTime() - createdAt.getTime();
  const percentageConsumed = Math.min(100, Math.round((elapsedTime / totalTime) * 100));
  
  // Verificar qual regra de escalonamento se aplica
  const applicableRule = DEFAULT_ESCALATION_RULES
    .filter(rule => percentageConsumed >= rule.percentageThreshold)
    .sort((a, b) => b.percentageThreshold - a.percentageThreshold)[0];
  
  if (applicableRule) {
    return {
      shouldEscalate: true,
      escalationLevel: DEFAULT_ESCALATION_RULES.indexOf(applicableRule) + 1,
      percentageConsumed,
      rule: applicableRule
    };
  }
  
  return { shouldEscalate: false, escalationLevel: 0, percentageConsumed };
}

export async function escalateTicket(ticketId: number, organizationId: number): Promise<{
  success: boolean;
  newAssigneeId?: number;
  notificationsSent: string[];
}> {
  const db = await getDb();
  if (!db) return { success: false, notificationsSent: [] };
  
  const escalationCheck = await checkTicketEscalation(ticketId);
  if (!escalationCheck.shouldEscalate || !escalationCheck.rule) {
    return { success: false, notificationsSent: [] };
  }
  
  const notificationsSent: string[] = [];
  
  // Buscar ticket atual
  const [ticket] = await db.select()
    .from(tickets)
    .where(eq(tickets.id, ticketId));
  
  if (!ticket) return { success: false, notificationsSent: [] };
  
  // Buscar novo responsável baseado no nível de escalonamento
  let newAssigneeId: number | undefined;
  
  if (escalationCheck.rule.escalateToRole === 'admin_global') {
    // Buscar admin global
    const [admin] = await db.select()
      .from(users)
      .where(eq(users.role, 'admin_global'))
      .limit(1);
    newAssigneeId = admin?.id;
  } else {
    // Buscar consultor sênior ou gerente da organização
    const consultants = await db.select()
      .from(users)
      .where(
        and(
          eq(users.role, 'consultor'),
          eq(users.organizationId, organizationId)
        )
      )
      .limit(1);
    newAssigneeId = consultants[0]?.id;
  }
  
  // Atualizar ticket
  const updateData: any = {
    updatedAt: new Date().toISOString()
  };
  
  if (newAssigneeId) {
    updateData.assignedToId = newAssigneeId;
  }
  
  await db.update(tickets)
    .set(updateData)
    .where(eq(tickets.id, ticketId));
  
  // Adicionar comentário de escalonamento
  await db.insert(ticketComments).values({
    ticketId,
    organizationId,
    authorId: 1, // Sistema
    authorRole: 'admin',
    content: `⚠️ **Escalonamento Automático**\n\nEste ticket foi escalonado automaticamente.\n- **Motivo:** ${escalationCheck.percentageConsumed}% do SLA consumido\n- **Nível:** ${escalationCheck.escalationLevel}\n- **Ação:** ${escalationCheck.rule.escalateToRole === 'admin_global' ? 'Escalado para Admin Global' : 'Escalado para consultor sênior'}`,
    isInternal: 1
  });
  
  notificationsSent.push('comment_added');
  
  // Enviar notificações
  if (escalationCheck.rule.notifyOwner) {
    try {
      await notifyOwner({
        title: `🚨 Ticket #${ticketId} - SLA Crítico`,
        content: `O ticket "${ticket.title}" está com ${escalationCheck.percentageConsumed}% do SLA consumido e foi escalonado automaticamente.`
      });
      notificationsSent.push('owner_notified');
    } catch (e) {
      logger.error('Erro ao notificar owner:', e);
    }
  }
  
  return {
    success: true,
    newAssigneeId,
    notificationsSent
  };
}

export async function processAllPendingEscalations(): Promise<{
  processed: number;
  escalated: number;
  errors: number;
}> {
  const db = await getDb();
  if (!db) return { processed: 0, escalated: 0, errors: 0 };
  
  // Buscar todos os tickets não resolvidos
  const pendingTickets = await db.select()
    .from(tickets)
    .where(
      and(
        sql`${tickets.status} NOT IN ('resolvido', 'cancelado')`,
        sql`${tickets.deadline} IS NOT NULL`
      )
    );
  
  let processed = 0;
  let escalated = 0;
  let errors = 0;
  
  for (const ticket of pendingTickets) {
    processed++;
    try {
      const check = await checkTicketEscalation(ticket.id);
      if (check.shouldEscalate) {
        const result = await escalateTicket(ticket.id, ticket.organizationId);
        if (result.success) {
          escalated++;
        }
      }
    } catch (e) {
      logger.error(`Erro ao processar escalonamento do ticket ${ticket.id}:`, e);
      errors++;
    }
  }
  
  return { processed, escalated, errors };
}

export async function getTicketSLAStatus(ticketId: number): Promise<{
  percentageConsumed: number;
  hoursRemaining: number;
  status: 'ok' | 'warning' | 'critical' | 'breached';
  deadline: Date | null;
}> {
  const db = await getDb();
  if (!db) return { percentageConsumed: 0, hoursRemaining: 0, status: 'ok', deadline: null };
  
  const [ticket] = await db.select()
    .from(tickets)
    .where(eq(tickets.id, ticketId));
  
  if (!ticket || !ticket.deadline) {
    return { percentageConsumed: 0, hoursRemaining: 0, status: 'ok', deadline: null };
  }
  
  const now = new Date();
  const createdAt = new Date(ticket.createdAt);
  const deadline = new Date(ticket.deadline);
  
  const totalTime = deadline.getTime() - createdAt.getTime();
  const elapsedTime = now.getTime() - createdAt.getTime();
  const percentageConsumed = Math.min(100, Math.round((elapsedTime / totalTime) * 100));
  
  const remainingMs = deadline.getTime() - now.getTime();
  const hoursRemaining = Math.max(0, Math.round(remainingMs / (1000 * 60 * 60)));
  
  let status: 'ok' | 'warning' | 'critical' | 'breached' = 'ok';
  if (percentageConsumed >= 100) {
    status = 'breached';
  } else if (percentageConsumed >= 90) {
    status = 'critical';
  } else if (percentageConsumed >= 75) {
    status = 'warning';
  }
  
  return { percentageConsumed, hoursRemaining, status, deadline };
}


// ==================== DASHBOARD DE PRODUTIVIDADE POR CONSULTOR ====================

export interface ConsultantProductivity {
  consultantId: number;
  consultantName: string;
  ticketsResolved: number;
  ticketsOpen: number;
  avgResponseTimeHours: number;
  avgResolutionTimeHours: number;
  slaComplianceRate: number;
  satisfactionScore: number;
  ticketsByPriority: Record<string, number>;
  ticketsByType: Record<string, number>;
}

export async function getConsultantProductivity(
  consultantId: number,
  startDate?: Date,
  endDate?: Date
): Promise<ConsultantProductivity | null> {
  const db = await getDb();
  if (!db) return null;
  
  // Buscar informações do consultor
  const [consultant] = await db.select()
    .from(users)
    .where(eq(users.id, consultantId));
  
  if (!consultant) return null;
  
  // Construir filtros de data
  const dateFilters = [];
  if (startDate) {
    dateFilters.push(gte(tickets.createdAt, startDate instanceof Date ? startDate.toISOString() : startDate));
  }
  if (endDate) {
    dateFilters.push(lte(tickets.createdAt, endDate instanceof Date ? endDate.toISOString() : endDate));
  }
  
  // Buscar tickets do consultor
  const consultantTickets = await db.select()
    .from(tickets)
    .where(
      and(
        eq(tickets.assignedToId, consultantId),
        ...dateFilters
      )
    );
  
  // Calcular métricas
  const resolvedTickets = consultantTickets.filter(t => t.status === 'resolvido');
  const openTickets = consultantTickets.filter(t => t.status !== 'resolvido' && t.status !== 'cancelado');
  
  // Tempo médio de resposta (primeiro comentário após criação)
  let totalResponseTime = 0;
  let responseCount = 0;
  
  for (const ticket of consultantTickets) {
    const [firstComment] = await db.select()
      .from(ticketComments)
      .where(
        and(
          eq(ticketComments.ticketId, ticket.id),
          eq(ticketComments.authorId, consultantId)
        )
      )
      .orderBy(ticketComments.createdAt)
      .limit(1);
    
    if (firstComment) {
      const responseTime = new Date(firstComment.createdAt).getTime() - new Date(ticket.createdAt).getTime();
      totalResponseTime += responseTime;
      responseCount++;
    }
  }
  
  const avgResponseTimeHours = responseCount > 0 
    ? Math.round((totalResponseTime / responseCount) / (1000 * 60 * 60) * 10) / 10 
    : 0;
  
  // Tempo médio de resolução
  let totalResolutionTime = 0;
  for (const ticket of resolvedTickets) {
    if (ticket.updatedAt) {
      const resolutionTime = new Date(ticket.updatedAt).getTime() - new Date(ticket.createdAt).getTime();
      totalResolutionTime += resolutionTime;
    }
  }
  
  const avgResolutionTimeHours = resolvedTickets.length > 0 
    ? Math.round((totalResolutionTime / resolvedTickets.length) / (1000 * 60 * 60) * 10) / 10 
    : 0;
  
  // Taxa de conformidade com SLA
  let slaCompliant = 0;
  for (const ticket of resolvedTickets) {
    if (ticket.deadline && ticket.updatedAt) {
      if (new Date(ticket.updatedAt) <= new Date(ticket.deadline)) {
        slaCompliant++;
      }
    }
  }
  
  const slaComplianceRate = resolvedTickets.length > 0 
    ? Math.round((slaCompliant / resolvedTickets.length) * 100) 
    : 100;
  
  // Tickets por prioridade
  const ticketsByPriority: Record<string, number> = {};
  for (const ticket of consultantTickets) {
    const priority = ticket.priority || 'media';
    ticketsByPriority[priority] = (ticketsByPriority[priority] || 0) + 1;
  }
  
  // Tickets por tipo
  const ticketsByType: Record<string, number> = {};
  for (const ticket of consultantTickets) {
    const type = ticket.ticketType || 'consultoria_geral';
    ticketsByType[type] = (ticketsByType[type] || 0) + 1;
  }
  
  return {
    consultantId,
    consultantName: consultant.name || 'Consultor',
    ticketsResolved: resolvedTickets.length,
    ticketsOpen: openTickets.length,
    avgResponseTimeHours,
    avgResolutionTimeHours,
    slaComplianceRate,
    satisfactionScore: 4.5, // TODO: Implementar sistema de avaliação
    ticketsByPriority,
    ticketsByType
  };
}

export async function getAllConsultantsProductivity(
  organizationId?: number,
  startDate?: Date,
  endDate?: Date
): Promise<ConsultantProductivity[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar todos os consultores
  const consultantsQuery = db.select()
    .from(users)
    .where(
      and(
        eq(users.role, 'consultor'),
        eq(users.isActive, 1)
      )
    );
  
  const consultants = await consultantsQuery;
  
  const productivityData: ConsultantProductivity[] = [];
  
  for (const consultant of consultants) {
    const productivity = await getConsultantProductivity(consultant.id, startDate, endDate);
    if (productivity) {
      productivityData.push(productivity);
    }
  }
  
  // Ordenar por tickets resolvidos (maior primeiro)
  return productivityData.sort((a, b) => b.ticketsResolved - a.ticketsResolved);
}

export async function getProductivitySummary(
  organizationId?: number,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalConsultants: number;
  totalTicketsResolved: number;
  avgResponseTimeHours: number;
  avgResolutionTimeHours: number;
  overallSlaCompliance: number;
  topPerformers: { id: number; name: string; resolved: number }[];
}> {
  const allProductivity = await getAllConsultantsProductivity(organizationId, startDate, endDate);
  
  if (allProductivity.length === 0) {
    return {
      totalConsultants: 0,
      totalTicketsResolved: 0,
      avgResponseTimeHours: 0,
      avgResolutionTimeHours: 0,
      overallSlaCompliance: 100,
      topPerformers: []
    };
  }
  
  const totalTicketsResolved = allProductivity.reduce((sum, p) => sum + p.ticketsResolved, 0);
  const avgResponseTimeHours = Math.round(
    allProductivity.reduce((sum, p) => sum + p.avgResponseTimeHours, 0) / allProductivity.length * 10
  ) / 10;
  const avgResolutionTimeHours = Math.round(
    allProductivity.reduce((sum, p) => sum + p.avgResolutionTimeHours, 0) / allProductivity.length * 10
  ) / 10;
  const overallSlaCompliance = Math.round(
    allProductivity.reduce((sum, p) => sum + p.slaComplianceRate, 0) / allProductivity.length
  );
  
  const topPerformers = allProductivity
    .slice(0, 5)
    .map(p => ({ id: p.consultantId, name: p.consultantName, resolved: p.ticketsResolved }));
  
  return {
    totalConsultants: allProductivity.length,
    totalTicketsResolved,
    avgResponseTimeHours,
    avgResolutionTimeHours,
    overallSlaCompliance,
    topPerformers
  };
}


// ============================================
// TEMPLATES DE RESPOSTA RÁPIDA
// ============================================

export async function getResponseTemplates(organizationId?: number): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const conditions = organizationId 
    ? or(eq(responseTemplates.organizationId, organizationId), isNull(responseTemplates.organizationId))
    : isNull(responseTemplates.organizationId);
  
  const templates = await db
    .select()
    .from(responseTemplates)
    .where(and(eq(responseTemplates.isGlobal, 1), conditions))
    .orderBy(desc(responseTemplates.usageCount));
  
  return templates;
}

export async function createResponseTemplate(data: {
  organizationId?: number;
  title: string;
  content: string;
  category: string;
  ticketType?: string;
  createdById: number;
}): Promise<any> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const result = await db.insert(responseTemplates).values({
    organizationId: data.organizationId,
    createdById: data.createdById,
    title: data.title,
    content: data.content,
    category: data.category || null,
    ticketType: data.ticketType || null,
    isGlobal: 0,
    usageCount: 0
  }).returning({ id: responseTemplates.id });
  
  const insertId = Number(result[0].id);
  return { id: insertId, ...data };
}

export async function updateResponseTemplate(
  templateId: number,
  data: {
    title?: string;
    content?: string;
    category?: string;
    ticketType?: string;
    isActive?: boolean;
  }
): Promise<any> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.ticketType !== undefined) updateData.ticketType = data.ticketType;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  
  await db.update(responseTemplates)
    .set(updateData)
    .where(eq(responseTemplates.id, templateId));
  
  return { id: templateId, ...data };
}

export async function deleteResponseTemplate(templateId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.update(responseTemplates)
    .set({ isGlobal: 0 })
    .where(eq(responseTemplates.id, templateId));
  
  return true;
}

export async function incrementTemplateUsage(templateId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.update(responseTemplates)
    .set({ 
      usageCount: sql`usage_count + 1`
    })
    .where(eq(responseTemplates.id, templateId));
}

export async function getTemplatesByCategory(category: string, organizationId?: number): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const conditions = organizationId 
    ? or(eq(responseTemplates.organizationId, organizationId), isNull(responseTemplates.organizationId))
    : isNull(responseTemplates.organizationId);
  
  const templates = await db
    .select()
    .from(responseTemplates)
    .where(and(
      eq(responseTemplates.isGlobal, 1),
      eq(responseTemplates.category, category),
      conditions
    ))
    .orderBy(desc(responseTemplates.usageCount));
  
  return templates;
}

export async function getTemplateCategories(): Promise<string[]> {
  return [
    "saudacao",
    "solicitacao_informacao",
    "encaminhamento",
    "resolucao",
    "agradecimento",
    "prazo",
    "documentacao",
    "lgpd",
    "incidente",
    "outro"
  ];
}

export async function getSuggestedTemplates(ticketType: string, organizationId?: number): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const conditions = organizationId 
    ? or(eq(responseTemplates.organizationId, organizationId), isNull(responseTemplates.organizationId))
    : isNull(responseTemplates.organizationId);
  
  // Buscar templates específicos para o tipo de ticket
  const specificTemplates = await db
    .select()
    .from(responseTemplates)
    .where(and(
      eq(responseTemplates.isGlobal, 1),
      eq(responseTemplates.ticketType, ticketType),
      conditions
    ))
    .orderBy(desc(responseTemplates.usageCount))
    .limit(5);
  
  // Se não houver suficientes, buscar templates gerais mais usados
  if (specificTemplates.length < 5) {
    const generalTemplates = await db
      .select()
      .from(responseTemplates)
      .where(and(
        eq(responseTemplates.isGlobal, 1),
        isNull(responseTemplates.ticketType),
        conditions
      ))
      .orderBy(desc(responseTemplates.usageCount))
      .limit(5 - specificTemplates.length);
    
    return [...specificTemplates, ...generalTemplates];
  }
  
  return specificTemplates;
}


/**
 * Registra ação no audit log imutável (append-only).
 * Deve ser chamado em TODA mutação relevante (status, assign, comentário, anexos, SLA escalation, etc.).
 */
export async function auditTicketAction(params: {
  ticketId: number;
  action: string;
  actor?: { id: number; role?: string | null } | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const { ticketId, action, actor, payload = {} } = params;
  await appendTicketAuditLog({
    db,
    ticketId,
    action,
    actorId: actor?.id ?? null,
    actorRole: actor?.role ?? null,
    payload
  });
}
