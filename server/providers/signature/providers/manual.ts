/**
 * ManualSignatureProvider
 * 
 * Fluxo de assinatura manual:
 * 1. Sistema gera pacote para download (ata em formato para impressão)
 * 2. Membros imprimem, assinam fisicamente e digitalizam
 * 3. Upload do PDF assinado de volta ao sistema
 * 4. Finalização do processo
 * 
 * Ideal para organizações que ainda não possuem certificado digital
 * ou integração com Gov.br.
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

export class ManualSignatureProvider implements SignatureProvider {
  readonly name = 'manual';

  async sendForSignature(request: SendForSignatureRequest): Promise<SendForSignatureResult> {
    logger.info(`[Assinatura Manual] Pacote gerado para reunião ${request.meetingId}, ${request.signers.length} signatário(s)`);

    // No fluxo manual, o "envio" é apenas marcar como disponível para download
    // O documento já está no GED (documentUrl)
    return {
      success: true,
      signatureProcessId: `manual-${request.organizationId}-${request.meetingId}-${Date.now()}`,
      status: 'enviada',
      message: `Pacote de assinatura disponível para ${request.signers.length} signatário(s). Faça o download, colete as assinaturas e envie o documento assinado.`,
      downloadUrl: request.documentUrl,
    };
  }

  async getStatus(organizationId: number, meetingId: number): Promise<SignatureStatusResult> {
    // No provider manual, o status é gerenciado pelo banco de dados (signersSnapshot)
    // Este método retorna um status genérico; o router consulta o DB diretamente
    return {
      status: 'enviada',
      totalSigners: 0,
      signedCount: 0,
      signers: [],
      message: 'Consulte o status atualizado no painel da reunião.',
    };
  }

  async uploadSigned(request: UploadSignedRequest): Promise<UploadSignedResult> {
    try {
      // Importar GED para armazenar o PDF assinado
      const { getGedProvider, buildCppdGedPaths } = await import('../../ged/index');
      const ged = getGedProvider();

      const year = new Date().getFullYear();
      const paths = buildCppdGedPaths(request.organizationId, year, request.meetingId);

      // Garantir pasta de atas assinadas
      const signedFolder = `${paths.atas}/assinadas`;
      await ged.ensureFolder(signedFolder);

      const gedKey = `${signedFolder}/${request.fileName}`;
      const result = await ged.put({
        key: gedKey,
        data: Buffer.from(request.signedPdfData),
        contentType: 'application/pdf',
        fileName: request.fileName,
      });

      if (!result.success) {
        return {
          success: false,
          message: result.error || 'Falha ao armazenar documento assinado no GED',
        };
      }

      logger.info(`[Assinatura Manual] PDF assinado armazenado: ${result.file.key}`);

      return {
        success: true,
        signedDocumentUrl: result.file.url,
        gedKey: result.file.key,
        message: 'Documento assinado armazenado com sucesso.',
      };
    } catch (error: any) {
      logger.error('[Assinatura Manual] Erro ao armazenar PDF assinado:', error);
      return {
        success: false,
        message: error?.message || 'Erro interno ao processar upload',
      };
    }
  }

  async finalize(organizationId: number, meetingId: number): Promise<FinalizeResult> {
    logger.info(`[Assinatura Manual] Processo finalizado para reunião ${meetingId}`);
    return {
      success: true,
      message: 'Processo de assinatura manual finalizado com sucesso.',
    };
  }

  meta() {
    return {
      name: 'Assinatura Manual',
      isOperational: true,
      requiresExternalService: false,
    };
  }
}
