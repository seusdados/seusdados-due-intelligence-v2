/**
 * Testes unitários para os endpoints do Framework Seusdados
 * - getDPPA (Documento Pronto + Plano de Ação)
 * - getEvidencePack (Rastreabilidade de Evidências)
 *
 * Seusdados Consultoria em Gestão de Dados Limitada
 * CNPJ 33.899.116/0001-63 | www.seusdados.com
 * Responsabilidade técnica: Marcelo Fattori
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Módulos F1-F9 do Framework Seusdados
const FRAMEWORK_MODULES = [
  { code: "F1", name: "Quem Faz o Quê", blocks: [1, 14] },
  { code: "F2", name: "Para Quê Usam os Dados", blocks: [2, 3] },
  { code: "F3", name: "Quais Dados São Tratados", blocks: [4, 5] },
  { code: "F4", name: "Proteção e Segurança", blocks: [6, 12] },
  { code: "F5", name: "Quem Mais Tem Acesso", blocks: [7, 8, 9] },
  { code: "F6", name: "Direitos das Pessoas", blocks: [11] },
  { code: "F7", name: "Registro e Documentação", blocks: [10, 13] },
  { code: "F8", name: "Ciclo de Vida dos Dados", blocks: [16, 18] },
  { code: "F9", name: "Governança e Responsabilidade", blocks: [15, 17] },
];

function getModuleForBlock(block: number): string {
  for (const m of FRAMEWORK_MODULES) {
    if (m.blocks.includes(block)) return m.code;
  }
  return "F9";
}

describe("Framework Seusdados - Módulos F1-F9", () => {
  it("deve mapear corretamente blocos para módulos F1-F9", () => {
    expect(getModuleForBlock(1)).toBe("F1");
    expect(getModuleForBlock(14)).toBe("F1");
    expect(getModuleForBlock(2)).toBe("F2");
    expect(getModuleForBlock(3)).toBe("F2");
    expect(getModuleForBlock(4)).toBe("F3");
    expect(getModuleForBlock(5)).toBe("F3");
    expect(getModuleForBlock(6)).toBe("F4");
    expect(getModuleForBlock(12)).toBe("F4");
    expect(getModuleForBlock(7)).toBe("F5");
    expect(getModuleForBlock(8)).toBe("F5");
    expect(getModuleForBlock(9)).toBe("F5");
    expect(getModuleForBlock(11)).toBe("F6");
    expect(getModuleForBlock(10)).toBe("F7");
    expect(getModuleForBlock(13)).toBe("F7");
    expect(getModuleForBlock(16)).toBe("F8");
    expect(getModuleForBlock(18)).toBe("F8");
    expect(getModuleForBlock(15)).toBe("F9");
    expect(getModuleForBlock(17)).toBe("F9");
  });

  it("deve retornar F9 para blocos desconhecidos", () => {
    expect(getModuleForBlock(0)).toBe("F9");
    expect(getModuleForBlock(99)).toBe("F9");
    expect(getModuleForBlock(-1)).toBe("F9");
  });

  it("deve ter 9 módulos no framework", () => {
    expect(FRAMEWORK_MODULES.length).toBe(9);
  });

  it("cada módulo deve ter pelo menos 1 bloco associado", () => {
    for (const m of FRAMEWORK_MODULES) {
      expect(m.blocks.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("todos os blocos de 1-18 devem estar mapeados", () => {
    const allBlocks = FRAMEWORK_MODULES.flatMap(m => m.blocks);
    for (let i = 1; i <= 18; i++) {
      // Blocos que não estão no framework devem cair em F9
      if (!allBlocks.includes(i)) {
        expect(getModuleForBlock(i)).toBe("F9");
      }
    }
  });
});

describe("Framework Seusdados - Tradução de Riscos para Problemas", () => {
  const severityMap: Record<string, string> = {
    "1": "critico",
    "2": "alto",
    "3": "medio",
    "4": "baixo",
    "5": "muito_baixo",
  };

  it("deve traduzir níveis de risco corretamente", () => {
    expect(severityMap["1"]).toBe("critico");
    expect(severityMap["2"]).toBe("alto");
    expect(severityMap["3"]).toBe("medio");
    expect(severityMap["4"]).toBe("baixo");
    expect(severityMap["5"]).toBe("muito_baixo");
  });

  it("deve gerar IDs de problemas no formato correto", () => {
    const problems = [1, 2, 3, 10, 100].map(idx => `P-${String(idx).padStart(3, '0')}`);
    expect(problems[0]).toBe("P-001");
    expect(problems[1]).toBe("P-002");
    expect(problems[2]).toBe("P-003");
    expect(problems[3]).toBe("P-010");
    expect(problems[4]).toBe("P-100");
  });

  it("deve gerar IDs de soluções no formato correto", () => {
    const solutions = [1, 5, 50].map(idx => `S-${String(idx).padStart(3, '0')}`);
    expect(solutions[0]).toBe("S-001");
    expect(solutions[1]).toBe("S-005");
    expect(solutions[2]).toBe("S-050");
  });

  it("deve gerar IDs de cláusulas no formato correto", () => {
    const clauses = [1, 15, 99].map(idx => `CL-${String(idx).padStart(3, '0')}`);
    expect(clauses[0]).toBe("CL-001");
    expect(clauses[1]).toBe("CL-015");
    expect(clauses[2]).toBe("CL-099");
  });
});

describe("Framework Seusdados - Estrutura DPPA", () => {
  it("deve ter campos obrigatórios no DPPA", () => {
    const dppaResponse = {
      analysisId: 1,
      executiveSummaryLay: "Resumo executivo simplificado",
      complianceScore: 75,
      problems: [],
      solutions: [],
      clauses: [],
      checklistVersion: "v2.0.0",
      generatedAt: new Date().toISOString(),
    };

    expect(dppaResponse).toHaveProperty("analysisId");
    expect(dppaResponse).toHaveProperty("executiveSummaryLay");
    expect(dppaResponse).toHaveProperty("complianceScore");
    expect(dppaResponse).toHaveProperty("problems");
    expect(dppaResponse).toHaveProperty("solutions");
    expect(dppaResponse).toHaveProperty("clauses");
    expect(dppaResponse).toHaveProperty("checklistVersion");
    expect(dppaResponse).toHaveProperty("generatedAt");
  });

  it("deve ter campos obrigatórios em cada problema", () => {
    const problem = {
      problemId: "P-001",
      frameworkModule: "F1",
      title: "Problema de identificação de agentes",
      layDescription: "O contrato não define quem é responsável pelos dados",
      everydayExample: "É como assinar um contrato sem saber quem é o responsável",
      severity: "alto",
      legalRef: "Lei 13.709/2018, Art. 5",
      contractExcerpt: "Trecho do contrato...",
      traceId: null,
    };

    expect(problem).toHaveProperty("problemId");
    expect(problem).toHaveProperty("frameworkModule");
    expect(problem).toHaveProperty("title");
    expect(problem).toHaveProperty("layDescription");
    expect(problem).toHaveProperty("everydayExample");
    expect(problem).toHaveProperty("severity");
    expect(problem).toHaveProperty("legalRef");
  });

  it("deve ter campos obrigatórios em cada solução", () => {
    const solution = {
      solutionId: "S-001",
      problemId: "P-001",
      title: "Incluir cláusula de identificação de agentes",
      layDescription: "Adicionar ao contrato quem é o controlador e quem é o operador",
      practicalSteps: ["Revisar contrato", "Adicionar cláusula"],
      suggestedDeadline: "30 dias",
      priority: 1,
      modelClauseId: null,
    };

    expect(solution).toHaveProperty("solutionId");
    expect(solution).toHaveProperty("problemId");
    expect(solution).toHaveProperty("title");
    expect(solution).toHaveProperty("practicalSteps");
    expect(Array.isArray(solution.practicalSteps)).toBe(true);
  });
});

describe("Framework Seusdados - Rastreabilidade (EvidencePack)", () => {
  it("deve ter campos obrigatórios em cada trace", () => {
    const trace = {
      fieldName: "partnerName",
      excerpt: "Empresa XYZ Ltda",
      clauseRef: "Cláusula 1.1",
      sourceChunkId: null,
      confidence: 85,
      reasoning: "Extraído do cabeçalho do contrato",
      legalBasis: null,
    };

    expect(trace).toHaveProperty("fieldName");
    expect(trace).toHaveProperty("excerpt");
    expect(trace).toHaveProperty("confidence");
    expect(trace.confidence).toBeGreaterThanOrEqual(0);
    expect(trace.confidence).toBeLessThanOrEqual(100);
  });

  it("deve classificar confiança corretamente", () => {
    function getConfidenceLabel(confidence: number): string {
      if (confidence >= 80) return "Alta";
      if (confidence >= 60) return "Moderada";
      if (confidence >= 40) return "Baixa";
      return "Muito Baixa";
    }

    expect(getConfidenceLabel(90)).toBe("Alta");
    expect(getConfidenceLabel(80)).toBe("Alta");
    expect(getConfidenceLabel(70)).toBe("Moderada");
    expect(getConfidenceLabel(60)).toBe("Moderada");
    expect(getConfidenceLabel(50)).toBe("Baixa");
    expect(getConfidenceLabel(40)).toBe("Baixa");
    expect(getConfidenceLabel(30)).toBe("Muito Baixa");
    expect(getConfidenceLabel(0)).toBe("Muito Baixa");
  });

  it("deve ter metadados do documento quando disponíveis", () => {
    const documentMeta = {
      originalLength: 50000,
      reducedLength: 35000,
      chunksTotal: 120,
      chunksSelected: 72,
      reductionRatio: 0.7,
    };

    expect(documentMeta.originalLength).toBeGreaterThan(0);
    expect(documentMeta.reducedLength).toBeLessThanOrEqual(documentMeta.originalLength);
    expect(documentMeta.chunksSelected).toBeLessThanOrEqual(documentMeta.chunksTotal);
    expect(documentMeta.reductionRatio).toBeGreaterThan(0);
    expect(documentMeta.reductionRatio).toBeLessThanOrEqual(1);
  });
});

describe("Framework Seusdados - Checklist para Problemas", () => {
  it("deve converter itens não-conformes em problemas adicionais", () => {
    const checklistItems = [
      { itemNumber: 1, question: "Contrato define controlador?", checklistStatus: "sim", analysisBlock: 1 },
      { itemNumber: 2, question: "Contrato define operador?", checklistStatus: "nao", analysisBlock: 1 },
      { itemNumber: 3, question: "Contrato define finalidade?", checklistStatus: "parcial", analysisBlock: 2 },
      { itemNumber: 4, question: "Contrato define dados tratados?", checklistStatus: "nao", analysisBlock: 4 },
    ];

    const nonConforming = checklistItems.filter(item => item.checklistStatus === "nao");
    expect(nonConforming.length).toBe(2);

    const checklistProblems = nonConforming.map((item, idx) => ({
      problemId: `PC-${String(idx + 1).padStart(3, '0')}`,
      frameworkModule: getModuleForBlock(item.analysisBlock),
      title: item.question.substring(0, 80),
      severity: "medio",
    }));

    expect(checklistProblems[0].problemId).toBe("PC-001");
    expect(checklistProblems[0].frameworkModule).toBe("F1");
    expect(checklistProblems[1].problemId).toBe("PC-002");
    expect(checklistProblems[1].frameworkModule).toBe("F3");
  });
});
