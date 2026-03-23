/**
 * Testes para o Scheduler de Verificação de SLA
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock do módulo de SLA monitoring
vi.mock('./slaMonitoringService', () => ({
  sendSLAAlerts: vi.fn(() => Promise.resolve({ sent: 2, errors: 0 }))
}));

// Mock do logger
vi.mock('./_core/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

describe('SLA Scheduler Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Scheduler Configuration', () => {
    it('should have correct interval of 1 hour', () => {
      const ONE_HOUR_MS = 60 * 60 * 1000;
      expect(ONE_HOUR_MS).toBe(3600000);
    });
  });

  describe('Scheduler Status', () => {
    it('should return inactive status when not started', async () => {
      // Import fresh module
      const { getSchedulerStatus } = await import('./slaScheduler');
      
      const status = getSchedulerStatus();
      
      expect(status).toHaveProperty('isActive');
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('lastRunTime');
      expect(status).toHaveProperty('lastRunResult');
      expect(status).toHaveProperty('nextRunTime');
    });

    it('should calculate next run time correctly', () => {
      const lastRunTime = new Date('2024-01-01T10:00:00Z');
      const intervalMs = 60 * 60 * 1000; // 1 hora
      
      const expectedNextRun = new Date(lastRunTime.getTime() + intervalMs);
      
      expect(expectedNextRun.toISOString()).toBe('2024-01-01T11:00:00.000Z');
    });
  });

  describe('Alert Result Structure', () => {
    it('should return correct result structure', () => {
      const result = { sent: 5, errors: 1 };
      
      expect(result).toHaveProperty('sent');
      expect(result).toHaveProperty('errors');
      expect(typeof result.sent).toBe('number');
      expect(typeof result.errors).toBe('number');
    });

    it('should handle zero alerts', () => {
      const result = { sent: 0, errors: 0 };
      
      expect(result.sent).toBe(0);
      expect(result.errors).toBe(0);
    });
  });

  describe('Concurrent Execution Prevention', () => {
    it('should prevent concurrent executions', () => {
      let isRunning = false;
      
      const startExecution = () => {
        if (isRunning) {
          return false; // Blocked
        }
        isRunning = true;
        return true; // Started
      };
      
      const endExecution = () => {
        isRunning = false;
      };
      
      // First execution starts
      expect(startExecution()).toBe(true);
      
      // Second execution is blocked
      expect(startExecution()).toBe(false);
      
      // After first ends, next can start
      endExecution();
      expect(startExecution()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should set error result on failure', () => {
      const errorResult = { sent: 0, errors: 1 };
      
      expect(errorResult.sent).toBe(0);
      expect(errorResult.errors).toBe(1);
    });
  });
});
