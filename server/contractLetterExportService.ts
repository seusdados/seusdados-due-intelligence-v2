/**
 * Serviço de Exportação em Formato Carta Simplificado
 * ====================================================
 * Seusdados Consultoria em Gestão de Dados Limitada
 * CNPJ 33.899.116/0001-63 | www.seusdados.com
 * Responsabilidade técnica: Marcelo Fattori
 *
 * Gera um documento HTML de alta qualidade visual (formato carta)
 * com problemas, soluções e cláusulas em linguagem acessível para leigos.
 * O HTML é convertido para PDF via pdfService.
 */

import { logger } from "./_core/logger";

// ==================== TIPOS ====================

interface ProblemForLetter {
  problemId: string;
  frameworkModule: string;
  title: string;
  layDescription: string;
  everydayExample: string;
  severity: string;
  legalRef: string;
}

interface SolutionForLetter {
  solutionId: string;
  problemId: string;
  title: string;
  layDescription: string;
  practicalSteps: string[];
  suggestedDeadline: string;
  priority: number;
}

interface ClauseForLetter {
  clauseId: string;
  sequenceNumber: number;
  title: string;
  content: string;
  frameworkModule: string;
  problemId: string | null;
  necessity: string;
}

interface LetterExportInput {
  contractName: string;
  organizationName: string;
  complianceScore: number | null;
  executiveSummary: string | null;
  problems: ProblemForLetter[];
  solutions: SolutionForLetter[];
  clauses: ClauseForLetter[];
  generatedAt: string;
  consultantName?: string;
}

// ==================== CONSTANTES ====================

const MODULE_NAMES: Record<string, string> = {
  F1: "Quem Faz o Quê",
  F2: "Para Quê Usam os Dados",
  F3: "Quais Dados São Tratados",
  F4: "Proteção e Segurança",
  F5: "Quem Mais Tem Acesso",
  F6: "Direitos das Pessoas",
  F7: "Registro e Documentação",
  F8: "Ciclo de Vida dos Dados",
  F9: "Governança e Responsabilidade",
};

const SEVERITY_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  critico: { label: "Crítico", color: "#dc2626", bgColor: "#fef2f2" },
  alto: { label: "Alto", color: "#ea580c", bgColor: "#fff7ed" },
  medio: { label: "Médio", color: "#ca8a04", bgColor: "#fefce8" },
  baixo: { label: "Baixo", color: "#2563eb", bgColor: "#eff6ff" },
  muito_baixo: { label: "Muito Baixo", color: "#16a34a", bgColor: "#f0fdf4" },
};

const NECESSITY_LABELS: Record<string, { label: string; color: string }> = {
  obrigatoria: { label: "Obrigatória", color: "#dc2626" },
  recomendada: { label: "Recomendada", color: "#ca8a04" },
  opcional: { label: "Opcional", color: "#2563eb" },
};

// ==================== GERADOR DE HTML ====================

