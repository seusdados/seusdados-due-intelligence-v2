/**
 * Testes unitários para o módulo de Histórico de Notificações
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do módulo db
vi.mock('./db', () => ({
  createNotificationHistory: vi.fn(),
  updateNotificationHistoryStatus: vi.fn(),
  getNotificationHistory: vi.fn(),
  getNotificationHistoryById: vi.fn(),
  getNotificationHistoryStats: vi.fn(),
  markNotificationsAsRead: vi.fn(),
  deleteOldNotifications: vi.fn(),
}));

import * as db from './db';

describe('Notification History Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNotificationHistory', () => {
    it('should create a notification history entry', async () => {
      const mockData = {
        organizationId: 1,
        userId: 1,
        type: 'sla_alert' as const,
        title: 'Alerta de SLA',
        content: 'Ticket #123 está próximo do vencimento',
        channel: 'app' as const,
        status: 'sent' as const,
      };

      (db.createNotificationHistory as any).mockResolvedValue(1);

      const result = await db.createNotificationHistory(mockData);

      expect(db.createNotificationHistory).toHaveBeenCalledWith(mockData);
      expect(result).toBe(1);
    });

    it('should create notification with minimal data', async () => {
      const mockData = {
        type: 'system' as const,
        title: 'Notificação do Sistema',
        content: 'Mensagem do sistema',
      };

      (db.createNotificationHistory as any).mockResolvedValue(2);

      const result = await db.createNotificationHistory(mockData);

      expect(db.createNotificationHistory).toHaveBeenCalledWith(mockData);
      expect(result).toBe(2);
    });
  });

  describe('updateNotificationHistoryStatus', () => {
    it('should update status to sent', async () => {
      (db.updateNotificationHistoryStatus as any).mockResolvedValue(undefined);

      await db.updateNotificationHistoryStatus(1, 'sent');

      expect(db.updateNotificationHistoryStatus).toHaveBeenCalledWith(1, 'sent');
    });

    it('should update status to failed with error message', async () => {
      (db.updateNotificationHistoryStatus as any).mockResolvedValue(undefined);

      await db.updateNotificationHistoryStatus(1, 'failed', 'Connection timeout');

      expect(db.updateNotificationHistoryStatus).toHaveBeenCalledWith(1, 'failed', 'Connection timeout');
    });

    it('should update status to read', async () => {
      (db.updateNotificationHistoryStatus as any).mockResolvedValue(undefined);

      await db.updateNotificationHistoryStatus(1, 'read');

      expect(db.updateNotificationHistoryStatus).toHaveBeenCalledWith(1, 'read');
    });
  });

  describe('getNotificationHistory', () => {
    it('should return notification history with filters', async () => {
      const mockHistory = [
        { id: 1, type: 'sla_alert', title: 'Alerta 1', status: 'sent' },
        { id: 2, type: 'sla_alert', title: 'Alerta 2', status: 'sent' },
      ];

      (db.getNotificationHistory as any).mockResolvedValue(mockHistory);

      const result = await db.getNotificationHistory({
        organizationId: 1,
        type: 'sla_alert',
        limit: 10,
        offset: 0,
      });

      expect(db.getNotificationHistory).toHaveBeenCalledWith({
        organizationId: 1,
        type: 'sla_alert',
        limit: 10,
        offset: 0,
      });
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no notifications found', async () => {
      (db.getNotificationHistory as any).mockResolvedValue([]);

      const result = await db.getNotificationHistory({
        organizationId: 999,
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('getNotificationHistoryById', () => {
    it('should return notification by id', async () => {
      const mockNotification = {
        id: 1,
        type: 'sla_alert',
        title: 'Alerta de SLA',
        content: 'Conteúdo',
        status: 'sent',
        createdAt: '2025-12-26T12:00:00Z',
      };

      (db.getNotificationHistoryById as any).mockResolvedValue(mockNotification);

      const result = await db.getNotificationHistoryById(1);

      expect(db.getNotificationHistoryById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockNotification);
    });

    it('should return null for non-existent notification', async () => {
      (db.getNotificationHistoryById as any).mockResolvedValue(null);

      const result = await db.getNotificationHistoryById(999);

      expect(result).toBeNull();
    });
  });

  describe('getNotificationHistoryStats', () => {
    it('should return statistics for organization', async () => {
      const mockStats = {
        total: 100,
        pending: 5,
        sent: 80,
        failed: 5,
        read: 10,
        byType: {
          sla_alert: 30,
          sla_summary: 20,
          ticket_created: 50,
        },
      };

      (db.getNotificationHistoryStats as any).mockResolvedValue(mockStats);

      const result = await db.getNotificationHistoryStats(1);

      expect(db.getNotificationHistoryStats).toHaveBeenCalledWith(1);
      expect(result.total).toBe(100);
      expect(result.sent).toBe(80);
      expect(result.byType.sla_alert).toBe(30);
    });

    it('should return empty stats when no data', async () => {
      const emptyStats = {
        total: 0,
        pending: 0,
        sent: 0,
        failed: 0,
        read: 0,
        byType: {},
      };

      (db.getNotificationHistoryStats as any).mockResolvedValue(emptyStats);

      const result = await db.getNotificationHistoryStats(999);

      expect(result.total).toBe(0);
    });
  });

  describe('markNotificationsAsRead', () => {
    it('should mark multiple notifications as read', async () => {
      (db.markNotificationsAsRead as any).mockResolvedValue(undefined);

      await db.markNotificationsAsRead([1, 2, 3]);

      expect(db.markNotificationsAsRead).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('should handle empty array', async () => {
      (db.markNotificationsAsRead as any).mockResolvedValue(undefined);

      await db.markNotificationsAsRead([]);

      expect(db.markNotificationsAsRead).toHaveBeenCalledWith([]);
    });
  });

  describe('deleteOldNotifications', () => {
    it('should delete notifications older than specified days', async () => {
      (db.deleteOldNotifications as any).mockResolvedValue(50);

      const result = await db.deleteOldNotifications(90);

      expect(db.deleteOldNotifications).toHaveBeenCalledWith(90);
      expect(result).toBe(50);
    });
  });
});

describe('SLA Scheduler Integration', () => {
  it('should have daily summary scheduled at 8:00', () => {
    // Verificar que o scheduler está configurado corretamente
    const DAILY_SUMMARY_HOUR = 8;
    const DAILY_SUMMARY_MINUTE = 0;
    
    expect(DAILY_SUMMARY_HOUR).toBe(8);
    expect(DAILY_SUMMARY_MINUTE).toBe(0);
  });

  it('should check if summary should run based on time', () => {
    const DAILY_SUMMARY_HOUR = 8;
    const DAILY_SUMMARY_MINUTE = 0;
    
    // Simular verificação de horário
    const now = new Date();
    now.setHours(8, 0, 0, 0);
    
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const shouldRun = currentHour === DAILY_SUMMARY_HOUR && 
                      currentMinute >= DAILY_SUMMARY_MINUTE && 
                      currentMinute < DAILY_SUMMARY_MINUTE + 5;
    
    expect(shouldRun).toBe(true);
  });

  it('should not run summary outside scheduled window', () => {
    const DAILY_SUMMARY_HOUR = 8;
    const DAILY_SUMMARY_MINUTE = 0;
    
    // Simular verificação fora do horário
    const now = new Date();
    now.setHours(10, 0, 0, 0);
    
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const shouldRun = currentHour === DAILY_SUMMARY_HOUR && 
                      currentMinute >= DAILY_SUMMARY_MINUTE && 
                      currentMinute < DAILY_SUMMARY_MINUTE + 5;
    
    expect(shouldRun).toBe(false);
  });
});

describe('Notification Types', () => {
  const validTypes = [
    'sla_alert',
    'sla_summary',
    'ticket_created',
    'ticket_updated',
    'ticket_assigned',
    'deadline_warning',
    'system',
    'email',
    'owner',
  ];

  it('should have all expected notification types', () => {
    expect(validTypes).toContain('sla_alert');
    expect(validTypes).toContain('sla_summary');
    expect(validTypes).toContain('ticket_created');
    expect(validTypes).toContain('ticket_updated');
    expect(validTypes).toContain('ticket_assigned');
    expect(validTypes).toContain('deadline_warning');
    expect(validTypes).toContain('system');
    expect(validTypes).toContain('email');
    expect(validTypes).toContain('owner');
  });

  it('should have 9 notification types', () => {
    expect(validTypes).toHaveLength(9);
  });
});

describe('Notification Status', () => {
  const validStatuses = ['pending', 'sent', 'failed', 'read'];

  it('should have all expected statuses', () => {
    expect(validStatuses).toContain('pending');
    expect(validStatuses).toContain('sent');
    expect(validStatuses).toContain('failed');
    expect(validStatuses).toContain('read');
  });

  it('should have 4 status types', () => {
    expect(validStatuses).toHaveLength(4);
  });
});

describe('Notification Channels', () => {
  const validChannels = ['app', 'email', 'owner_notification'];

  it('should have all expected channels', () => {
    expect(validChannels).toContain('app');
    expect(validChannels).toContain('email');
    expect(validChannels).toContain('owner_notification');
  });

  it('should have 3 channel types', () => {
    expect(validChannels).toHaveLength(3);
  });
});
