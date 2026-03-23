import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { clauseComments, clauseAnnotations, commentNotifications, users } from "../drizzle/schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";

// ==================== CLAUSE COMMENTS ROUTER ====================
export const clauseCommentsRouter = router({
  // Listar comentários de uma cláusula
  listByClause: protectedProcedure
    .input(z.object({
      analysisId: z.number(),
      clauseId: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const comments = await db
        .select({
          id: clauseComments.id,
          analysisId: clauseComments.analysisId,
          clauseId: clauseComments.clauseId,
          authorId: clauseComments.authorId,
          authorRole: clauseComments.authorRole,
          content: clauseComments.content,
          parentCommentId: clauseComments.parentCommentId,
          mentions: clauseComments.mentions,
          isResolved: clauseComments.isResolved,
          resolvedById: clauseComments.resolvedById,
          resolvedAt: clauseComments.resolvedAt,
          isEdited: clauseComments.isEdited,
          editedAt: clauseComments.editedAt,
          createdAt: clauseComments.createdAt,
          updatedAt: clauseComments.updatedAt,
          authorName: users.name,
          authorEmail: users.email,
        })
        .from(clauseComments)
        .leftJoin(users, eq(clauseComments.authorId, users.id))
        .where(
          and(
            eq(clauseComments.analysisId, input.analysisId),
            eq(clauseComments.clauseId, input.clauseId),
            eq(clauseComments.isDeleted, 0)
          )
        )
        .orderBy(desc(clauseComments.createdAt));

      // Organizar em threads (comentários principais e respostas)
      const mainComments = comments.filter(c => !c.parentCommentId);
      const replies = comments.filter(c => c.parentCommentId);

      return mainComments.map(comment => ({
        ...comment,
        replies: replies.filter(r => r.parentCommentId === comment.id),
      }));
    }),

  // Listar todos os comentários de uma análise
  listByAnalysis: protectedProcedure
    .input(z.object({
      analysisId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const comments = await db
        .select({
          id: clauseComments.id,
          analysisId: clauseComments.analysisId,
          clauseId: clauseComments.clauseId,
          authorId: clauseComments.authorId,
          authorRole: clauseComments.authorRole,
          content: clauseComments.content,
          parentCommentId: clauseComments.parentCommentId,
          isResolved: clauseComments.isResolved,
          createdAt: clauseComments.createdAt,
          authorName: users.name,
        })
        .from(clauseComments)
        .leftJoin(users, eq(clauseComments.authorId, users.id))
        .where(
          and(
            eq(clauseComments.analysisId, input.analysisId),
            eq(clauseComments.isDeleted, 0)
          )
        )
        .orderBy(desc(clauseComments.createdAt));

      // Agrupar por cláusula
      const byClause: Record<string, typeof comments> = {};
      comments.forEach(comment => {
        if (!byClause[comment.clauseId]) {
          byClause[comment.clauseId] = [];
        }
        byClause[comment.clauseId].push(comment);
      });

      return byClause;
    }),

  // Criar comentário
  create: protectedProcedure
    .input(z.object({
      analysisId: z.number(),
      clauseId: z.string(),
      content: z.string().min(1),
      parentCommentId: z.number().optional(),
      mentions: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [result] = await db.insert(clauseComments).values({
        analysisId: input.analysisId,
        clauseId: input.clauseId,
        authorId: ctx.user.id,
        authorRole: ctx.user.role as any,
        content: input.content,
        parentCommentId: input.parentCommentId || null,
        mentions: input.mentions ? JSON.stringify(input.mentions) : null,
      }).returning({ id: clauseComments.id });

      const commentId = result.id;

      // Criar notificações para menções
      if (input.mentions && input.mentions.length > 0) {
        for (const userId of input.mentions) {
          await db.insert(commentNotifications).values({
            userId,
            notificationType: 'mention',
            commentId,
            analysisId: input.analysisId,
            clauseId: input.clauseId,
            triggeredById: ctx.user.id,
          });
        }
      }

      // Se for resposta, notificar autor do comentário original
      if (input.parentCommentId) {
        const [parentComment] = await db
          .select({ authorId: clauseComments.authorId })
          .from(clauseComments)
          .where(eq(clauseComments.id, input.parentCommentId));

        if (parentComment && parentComment.authorId !== ctx.user.id) {
          await db.insert(commentNotifications).values({
            userId: parentComment.authorId,
            notificationType: 'reply',
            commentId,
            analysisId: input.analysisId,
            clauseId: input.clauseId,
            triggeredById: ctx.user.id,
          });
        }
      }

      return { id: commentId };
    }),

  // Editar comentário
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      content: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      // Verificar se o usuário é o autor
      const [comment] = await db
        .select({ authorId: clauseComments.authorId })
        .from(clauseComments)
        .where(eq(clauseComments.id, input.id));

      if (!comment || comment.authorId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Você não tem permissão para editar este comentário',
        });
      }

      await db
        .update(clauseComments)
        .set({
          content: input.content,
          isEdited: 1,
          editedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(clauseComments.id, input.id));

      return { success: true };
    }),

  // Excluir comentário (soft delete)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      // Verificar se o usuário é o autor ou admin
      const [comment] = await db
        .select({ authorId: clauseComments.authorId })
        .from(clauseComments)
        .where(eq(clauseComments.id, input.id));

      if (!comment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Comentário não encontrado',
        });
      }

      if (comment.authorId !== ctx.user.id && ctx.user.role !== 'admin_global') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Você não tem permissão para excluir este comentário',
        });
      }

      await db
        .update(clauseComments)
        .set({
          isDeleted: 1,
          deletedAt: sql`CURRENT_TIMESTAMP`,
          deletedById: ctx.user.id,
        })
        .where(eq(clauseComments.id, input.id));

      return { success: true };
    }),

  // Resolver comentário
  resolve: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [comment] = await db
        .select({ 
          authorId: clauseComments.authorId,
          analysisId: clauseComments.analysisId,
          clauseId: clauseComments.clauseId,
        })
        .from(clauseComments)
        .where(eq(clauseComments.id, input.id));

      if (!comment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Comentário não encontrado',
        });
      }

      await db
        .update(clauseComments)
        .set({
          isResolved: 1,
          resolvedById: ctx.user.id,
          resolvedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(clauseComments.id, input.id));

      // Notificar autor que o comentário foi resolvido
      if (comment.authorId !== ctx.user.id) {
        await db.insert(commentNotifications).values({
          userId: comment.authorId,
          notificationType: 'resolved',
          commentId: input.id,
          analysisId: comment.analysisId,
          clauseId: comment.clauseId,
          triggeredById: ctx.user.id,
        });
      }

      return { success: true };
    }),

  // Reabrir comentário resolvido
  unresolve: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db
        .update(clauseComments)
        .set({
          isResolved: 0,
          resolvedById: null,
          resolvedAt: null,
        })
        .where(eq(clauseComments.id, input.id));

      return { success: true };
    }),

  // Contar comentários pendentes por análise
  countPending: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [result] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(clauseComments)
        .where(
          and(
            eq(clauseComments.analysisId, input.analysisId),
            eq(clauseComments.isDeleted, 0),
            eq(clauseComments.isResolved, 0),
            isNull(clauseComments.parentCommentId)
          )
        );

      return result?.count || 0;
    }),
});

