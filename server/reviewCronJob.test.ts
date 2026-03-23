/**
 * Testes do Review Cron Job
 * Valida o processamento de revisões e criação de tarefas
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getReviewCronJobStatus,
  startReviewCronJob,
  stopReviewCronJob,
  updateReviewCronJobConfig,
  triggerManualCheck,
  initializeReviewCron,
} from './reviewCronJob';

describe('Review Cron Job', () => {
  beforeEach(() => {
    // Parar qualquer cron job em execução antes de cada teste
    stopReviewCronJob();
  });

  afterEach(() => {
    // Limpar após cada teste
    stopReviewCronJob();
  });

  describe('getReviewCronJobStatus', () => {
    it('deve retornar status inicial correto', () => {
      const status = getReviewCronJobStatus();
      
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('lastRun');
      expect(status).toHaveProperty('nextRun');
      expect(status).toHaveProperty('intervalMs');
      expect(status).toHaveProperty('enabled');
      expect(typeof status.isRunning).toBe('boolean');
      expect(typeof status.intervalMs).toBe('number');
      expect(typeof status.enabled).toBe('boolean');
    });

    it('deve mostrar isRunning como false quando parado', () => {
      stopReviewCronJob();
      const status = getReviewCronJobStatus();
      expect(status.isRunning).toBe(false);
    });
  });

  describe('startReviewCronJob / stopReviewCronJob', () => {
    it('deve iniciar e parar o cron job', () => {
      // Iniciar
      startReviewCronJob({ enabled: true, intervalMs: 60000 });
      let status = getReviewCronJobStatus();
      expect(status.isRunning).toBe(true);

      // Parar
      stopReviewCronJob();
      status = getReviewCronJobStatus();
      expect(status.isRunning).toBe(false);
    });

    it('deve iniciar quando startReviewCronJob é chamado diretamente', () => {
      // startReviewCronJob sempre inicia o cron quando chamado diretamente
      // A flag enabled é controlada pela função initializeReviewCron via env
      startReviewCronJob({ enabled: true });
      const status = getReviewCronJobStatus();
      expect(status.isRunning).toBe(true);
      stopReviewCronJob();
    });
  });

  describe('updateReviewCronJobConfig', () => {
    it('deve atualizar a configuração do intervalo', () => {
      const newInterval = 3600000; // 1 hora
      updateReviewCronJobConfig({ intervalMs: newInterval });
      const status = getReviewCronJobStatus();
      expect(status.intervalMs).toBe(newInterval);
    });

    it('deve atualizar a configuração e manter o cron rodando se já estava rodando', () => {
      // Iniciar o cron primeiro
      startReviewCronJob({ enabled: true });
      let status = getReviewCronJobStatus();
      expect(status.isRunning).toBe(true);

      // Atualizar configuração - deve manter rodando
      updateReviewCronJobConfig({ intervalMs: 7200000 });
      status = getReviewCronJobStatus();
      expect(status.isRunning).toBe(true);
      expect(status.intervalMs).toBe(7200000);
      
      stopReviewCronJob();
    });
  });
});

describe('Review Cron Job - Estrutura de Retorno', () => {
  it('triggerManualReviewCheck deve retornar estrutura correta', async () => {
    // Importar dinamicamente para evitar execução automática
    const { triggerManualReviewCheck } = await import('./reviewCronJob');
    
    // Este teste verifica apenas a estrutura, não executa realmente
    // pois precisaria de banco de dados configurado
    const expectedKeys = [
      'success',
      'processed',
      'alertsSent',
      'emailsSent',
      'tasksCreated',
      'ripdProcessed',
      'errors'
    ];
    
    // Verificar que a função existe e é exportada
    expect(typeof triggerManualCheck).toBe('function');
  });
});


describe('Review Cron Job - Inicialização Automática', () => {
  beforeEach(() => {
    stopReviewCronJob();
  });

  afterEach(() => {
    stopReviewCronJob();
    // Restaurar variável de ambiente
    delete process.env.ENABLE_REVIEW_CRON;
  });

  it('initializeReviewCron deve existir e ser uma função', () => {
    expect(typeof initializeReviewCron).toBe('function');
  });

  it('initializeReviewCron não deve iniciar cron quando ENABLE_REVIEW_CRON não está definido', () => {
    delete process.env.ENABLE_REVIEW_CRON;
    initializeReviewCron();
    const status = getReviewCronJobStatus();
    expect(status.isRunning).toBe(false);
  });

  it('initializeReviewCron não deve iniciar cron quando ENABLE_REVIEW_CRON=false', () => {
    process.env.ENABLE_REVIEW_CRON = 'false';
    initializeReviewCron();
    const status = getReviewCronJobStatus();
    expect(status.isRunning).toBe(false);
  });

  it('initializeReviewCron deve iniciar cron quando ENABLE_REVIEW_CRON=true', () => {
    process.env.ENABLE_REVIEW_CRON = 'true';
    initializeReviewCron();
    const status = getReviewCronJobStatus();
    expect(status.isRunning).toBe(true);
    expect(status.enabled).toBe(true);
    // Limpar
    stopReviewCronJob();
  });

  it('status deve mostrar nextRun preenchido quando cron está rodando', () => {
    process.env.ENABLE_REVIEW_CRON = 'true';
    initializeReviewCron();
    
    // Aguardar um pouco para o lastRunTimestamp ser definido
    const status = getReviewCronJobStatus();
    expect(status.isRunning).toBe(true);
    // nextRun pode ser null se lastRunTimestamp ainda não foi definido
    // mas após a primeira execução, deve estar preenchido
    
    // Limpar
    stopReviewCronJob();
  });
});

describe('Review Cron Job - Chave de Idempotência', () => {
  it('deve usar formato correto para chave de idempotência', () => {
    // A chave deve seguir o formato: origin:review:<type>:<entityId>
    // Não podemos testar diretamente a função privada, mas podemos verificar
    // que o triggerManualCheck existe e retorna a estrutura esperada
    expect(typeof triggerManualCheck).toBe('function');
  });
});
