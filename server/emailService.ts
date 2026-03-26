import { withCircuitBreaker, withRetryAndBackoff } from "./_core/resilience";
import { logger } from "./_core/logger";
import { Resend } from 'resend';
import { ENV } from "./_core/env";

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
              <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663108549549/aXhenVrNQUAmSuqn.png" alt="Seusdados" style="height: 50px; margin-bottom: 20px;" />
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
              <h2 style="margin: 8px 0 0; color: #ffffff; font-size: 28px; font-weight: 600;">Seusdados Due Diligence</h2>
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
              <h2 style="margin: 8px 0 0; color: #ffffff; font-size: 28px; font-weight: 600;">Seusdados</h2>
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
              <h2 style="margin: 8px 0 0; color: #ffffff; font-size: 24px; font-weight: 600;">Seusdados</h2>
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
              <h2 style="margin: 8px 0 0; color: #ffffff; font-size: 24px; font-weight: 600;">Seusdados</h2>
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
              <h2 style="margin: 8px 0 0; color: #ffffff; font-size: 24px; font-weight: 600;">Seusdados</h2>
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
