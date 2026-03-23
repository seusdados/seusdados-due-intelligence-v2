import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import {
  listSegments,
  listBusinessTypes,
  suggestAreasAndProcesses,
  addCustomEntry,
  listCustomEntries,
  listSegmentsMerged,
  listBusinessTypesMerged,
  deleteCustomEntry,
} from "./taxonomyService";

export const taxonomyRouter = router({
  // Catálogo padrão (sem merge)
  listSegments: protectedProcedure
    .input(z.object({}).optional())
    .query(() => listSegments()),

  listBusinessTypes: protectedProcedure
    .input(z.object({ segment: z.string().optional().nullable() }).optional())
    .query(({ input }) => listBusinessTypes(input?.segment ?? null)),

  suggestAreasAndProcesses: protectedProcedure
    .input(z.object({ segment: z.string().optional().nullable(), businessType: z.string().optional().nullable() }).optional())
    .query(({ input }) => suggestAreasAndProcesses(input?.segment ?? null, input?.businessType ?? null)),

  // Catálogo mesclado (padrão + customizados da organização)
  listSegmentsMerged: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(({ input }) => listSegmentsMerged(input.organizationId)),

  listBusinessTypesMerged: protectedProcedure
    .input(z.object({ organizationId: z.number(), segment: z.string().optional().nullable() }))
    .query(({ input }) => listBusinessTypesMerged(input.organizationId, input.segment)),

  // CRUD customizado
  addCustomEntry: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      kind: z.enum(["segment", "business_type", "area", "process"]),
      parentCode: z.string().optional().nullable(),
      code: z.string().min(1),
      label: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      return addCustomEntry({
        ...input,
        createdById: ctx.user.id,
      });
    }),

  listCustomEntries: protectedProcedure
    .input(z.object({ organizationId: z.number(), kind: z.string().optional().nullable() }))
    .query(({ input }) => listCustomEntries(input.organizationId, input.kind)),

  deleteCustomEntry: protectedProcedure
    .input(z.object({ id: z.number(), organizationId: z.number() }))
    .mutation(({ input }) => deleteCustomEntry(input.id, input.organizationId)),
});
