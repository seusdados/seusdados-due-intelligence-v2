import { logger } from "./_core/logger";
/**
 * Seusdados Due Diligence - Incident Integration Service
 * Integração bidirecional entre MeuDPO (tickets) e Painel de Controle de Incidentes
 */

import { getDb } from "./db";
import { tickets, incidents, incidentLogs, ticketComments, users } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import * as incidentService from "./incidentService";
import * as ticketService from "./ticketService";

// ==================== CONSTANTES ====================

// Tipos de ticket que disparam criação de incidente
export const INCIDENT_TICKET_TYPES = ['incidente_seguranca'];

// Mapeamento de prioridade do ticket para nível de risco do incidente
const PRIORITY_TO_RISK_LEVEL: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
  baixa: 'low',
  media: 'medium',
  alta: 'high',
  critica: 'critical'
};

// Mapeamento de status do incidente para status do ticket
const INCIDENT_STATUS_TO_TICKET_STATUS: Record<string, string> = {
  standby: 'novo',
  active: 'em_analise',
  contained: 'em_analise',
  remediated: 'aguardando_cliente',
  closed: 'resolvido'
};

// ==================== FUNÇÕES AUXILIARES ====================

/**
 * Adiciona um comentário do sistema no ticket
 */
async function addSystemCommentToTicket(
  ticketId: number,
  organizationId: number,
  userId: number,
  content: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(ticketComments).values({
    ticketId,
    organizationId,
    authorId: userId,
    authorRole: 'admin',
    content,
    isInternal: 0,
  });
}

// ==================== FUNÇÕES DE INTEGRAÇÃO ====================

/**
 * Verifica se um ticket deve criar um incidente automaticamente
 */
export function shouldCreateIncident(ticketType: string): boolean {
  return INCIDENT_TICKET_TYPES.includes(ticketType);
}

/**
 * Cria um incidente automaticamente a partir de um ticket
 * Chamado quando um ticket do tipo 'incidente_seguranca' é criado
 */
export async function createIncidentFromTicket(ticketId: number, userId: number): Promise<number | null> {
  const db = await getDb();
  if (!db) {
    logger.error(`[IncidentIntegration] Database not available`);
    return null;
  }
  
  // Buscar dados do ticket
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
  if (!ticket) {
    logger.error(`[IncidentIntegration] Ticket ${ticketId} não encontrado`);
    return null;
  }
  
  // Verificar se já existe incidente vinculado
  if (ticket.incidentId) {
    logger.info(`[IncidentIntegration] Ticket ${ticketId} já possui incidente vinculado: ${ticket.incidentId}`);
    return ticket.incidentId;
  }
  
  // Buscar nome do usuário
  let userName = "Sistema";
  const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId));
  if (user?.name) {
    userName = user.name;
  }
  
  const now = new Date();
  
  // Criar incidente
  const incident = await incidentService.createIncident({
    organizationId: ticket.organizationId,
    title: `[MeuDPO #${ticket.ticketNumber}] ${ticket.title}`,
    description: ticket.description,
    detectedAt: now,
    knowledgeAt: now,
    riskLevel: PRIORITY_TO_RISK_LEVEL[ticket.priority] || 'medium',
    createdById: userId,
  });
  
  if (!incident) {
    logger.error(`[IncidentIntegration] Falha ao criar incidente para ticket ${ticketId}`);
    return null;
  }
  
  // Vincular ticket ao incidente
  await db.update(tickets)
    .set({ incidentId: incident.id })
    .where(eq(tickets.id, ticketId));
  
  // Vincular incidente ao ticket
  await db.update(incidents)
    .set({ ticketId: ticketId })
    .where(eq(incidents.id, incident.id));
  
  // Adicionar comentário no ticket informando criação do incidente
  await addSystemCommentToTicket(
    ticketId,
    ticket.organizationId,
    userId,
    `🚨 **Protocolo de Incidente Iniciado**\n\nUm incidente de segurança foi automaticamente criado no Painel de Controle de Incidentes.\n\n**ID do Incidente:** #${incident.id}\n**Status:** Ativo\n**Nível de Risco:** ${incident.riskLevel}\n\nTodas as ações realizadas no Painel de Controle serão sincronizadas automaticamente com este chamado.`
  );
  
  // Adicionar log no incidente
  await incidentService.addLogEntry({
    incidentId: incident.id,
    message: `Incidente criado automaticamente a partir do chamado MeuDPO #${ticket.ticketNumber}`,
    type: 'system',
    userId: userId,
    userName: userName,
  });
  
  logger.info(`[IncidentIntegration] Incidente ${incident.id} criado para ticket ${ticketId}`);
  return incident.id;
}

/**
 * Sincroniza mudança de fase do incidente para o ticket
 */
export async function syncPhaseChangeToTicket(
  incidentId: number, 
  phaseId: number, 
  phaseName: string,
  userId: number,
  userName: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // Buscar incidente e ticket vinculado
  const [incident] = await db.select().from(incidents).where(eq(incidents.id, incidentId));
  if (!incident || !incident.ticketId) {
    logger.info(`[IncidentIntegration] Incidente ${incidentId} não possui ticket vinculado`);
    return;
  }
  
  // Buscar ticket
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, incident.ticketId));
  if (!ticket) {
    logger.info(`[IncidentIntegration] Ticket ${incident.ticketId} não encontrado`);
    return;
  }
  
  // Adicionar comentário no ticket
  await addSystemCommentToTicket(
    ticket.id,
    ticket.organizationId,
    userId,
    `📋 **Fase do Incidente Atualizada**\n\nO incidente avançou para a fase: **${phaseName}** (Fase ${phaseId}/5)`
  );
  
  logger.info(`[IncidentIntegration] Mudança de fase ${phaseId} sincronizada para ticket ${ticket.id}`);
}

