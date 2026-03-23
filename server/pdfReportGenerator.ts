/**
 * PDF Report Generator - Cinematographic Reports
 * Gera relatórios em PDF com alta qualidade visual
 */

interface ReportData {
  assessmentCode: string;
  assessmentTitle: string;
  organizationName: string;
  consultantName: string;
  generatedDate: string;
  maturityScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  domains: DomainAnalysis[];
  riskMatrix: RiskMatrixData[];
  actionPlan: ActionPlanItem[];
  recommendations: string[];
}

interface DomainAnalysis {
  name: string;
  score: number;
  status: 'compliant' | 'partial' | 'non_compliant';
  findings: string[];
}

interface RiskMatrixData {
  risk: string;
  probability: number;
  impact: number;
  level: string;
  mitigation: string;
}

interface ActionPlanItem {
  id: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate: string;
  owner: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export function generateReportHTML(data: ReportData): string {
  const riskColor = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    critical: '#7c2d12',
  };

  const statusColor = {
    compliant: '#10b981',
    partial: '#f59e0b',
    non_compliant: '#ef4444',
  };

  const priorityColor = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    critical: '#7c2d12',
  };

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.assessmentCode} - Relatório de Avaliação</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #111;
      background: #fff;
    }

    .page {
      page-break-after: always;
      padding: 40px;
      max-width: 900px;
      margin: 0 auto;
    }

    .page-break {
      page-break-after: always;
    }

    /* Header */
    .header {
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 15px;
    }

    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #3b82f6;
    }

    .assessment-code {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #666;
      background: #f3f4f6;
      padding: 8px 12px;
      border-radius: 4px;
    }

    h1 {
      font-size: 32px;
      font-weight: 700;
      color: #111;
      margin-bottom: 10px;
    }

    .subtitle {
      font-size: 14px;
      color: #666;
      margin-bottom: 20px;
    }

    /* KPIs */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }

    .kpi-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }

    .kpi-label {
      font-size: 12px;
      color: #666;
      font-weight: 500;
      margin-bottom: 8px;
    }

    .kpi-value {
      font-size: 28px;
      font-weight: 700;
      color: #111;
    }

    .kpi-unit {
      font-size: 14px;
      color: #999;
      margin-left: 4px;
    }

    /* Section */
    .section {
      margin-bottom: 30px;
    }

    h2 {
      font-size: 24px;
      font-weight: 700;
      color: #111;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }

    h3 {
      font-size: 16px;
      font-weight: 600;
      color: #111;
      margin-top: 15px;
      margin-bottom: 10px;
    }

    /* Domains */
    .domain-item {
      background: #f9fafb;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin-bottom: 12px;
      border-radius: 4px;
    }

    .domain-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .domain-name {
      font-weight: 600;
      color: #111;
    }

    .domain-score {
      font-size: 14px;
      font-weight: 700;
      color: #3b82f6;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 10px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #06b6d4);
      border-radius: 4px;
    }

    .findings {
      font-size: 13px;
      color: #666;
      line-height: 1.5;
    }

    /* Risk Matrix */
    .risk-matrix {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 13px;
    }

    .risk-matrix th {
      background: #f3f4f6;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #e5e7eb;
      color: #111;
    }

    .risk-matrix td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }

    .risk-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      color: white;
    }

    /* Action Plan */
    .action-item {
      background: #f9fafb;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin-bottom: 12px;
      border-radius: 4px;
    }

    .action-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }

    .action-description {
      font-weight: 600;
      color: #111;
      margin-bottom: 8px;
    }

    .action-meta {
      display: flex;
      gap: 20px;
      font-size: 12px;
      color: #666;
    }

    .action-meta-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .action-meta-label {
      color: #999;
      font-weight: 500;
    }

    /* Recommendations */
    .recommendation {
      background: #f0f9ff;
      border-left: 4px solid #0ea5e9;
      padding: 12px;
      margin-bottom: 10px;
      border-radius: 4px;
      font-size: 13px;
      line-height: 1.5;
    }

    /* Footer */
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #666;
      display: flex;
      justify-content: space-between;
    }

    .footer-left {
      flex: 1;
    }

    .footer-right {
      text-align: right;
      flex: 1;
    }

    /* Signature */
    .signature {
      margin-top: 40px;
      display: flex;
      gap: 60px;
    }

    .signature-block {
      flex: 1;
    }

    .signature-line {
      border-top: 1px solid #111;
      margin-bottom: 8px;
      height: 40px;
    }

    .signature-name {
      font-size: 12px;
      font-weight: 600;
      color: #111;
    }

    .signature-title {
      font-size: 11px;
      color: #666;
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="page">
    <div class="header">
      <div class="header-top">
        <div class="logo">Seusdados</div>
        <div class="assessment-code">${data.assessmentCode}</div>
      </div>
      <h1>${data.assessmentTitle}</h1>
      <p class="subtitle">Relatório de Avaliação de Conformidade LGPD</p>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Maturidade</div>
        <div class="kpi-value">${data.maturityScore}<span class="kpi-unit">%</span></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Nível de Risco</div>
        <div class="kpi-value" style="color: ${riskColor[data.riskLevel]}">
          ${data.riskLevel.charAt(0).toUpperCase() + data.riskLevel.slice(1)}
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Domínios</div>
        <div class="kpi-value">${data.domains.length}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Planos de Ação</div>
        <div class="kpi-value">${data.actionPlan.length}</div>
      </div>
    </div>

    <div style="margin-top: 60px; padding-top: 40px; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 14px; color: #666; margin-bottom: 8px;">
        <strong>Organização:</strong> ${data.organizationName}
      </p>
      <p style="font-size: 14px; color: #666; margin-bottom: 8px;">
        <strong>Consultor:</strong> ${data.consultantName}
      </p>
      <p style="font-size: 14px; color: #666;">
        <strong>Data de Geração:</strong> ${new Date(data.generatedDate).toLocaleDateString('pt-BR')}
      </p>
    </div>
  </div>

  <!-- Domains Analysis -->
  <div class="page">
    <h2>Análise por Domínio</h2>

    ${data.domains
      .map(
        (domain) => `
      <div class="domain-item">
        <div class="domain-header">
          <span class="domain-name">${domain.name}</span>
          <span class="domain-score">${domain.score}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${domain.score}%"></div>
        </div>
        <div class="findings">
          <strong>Status:</strong> ${
            domain.status === 'compliant'
              ? 'Conforme'
              : domain.status === 'partial'
                ? 'Parcialmente Conforme'
                : 'Não Conforme'
          }
        </div>
        ${
          domain.findings.length > 0
            ? `
        <div class="findings" style="margin-top: 8px;">
          <strong>Achados:</strong><br>
          ${domain.findings.map((f) => `• ${f}`).join('<br>')}
        </div>
        `
            : ''
        }
      </div>
    `
      )
      .join('')}
  </div>

  <!-- Risk Matrix -->
  <div class="page">
    <h2>Matriz de Risco</h2>

    <table class="risk-matrix">
      <thead>
        <tr>
          <th>Risco</th>
          <th>Probabilidade</th>
          <th>Impacto</th>
          <th>Nível</th>
          <th>Mitigação</th>
        </tr>
      </thead>
      <tbody>
        ${data.riskMatrix
          .map(
            (risk) => `
        <tr>
          <td>${risk.risk}</td>
          <td>${risk.probability}/5</td>
          <td>${risk.impact}/5</td>
          <td>
            <span class="risk-badge" style="background-color: ${
              risk.level === 'Crítico'
                ? '#7c2d12'
                : risk.level === 'Alto'
                  ? '#ef4444'
                  : risk.level === 'Médio'
                    ? '#f59e0b'
                    : '#10b981'
            }">
              ${risk.level}
            </span>
          </td>
          <td>${risk.mitigation}</td>
        </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  </div>

  <!-- Action Plan -->
  <div class="page">
    <h2>Plano de Ação</h2>

    ${data.actionPlan
      .map(
        (action) => `
      <div class="action-item">
        <div class="action-header">
          <div class="action-description">${action.description}</div>
          <span class="risk-badge" style="background-color: ${priorityColor[action.priority]}">
            ${action.priority.charAt(0).toUpperCase() + action.priority.slice(1)}
          </span>
        </div>
        <div class="action-meta">
          <div class="action-meta-item">
            <span class="action-meta-label">Responsável</span>
            <span>${action.owner}</span>
          </div>
          <div class="action-meta-item">
            <span class="action-meta-label">Prazo</span>
            <span>${new Date(action.dueDate).toLocaleDateString('pt-BR')}</span>
          </div>
          <div class="action-meta-item">
            <span class="action-meta-label">Status</span>
            <span>${
              action.status === 'pending'
                ? 'Pendente'
                : action.status === 'in_progress'
                  ? 'Em Progresso'
                  : 'Concluído'
            }</span>
          </div>
        </div>
      </div>
    `
      )
      .join('')}
  </div>

  <!-- Recommendations -->
  <div class="page">
    <h2>Recomendações</h2>

    ${data.recommendations.map((rec) => `<div class="recommendation">${rec}</div>`).join('')}

    <div class="signature" style="margin-top: 60px;">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-name">${data.consultantName}</div>
        <div class="signature-title">Consultor Seusdados</div>
      </div>
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-name">_____________________</div>
        <div class="signature-title">Responsável Organização</div>
      </div>
    </div>
  </div>

  <div class="page">
    <div class="footer">
      <div class="footer-left">
        <p><strong>Seusdados Consultoria</strong></p>
        <p>Avaliações de Conformidade LGPD</p>
      </div>
      <div class="footer-right">
        <p>Documento Confidencial</p>
        <p>${data.assessmentCode}</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

export async function generatePDFReport(data: ReportData): Promise<Buffer> {
  const html = generateReportHTML(data);

  // TODO: Usar manus-md-to-pdf ou similar para converter HTML para PDF
  // Por enquanto, retornar HTML como Buffer
  return Buffer.from(html, 'utf-8');
}
