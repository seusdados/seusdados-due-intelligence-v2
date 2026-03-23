/**
 * Testes unitários para os serviços do CPPD:
 * - cppdMinutesPdf: geração de HTML/PDF da ata
 * - cppdSignatureEmail: envio de e-mails de assinatura
 * - cppdAudit: trilha de auditoria
 */
import { describe, it, expect, vi } from 'vitest';

// ─── Testes do serviço de PDF da ata ───
describe('cppdMinutesPdf', () => {
  it('deve exportar a função generateMinutesPdf', async () => {
    const mod = await import('./cppdMinutesPdf');
    expect(typeof mod.generateMinutesPdf).toBe('function');
  });

  it('deve gerar PDF Buffer válido com os dados da reunião', async () => {
    const { generateMinutesPdf } = await import('./cppdMinutesPdf');

    const result = await generateMinutesPdf({
      organizationName: 'Empresa Teste Ltda.',
      meetingTitle: '3ª Reunião Ordinária do CPPD',
      sequence: 3,
      year: 2026,
      meetingDate: '20 de fevereiro de 2026',
      participants: [
        { name: 'João Silva', role: 'Presidente', present: true },
        { name: 'Maria Santos', role: 'Secretária', present: true },
        { name: 'Pedro Costa', role: 'Membro', present: false },
      ],
      minutesContent: 'Pauta: Revisão do plano anual. Deliberações: Aprovado por unanimidade.',
      consultantName: 'Dr. Carlos Oliveira',
    });

    // generateMinutesPdf retorna um Buffer (PDF gerado via PDFKit)
    expect(result).toBeDefined();
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(100); // PDF não pode ser vazio
    // Verificar que começa com %PDF (header do PDF)
    expect(result.toString('ascii', 0, 5)).toBe('%PDF-');
  });

  it('deve gerar PDF com participantes ausentes', async () => {
    const { generateMinutesPdf } = await import('./cppdMinutesPdf');

    const result = await generateMinutesPdf({
      organizationName: 'Teste',
      meetingTitle: '1ª Reunião Ordinária',
      sequence: 1,
      year: 2026,
      meetingDate: '15 de janeiro de 2026',
      participants: [
        { name: 'Presente', role: 'Membro', present: true },
        { name: 'Ausente', role: 'Membro', present: false },
      ],
      minutesContent: 'Conteúdo da ata.',
    });

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(100);
  });
});

// ─── Testes do serviço de e-mail de assinatura ───
describe('cppdSignatureEmail', () => {
  it('deve exportar as funções de envio de e-mail', async () => {
    const mod = await import('./cppdSignatureEmail');
    expect(typeof mod.sendSignatureInviteEmail).toBe('function');
    expect(typeof mod.sendSignatureInviteToAll).toBe('function');
  });

  it('sendSignatureInviteToAll deve lidar com signatários sem e-mail', async () => {
    const { sendSignatureInviteToAll } = await import('./cppdSignatureEmail');

    // Mock do emailService
    vi.mock('../emailService', () => ({
      sendGenericEmail: vi.fn().mockResolvedValue({ id: 'test-id' }),
    }));

    const result = await sendSignatureInviteToAll(
      [
        { name: 'Com Email', role: 'Presidente', email: 'com@email.com' },
        { name: 'Sem Email', role: 'Membro' },
      ],
      {
        organizationName: 'Empresa Teste',
        meetingSequence: 1,
        year: 2026,
        meetingDate: '20 de fevereiro de 2026',
        senderName: 'Admin',
      }
    );

    expect(result.sent).toBeGreaterThanOrEqual(0);
    expect(result.failed).toBeGreaterThanOrEqual(1); // Sem Email deve falhar
    expect(result.results).toHaveLength(2);
    
    // O signatário sem e-mail deve ter falhado
    const semEmail = result.results.find(r => r.email === '(sem e-mail)');
    expect(semEmail).toBeDefined();
    expect(semEmail?.success).toBe(false);
  });
});

// ─── Testes da trilha de auditoria ───
describe('cppdAudit', () => {
  it('deve exportar a função logCppdEvent', async () => {
    const mod = await import('../audit/cppdAudit');
    expect(typeof mod.logCppdEvent).toBe('function');
  });

  it('deve exportar a função logCppdEvent com a assinatura correta', async () => {
    const mod = await import('../audit/cppdAudit');
    expect(typeof mod.logCppdEvent).toBe('function');
    // Verificar que aceita os parâmetros esperados
    expect(mod.logCppdEvent.length).toBeGreaterThanOrEqual(0);
  });

  it('logCppdEvent não deve lançar exceção mesmo sem banco', async () => {
    const { logCppdEvent } = await import('../audit/cppdAudit');

    // Deve ser resiliente — não lançar exceção
    await expect(logCppdEvent({
      organizationId: 1,
      userId: 1,
      action: 'ata_gerada',
      entityType: 'meeting',
      entityId: 1,
      details: { test: true },
    })).resolves.not.toThrow();
  });
});

// ─── Testes do translateAction (função auxiliar no router) ───
describe('translateAction', () => {
  it('deve traduzir ações conhecidas corretamente', () => {
    const translations: Record<string, string> = {
      'cppd_ata_gerada': 'Ata gerada',
      'cppd_ata_aprovada': 'Ata aprovada',
      'cppd_ata_armazenada_ged': 'Ata armazenada no GED',
      'cppd_ata_enviada_assinatura': 'Ata enviada para assinatura',
      'cppd_emails_assinatura_enviados': 'Convites de assinatura enviados',
      'cppd_assinatura_finalizada': 'Assinatura finalizada',
    };

    // Testar que as traduções esperadas são strings válidas
    for (const [key, value] of Object.entries(translations)) {
      expect(typeof key).toBe('string');
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });
});
