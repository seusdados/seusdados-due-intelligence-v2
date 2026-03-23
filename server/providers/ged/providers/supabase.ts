/**
 * SupabaseGedProvider — Provider de GED usando Supabase Storage.
 * 
 * Armazena documentos no Supabase Storage usando o bucket configurado.
 * Requer:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - SUPABASE_STORAGE_BUCKET_CPPD (nome do bucket, default: "cppd-ged")
 * 
 * Todas as URLs são signed (pré-assinadas) — nunca expõe caminhos brutos.
 * Multi-tenant: chaves sempre prefixadas por "organizations/org-<id>/...".
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../../../supabaseClient';
import { logger } from '../../../_core/logger';
import type {
  GedProvider,
  GedPutRequest,
  GedPutResult,
  GedFolderRef,
  GedListResult,
  GedMetaResult,
  GedFileRef,
} from '../types';

/** Nome do bucket (env var ou default) */
function getBucketName(): string {
  return process.env.SUPABASE_STORAGE_BUCKET_CPPD || 'cppd-ged';
}

export class SupabaseGedProvider implements GedProvider {
  readonly name = 'supabase';

  /**
   * Faz upload de um arquivo para o Supabase Storage.
   * Usa upsert para permitir sobrescrita (versionamento manual).
   */
  async put(request: GedPutRequest): Promise<GedPutResult> {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return {
        success: false,
        file: this.emptyFileRef(request),
        error: 'Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.',
      };
    }

    const bucket = getBucketName();

    try {
      // Garantir que o bucket existe (idempotente)
      await this.ensureBucket(bucket);

      // Converter dados para Uint8Array se necessário
      let fileData: Uint8Array | string;
      if (typeof request.data === 'string') {
        fileData = new TextEncoder().encode(request.data);
      } else if (Buffer.isBuffer(request.data)) {
        fileData = new Uint8Array(request.data);
      } else {
        fileData = request.data;
      }

      const { data, error } = await admin.storage
        .from(bucket)
        .upload(request.key, fileData, {
          contentType: request.contentType,
          upsert: true,
          // Metadados customizados
          ...(request.metadata ? { metadata: request.metadata } : {}),
        });

      if (error) {
        logger.error('[GED Supabase] Falha no upload', { key: request.key, error: error.message });
        return {
          success: false,
          file: this.emptyFileRef(request),
          error: `Falha no upload para Supabase Storage: ${error.message}`,
        };
      }

      // Gerar URL assinada (1 hora por padrão)
      const signedUrl = await this.getSignedUrl(request.key, 3600);

      const sizeBytes =
        typeof request.data === 'string'
          ? Buffer.byteLength(request.data, 'utf-8')
          : request.data.byteLength;

      logger.info('[GED Supabase] Upload concluído', { key: data.path, bucket, sizeBytes });

      return {
        success: true,
        file: {
          key: data.path,
          url: signedUrl,
          fileName: request.fileName,
          mimeType: request.contentType,
          sizeBytes,
          uploadedAt: new Date().toISOString(),
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('[GED Supabase] Erro inesperado no upload', { key: request.key, error: msg });
      return {
        success: false,
        file: this.emptyFileRef(request),
        error: `Erro inesperado no upload Supabase: ${msg}`,
      };
    }
  }

  /**
   * Gera URL pré-assinada para acesso ao arquivo.
   * Nunca expõe caminho bruto — sempre signed.
   */
  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const admin = getSupabaseAdmin();
    if (!admin) {
      throw new Error('Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
    }

    const bucket = getBucketName();

    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUrl(key, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new Error(`Falha ao gerar URL assinada: ${error?.message || 'URL vazia'}`);
    }

    return data.signedUrl;
  }

  /**
   * Garante que uma "pasta" existe no Supabase Storage.
   * No Supabase Storage, pastas são virtuais (criadas implicitamente ao fazer upload).
   * Criamos um arquivo .keep para materializar a pasta.
   */
  async ensureFolder(path: string): Promise<GedFolderRef> {
    const admin = getSupabaseAdmin();
    const normalizedPath = path.endsWith('/') ? path : `${path}/`;
    const folderName = normalizedPath.split('/').filter(Boolean).pop() || '';

    if (!admin) {
      return { path: normalizedPath, name: folderName, created: false };
    }

    const bucket = getBucketName();
    const keepFile = `${normalizedPath}.keep`;

    try {
      // Verificar se .keep já existe
      const { data: existing } = await admin.storage
        .from(bucket)
        .list(normalizedPath.replace(/\/$/, ''), { limit: 1 });

      if (existing && existing.length > 0) {
        return { path: normalizedPath, name: folderName, created: false };
      }

      // Criar .keep para materializar a pasta
      await admin.storage
        .from(bucket)
        .upload(keepFile, new Uint8Array(0), {
          contentType: 'application/octet-stream',
          upsert: true,
        });

      logger.info('[GED Supabase] Pasta criada', { path: normalizedPath });
      return { path: normalizedPath, name: folderName, created: true };
    } catch {
      // Se falhar, retorna como se existisse (melhor não bloquear)
      return { path: normalizedPath, name: folderName, created: false };
    }
  }

  /**
   * Lista arquivos em uma pasta do Supabase Storage.
   */
  async list(folderPath: string): Promise<GedListResult> {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return { files: [], folderPath };
    }

    const bucket = getBucketName();
    const normalizedPath = folderPath.endsWith('/') ? folderPath.slice(0, -1) : folderPath;

    try {
      const { data, error } = await admin.storage
        .from(bucket)
        .list(normalizedPath, {
          limit: 100,
          sortBy: { column: 'name', order: 'asc' },
        });

      if (error || !data) {
        logger.warn('[GED Supabase] Falha ao listar pasta', { folderPath, error: error?.message });
        return { files: [], folderPath };
      }

      // Filtrar .keep e converter para GedFileRef
      const files: GedFileRef[] = [];
      for (const item of data) {
        if (item.name === '.keep' || !item.name) continue;
        // Supabase retorna metadados limitados na listagem
        const key = `${normalizedPath}/${item.name}`;
        try {
          const signedUrl = await this.getSignedUrl(key, 3600);
          files.push({
            key,
            url: signedUrl,
            fileName: item.name,
            mimeType: (item.metadata as Record<string, string>)?.mimetype || 'application/octet-stream',
            sizeBytes: (item.metadata as Record<string, number>)?.size || 0,
            uploadedAt: item.created_at || new Date().toISOString(),
          });
        } catch {
          // Se não conseguir gerar URL, inclui sem URL
          files.push({
            key,
            url: '',
            fileName: item.name,
            mimeType: 'application/octet-stream',
            sizeBytes: 0,
            uploadedAt: item.created_at || new Date().toISOString(),
          });
        }
      }

      return { files, folderPath };
    } catch (err) {
      logger.error('[GED Supabase] Erro ao listar', { folderPath, error: String(err) });
      return { files: [], folderPath };
    }
  }

