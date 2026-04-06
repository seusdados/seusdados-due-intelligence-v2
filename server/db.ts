import { eq, and, or, desc, sql, like, gte, lte, isNotNull, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../drizzle/schema";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { 
  users, 
  organizations,
  userOrganizations,
  thirdParties,
  complianceAssessments,
  complianceResponses,
  thirdPartyAssessments,
  thirdPartyResponses,
  actionPlans,
  documents,
  notifications,
  auditLogs,
  accessLinks,
  evidences,
  reminderSettings,
  reminderLogs,
  aiProviderConfigs,
  aiOrganizationInstructions,
  aiChatSessions,
  aiChatMessages,
  aiPromptTemplates,
  aiGeneratedResults,
  userInvites,
  assessmentDocuments,
  contractAnalyses,
  contractAnalysisMaps,
  contractChecklistItems,
  contractRiskItems,
  contractAnalysisHistory,
  lgpdClauseTemplates,
  lgpdClauseTemplateHistory,
  governancaMeetings, 
  governancaCppdMembers,
  clauseAuditLog,
  actionPlanEvidence,
  contractAnalysisClauses,
  actionPlanHistory,
  unifiedAssessments
} from "../drizzle/schema";

// Type definitions using InferSelectModel and InferInsertModel
type InsertUser = InferInsertModel<typeof users>;
type Organization = InferSelectModel<typeof organizations>;
type InsertOrganization = InferInsertModel<typeof organizations>;
type InsertUserOrganization = InferInsertModel<typeof userOrganizations>;
type InsertThirdParty = InferInsertModel<typeof thirdParties>;
type InsertComplianceAssessment = InferInsertModel<typeof complianceAssessments>;
type InsertComplianceResponse = InferInsertModel<typeof complianceResponses>;
type InsertThirdPartyAssessment = InferInsertModel<typeof thirdPartyAssessments>;
type InsertThirdPartyResponse = InferInsertModel<typeof thirdPartyResponses>;
type InsertActionPlan = InferInsertModel<typeof actionPlans>;
type InsertDocument = InferInsertModel<typeof documents>;
type InsertNotification = InferInsertModel<typeof notifications>;
type InsertAuditLog = InferInsertModel<typeof auditLogs>;
type InsertAccessLink = InferInsertModel<typeof accessLinks>;
type InsertEvidence = InferInsertModel<typeof evidences>;
type InsertReminderSetting = InferInsertModel<typeof reminderSettings>;
type InsertReminderLog = InferInsertModel<typeof reminderLogs>;
type InsertAiProviderConfig = InferInsertModel<typeof aiProviderConfigs>;
type InsertAiOrganizationInstruction = InferInsertModel<typeof aiOrganizationInstructions>;
type InsertAiChatSession = InferInsertModel<typeof aiChatSessions>;
type InsertAiChatMessage = InferInsertModel<typeof aiChatMessages>;
type InsertAiPromptTemplate = InferInsertModel<typeof aiPromptTemplates>;
type InsertAiGeneratedResult = InferInsertModel<typeof aiGeneratedResults>;
type InsertUserInvite = InferInsertModel<typeof userInvites>;
type InsertAssessmentDocument = InferInsertModel<typeof assessmentDocuments>;
type InsertContractAnalysis = InferInsertModel<typeof contractAnalyses>;
type InsertContractAnalysisMap = InferInsertModel<typeof contractAnalysisMaps>;
type InsertContractChecklistItem = InferInsertModel<typeof contractChecklistItems>;
type InsertContractRiskItem = InferInsertModel<typeof contractRiskItems>;
type InsertContractAnalysisHistory = InferInsertModel<typeof contractAnalysisHistory>;
type InsertLgpdClauseTemplate = InferInsertModel<typeof lgpdClauseTemplates>;
type InsertLgpdClauseTemplateHistory = InferInsertModel<typeof lgpdClauseTemplateHistory>;
type InsertClauseAuditLog = InferInsertModel<typeof clauseAuditLog>;
type InsertActionPlanEvidence = InferInsertModel<typeof actionPlanEvidence>;
type InsertContractAnalysisClause = InferInsertModel<typeof contractAnalysisClauses>;
import { ENV } from './_core/env';
import { logger } from './_core/logger';
import { TRPCError } from '@trpc/server';

let _db: any = null;
let _pool: pg.Pool | null = null;

export async function getDb() {
  if (_db) return _db;

  const url = process.env.DATABASE_URL;
  if (!url) {
    logger.error("[Database] DATABASE_URL not set");
    return null;
  }

  try {
    // Strip sslmode from URL to prevent pg driver from overriding SSL config
    // (pg treats sslmode=require as verify-full, rejecting DO self-signed certs)
    const cleanUrl = url.replace(/[?&]sslmode=[^&]*/g, '').replace(/[?&]$/, '');
    // Enable SSL for any non-localhost connection (DO requires SSL for remote hosts)
    const isLocal = /localhost|127\.0\.0\.1/.test(url);
    _pool = new pg.Pool({
      connectionString: cleanUrl,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 10,
    });

    _db = drizzle(_pool, { schema });
    logger.info("[Database] Drizzle initialized with node-postgres pool");
    return _db;
  } catch (err: any) {
    logger.error("[Database] Failed to init db:", err?.message || String(err));
    _db = null;
    return null;
  }
}

/**
 * Helper: extrai insertId de forma segura.
 * Com node-postgres + drizzle, db.insert().values().returning({ id: table.id })
 * retorna [{ id: number }].
 * Sem .returning(), não há insertId disponível.
 */
export function extractInsertId(result: any): number {
  // Caso 1: result é [{ id: N }] (drizzle .returning())
  if (Array.isArray(result) && result.length > 0 && result[0]?.id !== undefined) {
    return Number(result[0].id);
  }
  // Caso 2: result tem insertId direto
  if (result?.insertId !== undefined) return Number(result.insertId);
  // Caso 3: result tem rows[0].id (pg QueryResult)
  if (result?.rows?.[0]?.id !== undefined) return Number(result.rows[0].id);
  logger.warn('[extractInsertId] Formato inesperado:', JSON.stringify(result)?.slice(0, 200));
  return 0;
}

// ==================== USERS ==
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'User openId is required for upsert' });
  }

  const db = await getDb();
  if (!db) {
    logger.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin_global';
      updateSet.role = 'admin_global';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date().toISOString();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date().toISOString();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    logger.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (result.length === 0) return undefined;
  const user = result[0];
  return {
    ...user,
    clientRoles: typeof user.clientRoles === 'string' ? JSON.parse(user.clientRoles) : (user.clientRoles || []),
  };
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (result.length === 0) return undefined;
  const user = result[0];
  return {
    ...user,
    clientRoles: typeof user.clientRoles === 'string' ? JSON.parse(user.clientRoles) : (user.clientRoles || []),
  };
}

// Busca usuário por e-mail no escopo de uma organização específica (multi-tenant)
export async function getUserByEmailAndOrg(email: string, organizationId: number | null) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions = organizationId
    ? and(eq(users.email, email), eq(users.organizationId, organizationId))
    : and(eq(users.email, email), isNull(users.organizationId));
  const result = await db.select().from(users).where(conditions).limit(1);
  if (result.length === 0) return undefined;
  const user = result[0];
  return {
    ...user,
    clientRoles: typeof user.clientRoles === 'string' ? JSON.parse(user.clientRoles) : (user.clientRoles || []),
  };
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(users).orderBy(desc(users.createdAt));
  return result.map(u => ({
    ...u,
    clientRoles: typeof u.clientRoles === 'string' ? JSON.parse(u.clientRoles) : (u.clientRoles || []),
    // Não expor o hash real da senha - apenas indicar se existe
    passwordHash: u.passwordHash ? '__SET__' : null,
    // Não expor o token de setup
    setupToken: u.setupToken ? '__SET__' : null,
  }));
}

export async function getUsersByOrganization(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(users).where(eq(users.organizationId, organizationId));
  return result.map(u => ({
    ...u,
    clientRoles: typeof u.clientRoles === 'string' ? JSON.parse(u.clientRoles) : (u.clientRoles || []),
    // Não expor o hash real da senha - apenas indicar se existe
    passwordHash: u.passwordHash ? '__SET__' : null,
    // Não expor o token de setup
    setupToken: u.setupToken ? '__SET__' : null,
  }));
}

export async function updateUser(id: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) return;
  // Serializar clientRoles se for um array
  const processedData = {
    ...data,
    ...(Array.isArray(data.clientRoles) && { clientRoles: JSON.stringify(data.clientRoles) }),
  };
  await db.update(users).set(processedData).where(eq(users.id, id));
}

export async function createUser(data: InsertUser) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  // Serializar clientRoles se for um array
  const processedData = {
    ...data,
    ...(Array.isArray(data.clientRoles) && { clientRoles: JSON.stringify(data.clientRoles) }),
  };
  const result = await db.insert(users).values(processedData).returning({ id: users.id });
  return result[0].id;
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(users).where(eq(users.id, id));
}

// Soft delete - apenas desativa o usuário
export async function softDeleteUser(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ isActive: false }).where(eq(users.id, id));
}

// Obter logs de auditoria de um usuário
export async function getUserAuditLogs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).where(eq(auditLogs.userId, userId)).orderBy(desc(auditLogs.createdAt));
}

// Obter logs de auditoria por organização
export async function getOrganizationAuditLogs(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).where(eq(auditLogs.organizationId, organizationId)).orderBy(desc(auditLogs.createdAt));
}

// Obter todos os logs de auditoria (para admin global)
export async function getAllAuditLogs(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

// ==================== ORGANIZATIONS ====================
export async function createOrganization(data: InsertOrganization) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  const result = await db.insert(organizations).values(data).returning({ id: organizations.id });
  return result[0].id;
}

export async function getOrganizationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllOrganizations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(organizations).orderBy(desc(organizations.createdAt));
}

export async function updateOrganization(id: number, data: Partial<InsertOrganization>) {
  const db = await getDb();
  if (!db) return;
  await db.update(organizations).set(data).where(eq(organizations.id, id));
}

export async function deleteOrganization(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(organizations).set({ isActive: false }).where(eq(organizations.id, id));
}

// ==================== USER-ORGANIZATION MAPPING ====================
export async function addUserToOrganization(data: InsertUserOrganization) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  await db.insert(userOrganizations).values(data);
}

export async function getUserOrganizations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({
      id: userOrganizations.id,
      organizationId: userOrganizations.organizationId,
      accessLevel: userOrganizations.accessLevel,
      organization: organizations
    })
    .from(userOrganizations)
    .innerJoin(organizations, eq(userOrganizations.organizationId, organizations.id))
    .where(eq(userOrganizations.userId, userId));
  return result;
}

export async function removeUserFromOrganization(userId: number, organizationId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(userOrganizations).where(
    and(
      eq(userOrganizations.userId, userId),
      eq(userOrganizations.organizationId, organizationId)
    )
  );
}

// ==================== THIRD PARTIES ====================
export async function createThirdParty(data: InsertThirdParty) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  const result = await db.insert(thirdParties).values(data).returning({ id: thirdParties.id });
  return result[0].id;
}

