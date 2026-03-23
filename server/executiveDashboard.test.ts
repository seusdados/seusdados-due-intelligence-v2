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

describe("Executive Dashboard Router", () => {
  it("admin can get executive dashboard data for any organization", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    
    // Should not throw - getData returns null if no data, but should not error
    const result = await caller.executiveDashboard.getData({ organizationId: 1 });
    
    // Result can be null if organization doesn't exist or has no data
    if (result) {
      expect(result).toHaveProperty("kpis");
      expect(result).toHaveProperty("riskDistribution");
      expect(result).toHaveProperty("criticalRiskThirdParties");
      expect(result).toHaveProperty("pendingActions");
      expect(result).toHaveProperty("maturityEvolution");
      
      // Verify KPIs structure
      expect(result.kpis).toHaveProperty("totalComplianceAssessments");
      expect(result.kpis).toHaveProperty("completedComplianceAssessments");
      expect(result.kpis).toHaveProperty("totalThirdPartyAssessments");
      expect(result.kpis).toHaveProperty("completedThirdPartyAssessments");
      expect(result.kpis).toHaveProperty("totalThirdParties");
      expect(result.kpis).toHaveProperty("pendingLinks");
    }
  });

  it("consultor can get executive dashboard data", async () => {
    const ctx = createConsultorContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.executiveDashboard.getData({ organizationId: 1 });
    
    // Should not throw
    if (result) {
      expect(result).toHaveProperty("kpis");
    }
  });

  it("cliente can only get dashboard data for their own organization", async () => {
    const ctx = createClienteContext(1);
    const caller = appRouter.createCaller(ctx);
    
    // Should be able to access their own organization
    const result = await caller.executiveDashboard.getData({ organizationId: 1 });
    // Result can be null but should not throw
    
    // Should return null for other organizations
    const otherResult = await caller.executiveDashboard.getData({ organizationId: 999 });
    expect(otherResult).toBeNull();
  });

  it("admin can get recent assessments", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.executiveDashboard.getRecentAssessments({ 
      organizationId: 1, 
      limit: 5 
    });
    
    expect(result).toHaveProperty("compliance");
    expect(result).toHaveProperty("thirdParty");
    expect(Array.isArray(result.compliance)).toBe(true);
    expect(Array.isArray(result.thirdParty)).toBe(true);
  });

  it("cliente can only get recent assessments for their own organization", async () => {
    const ctx = createClienteContext(1);
    const caller = appRouter.createCaller(ctx);
    
    // Should be able to access their own organization
    const result = await caller.executiveDashboard.getRecentAssessments({ organizationId: 1 });
    expect(result).toHaveProperty("compliance");
    expect(result).toHaveProperty("thirdParty");
    
    // Should return empty arrays for other organizations
    const otherResult = await caller.executiveDashboard.getRecentAssessments({ organizationId: 999 });
    expect(otherResult.compliance).toEqual([]);
    expect(otherResult.thirdParty).toEqual([]);
  });
});
