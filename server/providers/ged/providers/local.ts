/**
 * GEDLocalProvider — Provider padrão que usa o storage S3 já existente no projeto.
 * 
 * Armazena documentos no bucket S3 configurado via storagePut/storageGet.
 * Não requer configuração adicional além do que já existe no projeto.
 */

import { storagePut, storageGet } from '../../../storage';
import type {
  GedProvider,
  GedPutRequest,
  GedPutResult,
  GedFolderRef,
  GedListResult,
  GedMetaResult,
} from '../types';

export class GEDLocalProvider implements GedProvider {
  readonly name = 'local';

  async put(request: GedPutRequest): Promise<GedPutResult> {
    try {
      const { key, url } = await storagePut(
        request.key,
        request.data,
        request.contentType
      );

      const sizeBytes =
        typeof request.data === 'string'
          ? Buffer.byteLength(request.data, 'utf-8')
          : request.data.byteLength;

      return {
        success: true,
        file: {
          key,
          url,
          fileName: request.fileName,
          mimeType: request.contentType,
          sizeBytes,
          uploadedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        file: {
          key: request.key,
          url: '',
          fileName: request.fileName,
          mimeType: request.contentType,
          sizeBytes: 0,
          uploadedAt: new Date().toISOString(),
        },
        error: `Falha no upload para storage local: ${msg}`,
      };
    }
  }

  async getSignedUrl(key: string, _expiresInSeconds?: number): Promise<string> {
    const { url } = await storageGet(key);
    return url;
  }

  async ensureFolder(path: string): Promise<GedFolderRef> {
    // No storage S3/object, pastas são implícitas (criadas ao fazer upload).
    // Retornamos como se a pasta existisse.
    const normalizedPath = path.endsWith('/') ? path : `${path}/`;
    return {
      path: normalizedPath,
      name: normalizedPath.split('/').filter(Boolean).pop() || '',
      created: false, // Pastas são virtuais no S3
    };
  }

  async list(_folderPath: string): Promise<GedListResult> {
    // O storage S3 do projeto não suporta listagem nativa.
    // Retornamos lista vazia. A listagem real deve ser feita via banco de dados
    // (registros de documentos armazenados).
    return {
      files: [],
      folderPath: _folderPath,
    };
  }

  async meta(): Promise<GedMetaResult> {
    return {
      providerName: 'local',
      isOperational: true,
      capabilities: {
        supportsVersioning: false,
        supportsSignedUrls: true,
        supportsFolderCreation: false, // Pastas são virtuais
      },
    };
  }
}
