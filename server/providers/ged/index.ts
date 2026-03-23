/**
 * GED Provider Factory — Seleciona o provider correto por configuração.
 * 
 * PADRÃO: Supabase Storage (requer SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
 * FALLBACK: Local S3 (se explicitamente configurado ou Supabase indisponível)
 * 
 * HARDENING: Se Supabase falhar em runtime (erro de rede, 403, 5xx),
 * o GedProviderWithFallback tenta automaticamente o provider local.
 * 
 * Uso:
 *   const ged = getGedProvider(orgConfig);
 *   await ged.put({ key, data, contentType, fileName });
 */
import type {
  GedProvider,
  GedConfig,
  GedProviderType,
  GedPutRequest,
  GedPutResult,
  GedFolderRef,
  GedListResult,
  GedMetaResult,
} from './types';
import { GEDLocalProvider } from './providers/local';
import { SupabaseGedProvider } from './providers/supabase';
import { NoopGedProvider } from './providers/stub';
import { isSupabaseConfigured } from '../../supabaseClient';
import { logger } from '../../_core/logger';

/** Configuração padrão: Supabase (com fallback automático para local) */
export const DEFAULT_GED_CONFIG: GedConfig = {
  provider: 'supabase',
  basePath: 'CPPD/',
};

/** Nome do bucket parametrizável por env */
export function getCppdBucketName(): string {
  return process.env.CPPD_SUPABASE_BUCKET || 'cppd-documents';
}

// ─── Fallback Wrapper ───

/**
 * Wrapper que encapsula um provider primário e um fallback.
 * Se o primário falhar em runtime (put/list/ensureFolder), tenta o fallback.
 * Loga claramente: provider escolhido, evento de fallback (com reason).
 */
class GedProviderWithFallback implements GedProvider {
  readonly name: string;

  constructor(
    private primary: GedProvider,
    private fallback: GedProvider,
  ) {
    this.name = `${primary.name}+fallback(${fallback.name})`;
    logger.info('[GED] Provider inicializado', {
      primary: primary.name,
      fallback: fallback.name,
      strategy: 'auto-fallback',
    });
  }

  async put(request: GedPutRequest): Promise<GedPutResult> {
    try {
      const result = await this.primary.put(request);
      if (result.success) {
        logger.info('[GED] Upload via provider primário', {
          provider: this.primary.name,
          key: request.key,
        });
        return result;
      }
      // Provider retornou success=false — tentar fallback
      logger.warn('[GED] Provider primário retornou erro, ativando fallback', {
        primary: this.primary.name,
        fallback: this.fallback.name,
        reason: result.error || 'success=false',
        key: request.key,
      });
      return this.putWithFallback(request, result.error || 'Erro no provider primário');
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      logger.warn('[GED] Exceção no provider primário, ativando fallback', {
        primary: this.primary.name,
        fallback: this.fallback.name,
        reason,
        key: request.key,
      });
      return this.putWithFallback(request, reason);
    }
  }

  private async putWithFallback(request: GedPutRequest, originalError: string): Promise<GedPutResult> {
    try {
      const fallbackResult = await this.fallback.put(request);
      if (fallbackResult.success) {
        logger.info('[GED] Upload via fallback concluído', {
          provider: this.fallback.name,
          key: request.key,
          originalError,
        });
      } else {
        logger.error('[GED] Fallback também falhou', {
          provider: this.fallback.name,
          key: request.key,
          originalError,
          fallbackError: fallbackResult.error,
        });
      }
      return fallbackResult;
    } catch (fallbackErr) {
      const fallbackReason = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      logger.error('[GED] Fallback também lançou exceção', {
        provider: this.fallback.name,
        key: request.key,
        originalError,
        fallbackError: fallbackReason,
      });
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
        error: `Primário (${this.primary.name}): ${originalError}. Fallback (${this.fallback.name}): ${fallbackReason}`,
      };
    }
  }

  async getSignedUrl(key: string, expiresInSeconds?: number): Promise<string> {
    try {
      return await this.primary.getSignedUrl(key, expiresInSeconds);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      logger.warn('[GED] getSignedUrl falhou no primário, tentando fallback', {
        primary: this.primary.name,
        reason,
        key,
      });
      return this.fallback.getSignedUrl(key, expiresInSeconds);
    }
  }

  async ensureFolder(path: string): Promise<GedFolderRef> {
    try {
      return await this.primary.ensureFolder(path);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      logger.warn('[GED] ensureFolder falhou no primário, tentando fallback', {
        primary: this.primary.name,
        reason,
        path,
      });
      return this.fallback.ensureFolder(path);
    }
  }

  async list(folderPath: string): Promise<GedListResult> {
    try {
      return await this.primary.list(folderPath);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      logger.warn('[GED] list falhou no primário, tentando fallback', {
        primary: this.primary.name,
        reason,
        folderPath,
      });
      return this.fallback.list(folderPath);
    }
  }

  async meta(): Promise<GedMetaResult> {
    const primaryMeta = await this.primary.meta();
    return {
      ...primaryMeta,
      providerName: this.name,
      fallbackActive: !primaryMeta.isOperational,
    };
  }
}

// ─── Cache e Factory ───

// Cache de instâncias (singleton por configuração)
let cachedProvider: GedProvider | null = null;
let cachedConfigKey = '';

