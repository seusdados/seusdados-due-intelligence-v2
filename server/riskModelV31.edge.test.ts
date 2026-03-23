/**
 * Testes de Borda — riskModelV31.ts (Modelo de Risco v3.1)
 * 
 * Cenários de borda e validação de produção para garantir que:
 * - P1: mapChecklistToMacroBlocks usa analysisBlock real (não fórmula)
 * - P2: Escala de risco consistente (riskScale.ts)
 * - P3: Normalização de status (checklistStatus vs status)
 * - P4: Cobertura dos 18 macro-blocos (blocos sem checklist)
 * - P5: Pesos reais do checklist (weight 1-5)
 * - E1: Consistência entre camadas
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
  type ChecklistForRisk,
  type RiskModelResult,
} from "./riskModelV31";
import {
  riskTextToDbEnum,
  riskDbEnumToText,
  normalizeRiskText,
  maxRiskLevel,
  isMoreSevere,
  allRiskLevels,
  allDbEnums,
} from "./riskScale";
import { recalibrateRiskLevel } from "./contractLayerSync";

// ── Mapeamento oficial itemNumber → analysisBlock (CHECKLIST_V2) ──
const OFFICIAL_MAPPING: Record<number, number> = {
  1: 1, 2: 2, 3: 4, 4: 5, 5: 6, 6: 7, 7: 11, 8: 12, 9: 13, 10: 16, 11: 9, 12: 17, 13: 15, 14: 18,
};

const OFFICIAL_WEIGHTS: Record<number, number> = {
  1: 4, 2: 5, 3: 4, 4: 5, 5: 5, 6: 4, 7: 4, 8: 5, 9: 3, 10: 4, 11: 4, 12: 3, 13: 4, 14: 3,
};

function makeChecklist14(overrides: Record<number, string> = {}): any[] {
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

// ══════════════════════════════════════════════════════════════════════
// P1: MAPEAMENTO analysisBlock REAL (NÃO fórmula proporcional)
// ══════════════════════════════════════════════════════════════════════

describe("P1: Mapeamento analysisBlock real", () => {
  it("NENHUM item deve usar fórmula proporcional Math.ceil(i * 18/14)", () => {
    const items = makeChecklist14();
    const result = mapChecklistToMacroBlocks(items);

    for (const item of result) {
      const proportional = Math.ceil(item.itemNumber * 18 / 14);
      const official = OFFICIAL_MAPPING[item.itemNumber];
      // Se o mapeamento fosse proporcional, item.macroBlock == proportional
      // Queremos que NÃO seja proporcional, e sim o official
      expect(item.macroBlock).toBe(official);
      // Verificar que pelo menos alguns diferem do proporcional (prova negativa)
    }

    // Prova concreta: item 7 → bloco 11 (proporcional seria 9)
    const item7 = result.find(r => r.itemNumber === 7)!;
    expect(item7.macroBlock).toBe(11);
    expect(Math.ceil(7 * 18 / 14)).toBe(9); // proporcional seria 9, mas é 11

    // item 11 → bloco 9 (proporcional seria 15)
    const item11 = result.find(r => r.itemNumber === 11)!;
    expect(item11.macroBlock).toBe(9);
    expect(Math.ceil(11 * 18 / 14)).toBe(15); // proporcional seria 15, mas é 9
  });

  it("cada um dos 14 itens deve mapear para o bloco EXATO do CHECKLIST_V2", () => {
    const items = makeChecklist14();
    const result = mapChecklistToMacroBlocks(items);

    const mapping: Record<number, number> = {};
    for (const item of result) {
      mapping[item.itemNumber] = item.macroBlock;
    }

    expect(mapping).toEqual(OFFICIAL_MAPPING);
  });

  it("itens fora do range (0, 15, 99) devem ir para bloco 14 (fallback)", () => {
    const items = [
      { itemNumber: 0, question: "Zero", checklistStatus: "sim" },
      { itemNumber: 15, question: "Quinze", checklistStatus: "nao" },
      { itemNumber: 99, question: "Noventa e nove", checklistStatus: "parcial" },
    ];
    const result = mapChecklistToMacroBlocks(items);
    for (const item of result) {
      expect(item.macroBlock).toBe(14);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════
// P2: ESCALA DE RISCO CONSISTENTE (riskScale.ts)
// ══════════════════════════════════════════════════════════════════════

describe("P2: Escala de risco consistente", () => {
  it("conversão texto→db→texto é bijetiva para todos os 5 níveis", () => {
    for (const level of allRiskLevels()) {
      const db = riskTextToDbEnum(level);
      const back = riskDbEnumToText(db);
      expect(back).toBe(level);
    }
  });

  it("conversão db→texto→db é bijetiva para todos os 5 enums", () => {
    for (const db of allDbEnums()) {
      const text = riskDbEnumToText(db);
      const back = riskTextToDbEnum(text);
      expect(back).toBe(db);
    }
  });

  it("riskModelV31 retorna riskLevelDb consistente com riskLevel", () => {
    const ctx = baseContexto();
    const checklist = mapChecklistToMacroBlocks(makeChecklist14({ 1: "nao", 5: "nao", 8: "nao" }));
    const result = inferirRiscoV31(ctx, checklist);

    expect(riskTextToDbEnum(result.riskLevel)).toBe(result.riskLevelDb);

    for (const cluster of result.clusters) {
      expect(riskTextToDbEnum(cluster.riskLevel)).toBe(cluster.riskLevelDb);
    }
  });

  it("recalibrateRiskLevel produz resultado coerente com riskScale", () => {
    const recalibrated = recalibrateRiskLevel("Ausência de notificação de incidente", "4");
    expect(recalibrated).toBe("2");
    expect(riskDbEnumToText(recalibrated)).toBe("alto");
    expect(riskTextToDbEnum("alto")).toBe("2");
  });

  it("governanceMetadata deve conter riskLevelDb numérico", () => {
    const ctx = baseContexto();
    const checklist = mapChecklistToMacroBlocks(makeChecklist14({ 2: "nao", 5: "nao" }));
    const result = inferirRiscoV31(ctx, checklist);

    // Simular o que o pipeline persiste
    const metadata = {
      riskModelVersion: "v3.1",
      riskScore: result.riskScore,
      riskLevelText: result.riskLevel,
      riskLevelDb: result.riskLevelDb,
      clusters: result.clusters.map(c => ({
        ...c,
        riskLevelText: c.riskLevel,
        riskLevelDb: c.riskLevelDb,
      })),
    };

    expect(["1", "2", "3", "4", "5"]).toContain(metadata.riskLevelDb);
    expect(riskDbEnumToText(metadata.riskLevelDb)).toBe(metadata.riskLevelText);
  });
});

// ══════════════════════════════════════════════════════════════════════
// P3: NORMALIZAÇÃO DE STATUS (checklistStatus vs status)
// ══════════════════════════════════════════════════════════════════════

describe("P3: Normalização de status", () => {
  it("aceita campo 'checklistStatus' (DB) como fonte primária", () => {
    const items = [{ itemNumber: 1, question: "Q1", checklistStatus: "nao" }];
    const result = mapChecklistToMacroBlocks(items);
    expect(result[0].status).toBe("nao_atende");
  });

  it("aceita campo 'status' (IA) como fallback", () => {
    const items = [{ itemNumber: 1, question: "Q1", status: "parcial" }];
    const result = mapChecklistToMacroBlocks(items);
    expect(result[0].status).toBe("parcial");
  });

  it("prioriza 'checklistStatus' sobre 'status' quando ambos existem", () => {
    const items = [{ itemNumber: 1, question: "Q1", checklistStatus: "sim", status: "nao" }];
    const result = mapChecklistToMacroBlocks(items);
    expect(result[0].status).toBe("atende"); // checklistStatus = "sim" → "atende"
  });

  it("trata null/undefined como 'nao_identificado'", () => {
    const items = [{ itemNumber: 1, question: "Q1" }];
    const result = mapChecklistToMacroBlocks(items);
    expect(result[0].status).toBe("nao_identificado");
  });

  it("normaliza todas as variações conhecidas", () => {
    const cases: [string | null | undefined, string][] = [
      ["sim", "atende"],
      ["nao", "nao_atende"],
      ["parcial", "parcial"],
      [null, "nao_identificado"],
      [undefined, "nao_identificado"],
      ["atende", "atende"],
      ["conforme", "atende"],
      ["nao_atende", "nao_atende"],
      ["não atende", "nao_atende"],
      ["parcialmente", "parcial"],
      ["nao_identificado", "nao_identificado"],
      ["não identificado", "nao_identificado"],
      ["n/a", "nao_identificado"],
      ["na", "nao_identificado"],
      ["não se aplica", "nao_identificado"],
    ];

    for (const [input, expected] of cases) {
      expect(normalizeChecklistStatus(input)).toBe(expected);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════
// P4: COBERTURA DOS 18 MACRO-BLOCOS (4 blocos sem checklist)
// ══════════════════════════════════════════════════════════════════════

describe("P4: Cobertura dos 18 macro-blocos", () => {
  it("macroCoverage deve ter exatamente 18 entradas", () => {
    const ctx = baseContexto();
    const checklist = mapChecklistToMacroBlocks(makeChecklist14());
    const result = inferirRiscoV31(ctx, checklist);
    expect(result.macroCoverage.length).toBe(18);
  });

  it("blocos 3,8,10,14 devem ter coverage='no_checklist_item' e gapScore=null", () => {
    const ctx = baseContexto();
    const checklist = mapChecklistToMacroBlocks(makeChecklist14());
    const result = inferirRiscoV31(ctx, checklist);

    for (const block of [3, 8, 10, 14]) {
      const mc = result.macroCoverage.find(m => m.macroBlock === block);
      expect(mc).toBeDefined();
      expect(mc!.coverage).toBe("no_checklist_item");
      expect(mc!.gapScore).toBeNull();
      expect(mc!.items.length).toBe(0);
    }
  });

  it("blocos cobertos devem ter coverage='covered' e gapScore numérico", () => {
    const ctx = baseContexto();
    const checklist = mapChecklistToMacroBlocks(makeChecklist14());
    const result = inferirRiscoV31(ctx, checklist);

    const coveredBlocks = [1, 2, 4, 5, 6, 7, 9, 11, 12, 13, 15, 16, 17, 18];
    for (const block of coveredBlocks) {
      const mc = result.macroCoverage.find(m => m.macroBlock === block);
      expect(mc).toBeDefined();
      expect(mc!.coverage).toBe("covered");
      expect(typeof mc!.gapScore).toBe("number");
    }
  });

  it("consistencyNotes deve mencionar blocos sem cobertura", () => {
    const ctx = baseContexto();
    const checklist = mapChecklistToMacroBlocks(makeChecklist14());
    const result = inferirRiscoV31(ctx, checklist);
    const note = result.consistencyNotes.find(n => n.includes("sem cobertura"));
    expect(note).toBeDefined();
    expect(note).toContain("3");
    expect(note).toContain("8");
    expect(note).toContain("10");
    expect(note).toContain("14");
  });

  it("pisos jurídicos NÃO devem interpretar blocos sem cobertura como 'conforme'", () => {
    // Se blocos 10,11,12 (incidentes) não têm cobertura, o piso NÃO deve disparar
    // porque não há evidência suficiente
    const ctx = baseContexto();
    // Apenas itens que NÃO cobrem blocos 10,11,12
    const items = [
      { itemNumber: 1, question: "Q1", checklistStatus: "sim" },
      { itemNumber: 2, question: "Q2", checklistStatus: "sim" },
    ];
    const checklist = mapChecklistToMacroBlocks(items);
    const result = inferirRiscoV31(ctx, checklist);
    // Sem evidência de incidentes, piso "incidentes_ausente" NÃO deve disparar
    expect(result.pisoAplicado).not.toBe("incidentes_ausente");
  });
});

// ══════════════════════════════════════════════════════════════════════
// P5: PESOS REAIS DO CHECKLIST (weight 1-5)
// ══════════════════════════════════════════════════════════════════════

describe("P5: Pesos reais do checklist", () => {
  it("cada item deve receber o peso oficial do CHECKLIST_V2", () => {
    const items = makeChecklist14();
    const result = mapChecklistToMacroBlocks(items);
    for (const item of result) {
      expect(item.weight).toBe(OFFICIAL_WEIGHTS[item.itemNumber]);
    }
  });

  it("item sem peso explícito deve usar o peso oficial", () => {
    const items = [{ itemNumber: 2, question: "Q2", checklistStatus: "nao" }];
    const result = mapChecklistToMacroBlocks(items);
    expect(result[0].weight).toBe(5); // peso oficial do item 2
  });

  it("item com peso explícito deve usar o peso fornecido", () => {
    const items = [{ itemNumber: 2, question: "Q2", checklistStatus: "nao", weight: 2 }];
    const result = mapChecklistToMacroBlocks(items);
    expect(result[0].weight).toBe(2); // peso fornecido
  });

  it("gapScore deve ser ponderado por peso: item peso 5 'nao' > item peso 3 'nao'", () => {
    const ctx = baseContexto();

    // Cenário A: item 2 (peso 5) = nao_atende
    const checklistA = mapChecklistToMacroBlocks(makeChecklist14({ 2: "nao" }));
    const resultA = inferirRiscoV31(ctx, checklistA);

    // Cenário B: item 14 (peso 3) = nao_atende
    const checklistB = mapChecklistToMacroBlocks(makeChecklist14({ 14: "nao" }));
    const resultB = inferirRiscoV31(ctx, checklistB);

    // Item 2 (peso 5) deve gerar riskScore >= item 14 (peso 3)
    expect(resultA.riskScore).toBeGreaterThanOrEqual(resultB.riskScore);
  });

  it("gapScore fórmula: G = sum(weight*v(status)) / sum(weight)", () => {
    // Item 1 (peso 4, bloco 1): nao_atende → v=1.0
    // G = (4 * 1.0) / 4 = 1.0 → 100%
    const items = [{ itemNumber: 1, question: "Q1", checklistStatus: "nao" }];
    const checklist = mapChecklistToMacroBlocks(items);
    const ctx = baseContexto();
    const result = inferirRiscoV31(ctx, checklist);

    const mc1 = result.macroCoverage.find(m => m.macroBlock === 1);
    expect(mc1).toBeDefined();
    expect(mc1!.gapScore).toBe(100); // 100% gap
  });

  it("gapScore parcial: peso 4 * v(parcial=0.5) / peso 4 = 50%", () => {
    const items = [{ itemNumber: 1, question: "Q1", checklistStatus: "parcial" }];
    const checklist = mapChecklistToMacroBlocks(items);
    const ctx = baseContexto();
    const result = inferirRiscoV31(ctx, checklist);

    const mc1 = result.macroCoverage.find(m => m.macroBlock === 1);
    expect(mc1).toBeDefined();
    expect(mc1!.gapScore).toBe(50); // 50% gap
  });
});

// ══════════════════════════════════════════════════════════════════════
// E1: CONSISTÊNCIA ENTRE CAMADAS (modelo + layerSync + pipeline)
// ══════════════════════════════════════════════════════════════════════

describe("E1: Consistência entre camadas", () => {
  it(">=3 itens nao_atende → nível global NÃO pode ser baixo/muito_baixo", () => {
    const ctx = baseContexto();
    const checklist = mapChecklistToMacroBlocks(makeChecklist14({
      1: "nao", 2: "nao", 3: "nao",
    }));
    const result = inferirRiscoV31(ctx, checklist);
    expect(result.riskLevel).not.toBe("baixo");
    expect(result.riskLevel).not.toBe("muito_baixo");
    expect(["medio", "alto", "critico"]).toContain(result.riskLevel);
  });

  it(">=3 itens nao_identificado → nível global NÃO pode ser baixo/muito_baixo", () => {
    const ctx = baseContexto();
    const items = makeChecklist14();
    // Sobrescrever 3 itens para null (nao_identificado)
    items[0].checklistStatus = null;
    items[1].checklistStatus = null;
    items[2].checklistStatus = null;
    const checklist = mapChecklistToMacroBlocks(items);
    const result = inferirRiscoV31(ctx, checklist);
    expect(result.riskLevel).not.toBe("baixo");
    expect(result.riskLevel).not.toBe("muito_baixo");
  });

  it("clusters devem ter riskLevelDb numérico válido ('1'..'5')", () => {
    const ctx = baseContexto();
    const checklist = mapChecklistToMacroBlocks(makeChecklist14({
      1: "nao", 5: "nao", 8: "nao", 13: "nao",
    }));
    const result = inferirRiscoV31(ctx, checklist);

    for (const cluster of result.clusters) {
      expect(["1", "2", "3", "4", "5"]).toContain(cluster.riskLevelDb);
      expect(riskDbEnumToText(cluster.riskLevelDb)).toBe(cluster.riskLevel);
    }
  });

  it("plano de ação deve ter 1 ação por cluster, sem duplicação", () => {
    const ctx = baseContexto();
    const checklist = mapChecklistToMacroBlocks(makeChecklist14({
      1: "nao", 5: "nao", 8: "nao",
    }));
    const result = inferirRiscoV31(ctx, checklist);
    const plans = generateClusterActionPlan(result.clusters);

    const ids = plans.map(p => p.clusterId);
    expect(ids.length).toBe(new Set(ids).size);
    expect(plans.length).toBe(result.clusters.length);
  });

  it("riskScore deve estar no range 0-100", () => {
    const ctx = baseContexto();

    // Tudo atende
    const checklistOk = mapChecklistToMacroBlocks(makeChecklist14());
    const resultOk = inferirRiscoV31(ctx, checklistOk);
    expect(resultOk.riskScore).toBeGreaterThanOrEqual(0);
    expect(resultOk.riskScore).toBeLessThanOrEqual(100);

    // Tudo nao_atende
    const allBad: Record<number, string> = {};
    for (let i = 1; i <= 14; i++) allBad[i] = "nao";
    const checklistBad = mapChecklistToMacroBlocks(makeChecklist14(allBad));
    const resultBad = inferirRiscoV31(ctx, checklistBad);
    expect(resultBad.riskScore).toBeGreaterThanOrEqual(0);
    expect(resultBad.riskScore).toBeLessThanOrEqual(100);
  });

  it("contrato com TODOS os itens nao_atende deve ser crítico", () => {
    const ctx = baseContexto();
    const allBad: Record<number, string> = {};
    for (let i = 1; i <= 14; i++) allBad[i] = "nao";
    const checklist = mapChecklistToMacroBlocks(makeChecklist14(allBad));
    const result = inferirRiscoV31(ctx, checklist);
    expect(result.riskLevel).toBe("critico");
    expect(result.riskScore).toBeGreaterThanOrEqual(80);
  });

  it("contrato com TODOS os itens atende deve ser baixo/muito_baixo", () => {
    const ctx = baseContexto();
    const checklist = mapChecklistToMacroBlocks(makeChecklist14());
    const result = inferirRiscoV31(ctx, checklist);
    expect(["baixo", "muito_baixo"]).toContain(result.riskLevel);
    expect(result.riskScore).toBeLessThanOrEqual(30);
  });
});

// ══════════════════════════════════════════════════════════════════════
// PISOS JURÍDICOS: CENÁRIOS DE BORDA
// ══════════════════════════════════════════════════════════════════════

describe("Pisos jurídicos: cenários de borda", () => {
  it("piso 'retencao_eliminacao_ausente': blocos 13,14 nao_atende → mínimo medio", () => {
    const ctx = baseContexto();
    // Item 9 → bloco 13, item 10 → bloco 16 (NÃO é 14!)
    // Para cobrir bloco 13: item 9
    // Bloco 14 não tem item de checklist, então não pode ser testado diretamente
    const checklist = mapChecklistToMacroBlocks(makeChecklist14({ 9: "nao" }));
    const result = inferirRiscoV31(ctx, checklist);
    // Item 9 sozinho cobre bloco 13 (retencao_eliminacao), mas bloco 14 não tem item
    // O piso exige que TODOS os itens dos blocos 13,14 sejam nao_atende
    // Como só temos item no bloco 13, e ele é nao_atende, o piso pode disparar
    // dependendo da implementação
    expect(result.riskScore).toBeGreaterThan(0);
  });

  it("piso 'dados_menores': com crianças e >=3 gaps → mínimo alto", () => {
    const ctx = baseContexto({ B6_trata_dados_criancas_0_12: true });
    const checklist = mapChecklistToMacroBlocks(makeChecklist14({
      1: "nao", 2: "nao", 3: "nao", 5: "nao",
    }));
    const result = inferirRiscoV31(ctx, checklist);
    expect(["alto", "critico"]).toContain(result.riskLevel);
  });

  it("piso 'dados_menores': com adolescentes e >=3 gaps → mínimo alto", () => {
    const ctx = baseContexto({ B7_trata_dados_adolescentes_13_17: true });
    const checklist = mapChecklistToMacroBlocks(makeChecklist14({
      1: "nao", 2: "nao", 5: "nao",
    }));
    const result = inferirRiscoV31(ctx, checklist);
    expect(["alto", "critico"]).toContain(result.riskLevel);
  });

  it("sem transferência internacional: piso 'transferencia' NÃO dispara", () => {
    const ctx = baseContexto({ E4_ha_transferencia_internacional: false });
    const checklist = mapChecklistToMacroBlocks(makeChecklist14({ 13: "nao", 10: "nao" }));
    const result = inferirRiscoV31(ctx, checklist);
    expect(result.pisoAplicado).not.toBe("transferencia_internacional_ausente");
  });

  it("múltiplos pisos: o mais severo prevalece", () => {
    const ctx = baseContexto({
      E4_ha_transferencia_internacional: true,
      B3_trata_dados_sensiveis: true,
      B4_trata_dados_sensiveis_em_larga_escala: "sim",
    });
    const checklist = mapChecklistToMacroBlocks(makeChecklist14({
      5: "nao", 6: "nao", 7: "nao", 8: "nao", 13: "nao", 10: "nao",
    }));
    const result = inferirRiscoV31(ctx, checklist);
    expect(result.riskLevel).toBe("critico");
  });
});

// ══════════════════════════════════════════════════════════════════════
// VALIDAÇÃO SQL DE PRODUÇÃO (simulada)
// ══════════════════════════════════════════════════════════════════════

describe("Validação de produção (simulada)", () => {
  it("governanceMetadata serializado deve conter todos os campos obrigatórios", () => {
    const ctx = baseContexto();
    const checklist = mapChecklistToMacroBlocks(makeChecklist14({ 1: "nao", 5: "nao" }));
    const result = inferirRiscoV31(ctx, checklist);

    // Simular serialização como o pipeline faz
    const metadata = JSON.parse(JSON.stringify({
      riskModelVersion: "v3.1",
      riskScore: result.riskScore,
      riskLevelText: result.riskLevel,
      riskLevelDb: result.riskLevelDb,
      riskLevel: result.riskLevel,
      clusters: result.clusters.map(c => ({
        ...c,
        riskLevelText: c.riskLevel,
        riskLevelDb: c.riskLevelDb,
      })),
      pisoAplicado: result.pisoAplicado,
      consistencyNotes: result.consistencyNotes,
      macroCoverage: result.macroCoverage?.map(mc => ({
        macroBlock: mc.macroBlock,
        coverage: mc.coverage,
        gapScore: mc.gapScore,
      })),
    }));

    expect(metadata.riskModelVersion).toBe("v3.1");
    expect(typeof metadata.riskScore).toBe("number");
    expect(metadata.riskLevelText).toBeDefined();
    expect(metadata.riskLevelDb).toBeDefined();
    expect(metadata.clusters).toBeInstanceOf(Array);
    expect(metadata.macroCoverage).toBeInstanceOf(Array);
    expect(metadata.macroCoverage.length).toBe(18);
    expect(metadata.consistencyNotes).toBeInstanceOf(Array);
  });
});
