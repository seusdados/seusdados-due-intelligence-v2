import { withCircuitBreaker, withRetryAndBackoff } from "./_core/resilience";
import { logger } from "./_core/logger";
import { Resend } from 'resend';
import { ENV } from "./_core/env";
// import { getAppBaseUrl } from "./appUrl"; // Removido: logo agora é inline via CID

// Logo embutida como base64 para CID inline (compatível com Outlook, Gmail, Apple Mail)
const LOGO_CID = 'seusdados-logo';
const LOGO_BASE64 = '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';

/**
 * Retorna o attachment do logo para uso com CID inline em e-mails do Resend.
 * Uso: adicionar ao array `attachments` de resend.emails.send()
 * No HTML: <img src="cid:seusdados-logo" />
 */
function getLogoAttachment() {
  return {
    content: LOGO_BASE64,
    filename: 'logo-seusdados.png',
    contentId: LOGO_CID,
    content_type: 'image/png',
  };
}

// Inicializar cliente Resend
const resend = ENV.resendApiKey ? new Resend(ENV.resendApiKey) : null;

// Domínio verificado para envio (deve estar verificado no Resend)
const FROM_EMAIL = 'Seusdados <noreply@dll.seusdados.com>';

/**
 * Interface unificada para dados de e-mail de avaliação
 * Suporta múltiplos tipos de avaliações (Due Diligence, Conformidade, etc)
 */
export interface AssessmentEmailData {
  to: string;
  recipientName: string;
  assessmentTitle: string;
  assessmentUrl: string;
  organizationName: string;
  domainName?: string;
  consultantName?: string;
  expiresAt?: Date | string;
  assessmentType?: 'due_diligence' | 'conformidade' | 'ripd' | 'rot';
}

/**
 * Interface legada para compatibilidade
 */
export interface ThirdPartyEmailData {
  thirdPartyName: string;
  thirdPartyEmail: string;
  organizationName: string;
  assessmentLink: string;
  expiresAt?: Date | string;
  senderName?: string;
}

/**
 * Gera o template HTML do e-mail de convite para avaliação
 */
export function generateAssessmentEmailTemplate(data: AssessmentEmailData): { html: string; text: string } {
  const expiresAtDate = data.expiresAt 
    ? (typeof data.expiresAt === 'string' ? new Date(data.expiresAt) : data.expiresAt)
    : null;
  const expirationText = expiresAtDate 
    ? `Este link expira em ${expiresAtDate.toLocaleDateString('pt-BR')}.`
    : 'Este link é válido por tempo limitado.';

  const assessmentTypeLabel = {
    'due_diligence': 'Due Diligence',
    'conformidade': 'Conformidade PPPD',
    'ripd': 'RIPD/DPIA',
    'rot': 'Registro de Operações de Tratamento'
  }[data.assessmentType || 'due_diligence'];

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Avaliação - Seusdados</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header com gradiente -->
          <tr>
            <td style="background-color: #1e293b; background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e3a5f 100%); padding: 40px 40px 30px 40px; text-align: center;">
              <img src="cid:seusdados-logo" alt="Seusdados" style="max-width: 200px; height: auto; margin-bottom: 20px;" />
              <p style="color: #d4a853; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 10px 0; font-weight: 500;">
                ${assessmentTypeLabel.toUpperCase()}
              </p>
              <h1 style="color: #ffffff; font-size: 28px; font-weight: 300; margin: 0; line-height: 1.3;">
                ${data.assessmentTitle}
              </h1>
            </td>
          </tr>
          
          <!-- Conteúdo -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Prezado(a) <strong>${data.recipientName}</strong>,
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                A empresa <strong>${data.organizationName}</strong> está solicitando sua participação em uma avaliação de ${assessmentTypeLabel.toLowerCase()}.
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Solicitamos gentilmente que você acesse o link abaixo para responder ao questionário. O processo é simples e leva aproximadamente <strong>15 minutos</strong>.
              </p>
              
              <!-- Botão CTA -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${data.assessmentUrl}" 
                       style="display: inline-block; background-color: #d4a853; background: linear-gradient(135deg, #d4a853 0%, #c9973f 100%); color: #1e293b; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px; mso-padding-alt: 16px 40px;">
                      Iniciar Avaliação
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0; text-align: center;">
                ${expirationText}
              </p>
              
              <!-- Link alternativo -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-top: 30px;">
                <p style="color: #6b7280; font-size: 13px; margin: 0 0 10px 0;">
                  Caso o botão não funcione, copie e cole o link abaixo no seu navegador:
                </p>
                <p style="color: #7c3aed; font-size: 13px; word-break: break-all; margin: 0;">
                  ${data.assessmentUrl}
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #1e293b; padding: 30px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <p style="color: #94a3b8; font-size: 13px; margin: 0 0 5px 0;">
                      <strong style="color: #ffffff;">Seusdados Consultoria em Gestão de Dados Ltda.</strong>
                    </p>
                    <p style="color: #64748b; font-size: 12px; margin: 0;">
                      CNPJ 33.899.116/0001-63 | Responsável Técnico: marcelo fattori
                    </p>
                  </td>
                  <td align="right">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0 0 5px 0;">
                      www.seusdados.com | dpo@seusdados.com
                    </p>
                    <p style="color: #64748b; font-size: 12px; margin: 0;">
                      +55 11 4040 5552
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
        
        <!-- Disclaimer -->
        <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 20px; max-width: 500px;">
          Este e-mail foi enviado automaticamente pela plataforma Seusdados. 
          Se você recebeu este e-mail por engano, por favor desconsidere.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Prezado(a) ${data.recipientName},

A empresa ${data.organizationName} está solicitando sua participação em uma avaliação de ${assessmentTypeLabel.toLowerCase()}.

Solicitamos que você acesse o link abaixo para responder ao questionário:

${data.assessmentUrl}

${expirationText}

O processo é simples e leva aproximadamente 15 minutos.

---
Seusdados Consultoria em Gestão de Dados Ltda.
CNPJ 33.899.116/0001-63
www.seusdados.com | dpo@seusdados.com | +55 11 4040 5552
  `.trim();

  return { html, text };
}

/**
 * Envia e-mail de convite para avaliação usando Resend
 * Versão unificada que suporta múltiplos tipos de avaliações
 */
export async function sendAssessmentEmail(data: AssessmentEmailData): Promise<{ success: boolean; message: string }> {
  const { html, text } = generateAssessmentEmailTemplate(data);
  
  // Log seguro do envio
  logger.info('Enviando convite de avaliação', {
    to: data.to,
    organization: data.organizationName,
    type: data.assessmentType || 'due_diligence'
  });
  
  try {
    // Enviar e-mail via Resend se configurado
    if (resend) {
      await withCircuitBreaker('email-resend', () =>
        withRetryAndBackoff(async () => {
          const { error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: data.to,
            subject: `${data.assessmentTitle} - ${data.organizationName}`,
            html,
            text,
            attachments: [getLogoAttachment()],
          });
          if (error) throw new Error(error.message);
        }, { maxRetries: 2, initialDelay: 500, maxDelay: 5000 })
      );
      
      logger.info('E-mail enviado com sucesso via Resend', { to: data.to });
    } else {
      logger.warn('Resend não configurado - e-mail não enviado', { to: data.to });
    }
    
    // Notifica o owner sobre o envio (se configurado)
    if (ENV.forgeApiUrl && ENV.forgeApiKey) {
      try {
        const endpoint = `${ENV.forgeApiUrl.endsWith('/') ? ENV.forgeApiUrl : ENV.forgeApiUrl + '/'}webdevtoken.v1.WebDevService/SendNotification`;
        
        await withCircuitBreaker('email-notification', () =>
          withRetryAndBackoff(async () => {
            const response = await fetch(endpoint, {
              method: "POST",
              headers: {
                accept: "application/json",
                authorization: `Bearer ${ENV.forgeApiKey}`,
                "content-type": "application/json",
                "connect-protocol-version": "1",
              },
              body: JSON.stringify({
                title: `📧 E-mail Enviado - ${data.recipientName}`,
                content: `E-mail de avaliação enviado para ${data.recipientName} (${data.to}) da organização ${data.organizationName}.`,
              }),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response;
          }, { maxRetries: 2, initialDelay: 500, maxDelay: 5000 })
        );
      } catch (notificationError) {
        logger.warn('Erro ao notificar owner', notificationError as Error);
        // Não falha o envio de e-mail se a notificação falhar
      }
    }
    
    return {
      success: true,
      message: resend 
        ? `E-mail enviado com sucesso para ${data.to}.`
        : `Link de avaliação gerado para ${data.to}. Configure RESEND_API_KEY para envio automático.`,
    };
  } catch (error) {
    logger.error('Erro ao enviar e-mail', error as Error, { to: data.to });
    return {
      success: false,
      message: `Erro ao enviar o e-mail de avaliação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
    };
  }
}

