/**
 * Serviço de E-mail para Assinatura de Atas do CPPD
 * 
 * Envia notificações por e-mail aos signatários selecionados quando
 * uma ata é enviada para assinatura, incluindo link para download do PDF.
 * 
 * Usa o sendGenericEmail do emailService.ts existente (Resend SDK).
 */

import { logger } from '../_core/logger';

export interface SignatureEmailData {
  /** E-mail do signatário */
  to: string;
  /** Nome do signatário */
  signerName: string;
  /** Função do signatário no CPPD */
  signerRole: string;
  /** Nome da organização */
  organizationName: string;
  /** Número da reunião */
  meetingSequence: number;
  /** Ano */
  year: number;
  /** Data da reunião */
  meetingDate: string;
  /** URL do PDF para download */
  pdfUrl?: string;
  /** URL da plataforma para acessar a ata */
  platformUrl?: string;
  /** Prazo para assinatura */
  deadline?: string;
  /** Nome de quem enviou */
  senderName: string;
}

/**
 * Gera o template HTML do e-mail de convite para assinatura.
 */
function generateSignatureEmailHtml(data: SignatureEmailData): string {
  const deadlineText = data.deadline
    ? `<p style="font-size:14px;color:#6b7280;margin:0 0 20px;">
        <strong style="color:#1f2937;">Prazo para assinatura:</strong> ${data.deadline}
       </p>`
    : '';

  const pdfButton = data.pdfUrl
    ? `<a href="${data.pdfUrl}" 
          style="display:inline-block;background:linear-gradient(135deg,#6D28D9,#00A8E8);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;margin-right:12px;">
        Baixar PDF da Ata
       </a>`
    : '';

  const platformButton = data.platformUrl
    ? `<a href="${data.platformUrl}" 
          style="display:inline-block;background:#ffffff;color:#6D28D9;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;border:2px solid #6D28D9;">
        Acessar na Plataforma
       </a>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header com gradiente -->
          <tr>
            <td style="background:linear-gradient(135deg,#2E1065 0%,#4C1D95 30%,#6D28D9 70%,#7C3AED 100%);padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">SEUSDADOS</p>
                    <p style="margin:4px 0 0;font-size:11px;font-weight:400;color:#e9d5ff;letter-spacing:0.15em;text-transform:uppercase;">Consultoria em Gestão de Dados</p>
                  </td>
                  <td align="right" style="vertical-align:top;">
                    <p style="margin:0;font-size:10px;color:#e9d5ff;letter-spacing:0.1em;text-transform:uppercase;">Assinatura de Ata</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#ffffff;font-weight:600;">CPPD ${data.year}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Linha decorativa cyan -->
          <tr>
            <td style="background:#00A8E8;height:3px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Conteúdo -->
          <tr>
            <td style="padding:40px;">
              <p style="font-size:18px;font-weight:600;color:#1f2937;margin:0 0 8px;">
                Prezado(a) ${data.signerName},
              </p>
              
              <p style="font-size:14px;color:#6b7280;margin:0 0 24px;line-height:1.6;">
                Você foi designado(a) como signatário(a) da ata da 
                <strong style="color:#6D28D9;">${data.meetingSequence}ª Reunião Ordinária</strong> 
                do Comitê de Privacidade e Proteção de Dados (CPPD) da 
                <strong style="color:#1f2937;">${data.organizationName}</strong>.
              </p>

              <!-- Card de informações -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(109,40,217,0.06),rgba(0,168,232,0.04));border-radius:10px;padding:24px;margin:0 0 24px;">
                <tr>
                  <td>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%" style="padding:8px 0;">
                          <p style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin:0;">Reunião</p>
                          <p style="font-size:14px;color:#1f2937;font-weight:600;margin:4px 0 0;">${data.meetingSequence}ª Ordinária / ${data.year}</p>
                        </td>
                        <td width="50%" style="padding:8px 0;">
                          <p style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin:0;">Data</p>
                          <p style="font-size:14px;color:#1f2937;font-weight:600;margin:4px 0 0;">${data.meetingDate}</p>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding:8px 0;">
                          <p style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin:0;">Sua Função</p>
                          <p style="font-size:14px;color:#1f2937;font-weight:600;margin:4px 0 0;">${data.signerRole}</p>
                        </td>
                        <td width="50%" style="padding:8px 0;">
                          <p style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin:0;">Organização</p>
                          <p style="font-size:14px;color:#1f2937;font-weight:600;margin:4px 0 0;">${data.organizationName}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${deadlineText}

              <p style="font-size:14px;color:#6b7280;margin:0 0 24px;line-height:1.6;">
                Por favor, revise o conteúdo da ata e, estando de acordo, proceda com a assinatura. 
                Você pode baixar o PDF da ata ou acessar diretamente na plataforma.
              </p>

              <!-- Botões -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td>${pdfButton}</td>
                  <td>${platformButton}</td>
                </tr>
              </table>

              <!-- Separador -->
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">

              <p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.5;">
                Este e-mail foi enviado por <strong>${data.senderName}</strong> através da plataforma Seusdados Due Diligence. 
                Se você não reconhece esta solicitação, por favor desconsidere esta mensagem.
              </p>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="background:#1f2937;padding:24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:12px;color:#9ca3af;">
                      Seusdados Consultoria em Gestão de Dados Limitada
                    </p>
                    <p style="margin:4px 0 0;font-size:11px;color:#6b7280;">
                      CNPJ 33.899.116/0001-63 | seusdados.com
                    </p>
                    <p style="margin:4px 0 0;font-size:11px;color:#6b7280;">
                      Responsável Técnico: Marcelo Fattori
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Gera versão texto puro do e-mail (fallback).
 */
function generateSignatureEmailText(data: SignatureEmailData): string {
  let text = `Prezado(a) ${data.signerName},\n\n`;
  text += `Você foi designado(a) como signatário(a) da ata da ${data.meetingSequence}ª Reunião Ordinária `;
  text += `do Comitê de Privacidade e Proteção de Dados (CPPD) da ${data.organizationName}.\n\n`;
  text += `Reunião: ${data.meetingSequence}ª Ordinária / ${data.year}\n`;
  text += `Data: ${data.meetingDate}\n`;
  text += `Sua Função: ${data.signerRole}\n\n`;
  if (data.deadline) {
    text += `Prazo para assinatura: ${data.deadline}\n\n`;
  }
  if (data.pdfUrl) {
    text += `Baixar PDF da Ata: ${data.pdfUrl}\n\n`;
  }
  if (data.platformUrl) {
    text += `Acessar na Plataforma: ${data.platformUrl}\n\n`;
  }
  text += `Por favor, revise o conteúdo da ata e, estando de acordo, proceda com a assinatura.\n\n`;
  text += `---\nSeusdados Consultoria em Gestão de Dados Limitada\n`;
  text += `CNPJ 33.899.116/0001-63 | seusdados.com\n`;
  text += `Responsável Técnico: Marcelo Fattori\n`;
  return text;
}

/**
 * Envia e-mail de convite para assinatura a um signatário.
 */
export async function sendSignatureInviteEmail(data: SignatureEmailData): Promise<{ success: boolean; message: string }> {
  try {
    const { sendGenericEmail } = await import('../emailService');

    const html = generateSignatureEmailHtml(data);
    const text = generateSignatureEmailText(data);

    const result = await sendGenericEmail({
      to: data.to,
      subject: `Assinatura de Ata — ${data.meetingSequence}ª Reunião CPPD ${data.year} — ${data.organizationName}`,
      html,
      text,
      tags: [
        { name: 'module', value: 'cppd' },
        { name: 'type', value: 'signature_invite' },
        { name: 'meeting', value: `${data.meetingSequence}/${data.year}` },
      ],
    });

    logger.info(`[CppdSignatureEmail] E-mail enviado para ${data.to} (reunião ${data.meetingSequence}/${data.year})`);
    return { success: true, message: `E-mail enviado para ${data.to}` };
  } catch (error: any) {
    logger.error(`[CppdSignatureEmail] Falha ao enviar e-mail para ${data.to}:`, error?.message || String(error));
    return { success: false, message: error?.message || 'Falha ao enviar e-mail' };
  }
}

/**
 * Envia e-mails de convite para todos os signatários de uma ata.
 */
export async function sendSignatureInviteToAll(
  signers: Array<{ name: string; role: string; email?: string }>,
  meetingData: {
    organizationName: string;
    meetingSequence: number;
    year: number;
    meetingDate: string;
    pdfUrl?: string;
    platformUrl?: string;
    deadline?: string;
    senderName: string;
  }
): Promise<{ sent: number; failed: number; results: Array<{ email: string; success: boolean; message: string }> }> {
  const results: Array<{ email: string; success: boolean; message: string }> = [];
  let sent = 0;
  let failed = 0;

  for (const signer of signers) {
    if (!signer.email) {
      results.push({ email: '(sem e-mail)', success: false, message: `Signatário ${signer.name} não possui e-mail cadastrado` });
      failed++;
      continue;
    }

    const result = await sendSignatureInviteEmail({
      to: signer.email,
      signerName: signer.name,
      signerRole: signer.role,
      organizationName: meetingData.organizationName,
      meetingSequence: meetingData.meetingSequence,
      year: meetingData.year,
      meetingDate: meetingData.meetingDate,
      pdfUrl: meetingData.pdfUrl,
      platformUrl: meetingData.platformUrl,
      deadline: meetingData.deadline,
      senderName: meetingData.senderName,
    });

    results.push({ email: signer.email, ...result });
    if (result.success) sent++;
    else failed++;
  }

  logger.info(`[CppdSignatureEmail] Lote concluído: ${sent} enviados, ${failed} falharam de ${signers.length} total`);
  return { sent, failed, results };
}
