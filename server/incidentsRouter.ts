import { logger } from "./_core/logger";
/**
 * Seusdados Due Diligence - Incidents Router
 * tRPC router for incident management
 */

import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import * as incidentService from "./incidentService";
import * as incidentIntegration from "./incidentIntegrationService";
import { TRPCError } from '@trpc/server';

export const incidentsRouter = router({
  // List incidents
  list: protectedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      status: z.string().optional(),
      page: z.number().optional(),
      pageSize: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const user = ctx.user;
      
      // Admin global can see all organizations
      let orgId = input.organizationId;
      if (!orgId && user.role !== 'admin_global' && user.role !== 'consultor') {
        orgId = user.organizationId || undefined;
      }
      
      if (!orgId) {
        // For admin_global without specific org, return empty list
        return { incidents: [], total: 0, page: 1, pageSize: 10 };
      }

      return incidentService.listIncidents(orgId, {
        status: input.status,
        page: input.page,
        pageSize: input.pageSize,
      });
    }),

  // Get incident by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const incident = await incidentService.getIncidentById(input.id);
      
      if (!incident) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Incidente não encontrado' });
      }

      // Check permission
      const user = ctx.user;
      if (user.role !== 'admin_global' && user.role !== 'consultor') {
        if (incident.organizationId !== user.organizationId) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Sem permissão para acessar este incidente' });
        }
      }

      return incident;
    }),

  // Create incident
  create: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      title: z.string().min(1),
      description: z.string().optional(),
      detectedAt: z.string().transform(s => new Date(s)),
      knowledgeAt: z.string().transform(s => new Date(s)),
      riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      
      // Check permission
      if (user.role !== 'admin_global' && user.role !== 'consultor') {
        if (input.organizationId !== user.organizationId) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Sem permissão para criar incidente nesta organização' });
        }
      }

      return incidentService.createIncident({
        organizationId: input.organizationId,
        title: input.title,
        description: input.description,
        detectedAt: input.detectedAt,
        knowledgeAt: input.knowledgeAt,
        riskLevel: input.riskLevel,
        createdById: user.id,
      });
    }),

  // Update incident
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(['standby', 'active', 'contained', 'remediated', 'closed']).optional(),
      riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      currentPhaseId: z.number().optional(),
      phases: z.any().optional(),
      triageAnswers: z.any().optional(),
      triageResult: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const incident = await incidentService.getIncidentById(input.id);
      
      if (!incident) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Incidente não encontrado' });
      }

      // Check permission
      const user = ctx.user;
      if (user.role !== 'admin_global' && user.role !== 'consultor') {
        if (incident.organizationId !== user.organizationId) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Sem permissão para atualizar este incidente' });
        }
      }

      const closedAt = input.status === 'closed' ? new Date() : undefined;

      // Sincronizar mudança de status com ticket vinculado
      if (input.status && input.status !== incident.status) {
        try {
          await incidentIntegration.syncStatusChangeToTicket(
            input.id,
            input.status,
            user.id,
            user.name
          );
        } catch (error) {
          logger.error('[Incidents] Erro ao sincronizar status com ticket:', error);
        }
      }

      // Sincronizar mudança de fase com ticket vinculado
      if (input.currentPhaseId && input.currentPhaseId !== incident.currentPhaseId) {
        const phases = input.phases || incident.phases;
        const phase = phases?.find((p: any) => p.id === input.currentPhaseId);
        if (phase) {
          try {
            await incidentIntegration.syncPhaseChangeToTicket(
              input.id,
              input.currentPhaseId,
              phase.name,
              user.id,
              user.name
            );
          } catch (error) {
            logger.error('[Incidents] Erro ao sincronizar fase com ticket:', error);
          }
        }
      }

      return incidentService.updateIncident(input.id, {
        title: input.title,
        description: input.description,
        status: input.status,
        riskLevel: input.riskLevel,
        currentPhaseId: input.currentPhaseId,
        phases: input.phases,
        triageAnswers: input.triageAnswers,
        triageResult: input.triageResult,
        closedAt,
      });
    }),

  // Toggle checklist item
  toggleChecklistItem: protectedProcedure
    .input(z.object({
      incidentId: z.number(),
      phaseId: z.number(),
      itemId: z.string(),
      isChecked: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const incident = await incidentService.getIncidentById(input.incidentId);
      
      if (!incident) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Incidente não encontrado' });
      }

      // Check permission
      const user = ctx.user;
      if (user.role !== 'admin_global' && user.role !== 'consultor') {
        if (incident.organizationId !== user.organizationId) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Sem permissão para atualizar este incidente' });
        }
      }

      // Buscar título do item para sincronização
      const phases = incident.phases || [];
      const phase = phases.find((p: any) => p.id === input.phaseId);
      const item = phase?.items?.find((i: any) => i.id === input.itemId);
      const itemTitle = item?.title || input.itemId;

      // Sincronizar com ticket vinculado
      try {
        await incidentIntegration.syncChecklistItemToTicket(
          input.incidentId,
          input.phaseId,
          input.itemId,
          itemTitle,
          input.isChecked,
          user.id,
          user.name
        );
      } catch (error) {
        logger.error('[Incidents] Erro ao sincronizar checklist com ticket:', error);
      }

      return incidentService.toggleChecklistItem(
        input.incidentId,
        input.phaseId,
        input.itemId,
        user.id,
        user.name,
        input.isChecked
      );
    }),

  // Add log entry
  addLog: protectedProcedure
    .input(z.object({
      incidentId: z.number(),
      message: z.string().min(1),
      type: z.enum(['action', 'system', 'alert', 'communication']).optional(),
      phaseId: z.number().optional(),
      metadata: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const incident = await incidentService.getIncidentById(input.incidentId);
      
      if (!incident) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Incidente não encontrado' });
      }

      // Check permission
      const user = ctx.user;
      if (user.role !== 'admin_global' && user.role !== 'consultor') {
        if (incident.organizationId !== user.organizationId) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Sem permissão para adicionar log a este incidente' });
        }
      }

      // Sincronizar log com ticket vinculado (apenas para logs de ação e comunicação)
      if (input.type === 'action' || input.type === 'communication') {
        try {
          await incidentIntegration.syncLogEntryToTicket(
            input.incidentId,
            input.message,
            input.type || 'action',
            user.id,
            user.name
          );
        } catch (error) {
          logger.error('[Incidents] Erro ao sincronizar log com ticket:', error);
        }
      }

      return incidentService.addLogEntry({
        incidentId: input.incidentId,
        message: input.message,
        type: input.type,
        userId: user.id,
        userName: user.name,
        phaseId: input.phaseId,
        metadata: input.metadata,
      });
    }),

  // Get statistics
  getStats: protectedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const user = ctx.user;
      
      let orgId = input.organizationId;
      if (!orgId && user.role !== 'admin_global' && user.role !== 'consultor') {
        orgId = user.organizationId || undefined;
      }
      
      if (!orgId) {
        return {
          totalActive: 0,
          totalClosed: 0,
          averageResolutionTime: 0,
          complianceRate: 100,
          byRiskLevel: { low: 0, medium: 0, high: 0, critical: 0 },
          byPhase: {}
        };
      }

      return incidentService.getIncidentStats(orgId);
    }),

  // Emergency contacts
  getEmergencyContacts: protectedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const user = ctx.user;
      
      let orgId = input.organizationId;
      if (!orgId && user.role !== 'admin_global' && user.role !== 'consultor') {
        orgId = user.organizationId || undefined;
      }
      
      if (!orgId) {
        return [];
      }

      return incidentService.getEmergencyContacts(orgId);
    }),

  // Upsert emergency contact
  upsertEmergencyContact: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      organizationId: z.number(),
      role: z.string().min(1),
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().min(1),
      priority: z.number().optional(),
      isAvailable: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      
      // Check permission
      if (user.role !== 'admin_global' && user.role !== 'consultor') {
        if (input.organizationId !== user.organizationId) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Sem permissão para gerenciar contatos desta organização' });
        }
      }

      return incidentService.upsertEmergencyContact(input);
    }),

  // ==================== ENDPOINTS DE INTEGRAÇÃO ====================

  // Buscar incidente vinculado a um ticket
  getByTicketId: protectedProcedure
    .input(z.object({ ticketId: z.number() }))
    .query(async ({ ctx, input }) => {
      const incident = await incidentIntegration.getLinkedIncident(input.ticketId);
      
      if (!incident) {
        return null;
      }

      // Check permission
      const user = ctx.user;
      if (user.role !== 'admin_global' && user.role !== 'consultor') {
        if (incident.organizationId !== user.organizationId) {
          return null;
        }
      }

      return incident;
    }),

  // Criar incidente a partir de um ticket existente
  createFromTicket: protectedProcedure
    .input(z.object({ ticketId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      
      // Apenas admin_global e consultor podem criar incidentes manualmente
      if (user.role !== 'admin_global' && user.role !== 'consultor') {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Sem permissão para criar incidente' });
      }

      const incidentId = await incidentIntegration.linkTicketToNewIncident(input.ticketId, user.id);
      
      if (!incidentId) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao criar incidente' });
      }

      return incidentService.getIncidentById(incidentId);
    }),

  // Buscar ticket vinculado a um incidente
  getLinkedTicket: protectedProcedure
    .input(z.object({ incidentId: z.number() }))
    .query(async ({ ctx, input }) => {
      return incidentIntegration.getLinkedTicket(input.incidentId);
    }),
});