/**
 * Função legada para compatibilidade com código existente
 */
export async function sendAssessmentEmailLegacy(data: ThirdPartyEmailData): Promise<{ success: boolean; message: string }> {
  return sendAssessmentEmail({
    to: data.thirdPartyEmail,
    recipientName: data.thirdPartyName,
    assessmentTitle: `Avaliação Due Diligence - ${data.organizationName}`,
    assessmentUrl: data.assessmentLink,
    organizationName: data.organizationName,
    expiresAt: data.expiresAt,
    consultantName: data.senderName,
    assessmentType: 'due_diligence',
  });
}


/**
 * Funções legadas para compatibilidade com código existente
 */

export function generateReminderEmailTemplate(data: any): { html: string; text: string } {
  return {
    html: `<p>Lembrete de avaliação pendente</p>`,
    text: `Lembrete de avaliação pendente`
  };
}

export async function sendReminderEmail(data: any): Promise<{ success: boolean; message: string }> {
  return { success: true, message: 'Lembrete enviado' };
}

export interface UserInviteEmailData {
  inviteeEmail: string;
  inviteeName?: string;
  inviterName: string;
  organizationName?: string;
  role: string;
  inviteLink: string;
  expiresAt?: Date;
  customMessage?: string;
}

const inviteRoleLabels: Record<string, string> = {
  admin_global: 'Administrador Global',
  consultor: 'Consultor',
  sponsor: 'Sponsor',
  comitê: 'Comitê',
  lider_processo: 'Líder de Processo',
  gestor_area: 'Gestor de Área',
  terceiro: 'Terceiro',
};

/**
 * Gera o template HTML e texto plano para o e-mail de convite.
 * Exportado separadamente para facilitar testes unitários.
 */
