import { describe, it, expect, vi } from "vitest";

// Simular a função generateRotMarkdown
function generateRotMarkdown(rot: any): string {
  const dataCategories = rot.dataCategories || [];
  const sensiveisCount = dataCategories.filter((d: any) => d.sensivel).length;
  
  return `# Registro de Operação de Tratamento (ROT)

## Informações Gerais

| Campo | Valor |
|-------|-------|
| **Título** | ${rot.title} |
| **Departamento** | ${rot.department || "Não especificado"} |
| **Categoria de Titular** | ${rot.titularCategory} |
| **Status** | ${rot.status} |
| **Data de Criação** | ${new Date(rot.createdAt).toLocaleDateString("pt-BR")} |

## Descrição

${rot.description || "Sem descrição disponível."}

## Finalidade do Tratamento

${rot.purpose || "Não especificada."}

## Base Legal

**Base Legal Principal:** ${rot.legalBase || "Não especificada"}

${rot.requiresConsent ? "⚠️ **Requer Consentimento do Titular**" : "✅ Não requer consentimento específico"}

${rot.justification ? `**Justificativa:** ${rot.justification}` : ""}

## Dados Tratados

| Categoria de Dado | Sensível |
|-------------------|----------|
${dataCategories.map((d: any) => `| ${d.name} | ${d.sensivel ? "⚠️ Sim" : "Não"} |`).join("\n")}

**Total de categorias:** ${dataCategories.length}
**Dados sensíveis:** ${sensiveisCount}

## Análise de Risco

| Indicador | Valor |
|-----------|-------|
| **Nível de Risco** | ${rot.riskLevel || "Não avaliado"} |
| **Score de Risco** | ${rot.riskScore || "N/A"} |

${rot.recommendations ? `### Recomendações\n\n${rot.recommendations}` : ""}

---

*Documento gerado automaticamente pelo Sistema Seusdados Due Diligence*
*Data de geração: ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}*
`;
}

describe("ROT Generation", () => {
  it("should generate ROT markdown from a valid ROT object", () => {
    const rot = {
      title: "Recrutamento e Seleção",
      department: "Recursos Humanos",
      titularCategory: "Candidato",
      status: "rascunho",
      createdAt: new Date().toISOString(),
      description: "Processo de recrutamento",
      purpose: "Seleção de candidatos",
      legalBase: "Art. 7, I da LGPD",
      requiresConsent: true,
      dataCategories: [
        { name: "Nome", sensivel: false },
        { name: "CPF", sensivel: false },
        { name: "Dados de Saúde", sensivel: true },
      ],
      riskLevel: "medio",
      riskScore: 45,
    };

    const markdown = generateRotMarkdown(rot);
    
    expect(markdown).toContain("# Registro de Operação de Tratamento (ROT)");
    expect(markdown).toContain("Recrutamento e Seleção");
    expect(markdown).toContain("Recursos Humanos");
    expect(markdown).toContain("Candidato");
    expect(markdown).toContain("Art. 7, I da LGPD");
    expect(markdown).toContain("Nome");
    expect(markdown).toContain("Dados de Saúde");
  });

  it("should handle missing optional fields", () => {
    const rot = {
      title: "Teste",
      titularCategory: "Cliente",
      status: "rascunho",
      createdAt: new Date().toISOString(),
      dataCategories: [],
      requiresConsent: false,
    };

    const markdown = generateRotMarkdown(rot);
    
    expect(markdown).toContain("Não especificado");
    expect(markdown).toContain("Sem descrição disponível");
    expect(markdown).toContain("Não especificada");
  });
});
