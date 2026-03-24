/**
 * Serviço de Monitoramento de SLA em Tempo Real
 * 
 * Monitora tickets próximos do vencimento do SLA e envia alertas automáticos.
 * Integrado com o sistema de notificações push e e-mail.
 */

import { getDb } from './db';
import { tickets, users, organizations, meudpoSettings } from '../drizzle/schema';
import { eq, and, lt, gte, isNull, or, not, inArray, sql } from 'drizzle-orm';
import { logger } from './_core/logger';
import { notifyOwner } from './_core/notification';
import { hasTicketAuditAction } from './ticketAuditService';
import * as ticketService from './ticketService';

// Tipos de alerta
export type SLAAlertLevel = 'warning' | 'critical' | 'breached';

// Interface de alerta de SLA
export interface SLAAlert {
  ticketId: number;
  ticketNumber: string;
  title: string;
  organizationName: string;
  assignedTo?: string;
  deadline: Date;
  hoursRemaining: number;
  alertLevel: SLAAlertLevel;
  slaLevel: string;
  priority: string;
}

// Interface de métricas de SLA
export interface SLAMetrics {
  total: number;
  onTime: number;
  atRisk: number;
  breached: number;
  averageResponseTime: number;
  complianceRate: number;
}

// Configuração de thresholds de alerta (em horas)
const ALERT_THRESHOLDS = {
  warning: 8,    // 8 horas antes do vencimento
  critical: 2,   // 2 horas antes do vencimento
  breached: 0    // Já venceu
};

/**
 * Obtém tickets com SLA próximo do vencimento
 */
export async function getTicketsAtRisk(organizationId?: number): Promise<SLAAlert[]> {
  const db = await getDb();
  const now = new Date();
  
  // Calcular threshold para tickets em risco (próximas 24 horas)
  const warningThreshold = new Date(now.getTime() + ALERT_THRESHOLDS.warning * 60 * 60 * 1000);
  
  logger.debug('Verificando tickets em risco de SLA', { 
    organizationId, 
    warningThreshold: warningThreshold.toISOString() 
  });
  
  try {
    // Buscar tickets abertos com deadline próximo
    const conditions = [
      not(inArray(tickets.status, ['resolvido', 'cancelado'])),
      lt(tickets.deadline, warningThreshold.toISOString())
    ];
    
    if (organizationId) {
      conditions.push(eq(tickets.organizationId, organizationId));
    }
    
    const ticketsAtRisk = await db
      .select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        title: tickets.title,
        deadline: tickets.deadline,
        slaLevel: tickets.slaLevel,
        priority: tickets.priority,
        organizationId: tickets.organizationId,
        assignedToId: tickets.assignedToId,
      })
      .from(tickets)
      .where(and(...conditions));
    
    // Enriquecer com dados de organização e usuário
    const alerts: SLAAlert[] = [];
    
    for (const ticket of ticketsAtRisk) {
      if (!ticket.deadline) continue;
      
      const hoursRemaining = (new Date(ticket.deadline).getTime() - now.getTime()) / (1000 * 60 * 60);
      
      // Determinar nível de alerta
      let alertLevel: SLAAlertLevel;
      if (hoursRemaining <= ALERT_THRESHOLDS.breached) {
        alertLevel = 'breached';
      } else if (hoursRemaining <= ALERT_THRESHOLDS.critical) {
        alertLevel = 'critical';
      } else {
        alertLevel = 'warning';
      }
      
      // Buscar nome da organização
      const [org] = await db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, ticket.organizationId))
        .limit(1);
      
      // Buscar nome do responsável
      let assignedToName: string | undefined;
      if (ticket.assignedToId) {
        const [user] = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, ticket.assignedToId))
          .limit(1);
        assignedToName = user?.name;
      }
      
      alerts.push({
        ticketId: ticket.id,
        ticketNumber: String(ticket.ticketNumber || `#${ticket.id}`),
        title: ticket.title,
        organizationName: org?.name || 'Desconhecida',
        assignedTo: assignedToName,
        deadline: new Date(ticket.deadline),
        hoursRemaining: Math.max(0, hoursRemaining),
        alertLevel,
        slaLevel: ticket.slaLevel || 'padrao',
        priority: ticket.priority || 'media'
      });
    }
    
    // Ordenar por urgência (menos horas restantes primeiro)
    alerts.sort((a, b) => a.hoursRemaining - b.hoursRemaining);
    
    logger.info('Tickets em risco de SLA encontrados', { count: alerts.length });
    
    return alerts;
  } catch (error) {
    logger.error('Erro ao buscar tickets em risco de SLA', error as Error);
    throw error;
  }
}

