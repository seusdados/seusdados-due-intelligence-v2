//
// Integração de notificações por email na fila de análise.
// Envia email quando análise concluir (sucesso ou erro).

import { logger } from "./_core/logger";
import { sendAnalysisNotificationEmail } from "./contractAnalysisEmailService";
import * as db from "./db";

/**
 * Envia notificação por email quando análise concluir.
 */
export async function sendAnalysisCompletionEmail(
  analysisId: number,
  userId: number,
  status: "completed" | "error",
  errorMessage?: string
): Promise<void> {
  try {
    // Buscar análise
    const analysis = await db.getContractAnalysisById(analysisId);
    if (!analysis) {
      logger.warn("[ContractAnalysisQueueWithEmail] Análise não encontrada", { analysisId });
      return;
    }

    // Buscar usuário para obter email
    const userRow = await db.getUserById(userId);
    if (!userRow || !(userRow as any).email) {
      logger.warn("[ContractAnalysisQueueWithEmail] Email do usuário não encontrado", { userId });
      return;
    }

    const recipientEmail = (userRow as any).email;

    // Enviar email usando a nova assinatura unificada
    const sent = await sendAnalysisNotificationEmail(
      analysisId,
      recipientEmail,
      status,
      errorMessage || undefined
    );

    if (sent) {
      logger.info("[ContractAnalysisQueueWithEmail] Email enviado com sucesso", {
        analysisId,
        recipientEmail,
        status,
      });
      // Registrar no histórico
      try {
        await db.createContractAnalysisHistoryEntry({
          analysisId,
          historyActionType: "xai_analyzed" as any,
          description: `Email de ${status === "completed" ? "conclusão" : "erro"} enviado para ${recipientEmail}`,
          userId,
        });
      } catch (histErr) {
        logger.warn("[ContractAnalysisQueueWithEmail] Falha ao registrar histórico de email", { analysisId, error: histErr });
      }
    } else {
      logger.warn("[ContractAnalysisQueueWithEmail] Falha ao enviar email", {
        analysisId,
        recipientEmail,
      });
    }
  } catch (err) {
    logger.error("[ContractAnalysisQueueWithEmail] Erro ao enviar email de conclusão", {
      analysisId,
      error: err,
    });
  }
}
