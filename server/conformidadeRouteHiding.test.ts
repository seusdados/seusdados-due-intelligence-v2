import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Testes para verificar que a rota /conformidade foi ocultada corretamente
 * e que todas as referências externas apontam para /avaliacoes
 */

describe("Ocultação da rota /conformidade", () => {
  const clientSrcDir = path.join(__dirname, "..", "client", "src");

  // Arquivos que NÃO devem conter referências a /conformidade (exceto legados)
  const nonLegacyFiles = [
    "pages/Dashboard.tsx",
    "pages/DashboardOperacional.tsx",
    "pages/Home.tsx",
    "pages/ClienteDashboard.tsx",
    "pages/HistoricoAvaliacoes.tsx",
    "pages/OrganizacaoDetalhes.tsx",
    "pages/UnifiedAssessments.tsx",
    "components/Breadcrumbs.tsx",
    "hooks/useBreadcrumb.ts",
  ];

  nonLegacyFiles.forEach((filePath) => {
    it(`${filePath} não deve conter links para /conformidade`, () => {
      const fullPath = path.join(clientSrcDir, filePath);
      if (!fs.existsSync(fullPath)) {
        // Arquivo pode não existir em todos os ambientes de teste
        return;
      }
      const content = fs.readFileSync(fullPath, "utf-8");
      // Buscar referências a /conformidade que não estejam em comentários
      const lines = content.split("\n");
      const activeReferences = lines.filter((line) => {
        const trimmed = line.trim();
        // Ignorar linhas que são comentários
        if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
          return false;
        }
        // Ignorar linhas dentro de blocos de comentário JSX {/* */}
        if (trimmed.includes("{/*") || trimmed.includes("*/}")) {
          return false;
        }
        return trimmed.includes("/conformidade");
      });
      expect(activeReferences).toHaveLength(0);
    });
  });

  it("App.tsx deve ter rotas /conformidade comentadas ou redirecionando", () => {
    const appPath = path.join(clientSrcDir, "App.tsx");
    const content = fs.readFileSync(appPath, "utf-8");
    
    // Deve ter redirecionamento para /avaliacoes
    expect(content).toContain("window.location.replace('/avaliacoes')");
    
    // As rotas originais devem estar dentro de bloco de comentário
    expect(content).toContain("{/*");
    expect(content).toContain("*/}");
  });

  it("Breadcrumbs.tsx deve apontar para /avaliacoes em vez de /conformidade", () => {
    const breadcrumbsPath = path.join(clientSrcDir, "components", "Breadcrumbs.tsx");
    const content = fs.readFileSync(breadcrumbsPath, "utf-8");
    
    // Todas as referências de href devem apontar para /avaliacoes
    const hrefMatches = content.match(/href:\s*["'](\/[^"']+)["']/g) || [];
    const conformidadeHrefs = hrefMatches.filter((m) => m.includes("/conformidade"));
    expect(conformidadeHrefs).toHaveLength(0);
  });

  it("URLs de e-mail no servidor devem apontar para /avaliacoes", () => {
    const serverDir = path.join(__dirname);
    
    const endpointsPath = path.join(serverDir, "complianceEndpoints.ts");
    if (fs.existsSync(endpointsPath)) {
      const content = fs.readFileSync(endpointsPath, "utf-8");
      expect(content).not.toContain("dll.seusdados.com/conformidade");
    }

    const invitationsPath = path.join(serverDir, "complianceSendInvitations.ts");
    if (fs.existsSync(invitationsPath)) {
      const content = fs.readFileSync(invitationsPath, "utf-8");
      expect(content).not.toContain("/conformidade/avaliacao");
    }
  });
});
