import { sql } from "drizzle-orm";
import { getDb } from "./db";

type AnyRow = Record<string, any>;

async function hasColumn(table: string, col: string) {
  const db = await getDb();
  const { rows: rows } = await db.execute(sql`
    SELECT COUNT(*) as c
    FROM information_schema.columns
    WHERE table_catalog = current_database()
      AND table_schema = 'public'
      AND table_name = ${table}
      AND column_name = ${col}
  `);
  return Number((rows as AnyRow[])[0]?.c || 0) > 0;
}

async function pickColumn(table: string, candidates: string[]) {
  for (const c of candidates) if (await hasColumn(table, c)) return c;
  return null;
}

export async function getOrgProfile(organizationId: number) {
  const db = await getDb();

  const segmentCol = await pickColumn("organizations", ["segment", "segmento", "industrySegment", "industry_segment"]);
  const businessTypeCol = await pickColumn("organizations", ["businessType", "tipoNegocio", "business_type", "business_type_code"]);
  const unitsCol = await pickColumn("organizations", ["units", "numeroUnidades", "numberOfUnits", "number_of_units"]);
  const employeesCol = await pickColumn("organizations", ["employeesRange", "employeeRange", "numeroColaboradores", "employees_range"]);
  const hasDpoCol = await pickColumn("organizations", ["hasDpo", "possuiDpo", "has_dpo"]);
  const dpoNameCol = await pickColumn("organizations", ["dpoName", "nomeDpo", "dpo_name"]);
  const dpoEmailCol = await pickColumn("organizations", ["dpoEmail", "emailDpo", "dpo_email"]);
  const sponsorUserIdCol = await pickColumn("organizations", ["sponsorUserId", "sponsor_user_id", "ownerUserId", "owner_user_id"]);

  const cols = [
    "id",
    segmentCol ? `"${segmentCol}" as segment` : `NULL as segment`,
    businessTypeCol ? `"${businessTypeCol}" as "businessType"` : `NULL as "businessType"`,
    unitsCol ? `"${unitsCol}" as units` : `NULL as units`,
    employeesCol ? `"${employeesCol}" as "employeesRange"` : `NULL as "employeesRange"`,
    hasDpoCol ? `"${hasDpoCol}" as "hasDpo"` : `NULL as "hasDpo"`,
    dpoNameCol ? `"${dpoNameCol}" as "dpoName"` : `NULL as "dpoName"`,
    dpoEmailCol ? `"${dpoEmailCol}" as "dpoEmail"` : `NULL as "dpoEmail"`,
    sponsorUserIdCol ? `"${sponsorUserIdCol}" as "sponsorUserId"` : `NULL as "sponsorUserId"`,
  ].join(", ");

  const { rows: rows } = await db.execute(sql.raw(`
    SELECT ${cols}
    FROM organizations
    WHERE id = ${Number(organizationId)}
    LIMIT 1
  `));
  return (rows as AnyRow[])[0] || null;
}

export async function updateOrgProfile(organizationId: number, patch: {
  segment?: string | null;
  businessType?: string | null;
  units?: number | null;
  employeesRange?: string | null;
  hasDpo?: boolean | null;
  dpoName?: string | null;
  dpoEmail?: string | null;
  sponsorUserId?: number | null;
}) {
  const db = await getDb();

  const segmentCol = await pickColumn("organizations", ["segment", "segmento", "industrySegment", "industry_segment"]);
  const businessTypeCol = await pickColumn("organizations", ["businessType", "tipoNegocio", "business_type", "business_type_code"]);
  const unitsCol = await pickColumn("organizations", ["units", "numeroUnidades", "numberOfUnits", "number_of_units"]);
  const employeesCol = await pickColumn("organizations", ["employeesRange", "employeeRange", "numeroColaboradores", "employees_range"]);
  const hasDpoCol = await pickColumn("organizations", ["hasDpo", "possuiDpo", "has_dpo"]);
  const dpoNameCol = await pickColumn("organizations", ["dpoName", "nomeDpo", "dpo_name"]);
  const dpoEmailCol = await pickColumn("organizations", ["dpoEmail", "emailDpo", "dpo_email"]);
  const sponsorUserIdCol = await pickColumn("organizations", ["sponsorUserId", "sponsor_user_id", "ownerUserId", "owner_user_id"]);

  // Build SET clause parts using sql tagged template for proper parameterization
  const parts: ReturnType<typeof sql>[] = [];
  const addPart = (col: string | null, v: any) => {
    if (!col) return;
    if (v === undefined) return;
    parts.push(sql`${sql.raw('"' + col + '"')} = ${v}`);
  };

  addPart(segmentCol, patch.segment ?? undefined);
  addPart(businessTypeCol, patch.businessType ?? undefined);
  addPart(unitsCol, patch.units ?? undefined);
  addPart(employeesCol, patch.employeesRange ?? undefined);
  addPart(hasDpoCol, patch.hasDpo === undefined ? undefined : (patch.hasDpo === null ? null : patch.hasDpo ? 1 : 0));
  addPart(dpoNameCol, patch.dpoName ?? undefined);
  addPart(dpoEmailCol, patch.dpoEmail ?? undefined);
  addPart(sponsorUserIdCol, patch.sponsorUserId ?? undefined);

  if (!parts.length) return { ok: true, updated: false };

  // Join parts with commas using sql.join
  const setClause = sql.join(parts, sql.raw(', '));
  await db.execute(sql`UPDATE organizations SET ${setClause}, "updatedAt" = NOW() WHERE id = ${Number(organizationId)}`);

  return { ok: true, updated: true };
}