export async function getThirdPartyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(thirdParties).where(eq(thirdParties.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getThirdPartiesByOrganization(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(thirdParties)
    .where(and(eq(thirdParties.organizationId, organizationId), eq(thirdParties.isActive, true)))
    .orderBy(desc(thirdParties.createdAt));
}

export async function updateThirdParty(id: number, data: Partial<InsertThirdParty>) {
  const db = await getDb();
  if (!db) return;
  await db.update(thirdParties).set(data).where(eq(thirdParties.id, id));
}

export async function deleteThirdParty(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(thirdParties).set({ isActive: false }).where(eq(thirdParties.id, id));
}

// ==================== COMPLIANCE ASSESSMENTS ====================
export async function createComplianceAssessment(data: InsertComplianceAssessment) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  const result = await db.insert(complianceAssessments).values(data).returning({ id: complianceAssessments.id });
  return result[0].id;
}

export async function getComplianceAssessmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(complianceAssessments).where(eq(complianceAssessments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getComplianceAssessmentsByOrganization(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(complianceAssessments)
    .where(eq(complianceAssessments.organizationId, organizationId))
    .orderBy(desc(complianceAssessments.createdAt));
}

export async function getComplianceAssessmentsByUserLink(organizationId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(complianceAssessments)
    .where(and(
      eq(complianceAssessments.organizationId, organizationId),
      eq(complianceAssessments.createdById, userId)
    ))
    .orderBy(desc(complianceAssessments.createdAt));
}

export async function updateComplianceAssessment(id: number, data: Partial<InsertComplianceAssessment>) {
  const db = await getDb();
  if (!db) return;
  await db.update(complianceAssessments).set(data).where(eq(complianceAssessments.id, id));
}

export async function deleteComplianceAssessment(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(complianceAssessments).set({ status: 'arquivada' }).where(eq(complianceAssessments.id, id));
}

// ==================== COMPLIANCE RESPONSES ====================
export async function saveComplianceResponse(data: InsertComplianceResponse) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  // Buscar resposta existente usando assessmentId, domainId e questionId
  const existing = await db.select().from(complianceResponses)
    .where(and(
      eq(complianceResponses.assessmentId, data.assessmentId),
      eq(complianceResponses.domainId, data.domainId),
      eq(complianceResponses.questionId, data.questionId)
    )).limit(1);
  
  if (existing.length > 0) {
    // Atualizar resposta existente
    await db.update(complianceResponses).set(data).where(eq(complianceResponses.id, existing[0].id));
    return existing[0].id;
  } else {
    // Criar nova resposta
    const result = await db.insert(complianceResponses).values(data).returning({ id: complianceResponses.id });
    return result[0].id;
  }
}

export async function getComplianceResponsesByAssessment(assessmentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(complianceResponses).where(eq(complianceResponses.assessmentId, assessmentId));
}

// ==================== THIRD PARTY ASSESSMENTS ====================
export async function createThirdPartyAssessment(data: InsertThirdPartyAssessment) {
  try {
    const db = await getDb();
    if (!db) {
      logger.error('[createThirdPartyAssessment] Database not available');
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    }
    logger.info('[createThirdPartyAssessment] Creating assessment:', { organizationId: data.organizationId, thirdPartyId: data.thirdPartyId });
    const result = await db.insert(thirdPartyAssessments).values(data).returning({ id: thirdPartyAssessments.id });
    const newId = result[0]?.id;
    if (!newId) {
      logger.error('[createThirdPartyAssessment] No id returned from database');
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to get id from database' });
    }
    logger.info('[createThirdPartyAssessment] Assessment created with ID:', newId);
    return newId;
  } catch (error) {
    logger.error('[createThirdPartyAssessment] Error:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export async function getThirdPartyAssessmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(thirdPartyAssessments).where(eq(thirdPartyAssessments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getThirdPartyAssessmentsByOrganization(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(thirdPartyAssessments)
    .where(eq(thirdPartyAssessments.organizationId, organizationId))
    .orderBy(desc(thirdPartyAssessments.createdAt));
}

export async function getThirdPartyAssessmentsByThirdParty(thirdPartyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(thirdPartyAssessments)
    .where(eq(thirdPartyAssessments.thirdPartyId, thirdPartyId))
    .orderBy(desc(thirdPartyAssessments.createdAt));
}


export async function getReusableThirdPartyAssessment(organizationId: number, thirdPartyId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(thirdPartyAssessments)
    .where(and(
      eq(thirdPartyAssessments.organizationId, organizationId),
      eq(thirdPartyAssessments.thirdPartyId, thirdPartyId),
      or(
        eq(thirdPartyAssessments.status, 'rascunho'),
        eq(thirdPartyAssessments.status, 'em_andamento')
      )
    ))
    .orderBy(desc(thirdPartyAssessments.updatedAt))
    .limit(1);
  return result[0];
}

export async function updateThirdPartyAssessment(id: number, data: Partial<InsertThirdPartyAssessment>) {
  const db = await getDb();
  if (!db) return;
  await db.update(thirdPartyAssessments).set(data).where(eq(thirdPartyAssessments.id, id));
}

// ==================== THIRD PARTY RESPONSES ====================
export async function saveThirdPartyResponse(data: InsertThirdPartyResponse) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const existing = await db.select().from(thirdPartyResponses)
    .where(and(
      eq(thirdPartyResponses.assessmentId, data.assessmentId),
      eq(thirdPartyResponses.questionId, data.questionId)
    )).limit(1);
  
  if (existing.length > 0) {
    await db.update(thirdPartyResponses).set(data).where(eq(thirdPartyResponses.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await db.insert(thirdPartyResponses).values(data).returning({ id: thirdPartyResponses.id });
    return result[0].id;
  }
}

export async function getThirdPartyResponsesByAssessment(assessmentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(thirdPartyResponses).where(eq(thirdPartyResponses.assessmentId, assessmentId));
}

// Alias para compatibilidade
export const getThirdPartyAssessmentResponses = getThirdPartyResponsesByAssessment;
export const upsertThirdPartyAssessmentResponse = saveThirdPartyResponse;

// ==================== ACTION PLANS ====================
export async function createActionPlan(data: InsertActionPlan) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  const result = await db.insert(actionPlans).values(data).returning({ id: actionPlans.id });
  return result[0].id;
}

export async function getActionPlansByOrganization(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  // JOIN com users para obter o nome real do responsável
  return db
    .select({
      id: actionPlans.id,
      assessmentType: actionPlans.assessmentType,
      assessmentId: actionPlans.assessmentId,
      organizationId: actionPlans.organizationId,
      title: actionPlans.title,
      description: actionPlans.description,
      priority: actionPlans.priority,
      status: actionPlans.status,
      dueDate: actionPlans.dueDate,
      responsibleId: actionPlans.responsibleId,
      responsibleName: sql<string | null>`COALESCE(${users.name}, ${actionPlans.responsibleName})`.as('responsibleName'),
      observations: actionPlans.observations,
      clientRejectionReason: actionPlans.clientRejectionReason,
      clientCompletedAt: actionPlans.clientCompletedAt,
      clientCompletedById: actionPlans.clientCompletedById,
      notes: actionPlans.notes,
      validationRejectionReason: actionPlans.validationRejectionReason,
      validatorName: actionPlans.validatorName,
      validatedAt: actionPlans.validatedAt,
      submittedForValidationAt: actionPlans.submittedForValidationAt,
      validatorId: actionPlans.validatorId,
      sourceQuestionKey: actionPlans.sourceQuestionKey,
      sourceQuestionText: actionPlans.sourceQuestionText,
      sourceDomainName: actionPlans.sourceDomainName,
      sourceSelectedLevel: actionPlans.sourceSelectedLevel,
      sourceSelectedAnswer: actionPlans.sourceSelectedAnswer,
      createdAt: actionPlans.createdAt,
      updatedAt: actionPlans.updatedAt,
    })
    .from(actionPlans)
    .leftJoin(users, eq(users.id, actionPlans.responsibleId))
    .where(eq(actionPlans.organizationId, organizationId))
    .orderBy(desc(actionPlans.createdAt));
}

export async function getActionPlansByAssessment(assessmentType: 'compliance' | 'third_party' | 'contract_analysis' | 'dpia', assessmentId: number) {
  const db = await getDb();
  if (!db) return [];
  // JOIN com users para obter o nome real do responsável
  const rows = await db
    .select({
      id: actionPlans.id,
      assessmentType: actionPlans.assessmentType,
      assessmentId: actionPlans.assessmentId,
      organizationId: actionPlans.organizationId,
      title: actionPlans.title,
      description: actionPlans.description,
      priority: actionPlans.priority,
      status: actionPlans.status,
      dueDate: actionPlans.dueDate,
      responsibleId: actionPlans.responsibleId,
      responsibleName: sql<string | null>`COALESCE(${users.name}, ${actionPlans.responsibleName})`.as('responsibleName'),
      observations: actionPlans.observations,
      clientRejectionReason: actionPlans.clientRejectionReason,
      clientCompletedAt: actionPlans.clientCompletedAt,
      validationRejectionReason: actionPlans.validationRejectionReason,
      validatorName: actionPlans.validatorName,
      validatedAt: actionPlans.validatedAt,
      submittedForValidationAt: actionPlans.submittedForValidationAt,
      validatorId: actionPlans.validatorId,
      sourceQuestionKey: actionPlans.sourceQuestionKey,
      sourceQuestionText: actionPlans.sourceQuestionText,
      sourceDomainName: actionPlans.sourceDomainName,
      sourceSelectedLevel: actionPlans.sourceSelectedLevel,
      sourceSelectedAnswer: actionPlans.sourceSelectedAnswer,
      createdAt: actionPlans.createdAt,
      updatedAt: actionPlans.updatedAt,
    })
    .from(actionPlans)
    .leftJoin(users, eq(users.id, actionPlans.responsibleId))
    .where(and(
      eq(actionPlans.assessmentType, assessmentType),
      eq(actionPlans.assessmentId, assessmentId)
    ))
    .orderBy(desc(actionPlans.createdAt));
  return rows;
}

export async function updateActionPlan(id: number, data: Partial<InsertActionPlan>) {
  const db = await getDb();
  if (!db) return;
  await db.update(actionPlans).set(data).where(eq(actionPlans.id, id));
}

export async function getActionPlansByResponsible(responsibleId: number) {
  const db = await getDb();
  if (!db) return [];
  // JOIN com users para obter o nome real do responsável
  return db
    .select({
      id: actionPlans.id,
      assessmentType: actionPlans.assessmentType,
      assessmentId: actionPlans.assessmentId,
      organizationId: actionPlans.organizationId,
      title: actionPlans.title,
      description: actionPlans.description,
      priority: actionPlans.priority,
      status: actionPlans.status,
      dueDate: actionPlans.dueDate,
      responsibleId: actionPlans.responsibleId,
      responsibleName: sql<string | null>`COALESCE(${users.name}, ${actionPlans.responsibleName})`.as('responsibleName'),
      observations: actionPlans.observations,
      clientRejectionReason: actionPlans.clientRejectionReason,
      clientCompletedAt: actionPlans.clientCompletedAt,
      validationRejectionReason: actionPlans.validationRejectionReason,
      validatorName: actionPlans.validatorName,
      validatedAt: actionPlans.validatedAt,
      submittedForValidationAt: actionPlans.submittedForValidationAt,
      validatorId: actionPlans.validatorId,
      createdAt: actionPlans.createdAt,
      updatedAt: actionPlans.updatedAt,
    })
    .from(actionPlans)
    .leftJoin(users, eq(users.id, actionPlans.responsibleId))
    .where(eq(actionPlans.responsibleId, responsibleId))
    .orderBy(desc(actionPlans.dueDate));
}

export async function updateActionPlanResponsible(id: number, newResponsibleId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(actionPlans)
    .set({ responsibleId: newResponsibleId })
    .where(eq(actionPlans.id, id));
}

// ==================== DOCUMENTS ====================
export async function createDocument(data: InsertDocument) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  const result = await db.insert(documents).values(data).returning({ id: documents.id });
  return result[0].id;
}

export async function getDocumentsByEntity(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documents)
    .where(and(
      eq(documents.entityType, entityType as any),
      eq(documents.entityId, entityId)
    ))
    .orderBy(desc(documents.createdAt));
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(documents).where(eq(documents.id, id));
}

// ==================== NOTIFICATIONS ====================
export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  const result = await db.insert(notifications).values(data).returning({ id: notifications.id });
  return result[0].id;
}

export async function getNotificationsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));
}

export async function markNotificationAsRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: 1 }).where(eq(notifications.id, id));
}

// ==================== AUDIT LOGS ====================
export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values(data);
}

export async function getAuditLogs(options: {
  organizationId?: number;
  entityType?: string;
  entityId?: number;
  userId?: number;
  action?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  if (options.organizationId) conditions.push(eq(auditLogs.organizationId, options.organizationId));
  if (options.entityType) conditions.push(eq(auditLogs.entityType, options.entityType));
  if (options.entityId) conditions.push(eq(auditLogs.entityId, options.entityId));
  if (options.userId) conditions.push(eq(auditLogs.userId, options.userId));
  if (options.action) conditions.push(eq(auditLogs.action, options.action));
  
  const query = db.select().from(auditLogs);
  
  if (conditions.length > 0) {
    return query
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(options.limit || 100)
      .offset(options.offset || 0);
  }
  
  return query
    .orderBy(desc(auditLogs.createdAt))
    .limit(options.limit || 100)
    .offset(options.offset || 0);
}

export async function getAuditLogsWithUser(options: {
  organizationId?: number;
  entityType?: string;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  if (options.organizationId) conditions.push(eq(auditLogs.organizationId, options.organizationId));
  if (options.entityType) conditions.push(eq(auditLogs.entityType, options.entityType));
  
  const baseQuery = db.select({
    id: auditLogs.id,
    userId: auditLogs.userId,
    organizationId: auditLogs.organizationId,
    action: auditLogs.action,
    entityType: auditLogs.entityType,
    entityId: auditLogs.entityId,
    details: auditLogs.details,
    ipAddress: auditLogs.ipAddress,
    createdAt: auditLogs.createdAt,
    userName: users.name,
    userEmail: users.email,
  })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id));
  
  if (conditions.length > 0) {
    return baseQuery
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(options.limit || 100);
  }
  
  return baseQuery
    .orderBy(desc(auditLogs.createdAt))
    .limit(options.limit || 100);
}

// ==================== STATISTICS ====================
export async function getOrganizationStats(organizationId: number) {
  const db = await getDb();
  if (!db) return null;
  
  // Avaliações unificadas (tabela principal: ua_assessments)
  const [complianceCount] = await db.select({ count: sql<number>`count(*)` })
    .from(unifiedAssessments)
    .where(eq(unifiedAssessments.organizationId, organizationId));
  
  const [thirdPartyCount] = await db.select({ count: sql<number>`count(*)` })
    .from(thirdPartyAssessments)
    .where(eq(thirdPartyAssessments.organizationId, organizationId));
  
  const [thirdPartiesCount] = await db.select({ count: sql<number>`count(*)` })
    .from(thirdParties)
    .where(and(eq(thirdParties.organizationId, organizationId), eq(thirdParties.isActive, true)));
  
  const [pendingActionsCount] = await db.select({ count: sql<number>`count(*)` })
    .from(actionPlans)
    .where(and(
      eq(actionPlans.organizationId, organizationId),
      eq(actionPlans.status, 'pendente')
    ));
  
  return {
    complianceAssessments: complianceCount?.count || 0,
    thirdPartyAssessments: thirdPartyCount?.count || 0,
    thirdParties: thirdPartiesCount?.count || 0,
    pendingActions: pendingActionsCount?.count || 0
  };
}

export async function getGlobalStats() {
  const db = await getDb();
  if (!db) return null;
  
  const [orgCount] = await db.select({ count: sql<number>`count(*)` }).from(organizations);
  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [complianceCount] = await db.select({ count: sql<number>`count(*)` }).from(complianceAssessments);
  const [thirdPartyAssessCount] = await db.select({ count: sql<number>`count(*)` }).from(thirdPartyAssessments);
  
  return {
    organizations: orgCount?.count || 0,
    users: userCount?.count || 0,
    complianceAssessments: complianceCount?.count || 0,
    thirdPartyAssessments: thirdPartyAssessCount?.count || 0
  };
}


// ==================== ACCESS LINKS ====================

export async function createAccessLink(data: InsertAccessLink) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  const result = await db.insert(accessLinks).values(data).returning({ id: accessLinks.id });
  return result[0].id;
}

