/**
 * Router de Alertas Automáticos
 * Endpoints para gerenciar alertas de riscos e prazos
 */

import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import * as alertsService from "./alertsService";

export const alertsRouter = router({
  // Listar alertas de uma organização
  list: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      includeRead: z.boolean().optional(),
      includeDismissed: z.boolean().optional(),
      limit: z.number().optional()
    }))
    .query(async ({ input }) => {
      return alertsService.getAlertsByOrganization(input.organizationId, {
        includeRead: input.includeRead,
        includeDismissed: input.includeDismissed,
        limit: input.limit
      });
    }),

  // Contar alertas não lidos
  countUnread: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input }) => {
      return alertsService.countUnreadAlerts(input.organizationId);
    }),

  // Marcar alerta como lido
  markAsRead: protectedProcedure
    .input(z.object({ alertId: z.number() }))
    .mutation(async ({ input }) => {
      await alertsService.markAlertAsRead(input.alertId);
      return { success: true };
    }),

  // Dispensar alerta
  dismiss: protectedProcedure
    .input(z.object({ alertId: z.number() }))
    .mutation(async ({ input }) => {
      await alertsService.dismissAlert(input.alertId);
      return { success: true };
    }),

  // Marcar todos como lidos
  markAllAsRead: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .mutation(async ({ input }) => {
      await alertsService.markAllAlertsAsRead(input.organizationId);
      return { success: true };
    }),

  // Escanear organização e gerar alertas
  scan: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .mutation(async ({ input }) => {
      const count = await alertsService.scanOrganizationForAlerts(input.organizationId);
      return { alertsGenerated: count };
    }),

  // Criar alerta manual
  create: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      contractAnalysisId: z.number().optional(),
      alertType: z.enum(['critical_risk', 'high_risk', 'deadline_approaching', 'dpa_pending', 'compliance_low', 'amendment_required']),
      severity: z.enum(['critical', 'high', 'medium', 'low']),
      title: z.string(),
      description: z.string().optional(),
      contractName: z.string().optional(),
      dueDate: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const alertId = await alertsService.createAlert({
        ...input,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined
      });
      return { alertId };
    })
});
