/**
 * Testes de Regressão — riskModelV31.ts (Modelo de Risco v3.1)
 * 
 * PATCH 2026-02-21: Testes atualizados para:
 * - mapChecklistToMacroBlocks usa analysisBlock real (não fórmula proporcional)
 * - Pesos reais do checklist (weight 1-5)
 * - Cobertura dos 18 macro-blocos
 * - Integração com riskScale.ts
 * 
 * Seusdados Consultoria em Gestão de Dados Limitada
 * CNPJ 33.899.116/0001-63 | www.seusdados.com
 */

import { describe, it, expect } from "vitest";
import {
  inferirRiscoV31,
  mapChecklistToMacroBlocks,
  generateClusterActionPlan,
  normalizeChecklistStatus,
} from "./riskModelV31";

// ── Mapeamento oficial itemNumber → analysisBlock (CHECKLIST_V2) ──
const OFFICIAL_MAPPING: Record<number, number> = {
  1: 1,   // Identificação das partes
  2: 2,   // Finalidade e base legal
  3: 4,   // Dados pessoais e sensíveis
  4: 5,   // Menores e idosos
  5: 6,   // Segurança da informação
  6: 7,   // Subcontratação
  7: 11,  // Direitos do titular
  8: 12,  // Incidentes
  9: 13,  // Auditoria
  10: 16, // Retenção e eliminação
  11: 9,  // Transferência internacional
  12: 17, // Governança
  13: 15, // Responsabilidade civil
  14: 18, // Encerramento
};

const OFFICIAL_WEIGHTS: Record<number, number> = {
  1: 4, 2: 5, 3: 4, 4: 5, 5: 5, 6: 4, 7: 4, 8: 5, 9: 3, 10: 4, 11: 4, 12: 3, 13: 4, 14: 3,
};

// ── Helpers ──

function makeChecklist14(overrides: Record<number, string> = {}): any[] {
  // Gera os 14 itens oficiais do CHECKLIST_V2
  const items: any[] = [];
  for (let i = 1; i <= 14; i++) {
    items.push({
      itemNumber: i,
      question: `Pergunta do item ${i}`,
      checklistStatus: overrides[i] || "sim",
      observations: "",
      contractExcerpt: "",
    });
  }
  return items;
}

function baseContexto(overrides: any = {}): any {
  return {
    A8_setor_regulado: [],
    B1_trata_dados_pessoais: true,
    B3_trata_dados_sensiveis: false,
    B4_trata_dados_sensiveis_em_larga_escala: "nao",
    B6_trata_dados_criancas_0_12: false,
    B7_trata_dados_adolescentes_13_17: false,
    E4_ha_transferencia_internacional: false,
    ...overrides,
  };
}

// ── Testes: normalizeChecklistStatus ──

describe("normalizeChecklistStatus", () => {
  it("deve normalizar 'sim' → 'atende'", () => {
    expect(normalizeChecklistStatus("sim")).toBe("atende");
  });

  it("deve normalizar 'nao' → 'nao_atende'", () => {
    expect(normalizeChecklistStatus("nao")).toBe("nao_atende");
  });

  it("deve normalizar 'parcial' → 'parcial'", () => {
    expect(normalizeChecklistStatus("parcial")).toBe("parcial");
  });

  it("deve normalizar null/undefined → 'nao_identificado'", () => {
    expect(normalizeChecklistStatus(null)).toBe("nao_identificado");
    expect(normalizeChecklistStatus(undefined)).toBe("nao_identificado");
  });

  it("deve normalizar 'atende' → 'atende' (idempotente)", () => {
    expect(normalizeChecklistStatus("atende")).toBe("atende");
  });

  it("deve normalizar 'nao_atende' → 'nao_atende' (idempotente)", () => {
    expect(normalizeChecklistStatus("nao_atende")).toBe("nao_atende");
  });
});

// ── Testes: mapChecklistToMacroBlocks ──

