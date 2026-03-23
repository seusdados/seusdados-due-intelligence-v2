/**
 * uploadRetry.ts
 * Função de retry com backoff exponencial para uploads em S3
 * Evita perda de dados e melhora confiabilidade
 */

import { TRPCError } from '@trpc/server';

// Tipos de arquivo permitidos
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

// Tamanho máximo de arquivo (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Valida arquivo antes do upload
 */
export function validateFile(fileSize: number, mimeType: string, fileName: string): void {
  // Validar tamanho
  if (fileSize > MAX_FILE_SIZE) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Arquivo muito grande. Máximo permitido: 10MB. Tamanho do arquivo: ${(fileSize / 1024 / 1024).toFixed(2)}MB`
    });
  }

  // Validar tipo MIME
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Tipo de arquivo não permitido: ${mimeType}. Formatos aceitos: PDF, DOC, DOCX, TXT, JPG, PNG, XLS, XLSX`
    });
  }

  // Validar nome
  if (!fileName || fileName.trim().length === 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Nome do arquivo inválido'
    });
  }
}

/**
 * Faz upload com retry automático e backoff exponencial
 */
export async function uploadWithRetry(
  fileKey: string,
  fileBuffer: Buffer,
  mimeType: string,
  storagePutFn: (key: string, buffer: Buffer, mime: string) => Promise<{ url: string }>,
  maxRetries = 3
): Promise<{ url: string }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[Upload] Tentativa ${attempt + 1}/${maxRetries} para arquivo ${fileKey}`);
      const result = await storagePutFn(fileKey, fileBuffer, mimeType);
      console.log(`[Upload] Sucesso na tentativa ${attempt + 1} para arquivo ${fileKey}`);
      return result;
    } catch (error) {
      lastError = error as Error;
      console.error(`[Upload] Erro na tentativa ${attempt + 1}:`, lastError.message);

      if (attempt < maxRetries - 1) {
        // Backoff exponencial: 1s, 2s, 4s
        const delayMs = Math.pow(2, attempt) * 1000;
        console.log(`[Upload] Aguardando ${delayMs}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: `Falha ao enviar arquivo após ${maxRetries} tentativas. Erro: ${lastError?.message || 'Desconhecido'}. Por favor, tente novamente mais tarde.`
  });
}

/**
 * Formata mensagem de erro para o usuário
 */
export function formatUploadError(error: unknown): string {
  if (error instanceof TRPCError) {
    return error.message;
  }

  if (error instanceof Error) {
    if (error.message.includes('ENOENT')) {
      return 'Arquivo não encontrado. Tente novamente.';
    }
    if (error.message.includes('EACCES')) {
      return 'Permissão negada. Entre em contato com o administrador.';
    }
    if (error.message.includes('timeout')) {
      return 'Tempo limite excedido. Tente com um arquivo menor.';
    }
    return `Erro ao enviar arquivo: ${error.message}`;
  }

  return 'Erro desconhecido ao enviar arquivo. Tente novamente.';
}