/**
 * Sincroniza item de checklist completado para o ticket
 */
export async function syncChecklistItemToTicket(
  incidentId: number,
  phaseId: number,
  itemId: string,
  itemTitle: string,
  isChecked: boolean,
  userId: number,
  userName: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // Buscar incidente e ticket vinculado
  const [incident] = await db.select().from(incidents).where(eq(incidents.id, incidentId));
  if (!incident || !incident.ticketId) {
    return;
  }
  
  // Buscar ticket
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, incident.ticketId));
  if (!ticket) {
    return;
  }
  
  const status = isChecked ? '✅ Concluído' : '⬜ Pendente';
  
  // Adicionar comentário no ticket
  await addSystemCommentToTicket(
    ticket.id,
    ticket.organizationId,
    userId,
    `📝 **Checklist do Incidente**\n\n${status}: ${itemTitle}`
  );
}

/**
 * Sincroniza log de atividade do incidente para o ticket
 */
export async function syncLogEntryToTicket(
  incidentId: number,
  logMessage: string,
  logType: string,
  userId: number,
  userName: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // Buscar incidente e ticket vinculado
  const [incident] = await db.select().from(incidents).where(eq(incidents.id, incidentId));
  if (!incident || !incident.ticketId) {
    return;
  }
  
  // Buscar ticket
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, incident.ticketId));
  if (!ticket) {
    return;
  }
  
  // Mapear tipo de log para emoji
  const logTypeEmoji: Record<string, string> = {
    action: '🔧',
    system: '⚙️',
    alert: '⚠️',
    communication: '📧'
  };
  
  const emoji = logTypeEmoji[logType] || '📌';
  
  // Adicionar comentário no ticket
  await addSystemCommentToTicket(
    ticket.id,
    ticket.organizationId,
    userId,
    `${emoji} **Log do Incidente**\n\n${logMessage}`
  );
}

/**
 * Sincroniza mudança de status do incidente para o ticket
 */
export async function syncStatusChangeToTicket(
  incidentId: number,
  newStatus: string,
  userId: number,
  userName: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // Buscar incidente e ticket vinculado
  const [incident] = await db.select().from(incidents).where(eq(incidents.id, incidentId));
  if (!incident || !incident.ticketId) {
    return;
  }
  
  // Buscar ticket
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, incident.ticketId));
  if (!ticket) {
    return;
  }
  
  // Mapear status do incidente para status do ticket
  const ticketStatus = INCIDENT_STATUS_TO_TICKET_STATUS[newStatus];
  if (ticketStatus) {
    // Atualizar status do ticket
    await db.update(tickets)
      .set({ status: ticketStatus as any })
      .where(eq(tickets.id, ticket.id));
  }
  
  // Mapear status para descrição
  const statusDescriptions: Record<string, string> = {
    standby: '🟢 Standby - Aguardando',
    active: '🔴 Ativo - Em tratamento',
    contained: '🟡 Contido - Danos limitados',
    remediated: '🔵 Remediado - Correções aplicadas',
    closed: '⚫ Encerrado - Incidente finalizado'
  };
  
  const statusDesc = statusDescriptions[newStatus] || newStatus;
  
  // Adicionar comentário no ticket
  await addSystemCommentToTicket(
    ticket.id,
    ticket.organizationId,
    userId,
    `🔄 **Status do Incidente Atualizado**\n\nNovo status: ${statusDesc}`
  );
  
  logger.info(`[IncidentIntegration] Status ${newStatus} sincronizado para ticket ${ticket.id}`);
}

/**
 * Busca informações do incidente vinculado a um ticket
 */
export async function getLinkedIncident(ticketId: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  
  // Buscar ticket
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
  if (!ticket || !ticket.incidentId) {
    return null;
  }
  
  // Buscar incidente
  return incidentService.getIncidentById(ticket.incidentId);
}

/**
 * Busca informações do ticket vinculado a um incidente
 */
export async function getLinkedTicket(incidentId: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  
  // Buscar incidente
  const [incident] = await db.select().from(incidents).where(eq(incidents.id, incidentId));
  if (!incident || !incident.ticketId) {
    return null;
  }
  
  // Buscar ticket
  return ticketService.getTicketById(incident.ticketId);
}

/**
 * Cria incidente manualmente a partir de um ticket existente
 * Usado quando consultor quer transformar um ticket comum em incidente
 */
export async function linkTicketToNewIncident(ticketId: number, userId: number): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  
  // Buscar ticket
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
  if (!ticket) {
    logger.error(`[IncidentIntegration] Ticket ${ticketId} não encontrado`);
    return null;
  }
  
  // Verificar se já existe incidente vinculado
  if (ticket.incidentId) {
    logger.info(`[IncidentIntegration] Ticket ${ticketId} já possui incidente vinculado: ${ticket.incidentId}`);
    return ticket.incidentId;
  }
  
  // Criar incidente usando a função existente
  return createIncidentFromTicket(ticketId, userId);
}