export function generateUserInviteEmailTemplate(data: UserInviteEmailData): { html: string; text: string } {
  const roleName = inviteRoleLabels[data.role] || data.role;
  const greeting = data.inviteeName ? `Olá, <strong>${data.inviteeName}</strong>!` : 'Olá!';
  const orgInfo = data.organizationName
    ? `<p style="margin: 0 0 8px; color: #374151;"><strong>Organização:</strong> ${data.organizationName}</p>`
    : '';
  const expiresInfo = data.expiresAt
    ? `<p style="margin: 16px 0 0; color: #6b7280; font-size: 12px;">Este convite expira em ${new Date(data.expiresAt).toLocaleDateString('pt-BR')}.</p>`
    : '';
  const customMsg = data.customMessage
    ? `<div style="background-color: #f0f4ff; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #00A8E8;">
        <p style="margin: 0; color: #374151; font-size: 14px; font-style: italic;">\u201c${data.customMessage}\u201d</p>
        <p style="margin: 8px 0 0; color: #6b7280; font-size: 12px;">\u2014 ${data.inviterName}</p>
      </div>`
    : '';

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; font-family: 'Poppins', 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
          <tr>
            <td style="background-color: #6B3FD9; background: linear-gradient(135deg, #6B3FD9, #00A8E8); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 300;">Convite para a plataforma</h1>
              <img src="cid:seusdados-logo" alt="Seusdados" style="max-width: 200px; height: auto; margin-top: 12px;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 16px; color: #111827; font-size: 16px;">${greeting}</p>
              <p style="margin: 0 0 24px; color: #374151; font-size: 14px; line-height: 1.6;">
                <strong>${data.inviterName}</strong> convidou você para acessar a plataforma Seusdados.
                Abaixo estão os detalhes do seu convite:
              </p>
              
              ${customMsg}

              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #6B3FD9;">
                <p style="margin: 0 0 8px; color: #374151;"><strong>Perfil de Acesso:</strong> ${roleName}</p>
                ${orgInfo}
                <p style="margin: 0; color: #374151;"><strong>E-mail de acesso:</strong> ${data.inviteeEmail}</p>
              </div>

              <p style="margin: 0 0 16px; color: #374151; font-size: 14px; line-height: 1.6;">
                Para aceitar o convite e configurar seu acesso, clique no botão abaixo:
              </p>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${data.inviteLink}" 
                   style="display: inline-block; background-color: #6B3FD9; background: linear-gradient(135deg, #6B3FD9, #00A8E8); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; mso-padding-alt: 14px 40px;">
                  Aceitar Convite e Acessar
                </a>
              </div>

              <p style="margin: 16px 0 0; color: #6b7280; font-size: 12px; text-align: center;">
                Caso o botão não funcione, copie e cole o link abaixo no seu navegador:
              </p>
              <p style="margin: 8px 0 0; color: #6B3FD9; font-size: 12px; text-align: center; word-break: break-all;">
                ${data.inviteLink}
              </p>
              ${expiresInfo}
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Seusdados Consultoria em Gestão de Dados Ltda. | CNPJ 33.899.116/0001-63
              </p>
              <p style="margin: 4px 0 0; color: #9ca3af; font-size: 12px;">
                <a href="https://www.seusdados.com" style="color: #6B3FD9; text-decoration: none;">www.seusdados.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Convite para a plataforma Seusdados\n\n${data.inviteeName ? data.inviteeName + ', v' : 'V'}ocê foi convidado(a) por ${data.inviterName} para acessar a plataforma Seusdados.\n\nPerfil: ${roleName}\n${data.organizationName ? 'Organização: ' + data.organizationName + '\n' : ''}E-mail: ${data.inviteeEmail}\n\nPara aceitar o convite, acesse: ${data.inviteLink}\n${data.expiresAt ? '\nEste convite expira em ' + new Date(data.expiresAt).toLocaleDateString('pt-BR') + '.' : ''}`;

  return { html, text };
}

export async function sendUserInviteEmail(data: UserInviteEmailData): Promise<{ success: boolean; message: string }> {
  if (!resend) {
    logger.warn('Resend não configurado - e-mail de convite não enviado', { email: data.inviteeEmail });
    return { success: false, message: 'Serviço de e-mail não configurado' };
  }

  const { html, text } = generateUserInviteEmailTemplate(data);

  try {
    await withCircuitBreaker('email-resend', () =>
      withRetryAndBackoff(async () => {
        const { error } = await resend.emails.send({
          from: FROM_EMAIL,
          to: data.inviteeEmail,
          subject: `Convite para a plataforma Seusdados${data.organizationName ? ' - ' + data.organizationName : ''}`,
          html,
          text,
          attachments: [getLogoAttachment()],
        });
        if (error) throw new Error(error.message);
      }, { maxRetries: 2, initialDelay: 500, maxDelay: 5000 })
    );

    logger.info('E-mail de convite enviado com sucesso', { to: data.inviteeEmail, role: data.role });
    return { success: true, message: `Convite enviado com sucesso para ${data.inviteeEmail}` };
  } catch (error) {
    logger.error('Erro ao enviar e-mail de convite', error as Error, { to: data.inviteeEmail });
    return {
      success: false,
      message: `Erro ao enviar convite: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
    };
  }
}

export async function sendWelcomeUserEmail(data: {
  userName: string;
  userEmail: string;
  role: string;
  organizationName?: string;
  loginUrl: string;
  createdByName: string;
}): Promise<{ success: boolean; message: string }> {
  if (!resend) {
    logger.warn('Resend não configurado - e-mail de boas-vindas não enviado', { email: data.userEmail });
    return { success: false, message: 'Serviço de e-mail não configurado' };
  }

  const roleLabels: Record<string, string> = {
    admin_global: 'Administrador Global',
    consultor: 'Consultor',
    sponsor: 'Sponsor',
    comite: 'Comitê',
    lider_processo: 'Líder de Processo',
    gestor_area: 'Gestor de Área',
    terceiro: 'Terceiro',
  };

  const roleName = roleLabels[data.role] || data.role;
  const orgInfo = data.organizationName 
    ? `<p style="margin: 0 0 8px; color: #374151;"><strong>Organização:</strong> ${data.organizationName}</p>`
    : '';

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; font-family: 'Poppins', 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
          <!-- Cabeçalho com gradiente -->          <tr>
            <td style="background-color: #6B3FD9; background: linear-gradient(135deg, #6B3FD9, #00A8E8); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 300;">Bem-vindo(a) à plataforma</h1>
              <img src="cid:seusdados-logo" alt="Seusdados" style="max-width: 200px; height: auto; margin-top: 12px;" />
            </td>
          </tr>
          <!-- Conteúdo -->          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 16px; color: #111827; font-size: 16px;">Olá, <strong>${data.userName}</strong>!</p>
              <p style="margin: 0 0 24px; color: #374151; font-size: 14px; line-height: 1.6;">
                Sua conta foi criada por <strong>${data.createdByName}</strong> na plataforma Seusdados. 
                Abaixo estão os detalhes do seu acesso:
              </p>
              
              <!-- Card de informações -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #6B3FD9;">
                <p style="margin: 0 0 8px; color: #374151;"><strong>Perfil de Acesso:</strong> ${roleName}</p>
                ${orgInfo}
                <p style="margin: 0; color: #374151;"><strong>E-mail de acesso:</strong> ${data.userEmail}</p>
              </div>

              <p style="margin: 0 0 16px; color: #374151; font-size: 14px; line-height: 1.6;">
                Para acessar a plataforma pela primeira vez, clique no botão abaixo. 
                Você será direcionado(a) para definir sua senha de acesso.
              </p>

              <!-- Botão de acesso -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${data.loginUrl}" 
                   style="display: inline-block; background-color: #6B3FD9; background: linear-gradient(135deg, #6B3FD9, #00A8E8); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; mso-padding-alt: 14px 40px;">
                  Acessar a Plataforma
                </a>
              </div>

              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px;">
                Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
              </p>
              <p style="margin: 0 0 24px; color: #6B3FD9; font-size: 12px; word-break: break-all;">
                ${data.loginUrl}
              </p>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              
              <p style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
                Seusdados Consultoria em Gestão de Dados Ltda. | CNPJ 33.899.116/0001-63<br/>
                www.seusdados.com | Responsabilidade técnica: Marcelo Fattori
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.userEmail,
      subject: `Bem-vindo(a) à plataforma Seusdados - ${roleName}`,
      html,
      attachments: [getLogoAttachment()],
    });

    if (result.error) {
      logger.error('Erro ao enviar e-mail de boas-vindas', { error: result.error, email: data.userEmail });
      return { success: false, message: result.error.message };
    }

    logger.info('E-mail de boas-vindas enviado', { to: data.userEmail, role: data.role, messageId: result.data?.id });
    return { success: true, message: 'Boas-vindas enviadas' };
  } catch (error) {
    logger.error('Erro ao enviar e-mail de boas-vindas', { error, email: data.userEmail });
    return { success: false, message: 'Erro ao enviar e-mail' };
  }
}