// ==================== CLAUSE ANNOTATIONS ROUTER ====================
export const clauseAnnotationsRouter = router({
  // Listar anotações de uma cláusula
  listByClause: protectedProcedure
    .input(z.object({
      analysisId: z.number(),
      clauseId: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const annotations = await db
        .select({
          id: clauseAnnotations.id,
          analysisId: clauseAnnotations.analysisId,
          clauseId: clauseAnnotations.clauseId,
          authorId: clauseAnnotations.authorId,
          authorRole: clauseAnnotations.authorRole,
          selectedText: clauseAnnotations.selectedText,
          startOffset: clauseAnnotations.startOffset,
          endOffset: clauseAnnotations.endOffset,
          content: clauseAnnotations.content,
          highlightColor: clauseAnnotations.highlightColor,
          annotationType: clauseAnnotations.annotationType,
          isResolved: clauseAnnotations.isResolved,
          createdAt: clauseAnnotations.createdAt,
          authorName: users.name,
        })
        .from(clauseAnnotations)
        .leftJoin(users, eq(clauseAnnotations.authorId, users.id))
        .where(
          and(
            eq(clauseAnnotations.analysisId, input.analysisId),
            eq(clauseAnnotations.clauseId, input.clauseId),
            eq(clauseAnnotations.isDeleted, 0)
          )
        )
        .orderBy(clauseAnnotations.startOffset);

      return annotations;
    }),

  // Criar anotação
  create: protectedProcedure
    .input(z.object({
      analysisId: z.number(),
      clauseId: z.string(),
      selectedText: z.string().min(1),
      startOffset: z.number(),
      endOffset: z.number(),
      content: z.string().min(1),
      highlightColor: z.enum(['yellow', 'green', 'blue', 'red', 'purple', 'orange']).optional(),
      annotationType: z.enum(['note', 'question', 'suggestion', 'issue', 'approval']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [result] = await db.insert(clauseAnnotations).values({
        analysisId: input.analysisId,
        clauseId: input.clauseId,
        authorId: ctx.user.id,
        authorRole: ctx.user.role as any,
        selectedText: input.selectedText,
        startOffset: input.startOffset,
        endOffset: input.endOffset,
        content: input.content,
        highlightColor: input.highlightColor || 'yellow',
        annotationType: input.annotationType || 'note',
      }).returning({ id: clauseAnnotations.id });

      return { id: result.id };
    }),

  // Atualizar anotação
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      content: z.string().min(1),
      highlightColor: z.enum(['yellow', 'green', 'blue', 'red', 'purple', 'orange']).optional(),
      annotationType: z.enum(['note', 'question', 'suggestion', 'issue', 'approval']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [annotation] = await db
        .select({ authorId: clauseAnnotations.authorId })
        .from(clauseAnnotations)
        .where(eq(clauseAnnotations.id, input.id));

      if (!annotation || annotation.authorId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Você não tem permissão para editar esta anotação',
        });
      }

      await db
        .update(clauseAnnotations)
        .set({
          content: input.content,
          highlightColor: input.highlightColor,
          annotationType: input.annotationType,
        })
        .where(eq(clauseAnnotations.id, input.id));

      return { success: true };
    }),

  // Excluir anotação
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [annotation] = await db
        .select({ authorId: clauseAnnotations.authorId })
        .from(clauseAnnotations)
        .where(eq(clauseAnnotations.id, input.id));

      if (!annotation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Anotação não encontrada',
        });
      }

      if (annotation.authorId !== ctx.user.id && ctx.user.role !== 'admin_global') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Você não tem permissão para excluir esta anotação',
        });
      }

      await db
        .update(clauseAnnotations)
        .set({
          isDeleted: 1,
          deletedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(clauseAnnotations.id, input.id));

      return { success: true };
    }),

  // Resolver anotação
  resolve: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      await db
        .update(clauseAnnotations)
        .set({
          isResolved: 1,
          resolvedById: ctx.user.id,
          resolvedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(clauseAnnotations.id, input.id));

      return { success: true };
    }),
});

