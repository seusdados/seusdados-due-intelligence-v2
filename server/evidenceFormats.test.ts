import { describe, it, expect } from 'vitest';
import {
  FILE_FORMAT_CATEGORIES,
  ALL_ACCEPTED_EXTENSIONS_ARRAY,
  ALL_ACCEPTED_MIMES,
  BLOCKED_EXTENSIONS,
  validateUploadFile,
  getFileCategoryByMime,
  getFileCategoryByExtension,
} from '../shared/fileUploadConfig';

describe('Validacao de Formatos de Evidencias (centralizado)', () => {
  // ===== Imagens =====
  it('deve aceitar JPEG', () => {
    expect(validateUploadFile('foto.jpg', 'image/jpeg', 5 * 1024 * 1024).valid).toBe(true);
  });
  it('deve aceitar PNG', () => {
    expect(validateUploadFile('captura.png', 'image/png', 3 * 1024 * 1024).valid).toBe(true);
  });
  it('deve aceitar GIF', () => {
    expect(validateUploadFile('animacao.gif', 'image/gif', 2 * 1024 * 1024).valid).toBe(true);
  });
  it('deve aceitar BMP', () => {
    expect(validateUploadFile('imagem.bmp', 'image/bmp', 8 * 1024 * 1024).valid).toBe(true);
  });
  it('deve aceitar WebP', () => {
    expect(validateUploadFile('foto.webp', 'image/webp', 4 * 1024 * 1024).valid).toBe(true);
  });
  it('deve aceitar SVG', () => {
    expect(validateUploadFile('icone.svg', 'image/svg+xml', 1 * 1024 * 1024).valid).toBe(true);
  });
  it('deve aceitar TIFF', () => {
    expect(validateUploadFile('scan.tiff', 'image/tiff', 9 * 1024 * 1024).valid).toBe(true);
  });

  // ===== Documentos =====
  it('deve aceitar PDF', () => {
    expect(validateUploadFile('relatorio.pdf', 'application/pdf', 20 * 1024 * 1024).valid).toBe(true);
  });
  it('deve aceitar DOC', () => {
    expect(validateUploadFile('contrato.doc', 'application/msword', 15 * 1024 * 1024).valid).toBe(true);
  });
  it('deve aceitar DOCX', () => {
    expect(validateUploadFile('contrato.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 10 * 1024 * 1024).valid).toBe(true);
  });
  it('deve aceitar ODT', () => {
    expect(validateUploadFile('texto.odt', 'application/vnd.oasis.opendocument.text', 5 * 1024 * 1024).valid).toBe(true);
  });
  it('deve aceitar RTF', () => {
    expect(validateUploadFile('nota.rtf', 'application/rtf', 3 * 1024 * 1024).valid).toBe(true);
  });
  it('deve aceitar TXT', () => {
    expect(validateUploadFile('notas.txt', 'text/plain', 1 * 1024 * 1024).valid).toBe(true);
  });
  it('deve aceitar MD', () => {
    expect(validateUploadFile('readme.md', 'text/markdown', 1 * 1024 * 1024).valid).toBe(true);
  });

  // ===== Planilhas =====
  it('deve aceitar XLS', () => {
    expect(validateUploadFile('dados.xls', 'application/vnd.ms-excel', 5 * 1024 * 1024).valid).toBe(true);
  });
  it('deve aceitar XLSX', () => {
    expect(validateUploadFile('dados.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 10 * 1024 * 1024).valid).toBe(true);
  });
  it('deve aceitar ODS', () => {
    expect(validateUploadFile('dados.ods', 'application/vnd.oasis.opendocument.spreadsheet', 8 * 1024 * 1024).valid).toBe(true);
  });
  it('deve aceitar CSV', () => {
    expect(validateUploadFile('dados.csv', 'text/csv', 2 * 1024 * 1024).valid).toBe(true);
  });

  // ===== Apresentacoes =====
  it('deve aceitar PPT', () => {
    expect(validateUploadFile('apresentacao.ppt', 'application/vnd.ms-powerpoint', 30 * 1024 * 1024).valid).toBe(true);
  });
  it('deve aceitar PPTX', () => {
    expect(validateUploadFile('apresentacao.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 40 * 1024 * 1024).valid).toBe(true);
  });
  it('deve aceitar ODP', () => {
    expect(validateUploadFile('apresentacao.odp', 'application/vnd.oasis.opendocument.presentation', 20 * 1024 * 1024).valid).toBe(true);
  });

  // ===== Compactados =====
  it('deve aceitar ZIP', () => {
    expect(validateUploadFile('evidencias.zip', 'application/zip', 40 * 1024 * 1024).valid).toBe(true);
  });
  it('deve aceitar RAR', () => {
    expect(validateUploadFile('evidencias.rar', 'application/x-rar-compressed', 30 * 1024 * 1024).valid).toBe(true);
  });
  it('deve aceitar 7Z', () => {
    expect(validateUploadFile('evidencias.7z', 'application/x-7z-compressed', 25 * 1024 * 1024).valid).toBe(true);
  });
  it('deve aceitar TAR', () => {
    expect(validateUploadFile('backup.tar', 'application/x-tar', 40 * 1024 * 1024).valid).toBe(true);
  });
  it('deve aceitar GZ', () => {
    expect(validateUploadFile('backup.gz', 'application/gzip', 40 * 1024 * 1024).valid).toBe(true);
  });

  // ===== Dados =====
  it('deve aceitar JSON', () => {
    expect(validateUploadFile('config.json', 'application/json', 2 * 1024 * 1024).valid).toBe(true);
  });
  it('deve aceitar XML', () => {
    expect(validateUploadFile('dados.xml', 'application/xml', 5 * 1024 * 1024).valid).toBe(true);
  });
  it('deve aceitar HTML', () => {
    expect(validateUploadFile('pagina.html', 'text/html', 3 * 1024 * 1024).valid).toBe(true);
  });

  // ===== Rejeicoes de seguranca =====
  it('deve rejeitar EXE', () => {
    const result = validateUploadFile('virus.exe', 'application/octet-stream', 1024);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('.exe');
  });
  it('deve rejeitar BAT', () => {
    const result = validateUploadFile('script.bat', 'application/octet-stream', 1024);
    expect(result.valid).toBe(false);
  });
  it('deve rejeitar PHP', () => {
    const result = validateUploadFile('backdoor.php', 'text/php', 1024);
    expect(result.valid).toBe(false);
  });
  it('deve rejeitar SH', () => {
    const result = validateUploadFile('script.sh', 'application/x-sh', 1024);
    expect(result.valid).toBe(false);
  });
  it('deve rejeitar PS1', () => {
    const result = validateUploadFile('script.ps1', 'application/octet-stream', 1024);
    expect(result.valid).toBe(false);
  });

  // ===== Limites de tamanho =====
  it('deve rejeitar imagem acima de 10MB', () => {
    const result = validateUploadFile('foto.jpg', 'image/jpeg', 11 * 1024 * 1024);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('10MB');
  });
  it('deve rejeitar documento acima de 25MB', () => {
    const result = validateUploadFile('relatorio.pdf', 'application/pdf', 26 * 1024 * 1024);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('25MB');
  });
  it('deve rejeitar apresentacao acima de 50MB', () => {
    const result = validateUploadFile('slides.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 51 * 1024 * 1024);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('50MB');
  });

  // ===== Consistencia da configuracao centralizada =====
  it('deve ter 6 categorias de formatos', () => {
    expect(Object.keys(FILE_FORMAT_CATEGORIES).length).toBe(6);
  });
  it('deve bloquear 18 extensoes perigosas', () => {
    expect(BLOCKED_EXTENSIONS.length).toBe(18);
  });
  it('deve ter pelo menos 30 extensoes aceitas', () => {
    expect(ALL_ACCEPTED_EXTENSIONS_ARRAY.length).toBeGreaterThanOrEqual(30);
  });
  it('deve ter pelo menos 25 MIME types aceitos', () => {
    expect(ALL_ACCEPTED_MIMES.length).toBeGreaterThanOrEqual(25);
  });
  it('getFileCategoryByMime deve retornar categoria correta', () => {
    expect(getFileCategoryByMime('application/pdf')).toBe('documento');
    expect(getFileCategoryByMime('image/png')).toBe('imagem');
    expect(getFileCategoryByMime('text/csv')).toBe('planilha');
    expect(getFileCategoryByMime('application/zip')).toBe('compactado');
    expect(getFileCategoryByMime('application/json')).toBe('dados');
  });
  it('getFileCategoryByExtension deve retornar categoria correta', () => {
    expect(getFileCategoryByExtension('relatorio.pdf')).toBe('documento');
    expect(getFileCategoryByExtension('foto.png')).toBe('imagem');
    expect(getFileCategoryByExtension('dados.csv')).toBe('planilha');
    expect(getFileCategoryByExtension('backup.zip')).toBe('compactado');
    expect(getFileCategoryByExtension('config.json')).toBe('dados');
    expect(getFileCategoryByExtension('texto.odt')).toBe('documento');
    expect(getFileCategoryByExtension('nota.rtf')).toBe('documento');
    expect(getFileCategoryByExtension('icone.svg')).toBe('imagem');
  });
});