/**
 * Obtém métricas consolidadas de SLA
 */
export async function getSLAMetrics(organizationId?: number, periodDays: number = 30): Promise<SLAMetrics> {
  const db = await getDb();
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  
  logger.debug('Calculando métricas de SLA', { organizationId, periodDays });
  
  try {
    const conditions = [
      gte(tickets.createdAt, periodStart.toISOString())
    ];
    
    if (organizationId) {
      conditions.push(eq(tickets.organizationId, organizationId));
    }
    
    // Buscar todos os tickets do período
    const allTickets = await db
      .select({
        id: tickets.id,
        status: tickets.status,
        deadline: tickets.deadline,
        resolvedAt: tickets.resolvedAt,
        createdAt: tickets.createdAt
      })
      .from(tickets)
      .where(and(...conditions));
    
    let onTime = 0;
    let atRisk = 0;
    let breached = 0;
    let totalResponseTime = 0;
    let resolvedCount = 0;
    
    for (const ticket of allTickets) {
      const deadline = ticket.deadline ? new Date(ticket.deadline) : null;
      const resolvedAt = ticket.resolvedAt ? new Date(ticket.resolvedAt) : null;
      const createdAt = new Date(ticket.createdAt);
      
      if (ticket.status === 'resolvido' || ticket.status === 'cancelado') {
        // Ticket fechado
        if (resolvedAt && deadline) {
          if (resolvedAt <= deadline) {
            onTime++;
          } else {
            breached++;
          }
          totalResponseTime += resolvedAt.getTime() - createdAt.getTime();
          resolvedCount++;
        }
      } else {
        // Ticket aberto
        if (deadline) {
          const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
          if (hoursRemaining <= 0) {
            breached++;
          } else if (hoursRemaining <= ALERT_THRESHOLDS.warning) {
            atRisk++;
          } else {
            onTime++;
          }
        }
      }
    }
    
    const total = allTickets.length;
    const averageResponseTime = resolvedCount > 0 
      ? totalResponseTime / resolvedCount / (1000 * 60 * 60) // Em horas
      : 0;
    const complianceRate = total > 0 
      ? ((onTime + atRisk) / total) * 100 
      : 100;
    
    const metrics: SLAMetrics = {
      total,
      onTime,
      atRisk,
      breached,
      averageResponseTime: Math.round(averageResponseTime * 10) / 10,
      complianceRate: Math.round(complianceRate * 10) / 10
    };
    
    logger.info('Métricas de SLA calculadas', metrics);
    
    return metrics;
  } catch (error) {
    logger.error('Erro ao calcular métricas de SLA', error as Error);
    throw error;
  }
}

/**
 * Envia alertas para tickets críticos
 */
export async function sendSLAAlerts(): Promise<{ sent: number; errors: number }> {
  // === BLOQUEADO DEFINITIVAMENTE ===
  // Alertas de SLA/prazo/vencimento desativados por solicitação.
  // Nenhum perfil deve receber e-mails de prazo/vencimento.
  logger.info('Alertas de SLA DESATIVADOS permanentemente.');
  return { sent: 0, errors: 0 };
}

