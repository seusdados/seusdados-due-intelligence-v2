import fs from "fs";
import path from "path";
import { getDb } from "./db";
import { customTaxonomy } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

type Option = { value: string; label: string };
type Taxonomy = {
  version: string;
  segments: Option[];
  businessTypesBySegment: Record<string, Option[]>;
  defaultBusinessTypes: Option[];
  areasByBusinessType: Record<string, string[]>;
  defaultAreas: string[];
  areaLabels: Record<string, string>;
  processesByArea: Record<string, string[]>;
  processLabels: Record<string, string>;
};

let cache: Taxonomy | null = null;

export function loadTaxonomy(): Taxonomy {
  if (cache) return cache;
  const file = path.join(process.cwd(), "server", "catalogs", "taxonomy.ptBR.json");
  const raw = fs.readFileSync(file, "utf-8");
  cache = JSON.parse(raw);
  return cache!;
}

export function listSegments() {
  const t = loadTaxonomy();
  return t.segments;
}

export function listBusinessTypes(segment?: string | null) {
  const t = loadTaxonomy();
  if (segment && t.businessTypesBySegment[segment]?.length) return t.businessTypesBySegment[segment];
  return t.defaultBusinessTypes;
}

export function suggestAreasAndProcesses(segment?: string | null, businessType?: string | null) {
  const t = loadTaxonomy();
  const bt = businessType && businessType.trim() ? businessType : null;
  const areas = bt && t.areasByBusinessType[bt]?.length ? t.areasByBusinessType[bt] : t.defaultAreas;

  const processesByArea: Record<string, { code: string; label: string }[]> = {};
  for (const a of areas) {
    const procs = t.processesByArea[a]?.length ? t.processesByArea[a] : [];
    processesByArea[a] = procs.map((code) => ({ code, label: t.processLabels[code] || code }));
  }
  return {
    version: t.version,
    segment,
    businessType: bt,
    areas: areas.map((code) => ({ code, label: t.areaLabels[code] || code })),
    processesByArea,
  };
}

// ─── Custom Taxonomy CRUD ────────────────────────────────────────────

export async function addCustomEntry(params: {
  organizationId: number;
  kind: "segment" | "business_type" | "area" | "process";
  parentCode?: string | null;
  code: string;
  label: string;
  createdById: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");

  const existing = await db
    .select()
    .from(customTaxonomy)
    .where(
      and(
        eq(customTaxonomy.organizationId, params.organizationId),
        eq(customTaxonomy.kind, params.kind),
        eq(customTaxonomy.code, params.code)
      )
    );

  if (existing.length > 0) {
    return { created: false, entry: existing[0], message: "Entrada já existe" };
  }

  const [inserted] = await db.insert(customTaxonomy).values({
    organizationId: params.organizationId,
    kind: params.kind,
    parentCode: params.parentCode ?? null,
    code: params.code,
    label: params.label,
    createdById: params.createdById,
  }).returning({ id: customTaxonomy.id });

  return { created: true, id: inserted.id, message: "Entrada criada com sucesso" };
}

export async function listCustomEntries(organizationId: number, kind?: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");

  if (kind) {
    return db
      .select()
      .from(customTaxonomy)
      .where(
        and(
          eq(customTaxonomy.organizationId, organizationId),
          eq(customTaxonomy.kind, kind as any)
        )
      );
  }

  return db
    .select()
    .from(customTaxonomy)
    .where(eq(customTaxonomy.organizationId, organizationId));
}

export async function listSegmentsMerged(organizationId: number) {
  const base = listSegments();
  const custom = await listCustomEntries(organizationId, "segment");
  const merged = [...base];
  for (const c of custom) {
    if (!merged.find((s) => s.value === c.code)) {
      merged.push({ value: c.code, label: c.label });
    }
  }
  return merged;
}

export async function listBusinessTypesMerged(organizationId: number, segment?: string | null) {
  const base = listBusinessTypes(segment);
  const custom = await listCustomEntries(organizationId, "business_type");
  const filtered = segment
    ? custom.filter((c) => c.parentCode === segment)
    : custom;
  const merged = [...base];
  for (const c of filtered) {
    if (!merged.find((t) => t.value === c.code)) {
      merged.push({ value: c.code, label: c.label });
    }
  }
  return merged;
}

export async function deleteCustomEntry(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");

  await db
    .delete(customTaxonomy)
    .where(
      and(
        eq(customTaxonomy.id, id),
        eq(customTaxonomy.organizationId, organizationId)
      )
    );
  return { deleted: true };
}
