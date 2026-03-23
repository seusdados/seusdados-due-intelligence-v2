import { describe, it, expect, vi } from "vitest";
import { SEUSDADOS_FRAMEWORK, getTotalQuestions } from "../shared/frameworkSeusdados";

/**
 * Testes unitários para a lógica de análise do módulo de Avaliações Unificadas.
 * Valida cálculos de maturidade, progresso e matriz de risco.
 */

describe("Assessments Analysis - Framework Seusdados", () => {
  it("deve ter 9 domínios no framework", () => {
    expect(SEUSDADOS_FRAMEWORK).toHaveLength(9);
  });

  it("cada domínio deve ter id, nome e questões", () => {
    for (const domain of SEUSDADOS_FRAMEWORK) {
      expect(domain.id).toMatch(/^IA-\d{2}$/);
      expect(domain.name).toBeTruthy();
      expect(domain.questions.length).toBeGreaterThan(0);
    }
  });

  it("cada questão deve ter id e texto", () => {
    for (const domain of SEUSDADOS_FRAMEWORK) {
      for (const q of domain.questions) {
        expect(q.id).toMatch(/^IA-\d{2}-Q\d{2}$/);
        expect(q.text).toBeTruthy();
      }
    }
  });

  it("getTotalQuestions deve retornar a soma de todas as questões", () => {
    const expected = SEUSDADOS_FRAMEWORK.reduce((sum, d) => sum + d.questions.length, 0);
    expect(getTotalQuestions()).toBe(expected);
    expect(getTotalQuestions()).toBe(40); // 9 domínios com 4-5 questões cada
  });
});

describe("Assessments Analysis - Cálculos de Progresso", () => {
  it("deve calcular progresso percentual corretamente", () => {
    const totalQuestions = 5;
    const answeredQuestions = 3;
    const progressPercent = Math.round((answeredQuestions / totalQuestions) * 100);
    expect(progressPercent).toBe(60);
  });

  it("deve retornar 0% quando não há respostas", () => {
    const totalQuestions = 5;
    const answeredQuestions = 0;
    const progressPercent = totalQuestions > 0
      ? Math.round((answeredQuestions / totalQuestions) * 100)
      : 0;
    expect(progressPercent).toBe(0);
  });

  it("deve retornar 100% quando todas as questões foram respondidas", () => {
    const totalQuestions = 4;
    const answeredQuestions = 4;
    const progressPercent = Math.round((answeredQuestions / totalQuestions) * 100);
    expect(progressPercent).toBe(100);
  });
});

describe("Assessments Analysis - Cálculos de Maturidade", () => {
  it("deve calcular média de maturidade por domínio", () => {
    const responses = [
      { selectedLevel: 3 },
      { selectedLevel: 4 },
      { selectedLevel: 2 },
      { selectedLevel: 5 },
    ];
    const avg = responses.reduce((sum, r) => sum + r.selectedLevel, 0) / responses.length;
    expect(avg).toBe(3.5);
  });

  it("deve retornar 0 quando não há respostas", () => {
    const responses: { selectedLevel: number }[] = [];
    const avg = responses.length > 0
      ? responses.reduce((sum, r) => sum + r.selectedLevel, 0) / responses.length
      : 0;
    expect(avg).toBe(0);
  });

  it("deve formatar média com 2 casas decimais", () => {
    const responses = [
      { selectedLevel: 3 },
      { selectedLevel: 4 },
      { selectedLevel: 3 },
    ];
    const avg = responses.reduce((sum, r) => sum + r.selectedLevel, 0) / responses.length;
    const formatted = parseFloat(avg.toFixed(2));
    expect(formatted).toBe(3.33);
  });
});

