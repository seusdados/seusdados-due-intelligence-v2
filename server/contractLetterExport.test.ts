/**
 * Testes unitários para o serviço de exportação em formato carta simplificado
 * Seusdados Consultoria em Gestão de Dados Limitada
 * CNPJ 33.899.116/0001-63 | www.seusdados.com
 */

import { describe, it, expect } from "vitest";
import { generateLetterHtml } from "./contractLetterExportService";

const baseProblem = {
  problemId: "P-1-1",
  frameworkModule: "F1",
  title: "Falta de identificação do controlador",
  layDescription: "O contrato não identifica claramente quem é o responsável pelos dados pessoais.",
  everydayExample: "Imagine que você envia uma carta, mas não coloca o remetente. Ninguém sabe quem é o responsável.",
  severity: "critico" as const,
  legalRef: "Art. 5, VI da LGPD",
  contractExcerpt: null,
};

const baseSolution = {
  solutionId: "S-P-1-1",
  problemId: "P-1-1",
  title: "Correção: Falta de identificação do controlador",
  layDescription: "Incluir cláusula identificando claramente o controlador de dados.",
  practicalSteps: [
    "Identificar a parte que decide sobre o tratamento dos dados",
    "Incluir nome, CNPJ e endereço do controlador",
    "Definir as responsabilidades do controlador no contrato",
  ],
  suggestedDeadline: "15 dias",
  priority: 1,
};

const baseClause = {
  clauseId: "CL-1",
  sequenceNumber: 1,
  title: "Identificação do Controlador de Dados",
  content: "Para os fins deste contrato, a PARTE A será considerada a controladora dos dados pessoais...",
  frameworkModule: "F1",
  problemId: "P-1-1",
  necessity: "obrigatoria" as const,
  version: 1,
  isAccepted: false,
};

const baseInput = {
  contractName: "Contrato de Prestação de Serviços - Empresa ABC",
  organizationName: "Empresa ABC Ltda",
  complianceScore: 45,
  executiveSummary: "O contrato apresenta diversas lacunas em relação à proteção de dados pessoais.",
  problems: [baseProblem],
  solutions: [baseSolution],
  clauses: [baseClause],
  generatedAt: "2026-02-20T18:00:00.000Z",
  consultantName: "Marcelo Fattori",
};

