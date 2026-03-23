/**
 * Router tRPC para o Motor de Maturidade por Evidências
 */

import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import {
  calculateAllIndicators,
  createMaturityEvent,
  updateMaturityEvent,
  listEvents,
  recordMaturityDecision,
  getMaturityDecisionHistory,
  getCurrentMaturityStage,
  checkBlockingIncidents,
  type MaturityModule,
  type EventType,
  type EventStatus,
  type RiskLevel,
  type Conformity,
  type MaturityEvent
} from './maturityEngineService';

// Schemas de validação
const moduleSchema = z.enum(['checklist', 'cppd', 'dpia', 'contratos', 'mapeamentos', 'terceiros', 'incidentes']);
const eventTypeSchema = z.enum(['tarefa', 'reuniao', 'treinamento', 'dpia', 'contrato_risco', 'mapeamento_area', 'terceiro', 'incidente']);
const statusSchema = z.enum(['programado', 'em_andamento', 'pendente', 'concluido', 'bloqueado', 'contido']);
const riskLevelSchema = z.enum(['baixo', 'medio', 'alto']);
const conformitySchema = z.enum(['conforme', 'parcialmente_conforme', 'nao_conforme']);

export const maturityEngineRouter = router({
  // Calcular todos os indicadores de maturidade
  calculateIndicators: protectedProcedure
    .input(z.object({
      tenantId: z.string(),
      windowDays: z.number().optional().default(90)
    }))
    .query(async ({ input }) => {
      return await calculateAllIndicators(input.tenantId, input.windowDays);
    }),

  // Obter estágio atual de maturidade
  getCurrentStage: protectedProcedure
    .input(z.object({
      tenantId: z.string()
    }))
    .query(async ({ input }) => {
      return await getCurrentMaturityStage(input.tenantId);
    }),

  // Verificar bloqueios por incidentes
  checkBlocking: protectedProcedure
    .input(z.object({
      tenantId: z.string(),
      windowDays: z.number().optional().default(90)
    }))
    .query(async ({ input }) => {
      return await checkBlockingIncidents(input.tenantId, input.windowDays);
    }),

  // Criar novo evento
  createEvent: protectedProcedure
    .input(z.object({
      tenant_id: z.string(),
      module: moduleSchema,
      event_type: eventTypeSchema,
      risk_level: riskLevelSchema.optional(),
      area_id: z.string().optional(),
      expected_date: z.string().optional(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      status: statusSchema,
      conformity: conformitySchema.optional(),
      planned_flag: z.boolean(),
      executed_flag: z.boolean(),
      evidence_link: z.string().optional(),
      responsible_id: z.string().optional(),
      metadata: z.record(z.string(), z.any()).optional()
    }))
    .mutation(async ({ input }) => {
      const eventId = await createMaturityEvent({
        tenant_id: input.tenant_id,
        module: input.module as MaturityModule,
        event_type: input.event_type as EventType,
        risk_level: input.risk_level as RiskLevel | undefined,
        area_id: input.area_id,
        expected_date: input.expected_date ? new Date(input.expected_date) : undefined,
        start_date: input.start_date ? new Date(input.start_date) : undefined,
        end_date: input.end_date ? new Date(input.end_date) : undefined,
        status: input.status as EventStatus,
        conformity: input.conformity as Conformity | undefined,
        planned_flag: input.planned_flag,
        executed_flag: input.executed_flag,
        evidence_link: input.evidence_link,
        responsible_id: input.responsible_id,
        metadata: input.metadata
      });
      return { success: true, eventId };
    }),

  // Atualizar evento existente
  updateEvent: protectedProcedure
    .input(z.object({
      eventId: z.string(),
      status: statusSchema.optional(),
      end_date: z.string().optional(),
      executed_flag: z.boolean().optional(),
      evidence_link: z.string().optional(),
      conformity: conformitySchema.optional()
    }))
    .mutation(async ({ input }) => {
      const { eventId, ...updates } = input;
      await updateMaturityEvent(eventId, {
        ...updates,
        end_date: updates.end_date ? new Date(updates.end_date) : undefined
      });
      return { success: true };
    }),

  // Listar eventos com filtros
  listEvents: protectedProcedure
    .input(z.object({
      tenantId: z.string(),
      module: moduleSchema.optional(),
      event_type: eventTypeSchema.optional(),
      status: statusSchema.optional(),
      risk_level: riskLevelSchema.optional(),
      from_date: z.string().optional(),
      to_date: z.string().optional()
    }))
    .query(async ({ input }) => {
      const { tenantId, from_date, to_date, ...filters } = input;
      return await listEvents(tenantId, {
        ...filters,
        from_date: from_date ? new Date(from_date) : undefined,
        to_date: to_date ? new Date(to_date) : undefined
      });
    }),

  // Registrar decisão de promoção de maturidade
  recordDecision: protectedProcedure
    .input(z.object({
      tenantId: z.string(),
      newStage: z.number().min(1).max(5),
      justification: z.string().min(10),
      evidenceLinks: z.array(z.string()).optional().default([])
    }))
    .mutation(async ({ input, ctx }) => {
      // Primeiro, calcular indicadores atuais para snapshot
      const indicators = await calculateAllIndicators(input.tenantId);
      
      // Verificar se pode promover
      if (!indicators.can_suggest_promotion) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Não é possível promover: indicadores não atendem aos critérios ou há bloqueios ativos' });
      }

      await recordMaturityDecision(
        input.tenantId,
        input.newStage,
        String(ctx.user.id),
        ctx.user.name || ctx.user.email,
        input.justification,
        input.evidenceLinks,
        indicators.indicators
      );

      return { success: true, newStage: input.newStage };
    }),

  // Obter histórico de decisões
  getDecisionHistory: protectedProcedure
    .input(z.object({
      tenantId: z.string()
    }))
    .query(async ({ input }) => {
      return await getMaturityDecisionHistory(input.tenantId);
    }),

  // Listar indicadores configurados
  listIndicators: protectedProcedure
    .query(async () => {
      const { getDb } = await import('./db');
      const { sql } = await import('drizzle-orm');
      
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const result = await db.execute(sql`
        SELECT * FROM sd_indicators WHERE is_active = 1 ORDER BY module, indicator_id
      `);

      return (result as unknown as any[][])[0] || [];
    }),

  // Listar áreas organizacionais
  listAreas: protectedProcedure
    .input(z.object({
      tenantId: z.string()
    }))
    .query(async ({ input }) => {
      const { getDb } = await import('./db');
      const { sql } = await import('drizzle-orm');
      
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const result = await db.execute(sql`
        SELECT * FROM sd_areas WHERE tenant_id = ${input.tenantId} ORDER BY area_name
      `);

      return (result as unknown as any[][])[0] || [];
    }),

  // Criar área organizacional
  createArea: protectedProcedure
    .input(z.object({
      tenantId: z.string(),
      areaName: z.string().min(2),
      description: z.string().optional(),
      parentAreaId: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import('./db');
      const { sql } = await import('drizzle-orm');
      
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const areaId = crypto.randomUUID();

      await db.execute(sql`
        INSERT INTO sd_areas (area_id, tenant_id, area_name, description, parent_area_id)
        VALUES (${areaId}, ${input.tenantId}, ${input.areaName}, ${input.description || null}, ${input.parentAreaId || null})
      `);

      return { success: true, areaId };
    }),

  // Dashboard resumido de maturidade
  getDashboard: protectedProcedure
    .input(z.object({
      tenantId: z.string()
    }))
    .query(async ({ input }) => {
      const [indicators, stage, blocking, history] = await Promise.all([
        calculateAllIndicators(input.tenantId),
        getCurrentMaturityStage(input.tenantId),
        checkBlockingIncidents(input.tenantId),
        getMaturityDecisionHistory(input.tenantId)
      ]);

      // Calcular estatísticas de eventos
      const events = await listEvents(input.tenantId);
      const eventStats = {
        total: events.length,
        concluidos: events.filter(e => e.status === 'concluido').length,
        pendentes: events.filter(e => e.status === 'pendente').length,
        em_andamento: events.filter(e => e.status === 'em_andamento').length,
        bloqueados: events.filter(e => e.status === 'bloqueado').length
      };

      return {
        currentStage: stage.current_stage,
        previousStage: stage.previous_stage,
        indicators: indicators.indicators,
        canSuggestPromotion: indicators.can_suggest_promotion,
        blockingReasons: blocking.reasons,
        trend: indicators.trend,
        eventStats,
        recentDecisions: history.slice(0, 5),
        calculatedAt: indicators.calculated_at
      };
    })
});

export type MaturityEngineRouter = typeof maturityEngineRouter;