// ==================== COMMENT NOTIFICATIONS ROUTER ====================
export const commentNotificationsRouter = router({
  // Listar notificações do usuário
  list: protectedProcedure
    .input(z.object({
      unreadOnly: z.boolean().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const conditions = [eq(commentNotifications.userId, ctx.user.id)];
      
      if (input.unreadOnly) {
        conditions.push(eq(commentNotifications.isRead, 0));
      }

      const notifications = await db
        .select()
        .from(commentNotifications)
        .where(and(...conditions))
        .orderBy(desc(commentNotifications.createdAt))
        .limit(50);

      return notifications;
    }),

  // Marcar como lida
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      await db
        .update(commentNotifications)
        .set({
          isRead: 1,
          readAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(
          and(
            eq(commentNotifications.id, input.id),
            eq(commentNotifications.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),

  // Marcar todas como lidas
  markAllAsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      await db
        .update(commentNotifications)
        .set({
          isRead: 1,
          readAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(
          and(
            eq(commentNotifications.userId, ctx.user.id),
            eq(commentNotifications.isRead, 0)
          )
        );

      return { success: true };
    }),

  // Contar não lidas
  countUnread: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      const [result] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(commentNotifications)
        .where(
          and(
            eq(commentNotifications.userId, ctx.user.id),
            eq(commentNotifications.isRead, 0)
          )
        );

      return result?.count || 0;
    }),
});
