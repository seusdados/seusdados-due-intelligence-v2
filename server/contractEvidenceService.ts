import { desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { contractAnalysisFieldEvidence } from "../drizzle/schema";
import { logger } from "./_core/logger";

export type FieldEvidenceInput = {
  analysisId: number;
  fieldName: string;
  excerpt?: string | null;
  clauseRef?: string | null;
  confidence?: number | null;
  note?: string | null;
};

export async function upsertEvidenceBatch(items: FieldEvidenceInput[]): Promise<void> {
  if (!items.length) return;
  const db = await getDb();
  if (!db) {
    logger.warn("[ContractEvidence] DB not available; skipping evidence persistence");
    return;
  }

  // Estratégia simples: inserir novamente. Em ambientes com alto volume,
  // pode-se limpar por analysisId antes ou usar upsert por (analysisId, fieldName).
  try {
    await db.insert(contractAnalysisFieldEvidence).values(
      items.map((i) => ({
        analysisId: i.analysisId,
        fieldName: i.fieldName,
        excerpt: i.excerpt ?? null,
        clauseRef: i.clauseRef ?? null,
        confidence: i.confidence ?? null,
        note: i.note ?? null,
      }))
    );
  } catch (e) {
    logger.error("[ContractEvidence] Failed to insert evidence batch:", e);
  }
}

export async function listEvidenceByAnalysisId(analysisId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(contractAnalysisFieldEvidence)
    .where(eq(contractAnalysisFieldEvidence.analysisId, analysisId))
    .orderBy(desc(contractAnalysisFieldEvidence.createdAt));
}