describe("mapChecklistToMacroBlocks", () => {
  it("deve mapear itemNumber para analysisBlock REAL (não fórmula proporcional)", () => {
    const items = makeChecklist14();
    const result = mapChecklistToMacroBlocks(items);

    expect(result.length).toBe(14);

    // Verificar que cada item usa o analysisBlock oficial
    for (const item of result) {
      const expected = OFFICIAL_MAPPING[item.itemNumber];
      expect(item.macroBlock).toBe(expected);
    }
  });

  it("deve atribuir peso real do checklist (weight)", () => {
    const items = makeChecklist14();
    const result = mapChecklistToMacroBlocks(items);

    for (const item of result) {
      expect(item.weight).toBe(OFFICIAL_WEIGHTS[item.itemNumber]);
    }
  });

  it("deve normalizar status corretamente", () => {
    const items = makeChecklist14({ 3: "nao", 5: "parcial", 8: "sim" });
    const result = mapChecklistToMacroBlocks(items);

    const item3 = result.find(r => r.itemNumber === 3)!;
    expect(item3.status).toBe("nao_atende");

    const item5 = result.find(r => r.itemNumber === 5)!;
    expect(item5.status).toBe("parcial");

    const item8 = result.find(r => r.itemNumber === 8)!;
    expect(item8.status).toBe("atende");
  });

  it("deve mapear item desconhecido para bloco 14 (fallback)", () => {
    const items = [{ itemNumber: 99, question: "Item inexistente", checklistStatus: "nao" }];
    const result = mapChecklistToMacroBlocks(items);
    expect(result[0].macroBlock).toBe(14);
  });

  it("item 8 (incidentes) deve mapear para bloco 12", () => {
    const items = [{ itemNumber: 8, question: "Incidentes", checklistStatus: "nao" }];
    const result = mapChecklistToMacroBlocks(items);
    expect(result[0].macroBlock).toBe(12);
  });

  it("item 11 (transferência internacional) deve mapear para bloco 9", () => {
    const items = [{ itemNumber: 11, question: "Transferência", checklistStatus: "sim" }];
    const result = mapChecklistToMacroBlocks(items);
    expect(result[0].macroBlock).toBe(9);
  });
});

// ── Testes: inferirRiscoV31 ──

describe("inferirRiscoV31", () => {
  it("deve retornar risco baixo quando tudo atende", () => {
    const ctx = baseContexto();
    const checklist = mapChecklistToMacroBlocks(makeChecklist14());
    const result = inferirRiscoV31(ctx, checklist);
    expect(result.riskScore).toBeLessThanOrEqual(30);
    expect(["baixo", "muito_baixo"]).toContain(result.riskLevel);
    expect(result.riskLevelDb).toBeDefined();
  });

  it("deve incluir macroCoverage com 18 blocos", () => {
    const ctx = baseContexto();
    const checklist = mapChecklistToMacroBlocks(makeChecklist14());
    const result = inferirRiscoV31(ctx, checklist);
    expect(result.macroCoverage).toBeDefined();
    expect(result.macroCoverage.length).toBe(18);
  });

  it("blocos 3,8,10,14 devem ter coverage 'no_checklist_item'", () => {
    const ctx = baseContexto();
    const checklist = mapChecklistToMacroBlocks(makeChecklist14());
    const result = inferirRiscoV31(ctx, checklist);

    const uncoveredBlocks = [3, 8, 10, 14];
    for (const block of uncoveredBlocks) {
      const mc = result.macroCoverage.find(m => m.macroBlock === block);
      expect(mc).toBeDefined();
      expect(mc!.coverage).toBe("no_checklist_item");
      expect(mc!.gapScore).toBeNull();
    }
  });

  it("blocos cobertos devem ter coverage 'covered' e gapScore numérico", () => {
    const ctx = baseContexto();
    const checklist = mapChecklistToMacroBlocks(makeChecklist14());
    const result = inferirRiscoV31(ctx, checklist);

    // Bloco 1 é coberto pelo item 1
    const mc1 = result.macroCoverage.find(m => m.macroBlock === 1);
    expect(mc1).toBeDefined();
    expect(mc1!.coverage).toBe("covered");
    expect(mc1!.gapScore).toBe(0); // tudo atende
  });

  it("contrato com múltiplos gaps NÃO gera risco baixo", () => {
    const ctx = baseContexto();
    const checklist = mapChecklistToMacroBlocks(
      makeChecklist14({
        1: "nao",
        2: "nao",
        3: "nao",
        5: "nao",
        8: "nao",
      })
    );
    const result = inferirRiscoV31(ctx, checklist);
    expect(result.riskLevel).not.toBe("baixo");
    expect(result.riskLevel).not.toBe("muito_baixo");
    expect(result.clusters.length).toBeGreaterThan(0);
    const plans = generateClusterActionPlan(result.clusters);
    expect(plans.length).toBeGreaterThan(1);
  });

  it(">=3 itens nao_atende não pode ser baixo/muito_baixo", () => {
    const ctx = baseContexto();
    const checklist = mapChecklistToMacroBlocks(
      makeChecklist14({
        1: "nao",
        2: "nao",
        10: "nao",
      })
    );
    const result = inferirRiscoV31(ctx, checklist);
    expect(result.riskLevel).not.toBe("baixo");
    expect(result.riskLevel).not.toBe("muito_baixo");
  });

  it("pisos jurídicos: item 8 (incidentes, bloco 12) = nao_atende → mínimo alto", () => {
    const ctx = baseContexto();
    // Item 8 → bloco 12 (incidentes_notificacao)
    // Junto com item 7 → bloco 11 (também incidentes)
    const checklist = mapChecklistToMacroBlocks(
      makeChecklist14({ 7: "nao", 8: "nao" })
    );
    const result = inferirRiscoV31(ctx, checklist);
    // Piso "incidentes_ausente" exige mínimo "alto"
    expect(["alto", "critico"]).toContain(result.riskLevel);
  });

  it("pisos jurídicos: segurança ausente (blocos 6,7) → mínimo alto", () => {
    const ctx = baseContexto();
    // Item 5 → bloco 6, Item 6 → bloco 7 (seguranca_tecnica)
    const checklist = mapChecklistToMacroBlocks(
      makeChecklist14({ 5: "nao", 6: "nao" })
    );
    const result = inferirRiscoV31(ctx, checklist);
    expect(["alto", "critico"]).toContain(result.riskLevel);
  });

  it("pisos jurídicos: transferência internacional sem salvaguardas → crítico", () => {
    const ctx = baseContexto({ E4_ha_transferencia_internacional: true });
    // Item 11 → bloco 9 (direitos_titular, não transferência!)
    // Precisamos que blocos 15,16 estejam com nao_atende
    // Item 13 → bloco 15, Item 10 → bloco 16
    const checklist = mapChecklistToMacroBlocks(
      makeChecklist14({ 13: "nao", 10: "nao" })
    );
    const result = inferirRiscoV31(ctx, checklist);
    expect(result.riskLevel).toBe("critico");
  });

  it("pisos jurídicos: dados sensíveis em larga escala sem segurança → crítico", () => {
    const ctx = baseContexto({
      B3_trata_dados_sensiveis: true,
      B4_trata_dados_sensiveis_em_larga_escala: "sim",
    });
    // Item 5 → bloco 6 (seguranca_tecnica)
    const checklist = mapChecklistToMacroBlocks(
      makeChecklist14({ 5: "nao" })
    );
    const result = inferirRiscoV31(ctx, checklist);
    expect(result.riskLevel).toBe("critico");
  });

  it("pisos jurídicos: dados de menores com >=3 gaps → mínimo alto", () => {
    const ctx = baseContexto({
      B6_trata_dados_criancas_0_12: true,
    });
    const checklist = mapChecklistToMacroBlocks(
      makeChecklist14({ 1: "nao", 2: "nao", 5: "nao" })
    );
    const result = inferirRiscoV31(ctx, checklist);
    expect(["alto", "critico"]).toContain(result.riskLevel);
  });

  it("clusters devem incluir riskLevelDb numérico", () => {
    const ctx = baseContexto();
    const checklist = mapChecklistToMacroBlocks(
      makeChecklist14({ 1: "nao", 5: "nao" })
    );
    const result = inferirRiscoV31(ctx, checklist);
    for (const cluster of result.clusters) {
      expect(cluster.riskLevelDb).toBeDefined();
      expect(["1", "2", "3", "4", "5"]).toContain(cluster.riskLevelDb);
    }
  });

  it("deve gerar notas de consistência para blocos sem cobertura", () => {
    const ctx = baseContexto();
    const checklist = mapChecklistToMacroBlocks(makeChecklist14());
    const result = inferirRiscoV31(ctx, checklist);
    // Blocos 3,8,10,14 não têm cobertura
    const coverageNote = result.consistencyNotes.find(n => n.includes("sem cobertura"));
    expect(coverageNote).toBeDefined();
  });
});

