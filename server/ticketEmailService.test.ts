import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do notifyOwner
vi.mock('./_core/notification', () => ({
  notifyOwner: vi.fn().mockResolvedValue(true)
}));

// Mock do getDb
vi.mock('./db', () => ({
  getDb: vi.fn().mockResolvedValue(null)
}));

import { 
  notifyTicketCreated, 
  notifyTicketStatusChanged, 
  notifyTicketSLAWarning,
  notifyTicketEscalated,
  notifyTicketComment,
  type TicketEmailData
} from './emailService';
import { notifyOwner } from './_core/notification';

describe('ticketEmailService', () => {
  const mockTicketData: TicketEmailData = {
    ticketId: 1,
    ticketTitle: 'Teste de Ticket',
    ticketDescription: 'Descrição do ticket de teste para validar o serviço de email.',
    ticketType: 'consultoria_geral',
    priority: 'alta',
    status: 'novo',
    organizationName: 'Seusdados Consultoria',
    createdByName: 'João Silva',
    assignedToName: 'Maria Santos',
    deadline: new Date('2025-12-15T10:00:00Z'),
    slaLevel: 'prioritario'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('notifyTicketCreated', () => {
    it('should send notification for new ticket', async () => {
      const result = await notifyTicketCreated(mockTicketData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Notificação enviada com sucesso');
      expect(notifyOwner).toHaveBeenCalledTimes(1);
      
      const call = vi.mocked(notifyOwner).mock.calls[0][0];
      expect(call.title).toContain('Novo Ticket #1');
      expect(call.title).toContain('Teste de Ticket');
      expect(call.content).toContain('Seusdados Consultoria');
      expect(call.content).toContain('João Silva');
    });

    it('should include ticket type and priority in notification', async () => {
      await notifyTicketCreated(mockTicketData);

      const call = vi.mocked(notifyOwner).mock.calls[0][0];
      expect(call.content).toContain('Consultoria Geral');
      expect(call.content).toContain('Alta');
    });
  });

  describe('notifyTicketStatusChanged', () => {
    it('should send notification for status change', async () => {
      const result = await notifyTicketStatusChanged(
        mockTicketData,
        'novo',
        'em_analise',
        'Admin User'
      );

      expect(result.success).toBe(true);
      expect(notifyOwner).toHaveBeenCalledTimes(1);
      
      const call = vi.mocked(notifyOwner).mock.calls[0][0];
      expect(call.title).toContain('Status Atualizado');
      expect(call.content).toContain('Novo');
      expect(call.content).toContain('Em Análise');
      expect(call.content).toContain('Admin User');
    });
  });

  describe('notifyTicketSLAWarning', () => {
    it('should send urgent notification when less than 2 hours remaining', async () => {
      const result = await notifyTicketSLAWarning(mockTicketData, 1.5);

      expect(result.success).toBe(true);
      expect(notifyOwner).toHaveBeenCalledTimes(1);
      
      const call = vi.mocked(notifyOwner).mock.calls[0][0];
      expect(call.title).toContain('URGENTE');
      expect(call.title).toContain('2h');
    });

    it('should send attention notification when less than 8 hours remaining', async () => {
      const result = await notifyTicketSLAWarning(mockTicketData, 6);

      expect(result.success).toBe(true);
      
      const call = vi.mocked(notifyOwner).mock.calls[0][0];
      expect(call.title).toContain('ATENÇÃO');
    });

    it('should send warning notification when more than 8 hours remaining', async () => {
      const result = await notifyTicketSLAWarning(mockTicketData, 12);

      expect(result.success).toBe(true);
      
      const call = vi.mocked(notifyOwner).mock.calls[0][0];
      expect(call.title).toContain('AVISO');
    });
  });

  describe('notifyTicketEscalated', () => {
    it('should send escalation notification', async () => {
      const result = await notifyTicketEscalated(
        mockTicketData,
        'SLA próximo de estourar',
        'Supervisor Admin'
      );

      expect(result.success).toBe(true);
      expect(notifyOwner).toHaveBeenCalledTimes(1);
      
      const call = vi.mocked(notifyOwner).mock.calls[0][0];
      expect(call.title).toContain('Escalonado');
      expect(call.content).toContain('Supervisor Admin');
      expect(call.content).toContain('SLA próximo de estourar');
    });
  });

  describe('notifyTicketComment', () => {
    it('should send notification for public comment', async () => {
      const result = await notifyTicketComment(
        mockTicketData,
        'João Silva',
        'Este é um comentário de teste.',
        false
      );

      expect(result.success).toBe(true);
      expect(notifyOwner).toHaveBeenCalledTimes(1);
      
      const call = vi.mocked(notifyOwner).mock.calls[0][0];
      expect(call.title).toContain('Novo Comentário');
      expect(call.content).toContain('João Silva');
      expect(call.content).toContain('Este é um comentário de teste.');
      expect(call.content).toContain('Comentário Público');
    });

    it('should send notification for internal comment', async () => {
      const result = await notifyTicketComment(
        mockTicketData,
        'Maria Santos',
        'Comentário interno para a equipe.',
        true
      );

      expect(result.success).toBe(true);
      
      const call = vi.mocked(notifyOwner).mock.calls[0][0];
      expect(call.title).toContain('Comentário Interno');
      expect(call.content).toContain('Comentário Interno');
    });
  });

  describe('error handling', () => {
    it('should handle notification failure gracefully', async () => {
      vi.mocked(notifyOwner).mockResolvedValueOnce(false);

      const result = await notifyTicketCreated(mockTicketData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Falha ao enviar notificação');
    });
  });
});