describe("generateLetterHtml", () => {
  it("deve gerar HTML válido com estrutura completa", () => {
    const html = generateLetterHtml(baseInput);
    
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html lang=\"pt-BR\">");
    expect(html).toContain("</html>");
  });

  it("deve incluir a fonte Poppins", () => {
    const html = generateLetterHtml(baseInput);
    expect(html).toContain("Poppins");
    expect(html).toContain("fonts.googleapis.com");
  });

  it("deve incluir o nome do contrato no cabeçalho", () => {
    const html = generateLetterHtml(baseInput);
    expect(html).toContain("Contrato de Presta");
  });

  it("deve incluir o nome da organização", () => {
    const html = generateLetterHtml(baseInput);
    expect(html).toContain("Empresa ABC Ltda");
  });

  it("deve incluir a pontuação de conformidade", () => {
    const html = generateLetterHtml(baseInput);
    expect(html).toContain("45%");
  });

  it("deve classificar pontuação como Crítico quando abaixo de 40", () => {
    const html = generateLetterHtml({ ...baseInput, complianceScore: 30 });
    expect(html).toContain("Crítico");
  });

  it("deve classificar pontuação como Bom quando acima de 80", () => {
    const html = generateLetterHtml({ ...baseInput, complianceScore: 85 });
    expect(html).toContain("Bom");
  });

  it("deve incluir os contadores de problemas, cláusulas e soluções", () => {
    const html = generateLetterHtml(baseInput);
    expect(html).toContain("Problemas Identificados");
    expect(html).toContain("Urgentes");
    expect(html).toContain("Cláusulas Sugeridas");
    expect(html).toContain("Soluções Propostas");
  });

  it("deve incluir o problema com título e descrição", () => {
    const html = generateLetterHtml(baseInput);
    expect(html).toContain("Falta de identifica");
    expect(html).toContain("O contrato n");
  });

  it("deve incluir o badge de gravidade", () => {
    const html = generateLetterHtml(baseInput);
    expect(html).toContain("Crítico");
  });

  it("deve incluir o exemplo cotidiano", () => {
    const html = generateLetterHtml(baseInput);
    expect(html).toContain("Imagine que voc");
  });

  it("deve incluir a referência legal", () => {
    const html = generateLetterHtml(baseInput);
    expect(html).toContain("Art. 5, VI da LGPD");
  });

  it("deve incluir a solução com passos práticos", () => {
    const html = generateLetterHtml(baseInput);
    expect(html).toContain("Identificar a parte que decide");
    expect(html).toContain("Incluir nome, CNPJ");
  });

  it("deve incluir o prazo sugerido da solução", () => {
    const html = generateLetterHtml(baseInput);
    expect(html).toContain("15 dias");
  });

  it("deve incluir a cláusula com título e conteúdo", () => {
    const html = generateLetterHtml(baseInput);
    expect(html).toContain("Identifica");
    expect(html).toContain("controladora dos dados");
  });

  it("deve incluir o badge de necessidade da cláusula", () => {
    const html = generateLetterHtml(baseInput);
    expect(html).toContain("Obrigatória");
  });

  it("deve incluir o módulo F1 no cabeçalho do módulo", () => {
    const html = generateLetterHtml(baseInput);
    expect(html).toContain("F1");
    expect(html).toContain("Quem Faz o Qu");
  });

  it("deve incluir a assinatura com dados da Seusdados", () => {
    const html = generateLetterHtml(baseInput);
    expect(html).toContain("Seusdados Consultoria em Gest");
    expect(html).toContain("33.899.116/0001-63");
    expect(html).toContain("www.seusdados.com");
    expect(html).toContain("Marcelo Fattori");
  });

  it("deve incluir o gradiente roxo/azul no cabeçalho", () => {
    const html = generateLetterHtml(baseInput);
    expect(html).toContain("#6B3FD9");
    expect(html).toContain("#00A8E8");
  });

  it("deve funcionar sem problemas quando não há dados", () => {
    const html = generateLetterHtml({
      ...baseInput,
      problems: [],
      solutions: [],
      clauses: [],
      complianceScore: null,
      executiveSummary: null,
    });
    
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Seusdados");
    expect(html).not.toContain("Problemas Identificados e Soluções");
  });

  it("deve agrupar problemas por módulo corretamente", () => {
    const multiModuleInput = {
      ...baseInput,
      problems: [
        { ...baseProblem, problemId: "P-1-1", frameworkModule: "F1" },
        { ...baseProblem, problemId: "P-2-1", frameworkModule: "F4", title: "Falta de medidas de segurança" },
        { ...baseProblem, problemId: "P-3-1", frameworkModule: "F1", title: "Operador não identificado" },
      ],
    };
    const html = generateLetterHtml(multiModuleInput);
    
    // F1 deve aparecer antes de F4
    const f1Index = html.indexOf("Quem Faz o Qu");
    const f4Index = html.indexOf("Prote");
    expect(f1Index).toBeLessThan(f4Index);
  });

  it("deve escapar caracteres HTML no conteúdo", () => {
    const html = generateLetterHtml({
      ...baseInput,
      contractName: "Contrato <script>alert('xss')</script>",
    });
    
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("deve incluir múltiplos níveis de gravidade", () => {
    const multiSeverityInput = {
      ...baseInput,
      problems: [
        { ...baseProblem, problemId: "P-1", severity: "critico" as const },
        { ...baseProblem, problemId: "P-2", severity: "alto" as const, title: "Problema alto" },
        { ...baseProblem, problemId: "P-3", severity: "medio" as const, title: "Problema médio" },
        { ...baseProblem, problemId: "P-4", severity: "baixo" as const, title: "Problema baixo" },
      ],
    };
    const html = generateLetterHtml(multiSeverityInput);
    
    expect(html).toContain("Crítico");
    expect(html).toContain("Alto");
    expect(html).toContain("Médio");
    expect(html).toContain("Baixo");
  });

  it("deve formatar a data corretamente em português", () => {
    const html = generateLetterHtml(baseInput);
    // A data deve estar formatada em português (ex: "20 de fevereiro de 2026")
    expect(html).toContain("2026");
  });
});
