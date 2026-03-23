import { z } from "zod";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "./_core/trpc";
import * as serviceCatalogService from "./serviceCatalogService";

export const serviceCatalogRouter = router({
  // ============================================
  // BLOCOS DE SERVIÇOS
  // ============================================
  
  // Listar todos os blocos
  getBlocks: publicProcedure.query(async () => {
    return serviceCatalogService.getAllBlocks();
  }),
  
  // Obter bloco por ID
  getBlockById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return serviceCatalogService.getBlockById(input.id);
    }),
  
  // Obter bloco por código
  getBlockByCode: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      return serviceCatalogService.getBlockByCode(input.code);
    }),
  
  // ============================================
  // SERVIÇOS DO CATÁLOGO
  // ============================================
  
  // Listar todos os serviços
  getServices: publicProcedure.query(async () => {
    return serviceCatalogService.getAllServices();
  }),
  
  // Listar serviços por bloco
  getServicesByBlock: publicProcedure
    .input(z.object({ blockId: z.number() }))
    .query(async ({ input }) => {
      return serviceCatalogService.getServicesByBlock(input.blockId);
    }),
  
  // Obter serviço por ID
  getServiceById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return serviceCatalogService.getServiceById(input.id);
    }),
  
  // Obter serviço por código
  getServiceByCode: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      return serviceCatalogService.getServiceByCode(input.code);
    }),
  
  // ============================================
  // CATÁLOGO COMPLETO
  // ============================================
  
  // Obter catálogo completo com blocos e serviços
  getFullCatalog: publicProcedure.query(async () => {
    return serviceCatalogService.getFullCatalog();
  }),
  
  // Obter estatísticas do catálogo
  getCatalogStats: publicProcedure.query(async () => {
    return serviceCatalogService.getCatalogStats();
  }),
  
  // ============================================
  // SLAs CUSTOMIZADOS POR ORGANIZAÇÃO
  // ============================================
  
  // Obter SLAs customizados de uma organização
  getOrganizationSlas: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input }) => {
      return serviceCatalogService.getOrganizationSlas(input.organizationId);
    }),
  
  // Obter SLA efetivo para um serviço (considerando customização)
  getEffectiveSla: protectedProcedure
    .input(z.object({ 
      serviceId: z.number(),
      organizationId: z.number().optional()
    }))
    .query(async ({ input }) => {
      return serviceCatalogService.getEffectiveSlaForService(
        input.serviceId, 
        input.organizationId
      );
    }),
  
  // Definir SLA customizado para organização (admin)
  setOrganizationSla: adminProcedure
    .input(z.object({
      organizationId: z.number(),
      serviceItemId: z.number(),
      customSlaHours: z.number().optional(),
      customLegalDeadlineDays: z.number().optional(),
      notes: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      return serviceCatalogService.setOrganizationSla(
        input.organizationId,
        input.serviceItemId,
        input.customSlaHours,
        input.customLegalDeadlineDays,
        input.notes
      );
    }),
});