export async function getAccessLinkByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(accessLinks).where(eq(accessLinks.token, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAccessLinksByThirdParty(thirdPartyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(accessLinks)
    .where(eq(accessLinks.thirdPartyId, thirdPartyId))
    .orderBy(desc(accessLinks.createdAt));
}

export async function updateAccessLink(id: number, data: Partial<InsertAccessLink>) {
  const db = await getDb();
  if (!db) return;
  await db.update(accessLinks).set(data).where(eq(accessLinks.id, id));
}

export async function markAccessLinkAsUsed(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(accessLinks).set({ usedAt: new Date().toISOString() }).where(eq(accessLinks.id, id));
}

export async function updateAccessLinkSentAt(token: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(accessLinks).set({ sentAt: new Date().toISOString() }).where(eq(accessLinks.token, token));
}

export async function getAccessLinksByOrganization(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(accessLinks)
    .where(eq(accessLinks.organizationId, organizationId))
    .orderBy(desc(accessLinks.createdAt));
}

export async function updateAccessLinkViewedAt(token: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(accessLinks).set({ viewedAt: new Date().toISOString() }).where(eq(accessLinks.token, token));
}

export async function updateAccessLinkCompletedAt(token: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(accessLinks).set({ completedAt: new Date().toISOString(), usedAt: new Date().toISOString() }).where(eq(accessLinks.token, token));
}

export async function getAccessLinksWithDetails(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const links = await db.select().from(accessLinks)
    .where(eq(accessLinks.organizationId, organizationId))
    .orderBy(desc(accessLinks.createdAt));
  
  // Get third party details for each link
  const result = [];
  for (const link of links) {
    const thirdParty = await getThirdPartyById(link.thirdPartyId);
    result.push({
      ...link,
      thirdPartyName: thirdParty?.tradeName || thirdParty?.name || 'Terceiro',
      thirdPartyCnpj: thirdParty?.cnpj,
      thirdPartyEmail: thirdParty?.contactEmail,
    });
  }
  
  return result;
}

export async function getAccessLinkStats(organizationId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const now = new Date();
  
  const [totalCount] = await db.select({ count: sql<number>`count(*)` })
    .from(accessLinks)
    .where(eq(accessLinks.organizationId, organizationId));
  
  const [sentCount] = await db.select({ count: sql<number>`count(*)` })
    .from(accessLinks)
    .where(and(
      eq(accessLinks.organizationId, organizationId),
      sql`${accessLinks.sentAt} IS NOT NULL`
    ));
  
  const [viewedCount] = await db.select({ count: sql<number>`count(*)` })
    .from(accessLinks)
    .where(and(
      eq(accessLinks.organizationId, organizationId),
      sql`${accessLinks.viewedAt} IS NOT NULL`
    ));
  
  const [completedCount] = await db.select({ count: sql<number>`count(*)` })
    .from(accessLinks)
    .where(and(
      eq(accessLinks.organizationId, organizationId),
      sql`${accessLinks.completedAt} IS NOT NULL`
    ));
  
  const [expiredCount] = await db.select({ count: sql<number>`count(*)` })
    .from(accessLinks)
    .where(and(
      eq(accessLinks.organizationId, organizationId),
      sql`${accessLinks.expiresAt} < ${now}`,
      sql`${accessLinks.completedAt} IS NULL`
    ));
  
  const [pendingCount] = await db.select({ count: sql<number>`count(*)` })
    .from(accessLinks)
    .where(and(
      eq(accessLinks.organizationId, organizationId),
      sql`${accessLinks.expiresAt} >= ${now}`,
      sql`${accessLinks.completedAt} IS NULL`
    ));
  
  return {
    total: totalCount?.count || 0,
    sent: sentCount?.count || 0,
    viewed: viewedCount?.count || 0,
    completed: completedCount?.count || 0,
    expired: expiredCount?.count || 0,
    pending: pendingCount?.count || 0,
  };
}


// ==================== EVIDÊNCIAS ====================
export async function createEvidence(evidence: InsertEvidence): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const result = await db.insert(evidences).values(evidence).returning({ id: evidences.id });
  return result[0].id;
}

export async function getEvidencesByAssessment(assessmentType: 'compliance' | 'third_party' | 'contract_analysis', assessmentId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(evidences)
    .where(and(
      eq(evidences.assessmentType, assessmentType),
      eq(evidences.assessmentId, assessmentId)
    ))
    .orderBy(desc(evidences.createdAt));
}

export async function getEvidencesByQuestion(assessmentType: 'compliance' | 'third_party' | 'contract_analysis', assessmentId: number, questionId: string) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(evidences)
    .where(and(
      eq(evidences.assessmentType, assessmentType),
      eq(evidences.assessmentId, assessmentId),
      eq(evidences.questionId, questionId)
    ))
    .orderBy(desc(evidences.createdAt));
}

export async function deleteEvidence(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.delete(evidences).where(eq(evidences.id, id));
}


// ==================== REMINDER SETTINGS ====================
export async function getReminderSettings(organizationId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(reminderSettings)
    .where(eq(reminderSettings.organizationId, organizationId))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function upsertReminderSettings(settings: InsertReminderSetting): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.insert(reminderSettings).values(settings)
    .onConflictDoUpdate({ target: reminderSettings.organizationId, set: {
        isEnabled: settings.isEnabled,
        daysAfterSent: settings.daysAfterSent,
        maxReminders: settings.maxReminders,
        reminderInterval: settings.reminderInterval,
      }
    });
}

export async function updateReminderSettingsLastProcessed(organizationId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.update(reminderSettings)
    .set({ lastProcessedAt: new Date().toISOString() })
    .where(eq(reminderSettings.organizationId, organizationId));
}

export async function getAllActiveReminderSettings() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(reminderSettings)
    .where(eq(reminderSettings.isEnabled, true));
}

// ==================== REMINDER LOGS ====================
export async function createReminderLog(log: InsertReminderLog): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const result = await db.insert(reminderLogs).values(log).returning({ id: reminderLogs.id });
  return result[0].id;
}

export async function getReminderLogsByAccessLink(accessLinkId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(reminderLogs)
    .where(eq(reminderLogs.accessLinkId, accessLinkId))
    .orderBy(desc(reminderLogs.sentAt));
}

export async function countRemindersSent(accessLinkId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select().from(reminderLogs)
    .where(and(
      eq(reminderLogs.accessLinkId, accessLinkId),
      eq(reminderLogs.status, 'sent')
    ));
  
  return result.length;
}

// ==================== PENDING REMINDERS ====================
export async function getPendingReminders(organizationId: number, daysAfterSent: number, maxReminders: number, reminderInterval: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all active links that were sent but not completed
  const links = await db.select().from(accessLinks)
    .where(and(
      eq(accessLinks.organizationId, organizationId),
      eq(accessLinks.isActive, true),
      isNotNull(accessLinks.sentAt),
      isNull(accessLinks.completedAt)
    ));
  
  const now = new Date();
  const pendingLinks = [];
  
  for (const link of links) {
    // Check if link is expired
    if (new Date(link.expiresAt) < now) continue;
    
    // Count reminders already sent
    const reminderCount = await countRemindersSent(link.id);
    
    // Check if max reminders reached
    if (reminderCount >= maxReminders) continue;
    
    // Calculate days since last action (sent or last reminder)
    const lastReminderLogs = await getReminderLogsByAccessLink(link.id);
    const lastActionDate = lastReminderLogs.length > 0 
      ? new Date(lastReminderLogs[0].sentAt)
      : new Date(link.sentAt!);
    
    const daysSinceLastAction = Math.floor((now.getTime() - lastActionDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Check if it's time for a reminder
    const daysThreshold = reminderCount === 0 ? daysAfterSent : reminderInterval;
    
    if (daysSinceLastAction >= daysThreshold) {
      pendingLinks.push({
        ...link,
        reminderNumber: reminderCount + 1,
        daysSinceLastAction,
      });
    }
  }
  
  return pendingLinks;
}


// ==================== DASHBOARD EXECUTIVO ====================
export async function getExecutiveDashboardData(organizationId: number) {
  const db = await getDb();
  if (!db) return null;
  
  // 1. Contagens gerais
  const [complianceTotal] = await db.select({ count: sql<number>`count(*)` })
    .from(complianceAssessments)
    .where(eq(complianceAssessments.organizationId, organizationId));
  
  const [complianceConcluidas] = await db.select({ count: sql<number>`count(*)` })
    .from(complianceAssessments)
    .where(and(
      eq(complianceAssessments.organizationId, organizationId),
      eq(complianceAssessments.status, 'concluida')
    ));
  
  const [thirdPartyTotal] = await db.select({ count: sql<number>`count(*)` })
    .from(thirdPartyAssessments)
    .where(eq(thirdPartyAssessments.organizationId, organizationId));
  
  const [thirdPartyConcluidas] = await db.select({ count: sql<number>`count(*)` })
    .from(thirdPartyAssessments)
    .where(and(
      eq(thirdPartyAssessments.organizationId, organizationId),
      eq(thirdPartyAssessments.status, 'concluida')
    ));
  
  const [thirdPartiesTotal] = await db.select({ count: sql<number>`count(*)` })
    .from(thirdParties)
    .where(and(eq(thirdParties.organizationId, organizationId), eq(thirdParties.isActive, true)));
  
  // 2. Última avaliação de conformidade (maturidade atual)
  const lastCompliance = await db.select()
    .from(complianceAssessments)
    .where(and(
      eq(complianceAssessments.organizationId, organizationId),
      eq(complianceAssessments.status, 'concluida')
    ))
    .orderBy(desc(complianceAssessments.completedAt))
    .limit(1);
  
  // 3. Terceiros por classificação de risco
  const thirdPartiesByRisk = await db.select({
    riskLevel: thirdParties.riskLevel,
    count: sql<number>`count(*)`
  })
    .from(thirdParties)
    .where(and(
      eq(thirdParties.organizationId, organizationId),
      eq(thirdParties.isActive, true),
      isNotNull(thirdParties.riskLevel)
    ))
    .groupBy(thirdParties.riskLevel);
  
  // 4. Avaliações de terceiros por classificação de risco
  const assessmentsByRisk = await db.select({
    riskClassification: thirdPartyAssessments.riskClassification,
    count: sql<number>`count(*)`
  })
    .from(thirdPartyAssessments)
    .where(and(
      eq(thirdPartyAssessments.organizationId, organizationId),
      eq(thirdPartyAssessments.status, 'concluida'),
      isNotNull(thirdPartyAssessments.riskClassification)
    ))
    .groupBy(thirdPartyAssessments.riskClassification);
  
  // 5. Terceiros com risco crítico ou alto (lista detalhada)
  const criticalRiskThirdParties = await db.select({
    id: thirdParties.id,
    name: thirdParties.name,
    tradeName: thirdParties.tradeName,
    cnpj: thirdParties.cnpj,
    type: thirdParties.type,
    riskLevel: thirdParties.riskLevel,
    lastAssessmentDate: thirdParties.lastAssessmentDate,
  })
    .from(thirdParties)
    .where(and(
      eq(thirdParties.organizationId, organizationId),
      eq(thirdParties.isActive, true),
      or(
        eq(thirdParties.riskLevel, 'critico'),
        eq(thirdParties.riskLevel, 'alto')
      )
    ))
    .orderBy(desc(thirdParties.lastAssessmentDate));
  
  // 6. Ações pendentes por prioridade
  const pendingActionsByPriority = await db.select({
    priority: actionPlans.priority,
    count: sql<number>`count(*)`
  })
    .from(actionPlans)
    .where(and(
      eq(actionPlans.organizationId, organizationId),
      eq(actionPlans.status, 'pendente')
    ))
    .groupBy(actionPlans.priority);
  
  // 7. Ações com prazo próximo (próximos 30 dias)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const thirtyDaysFromNowStr = thirtyDaysFromNow.toISOString();
  
  const upcomingActions = await db.select()
    .from(actionPlans)
    .where(and(
      eq(actionPlans.organizationId, organizationId),
      eq(actionPlans.status, 'pendente'),
      isNotNull(actionPlans.dueDate),
      lte(actionPlans.dueDate, thirtyDaysFromNowStr)
    ))
    .orderBy(actionPlans.dueDate);
  
  // 8. Evolução da maturidade (últimas 6 avaliações de conformidade)
  const maturityEvolution = await db.select({
    id: complianceAssessments.id,
    title: complianceAssessments.title,
    framework: complianceAssessments.framework,
    maturityLevel: complianceAssessments.maturityLevel,
    overallScore: complianceAssessments.overallScore,
    completedAt: complianceAssessments.completedAt,
  })
    .from(complianceAssessments)
    .where(and(
      eq(complianceAssessments.organizationId, organizationId),
      eq(complianceAssessments.status, 'concluida'),
      isNotNull(complianceAssessments.maturityLevel)
    ))
    .orderBy(desc(complianceAssessments.completedAt))
    .limit(6);
  
  // 9. Links pendentes de resposta
  const [pendingLinksCount] = await db.select({ count: sql<number>`count(*)` })
    .from(accessLinks)
    .where(and(
      eq(accessLinks.organizationId, organizationId),
      eq(accessLinks.isActive, true),
      isNotNull(accessLinks.sentAt),
      isNull(accessLinks.completedAt),
      gte(accessLinks.expiresAt, new Date().toISOString())
    ));
  
  return {
    // KPIs principais
    kpis: {
      totalComplianceAssessments: complianceTotal?.count || 0,
      completedComplianceAssessments: complianceConcluidas?.count || 0,
      totalThirdPartyAssessments: thirdPartyTotal?.count || 0,
      completedThirdPartyAssessments: thirdPartyConcluidas?.count || 0,
      totalThirdParties: thirdPartiesTotal?.count || 0,
      pendingLinks: pendingLinksCount?.count || 0,
      currentMaturityLevel: lastCompliance[0]?.maturityLevel || null,
      currentMaturityScore: lastCompliance[0]?.overallScore || null,
    },
    // Distribuição de riscos
    riskDistribution: {
      thirdParties: thirdPartiesByRisk.reduce((acc, item) => {
        if (item.riskLevel) acc[item.riskLevel] = item.count;
        return acc;
      }, {} as Record<string, number>),
      assessments: assessmentsByRisk.reduce((acc, item) => {
        if (item.riskClassification) acc[item.riskClassification] = item.count;
        return acc;
      }, {} as Record<string, number>),
    },
    // Terceiros críticos
    criticalRiskThirdParties,
    // Ações pendentes
    pendingActions: {
      byPriority: pendingActionsByPriority.reduce((acc, item) => {
        acc[item.priority] = item.count;
        return acc;
      }, {} as Record<string, number>),
      upcoming: upcomingActions,
    },
    // Evolução da maturidade
    maturityEvolution: maturityEvolution.reverse(), // Ordenar do mais antigo para o mais recente
  };
}

// Buscar avaliações recentes para o dashboard
export async function getRecentAssessments(organizationId: number, limit: number = 5) {
  const db = await getDb();
  if (!db) return { compliance: [], thirdParty: [] };
  
  const recentCompliance = await db.select()
    .from(complianceAssessments)
    .where(eq(complianceAssessments.organizationId, organizationId))
    .orderBy(desc(complianceAssessments.createdAt))
    .limit(limit);
  
  const recentThirdParty = await db.select({
    assessment: thirdPartyAssessments,
    thirdParty: thirdParties,
  })
    .from(thirdPartyAssessments)
    .leftJoin(thirdParties, eq(thirdPartyAssessments.thirdPartyId, thirdParties.id))
    .where(eq(thirdPartyAssessments.organizationId, organizationId))
    .orderBy(desc(thirdPartyAssessments.createdAt))
    .limit(limit);
  
  return {
    compliance: recentCompliance,
    thirdParty: recentThirdParty,
  };
}


// ==================== AI PROVIDER CONFIGS ====================
export async function getAiProviderConfigs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiProviderConfigs).orderBy(aiProviderConfigs.provider);
}

