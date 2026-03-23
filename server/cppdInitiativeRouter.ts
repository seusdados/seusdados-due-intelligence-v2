import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import * as cppdService from "./cppdInitiativeService";
import { notifyOwner } from "./_core/notification";
import { enforceCppdCapability } from "./services/cppdPermissions";

export const cppdInitiativeRouter = router({
  // Listar iniciativas (leitura — qualquer membro ativo)
  list: protectedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      filters: z.object({
        status: z.enum(['planejado', 'em_andamento', 'concluido', 'atrasado', 'cancelado']).optional(),
        category: z.enum(['politica', 'treinamento', 'auditoria', 'mapeamento', 'tecnologia', 'processo', 'comunicacao', 'outro']).optional(),
        quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']).optional(),
        year: z.number().optional(),
        responsibleId: z.number().optional(),
        priority: z.enum(['baixa', 'media', 'alta', 'critica']).optional(),
        search: z.string().optional(),
      }).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const orgId = input.organizationId || ctx.user.organizationId || 0;
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canViewOwnTasks', orgId);
      return cppdService.listInitiatives(orgId, input.filters);
    }),

  // Obter iniciativa por ID (leitura)
  getById: protectedProcedure
    .input(z.object({
      id: z.number(),
      organizationId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const orgId = input.organizationId || ctx.user.organizationId || 0;
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canViewOwnTasks', orgId);
      return cppdService.getInitiativeById(input.id, orgId);
    }),

  // Criar iniciativa (mutação — requer gestão do plano anual)
  create: protectedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      title: z.string().min(1),
      description: z.string().optional(),
      category: z.enum(['politica', 'treinamento', 'auditoria', 'mapeamento', 'tecnologia', 'processo', 'comunicacao', 'outro']).optional(),
      status: z.enum(['planejado', 'em_andamento', 'concluido', 'atrasado', 'cancelado']).optional(),
      plannedStartDate: z.string().optional(),
      plannedEndDate: z.string().optional(),
      responsibleId: z.number().optional(),
      responsibleName: z.string().optional(),
      responsibleEmail: z.string().optional(),
      quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']).optional(),
      year: z.number(),
      priority: z.enum(['baixa', 'media', 'alta', 'critica']).optional(),
      impact: z.enum(['baixo', 'medio', 'alto', 'muito_alto']).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = input.organizationId || ctx.user.organizationId || 0;
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canManagePlanoAnual', orgId);
      return cppdService.createInitiative({
        ...input,
        organizationId: orgId,
        createdById: ctx.user.id,
      });
    }),

  // Atualizar iniciativa (mutação)
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      organizationId: z.number().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      category: z.enum(['politica', 'treinamento', 'auditoria', 'mapeamento', 'tecnologia', 'processo', 'comunicacao', 'outro']).optional(),
      status: z.enum(['planejado', 'em_andamento', 'concluido', 'atrasado', 'cancelado']).optional(),
      progress: z.number().min(0).max(100).optional(),
      plannedStartDate: z.string().optional(),
      plannedEndDate: z.string().optional(),
      actualStartDate: z.string().optional(),
      actualEndDate: z.string().optional(),
      responsibleId: z.number().optional(),
      responsibleName: z.string().optional(),
      responsibleEmail: z.string().optional(),
      quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']).optional(),
      year: z.number().optional(),
      priority: z.enum(['baixa', 'media', 'alta', 'critica']).optional(),
      impact: z.enum(['baixo', 'medio', 'alto', 'muito_alto']).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, organizationId, ...updateData } = input;
      const orgId = organizationId || ctx.user.organizationId || 0;
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canUpdateAtividades', orgId);
      return cppdService.updateInitiative(id, orgId, updateData);
    }),

  // Deletar iniciativa (mutação — apenas admin/consultor)
  delete: protectedProcedure
    .input(z.object({
      id: z.number(),
      organizationId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = input.organizationId || ctx.user.organizationId || 0;
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canManagePlanoAnual', orgId);
      return cppdService.deleteInitiative(input.id, orgId);
    }),

  // Obter estatísticas (leitura)
  getStats: protectedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      year: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const orgId = input.organizationId || ctx.user.organizationId || 0;
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canViewOwnTasks', orgId);
      return cppdService.getInitiativeStats(orgId, input.year);
    }),

  // Obter roadmap (leitura)
  getRoadmap: protectedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      year: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const orgId = input.organizationId || ctx.user.organizationId || 0;
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canViewOwnTasks', orgId);
      return cppdService.getRoadmap(orgId, input.year);
    }),

  // Verificar itens atrasados (leitura)
  checkOverdue: protectedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const orgId = input.organizationId || ctx.user.organizationId || 0;
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canViewSponsorOverview', orgId);
      return cppdService.checkOverdueItems(orgId);
    }),

  // ==========================================
  // TAREFAS
  // ==========================================

  // Listar tarefas de uma iniciativa (leitura)
  listTasks: protectedProcedure
    .input(z.object({
      initiativeId: z.number(),
      organizationId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const orgId = input.organizationId || ctx.user.organizationId || 0;
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canViewOwnTasks', orgId);
      return cppdService.listInitiativeTasks(input.initiativeId);
    }),

  // Criar tarefa (mutação)
  createTask: protectedProcedure
    .input(z.object({
      initiativeId: z.number(),
      organizationId: z.number().optional(),
      title: z.string().min(1),
      description: z.string().optional(),
      dueDate: z.string().optional(),
      assignedToId: z.number().optional(),
      assignedToName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = input.organizationId || ctx.user.organizationId || 0;
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canUpdateAtividades', orgId);
      return cppdService.createInitiativeTask({
        ...input,
        createdById: ctx.user.id,
      });
    }),

  // Atualizar tarefa (mutação)
  updateTask: protectedProcedure
    .input(z.object({
      id: z.number(),
      organizationId: z.number().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(['pendente', 'em_andamento', 'concluida', 'cancelada']).optional(),
      dueDate: z.string().optional(),
      completedAt: z.string().optional(),
      assignedToId: z.number().optional(),
      assignedToName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, organizationId, ...updateData } = input;
      const orgId = organizationId || ctx.user.organizationId || 0;
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canUpdateAtividades', orgId);
      return cppdService.updateInitiativeTask(id, updateData);
    }),

  // Deletar tarefa (mutação — apenas admin/consultor)
  deleteTask: protectedProcedure
    .input(z.object({
      id: z.number(),
      organizationId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = input.organizationId || ctx.user.organizationId || 0;
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canManagePlanoAnual', orgId);
      return cppdService.deleteInitiativeTask(input.id);
    }),

  // ==========================================
  // DOCUMENTOS
  // ==========================================

  // Listar documentos de uma iniciativa (leitura)
  listDocuments: protectedProcedure
    .input(z.object({
      initiativeId: z.number(),
    }))
    .query(async ({ input }) => {
      return cppdService.listInitiativeDocuments(input.initiativeId);
    }),

  // Adicionar documento (mutação)
  addDocument: protectedProcedure
    .input(z.object({
      initiativeId: z.number(),
      organizationId: z.number().optional(),
      documentId: z.number().optional(),
      fileName: z.string().optional(),
      fileUrl: z.string().optional(),
      fileType: z.string().optional(),
      fileSize: z.number().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = input.organizationId || ctx.user.organizationId || 0;
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canUpdateAtividades', orgId);
      return cppdService.addInitiativeDocument({
        ...input,
        uploadedById: ctx.user.id,
      });
    }),

  // Remover documento (mutação — apenas admin/consultor)
  removeDocument: protectedProcedure
    .input(z.object({
      id: z.number(),
      organizationId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = input.organizationId || ctx.user.organizationId || 0;
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canManagePlanoAnual', orgId);
      return cppdService.removeInitiativeDocument(input.id);
    }),

  // ==========================================
  // NOTIFICAÇÕES DE ATRASOS
  // ==========================================

  // Enviar notificações de atrasos (mutação — apenas admin/consultor)
  sendOverdueNotifications: protectedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = input.organizationId || ctx.user.organizationId || 0;
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canRunOverdueCheck', orgId);
      const overdueItems = await cppdService.checkOverdueItems(orgId);
      
      if (overdueItems.length > 0) {
        const itemsList = overdueItems.map(item => 
          `- ${item.type === 'initiative' ? 'Iniciativa' : 'Tarefa'}: ${item.title} (${item.daysOverdue} dias de atraso)`
        ).join('\n');
        
        await notifyOwner({
          title: `Plano CPPD: ${overdueItems.length} item(s) atrasado(s)`,
          content: `Os seguintes itens do Plano CPPD Contínuo estão atrasados:\n\n${itemsList}\n\nAcesse o sistema para tomar as providências necessárias.`,
        });
      }
      
      return { 
        success: true, 
        overdueCount: overdueItems.length,
        items: overdueItems 
      };
    }),

  // Obter itens próximos do prazo (leitura)
  getApproachingDeadline: protectedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      daysAhead: z.number().optional().default(7),
    }))
    .query(async ({ ctx, input }) => {
      const orgId = input.organizationId || ctx.user.organizationId || 0;
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canViewSponsorOverview', orgId);
      const { getItemsApproachingDeadline } = await import("./overdueNotificationService");
      return getItemsApproachingDeadline(orgId, input.daysAhead);
    }),

  // Obter histórico de notificações (leitura)
  getNotificationHistory: protectedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      limit: z.number().optional().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const orgId = input.organizationId || ctx.user.organizationId || 0;
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canViewAuditTrail', orgId);
      const { getNotificationHistory } = await import("./overdueNotificationService");
      return getNotificationHistory(orgId, input.limit);
    }),
});
