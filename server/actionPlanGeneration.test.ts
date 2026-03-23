import { describe, it, expect, vi, beforeEach } from "vitest";
import * as aiService from "./aiService";

describe("Action Plan Generation", () => {
  describe("extractComplianceGaps", () => {
    it("should extract gaps below maturity threshold", () => {
      const responses = [
        { questionId: 1, questionText: "Q1", domain: "D1", answer: 2, maturityLevel: 2, riskLevel: "alto" },
        { questionId: 2, questionText: "Q2", domain: "D1", answer: 4, maturityLevel: 4, riskLevel: "baixo" },
        { questionId: 3, questionText: "Q3", domain: "D2", answer: 1, maturityLevel: 1, riskLevel: "critico" },
      ];

      const gaps = aiService.extractComplianceGaps(responses, 3);
      
      expect(gaps).toHaveLength(2);
      expect(gaps[0].questionId).toBe(1);
      expect(gaps[1].questionId).toBe(3);
    });

    it("should return empty array when no gaps below threshold", () => {
      const responses = [
        { questionId: 1, questionText: "Q1", domain: "D1", answer: 4, maturityLevel: 4, riskLevel: "baixo" },
        { questionId: 2, questionText: "Q2", domain: "D1", answer: 5, maturityLevel: 5, riskLevel: "baixo" },
      ];

      const gaps = aiService.extractComplianceGaps(responses, 3);
      
      expect(gaps).toHaveLength(0);
    });

    it("should handle empty responses array", () => {
      const gaps = aiService.extractComplianceGaps([], 3);
      expect(gaps).toHaveLength(0);
    });
  });

  describe("extractDueDiligenceGaps", () => {
    it("should extract risks above threshold", () => {
      const responses = [
        { questionId: 1, questionText: "Q1", category: "C1", answer: "Sim", riskScore: 15 },
        { questionId: 2, questionText: "Q2", category: "C1", answer: "Não", riskScore: 5 },
        { questionId: 3, questionText: "Q3", category: "C2", answer: "Parcial", riskScore: 20 },
      ];

      const gaps = aiService.extractDueDiligenceGaps(responses, 10);
      
      expect(gaps).toHaveLength(2);
      expect(gaps[0].questionId).toBe(1);
      expect(gaps[1].questionId).toBe(3);
    });

    it("should return empty array when no risks above threshold", () => {
      const responses = [
        { questionId: 1, questionText: "Q1", category: "C1", answer: "Sim", riskScore: 3 },
        { questionId: 2, questionText: "Q2", category: "C1", answer: "Não", riskScore: 5 },
      ];

      const gaps = aiService.extractDueDiligenceGaps(responses, 10);
      
      expect(gaps).toHaveLength(0);
    });
  });

  describe("generateComplianceActionPlan", () => {
    it("should exist and be callable", () => {
      expect(typeof aiService.generateComplianceActionPlan).toBe("function");
    });
  });

  describe("generateDueDiligenceActionPlan", () => {
    it("should exist and be callable", () => {
      expect(typeof aiService.generateDueDiligenceActionPlan).toBe("function");
    });
  });

  describe("refineActionPlan", () => {
    it("should exist and be callable", () => {
      expect(typeof aiService.refineActionPlan).toBe("function");
    });
  });
});

describe("AI Service Integration", () => {
  describe("chatWithAI", () => {
    it("should handle chat messages", async () => {
      const messages: aiService.ChatMessage[] = [
        { role: "user", content: "Olá" },
      ];

      const context: aiService.ChatContext = {
        module: "general",
      };

      // This test verifies the function exists and has correct signature
      expect(typeof aiService.chatWithAI).toBe("function");
    });
  });

  describe("generateComplianceAnalysis", () => {
    it("should exist and be callable", () => {
      expect(typeof aiService.generateComplianceAnalysis).toBe("function");
    });
  });

  describe("generateThirdPartyAnalysis", () => {
    it("should exist and be callable", () => {
      expect(typeof aiService.generateThirdPartyAnalysis).toBe("function");
    });
  });
});
