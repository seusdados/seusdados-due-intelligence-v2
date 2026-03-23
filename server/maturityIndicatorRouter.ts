/**
 * Router para o Motor de Maturidade por Evidências
 */

import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import {
  evaluateMaturity,
  registerEvent,
  updateEventStatus,
  saveIndicatorHistory,
  recordMaturityDecision,
  calculateExecutionRate,
  calculateCppdClosingTime,
  calculateCppdMeetings,
  calculateDpiaHighRiskCoverage,
  calculateHighRiskContracts,
  calculateMappingCoverage,
  calculateThirdPartyCorrections,
  checkBlockingIncidents,
} from "./maturityIndicatorService";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { ENV } from "./_core/env";

// Conexão lazy para queries SQL raw
let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getLocalDb() {
  if (!ENV.databaseUrl) throw new Error("DATABASE_URL not configured");
  if (!_pool) {
    _pool = new pg.Pool({ connectionString: ENV.databaseUrl, ssl: { rejectUnauthorized: false } });
    _db = drizzle(_pool);
  }
  return _db!;
}

const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return (getLocalDb() as any)[prop];
  },
});
import { sql } from "drizzle-orm";
import { TRPCError } from '@trpc/server';

export const maturityIndicatorRouter = router({
  // Avalia a maturidade completa de uma organização
  evaluate: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
    }))
    .query(async ({ input }) => {
      return evaluateMaturity(input.organizationId);
    }),

  // Obtém indicadores individuais
  getIndicator: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      indicatorId: z.enum([
        'execucao_planejada',
        'tempo_fechamento_cppd',
        'reunioes_cppd',
        'dpia_risco_alto',
        'contratos_alto_risco',
        'mapeamento_cobertura',
        'terceiros_correcoes',
      ]),
    }))
    .query(async ({ input }) => {
      const { organizationId, indicatorId } = input;
      
      switch (indicatorId) {
        case 'execucao_planejada':
          return calculateExecutionRate(organizationId);
        case 'tempo_fechamento_cppd':
          return calculateCppdClosingTime(organizationId);
        case 'reunioes_cppd':
          return calculateCppdMeetings(organizationId);
        case 'dpia_risco_alto':
          return calculateDpiaHighRiskCoverage(organizationId);
        case 'contratos_alto_risco':
          return calculateHighRiskContracts(organizationId);
        case 'mapeamento_cobertura':
          return calculateMappingCoverage(organizationId);
        case 'terceiros_correcoes':
          return calculateThirdPartyCorrections(organizationId);
        default:
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Indicador não encontrado' });
      }
    }),

  // Verifica incidentes bloqueadores
  checkBlockingIncidents: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
    }))
    .query(async ({ input }) => {
      return checkBlockingIncidents(input.organizationId);
    }),

  // Registra um novo evento
  registerEvent: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      module: z.enum(['checklist', 'cppd', 'dpia', 'contratos', 'mapeamentos', 'terceiros', 'incidentes']),
      eventType: z.enum(['tarefa', 'reuniao', 'treinamento', 'dpia', 'contrato_risco', 'mapeamento_area', 'terceiro', 'incidente']),
      riskLevel: z.enum(['baixo', 'medio', 'alto']).optional(),
      areaId: z.number().optional(),
      entityId: z.number().optional(),
      entityType: z.string().optional(),
      expectedDate: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      status: z.enum(['programado', 'em_andamento', 'pendente', 'concluido', 'bloqueado']).optional(),
      conformity: z.enum(['conforme', 'parcialmente_conforme', 'nao_conforme']).optional(),
      plannedFlag: z.boolean().optional(),
      executedFlag: z.boolean().optional(),
      evidenceLink: z.string().optional(),
      responsibleId: z.number().optional(),
      metadata: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const eventId = await registerEvent({
        tenantId: input.organizationId,
        module: input.module,
        eventType: input.eventType,
        riskLevel: input.riskLevel,
        areaId: input.areaId,
        entityId: input.entityId,
        entityType: input.entityType,
        expectedDate: input.expectedDate,
        startDate: input.startDate,
        endDate: input.endDate,
        status: input.status,
        conformity: input.conformity,
        plannedFlag: input.plannedFlag,
        executedFlag: input.executedFlag,
        evidenceLink: input.evidenceLink,
        responsibleId: input.responsibleId,
        createdById: ctx.user.id,
        metadata: input.metadata,
      });
      
      return { eventId };
    }),

  // Atualiza o status de um evento
  updateEventStatus: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      status: z.enum(['programado', 'em_andamento', 'pendente', 'concluido', 'bloqueado']),
      endDate: z.string().optional(),
      executedFlag: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      await updateEventStatus(
        input.eventId,
        input.status,
        input.endDate,
        input.executedFlag
      );
      return { success: true };
    }),

  // Lista eventos de uma organização
  listEvents: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      module: z.enum(['checklist', 'cppd', 'dpia', 'contratos', 'mapeamentos', 'terceiros', 'incidentes']).optional(),
      status: z.enum(['programado', 'em_andamento', 'pendente', 'concluido', 'bloqueado']).optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const { organizationId, module, status, limit, offset } = input;
      
      let query = sql`
        SELECT * FROM sd_events
        WHERE tenant_id = ${organizationId}
      `;
      
      if (module) {
        query = sql`${query} AND module = ${module}`;
      }
      
      if (status) {
        query = sql`${query} AND status = ${status}`;
      }
      
      query = sql`${query} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      
      const result = await db.execute(query);
      return (result as any)[0] || [];
    }),

  // Obtém o estágio de maturidade atual
  getCurrentStage: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
    }))
    .query(async ({ input }) => {
      const result = await db.execute(sql`
        SELECT * FROM sd_maturity_stage WHERE tenant_id = ${input.organizationId}
      `);
      
      const stage = (result as any)[0]?.[0];
      
      if (!stage) {
        // Cria registro inicial se não existir
        await db.execute(sql`
          INSERT INTO sd_maturity_stage (tenant_id, current_stage)
          VALUES (${input.organizationId}, 1)
        `);
        
        return {
          tenantId: input.organizationId,
          currentStage: 1,
          previousStage: null,
          lastUpdated: null,
          suggestedPromotion: false,
          promotionBlockedReason: null,
        };
      }
      
      return {
        tenantId: stage.tenant_id,
        currentStage: stage.current_stage,
        previousStage: stage.previous_stage,
        lastUpdated: stage.last_updated,
        suggestedPromotion: stage.suggested_promotion === 1,
        promotionBlockedReason: stage.promotion_blocked_reason,
      };
    }),

  // Promove o estágio de maturidade (requer aprovação manual)
  promoteStage: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      newStage: z.number().min(1).max(5),
      justification: z.string().min(10),
      evidenceLinks: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Obtém o estágio atual
      const stageResult = await db.execute(sql`
        SELECT current_stage FROM sd_maturity_stage WHERE tenant_id = ${input.organizationId}
      `);
      const currentStage = Number((stageResult as any)[0]?.[0]?.current_stage) || 1;
      
      // Valida que a promoção é válida (só pode subir 1 nível por vez)
      if (input.newStage !== currentStage + 1) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Só é possível promover um nível por vez' });
      }
      
      // Avalia a maturidade para obter o snapshot
      const evaluation = await evaluateMaturity(input.organizationId);
      
      // Registra a decisão
      await recordMaturityDecision(
        input.organizationId,
        currentStage,
        input.newStage,
        ctx.user.id,
        input.justification,
        input.evidenceLinks || [],
        evaluation
      );
      
      return {
        success: true,
        previousStage: currentStage,
        newStage: input.newStage,
      };
    }),

  // Obtém o histórico de decisões de maturidade
  getDecisionHistory: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      limit: z.number().default(10),
    }))
    .query(async ({ input }) => {
      const result = await db.execute(sql`
        SELECT 
          mdl.*,
          u.name as approved_by_name
        FROM sd_maturity_decision_log mdl
        LEFT JOIN users u ON u.id = mdl.approved_by_id
        WHERE mdl.tenant_id = ${input.organizationId}
        ORDER BY mdl.decision_date DESC
        LIMIT ${input.limit}
      `);
      
      return (result as any)[0] || [];
    }),

  // Obtém o histórico de indicadores
  getIndicatorHistory: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      indicatorId: z.string().optional(),
      limit: z.number().default(30),
    }))
    .query(async ({ input }) => {
      const { organizationId, indicatorId, limit } = input;
      
      let query = sql`
        SELECT * FROM sd_indicator_history
        WHERE tenant_id = ${organizationId}
      `;
      
      if (indicatorId) {
        query = sql`${query} AND indicator_id = ${indicatorId}`;
      }
      
      query = sql`${query} ORDER BY calculated_at DESC LIMIT ${limit}`;
      
      const result = await db.execute(query);
      return (result as any)[0] || [];
    }),

  // Salva o histórico de indicadores (para agendamento)
  saveIndicatorHistory: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const evaluation = await evaluateMaturity(input.organizationId);
      
      // Salva cada indicador no histórico
      for (const indicator of evaluation.indicators) {
        await saveIndicatorHistory(input.organizationId, indicator);
      }
      
      return { success: true, indicatorsSaved: evaluation.indicators.length };
    }),

  // Lista configurações de indicadores
  getIndicatorConfigs: protectedProcedure
    .query(async () => {
      const result = await db.execute(sql`
        SELECT * FROM sd_indicator_config WHERE is_active = 1 ORDER BY module, name
      `);
      return (result as any)[0] || [];
    }),

  // Lista áreas de uma organização
  listAreas: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
    }))
    .query(async ({ input }) => {
      const result = await db.execute(sql`
        SELECT * FROM sd_areas
        WHERE tenant_id = ${input.organizationId}
          AND is_active = 1
        ORDER BY area_name
      `);
      return (result as any)[0] || [];
    }),

  // Cria uma área
  createArea: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      areaName: z.string().min(2),
      description: z.string().optional(),
      parentAreaId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const areaId = crypto.randomUUID();
      
      await db.execute(sql`
        INSERT INTO sd_areas (area_id, tenant_id, area_name, description, parent_area_id)
        VALUES (${areaId}, ${input.organizationId}, ${input.areaName}, ${input.description || null}, ${input.parentAreaId || null})
      `);
      
      return { areaId };
    }),
});
