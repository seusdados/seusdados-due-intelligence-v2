// server/contractAnalysisEmailService.ts
// ✅ Unificado: NÃO usa fetch direto ao Resend. Passa pelo emailService.ts.

import { sendGenericEmail } from "./emailService";

type Status = "completed" | "error" | "canceled";

function esc(s: string): string {
  return String(s)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function buildPublicUrl(path: string): string {
  const base = (process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
  if (!path) return base || "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

/**
 * Compatível com os chamadores existentes:
 * - sendAnalysisNotificationEmail(analysisId, userEmail, status, errorMessage?)
 * - notifyAnalysisCompletion(...)  (alias)
 */
export async function sendAnalysisNotificationEmail(
  analysisId: number,
  userEmail: string,
  status: Status,
  errorMessage?: string | null
) {
  const url = buildPublicUrl(`/contract-analysis/${analysisId}`);

  const subject =
    status === "completed"
      ? "✅ Análise de Contrato concluída"
      : status === "canceled"
      ? "⏹️ Análise de Contrato cancelada"
      : "❌ Erro na Análise de Contrato";

  const msg =
    status === "completed"
      ? "Sua análise foi concluída com sucesso."
      : status === "canceled"
      ? "Sua análise foi cancelada."
      : "Ocorreu um erro ao processar sua análise.";

  const err =
    status === "error" && errorMessage
      ? `<div style="margin-top:12px;padding:12px;border:1px solid #eee;border-radius:8px;background:#fafafa;">
           <div style="font-weight:600;margin-bottom:6px;">Detalhes do erro</div>
           <div style="font-family:ui-monospace,Menlo,Monaco,Consolas,monospace;white-space:pre-wrap;">${esc(errorMessage)}</div>
         </div>`
      : "";

  const html = `
  <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.45">
    <h2 style="margin:0 0 10px 0;">${esc(subject)}</h2>
    <p style="margin:0 0 12px 0;">${esc(msg)}</p>
    <p style="margin:0 0 18px 0;">
      Acesse aqui: <a href="${url}" style="color:#0b5fff;">${url}</a>
    </p>
    ${err}
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
    <p style="margin:0;color:#666;font-size:12px">E-mail transacional automático.</p>
  </div>`;

  return sendGenericEmail({
    to: userEmail,
    subject,
    html,
    tags: [{ name: "module", value: "contract-analysis" }],
  });
}

export const notifyAnalysisCompletion = sendAnalysisNotificationEmail;
