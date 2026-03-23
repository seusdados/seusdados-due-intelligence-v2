/**
 * NoopSignatureProvider
 * 
 * Provider de fallback que retorna erros claros indicando
 * que nenhum provider de assinatura foi configurado.
 */

import type {
  SignatureProvider,
  SendForSignatureRequest,
  SendForSignatureResult,
  SignatureStatusResult,
  UploadSignedRequest,
  UploadSignedResult,
  FinalizeResult,
} from '../types';
import { logger } from '../../../_core/logger';

const MSG = 'Nenhum provedor de assinatura eletrônica configurado. Configure um provedor (manual, Gov.br, etc.) nas configurações do sistema.';

export class NoopSignatureProvider implements SignatureProvider {
  readonly name = 'noop';

  async sendForSignature(_request: SendForSignatureRequest): Promise<SendForSignatureResult> {
    logger.warn('[Assinatura Noop] Tentativa de envio sem provider configurado');
    return {
      success: false,
      status: 'pendente',
      message: MSG,
    };
  }

  async getStatus(_organizationId: number, _meetingId: number): Promise<SignatureStatusResult> {
    return {
      status: 'pendente',
      totalSigners: 0,
      signedCount: 0,
      signers: [],
      message: MSG,
    };
  }

  async uploadSigned(_request: UploadSignedRequest): Promise<UploadSignedResult> {
    return {
      success: false,
      message: MSG,
    };
  }

  async finalize(_organizationId: number, _meetingId: number): Promise<FinalizeResult> {
    return {
      success: false,
      message: MSG,
    };
  }

  meta() {
    return {
      name: 'Nenhum (não configurado)',
      isOperational: false,
      requiresExternalService: false,
    };
  }
}
