/**
 * Serviço de Consolidação de Registros Duplicados de Usuários
 * 
 * Detecta e mescla automaticamente registros com o mesmo e-mail mas IDs diferentes,
 * resolvendo conflitos entre registros criados via OAuth e registros criados manualmente.
 * 
 * Regras de mesclagem:
 * 1. O registro "principal" é aquele que tem mais dados preenchidos (organizationId, role, etc.)
 * 2. O openId do OAuth é preservado no registro principal
 * 3. O registro secundário é marcado como "merged" e desativado
 * 4. Referências em tabelas relacionadas são atualizadas para apontar ao registro principal
 */

import { getDb } from "./db";
import { eq, sql, and, ne, isNotNull } from "drizzle-orm";
import {
  users,
  mapeamentoResponses,
  assessmentResponses,
  actionPlans,
  rotOperations,
  gedDocuments,
  textVersionHistory,
} from "../drizzle/schema";

// ==================== TIPOS ====================

interface DuplicateGroup {
  email: string;
  records: Array<{
    id: number;
    openId: string | null;
    name: string | null;
    email: string | null;
    role: string | null;
    organizationId: number | null;
    loginMethod: string | null;
    passwordHash: string | null;
    createdAt: any;
    lastSignedIn: any;
  }>;
}

interface ConsolidationResult {
  email: string;
  primaryId: number;
  mergedIds: number[];
  tablesUpdated: string[];
  success: boolean;
  error?: string;
}

// ==================== DETECÇÃO ====================

/**
 * Detecta todos os e-mails com mais de um registro de usuário
 */
