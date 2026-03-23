/**
 * Assinatura Eletrônica — Contratos e Tipos
 * 
 * Interface plugável para assinatura de documentos do CPPD.
 * Providers disponíveis:
 *   - manual: pacote de assinatura manual (download, assinar fisicamente, upload)
 *   - govbr: assinatura digital via Gov.br (skeleton/placeholder)
 *   - noop: stub que retorna erros claros (provider não configurado)
 * 
 * Para adicionar um novo provider (ex: DocuSign, Clicksign):
 *   1. Criar arquivo em server/providers/signature/providers/<nome>.ts
 *   2. Implementar a interface SignatureProvider
 *   3. Registrar no index.ts (getSignatureProvider)
 */

// ─── Tipos de referência ───

export interface SignerInfo {
  /** ID do usuário no sistema */
  userId: number;
  /** Nome completo */
  name: string;
  /** Papel no CPPD */
  role: string;
  /** E-mail */
  email?: string;
  /** CPF (para Gov.br) */
  cpf?: string;
}

export interface SignatureRecord {
  /** ID do signatário */
  userId: number;
  /** Nome */
  name: string;
  /** Papel */
  role: string;
  /** Data/hora da assinatura (ISO 8601) */
  signedAt: string;
  /** Método de assinatura */
  method: SignatureProviderType;
  /** Hash do documento assinado (se disponível) */
  documentHash?: string;
}

export type SignatureStatus = 
  | 'pendente'           // Aguardando envio para assinatura
  | 'enviada'            // Enviada para signatários
  | 'parcial'            // Algumas assinaturas coletadas
  | 'concluida'          // Todas as assinaturas coletadas
  | 'cancelada'          // Processo cancelado
  | 'expirada';          // Prazo expirado

export interface SignatureStatusResult {
  /** Status geral do processo de assinatura */
  status: SignatureStatus;
  /** Total de signatários */
  totalSigners: number;
  /** Signatários que já assinaram */
  signedCount: number;
  /** Detalhes por signatário */
  signers: Array<SignerInfo & { signedAt?: string; status: 'pendente' | 'assinado' }>;
  /** URL do documento assinado (quando concluído) */
  signedDocumentUrl?: string;
  /** Mensagem informativa */
  message?: string;
}

// ─── Tipos de requisição ───

export interface SendForSignatureRequest {
  /** ID da organização */
  organizationId: number;
  /** ID da reunião */
  meetingId: number;
  /** Conteúdo do documento (markdown ou PDF buffer) */
  documentContent: string | Buffer;
  /** URL do documento no GED (se já armazenado) */
  documentUrl?: string;
  /** Chave do documento no GED */
  gedKey?: string;
  /** Lista de signatários */
  signers: SignerInfo[];
  /** Prazo para assinatura (ISO 8601) */
  deadline?: string;
}

export interface SendForSignatureResult {
  /** Se o envio foi bem-sucedido */
  success: boolean;
  /** ID do processo de assinatura (para rastreamento) */
  signatureProcessId?: string;
  /** Status inicial */
  status: SignatureStatus;
  /** Mensagem informativa */
  message: string;
  /** URL para download do pacote (manual) */
  downloadUrl?: string;
}

export interface UploadSignedRequest {
  /** ID da organização */
  organizationId: number;
  /** ID da reunião */
  meetingId: number;
  /** Conteúdo do PDF assinado */
  signedPdfData: Buffer | Uint8Array;
  /** Nome do arquivo */
  fileName: string;
  /** ID do usuário que está fazendo upload */
  uploadedByUserId: number;
}

export interface UploadSignedResult {
  /** Se o upload foi bem-sucedido */
  success: boolean;
  /** URL do documento assinado no storage */
  signedDocumentUrl?: string;
  /** Chave no GED */
  gedKey?: string;
  /** Mensagem */
  message: string;
}

export interface FinalizeResult {
  /** Se a finalização foi bem-sucedida */
  success: boolean;
  /** URL final do documento assinado */
  signedDocumentUrl?: string;
  /** Mensagem */
  message: string;
}

// ─── Interface do Provider ───

export interface SignatureProvider {
  /** Nome identificador do provider */
  readonly name: string;

  /**
   * Envia documento para assinatura dos signatários
   */
  sendForSignature(request: SendForSignatureRequest): Promise<SendForSignatureResult>;

  /**
   * Consulta status atual do processo de assinatura
   */
  getStatus(organizationId: number, meetingId: number): Promise<SignatureStatusResult>;

  /**
   * Recebe upload de documento assinado (para provider manual)
   */
  uploadSigned(request: UploadSignedRequest): Promise<UploadSignedResult>;

  /**
   * Finaliza o processo de assinatura (marca como concluído)
   */
  finalize(organizationId: number, meetingId: number): Promise<FinalizeResult>;

  /**
   * Retorna informações sobre o provider
   */
  meta(): { name: string; isOperational: boolean; requiresExternalService: boolean };
}

// ─── Configuração ───

export type SignatureProviderType = 'manual' | 'govbr' | 'docusign' | 'clicksign' | 'noop';

export interface SignatureConfig {
  /** Tipo do provider */
  provider: SignatureProviderType;
  /** Configurações específicas do provider */
  settings?: Record<string, string>;
}

/** Configuração padrão */
export const DEFAULT_SIGNATURE_CONFIG: SignatureConfig = {
  provider: 'manual',
};
