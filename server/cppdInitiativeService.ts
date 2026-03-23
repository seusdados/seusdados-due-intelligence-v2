import { getDb } from "./db";
import { cppdInitiatives, cppdInitiativeTasks, cppdInitiativeDocuments, cppdOverdueNotifications } from "../drizzle/schema";
import { eq, and, desc, asc, sql, like, or, lte, gte, isNull } from "drizzle-orm";
import { TRPCError } from '@trpc/server';

// Types
export type InitiativeStatus = 'planejado' | 'em_andamento' | 'concluido' | 'atrasado' | 'cancelado';
export type InitiativeCategory = 'politica' | 'treinamento' | 'auditoria' | 'mapeamento' | 'tecnologia' | 'processo' | 'comunicacao' | 'outro';
export type InitiativePriority = 'baixa' | 'media' | 'alta' | 'critica';
export type InitiativeImpact = 'baixo' | 'medio' | 'alto' | 'muito_alto';
export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface CreateInitiativeInput {
  organizationId: number;
  title: string;
  description?: string;
  category?: InitiativeCategory;
  status?: InitiativeStatus;
  plannedStartDate?: string;
  plannedEndDate?: string;
  responsibleId?: number;
  responsibleName?: string;
  responsibleEmail?: string;
  quarter?: Quarter;
  year: number;
  priority?: InitiativePriority;
  impact?: InitiativeImpact;
  notes?: string;
  createdById?: number;
}

export interface UpdateInitiativeInput {
  title?: string;
  description?: string;
  category?: InitiativeCategory;
  status?: InitiativeStatus;
  progress?: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  responsibleId?: number;
  responsibleName?: string;
  responsibleEmail?: string;
  quarter?: Quarter;
  year?: number;
  priority?: InitiativePriority;
  impact?: InitiativeImpact;
  notes?: string;
}

export interface InitiativeFilters {
  status?: InitiativeStatus;
  category?: InitiativeCategory;
  quarter?: Quarter;
  year?: number;
  responsibleId?: number;
  priority?: InitiativePriority;
  search?: string;
  startDate?: string;
  endDate?: string;
}

// ==========================================
// INICIATIVAS
// ==========================================

export async function listInitiatives(organizationId: number, filters?: InitiativeFilters) {
  const db = await getDb();
  if (!db) return [];
  
  // Aplicar filtros
  const conditions = [eq(cppdInitiatives.organizationId, organizationId)];
  
  if (filters?.status) {
    conditions.push(eq(cppdInitiatives.status, filters.status));
  }
  if (filters?.category) {
    conditions.push(eq(cppdInitiatives.category, filters.category));
  }
  if (filters?.quarter) {
    conditions.push(eq(cppdInitiatives.quarter, filters.quarter));
  }
  if (filters?.year) {
    conditions.push(eq(cppdInitiatives.year, filters.year));
  }
  if (filters?.responsibleId) {
    conditions.push(eq(cppdInitiatives.responsibleId, filters.responsibleId));
  }
  if (filters?.priority) {
    conditions.push(eq(cppdInitiatives.priority, filters.priority));
  }
  if (filters?.search) {
    conditions.push(
      or(
        like(cppdInitiatives.title, `%${filters.search}%`),
        like(cppdInitiatives.description, `%${filters.search}%`)
      )!
    );
  }
  
  const results = await db.select()
    .from(cppdInitiatives)
    .where(and(...conditions))
    .orderBy(desc(cppdInitiatives.createdAt));
  
  return results;
}

export async function getInitiativeById(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [initiative] = await db.select()
    .from(cppdInitiatives)
    .where(and(
      eq(cppdInitiatives.id, id),
      eq(cppdInitiatives.organizationId, organizationId)
    ));
  
  return initiative;
}

export async function createInitiative(input: CreateInitiativeInput) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const [result] = await db.insert(cppdInitiatives).values({
    organizationId: input.organizationId,
    title: input.title,
    description: input.description,
    category: input.category || 'outro',
    status: input.status || 'planejado',
    progress: 0,
    plannedStartDate: input.plannedStartDate,
    plannedEndDate: input.plannedEndDate,
    responsibleId: input.responsibleId,
    responsibleName: input.responsibleName,
    responsibleEmail: input.responsibleEmail,
    quarter: input.quarter,
    year: input.year,
    priority: input.priority || 'media',
    impact: input.impact || 'medio',
    notes: input.notes,
    createdById: input.createdById,
  }).returning({ id: cppdInitiatives.id });
  
  return { id: result.id };
}

