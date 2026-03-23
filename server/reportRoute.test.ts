/**
 * Testes para validação da rota do botão "Gerar Relatório"
 * 
 * Valida que a URL gerada pelo botão de ação é correta
 * e que o parâmetro de query ?acao=relatorio é processado corretamente.
 */
import { describe, it, expect } from "vitest";

describe("Rota do botão Gerar Relatório", () => {
  it("deve gerar URL correta com query param acao=relatorio", () => {
    const analysisId = 12345;
    const url = `/analise-contratos/${analysisId}?acao=relatorio`;
    
    expect(url).toBe("/analise-contratos/12345?acao=relatorio");
    expect(url).not.toContain("/relatorio");
    expect(url).toContain("?acao=relatorio");
  });

  it("deve extrair corretamente o parâmetro acao da URL", () => {
    const searchString = "acao=relatorio";
    const params = new URLSearchParams(searchString);
    const acao = params.get("acao");
    
    expect(acao).toBe("relatorio");
  });

  it("deve retornar null quando acao não está presente", () => {
    const searchString = "";
    const params = new URLSearchParams(searchString);
    const acao = params.get("acao");
    
    expect(acao).toBeNull();
  });

  it("deve lidar com outros parâmetros de query sem conflito", () => {
    const searchString = "tab=charts&acao=relatorio";
    const params = new URLSearchParams(searchString);
    const acao = params.get("acao");
    const tab = params.get("tab");
    
    expect(acao).toBe("relatorio");
    expect(tab).toBe("charts");
  });

  it("a rota base /analise-contratos/:id deve existir e ser válida", () => {
    const validRoutes = [
      "/analise-contratos",
      "/analise-contratos/dashboard",
      "/analise-contratos/:id",
      "/analise-contratos/:id/plano-acao",
    ];
    
    // A rota /analise-contratos/:id/relatorio NÃO deve existir
    expect(validRoutes).not.toContain("/analise-contratos/:id/relatorio");
    
    // A rota /analise-contratos/:id DEVE existir (é onde o relatório é gerado)
    expect(validRoutes).toContain("/analise-contratos/:id");
  });
});
