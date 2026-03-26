/**
 * Serviço de Convites para Reuniões do CPPD
 * 
 * Envia e-mails de convite com arquivo ICS anexo para todos os participantes.
 * Integra com:
 *   - emailService (sendGenericEmail com attachments)
 *   - utils/ics (buildMeetingIcs)
 *   - audit/cppdAudit (logEvent)
 * 
 * Uso:
 *   await sendMeetingInvites({ meeting, participants, organizerName, organizerEmail });
 */

import { sendGenericEmail } from '../emailService';
import { buildMeetingIcs, generateMeetingIcsUid } from '../utils/ics';
import { logCppdEvent } from '../audit/cppdAudit';
import { logger } from '../_core/logger';

export interface MeetingInviteData {
  /** ID da organização */
  organizationId: number;
  /** ID da reunião */
  meetingId: number;
  /** Título da reunião */
  meetingTitle: string;
  /** Número sequencial da reunião */
  sequence: number;
  /** Tipo da reunião (ordinária, extraordinária) */
  meetingType: string;
  /** Data/hora de início */
  startDate: Date | string;
  /** Data/hora de término */
  endDate: Date | string;
  /** Local da reunião */
  location?: string;
  /** Pauta/descrição */
  agenda?: string;
  /** Link da reunião na plataforma */
  platformUrl?: string;
  /** Nome do organizador */
  organizerName: string;
  /** E-mail do organizador */
  organizerEmail: string;
  /** Nome da organização */
  organizationName?: string;
  /** Participantes */
  participants: Array<{
    name: string;
    email: string;
    role: string;
  }>;
  /** ID do usuário que está enviando */
  sentByUserId: number;
  /** Nome do usuário que está enviando */
  sentByUserName: string;
  /** Se é um cancelamento */
  isCancellation?: boolean;
}

/**
 * Template HTML do e-mail de convite
 */
function buildInviteEmailHtml(data: MeetingInviteData, participantName: string): string {
  const startDate = typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate;
  const endDate = typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate;

  const dateStr = startDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const startTime = startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const endTime = endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const isCancelled = data.isCancellation;
  const statusColor = isCancelled ? '#DC2626' : '#6B3FD9';
  const statusLabel = isCancelled ? 'REUNIAO CANCELADA' : 'CONVITE PARA REUNIAO';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F4F4F5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        
        <!-- Header com gradiente -->
        <tr>
          <td style="background:linear-gradient(135deg,${statusColor} 0%,#00A8E8 100%);padding:32px 40px;text-align:center;">
            <p style="margin:0 0 8px;font-size:12px;letter-spacing:2px;color:rgba(255,255,255,0.8);text-transform:uppercase;">${statusLabel}</p>
            <h1 style="margin:0;font-size:22px;color:#FFFFFF;font-weight:600;">${data.meetingTitle}</h1>
            <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.9);">
              ${data.organizationName || 'Comite de Privacidade e Protecao de Dados'}
            </p>
          </td>
        </tr>

        <!-- Corpo -->
        <tr>
          <td style="padding:32px 40px;">
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
              Prezado(a) <strong>${participantName}</strong>,
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              ${isCancelled
                ? 'Informamos que a reuniao abaixo foi <strong style="color:#DC2626;">cancelada</strong>.'
                : 'Voce esta convidado(a) para a reuniao do Comite de Privacidade e Protecao de Dados (CPPD).'}
            </p>

            <!-- Detalhes da reunião -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:8px;padding:20px;margin-bottom:24px;">
              <tr>
                <td style="padding:8px 20px;">
                  <p style="margin:0;font-size:13px;color:#6B7280;">Data</p>
                  <p style="margin:4px 0 0;font-size:15px;color:#111827;font-weight:600;">${dateStr}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 20px;">
                  <p style="margin:0;font-size:13px;color:#6B7280;">Horario</p>
                  <p style="margin:4px 0 0;font-size:15px;color:#111827;font-weight:600;">${startTime} - ${endTime}</p>
                </td>
              </tr>
              ${data.location ? `
              <tr>
                <td style="padding:8px 20px;">
                  <p style="margin:0;font-size:13px;color:#6B7280;">Local</p>
                  <p style="margin:4px 0 0;font-size:15px;color:#111827;font-weight:600;">${data.location}</p>
                </td>
              </tr>` : ''}
              <tr>
                <td style="padding:8px 20px;">
                  <p style="margin:0;font-size:13px;color:#6B7280;">Tipo</p>
                  <p style="margin:4px 0 0;font-size:15px;color:#111827;font-weight:600;">${data.meetingType}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 20px;">
                  <p style="margin:0;font-size:13px;color:#6B7280;">Reuniao numero</p>
                  <p style="margin:4px 0 0;font-size:15px;color:#111827;font-weight:600;">${data.sequence}</p>
                </td>
              </tr>
            </table>

            ${data.agenda ? `
            <div style="margin-bottom:24px;">
              <p style="margin:0 0 8px;font-size:13px;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Pauta</p>
              <div style="font-size:14px;color:#374151;line-height:1.6;white-space:pre-wrap;">${data.agenda}</div>
            </div>` : ''}

            ${!isCancelled && data.platformUrl ? `
            <div style="text-align:center;margin:24px 0;">
              <a href="${data.platformUrl}" style="display:inline-block;background:linear-gradient(135deg,#6B3FD9 0%,#00A8E8 100%);color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
                Acessar Reuniao na Plataforma
              </a>
            </div>` : ''}

            <p style="margin:24px 0 0;font-size:13px;color:#9CA3AF;line-height:1.5;">
              ${isCancelled
                ? 'O arquivo ICS em anexo atualizara automaticamente seu calendario.'
                : 'O arquivo ICS em anexo adicionara este evento ao seu calendario automaticamente.'}
            </p>
          </td>
        </tr>

        <!-- Rodapé -->
        <tr>
          <td style="background:#F9FAFB;padding:20px 40px;border-top:1px solid #E5E7EB;">
            <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">
              Seusdados Consultoria em Gestão de Dados Limitada | CNPJ 33.899.116/0001-63
              <br>seusdados.com | Responsabilidade Técnica: Marcelo Fattori
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Envia convites de reunião para todos os participantes com ICS anexo.
 * 
 * @returns Resultado com contagem de envios e erros
 */
