// server/ticketsRouter.ts
import { logger } from "./_core/logger";
// Router tRPC para o módulo MeuDPO - Sistema de Gestão de Tickets

import { router, publicProcedure, clienteBlockedProcedure, adminProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as ticketService from "./ticketService";
import { generateConsolidatedReportData, generateConsolidatedReportHTML, generateConsolidatedReportPDF } from "./meudpoReportService";
import { generateTicketReportData, generateTicketReportHTML } from "./ticketReportService";
import * as ticketTagService from "./ticketTagService";
import * as incidentIntegration from "./incidentIntegrationService";
import * as slaMonitoring from "./slaMonitoringService";
import * as slaScheduler from "./slaScheduler";
import "./meudpoInit";

// ==================== SCHEMAS DE VALIDAÇÃO ====================

const ticketTypeEnum = z.enum([
  "solicitacao_titular",
  "incidente_seguranca",
  "duvida_juridica",
  "consultoria_geral",
  "auditoria",
  "treinamento",
  "documentacao"
]);

const priorityEnum = z.enum(["baixa", "media", "alta", "critica"]);

const statusEnum = z.enum([
  "novo",
  "em_analise",
  "aguardando_cliente",
  "aguardando_terceiro",
  "resolvido",
  "cancelado"
]);

const slaLevelEnum = z.enum(["padrao", "prioritario", "urgente"]);

const sourceContextSchema = z.object({
  module: z.string().optional(),
  page: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.number().optional(),
  entityName: z.string().optional(),
  deepLink: z.string().optional(),
  snapshot: z.any().optional(),
  additionalData: z.record(z.string(), z.unknown()).optional()
}).optional();

const activeRequestSchema = z.object({
  sponsorUserId: z.number(),
  dueDate: z.string().optional(), // ISO
  title: z.string().min(1),
  messageToClient: z.string().min(1),
  ticketType: ticketTypeEnum.default('consultoria_geral'),
  priority: priorityEnum.default('media'),
  sourceContext: sourceContextSchema
});

// ==================== ROUTER ====================

export const ticketsRouter = router({
  // Listar sponsors (responsáveis principais) de uma organização
  // Usado para "Chamado ativo" do consultor
  getSponsors: clienteBlockedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      // Consultor/admin podem consultar; cliente apenas sua própria org
      const isSeusdadosRole = ['admin_global', 'consultor'].includes(ctx.user.role);
      if (!isSeusdadosRole && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para listar sponsors desta organização' });
      }
      return ticketService.listOrganizationSponsors(input.organizationId);
    }),

  // Criar novo ticket
  create: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number(),
      title: z.string().min(1, "Título é obrigatório"),
      description: z.string().min(1, "Descrição é obrigatória"),
      ticketType: ticketTypeEnum,
      priority: priorityEnum.default("media"),
      sourceContext: sourceContextSchema,
      clientId: z.number().optional(),
      serviceCatalogItemId: z.number().optional() // Vinculação com catálogo de serviços CSC
    }))
    .mutation(async ({ input, ctx }) => {
      const { organizationId, title, description, ticketType, priority, sourceContext, clientId, serviceCatalogItemId } = input;
      
      // ✅ Verificar permissão - Permitir que qualquer usuário da organização crie tickets
      if (ctx.user.organizationId !== organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para criar ticket nesta organização' });
      }
      
      // Determinar SLA - se houver serviço do catálogo, usar SLA do serviço
      let slaLevel = ticketService.determineSLA(ticketType, priority);
      let customDeadline: Date | null = null;
      
      if (serviceCatalogItemId) {
        // Buscar SLA do serviço do catálogo
        const { getEffectiveSlaForService } = await import('./serviceCatalogService');
        const catalogSla = await getEffectiveSlaForService(serviceCatalogItemId, organizationId);
        
        // Calcular deadline baseado no SLA do catálogo
        if (catalogSla.slaHours) {
          const now = new Date();
          customDeadline = new Date(now.getTime() + catalogSla.slaHours * 60 * 60 * 1000);
          
          // Mapear horas para nível de SLA
          if (catalogSla.slaHours <= 24) {
            slaLevel = 'urgente';
          } else if (catalogSla.slaHours <= 48) {
            slaLevel = 'prioritario';
          } else {
            slaLevel = 'padrao';
          }
        }
      }
      
      // Calcular deadline
      const ticketData = await ticketService.calculateSLA({
        organizationId,
        createdById: ctx.user.id,
        title,
        description,
        ticketType,
        priority,
        status: 'novo',
        slaLevel: slaLevel as any,
        sourceContext,
        clientId,
        serviceCatalogItemId
      });
      
      // Se houver deadline customizado do catálogo, sobrescrever
      if (customDeadline) {
        ticketData.deadline = customDeadline.toISOString();
      }
      
      const { id: ticketId, ticketNumber } = await ticketService.createTicket(ticketData);
      
      // Notificar equipe se urgente
      if (slaLevel === 'urgente') {
        await ticketService.notifyTeamAboutUrgentTicket(ticketId, { title, ticketType, priority });
      }
      
      // Se for incidente de segurança, gerar relatório inicial e criar incidente
      if (ticketType === 'incidente_seguranca') {
        await ticketService.generateInitialIncidentReport(ticketId);
        
        // Criar incidente automaticamente no Painel de Controle
        try {
          const incidentId = await incidentIntegration.createIncidentFromTicket(ticketId, ctx.user.id);
          if (incidentId) {
            logger.info(`[Tickets] Incidente ${incidentId} criado automaticamente para ticket ${ticketId}`);
          }
        } catch (error) {
          logger.error('[Tickets] Erro ao criar incidente automático:', error);
        }
      }
      
      // Enviar notificação de novo ticket
      try {
        const { getTicketEmailData, notifyTicketCreated } = await import('./emailService');
        const emailData = await getTicketEmailData(ticketId);
        if (emailData) {
          await notifyTicketCreated(emailData);
        }
      } catch (error) {
        logger.error('[Tickets] Erro ao enviar notificação de novo ticket:', error);
      }
      
      // Log de atividade
      try {
        const { logActivity } = await import('./dashboardRouter');
        await logActivity({
          organizationId,
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email,
          activityType: 'ticket_criado',
          module: 'meudpo',
          description: `Chamado #${ticketNumber} criado: ${title}`,
          entityType: 'ticket',
          entityId: ticketId,
          entityName: title,
        });
      } catch (e) { /* silencioso */ }

      return { id: ticketId, ticketNumber, slaLevel };
    }),

  // Consultor/PMO/Admin: criar "chamado ativo" para que o sponsor do cliente execute uma ação
  createActive: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number(),
      sponsorUserId: z.number(),
      title: z.string().min(5),
      request: z.string().min(10),
      ticketType: ticketTypeEnum.default('consultoria_geral'),
      priority: priorityEnum.default('media'),
      dueDate: z.date().optional(),
      sourceContext: sourceContextSchema
    }))
    .mutation(async ({ input, ctx }) => {
      const isSeusdadosRole = ['admin_global', 'consultor'].includes(ctx.user.role);
      if (!isSeusdadosRole) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas consultor/PMO podem abrir chamado ativo' });
      }
      const { organizationId, sponsorUserId, title, request, ticketType, priority, sourceContext, dueDate } = input;

      // Validação: sponsor pertence à organização
      const sponsorOk = await ticketService.isUserInOrganization(sponsorUserId, organizationId);
      if (!sponsorOk) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Sponsor não pertence à organização' });
      }

      // Cria ticket já em aguardando_cliente e com "clientId" apontando para quem deve responder.
      const slaLevel = ticketService.determineSLA(ticketType, priority);
      const ticketData = await ticketService.calculateSLA({
        organizationId,
        createdById: ctx.user.id,
        title,
        description: request,
        ticketType,
        priority,
        status: 'aguardando_cliente',
        slaLevel: slaLevel as any,
        sourceContext,
        clientId: sponsorUserId
      });

      // Deadline customizado (se fornecido)
      if (dueDate) {
        (ticketData as any).deadline = new Date(dueDate).toISOString();
      }

      const { id: ticketId, ticketNumber } = await ticketService.createTicket(ticketData as any);

      // Audit log
      await ticketService.auditTicketAction({
        ticketId,
        action: 'ticket_active_created',
        actor: { id: ctx.user.id, role: ctx.user.role },
        payload: { sponsorUserId, dueAt: (ticketData as any).deadline, ticketType, priority }
      });

      // Registrar tarefa/agenda para o sponsor
      try {
        await ticketService.createClientTaskAndCalendarEvent({
          ticketId,
          organizationId,
          sponsorUserId,
          title,
          dueAt: (ticketData as any).deadline
        });
      } catch (e) {
        logger.error('[Tickets] Erro ao criar tarefa/calendário para sponsor:', e);
      }

      // Notificar sponsor
      try {
        await ticketService.notifySponsorAboutActiveTicket(ticketId, sponsorUserId, { title, dueAt: (ticketData as any).deadline });
      } catch (e) {
        logger.error('[Tickets] Erro ao notificar sponsor:', e);
      }

      return { id: ticketId, ticketNumber, slaLevel, status: 'aguardando_cliente' as const };
    }),

  // Buscar ticket por ID
  getById: clienteBlockedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const ticket = await ticketService.getTicketById(input.id);
      
      if (!ticket) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ticket não encontrado' });
      }
      
      // Verificar permissão - admin_global e consultor podem ver todos os tickets
      const isSeusdadosRole = ['admin_global', 'consultor'].includes(ctx.user.role);
      if (isSeusdadosRole) {
        // Seusdados têm acesso total
      } else {
        // Cliente só vê tickets da sua organização
        if (ctx.user.organizationId !== ticket.organizationId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para visualizar este ticket' });
        }
        // Cliente só vê tickets que criou ou onde é o cliente
        if (ticket.createdById !== ctx.user.id && ticket.clientId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para visualizar este ticket' });
        }
      }
      
      return ticket;
    }),

  // Listar tickets
  list: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      status: statusEnum.optional(),
      ticketType: ticketTypeEnum.optional(),
      priority: priorityEnum.optional(),
      search: z.string().optional(),
      assignedToId: z.number().optional(),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
      assignedToMe: z.boolean().optional()
    }))
    .query(async ({ input, ctx }) => {
      const { organizationId, status, ticketType, priority, search, assignedToId, dateFrom, dateTo, page, pageSize, assignedToMe } = input;
      
      const filters = { status, ticketType, priority, search, assignedToId, dateFrom, dateTo, page, pageSize };
      
      // Admin global pode ver todos
      if (ctx.user.role === 'admin_global') {
        const result = await ticketService.listAllTickets({
          organizationId,
          ...filters
        });
        return result;
      }
      
      // Consultor pode ver tickets das organizações que atende
      if (ctx.user.role === 'consultor') {
        if (assignedToMe && organizationId) {
          return ticketService.listTicketsAssignedToUser(organizationId, ctx.user.id, filters);
        }
        if (organizationId) {
          return ticketService.listOrganizationTickets(organizationId, filters);
        }
        // Sem organização especificada, retorna todos
        return ticketService.listAllTickets(filters);
      }
      
      // Cliente só vê seus próprios tickets
      const isClientRole = !['admin_global', 'consultor'].includes(ctx.user.role);
      if (isClientRole && ctx.user.organizationId) {
        return ticketService.listTicketsForClient(
          ctx.user.organizationId,
          ctx.user.id,
          filters
        );
      }
      
      return { tickets: [], total: 0 };
    }),

  // Atualizar status do ticket
  updateStatus: clienteBlockedProcedure
    .input(z.object({
      id: z.number(),
      status: statusEnum,
      resolution: z.string().optional(),
      legalBasis: z.string().optional(),
      applicableArticles: z.array(z.string()).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, status, resolution, legalBasis, applicableArticles } = input;
      
      const ticket = await ticketService.getTicketById(id);
      if (!ticket) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ticket não encontrado' });
      }
      
      // Apenas admin, consultor ou responsável podem atualizar status
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Clientes não podem alterar status de tickets' });
      }
      
      const oldStatus = ticket.status;
      
      await ticketService.updateTicket(id, {
        status,
        resolution,
        legalBasis,
        applicableArticles
      });

      await ticketService.auditTicketAction({
        ticketId: id,
        action: 'ticket_status_updated',
        actor: { id: ctx.user.id, role: ctx.user.role },
        payload: { oldStatus, newStatus: status, resolution: resolution ?? null, legalBasis: legalBasis ?? null, applicableArticles: applicableArticles ?? null }
      });
      
      // Atualizar timeline do SLA
      await ticketService.updateSLATimeline(id, status);
      
      // Notificar sobre mudança de status
      await ticketService.notifyAboutStatusChange(id, oldStatus, status);
      
      // Se resolvido, notificar cliente
      if (status === 'resolvido' && ticket.createdById) {
        await ticketService.sendResolutionNotification(id, ticket.createdById);
      }

      // Se resolvido: arquivar automaticamente no GED do cliente (pasta /meudpo)
      if (status === 'resolvido') {
        try {
          await ticketService.archiveClosedTicketToGED(id);
        } catch (e) {
          logger.error('[Tickets] Erro ao arquivar ticket no GED:', e);
        }
      }
      
      // Enviar notificação de mudança de status
      try {
        const { getTicketEmailData, notifyTicketStatusChanged } = await import('./emailService');
        const emailData = await getTicketEmailData(id);
        if (emailData) {
          await notifyTicketStatusChanged(emailData, oldStatus, status, ctx.user.name || 'Usuário');
        }
      } catch (error) {
        logger.error('[Tickets] Erro ao enviar notificação de mudança de status:', error);
      }
      
      // Log de atividade
      try {
        const { logActivity } = await import('./dashboardRouter');
        const actType = status === 'resolvido' ? 'ticket_resolvido' : 'ticket_respondido';
        await logActivity({
          organizationId: ticket.organizationId,
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email,
          activityType: actType,
          module: 'meudpo',
          description: `Chamado #${ticket.ticketNumber} ${status === 'resolvido' ? 'resolvido' : 'atualizado para ' + status}`,
          entityType: 'ticket',
          entityId: id,
          entityName: ticket.subject || ticket.title,
        });
      } catch (e) { /* silencioso */ }

      return { success: true, id, status, ticketNumber: ticket.ticketNumber };
    }),

  // Atribuir responsável
  assign: clienteBlockedProcedure
    .input(z.object({
      id: z.number(),
      assignedToId: z.number()
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, assignedToId } = input;
      
      // Apenas admin ou consultor podem atribuir
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para atribuir tickets' });
      }
      
      const ticket = await ticketService.getTicketById(id);
      if (!ticket) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ticket não encontrado' });
      }
      
      await ticketService.updateTicket(id, { assignedToId });

      await ticketService.auditTicketAction({
        ticketId: id,
        action: 'ticket_assigned',
        actor: { id: ctx.user.id, role: ctx.user.role },
        payload: { assignedToId }
      });
      
      // Notificar o responsável
      await ticketService.notifyAssignment(id, assignedToId);
      
      return { success: true };
    }),

  // Adicionar comentário
  addComment: clienteBlockedProcedure
    .input(z.object({
      ticketId: z.number(),
      content: z.string(),
      isInternal: z.boolean().default(false),
      pendingFiles: z.array(z.object({
        fileName: z.string(),
        mimeType: z.string(),
        fileContent: z.string()
      })).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const { ticketId, content, isInternal } = input;
      
      const ticket = await ticketService.getTicketById(ticketId);
      if (!ticket) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ticket não encontrado' });
      }
      
      // Verificar permissão
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        if (ctx.user.organizationId !== ticket.organizationId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão' });
        }
        // Cliente não pode fazer comentários internos
        if (isInternal) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Clientes não podem fazer comentários internos' });
        }
      }
      
      // Determinar role do autor (mapeado para tipos do schema: cliente, consultor, advogado, dpo, admin)
      let authorRole: 'cliente' | 'consultor' | 'advogado' | 'dpo' | 'admin' = 'cliente';
      if (ctx.user.role === 'admin_global') authorRole = 'admin';
      else if (ctx.user.role === 'consultor') authorRole = 'consultor';
      
      const comment = await ticketService.addComment({
        ticketId,
        organizationId: ticket.organizationId,
        authorId: ctx.user.id,
        authorRole,
        content,
        isInternal: !!isInternal
      });
      
      await ticketService.auditTicketAction({
        ticketId,
        action: 'ticket_comment_added',
        actor: { id: ctx.user.id, role: ctx.user.role },
        payload: { isInternal, length: content?.length ?? 0 }
      });
      
      // Upload de arquivos pendentes vinculados ao comentário
      const { pendingFiles } = input;
      if (pendingFiles && pendingFiles.length > 0) {
        for (const file of pendingFiles) {
          try {
            await ticketService.uploadAttachment({
              ticketId,
              commentId: comment.id,
              organizationId: ticket.organizationId,
              uploadedById: ctx.user.id,
              fileName: file.fileName,
              mimeType: file.mimeType,
              fileContent: file.fileContent
            });
          } catch (error) {
            logger.error('[Tickets] Erro ao fazer upload de anexo:', error);
          }
        }
      }
      
      // Notificar sobre novo comentário
      await ticketService.notifyAboutNewComment(comment, ticket);
      
      // Enviar notificação de novo comentário
      try {
        const { getTicketEmailData, notifyTicketComment } = await import('./emailService');
        const emailData = await getTicketEmailData(ticketId);
        if (emailData) {
          await notifyTicketComment(emailData, ctx.user.name || 'Usuário', content, isInternal);
        }
      } catch (error) {
        logger.error('[Tickets] Erro ao enviar notificação de comentário:', error);
      }
      
      return comment;
    }),

  // Listar comentários
  getComments: clienteBlockedProcedure
    .input(z.object({ ticketId: z.number() }))
    .query(async ({ input, ctx }) => {
      const ticket = await ticketService.getTicketById(input.ticketId);
      if (!ticket) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ticket não encontrado' });
      }
      
      const comments = await ticketService.getTicketComments(input.ticketId);
      
      // Se for cliente, filtrar comentários internos
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        return comments.filter(c => !c.isInternal);
      }
      
      return comments;
    }),

  // Upload de anexo
  uploadAttachment: clienteBlockedProcedure
    .input(z.object({
      ticketId: z.number(),
      fileName: z.string(),
      mimeType: z.string(),
      fileContent: z.string() // Base64
    }))
    .mutation(async ({ input, ctx }) => {
      const { ticketId, fileName, mimeType, fileContent } = input;
      
      const ticket = await ticketService.getTicketById(ticketId);
      if (!ticket) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ticket não encontrado' });
      }
      
      // Verificar permissão
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== ticket.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão' });
      }
      
      const attachment = await ticketService.processAttachmentUpload({
        ticketId,
        organizationId: ticket.organizationId,
        uploadedById: ctx.user.id,
        fileName,
        mimeType,
        fileContent
      });
      
      // Notificar sobre novo anexo
      await ticketService.notifyAboutNewAttachment(ticket, attachment);
      
      return attachment;
    }),

  // Listar anexos
  getAttachments: clienteBlockedProcedure
    .input(z.object({ ticketId: z.number() }))
    .query(async ({ input, ctx }) => {
      const ticket = await ticketService.getTicketById(input.ticketId);
      if (!ticket) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ticket não encontrado' });
      }
      
      // Verificar permissão
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== ticket.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão' });
      }
      
      return ticketService.getTicketAttachments(input.ticketId);
    }),

  // Métricas do dashboard
  getDashboardMetrics: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      period: z.enum(['ultimos_7_dias', 'ultimos_30_dias', 'este_mes', 'este_ano']).default('ultimos_30_dias')
    }))
    .query(async ({ input, ctx }) => {
      let orgId: number | null = input.organizationId || null;
      
      // Cliente só vê métricas da própria organização
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        orgId = ctx.user.organizationId || null;
      }
      
      return ticketService.getDashboardMetrics(orgId, input.period);
    }),

  // Gerar documento legal
  generateDocument: clienteBlockedProcedure
    .input(z.object({
      ticketId: z.number(),
      documentType: z.enum(['resposta_titular', 'relatorio_incidente', 'parecer_juridico'])
    }))
    .mutation(async ({ input, ctx }) => {
      // Apenas admin ou consultor podem gerar documentos
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para gerar documentos' });
      }
      
      const ticket = await ticketService.getTicketById(input.ticketId);
      if (!ticket) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ticket não encontrado' });
      }
      
      const documentUrl = await ticketService.generateLegalDocument(input.ticketId);
      
      return { documentUrl };
    }),

  // Deletar ticket (apenas admin)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const ticket = await ticketService.getTicketById(input.id);
      if (!ticket) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ticket não encontrado' });
      }
      
      await ticketService.deleteTicket(input.id);
      
      return { success: true };
    }),

  // ==================== RELATÓRIOS ====================

  // Gerar dados do relatório consolidado
  getReportData: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para acessar esta organização' });
      }

      const filters = {
        organizationId: input.organizationId,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined
      };

      return await generateConsolidatedReportData(filters, ctx.user.id);
    }),

  // ==================== CONFIGURAÇÕES ====================
  // Obter configurações da organização
  getSettings: clienteBlockedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para acessar configurações desta organização' });
      }
      return await ticketService.getOrganizationSettings(input.organizationId);
    }),

  // Salvar configurações da organização
  saveSettings: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number(),
      slaUrgentHours: z.number().min(1).max(720).optional(),
      slaPrioritarioHours: z.number().min(1).max(720).optional(),
      slaPadraoHours: z.number().min(1).max(720).optional(),
      notifyOnCreate: z.boolean().optional(),
      notifyOnUpdate: z.boolean().optional(),
      notifyOnResolve: z.boolean().optional(),
      autoReportFrequency: z.enum(['diario', 'semanal', 'mensal', 'desativado']).optional(),
      autoReportRecipients: z.array(z.string()).optional(),
      customCategories: z.array(z.string()).optional(),
      autoAssignEnabled: z.boolean().optional(),
      autoAssignRules: z.array(z.object({
        ticketType: z.string().optional(),
        priority: z.string().optional(),
        assignToUserId: z.number().optional()
      })).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores podem alterar configurações' });
      }
      
      const { organizationId, ...settings } = input;
      await ticketService.saveOrganizationSettings(organizationId, settings);
      
      return { success: true };
    }),

  // Obter consultores disponíveis para atribuição
  getAvailableConsultants: clienteBlockedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão' });
      }
      return await ticketService.getAvailableConsultants(input.organizationId);
    }),

  // Verificar status de SLA de um ticket
  getSLAStatus: clienteBlockedProcedure
    .input(z.object({ ticketId: z.number() }))
    .query(async ({ input }) => {
      return await ticketService.getTicketSLAStatus(input.ticketId);
    }),
  
  // Verificar se ticket precisa de escalonamento
  checkEscalation: clienteBlockedProcedure
    .input(z.object({ ticketId: z.number() }))
    .query(async ({ input }) => {
      return await ticketService.checkTicketEscalation(input.ticketId);
    }),
  
  // Escalonar ticket manualmente
  escalateTicket: clienteBlockedProcedure
    .input(z.object({ ticketId: z.number(), organizationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para escalonar tickets' });
      }
      return await ticketService.escalateTicket(input.ticketId, input.organizationId);
    }),
  
  // Processar todos os escalonamentos pendentes (para cron job)
  processEscalations: adminProcedure
    .mutation(async () => {
      return await ticketService.processAllPendingEscalations();
    }),
  
  // Obter produtividade de um consultor específico
  getConsultantProductivity: clienteBlockedProcedure
    .input(z.object({
      consultantId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão' });
      }
      return await ticketService.getConsultantProductivity(
        input.consultantId,
        input.startDate ? new Date(input.startDate) : undefined,
        input.endDate ? new Date(input.endDate) : undefined
      );
    }),
  
  // Obter produtividade de todos os consultores
  getAllConsultantsProductivity: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão' });
      }
      return await ticketService.getAllConsultantsProductivity(
        input.organizationId,
        input.startDate ? new Date(input.startDate) : undefined,
        input.endDate ? new Date(input.endDate) : undefined
      );
    }),
  
  // Obter resumo de produtividade
  getProductivitySummary: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão' });
      }
      return await ticketService.getProductivitySummary(
        input.organizationId,
        input.startDate ? new Date(input.startDate) : undefined,
        input.endDate ? new Date(input.endDate) : undefined
      );
    }),
  
  // ============================================
  // TEMPLATES DE RESPOSTA RÁPIDA
  // ============================================

  getResponseTemplates: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().optional()
    }).optional())
    .query(async ({ input }) => {
      return await ticketService.getResponseTemplates(input?.organizationId);
    }),

  createResponseTemplate: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      title: z.string(),
      content: z.string(),
      category: z.string(),
      ticketType: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      return await ticketService.createResponseTemplate({
        ...input,
        createdById: ctx.user.id
      });
    }),

  updateResponseTemplate: clienteBlockedProcedure
    .input(z.object({
      templateId: z.number(),
      title: z.string().optional(),
      content: z.string().optional(),
      category: z.string().optional(),
      ticketType: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const { templateId, ...data } = input;
      return await ticketService.updateResponseTemplate(templateId, data);
    }),

  deleteResponseTemplate: clienteBlockedProcedure
    .input(z.object({ templateId: z.number() }))
    .mutation(async ({ input }) => {
      return await ticketService.deleteResponseTemplate(input.templateId);
    }),

  incrementTemplateUsage: clienteBlockedProcedure
    .input(z.object({ templateId: z.number() }))
    .mutation(async ({ input }) => {
      await ticketService.incrementTemplateUsage(input.templateId);
      return { success: true };
    }),

  getTemplateCategories: clienteBlockedProcedure
    .query(async () => {
      return await ticketService.getTemplateCategories();
    }),

  getSuggestedTemplates: clienteBlockedProcedure
    .input(z.object({
      ticketType: z.string(),
      organizationId: z.number().optional()
    }))
    .query(async ({ input }) => {
      return await ticketService.getSuggestedTemplates(input.ticketType, input.organizationId);
    }),

  // Gerar relatório de tickets (HTML para conversão em PDF)
  generateTicketReport: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      consultantId: z.number().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      status: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para gerar relatórios' });
      }
      
      const filters = {
        organizationId: input.organizationId,
        consultantId: input.consultantId,
        dateFrom: input.dateFrom ? new Date(input.dateFrom).toISOString() : undefined,
        dateTo: input.dateTo ? new Date(input.dateTo).toISOString() : undefined,
        status: input.status
      };
      
      const reportData = await generateTicketReportData(filters);
      const html = generateTicketReportHTML(reportData);
      
      return {
        html,
        data: reportData,
        filename: `relatorio-tickets-${new Date().toISOString().split('T')[0]}.html`
      };
    }),

  // Gerar PDF do relatório consolidado
  generateReportPDF: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para gerar relatórios' });
      }

      const filters = {
        organizationId: input.organizationId,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined
      };

      const pdfBuffer = await generateConsolidatedReportPDF(filters, ctx.user.id);
      
       // Retornar como base64 para download
      return {
        pdf: pdfBuffer.toString('base64'),
        filename: `relatorio-consolidado-${input.organizationId}-${new Date().toISOString().split('T')[0]}.pdf`
      };
    }),

  // ==================== TAGS ====================
  
  // Listar tags da organização
  getTags: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number()
    }))
    .query(async ({ input }) => {
      return ticketTagService.getTagsByOrganization(input.organizationId);
    }),
  
  // Criar nova tag
  createTag: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number(),
      name: z.string().min(1).max(50),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      description: z.string().max(255).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      return ticketTagService.createTag({
        organizationId: input.organizationId,
        createdById: ctx.user.id,
        name: input.name,
        color: input.color,
        description: input.description
      });
    }),
  
  // Atualizar tag
  updateTag: clienteBlockedProcedure
    .input(z.object({
      tagId: z.number(),
      name: z.string().min(1).max(50).optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      description: z.string().max(255).optional()
    }))
    .mutation(async ({ input }) => {
      return ticketTagService.updateTag(input.tagId, {
        name: input.name,
        color: input.color,
        description: input.description
      });
    }),
  
  // Deletar tag
  deleteTag: clienteBlockedProcedure
    .input(z.object({
      tagId: z.number()
    }))
    .mutation(async ({ input }) => {
      return ticketTagService.deleteTag(input.tagId);
    }),
  
  // Obter tags de um ticket
  getTicketTags: clienteBlockedProcedure
    .input(z.object({
      ticketId: z.number()
    }))
    .query(async ({ input }) => {
      return ticketTagService.getTagsForTicket(input.ticketId);
    }),
  
  // Definir tags de um ticket
  setTicketTags: clienteBlockedProcedure
    .input(z.object({
      ticketId: z.number(),
      tagIds: z.array(z.number())
    }))
    .mutation(async ({ input }) => {
      await ticketTagService.setTicketTags(input.ticketId, input.tagIds);
      return { success: true };
    }),
  
  // Adicionar tag a um ticket
  addTagToTicket: clienteBlockedProcedure
    .input(z.object({
      ticketId: z.number(),
      tagId: z.number()
    }))
    .mutation(async ({ input }) => {
      await ticketTagService.addTagToTicket(input.ticketId, input.tagId);
      return { success: true };
    }),
  
  // Remover tag de um ticket
  removeTagFromTicket: clienteBlockedProcedure
    .input(z.object({
      ticketId: z.number(),
      tagId: z.number()
    }))
    .mutation(async ({ input }) => {
      await ticketTagService.removeTagFromTicket(input.ticketId, input.tagId);
      return { success: true };
    }),

  // ========== Pré-Análise de Contratos ==========

  // Verificar se um arquivo é um contrato
  checkIfContract: clienteBlockedProcedure
    .input(z.object({
      filename: z.string(),
      mimeType: z.string().optional()
    }))
    .query(async ({ input }) => {
      const { isContractFile } = await import('./contractPreAnalysisService');
      return {
        isContract: isContractFile(input.filename, input.mimeType)
      };
    }),

  // Verificar se o tipo de ticket pode envolver contratos
  checkTicketMayInvolveContract: clienteBlockedProcedure
    .input(z.object({
      ticketType: z.string()
    }))
    .query(async ({ input }) => {
      const { ticketMayInvolveContract } = await import('./contractPreAnalysisService');
      return {
        mayInvolveContract: ticketMayInvolveContract(input.ticketType)
      };
    }),

  // Realizar pré-análise de contrato
  preAnalyzeContract: clienteBlockedProcedure
    .input(z.object({
      contractText: z.string(),
      ticketContext: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        ticketType: z.string().optional()
      }).optional()
    }))
    .mutation(async ({ input }) => {
      const { preAnalyzeContract } = await import('./contractPreAnalysisService');
      const result = await preAnalyzeContract(input.contractText, input.ticketContext);
      return result;
    }),

  // Salvar pré-análise de contrato junto com o ticket
  saveContractPreAnalysis: clienteBlockedProcedure
    .input(z.object({
      ticketId: z.number(),
      preAnalysis: z.object({
        contractType: z.string(),
        contractParties: z.object({
          contratante: z.string(),
          contratada: z.string()
        }),
        objectSummary: z.string(),
        personalDataCategories: z.array(z.object({
          category: z.string(),
          sensitive: z.boolean(),
          examples: z.array(z.string())
        })),
        dataSubjects: z.array(z.string()),
        suggestedLegalBasis: z.string(),
        legalBasisJustification: z.string(),
        lgpdClauses: z.array(z.object({
          type: z.string(),
          present: z.boolean(),
          excerpt: z.string().optional(),
          recommendation: z.string().optional()
        })),
        preliminaryRisks: z.array(z.object({
          level: z.enum(['critico', 'alto', 'medio', 'baixo']),
          description: z.string(),
          recommendation: z.string()
        })),
        recommendations: z.array(z.string()),
        confidenceScore: z.number(),
        analysisNotes: z.string()
      }),
      userValidations: z.object({
        contractTypeValidated: z.boolean().optional(),
        partiesValidated: z.boolean().optional(),
        dataCategoriesValidated: z.boolean().optional(),
        legalBasisValidated: z.boolean().optional(),
        userNotes: z.string().optional()
      }).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      // Atualizar o ticket com a pré-análise
      const ticket = await ticketService.getTicketById(input.ticketId);
      if (!ticket) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ticket não encontrado' });
      }

      // Verificar permissão
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ticket.organizationId !== ctx.user.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para acessar este ticket' });
      }

      // Salvar pré-análise nos metadados do ticket
      const existingMetadata = ticket.metadata ? 
        (typeof ticket.metadata === 'string' ? JSON.parse(ticket.metadata) : ticket.metadata) : {};
      
      const updatedMetadata = {
        ...existingMetadata,
        contractPreAnalysis: {
          ...input.preAnalysis,
          userValidations: input.userValidations,
          analyzedAt: new Date().toISOString(),
          analyzedBy: ctx.user.id
        }
      };

      await ticketService.updateTicket(input.ticketId, {
        metadata: JSON.stringify(updatedMetadata)
      });

      // Adicionar comentário interno sobre a pré-análise
      const ticketForComment = await ticketService.getTicketById(input.ticketId);
      if (ticketForComment) {
        await ticketService.addComment({
          ticketId: input.ticketId,
          organizationId: ticketForComment.organizationId,
          authorId: ctx.user.id,
          authorRole: ctx.user.role === 'admin_global' ? 'admin' : ctx.user.role === 'consultor' ? 'consultor' : 'cliente',
          content: `**Pré-Análise de Contrato Realizada**\n\n` +
            `- Tipo: ${input.preAnalysis.contractType}\n` +
            `- Partes: ${input.preAnalysis.contractParties.contratante} / ${input.preAnalysis.contractParties.contratada}\n` +
            `- Categorias de Dados: ${input.preAnalysis.personalDataCategories.length}\n` +
            `- Base Legal Sugerida: ${input.preAnalysis.suggestedLegalBasis}\n` +
            `- Riscos Identificados: ${input.preAnalysis.preliminaryRisks.length}\n` +
            `- Confiança: ${input.preAnalysis.confidenceScore}%`,
          isInternal: true
        });
      }

      return { success: true };
    }),

  // Obter pré-análise de contrato de um ticket
  getContractPreAnalysis: clienteBlockedProcedure
    .input(z.object({
      ticketId: z.number()
    }))
    .query(async ({ input, ctx }) => {
      const ticket = await ticketService.getTicketById(input.ticketId);
      if (!ticket) {
        return null;
      }

      // Verificar permissão
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ticket.organizationId !== ctx.user.organizationId) {
        return null;
      }

      const metadata = ticket.metadata ? 
        (typeof ticket.metadata === 'string' ? JSON.parse(ticket.metadata) : ticket.metadata) : {};
      
      return metadata.contractPreAnalysis || null;
    }),

  // Criar demanda ativa de consultor para cliente
  createDemandFromConsultor: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number(),
      title: z.string(),
      description: z.string().optional(),
      priority: priorityEnum,
      dueDate: z.string().optional(),
      contextType: z.enum(["contract", "third_party", "assessment", "mapping", "general"]).optional(),
      contextId: z.number().optional(),
      contextName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Apenas consultores e admins podem criar demandas para clientes
      if (ctx.user.role !== 'consultor' && ctx.user.role !== 'admin_global') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas consultores podem criar demandas para clientes'
        });
      }

      // Criar ticket com tipo consultoria_geral
      const { id: ticketId, ticketNumber } = await ticketService.createTicket({
        organizationId: input.organizationId,
        title: input.title,
        description: input.description || '',
        ticketType: 'consultoria_geral',
        priority: input.priority,
        status: 'novo',
        slaLevel: input.priority === 'critica' ? 'urgente' : input.priority === 'alta' ? 'prioritario' : 'padrao',
        createdById: ctx.user.id,
        metadata: {
          dueDate: input.dueDate,
          createdByConsultor: true,
          consultorId: ctx.user.id,
          consultorName: ctx.user.name,
          contextType: input.contextType,
          contextId: input.contextId,
          contextName: input.contextName,
        }
      });

      // TODO: Enviar notificação para o cliente
      // await notifyClient(input.organizationId, ticketId, input.title);

      return { ticketId, ticketNumber, success: true };
    }),

  // ==================== ENDPOINTS DE MONITORAMENTO DE SLA ====================

  // Obter tickets em risco de SLA
  getSLAAlerts: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().optional()
    }).optional())
    .query(async ({ input, ctx }) => {
      // Se for cliente, filtrar por sua organização
      const orgId = ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' 
        ? ctx.user.organizationId 
        : input?.organizationId;
      
      return slaMonitoring.getTicketsAtRisk(orgId);
    }),

  // Obter métricas de SLA
  getSLAMetrics: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      periodDays: z.number().min(1).max(365).default(30)
    }).optional())
    .query(async ({ input, ctx }) => {
      const orgId = ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' 
        ? ctx.user.organizationId 
        : input?.organizationId;
      
      return slaMonitoring.getSLAMetrics(orgId, input?.periodDays || 30);
    }),

  // Obter dashboard completo de SLA
  getSLADashboard: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().optional()
    }).optional())
    .query(async ({ input, ctx }) => {
      const orgId = ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' 
        ? ctx.user.organizationId 
        : input?.organizationId;
      
      return slaMonitoring.getSLADashboard(orgId);
    }),

  // Enviar alertas de SLA (apenas admin)
  sendSLAAlerts: adminProcedure
    .mutation(async () => {
      return slaMonitoring.sendSLAAlerts();
    }),

  // Obter status do scheduler de SLA (apenas admin)
  getSLASchedulerStatus: adminProcedure
    .query(async () => {
      return slaScheduler.getSchedulerStatus();
    }),

  // Iniciar scheduler de SLA manualmente (apenas admin)
  startSLAScheduler: adminProcedure
    .mutation(async () => {
      slaScheduler.startSLAScheduler();
      return { success: true, message: 'Scheduler iniciado' };
    }),

  // Parar scheduler de SLA (apenas admin)
  stopSLAScheduler: adminProcedure
    .mutation(async () => {
      slaScheduler.stopSLAScheduler();
      return { success: true, message: 'Scheduler parado' };
    }),

  // Executar verificação de SLA manualmente (apenas admin)
  triggerSLACheck: adminProcedure
    .mutation(async () => {
      const result = await slaScheduler.triggerSLACheck();
      return { success: true, ...result };
    }),

  // Obter audit log de um ticket
  getAuditLog: clienteBlockedProcedure
    .input(z.object({
      ticketId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      // Verificar permissão de acesso ao ticket
      const ticket = await ticketService.getTicketById(input.ticketId);
      if (!ticket) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ticket não encontrado' });
      }
      
      // Verificar se o usuário tem acesso ao ticket
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor') {
        if (ctx.user.organizationId !== ticket.organizationId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
        }
      }
      
      return ticketService.getTicketAuditLog(input.ticketId);
    }),

  // Listar chamados pendentes (para dashboard de pendências)
  getPendingTickets: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      // Buscar tickets abertos ou em análise
      const filters: any = {
        status: ['novo', 'em_analise', 'aguardando_cliente', 'aguardando_terceiro'],
      };
      
      // Filtrar por organização se especificado
      if (input?.organizationId) {
        filters.organizationId = input.organizationId;
      }
      
      // Se for cliente, filtrar apenas pela sua organização
      if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.organizationId) {
        filters.organizationId = ctx.user.organizationId;
      }
      
      const result = await ticketService.listAllTickets({ ...filters, page: 1, pageSize: 50 });
      
      return result.tickets.map((ticket: any) => ({
        id: ticket.id,
        title: ticket.title,
        category: ticket.ticketType,
        status: ticket.status,
        priority: ticket.priority,
        organizationId: ticket.organizationId,
        organizationName: ticket.organizationName,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      }));
    }),
});
export type TicketsRouter = typeof ticketsRouter;
