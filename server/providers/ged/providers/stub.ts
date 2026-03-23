/**
 * NoopGedProvider — Stub que retorna erros claros quando GED não está configurado.
 * 
 * Usado como fallback quando nenhum provider real está disponível.
 * Todas as operações retornam erro com mensagem explicativa.
 */

import type {
  GedProvider,
  GedPutRequest,
  GedPutResult,
  GedFolderRef,
  GedListResult,
  GedMetaResult,
} from '../types';

const NOOP_ERROR = 'GED não configurado para esta organização. Configure um provider de GED nas configurações do CPPD.';

export class NoopGedProvider implements GedProvider {
  readonly name = 'noop';

  async put(request: GedPutRequest): Promise<GedPutResult> {
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
      error: NOOP_ERROR,
    };
  }

  async getSignedUrl(_key: string): Promise<string> {
    throw new Error(NOOP_ERROR);
  }

  async ensureFolder(path: string): Promise<GedFolderRef> {
    return {
      path,
      name: '',
      created: false,
    };
  }

  async list(folderPath: string): Promise<GedListResult> {
    return {
      files: [],
      folderPath,
    };
  }

  async meta(): Promise<GedMetaResult> {
    return {
      providerName: 'noop',
      isOperational: false,
      capabilities: {
        supportsVersioning: false,
        supportsSignedUrls: false,
        supportsFolderCreation: false,
      },
    };
  }
}