export async function updateInitiative(id: number, organizationId: number, input: UpdateInitiativeInput) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.update(cppdInitiatives)
    .set(input)
    .where(and(
      eq(cppdInitiatives.id, id),
      eq(cppdInitiatives.organizationId, organizationId)
    ));
  
  return { success: true };
}

export async function deleteInitiative(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  // Deletar tarefas associadas
  await db.delete(cppdInitiativeTasks).where(eq(cppdInitiativeTasks.initiativeId, id));
  
  // Deletar documentos associados
  await db.delete(cppdInitiativeDocuments).where(eq(cppdInitiativeDocuments.initiativeId, id));
  
  // Deletar a iniciativa
  await db.delete(cppdInitiatives)
    .where(and(
      eq(cppdInitiatives.id, id),
      eq(cppdInitiatives.organizationId, organizationId)
    ));
  
  return { success: true };
}

// ==========================================
// ESTATÍSTICAS
// ==========================================

export async function getInitiativeStats(organizationId: number, year?: number) {
  const db = await getDb();
  if (!db) return {
    total: 0,
    planejado: 0,
    em_andamento: 0,
    concluido: 0,
    atrasado: 0,
    cancelado: 0,
    byQuarter: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
    byCategory: {},
    byPriority: { baixa: 0, media: 0, alta: 0, critica: 0 },
    progressoMedio: 0,
  };
  
  const currentYear = year || new Date().getFullYear();
  
  const initiatives = await db.select()
    .from(cppdInitiatives)
    .where(and(
      eq(cppdInitiatives.organizationId, organizationId),
      eq(cppdInitiatives.year, currentYear)
    ));
  
  const stats = {
    total: initiatives.length,
    planejado: initiatives.filter(i => i.status === 'planejado').length,
    em_andamento: initiatives.filter(i => i.status === 'em_andamento').length,
    concluido: initiatives.filter(i => i.status === 'concluido').length,
    atrasado: initiatives.filter(i => i.status === 'atrasado').length,
    cancelado: initiatives.filter(i => i.status === 'cancelado').length,
    byQuarter: {
      Q1: initiatives.filter(i => i.quarter === 'Q1').length,
      Q2: initiatives.filter(i => i.quarter === 'Q2').length,
      Q3: initiatives.filter(i => i.quarter === 'Q3').length,
      Q4: initiatives.filter(i => i.quarter === 'Q4').length,
    },
    byCategory: {} as Record<string, number>,
    byPriority: {
      baixa: initiatives.filter(i => i.priority === 'baixa').length,
      media: initiatives.filter(i => i.priority === 'media').length,
      alta: initiatives.filter(i => i.priority === 'alta').length,
      critica: initiatives.filter(i => i.priority === 'critica').length,
    },
    progressoMedio: initiatives.length > 0 
      ? Math.round(initiatives.reduce((sum, i) => sum + (i.progress || 0), 0) / initiatives.length)
      : 0,
  };
  
  // Contar por categoria
  initiatives.forEach(i => {
    const cat = i.category || 'outro';
    stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
  });
  
  return stats;
}

// ==========================================
// TAREFAS
// ==========================================

export async function listInitiativeTasks(initiativeId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const tasks = await db.select()
    .from(cppdInitiativeTasks)
    .where(eq(cppdInitiativeTasks.initiativeId, initiativeId))
    .orderBy(asc(cppdInitiativeTasks.sortOrder));
  
  return tasks;
}

