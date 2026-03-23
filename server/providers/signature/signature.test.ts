import { describe, it, expect } from 'vitest';
import { NoopSignatureProvider } from './providers/stub';
import { GovBrSignatureProvider } from './providers/govbr';

describe('Assinatura — NoopSignatureProvider', () => {
  const provider = new NoopSignatureProvider();

  it('deve retornar sucesso falso ao enviar para assinatura', async () => {
    const result = await provider.sendForSignature({
      organizationId: 1,
      meetingId: 1,
      documentContent: 'conteúdo da ata',
      signers: [{ userId: 1, name: 'Teste', role: 'DPO' }],
    });
    expect(result.success).toBe(false);
    expect(result.status).toBe('pendente');
    expect(result.message).toContain('provedor');
  });

  it('deve retornar status pendente', async () => {
    const result = await provider.getStatus(1, 1);
    expect(result.status).toBe('pendente');
    expect(result.totalSigners).toBe(0);
  });

  it('deve retornar sucesso falso ao fazer upload', async () => {
    const result = await provider.uploadSigned({
      organizationId: 1,
      meetingId: 1,
      signedPdfData: Buffer.from('pdf'),
      fileName: 'ata.pdf',
      uploadedByUserId: 1,
    });
    expect(result.success).toBe(false);
  });

  it('deve retornar sucesso falso ao finalizar', async () => {
    const result = await provider.finalize(1, 1);
    expect(result.success).toBe(false);
  });

  it('meta deve indicar que não está operacional', () => {
    const meta = provider.meta();
    expect(meta.isOperational).toBe(false);
    expect(meta.requiresExternalService).toBe(false);
  });
});

describe('Assinatura — GovBrSignatureProvider (skeleton)', () => {
  const provider = new GovBrSignatureProvider();

  it('deve retornar sucesso falso (não implementado)', async () => {
    const result = await provider.sendForSignature({
      organizationId: 1,
      meetingId: 1,
      documentContent: 'conteúdo',
      signers: [{ userId: 1, name: 'Teste', role: 'DPO' }],
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('não implementada');
  });

  it('meta deve indicar que requer serviço externo', () => {
    const meta = provider.meta();
    expect(meta.isOperational).toBe(false);
    expect(meta.requiresExternalService).toBe(true);
    expect(meta.name).toContain('Gov.br');
  });
});
