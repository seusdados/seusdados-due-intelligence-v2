// server/ticketAuditService.ts
// =====================================================
// MeuDPO - Audit Log Imutável (cadeia de hash)
// =====================================================
// Premissa: o módulo deve manter trilha de auditoria automaticamente,
// de forma append-only, com encadeamento de hash por ticket.
// Isso não substitui logs de infraestrutura, mas cria prova de integridade
// do histórico do chamado.

import crypto from 'crypto';
import { logger } from './_core/logger';
import { eq, desc } from 'drizzle-orm';

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export async function appendTicketAuditLog(params: {
  db: any;
  ticketId: number;
  action: string;
  actorId: number | null;
  actorRole: string | null;
  payload: Record<string, unknown>;
}) {
  const { db, ticketId, action, actorId, actorRole, payload } = params;

  try {
    const { ticketAuditLog } = await import('../drizzle/schema');

    // Busca último hash do ticket
    const last = await db
      .select({ entryHash: ticketAuditLog.entryHash })
      .from(ticketAuditLog)
      .where(eq(ticketAuditLog.ticketId, ticketId))
      .orderBy(desc(ticketAuditLog.id))
      .limit(1);

    const prevHash = last?.[0]?.entryHash ?? null;

    const createdAt = new Date().toISOString();
    const canonical = JSON.stringify({
      ticketId,
      action,
      actorId,
      actorRole,
      createdAt,
      payload,
      prevHash
    });

    const entryHash = sha256(canonical);

    await db.insert(ticketAuditLog).values({
      ticketId,
      action,
      actorId,
      actorRole,
      payloadJson: payload,
      prevHash,
      entryHash,
      createdAt
    });
  } catch (e) {
    // Não derruba fluxo se schema/tabela não existirem
    logger.info('[Audit] ticketAuditLog indisponível/erro ao inserir:', e);
  }
}


export async function hasTicketAuditAction(params: {
  db: any;
  ticketId: number;
  action: string;
  withinHours?: number;
}): Promise<boolean> {
  const { db, ticketId, action, withinHours = 24 } = params;
  try {
    const { ticketAuditLog } = await import('../drizzle/schema');
    const since = new Date(Date.now() - withinHours * 60 * 60 * 1000).toISOString();
    const rows = await db
      .select({ id: ticketAuditLog.id })
      .from(ticketAuditLog)
      .where(eq(ticketAuditLog.ticketId, ticketId))
      .orderBy(desc(ticketAuditLog.id))
      .limit(200);

    // Filtra em memória para não depender de operadores de data no schema
    // (mantém compatibilidade caso createdAt seja string).
    for (const r of rows as any[]) {
      // buscamos a linha completa só se necessário
    }
    // fallback simples: se houver qualquer ação igual nos últimos 200 registros, assume true
    const rows2 = await db
      .select({ action: (ticketAuditLog as any).action, createdAt: (ticketAuditLog as any).createdAt })
      .from(ticketAuditLog)
      .where(eq(ticketAuditLog.ticketId, ticketId))
      .orderBy(desc(ticketAuditLog.id))
      .limit(200);

    return (rows2 as any[]).some(x => x.action === action && (!x.createdAt || String(x.createdAt) >= since));
  } catch {
    return false;
  }
}


/**
 * Obtém o histórico de audit log de um ticket específico.
 * Retorna os registros ordenados do mais recente para o mais antigo.
 */
export async function getTicketAuditLog(ticketId: number): Promise<Array<{
  id: number;
  ticketId: number;
  action: string;
  actorId: number | null;
  actorRole: string | null;
  payloadJson: Record<string, unknown> | null;
  prevHash: string | null;
  entryHash: string | null;
  createdAt: string | Date;
}>> {
  try {
    const { getDb } = await import('./db');
    const db = await getDb();
    if (!db) return [];
    
    const { ticketAuditLog } = await import('../drizzle/schema');
    
    const logs = await db
      .select()
      .from(ticketAuditLog)
      .where(eq(ticketAuditLog.ticketId, ticketId))
      .orderBy(desc(ticketAuditLog.id))
      .limit(500);
    
    return logs.map((log: any) => ({
      id: log.id,
      ticketId: log.ticketId,
      action: log.action,
      actorId: log.actorId,
      actorRole: log.actorRole,
      payloadJson: log.payloadJson,
      prevHash: log.prevHash,
      entryHash: log.entryHash,
      createdAt: log.createdAt,
    }));
  } catch (e) {
    logger.info('[Audit] Erro ao buscar audit log:', e);
    return [];
  }
}
