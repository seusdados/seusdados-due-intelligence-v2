/**
 * Informações institucionais oficiais da Seusdados.
 *
 * Fonte única de verdade para todos os pontos da plataforma que exibem
 * dados da empresa: rodapés de e-mail, documentos PDF, páginas de login,
 * cabeçalhos de relatórios, etc.
 *
 * Qualquer alteração nos dados institucionais deve ser feita APENAS aqui.
 */

export const COMPANY = {
  /** Nome empresarial completo (razão social) */
  legalName: "Seusdados Consultoria em Gestão de Dados Limitada",

  /** Nome fantasia */
  tradeName: "Seusdados",

  /** CNPJ formatado */
  cnpj: "33.899.116/0001-63",

  /** Responsável técnico */
  responsible: "Marcelo Fattori",

  /** Endereço completo */
  address: "Rua Eduardo Tomanik, 121, salas 10 e 11, Chácara Urbana, Jundiaí-SP",

  /** Telefone com código internacional */
  phone: "+55 11 4040 5552",

  /** E-mail institucional / DPO */
  email: "dpo@seusdados.com",

  /** URL do site institucional (sem barra final) */
  website: "https://seusdados.com",

  /** Rótulo curto do site para exibição em texto */
  websiteLabel: "seusdados.com",
} as const;

/**
 * Rodapé institucional padronizado para e-mails HTML.
 * Inclui nome, CNPJ, endereço, contato e responsável.
 */
export function companyEmailFooterHtml(): string {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td>
          <p style="color: #94a3b8; font-size: 13px; margin: 0 0 5px 0;">
            <strong style="color: #ffffff;">${COMPANY.legalName}</strong>
          </p>
          <p style="color: #64748b; font-size: 12px; margin: 0 0 3px 0;">
            CNPJ ${COMPANY.cnpj} | Responsável Técnico: ${COMPANY.responsible}
          </p>
          <p style="color: #64748b; font-size: 12px; margin: 0 0 3px 0;">
            ${COMPANY.address}
          </p>
          <p style="color: #64748b; font-size: 12px; margin: 0;">
            ${COMPANY.websiteLabel} | ${COMPANY.email} | ${COMPANY.phone}
          </p>
        </td>
      </tr>
    </table>`.trim();
}

/**
 * Rodapé institucional padronizado para texto puro (e-mails text/plain).
 */
export function companyEmailFooterText(): string {
  return [
    `${COMPANY.legalName}`,
    `CNPJ ${COMPANY.cnpj} | Responsável Técnico: ${COMPANY.responsible}`,
    `${COMPANY.address}`,
    `${COMPANY.websiteLabel} | ${COMPANY.email} | ${COMPANY.phone}`,
  ].join("\n");
}

/**
 * Linha de crédito curta para rodapés de documentos PDF / HTML.
 */
export function companyDocumentFooter(): string {
  return `${COMPANY.legalName} | CNPJ ${COMPANY.cnpj} | ${COMPANY.websiteLabel} | Responsável Técnico: ${COMPANY.responsible}`;
}

/**
 * Assinatura institucional para documentos formais.
 */
export function companySignatureBlock(): string {
  return [
    COMPANY.legalName,
    `CNPJ ${COMPANY.cnpj}`,
    `Responsável Técnico: ${COMPANY.responsible}`,
    COMPANY.address,
    `${COMPANY.email} | ${COMPANY.phone}`,
    COMPANY.websiteLabel,
  ].join("\n");
}