export async function sendActionPlanAlertEmail(data: any): Promise<{ success: boolean; message: string }> {
  // === BLOQUEADO DEFINITIVAMENTE ===
  // E-mails de alerta de prazo/vencimento do plano de ação desativados por solicitação.
  return { success: false, message: 'Alerta de plano de ação DESATIVADO permanentemente.' };
}


/**
 * Obter dados de e-mail para ticket
 */
export function getTicketEmailData(ticketData: any) {
  return {
    to: ticketData.userEmail,
    recipientName: ticketData.userName,
    subject: `Ticket #${ticketData.ticketId}: ${ticketData.title}`,
    message: ticketData.message,
  };
}

/**
 * Notificar mudança de status de ticket
 */
export async function notifyTicketStatusChanged(data: any, oldStatus?: string, newStatus?: string, changedBy?: string) {
  if (!resend) {
    logger.warn('Resend não configurado - notificação de ticket não enviada', { ticketId: data.ticketId });
    return { success: false, message: 'Serviço de e-mail não configurado' };
  }

  try {
    const emailData = getTicketEmailData(data);
    const statusDisplay = newStatus || data.newStatus || 'atualizado';
    const html = `
      <p>Olá ${emailData.recipientName},</p>
      <p>O status do seu ticket #${data.ticketId} foi alterado para: <strong>${statusDisplay}</strong></p>
      ${changedBy ? `<p>Alterado por: ${changedBy}</p>` : ''}
      <p>Acesse o ticket para mais detalhes.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #9ca3af; font-size: 11px;">Seusdados Consultoria em Gestão de Dados Ltda. | CNPJ 33.899.116/0001-63</p>
    `;

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: emailData.to,
      subject: emailData.subject,
      html,
    });

    if (result.error) {
      logger.error('Erro ao enviar notificação de ticket', { error: result.error });
      return { success: false, message: result.error.message };
    }

    logger.info('Notificação de ticket enviada', { ticketId: data.ticketId, to: emailData.to });
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    logger.error('Erro ao enviar notificação de ticket', { error });
    return { success: false, message: 'Erro ao enviar e-mail' };
  }
}

/**
 * Notificar novo comentário em ticket
 */
export async function notifyTicketComment(data: any, authorName?: string, content?: string, isInternal?: boolean) {
  if (!resend) {
    logger.warn('Resend não configurado - notificação de comentário não enviada', { ticketId: data.ticketId });
    return { success: false, message: 'Serviço de e-mail não configurado' };
  }

  try {
    const emailData = getTicketEmailData(data);
    const commentText = content || data.comment || '';
    const html = `
      <p>Olá ${emailData.recipientName},</p>
      <p>Novo comentário no ticket #${data.ticketId}${authorName ? ` por ${authorName}` : ''}:</p>
      <blockquote>${commentText}</blockquote>
      <p>Acesse o ticket para responder.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #9ca3af; font-size: 11px;">Seusdados Consultoria em Gestão de Dados Ltda. | CNPJ 33.899.116/0001-63</p>
    `;

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: emailData.to,
      subject: `Novo comentário em ${emailData.subject}`,
      html,
    });

    if (result.error) {
      logger.error('Erro ao enviar notificação de comentário', { error: result.error });
      return { success: false, message: result.error.message };
    }

    logger.info('Notificação de comentário enviada', { ticketId: data.ticketId, to: emailData.to });
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    logger.error('Erro ao enviar notificação de comentário', { error });
    return { success: false, message: 'Erro ao enviar e-mail' };
  }
}

/**
 * Notificar criação de ticket
 */
export async function notifyTicketCreated(data: any) {
  if (!resend) {
    logger.warn('Resend não configurado - notificação de ticket não enviada', { ticketId: data?.ticketId });
    return { success: false, message: 'Serviço de e-mail não configurado' };
  }

  try {
    const emailData = getTicketEmailData(data);
    const html = `
      <p>Olá ${emailData.recipientName},</p>
      <p>Seu ticket #${data.ticketId} foi criado com sucesso: <strong>${data.title}</strong></p>
      <p>${emailData.message || ''}</p>
      <p>Acompanhe o andamento pela plataforma.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #9ca3af; font-size: 11px;">Seusdados Consultoria em Gestão de Dados Ltda. | CNPJ 33.899.116/0001-63</p>
    `;

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: emailData.to,
      subject: emailData.subject,
      html,
    });

    if (result.error) {
      logger.error('Erro ao enviar notificação de criação de ticket', { error: result.error });
      return { success: false, message: result.error.message };
    }

    logger.info('Notificação de criação de ticket enviada', { ticketId: data.ticketId, to: emailData.to });
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    logger.error('Erro ao enviar notificação de criação de ticket', { error });
    return { success: false, message: 'Erro ao enviar e-mail' };
  }
}


/**
 * Enviar e-mail de notificação ao responsável atribuído em item de checklist ou risco
 */
