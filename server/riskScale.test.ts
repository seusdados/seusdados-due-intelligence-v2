/**
 * Testes de Regressão — riskScale.ts (Conversor Central de Escala de Risco)
 * 
 * Seusdados Consultoria em Gestão de Dados Limitada
 * CNPJ 33.899.116/0001-63 | www.seusdados.com
 */

import { describe, it, expect } from "vitest";
import {
  normalizeRiskText,
  riskTextToDbEnum,
  riskDbEnumToText,
  riskLevelLabel,
  riskToPriority,
  maxRiskLevel,
  isMoreSevere,
  isAtLeastAsSevere,
  allRiskLevels,
  allDbEnums,
} from "./riskScale";

describe("riskScale — normalizeRiskText", () => {
  it("deve normalizar texto padrão", () => {
    expect(normalizeRiskText("critico")).toBe("critico");
    expect(normalizeRiskText("alto")).toBe("alto");
    expect(normalizeRiskText("medio")).toBe("medio");
    expect(normalizeRiskText("baixo")).toBe("baixo");
    expect(normalizeRiskText("muito_baixo")).toBe("muito_baixo");
  });

  it("deve normalizar variações com acento", () => {
    expect(normalizeRiskText("crítico")).toBe("critico");
    expect(normalizeRiskText("médio")).toBe("medio");
  });

  it("deve normalizar variações com espaço e hífen", () => {
    expect(normalizeRiskText("muito baixo")).toBe("muito_baixo");
    expect(normalizeRiskText("muito-baixo")).toBe("muito_baixo");
  });

  it("deve normalizar sinônimos", () => {
    expect(normalizeRiskText("moderado")).toBe("medio");
    expect(normalizeRiskText("extremo")).toBe("critico");
  });

  it("deve normalizar enum numérico do banco", () => {
    expect(normalizeRiskText("1")).toBe("critico");
    expect(normalizeRiskText("2")).toBe("alto");
    expect(normalizeRiskText("3")).toBe("medio");
    expect(normalizeRiskText("4")).toBe("baixo");
    expect(normalizeRiskText("5")).toBe("muito_baixo");
  });

  it("deve retornar 'medio' para valores não reconhecidos", () => {
    expect(normalizeRiskText("desconhecido")).toBe("medio");
    expect(normalizeRiskText("")).toBe("medio");
    expect(normalizeRiskText(null)).toBe("medio");
    expect(normalizeRiskText(undefined)).toBe("medio");
  });

  it("deve ser case-insensitive", () => {
    expect(normalizeRiskText("CRITICO")).toBe("critico");
    expect(normalizeRiskText("Alto")).toBe("alto");
    expect(normalizeRiskText("MUITO_BAIXO")).toBe("muito_baixo");
  });
});

describe("riskScale — riskTextToDbEnum", () => {
  it("deve converter texto para enum numérico", () => {
    expect(riskTextToDbEnum("critico")).toBe("1");
    expect(riskTextToDbEnum("alto")).toBe("2");
    expect(riskTextToDbEnum("medio")).toBe("3");
    expect(riskTextToDbEnum("baixo")).toBe("4");
    expect(riskTextToDbEnum("muito_baixo")).toBe("5");
  });

  it("deve aceitar variações e converter corretamente", () => {
    expect(riskTextToDbEnum("crítico")).toBe("1");
    expect(riskTextToDbEnum("moderado")).toBe("3");
    expect(riskTextToDbEnum("muito baixo")).toBe("5");
  });
});

describe("riskScale — riskDbEnumToText", () => {
  it("deve converter enum numérico para texto", () => {
    expect(riskDbEnumToText("1")).toBe("critico");
    expect(riskDbEnumToText("2")).toBe("alto");
    expect(riskDbEnumToText("3")).toBe("medio");
    expect(riskDbEnumToText("4")).toBe("baixo");
    expect(riskDbEnumToText("5")).toBe("muito_baixo");
  });

  it("deve aceitar texto e normalizar", () => {
    expect(riskDbEnumToText("critico")).toBe("critico");
    expect(riskDbEnumToText("moderado")).toBe("medio");
  });
});

describe("riskScale — conversão bijetiva (texto↔db)", () => {
  it("texto → db → texto deve ser idempotente", () => {
    for (const level of allRiskLevels()) {
      const db = riskTextToDbEnum(level);
      const backToText = riskDbEnumToText(db);
      expect(backToText).toBe(level);
    }
  });

  it("db → texto → db deve ser idempotente", () => {
    for (const db of allDbEnums()) {
      const text = riskDbEnumToText(db);
      const backToDb = riskTextToDbEnum(text);
      expect(backToDb).toBe(db);
    }
  });
});

describe("riskScale — riskLevelLabel", () => {
  it("deve retornar label legível para enum numérico", () => {
    expect(riskLevelLabel("1")).toBe("Crítico");
    expect(riskLevelLabel("2")).toBe("Alto");
    expect(riskLevelLabel("3")).toBe("Médio");
    expect(riskLevelLabel("4")).toBe("Baixo");
    expect(riskLevelLabel("5")).toBe("Muito Baixo");
  });

  it("deve retornar label legível para texto", () => {
    expect(riskLevelLabel("critico")).toBe("Crítico");
    expect(riskLevelLabel("alto")).toBe("Alto");
    expect(riskLevelLabel("medio")).toBe("Médio");
    expect(riskLevelLabel("baixo")).toBe("Baixo");
    expect(riskLevelLabel("muito_baixo")).toBe("Muito Baixo");
  });
});

describe("riskScale — riskToPriority", () => {
  it("deve converter nível de risco para prioridade", () => {
    expect(riskToPriority("critico")).toBe("critica");
    expect(riskToPriority("alto")).toBe("alta");
    expect(riskToPriority("medio")).toBe("media");
    expect(riskToPriority("baixo")).toBe("baixa");
    expect(riskToPriority("muito_baixo")).toBe("baixa");
  });

  it("deve aceitar enum numérico", () => {
    expect(riskToPriority("1")).toBe("critica");
    expect(riskToPriority("2")).toBe("alta");
    expect(riskToPriority("3")).toBe("media");
  });
});

describe("riskScale — maxRiskLevel", () => {
  it("deve retornar o nível mais severo", () => {
    expect(maxRiskLevel("critico", "baixo")).toBe("critico");
    expect(maxRiskLevel("baixo", "alto")).toBe("alto");
    expect(maxRiskLevel("medio", "medio")).toBe("medio");
    expect(maxRiskLevel("muito_baixo", "critico")).toBe("critico");
  });
});

describe("riskScale — isMoreSevere / isAtLeastAsSevere", () => {
  it("isMoreSevere: critico > alto > medio > baixo > muito_baixo", () => {
    expect(isMoreSevere("critico", "alto")).toBe(true);
    expect(isMoreSevere("alto", "medio")).toBe(true);
    expect(isMoreSevere("medio", "baixo")).toBe(true);
    expect(isMoreSevere("baixo", "muito_baixo")).toBe(true);
    expect(isMoreSevere("baixo", "critico")).toBe(false);
    expect(isMoreSevere("medio", "medio")).toBe(false);
  });

  it("isAtLeastAsSevere: inclui igualdade", () => {
    expect(isAtLeastAsSevere("critico", "critico")).toBe(true);
    expect(isAtLeastAsSevere("alto", "alto")).toBe(true);
    expect(isAtLeastAsSevere("critico", "baixo")).toBe(true);
    expect(isAtLeastAsSevere("baixo", "critico")).toBe(false);
  });
});