export async function suggestDelegates(organizationId: number, areaId: number) {
  const db = await getDb();
  const usersOrgCol = await pickColumn("users", ["organizationId", "organization_id"]);
  const usersAreaCol = await pickColumn("users", ["areaId", "area_id", "organizationAreaId", "organization_area_id"]);

  if (!usersOrgCol) return [];

  const where: string[] = [`u."${usersOrgCol}"=${Number(organizationId)}`];
  if (usersAreaCol) where.push(`u."${usersAreaCol}"=${Number(areaId)}`);

  const { rows: rows } = await db.execute(sql.raw(`
    SELECT u.id, u.name, u.email, u.role
    FROM users u
    WHERE ${where.join(" AND ")}
    ORDER BY
      CASE
        WHEN u.role IN ('admin','admin_global') THEN 1
        WHEN u.role IN ('consultant','consultor','dpo','sponsor') THEN 2
        WHEN u.role IN ('client_admin') THEN 3
        ELSE 4
      END,
      u.name ASC
    LIMIT 10
  `));
  return (rows as AnyRow[]) || [];
}

export async function getSponsorUser(organizationId: number) {
  const db = await getDb();
  const profile = await getOrgProfile(organizationId);
  const sponsorId = Number(profile?.sponsorUserId || 0);

  if (sponsorId) {
    const { rows: rows } = await db.execute(sql`SELECT id,name,email,role FROM users WHERE id=${sponsorId} LIMIT 1`);
    const u = (rows as AnyRow[])[0];
    if (u) return u;
  }

  // fallback: primeiro client_admin, depois consultant, depois admin
  const { rows: rows2 } = await db.execute(sql`
    SELECT id,name,email,role
    FROM users
    WHERE "organizationId"=${organizationId}
    ORDER BY
      CASE
        WHEN role='client_admin' THEN 1
        WHEN role IN ('consultant','consultor') THEN 2
        WHEN role IN ('admin','admin_global') THEN 3
        ELSE 4
      END,
      id ASC
    LIMIT 1
  `);
  return (rows2 as AnyRow[])[0] || null;
}

export async function createUserQuick(organizationId: number, input: {
  name: string;
  email: string;
  role?: string;
  areaId?: number | null;
}, createdByName?: string) {
  const db = await getDb();

  // Use drizzle schema-based insert (avoids raw SQL placeholder issues with TiDB)
  const { users } = await import('../drizzle/schema');
  // Generate a unique openId for the new user (required NOT NULL field)
  const openId = `quick_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const insertData: any = {
    openId,
    name: input.name,
    email: input.email,
    organizationId: organizationId,
    role: input.role || 'sponsor',
  };
  if (input.areaId) {
    insertData.areaId = input.areaId;
  }

  const result = await db.insert(users).values(insertData).returning({ id: users.id });
  const id = Number(result[0].id);

  const { eq } = await import('drizzle-orm');
  const [newUser] = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
  }).from(users).where(eq(users.id, id)).limit(1);

  // Enviar e-mail de boas-vindas ao novo usuário
  try {
    // Buscar nome da organização
    const { rows: orgRows } = await db.execute(sql`SELECT name FROM organizations WHERE id=${organizationId} LIMIT 1`);
    const orgName = (orgRows as AnyRow[])[0]?.name || '';

    const { sendWelcomeUserEmail } = await import('./emailService');
    await sendWelcomeUserEmail({
      userName: input.name,
      userEmail: input.email,
      role: input.role || 'sponsor',
      organizationName: orgName,
      loginUrl: process.env.VITE_OAUTH_PORTAL_URL || 'https://app.seusdados.com',
      createdByName: createdByName || 'Administrador',
    });
  } catch (e) {
    console.warn('[createUserQuick] Falha ao enviar e-mail de boas-vindas (não bloqueante):', e);
  }

  return newUser;
}