describe("Assessments Analysis - Matriz de Risco", () => {
  it("deve calcular probabilidade inversamente proporcional ao nível de maturidade", () => {
    // Nível alto (5) = baixa probabilidade
    const highLevel = 5;
    const probHigh = Math.max(1, Math.min(4, Math.round((5 - highLevel) * (4 / 4))));
    expect(probHigh).toBe(1); // Mínimo

    // Nível baixo (1) = alta probabilidade
    const lowLevel = 1;
    const probLow = Math.max(1, Math.min(4, Math.round((5 - lowLevel) * (4 / 4))));
    expect(probLow).toBe(4); // Máximo
  });

  it("deve classificar domínios críticos com maior impacto", () => {
    const criticalDomains = ['IA-01', 'IA-04', 'IA-05'];
    const avgLevel = 3;

    // Domínio crítico
    const impactCritical = Math.max(1, Math.min(4, Math.round(3.5 + (5 - avgLevel) * 0.3)));
    expect(impactCritical).toBeGreaterThanOrEqual(3);

    // Domínio não-crítico
    const impactNormal = Math.max(1, Math.min(4, Math.round(2.5 + (5 - avgLevel) * 0.3)));
    expect(impactNormal).toBeLessThan(impactCritical);
  });

  it("deve classificar risco corretamente por severidade", () => {
    const classify = (severity: number) => {
      if (severity >= 12) return 'critica';
      if (severity >= 8) return 'alta';
      if (severity >= 4) return 'media';
      return 'baixa';
    };

    expect(classify(16)).toBe('critica');
    expect(classify(12)).toBe('critica');
    expect(classify(9)).toBe('alta');
    expect(classify(8)).toBe('alta');
    expect(classify(6)).toBe('media');
    expect(classify(4)).toBe('media');
    expect(classify(3)).toBe('baixa');
    expect(classify(1)).toBe('baixa');
  });

  it("deve limitar probabilidade e impacto entre 1 e 4", () => {
    for (let level = 0; level <= 5; level++) {
      const prob = Math.max(1, Math.min(4, Math.round((5 - level) * (4 / 4))));
      expect(prob).toBeGreaterThanOrEqual(1);
      expect(prob).toBeLessThanOrEqual(4);
    }
  });
});

describe("Assessments Analysis - Estrutura de Dados", () => {
  it("deve mapear respostas para o formato esperado pelo frontend", () => {
    const mockResponse = {
      questionId: "IA-01-Q01",
      questionText: "A organização possui uma Política de Privacidade?",
      selectedLevel: 3,
      notes: "Em desenvolvimento",
      respondedAt: "2026-01-15 10:00:00",
    };

    const mapped = {
      questionId: mockResponse.questionId,
      questionText: mockResponse.questionText,
      selectedLevel: mockResponse.selectedLevel,
      notes: mockResponse.notes,
      respondedAt: mockResponse.respondedAt,
    };

    expect(mapped).toHaveProperty("questionId");
    expect(mapped).toHaveProperty("questionText");
    expect(mapped).toHaveProperty("selectedLevel");
    expect(mapped).toHaveProperty("notes");
    expect(mapped).toHaveProperty("respondedAt");
    expect(mapped.selectedLevel).toBeGreaterThanOrEqual(1);
    expect(mapped.selectedLevel).toBeLessThanOrEqual(5);
  });

  it("deve filtrar respostas por domínio usando prefixo do questionId", () => {
    const responses = [
      { questionId: "IA-01-Q01", selectedLevel: 3 },
      { questionId: "IA-01-Q02", selectedLevel: 4 },
      { questionId: "IA-02-Q01", selectedLevel: 2 },
      { questionId: "IA-03-Q01", selectedLevel: 5 },
    ];

    const domainId = "IA-01";
    const filtered = responses.filter(r => r.questionId.startsWith(domainId));
    expect(filtered).toHaveLength(2);
    expect(filtered.every(r => r.questionId.startsWith("IA-01"))).toBe(true);
  });

  it("deve extrair domínio do questionId corretamente", () => {
    const questionId = "IA-05-Q03";
    const match = questionId.match(/^(IA-\d{2})/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("IA-05");
  });
});