export async function createInitiativeTask(input: {
  initiativeId: number;
  title: string;
  description?: string;
  dueDate?: string;
  assignedToId?: number;
  assignedToName?: string;
  createdById?: number;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const [result] = await db.insert(cppdInitiativeTasks).values({
    initiativeId: input.initiativeId,
    title: input.title,
    description: input.description,
    status: 'pendente',
    dueDate: input.dueDate,
    assignedToId: input.assignedToId,
    assignedToName: input.assignedToName,
    createdById: input.createdById,
  }).returning({ id: cppdInitiativeTasks.id });
  
  return { id: result.id };
}

export async function updateInitiativeTask(id: number, input: {
  title?: string;
  description?: string;
  status?: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  dueDate?: string;
  completedAt?: string;
  assignedToId?: number;
  assignedToName?: string;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.update(cppdInitiativeTasks)
    .set(input)
    .where(eq(cppdInitiativeTasks.id, id));
  
  return { success: true };
}

export async function deleteInitiativeTask(id: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.delete(cppdInitiativeTasks).where(eq(cppdInitiativeTasks.id, id));
  return { success: true };
}

// ==========================================
// DOCUMENTOS
// ==========================================

export async function listInitiativeDocuments(initiativeId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const documents = await db.select()
    .from(cppdInitiativeDocuments)
    .where(eq(cppdInitiativeDocuments.initiativeId, initiativeId))
    .orderBy(desc(cppdInitiativeDocuments.createdAt));
  
  return documents;
}

export async function addInitiativeDocument(input: {
  initiativeId: number;
  documentId?: number;
  fileName?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  description?: string;
  uploadedById?: number;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const [result] = await db.insert(cppdInitiativeDocuments).values(input).returning({ id: cppdInitiativeDocuments.id });
  return { id: result.id };
}

export async function removeInitiativeDocument(id: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.delete(cppdInitiativeDocuments).where(eq(cppdInitiativeDocuments.id, id));
  return { success: true };
}

// ==========================================
// VERIFICAÇÃO DE ATRASOS
// ==========================================

export async function checkOverdueItems(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  const overdueItems: Array<{
    type: 'initiative' | 'task';
    id: number;
    title: string;
    dueDate: string;
    daysOverdue: number;
    responsibleEmail?: string;
  }> = [];
  
  // Verificar iniciativas atrasadas
  const initiatives = await db.select()
    .from(cppdInitiatives)
    .where(and(
      eq(cppdInitiatives.organizationId, organizationId),
      or(
        eq(cppdInitiatives.status, 'planejado'),
        eq(cppdInitiatives.status, 'em_andamento')
      )
    ));
  
  for (const initiative of initiatives) {
    if (initiative.plannedEndDate) {
      const dueDate = new Date(initiative.plannedEndDate);
      if (dueDate < now) {
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        overdueItems.push({
          type: 'initiative',
          id: initiative.id,
          title: initiative.title,
          dueDate: initiative.plannedEndDate,
          daysOverdue,
          responsibleEmail: initiative.responsibleEmail || undefined,
        });
        
        // Atualizar status para atrasado
        if (initiative.status !== 'atrasado') {
          await db.update(cppdInitiatives)
            .set({ status: 'atrasado' })
            .where(eq(cppdInitiatives.id, initiative.id));
        }
      }
    }
  }
  
  // Verificar tarefas atrasadas
  const tasks = await db.select()
    .from(cppdInitiativeTasks)
    .where(or(
      eq(cppdInitiativeTasks.status, 'pendente'),
      eq(cppdInitiativeTasks.status, 'em_andamento')
    ));
  
  for (const task of tasks) {
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      if (dueDate < now) {
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        overdueItems.push({
          type: 'task',
          id: task.id,
          title: task.title,
          dueDate: task.dueDate,
          daysOverdue,
        });
      }
    }
  }
  
  return overdueItems;
}

// ==========================================
// ROADMAP
// ==========================================

export async function getRoadmap(organizationId: number, year: number) {
  const db = await getDb();
  if (!db) return { Q1: [], Q2: [], Q3: [], Q4: [], semTrimestre: [] };
  
  const initiatives = await db.select()
    .from(cppdInitiatives)
    .where(and(
      eq(cppdInitiatives.organizationId, organizationId),
      eq(cppdInitiatives.year, year)
    ))
    .orderBy(asc(cppdInitiatives.quarter), asc(cppdInitiatives.plannedStartDate));
  
  const roadmap = {
    Q1: initiatives.filter(i => i.quarter === 'Q1'),
    Q2: initiatives.filter(i => i.quarter === 'Q2'),
    Q3: initiatives.filter(i => i.quarter === 'Q3'),
    Q4: initiatives.filter(i => i.quarter === 'Q4'),
    semTrimestre: initiatives.filter(i => !i.quarter),
  };
  
  return roadmap;
}