export async function getAiProviderConfigById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [config] = await db.select().from(aiProviderConfigs).where(eq(aiProviderConfigs.id, id));
  return config || null;
}

export async function getDefaultAiProvider() {
  const db = await getDb();
  if (!db) return null;
  const [config] = await db.select().from(aiProviderConfigs)
    .where(and(eq(aiProviderConfigs.isEnabled, true), eq(aiProviderConfigs.isDefault, 1)));
  return config || null;
}

export async function getEnabledAiProviders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiProviderConfigs).where(eq(aiProviderConfigs.isEnabled, true));
}

export async function createAiProviderConfig(data: InsertAiProviderConfig) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(aiProviderConfigs).values(data).returning({ id: aiProviderConfigs.id });
  return result[0]?.id ?? 0;
}

export async function updateAiProviderConfig(id: number, data: Partial<InsertAiProviderConfig>) {
  const db = await getDb();
  if (!db) return;
  await db.update(aiProviderConfigs).set(data).where(eq(aiProviderConfigs.id, id));
}

export async function deleteAiProviderConfig(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(aiProviderConfigs).where(eq(aiProviderConfigs.id, id));
}

// ==================== AI ORGANIZATION INSTRUCTIONS ====================
export async function getAiOrganizationInstructions(organizationId: number, module?: string) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(aiOrganizationInstructions.organizationId, organizationId)];
  if (module) {
    conditions.push(eq(aiOrganizationInstructions.module, module as any));
  }
  
  return db.select().from(aiOrganizationInstructions).where(and(...conditions));
}

export async function getAiOrganizationInstructionById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [instruction] = await db.select().from(aiOrganizationInstructions).where(eq(aiOrganizationInstructions.id, id));
  return instruction || null;
}

export async function createAiOrganizationInstruction(data: InsertAiOrganizationInstruction) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(aiOrganizationInstructions).values(data).returning({ id: aiOrganizationInstructions.id });
  return result[0]?.id ?? 0;
}

export async function updateAiOrganizationInstruction(id: number, data: Partial<InsertAiOrganizationInstruction>) {
  const db = await getDb();
  if (!db) return;
  await db.update(aiOrganizationInstructions).set(data).where(eq(aiOrganizationInstructions.id, id));
}

export async function deleteAiOrganizationInstruction(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(aiOrganizationInstructions).where(eq(aiOrganizationInstructions.id, id));
}

// ==================== AI CHAT SESSIONS ====================
export async function getAiChatSessions(userId: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [
    eq(aiChatSessions.userId, userId),
    or(eq(aiChatSessions.status, 'active'), eq(aiChatSessions.status, 'archived'))
  ];
  
  if (organizationId) {
    conditions.push(eq(aiChatSessions.organizationId, organizationId));
  }
  
  return db.select().from(aiChatSessions)
    .where(and(...conditions))
    .orderBy(desc(aiChatSessions.updatedAt));
}

export async function getAiChatSessionById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [session] = await db.select().from(aiChatSessions).where(eq(aiChatSessions.id, id));
  return session || null;
}

export async function createAiChatSession(data: InsertAiChatSession) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(aiChatSessions).values(data).returning({ id: aiChatSessions.id });
  return result[0]?.id ?? 0;
}

export async function updateAiChatSession(id: number, data: Partial<InsertAiChatSession>) {
  const db = await getDb();
  if (!db) return;
  await db.update(aiChatSessions).set(data).where(eq(aiChatSessions.id, id));
}

export async function deleteAiChatSession(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(aiChatSessions).set({ status: 'deleted' }).where(eq(aiChatSessions.id, id));
}

// ==================== AI CHAT MESSAGES ====================
export async function getAiChatMessages(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiChatMessages)
    .where(eq(aiChatMessages.sessionId, sessionId))
    .orderBy(aiChatMessages.createdAt);
}

export async function createAiChatMessage(data: InsertAiChatMessage) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(aiChatMessages).values(data).returning({ id: aiChatMessages.id });
  return result[0]?.id ?? 0;
}

export async function getAiChatMessageById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [message] = await db.select().from(aiChatMessages).where(eq(aiChatMessages.id, id));
  return message || null;
}

// ==================== AI PROMPT TEMPLATES ====================
export async function getAiPromptTemplates(module?: string, isSystem?: boolean) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(aiPromptTemplates.isActive, true)];
  if (module) {
    conditions.push(eq(aiPromptTemplates.module, module as any));
  }
  if (isSystem !== undefined) {
    conditions.push(eq(aiPromptTemplates.isSystem, isSystem ? 1 : 0));
  }
  
  return db.select().from(aiPromptTemplates).where(and(...conditions));
}

export async function getAiPromptTemplateById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [template] = await db.select().from(aiPromptTemplates).where(eq(aiPromptTemplates.id, id));
  return template || null;
}

export async function createAiPromptTemplate(data: InsertAiPromptTemplate) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(aiPromptTemplates).values(data).returning({ id: aiPromptTemplates.id });
  return result[0]?.id ?? 0;
}

export async function updateAiPromptTemplate(id: number, data: Partial<InsertAiPromptTemplate>) {
  const db = await getDb();
  if (!db) return;
  await db.update(aiPromptTemplates).set(data).where(eq(aiPromptTemplates.id, id));
}

export async function deleteAiPromptTemplate(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(aiPromptTemplates).set({ isActive: false }).where(eq(aiPromptTemplates.id, id));
}

// ==================== AI GENERATED RESULTS ====================
export async function getAiGeneratedResults(organizationId?: number, module?: string, entityType?: string, entityId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions: any[] = [];
  if (organizationId) conditions.push(eq(aiGeneratedResults.organizationId, organizationId));
  if (module) conditions.push(eq(aiGeneratedResults.module, module as any));
  if (entityType) conditions.push(eq(aiGeneratedResults.entityType, entityType));
  if (entityId) conditions.push(eq(aiGeneratedResults.entityId, entityId));
  
  return db.select().from(aiGeneratedResults)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(aiGeneratedResults.createdAt));
}

export async function getAiGeneratedResultById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.select().from(aiGeneratedResults).where(eq(aiGeneratedResults.id, id));
  return result || null;
}

export async function createAiGeneratedResult(data: InsertAiGeneratedResult) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(aiGeneratedResults).values(data).returning({ id: aiGeneratedResults.id });
  return result[0]?.id ?? 0;
}

export async function updateAiGeneratedResult(id: number, data: Partial<InsertAiGeneratedResult>) {
  const db = await getDb();
  if (!db) return;
  await db.update(aiGeneratedResults).set(data).where(eq(aiGeneratedResults.id, id));
}

export async function approveAiGeneratedResult(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(aiGeneratedResults).set({
    status: 'approved',
    approvedById: userId,
    approvedAt: new Date().toISOString()
  }).where(eq(aiGeneratedResults.id, id));
}

export async function applyAiGeneratedResult(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(aiGeneratedResults).set({
    status: 'applied',
    appliedAt: new Date().toISOString()
  }).where(eq(aiGeneratedResults.id, id));
}


// ==================== USER INVITES ====================
export async function createUserInvite(data: InsertUserInvite) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(userInvites).values(data).returning({ id: userInvites.id });
  return result[0]?.id ?? 0;
}

export async function getUserInviteByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const [invite] = await db.select().from(userInvites).where(eq(userInvites.token, token));
  return invite || null;
}

export async function getUserInviteByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const [invite] = await db.select().from(userInvites)
    .where(and(
      eq(userInvites.email, email),
      eq(userInvites.status, 'pending')
    ));
  return invite || null;
}

export async function getUserInvitesByOrganization(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userInvites)
    .where(eq(userInvites.organizationId, organizationId))
    .orderBy(desc(userInvites.createdAt));
}

export async function getAllUserInvites() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userInvites)
    .orderBy(desc(userInvites.createdAt));
}

export async function updateUserInvite(id: number, data: Partial<InsertUserInvite>) {
  const db = await getDb();
  if (!db) return;
  await db.update(userInvites).set(data).where(eq(userInvites.id, id));
}

export async function acceptUserInvite(token: string) {
  const db = await getDb();
  if (!db) return null;
  
  const invite = await getUserInviteByToken(token);
  if (!invite) return null;
  
  await db.update(userInvites).set({
    status: 'accepted',
    acceptedAt: new Date().toISOString()
  }).where(eq(userInvites.token, token));
  
  return invite;
}

export async function cancelUserInvite(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(userInvites).set({
    status: 'cancelled'
  }).where(eq(userInvites.id, id));
}

export async function markInviteEmailSent(id: number) {
  const db = await getDb();
  if (!db) return;
  const [invite] = await db.select().from(userInvites).where(eq(userInvites.id, id));
  if (invite) {
    await db.update(userInvites).set({
      emailSentAt: new Date().toISOString(),
      emailSentCount: (invite.emailSentCount || 0) + 1
    }).where(eq(userInvites.id, id));
  }
}

export async function getPendingInvites() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userInvites)
    .where(eq(userInvites.status, 'pending'))
    .orderBy(desc(userInvites.createdAt));
}


// ==================== VINCULAÇÃO DE DOCUMENTOS ÀS AVALIAÇÕES ====================

export async function linkDocumentToAssessment(data: InsertAssessmentDocument) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(assessmentDocuments).values(data).returning({ id: assessmentDocuments.id });
  return result[0]?.id ?? 0;
}

export async function unlinkDocumentFromAssessment(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(assessmentDocuments).where(eq(assessmentDocuments.id, id));
}

export async function getAssessmentDocuments(assessmentType: 'conformidade' | 'due_diligence', assessmentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(assessmentDocuments)
    .where(and(
      eq(assessmentDocuments.assessmentType, assessmentType),
      eq(assessmentDocuments.assessmentId, assessmentId)
    ))
    .orderBy(desc(assessmentDocuments.createdAt));
}

export async function getAssessmentDocumentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.select().from(assessmentDocuments)
    .where(eq(assessmentDocuments.id, id));
  return result || null;
}


// ==================== ANÁLISE DE CONTRATOS LGPD ====================

export async function createContractAnalysis(data: InsertContractAnalysis) {
  const db = await getDb();
  if (!db) return 0;
  try {
    const result = await db.insert(contractAnalyses).values(data).returning({ id: contractAnalyses.id });
    const id = result[0]?.id ?? 0;
    logger.info('[createContractAnalysis] Criado com id:', id);
    return id;
  } catch (error) {
    logger.error('[createContractAnalysis] Erro ao criar análise:', error);
    throw error;
  }
}

export async function getContractAnalysisById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.select().from(contractAnalyses)
    .where(eq(contractAnalyses.id, id));
  return result || null;
}

export async function getContractAnalysesByOrganization(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contractAnalyses)
    .where(eq(contractAnalyses.organizationId, organizationId))
    .orderBy(desc(contractAnalyses.createdAt));
}

export async function getAllContractAnalyses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contractAnalyses)
    .orderBy(desc(contractAnalyses.createdAt));
}

export async function updateContractAnalysis(id: number, data: Partial<InsertContractAnalysis>) {
  const db = await getDb();
  if (!db) return;
  await db.update(contractAnalyses).set({
    ...data,
    updatedAt: new Date().toISOString()
  }).where(eq(contractAnalyses.id, id));
}

export async function deleteContractAnalysis(id: number) {
  const db = await getDb();
  if (!db) return;
  // Deletar registros relacionados primeiro
  await db.delete(contractAnalysisMaps).where(eq(contractAnalysisMaps.analysisId, id));
  await db.delete(contractChecklistItems).where(eq(contractChecklistItems.analysisId, id));
  await db.delete(contractRiskItems).where(eq(contractRiskItems.analysisId, id));
  await db.delete(contractAnalysisHistory).where(eq(contractAnalysisHistory.analysisId, id));
  // Deletar análise principal
  await db.delete(contractAnalyses).where(eq(contractAnalyses.id, id));
}

// Mapa de Análise
export async function createContractAnalysisMap(data: InsertContractAnalysisMap) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(contractAnalysisMaps).values(data).returning({ id: contractAnalysisMaps.id });
  return result[0]?.id ?? 0;
}

export async function getContractAnalysisMap(analysisId: number) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.select().from(contractAnalysisMaps)
    .where(eq(contractAnalysisMaps.analysisId, analysisId));
  return result || null;
}

export async function updateContractAnalysisMap(analysisId: number, data: Partial<InsertContractAnalysisMap>) {
  const db = await getDb();
  if (!db) return;
  await db.update(contractAnalysisMaps).set({
    ...data,
    updatedAt: new Date().toISOString()
  }).where(eq(contractAnalysisMaps.analysisId, analysisId));
}

// Checklist
export async function createContractChecklistItems(items: InsertContractChecklistItem[]) {
  const db = await getDb();
  if (!db) return;
  if (items.length > 0) {
    await db.insert(contractChecklistItems).values(items);
  }
}

export async function getContractChecklistItems(analysisId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contractChecklistItems)
    .where(eq(contractChecklistItems.analysisId, analysisId))
    .orderBy(contractChecklistItems.itemNumber);
}

export async function updateContractChecklistItem(id: number, data: Partial<InsertContractChecklistItem>) {
  const db = await getDb();
  if (!db) return;
  await db.update(contractChecklistItems).set({
    ...data,
    updatedAt: new Date().toISOString()
  }).where(eq(contractChecklistItems.id, id));
}

export async function deleteContractChecklistItems(analysisId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(contractChecklistItems).where(eq(contractChecklistItems.analysisId, analysisId));
}

// Riscos
export async function createContractRiskItems(items: InsertContractRiskItem[]) {
  const db = await getDb();
  if (!db) return;
  if (items.length > 0) {
    await db.insert(contractRiskItems).values(items);
  }
}

export async function getContractRiskItems(analysisId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contractRiskItems)
    .where(eq(contractRiskItems.analysisId, analysisId))
    .orderBy(contractRiskItems.riskLevel);
}

export async function updateContractRiskItem(id: number, data: Partial<InsertContractRiskItem>) {
  const db = await getDb();
  if (!db) return;
  await db.update(contractRiskItems).set({
    ...data,
    updatedAt: new Date().toISOString()
  }).where(eq(contractRiskItems.id, id));
}

export async function deleteContractRiskItems(analysisId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(contractRiskItems).where(eq(contractRiskItems.analysisId, analysisId));
}

// Histórico
export async function createContractAnalysisHistoryEntry(data: InsertContractAnalysisHistory) {
  const db = await getDb();
  if (!db) return 0;
  try {
    const result = await db.insert(contractAnalysisHistory).values(data).returning({ id: contractAnalysisHistory.id });
  return result[0]?.id ?? 0;
  } catch (error) {
    logger.error('[createContractAnalysisHistoryEntry] Erro ao criar entrada de histórico:', error);
    return 0;
  }
}

