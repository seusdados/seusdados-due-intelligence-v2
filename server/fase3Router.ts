// server/fase3Router.ts
// Fase 3 - Central de Direitos do Titular
// Router tRPC para gestão de direitos LGPD

import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import * as fase3Service from "./fase3Service";
import { TRPCError } from "@trpc/server";

// Schemas de validação
const searchTitularSchema = z.object({
  organizationId: z.number().positive(),
  query: z.string().min(1),
});

const createRequestSchema = z.object({
  organizationId: z.number().positive(),
  titularName: z.string().min(1),
  titularEmail: z.string().email().optional(),
  titularDocument: z.string().optional(),
  requestType: z.enum(["acesso", "retificacao", "exclusao", "portabilidade", "revogacao_consentimento", "oposicao", "informacao"]),
  description: z.string().optional(),
  receivedVia: z.string().optional(),
  externalProtocol: z.string().optional(),
});

const updateStatusSchema = z.object({
  requestId: z.number().positive(),
  status: z.enum(["recebida", "em_analise", "aguardando_info", "respondida", "negada", "arquivada"]),
  notes: z.string().optional(),
});

const assignRequestSchema = z.object({
  requestId: z.number().positive(),
  assignedToId: z.number().positive(),
});

const generateReportSchema = z.object({
  organizationId: z.number().positive(),
  titularName: z.string().min(1),
  titularEmail: z.string().email().optional(),
  titularDocument: z.string().optional(),
  requestId: z.number().positive().optional(),
});

