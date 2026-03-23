import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { userPreferences } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Schema de validação para preferências
const preferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  notifyAvaliacoes: z.boolean().optional(),
  notifyTickets: z.boolean().optional(),
  notifyReunioes: z.boolean().optional(),
  showAutoSelectToast: z.boolean().optional(),
  showManualSelectToast: z.boolean().optional(),
  showClearSelectToast: z.boolean().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().optional(),
});

// Valores padrão para preferências
const defaultPreferences = {
  emailNotifications: 1,
  pushNotifications: 1,
  notifyAvaliacoes: 1,
  notifyTickets: 1,
  notifyReunioes: 1,
  showAutoSelectToast: 1,
  showManualSelectToast: 1,
  showClearSelectToast: 1,
  theme: 'system' as const,
  language: 'pt-BR',
};

export const userPreferencesRouter = router({
  // Buscar preferências do usuário
  get: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, ctx.user.id))
      .limit(1);
    
    if (!prefs) {
      // Retornar valores padrão se não existir
      return {
        emailNotifications: true,
        pushNotifications: true,
        notifyAvaliacoes: true,
        notifyTickets: true,
        notifyReunioes: true,
        showAutoSelectToast: true,
        showManualSelectToast: true,
        showClearSelectToast: true,
        theme: 'system' as const,
        language: 'pt-BR',
      };
    }
    
    // Converter tinyint para boolean
    return {
      emailNotifications: prefs.emailNotifications === 1,
      pushNotifications: prefs.pushNotifications === 1,
      notifyAvaliacoes: prefs.notifyAvaliacoes === 1,
      notifyTickets: prefs.notifyTickets === 1,
      notifyReunioes: prefs.notifyReunioes === 1,
      showAutoSelectToast: prefs.showAutoSelectToast === 1,
      showManualSelectToast: prefs.showManualSelectToast === 1,
      showClearSelectToast: prefs.showClearSelectToast === 1,
      theme: prefs.theme,
      language: prefs.language,
    };
  }),

  // Atualizar preferências do usuário
  update: protectedProcedure
    .input(preferencesSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      // Verificar se já existe registro
      const [existing] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, ctx.user.id))
        .limit(1);
      
      // Converter boolean para tinyint
      const data: Record<string, unknown> = {};
      if (input.emailNotifications !== undefined) data.emailNotifications = input.emailNotifications ? 1 : 0;
      if (input.pushNotifications !== undefined) data.pushNotifications = input.pushNotifications ? 1 : 0;
      if (input.notifyAvaliacoes !== undefined) data.notifyAvaliacoes = input.notifyAvaliacoes ? 1 : 0;
      if (input.notifyTickets !== undefined) data.notifyTickets = input.notifyTickets ? 1 : 0;
      if (input.notifyReunioes !== undefined) data.notifyReunioes = input.notifyReunioes ? 1 : 0;
      if (input.showAutoSelectToast !== undefined) data.showAutoSelectToast = input.showAutoSelectToast ? 1 : 0;
      if (input.showManualSelectToast !== undefined) data.showManualSelectToast = input.showManualSelectToast ? 1 : 0;
      if (input.showClearSelectToast !== undefined) data.showClearSelectToast = input.showClearSelectToast ? 1 : 0;
      if (input.theme !== undefined) data.theme = input.theme;
      if (input.language !== undefined) data.language = input.language;
      
      if (existing) {
        // Atualizar registro existente
        await db
          .update(userPreferences)
          .set(data)
          .where(eq(userPreferences.userId, ctx.user.id));
      } else {
        // Criar novo registro com valores padrão + input
        await db.insert(userPreferences).values({
          userId: ctx.user.id,
          ...defaultPreferences,
          ...data,
        });
      }
      
      return { success: true };
    }),

  // Resetar preferências para valores padrão
  reset: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    // Verificar se já existe registro
    const [existing] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, ctx.user.id))
      .limit(1);
    
    if (existing) {
      // Atualizar para valores padrão
      await db
        .update(userPreferences)
        .set(defaultPreferences)
        .where(eq(userPreferences.userId, ctx.user.id));
    } else {
      // Criar novo registro com valores padrão
      await db.insert(userPreferences).values({
        userId: ctx.user.id,
        ...defaultPreferences,
      });
    }
    
    return { 
      success: true,
      preferences: {
        emailNotifications: true,
        pushNotifications: true,
        notifyAvaliacoes: true,
        notifyTickets: true,
        notifyReunioes: true,
        showAutoSelectToast: true,
        showManualSelectToast: true,
        showClearSelectToast: true,
        theme: 'system' as const,
        language: 'pt-BR',
      }
    };
  }),
});
