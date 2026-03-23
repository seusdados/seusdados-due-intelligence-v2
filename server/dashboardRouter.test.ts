import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logActivity } from './dashboardRouter';

// Mock do getDb
vi.mock('./db', () => ({
  getDb: vi.fn().mockResolvedValue({
    execute: vi.fn().mockResolvedValue([[], []]),
  }),
}));

describe('dashboardRouter', () => {
  describe('logActivity', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('deve registrar atividade sem erro', async () => {
      await expect(logActivity({
        organizationId: 1,
        userId: 1,
        userName: 'Teste',
        activityType: 'ticket_criado',
        module: 'meudpo',
        description: 'Ticket criado: Teste',
      })).resolves.not.toThrow();
    });

    it('deve aceitar parâmetros opcionais', async () => {
      await expect(logActivity({
        organizationId: 1,
        userId: 1,
        activityType: 'avaliacao_criada',
        module: 'conformidade',
        description: 'Avaliação criada',
        entityType: 'assessment',
        entityId: 123,
        entityName: 'Avaliação LGPD',
        metadata: { framework: 'lgpd' },
      })).resolves.not.toThrow();
    });

    it('deve tratar erro silenciosamente', async () => {
      const { getDb } = await import('./db');
      (getDb as any).mockResolvedValueOnce({
        execute: vi.fn().mockRejectedValue(new Error('DB error')),
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await expect(logActivity({
        organizationId: 1,
        userId: 1,
        activityType: 'test',
        module: 'test',
        description: 'test',
      })).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ActivityLog]'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('severityConfig (frontend)', () => {
    it('deve calcular severidade corretamente baseado em dias restantes', () => {
      // Simular lógica do frontend
      const calcSeverity = (dias: number) => {
        if (dias < 0) return 'vencido';
        if (dias <= 3) return 'critico';
        if (dias <= 7) return 'atencao';
        return 'normal';
      };

      expect(calcSeverity(-5)).toBe('vencido');
      expect(calcSeverity(-1)).toBe('vencido');
      expect(calcSeverity(0)).toBe('critico');
      expect(calcSeverity(3)).toBe('critico');
      expect(calcSeverity(4)).toBe('atencao');
      expect(calcSeverity(7)).toBe('atencao');
      expect(calcSeverity(8)).toBe('normal');
      expect(calcSeverity(30)).toBe('normal');
    });
  });

  describe('formatTimeAgo (frontend)', () => {
    it('deve formatar tempo relativo corretamente', () => {
      const formatTimeAgo = (dateStr: string): string => {
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return 'agora';
        if (diffMin < 60) return `${diffMin}min atrás`;
        if (diffHours < 24) return `${diffHours}h atrás`;
        if (diffDays < 7) return `${diffDays}d atrás`;
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      };

      // Agora
      expect(formatTimeAgo(new Date().toISOString())).toBe('agora');

      // 5 minutos atrás
      const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
      expect(formatTimeAgo(fiveMinAgo)).toBe('5min atrás');

      // 3 horas atrás
      const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toISOString();
      expect(formatTimeAgo(threeHoursAgo)).toBe('3h atrás');

      // 2 dias atrás
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
      expect(formatTimeAgo(twoDaysAgo)).toBe('2d atrás');
    });
  });

  describe('calendarDays logic', () => {
    it('deve gerar dias do mês corretamente', () => {
      const now = new Date(2026, 1, 21); // Fev 2026
      const year = now.getFullYear();
      const month = now.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      expect(daysInMonth).toBe(28); // Fevereiro 2026
      expect(firstDay).toBeGreaterThanOrEqual(0);
      expect(firstDay).toBeLessThanOrEqual(6);
    });

    it('deve mapear eventos em dias corretamente', () => {
      const eventDays = new Map<number, { type: string; count: number }>();
      
      const items = [
        { date: '2026-02-15T12:00:00', severity: 'vencido' },
        { date: '2026-02-15T12:00:00', severity: 'critico' },
        { date: '2026-02-20T12:00:00', severity: 'normal' },
      ];

      items.forEach((item) => {
        const d = new Date(item.date);
        if (d.getMonth() === 1 && d.getFullYear() === 2026) {
          const day = d.getDate();
          const existing = eventDays.get(day);
          const severity = item.severity || 'normal';
          if (!existing || severity === 'vencido' || severity === 'critico') {
            eventDays.set(day, { type: severity, count: (existing?.count || 0) + 1 });
          }
        }
      });

      // Dia 15 tem 2 eventos, o segundo (critico) sobrescreve o primeiro (vencido)
      expect(eventDays.get(15)?.type).toBe('critico');
      expect(eventDays.get(15)?.count).toBe(2);
      expect(eventDays.get(20)).toEqual({ type: 'normal', count: 1 });
      expect(eventDays.has(10)).toBe(false);
    });
  });
});
