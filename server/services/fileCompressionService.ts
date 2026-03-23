/**
 * Serviço de Compressão Automática de Arquivos
 * 
 * Este serviço implementa compressão automática para arquivos
 * enviados ao sistema, otimizando armazenamento e transferência.
 */

import { getDb } from '../db';
import { gedDocuments } from '../../drizzle/schema';
import { eq, and, lt, isNull } from 'drizzle-orm';

// Configurações de compressão
const COMPRESSION_CONFIG = {
  // Tamanho mínimo para aplicar compressão (em bytes)
  minSizeForCompression: 1024 * 1024, // 1MB
  
  // Tamanho máximo permitido após compressão (em bytes)
  maxCompressedSize: 10 * 1024 * 1024, // 10MB
  
  // Tipos de arquivo que podem ser comprimidos
  compressibleTypes: [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  
  // Qualidade de compressão para imagens (0-100)
  imageQuality: 85,
  
  // Nível de compressão para PDFs (1-9)
  pdfCompressionLevel: 6,
};

interface CompressionResult {
  success: boolean;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  error?: string;
}

interface FileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
}

/**
 * Verifica se um arquivo deve ser comprimido
 */
export function shouldCompress(file: FileMetadata): boolean {
  // Verificar tamanho mínimo
  if (file.size < COMPRESSION_CONFIG.minSizeForCompression) {
    return false;
  }
  
  // Verificar tipo de arquivo
  if (!COMPRESSION_CONFIG.compressibleTypes.includes(file.mimeType)) {
    return false;
  }
  
  return true;
}

/**
 * Comprime um arquivo PDF usando técnicas de otimização
 * Nota: Esta é uma implementação simplificada. Em produção,
 * usar bibliotecas como pdf-lib ou ghostscript para compressão real.
 */
export async function compressPdf(fileBuffer: Buffer): Promise<{ buffer: Buffer; ratio: number }> {
  // Simulação de compressão - em produção usar pdf-lib ou ghostscript
  const originalSize = fileBuffer.length;
  
  // Por enquanto, retorna o buffer original
  // TODO: Implementar compressão real com pdf-lib
  return {
    buffer: fileBuffer,
    ratio: 1.0,
  };
}

/**
 * Comprime uma imagem usando técnicas de otimização
 * Nota: Esta é uma implementação simplificada. Em produção,
 * usar sharp ou jimp para compressão real.
 */
export async function compressImage(
  fileBuffer: Buffer,
  mimeType: string
): Promise<{ buffer: Buffer; ratio: number }> {
  // Simulação de compressão - em produção usar sharp
  const originalSize = fileBuffer.length;
  
  // Por enquanto, retorna o buffer original
  // TODO: Implementar compressão real com sharp
  return {
    buffer: fileBuffer,
    ratio: 1.0,
  };
}

/**
 * Processa e comprime um arquivo automaticamente
 */
export async function autoCompressFile(
  fileBuffer: Buffer,
  metadata: FileMetadata
): Promise<CompressionResult> {
  const originalSize = fileBuffer.length;
  
  // Verificar se deve comprimir
  if (!shouldCompress(metadata)) {
    return {
      success: true,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1.0,
    };
  }
  
  try {
    let compressedBuffer: Buffer;
    let ratio: number;
    
    // Selecionar método de compressão baseado no tipo
    if (metadata.mimeType === 'application/pdf') {
      const result = await compressPdf(fileBuffer);
      compressedBuffer = result.buffer;
      ratio = result.ratio;
    } else if (metadata.mimeType.startsWith('image/')) {
      const result = await compressImage(fileBuffer, metadata.mimeType);
      compressedBuffer = result.buffer;
      ratio = result.ratio;
    } else {
      // Outros tipos - sem compressão por enquanto
      compressedBuffer = fileBuffer;
      ratio = 1.0;
    }
    
    const compressedSize = compressedBuffer.length;
    
    // Verificar se a compressão foi efetiva
    if (compressedSize >= originalSize) {
      // Compressão não foi efetiva, manter original
      return {
        success: true,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1.0,
      };
    }
    
    return {
      success: true,
      originalSize,
      compressedSize,
      compressionRatio: compressedSize / originalSize,
    };
  } catch (error) {
    return {
      success: false,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1.0,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Calcula estatísticas de compressão para uma organização
 */
export async function getCompressionStats(organizationId: number): Promise<{
  totalFiles: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  averageCompressionRatio: number;
  spaceSaved: number;
}> {
  // Buscar documentos da organização
  const db = await getDb();
  const documents = await db
    .select()
    .from(gedDocuments)
    .where(eq(gedDocuments.organizationId, Number(organizationId)));
  
  let totalOriginalSize = 0;
  let totalCompressedSize = 0;
  
  for (const doc of documents) {
    totalOriginalSize += doc.fileSize || 0;
    // Assumindo que compressedSize seria armazenado no banco
    totalCompressedSize += doc.fileSize || 0; // Por enquanto, mesmo valor
  }
  
  const averageRatio = totalOriginalSize > 0 
    ? totalCompressedSize / totalOriginalSize 
    : 1.0;
  
  return {
    totalFiles: documents.length,
    totalOriginalSize,
    totalCompressedSize,
    averageCompressionRatio: averageRatio,
    spaceSaved: totalOriginalSize - totalCompressedSize,
  };
}

/**
 * Formata tamanho de arquivo para exibição
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Estima economia de espaço para um arquivo
 */
export function estimateCompression(mimeType: string, size: number): {
  estimatedSize: number;
  estimatedRatio: number;
  estimatedSavings: number;
} {
  // Estimativas baseadas em tipo de arquivo
  const ratios: Record<string, number> = {
    'application/pdf': 0.7, // ~30% redução
    'image/png': 0.6, // ~40% redução
    'image/jpeg': 0.85, // ~15% redução (já comprimido)
    'image/jpg': 0.85,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 0.5, // ~50% redução
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 0.5,
  };
  
  const ratio = ratios[mimeType] || 1.0;
  const estimatedSize = Math.round(size * ratio);
  
  return {
    estimatedSize,
    estimatedRatio: ratio,
    estimatedSavings: size - estimatedSize,
  };
}

export default {
  shouldCompress,
  compressPdf,
  compressImage,
  autoCompressFile,
  getCompressionStats,
  formatFileSize,
  estimateCompression,
  COMPRESSION_CONFIG,
};
