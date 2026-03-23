// server/meudpoInit.ts
// Autostart do scheduler de SLA do MeuDPO (helpdesk).
// Evita depender de clique manual em painel admin.
import { logger } from './_core/logger';
import { startSLAScheduler } from './slaScheduler';

let started = false;

export function initMeuDPO() {
  if (started) return;
  started = true;

  if (!process.env.DATABASE_URL) {
    logger.info('[MeuDPO] DATABASE_URL não configurada. SLA scheduler não iniciado.');
    return;
  }

  const flag = (process.env.MEUDPO_SLA_SCHEDULER_AUTOSTART || 'true').toLowerCase();
  if (flag === 'false' || flag === '0' || flag === 'no') {
    logger.info('[MeuDPO] SLA scheduler autostart desabilitado por env.');
    return;
  }

  try {
    startSLAScheduler();
    logger.info('[MeuDPO] SLA scheduler iniciado automaticamente.');
  } catch (e) {
    logger.error('[MeuDPO] Falha ao iniciar SLA scheduler automaticamente:', e as any);
  }
}

initMeuDPO();
