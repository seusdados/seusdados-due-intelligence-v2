/**
 * Seusdados Due Diligence - Incident Service
 * Backend service for incident management
 */

import { getDb } from "./db";
import { incidents, incidentLogs, incidentEmergencyContacts } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from '@trpc/server';

// Default phases for incident response
export const DEFAULT_PHASES = [
  {
    id: 1,
    name: "Identificação",
    description: "Identificar e registrar o incidente de segurança",
    status: "pending",
    items: [
      { id: "1-1", title: "Registrar data/hora do conhecimento", description: "Documentar quando o incidente foi detectado", isChecked: false, isRequired: true },
      { id: "1-2", title: "Identificar sistemas afetados", description: "Listar todos os sistemas e bases de dados impactados", isChecked: false, isRequired: true },
      { id: "1-3", title: "Classificar tipo de incidente", description: "Determinar se é vazamento, acesso indevido, etc.", isChecked: false, isRequired: true },
      { id: "1-4", title: "Estimar número de titulares afetados", description: "Calcular quantidade aproximada de pessoas impactadas", isChecked: false, isRequired: true },
      { id: "1-5", title: "Notificar equipe de resposta", description: "Acionar DPO e equipe técnica responsável", isChecked: false, isRequired: true }
    ]
  },
  {
    id: 2,
    name: "Contenção",
    description: "Conter o incidente e prevenir danos adicionais",
    status: "pending",
    items: [
      { id: "2-1", title: "Isolar sistemas afetados", description: "Desconectar ou isolar sistemas comprometidos", isChecked: false, isRequired: true },
      { id: "2-2", title: "Preservar evidências", description: "Fazer backup de logs e dados relevantes", isChecked: false, isRequired: true },
      { id: "2-3", title: "Bloquear acessos suspeitos", description: "Revogar credenciais comprometidas", isChecked: false, isRequired: true },
      { id: "2-4", title: "Documentar ações tomadas", description: "Registrar todas as medidas de contenção", isChecked: false, isRequired: false }
    ]
  },
  {
    id: 3,
    name: "Comunicação",
    description: "Comunicar às partes interessadas conforme LGPD",
    status: "pending",
    items: [
      { id: "3-1", title: "Avaliar necessidade de comunicação ANPD", description: "Verificar se incidente requer notificação à autoridade", isChecked: false, isRequired: true },
      { id: "3-2", title: "Preparar comunicação ANPD", description: "Preencher formulário de comunicação de incidente", isChecked: false, isRequired: false },
      { id: "3-3", title: "Enviar comunicação ANPD", description: "Submeter notificação no prazo de 3 dias úteis", isChecked: false, isRequired: false },
      { id: "3-4", title: "Avaliar comunicação aos titulares", description: "Verificar se titulares devem ser notificados", isChecked: false, isRequired: true },
      { id: "3-5", title: "Comunicar titulares afetados", description: "Enviar notificação clara e objetiva", isChecked: false, isRequired: false }
    ]
  },
  {
    id: 4,
    name: "Remediação",
    description: "Remediar vulnerabilidades e restaurar operações",
    status: "pending",
    items: [
      { id: "4-1", title: "Identificar causa raiz", description: "Determinar como o incidente ocorreu", isChecked: false, isRequired: true },
      { id: "4-2", title: "Corrigir vulnerabilidades", description: "Implementar correções técnicas necessárias", isChecked: false, isRequired: true },
      { id: "4-3", title: "Restaurar sistemas", description: "Retornar operações ao estado normal", isChecked: false, isRequired: true },
      { id: "4-4", title: "Validar correções", description: "Testar se as correções foram efetivas", isChecked: false, isRequired: true }
    ]
  },
  {
    id: 5,
    name: "Encerramento",
    description: "Documentar lições aprendidas e encerrar incidente",
    status: "pending",
    items: [
      { id: "5-1", title: "Elaborar relatório final", description: "Documentar todo o ciclo do incidente", isChecked: false, isRequired: true },
      { id: "5-2", title: "Registrar lições aprendidas", description: "Identificar melhorias para prevenir recorrência", isChecked: false, isRequired: true },
      { id: "5-3", title: "Atualizar procedimentos", description: "Revisar políticas e processos se necessário", isChecked: false, isRequired: false },
      { id: "5-4", title: "Arquivar documentação", description: "Guardar registros por período legal", isChecked: false, isRequired: true },
      { id: "5-5", title: "Encerrar incidente", description: "Marcar incidente como resolvido", isChecked: false, isRequired: true }
    ]
  }
];

// Calculate business days deadline (3 business days for ANPD)
export function calculateBusinessDaysDeadline(startDate: Date, businessDays: number = 3): Date {
  const result = new Date(startDate);
  let daysAdded = 0;
  
  while (daysAdded < businessDays) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }
  
  return result;
}

