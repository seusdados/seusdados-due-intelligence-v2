import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockContext(role: string, userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test-${role}@seusdados.com`,
    name: `Test ${role}`,
    loginMethod: "manus",
    role: role as any,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSignedIn: new Date().toISOString(),
    organizationId: 1,
    avatarUrl: null,
    phone: null,
    isActive: true,
    temporaryPassword: null,
    passwordExpiresAt: null,
    mustChangePassword: false,
    passwordHash: null,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Controle de acesso - Criacao de usuarios", () => {
  it("usuario nao autenticado nao pode criar usuarios", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.user.create({
        name: "Teste",
        email: "teste@exemplo.com",
        role: "usuario",
        organizationId: 1,
      })
    ).rejects.toThrow();
  });

  it("perfil 'usuario' nao pode criar usuarios", async () => {
    const ctx = createMockContext("usuario", 100);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.user.create({
        name: "Teste",
        email: "teste-block@exemplo.com",
        role: "usuario",
        organizationId: 1,
      })
    ).rejects.toThrow(/equipe interna|permiss/i);
  });

  it("perfil 'sponsor' nao pode criar usuarios", async () => {
    const ctx = createMockContext("sponsor", 101);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.user.create({
        name: "Teste",
        email: "teste-sponsor@exemplo.com",
        role: "usuario",
        organizationId: 1,
      })
    ).rejects.toThrow(/equipe interna|permiss/i);
  });

  it("perfil 'terceiro' nao pode criar usuarios", async () => {
    const ctx = createMockContext("terceiro", 102);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.user.create({
        name: "Teste",
        email: "teste-terceiro@exemplo.com",
        role: "usuario",
        organizationId: 1,
      })
    ).rejects.toThrow(/equipe interna|permiss/i);
  });

  it("perfil 'dpo_interno' nao pode criar usuarios", async () => {
    const ctx = createMockContext("dpo_interno", 103);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.user.create({
        name: "Teste",
        email: "teste-dpo@exemplo.com",
        role: "usuario",
        organizationId: 1,
      })
    ).rejects.toThrow(/equipe interna|permiss/i);
  });

  it("perfil 'comite' nao pode criar usuarios", async () => {
    const ctx = createMockContext("comite", 104);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.user.create({
        name: "Teste",
        email: "teste-comite@exemplo.com",
        role: "usuario",
        organizationId: 1,
      })
    ).rejects.toThrow(/equipe interna|permiss/i);
  });

  // Testes de controle granular: apenas admin_global pode criar admin_global
  it("perfil 'consultor' nao pode criar admin_global", async () => {
    const ctx = createMockContext("consultor", 200);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.user.create({
        name: "Teste Admin",
        email: "teste-admin-by-consultor@exemplo.com",
        role: "admin_global",
        organizationId: null,
      })
    ).rejects.toThrow(/Administrador Global/i);
  });

  it("perfil 'pmo' nao pode criar admin_global", async () => {
    const ctx = createMockContext("pmo", 201);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.user.create({
        name: "Teste Admin",
        email: "teste-admin-by-pmo@exemplo.com",
        role: "admin_global",
        organizationId: null,
      })
    ).rejects.toThrow(/Administrador Global/i);
  });
});

describe("Controle de acesso - Mensagens de erro em portugues", () => {
  it("mensagem de erro para usuario nao autenticado esta em portugues", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.user.create({
        name: "Teste",
        email: "teste@exemplo.com",
        role: "usuario",
        organizationId: 1,
      });
      expect.fail("Deveria ter lancado erro");
    } catch (error: any) {
      // A mensagem deve estar em portugues (sem palavras em ingles como "permission", "login", "required")
      expect(error.message).not.toContain("permission");
      expect(error.message).not.toContain("Please login");
    }
  });

  it("mensagem de erro para perfil sem permissao esta em portugues", async () => {
    const ctx = createMockContext("usuario", 300);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.user.create({
        name: "Teste",
        email: "teste-msg@exemplo.com",
        role: "usuario",
        organizationId: 1,
      });
      expect.fail("Deveria ter lancado erro");
    } catch (error: any) {
      expect(error.message).toContain("equipe interna");
    }
  });
});
