/**
 * Seusdados Due Diligence - Database Transaction Utilities
 * Utilitários para transações atômicas e consistência de dados
 */

import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Executa uma função dentro de uma transação atômica
 */
export async function withTransaction<T>(
  fn: (db: Awaited<ReturnType<typeof getDb>>) => Promise<T>,
  operationName: string = 'transaction'
): Promise<T> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startTime = Date.now();
  
  try {
    logger.debug(`[Transaction] Starting: ${operationName}`);
    await db.execute(sql`START TRANSACTION`);
    const result = await fn(db);
    await db.execute(sql`COMMIT`);
    const duration = Date.now() - startTime;
    logger.info(`[Transaction] Committed: ${operationName} (${duration}ms)`);
    return result;
  } catch (error) {
    await db.execute(sql`ROLLBACK`);
    const duration = Date.now() - startTime;
    logger.error(`[Transaction] Rollback: ${operationName} (${duration}ms)`, { error });
    throw error;
  }
}

/**
 * Wrapper para operações com retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 100, backoffMultiplier = 2 } = options;

  let lastError: Error | null = null;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      const isRetryable = ['DEADLOCK', 'LOCK_WAIT_TIMEOUT'].some(
        code => error.message?.includes(code)
      );
      
      if (!isRetryable || attempt === maxRetries) throw error;
      
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= backoffMultiplier;
    }
  }

  throw lastError;
}

/**
 * Executa múltiplas operações em lote dentro de uma transação
 */
export async function withBatchTransaction<T>(
  operations: Array<(db: Awaited<ReturnType<typeof getDb>>) => Promise<T>>,
  operationName: string = 'batch-transaction'
): Promise<T[]> {
  return withTransaction(async (db) => {
    const results: T[] = [];
    for (let i = 0; i < operations.length; i++) {
      logger.debug(`[Transaction] Batch ${i + 1}/${operations.length}`);
      results.push(await operations[i](db));
    }
    return results;
  }, operationName);
}

export default { withTransaction, withRetry, withBatchTransaction };
