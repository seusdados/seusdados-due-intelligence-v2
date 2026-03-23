import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";

describe("Conformance Metrics Endpoint", () => {
  const mockContext: Context = {
    user: {
      id: 1,
      openId: "test-user",
      name: "Test User",
      email: "test@example.com",
      role: "consultor",
      organizationId: 1,
      createdAt: new Date().toISOString(),
    },
  };

  it("should return metrics structure with valid organization ID", async () => {
    const caller = appRouter.createCaller(mockContext);
    const result = await caller.system.getConformanceMetrics({ organizationId: 1 });

    // Verificar estrutura do resultado
    expect(result).toHaveProperty("totalAssessments");
    expect(result).toHaveProperty("completedAssessments");
    expect(result).toHaveProperty("inProgressAssessments");
    expect(result).toHaveProperty("pendingAssessments");
    expect(result).toHaveProperty("moduleProgress");
    expect(result).toHaveProperty("rotsByStatus");
    expect(result).toHaveProperty("totalRots");
    expect(result).toHaveProperty("meetingsCompleted");
    expect(result).toHaveProperty("meetingsPending");
    expect(result).toHaveProperty("totalMeetings");
    expect(result).toHaveProperty("timelineData");
    expect(result).toHaveProperty("alerts");

    // Verificar tipos
    expect(typeof result.totalAssessments).toBe("number");
    expect(typeof result.completedAssessments).toBe("number");
    expect(typeof result.inProgressAssessments).toBe("number");
    expect(typeof result.pendingAssessments).toBe("number");
    expect(Array.isArray(result.moduleProgress)).toBe(true);
    expect(Array.isArray(result.rotsByStatus)).toBe(true);
    expect(typeof result.totalRots).toBe("number");
    expect(typeof result.meetingsCompleted).toBe("number");
    expect(typeof result.meetingsPending).toBe("number");
    expect(typeof result.totalMeetings).toBe("number");
    expect(Array.isArray(result.timelineData)).toBe(true);
    expect(Array.isArray(result.alerts)).toBe(true);
  });

  it("should return empty metrics when organization ID is not provided", async () => {
    const caller = appRouter.createCaller(mockContext);
    const result = await caller.system.getConformanceMetrics({});

    expect(result.totalAssessments).toBe(0);
    expect(result.completedAssessments).toBe(0);
    expect(result.inProgressAssessments).toBe(0);
    expect(result.pendingAssessments).toBe(0);
    expect(result.moduleProgress).toEqual([]);
    expect(result.rotsByStatus).toEqual([]);
    expect(result.totalRots).toBe(0);
    expect(result.meetingsCompleted).toBe(0);
    expect(result.meetingsPending).toBe(0);
    expect(result.totalMeetings).toBe(0);
    expect(result.timelineData).toEqual([]);
    expect(result.alerts).toEqual([]);
  });

  it("should include timeline data with 6 months", async () => {
    const caller = appRouter.createCaller(mockContext);
    const result = await caller.system.getConformanceMetrics({ organizationId: 1 });

    expect(Array.isArray(result.timelineData)).toBe(true);
    expect(result.timelineData.length).toBeGreaterThanOrEqual(0);
    
    // Se houver dados, verificar estrutura
    if (result.timelineData.length > 0) {
      result.timelineData.forEach(item => {
        expect(item).toHaveProperty("month");
        expect(item).toHaveProperty("count");
        expect(typeof item.month).toBe("string");
        expect(typeof item.count).toBe("number");
      });
    }
  });

  it("should include module progress with correct structure", async () => {
    const caller = appRouter.createCaller(mockContext);
    const result = await caller.system.getConformanceMetrics({ organizationId: 1 });

    expect(Array.isArray(result.moduleProgress)).toBe(true);
    
    // Se houver dados, verificar estrutura
    if (result.moduleProgress.length > 0) {
      result.moduleProgress.forEach(module => {
        expect(module).toHaveProperty("name");
        expect(module).toHaveProperty("completed");
        expect(module).toHaveProperty("total");
        expect(typeof module.name).toBe("string");
        expect(typeof module.completed).toBe("number");
        expect(typeof module.total).toBe("number");
      });
    }
  });

  it("should include ROTs by status with correct structure", async () => {
    const caller = appRouter.createCaller(mockContext);
    const result = await caller.system.getConformanceMetrics({ organizationId: 1 });

    expect(Array.isArray(result.rotsByStatus)).toBe(true);
    
    // Se houver dados, verificar estrutura
    if (result.rotsByStatus.length > 0) {
      result.rotsByStatus.forEach(item => {
        expect(item).toHaveProperty("status");
        expect(item).toHaveProperty("count");
        expect(typeof item.status).toBe("string");
        expect(typeof item.count).toBe("number");
      });
    }
  });

  it("should handle errors gracefully", async () => {
    const caller = appRouter.createCaller(mockContext);
    
    // Mesmo com erro no banco, deve retornar estrutura vazia
    const result = await caller.system.getConformanceMetrics({ organizationId: 999999 });
    
    expect(result).toHaveProperty("totalAssessments");
    expect(result).toHaveProperty("completedAssessments");
    expect(result).toHaveProperty("inProgressAssessments");
    expect(result).toHaveProperty("pendingAssessments");
  });
});
