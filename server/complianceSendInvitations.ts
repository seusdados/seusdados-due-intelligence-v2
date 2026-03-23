import { protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { getAppBaseUrl } from "./appUrl";
import { sendAssessmentEmail, AssessmentEmailData } from "./emailService";

export const sendInvitations = protectedProcedure
  .input(z.object({
    assessmentId: z.number(),
    assignments: z.array(z.object({
      domainId: z.string(),
      userIds: z.array(z.number()),
    })),
  }))
  .mutation(async ({ input, ctx }) => {
    const assessment = await db.getComplianceAssessmentById(input.assessmentId);
    if (!assessment) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Avaliação não encontrada' });
    }

    const organization = await db.getOrganizationById(assessment.organizationId);
    if (!organization) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Organização não encontrada' });
    }

    let sentCount = 0;
    let failedCount = 0;

    // Enviar e-mail para cada usuário atribuído
    for (const assignment of input.assignments) {
      for (const userId of assignment.userIds) {
        const user = await db.getUserById(userId);
        if (!user || !user.email) {
          failedCount++;
          continue;
        }

        try {
          // Gerar link de acesso para o respondente
          const baseUrl = getAppBaseUrl();
          const accessLink = `${baseUrl}/avaliacoes/${assessment.id}?domain=${assignment.domainId}&respondent=${userId}`;

          // Enviar e-mail
            const emailData: AssessmentEmailData = {
              to: user.email,
              recipientName: user.name || 'Respondente',
              assessmentTitle: assessment.title,
              assessmentUrl: accessLink,
              organizationName: organization.name,
              domainName: assignment.domainId,
              consultantName: ctx.user.name || 'Consultor Seusdados',
              assessmentType: 'conformidade',
            };
            await sendAssessmentEmail(emailData);

          sentCount++;
        } catch (error) {
          console.error(`Erro ao enviar e-mail para ${user.email}:`, error);
          failedCount++;
        }
      }
    }

    // Atualizar status da avaliação para "em_andamento"
    await db.updateComplianceAssessment(input.assessmentId, {
      status: 'em_andamento',
    });

    return {
      success: sentCount > 0,
      sentCount,
      failedCount,
      message: `E-mails enviados: ${sentCount}, Falhas: ${failedCount}`,
    };
  });