export async function getContractAnalysisHistory(analysisId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contractAnalysisHistory)
    .where(eq(contractAnalysisHistory.analysisId, analysisId))
    .orderBy(desc(contractAnalysisHistory.createdAt));
}

// Estatísticas
export async function getContractAnalysisStats(organizationId?: number) {
  const db = await getDb();
  if (!db) return {
    total: 0,
    pending: 0,
    analyzing: 0,
    completed: 0,
    reviewed: 0,
    criticalRisks: 0,
    highRisks: 0
  };
  
  const whereClause = organizationId 
    ? eq(contractAnalyses.organizationId, organizationId)
    : undefined;
  
  const analyses = await db.select().from(contractAnalyses)
    .where(whereClause);
  
  const stats = {
    total: analyses.length,
    pending: analyses.filter(a => a.contractAnalysisStatus === 'pending').length,
    analyzing: analyses.filter(a => a.contractAnalysisStatus === 'analyzing').length,
    completed: analyses.filter(a => a.contractAnalysisStatus === 'completed').length,
    reviewed: analyses.filter(a => a.contractAnalysisStatus === 'reviewed' || a.contractAnalysisStatus === 'approved').length,
    criticalRisks: analyses.reduce((sum, a) => sum + (a.criticalRisks || 0), 0),
    highRisks: analyses.reduce((sum, a) => sum + (a.highRisks || 0), 0)
  };
  
  return stats;
}


// ==================== TEMPLATES PERSONALIZADOS DE CLÁUSULAS LGPD ====================

export async function getLgpdClauseTemplates(organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  if (organizationId) {
    // Retorna templates personalizados da organização + templates globais
    return db.select()
      .from(lgpdClauseTemplates)
      .where(
        or(
          eq(lgpdClauseTemplates.organizationId, organizationId),
          isNull(lgpdClauseTemplates.organizationId)
        )
      )
      .orderBy(lgpdClauseTemplates.templateId);
  }
  
  // Retorna apenas templates globais
  return db.select()
    .from(lgpdClauseTemplates)
    .where(isNull(lgpdClauseTemplates.organizationId))
    .orderBy(lgpdClauseTemplates.templateId);
}

export async function getLgpdClauseTemplateById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select()
    .from(lgpdClauseTemplates)
    .where(eq(lgpdClauseTemplates.id, id))
    .limit(1);
  
  return result[0] || null;
}

export async function getLgpdClauseTemplateByTemplateId(templateId: string, organizationId?: number) {
  const db = await getDb();
  if (!db) return null;
  
  // Primeiro tenta encontrar template personalizado da organização
  if (organizationId) {
    const customResult = await db.select()
      .from(lgpdClauseTemplates)
      .where(
        and(
          eq(lgpdClauseTemplates.templateId, templateId),
          eq(lgpdClauseTemplates.organizationId, organizationId),
          eq(lgpdClauseTemplates.isActive, true)
        )
      )
      .limit(1);
    
    if (customResult[0]) return customResult[0];
  }
  
  // Fallback para template global
  const globalResult = await db.select()
    .from(lgpdClauseTemplates)
    .where(
      and(
        eq(lgpdClauseTemplates.templateId, templateId),
        isNull(lgpdClauseTemplates.organizationId),
        eq(lgpdClauseTemplates.isActive, true)
      )
    )
    .limit(1);
  
  return globalResult[0] || null;
}

export async function createLgpdClauseTemplate(data: InsertLgpdClauseTemplate) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const result = await db.insert(lgpdClauseTemplates).values(data).returning({ id: lgpdClauseTemplates.id });
  return result[0]?.id ?? 0;
}

export async function updateLgpdClauseTemplate(id: number, data: Partial<InsertLgpdClauseTemplate>) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.update(lgpdClauseTemplates)
    .set(data)
    .where(eq(lgpdClauseTemplates.id, id));
}

export async function deleteLgpdClauseTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  // Soft delete - apenas desativa
  await db.update(lgpdClauseTemplates)
    .set({ isActive: false })
    .where(eq(lgpdClauseTemplates.id, id));
}

export async function createLgpdClauseTemplateHistory(data: InsertLgpdClauseTemplateHistory) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const result = await db.insert(lgpdClauseTemplateHistory).values(data).returning({ id: lgpdClauseTemplateHistory.id });
  return result[0]?.id ?? 0;
}

export async function getLgpdClauseTemplateHistory(templateId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(lgpdClauseTemplateHistory)
    .where(eq(lgpdClauseTemplateHistory.templateId, templateId))
    .orderBy(desc(lgpdClauseTemplateHistory.createdAt));
}


// ==================== GOVERNANÇA CPPD ====================

export async function upsertCppdConfig(data: {
  organizationId: number;
  createdById: number;
  year: number;
  programType: string;
  regime: string;
  dayOfWeek: string;
  time: string;
  startDate: Date;
  endDate: Date;
  meetingLocationType: string;
  defaultMeetingUrl: string | null;
  status: string;
  notes: string | null;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const existing = await db.execute(sql`
    SELECT id FROM governanca_cppd_configs 
    WHERE "organizationId" = ${data.organizationId} AND year = ${data.year}
    LIMIT 1
  `);
  
  const existingRows = existing[0] as unknown as any[];
  if (existingRows && existingRows.length > 0) {
    const id = existingRows[0].id;
    await db.execute(sql`
      UPDATE governanca_cppd_configs SET
        "programType" = ${data.programType},
        regime = ${data.regime},
        "dayOfWeek" = ${data.dayOfWeek},
        time = ${data.time},
        "startDate" = ${data.startDate},
        "endDate" = ${data.endDate},
        "meetingLocationType" = ${data.meetingLocationType},
        "defaultMeetingUrl" = ${data.defaultMeetingUrl},
        status = ${data.status},
        notes = ${data.notes},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `);
    return id;
  }
  
  const result = await db.execute(sql`
    INSERT INTO governanca_cppd_configs 
    ("organizationId", "createdById", year, "programType", regime, "dayOfWeek", time, "startDate", "endDate", "meetingLocationType", "defaultMeetingUrl", status, notes)
    VALUES (${data.organizationId}, ${data.createdById}, ${data.year}, ${data.programType}, ${data.regime}, ${data.dayOfWeek}, ${data.time}, ${data.startDate}, ${data.endDate}, ${data.meetingLocationType}, ${data.defaultMeetingUrl}, ${data.status}, ${data.notes})
    RETURNING id
  `);
  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
}

export async function getCppdConfigByOrgAndYear(organizationId: number, year: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(sql`
    SELECT * FROM governanca_cppd_configs 
    WHERE "organizationId" = ${organizationId} AND year = ${year}
    LIMIT 1
  `);
  
  return (result as any).rows?.[0] || null;
}

export async function listMeetingsByOrgAndYear(organizationId: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT * FROM governanca_meetings 
    WHERE "organizationId" = ${organizationId} AND year = ${year}
    ORDER BY sequence ASC
  `);
  
  return (result as any).rows as any[];
}

export async function createMeeting(data: {
  organizationId: number;
  cppdId: number;
  programId: number | null;
  createdById: number;
  year: number;
  sequence: number;
  date: Date;
  durationMinutes: number;
  status: string;
  location: string | null;
  meetingProvider: string;
  meetingUrl: string | null;
  calendarEventId: string | null;
  agendaTitle: string;
  agendaSummary: string | null;
  agendaTemplateCode: string | null;
  recordingUrl: string | null;
  transcript: string | null;
  minutesPdfUrl: string | null;
  minutesStatus: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const result = await db.execute(sql`
    INSERT INTO governanca_meetings 
    ("organizationId", "cppdId", "programId", "createdById", year, sequence, date, "durationMinutes", status, location, "meetingProvider", "meetingUrl", "calendarEventId", "agendaTitle", "agendaSummary", "agendaTemplateCode", "recordingUrl", transcript, "minutesPdfUrl", "minutesStatus")
    VALUES (${data.organizationId}, ${data.cppdId}, ${data.programId}, ${data.createdById}, ${data.year}, ${data.sequence}, ${data.date}, ${data.durationMinutes}, ${data.status}, ${data.location}, ${data.meetingProvider}, ${data.meetingUrl}, ${data.calendarEventId}, ${data.agendaTitle}, ${data.agendaSummary}, ${data.agendaTemplateCode}, ${data.recordingUrl}, ${data.transcript}, ${data.minutesPdfUrl}, ${data.minutesStatus})
    RETURNING id
  `);
  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
}

export async function getMeetingById(organizationId: number, meetingId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(sql`
    SELECT * FROM governanca_meetings 
    WHERE "organizationId" = ${organizationId} AND id = ${meetingId}
    LIMIT 1
  `);
  
  return (result as any).rows?.[0] || null;
}

export async function getOrCreateGovernancaProgram(data: {
  organizationId: number;
  createdById: number;
  year: number;
  type: string;
  status: string;
  description: string | null;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const existing = await db.execute(sql`
    SELECT * FROM governanca_programs 
    WHERE "organizationId" = ${data.organizationId} AND year = ${data.year}
    LIMIT 1
  `);
  
  const existingPrograms = existing[0] as unknown as any[];
  if (existingPrograms.length > 0) {
    return existingPrograms[0];
  }
  
  const result = await db.execute(sql`
    INSERT INTO governanca_programs 
    ("organizationId", "createdById", year, type, status, description)
    VALUES (${data.organizationId}, ${data.createdById}, ${data.year}, ${data.type}, ${data.status}, ${data.description})
    RETURNING id
  `);
  
  const newId = (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
  return { id: newId, ...data };
}

export async function listProgramDashboard(organizationId: number, programId: number) {
  const db = await getDb();
  if (!db) return { program: null, phases: [], milestones: [], controls: [] };
  
  const [programResult, phasesResult, milestonesResult, controlsResult] = await Promise.all([
    db.execute(sql`SELECT * FROM governanca_programs WHERE "organizationId" = ${organizationId} AND id = ${programId} LIMIT 1`),
    db.execute(sql`SELECT * FROM governanca_program_phases WHERE "organizationId" = ${organizationId} AND "programId" = ${programId} ORDER BY "phaseNumber"`),
    db.execute(sql`SELECT * FROM governanca_program_milestones WHERE "organizationId" = ${organizationId} AND "programId" = ${programId} ORDER BY month`),
    db.execute(sql`SELECT * FROM governanca_controls WHERE "organizationId" = ${organizationId} AND "programId" = ${programId} ORDER BY code`),
  ]);
  
  return {
    program: (programResult as any).rows?.[0] || null,
    phases: (phasesResult as any).rows as any[],
    milestones: (milestonesResult as any).rows as any[],
    controls: (controlsResult as any).rows as any[],
  };
}

export async function createProgramPhase(data: {
  organizationId: number;
  programId: number;
  createdById: number;
  phaseNumber: number;
  name: string;
  theme: string | null;
  startMonth: number;
  endMonth: number;
  quarter: string;
  status: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const result = await db.execute(sql`
    INSERT INTO governanca_program_phases 
    ("organizationId", "programId", "createdById", "phaseNumber", name, theme, "startMonth", "endMonth", quarter, status)
    VALUES (${data.organizationId}, ${data.programId}, ${data.createdById}, ${data.phaseNumber}, ${data.name}, ${data.theme}, ${data.startMonth}, ${data.endMonth}, ${data.quarter}, ${data.status})
    RETURNING id
  `);
  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
}

export async function createProgramMilestone(data: {
  organizationId: number;
  programId: number;
  phaseId: number;
  createdById: number;
  month: number;
  name: string;
  description: string | null;
  isCompleted: boolean;
  completedAt: Date | null;
  evidenceDocumentUrl: string | null;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const result = await db.execute(sql`
    INSERT INTO governanca_program_milestones 
    ("organizationId", "programId", "phaseId", "createdById", month, name, description, "isCompleted", "completedAt", "evidenceDocumentUrl")
    VALUES (${data.organizationId}, ${data.programId}, ${data.phaseId}, ${data.createdById}, ${data.month}, ${data.name}, ${data.description}, ${data.isCompleted}, ${data.completedAt}, ${data.evidenceDocumentUrl})
    RETURNING id
  `);
  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
}

export async function listOpenActionItemsByOrg(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT * FROM governanca_action_items 
    WHERE "organizationId" = ${organizationId} AND status IN ('aberta', 'em_andamento')
    ORDER BY "dueDate" ASC
  `);
  
  return (result as any).rows as any[];
}