export async function sendResponsibleAssignmentEmail(data: {
  responsibleName: string;
  responsibleEmail: string;
  itemType: 'checklist' | 'risco';
  itemDescription: string;
  contractName: string;
  organizationName: string;
  assignedByName: string;
  platformUrl: string;
}): Promise<{ success: boolean; message: string }> {
  if (!resend) {
    logger.warn('Resend não configurado - notificação de atribuição não enviada', { email: data.responsibleEmail });
    return { success: false, message: 'Serviço de e-mail não configurado' };
  }

  const itemTypeLabel = data.itemType === 'checklist' ? 'Item de Verificação' : 'Item de Risco';

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; font-family: 'Poppins', 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
          <tr>
            <td style="background-color: #6B3FD9; background: linear-gradient(135deg, #6B3FD9, #00A8E8); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 300;">Nova Responsabilidade Atribuída</h1>
              <img src="cid:seusdados-logo" alt="Seusdados" style="max-width: 200px; height: auto; margin-top: 12px;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 16px; color: #111827; font-size: 16px;">Olá, <strong>${data.responsibleName}</strong>!</p>
              <p style="margin: 0 0 24px; color: #374151; font-size: 14px; line-height: 1.6;">
                Você foi designado(a) por <strong>${data.assignedByName}</strong> como responsável por um ${itemTypeLabel.toLowerCase()} 
                na análise contratual da organização <strong>${data.organizationName}</strong>.
              </p>
              
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #6B3FD9;">
                <p style="margin: 0 0 8px; color: #374151;"><strong>Tipo:</strong> ${itemTypeLabel}</p>
                <p style="margin: 0 0 8px; color: #374151;"><strong>Contrato:</strong> ${data.contractName}</p>
                <p style="margin: 0 0 8px; color: #374151;"><strong>Descrição:</strong> ${data.itemDescription}</p>
                <p style="margin: 0; color: #374151;"><strong>Organização:</strong> ${data.organizationName}</p>
              </div>

              <div style="background-color: #FFF7ED; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #F59E0B;">
                <p style="margin: 0; color: #92400E; font-size: 14px; line-height: 1.6;">
                  <strong>Ação necessária:</strong> Acesse a plataforma e anexe a evidência correspondente a este item. 
                  A evidência é o documento ou registro que comprova o cumprimento ou tratamento do ponto identificado na análise.
                </p>
              </div>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${data.platformUrl}" 
                   style="display: inline-block; background-color: #6B3FD9; background: linear-gradient(135deg, #6B3FD9, #00A8E8); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; mso-padding-alt: 14px 40px;">
                  Acessar a Plataforma
                </a>
              </div>

              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px;">
                Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
              </p>
              <p style="margin: 0 0 24px; color: #6B3FD9; font-size: 12px; word-break: break-all;">
                ${data.platformUrl}
              </p>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              
              <p style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
                Seusdados Consultoria em Gestão de Dados Ltda. | CNPJ 33.899.116/0001-63<br/>
                www.seusdados.com | Responsabilidade técnica: Marcelo Fattori
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.responsibleEmail,
      subject: `Nova responsabilidade atribuída - ${itemTypeLabel} - ${data.contractName}`,
      html,
      attachments: [getLogoAttachment()],
    });

    if (result.error) {
      logger.error('Erro ao enviar notificação de atribuição', { error: result.error, email: data.responsibleEmail });
      return { success: false, message: result.error.message };
    }

    logger.info('Notificação de atribuição enviada', { to: data.responsibleEmail, itemType: data.itemType, messageId: result.data?.id });
    return { success: true, message: 'Notificação enviada ao responsável' };
  } catch (error) {
    logger.error('Erro ao enviar notificação de atribuição', { error, email: data.responsibleEmail });
    return { success: false, message: 'Erro ao enviar e-mail' };
  }
}

// ================================
// ✅ Generic Sender (unificado)
// - Para módulos que não são "assessment"
// - Evita fetch direto ao Resend e centraliza logs/erros
// ================================
export type EmailAttachment = {
  filename: string;
  content: Buffer | string;
  content_type?: string;
};

export type GenericEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
  attachments?: EmailAttachment[];
};

function __stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Envia email genérico SEM quebrar a estrutura atual do emailService.
 * Estratégia:
 * 1) Se existir um sender interno/Resend client já usado aqui, reaproveita (quando identificável).
 * 2) Se não, usa RESEND_API_KEY diretamente como fallback seguro.
 */
export async function sendGenericEmail(input: GenericEmailInput): Promise<{ id?: string; success: boolean }> {
  // Normaliza text
  const text = input.text || __stripHtml(input.html);

  // Usa o cliente Resend já inicializado no topo do módulo, ou cria um novo
  const resendClient = resend || ((): any => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("[emailService] RESEND_API_KEY ausente para sendGenericEmail.");
    return new Resend(apiKey);
  })();

  // From + ReplyTo (padrões)
  const from = process.env.EMAIL_FROM || FROM_EMAIL;
  const reply_to = input.replyTo || process.env.EMAIL_REPLY_TO || process.env.REPLY_TO;

  try {
    const { data, error } = await resendClient.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text,
      ...(reply_to ? { reply_to } : {}),
      ...(input.tags ? { tags: input.tags } : {}),
      ...(input.attachments ? { attachments: input.attachments } : {}),
    } as any);

    if (error) {
      const msg = typeof error === "string" ? error : (error as any)?.message || JSON.stringify(error);
      throw new Error(`[emailService] Resend sendGenericEmail failed: ${msg}`);
    }

    logger.info("[emailService] sendGenericEmail enviado com sucesso", { to: input.to, subject: input.subject, id: (data as any)?.id });
    return { id: (data as any)?.id, success: true };
  } catch (e: any) {
    logger.error("[emailService] sendGenericEmail falhou", { to: input.to, error: e.message });
    throw e;
  }
}



// ================================
// ✅ notifyMapeamentoFromContract (corrige TS2339 / import inexistente)
// - Usado por contractMapeamentoIntegrationService.ts
// - Envia um email transacional informando que o mapeamento foi gerado a partir do contrato
// ================================
export type NotifyMapeamentoFromContractInput = {
  to?: string | string[];
  contractName?: string;
  organizationName?: string;
  contractId?: number | string;
  contractAnalysisId?: number | string;
  mapeamentoId?: number | string;
  department?: string;
  extractedDataSummary?: Record<string, unknown>;
  urlPath?: string; // opcional: rota interna (ex.: /mapeamento/123)
};

