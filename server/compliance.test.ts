/**
 * Testes para as funcionalidades de Compliance
 * - Job automático de alertas de revisão
 * - Integração DPIA com Planos de Ação
 * - Dashboard consolidado de compliance
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do banco de dados
vi.mock('./db', () => ({
  getDb: vi.fn().mockResolvedValue({
    execute: vi.fn().mockResolvedValue([[], []]),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([])
      })
    })
  })
}));

// Mock das notificações
vi.mock('./_core/notification', () => ({
  notifyOwner: vi.fn().mockResolvedValue(true)
}));

describe('Review Cron Job', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export required functions', async () => {
    const cronModule = await import('./reviewCronJob');
    
    expect(cronModule.runReviewAlertCheck).toBeDefined();
    expect(cronModule.startReviewCronJob).toBeDefined();
    expect(cronModule.stopReviewCronJob).toBeDefined();
    expect(cronModule.getReviewCronJobStatus).toBeDefined();
    expect(cronModule.updateReviewCronJobConfig).toBeDefined();
    expect(cronModule.triggerManualCheck).toBeDefined();
  });

  it('should return correct status when not running', async () => {
    const { getReviewCronJobStatus, stopReviewCronJob } = await import('./reviewCronJob');
    
    // Garantir que está parado
    stopReviewCronJob();
    
    const status = getReviewCronJobStatus();
    
    expect(status).toHaveProperty('isRunning');
    expect(status).toHaveProperty('lastRun');
    expect(status).toHaveProperty('nextRun');
    expect(status).toHaveProperty('intervalMs');
    expect(status).toHaveProperty('enabled');
    expect(status.isRunning).toBe(false);
  });

  it('should update config correctly', async () => {
    const { updateReviewCronJobConfig, getReviewCronJobStatus, stopReviewCronJob } = await import('./reviewCronJob');
    
    stopReviewCronJob();
    
    updateReviewCronJobConfig({
      intervalMs: 7200000, // 2 horas
    });
    
    const status = getReviewCronJobStatus();
    expect(status.intervalMs).toBe(7200000);
    // enabled só é true quando o cron está rodando
    // updateReviewCronJobConfig não inicia o cron automaticamente
  });
});

describe('DPIA Service - Action Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export generateActionsFromDpia function', async () => {
    const dpiaService = await import('./dpiaService');
    
    expect(dpiaService.generateActionsFromDpia).toBeDefined();
    expect(typeof dpiaService.generateActionsFromDpia).toBe('function');
  });

  it('should export getActionsFromDpia function', async () => {
    const dpiaService = await import('./dpiaService');
    
    expect(dpiaService.getActionsFromDpia).toBeDefined();
    expect(typeof dpiaService.getActionsFromDpia).toBe('function');
  });

  it('should export syncMitigationStatus function', async () => {
    const dpiaService = await import('./dpiaService');
    
    expect(dpiaService.syncMitigationStatus).toBeDefined();
    expect(typeof dpiaService.syncMitigationStatus).toBe('function');
  });
});

describe('DPIA Service - Compliance Metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export getComplianceMetrics function', async () => {
    const dpiaService = await import('./dpiaService');
    
    expect(dpiaService.getComplianceMetrics).toBeDefined();
    expect(typeof dpiaService.getComplianceMetrics).toBe('function');
  });

  it('should export getRecentComplianceActivities function', async () => {
    const dpiaService = await import('./dpiaService');
    
    expect(dpiaService.getRecentComplianceActivities).toBeDefined();
    expect(typeof dpiaService.getRecentComplianceActivities).toBe('function');
  });
});

describe('DPIA Router', () => {
  it('should have all required procedures', async () => {
    const { dpiaRouter } = await import('./dpiaRouter');
    
    // Verificar se o router existe
    expect(dpiaRouter).toBeDefined();
    
    // Verificar procedures do dashboard consolidado
    expect(dpiaRouter._def.procedures).toHaveProperty('getComplianceMetrics');
    expect(dpiaRouter._def.procedures).toHaveProperty('getRecentActivities');
    
    // Verificar procedures de integração com planos de ação
    expect(dpiaRouter._def.procedures).toHaveProperty('generateActions');
    expect(dpiaRouter._def.procedures).toHaveProperty('getActions');
    
    // Verificar procedures do cron job
    expect(dpiaRouter._def.procedures).toHaveProperty('triggerReviewAlertCheck');
    expect(dpiaRouter._def.procedures).toHaveProperty('getCronJobStatus');
    expect(dpiaRouter._def.procedures).toHaveProperty('startCronJob');
    expect(dpiaRouter._def.procedures).toHaveProperty('stopCronJob');
    expect(dpiaRouter._def.procedures).toHaveProperty('updateCronJobConfig');
  });
});

describe('Compliance Metrics Structure', () => {
  it('should define correct ComplianceMetrics interface', async () => {
    const dpiaService = await import('./dpiaService');
    
    // A função deve existir e aceitar organizationId
    expect(dpiaService.getComplianceMetrics).toBeDefined();
    
    // Verificar que a função é assíncrona
    const result = dpiaService.getComplianceMetrics(1);
    expect(result).toBeInstanceOf(Promise);
  });
});