function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Bom", color: "#16a34a" };
  if (score >= 60) return { label: "Atenção", color: "#ca8a04" };
  if (score >= 40) return { label: "Preocupante", color: "#ea580c" };
  return { label: "Crítico", color: "#dc2626" };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export function generateLetterHtml(input: LetterExportInput): string {
  const {
    contractName,
    organizationName,
    complianceScore,
    executiveSummary,
    problems,
    solutions,
    clauses,
    generatedAt,
    consultantName,
  } = input;

  const scoreConfig = complianceScore !== null ? getScoreLabel(complianceScore) : null;
  const criticalCount = problems.filter(p => p.severity === "critico" || p.severity === "alto").length;
  const formattedDate = formatDate(generatedAt);

  // Mapear soluções por problemId
  const solutionsByProblem: Record<string, SolutionForLetter> = {};
  solutions.forEach(s => { solutionsByProblem[s.problemId] = s; });

  // Mapear cláusulas por problemId
  const clausesByProblem: Record<string, ClauseForLetter> = {};
  clauses.forEach(c => { if (c.problemId) clausesByProblem[c.problemId] = c; });

  // Agrupar problemas por módulo
  const problemsByModule: Record<string, ProblemForLetter[]> = {};
  problems.forEach(p => {
    if (!problemsByModule[p.frameworkModule]) problemsByModule[p.frameworkModule] = [];
    problemsByModule[p.frameworkModule].push(p);
  });

  // Ordenar por gravidade
  const severityOrder: Record<string, number> = { critico: 0, alto: 1, medio: 2, baixo: 3, muito_baixo: 4 };

  // ==================== HTML ====================
  let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório Simplificado - ${escapeHtml(contractName)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;500;600&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Poppins', sans-serif;
      font-weight: 300;
      color: #1e293b;
      line-height: 1.6;
      background: #ffffff;
    }
    .page-break { page-break-before: always; }
    
    /* Cabeçalho */
    .header {
      background: linear-gradient(135deg, #6B3FD9 0%, #00A8E8 100%);
      padding: 40px 50px;
      color: white;
      position: relative;
      overflow: hidden;
    }
    .header::after {
      content: '';
      position: absolute;
      top: -50%;
      right: -10%;
      width: 300px;
      height: 300px;
      border-radius: 50%;
      background: rgba(255,255,255,0.05);
    }
    .header-logo {
      font-size: 14px;
      font-weight: 200;
      letter-spacing: 3px;
      text-transform: uppercase;
      opacity: 0.9;
      margin-bottom: 8px;
    }
    .header-title {
      font-size: 28px;
      font-weight: 300;
      margin-bottom: 4px;
    }
    .header-subtitle {
      font-size: 14px;
      font-weight: 200;
      opacity: 0.85;
    }
    .header-date {
      font-size: 12px;
      font-weight: 200;
      opacity: 0.7;
      margin-top: 12px;
    }
    
    /* Conteúdo */
    .content {
      padding: 30px 50px;
    }
    
    /* Pontuação */
    .score-section {
      display: flex;
      align-items: center;
      gap: 30px;
      padding: 25px 30px;
      background: #f8fafc;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      margin-bottom: 30px;
    }
    .score-circle {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      border: 4px solid;
      flex-shrink: 0;
    }
    .score-value {
      font-size: 32px;
      font-weight: 200;
      line-height: 1;
    }
    .score-label {
      font-size: 11px;
      font-weight: 400;
      margin-top: 2px;
    }
    .score-summary {
      flex: 1;
    }
    .score-summary h3 {
      font-size: 16px;
      font-weight: 400;
      margin-bottom: 8px;
      color: #334155;
    }
    .score-summary p {
      font-size: 13px;
      font-weight: 300;
      color: #64748b;
      line-height: 1.6;
    }
    
    /* Contadores */
    .counters {
      display: flex;
      gap: 15px;
      margin-bottom: 30px;
    }
    .counter-box {
      flex: 1;
      text-align: center;
      padding: 15px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      background: white;
    }
    .counter-value {
      font-size: 28px;
      font-weight: 200;
    }
    .counter-label {
      font-size: 11px;
      font-weight: 400;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    /* Seções */
    .section-title {
      font-size: 18px;
      font-weight: 400;
      color: #1e293b;
      margin-bottom: 6px;
      padding-bottom: 8px;
      border-bottom: 2px solid #6B3FD9;
      display: inline-block;
    }
    .section-desc {
      font-size: 12px;
      font-weight: 300;
      color: #94a3b8;
      margin-bottom: 20px;
    }
    
    /* Módulo */
    .module-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      margin-top: 20px;
    }
    .module-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      background: #6B3FD9;
      color: white;
    }
    .module-name {
      font-size: 14px;
      font-weight: 400;
      color: #334155;
    }
    
    /* Problema */
    .problem-card {
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 12px;
      border-left: 4px solid;
      page-break-inside: avoid;
    }
    .problem-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .severity-badge {
      display: inline-block;
      padding: 1px 8px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 500;
      color: white;
    }
    .problem-title {
      font-size: 13px;
      font-weight: 400;
      color: #1e293b;
    }
    .problem-desc {
      font-size: 12px;
      font-weight: 300;
      color: #475569;
      margin-bottom: 8px;
    }
    .problem-example {
      font-size: 11px;
      font-weight: 300;
      color: #64748b;
      font-style: italic;
      padding: 6px 12px;
      background: rgba(255,255,255,0.7);
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .problem-legal {
      font-size: 10px;
      font-weight: 400;
      color: #6B3FD9;
    }
    
    /* Solução */
    .solution-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      padding: 12px 16px;
      margin-top: 10px;
      page-break-inside: avoid;
    }
    .solution-title {
      font-size: 12px;
      font-weight: 500;
      color: #166534;
      margin-bottom: 6px;
    }
    .solution-desc {
      font-size: 11px;
      font-weight: 300;
      color: #15803d;
      margin-bottom: 8px;
    }
    .solution-steps {
      list-style: none;
      padding: 0;
    }
    .solution-steps li {
      font-size: 11px;
      font-weight: 300;
      color: #166534;
      padding: 2px 0;
      padding-left: 18px;
      position: relative;
    }
    .solution-steps li::before {
      content: attr(data-step);
      position: absolute;
      left: 0;
      font-weight: 500;
      color: #16a34a;
    }
    .solution-meta {
      display: flex;
      gap: 15px;
      margin-top: 8px;
      font-size: 10px;
      color: #22c55e;
      font-weight: 400;
    }
    
    /* Cláusula */
    .clause-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 12px;
      background: white;
      page-break-inside: avoid;
    }
    .clause-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .clause-number {
      font-size: 11px;
      font-weight: 500;
      color: #6B3FD9;
    }
    .clause-necessity {
      display: inline-block;
      padding: 1px 8px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 500;
    }
    .clause-title {
      font-size: 13px;
      font-weight: 400;
      color: #1e293b;
      margin-bottom: 8px;
    }
    .clause-content {
      font-size: 12px;
      font-weight: 300;
      color: #334155;
      line-height: 1.7;
      padding: 12px 16px;
      background: #f8fafc;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      white-space: pre-wrap;
    }
    .clause-module {
      font-size: 10px;
      font-weight: 400;
      color: #94a3b8;
      margin-top: 8px;
    }
    
    /* Rodapé */
    .footer {
      padding: 20px 50px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #94a3b8;
      font-weight: 300;
    }
    .footer-brand {
      font-weight: 400;
      color: #6B3FD9;
    }
    
    /* Separador */
    .divider {
      height: 1px;
      background: linear-gradient(90deg, #6B3FD9, #00A8E8, transparent);
      margin: 25px 0;
    }
    
    /* Assinatura */
    .signature-section {
      margin-top: 40px;
      padding: 25px 30px;
      background: #f8fafc;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }
    .signature-title {
      font-size: 14px;
      font-weight: 400;
      color: #334155;
      margin-bottom: 15px;
    }
    .signature-info {
      font-size: 12px;
      font-weight: 300;
      color: #64748b;
      line-height: 1.8;
    }
    .signature-name {
      font-size: 14px;
      font-weight: 500;
      color: #1e293b;
      margin-top: 20px;
    }
    .signature-role {
      font-size: 11px;
      font-weight: 300;
      color: #6B3FD9;
    }
  </style>
</head>
<body>
  <!-- CABEÇALHO -->
  <div class="header">
    <div class="header-logo">Seusdados</div>
    <div class="header-title">Relatório Simplificado de Conformidade</div>
    <div class="header-subtitle">${escapeHtml(contractName)} ${organizationName ? `| ${escapeHtml(organizationName)}` : ''}</div>
    <div class="header-date">${formattedDate}</div>
  </div>

  <div class="content">
    <!-- PONTUAÇÃO -->
    ${complianceScore !== null && scoreConfig ? `
    <div class="score-section">
      <div class="score-circle" style="border-color: ${scoreConfig.color}; color: ${scoreConfig.color};">
        <div class="score-value">${complianceScore}%</div>
        <div class="score-label">${scoreConfig.label}</div>
      </div>
      <div class="score-summary">
        <h3>Resumo da Análise</h3>
        <p>${escapeHtml(executiveSummary || 'Análise de conformidade do contrato com a legislação de proteção de dados pessoais (Lei Geral de Proteção de Dados - LGPD).')}</p>
      </div>
    </div>
    ` : ''}

    <!-- CONTADORES -->
    <div class="counters">
      <div class="counter-box">
        <div class="counter-value" style="color: #1e293b;">${problems.length}</div>
        <div class="counter-label">Problemas Identificados</div>
      </div>
      <div class="counter-box">
        <div class="counter-value" style="color: #dc2626;">${criticalCount}</div>
        <div class="counter-label">Urgentes</div>
      </div>
      <div class="counter-box">
        <div class="counter-value" style="color: #2563eb;">${clauses.length}</div>
        <div class="counter-label">Cláusulas Sugeridas</div>
      </div>
      <div class="counter-box">
        <div class="counter-value" style="color: #16a34a;">${solutions.length}</div>
        <div class="counter-label">Soluções Propostas</div>
      </div>
    </div>

    <div class="divider"></div>`;

  // ==================== PROBLEMAS E SOLUÇÕES ====================
  if (problems.length > 0) {
    html += `
    <div class="section-title">Problemas Identificados e Soluções</div>
    <div class="section-desc">Cada problema encontrado no contrato, explicado de forma simples, com a solução recomendada.</div>`;

    const moduleOrder = ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9"];
    for (const moduleCode of moduleOrder) {
      const moduleProblems = problemsByModule[moduleCode];
      if (!moduleProblems || moduleProblems.length === 0) continue;

      const moduleName = MODULE_NAMES[moduleCode] || moduleCode;
      html += `
    <div class="module-header">
      <span class="module-badge">${moduleCode}</span>
      <span class="module-name">${escapeHtml(moduleName)}</span>
    </div>`;

      // Ordenar por gravidade
      moduleProblems.sort((a, b) => (severityOrder[a.severity] ?? 5) - (severityOrder[b.severity] ?? 5));

      for (const problem of moduleProblems) {
        const sev = SEVERITY_LABELS[problem.severity] || SEVERITY_LABELS.medio;
        const solution = solutionsByProblem[problem.problemId];

        html += `
    <div class="problem-card" style="border-left-color: ${sev.color}; background: ${sev.bgColor};">
      <div class="problem-header">
        <span class="severity-badge" style="background: ${sev.color};">${sev.label}</span>
        <span class="problem-title">${escapeHtml(problem.title)}</span>
      </div>
      <div class="problem-desc">${escapeHtml(problem.layDescription)}</div>
      ${problem.everydayExample ? `<div class="problem-example">${escapeHtml(problem.everydayExample)}</div>` : ''}
      <div class="problem-legal">${escapeHtml(problem.legalRef)}</div>`;

        // Solução vinculada
        if (solution) {
          html += `
      <div class="solution-box">
        <div class="solution-title">Solução: ${escapeHtml(solution.title)}</div>
        <div class="solution-desc">${escapeHtml(solution.layDescription)}</div>`;

          if (solution.practicalSteps.length > 0) {
            html += `<ol class="solution-steps">`;
            solution.practicalSteps.forEach((step, idx) => {
              html += `<li data-step="${idx + 1}.">${escapeHtml(step)}</li>`;
            });
            html += `</ol>`;
          }

          html += `
        <div class="solution-meta">
          <span>Prazo: ${escapeHtml(solution.suggestedDeadline)}</span>
          <span>Prioridade: ${solution.priority}</span>
        </div>
      </div>`;
        }

        html += `
    </div>`;
      }
    }
  }

  // ==================== CLÁUSULAS ====================
  if (clauses.length > 0) {
    html += `
    <div class="divider"></div>
    <div class="page-break"></div>
    
    <div class="section-title">Cláusulas Sugeridas</div>
    <div class="section-desc">Textos prontos para inclusão no contrato, organizados por necessidade e área.</div>`;

    const sortedClauses = [...clauses].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    for (const clause of sortedClauses) {
      const nec = NECESSITY_LABELS[clause.necessity] || NECESSITY_LABELS.opcional;
      const moduleName = MODULE_NAMES[clause.frameworkModule] || clause.frameworkModule;

      html += `
    <div class="clause-card">
      <div class="clause-header">
        <span class="clause-number">Cláusula ${clause.sequenceNumber}</span>
        <span class="clause-necessity" style="background: ${nec.color}15; color: ${nec.color}; border: 1px solid ${nec.color}30;">${nec.label}</span>
      </div>
      <div class="clause-title">${escapeHtml(clause.title)}</div>
      <div class="clause-content">${escapeHtml(clause.content)}</div>
      <div class="clause-module">${escapeHtml(clause.frameworkModule)} - ${escapeHtml(moduleName)}</div>
    </div>`;
    }
  }

  // ==================== ASSINATURA ====================
  html += `
    <div class="divider"></div>
    
    <div class="signature-section">
      <div class="signature-title">Responsabilidade Técnica</div>
      <div class="signature-info">
        Este relatório foi gerado automaticamente pela plataforma Seusdados, com base na análise algorítmica do contrato 
        submetido, utilizando o Framework Seusdados de conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018).
        <br><br>
        As cláusulas sugeridas são modelos referenciais e devem ser revisadas por profissional habilitado antes da inclusão 
        em documentos jurídicos definitivos.
      </div>
      <div class="signature-name">${escapeHtml(consultantName || 'Marcelo Fattori')}</div>
      <div class="signature-role">Responsável Técnico</div>
      <br>
      <div class="signature-info">
        Seusdados Consultoria em Gestão de Dados Limitada<br>
        CNPJ 33.899.116/0001-63<br>
        www.seusdados.com
      </div>
    </div>
  </div>

  <!-- RODAPÉ -->
  <div class="footer">
    <span class="footer-brand">Seusdados Consultoria em Gestão de Dados Limitada | CNPJ 33.899.116/0001-63</span>
    <span>Gerado em ${formattedDate}</span>
  </div>
</body>
</html>`;

  return html;
}

/**
 * Gera o PDF a partir do HTML da carta simplificada
 */
export async function generateLetterPdf(input: LetterExportInput): Promise<{ html: string; pdf: Buffer }> {
  logger.info("[LETTER-EXPORT] Gerando carta simplificada para análise", { contractName: input.contractName });

  const html = generateLetterHtml(input);

  // Importar generatePDF do pdfService
  const { generatePDF } = await import("./pdfService");
  const pdf = await generatePDF(html);

  logger.info("[LETTER-EXPORT] Carta simplificada gerada com sucesso", {
    htmlLength: html.length,
    pdfSize: pdf.length,
  });

  return { html, pdf };
}