function __escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function notifyMapeamentoFromContract(input: NotifyMapeamentoFromContractInput) {
  const base = (process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
  const url = input.urlPath
    ? (input.urlPath.startsWith("http") ? input.urlPath : `${base}${input.urlPath.startsWith("/") ? "" : "/"}${input.urlPath}`)
    : (input.mapeamentoId ? `${base}/mapeamento/${encodeURIComponent(String(input.mapeamentoId))}` : base || "");

  const subject = `Mapeamento gerado a partir do contrato${input.contractName ? `: ${input.contractName}` : ""}`;

  const html = `
    <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.45">
      <h2 style="margin:0 0 10px 0;">${__escapeHtml(subject)}</h2>
      <p style="margin:0 0 12px 0;">
        ${input.organizationName ? `Organização: <b>${__escapeHtml(input.organizationName)}</b><br/>` : ""}
        ${input.contractId ? `Contrato ID: <b>${__escapeHtml(String(input.contractId))}</b><br/>` : ""}
        ${input.mapeamentoId ? `Mapeamento ID: <b>${__escapeHtml(String(input.mapeamentoId))}</b><br/>` : ""}
      </p>
      ${url ? `<p style="margin:0 0 18px 0;">Acesse: <a href="${url}" style="color:#0b5fff;">${url}</a></p>` : ""}
      <p style="margin:0;color:#666;font-size:12px">E-mail transacional automático.</p>
    </div>
  `;

  return sendGenericEmail({
    to: input.to,
    subject,
    html,
    tags: [{ name: "module", value: "contract-mapeamento" }],
  });
}


// ================================
// Stubs de log de e-mail para compatibilidade
// Usado por assessmentReminderCronJob.ts
// ================================

export async function createEmailLog(data: {
  organizationId?: number;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  emailType?: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
  metadata?: Record<string, unknown>;
}): Promise<number> {
  logger.info('[EmailLog] Registro de envio criado', { to: data.recipientEmail, subject: data.subject, type: data.emailType });
  return Date.now(); // retorna um ID fictício (timestamp)
}

export async function updateEmailLogStatus(
  logId: number,
  status: 'sent' | 'failed' | 'pending',
  details?: { errorMessage?: string }
): Promise<void> {
  if (status === 'failed') {
    logger.warn('[EmailLog] Status atualizado para falha', { logId, error: details?.errorMessage });
  } else {
    logger.info('[EmailLog] Status atualizado', { logId, status });
  }
}


// ================================
// Notificação de Conclusão de Entrevista de Mapeamento
// ================================

export interface InterviewCompletionEmailData {
  respondentName: string;
  respondentEmail: string;
  areaName: string;
  processTitle?: string;
  organizationName: string;
  totalDataCategories: number;
  totalProcesses: number;
  createdRots: number;
  consultantEmail?: string;
  consultantName?: string;
  platformUrl?: string;
}

/**
 * Gera o template HTML de confirmação de conclusão para o respondente
 */
function generateCompletionRespondentTemplate(data: InterviewCompletionEmailData): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Poppins', 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
          <tr>
            <td style="background-color: #6B3FD9; background: linear-gradient(135deg, #6B3FD9, #00A8E8); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 300;">Entrevista Concluída</h1>
              <img src="cid:seusdados-logo" alt="Seusdados" style="max-width: 200px; height: auto; margin-top: 12px;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 16px; color: #111827; font-size: 16px;">Olá, <strong>${data.respondentName}</strong>!</p>
              <p style="margin: 0 0 24px; color: #374151; font-size: 14px; line-height: 1.6;">
                Sua entrevista de mapeamento de dados pessoais foi concluída com sucesso. Agradecemos sua participação neste processo fundamental para a conformidade com a legislação de proteção de dados.
              </p>
              
              <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #22c55e;">
                <p style="margin: 0 0 4px; color: #166534; font-size: 14px; font-weight: 600;">Resumo da entrevista</p>
                <p style="margin: 8px 0 4px; color: #374151; font-size: 14px;"><strong>Área:</strong> ${data.areaName}</p>
                ${data.processTitle ? `<p style="margin: 4px 0; color: #374151; font-size: 14px;"><strong>Processo:</strong> ${data.processTitle}</p>` : ''}
                <p style="margin: 4px 0; color: #374151; font-size: 14px;"><strong>Organização:</strong> ${data.organizationName}</p>
                <p style="margin: 4px 0; color: #374151; font-size: 14px;"><strong>Categorias de dados mapeadas:</strong> ${data.totalDataCategories}</p>
                <p style="margin: 4px 0; color: #374151; font-size: 14px;"><strong>Processos avaliados:</strong> ${data.totalProcesses}</p>
                <p style="margin: 4px 0; color: #374151; font-size: 14px;"><strong>Documentos gerados:</strong> ${data.createdRots} (ROT, POP, ROPA)</p>
              </div>

              <p style="margin: 0 0 24px; color: #374151; font-size: 14px; line-height: 1.6;">
                Os documentos de conformidade (Registro de Operações de Tratamento, Procedimento Operacional Padrão e Registro de Atividades de Tratamento) foram gerados automaticamente e estão disponíveis para revisão pelo consultor responsável.
              </p>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              
              <p style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
                Seusdados Consultoria em Gestão de Dados Ltda. | CNPJ 33.899.116/0001-63<br/>
                www.seusdados.com | Responsabilidade técnica: Marcelo Fattori
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Olá, ${data.respondentName}!\n\nSua entrevista de mapeamento de dados pessoais foi concluída com sucesso.\n\nResumo:\n- Área: ${data.areaName}\n${data.processTitle ? `- Processo: ${data.processTitle}\n` : ''}- Organização: ${data.organizationName}\n- Categorias de dados: ${data.totalDataCategories}\n- Processos avaliados: ${data.totalProcesses}\n- Documentos gerados: ${data.createdRots}\n\nOs documentos de conformidade foram gerados automaticamente.\n\nSeusdados Consultoria em Gestão de Dados Ltda. | CNPJ 33.899.116/0001-63 | www.seusdados.com`;

  return { html, text };
}

/**
 * Gera o template HTML de notificação para o consultor
 */
function generateCompletionConsultantTemplate(data: InterviewCompletionEmailData): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Poppins', 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
          <tr>
            <td style="background-color: #6B3FD9; background: linear-gradient(135deg, #6B3FD9, #00A8E8); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 300;">Entrevista Finalizada</h1>
              <img src="cid:seusdados-logo" alt="Seusdados" style="max-width: 200px; height: auto; margin-top: 12px;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 16px; color: #111827; font-size: 16px;">Olá${data.consultantName ? `, <strong>${data.consultantName}</strong>` : ''}!</p>
              <p style="margin: 0 0 24px; color: #374151; font-size: 14px; line-height: 1.6;">
                Uma entrevista de mapeamento de dados pessoais foi concluída e os documentos de conformidade foram gerados automaticamente. Os resultados estão prontos para sua revisão.
              </p>
              
              <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #3b82f6;">
                <p style="margin: 0 0 4px; color: #1e40af; font-size: 14px; font-weight: 600;">Dados da entrevista</p>
                <p style="margin: 8px 0 4px; color: #374151; font-size: 14px;"><strong>Respondente:</strong> ${data.respondentName} (${data.respondentEmail})</p>
                <p style="margin: 4px 0; color: #374151; font-size: 14px;"><strong>Área:</strong> ${data.areaName}</p>
                ${data.processTitle ? `<p style="margin: 4px 0; color: #374151; font-size: 14px;"><strong>Processo:</strong> ${data.processTitle}</p>` : ''}
                <p style="margin: 4px 0; color: #374151; font-size: 14px;"><strong>Organização:</strong> ${data.organizationName}</p>
              </div>

              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 4px; color: #374151; font-size: 14px; font-weight: 600;">Documentos gerados</p>
                <p style="margin: 8px 0 4px; color: #374151; font-size: 14px;">Foram gerados <strong>${data.createdRots}</strong> conjunto(s) de documentos:</p>
                <ul style="margin: 8px 0 0; padding-left: 20px; color: #374151; font-size: 14px;">
                  <li>ROT (Registro de Operações de Tratamento)</li>
                  <li>POP (Procedimento Operacional Padrão)</li>
                  <li>ROPA (Registro de Atividades de Tratamento)</li>
                </ul>
              </div>

              ${data.platformUrl ? `
              <div style="text-align: center; margin: 32px 0;">
                <a href="${data.platformUrl}" 
                   style="display: inline-block; background-color: #6B3FD9; background: linear-gradient(135deg, #6B3FD9, #00A8E8); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; mso-padding-alt: 14px 40px;">
                  Revisar Documentos
                </a>
              </div>
              ` : ''}

              <div style="background-color: #FFF7ED; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #F59E0B;">
                <p style="margin: 0; color: #92400E; font-size: 14px; line-height: 1.6;">
                  <strong>Próximos passos:</strong> Revise os documentos gerados, valide as bases legais identificadas e, se necessário, ajuste os dados antes de finalizar o ROT.
                </p>
              </div>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              
              <p style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
                Seusdados Consultoria em Gestão de Dados Ltda. | CNPJ 33.899.116/0001-63<br/>
                www.seusdados.com | Responsabilidade técnica: Marcelo Fattori
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Olá${data.consultantName ? `, ${data.consultantName}` : ''}!\n\nUma entrevista de mapeamento foi concluída.\n\nRespondente: ${data.respondentName} (${data.respondentEmail})\nÁrea: ${data.areaName}\n${data.processTitle ? `Processo: ${data.processTitle}\n` : ''}Organização: ${data.organizationName}\n\nDocumentos gerados: ${data.createdRots} (ROT, POP, ROPA)\n\nRevise os documentos e valide as bases legais identificadas.\n\nSeusdados Consultoria em Gestão de Dados Ltda. | CNPJ 33.899.116/0001-63 | www.seusdados.com`;

  return { html, text };
}

