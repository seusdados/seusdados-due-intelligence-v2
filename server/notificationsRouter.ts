import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getOrganizationSettings,
  saveOrganizationSettings,
} from "./notificationService";
import * as db from "./db";
import { TRPCError } from '@trpc/server';

export const notificationsRouter = router({
  // Listar notificações do usuário
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        unreadOnly: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const notifications = await getUserNotifications(ctx.user.id, input);
      const unreadCount = await getUnreadCount(ctx.user.id);
      return { notifications, unreadCount };
    }),

  // Contar notificações não lidas
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return await getUnreadCount(ctx.user.id);
  }),

  // Marcar como lida
  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await markAsRead(input.notificationId, ctx.user.id);
      return { success: true };
    }),

  // Marcar todas como lidas
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    await markAllAsRead(ctx.user.id);
    return { success: true };
  }),

  // Deletar notificação
  delete: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteNotification(input.notificationId, ctx.user.id);
      return { success: true };
    }),

  // ==================== CONFIGURAÇÕES DO MEUDPO ====================

  // Buscar configurações
  getSettings: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input }) => {
      return await getOrganizationSettings(input.organizationId);
    }),

  // Salvar configurações
  saveSettings: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        slaCritica: z.number().min(1).max(168).optional(),
        slaAlta: z.number().min(1).max(168).optional(),
        slaMedia: z.number().min(1).max(336).optional(),
        slaBaixa: z.number().min(1).max(720).optional(),
        notifyOnCreate: z.boolean().optional(),
        notifyOnUpdate: z.boolean().optional(),
        notifyOnComment: z.boolean().optional(),
        notifyOnResolve: z.boolean().optional(),
        notifySlaWarning: z.boolean().optional(),
        slaWarningThreshold: z.number().min(50).max(100).optional(),
        autoReportEnabled: z.boolean().optional(),
        autoReportFrequency: z.enum(["diario", "semanal", "quinzenal", "mensal"]).optional(),
        reportRecipients: z.array(z.string().email()).optional(),
        customCategories: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verificar se o usuário tem permissão (admin ou consultor)
      if (ctx.user.role !== "admin_global" && ctx.user.role !== "consultor") {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Sem permissão para alterar configurações' });
      }

      const { organizationId, ...settings } = input;
      await saveOrganizationSettings(organizationId, settings);
      return { success: true };
    }),

  // ==================== HISTÓRICO DE NOTIFICAÇÕES ====================

  // Listar histórico de notificações
  historyList: protectedProcedure
    .input(
      z.object({
        organizationId: z.number().optional(),
        type: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      // Se for cliente, filtrar pela organização do usuário
      const orgId = ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' 
        ? ctx.user.organizationId 
        : input.organizationId;
      
      const history = await db.getNotificationHistory({
        organizationId: orgId || undefined,
        userId: ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' ? ctx.user.id : undefined,
        type: input.type,
        status: input.status,
        limit: input.limit,
        offset: input.offset,
      });
      
      return history;
    }),

  // Obter estatísticas do histórico
  historyStats: protectedProcedure
    .input(
      z.object({
        organizationId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' 
        ? ctx.user.organizationId 
        : input.organizationId;
      
      return await db.getNotificationHistoryStats(orgId || undefined);
    }),

  // Obter detalhes de uma notificação do histórico
  historyDetail: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getNotificationHistoryById(input.id);
    }),

  // Marcar notificações do histórico como lidas
  historyMarkAsRead: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      await db.markNotificationsAsRead(input.ids);
      return { success: true };
    }),

  // ==================== NOTIFICAÇÕES DE AVALIAÇÕES ====================

  // Criar notificação de avaliação
  createAssessmentNotification: protectedProcedure
    .input(
      z.object({
        assessmentId: z.number(),
        assessmentCode: z.string(),
        organizationId: z.number(),
        organizationName: z.string(),
        type: z.enum(['created', 'reminder', 'completed', 'released', 'evidence_pending']),
        recipientIds: z.array(z.number()).optional(),
        daysRemaining: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { createInAppNotification, calculateUrgency, generateAssessmentLink } = await import('./services/assessmentNotificationIntegration');
      
      const link = generateAssessmentLink(input.assessmentId);
      const urgency = input.daysRemaining ? calculateUrgency(input.daysRemaining) : 'medium';
      
      const urgencyEmoji: Record<string, string> = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢',
      };
      
      const typeMessages: Record<string, { title: string; message: string }> = {
        created: {
          title: '📋 Nova Avaliação Atribuída',
          message: `Você foi designado para responder a avaliação ${input.assessmentCode} da organização ${input.organizationName}.`,
        },
        reminder: {
          title: `${urgencyEmoji[urgency]} Prazo de Avaliação - ${input.daysRemaining} dia(s)`,
          message: `A avaliação ${input.assessmentCode} vence em ${input.daysRemaining} dia(s). Complete o questionário para evitar atrasos.`,
        },
        completed: {
          title: '✅ Avaliação Concluída',
          message: `A avaliação ${input.assessmentCode} foi concluída com sucesso.`,
        },
        released: {
          title: '📊 Resultados Liberados',
          message: `Os resultados da avaliação ${input.assessmentCode} foram liberados. Clique para visualizar.`,
        },
        evidence_pending: {
          title: '📎 Evidência Pendente',
          message: `A avaliação ${input.assessmentCode} possui evidências pendentes que precisam ser anexadas.`,
        },
      };
      
      const { title, message } = typeMessages[input.type];
      const recipientIds = input.recipientIds || [ctx.user.id];
      
      const results = [];
      for (const userId of recipientIds) {
        const result = await createInAppNotification(userId, {
          type: `assessment_${input.type}` as any,
          urgency,
          title,
          message,
          link,
          metadata: {
            assessmentId: input.assessmentId,
            assessmentCode: input.assessmentCode,
            organizationId: input.organizationId,
          },
        });
        results.push(result);
      }
      
      return { success: true, notified: results.filter(r => r.success).length };
    }),

  // Processar lembretes de prazo em lote (para cron job)
  processDeadlineReminders: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Verificar se é admin ou consultor
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para executar esta operação' });
      }
      
      const { processDeadlineReminders } = await import('./services/assessmentNotificationIntegration');
      return await processDeadlineReminders();
    }),
});
