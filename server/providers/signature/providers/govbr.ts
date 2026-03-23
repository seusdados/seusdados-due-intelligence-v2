/**
 * GovBrSignatureProvider — Skeleton
 * 
 * Placeholder para futura integração com a API de Assinatura Digital
 * do Gov.br (Assinatura Avançada e Qualificada ICP-Brasil).
 * 
 * Referência: https://www.gov.br/governodigital/pt-br/assinatura-eletronica
 * 
 * Para ativar:
 *   1. Obter credenciais no portal Gov.br (client_id, client_secret)
 *   2. Configurar variáveis de ambiente: GOVBR_CLIENT_ID, GOVBR_CLIENT_SECRET, GOVBR_API_URL
 *   3. Alterar o provider no index.ts para 'govbr'
 * 
 * Fluxo previsto:
 *   1. Autenticar via OAuth2 no Gov.br
 *   2. Enviar documento (PDF) para assinatura
 *   3. Redirecionar signatários para portal Gov.br
 *   4. Receber webhook com confirmação de assinatura
 *   5. Baixar documento assinado com certificado ICP-Brasil
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

const NOT_IMPLEMENTED = 'Integração com Gov.br ainda não implementada. Utilize o provedor de assinatura manual enquanto a integração está em desenvolvimento.';

export class GovBrSignatureProvider implements SignatureProvider {
  readonly name = 'govbr';

  // TODO: Implementar autenticação OAuth2 Gov.br
  // private async authenticate(): Promise<string> { ... }

  async sendForSignature(request: SendForSignatureRequest): Promise<SendForSignatureResult> {
    logger.warn('[Assinatura Gov.br] Provider ainda não implementado');
    
    // TODO: Implementar envio de documento para assinatura via API Gov.br
    // 1. Autenticar com OAuth2
    // 2. POST /api/v1/assinaturas com o PDF
    // 3. Retornar URL de assinatura para cada signatário

    return {
      success: false,
      status: 'pendente',
      message: NOT_IMPLEMENTED,
    };
  }

  async getStatus(organizationId: number, meetingId: number): Promise<SignatureStatusResult> {
    logger.warn('[Assinatura Gov.br] Provider ainda não implementado');

    // TODO: Implementar consulta de status via API Gov.br
    // GET /api/v1/assinaturas/{processId}/status

    return {
      status: 'pendente',
      totalSigners: 0,
      signedCount: 0,
      signers: [],
      message: NOT_IMPLEMENTED,
    };
  }

  async uploadSigned(_request: UploadSignedRequest): Promise<UploadSignedResult> {
    // No Gov.br, o upload não é necessário — o documento é assinado digitalmente no portal
    return {
      success: false,
      message: 'No fluxo Gov.br, o documento é assinado digitalmente no portal. Não é necessário fazer upload manual.',
    };
  }

  async finalize(organizationId: number, meetingId: number): Promise<FinalizeResult> {
    logger.warn('[Assinatura Gov.br] Provider ainda não implementado');

    // TODO: Implementar finalização
    // 1. Verificar se todas as assinaturas foram coletadas
    // 2. Baixar documento final assinado
    // 3. Armazenar no GED

    return {
      success: false,
      message: NOT_IMPLEMENTED,
    };
  }

  meta() {
    return {
      name: 'Assinatura Digital Gov.br',
      isOperational: false,
      requiresExternalService: true,
    };
  }
}
