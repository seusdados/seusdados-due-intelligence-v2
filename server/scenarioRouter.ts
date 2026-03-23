// Router tRPC para gerenciamento de cenários
import { router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as scenarioService from "./scenarioService";

export const scenarioRouter = router({
  // Listar cenários
  list: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      includeTemplates: z.boolean().optional(),
    }))
    .query(async ({ input, ctx }) => {
      // Verificar acesso à organização
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      
      return scenarioService.listScenarios(input.organizationId, input.includeTemplates);
    }),

  // Obter cenário por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const scenario = await scenarioService.getScenarioById(input.id);
      
      // Verificar acesso
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== scenario.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      
      return scenario;
    }),

  // Criar cenário
  create: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      nome: z.string().min(1).max(255),
      tipoIncidente: z.string().min(1).max(100),
      descricao: z.string().min(1),
      areasEnvolvidas: z.array(z.string()),
      sistemasAfetados: z.array(z.string()),
      objetivos: z.array(z.string()),
      papeisChave: z.array(z.string()),
      criteriosSucesso: z.array(z.string()),
      trimestre: z.string().optional(),
      isTemplate: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verificar acesso
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      
      const id = await scenarioService.createScenario({
        ...input,
        createdById: ctx.user.id,
      });
      
      return { id };
    }),

  // Atualizar cenário
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().min(1).max(255).optional(),
      tipoIncidente: z.string().min(1).max(100).optional(),
      descricao: z.string().min(1).optional(),
      areasEnvolvidas: z.array(z.string()).optional(),
      sistemasAfetados: z.array(z.string()).optional(),
      objetivos: z.array(z.string()).optional(),
      papeisChave: z.array(z.string()).optional(),
      criteriosSucesso: z.array(z.string()).optional(),
      trimestre: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const scenario = await scenarioService.getScenarioById(input.id);
      
      // Verificar acesso
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== scenario.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      
      await scenarioService.updateScenario(input.id, input);
      return { success: true };
    }),

  // Excluir cenário (admin apenas)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await scenarioService.deleteScenario(input.id);
      return { success: true };
    }),

  // Duplicar cenário
  duplicate: protectedProcedure
    .input(z.object({
      id: z.number(),
      newName: z.string().min(1).max(255),
    }))
    .mutation(async ({ input, ctx }) => {
      const scenario = await scenarioService.getScenarioById(input.id);
      
      // Verificar acesso
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== scenario.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      
      const newId = await scenarioService.duplicateScenario(input.id, input.newName, ctx.user.id);
      return { id: newId };
    }),

  // Listar templates públicos
  listTemplates: protectedProcedure
    .query(async () => {
      return scenarioService.listPublicTemplates();
    }),

  // Criar cenário a partir de template
  createFromTemplate: protectedProcedure
    .input(z.object({
      templateId: z.number(),
      organizationId: z.number(),
      customizations: z.object({
        nome: z.string().optional(),
        trimestre: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verificar acesso
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      
      const id = await scenarioService.createFromTemplate(
        input.templateId,
        input.organizationId,
        ctx.user.id,
        input.customizations
      );
      
      return { id };
    }),
});
