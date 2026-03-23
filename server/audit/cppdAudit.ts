/**
 * Trilha de Auditoria — Módulo CPPD
 * 
 * Registra todos os eventos relevantes do módulo de Governança e Gestão
 * na tabela auditLogs existente, com entityType padronizado como 'cppd_*'.
 * 
 * Ações registradas:
 *   - ata_gerada: Ata da reunião gerada via IA
 *   - ata_aprovada: Ata aprovada para assinatura
 *   - ata_armazenada_ged: Ata armazenada no GED
 *   - ata_enviada_assinatura: Ata enviada para assinatura
 *   - documento_assinado_enviado: Upload de documento assinado
 *   - assinatura_finalizada: Processo de assinatura concluído
 *   - reuniao_criada: Nova reunião agendada
 *   - reuniao_cancelada: Reunião cancelada
 *   - membro_adicionado: Novo membro adicionado ao CPPD
 *   - membro_removido: Membro removido do CPPD
 *   - configuracao_alterada: Configuração do CPPD alterada
 */

import { logger } from '../_core/logger';

export interface CppdAuditEvent {
  /** ID da organização */
  organizationId: number;
  /** ID do usuário que executou a ação */
  userId: number;
  /** Ação realizada */
  action: string;
  /** Tipo da entidade afetada */
  entityType: string;
  /** ID da entidade afetada */
  entityId?: number;
  /** Detalhes adicionais (JSON) */
  details?: Record<string, unknown>;
  /** Endereço IP (se disponível) */
  ipAddress?: string;
}

/**
 * Registra um evento de auditoria do CPPD na tabela auditLogs.
 * 
 * Usa a tabela existente `auditLogs` com o prefixo 'cppd_' na ação
 * para facilitar filtros e relatórios.
 */
export async function logCppdEvent(event: CppdAuditEvent): Promise<void> {
  try {
    const { getDb } = await import('../db');
    const db = await getDb();
    if (!db) {
      logger.warn('[CppdAudit] Banco de dados não disponível, evento não registrado:', event.action);
      return;
    }

    const { auditLogs } = await import('../../drizzle/schema');

    await db.insert(auditLogs).values({
      userId: event.userId,
      organizationId: event.organizationId,
      action: `cppd_${event.action}`,
      entityType: event.entityType,
      entityId: event.entityId || null,
      details: event.details ? JSON.stringify(event.details) : null,
      ipAddress: event.ipAddress || null,
    });

    logger.info(`[CppdAudit] Evento registrado: cppd_${event.action} | org=${event.organizationId} | user=${event.userId} | entity=${event.entityType}:${event.entityId || '-'}`);
  } catch (error: any) {
    // Auditoria não deve interromper o fluxo principal
    logger.error(`[CppdAudit] Falha ao registrar evento: ${error?.message || String(error)}`);
  }
}

/**
 * Busca eventos de auditoria do CPPD para uma organização.
 */
export async function getCppdAuditEvents(organizationId: number, options?: {
  limit?: number;
  entityType?: string;
  entityId?: number;
  action?: string;
}): Promise<Array<{
  id: number;
  userId: number | null;
  action: string;
  entityType: string;
  entityId: number | null;
  details: unknown;
  createdAt: string | null;
}>> {
  try {
    const { getDb } = await import('../db');
    const db = await getDb();
    if (!db) return [];

    const { auditLogs } = await import('../../drizzle/schema');
    const { eq, and, like, desc } = await import('drizzle-orm');

    const conditions = [
      eq(auditLogs.organizationId, organizationId),
      like(auditLogs.action, 'cppd_%'),
    ];

    if (options?.entityType) {
      conditions.push(eq(auditLogs.entityType, options.entityType));
    }
    if (options?.entityId) {
      conditions.push(eq(auditLogs.entityId, options.entityId));
    }
    if (options?.action) {
      conditions.push(eq(auditLogs.action, `cppd_${options.action}`));
    }

    const results = await db.select().from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(options?.limit || 50);

    return results;
  } catch (error: any) {
    logger.error(`[CppdAudit] Falha ao buscar eventos: ${error?.message || String(error)}`);
    return [];
  }
}