export async function listMeetingParticipants(organizationId: number, meetingId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT * FROM governanca_meeting_participants 
    WHERE "organizationId" = ${organizationId} AND "meetingId" = ${meetingId}
    ORDER BY role, "nameSnapshot"
  `);
  
  return (result as any).rows as any[];
}

export async function updateMeetingParticipantAttendance(
  organizationId: number,
  participantId: number,
  attendanceStatus: string,
  joinTime: Date | null,
  leaveTime: Date | null,
  notes: string | null
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.execute(sql`
    UPDATE governanca_meeting_participants 
    SET "attendanceStatus" = ${attendanceStatus},
        "joinTime" = ${joinTime},
        "leaveTime" = ${leaveTime},
        notes = ${notes},
        "updatedAt" = NOW()
    WHERE "organizationId" = ${organizationId} AND id = ${participantId}
  `);
}

export async function createMeetingParticipant(data: {
  organizationId: number;
  meetingId: number;
  createdById: number;
  userId: number;
  nameSnapshot: string;
  emailSnapshot: string;
  role: string;
  attendanceStatus: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const result = await db.execute(sql`
    INSERT INTO governanca_meeting_participants 
    ("organizationId", "meetingId", "createdById", "userId", "nameSnapshot", "emailSnapshot", role, "attendanceStatus")
    VALUES (${data.organizationId}, ${data.meetingId}, ${data.createdById}, ${data.userId}, ${data.nameSnapshot}, ${data.emailSnapshot}, ${data.role}, ${data.attendanceStatus})
    RETURNING id
  `);
  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
}

export async function getAttendanceReport(
  organizationId: number,
  year?: number,
  userId?: number
) {
  const db = await getDb();
  if (!db) return { meetings: [], summary: { total: 0, present: 0, absent: 0, justified: 0 }, byUser: [] };
  
  // Buscar todas as reuniões do período
  let meetingsQuery = sql`
    SELECT m.id, m.date, m."agendaTitle", m.status,
           COUNT(DISTINCT p.id) as totalParticipants,
           SUM(CASE WHEN p."attendanceStatus" = 'presente' THEN 1 ELSE 0 END) as presentCount,
           SUM(CASE WHEN p."attendanceStatus" = 'ausente' THEN 1 ELSE 0 END) as absentCount,
           SUM(CASE WHEN p."attendanceStatus" = 'justificado' THEN 1 ELSE 0 END) as justifiedCount
    FROM governanca_meetings m
    LEFT JOIN governanca_meeting_participants p ON m.id = p."meetingId" AND m."organizationId" = p."organizationId"
    WHERE m."organizationId" = ${organizationId}
  `;
  
  if (year) {
    meetingsQuery = sql`${meetingsQuery} AND m.year = ${year}`;
  }
  
  meetingsQuery = sql`${meetingsQuery} GROUP BY m.id ORDER BY m.date DESC`;
  
  const meetingsResult = await db.execute(meetingsQuery);
  const meetings = meetingsResult.rows as unknown as any[];
  
  // Calcular resumo geral
  let summaryQuery = sql`
    SELECT 
      COUNT(DISTINCT p.id) as total,
      SUM(CASE WHEN p."attendanceStatus" = 'presente' THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN p."attendanceStatus" = 'ausente' THEN 1 ELSE 0 END) as absent,
      SUM(CASE WHEN p."attendanceStatus" = 'justificado' THEN 1 ELSE 0 END) as justified
    FROM governanca_meeting_participants p
    JOIN governanca_meetings m ON p."meetingId" = m.id AND p."organizationId" = m."organizationId"
    WHERE p."organizationId" = ${organizationId}
  `;
  
  if (year) {
    summaryQuery = sql`${summaryQuery} AND m.year = ${year}`;
  }
  if (userId) {
    summaryQuery = sql`${summaryQuery} AND p."userId" = ${userId}`;
  }
  
  const summaryResult = await db.execute(summaryQuery);
  const summaryRow = (summaryResult.rows as unknown as any[])[0] || { total: 0, present: 0, absent: 0, justified: 0 };
  
  // Relatório por usuário
  let byUserQuery = sql`
    SELECT 
      p."userId",
      p."nameSnapshot" as userName,
      COUNT(DISTINCT p.id) as totalMeetings,
      SUM(CASE WHEN p."attendanceStatus" = 'presente' THEN 1 ELSE 0 END) as presentCount,
      SUM(CASE WHEN p."attendanceStatus" = 'ausente' THEN 1 ELSE 0 END) as absentCount,
      SUM(CASE WHEN p."attendanceStatus" = 'justificado' THEN 1 ELSE 0 END) as justifiedCount,
      ROUND(SUM(CASE WHEN p."attendanceStatus" = 'presente' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(DISTINCT p.id), 0), 1) as attendanceRate
    FROM governanca_meeting_participants p
    JOIN governanca_meetings m ON p."meetingId" = m.id AND p."organizationId" = m."organizationId"
    WHERE p."organizationId" = ${organizationId}
  `;
  
  if (year) {
    byUserQuery = sql`${byUserQuery} AND m.year = ${year}`;
  }
  if (userId) {
    byUserQuery = sql`${byUserQuery} AND p."userId" = ${userId}`;
  }
  
  byUserQuery = sql`${byUserQuery} GROUP BY p."userId", p."nameSnapshot" ORDER BY "attendanceRate" DESC`;
  
  const byUserResult = await db.execute(byUserQuery);
  const byUser = byUserResult.rows as unknown as any[];
  
  return {
    meetings,
    summary: {
      total: Number(summaryRow.total) || 0,
      present: Number(summaryRow.present) || 0,
      absent: Number(summaryRow.absent) || 0,
      justified: Number(summaryRow.justified) || 0,
    },
    byUser,
  };
}

export async function listAgendaItems(organizationId: number, meetingId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT * FROM governanca_agenda_items 
    WHERE "organizationId" = ${organizationId} AND "meetingId" = ${meetingId}
    ORDER BY \`order\`
  `);
  
  return (result as any).rows as any[];
}

export async function listActionItemsByMeeting(organizationId: number, meetingId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT * FROM governanca_action_items 
    WHERE "organizationId" = ${organizationId} AND "meetingId" = ${meetingId}
    ORDER BY priority DESC, "dueDate" ASC
  `);
  
  return (result as any).rows as any[];
}

export async function createCppdMember(data: {
  organizationId: number;
  cppdId: number;
  createdById: number;
  userId: number;
  nameSnapshot: string;
  emailSnapshot: string;
  roleInCommittee: string;
  isVoting: boolean;
  isCoordinator: boolean;
  isSecretary: boolean;
  isDpo: boolean;
  status: string;
  nominationTermUrl: string | null;
  confidentialityTermUrl: string | null;
  regimentUrl: string | null;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const result = await db.execute(sql`
    INSERT INTO governanca_cppd_members 
    ("organizationId", "cppdId", "createdById", "userId", "nameSnapshot", "emailSnapshot", "roleInCommittee", "isVoting", "isCoordinator", "isSecretary", "isDpo", status, "nominationTermUrl", "confidentialityTermUrl", "regimentUrl")
    VALUES (${data.organizationId}, ${data.cppdId}, ${data.createdById}, ${data.userId}, ${data.nameSnapshot}, ${data.emailSnapshot}, ${data.roleInCommittee}, ${data.isVoting}, ${data.isCoordinator}, ${data.isSecretary}, ${data.isDpo}, ${data.status}, ${data.nominationTermUrl}, ${data.confidentialityTermUrl}, ${data.regimentUrl})
    RETURNING id
  `);
  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
}

export async function listCppdMembers(organizationId: number, cppdId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT * FROM governanca_cppd_members 
    WHERE "organizationId" = ${organizationId} AND "cppdId" = ${cppdId}
    ORDER BY "roleInCommittee", "nameSnapshot"
  `);
  
  return (result as any).rows as any[];
}

export async function createActionItem(data: {
  organizationId: number;
  meetingId: number | null;
  agendaItemId: number | null;
  createdById: number;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  dueDate: Date | null;
  responsibleUserId?: number;
  sponsorUserId?: number | null;
  originModule?: string;
  originReference?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const result = await db.execute(sql`
    INSERT INTO governanca_action_items 
    ("organizationId", "meetingId", "agendaItemId", "createdById", title, description, priority, status, "dueDate", "assignedToUserId", "assignedToName")
    VALUES (${data.organizationId}, ${data.meetingId}, ${data.agendaItemId}, ${data.createdById}, ${data.title}, ${data.description}, ${data.priority}, ${data.status}, ${data.dueDate}, ${data.responsibleUserId ?? null}, ${null})
    RETURNING id
  `);
  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
}

export async function updateActionItemStatus(organizationId: number, id: number, status: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const completedAt = status === 'concluida' ? new Date() : null;
  
  await db.execute(sql`
    UPDATE governanca_action_items SET
      status = ${status},
      "completedAt" = ${completedAt},
      "updatedAt" = NOW()
    WHERE "organizationId" = ${organizationId} AND id = ${id}
  `);
}

export async function updateMeetingMinutes(organizationId: number, meetingId: number, pdfUrl: string, status: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.execute(sql`
    UPDATE governanca_meetings SET
      "minutesPdfUrl" = ${pdfUrl},
      "minutesStatus" = ${status},
      "updatedAt" = NOW()
    WHERE "organizationId" = ${organizationId} AND id = ${meetingId}
  `);
}


// Salvar ata da reunião
export async function saveMeetingMinutes(organizationId: number, meetingId: number, minutesContent: string, userId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.update(governancaMeetings).set({
    minutesContent: minutesContent,
    minutesStatus: 'em_validacao',
  }).where(and(
    eq(governancaMeetings.organizationId, organizationId),
    eq(governancaMeetings.id, meetingId)
  ));
}

export async function updateMeetingMinutesPdf(organizationId: number, meetingId: number, pdfUrl: string, gedKey: string | null) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.update(governancaMeetings).set({
    minutesPdfUrl: pdfUrl,
    gedDocumentKey: gedKey,
  }).where(and(
    eq(governancaMeetings.organizationId, organizationId),
    eq(governancaMeetings.id, meetingId)
  ));
}

export async function updateMeetingMinutesStatus(organizationId: number, meetingId: number, status: 'nao_gerada' | 'em_validacao' | 'em_assinatura' | 'assinada') {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.update(governancaMeetings).set({
    minutesStatus: status,
  }).where(and(
    eq(governancaMeetings.organizationId, organizationId),
    eq(governancaMeetings.id, meetingId)
  ));
}

export async function updateMeetingSignersSnapshot(organizationId: number, meetingId: number, snapshot: Array<{userId: number; name: string; role: string; signedAt?: string}>) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.update(governancaMeetings).set({
    signersSnapshot: snapshot,
  }).where(and(
    eq(governancaMeetings.organizationId, organizationId),
    eq(governancaMeetings.id, meetingId)
  ));
}

