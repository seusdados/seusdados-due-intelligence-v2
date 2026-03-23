// server/assessmentEmailService.ts
// ✅ Antes era stub (console.log). Agora delega para emailService.ts (Resend real).

export { sendReminderEmail, sendAssessmentEmail } from "./emailService";

// Compat legada
export const sendReminder = sendReminderEmail;
export const sendAssessmentInvitation = sendAssessmentEmail;
