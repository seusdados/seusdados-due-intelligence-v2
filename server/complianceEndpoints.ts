import { protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { sendAssessmentEmail } from './emailService';
import { getDb, extractInsertId } from './db';
import { complianceAssignments, complianceAssessments, complianceResponses, users } from '../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from './_core/logger';
import { dominiosConformidade } from '../shared/assessmentData';

export const complianceEndpointsExtra = {
  // ==================== ATRIBUIÇÕES DE DOMÍNIOS ====================

  /**
   * Listar todas as atribuições de uma avaliação (admin/consultor)
   */
  getAssignments: protectedProcedure
    .input(z.object({ assessmentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const result = await db
        .select({
          id: complianceAssignments.id,
          assessmentId: complianceAssignments.assessmentId,
          domainId: complianceAssignments.domainId,
          userId: complianceAssignments.userId,
          status: complianceAssignments.status,
          sentAt: complianceAssignments.sentAt,
          resentAt: complianceAssignments.resentAt,
          respondedAt: complianceAssignments.respondedAt,
          viewedAt: complianceAssignments.viewedAt,
          createdAt: complianceAssignments.createdAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(complianceAssignments)
        .leftJoin(users, eq(complianceAssignments.userId, users.id))
        .where(eq(complianceAssignments.assessmentId, input.assessmentId));

      return result;
    }),

  /**
   * Verificar se todos os domínios de uma avaliação tém responsáveis atribuídos
   */
  checkAllDomainsAssigned: protectedProcedure
    .input(z.object({ assessmentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { allAssigned: false, unassignedDomains: dominiosConformidade.map(d => d.id) };

      // Buscar todas as atribuições da avaliação
      const assignments = await db
        .select({ domainId: complianceAssignments.domainId })
        .from(complianceAssignments)
        .where(eq(complianceAssignments.assessmentId, input.assessmentId));

      const assignedDomainIds = new Set(assignments.map(a => a.domainId));
      const unassignedDomains = dominiosConformidade
        .filter(d => !assignedDomainIds.has(d.id))
        .map(d => d.id);

      return {
        allAssigned: unassignedDomains.length === 0,
        unassignedDomains,
      };
    }),

  /**
   * Obter domínios atribuídos ao usuário logado para uma avaliação específica
   * Usado pelo respondente para saber quais domínios pode ver/responder
   */
  getMyAssignedDomains: protectedProcedure
    .input(z.object({ assessmentId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { isAdmin: false, canRespond: false, assignedDomainIds: [] as number[], assignments: [] as any[] };

      // Admin global, consultores e Sponsor podem ver todos os domínios
      const isAdmin = ['admin_global', 'consultor', 'sponsor'].includes(ctx.user.role);
      if (isAdmin) {
        // Retorna todos os domínios com informação de atribuição
        const assignments = await db
          .select()
          .from(complianceAssignments)
          .where(eq(complianceAssignments.assessmentId, input.assessmentId));
        
        return {
          isAdmin: true,
          canRespond: false, // Admin não responde, apenas gerencia
          assignedDomainIds: dominiosConformidade.map(d => d.id),
          assignments,
        };
      }

      // Usuário comum: apenas domínios atribuídos a ele
      const myAssignments = await db
        .select()
        .from(complianceAssignments)
        .where(
          and(
            eq(complianceAssignments.assessmentId, input.assessmentId),
            eq(complianceAssignments.userId, ctx.user.id)
          )
        );

      return {
        isAdmin: false,
        canRespond: myAssignments.length > 0,
        assignedDomainIds: myAssignments.map(a => a.domainId),
        assignments: myAssignments,
      };
    }),

  /**
   * Atribuir um usuário a um domínio (ou remover atribuição)
   * Apenas admin/consultor pode atribuir
   */
  assignDomain: protectedProcedure
    .input(z.object({
      assessmentId: z.number(),
      domainId: z.number(),
      userId: z.number().nullable(), // null = remover atribuição
    }))
    .mutation(async ({ input, ctx }) => {
      // Verificar permissão
      const isAdmin = ['admin_global', 'consultor'].includes(ctx.user.role);
      const isSponsor = ctx.user.role === 'sponsor';
      
      if (!isAdmin && !isSponsor) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores podem atribuir domínios' });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Banco de dados indisponível' });

      // Verificar se a avaliação existe
      const assessment = await db.select().from(complianceAssessments)
        .where(eq(complianceAssessments.id, input.assessmentId)).limit(1);
      if (!assessment.length) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Avaliação não encontrada' });
      }

      // Sponsor só pode gerenciar sua própria organização
      if (isSponsor && assessment[0].organizationId !== ctx.user.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para gerenciar esta avaliação' });
      }

      // Verificar se o admin não está se atribuindo (quem cria não responde)
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'O administrador que gerencia a avaliação não pode ser atribuído como respondente.' 
        });
      }

      if (input.userId === null) {
        // Remover atribuição existente
        await db.delete(complianceAssignments)
          .where(
            and(
              eq(complianceAssignments.assessmentId, input.assessmentId),
              eq(complianceAssignments.domainId, input.domainId)
            )
          );
        return { success: true, action: 'removed' };
      }

      // Verificar se o usuário existe
      const user = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!user.length) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
      }

      // Verificar se já existe atribuição para este domínio
      const existing = await db.select().from(complianceAssignments)
        .where(
          and(
            eq(complianceAssignments.assessmentId, input.assessmentId),
            eq(complianceAssignments.domainId, input.domainId)
          )
        ).limit(1);

      if (existing.length) {
        // Atualizar atribuição existente
        await db.update(complianceAssignments)
          .set({ 
            userId: input.userId, 
            status: 'pending',
            sentAt: null,
            respondedAt: null,
          })
          .where(eq(complianceAssignments.id, existing[0].id));
      } else {
        // Criar nova atribuição
        await db.insert(complianceAssignments).values({
          assessmentId: input.assessmentId,
          domainId: input.domainId,
          userId: input.userId,
          status: 'pending',
        });
      }

      return { success: true, action: 'assigned' };
    }),

  /**
   * Salvar todas as atribuições de domínios de uma vez e enviar e-mails
   */
  saveAssignmentsAndNotify: protectedProcedure
    .input(z.object({
      assessmentId: z.number(),
      assignments: z.array(z.object({
        domainId: z.number(),
        userId: z.number().nullable(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const isAdmin = ['admin_global', 'consultor'].includes(ctx.user.role);
      const isSponsor = ctx.user.role === 'sponsor';
      
      if (!isAdmin && !isSponsor) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores podem atribuir domínios' });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Banco de dados indisponível' });

      const assessment = await db.select().from(complianceAssessments)
        .where(eq(complianceAssessments.id, input.assessmentId)).limit(1);
      if (!assessment.length) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Avaliação não encontrada' });
      }

      // Sponsor só pode gerenciar sua própria organização
      if (isSponsor && assessment[0].organizationId !== ctx.user.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para gerenciar esta avaliação' });
      }

      let savedCount = 0;
      let emailsSent = 0;
      let emailErrors = 0;
      const notifiedUserIds = new Set<number>();

      for (const assignment of input.assignments) {
        if (assignment.userId === null) {
          // Remover atribuição se existir
          await db.delete(complianceAssignments)
            .where(
              and(
                eq(complianceAssignments.assessmentId, input.assessmentId),
                eq(complianceAssignments.domainId, assignment.domainId)
              )
            );
          continue;
        }

        // Verificar se admin não está se atribuindo
        if (assignment.userId === ctx.user.id) continue;

        // Upsert atribuição
        const existing = await db.select().from(complianceAssignments)
          .where(
            and(
              eq(complianceAssignments.assessmentId, input.assessmentId),
              eq(complianceAssignments.domainId, assignment.domainId)
            )
          ).limit(1);

        if (existing.length) {
          if (existing[0].userId !== assignment.userId) {
            await db.update(complianceAssignments)
              .set({ 
                userId: assignment.userId, 
                status: 'sent',
                sentAt: sql`NOW()`,
                respondedAt: null,
              })
              .where(eq(complianceAssignments.id, existing[0].id));
          } else {
            // Mesmo usuário, atualizar sentAt
            await db.update(complianceAssignments)
              .set({ 
                status: 'sent',
                sentAt: sql`NOW()`,
              })
              .where(eq(complianceAssignments.id, existing[0].id));
          }
        } else {
          await db.insert(complianceAssignments).values({
            assessmentId: input.assessmentId,
            domainId: assignment.domainId,
            userId: assignment.userId,
            status: 'sent',
          });
        }
        savedCount++;

        // Enviar e-mail (apenas 1 por usuário, não 1 por domínio)
        if (!notifiedUserIds.has(assignment.userId)) {
          notifiedUserIds.add(assignment.userId);
          
          try {
            const userData = await db.select().from(users).where(eq(users.id, assignment.userId)).limit(1);
            if (userData.length && userData[0].email) {
              const domain = dominiosConformidade.find(d => d.id === assignment.domainId);
              
              // Listar todos os domínios atribuídos a este usuário
              const userDomains = input.assignments
                .filter(a => a.userId === assignment.userId)
                .map(a => {
                  const d = dominiosConformidade.find(dom => dom.id === a.domainId);
                  return d?.titulo || `Domínio ${a.domainId}`;
                });

              const assessmentUrl = `https://dll.seusdados.com/avaliacoes/${input.assessmentId}`;

              const emailResult = await sendAssessmentEmail({
                to: userData[0].email,
                recipientName: userData[0].name || 'Respondente',
                assessmentTitle: `${assessment[0].title} - Domínios: ${userDomains.join(', ')}`,
                assessmentUrl,
                organizationName: 'Seusdados',
                domainName: userDomains.join(', '),
                assessmentType: 'conformidade',
              });

              if (emailResult.success) {
                emailsSent++;
              } else {
                emailErrors++;
              }
            }
          } catch (error) {
            logger.error('Erro ao enviar e-mail de atribuição', { error, userId: assignment.userId });
            emailErrors++;
          }
        }
      }

      // Atualizar status da avaliação para em_andamento se havia rascunho ou aguardando_vinculação
      if ((assessment[0].status === 'rascunho' || assessment[0].status === 'aguardando_vinculacao') && savedCount > 0) {
        await db.update(complianceAssessments)
          .set({ status: 'em_andamento' })
          .where(eq(complianceAssessments.id, input.assessmentId));
      }

      return { 
        success: true, 
        savedCount, 
        emailsSent, 
        emailErrors,
        message: `${savedCount} atribuições salvas, ${emailsSent} e-mails enviados${emailErrors > 0 ? `, ${emailErrors} erros` : ''}` 
      };
    }),

  /**
   * Reenviar convite para um respondente específico
   */
  resendInvitation: protectedProcedure
    .input(z.object({ assignmentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const isAdmin = ['admin_global', 'consultor'].includes(ctx.user.role);
      if (!isAdmin) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão' });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Banco de dados indisponível' });

      const assignment = await db.select({
        id: complianceAssignments.id,
        assessmentId: complianceAssignments.assessmentId,
        domainId: complianceAssignments.domainId,
        userId: complianceAssignments.userId,
        userName: users.name,
        userEmail: users.email,
      })
        .from(complianceAssignments)
        .leftJoin(users, eq(complianceAssignments.userId, users.id))
        .where(eq(complianceAssignments.id, input.assignmentId))
        .limit(1);

      if (!assignment.length) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Atribuição não encontrada' });
      }

      const data = assignment[0];
      if (!data.userEmail) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Usuário não possui e-mail cadastrado' });
      }

      const assessment = await db.select().from(complianceAssessments)
        .where(eq(complianceAssessments.id, data.assessmentId)).limit(1);
      
      const domain = dominiosConformidade.find(d => d.id === data.domainId);
      const assessmentUrl = `https://dll.seusdados.com/avaliacoes/${data.assessmentId}`;

      const emailResult = await sendAssessmentEmail({
        to: data.userEmail,
        recipientName: data.userName || 'Respondente',
        assessmentTitle: assessment.length ? assessment[0].title : 'Avaliação de Conformidade',
        assessmentUrl,
        organizationName: 'Seusdados',
        domainName: domain?.titulo || `Domínio ${data.domainId}`,
        assessmentType: 'conformidade',
      });

      if (!emailResult.success) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao reenviar e-mail' });
      }

      await db.update(complianceAssignments)
        .set({ resentAt: sql`NOW()`, status: 'resent' })
        .where(eq(complianceAssignments.id, input.assignmentId));

      return { success: true, message: 'E-mail reenviado com sucesso' };
    }),

  // ==================== RESPOSTAS COM CONTROLE DE ACESSO ====================

  /**
   * Salvar resposta com verificação de que o usuário está atribuído ao domínio
   */
  saveResponseWithAccess: protectedProcedure
    .input(z.object({
      assessmentId: z.number(),
      domainId: z.number(),
      questionId: z.string(),
      selectedLevel: z.number(),
      notes: z.string().optional(),
      evidenceUrls: z.array(z.string()).optional(),
      attachments: z.array(z.object({
        fileName: z.string(),
        fileUrl: z.string(),
        fileSize: z.number(),
        fileType: z.string(),
        uploadedAt: z.string(),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Banco de dados indisponível' });

      // Verificar se o usuário está atribuído a este domínio
      const isAdmin = ['admin_global', 'consultor'].includes(ctx.user.role);
      
      if (!isAdmin) {
        const assignment = await db.select().from(complianceAssignments)
          .where(
            and(
              eq(complianceAssignments.assessmentId, input.assessmentId),
              eq(complianceAssignments.domainId, input.domainId),
              eq(complianceAssignments.userId, ctx.user.id)
            )
          ).limit(1);

        if (!assignment.length) {
          throw new TRPCError({ 
            code: 'FORBIDDEN', 
            message: 'Você não está atribuído a este domínio e não pode responder estas questões.' 
          });
        }
      }

      // Buscar resposta existente
      const existing = await db.select().from(complianceResponses)
        .where(
          and(
            eq(complianceResponses.assessmentId, input.assessmentId),
            eq(complianceResponses.domainId, input.domainId),
            eq(complianceResponses.questionId, input.questionId)
          )
        ).limit(1);

      if (existing.length) {
        // Verificar se outro usuário já respondeu (evitar conflito)
        if (existing[0].respondedById && existing[0].respondedById !== ctx.user.id && !isAdmin) {
          throw new TRPCError({ 
            code: 'CONFLICT', 
            message: 'Esta questão já foi respondida por outro usuário.' 
          });
        }

        await db.update(complianceResponses)
          .set({
            selectedLevel: input.selectedLevel,
            notes: input.notes || null,
            evidenceUrls: input.evidenceUrls || [],
            attachments: input.attachments || [],
            respondedById: ctx.user.id,
          })
          .where(eq(complianceResponses.id, existing[0].id));
        return { id: existing[0].id };
      }

      // Criar nova resposta
      const result = await db.insert(complianceResponses).values({
        assessmentId: input.assessmentId,
        domainId: input.domainId,
        questionId: input.questionId,
        selectedLevel: input.selectedLevel,
        notes: input.notes || null,
        evidenceUrls: input.evidenceUrls || [],
        attachments: input.attachments || [],
        respondedById: ctx.user.id,
      }).returning({ id: complianceResponses.id });

      const id = extractInsertId(result);

      // Atualizar status da atribuição para 'responded' se todas as questões do domínio foram respondidas
      const domain = dominiosConformidade.find(d => d.id === input.domainId);
      if (domain) {
        const domainResponses = await db.select().from(complianceResponses)
          .where(
            and(
              eq(complianceResponses.assessmentId, input.assessmentId),
              eq(complianceResponses.domainId, input.domainId)
            )
          );

        if (domainResponses.length >= domain.questoes.length) {
          await db.update(complianceAssignments)
            .set({ status: 'responded', respondedAt: sql`NOW()` })
            .where(
              and(
                eq(complianceAssignments.assessmentId, input.assessmentId),
                eq(complianceAssignments.domainId, input.domainId)
              )
            );
        }
      }

      return { id };
    }),

  /**
   * Obter respostas filtradas por domínios atribuídos ao usuário
   */
  getResponsesFiltered: protectedProcedure
    .input(z.object({ assessmentId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];

      const isAdmin = ['admin_global', 'consultor'].includes(ctx.user.role);

      if (isAdmin) {
        // Admin vê todas as respostas
        return db.select().from(complianceResponses)
          .where(eq(complianceResponses.assessmentId, input.assessmentId));
      }

      // Usuário comum: apenas respostas dos domínios atribuídos
      const myAssignments = await db.select().from(complianceAssignments)
        .where(
          and(
            eq(complianceAssignments.assessmentId, input.assessmentId),
            eq(complianceAssignments.userId, ctx.user.id)
          )
        );

      if (myAssignments.length === 0) return [];

      const myDomainIds = myAssignments.map(a => a.domainId);
      
      const allResponses = await db.select().from(complianceResponses)
        .where(eq(complianceResponses.assessmentId, input.assessmentId));

      return allResponses.filter(r => myDomainIds.includes(r.domainId));
    }),

  // Legacy endpoints mantidos para compatibilidade
  getDomainAssignments: protectedProcedure
    .input(z.object({ assessmentId: z.number(), domainId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const result = await db
        .select({
          id: complianceAssignments.id,
          assessmentId: complianceAssignments.assessmentId,
          domainId: complianceAssignments.domainId,
          userId: complianceAssignments.userId,
          status: complianceAssignments.status,
          sentAt: complianceAssignments.sentAt,
          resentAt: complianceAssignments.resentAt,
          respondedAt: complianceAssignments.respondedAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(complianceAssignments)
        .leftJoin(users, eq(complianceAssignments.userId, users.id))
        .where(
          and(
            eq(complianceAssignments.assessmentId, input.assessmentId),
            eq(complianceAssignments.domainId, parseInt(input.domainId))
          )
        );

      return result;
    }),

  /**
   * Enviar convites (legacy - mantido para compatibilidade)
   */
  sendInvitations: protectedProcedure
    .input(z.object({
      assessmentId: z.number(),
      assignments: z.array(z.object({
        domainId: z.string(),
        userIds: z.array(z.number()),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      // Converter para o novo formato e redirecionar
      const newAssignments = input.assignments.map(a => ({
        domainId: parseInt(a.domainId),
        userId: a.userIds[0] || null, // Pegar apenas o primeiro (novo modelo: 1 por domínio)
      }));

      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Banco de dados indisponível' });

      const assessment = await db.select().from(complianceAssessments)
        .where(eq(complianceAssessments.id, input.assessmentId)).limit(1);
      if (!assessment.length) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Avaliação não encontrada' });
      }

      let sentCount = 0;
      let errorCount = 0;

      for (const assignment of newAssignments) {
        if (!assignment.userId) continue;

        try {
          // Upsert atribuição
          const existing = await db.select().from(complianceAssignments)
            .where(
              and(
                eq(complianceAssignments.assessmentId, input.assessmentId),
                eq(complianceAssignments.domainId, assignment.domainId)
              )
            ).limit(1);

          if (existing.length) {
            await db.update(complianceAssignments)
              .set({ userId: assignment.userId, status: 'sent', sentAt: sql`NOW()` })
              .where(eq(complianceAssignments.id, existing[0].id));
          } else {
            await db.insert(complianceAssignments).values({
              assessmentId: input.assessmentId,
              domainId: assignment.domainId,
              userId: assignment.userId,
              status: 'sent',
            });
          }

          // Enviar e-mail
          const userData = await db.select().from(users).where(eq(users.id, assignment.userId)).limit(1);
          if (userData.length && userData[0].email) {
            const domain = dominiosConformidade.find(d => d.id === assignment.domainId);
            const assessmentUrl = `https://dll.seusdados.com/avaliacoes/${input.assessmentId}`;

            await sendAssessmentEmail({
              to: userData[0].email,
              recipientName: userData[0].name || 'Respondente',
              assessmentTitle: assessment[0].title,
              assessmentUrl,
              organizationName: 'Seusdados',
              domainName: domain?.titulo || `Domínio ${assignment.domainId}`,
              assessmentType: 'conformidade',
            });
            sentCount++;
          }
        } catch (error) {
          errorCount++;
          logger.error('Erro ao processar atribuição legacy', { error });
        }
      }

      return { success: true, sentCount, errorCount, message: `${sentCount} e-mails enviados, ${errorCount} erros` };
    }),
};
