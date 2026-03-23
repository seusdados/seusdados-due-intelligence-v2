import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";

describe("RIPD Admin Router", () => {
  let adminCaller: ReturnType<typeof appRouter.createCaller>;
  let userCaller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    // Admin context
    adminCaller = appRouter.createCaller({
      user: {
        id: 1,
        email: "admin@seusdados.com",
        organizationId: 1,
        role: "admin_global",
      },
      req: {} as any,
      res: {} as any,
    });

    // Regular user context (should be denied)
    userCaller = appRouter.createCaller({
      user: {
        id: 2,
        email: "user@example.com",
        organizationId: 1,
        role: "usuario",
      },
      req: {} as any,
      res: {} as any,
    });
  });

  describe("getStats", () => {
    it("deve retornar estatísticas consolidadas para admin", async () => {
      const stats = await adminCaller.ripdAdmin.getStats();

      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("avgScore");
      expect(stats).toHaveProperty("recentCount");
      expect(stats).toHaveProperty("organizationsCount");
      expect(stats).toHaveProperty("totalEvidences");
      expect(stats).toHaveProperty("byStatus");
      expect(stats).toHaveProperty("byRisk");
      expect(stats).toHaveProperty("bySource");

      // Verificar estrutura de byStatus
      expect(stats.byStatus).toHaveProperty("draft");
      expect(stats.byStatus).toHaveProperty("in_progress");
      expect(stats.byStatus).toHaveProperty("pending_review");
      expect(stats.byStatus).toHaveProperty("approved");
      expect(stats.byStatus).toHaveProperty("rejected");
      expect(stats.byStatus).toHaveProperty("archived");

      // Verificar estrutura de byRisk
      expect(stats.byRisk).toHaveProperty("baixo");
      expect(stats.byRisk).toHaveProperty("moderado");
      expect(stats.byRisk).toHaveProperty("alto");
      expect(stats.byRisk).toHaveProperty("critico");

      // Verificar estrutura de bySource
      expect(stats.bySource).toHaveProperty("manual");
      expect(stats.bySource).toHaveProperty("mapeamento");
      expect(stats.bySource).toHaveProperty("contrato");
      expect(stats.bySource).toHaveProperty("incidente");

      // Todos os valores devem ser números
      expect(typeof stats.total).toBe("number");
      expect(typeof stats.avgScore).toBe("number");
      expect(typeof stats.recentCount).toBe("number");
    });

    it("deve negar acesso para usuário comum", async () => {
      await expect(userCaller.ripdAdmin.getStats()).rejects.toThrow();
    });
  });

  describe("listAll", () => {
    it("deve retornar lista paginada para admin", async () => {
      const result = await adminCaller.ripdAdmin.listAll({
        page: 1,
        pageSize: 10,
      });

      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("page");
      expect(result).toHaveProperty("pageSize");
      expect(result).toHaveProperty("totalPages");
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it("deve aceitar filtros de status", async () => {
      const result = await adminCaller.ripdAdmin.listAll({
        status: "draft",
        page: 1,
        pageSize: 10,
      });

      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
    });

    it("deve aceitar filtros de risco", async () => {
      const result = await adminCaller.ripdAdmin.listAll({
        riskLevel: "alto",
        page: 1,
        pageSize: 10,
      });

      expect(result).toHaveProperty("items");
    });

    it("deve aceitar filtros de origem", async () => {
      const result = await adminCaller.ripdAdmin.listAll({
        sourceType: "mapeamento",
        page: 1,
        pageSize: 10,
      });

      expect(result).toHaveProperty("items");
    });

    it("deve aceitar busca por texto", async () => {
      const result = await adminCaller.ripdAdmin.listAll({
        search: "teste",
        page: 1,
        pageSize: 10,
      });

      expect(result).toHaveProperty("items");
    });

    it("deve negar acesso para usuário comum", async () => {
      await expect(
        userCaller.ripdAdmin.listAll({ page: 1, pageSize: 10 })
      ).rejects.toThrow();
    });
  });

  describe("getTimeline", () => {
    it("deve retornar timeline de criação para admin", async () => {
      const timeline = await adminCaller.ripdAdmin.getTimeline();

      expect(Array.isArray(timeline)).toBe(true);
    });

    it("deve negar acesso para usuário comum", async () => {
      await expect(userCaller.ripdAdmin.getTimeline()).rejects.toThrow();
    });
  });

  describe("getOrganizations", () => {
    it("deve retornar lista de organizações com RIPDs para admin", async () => {
      const orgs = await adminCaller.ripdAdmin.getOrganizations();

      expect(Array.isArray(orgs)).toBe(true);
    });

    it("deve negar acesso para usuário comum", async () => {
      await expect(userCaller.ripdAdmin.getOrganizations()).rejects.toThrow();
    });
  });

  describe("batchAction", () => {
    it("deve negar acesso para usuário comum", async () => {
      await expect(
        userCaller.ripdAdmin.batchAction({
          ids: [1],
          action: "approve",
        })
      ).rejects.toThrow();
    });

    it("deve aceitar ações válidas (approve, reject, archive, reopen, start_review)", async () => {
      const validActions = ["approve", "reject", "archive", "reopen", "start_review"] as const;
      for (const action of validActions) {
        // Não vai falhar por permissão, mas pode falhar se não houver IDs válidos
        // O importante é que não rejeite a validação do schema
        try {
          await adminCaller.ripdAdmin.batchAction({
            ids: [999999], // ID inexistente
            action,
          });
        } catch (e: any) {
          // Se falhar, não deve ser por validação do schema
          expect(e.code).not.toBe("BAD_REQUEST");
        }
      }
    });
  });
});
