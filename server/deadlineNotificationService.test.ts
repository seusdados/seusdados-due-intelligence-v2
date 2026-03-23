import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
vi.mock('./_core/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./_core/notification', () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock('./emailService', () => ({
  sendGenericEmail: vi.fn().mockResolvedValue({ id: 'test-id', success: true }),
}));

vi.mock('./db', () => ({
  getDb: vi.fn(),
  getUserById: vi.fn().mockResolvedValue({ id: 1, name: 'Teste', email: 'teste@example.com' }),
}));

vi.mock('drizzle-orm', () => ({
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: any[]) => ({ strings, values }),
    { raw: (s: string) => s }
  ),
}));

describe('deadlineNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkDeadlineSeverityChanges', () => {
    it('deve retornar zeros quando banco não está disponível', async () => {
      const db = await import('./db');
      (db.getDb as any).mockResolvedValueOnce(null);

      const { checkDeadlineSeverityChanges } = await import('./deadlineNotificationService');
      const result = await checkDeadlineSeverityChanges();

      expect(result.checked).toBe(0);
      expect(result.notified).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('deve processar action_plans e enviar notificações para vencidos', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const mockDb = {
        execute: vi.fn()
          // action_plans query
          .mockResolvedValueOnce([[{
            id: 1,
            title: 'Ação Teste Vencida',
            dueDate: yesterdayStr,
            status: 'em_andamento',
            priority: 'alta',
            organizationId: 1,
            responsibleId: 1,
            organizationName: 'Org Teste',
          }]])
          // ir_deadlines query
          .mockResolvedValueOnce([[]])
          // cppd_initiative_tasks query
          .mockResolvedValueOnce([[]]),
      };

      const db = await import('./db');
      (db.getDb as any).mockResolvedValueOnce(mockDb);

      const emailService = await import('./emailService');
      const notification = await import('./_core/notification');

      // Need fresh import to reset internal state
      vi.resetModules();
      vi.mock('./_core/logger', () => ({
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      }));
      vi.mock('./_core/notification', () => ({
        notifyOwner: vi.fn().mockResolvedValue(true),
      }));
      vi.mock('./emailService', () => ({
        sendGenericEmail: vi.fn().mockResolvedValue({ id: 'test-id', success: true }),
      }));
      vi.mock('./db', () => ({
        getDb: vi.fn().mockResolvedValue(mockDb),
        getUserById: vi.fn().mockResolvedValue({ id: 1, name: 'Teste', email: 'teste@example.com' }),
      }));
      vi.mock('drizzle-orm', () => ({
        sql: Object.assign(
          (strings: TemplateStringsArray, ...values: any[]) => ({ strings, values }),
          { raw: (s: string) => s }
        ),
      }));

      const { checkDeadlineSeverityChanges } = await import('./deadlineNotificationService');
      const result = await checkDeadlineSeverityChanges();

      expect(result.checked).toBeGreaterThanOrEqual(1);
    });
  });

  describe('startDeadlineNotificationService / stopDeadlineNotificationService', () => {
    it('deve iniciar e parar o serviço sem erros', async () => {
      vi.resetModules();
      vi.mock('./_core/logger', () => ({
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      }));
      vi.mock('./_core/notification', () => ({
        notifyOwner: vi.fn().mockResolvedValue(true),
      }));
      vi.mock('./emailService', () => ({
        sendGenericEmail: vi.fn().mockResolvedValue({ id: 'test-id', success: true }),
      }));
      vi.mock('./db', () => ({
        getDb: vi.fn().mockResolvedValue(null),
        getUserById: vi.fn(),
      }));
      vi.mock('drizzle-orm', () => ({
        sql: Object.assign(
          (strings: TemplateStringsArray, ...values: any[]) => ({ strings, values }),
          { raw: (s: string) => s }
        ),
      }));

      const { startDeadlineNotificationService, stopDeadlineNotificationService, getDeadlineNotificationStatus } = await import('./deadlineNotificationService');

      expect(() => startDeadlineNotificationService()).not.toThrow();

      const status = getDeadlineNotificationStatus();
      expect(status.isRunning).toBe(true);
      expect(status.cacheSize).toBeGreaterThanOrEqual(0);

      stopDeadlineNotificationService();
      const statusAfterStop = getDeadlineNotificationStatus();
      expect(statusAfterStop.isRunning).toBe(false);
    });
  });

  describe('getDeadlineNotificationStatus', () => {
    it('deve retornar status correto', async () => {
      vi.resetModules();
      vi.mock('./_core/logger', () => ({
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      }));
      vi.mock('./_core/notification', () => ({
        notifyOwner: vi.fn().mockResolvedValue(true),
      }));
      vi.mock('./emailService', () => ({
        sendGenericEmail: vi.fn().mockResolvedValue({ id: 'test-id', success: true }),
      }));
      vi.mock('./db', () => ({
        getDb: vi.fn().mockResolvedValue(null),
        getUserById: vi.fn(),
      }));
      vi.mock('drizzle-orm', () => ({
        sql: Object.assign(
          (strings: TemplateStringsArray, ...values: any[]) => ({ strings, values }),
          { raw: (s: string) => s }
        ),
      }));

      const { getDeadlineNotificationStatus } = await import('./deadlineNotificationService');
      const status = getDeadlineNotificationStatus();

      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('cacheSize');
      expect(status).toHaveProperty('overdueCount');
      expect(status).toHaveProperty('criticalCount');
      expect(typeof status.isRunning).toBe('boolean');
      expect(typeof status.cacheSize).toBe('number');
    });
  });
});
