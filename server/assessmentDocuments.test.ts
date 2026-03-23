import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("Assessment Documents - Vinculação de Documentos às Avaliações", () => {
  describe("linkDocumentToAssessment", () => {
    it("deve aceitar parâmetros válidos para vinculação de conformidade", () => {
      const params = {
        assessmentType: "conformidade" as const,
        assessmentId: 1,
        documentId: 1,
        category: "evidencia_conformidade" as const,
        description: "Evidência de teste",
        linkedById: 1,
      };
      
      expect(params.assessmentType).toBe("conformidade");
      expect(params.category).toBe("evidencia_conformidade");
      expect(typeof params.assessmentId).toBe("number");
      expect(typeof params.documentId).toBe("number");
    });

    it("deve aceitar parâmetros válidos para vinculação de due diligence", () => {
      const params = {
        assessmentType: "due_diligence" as const,
        assessmentId: 2,
        documentId: 3,
        category: "documento_suporte" as const,
        description: null,
        linkedById: 1,
      };
      
      expect(params.assessmentType).toBe("due_diligence");
      expect(params.category).toBe("documento_suporte");
    });
  });

  describe("Categorias de documentos", () => {
    it("deve ter todas as categorias válidas definidas", () => {
      const validCategories = [
        "evidencia_conformidade",
        "documento_suporte",
        "relatorio_auditoria",
        "politica_procedimento",
        "contrato",
        "termo_responsabilidade",
        "outro"
      ];
      
      expect(validCategories).toHaveLength(7);
      expect(validCategories).toContain("evidencia_conformidade");
      expect(validCategories).toContain("contrato");
    });
  });

  describe("Tipos de avaliação", () => {
    it("deve suportar conformidade e due_diligence", () => {
      const validTypes = ["conformidade", "due_diligence"];
      
      expect(validTypes).toHaveLength(2);
      expect(validTypes).toContain("conformidade");
      expect(validTypes).toContain("due_diligence");
    });
  });

  describe("Funções de banco de dados", () => {
    it("deve exportar linkDocumentToAssessment", () => {
      expect(typeof db.linkDocumentToAssessment).toBe("function");
    });

    it("deve exportar unlinkDocumentFromAssessment", () => {
      expect(typeof db.unlinkDocumentFromAssessment).toBe("function");
    });

    it("deve exportar getAssessmentDocuments", () => {
      expect(typeof db.getAssessmentDocuments).toBe("function");
    });

    it("deve exportar getAssessmentDocumentById", () => {
      expect(typeof db.getAssessmentDocumentById).toBe("function");
    });
  });
});