// Create incident
export async function createIncident(data: {
  organizationId: number;
  title: string;
  description?: string;
  detectedAt: Date;
  knowledgeAt: Date;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  createdById: number;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  const anpdDeadline = calculateBusinessDaysDeadline(data.knowledgeAt, 3);
  
  const [result] = await db.insert(incidents).values({
    organizationId: data.organizationId,
    title: data.title,
    description: data.description || null,
    status: 'active',
    riskLevel: data.riskLevel || 'medium',
    detectedAt: data.detectedAt.toISOString().slice(0, 19).replace('T', ' '),
    knowledgeAt: data.knowledgeAt.toISOString().slice(0, 19).replace('T', ' '),
    currentPhaseId: 1,
    phases: JSON.stringify(DEFAULT_PHASES),
    triageAnswers: JSON.stringify([]),
    deadlines: JSON.stringify([
      {
        type: 'anpd',
        dueDate: anpdDeadline.toISOString(),
        status: 'pending',
        description: 'Prazo para comunicação à ANPD (3 dias úteis)'
      }
    ]),
    createdById: data.createdById,
  }).returning({ id: incidents.id });

  const insertId = result[0].id;
  
  // Add initial log entry
  await addLogEntry({
    incidentId: insertId,
    message: `Incidente "${data.title}" iniciado`,
    type: 'system',
    userId: data.createdById,
  });

  return getIncidentById(insertId);
}

// Get incident by ID
export async function getIncidentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [incident] = await db.select().from(incidents).where(eq(incidents.id, id));
  
  if (!incident) return null;
  
  // Get logs
  const logs = await db.select()
    .from(incidentLogs)
    .where(eq(incidentLogs.incidentId, id))
    .orderBy(desc(incidentLogs.timestamp));
  
  return {
    ...incident,
    phases: typeof incident.phases === 'string' ? JSON.parse(incident.phases) : incident.phases,
    triageAnswers: incident.triageAnswers ? (typeof incident.triageAnswers === 'string' ? JSON.parse(incident.triageAnswers) : incident.triageAnswers) : [],
    triageResult: incident.triageResult ? (typeof incident.triageResult === 'string' ? JSON.parse(incident.triageResult) : incident.triageResult) : null,
    deadlines: incident.deadlines ? (typeof incident.deadlines === 'string' ? JSON.parse(incident.deadlines) : incident.deadlines) : [],
    tags: incident.tags ? (typeof incident.tags === 'string' ? JSON.parse(incident.tags) : incident.tags) : [],
    attachments: incident.attachments ? (typeof incident.attachments === 'string' ? JSON.parse(incident.attachments) : incident.attachments) : [],
    logs: logs.map(log => ({
      ...log,
      metadata: log.metadata ? (typeof log.metadata === 'string' ? JSON.parse(log.metadata as string) : log.metadata) : null
    }))
  };
}

// List incidents by organization
export async function listIncidents(organizationId: number, params?: {
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const db = await getDb();
  if (!db) return { incidents: [], total: 0, page: 1, pageSize: 10 };
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 10;
  const offset = (page - 1) * pageSize;

  const baseConditions = [eq(incidents.organizationId, organizationId)];
  if (params?.status) {
    baseConditions.push(eq(incidents.status, params.status as any));
  }

  const results = await db.select().from(incidents).where(and(...baseConditions))
    .orderBy(desc(incidents.createdAt))
    .limit(pageSize)
    .offset(offset);

  // Get total count
  const [countResult] = await db.select({ count: sql<number>`count(*)` })
    .from(incidents)
    .where(eq(incidents.organizationId, organizationId));

  return {
    incidents: results.map(incident => ({
      ...incident,
      phases: typeof incident.phases === 'string' ? JSON.parse(incident.phases) : incident.phases,
      triageAnswers: incident.triageAnswers ? (typeof incident.triageAnswers === 'string' ? JSON.parse(incident.triageAnswers) : incident.triageAnswers) : [],
      triageResult: incident.triageResult ? (typeof incident.triageResult === 'string' ? JSON.parse(incident.triageResult) : incident.triageResult) : null,
      deadlines: incident.deadlines ? (typeof incident.deadlines === 'string' ? JSON.parse(incident.deadlines) : incident.deadlines) : [],
    })),
    total: countResult?.count || 0,
    page,
    pageSize
  };
}

// Update incident
export async function updateIncident(id: number, data: {
  title?: string;
  description?: string;
  status?: 'standby' | 'active' | 'contained' | 'remediated' | 'closed';
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  currentPhaseId?: number;
  phases?: any;
  triageAnswers?: any;
  triageResult?: any;
  closedAt?: Date;
}) {
  const db = await getDb();
  if (!db) return null;
  const updateData: any = {};
  
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.riskLevel !== undefined) updateData.riskLevel = data.riskLevel;
  if (data.currentPhaseId !== undefined) updateData.currentPhaseId = data.currentPhaseId;
  if (data.phases !== undefined) updateData.phases = JSON.stringify(data.phases);
  if (data.triageAnswers !== undefined) updateData.triageAnswers = JSON.stringify(data.triageAnswers);
  if (data.triageResult !== undefined) updateData.triageResult = JSON.stringify(data.triageResult);
  if (data.closedAt !== undefined) updateData.closedAt = data.closedAt.toISOString().slice(0, 19).replace('T', ' ');

  await db.update(incidents).set(updateData).where(eq(incidents.id, id));
  
  return getIncidentById(id);
}