// Atualizar membro do CPPD
export async function updateCppdMember(organizationId: number, memberId: number, data: {
  roleInCommittee?: string;
  isVoting?: boolean;
  isCoordinator?: boolean;
  isSecretary?: boolean;
  isDpo?: boolean;
  status?: string;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const updateData: Record<string, unknown> = {};
  if (data.roleInCommittee !== undefined) updateData.roleInCommittee = data.roleInCommittee;
  if (data.isVoting !== undefined) updateData.isVoting = data.isVoting;
  if (data.isCoordinator !== undefined) updateData.isCoordinator = data.isCoordinator;
  if (data.isSecretary !== undefined) updateData.isSecretary = data.isSecretary;
  if (data.isDpo !== undefined) updateData.isDpo = data.isDpo;
  if (data.status !== undefined) updateData.status = data.status;
  
  await db.update(governancaCppdMembers).set(updateData).where(and(
    eq(governancaCppdMembers.organizationId, organizationId),
    eq(governancaCppdMembers.id, memberId)
  ));
}

// Remover membro do CPPD
export async function removeCppdMember(organizationId: number, memberId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.update(governancaCppdMembers).set({
    status: 'inativo'
  }).where(and(
    eq(governancaCppdMembers.organizationId, organizationId),
    eq(governancaCppdMembers.id, memberId)
  ));
}


// ==================== AUDITORIA DE CLÁUSULAS LGPD ====================

export async function createClauseAuditEntry(data: {
  analysisId: number;
  clauseId: string;
  actionType: 'generated' | 'accepted' | 'rejected' | 'refined' | 'edited' | 'downloaded' | 'copied';
  previousContent?: string | null;
  newContent?: string | null;
  refinementInstructions?: string | null;
  userId: number;
  userName?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const result = await db.execute(sql`
    INSERT INTO clause_audit_log 
    ("analysisId", "clauseId", "clauseAuditActionType", "previousContent", "newContent", "refinementInstructions", "userId", "userName", metadata)
    VALUES (${data.analysisId}, ${data.clauseId}, ${data.actionType}, ${data.previousContent ?? null}, ${data.newContent ?? null}, ${data.refinementInstructions ?? null}, ${data.userId}, ${data.userName ?? null}, ${data.metadata ? JSON.stringify(data.metadata) : null})
    RETURNING id
  `);
  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
}

export async function getClauseAuditHistory(analysisId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT * FROM clause_audit_log 
    WHERE "analysisId" = ${analysisId}
    ORDER BY "createdAt" DESC
  `);
  
  return (result as any).rows as any[];
}

export async function getClauseAuditByClause(analysisId: number, clauseId: string): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT * FROM clause_audit_log 
    WHERE "analysisId" = ${analysisId} AND "clauseId" = ${clauseId}
    ORDER BY "createdAt" DESC
  `);
  
  return (result as any).rows as any[];
}

// ==================== EVIDÊNCIAS DE AÇÕES DO PLANO ====================

export async function addActionPlanEvidence(data: {
  actionPlanId: number;
  documentId: number;
  description?: string | null;
  addedById: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const result = await db.execute(sql`
    INSERT INTO action_plan_evidence 
    ("actionPlanId", "documentId", description, "addedById")
    VALUES (${data.actionPlanId}, ${data.documentId}, ${data.description ?? null}, ${data.addedById})
    RETURNING id
  `);
  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
}

export async function getActionPlanEvidences(actionPlanId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT 
      e.id, e."actionPlanId", e."documentId", e.description, e."addedById", e."createdAt",
      COALESCE(gd.name, d.name) as "documentName",
      COALESCE(gd."fileUrl", d."fileUrl") as "fileUrl",
      COALESCE(gd."mimeType", d."mimeType") as "mimeType",
      COALESCE(gd."fileSize", d."fileSize") as "fileSize",
      COALESCE(gd."fileName", gd.name, d.name) as "fileName",
      u.name as "addedByName"
    FROM action_plan_evidence e
    LEFT JOIN ged_documents gd ON e."documentId" = gd.id
    LEFT JOIN documents d ON e."documentId" = d.id
    LEFT JOIN users u ON e."addedById" = u.id
    WHERE e."actionPlanId" = ${actionPlanId}
    ORDER BY e."createdAt" DESC
  `);
  
  return (result as any).rows as any[];
}

export async function removeActionPlanEvidence(evidenceId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.execute(sql`
    DELETE FROM action_plan_evidence WHERE id = ${evidenceId}
  `);
}

// ==================== CLÁUSULAS GERADAS POR ANÁLISE ====================

export async function saveContractAnalysisClauses(analysisId: number, clauses: Array<{
  clauseId: string;
  sequenceNumber: number;
  title: string;
  content: string;
}>): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  // Primeiro, remover cláusulas existentes
  await db.execute(sql`
    DELETE FROM contract_analysis_clauses WHERE "analysisId" = ${analysisId}
  `);
  
  // Inserir novas cláusulas
  for (const clause of clauses) {
    await db.execute(sql`
      INSERT INTO contract_analysis_clauses 
      ("analysisId", "clauseId", "sequenceNumber", title, content, "originalContent", "isAccepted", "isApplicable", version)
      VALUES (${analysisId}, ${clause.clauseId}, ${clause.sequenceNumber}, ${clause.title}, ${clause.content}, ${clause.content}, true, true, 1)
    `);
  }
}

export async function getContractAnalysisClauses(analysisId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT * FROM contract_analysis_clauses 
    WHERE "analysisId" = ${analysisId}
    ORDER BY "sequenceNumber"
  `);
  
  return (result as any).rows as any[];
}

export async function updateContractAnalysisClause(clauseDbId: number, data: {
  content?: string;
  isAccepted?: boolean;
  version?: number;
  finalContent?: string;
  finalTitle?: string;
  isFinalApproved?: number;
  includeHeader?: number;
  includeContractReference?: number;
  editedById?: number;
  editedAt?: string;
  approvedById?: number;
  approvedAt?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  // Build dynamic update query
  const setClauses: string[] = [];
  const params: unknown[] = [];
  
  if (data.content !== undefined) {
    setClauses.push('content = ?');
    params.push(data.content);
  }
  if (data.isAccepted !== undefined) {
    setClauses.push('isAccepted = ?');
    params.push(data.isAccepted);
  }
  if (data.version !== undefined) {
    setClauses.push('version = ?');
    params.push(data.version);
  }
  if (data.finalContent !== undefined) {
    setClauses.push('finalContent = ?');
    params.push(data.finalContent);
  }
  if (data.finalTitle !== undefined) {
    setClauses.push('finalTitle = ?');
    params.push(data.finalTitle);
  }
  if (data.isFinalApproved !== undefined) {
    setClauses.push('isFinalApproved = ?');
    params.push(data.isFinalApproved);
  }
  if (data.includeHeader !== undefined) {
    setClauses.push('includeHeader = ?');
    params.push(data.includeHeader);
  }
  if (data.includeContractReference !== undefined) {
    setClauses.push('includeContractReference = ?');
    params.push(data.includeContractReference);
  }
  if (data.editedById !== undefined) {
    setClauses.push('editedById = ?');
    params.push(data.editedById);
  }
  if (data.editedAt !== undefined) {
    setClauses.push('editedAt = ?');
    params.push(data.editedAt);
  }
  if (data.approvedById !== undefined) {
    setClauses.push('approvedById = ?');
    params.push(data.approvedById);
  }
  if (data.approvedAt !== undefined) {
    setClauses.push('approvedAt = ?');
    params.push(data.approvedAt);
  }
  
  if (setClauses.length === 0) return;
  
  setClauses.push('updatedAt = NOW()');
  params.push(clauseDbId);
  
  // Build individual SET clauses with sql template
  const updateParts = setClauses.map((clause, i) => {
    const value = params[i];
    const field = clause.split(' = ')[0];
    return { field, value };
  });
  
  // Execute update using raw SQL with properly escaped values
  const setClauseStr = updateParts.map(p => {
    if (p.value === null) return `${p.field} = NULL`;
    if (typeof p.value === 'number') return `${p.field} = ${p.value}`;
    if (typeof p.value === 'boolean') return `${p.field} = ${p.value ? 1 : 0}`;
    return `${p.field} = '${String(p.value).replace(/'/g, "''")}'`;
  }).join(', ');
  
  await db.execute(sql`UPDATE contract_analysis_clauses SET ${sql.raw(setClauseStr)} WHERE id = ${clauseDbId}`);
}

export async function getContractAnalysisClauseById(clauseDbId: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(sql`
    SELECT * FROM contract_analysis_clauses WHERE id = ${clauseDbId} LIMIT 1
  `);
  
  return (result as any).rows?.[0] || null;
}


// ==================== VERSIONAMENTO DE CLÁUSULAS ====================

export async function createClauseVersion(
  clauseId: number,
  analysisId: number,
  title: string,
  content: string,
  includeHeader: boolean,
  includeContractReference: boolean,
  changeDescription: string | null,
  createdById: number
): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  // Buscar o próximo número de versão
  const versionResult = await db.execute(sql`
    SELECT COALESCE(MAX(versionNumber), 0) + 1 as nextVersion 
    FROM contract_clause_versions 
    WHERE "clauseId" = ${clauseId}
  `);
  const nextVersion = ((versionResult.rows as unknown as any[])[0]?.nextVersion) || 1;
  
  // Inserir nova versão
  const result = await db.execute(sql`
    INSERT INTO contract_clause_versions 
    ("clauseId", "analysisId", "versionNumber", title, content, "includeHeader", "includeContractReference", "changeDescription", "createdById")
    VALUES (${clauseId}, ${analysisId}, ${nextVersion}, ${title}, ${content}, ${includeHeader ? 1 : 0}, ${includeContractReference ? 1 : 0}, ${changeDescription}, ${createdById})
    RETURNING id
  `);
  
  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
}

export async function getClauseVersions(clauseId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT cv.*, u.name as createdByName
    FROM contract_clause_versions cv
    LEFT JOIN users u ON cv."createdById" = u.id
    WHERE cv."clauseId" = ${clauseId}
    ORDER BY cv."versionNumber" DESC
  `);
  
  return (result as any).rows || [];
}

export async function getClauseVersionById(versionId: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(sql`
    SELECT cv.*, u.name as createdByName
    FROM contract_clause_versions cv
    LEFT JOIN users u ON cv."createdById" = u.id
    WHERE cv.id = ${versionId}
    LIMIT 1
  `);
  
  return (result as any).rows?.[0] || null;
}

export async function rollbackClauseToVersion(
  clauseId: number,
  versionId: number,
  userId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  // Buscar a versão para rollback
  const version = await getClauseVersionById(versionId);
  if (!version || version.clauseId !== clauseId) return false;
  
  // Atualizar a cláusula com os dados da versão
  await db.execute(sql`
    UPDATE contract_analysis_clauses 
    SET "finalTitle" = ${version.title},
        "finalContent" = ${version.content},
        "includeHeader" = ${version.includeHeader},
        "includeContractReference" = ${version.includeContractReference},
        "editedById" = ${userId},
        "editedAt" = NOW(),
        "updatedAt" = NOW()
    WHERE id = ${clauseId}
  `);
  
  // Criar nova versão registrando o rollback
  await createClauseVersion(
    clauseId,
    version.analysisId,
    version.title,
    version.content,
    version.includeHeader === 1,
    version.includeContractReference === 1,
    `Rollback para versão ${version.versionNumber}`,
    userId
  );
  
  return true;
}

export async function compareClauseVersions(
  versionId1: number,
  versionId2: number
): Promise<{ version1: any; version2: any } | null> {
  const version1 = await getClauseVersionById(versionId1);
  const version2 = await getClauseVersionById(versionId2);
  
  if (!version1 || !version2) return null;
  
  return { version1, version2 };
}

// ==================== PLANOS MENSAIS DE GOVERNANÇA ====================

// --- Templates de Plano Anual ---
export async function getPlanoAnualTemplateByKey(templateKey: string): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(sql`
    SELECT * FROM governanca_plano_anual_templates WHERE "templateKey" = ${templateKey} LIMIT 1
  `);
  
  return (result as any).rows?.[0] || null;
}

export async function getPlanoAnualTemplateById(id: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(sql`
    SELECT * FROM governanca_plano_anual_templates WHERE id = ${id} LIMIT 1
  `);
  
  return (result as any).rows?.[0] || null;
}

export async function createPlanoAnualTemplate(data: {
  templateKey: string;
  programModel: "ano1" | "em_curso";
  label: string;
  description: string | null;
  totalMonths: number;
  isActive: boolean;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const result = await db.execute(sql`
    INSERT INTO governanca_plano_anual_templates ("templateKey", "programModel", label, description, "totalMonths", "isActive")
    VALUES (${data.templateKey}, ${data.programModel}, ${data.label}, ${data.description}, ${data.totalMonths}, ${data.isActive})
    RETURNING id
  `);
  
  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
}

export async function listPlanoAnualTemplates(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT * FROM governanca_plano_anual_templates WHERE "isActive" = true ORDER BY "programModel"
  `);
  
  return (result as any).rows as any[];
}

// --- Templates de Mês ---
export async function createMesTemplate(data: {
  planoAnualTemplateId: number;
  templateKey: string;
  monthNumber: number;
  macroBlock: string;
  title: string;
  theme: string;
  activities: string[];
  deliverables: string[];
  blockColor: string;
  icon: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const result = await db.execute(sql`
    INSERT INTO governanca_mes_templates ("planoAnualTemplateId", "templateKey", "monthNumber", "macroBlock", title, theme, activities, deliverables, "blockColor", icon)
    VALUES (${data.planoAnualTemplateId}, ${data.templateKey}, ${data.monthNumber}, ${data.macroBlock}, ${data.title}, ${data.theme}, ${JSON.stringify(data.activities)}, ${JSON.stringify(data.deliverables)}, ${data.blockColor}, ${data.icon})
    RETURNING id
  `);
  
  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
}

export async function listMesTemplatesByPlanoId(planoAnualTemplateId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT * FROM governanca_mes_templates WHERE "planoAnualTemplateId" = ${planoAnualTemplateId} ORDER BY "monthNumber"
  `);
  
  return (result as any).rows as any[];
}

export async function getMesTemplateById(id: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(sql`
    SELECT * FROM governanca_mes_templates WHERE id = ${id} LIMIT 1
  `);
  
  return (result as any).rows?.[0] || null;
}

// --- Plano Anual da Organização ---
export async function createPlanoAnualOrganizacao(data: {
  organizationId: number;
  templateId: number;
  year: number;
  startDate: Date;
  status: string;
  notes: string | null;
  createdById: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const result = await db.execute(sql`
    INSERT INTO governanca_plano_anual_organizacao ("organizationId", "templateId", year, "startDate", status, notes, "createdById")
    VALUES (${data.organizationId}, ${data.templateId}, ${data.year}, ${data.startDate}, ${data.status}, ${data.notes}, ${data.createdById})
    RETURNING id
  `);
  
  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
}

export async function getPlanoAnualOrganizacaoById(organizationId: number, planoId: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(sql`
    SELECT * FROM governanca_plano_anual_organizacao WHERE id = ${planoId} AND "organizationId" = ${organizationId} LIMIT 1
  `);
  
  return (result as any).rows?.[0] || null;
}

export async function listPlanosAnuaisOrganizacao(organizationId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT p.*, t.label as templateLabel, t."programModel"
    FROM governanca_plano_anual_organizacao p
    JOIN governanca_plano_anual_templates t ON p."templateId" = t.id
    WHERE p."organizationId" = ${organizationId}
    ORDER BY p.year DESC
  `);
  
  return (result as any).rows as any[];
}

export async function updatePlanoAnualOrganizacaoStatus(organizationId: number, planoId: number, status: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.execute(sql`
    UPDATE governanca_plano_anual_organizacao SET status = ${status} WHERE id = ${planoId} AND "organizationId" = ${organizationId}
  `);
}

// --- Mês da Organização ---
export async function createMesOrganizacao(data: {
  planoOrganizacaoId: number;
  organizationId: number;
  mesTemplateId: number;
  monthNumber: number;
  scheduledStartDate: Date | null;
  scheduledEndDate: Date | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  status: string;
  notes: string | null;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const result = await db.execute(sql`
    INSERT INTO governanca_mes_organizacao ("planoOrganizacaoId", "organizationId", "mesTemplateId", "monthNumber", "scheduledStartDate", "scheduledEndDate", "actualStartDate", "actualEndDate", status, notes)
    VALUES (${data.planoOrganizacaoId}, ${data.organizationId}, ${data.mesTemplateId}, ${data.monthNumber}, ${data.scheduledStartDate}, ${data.scheduledEndDate}, ${data.actualStartDate}, ${data.actualEndDate}, ${data.status}, ${data.notes})
    RETURNING id
  `);
  
  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
}

export async function getMesOrganizacaoById(organizationId: number, mesId: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(sql`
    SELECT * FROM governanca_mes_organizacao WHERE id = ${mesId} AND "organizationId" = ${organizationId} LIMIT 1
  `);
  
  return (result as any).rows?.[0] || null;
}

export async function listMesesOrganizacaoByPlano(organizationId: number, planoId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT * FROM governanca_mes_organizacao WHERE "planoOrganizacaoId" = ${planoId} AND "organizationId" = ${organizationId} ORDER BY "monthNumber"
  `);
  
  return (result as any).rows as any[];
}

export async function updateMesOrganizacaoStatus(organizationId: number, mesId: number, status: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.execute(sql`
    UPDATE governanca_mes_organizacao SET status = ${status} WHERE id = ${mesId} AND "organizationId" = ${organizationId}
  `);
}

export async function updateMesOrganizacaoActualDates(organizationId: number, mesId: number, actualStartDate: Date | null, actualEndDate: Date | null): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.execute(sql`
    UPDATE governanca_mes_organizacao SET "actualStartDate" = ${actualStartDate}, "actualEndDate" = ${actualEndDate} WHERE id = ${mesId} AND "organizationId" = ${organizationId}
  `);
}

// --- Atividades da Organização ---
export async function createAtividadeOrganizacao(data: {
  mesOrganizacaoId: number;
  organizationId: number;
  order: number;
  description: string;
  status: string;
  assignedToId: number | null;
  assignedToName: string | null;
  completedAt: Date | null;
  notes: string | null;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const result = await db.execute(sql`
    INSERT INTO governanca_atividade_organizacao ("mesOrganizacaoId", "organizationId", \`order\`, description, status, "assignedToId", "assignedToName", "completedAt", notes)
    VALUES (${data.mesOrganizacaoId}, ${data.organizationId}, ${data.order}, ${data.description}, ${data.status}, ${data.assignedToId}, ${data.assignedToName}, ${data.completedAt}, ${data.notes})
    RETURNING id
  `);
  
  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
}

export async function listAtividadesByMesOrganizacao(organizationId: number, mesOrganizacaoId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT * FROM governanca_atividade_organizacao WHERE "mesOrganizacaoId" = ${mesOrganizacaoId} AND "organizationId" = ${organizationId} ORDER BY \`order\`
  `);
  
  return (result as any).rows as any[];
}

export async function updateAtividadeStatus(organizationId: number, atividadeId: number, status: string, completedAt: Date | null): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.execute(sql`
    UPDATE governanca_atividade_organizacao SET status = ${status}, "completedAt" = ${completedAt} WHERE id = ${atividadeId} AND "organizationId" = ${organizationId}
  `);
}

export async function updateAtividadeAssignee(organizationId: number, atividadeId: number, assignedToId: number | null, assignedToName: string | null): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.execute(sql`
    UPDATE governanca_atividade_organizacao SET "assignedToId" = ${assignedToId}, "assignedToName" = ${assignedToName} WHERE id = ${atividadeId} AND "organizationId" = ${organizationId}
  `);
}

