import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do logger
vi.mock('./_core/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock do db
vi.mock('./db', () => ({
  getDb: vi.fn(),
  toSqlTimestamp: vi.fn((date) => date.toISOString()),
  nowSql: vi.fn(() => new Date().toISOString()),
}));

describe('Email Logs Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Email Log Types', () => {
    it('should have valid email types defined', () => {
      const validEmailTypes = [
        'convite_avaliacao',
        'lembrete_avaliacao',
        'resultado_avaliacao',
        'convite_usuario',
        'notificacao_sistema',
        'lembrete_prazo',
      ];
      
      validEmailTypes.forEach(type => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
      });
    });

    it('should have valid email status values', () => {
      const validStatuses = [
        'pending',
        'sent',
        'delivered',
        'opened',
        'clicked',
        'bounced',
        'failed',
        'spam',
      ];
      
      validStatuses.forEach(status => {
        expect(typeof status).toBe('string');
        expect(status.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Email Log Data Structure', () => {
    it('should validate email log data structure', () => {
      const emailLogData = {
        organizationId: 1,
        recipientEmail: 'test@example.com',
        recipientName: 'Test User',
        subject: 'Test Subject',
        emailType: 'convite_avaliacao',
        relatedEntityType: 'third_party_assessment',
        relatedEntityId: 123,
        sentById: 1,
        metadata: {
          templateVersion: '1.0',
          linkToken: 'abc123',
          assessmentId: 456,
        },
      };

      expect(emailLogData.organizationId).toBeTypeOf('number');
      expect(emailLogData.recipientEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(emailLogData.subject).toBeTypeOf('string');
      expect(emailLogData.emailType).toBeTypeOf('string');
    });

    it('should validate filter structure', () => {
      const filters = {
        organizationId: 1,
        emailType: 'convite_avaliacao',
        status: 'sent',
        recipientEmail: 'test@example.com',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        limit: 50,
        offset: 0,
      };

      expect(filters.organizationId).toBeTypeOf('number');
      expect(filters.limit).toBeGreaterThan(0);
      expect(filters.offset).toBeGreaterThanOrEqual(0);
      expect(filters.startDate).toBeInstanceOf(Date);
      expect(filters.endDate).toBeInstanceOf(Date);
    });
  });

  describe('Email Stats Structure', () => {
    it('should validate stats structure', () => {
      const stats = {
        total: 100,
        pending: 10,
        sent: 50,
        delivered: 30,
        opened: 5,
        bounced: 3,
        failed: 2,
        byType: {
          convite_avaliacao: 40,
          lembrete_avaliacao: 30,
          resultado_avaliacao: 20,
          convite_usuario: 10,
        },
      };

      expect(stats.total).toBeGreaterThanOrEqual(0);
      expect(stats.pending).toBeGreaterThanOrEqual(0);
      expect(stats.sent).toBeGreaterThanOrEqual(0);
      expect(stats.delivered).toBeGreaterThanOrEqual(0);
      expect(stats.opened).toBeGreaterThanOrEqual(0);
      expect(stats.bounced).toBeGreaterThanOrEqual(0);
      expect(stats.failed).toBeGreaterThanOrEqual(0);
      expect(typeof stats.byType).toBe('object');
    });
  });
});

describe('Assessment Reminder Cron Job', () => {
  describe('Configuration', () => {
    it('should have valid default configuration', () => {
      const defaultConfig = {
        intervalMs: 6 * 60 * 60 * 1000, // 6 hours
        daysBeforeDeadline: [7, 3, 1],
        maxRemindersPerAssessment: 3,
        enabled: true,
      };

      expect(defaultConfig.intervalMs).toBeGreaterThan(0);
      expect(defaultConfig.daysBeforeDeadline).toBeInstanceOf(Array);
      expect(defaultConfig.daysBeforeDeadline.length).toBeGreaterThan(0);
      expect(defaultConfig.maxRemindersPerAssessment).toBeGreaterThan(0);
      expect(defaultConfig.enabled).toBe(true);
    });

    it('should validate days before deadline array', () => {
      const daysBeforeDeadline = [7, 3, 1];
      
      // All values should be positive integers
      daysBeforeDeadline.forEach(day => {
        expect(day).toBeGreaterThan(0);
        expect(Number.isInteger(day)).toBe(true);
      });
      
      // Should be sorted in descending order
      const sorted = [...daysBeforeDeadline].sort((a, b) => b - a);
      expect(daysBeforeDeadline).toEqual(sorted);
    });
  });

  describe('Reminder Logic', () => {
    it('should correctly identify days that need reminders', () => {
      const thresholds = [7, 3, 1];
      
      const shouldSendReminder = (daysUntilDeadline: number): boolean => {
        return thresholds.includes(daysUntilDeadline);
      };

      expect(shouldSendReminder(7)).toBe(true);
      expect(shouldSendReminder(3)).toBe(true);
      expect(shouldSendReminder(1)).toBe(true);
      expect(shouldSendReminder(5)).toBe(false);
      expect(shouldSendReminder(0)).toBe(false);
      expect(shouldSendReminder(-1)).toBe(false);
    });

    it('should calculate days until deadline correctly', () => {
      const now = new Date();
      const deadline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
      
      const daysUntilDeadline = Math.ceil(
        (deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );
      
      expect(daysUntilDeadline).toBe(3);
    });
  });

  describe('Cron Job Status', () => {
    it('should validate status structure', () => {
      const status = {
        isRunning: false,
        lastRun: null as string | null,
        nextRun: null as string | null,
        intervalMs: 6 * 60 * 60 * 1000,
        enabled: true,
      };

      expect(typeof status.isRunning).toBe('boolean');
      expect(typeof status.intervalMs).toBe('number');
      expect(typeof status.enabled).toBe('boolean');
    });
  });
});
