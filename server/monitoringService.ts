import { logger } from "./_core/logger";
/**
 * Serviço de Monitoramento e Alertas
 * Seusdados Due Diligence
 */

import { notifyOwner } from "./_core/notification";
import { getDb } from "./db";
import { organizations, users, complianceAssessments, thirdPartyAssessments, contractAnalyses, actionPlans, tickets } from "../drizzle/schema";
import { eq, sql, and, gte, lte, count } from "drizzle-orm";

// ==================== TIPOS ====================

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: boolean;
    memory: MemoryUsage;
    uptime: number;
  };
  metrics: SystemMetrics;
}

interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  percentUsed: number;
}

interface SystemMetrics {
  totalOrganizations: number;
  totalUsers: number;
  activeAssessments: number;
  pendingActions: number;
  openTickets: number;
}

interface AlertConfig {
  memoryThreshold: number; // Porcentagem de memória para alerta
  pendingActionsThreshold: number; // Número de ações pendentes para alerta
  criticalTicketsThreshold: number; // Número de tickets críticos para alerta
}

// ==================== CONFIGURAÇÃO ====================

const DEFAULT_ALERT_CONFIG: AlertConfig = {
  memoryThreshold: 85, // 85% de uso de memória
  pendingActionsThreshold: 50, // 50 ações pendentes
  criticalTicketsThreshold: 10, // 10 tickets críticos
};

// ==================== FUNÇÕES DE MONITORAMENTO ====================

/**
 * Verifica a saúde do sistema
 */
export async function checkSystemHealth(): Promise<HealthStatus> {
  const timestamp = new Date().toISOString();
  
  // Verificar conexão com banco de dados
  let databaseHealthy = false;
  try {
    const db = await getDb();
    if (db) {
      await db.select({ count: sql`1` }).from(organizations).limit(1);
      databaseHealthy = true;
    }
  } catch (error) {
    logger.error('[Monitoring] Database health check failed:', error);
  }

  // Verificar uso de memória
  const memoryUsage = getMemoryUsage();

  // Obter métricas do sistema
  const metrics = await getSystemMetrics();

  // Determinar status geral
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (!databaseHealthy) {
    status = 'unhealthy';
  } else if (memoryUsage.percentUsed > DEFAULT_ALERT_CONFIG.memoryThreshold) {
    status = 'degraded';
  } else if (metrics.pendingActions > DEFAULT_ALERT_CONFIG.pendingActionsThreshold) {
    status = 'degraded';
  }

  return {
    status,
    timestamp,
    checks: {
      database: databaseHealthy,
      memory: memoryUsage,
      uptime: process.uptime(),
    },
    metrics,
  };
}

/**
 * Obtém uso de memória do processo
 */
function getMemoryUsage(): MemoryUsage {
  const mem = process.memoryUsage();
  return {
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(mem.heapTotal / 1024 / 1024), // MB
    external: Math.round(mem.external / 1024 / 1024), // MB
    rss: Math.round(mem.rss / 1024 / 1024), // MB
    percentUsed: Math.round((mem.heapUsed / mem.heapTotal) * 100),
  };
}

/**
 * Obtém métricas do sistema
 */
