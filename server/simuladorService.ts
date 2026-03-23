// Service layer para o módulo Simulador
import { getDb } from "./db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import {
  simulations,
  simulationDecisions,
  simulationEvents,
  simulationFeedback,
  simulationChecklist,
  simulationStakeholders,
} from "../drizzle/schema";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

type Simulation = InferSelectModel<typeof simulations>;
type InsertSimulation = InferInsertModel<typeof simulations>;
type SimulationDecision = InferSelectModel<typeof simulationDecisions>;
type InsertSimulationDecision = InferInsertModel<typeof simulationDecisions>;
type SimulationEvent = InferSelectModel<typeof simulationEvents>;
type InsertSimulationEvent = InferInsertModel<typeof simulationEvents>;
type SimulationFeedback = InferSelectModel<typeof simulationFeedback>;
type InsertSimulationFeedback = InferInsertModel<typeof simulationFeedback>;
import { TRPCError } from "@trpc/server";

// ==================== SIMULAÇÕES ====================

export async function listSimulations(
  organizationId: number,
  status?: string,
  quarter?: string
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  let conditions = [eq(simulations.organizationId, organizationId)];
  
  if (status) {
    conditions.push(eq(simulations.status, status as any));
  }

  if (quarter) {
    conditions.push(eq(simulations.quarter, quarter));
  }

  const results = await db
    .select()
    .from(simulations)
    .where(and(...conditions))
    .orderBy(desc(simulations.createdAt));
  
  return results;
}

export async function getSimulationById(id: number): Promise<Simulation> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const result = await db
    .select()
    .from(simulations)
    .where(eq(simulations.id, id))
    .limit(1);

  if (!result || result.length === 0) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Simulação não encontrada',
    });
  }

  return result[0];
}