// --- Entregáveis da Organização ---
export async function createEntregavelOrganizacao(data: {
  mesOrganizacaoId: number;
  organizationId: number;
  order: number;
  name: string;
  description: string | null;
  status: string;
  assignedToId: number | null;
  assignedToName: string | null;
  documentId: number | null;
  documentUrl: string | null;
  dueDate: Date | null;
  completedAt: Date | null;
  notes: string | null;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const result = await db.execute(sql`
    INSERT INTO governanca_entregavel_organizacao ("mesOrganizacaoId", "organizationId", \`order\`, name, description, status, "assignedToId", "assignedToName", "documentId", "documentUrl", "dueDate", "completedAt", notes)
    VALUES (${data.mesOrganizacaoId}, ${data.organizationId}, ${data.order}, ${data.name}, ${data.description}, ${data.status}, ${data.assignedToId}, ${data.assignedToName}, ${data.documentId}, ${data.documentUrl}, ${data.dueDate}, ${data.completedAt}, ${data.notes})
    RETURNING id
  `);
  
  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
}

export async function listEntregaveisByMesOrganizacao(organizationId: number, mesOrganizacaoId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT * FROM governanca_entregavel_organizacao WHERE "mesOrganizacaoId" = ${mesOrganizacaoId} AND "organizationId" = ${organizationId} ORDER BY \`order\`
  `);
  
  return (result as any).rows as any[];
}

export async function updateEntregavelStatus(organizationId: number, entregavelId: number, status: string, completedAt: Date | null): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.execute(sql`
    UPDATE governanca_entregavel_organizacao SET status = ${status}, "completedAt" = ${completedAt} WHERE id = ${entregavelId} AND "organizationId" = ${organizationId}
  `);
}

export async function updateEntregavelDocument(organizationId: number, entregavelId: number, documentId: number | null, documentUrl: string | null): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.execute(sql`
    UPDATE governanca_entregavel_organizacao SET "documentId" = ${documentId}, "documentUrl" = ${documentUrl} WHERE id = ${entregavelId} AND "organizationId" = ${organizationId}
  `);
}

export async function updateEntregavelAssignee(organizationId: number, entregavelId: number, assignedToId: number | null, assignedToName: string | null): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.execute(sql`
    UPDATE governanca_entregavel_organizacao SET "assignedToId" = ${assignedToId}, "assignedToName" = ${assignedToName} WHERE id = ${entregavelId} AND "organizationId" = ${organizationId}
  `);
}


// ==================== THIRD PARTY SYNC FUNCTIONS ====================

export async function getThirdPartyContracts(thirdPartyId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT * FROM third_party_contracts 
    WHERE third_party_id = ${thirdPartyId}
    ORDER BY created_at DESC
  `);
  return (result as any)[0] || [];
}

export async function getContractAnalysesByThirdParty(thirdPartyId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT * FROM contract_analyses 
    WHERE third_party_id = ${thirdPartyId}
    ORDER BY created_at DESC
  `);
  return (result as any)[0] || [];
}

export async function getActionPlansByThirdParty(thirdPartyId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT ap.*, COALESCE(u.name, ap."responsibleName") as responsibleName
    FROM action_plans ap
    INNER JOIN third_party_assessments tpa
      ON ap.assessment_type = 'third_party'
      AND ap.assessment_id = tpa.id
    LEFT JOIN users u ON ap."responsibleId" = u.id
    WHERE tpa.third_party_id = ${thirdPartyId}
    ORDER BY ap.created_at DESC
  `);
  return (result as any)[0] || [];
}

export async function getThirdPartyActivities(thirdPartyId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT * FROM third_party_activities 
    WHERE third_party_id = ${thirdPartyId}
    ORDER BY created_at DESC
    LIMIT 50
  `);
  return (result as any)[0] || [];
}

export async function createThirdPartyActivity(data: {
  thirdPartyId: number;
  organizationId: number;
  activityType: string;
  title: string;
  description?: string;
  referenceId?: number;
  referenceType?: string;
  createdById?: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const result = await db.execute(sql`
    INSERT INTO third_party_activities (third_party_id, organization_id, activity_type, title, description, reference_id, reference_type, created_by_id, created_at)
    VALUES (${data.thirdPartyId}, ${data.organizationId}, ${data.activityType}, ${data.title}, ${data.description || null}, ${data.referenceId || null}, ${data.referenceType || null}, ${data.createdById || null}, NOW())
    RETURNING id
  `);
  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id ?? 0;
}

export async function findThirdPartyByCnpj(organizationId: number, cnpj: string): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(sql`
    SELECT * FROM third_parties 
    WHERE organization_id = ${organizationId} AND cnpj = ${cnpj}
    LIMIT 1
  `);
  const rows = (result as any)[0];
  return rows?.[0] || null;
}

export async function findThirdPartyByName(organizationId: number, name: string): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(sql`
    SELECT * FROM third_parties 
    WHERE organization_id = ${organizationId} AND (name = ${name} OR trade_name = ${name})
    LIMIT 1
  `);
  const rows = (result as any)[0];
  return rows?.[0] || null;
}

export async function createThirdPartyContract(data: {
  thirdPartyId: number;
  organizationId: number;
  contractAnalysisId?: number;
  documentId?: number;
  title: string;
  contractNumber?: string;
  contractType?: string;
  department?: string;
  startDate?: Date;
  endDate?: Date;
  signatureDate?: Date;
  status?: string;
  riskLevel?: string;
  lgpdCompliant?: boolean;
  dataProcessingAgreement?: boolean;
  confidentialityClause?: boolean;
  createdById?: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const result = await db.execute(sql`
    INSERT INTO third_party_contracts (
      third_party_id, organization_id, contract_analysis_id, document_id,
      title, contract_number, contract_type, department,
      start_date, end_date, signature_date, status, risk_level,
      lgpd_compliant, data_processing_agreement, confidentiality_clause,
      created_by_id, created_at
    ) VALUES (
      ${data.thirdPartyId}, ${data.organizationId}, ${data.contractAnalysisId || null}, ${data.documentId || null},
      ${data.title}, ${data.contractNumber || null}, ${data.contractType || null}, ${data.department || null},
      ${data.startDate || null}, ${data.endDate || null}, ${data.signatureDate || null}, ${data.status || 'ativo'}, ${data.riskLevel || null},
      ${data.lgpdCompliant ? 1 : 0}, ${data.dataProcessingAgreement ? 1 : 0}, ${data.confidentialityClause ? 1 : 0},
      ${data.createdById || null}, NOW()
    )
    RETURNING id
  `);
  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id ?? 0;
}

export async function updateThirdPartyContract(contractId: number, data: Partial<{
  title: string;
  contractNumber: string;
  contractType: string;
  department: string;
  startDate: Date;
  endDate: Date;
  signatureDate: Date;
  status: string;
  riskLevel: string;
  lgpdCompliant: boolean;
  dataProcessingAgreement: boolean;
  confidentialityClause: boolean;
}>): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  // Using parameterized query to prevent SQL injection
  await db.execute(sql`
    UPDATE third_party_contracts SET
      title = COALESCE(${data.title ?? null}, title),
      contract_number = COALESCE(${data.contractNumber ?? null}, contract_number),
      contract_type = COALESCE(${data.contractType ?? null}, contract_type),
      department = COALESCE(${data.department ?? null}, department),
      status = COALESCE(${data.status ?? null}, status),
      risk_level = COALESCE(${data.riskLevel ?? null}, risk_level),
      lgpd_compliant = COALESCE(${data.lgpdCompliant !== undefined ? (data.lgpdCompliant ? 1 : 0) : null}, lgpd_compliant),
      updated_at = NOW()
    WHERE id = ${contractId}
  `);
}

export async function getContractByAnalysisId(analysisId: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(sql`
    SELECT * FROM third_party_contracts 
    WHERE contract_analysis_id = ${analysisId}
    LIMIT 1
  `);
  const rows = (result as any)[0];
  return rows?.[0] || null;
}


// ========== Governança - Funções Adicionais ==========

export async function updateGovernancaMeetingTranscript(
  organizationId: number,
  meetingId: number,
  transcript: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.execute(sql`
    UPDATE governanca_meetings 
    SET transcript = ${transcript}, "updatedAt" = NOW()
    WHERE id = ${meetingId} AND "organizationId" = ${organizationId}
  `);
}

export async function getGovernancaMeetingById(
  organizationId: number,
  meetingId: number
): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(sql`
    SELECT * FROM governanca_meetings 
    WHERE id = ${meetingId} AND "organizationId" = ${organizationId}
    LIMIT 1
  `);
  const rows = (result as any)[0];
  return rows?.[0] || null;
}


// ============================================================================
// Contract Share Tokens
// ============================================================================

export async function createContractShareToken(data: {
  analysisId: number;
  token: string;
  createdById: number;
  expiresAt: Date;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.execute(sql`
    INSERT INTO contract_share_tokens ("analysisId", token, "createdById", "expiresAt", "createdAt")
    VALUES (${data.analysisId}, ${data.token}, ${data.createdById}, ${data.expiresAt}, NOW())
  `);
}

export async function getContractShareToken(token: string): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(sql`
    SELECT * FROM contract_share_tokens 
    WHERE token = ${token} AND "expiresAt" > NOW()
    LIMIT 1
  `);
  const rows = (result as any)[0];
  return rows?.[0] || null;
}

export async function getContractShareTokensByAnalysis(analysisId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT * FROM contract_share_tokens 
    WHERE "analysisId" = ${analysisId}
    ORDER BY "createdAt" DESC
  `);
  return (result as any)[0] || [];
}


// ============================================================================
// User Invites - Funções para relatório de cadastros
// ============================================================================

export async function getAllInvites(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT ui.*, o.name as organizationName
    FROM user_invites ui
    LEFT JOIN organizations o ON ui."organizationId" = o.id
    ORDER BY ui."createdAt" DESC
  `);
  return (result as any)[0] || [];
}


// ============================================================================
// Notification History - Histórico de Notificações
// ============================================================================

export interface CreateNotificationHistoryData {
  organizationId?: number;
  userId?: number;
  type: 'sla_alert' | 'sla_summary' | 'ticket_created' | 'ticket_updated' | 'ticket_assigned' | 'deadline_warning' | 'system' | 'email' | 'owner';
  title: string;
  content: string;
  channel?: 'app' | 'email' | 'owner_notification';
  status?: 'pending' | 'sent' | 'failed' | 'read';
  metadata?: Record<string, unknown>;
  errorMessage?: string;
}

export async function createNotificationHistory(data: CreateNotificationHistoryData): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const result = await db.execute(sql`
    INSERT INTO notification_history 
    ("organizationId", "userId", type, title, content, channel, status, metadata, "errorMessage", "sentAt")
    VALUES (
      ${data.organizationId || null},
      ${data.userId || null},
      ${data.type},
      ${data.title},
      ${data.content},
      ${data.channel || 'app'},
      ${data.status || 'pending'},
      ${data.metadata ? JSON.stringify(data.metadata) : null},
      ${data.errorMessage || null},
      ${data.status === 'sent' ? sql`NOW()` : null}
    )
    RETURNING id
  `);
  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
}

export async function updateNotificationHistoryStatus(
  id: number, 
  status: 'pending' | 'sent' | 'failed' | 'read',
  errorMessage?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  if (status === 'sent') {
    await db.execute(sql`
      UPDATE notification_history 
      SET status = ${status}, "sentAt" = NOW()
      WHERE id = ${id}
    `);
  } else if (status === 'read') {
    await db.execute(sql`
      UPDATE notification_history 
      SET status = ${status}, "readAt" = NOW()
      WHERE id = ${id}
    `);
  } else if (status === 'failed') {
    await db.execute(sql`
      UPDATE notification_history 
      SET status = ${status}, "errorMessage" = ${errorMessage || null}
      WHERE id = ${id}
    `);
  } else {
    await db.execute(sql`
      UPDATE notification_history 
      SET status = ${status}
      WHERE id = ${id}
    `);
  }
}

export async function getNotificationHistory(params: {
  organizationId?: number;
  userId?: number;
  type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  let query = sql`SELECT * FROM notification_history WHERE 1=1`;
  
  if (params.organizationId) {
    query = sql`${query} AND "organizationId" = ${params.organizationId}`;
  }
  if (params.userId) {
    query = sql`${query} AND "userId" = ${params.userId}`;
  }
  if (params.type) {
    query = sql`${query} AND type = ${params.type}`;
  }
  if (params.status) {
    query = sql`${query} AND status = ${params.status}`;
  }
  
  query = sql`${query} ORDER BY "createdAt" DESC`;
  
  if (params.limit) {
    query = sql`${query} LIMIT ${params.limit}`;
    if (params.offset) {
      query = sql`${query} OFFSET ${params.offset}`;
    }
  }
  
  const result = await db.execute(query);
  return (result as any)[0] || [];
}

export async function getNotificationHistoryById(id: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(sql`
    SELECT * FROM notification_history WHERE id = ${id} LIMIT 1
  `);
  const rows = (result as any)[0];
  return rows?.[0] || null;
}

export async function getNotificationHistoryStats(organizationId?: number): Promise<{
  total: number;
  pending: number;
  sent: number;
  failed: number;
  read: number;
  byType: Record<string, number>;
}> {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, sent: 0, failed: 0, read: 0, byType: {} };
  
  const whereClause = organizationId 
    ? sql`WHERE "organizationId" = ${organizationId}` 
    : sql`WHERE 1=1`;
  
  // Count by status
  const statusResult = await db.execute(sql`
    SELECT status, COUNT(*) as count 
    FROM notification_history 
    ${whereClause}
    GROUP BY status
  `);
  const statusRows = (statusResult as any)[0] || [];
  
  const stats = {
    total: 0,
    pending: 0,
    sent: 0,
    failed: 0,
    read: 0,
    byType: {} as Record<string, number>
  };
  
  for (const row of statusRows) {
    (stats as any)[row.status] = Number(row.count);
    stats.total += Number(row.count);
  }
  
  // Count by type
  const typeResult = await db.execute(sql`
    SELECT type, COUNT(*) as count 
    FROM notification_history 
    ${whereClause}
    GROUP BY type
  `);
  const typeRows = (typeResult as any)[0] || [];
  
  for (const row of typeRows) {
    stats.byType[row.type] = Number(row.count);
  }
  
  return stats;
}

export async function markNotificationsAsRead(ids: number[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  if (ids.length === 0) return;
  
  await db.execute(sql`
    UPDATE notification_history 
    SET status = 'read', "readAt" = NOW()
    WHERE id IN (${sql.raw(ids.join(','))})
  `);
}

export async function deleteOldNotifications(daysOld: number = 90): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const result = await db.execute(sql`
    DELETE FROM notification_history 
    WHERE "createdAt" < NOW() - INTERVAL '1 day' * ${daysOld}
  `);
  return (result as any).rowCount || 0;
}

// Helper functions for SQL timestamps
export function nowSql() {
  return sql`NOW()`;
}

export function toSqlTimestamp(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}