export const fase3Router = router({
  // ==========================
  // CONSOLIDAÇÃO DE TITULARES
  // ==========================

  // Consolidar instâncias de titulares (executar após Fase 2)
  consolidate: protectedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .mutation(async ({ input, ctx }) => {
      // Verificar permissão
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const count = await fase3Service.consolidateTitularInstances(input.organizationId);
      return { success: true, instancesCreated: count };
    }),

  // Buscar titular
  searchTitular: protectedProcedure
    .input(searchTitularSchema)
    .query(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return fase3Service.searchTitular(input.organizationId, input.query);
    }),

  // Listar categorias de titulares
  listTitularCategories: protectedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return fase3Service.listTitularCategories(input.organizationId);
    }),

  // Obter visão consolidada por categoria
  getTitularView: protectedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      titularCategory: z.string().min(1),
    }))
    .query(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return fase3Service.getTitularConsolidatedView(
        input.organizationId,
        input.titularCategory
      );
    }),

  // ==========================
  // SOLICITAÇÕES DE DIREITOS
  // ==========================

  // Criar solicitação
  createRequest: protectedProcedure
    .input(createRequestSchema)
    .mutation(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const requestId = await fase3Service.createRequest({
        ...input,
        createdById: ctx.user.id,
      });
      return { success: true, requestId };
    }),

  // Listar solicitações
  listRequests: protectedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      status: z.string().optional(),
      requestType: z.string().optional(),
      limit: z.number().positive().optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return fase3Service.listRequests(input.organizationId, {
        status: input.status,
        requestType: input.requestType,
        limit: input.limit,
      });
    }),

  // Obter detalhes de uma solicitação
  getRequest: protectedProcedure
    .input(z.object({ requestId: z.number().positive() }))
    .query(async ({ input }) => {
      const request = await fase3Service.getRequest(input.requestId);
      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada" });
      }
      return request;
    }),

  // Atualizar status
  updateStatus: protectedProcedure
    .input(updateStatusSchema)
    .mutation(async ({ input, ctx }) => {
      await fase3Service.updateRequestStatus(
        input.requestId,
        input.status,
        input.notes,
        ctx.user.id
      );
      return { success: true };
    }),

  // Atribuir responsável
  assignRequest: protectedProcedure
    .input(assignRequestSchema)
    .mutation(async ({ input, ctx }) => {
      await fase3Service.assignRequest(
        input.requestId,
        input.assignedToId,
        ctx.user.id
      );
      return { success: true };
    }),

  // ==========================
  // RELATÓRIOS
  // ==========================

  // Gerar relatório de dados
  generateDataReport: protectedProcedure
    .input(generateReportSchema)
    .mutation(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const reportUrl = await fase3Service.generateDataReport(input);
      return { success: true, reportUrl };
    }),

  // ==========================
  // ESTATÍSTICAS
  // ==========================

  // Obter estatísticas
  getStats: protectedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      if (
        ctx.user.role === "sponsor" &&
        ctx.user.organizationId !== input.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return fase3Service.getRequestStats(input.organizationId);
    }),

  // ==========================
  // ENDPOINTS PÚBLICOS (SEM LOGIN)
  // Conformidade com Art. 18, § 3º da LGPD
  // ==========================

  // Criar solicitação pública (sem autenticação)
  createPublicRequest: publicProcedure
    .input(
      z.object({
        organizationId: z.number().positive(),
        titularName: z.string().min(1, "Nome é obrigatório"),
        titularEmail: z.string().email("E-mail inválido"),
        titularDocument: z.string().optional(),
        requestType: z.enum(["acesso", "retificacao", "exclusao", "portabilidade", "revogacao_consentimento", "oposicao", "informacao"]),
        description: z.string().optional(),
        honeypot: z.string().optional(), // Campo anti-spam
      })
    )
    .mutation(async ({ input }) => {
      // Proteção anti-spam: se honeypot estiver preenchido, é bot
      if (input.honeypot && input.honeypot.length > 0) {
        // Simula sucesso para não revelar que detectamos o bot
        return {
          success: true,
          protocol: "FAKE-" + Math.random().toString(36).substring(7).toUpperCase(),
          message: "Solicitação registrada com sucesso.",
        };
      }

      // Gerar protocolo único
      const protocol = `LGPD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Criar solicitação no banco
      const requestId = await fase3Service.createRequest({
        organizationId: input.organizationId,
        titularName: input.titularName,
        titularEmail: input.titularEmail,
        titularDocument: input.titularDocument,
        requestType: input.requestType,
        description: input.description,
        receivedVia: "portal_publico",
        externalProtocol: protocol,
      });

      // TODO: Enviar e-mail de confirmação ao titular
      // TODO: Notificar DPO sobre nova solicitação

      return {
        success: true,
        protocol,
        requestId,
        message: "Sua solicitação foi registrada com sucesso. Guarde o número de protocolo para acompanhamento.",
      };
    }),

  // Consultar status por protocolo (sem autenticação)
  getPublicRequestStatus: publicProcedure
    .input(
      z.object({
        protocol: z.string().min(1, "Protocolo é obrigatório"),
        email: z.string().email("E-mail inválido"),
      })
    )
    .query(async ({ input }) => {
      const request = await fase3Service.getRequestByProtocol(
        input.protocol,
        input.email
      );

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitação não encontrada. Verifique o protocolo e e-mail informados.",
        });
      }

      // Retornar apenas informações públicas (sem dados internos)
      return {
        protocol: request.externalProtocol,
        requestType: request.requestType,
        status: request.status,
        createdAt: request.createdAt,
        respondedAt: request.respondedAt,
        statusLabel: getStatusLabel(request.status),
        statusDescription: getStatusDescription(request.status),
      };
    }),

  // Listar organizações disponíveis para solicitação pública
  getPublicOrganizations: publicProcedure.query(async () => {
    return fase3Service.getPublicOrganizations();
  }),
});

// Funções auxiliares para labels de status
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    recebida: "Recebida",
    em_analise: "Em Análise",
    aguardando_info: "Aguardando Informações",
    respondida: "Respondida",
    negada: "Negada",
    arquivada: "Arquivada",
  };
  return labels[status] || status;
}

function getStatusDescription(status: string): string {
  const descriptions: Record<string, string> = {
    recebida: "Sua solicitação foi recebida e está aguardando análise.",
    em_analise: "Sua solicitação está sendo analisada pela equipe responsável.",
    aguardando_info: "Precisamos de informações adicionais. Verifique seu e-mail.",
    respondida: "Sua solicitação foi atendida. Verifique seu e-mail para detalhes.",
    negada: "Sua solicitação não pôde ser atendida. Verifique seu e-mail para justificativa.",
    arquivada: "Esta solicitação foi arquivada.",
  };
  return descriptions[status] || "";
}