export async function createSimulation(data: {
  organizationId: number;
  scenarioId: number;
  scenarioName: string;
  createdById: number;
  quarter?: string;
  participants?: string[];
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const insertData: InsertSimulation = {
    organizationId: data.organizationId,
    scenarioId: data.scenarioId,
    scenarioName: data.scenarioName,
    createdById: data.createdById,
    startTime: new Date().toISOString(),
    status: "planejada",
    phaseTimings: {},
    kpiValues: {},
    quarter: data.quarter,
    participants: data.participants || [],
  };

  const result = await db.insert(simulations).values(insertData).returning({ id: simulations.id });
  return result[0]?.id;
}

export async function startSimulation(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  await db
    .update(simulations)
    .set({
      status: "em_andamento",
      startTime: new Date().toISOString(),
    })
    .where(eq(simulations.id, id));
}

export async function pauseSimulation(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  await db
    .update(simulations)
    .set({ status: "pausada" })
    .where(eq(simulations.id, id));
}

export async function completeSimulation(
  id: number,
  data: {
    phaseTimings: Record<string, number>;
    kpiValues: Record<string, number>;
    playbookAdherence?: number;
    recordsCompleteness?: number;
    notes?: string;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  await db
    .update(simulations)
    .set({
      status: "concluida",
      endTime: new Date().toISOString(),
      phaseTimings: data.phaseTimings,
      kpiValues: data.kpiValues,
      playbookAdherence: data.playbookAdherence,
      recordsCompleteness: data.recordsCompleteness,
      notes: data.notes,
    })
    .where(eq(simulations.id, id));
}

export async function updateSimulation(
  id: number,
  data: {
    participants?: string[];
    notes?: string;
    phaseTimings?: Record<string, number>;
    kpiValues?: Record<string, number>;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const updateData: Record<string, unknown> = {};
  
  if (data.participants !== undefined) updateData.participants = data.participants;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.phaseTimings !== undefined) updateData.phaseTimings = data.phaseTimings;
  if (data.kpiValues !== undefined) updateData.kpiValues = data.kpiValues;

  await db
    .update(simulations)
    .set(updateData)
    .where(eq(simulations.id, id));
}

export async function deleteSimulation(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Excluir registros relacionados primeiro
  await db.delete(simulationDecisions).where(eq(simulationDecisions.simulationId, id));
  await db.delete(simulationEvents).where(eq(simulationEvents.simulationId, id));
  await db.delete(simulationFeedback).where(eq(simulationFeedback.simulationId, id));
  await db.delete(simulationChecklist).where(eq(simulationChecklist.simulationId, id));
  // simulationStakeholders não tem simulationId, pular
  // await db.delete(simulationStakeholders).where(eq(simulationStakeholders.simulationId, id));
  
  // Excluir simulação
  await db.delete(simulations).where(eq(simulations.id, id));
}

// ==================== DECISÕES ====================

export async function recordDecision(data: {
  simulationId: number;
  organizationId: number;
  phase: string;
  description: string;
  decisionMaker: string;
  decisionType: "operational" | "strategic" | "communication";
  notes?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const insertData: InsertSimulationDecision = {
    simulationId: data.simulationId,
    organizationId: data.organizationId,
    timestamp: new Date().toISOString(),
    phase: data.phase,
    description: data.description,
    decisionMaker: data.decisionMaker,
    decisionType: data.decisionType,
    notes: data.notes,
  };

  const result = await db.insert(simulationDecisions).values(insertData).returning({ id: simulationDecisions.id });
  return result[0]?.id;
}

export async function listDecisions(simulationId: number): Promise<SimulationDecision[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  return db
    .select()
    .from(simulationDecisions)
    .where(eq(simulationDecisions.simulationId, simulationId))
    .orderBy(simulationDecisions.timestamp);
}

// ==================== EVENTOS ====================

export async function recordEvent(data: {
  simulationId: number;
  organizationId: number;
  phase: string;
  eventType: string;
  title: string;
  description: string;
  severity: "baixa" | "media" | "alta" | "critica";
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const insertData: InsertSimulationEvent = {
    simulationId: data.simulationId,
    organizationId: data.organizationId,
    timestamp: new Date().toISOString(),
    phase: data.phase,
    eventType: data.eventType,
    title: data.title,
    description: data.description,
    severity: data.severity,
    isRead: false,
  };

  const result = await db.insert(simulationEvents).values(insertData).returning({ id: simulationEvents.id });
  return result[0]?.id;
}

export async function markEventAsRead(eventId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  await db
    .update(simulationEvents)
    .set({
      isRead: 1,
      readAt: new Date().toISOString(),
    })
    .where(eq(simulationEvents.id, eventId));
}

export async function listEvents(simulationId: number): Promise<SimulationEvent[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  return db
    .select()
    .from(simulationEvents)
    .where(eq(simulationEvents.simulationId, simulationId))
    .orderBy(simulationEvents.timestamp);
}

// ==================== FEEDBACK ====================

export async function submitFeedback(data: {
  simulationId: number;
  organizationId: number;
  participantId: number;
  participantRole: string;
  clarityScore: number;
  communicationScore: number;
  toolsScore: number;
  strengths?: string;
  weaknesses?: string;
  suggestions?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Validação de scores (1-5)
  const validateScore = (score: number, field: string) => {
    if (score < 1 || score > 5) {
      throw new TRPCError({ 
        code: 'BAD_REQUEST', 
        message: `${field} deve estar entre 1 e 5` 
      });
    }
  };
  validateScore(data.clarityScore, 'clarityScore');
  validateScore(data.communicationScore, 'communicationScore');
  validateScore(data.toolsScore, 'toolsScore');

  const insertData: InsertSimulationFeedback = {
    simulationId: data.simulationId,
    organizationId: data.organizationId,
    participantId: data.participantId,
    participantRole: data.participantRole,
    clarityScore: data.clarityScore,
    communicationScore: data.communicationScore,
    toolsScore: data.toolsScore,
    strengths: data.strengths,
    weaknesses: data.weaknesses,
    suggestions: data.suggestions,
  };

  const result = await db.insert(simulationFeedback).values(insertData).returning({ id: simulationFeedback.id });
  return result[0]?.id;
}

export async function listFeedback(simulationId: number): Promise<SimulationFeedback[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  return db
    .select()
    .from(simulationFeedback)
    .where(eq(simulationFeedback.simulationId, simulationId))
    .orderBy(simulationFeedback.createdAt);
}

// ==================== MÉTRICAS ====================

export async function getMetrics(
  organizationId: number,
  startDate?: string,
  endDate?: string
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  let conditions = [eq(simulations.organizationId, organizationId)];

  if (startDate) {
    conditions.push(gte(simulations.startTime, new Date(startDate).toISOString()));
  }

  if (endDate) {
    conditions.push(lte(simulations.startTime, new Date(endDate).toISOString()));
  }

  const allSimulations = await db
    .select()
    .from(simulations)
    .where(and(...conditions));
    
  const completedSimulations = allSimulations.filter((s: Simulation) => s.status === "concluida");

  // Calcular médias
  const avgMttd = completedSimulations.reduce((sum: number, s: any) => {
    const timings = s.phaseTimings as { detection?: number; recovery?: number } | null;
    return sum + (timings?.detection || 0);
  }, 0) / (completedSimulations.length || 1);

  const avgMttr = completedSimulations.reduce((sum: number, s: any) => {
    const timings = s.phaseTimings as { detection?: number; recovery?: number } | null;
    return sum + (timings?.recovery || 0);
  }, 0) / (completedSimulations.length || 1);

  const avgPlaybookAdherence = completedSimulations.reduce((sum: number, s: Simulation) => {
    return sum + (s.playbookAdherence || 0);
  }, 0) / (completedSimulations.length || 1);

  const avgRecordsCompleteness = completedSimulations.reduce((sum: number, s: Simulation) => {
    return sum + (s.recordsCompleteness || 0);
  }, 0) / (completedSimulations.length || 1);

  return {
    totalSimulations: allSimulations.length,
    completedSimulations: completedSimulations.length,
    averageMttd: Math.round(avgMttd),
    averageMttr: Math.round(avgMttr),
    averagePlaybookAdherence: Math.round(avgPlaybookAdherence),
    averageRecordsCompleteness: Math.round(avgRecordsCompleteness),
  };
}

export async function getTrends(
  organizationId: number,
  quarters: string[]
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const trends = [];

  for (const quarter of quarters) {
    const quarterSimulations = await db
      .select()
      .from(simulations)
      .where(and(
        eq(simulations.organizationId, organizationId),
        eq(simulations.quarter, quarter),
        eq(simulations.status, "concluida")
      ));

    if (quarterSimulations.length > 0) {
      const avgMttd = quarterSimulations.reduce((sum: number, s: any) => {
        const timings = s.phaseTimings as { detection?: number; recovery?: number } | null;
        return sum + (timings?.detection || 0);
      }, 0) / quarterSimulations.length;

      const avgMttr = quarterSimulations.reduce((sum: number, s: any) => {
        const timings = s.phaseTimings as { detection?: number; recovery?: number } | null;
        return sum + (timings?.recovery || 0);
      }, 0) / quarterSimulations.length;

      const avgPlaybook = quarterSimulations.reduce((sum: number, s: Simulation) => {
        return sum + (s.playbookAdherence || 0);
      }, 0) / quarterSimulations.length;

      trends.push({
        period: quarter,
        mttd: Math.round(avgMttd),
        mttr: Math.round(avgMttr),
        playbookAdherence: Math.round(avgPlaybook),
      });
    }
  }

  return trends;
}
