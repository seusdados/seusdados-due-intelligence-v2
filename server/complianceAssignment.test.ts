import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(role: string, userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `User ${userId}`,
    loginMethod: "manus",
    role,
    createdAt: new Date().toISOString(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
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

describe("compliance.getMyAssignedDomains", () => {
  it("retorna isAdmin=true para admin_global", async () => {
    const ctx = createContext("admin_global", 1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.compliance.getMyAssignedDomains({
      assessmentId: 999999, // ID inexistente - deve retornar vazio mas com isAdmin
    });

    expect(result).toHaveProperty("isAdmin", true);
    expect(result).toHaveProperty("canRespond", false);
    expect(result).toHaveProperty("assignedDomainIds");
    expect(Array.isArray(result.assignedDomainIds)).toBe(true);
  });

  it("retorna isAdmin=true para consultor", async () => {
    const ctx = createContext("consultor", 2);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.compliance.getMyAssignedDomains({
      assessmentId: 999999,
    });

    expect(result.isAdmin).toBe(true);
    expect(result.canRespond).toBe(false);
  });

  it("retorna isAdmin=false para user comum sem atribuições", async () => {
    const ctx = createContext("user", 100);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.compliance.getMyAssignedDomains({
      assessmentId: 999999,
    });

    expect(result.isAdmin).toBe(false);
    expect(result.canRespond).toBe(false);
    expect(result.assignedDomainIds).toHaveLength(0);
  });
});

describe("compliance.assignDomain", () => {
  it("rejeita atribuição por user comum", async () => {
    const ctx = createContext("user", 100);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.compliance.assignDomain({
        assessmentId: 1,
        domainId: 1,
        userId: 50,
      })
    ).rejects.toThrow(/administradores/i);
  });

  it("rejeita auto-atribuição do admin", async () => {
    const ctx = createContext("admin_global", 1);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.compliance.assignDomain({
        assessmentId: 1,
        domainId: 1,
        userId: 1, // mesmo ID do admin
      })
    ).rejects.toThrow(/administrador.*respondente/i);
  });
});

describe("compliance.saveResponseWithAccess", () => {
  it("rejeita resposta de user sem atribuição ao domínio", async () => {
    const ctx = createContext("user", 100);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.compliance.saveResponseWithAccess({
        assessmentId: 999999,
        domainId: 1,
        questionId: "q1",
        selectedLevel: 3,
        notes: "Teste",
      })
    ).rejects.toThrow(/atribuído/i);
  });
});

describe("compliance.getResponsesFiltered", () => {
  it("retorna array vazio para user sem atribuições", async () => {
    const ctx = createContext("user", 100);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.compliance.getResponsesFiltered({
      assessmentId: 999999,
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it("retorna respostas para admin", async () => {
    const ctx = createContext("admin_global", 1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.compliance.getResponsesFiltered({
      assessmentId: 999999,
    });

    // Admin pode ver tudo, mas com ID inexistente não há respostas
    expect(Array.isArray(result)).toBe(true);
  });
});
