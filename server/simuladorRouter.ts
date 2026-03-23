// Router tRPC para o módulo Simulador CPPD
import { router, publicProcedure, protectedProcedure, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as simuladorService from "./simuladorService";

export const simuladorRouter = router({
  // ==================== SIMULAÇÕES ====================
  
  // Listar simulações
  list: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      status: z.enum(["planejada", "em_andamento", "pausada", "concluida", "cancelada"]).optional(),
      quarter: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      // Verificar acesso à organização
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      return simuladorService.listSimulations(input.organizationId, input.status, input.quarter);
    }),

  // Obter simulação por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const simulation = await simuladorService.getSimulationById(input.id);
      
      // Verificar acesso à organização
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== simulation.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      
      return simulation;
    }),

  // Criar nova simulação
  create: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      scenarioId: z.number(),
      scenarioName: z.string(),
      quarter: z.string().optional(),
      participants: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verificar acesso à organização
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      
      const id = await simuladorService.createSimulation({
        ...input,
        createdById: ctx.user.id,
      });
      
      return { id };
    }),

  // Iniciar simulação
  start: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const simulation = await simuladorService.getSimulationById(input.id);
      
      // Verificar acesso
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== simulation.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      
      await simuladorService.startSimulation(input.id);
      return { success: true };
    }),

  // Pausar simulação
  pause: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const simulation = await simuladorService.getSimulationById(input.id);
      
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== simulation.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      
      await simuladorService.pauseSimulation(input.id);
      return { success: true };
    }),

  // Concluir simulação
  complete: protectedProcedure
    .input(z.object({
      id: z.number(),
      phaseTimings: z.object({
        detection: z.number().optional(),
        triage: z.number().optional(),
        containment: z.number().optional(),
        recovery: z.number().optional(),
      }),
      kpiValues: z.record(z.string(), z.number()),
      playbookAdherence: z.number().min(0).max(100).optional(),
      recordsCompleteness: z.number().min(0).max(100).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const simulation = await simuladorService.getSimulationById(input.id);
      
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== simulation.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      
      await simuladorService.completeSimulation(input.id, {
        phaseTimings: input.phaseTimings,
        kpiValues: input.kpiValues,
        playbookAdherence: input.playbookAdherence,
        recordsCompleteness: input.recordsCompleteness,
        notes: input.notes,
      });
      
      return { success: true };
    }),

  // Atualizar simulação
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      participants: z.array(z.string()).optional(),
      notes: z.string().optional(),
      phaseTimings: z.object({
        detection: z.number().optional(),
        triage: z.number().optional(),
        containment: z.number().optional(),
        recovery: z.number().optional(),
      }).optional(),
      kpiValues: z.record(z.string(), z.number()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const simulation = await simuladorService.getSimulationById(input.id);
      
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== simulation.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      
      await simuladorService.updateSimulation(input.id, {
        participants: input.participants,
        notes: input.notes,
        phaseTimings: input.phaseTimings,
        kpiValues: input.kpiValues,
      });
      
      return { success: true };
    }),

  // Excluir simulação (admin apenas)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await simuladorService.deleteSimulation(input.id);
      return { success: true };
    }),

  // ==================== DECISÕES ====================
  
  // Registrar decisão
  recordDecision: protectedProcedure
    .input(z.object({
      simulationId: z.number(),
      phase: z.string(),
      description: z.string(),
      decisionMaker: z.string(),
      decisionType: z.enum(["operational", "strategic", "communication"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const simulation = await simuladorService.getSimulationById(input.simulationId);
      
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== simulation.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      
      const id = await simuladorService.recordDecision({
        ...input,
        organizationId: simulation.organizationId,
      });
      
      return { id };
    }),

  // Listar decisões de uma simulação
  listDecisions: protectedProcedure
    .input(z.object({ simulationId: z.number() }))
    .query(async ({ input, ctx }) => {
      const simulation = await simuladorService.getSimulationById(input.simulationId);
      
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== simulation.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      
      return simuladorService.listDecisions(input.simulationId);
    }),

  // ==================== EVENTOS ====================
  
  // Registrar evento
  recordEvent: protectedProcedure
    .input(z.object({
      simulationId: z.number(),
      phase: z.string(),
      eventType: z.string(),
      title: z.string(),
      description: z.string(),
      severity: z.enum(["baixa", "media", "alta", "critica"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const simulation = await simuladorService.getSimulationById(input.simulationId);
      
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== simulation.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      
      const id = await simuladorService.recordEvent({
        ...input,
        organizationId: simulation.organizationId,
      });
      
      return { id };
    }),

  // Marcar evento como lido
  markEventAsRead: protectedProcedure
    .input(z.object({ eventId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await simuladorService.markEventAsRead(input.eventId);
      return { success: true };
    }),

  // Listar eventos de uma simulação
  listEvents: protectedProcedure
    .input(z.object({ simulationId: z.number() }))
    .query(async ({ input, ctx }) => {
      const simulation = await simuladorService.getSimulationById(input.simulationId);
      
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== simulation.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      
      return simuladorService.listEvents(input.simulationId);
    }),

  // ==================== FEEDBACK ====================
  
  // Submeter feedback
  submitFeedback: protectedProcedure
    .input(z.object({
      simulationId: z.number(),
      participantRole: z.string(),
      clarityScore: z.number().min(1).max(5),
      communicationScore: z.number().min(1).max(5),
      toolsScore: z.number().min(1).max(5),
      strengths: z.string().optional(),
      weaknesses: z.string().optional(),
      suggestions: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const simulation = await simuladorService.getSimulationById(input.simulationId);
      
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== simulation.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      
      const id = await simuladorService.submitFeedback({
        ...input,
        participantId: ctx.user.id,
        organizationId: simulation.organizationId,
      });
      
      return { id };
    }),

  // Listar feedback de uma simulação
  listFeedback: protectedProcedure
    .input(z.object({ simulationId: z.number() }))
    .query(async ({ input, ctx }) => {
      const simulation = await simuladorService.getSimulationById(input.simulationId);
      
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== simulation.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      
      return simuladorService.listFeedback(input.simulationId);
    }),

  // ==================== MÉTRICAS ====================
  
  // Obter métricas gerais
  getMetrics: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      
      return simuladorService.getMetrics(
        input.organizationId,
        input.startDate,
        input.endDate
      );
    }),

  // Obter tendências
  getTrends: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      quarters: z.array(z.string()),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      
      return simuladorService.getTrends(input.organizationId, input.quarters);
    }),
});