export async function detectDuplicates(): Promise<DuplicateGroup[]> {
  const db = await getDb();
  if (!db) return [];

  // Buscar e-mails duplicados
  const duplicateEmails = await db
    .select({
      email: users.email,
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(users)
    .where(isNotNull(users.email))
    .groupBy(users.email)
    .having(sql`COUNT(*) > 1`);

  const groups: DuplicateGroup[] = [];

  for (const { email } of duplicateEmails) {
    if (!email) continue;

    const records = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    groups.push({
      email,
      records: records.map((r) => ({
        id: r.id,
        openId: r.openId,
        name: r.name,
        email: r.email,
        role: r.role,
        organizationId: r.organizationId,
        loginMethod: r.loginMethod,
        passwordHash: (r as any).passwordHash || null,
        createdAt: r.createdAt,
        lastSignedIn: r.lastSignedIn,
      })),
    });
  }

  return groups;
}

// ==================== SCORING ====================

/**
 * Calcula a pontuação de um registro para determinar qual é o "principal".
 * Quanto maior a pontuação, mais completo/importante é o registro.
 */
function scoreRecord(record: DuplicateGroup["records"][0]): number {
  let score = 0;

  // Tem organização vinculada (+5)
  if (record.organizationId) score += 5;

  // Tem role diferente de "sponsor" (+3)
  if (record.role && record.role !== "sponsor") score += 3;

  // Tem openId (OAuth vinculado) (+2)
  if (record.openId) score += 2;

  // Tem senha (login local) (+2)
  if (record.passwordHash) score += 2;

  // Tem nome (+1)
  if (record.name) score += 1;

  // Login mais recente (+1)
  if (record.lastSignedIn) score += 1;

  return score;
}

// ==================== MESCLAGEM ====================

/**
 * Mescla um grupo de registros duplicados.
 * O registro com maior pontuação é mantido como principal.
 * Os demais são marcados como "merged".
 */
export async function mergeGroup(group: DuplicateGroup): Promise<ConsolidationResult> {
  const db = await getDb();
  if (!db) {
    return {
      email: group.email,
      primaryId: 0,
      mergedIds: [],
      tablesUpdated: [],
      success: false,
      error: "Banco de dados indisponível",
    };
  }

  // Ordenar por pontuação (maior primeiro)
  const sorted = [...group.records].sort((a, b) => scoreRecord(b) - scoreRecord(a));
  const primary = sorted[0];
  const secondaries = sorted.slice(1);
  const tablesUpdated: string[] = [];

  try {
    // 1. Garantir que o registro principal tem o openId do OAuth
    const oauthRecord = group.records.find((r) => r.openId && r.loginMethod !== "local");
    if (oauthRecord && oauthRecord.id !== primary.id && oauthRecord.openId) {
      // Limpar o openId do registro OAuth secundário primeiro
      await db
        .update(users)
        .set({ openId: `merged_${oauthRecord.id}_${Date.now()}` })
        .where(eq(users.id, oauthRecord.id));

      // Atualizar o openId do registro principal
      await db
        .update(users)
        .set({ openId: oauthRecord.openId })
        .where(eq(users.id, primary.id));

      tablesUpdated.push("users (openId transferido)");
    }

    // 2. Se o principal não tem senha mas um secundário tem, copiar
    if (!primary.passwordHash) {
      const withPassword = secondaries.find((r) => r.passwordHash);
      if (withPassword) {
        await db
          .update(users)
          .set({ passwordHash: withPassword.passwordHash } as any)
          .where(eq(users.id, primary.id));
        tablesUpdated.push("users (senha copiada)");
      }
    }

    // 3. Atualizar referências em tabelas relacionadas
    for (const secondary of secondaries) {
      const sid = secondary.id;
      const pid = primary.id;

      // mapeamento_responses
      try {
        const result = await db
          .update(mapeamentoResponses)
          .set({ respondentId: pid })
          .where(eq(mapeamentoResponses.respondentId, sid));
        if ((result as any).rowCount > 0) tablesUpdated.push("mapeamento_responses");
      } catch (e) { /* tabela pode não existir */ }

      // mapeamento_respondents (atualizar por e-mail, não tem userId)
      // Esta tabela usa e-mail para vincular, não userId direto

      // ua_responses (avaliações unificadas)
      try {
        const result = await db
          .update(assessmentResponses)
          .set({ respondedByUserId: pid })
          .where(eq(assessmentResponses.respondedByUserId, sid));
        if ((result as any).rowCount > 0) tablesUpdated.push("ua_responses");
      } catch (e) { /* tabela pode não existir */ }

      // action_plans (responsibleId)
      try {
        const result = await db
          .update(actionPlans)
          .set({ responsibleId: pid })
          .where(eq(actionPlans.responsibleId, sid));
        if ((result as any).rowCount > 0) tablesUpdated.push("action_plans (responsible)");
      } catch (e) { /* tabela pode não existir */ }

      // rot_operations
      try {
        const result = await db
          .update(rotOperations)
          .set({ createdById: pid })
          .where(eq(rotOperations.createdById, sid));
        if ((result as any).rowCount > 0) tablesUpdated.push("rot_operations");
      } catch (e) { /* tabela pode não existir */ }

      // ged_documents (createdById)
      try {
        const result = await db
          .update(gedDocuments)
          .set({ createdById: pid })
          .where(eq(gedDocuments.createdById, sid));
        if ((result as any).rowCount > 0) tablesUpdated.push("ged_documents");
      } catch (e) { /* tabela pode não existir */ }

      // text_version_history
      try {
        const result = await db
          .update(textVersionHistory)
          .set({ createdById: pid })
          .where(eq(textVersionHistory.createdById, sid));
        if ((result as any).rowCount > 0) tablesUpdated.push("text_version_history");
      } catch (e) { /* tabela pode não existir */ }

      // 4. Marcar o registro secundário como mesclado
      await db
        .update(users)
        .set({
          email: `merged_${sid}_${secondary.email}`,
          name: `[MESCLADO] ${secondary.name || ""}`,
          role: "sponsor",
          loginMethod: "merged",
        })
        .where(eq(users.id, sid));
    }

    return {
      email: group.email,
      primaryId: primary.id,
      mergedIds: secondaries.map((s) => s.id),
      tablesUpdated: Array.from(new Set(tablesUpdated)),
      success: true,
    };
  } catch (error: any) {
    return {
      email: group.email,
      primaryId: primary.id,
      mergedIds: secondaries.map((s) => s.id),
      tablesUpdated,
      success: false,
      error: error.message,
    };
  }
}

// ==================== CONSOLIDAÇÃO COMPLETA ====================

/**
 * Executa a consolidação completa: detecta duplicatas e mescla todas.
 * Retorna um relatório detalhado.
 */
export async function consolidateAllDuplicates(): Promise<{
  totalGroups: number;
  consolidated: number;
  errors: number;
  results: ConsolidationResult[];
}> {
  const groups = await detectDuplicates();

  const results: ConsolidationResult[] = [];
  let consolidated = 0;
  let errors = 0;

  for (const group of groups) {
    const result = await mergeGroup(group);
    results.push(result);
    if (result.success) consolidated++;
    else errors++;
  }

  return {
    totalGroups: groups.length,
    consolidated,
    errors,
    results,
  };
}

/**
 * Relatório de duplicatas sem executar a mesclagem (modo seco / dry-run)
 */
export async function dryRunReport(): Promise<{
  totalDuplicates: number;
  groups: Array<{
    email: string;
    records: Array<{
      id: number;
      name: string | null;
      role: string | null;
      organizationId: number | null;
      hasOpenId: boolean;
      hasPassword: boolean;
      score: number;
      wouldBePrimary: boolean;
    }>;
  }>;
}> {
  const groups = await detectDuplicates();

  return {
    totalDuplicates: groups.length,
    groups: groups.map((g) => {
      const sorted = [...g.records].sort((a, b) => scoreRecord(b) - scoreRecord(a));
      return {
        email: g.email,
        records: sorted.map((r, i) => ({
          id: r.id,
          name: r.name,
          role: r.role,
          organizationId: r.organizationId,
          hasOpenId: !!r.openId,
          hasPassword: !!r.passwordHash,
          score: scoreRecord(r),
          wouldBePrimary: i === 0,
        })),
      };
    }),
  };
}
