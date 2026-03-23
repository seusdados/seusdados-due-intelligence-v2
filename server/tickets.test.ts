/**
 * Testes unitários para o módulo MEUDPO (Sistema de Tickets)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ticketService } from "./ticketService";

// Mock do getDb
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 1 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
  }),
}));

describe("ticketService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("calculateSLA", () => {
    it("deve calcular SLA básico para prioridade baixa", () => {
      const result = ticketService.calculateSLA("baixa", "consultoria_geral");
      expect(result.slaLevel).toBe("basico");
      expect(result.deadline).toBeInstanceOf(Date);
      // SLA básico = 5 dias úteis
      const expectedDeadline = new Date();
      expectedDeadline.setDate(expectedDeadline.getDate() + 7); // ~5 dias úteis
      expect(result.deadline.getTime()).toBeGreaterThan(Date.now());
    });

    it("deve calcular SLA padrão para prioridade média", () => {
      const result = ticketService.calculateSLA("media", "duvida_juridica");
      expect(result.slaLevel).toBe("padrao");
      expect(result.deadline).toBeInstanceOf(Date);
    });

    it("deve calcular SLA prioritário para prioridade alta", () => {
      const result = ticketService.calculateSLA("alta", "documentacao");
      expect(result.slaLevel).toBe("prioritario");
      expect(result.deadline).toBeInstanceOf(Date);
    });

    it("deve calcular SLA urgente para prioridade crítica", () => {
      const result = ticketService.calculateSLA("critica", "consultoria_geral");
      expect(result.slaLevel).toBe("urgente");
      expect(result.deadline).toBeInstanceOf(Date);
    });

    it("deve calcular SLA urgente para incidente de segurança independente da prioridade", () => {
      const result = ticketService.calculateSLA("baixa", "incidente_seguranca");
      expect(result.slaLevel).toBe("urgente");
    });

    it("deve calcular SLA prioritário para solicitação de titular independente da prioridade", () => {
      const result = ticketService.calculateSLA("baixa", "solicitacao_titular");
      expect(result.slaLevel).toBe("prioritario");
    });
  });

  describe("validateTicketData", () => {
    it("deve validar dados de ticket válidos", () => {
      const validData = {
        organizationId: 1,
        title: "Teste de ticket",
        description: "Descrição do teste",
        ticketType: "consultoria_geral" as const,
        priority: "media" as const,
      };
      
      // Não deve lançar erro
      expect(() => ticketService.validateTicketData(validData)).not.toThrow();
    });

    it("deve rejeitar ticket sem título", () => {
      const invalidData = {
        organizationId: 1,
        title: "",
        description: "Descrição do teste",
        ticketType: "consultoria_geral" as const,
        priority: "media" as const,
      };
      
      expect(() => ticketService.validateTicketData(invalidData)).toThrow("Título é obrigatório");
    });

    it("deve rejeitar ticket sem descrição", () => {
      const invalidData = {
        organizationId: 1,
        title: "Teste",
        description: "",
        ticketType: "consultoria_geral" as const,
        priority: "media" as const,
      };
      
      expect(() => ticketService.validateTicketData(invalidData)).toThrow("Descrição é obrigatória");
    });

    it("deve rejeitar ticket com tipo inválido", () => {
      const invalidData = {
        organizationId: 1,
        title: "Teste",
        description: "Descrição",
        ticketType: "tipo_invalido" as any,
        priority: "media" as const,
      };
      
      expect(() => ticketService.validateTicketData(invalidData)).toThrow("Tipo de ticket inválido");
    });

    it("deve rejeitar ticket com prioridade inválida", () => {
      const invalidData = {
        organizationId: 1,
        title: "Teste",
        description: "Descrição",
        ticketType: "consultoria_geral" as const,
        priority: "invalida" as any,
      };
      
      expect(() => ticketService.validateTicketData(invalidData)).toThrow("Prioridade inválida");
    });
  });

  describe("canUserAccessTicket", () => {
    it("deve permitir acesso para admin_global", () => {
      const user = { id: 1, role: "admin_global" as const, organizationId: null };
      const ticket = { organizationId: 1, createdBy: 2 };
      
      expect(ticketService.canUserAccessTicket(user, ticket)).toBe(true);
    });

    it("deve permitir acesso para consultor", () => {
      const user = { id: 1, role: "consultor" as const, organizationId: null };
      const ticket = { organizationId: 1, createdBy: 2 };
      
      expect(ticketService.canUserAccessTicket(user, ticket)).toBe(true);
    });

    it("deve permitir acesso para cliente da mesma organização", () => {
      const user = { id: 1, role: "usuario" as const, organizationId: 1 };
      const ticket = { organizationId: 1, createdBy: 2 };
      
      expect(ticketService.canUserAccessTicket(user, ticket)).toBe(true);
    });

    it("deve negar acesso para cliente de outra organização", () => {
      const user = { id: 1, role: "usuario" as const, organizationId: 2 };
      const ticket = { organizationId: 1, createdBy: 3 };
      
      expect(ticketService.canUserAccessTicket(user, ticket)).toBe(false);
    });

    it("deve permitir acesso para criador do ticket", () => {
      const user = { id: 1, role: "usuario" as const, organizationId: 2 };
      const ticket = { organizationId: 1, createdBy: 1 };
      
      expect(ticketService.canUserAccessTicket(user, ticket)).toBe(true);
    });
  });

  describe("canUserManageTicket", () => {
    it("deve permitir gerenciamento para admin_global", () => {
      const user = { id: 1, role: "admin_global" as const };
      
      expect(ticketService.canUserManageTicket(user)).toBe(true);
    });

    it("deve permitir gerenciamento para consultor", () => {
      const user = { id: 1, role: "consultor" as const };
      
      expect(ticketService.canUserManageTicket(user)).toBe(true);
    });

    it("deve negar gerenciamento para cliente", () => {
      const user = { id: 1, role: "usuario" as const };
      
      expect(ticketService.canUserManageTicket(user)).toBe(false);
    });
  });

  describe("getStatusTransitions", () => {
    it("deve retornar transições válidas para status novo", () => {
      const transitions = ticketService.getStatusTransitions("novo");
      expect(transitions).toContain("em_analise");
      expect(transitions).toContain("cancelado");
    });

    it("deve retornar transições válidas para status em_analise", () => {
      const transitions = ticketService.getStatusTransitions("em_analise");
      expect(transitions).toContain("aguardando_cliente");
      expect(transitions).toContain("aguardando_terceiro");
      expect(transitions).toContain("resolvido");
      expect(transitions).toContain("cancelado");
    });

    it("deve retornar transições válidas para status aguardando_cliente", () => {
      const transitions = ticketService.getStatusTransitions("aguardando_cliente");
      expect(transitions).toContain("em_analise");
      expect(transitions).toContain("resolvido");
      expect(transitions).toContain("cancelado");
    });

    it("deve retornar array vazio para status resolvido", () => {
      const transitions = ticketService.getStatusTransitions("resolvido");
      expect(transitions).toEqual([]);
    });

    it("deve retornar array vazio para status cancelado", () => {
      const transitions = ticketService.getStatusTransitions("cancelado");
      expect(transitions).toEqual([]);
    });
  });

  describe("formatTicketNumber", () => {
    it("deve formatar número do ticket corretamente", () => {
      expect(ticketService.formatTicketNumber(1)).toBe("TKT-000001");
      expect(ticketService.formatTicketNumber(123)).toBe("TKT-000123");
      expect(ticketService.formatTicketNumber(999999)).toBe("TKT-999999");
    });
  });

  describe("isTicketOverdue", () => {
    it("deve retornar true para ticket em atraso", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      expect(ticketService.isTicketOverdue(pastDate, "em_analise")).toBe(true);
    });

    it("deve retornar false para ticket no prazo", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      expect(ticketService.isTicketOverdue(futureDate, "em_analise")).toBe(false);
    });

    it("deve retornar false para ticket resolvido mesmo com prazo vencido", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      expect(ticketService.isTicketOverdue(pastDate, "resolvido")).toBe(false);
    });

    it("deve retornar false para ticket cancelado mesmo com prazo vencido", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      expect(ticketService.isTicketOverdue(pastDate, "cancelado")).toBe(false);
    });
  });
});
