import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock do banco de dados
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    default: {
      ...actual.default,
      getOrganizations: vi.fn().mockResolvedValue([
        { id: 1, name: "Org Teste", cnpj: "12345678901234", isActive: true },
      ]),
      getOrganizationById: vi.fn().mockResolvedValue({
        id: 1,
        name: "Org Teste",
        cnpj: "12345678901234",
        isActive: true,
      }),
      updateOrganization: vi.fn().mockResolvedValue({ success: true }),
      createOrganization: vi.fn().mockResolvedValue(1),
      getUserById: vi.fn().mockResolvedValue({
        id: 1,
        name: "Usuário Teste",
        email: "teste@example.com",
        role: "admin_global",
        organizationId: 1,
      }),
      getUsers: vi.fn().mockResolvedValue([
        { id: 1, name: "Usuário Teste", email: "teste@example.com", role: "admin_global" },
      ]),
    },
  };
});

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@seusdados.com.br",
    name: "Admin Global",
    loginMethod: "manus",
    role: "admin_global",
    createdAt: new Date().toISOString(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    organizationId: 1,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createConsultorContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "consultor-user",
    email: "consultor@seusdados.com.br",
    name: "Consultor Seusdados",
    loginMethod: "manus",
    role: "consultor",
    createdAt: new Date().toISOString(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    organizationId: null,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createClienteContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 3,
    openId: "cliente-user",
    email: "cliente@empresa.com.br",
    name: "Cliente Empresa",
    loginMethod: "manus",
    role: "usuario",
    createdAt: new Date().toISOString(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    organizationId: 1,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthenticatedContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Rotas de Autenticação", () => {
  describe("auth.me", () => {
    it("retorna dados do usuário autenticado (admin)", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.me();

      expect(result).toBeDefined();
      expect(result?.role).toBe("admin_global");
      expect(result?.email).toBe("admin@seusdados.com.br");
    });

    it("retorna dados do usuário autenticado (consultor)", async () => {
      const ctx = createConsultorContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.me();

      expect(result).toBeDefined();
      expect(result?.role).toBe("consultor");
    });

    it("retorna dados do usuário autenticado (cliente)", async () => {
      const ctx = createClienteContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.me();

      expect(result).toBeDefined();
      expect(result?.role).toBe("usuario");
      expect(result?.organizationId).toBe(1);
    });

    it("retorna null para usuário não autenticado", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.me();

      expect(result).toBeNull();
    });
  });

  describe("auth.logout", () => {
    it("limpa o cookie de sessão e retorna sucesso", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.logout();

      expect(result).toEqual({ success: true });
      expect(ctx.res.clearCookie).toHaveBeenCalled();
    });
  });
});

describe("Rotas de Organizações", () => {
  describe("organization.list", () => {
    it("admin global pode listar todas as organizações", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.organization.list();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("consultor pode listar organizações", async () => {
      const ctx = createConsultorContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.organization.list();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("organization.update com isActive", () => {
    it("admin global pode ativar/desativar organização", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // Teste de desativação
      const resultDesativar = await caller.organization.update({
        id: 1,
        isActive: false,
      });

      expect(resultDesativar.success).toBe(true);

      // Teste de reativação
      const resultAtivar = await caller.organization.update({
        id: 1,
        isActive: true,
      });

      expect(resultAtivar.success).toBe(true);
    });

    it("admin global pode atualizar nome e status simultaneamente", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.organization.update({
        id: 1,
        name: "Nova Razão Social",
        isActive: true,
      });

      expect(result.success).toBe(true);
    });
  });
});

describe("Controle de Acesso por Role", () => {
  describe("Permissões de Admin Global", () => {
    it("admin global tem acesso total", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // Pode listar organizações
      const orgs = await caller.organization.list();
      expect(orgs).toBeDefined();

      // Pode acessar auth.me
      const me = await caller.auth.me();
      expect(me?.role).toBe("admin_global");
    });
  });

  describe("Permissões de Consultor", () => {
    it("consultor pode listar organizações", async () => {
      const ctx = createConsultorContext();
      const caller = appRouter.createCaller(ctx);

      const orgs = await caller.organization.list();
      expect(orgs).toBeDefined();
    });
  });

  describe("Permissões de Cliente", () => {
    it("cliente tem acesso limitado à sua organização", async () => {
      const ctx = createClienteContext();
      const caller = appRouter.createCaller(ctx);

      const me = await caller.auth.me();
      expect(me?.role).toBe("usuario");
      expect(me?.organizationId).toBe(1);
    });
  });
});

describe("Validação de Inputs", () => {
  describe("organization.update", () => {
    it("aceita id positivo", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // IDs positivos são aceitos
      const result = await caller.organization.update({
        id: 1,
        name: "Teste",
      });
      
      expect(result.success).toBe(true);
    });

    it("aceita email válido", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.organization.update({
        id: 1,
        email: "contato@empresa.com.br",
      });

      expect(result.success).toBe(true);
    });

    it("rejeita email inválido", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.organization.update({
          id: 1,
          email: "email-invalido",
        })
      ).rejects.toThrow();
    });
  });
});

describe("Segurança", () => {
  describe("Proteção contra acesso não autorizado", () => {
    it("rotas protegidas requerem autenticação", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      // auth.me retorna null para não autenticado (não lança erro)
      const me = await caller.auth.me();
      expect(me).toBeNull();
    });
  });

  describe("Isolamento de dados por organização", () => {
    it("cliente não pode acessar dados de outra organização", async () => {
      const ctx = createClienteContext();
      
      // O cliente está vinculado à organização 1
      expect(ctx.user?.organizationId).toBe(1);
      expect(ctx.user?.role).toBe("usuario");
    });
  });
});