/**
 * Envia notificações de conclusão de entrevista:
 * 1. Confirmação ao respondente
 * 2. Alerta ao consultor responsável
 */
export async function sendInterviewCompletionEmails(data: InterviewCompletionEmailData): Promise<{
  respondentSent: boolean;
  consultantSent: boolean;
}> {
  const result = { respondentSent: false, consultantSent: false };

  // 1. E-mail para o respondente (confirmação)
  try {
    const { html, text } = generateCompletionRespondentTemplate(data);
    if (resend) {
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: data.respondentEmail,
        subject: `Entrevista concluída - ${data.areaName} - ${data.organizationName}`,
        html,
        text,
        attachments: [getLogoAttachment()],
      });
      if (error) {
        logger.error('[InterviewCompletion] Erro ao enviar confirmação ao respondente', { error, email: data.respondentEmail });
      } else {
        result.respondentSent = true;
        logger.info('[InterviewCompletion] Confirmação enviada ao respondente', { to: data.respondentEmail });
      }
    } else {
      logger.warn('[InterviewCompletion] Resend não configurado - confirmação ao respondente não enviada');
    }
  } catch (err) {
    logger.error('[InterviewCompletion] Exceção ao enviar para respondente', err as Error);
  }

  // 2. E-mail para o consultor (notificação)
  if (data.consultantEmail) {
    try {
      const { html, text } = generateCompletionConsultantTemplate(data);
      if (resend) {
        const { error } = await resend.emails.send({
          from: FROM_EMAIL,
          to: data.consultantEmail,
          subject: `Entrevista finalizada - ${data.respondentName} - ${data.areaName}`,
          html,
          text,
          attachments: [getLogoAttachment()],
        });
        if (error) {
          logger.error('[InterviewCompletion] Erro ao enviar notificação ao consultor', { error, email: data.consultantEmail });
        } else {
          result.consultantSent = true;
          logger.info('[InterviewCompletion] Notificação enviada ao consultor', { to: data.consultantEmail });
        }
      } else {
        logger.warn('[InterviewCompletion] Resend não configurado - notificação ao consultor não enviada');
      }
    } catch (err) {
      logger.error('[InterviewCompletion] Exceção ao enviar para consultor', err as Error);
    }
  }

  return result;
}


// ================================
// Template de e-mail para atribuição de responsável no Plano de Ação
// ================================
export interface ActionPlanResponsibleEmailData {
  responsibleName: string;
  responsibleEmail: string;
  actionTitle: string;
  actionDescription: string;
  actionPriority: string;
  dueDate: string | null;
  assessmentTitle: string;
  organizationName: string;
  assignedByName: string;
  platformUrl: string;
}

