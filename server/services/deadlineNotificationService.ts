// server/services/deadlineNotificationService.ts
// ✅ Antes era stub. Agora usa emailService.sendGenericEmail.

import { sendGenericEmail } from "../emailService";

export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}) {
  await sendGenericEmail({
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    tags: [{ name: "module", value: "deadline-notification" }],
  });
  return true;
}
