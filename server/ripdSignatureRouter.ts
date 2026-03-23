/**
 * PATCH-2-RIPD-AUTOMATION: Router de Assinatura Gov.br para RIPD
 */
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

export const ripdSignatureRouter = router({
  requestSignatures: protectedProcedure
    .input(z.object({
      ripdId: z.number(),
      signers: z.array(z.object({ name: z.string(), email: z.string(), cpf: z.string(), role: z.string() }))
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { rows: result } = await db.execute(sql`SELECT * FROM dpia_assessments WHERE id = ${input.ripdId} AND "organizationId" = ${ctx.user.organizationId}`);
      const ripd = (result as unknown as any[])[0];
      if (!ripd) throw new Error("RIPD não encontrado");
      if (ripd.workflowStatus !== 'ready_for_signature') throw new Error("RIPD deve estar em 'ready_for_signature'");
      
      const requestId = `RIPD-${input.ripdId}-${Date.now()}`;
      
      for (const signer of input.signers) {
        await db.execute(sql`INSERT INTO govbr_digital_signatures ("organizationId", "documentType", "documentId", "signerName", "signerEmail", "signerCpf", "signerRole", status) VALUES (${ctx.user.organizationId}, 'ripd', ${input.ripdId}, ${signer.name}, ${signer.email}, ${signer.cpf}, ${signer.role}, 'pending')`);
      }
      
      await db.execute(sql`UPDATE dpia_assessments SET "workflowStatus" = 'signing', "signatureRequestId" = ${requestId} WHERE id = ${input.ripdId}`);
      return { success: true, requestId, signersCount: input.signers.length };
    }),

  getStatus: protectedProcedure
    .input(z.object({ ripdId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { rows: signatures } = await db.execute(sql`SELECT * FROM govbr_digital_signatures WHERE "documentType" = 'ripd' AND "documentId" = ${input.ripdId} AND "organizationId" = ${ctx.user.organizationId}`);
      const signaturesArr = signatures as unknown as any[];
      const pending = signaturesArr.filter(s => s.status === 'pending').length;
      const signed = signaturesArr.filter(s => s.status === 'signed').length;
      return { total: signaturesArr.length, pending, signed, isComplete: pending === 0 && signed > 0, signatures: signaturesArr };
    }),

  onWebhook: publicProcedure
    .input(z.object({ signatureId: z.number(), status: z.enum(['signed', 'rejected', 'expired']), signedAt: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.execute(sql`UPDATE govbr_digital_signatures SET status = ${input.status}, "signedAt" = ${input.signedAt || null} WHERE id = ${input.signatureId}`);
      
      const { rows: sigResult } = await db.execute(sql`SELECT "documentId" FROM govbr_digital_signatures WHERE id = ${input.signatureId}`);
      const sig = (sigResult as unknown as any[])[0];
      if (sig) {
        const { rows: pending } = await db.execute(sql`SELECT COUNT(*) as count FROM govbr_digital_signatures WHERE "documentType" = 'ripd' AND "documentId" = ${sig.documentId} AND status = 'pending'`);
        if ((pending as unknown as any[])[0]?.count === 0) {
          await db.execute(sql`UPDATE dpia_assessments SET "workflowStatus" = 'signed', "signedAt" = NOW() WHERE id = ${sig.documentId}`);
        }
      }
      return { success: true };
    }),
});
