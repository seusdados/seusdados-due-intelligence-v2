import { getDb } from "./db";
import { emailLogs } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Tipos de eventos do Resend
export type ResendWebhookEvent = {
  type: 'email.sent' | 'email.delivered' | 'email.delivery_delayed' | 'email.complained' | 'email.bounced' | 'email.opened' | 'email.clicked';
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    // Para bounces
    bounce?: {
      message: string;
    };
    // Para clicks
    click?: {
      link: string;
      timestamp: string;
    };
  };
};

// Mapeamento de eventos do Resend para status do sistema
const eventToStatus: Record<string, 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'spam'> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'pending',
  'email.complained': 'spam',
  'email.bounced': 'bounced',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
};

/**
 * Processa um evento de webhook do Resend
 */
export async function processResendWebhook(event: ResendWebhookEvent): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  
  try {
    const newStatus = eventToStatus[event.type];
    if (!newStatus) {
      return { success: false, message: `Tipo de evento desconhecido: ${event.type}` };
    }

    // Buscar o log de e-mail pelo resendMessageId
    const emailId = event.data.email_id;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    // Preparar campos de atualização baseado no tipo de evento
    const updateFields: Record<string, any> = {
      status: newStatus,
      updatedAt: now,
    };

    // Adicionar timestamps específicos por tipo de evento
    if (event.type === 'email.delivered') {
      updateFields.deliveredAt = now;
    } else if (event.type === 'email.opened') {
      updateFields.openedAt = now;
    } else if (event.type === 'email.clicked') {
      updateFields.clickedAt = now;
    } else if (event.type === 'email.bounced') {
      updateFields.bouncedAt = now;
      if (event.data.bounce?.message) {
        updateFields.errorMessage = event.data.bounce.message;
      }
    }

    // Atualizar o status do e-mail pelo resendMessageId
    const result = await db
      .update(emailLogs)
      .set(updateFields)
      .where(eq(emailLogs.resendMessageId, emailId));

    if (result.rowCount === 0) {
      // Se não encontrou pelo resendMessageId, tentar pelo e-mail de destino
      console.log(`[ResendWebhook] E-mail não encontrado pelo resendMessageId: ${emailId}, tentando pelo destinatário`);
      
      // Atualizar o último e-mail enviado para este destinatário
      const toEmail = event.data.to[0];
      if (toEmail) {
        await db
          .update(emailLogs)
          .set({
            ...updateFields,
            resendMessageId: emailId,
          })
          .where(eq(emailLogs.recipientEmail, toEmail));
      }
    }

    console.log(`[ResendWebhook] Evento processado: ${event.type} para ${event.data.to.join(', ')}`);
    
    return { success: true, message: `Evento ${event.type} processado com sucesso` };
  } catch (error) {
    console.error('[ResendWebhook] Erro ao processar evento:', error);
    return { success: false, message: `Erro ao processar evento: ${error}` };
  }
}

/**
 * Valida a assinatura do webhook do Resend (opcional, mas recomendado)
 */
export function validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
  // O Resend usa HMAC-SHA256 para assinar os webhooks
  // Por enquanto, retornamos true para simplificar
  // Em produção, implementar a validação completa
  return true;
}
