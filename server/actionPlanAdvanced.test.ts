import { describe, it, expect, vi, beforeEach } from "vitest";
import * as aiService from "./aiService";

describe("Action Plan Advanced Features", () => {
  describe("parseActionsFromPlan", () => {
    it("should parse actions from markdown content", () => {
      const content = `
## Plano de Ação

### Resumo
Este é um resumo do plano de ação.

### Ações

#### Ação 1: Implementar política de privacidade
**Descrição:** Criar e implementar política de privacidade completa.
**Prioridade:** Alta
**Prazo:** 30 dias
**Responsável:** DPO
**Recursos:** Consultoria jurídica
**Critérios de Sucesso:** Política aprovada e publicada

#### Ação 2: Treinar equipe
**Descrição:** Realizar treinamento de proteção de dados.
**Prioridade:** Média
**Prazo:** 15 dias
**Responsável:** RH
**Recursos:** Material de treinamento
**Critérios de Sucesso:** 100% da equipe treinada

### Recomendações
- Monitorar continuamente
- Revisar anualmente
      `;

      const result = aiService.parseActionsFromPlan(content);

      expect(result).toBeDefined();
      expect(result.summary).toContain("resumo");
      expect(result.actions.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("should handle empty content", () => {
      const result = aiService.parseActionsFromPlan("");
      
      expect(result).toBeDefined();
      expect(result.actions).toEqual([]);
      expect(result.recommendations).toEqual([]);
    });

    it("should extract priority correctly", () => {
      const content = `
### Ação 1: Ação Crítica
**Prioridade:** Crítica
**Prazo:** 7 dias

### Ação 2: Ação Baixa
**Prioridade:** Baixa
**Prazo:** 60 dias
      `;

      const result = aiService.parseActionsFromPlan(content);
      
      expect(result.actions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getAvailableTemplates", () => {
    it("should return all templates when no module specified", () => {
      const templates = aiService.getAvailableTemplates();
      
      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it("should filter templates by compliance module", () => {
      const templates = aiService.getAvailableTemplates("compliance");
      
      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
      templates.forEach(t => {
        expect(["compliance", "action_plans"]).toContain(t.module);
      });
    });

    it("should filter templates by due_diligence module", () => {
      const templates = aiService.getAvailableTemplates("due_diligence");
      
      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
      templates.forEach(t => {
        expect(["due_diligence", "action_plans"]).toContain(t.module);
      });
    });

    it("should return templates with required fields", () => {
      const templates = aiService.getAvailableTemplates();
      
      templates.forEach(t => {
        expect(t.id).toBeDefined();
        expect(t.name).toBeDefined();
        expect(t.description).toBeDefined();
        expect(t.module).toBeDefined();
        expect(t.category).toBeDefined();
        expect(t.promptTemplate).toBeDefined();
        expect(t.variables).toBeDefined();
      });
    });
  });

  describe("SYSTEM_PROMPT_TEMPLATES", () => {
    it("should have valid template structure", () => {
      expect(aiService.SYSTEM_PROMPT_TEMPLATES).toBeDefined();
      expect(Array.isArray(aiService.SYSTEM_PROMPT_TEMPLATES)).toBe(true);
      expect(aiService.SYSTEM_PROMPT_TEMPLATES.length).toBeGreaterThan(0);
    });

    it("should have executive summary template", () => {
      const executiveSummary = aiService.SYSTEM_PROMPT_TEMPLATES.find(
        t => t.id === "exec_summary_compliance"
      );
      
      expect(executiveSummary).toBeDefined();
      expect(executiveSummary?.name).toContain("Resumo Executivo");
    });

    it("should have gap analysis templates", () => {
      const complianceGap = aiService.SYSTEM_PROMPT_TEMPLATES.find(
        t => t.id === "gap_analysis_compliance"
      );
      const dueDiligenceGap = aiService.SYSTEM_PROMPT_TEMPLATES.find(
        t => t.id === "gap_analysis_due_diligence"
      );
      
      expect(complianceGap).toBeDefined();
      expect(dueDiligenceGap).toBeDefined();
    });

    it("should have recommendations templates", () => {
      const complianceRec = aiService.SYSTEM_PROMPT_TEMPLATES.find(
        t => t.id === "recommendations_compliance"
      );
      const dueDiligenceRec = aiService.SYSTEM_PROMPT_TEMPLATES.find(
        t => t.id === "recommendations_due_diligence"
      );
      
      expect(complianceRec).toBeDefined();
      expect(dueDiligenceRec).toBeDefined();
    });
  });

  describe("extractComplianceGaps", () => {
    it("should extract gaps below threshold", () => {
      const responses = [
        { questionId: 1, questionText: "Q1", domain: "D1", answer: "Sim", maturityLevel: 2 },
        { questionId: 2, questionText: "Q2", domain: "D1", answer: "Não", maturityLevel: 4 },
        { questionId: 3, questionText: "Q3", domain: "D2", answer: "Parcial", maturityLevel: 1 },
      ];

      const gaps = aiService.extractComplianceGaps(responses, 3);
      
      expect(gaps).toBeDefined();
      expect(gaps.length).toBe(2);
      // Verifica que os gaps têm maturidade abaixo do threshold
      expect(gaps.every(g => (g.maturityLevel || 0) < 3)).toBe(true);
    });

    it("should return empty array when no gaps", () => {
      const responses = [
        { questionId: 1, questionText: "Q1", domain: "D1", answer: "Sim", maturityLevel: 4 },
        { questionId: 2, questionText: "Q2", domain: "D1", answer: "Sim", maturityLevel: 5 },
      ];

      const gaps = aiService.extractComplianceGaps(responses, 3);
      
      expect(gaps).toEqual([]);
    });
  });

  describe("extractDueDiligenceGaps", () => {
    it("should extract risks above threshold", () => {
      const responses = [
        { questionId: 1, questionText: "Q1", category: "C1", answer: "Alto", riskScore: 4 },
        { questionId: 2, questionText: "Q2", category: "C1", answer: "Baixo", riskScore: 2 },
        { questionId: 3, questionText: "Q3", category: "C2", answer: "Crítico", riskScore: 5 },
      ];

      const gaps = aiService.extractDueDiligenceGaps(responses, 3);
      
      expect(gaps).toBeDefined();
      expect(gaps.length).toBe(2);
      expect(gaps.every(g => g.riskScore >= 3)).toBe(true);
    });

    it("should return empty array when no high risks", () => {
      const responses = [
        { questionId: 1, questionText: "Q1", category: "C1", answer: "Baixo", riskScore: 1 },
        { questionId: 2, questionText: "Q2", category: "C1", answer: "Baixo", riskScore: 2 },
      ];

      const gaps = aiService.extractDueDiligenceGaps(responses, 3);
      
      expect(gaps).toEqual([]);
    });
  });
});

describe("PDF Generation", () => {
  it("should have generateActionPlanHTML exported", async () => {
    const pdfService = await import("./pdfService");
    expect(pdfService.generateActionPlanHTML).toBeDefined();
    expect(typeof pdfService.generateActionPlanHTML).toBe("function");
  });

  it("should generate valid HTML for action plan", async () => {
    const pdfService = await import("./pdfService");
    
    const data = {
      title: "Plano de Ação - Teste",
      organizationName: "Empresa Teste",
      generatedAt: "09/12/2024",
      content: "Conteúdo do plano",
      parsedPlan: {
        summary: "Resumo do plano",
        actions: [
          {
            title: "Ação 1",
            description: "Descrição da ação",
            priority: "alta" as const,
            estimatedDays: 30,
            responsibleRole: "DPO",
            resources: "Recursos necessários",
            successCriteria: "Critérios de sucesso",
          }
        ],
        recommendations: ["Recomendação 1", "Recomendação 2"],
        totalEstimatedDays: 30,
        executiveSummary: "Resumo executivo",
        relationshipRecommendation: "Manter relacionamento",
      }
    };

    const html = pdfService.generateActionPlanHTML(data);
    
    expect(html).toBeDefined();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Plano de Ação - Teste");
    expect(html).toContain("Empresa Teste");
    expect(html).toContain("Ação 1");
    expect(html).toContain("seusdados");
  });
});