export async function getSystemMetrics(): Promise<SystemMetrics> {
  const db = await getDb();
  if (!db) {
    return {
      totalOrganizations: 0,
      totalUsers: 0,
      activeAssessments: 0,
      pendingActions: 0,
      openTickets: 0,
    };
  }

  try {
    // Contar organizações
    const [orgCount] = await db.select({ count: count() }).from(organizations);
    
    // Contar usuários
    const [userCount] = await db.select({ count: count() }).from(users);
    
    // Contar avaliações ativas (não concluídas)
    const [complianceCount] = await db.select({ count: count() })
      .from(complianceAssessments)
      .where(sql`${complianceAssessments.status} != 'completed'`);
    
    const [thirdPartyCount] = await db.select({ count: count() })
      .from(thirdPartyAssessments)
      .where(sql`${thirdPartyAssessments.status} != 'completed'`);
    
    const [contractCount] = await db.select({ count: count() })
      .from(contractAnalyses)
      .where(sql`${contractAnalyses.contractAnalysisStatus} NOT IN ('completed', 'approved')`);
    
    // Contar ações pendentes
    const [actionCount] = await db.select({ count: count() })
      .from(actionPlans)
      .where(eq(actionPlans.status, 'pendente'));
    
    // Contar tickets abertos
    const [ticketCount] = await db.select({ count: count() })
      .from(tickets)
      .where(sql`${tickets.status} NOT IN ('resolvido', 'cancelado')`);

    return {
      totalOrganizations: orgCount?.count || 0,
      totalUsers: userCount?.count || 0,
      activeAssessments: (complianceCount?.count || 0) + (thirdPartyCount?.count || 0) + (contractCount?.count || 0),
      pendingActions: actionCount?.count || 0,
      openTickets: ticketCount?.count || 0,
    };
  } catch (error) {
    logger.error('[Monitoring] Error getting system metrics:', error);
    return {
      totalOrganizations: 0,
      totalUsers: 0,
      activeAssessments: 0,
      pendingActions: 0,
      openTickets: 0,
    };
  }
}

/**
 * Verifica e envia alertas se necessário
 */
export async function checkAndSendAlerts(config: AlertConfig = DEFAULT_ALERT_CONFIG): Promise<void> {
  const health = await checkSystemHealth();
  const alerts: string[] = [];

  // Verificar status geral
  if (health.status === 'unhealthy') {
    alerts.push('⚠️ CRÍTICO: Sistema em estado não saudável - Banco de dados pode estar inacessível');
  }

  // Verificar memória
  if (health.checks.memory.percentUsed > config.memoryThreshold) {
    alerts.push(`⚠️ ALERTA: Uso de memória alto (${health.checks.memory.percentUsed}%)`);
  }

  // Verificar ações pendentes
  if (health.metrics.pendingActions > config.pendingActionsThreshold) {
    alerts.push(`📋 ATENÇÃO: ${health.metrics.pendingActions} ações de plano pendentes`);
  }

  // Verificar tickets abertos
  if (health.metrics.openTickets > config.criticalTicketsThreshold) {
    alerts.push(`🎫 ATENÇÃO: ${health.metrics.openTickets} tickets abertos`);
  }

  // Enviar alertas se houver
  if (alerts.length > 0) {
    const alertContent = alerts.join('\n\n');
    await notifyOwner({
      title: `🔔 Alerta do Sistema - Seusdados Due Diligence`,
      content: `**Status:** ${health.status.toUpperCase()}\n**Horário:** ${health.timestamp}\n\n${alertContent}\n\n**Métricas:**\n- Organizações: ${health.metrics.totalOrganizations}\n- Usuários: ${health.metrics.totalUsers}\n- Avaliações ativas: ${health.metrics.activeAssessments}\n- Ações pendentes: ${health.metrics.pendingActions}\n- Tickets abertos: ${health.metrics.openTickets}`,
    });
  }
}

/**
 * Registra log estruturado
 */
export function logEvent(
  level: 'info' | 'warn' | 'error',
  event: string,
  data?: Record<string, any>
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...data,
  };
  
  switch (level) {
    case 'error':
      logger.error(JSON.stringify(logEntry));
      break;
    case 'warn':
      logger.warn(JSON.stringify(logEntry));
      break;
    default:
      logger.info(JSON.stringify(logEntry));
  }
}

/**
 * Middleware de logging para requisições
 */
export function logRequest(
  method: string,
  path: string,
  userId?: number,
  organizationId?: number,
  duration?: number
): void {
  logEvent('info', 'request', {
    method,
    path,
    userId,
    organizationId,
    duration,
  });
}

/**
 * Log de erro com contexto
 */
export function logError(
  error: Error,
  context?: Record<string, any>
): void {
  logEvent('error', 'error', {
    message: error.message,
    stack: error.stack,
    ...context,
  });
}

// ==================== EXPORTAÇÕES ====================

export {
  HealthStatus,
  MemoryUsage,
  SystemMetrics,
  AlertConfig,
  DEFAULT_ALERT_CONFIG,
};
