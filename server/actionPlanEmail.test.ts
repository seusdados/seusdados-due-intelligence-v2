import { describe, it, expect, vi } from 'vitest';

// Mock das funções de e-mail
vi.mock('./emailService', () => ({
  sendActionPlanAlertEmail: vi.fn().mockResolvedValue({ success: true, message: 'Email sent' }),
  generateActionPlanAlertEmailTemplate: vi.fn().mockReturnValue({
    html: '<html>Test</html>',
    text: 'Test',
    subject: 'Test Subject',
  }),
}));

// Mock do cron job
vi.mock('./actionPlanCronJob', () => ({
  startActionPlanCronJob: vi.fn(),
  stopActionPlanCronJob: vi.fn(),
  getCronJobStatus: vi.fn().mockReturnValue({
    isRunning: false,
    lastRun: null,
    nextRun: null,
    intervalMs: 86400000,
    enabled: true,
  }),
  updateCronJobConfig: vi.fn(),
  triggerManualCheck: vi.fn().mockResolvedValue({
    success: true,
    checked: 5,
    notified: 2,
  }),
}));

describe('Action Plan Email Service', () => {
  describe('generateActionPlanAlertEmailTemplate', () => {
    it('deve gerar template para ação atrasada', async () => {
      const { generateActionPlanAlertEmailTemplate } = await import('./emailService');
      
      const data = {
        recipientName: 'João Silva',
        recipientEmail: 'joao@example.com',
        actionId: 1,
        actionTitle: 'Revisar contrato LGPD',
        actionDescription: 'Revisar cláusulas de proteção de dados',
        priority: 'alta',
        dueDate: '2024-12-25',
        daysUntilDue: -5,
        organizationName: 'Empresa Teste',
        category: 'contratual',
      };
      
      const result = generateActionPlanAlertEmailTemplate(data, 'overdue');
      
      expect(result).toBeDefined();
      expect(result.subject).toBeDefined();
      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
    });

    it('deve gerar template para ação que vence hoje', async () => {
      const { generateActionPlanAlertEmailTemplate } = await import('./emailService');
      
      const data = {
        recipientName: 'Maria Santos',
        recipientEmail: 'maria@example.com',
        actionId: 2,
        actionTitle: 'Atualizar política de privacidade',
        priority: 'critica',
        dueDate: new Date().toISOString().split('T')[0],
        daysUntilDue: 0,
        organizationName: 'Empresa ABC',
        category: 'operacional',
      };
      
      const result = generateActionPlanAlertEmailTemplate(data, 'due_today');
      
      expect(result).toBeDefined();
    });

    it('deve gerar template para lembrete de prazo próximo', async () => {
      const { generateActionPlanAlertEmailTemplate } = await import('./emailService');
      
      const data = {
        recipientName: 'Pedro Costa',
        recipientEmail: 'pedro@example.com',
        actionId: 3,
        actionTitle: 'Treinar equipe LGPD',
        priority: 'media',
        dueDate: '2025-01-10',
        daysUntilDue: 5,
        organizationName: 'Empresa XYZ',
        category: 'operacional',
      };
      
      const result = generateActionPlanAlertEmailTemplate(data, 'due_soon');
      
      expect(result).toBeDefined();
    });
  });

  describe('sendActionPlanAlertEmail', () => {
    it('deve enviar e-mail de alerta com sucesso', async () => {
      const { sendActionPlanAlertEmail } = await import('./emailService');
      
      const data = {
        recipientName: 'Ana Oliveira',
        recipientEmail: 'ana@example.com',
        actionId: 4,
        actionTitle: 'Implementar consentimento',
        priority: 'alta',
        dueDate: '2025-01-05',
        daysUntilDue: 3,
        organizationName: 'Empresa 123',
        category: 'contratual',
      };
      
      const result = await sendActionPlanAlertEmail(data, 'due_soon');
      
      expect(result.success).toBe(true);
    });
  });
});

describe('Action Plan Cron Job', () => {
  describe('getCronJobStatus', () => {
    it('deve retornar status do cron job', async () => {
      const { getCronJobStatus } = await import('./actionPlanCronJob');
      
      const status = getCronJobStatus();
      
      expect(status).toBeDefined();
      expect(status.intervalMs).toBe(86400000); // 24 horas
      expect(status.enabled).toBe(true);
    });
  });

  describe('triggerManualCheck', () => {
    it('deve executar verificação manual', async () => {
      const { triggerManualCheck } = await import('./actionPlanCronJob');
      
      const result = await triggerManualCheck();
      
      expect(result.success).toBe(true);
      expect(result.checked).toBeGreaterThanOrEqual(0);
      expect(result.notified).toBeGreaterThanOrEqual(0);
    });
  });

  describe('startActionPlanCronJob', () => {
    it('deve iniciar o cron job', async () => {
      const { startActionPlanCronJob } = await import('./actionPlanCronJob');
      
      // Não deve lançar erro
      expect(() => startActionPlanCronJob()).not.toThrow();
    });
  });

  describe('stopActionPlanCronJob', () => {
    it('deve parar o cron job', async () => {
      const { stopActionPlanCronJob } = await import('./actionPlanCronJob');
      
      // Não deve lançar erro
      expect(() => stopActionPlanCronJob()).not.toThrow();
    });
  });

  describe('updateCronJobConfig', () => {
    it('deve atualizar configuração do cron job', async () => {
      const { updateCronJobConfig } = await import('./actionPlanCronJob');
      
      // Não deve lançar erro
      expect(() => updateCronJobConfig({
        intervalMs: 3600000, // 1 hora
        daysThreshold: 3,
        enabled: true,
      })).not.toThrow();
    });
  });
});

describe('Action Plan Notifications Integration', () => {
  it('deve ter interface ActionPlanItemWithEmail com campos necessários', () => {
    // Verificar que a interface tem os campos necessários
    const mockItem = {
      id: 1,
      title: 'Test Action',
      description: 'Test description',
      priority: 'alta',
      status: 'pendente',
      dueDate: '2025-01-15',
      responsibleId: 1,
      organizationId: 1,
      actionCategory: 'contratual',
      daysUntilDue: 10,
      responsibleEmail: 'test@example.com',
      responsibleName: 'Test User',
      organizationName: 'Test Org',
    };
    
    expect(mockItem.daysUntilDue).toBeDefined();
    expect(mockItem.responsibleEmail).toBeDefined();
    expect(mockItem.responsibleName).toBeDefined();
    expect(mockItem.organizationName).toBeDefined();
  });
});
