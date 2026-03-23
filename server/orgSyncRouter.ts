import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getOrgProfile, updateOrgProfile, suggestDelegates, getSponsorUser, createUserQuick } from "./orgSyncService";

export const orgSyncRouter = router({
  getProfile: protectedProcedure
    .input(z.object({ organizationId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.organizationId !== input.organizationId && !["admin", "admin_global", "consultant", "consultor"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const profile = await getOrgProfile(input.organizationId);
      const sponsor = await getSponsorUser(input.organizationId);
      return { profile, sponsor };
    }),

  updateProfile: protectedProcedure
    .input(z.object({
      organizationId: z.number().int().positive(),
      patch: z.object({
        segment: z.string().optional().nullable(),
        businessType: z.string().optional().nullable(),
        units: z.number().optional().nullable(),
        employeesRange: z.string().optional().nullable(),
        hasDpo: z.boolean().optional().nullable(),
        dpoName: z.string().optional().nullable(),
        dpoEmail: z.string().optional().nullable(),
        sponsorUserId: z.number().optional().nullable(),
      })
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.organizationId !== input.organizationId && !["admin", "admin_global", "consultant", "consultor"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return await updateOrgProfile(input.organizationId, input.patch);
    }),

  suggestDelegatesByArea: protectedProcedure
    .input(z.object({ organizationId: z.number().int().positive(), areaId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.organizationId !== input.organizationId && !["admin", "admin_global", "consultant", "consultor"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const suggested = await suggestDelegates(input.organizationId, input.areaId);
      const sponsor = await getSponsorUser(input.organizationId);
      return { suggested, sponsor };
    }),

  createUserQuick: protectedProcedure
    .input(z.object({
      organizationId: z.number().int().positive(),
      areaId: z.number().int().positive().optional().nullable(),
      name: z.string().min(2),
      email: z.string().email(),
      role: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.organizationId !== input.organizationId && !["admin", "admin_global", "consultant", "consultor"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const user = await createUserQuick(input.organizationId, { name: input.name, email: input.email, role: input.role, areaId: input.areaId }, ctx.user.name || 'Administrador');
      return { ok: true, user };
    }),
});