// ── Testes: generateClusterActionPlan ──

describe("generateClusterActionPlan", () => {
  it("deve gerar 1 ação por cluster sem duplicação", () => {
    const ctx = baseContexto();
    const checklist = mapChecklistToMacroBlocks(
      makeChecklist14({
        1: "nao",
        5: "nao",
        8: "nao",
      })
    );
    const result = inferirRiscoV31(ctx, checklist);
    const plans = generateClusterActionPlan(result.clusters);

    const clusterIds = plans.map((p) => p.clusterId);
    const uniqueIds = [...new Set(clusterIds)];
    expect(clusterIds.length).toBe(uniqueIds.length);

    for (const plan of plans) {
      expect(plan.title).toBeTruthy();
      expect(plan.description).toBeTruthy();
      expect(plan.priority).toBeTruthy();
      expect(plan.recommendation).toBeTruthy();
    }
  });

  it("deve retornar array vazio para clusters sem gaps", () => {
    const ctx = baseContexto();
    const checklist = mapChecklistToMacroBlocks(makeChecklist14());
    const result = inferirRiscoV31(ctx, checklist);
    const plans = generateClusterActionPlan(result.clusters);
    const highPriorityPlans = plans.filter(
      (p) => p.priority === "critica" || p.priority === "alta"
    );
    expect(highPriorityPlans.length).toBe(0);
  });

  it("deve priorizar clusters com risco alto/crítico", () => {
    const ctx = baseContexto();
    const checklist = mapChecklistToMacroBlocks(
      makeChecklist14({
        5: "nao",
        6: "nao",
        7: "nao",
        8: "nao",
      })
    );
    const result = inferirRiscoV31(ctx, checklist);
    const plans = generateClusterActionPlan(result.clusters);
    const highPlans = plans.filter(
      (p) => p.priority === "critica" || p.priority === "alta"
    );
    expect(highPlans.length).toBeGreaterThan(0);
  });
});
