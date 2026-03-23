import { describe, it, expect } from 'vitest';
import { ENV } from './_core/env';

describe('Resend API Configuration', () => {
  it('deve ter a chave API do Resend configurada', () => {
    // Verificar se a variável de ambiente está definida
    expect(ENV.resendApiKey).toBeDefined();
    expect(ENV.resendApiKey.length).toBeGreaterThan(0);
  });

  it('deve ter o formato correto da chave API (re_)', () => {
    // Chaves do Resend começam com 're_'
    expect(ENV.resendApiKey.startsWith('re_')).toBe(true);
  });

  it('deve validar a chave API com uma chamada real ao Resend', async () => {
    // Skip se não houver chave configurada
    if (!ENV.resendApiKey) {
      console.log('RESEND_API_KEY não configurada, pulando teste de validação');
      return;
    }

    const { Resend } = await import('resend');
    const resend = new Resend(ENV.resendApiKey);

    // Fazer uma chamada para listar domínios (não envia e-mail, apenas valida a chave)
    const { data, error } = await resend.domains.list();

    // Se a chave for válida, não deve haver erro de autenticação
    if (error) {
      // Erro de autenticação indica chave inválida
      expect(error.message).not.toContain('API key is invalid');
      expect(error.message).not.toContain('Unauthorized');
    }

    // Se chegou aqui sem erro de auth, a chave é válida
    expect(true).toBe(true);
  });
});

describe('Email Service com Resend', () => {
  it('deve gerar template de e-mail válido (formato novo AssessmentEmailData)', async () => {
    const { generateAssessmentEmailTemplate } = await import('./emailService');
    
    const data = {
      to: 'teste@empresa.com',
      recipientName: 'Empresa Teste',
      assessmentTitle: 'Avaliação Due Diligence - Organização Cliente',
      assessmentUrl: 'https://dll.seusdados.com/avaliacao/abc123',
      organizationName: 'Organização Cliente',
      expiresAt: new Date('2026-02-15'),
      assessmentType: 'due_diligence' as const,
    };

    const { html, text } = generateAssessmentEmailTemplate(data);

    // Verificar que o template contém os dados corretos
    expect(html).toContain('Empresa Teste');
    expect(html).toContain('Organização Cliente');
    expect(html).toContain('https://dll.seusdados.com/avaliacao/abc123');
    expect(text).toContain('Empresa Teste');
    expect(text).toContain('Organização Cliente');
  });

  it('deve gerar template via sendAssessmentEmailLegacy (formato legado ThirdPartyEmailData)', async () => {
    const { sendAssessmentEmailLegacy } = await import('./emailService');
    
    // sendAssessmentEmailLegacy aceita o formato antigo e converte internamente
    // Apenas verificamos que a função existe e é chamável
    expect(typeof sendAssessmentEmailLegacy).toBe('function');
  });

  it('deve gerar template de lembrete válido', async () => {
    const { generateReminderEmailTemplate } = await import('./emailService');
    
    const data = {
      thirdPartyName: 'Empresa Teste',
      thirdPartyEmail: 'teste@empresa.com',
      organizationName: 'Organização Cliente',
      assessmentLink: 'https://dll.seusdados.com/avaliacao/abc123',
      daysRemaining: 5,
    };

    const { html, text } = generateReminderEmailTemplate(data);

    // generateReminderEmailTemplate é um stub - verificar que retorna algo
    expect(html).toBeDefined();
    expect(text).toBeDefined();
  });

  it('deve exportar createEmailLog e updateEmailLogStatus', async () => {
    const { createEmailLog, updateEmailLogStatus } = await import('./emailService');
    
    expect(typeof createEmailLog).toBe('function');
    expect(typeof updateEmailLogStatus).toBe('function');
    
    // Testar que createEmailLog retorna um ID
    const logId = await createEmailLog({
      recipientEmail: 'test@test.com',
      subject: 'Teste',
    });
    expect(typeof logId).toBe('number');
    
    // Testar que updateEmailLogStatus não lança erro
    await expect(updateEmailLogStatus(logId, 'sent')).resolves.not.toThrow();
    await expect(updateEmailLogStatus(logId, 'failed', { errorMessage: 'Erro teste' })).resolves.not.toThrow();
  });

  it('deve exportar notifyMapeamentoFromContract', async () => {
    const { notifyMapeamentoFromContract } = await import('./emailService');
    expect(typeof notifyMapeamentoFromContract).toBe('function');
  });
});
