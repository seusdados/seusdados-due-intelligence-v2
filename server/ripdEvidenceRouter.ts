import { z } from "zod";
import { sql } from "drizzle-orm";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import * as gedService from "./gedService";

type AnyRow = Record<string, any>;

function parseEnum(columnType?: string): string[] {
  if (!columnType) return [];
  const m = columnType.match(/enum\((.*)\)/i);
  if (!m) return [];
  return m[1].split(",").map(s => s.trim().replace(/^'/,"").replace(/'$/,""));
}

async function getEvidenceTypeAllowed(db: any): Promise<string[]> {
  const { rows: r0 } = await db.execute(sql`
    SELECT COLUMN_TYPE as ct
    FROM information_schema.columns
    WHERE table_schema=DATABASE()
      AND table_name='ripd_evidences'
      AND column_name='evidenceType'
    LIMIT 1
  `);
  return parseEnum((r0 as AnyRow[])[0]?.ct);
}

function pickEvidenceType(allowed: string[], desired: string): string {
  if (!allowed.length) return desired;
  if (allowed.includes(desired)) return desired;
  // mapeamentos entre enum antigo e novo
  const map: Record<string,string[]> = {
    documento: ["report","other","policy","procedure","documento","outro"],
    captura_tela: ["capture","evidence","other","captura_tela","outro"],
    log_sistema: ["log","logs","other","log_sistema","outro"],
    declaracao: ["declaration","other","declaracao","outro"],
    certificado: ["certificate","other","certificado","outro"],
    outro: ["other","outro","documento"]
  };
  const candidates = map[desired] || ["outro","other", allowed[0]];
  for (const c of candidates) if (allowed.includes(c)) return c;
  return allowed[0];
}

async function recalcEvidence(db: any, ripdId: number, questionId: number) {
  // policy
  const { rows: q0 } = await db.execute(sql`
    SELECT "evidenceRequired" as required, "evidenceMinCount" as minCount
    FROM dpia_questions
    WHERE id=${questionId}
    LIMIT 1
  `);
  const required = Number((q0 as AnyRow[])[0]?.required ?? 0) === 1;
  const minCount = Number((q0 as AnyRow[])[0]?.minCount ?? 0);

  const { rows: c0 } = await db.execute(sql`
    SELECT COUNT(*) as c
    FROM ripd_evidences
    WHERE "ripdId"=${ripdId} AND "questionId"=${questionId}
  `);
  const count = Number((c0 as AnyRow[])[0]?.c ?? 0);

  let status = "missing";
  if (!required) status = "validated";
  else if (count <= 0) status = "missing";
  else if (count < minCount) status = "partial";
  else status = "provided";

  await db.execute(sql`
    UPDATE dpia_responses
    SET "evidenceCount"=${count}, "evidenceStatus"=${status}
    WHERE dpia_id=${ripdId} AND question_id=${questionId}
  `);

  return { required, minCount, count, status };
}

