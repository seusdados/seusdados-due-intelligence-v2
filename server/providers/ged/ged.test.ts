import { describe, it, expect } from 'vitest';
import { NoopGedProvider } from './providers/stub';
import { buildCppdGedPaths } from './index';

describe('GED — NoopGedProvider', () => {
  const provider = new NoopGedProvider();

  it('deve retornar sucesso falso ao tentar armazenar', async () => {
    const result = await provider.put({
      key: 'test-key',
      data: Buffer.from('data'),
      contentType: 'application/pdf',
      fileName: 'test.pdf',
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('deve lançar erro ao tentar obter URL assinada', async () => {
    await expect(provider.getSignedUrl('test-key')).rejects.toThrow();
  });

  it('deve retornar pasta sem criação ao chamar ensureFolder', async () => {
    const result = await provider.ensureFolder('test/path');
    expect(result.path).toBe('test/path');
    expect(result.created).toBe(false);
  });

  it('deve retornar lista vazia ao listar', async () => {
    const result = await provider.list('prefix/');
    expect(result.files).toEqual([]);
    expect(result.folderPath).toBe('prefix/');
  });

  it('meta deve indicar que não está operacional', async () => {
    const meta = await provider.meta();
    expect(meta.isOperational).toBe(false);
    expect(meta.providerName).toBe('noop');
  });
});

describe('GED — buildCppdGedPaths', () => {
  it('deve gerar caminhos corretos para ata', () => {
    const paths = buildCppdGedPaths(1, 2026);
    expect(paths.atas).toBe('organizations/org-1/cppd/2026/atas/');
    expect(paths.deliberacoes).toBe('organizations/org-1/cppd/2026/deliberacoes/');
    expect(paths.gravacoes).toBe('organizations/org-1/cppd/2026/gravacoes/');
    expect(paths.planoAcao).toBe('organizations/org-1/cppd/2026/plano-acao/');
  });

  it('deve aceitar diferentes organizações e anos', () => {
    const paths = buildCppdGedPaths(42, 2027);
    expect(paths.atas).toBe('organizations/org-42/cppd/2027/atas/');
  });

  it('deve gerar caminho de arquivo de ata com sequência', () => {
    const paths = buildCppdGedPaths(1, 2026);
    expect(paths.ataFile(3)).toBe('organizations/org-1/cppd/2026/atas/ata_reuniao_03.pdf');
    expect(paths.ataFile(12, 'docx')).toBe('organizations/org-1/cppd/2026/atas/ata_reuniao_12.docx');
  });
});
