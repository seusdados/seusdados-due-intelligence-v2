/**
 * PATCH-2-RIPD-AUTOMATION: Router de Tarefas Automáticas para RIPD
 */
import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

export const ripdTasksRouter = router({
  createMitigationTasks: protectedProcedure
    .input(z.object({ ripdId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { rows: mitigations } = await db.execute(sql`SELECT m.*, r.title as riskTitle FROM dpia_mitigations m JOIN dpia_risks r ON m."riskId" = r.id WHERE m."assessmentId" = ${input.ripdId} AND m.status = 'pendente'`);
      const mitigationsArr = mitigations as unknown as any[];
      
      const tasksCreated = [];
      for (const mit of mitigationsArr) {
        const idempotencyKey = `origin:ripd:mitigation:${mit.id}`;
        const { rows: existing } = await db.execute(sql`SELECT id FROM action_plans WHERE notes = ${idempotencyKey}`);
        if ((existing as unknown as any[]).length === 0) {
          const { rows: result } = await db.execute(sql`INSERT INTO action_plans ("organizationId", "assessmentId", title, description, status, priority, notes, "createdByUserId") VALUES (${ctx.user.organizationId}, ${input.ripdId}, ${`Implementar mitigação: ${mit.title}`}, ${`Risco: ${mit.riskTitle}\n${mit.description}`}, 'pendente', 'alta', ${idempotencyKey}, ${ctx.user.id}) RETURNING id`);
          tasksCreated.push({ mitigationId: mit.id, taskId: (result as any)[0]?.id });
        }
      }
      return { success: true, tasksCreated: tasksCreated.length, tasks: tasksCreated };
    }),

  createReviewTask: protectedProcedure
    .input(z.object({ ripdId: z.number(), dueDate: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { rows: result } = await db.execute(sql`SELECT title FROM dpia_assessments WHERE id = ${input.ripdId} AND "organizationId" = ${ctx.user.organizationId}`);
      const ripd = (result as unknown as any[])[0];
      if (!ripd) throw new Error("RIPD não encontrado");
      
      const idempotencyKey = `origin:ripd:review:${input.ripdId}`;
      const { rows: existing } = await db.execute(sql`SELECT id FROM action_plans WHERE notes = ${idempotencyKey}`);
      if ((existing as unknown as any[]).length > 0) return { success: true, alreadyExists: true, taskId: (existing as unknown as any[])[0].id };
      
      const { rows: taskResult } = await db.execute(sql`INSERT INTO action_plans ("organizationId", "assessmentId", title, description, status, priority, notes, "createdByUserId") VALUES (${ctx.user.organizationId}, ${input.ripdId}, ${`Revisão periódica RIPD: ${ripd.title}`}, 'Tarefa automática de revisão periódica do RIPD', 'pendente', 'media', ${idempotencyKey}, ${ctx.user.id}) RETURNING id`);
      return { success: true, taskId: (taskResult as any)[0]?.id };
    }),

  syncTaskStatus: protectedProcedure
    .input(z.object({ ripdId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { rows: tasks } = await db.execute(sql`SELECT ap.id, ap.status, ap.notes FROM action_plans ap WHERE ap."assessmentId" = ${input.ripdId} AND ap.notes LIKE 'origin:ripd:mitigation:%'`);
      const tasksArr = tasks as unknown as any[];
      
      let updated = 0;
      for (const task of tasksArr) {
        const mitigationId = task.notes.split(':').pop();
        if (task.status === 'concluida') {
          await db.execute(sql`UPDATE dpia_mitigations SET status = 'implementada' WHERE id = ${mitigationId}`);
          updated++;
        }
      }
      return { success: true, updated };
    }),

  createHighRiskTasks: protectedProcedure
    .input(z.object({ ripdId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { rows: risks } = await db.execute(sql`SELECT * FROM dpia_risks WHERE "assessmentId" = ${input.ripdId} AND (inherentLevel = 'alto' OR "inherentLevel" = 'critico')`);
      const risksArr = risks as unknown as any[];
      
      const tasksCreated = [];
      for (const risk of risksArr) {
        const idempotencyKey = `origin:ripd:risk:${risk.id}`;
        const { rows: existing } = await db.execute(sql`SELECT id FROM action_plans WHERE notes = ${idempotencyKey}`);
        if ((existing as unknown as any[]).length === 0) {
          const { rows: result } = await db.execute(sql`INSERT INTO action_plans ("organizationId", "assessmentId", title, description, status, priority, notes, "createdByUserId") VALUES (${ctx.user.organizationId}, ${input.ripdId}, ${`Tratar risco ${risk.inherentLevel}: ${risk.title}`}, ${risk.description}, 'pendente', 'critica', ${idempotencyKey}, ${ctx.user.id}) RETURNING id`);
          tasksCreated.push({ riskId: risk.id, taskId: (result as any)[0]?.id });
        }
      }
      return { success: true, tasksCreated: tasksCreated.length, tasks: tasksCreated };
    }),
});