export const ripdEvidenceRouter = router({
  list: protectedProcedure
    .input(z.object({
      ripdId: z.number(),
      questionId: z.number().optional(),
      riskId: z.number().optional(),
      mitigationId: z.number().optional()
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const where: any[] = [sql`e."ripdId"=${input.ripdId}`, sql`e."organizationId"=${ctx.user.organizationId}`];
      if (input.questionId) where.push(sql`e."questionId"=${input.questionId}`);
      if (input.riskId) where.push(sql`e."riskId"=${input.riskId}`);
      if (input.mitigationId) where.push(sql`e."mitigationId"=${input.mitigationId}`);

      const { rows: rows0 } = await db.execute(sql`
        SELECT
          e.*,
          d.name as gedName,
          d."fileUrl" as gedUrl,
          d."mimeType" as gedMimeType,
          d."fileSize" as gedFileSize
        FROM ripd_evidences e
        LEFT JOIN ged_documents d ON d.id = e."gedDocumentId"
        WHERE ${sql.join(where, sql` AND `)}
        ORDER BY e."createdAt" DESC
      `);

      return { items: (rows0 as AnyRow[]) || [] };
    }),

  linkExistingGedDocument: protectedProcedure
    .input(z.object({
      ripdId: z.number(),
      questionId: z.number().optional(),
      riskId: z.number().optional(),
      mitigationId: z.number().optional(),
      gedDocumentId: z.number(),
      evidenceType: z.string().optional(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();

      const allowed = await getEvidenceTypeAllowed(db);
      const desired = input.evidenceType || "documento";
      const evidenceType = pickEvidenceType(allowed, desired);

      await db.execute(sql`
        INSERT INTO ripd_evidences
          ("ripdId", "organizationId", "questionId", "riskId", "mitigationId", "gedDocumentId", "evidenceType", description, tags, "uploadedByUserId", "createdAt")
        VALUES
          (${input.ripdId}, ${ctx.user.organizationId}, ${input.questionId || null}, ${input.riskId || null}, ${input.mitigationId || null},
           ${input.gedDocumentId}, ${evidenceType}, ${input.description || null}, ${input.tags ? JSON.stringify(input.tags) : null},
           ${ctx.user.id}, NOW())
      `);

      if (input.questionId) {
        await recalcEvidence(db, input.ripdId, input.questionId);
      }
      return { ok: true };
    }),

  uploadAndLink: protectedProcedure
    .input(z.object({
      ripdId: z.number(),
      questionId: z.number().optional(),
      riskId: z.number().optional(),
      mitigationId: z.number().optional(),
      file: z.instanceof(Uint8Array),
      fileName: z.string().min(1),
      mimeType: z.string().min(1),
      folderId: z.number().optional(),
      evidenceType: z.string().optional(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const buffer = Buffer.from(input.file);

      // Upload no GED
      const gedDoc = await gedService.uploadDocument(ctx.user, {
        folderId: input.folderId || 1,
        name: input.fileName,
        description: input.description,
        file: buffer,
        fileName: input.fileName,
        mimeType: input.mimeType,
        tags: input.tags
      });

      const allowed = await getEvidenceTypeAllowed(db);
      const desired = input.evidenceType || "documento";
      const evidenceType = pickEvidenceType(allowed, desired);

      await db.execute(sql`
        INSERT INTO ripd_evidences
          ("ripdId", "organizationId", "questionId", "riskId", "mitigationId", "gedDocumentId", "evidenceType", description, tags, "uploadedByUserId", "createdAt")
        VALUES
          (${input.ripdId}, ${ctx.user.organizationId}, ${input.questionId || null}, ${input.riskId || null}, ${input.mitigationId || null},
           ${gedDoc.id}, ${evidenceType}, ${input.description || null}, ${input.tags ? JSON.stringify(input.tags) : null},
           ${ctx.user.id}, NOW())
      `);

      let recalculated: any = null;
      if (input.questionId) {
        recalculated = await recalcEvidence(db, input.ripdId, input.questionId);
      }

      return { ok: true, gedDocumentId: gedDoc.id, recalculated };
    }),

  unlink: protectedProcedure
    .input(z.object({
      evidenceId: z.number(),
      ripdId: z.number(),
      questionId: z.number().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      await db.execute(sql`
        DELETE FROM ripd_evidences
        WHERE id=${input.evidenceId}
          AND "organizationId"=${ctx.user.organizationId}
      `);

      if (input.questionId) {
        await recalcEvidence(db, input.ripdId, input.questionId);
      }
      return { ok: true };
    }),

  validateCompleteness: protectedProcedure
    .input(z.object({ ripdId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();

      // Perguntas com evidência requerida
      const { rows: q0 } = await db.execute(sql`
        SELECT id, display_order, question_text, "evidenceRequired" as required, "evidenceMinCount" as minCount, "evidenceHint" as hint, "evidenceExamples" as examples, "allowedMimeTypes" as mimes
        FROM dpia_questions
        WHERE COALESCE("evidenceRequired",0)=1
        ORDER BY display_order ASC
      `);
      const requiredQuestions = (q0 as AnyRow[]) || [];
      if (!requiredQuestions.length) {
        return { ok: true, complete: true, requiredCount: 0, missingCount: 0, missing: [] };
      }

      // Conta evidências por questionId
      const { rows: c0 } = await db.execute(sql`
        SELECT "questionId" as qid, COUNT(*) as c
        FROM ripd_evidences
        WHERE "ripdId"=${input.ripdId}
          AND "organizationId"=${ctx.user.organizationId}
          AND "questionId" IS NOT NULL
        GROUP BY "questionId"
      `);
      const countMap = new Map<number, number>();
      for (const r of (c0 as AnyRow[]) || []) countMap.set(Number(r.qid), Number(r.c));

      const missing = requiredQuestions
        .map(q => {
          const qid = Number(q.id);
          const min = Number(q.minCount || 0);
          const cur = Number(countMap.get(qid) || 0);
          const isMissing = cur < min;
          return {
            questionId: qid,
            displayOrder: Number(q.display_order),
            questionText: q.question_text,
            minCount: min,
            currentCount: cur,
            missingCount: Math.max(0, min - cur),
            hint: q.hint || null,
            examples: q.examples || null,
            allowedMimeTypes: q.mimes || null,
            isMissing
          };
        })
        .filter(x => x.isMissing);

      return {
        ok: true,
        complete: missing.length === 0,
        requiredCount: requiredQuestions.length,
        missingCount: missing.length,
        missing
      };
    })
});
