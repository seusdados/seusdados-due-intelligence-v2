import { z } from "zod";

/**
 * Gerador de Relatórios em HTML/PDF Cinematográficos
 * Cria relatórios visualmente impressionantes para avaliações de conformidade
 */

interface ReportData {
  assessmentCode: string;
  organizationName: string;
  framework: string;
  evaluationDate: Date;
  deadline: Date;
  consultant: string;
  domains: {
    name: string;
    score: number;
    maxScore: number;
    percentage: number;
  }[];
  riskAnalysis: {
    domain: string;
    risk: "baixa" | "média" | "alta" | "crítica";
    probability: number;
    impact: number;
    mitigation: string;
  }[];
  actionPlan: {
    action: string;
    responsible: string;
    deadline: Date;
    priority: "baixa" | "média" | "alta" | "crítica";
  }[];
  overallMaturity: number;
  conformityPercentage: number;
}

export function generateAssessmentHTML(data: ReportData): string {
  const riskColors = {
    baixa: "#10b981",
    média: "#f59e0b",
    alta: "#ef4444",
    crítica: "#7c2d12",
  };

  const priorityColors = {
    baixa: "#d1fae5",
    média: "#fef3c7",
    alta: "#fee2e2",
    crítica: "#7c2d12",
  };

  const domainScores = data.domains
    .map((d) => `"${d.name}": ${d.percentage}`)
    .join(", ");

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório de Avaliação - ${data.assessmentCode}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      line-height: 1.6;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 60px 40px;
      text-align: center;
    }

    .header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
      font-weight: 700;
    }

    .header p {
      font-size: 1.1em;
      opacity: 0.95;
      margin-bottom: 20px;
    }

    .assessment-code {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.95em;
    }

    /* Metadata */
    .metadata {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      padding: 40px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }

    .meta-item {
      text-align: center;
    }

    .meta-label {
      font-size: 0.85em;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      font-weight: 600;
    }

    .meta-value {
      font-size: 1.1em;
      color: #1e293b;
      font-weight: 600;
    }

    /* KPIs */
    .kpis {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      padding: 40px;
    }

    .kpi-card {
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      padding: 30px;
      border-radius: 12px;
      text-align: center;
      border-left: 4px solid #667eea;
    }

    .kpi-card.high {
      border-left-color: #10b981;
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
    }

    .kpi-card.medium {
      border-left-color: #f59e0b;
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    }

    .kpi-card.low {
      border-left-color: #ef4444;
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
    }

    .kpi-value {
      font-size: 2.5em;
      font-weight: 700;
      margin-bottom: 10px;
      color: #1e293b;
    }

    .kpi-label {
      font-size: 0.95em;
      color: #64748b;
      font-weight: 600;
    }

    /* Section */
    .section {
      padding: 40px;
      border-bottom: 1px solid #e2e8f0;
    }

    .section-title {
      font-size: 1.8em;
      font-weight: 700;
      margin-bottom: 30px;
      color: #1e293b;
      border-bottom: 3px solid #667eea;
      padding-bottom: 15px;
    }

    /* Chart Container */
    .chart-container {
      position: relative;
      height: 400px;
      margin-bottom: 30px;
      background: white;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }

    /* Risk Matrix */
    .risk-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    .risk-table thead {
      background: #f1f5f9;
    }

    .risk-table th {
      padding: 15px;
      text-align: left;
      font-weight: 600;
      color: #475569;
      border-bottom: 2px solid #e2e8f0;
    }

    .risk-table td {
      padding: 15px;
      border-bottom: 1px solid #e2e8f0;
    }

    .risk-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.85em;
      font-weight: 600;
      text-transform: uppercase;
    }

    .risk-baixa {
      background: #d1fae5;
      color: #065f46;
    }

    .risk-média {
      background: #fef3c7;
      color: #92400e;
    }

    .risk-alta {
      background: #fee2e2;
      color: #991b1b;
    }

    .risk-crítica {
      background: #7c2d12;
      color: white;
    }

    /* Action Plan */
    .action-card {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 15px;
      border-left: 4px solid #667eea;
    }

    .action-title {
      font-weight: 600;
      margin-bottom: 10px;
      color: #1e293b;
    }

    .action-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.9em;
      color: #64748b;
    }

    /* Footer */
    .footer {
      background: #1e293b;
      color: white;
      padding: 30px 40px;
      text-align: center;
      font-size: 0.9em;
    }

    .footer p {
      margin-bottom: 10px;
    }

    /* Print Styles */
    @media print {
      body {
        background: white;
      }
      .container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>Relatório de Avaliação</h1>
      <p>Conformidade LGPD e Maturidade</p>
      <span class="assessment-code">${data.assessmentCode}</span>
    </div>

    <!-- Metadata -->
    <div class="metadata">
      <div class="meta-item">
        <div class="meta-label">Organização</div>
        <div class="meta-value">${data.organizationName}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Framework</div>
        <div class="meta-value">${data.framework}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Data da Avaliação</div>
        <div class="meta-value">${data.evaluationDate.toLocaleDateString("pt-BR")}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Consultor</div>
        <div class="meta-value">${data.consultant}</div>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpis">
      <div class="kpi-card high">
        <div class="kpi-value">${data.overallMaturity}%</div>
        <div class="kpi-label">Maturidade Geral</div>
      </div>
      <div class="kpi-card high">
        <div class="kpi-value">${data.conformityPercentage}%</div>
        <div class="kpi-label">Conformidade LGPD</div>
      </div>
      <div class="kpi-card medium">
        <div class="kpi-value">${data.riskAnalysis.filter((r) => r.risk === "alta" || r.risk === "crítica").length}</div>
        <div class="kpi-label">Riscos Críticos</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${data.actionPlan.length}</div>
        <div class="kpi-label">Planos de Ação</div>
      </div>
    </div>

    <!-- Maturidade por Domínio -->
    <div class="section">
      <h2 class="section-title">📊 Maturidade por Domínio</h2>
      <div class="chart-container">
        <canvas id="radarChart"></canvas>
      </div>
    </div>

    <!-- Análise de Risco -->
    <div class="section">
      <h2 class="section-title">⚠️ Análise de Risco Multi-Norma</h2>
      <table class="risk-table">
        <thead>
          <tr>
            <th>Domínio</th>
            <th>Nível de Risco</th>
            <th>Probabilidade</th>
            <th>Impacto</th>
            <th>Mitigação</th>
          </tr>
        </thead>
        <tbody>
          ${data.riskAnalysis
            .map(
              (risk) => `
          <tr>
            <td>${risk.domain}</td>
            <td><span class="risk-badge risk-${risk.risk}">${risk.risk}</span></td>
            <td>${risk.probability}%</td>
            <td>${risk.impact}/5</td>
            <td>${risk.mitigation}</td>
          </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>

    <!-- Plano de Ação -->
    <div class="section">
      <h2 class="section-title">✅ Plano de Ação</h2>
      ${data.actionPlan
        .map(
          (action) => `
      <div class="action-card">
        <div class="action-title">${action.action}</div>
        <div class="action-meta">
          <span>👤 ${action.responsible}</span>
          <span>📅 ${action.deadline.toLocaleDateString("pt-BR")}</span>
          <span class="risk-badge risk-${action.priority}">${action.priority}</span>
        </div>
      </div>
      `
        )
        .join("")}
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Este relatório foi gerado automaticamente pela plataforma Seusdados</p>
      <p>Data: ${new Date().toLocaleDateString("pt-BR")} | Confidencial</p>
    </div>
  </div>

  <script>
    // Radar Chart
    const ctx = document.getElementById('radarChart').getContext('2d');
    new Chart(ctx, {
      type: 'radar',
      data: {
        labels: [${data.domains.map((d) => `'${d.name}'`).join(", ")}],
        datasets: [{
          label: 'Maturidade (%)',
          data: [${data.domains.map((d) => d.percentage).join(", ")}],
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          pointBackgroundColor: '#667eea',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#667eea',
          pointRadius: 5,
          pointHoverRadius: 7,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: {
              stepSize: 20,
            },
          },
        },
      },
    });
  </script>
</body>
</html>
  `;
}

export function generateReportPDF(htmlContent: string): Buffer {
  // Esta função seria chamada com manus-md-to-pdf ou similar
  // Por enquanto, retorna o HTML que será convertido
  return Buffer.from(htmlContent);
}
