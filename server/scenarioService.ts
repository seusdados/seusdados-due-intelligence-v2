// Service layer para gerenciamento de cenários
import { getDb } from "./db";
import { eq, or, sql } from "drizzle-orm";
import {
  simulationScenarios,
} from "../drizzle/schema";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

type SimulationScenario = InferSelectModel<typeof simulationScenarios>;
type InsertSimulationScenario = InferInsertModel<typeof simulationScenarios>;
import { TRPCError } from "@trpc/server";

// ==================== CENÁRIOS ====================

export async function listScenarios(
  organizationId: number,
  includeTemplates?: boolean
): Promise<SimulationScenario[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  if (includeTemplates) {
    // Retornar cenários da organização + templates públicos
    return db
      .select()
      .from(simulationScenarios)
      .where(
        or(
          eq(simulationScenarios.organizationId, organizationId),
          eq(simulationScenarios.isTemplate, 1)
        )
      );
  }

  // Retornar apenas cenários da organização
  return db
    .select()
    .from(simulationScenarios)
    .where(eq(simulationScenarios.organizationId, organizationId));
}

export async function getScenarioById(id: number): Promise<SimulationScenario> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const result = await db
    .select()
    .from(simulationScenarios)
    .where(eq(simulationScenarios.id, id))
    .limit(1);

  if (!result || result.length === 0) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Cenário não encontrado',
    });
  }

  return result[0];
}

export async function createScenario(data: {
  organizationId: number;
  createdById: number;
  nome: string;
  tipoIncidente: string;
  descricao: string;
  areasEnvolvidas: string[];
  sistemasAfetados: string[];
  objetivos: string[];
  papeisChave: string[];
  criteriosSucesso: string[];
  trimestre?: string;
  isTemplate?: boolean;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Validação de campos obrigatórios
  if (!data.nome || data.nome.trim() === '') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nome do cenário é obrigatório' });
  }
  if (!data.tipoIncidente || data.tipoIncidente.trim() === '') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tipo de incidente é obrigatório' });
  }
  if (!data.descricao || data.descricao.trim() === '') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Descrição é obrigatória' });
  }

  const insertData: InsertSimulationScenario = {
    organizationId: data.organizationId,
    createdById: data.createdById,
    nome: data.nome,
    tipoIncidente: data.tipoIncidente,
    descricao: data.descricao,
    areasEnvolvidas: data.areasEnvolvidas,
    sistemasAfetados: data.sistemasAfetados,
    objetivos: data.objetivos,
    papeisChave: data.papeisChave,
    criteriosSucesso: data.criteriosSucesso,
    trimestre: data.trimestre,
    isTemplate: !!data.isTemplate,
  };

  const result = await db.insert(simulationScenarios).values(insertData).returning({ id: simulationScenarios.id });
  return result[0]?.id;
}

export async function updateScenario(
  id: number,
  data: Partial<{
    nome: string;
    tipoIncidente: string;
    descricao: string;
    areasEnvolvidas: string[];
    sistemasAfetados: string[];
    objetivos: string[];
    papeisChave: string[];
    criteriosSucesso: string[];
    trimestre: string;
  }>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const updateData: Record<string, unknown> = {};

  if (data.nome !== undefined) updateData.nome = data.nome;
  if (data.tipoIncidente !== undefined) updateData.tipoIncidente = data.tipoIncidente;
  if (data.descricao !== undefined) updateData.descricao = data.descricao;
  if (data.areasEnvolvidas !== undefined) updateData.areasEnvolvidas = data.areasEnvolvidas;
  if (data.sistemasAfetados !== undefined) updateData.sistemasAfetados = data.sistemasAfetados;
  if (data.objetivos !== undefined) updateData.objetivos = data.objetivos;
  if (data.papeisChave !== undefined) updateData.papeisChave = data.papeisChave;
  if (data.criteriosSucesso !== undefined) updateData.criteriosSucesso = data.criteriosSucesso;
  if (data.trimestre !== undefined) updateData.trimestre = data.trimestre;

  await db
    .update(simulationScenarios)
    .set(updateData)
    .where(eq(simulationScenarios.id, id));
}

export async function deleteScenario(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  await db.delete(simulationScenarios).where(eq(simulationScenarios.id, id));
}

export async function duplicateScenario(
  id: number,
  newName: string,
  createdById: number
): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const original = await getScenarioById(id);

  const duplicateData: InsertSimulationScenario = {
    organizationId: original.organizationId,
    createdById,
    nome: newName,
    tipoIncidente: original.tipoIncidente,
    descricao: original.descricao,
    areasEnvolvidas: original.areasEnvolvidas,
    sistemasAfetados: original.sistemasAfetados,
    objetivos: original.objetivos,
    papeisChave: original.papeisChave,
    criteriosSucesso: original.criteriosSucesso,
    trimestre: original.trimestre,
    isTemplate: false,
  };

  const result = await db.insert(simulationScenarios).values(duplicateData).returning({ id: simulationScenarios.id });
  return result[0]?.id;
}

export async function listPublicTemplates(): Promise<SimulationScenario[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  return db
    .select()
    .from(simulationScenarios)
    .where(eq(simulationScenarios.isTemplate, 1));
}

export async function createFromTemplate(
  templateId: number,
  organizationId: number,
  createdById: number,
  customizations?: {
    nome?: string;
    trimestre?: string;
  }
): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const template = await getScenarioById(templateId);

  if (!template.isTemplate) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'O cenário selecionado não é um template',
    });
  }

  const newScenarioData: InsertSimulationScenario = {
    organizationId,
    createdById,
    nome: customizations?.nome || template.nome,
    tipoIncidente: template.tipoIncidente,
    descricao: template.descricao,
    areasEnvolvidas: template.areasEnvolvidas,
    sistemasAfetados: template.sistemasAfetados,
    objetivos: template.objetivos,
    papeisChave: template.papeisChave,
    criteriosSucesso: template.criteriosSucesso,
    trimestre: customizations?.trimestre || template.trimestre,
    isTemplate: false,
  };

  const result = await db.insert(simulationScenarios).values(newScenarioData).returning({ id: simulationScenarios.id });
  return result[0]?.id;
}