// Add log entry
export async function addLogEntry(data: {
  incidentId: number;
  message: string;
  type?: 'action' | 'system' | 'alert' | 'communication';
  userId?: number;
  userName?: string;
  phaseId?: number;
  metadata?: any;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  const [result] = await db.insert(incidentLogs).values({
    incidentId: data.incidentId,
    message: data.message,
    type: data.type || 'action',
    userId: data.userId || null,
    userName: data.userName || null,
    phaseId: data.phaseId || null,
    metadata: data.metadata ? JSON.stringify(data.metadata) : null,
  }).returning({ id: incidentLogs.id });

  return {
    id: result.id,
    ...data,
    timestamp: new Date()
  };
}

// Toggle checklist item
export async function toggleChecklistItem(
  incidentId: number,
  phaseId: number,
  itemId: string,
  userId: number,
  userName: string,
  isChecked: boolean
) {
  const incident = await getIncidentById(incidentId);
  if (!incident) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Incidente não encontrado' });

  const phases = incident.phases.map((phase: any) => {
    if (phase.id !== phaseId) return phase;
    
    const items = phase.items.map((item: any) => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        isChecked,
        checkedAt: isChecked ? new Date().toISOString() : undefined,
        checkedBy: isChecked ? userName : undefined
      };
    });

    // Check if all required items are checked
    const allRequiredChecked = items
      .filter((i: any) => i.isRequired)
      .every((i: any) => i.isChecked);

    return {
      ...phase,
      items,
      status: allRequiredChecked ? 'completed' : phase.status,
      completedAt: allRequiredChecked ? new Date().toISOString() : undefined
    };
  });

  await updateIncident(incidentId, { phases });

  // Add log entry
  const phase = phases.find((p: any) => p.id === phaseId);
  const item = phase?.items.find((i: any) => i.id === itemId);
  
  await addLogEntry({
    incidentId,
    message: isChecked 
      ? `Item "${item?.title}" marcado como concluído`
      : `Item "${item?.title}" desmarcado`,
    type: 'action',
    userId,
    userName,
    phaseId
  });

  return getIncidentById(incidentId);
}

// Get incident statistics
export async function getIncidentStats(organizationId: number) {
  const db = await getDb();
  if (!db) return { totalActive: 0, totalClosed: 0, averageResolutionTime: 0, complianceRate: 100, byRiskLevel: { low: 0, medium: 0, high: 0, critical: 0 }, byPhase: {} };
  const [activeCount] = await db.select({ count: sql<number>`count(*)` })
    .from(incidents)
    .where(and(
      eq(incidents.organizationId, organizationId),
      eq(incidents.status, 'active')
    ));

  const [closedCount] = await db.select({ count: sql<number>`count(*)` })
    .from(incidents)
    .where(and(
      eq(incidents.organizationId, organizationId),
      eq(incidents.status, 'closed')
    ));

  return {
    totalActive: activeCount?.count || 0,
    totalClosed: closedCount?.count || 0,
    averageResolutionTime: 0,
    complianceRate: 100,
    byRiskLevel: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    },
    byPhase: {}
  };
}

// Get emergency contacts
export async function getEmergencyContacts(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select()
    .from(incidentEmergencyContacts)
    .where(eq(incidentEmergencyContacts.organizationId, organizationId))
    .orderBy(incidentEmergencyContacts.priority);
}

// Create/update emergency contact
export async function upsertEmergencyContact(data: {
  id?: number;
  organizationId: number;
  role: string;
  name: string;
  email: string;
  phone: string;
  priority?: number;
  isAvailable?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];
  if (data.id) {
    await db.update(incidentEmergencyContacts)
      .set({
        role: data.role,
        name: data.name,
        email: data.email,
        phone: data.phone,
        priority: data.priority || 1,
        isAvailable: data.isAvailable !== undefined ? (data.isAvailable ? 1 : 0) : 1,
      })
      .where(eq(incidentEmergencyContacts.id, data.id));
    
    return db.select().from(incidentEmergencyContacts).where(eq(incidentEmergencyContacts.id, data.id));
  } else {
    const [result] = await db.insert(incidentEmergencyContacts).values({
      organizationId: data.organizationId,
      role: data.role,
      name: data.name,
      email: data.email,
      phone: data.phone,
      priority: data.priority || 1,
      isAvailable: data.isAvailable !== undefined ? (data.isAvailable ? 1 : 0) : 1,
    }).returning({ id: incidentEmergencyContacts.id });
    
    return db.select().from(incidentEmergencyContacts).where(eq(incidentEmergencyContacts.id, result.id));
  }
}