async function _DISABLED_sendSLAAlerts(): Promise<{ sent: number; errors: number }> {
  logger.info('Iniciando envio de alertas de SLA');
  
  try {
    const alerts = await getTicketsAtRisk();
    
    // Filtrar apenas alertas críticos e breached
    const criticalAlerts = alerts.filter(a => a.alertLevel === 'critical' || a.alertLevel === 'breached');
    
    let sent = 0;
    let errors = 0;
    
    for (const alert of criticalAlerts) {
      try {

        // Escalonamento automático: SLA estourado (breached)
        if (alert.alertLevel === 'breached') {
          try {
            const db = await getDb();
            if (db) {
              const already = await hasTicketAuditAction({ db, ticketId: alert.ticketId, action: 'sla_breached', withinHours: 6 });
              if (!already) {
                await ticketService.auditTicketAction({
                  ticketId: alert.ticketId,
                  action: 'sla_breached',
                  actor: null,
                  payload: { deadline: alert.deadline.toISOString(), hoursRemaining: alert.hoursRemaining, priority: alert.priority, slaLevel: alert.slaLevel }
                });

                // Opcional: aumentar prioridade para crítica (sem alterar status)
                try {
                  await ticketService.updateTicket(alert.ticketId, { priority: 'critica' as any });
                } catch {}

                // Notificar time de governança (admin/consultor) - se conseguir identificar por role
                try {
                  const admins = await db
                    .select({ id: users.id })
                    .from(users)
                    .where(or(eq(users.role as any, 'admin_global' as any), eq(users.role as any, 'admin_global' as any)));
                  for (const a of admins as any[]) {
                    await notifyOwner({
                      title: 'SLA estourado (MeuDPO)',
                      content: `Ticket ${alert.ticketNumber} está com SLA vencido: ${alert.title}. Acesse: /meudpo/${alert.ticketId}`
                    });
                  }
                } catch {}
              }
            }
          } catch {}
        }

        const urgencyEmoji = alert.alertLevel === 'breached' ? '🚨' : '⚠️';
        const urgencyText = alert.alertLevel === 'breached' ? 'SLA ESTOURADO' : 'SLA CRÍTICO';
        
        const title = `${urgencyEmoji} ${urgencyText} - Ticket ${alert.ticketNumber}`;
        const content = `
**${urgencyText}**

📋 **Ticket ${alert.ticketNumber}**
**Título:** ${alert.title}

**Organização:** ${alert.organizationName}
**Responsável:** ${alert.assignedTo || 'Não atribuído'}
**Prioridade:** ${alert.priority}
**SLA:** ${alert.slaLevel}

${alert.alertLevel === 'breached' 
  ? `⏰ **O prazo já expirou!**` 
  : `⏰ **Tempo restante:** ${Math.round(alert.hoursRemaining * 10) / 10} horas`}

---
Ação imediata necessária!
        `.trim();
        
        const success = await notifyOwner({ title, content });
        
        if (success) {
          sent++;
          logger.info('Alerta de SLA enviado', { ticketId: alert.ticketId, alertLevel: alert.alertLevel });
        } else {
          errors++;
          logger.warn('Falha ao enviar alerta de SLA', { ticketId: alert.ticketId });
        }
      } catch (error) {
        errors++;
        logger.error('Erro ao enviar alerta de SLA', error as Error, { ticketId: alert.ticketId });
      }
    }
    
    logger.info('Envio de alertas de SLA concluído', { sent, errors, total: criticalAlerts.length });
    
    return { sent, errors };
  } catch (error) {
    logger.error('Erro no processo de envio de alertas de SLA', error as Error);
    throw error;
  }
}

/**
 * Obtém dashboard de SLA em tempo real
 */
export async function getSLADashboard(organizationId?: number): Promise<{
  metrics: SLAMetrics;
  alerts: SLAAlert[];
  lastUpdated: Date;
}> {
  logger.debug('Gerando dashboard de SLA', { organizationId });
  
  try {
    const [metrics, alerts] = await Promise.all([
      getSLAMetrics(organizationId),
      getTicketsAtRisk(organizationId)
    ]);
    
    return {
      metrics,
      alerts,
      lastUpdated: new Date()
    };
  } catch (error) {
    logger.error('Erro ao gerar dashboard de SLA', error as Error);
    throw error;
  }
}

export default {
  getTicketsAtRisk,
  getSLAMetrics,
  sendSLAAlerts,
  getSLADashboard
};