export async function sendMeetingInvites(data: MeetingInviteData): Promise<{
  sent: number;
  errors: number;
  details: Array<{ email: string; success: boolean; error?: string }>;
}> {
  const results: Array<{ email: string; success: boolean; error?: string }> = [];

  // Gerar ICS
  const icsUid = generateMeetingIcsUid(data.organizationId, data.meetingId);
  const icsContent = buildMeetingIcs({
    uid: icsUid,
    title: data.meetingTitle,
    description: data.agenda || `Reuniao ${data.sequence} do CPPD - ${data.meetingType}`,
    startDate: data.startDate,
    endDate: data.endDate,
    location: data.location,
    organizerName: data.organizerName,
    organizerEmail: data.organizerEmail,
    attendees: data.participants.map(p => ({
      name: p.name,
      email: p.email,
      role: 'REQ-PARTICIPANT' as const,
    })),
    url: data.platformUrl,
    reminderMinutes: 30,
    status: data.isCancellation ? 'CANCELLED' : 'CONFIRMED',
    sequence: data.isCancellation ? 1 : 0,
  });

  const subject = data.isCancellation
    ? `[CANCELADA] ${data.meetingTitle}`
    : `Convite: ${data.meetingTitle}`;

  // Enviar para cada participante
  for (const participant of data.participants) {
    if (!participant.email) {
      results.push({ email: '', success: false, error: 'E-mail nao informado' });
      continue;
    }

    try {
      const html = buildInviteEmailHtml(data, participant.name);

      await sendGenericEmail({
        to: participant.email,
        subject,
        html,
        attachments: [
          {
            filename: 'convite.ics',
            content: Buffer.from(icsContent, 'utf-8'),
            content_type: 'text/calendar; method=REQUEST',
          },
        ],
        tags: [
          { name: 'type', value: 'cppd-meeting-invite' },
          { name: 'meetingId', value: String(data.meetingId) },
        ],
      });

      results.push({ email: participant.email, success: true });
    } catch (error: any) {
      logger.error('[CPPD Convite] Falha ao enviar convite', {
        email: participant.email,
        meetingId: data.meetingId,
        error: error?.message,
      });
      results.push({
        email: participant.email,
        success: false,
        error: error?.message || 'Erro desconhecido',
      });
    }
  }

  const sent = results.filter(r => r.success).length;
  const errors = results.filter(r => !r.success).length;

  // Registrar na trilha de auditoria
  try {
    await logCppdEvent({
      organizationId: data.organizationId,
      userId: data.sentByUserId,
      action: data.isCancellation ? 'convite_cancelamento_enviado' : 'convite_reuniao_enviado',
      entityType: 'governanca_meeting',
      entityId: data.meetingId,
      details: {
        sent,
        errors,
        total: data.participants.length,
        participantes: data.participants.map(p => p.name).join(', '),
        sentByUserName: data.sentByUserName,
      },
    });
  } catch (auditError) {
    logger.warn('[CPPD Convite] Falha ao registrar auditoria', { error: String(auditError) });
  }

  logger.info('[CPPD Convite] Envio concluido', {
    meetingId: data.meetingId,
    sent,
    errors,
    total: data.participants.length,
  });

  return { sent, errors, details: results };
}