/**
 * Retorna a instância do GED provider com base na configuração.
 * Se nenhuma configuração for passada, usa Supabase (padrão).
 * Se Supabase não estiver configurado, cai para local automaticamente.
 * Se Supabase estiver configurado, cria wrapper com fallback para local.
 */
export function getGedProvider(config?: GedConfig | null): GedProvider {
  const resolvedConfig = config || DEFAULT_GED_CONFIG;
  const configKey = `${resolvedConfig.provider}:${resolvedConfig.basePath || ''}`;

  // Retorna do cache se mesma configuração
  if (cachedProvider && cachedConfigKey === configKey) {
    return cachedProvider;
  }

  let providerType = resolvedConfig.provider;

  // Se supabase foi solicitado mas não está configurado, fallback direto para local
  if (providerType === 'supabase' && !isSupabaseConfigured()) {
    logger.warn('[GED] Supabase solicitado mas não configurado (SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes). Usando provider local como fallback direto.');
    providerType = 'local';
  }

  let provider: GedProvider;
  switch (providerType) {
    case 'supabase': {
      // Supabase com fallback automático para local em caso de erro runtime
      const supabase = new SupabaseGedProvider();
      const local = new GEDLocalProvider();
      provider = new GedProviderWithFallback(supabase, local);
      logger.info('[GED] Provider Supabase Storage ativado (com fallback local)', {
        bucket: getCppdBucketName(),
      });
      break;
    }
    case 'local':
      provider = new GEDLocalProvider();
      logger.info('[GED] Provider Local (S3 Manus) ativado');
      break;
    case 'sharepoint':
      logger.warn('[GED] SharePoint provider solicitado mas não implementado. Usando noop.');
      provider = new NoopGedProvider();
      break;
    case 'noop':
    default:
      provider = new NoopGedProvider();
      break;
  }

  cachedProvider = provider;
  cachedConfigKey = configKey;
  return provider;
}

/**
 * Limpa o cache de providers (útil para testes e reconfiguração).
 */
export function clearGedProviderCache(): void {
  cachedProvider = null;
  cachedConfigKey = '';
}

/**
 * Retorna a lista de providers disponíveis com status.
 */
export function listGedProviders(): Array<{
  type: GedProviderType;
  label: string;
  available: boolean;
  isDefault: boolean;
}> {
  return [
    {
      type: 'supabase',
      label: 'Supabase Storage',
      available: isSupabaseConfigured(),
      isDefault: true,
    },
    {
      type: 'local',
      label: 'Armazenamento Local (S3)',
      available: true,
      isDefault: false,
    },
    {
      type: 'sharepoint',
      label: 'SharePoint (não implementado)',
      available: false,
      isDefault: false,
    },
  ];
}

/**
 * Extrai a configuração de GED do campo notes JSON de uma config CPPD.
 * 
 * @param cppdConfigNotes - Campo notes da tabela governanca_cppd_configs (string JSON ou null)
 * @returns GedConfig ou null se não configurado
 */
export function parseGedConfigFromNotes(cppdConfigNotes: string | null | undefined): GedConfig | null {
  if (!cppdConfigNotes) return null;
  try {
    const parsed = JSON.parse(cppdConfigNotes);
    if (parsed?.gedConfig) {
      return {
        provider: parsed.gedConfig.provider || 'supabase',
        basePath: parsed.gedConfig.basePath || 'CPPD/',
        bucket: parsed.gedConfig.bucket,
        tenant: parsed.gedConfig.tenant,
      };
    }
  } catch {
    // notes não é JSON válido ou não contém gedConfig
  }
  return null;
}

// ─── Padrão de Pastas no GED ───

export interface CppdGedPaths {
  /** Pasta raiz do CPPD para a organização/ano */
  root: string;
  /** Pasta de atas */
  atas: string;
  /** Pasta de deliberações */
  deliberacoes: string;
  /** Pasta de gravações */
  gravacoes: string;
  /** Pasta de planos de ação */
  planoAcao: string;
  /** Caminho completo para um arquivo de ata específico */
  ataFile: (meetingSequence: number, extension?: string) => string;
}

/**
 * Gera os caminhos padronizados de pastas do CPPD no GED.
 * 
 * Estrutura (conforme especificação):
 *   organizations/org-<id>/cppd/<year>/atas/
 *   organizations/org-<id>/cppd/<year>/deliberacoes/
 *   organizations/org-<id>/cppd/<year>/gravacoes/
 *   organizations/org-<id>/cppd/<year>/plano-acao/
 * 
 * @param organizationId - ID da organização
 * @param year - Ano de referência
 * @param _meetingId - ID da reunião (reservado para uso futuro)
 */
export function buildCppdGedPaths(
  organizationId: number,
  year: number,
  _meetingId?: number
): CppdGedPaths {
  const root = `organizations/org-${organizationId}/cppd/${year}`;
  return {
    root: `${root}/`,
    atas: `${root}/atas/`,
    deliberacoes: `${root}/deliberacoes/`,
    gravacoes: `${root}/gravacoes/`,
    planoAcao: `${root}/plano-acao/`,
    ataFile: (meetingSequence: number, extension = 'pdf') =>
      `${root}/atas/ata_reuniao_${String(meetingSequence).padStart(2, '0')}.${extension}`,
  };
}

// Re-exportar tipos para conveniência
export type { GedProvider, GedConfig, GedProviderType } from './types';
export type { GedPutRequest, GedPutResult, GedFileRef, GedFolderRef } from './types';
