/**
 * GED (Gerenciamento Eletrônico de Documentos) — Contratos e Tipos
 * 
 * Interface plugável para armazenamento de documentos do CPPD.
 * Providers disponíveis:
 *   - local: usa o storage S3 já existente no projeto
 *   - noop: stub que retorna erros claros (provider não configurado)
 * 
 * Para adicionar um novo provider (ex: SharePoint, Supabase Storage):
 *   1. Criar arquivo em server/providers/ged/providers/<nome>.ts
 *   2. Implementar a interface GedProvider
 *   3. Registrar no index.ts (getGedProvider)
 */

// ─── Tipos de referência ───

export interface GedFolderRef {
  /** Caminho completo da pasta no GED (ex: "GED/OrgX/CPPD/2026/Atas/") */
  path: string;
  /** Nome amigável da pasta */
  name: string;
  /** Indica se a pasta foi criada nesta operação */
  created: boolean;
}

export interface GedFileRef {
  /** Chave/caminho do arquivo no storage */
  key: string;
  /** URL pública ou pré-assinada para acesso ao arquivo */
  url: string;
  /** Nome original do arquivo */
  fileName: string;
  /** Tipo MIME do arquivo */
  mimeType: string;
  /** Tamanho em bytes */
  sizeBytes: number;
  /** Timestamp de upload (ISO 8601) */
  uploadedAt: string;
}

// ─── Tipos de requisição ───

export interface GedPutRequest {
  /** Caminho relativo dentro do GED (ex: "GED/OrgX/CPPD/2026/Atas/ata_reuniao_3.pdf") */
  key: string;
  /** Conteúdo do arquivo */
  data: Buffer | Uint8Array | string;
  /** Tipo MIME */
  contentType: string;
  /** Nome amigável do arquivo */
  fileName: string;
  /** Metadados opcionais */
  metadata?: Record<string, string>;
}

export interface GedPutResult {
  /** Referência ao arquivo armazenado */
  file: GedFileRef;
  /** Se o upload foi bem-sucedido */
  success: boolean;
  /** Mensagem de erro (se houver) */
  error?: string;
}

export interface GedListResult {
  /** Lista de arquivos na pasta */
  files: GedFileRef[];
  /** Caminho da pasta listada */
  folderPath: string;
}

export interface GedMetaResult {
  /** Nome do provider ativo */
  providerName: string;
  /** Se o provider está configurado e operacional */
  isOperational: boolean;
  /** Indica se o fallback está ativo (quando o provider primário falhou) */
  fallbackActive?: boolean;
  /** Capacidades do provider */
  capabilities: {
    supportsVersioning: boolean;
    supportsSignedUrls: boolean;
    supportsFolderCreation: boolean;
  };
}

// ─── Interface do Provider ───

export interface GedProvider {
  /** Nome identificador do provider */
  readonly name: string;

  /**
   * Faz upload de um arquivo para o GED
   */
  put(request: GedPutRequest): Promise<GedPutResult>;

  /**
   * Obtém URL de acesso (pré-assinada ou pública) para um arquivo
   */
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Garante que uma pasta existe no GED (cria se necessário)
   */
  ensureFolder(path: string): Promise<GedFolderRef>;

  /**
   * Lista arquivos em uma pasta do GED
   */
  list(folderPath: string): Promise<GedListResult>;

  /**
   * Retorna metadados e status do provider
   */
  meta(): Promise<GedMetaResult>;
}

// ─── Configuração por organização ───

export type GedProviderType = 'local' | 'supabase' | 'sharepoint' | 'noop';

export interface GedConfig {
  /** Tipo do provider */
  provider: GedProviderType;
  /** Caminho base dentro do GED (ex: "CPPD/") */
  basePath: string;
  /** Bucket específico (para providers que suportam) */
  bucket?: string;
  /** Tenant ID (para SharePoint) */
  tenant?: string;
}

/** Configuração padrão quando nenhuma é definida */
export const DEFAULT_GED_CONFIG: GedConfig = {
  provider: 'supabase',
  basePath: 'CPPD/',
};
