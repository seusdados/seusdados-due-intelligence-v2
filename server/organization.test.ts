import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@seusdados.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin_global",
    organizationId: null,
    phone: null,
    isActive: true,
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

function createConsultorContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "consultor-user",
    email: "consultor@seusdados.com",
    name: "Consultor User",
    loginMethod: "manus",
    role: "consultor",
    organizationId: null,
    phone: null,
    isActive: true,
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

function createClienteContext(organizationId: number): TrpcContext {
  const user: AuthenticatedUser = {
    id: 3,
    openId: "cliente-user",
    email: "cliente@empresa.com",
    name: "Cliente User",
    loginMethod: "manus",
    role: "usuario",
    organizationId,
    phone: null,
    isActive: true,
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

describe("Organization Router", () => {
  it("admin can list all organizations", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    
    // Should not throw
    const result = await caller.organization.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("consultor can list all organizations", async () => {
    const ctx = createConsultorContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.organization.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("cliente can only see their organization", async () => {
    const ctx = createClienteContext(1);
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.organization.list();
    expect(Array.isArray(result)).toBe(true);
    // Cliente should only see organizations they belong to
    result.forEach(org => {
      expect(org.id).toBe(1);
    });
  });
});

describe("Auth Router", () => {
  it("me returns current user for authenticated users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.role).toBe("admin_global");
  });

  it("logout clears session", async () => {
    let cookieCleared = false;
    const ctx = createAdminContext();
    ctx.res.clearCookie = () => { cookieCleared = true; };
    
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    
    expect(result.success).toBe(true);
    expect(cookieCleared).toBe(true);
  });
});

describe("Admin Router", () => {
  it("admin can get global stats", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.admin.getGlobalStats();
    expect(result).toHaveProperty("organizations");
    expect(result).toHaveProperty("users");
    expect(result).toHaveProperty("complianceAssessments");
    expect(result).toHaveProperty("thirdPartyAssessments");
  });

  it("non-admin cannot access admin stats", async () => {
    const ctx = createClienteContext(1);
    const caller = appRouter.createCaller(ctx);
    
    await expect(caller.admin.getGlobalStats()).rejects.toThrow();
  });
});