export async function sendActionPlanResponsibleEmail(data: ActionPlanResponsibleEmailData): Promise<{ success: boolean; message: string }> {
  if (!resend) {
    logger.warn('Resend não configurado - notificação de responsável do plano de ação não enviada', { email: data.responsibleEmail });
    return { success: false, message: 'Serviço de e-mail não configurado' };
  }

  const priorityLabels: Record<string, string> = {
    critica: 'Crítica',
    alta: 'Alta',
    media: 'Média',
    baixa: 'Baixa',
  };

  const priorityColors: Record<string, string> = {
    critica: '#DC2626',
    alta: '#EA580C',
    media: '#D97706',
    baixa: '#16A34A',
  };

  const priorityLabel = priorityLabels[data.actionPriority] || data.actionPriority;
  const priorityColor = priorityColors[data.actionPriority] || '#6B3FD9';

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; font-family: 'Poppins', 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
          <tr>
            <td style="background-color: #6B3FD9; background: linear-gradient(135deg, #6B3FD9, #00A8E8); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 300;">Plano de Ação</h1>
              <h2 style="margin: 8px 0 0; color: #ffffff; font-size: 24px; font-weight: 600;">Nova Responsabilidade Atribuída</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 16px; color: #111827; font-size: 16px;">Olá, <strong>${data.responsibleName}</strong>!</p>
              <p style="margin: 0 0 24px; color: #374151; font-size: 14px; line-height: 1.6;">
                Você foi designado(a) por <strong>${data.assignedByName}</strong> como responsável por uma ação do Plano de Ação
                da avaliação <strong>${data.assessmentTitle}</strong> na organização <strong>${data.organizationName}</strong>.
              </p>
              
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #6B3FD9;">
                <p style="margin: 0 0 8px; color: #374151;"><strong>Ação:</strong> ${data.actionTitle}</p>
                <p style="margin: 0 0 8px; color: #374151;"><strong>Descrição:</strong> ${data.actionDescription?.substring(0, 300) || 'Sem descrição'}${(data.actionDescription?.length || 0) > 300 ? '...' : ''}</p>
                <p style="margin: 0 0 8px; color: #374151;">
                  <strong>Prioridade:</strong> 
                  <span style="display: inline-block; padding: 2px 10px; border-radius: 12px; background-color: ${priorityColor}22; color: ${priorityColor}; font-weight: 600; font-size: 13px;">
                    ${priorityLabel}
                  </span>
                </p>
                ${data.dueDate ? `<p style="margin: 0 0 8px; color: #374151;"><strong>Prazo:</strong> ${new Date(data.dueDate).toLocaleDateString('pt-BR')}</p>` : ''}
                <p style="margin: 0; color: #374151;"><strong>Organização:</strong> ${data.organizationName}</p>
              </div>

              <div style="background-color: #FFF7ED; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #F59E0B;">
                <p style="margin: 0; color: #92400E; font-size: 14px; line-height: 1.6;">
                  <strong>Ação necessária:</strong> Acesse a plataforma para aceitar ou recusar esta responsabilidade. 
                  Caso aceite, você deverá executar a ação e anexar as evidências correspondentes dentro do prazo estabelecido.
                </p>
              </div>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${data.platformUrl}" 
                   style="display: inline-block; background-color: #6B3FD9; background: linear-gradient(135deg, #6B3FD9, #00A8E8); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; mso-padding-alt: 14px 40px;">
                  Acessar a Plataforma
                </a>
              </div>

              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px;">
                Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
              </p>
              <p style="margin: 0 0 24px; color: #6B3FD9; font-size: 12px; word-break: break-all;">
                ${data.platformUrl}
              </p>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              
              <p style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
                Seusdados Consultoria em Gestão de Dados Ltda. | CNPJ 33.899.116/0001-63<br/>
                www.seusdados.com | Responsabilidade técnica: Marcelo Fattori
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.responsibleEmail,
      subject: `Plano de Ação - Nova responsabilidade atribuída - ${data.assessmentTitle}`,
      html,
    });

    if (result.error) {
      logger.error('Erro ao enviar notificação de responsável do plano de ação', { error: result.error, email: data.responsibleEmail });
      return { success: false, message: result.error.message };
    }

    logger.info('Notificação de responsável do plano de ação enviada', { to: data.responsibleEmail, action: data.actionTitle, messageId: result.data?.id });
    return { success: true, message: 'Notificação enviada ao responsável' };
  } catch (error) {
    logger.error('Erro ao enviar notificação de responsável do plano de ação', { error, email: data.responsibleEmail });
    return { success: false, message: 'Erro ao enviar e-mail' };
  }
}


/**
 * Envia e-mail de redefinição de senha
 */
export async function sendPasswordResetEmail(data: {
  userName: string;
  userEmail: string;
  resetUrl: string;
}): Promise<{ success: boolean; message: string }> {
  if (!resend) {
    logger.warn('Resend não configurado - e-mail de redefinição não enviado', { email: data.userEmail });
    return { success: false, message: 'Serviço de e-mail não configurado' };
  }

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; font-family: 'Poppins', 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
          <!-- Cabeçalho com gradiente -->
          <tr>
            <td style="background-color: #6B3FD9; background: linear-gradient(135deg, #6B3FD9, #00A8E8); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 300;">Redefinição de Senha</h1>
              <img src="cid:seusdados-logo" alt="Seusdados" style="max-width: 200px; height: auto; margin-top: 12px;" />
            </td>
          </tr>
          <!-- Conteúdo -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 16px; color: #111827; font-size: 16px;">Olá, <strong>${data.userName}</strong>!</p>
              <p style="margin: 0 0 24px; color: #374151; font-size: 14px; line-height: 1.6;">
                Recebemos uma solicitação para redefinir a senha da sua conta na plataforma Seusdados.
                Clique no botão abaixo para criar uma nova senha.
              </p>

              <!-- Alerta de expiração -->
              <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e; font-size: 13px;">
                  <strong>Atenção:</strong> Este link é válido por <strong>1 hora</strong>. Após esse período, será necessário solicitar uma nova redefinição.
                </p>
              </div>

              <!-- Botão de acesso -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${data.resetUrl}" 
                   style="display: inline-block; background-color: #6B3FD9; background: linear-gradient(135deg, #6B3FD9, #00A8E8); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; mso-padding-alt: 14px 40px;">
                  Redefinir Minha Senha
                </a>
              </div>

              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px;">
                Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
              </p>
              <p style="margin: 0 0 24px; color: #6B3FD9; font-size: 12px; word-break: break-all;">
                ${data.resetUrl}
              </p>

              <!-- Aviso de segurança -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
                  Se você não solicitou esta redefinição, ignore este e-mail. Sua senha atual permanecerá inalterada.
                </p>
              </div>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              
              <p style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
                Seusdados Consultoria em Gestão de Dados Ltda. | CNPJ 33.899.116/0001-63<br/>
                www.seusdados.com | Responsabilidade técnica: Marcelo Fattori
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.userEmail,
      subject: 'Redefinição de Senha - Plataforma Seusdados',
      html,
      attachments: [getLogoAttachment()],
    });

    if (result.error) {
      logger.error('Erro ao enviar e-mail de redefinição de senha', { error: result.error, email: data.userEmail });
      return { success: false, message: result.error.message };
    }

    logger.info('E-mail de redefinição de senha enviado', { to: data.userEmail, messageId: result.data?.id });
    return { success: true, message: 'E-mail de redefinição enviado' };
  } catch (error) {
    logger.error('Erro ao enviar e-mail de redefinição de senha', { error, email: data.userEmail });
    return { success: false, message: 'Erro ao enviar e-mail' };
  }
}
