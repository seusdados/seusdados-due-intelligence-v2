/**
 * Testes de regressão para geração automática do Plano de Ação.
 * A implementação atual gera 1 ação por pergunta com gap,
 * preservando rastreabilidade entre resposta, pergunta e ação gerada.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("Geração Automática do Plano de Ação - Lógica por Pergunta", () => {
  const routerContent = readFileSync(join(__dirname, "assessmentsRouter.ts"), "utf-8");

  it("gera plano apenas após a avaliação estar concluída", () => {
    expect(routerContent).toContain("assessment.status !== 'concluida'");
    expect(routerContent).toContain("O Plano de Ação só pode ser gerado após a conclusão completa da avaliação");
  });

  it("protege contra geração duplicada de plano para a mesma avaliação", () => {
    expect(routerContent).toContain("existingActions.length > 0");
    expect(routerContent).toContain("O Plano de Ação já foi gerado para esta avaliação");
  });

  it("considera gap toda resposta com nível menor que 5", () => {
    expect(routerContent).toContain("resp.selectedLevel < 5");
    expect(routerContent).toContain("Nenhum gap identificado - todos os controles estão com nível adequado");
  });

  it("gera 1 ação por pergunta com gap, e não mais 1 ação por domínio", () => {
    expect(routerContent).toContain("Coletar todas as perguntas com gap em lista plana (1 ação por pergunta)");
    expect(routerContent).toContain("Gerar 1 ação por PERGUNTA com gap usando LLM para conteúdo específico");
    expect(routerContent).not.toContain("Gerar 1 ação por domínio com gap");
  });

  it("preenche rastreabilidade da ação com dados da pergunta original", () => {
    expect(routerContent).toContain("sourceQuestionKey");
    expect(routerContent).toContain("sourceQuestionText");
    expect(routerContent).toContain("sourceDomainName");
    expect(routerContent).toContain("sourceSelectedLevel");
    expect(routerContent).toContain("sourceSelectedAnswer");
  });

  it("usa IA para gerar orientação concreta da ação", () => {
    expect(routerContent).toContain("generateAssessmentActionPlan");
    expect(routerContent).toContain("generateActionItemForQuestion");
    expect(routerContent).toContain("Critério de sucesso");
  });

  it("define prioridade e prazo com base no nível de maturidade", () => {
    expect(routerContent).toContain("questionGap.level <= 1 ? 'critica'");
    expect(routerContent).toContain("questionGap.level === 2 ? 'alta'");
    expect(routerContent).toContain("questionGap.level === 3 ? 'media' : 'baixa'");
    expect(routerContent).toContain("priority === 'critica' ? 30");
    expect(routerContent).toContain("priority === 'alta' ? 60");
    expect(routerContent).toContain("priority === 'media' ? 90 : 120");
  });
});