  /**
   * Retorna metadados e status do provider.
   */
  async meta(): Promise<GedMetaResult> {
    const configured = isSupabaseConfigured();
    return {
      providerName: 'supabase',
      isOperational: configured,
      capabilities: {
        supportsVersioning: false, // Supabase Storage não tem versionamento nativo
        supportsSignedUrls: true,
        supportsFolderCreation: true,
      },
    };
  }

  // ─── Helpers privados ───

  /**
   * Garante que o bucket existe. Idempotente.
   */
  private async ensureBucket(bucketName: string): Promise<void> {
    const admin = getSupabaseAdmin();
    if (!admin) return;

    try {
      const { data: buckets } = await admin.storage.listBuckets();
      const exists = buckets?.some(b => b.name === bucketName);

      if (!exists) {
        const { error } = await admin.storage.createBucket(bucketName, {
          public: false, // NUNCA público — sempre signed URLs
          fileSizeLimit: 50 * 1024 * 1024, // 50MB
          allowedMimeTypes: [
            'application/pdf',
            'text/markdown',
            'text/plain',
            'image/png',
            'image/jpeg',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
        });

        if (error && !error.message?.includes('already exists')) {
          logger.error('[GED Supabase] Falha ao criar bucket', { bucketName, error: error.message });
        } else {
          logger.info('[GED Supabase] Bucket criado', { bucketName });
        }
      }
    } catch (err) {
      // Se falhar na verificação, tenta o upload mesmo assim
      logger.warn('[GED Supabase] Não foi possível verificar bucket', { bucketName, error: String(err) });
    }
  }

  /**
   * Cria um GedFileRef vazio para retorno de erro.
   */
  private emptyFileRef(request: GedPutRequest) {
    return {
      key: request.key,
      url: '',
      fileName: request.fileName,
      mimeType: request.contentType,
      sizeBytes: 0,
      uploadedAt: new Date().toISOString(),
    };
  }
}
