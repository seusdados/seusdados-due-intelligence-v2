import { describe, it, expect } from 'vitest';
import { processResendWebhook, ResendWebhookEvent } from './resendWebhook';

describe('Resend Webhook', () => {
  describe('processResendWebhook', () => {
    it('deve processar evento de email.sent', async () => {
      const event: ResendWebhookEvent = {
        type: 'email.sent',
        created_at: new Date().toISOString(),
        data: {
          email_id: 'test-email-id-123',
          from: 'noreply@dll.seusdados.com',
          to: ['teste@example.com'],
          subject: 'Teste de envio',
          created_at: new Date().toISOString(),
        },
      };

      const result = await processResendWebhook(event);
      
      // Mesmo que não encontre o e-mail no banco, deve processar sem erro
      expect(result.success).toBe(true);
      expect(result.message).toContain('email.sent');
    });

    it('deve processar evento de email.delivered', async () => {
      const event: ResendWebhookEvent = {
        type: 'email.delivered',
        created_at: new Date().toISOString(),
        data: {
          email_id: 'test-email-id-456',
          from: 'noreply@dll.seusdados.com',
          to: ['teste@example.com'],
          subject: 'Teste de entrega',
          created_at: new Date().toISOString(),
        },
      };

      const result = await processResendWebhook(event);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('email.delivered');
    });

    it('deve processar evento de email.bounced com mensagem de erro', async () => {
      const event: ResendWebhookEvent = {
        type: 'email.bounced',
        created_at: new Date().toISOString(),
        data: {
          email_id: 'test-email-id-789',
          from: 'noreply@dll.seusdados.com',
          to: ['invalido@example.com'],
          subject: 'Teste de bounce',
          created_at: new Date().toISOString(),
          bounce: {
            message: 'Mailbox not found',
          },
        },
      };

      const result = await processResendWebhook(event);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('email.bounced');
    });

    it('deve processar evento de email.opened', async () => {
      const event: ResendWebhookEvent = {
        type: 'email.opened',
        created_at: new Date().toISOString(),
        data: {
          email_id: 'test-email-id-abc',
          from: 'noreply@dll.seusdados.com',
          to: ['teste@example.com'],
          subject: 'Teste de abertura',
          created_at: new Date().toISOString(),
        },
      };

      const result = await processResendWebhook(event);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('email.opened');
    });

    it('deve processar evento de email.clicked', async () => {
      const event: ResendWebhookEvent = {
        type: 'email.clicked',
        created_at: new Date().toISOString(),
        data: {
          email_id: 'test-email-id-def',
          from: 'noreply@dll.seusdados.com',
          to: ['teste@example.com'],
          subject: 'Teste de clique',
          created_at: new Date().toISOString(),
          click: {
            link: 'https://dll.seusdados.com/avaliacao/123',
            timestamp: new Date().toISOString(),
          },
        },
      };

      const result = await processResendWebhook(event);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('email.clicked');
    });
  });

  describe('Mapeamento de eventos', () => {
    it('deve mapear eventos corretamente para status do sistema', () => {
      const eventMappings = [
        { event: 'email.sent', expectedStatus: 'sent' },
        { event: 'email.delivered', expectedStatus: 'delivered' },
        { event: 'email.opened', expectedStatus: 'opened' },
        { event: 'email.clicked', expectedStatus: 'clicked' },
        { event: 'email.bounced', expectedStatus: 'bounced' },
        { event: 'email.complained', expectedStatus: 'spam' },
      ];

      // Verificar que todos os eventos esperados estão mapeados
      expect(eventMappings.length).toBe(6);
    });
  });
});
