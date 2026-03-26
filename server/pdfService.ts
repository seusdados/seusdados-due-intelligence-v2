import PDFDocument from 'pdfkit';

export interface ComplianceReportData {
  organizationName: string;
  assessmentDate: string;
  framework: string;
  overallScore: number;
  maturityLevel: number;
  maturityLabel: string;
  riskLevel: string;
  domains: {
    name: string;
    score: number;
    maturity: number;
    questionsAnswered: number;
    totalQuestions: number;
  }[];
  recommendations: string[];
  actionPlan: {
    priority: string;
    action: string;
    domain: string;
    deadline: string;
  }[];
  consultantName: string;
  consultantEmail: string;
}

export interface ThirdPartyReportData {
  organizationName: string;
  thirdPartyName: string;
  thirdPartyType: string;
  assessmentDate: string;
  overallRiskScore: number;
  riskClassification: string;
  probabilityScore: number;
  impactScore: number;
  categories: {
    name: string;
    score: number;
    maxScore: number;
    percentage: number;
  }[];
  criticalFindings: string[];
  recommendations: string[];
  consultantName: string;
  consultantEmail: string;
}

const getMaturityColor = (level: number): string => {
  const colors: Record<number, string> = {
    1: '#dc2626',
    2: '#ea580c',
    3: '#eab308',
    4: '#22c55e',
    5: '#0ea5e9'
  };
  return colors[level] || '#6b7280';
};

const getRiskColor = (risk: string): string => {
  const colors: Record<string, string> = {
    'Baixo': '#22c55e',
    'Moderado': '#eab308',
    'Alto': '#f97316',
    'Crítico': '#dc2626'
  };
  return colors[risk] || '#6b7280';
};

const baseStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700&display=swap');
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-weight: 300;
    color: #1f2937;
    line-height: 1.6;
    background: white;
  }
  
  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 20mm;
    background: white;
    page-break-after: always;
  }
  
  .page:last-child {
    page-break-after: avoid;
  }
  
  /* Header Visual Law */
  .header {
    background: linear-gradient(135deg, #2E1065 0%, #4C1D95 30%, #6D28D9 70%, #7C3AED 100%);
    padding: 30px 40px;
    margin: -20mm -20mm 30px -20mm;
    color: white;
  }
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  
  .header-left {
    flex: 1;
  }
  
  .header-badge {
    display: inline-block;
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.3);
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-bottom: 15px;
  }
  
  .header-title {
    font-size: 28px;
    font-weight: 200;
    letter-spacing: -0.02em;
    margin-bottom: 5px;
  }
  
  .header-subtitle {
    font-size: 18px;
    font-weight: 300;
    color: #fbbf24;
  }
  
  .header-right {
    text-align: right;
  }
  
  .header-logo {
    height: 40px;
    margin-bottom: 10px;
  }
  
  .header-date {
    font-size: 12px;
    font-weight: 300;
    opacity: 0.8;
  }
  
  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 30px;
  }
  
  .stat-card {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(109, 40, 217, 0.05) 100%);
    border-radius: 12px;
    padding: 20px;
    text-align: center;
  }
  
  .stat-value {
    font-size: 36px;
    font-weight: 200;
    color: #6D28D9;
    letter-spacing: -0.02em;
  }
  
  .stat-label {
    font-size: 9px;
    font-weight: 500;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #6b7280;
    margin-top: 5px;
  }
  
  /* Section */
  .section {
    margin-bottom: 30px;
  }
  
  .section-title {
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #6D28D9;
    margin-bottom: 15px;
    padding-bottom: 8px;
    border-bottom: 2px solid #e5e7eb;
  }
  
  /* Table */
  .table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }
  
  .table th {
    background: linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%);
    color: white;
    padding: 12px 15px;
    text-align: left;
    font-weight: 500;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    font-size: 9px;
  }
  
  .table td {
    padding: 12px 15px;
    border-bottom: 1px solid #e5e7eb;
    font-weight: 300;
  }
  
  .table tr:nth-child(even) {
    background: #f9fafb;
  }
  
  /* Progress Bar */
  .progress-bar {
    width: 100%;
    height: 8px;
    background: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }
  
  /* Risk Matrix */
  .risk-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 500;
    color: white;
  }
  
  /* Maturity Badge */
  .maturity-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 500;
    color: white;
  }
  
  /* Recommendations */
  .recommendation-list {
    list-style: none;
  }
  
  .recommendation-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #f3f4f6;
    font-weight: 300;
    font-size: 11px;
  }
  
  .recommendation-icon {
    width: 20px;
    height: 20px;
    background: linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 10px;
    flex-shrink: 0;
  }
  
  /* Footer */
  .footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #f9fafb;
    padding: 15px 40px;
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: #6b7280;
    font-weight: 300;
    border-top: 1px solid #e5e7eb;
  }
  
  .footer-left, .footer-right {
    line-height: 1.5;
  }
  
  .footer-right {
    text-align: right;
  }
  
  /* Action Plan Priority */
  .priority-alta {
    background: #dc2626;
    color: white;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 9px;
    font-weight: 500;
  }
  
  .priority-media {
    background: #f97316;
    color: white;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 9px;
    font-weight: 500;
  }
  
  .priority-baixa {
    background: #22c55e;
    color: white;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 9px;
    font-weight: 500;
  }
`;

export function generateComplianceReportHTML(data: ComplianceReportData): string {
  const domainsRows = data.domains.map(domain => `
    <tr>
      <td>${domain.name}</td>
      <td>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${domain.score}%; background: ${getMaturityColor(domain.maturity)};"></div>
        </div>
      </td>
      <td style="text-align: center;">${domain.score.toFixed(0)}%</td>
      <td style="text-align: center;">
        <span class="maturity-badge" style="background: ${getMaturityColor(domain.maturity)};">
          Nível ${domain.maturity}
        </span>
      </td>
      <td style="text-align: center;">${domain.questionsAnswered}/${domain.totalQuestions}</td>
    </tr>
  `).join('');

  const recommendationsItems = data.recommendations.map((rec, i) => `
    <li class="recommendation-item">
      <span class="recommendation-icon">${i + 1}</span>
      <span>${rec}</span>
    </li>
  `).join('');

  const actionPlanRows = data.actionPlan.map(action => `
    <tr>
      <td><span class="priority-${action.priority.toLowerCase()}">${action.priority}</span></td>
      <td>${action.action}</td>
      <td>${action.domain}</td>
      <td>${action.deadline}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Relatório de Conformidade PPPD</title>
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="page">
        <!-- Header -->
        <div class="header">
          <div class="header-content">
            <div class="header-left">
              <div class="header-badge">Relatório de Conformidade</div>
              <h1 class="header-title">Programa de Auditoria e</h1>
              <h2 class="header-subtitle">Conformidade Operacional</h2>
            </div>
            <div class="header-right">
              <div class="header-date">
                <strong>${data.organizationName}</strong><br>
                ${data.assessmentDate}<br>
                Framework: ${data.framework}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Stats Grid -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${data.overallScore.toFixed(0)}%</div>
            <div class="stat-label">Score Geral</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color: ${getMaturityColor(data.maturityLevel)};">${data.maturityLevel}</div>
            <div class="stat-label">Nível Maturidade</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${data.domains.length}</div>
            <div class="stat-label">Domínios</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color: ${getRiskColor(data.riskLevel)};">●</div>
            <div class="stat-label">Risco ${data.riskLevel}</div>
          </div>
        </div>
        
        <!-- Domains Table -->
        <div class="section">
          <h3 class="section-title">Avaliação por Domínio</h3>
          <table class="table">
            <thead>
              <tr>
                <th style="width: 30%;">Domínio</th>
                <th style="width: 25%;">Progresso</th>
                <th style="width: 15%; text-align: center;">Score</th>
                <th style="width: 15%; text-align: center;">Maturidade</th>
                <th style="width: 15%; text-align: center;">Questões</th>
              </tr>
            </thead>
            <tbody>
              ${domainsRows}
            </tbody>
          </table>
        </div>
        
        <!-- Recommendations -->
        <div class="section">
          <h3 class="section-title">Recomendações Prioritárias</h3>
          <ul class="recommendation-list">
            ${recommendationsItems}
          </ul>
        </div>
      </div>
      
      <div class="page">
        <!-- Header Page 2 -->
        <div class="header" style="margin-bottom: 20px;">
          <div class="header-content">
            <div class="header-left">
              <div class="header-badge">Plano de Ação</div>
              <h1 class="header-title">Ações Corretivas</h1>
              <h2 class="header-subtitle">Priorizadas por Criticidade</h2>
            </div>
            <div class="header-right">
              <div class="header-date">
                <strong>${data.organizationName}</strong><br>
                ${data.assessmentDate}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Action Plan Table -->
        <div class="section">
          <h3 class="section-title">Plano de Ação Detalhado</h3>
          <table class="table">
            <thead>
              <tr>
                <th style="width: 12%;">Prioridade</th>
                <th style="width: 48%;">Ação</th>
                <th style="width: 25%;">Domínio</th>
                <th style="width: 15%;">Prazo</th>
              </tr>
            </thead>
            <tbody>
              ${actionPlanRows}
            </tbody>
          </table>
        </div>
        
        <!-- Consultant Info -->
        <div class="section" style="margin-top: 40px; padding: 20px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(109, 40, 217, 0.05) 100%); border-radius: 12px;">
          <p style="font-size: 11px; font-weight: 300; margin-bottom: 10px;">
            <strong style="font-weight: 500;">Responsável pela Avaliação:</strong> ${data.consultantName}
          </p>
          <p style="font-size: 11px; font-weight: 300;">
            <strong style="font-weight: 500;">Contato:</strong> ${data.consultantEmail}
          </p>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <div class="footer-left">
          Seusdados Consultoria em Gestão de Dados Limitada<br>
          Rua Eduardo Tomanik, 121, salas 10 e 11, Chácara Urbana, Jundiaí-SP<br>
          CNPJ 33.899.116/0001-63 | Responsável Técnico: Marcelo Fattori
        </div>
        <div class="footer-right">
          seusdados.com | dpo@seusdados.com<br>
          +55 11 4040 5552
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateThirdPartyReportHTML(data: ThirdPartyReportData): string {
  const categoriesRows = data.categories.map(cat => `
    <tr>
      <td>${cat.name}</td>
      <td>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${cat.percentage}%; background: linear-gradient(90deg, #6D28D9, #8B5CF6);"></div>
        </div>
      </td>
      <td style="text-align: center;">${cat.score}/${cat.maxScore}</td>
      <td style="text-align: center;">${cat.percentage.toFixed(0)}%</td>
    </tr>
  `).join('');

  const findingsItems = data.criticalFindings.map((finding, i) => `
    <li class="recommendation-item">
      <span class="recommendation-icon" style="background: #dc2626;">!</span>
      <span>${finding}</span>
    </li>
  `).join('');

  const recommendationsItems = data.recommendations.map((rec, i) => `
    <li class="recommendation-item">
      <span class="recommendation-icon">${i + 1}</span>
      <span>${rec}</span>
    </li>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Relatório Due Diligence - ${data.thirdPartyName}</title>
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="page">
        <!-- Header -->
        <div class="header">
          <div class="header-content">
            <div class="header-left">
              <div class="header-badge">Due Diligence de Terceiros</div>
              <h1 class="header-title">Avaliação de Riscos</h1>
              <h2 class="header-subtitle">${data.thirdPartyName}</h2>
            </div>
            <div class="header-right">
              <div class="header-date">
                <strong>${data.organizationName}</strong><br>
                ${data.assessmentDate}<br>
                Tipo: ${data.thirdPartyType}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Stats Grid -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value" style="color: ${getRiskColor(data.riskClassification)};">${data.overallRiskScore}</div>
            <div class="stat-label">Score de Risco</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${data.probabilityScore}</div>
            <div class="stat-label">Probabilidade</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${data.impactScore}</div>
            <div class="stat-label">Impacto</div>
          </div>
          <div class="stat-card">
            <span class="risk-badge" style="background: ${getRiskColor(data.riskClassification)}; font-size: 14px; padding: 8px 16px;">
              ${data.riskClassification}
            </span>
            <div class="stat-label" style="margin-top: 8px;">Classificação</div>
          </div>
        </div>
        
        <!-- Risk Matrix Visual -->
        <div class="section">
          <h3 class="section-title">Matriz de Risco 5×5</h3>
          <div style="display: flex; gap: 30px; align-items: center; padding: 20px; background: #f9fafb; border-radius: 12px;">
            <div style="flex: 1;">
              <p style="font-size: 11px; font-weight: 300; margin-bottom: 15px;">
                A avaliação de risco considera a <strong style="font-weight: 500;">probabilidade</strong> de ocorrência 
                de incidentes e o <strong style="font-weight: 500;">impacto</strong> potencial nas operações da organização.
              </p>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <p style="font-size: 10px; font-weight: 500; color: #6D28D9; margin-bottom: 5px;">PROBABILIDADE</p>
                  <p style="font-size: 24px; font-weight: 200; color: #1f2937;">${data.probabilityScore}/5</p>
                </div>
                <div>
                  <p style="font-size: 10px; font-weight: 500; color: #6D28D9; margin-bottom: 5px;">IMPACTO</p>
                  <p style="font-size: 24px; font-weight: 200; color: #1f2937;">${data.impactScore}/5</p>
                </div>
              </div>
            </div>
            <div style="width: 150px; height: 150px; background: linear-gradient(135deg, ${getRiskColor(data.riskClassification)}22, ${getRiskColor(data.riskClassification)}44); border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 3px solid ${getRiskColor(data.riskClassification)};">
              <span style="font-size: 32px; font-weight: 200; color: ${getRiskColor(data.riskClassification)};">${data.overallRiskScore}</span>
              <span style="font-size: 10px; font-weight: 500; color: #6b7280; letter-spacing: 0.1em;">RISCO</span>
            </div>
          </div>
        </div>
        
        <!-- Categories Table -->
        <div class="section">
          <h3 class="section-title">Avaliação por Categoria</h3>
          <table class="table">
            <thead>
              <tr>
                <th style="width: 35%;">Categoria</th>
                <th style="width: 30%;">Progresso</th>
                <th style="width: 17%; text-align: center;">Pontuação</th>
                <th style="width: 18%; text-align: center;">Percentual</th>
              </tr>
            </thead>
            <tbody>
              ${categoriesRows}
            </tbody>
          </table>
        </div>
        
        ${data.criticalFindings.length > 0 ? `
        <!-- Critical Findings -->
        <div class="section">
          <h3 class="section-title" style="color: #dc2626;">Achados Críticos</h3>
          <ul class="recommendation-list">
            ${findingsItems}
          </ul>
        </div>
        ` : ''}
        
        <!-- Recommendations -->
        <div class="section">
          <h3 class="section-title">Recomendações</h3>
          <ul class="recommendation-list">
            ${recommendationsItems}
          </ul>
        </div>
        
        <!-- Consultant Info -->
        <div class="section" style="margin-top: 30px; padding: 20px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(109, 40, 217, 0.05) 100%); border-radius: 12px;">
          <p style="font-size: 11px; font-weight: 300; margin-bottom: 10px;">
            <strong style="font-weight: 500;">Responsável pela Avaliação:</strong> ${data.consultantName}
          </p>
          <p style="font-size: 11px; font-weight: 300;">
            <strong style="font-weight: 500;">Contato:</strong> ${data.consultantEmail}
          </p>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <div class="footer-left">
          Seusdados Consultoria em Gestão de Dados Limitada<br>
          Rua Eduardo Tomanik, 121, salas 10 e 11, Chácara Urbana, Jundiaí-SP<br>
          CNPJ 33.899.116/0001-63 | Responsável Técnico: Marcelo Fattori
        </div>
        <div class="footer-right">
          seusdados.com | dpo@seusdados.com<br>
          +55 11 4040 5552
        </div>
      </div>
    </body>
    </html>
  `;
}

// Função auxiliar para gerar PDF a partir de dados estruturados usando PDFKit
export async function generatePDF(html: string): Promise<Buffer> {
  // Extrair dados do HTML para gerar PDF com PDFKit
  // Como o HTML já contém os dados formatados, vamos criar um PDF simples
  // que renderiza o conteúdo de forma estruturada
  
  return new Promise((resolve, reject) => {
    try {
      // Configurar PDFDocument com buffer de todas as páginas para permitir switchToPage
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 70, left: 50, right: 50 },
        bufferPages: true, // Manter todas as páginas em buffer
        info: {
          Title: 'Relatório Seusdados',
          Author: 'Seusdados Consultoria',
          Creator: 'Seusdados Due Diligence Platform'
        }
      });
      
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Extrair texto do HTML removendo tags
      const textContent = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')
        .replace(/<[^>]+>/g, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n\s*\n/g, '\n\n')
        .trim();
      
      // Header com gradiente simulado
      doc.rect(0, 0, 595, 120).fill('#7c3aed');
      
      // Logo/Título
      doc.fontSize(28).fillColor('#ffffff').font('Helvetica-Bold');
      doc.text('SEUSDADOS', 50, 40);
      doc.fontSize(12).font('Helvetica').fillColor('#e9d5ff');
      doc.text('Consultoria em Proteção de Dados', 50, 75);
      
      // Conteúdo
      doc.fillColor('#1f2937');
      doc.moveDown(4);
      
      // Processar conteúdo em seções
      const lines = textContent.split('\n').filter(line => line.trim());
      let y = 140;
      
      for (const line of lines) {
        if (y > 720) { // Deixar espaço para o rodapé
          doc.addPage();
          y = 50;
        }
        
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // Detectar títulos (linhas em maiúsculas ou curtas)
        if (trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length < 50 && trimmedLine.length > 3) {
          doc.fontSize(14).font('Helvetica-Bold').fillColor('#7c3aed');
          doc.text(trimmedLine, 50, y, { width: 495 });
          y += 25;
        } else if (trimmedLine.includes(':') && trimmedLine.indexOf(':') < 30) {
          // Linhas com label: valor
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#374151');
          const [label, ...rest] = trimmedLine.split(':');
          doc.text(label + ':', 50, y, { continued: true });
          doc.font('Helvetica').fillColor('#1f2937');
          doc.text(' ' + rest.join(':'), { width: 495 });
          y += 18;
        } else {
          // Texto normal
          doc.fontSize(10).font('Helvetica').fillColor('#1f2937');
          const textHeight = doc.heightOfString(trimmedLine, { width: 495 });
          doc.text(trimmedLine, 50, y, { width: 495 });
          y += textHeight + 5;
        }
      }
      
      // Rodapé - adicionar em todas as páginas
      const range = doc.bufferedPageRange();
      const totalPages = range.count;
      
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(range.start + i);
        doc.fontSize(8).fillColor('#9ca3af');
        doc.text(
          `Página ${i + 1} de ${totalPages} | Gerado por Seusdados Due Diligence Platform`,
          50,
          doc.page.height - 40,
          { align: 'center', width: 495 }
        );
      }
      
      // Finalizar o documento
      doc.flushPages();
      doc.end();
    } catch (err) {
      reject(new Error(`Erro ao gerar PDF: ${err}`));
    }
  });
}


// ==================== ACTION PLAN PDF ====================

export interface ActionPlanReportData {
  title: string;
  organizationName: string;
  generatedAt: string;
  content: string;
  parsedPlan: {
    summary: string;
    actions: {
      title: string;
      description: string;
      priority: "critica" | "alta" | "media" | "baixa";
      estimatedDays: number;
      responsibleRole: string;
      resources?: string;
      successCriteria?: string;
      dependencies?: string;
    }[];
    recommendations: string[];
    totalEstimatedDays: number;
    executiveSummary?: string;
    relationshipRecommendation?: string;
  };
}

const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    'critica': '#dc2626',
    'alta': '#f97316',
    'media': '#eab308',
    'baixa': '#22c55e'
  };
  return colors[priority] || '#6b7280';
};

const getPriorityLabel = (priority: string): string => {
  const labels: Record<string, string> = {
    'critica': 'Crítica',
    'alta': 'Alta',
    'media': 'Média',
    'baixa': 'Baixa'
  };
  return labels[priority] || priority;
};

export function generateActionPlanHTML(data: ActionPlanReportData): string {
  const actionsRows = data.parsedPlan.actions.map((action, index) => `
    <div style="margin-bottom: 20px; padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid ${getPriorityColor(action.priority)};">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
        <div style="flex: 1;">
          <span style="font-size: 10px; font-weight: 500; color: #6b7280; letter-spacing: 0.05em;">AÇÃO ${index + 1}</span>
          <h4 style="font-size: 13px; font-weight: 500; color: #1e293b; margin-top: 4px;">${action.title}</h4>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span style="padding: 4px 10px; background: ${getPriorityColor(action.priority)}22; color: ${getPriorityColor(action.priority)}; border-radius: 12px; font-size: 10px; font-weight: 500;">
            ${getPriorityLabel(action.priority)}
          </span>
          <span style="padding: 4px 10px; background: #e2e8f0; color: #475569; border-radius: 12px; font-size: 10px; font-weight: 500;">
            ${action.estimatedDays} dias
          </span>
        </div>
      </div>
      <p style="font-size: 11px; font-weight: 300; color: #475569; line-height: 1.5; margin-bottom: 10px;">
        ${action.description}
      </p>
      <div style="display: flex; flex-wrap: wrap; gap: 16px; font-size: 10px; color: #64748b;">
        <div>
          <strong style="font-weight: 500;">Responsável:</strong> ${action.responsibleRole}
        </div>
        ${action.resources ? `<div><strong style="font-weight: 500;">Recursos:</strong> ${action.resources}</div>` : ''}
        ${action.successCriteria ? `<div><strong style="font-weight: 500;">Critérios de Sucesso:</strong> ${action.successCriteria}</div>` : ''}
        ${action.dependencies ? `<div><strong style="font-weight: 500;">Dependências:</strong> ${action.dependencies}</div>` : ''}
      </div>
    </div>
  `).join('');

  const recommendationsItems = data.parsedPlan.recommendations.map(rec => `
    <li style="margin-bottom: 8px; font-size: 11px; font-weight: 300; color: #475569; line-height: 1.5;">
      ${rec}
    </li>
  `).join('');

  // Contar ações por prioridade
  const priorityCounts = {
    critica: data.parsedPlan.actions.filter(a => a.priority === 'critica').length,
    alta: data.parsedPlan.actions.filter(a => a.priority === 'alta').length,
    media: data.parsedPlan.actions.filter(a => a.priority === 'media').length,
    baixa: data.parsedPlan.actions.filter(a => a.priority === 'baixa').length,
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        ${baseStyles}
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <div class="header-content">
          <div class="logo-section">
            <div class="logo">seusdados</div>
            <div class="logo-subtitle">CONSULTORIA EM GESTÃO DE DADOS</div>
          </div>
          <div class="report-type">
            <span style="font-size: 10px; font-weight: 500; letter-spacing: 0.1em; color: #f59e0b;">PLANO DE AÇÃO</span>
            <span style="font-size: 9px; font-weight: 300; color: #94a3b8; margin-top: 4px; display: block;">Gerado por IA</span>
          </div>
        </div>
      </div>
      
      <!-- Content -->
      <div class="content">
        <!-- Title Section -->
        <div class="section">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h1 style="font-size: 20px; font-weight: 200; color: #1e293b; margin-bottom: 8px;">${data.title}</h1>
              <p style="font-size: 12px; font-weight: 300; color: #64748b;">
                ${data.organizationName} • Gerado em ${data.generatedAt}
              </p>
            </div>
          </div>
        </div>
        
        <!-- Summary Cards -->
        <div class="section" style="display: flex; gap: 16px; margin-bottom: 24px;">
          <div style="flex: 1; padding: 16px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(109, 40, 217, 0.05) 100%); border-radius: 12px; text-align: center;">
            <span style="font-size: 28px; font-weight: 200; color: #7c3aed;">${data.parsedPlan.actions.length}</span>
            <span style="display: block; font-size: 10px; font-weight: 500; color: #6b7280; letter-spacing: 0.05em; margin-top: 4px;">AÇÕES</span>
          </div>
          <div style="flex: 1; padding: 16px; background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%); border-radius: 12px; text-align: center;">
            <span style="font-size: 28px; font-weight: 200; color: #f59e0b;">${data.parsedPlan.totalEstimatedDays}</span>
            <span style="display: block; font-size: 10px; font-weight: 500; color: #6b7280; letter-spacing: 0.05em; margin-top: 4px;">DIAS ESTIMADOS</span>
          </div>
          <div style="flex: 1; padding: 16px; background: linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(185, 28, 28, 0.05) 100%); border-radius: 12px; text-align: center;">
            <span style="font-size: 28px; font-weight: 200; color: #dc2626;">${priorityCounts.critica}</span>
            <span style="display: block; font-size: 10px; font-weight: 500; color: #6b7280; letter-spacing: 0.05em; margin-top: 4px;">CRÍTICAS</span>
          </div>
          <div style="flex: 1; padding: 16px; background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.05) 100%); border-radius: 12px; text-align: center;">
            <span style="font-size: 28px; font-weight: 200; color: #22c55e;">${priorityCounts.baixa + priorityCounts.media}</span>
            <span style="display: block; font-size: 10px; font-weight: 500; color: #6b7280; letter-spacing: 0.05em; margin-top: 4px;">BAIXA/MÉDIA</span>
          </div>
        </div>
        
        ${data.parsedPlan.executiveSummary ? `
        <!-- Executive Summary -->
        <div class="section">
          <h3 class="section-title">Resumo Executivo</h3>
          <p style="font-size: 11px; font-weight: 300; color: #475569; line-height: 1.6;">
            ${data.parsedPlan.executiveSummary}
          </p>
        </div>
        ` : ''}
        
        ${data.parsedPlan.relationshipRecommendation ? `
        <!-- Relationship Recommendation -->
        <div class="section" style="padding: 16px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%); border-radius: 12px; margin-bottom: 24px;">
          <h4 style="font-size: 11px; font-weight: 500; color: #3b82f6; margin-bottom: 8px;">Recomendação sobre o Relacionamento</h4>
          <p style="font-size: 12px; font-weight: 400; color: #1e40af;">
            ${data.parsedPlan.relationshipRecommendation}
          </p>
        </div>
        ` : ''}
        
        <!-- Priority Distribution -->
        <div class="section" style="margin-bottom: 24px;">
          <h3 class="section-title">Distribuição por Prioridade</h3>
          <div style="display: flex; gap: 8px; margin-top: 12px;">
            ${priorityCounts.critica > 0 ? `
            <div style="flex: ${priorityCounts.critica}; height: 24px; background: ${getPriorityColor('critica')}; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 10px; font-weight: 500; color: white;">${priorityCounts.critica} Críticas</span>
            </div>
            ` : ''}
            ${priorityCounts.alta > 0 ? `
            <div style="flex: ${priorityCounts.alta}; height: 24px; background: ${getPriorityColor('alta')}; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 10px; font-weight: 500; color: white;">${priorityCounts.alta} Altas</span>
            </div>
            ` : ''}
            ${priorityCounts.media > 0 ? `
            <div style="flex: ${priorityCounts.media}; height: 24px; background: ${getPriorityColor('media')}; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 10px; font-weight: 500; color: #1e293b;">${priorityCounts.media} Médias</span>
            </div>
            ` : ''}
            ${priorityCounts.baixa > 0 ? `
            <div style="flex: ${priorityCounts.baixa}; height: 24px; background: ${getPriorityColor('baixa')}; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 10px; font-weight: 500; color: white;">${priorityCounts.baixa} Baixas</span>
            </div>
            ` : ''}
          </div>
        </div>
        
        <!-- Actions -->
        <div class="section">
          <h3 class="section-title">Ações Detalhadas</h3>
          ${actionsRows}
        </div>
        
        ${data.parsedPlan.recommendations.length > 0 ? `
        <!-- Recommendations -->
        <div class="section">
          <h3 class="section-title">Recomendações Gerais</h3>
          <ul class="recommendation-list">
            ${recommendationsItems}
          </ul>
        </div>
        ` : ''}
        
        <!-- Disclaimer -->
        <div class="section" style="margin-top: 30px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
          <p style="font-size: 9px; font-weight: 300; color: #64748b; line-height: 1.5;">
            <strong style="font-weight: 500;">Nota:</strong> Este plano de ação foi gerado com auxílio de Inteligência Artificial com base nos dados da avaliação. 
            As recomendações devem ser validadas por profissionais qualificados antes da implementação. 
            A Seusdados Consultoria não se responsabiliza por decisões tomadas exclusivamente com base neste documento sem a devida análise profissional.
          </p>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <div class="footer-left">
          Seusdados Consultoria em Gestão de Dados Limitada<br>
          Rua Eduardo Tomanik, 121, salas 10 e 11, Chácara Urbana, Jundiaí-SP<br>
          CNPJ 33.899.116/0001-63 | Responsável Técnico: Marcelo Fattori
        </div>
        <div class="footer-right">
          seusdados.com | dpo@seusdados.com<br>
          +55 11 4040 5552
        </div>
      </div>
    </body>
    </html>
  `;
}


// Interface para exportação de cláusulas LGPD
export interface ClausesExportData {
  contractTitle: string;
  contractObject?: string;
  analysisDate: string;
  fileName: string;
  version: number;
  parties: {
    name: string;
    cnpj?: string;
    role: string;
  }[];
  clauses: {
    number: number;
    title: string;
    content: string;
    bloco?: string;
  }[];
  consultantName?: string;
}

// Função para gerar PDF das cláusulas LGPD
export async function generateClausesPdf(data: ClausesExportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 60, bottom: 60, left: 60, right: 60 },
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Registrar fontes
      const fontPath = '/usr/share/fonts/truetype/dejavu/';
      
      // Cores
      const primaryColor = '#0f766e'; // Emerald-700
      const secondaryColor = '#334155'; // Slate-700
      const lightGray = '#f1f5f9';

      // ===== FOLHA DE ROSTO =====
      doc.rect(0, 0, doc.page.width, 200).fill(primaryColor);
      
      // Título principal
      doc.fillColor('white')
         .fontSize(28)
         .text('ACORDO PARA PROCESSAMENTO', 60, 80, { align: 'center' })
         .text('DE DADOS PESSOAIS', 60, 115, { align: 'center' });
      
      doc.fontSize(12)
         .text('Data Processing Agreement (DPA)', 60, 155, { align: 'center' });

      // Informações de versão
      doc.fillColor(secondaryColor)
         .fontSize(10)
         .text(`Versão ${data.version}.0 • ${new Date(data.analysisDate).toLocaleDateString('pt-BR')}`, 60, 220, { align: 'center' });

      // Seção: Identificação das Partes
      doc.moveDown(2);
      doc.fillColor(primaryColor)
         .fontSize(14)
         .text('IDENTIFICAÇÃO DAS PARTES', 60, 280);
      
      doc.moveTo(60, 300).lineTo(535, 300).stroke(primaryColor);

      let yPos = 320;
      data.parties.forEach((party, index) => {
        doc.rect(60, yPos, 475, 60).fill(lightGray);
        doc.fillColor(primaryColor)
           .fontSize(10)
           .text(party.role.toUpperCase(), 75, yPos + 10);
        doc.fillColor(secondaryColor)
           .fontSize(12)
           .text(party.name, 75, yPos + 28);
        if (party.cnpj) {
          doc.fontSize(10)
             .text(`CNPJ: ${party.cnpj}`, 75, yPos + 45);
        }
        yPos += 70;
      });

      // Seção: Informações do Contrato
      yPos += 20;
      doc.fillColor(primaryColor)
         .fontSize(14)
         .text('INFORMAÇÕES DO CONTRATO', 60, yPos);
      
      doc.moveTo(60, yPos + 20).lineTo(535, yPos + 20).stroke(primaryColor);

      yPos += 40;
      doc.rect(60, yPos, 475, 100).fill(lightGray);
      
      doc.fillColor(secondaryColor)
         .fontSize(10)
         .text('TÍTULO DO CONTRATO', 75, yPos + 10);
      doc.fontSize(11)
         .text(data.contractTitle, 75, yPos + 25);
      
      if (data.contractObject) {
        doc.fontSize(10)
           .text('OBJETO', 75, yPos + 50);
        doc.fontSize(11)
           .text(data.contractObject, 75, yPos + 65, { width: 445 });
      }

      doc.fontSize(10)
         .text('ARQUIVO ANALISADO', 300, yPos + 10);
      doc.fontSize(11)
         .text(data.fileName, 300, yPos + 25, { width: 220 });

      // Rodapé da folha de rosto
      doc.fillColor('#94a3b8')
         .fontSize(8)
         .text('Documento gerado automaticamente pela plataforma Seusdados Due Diligence', 60, 750, { align: 'center' });

      // ===== PÁGINAS DE CLÁUSULAS =====
      doc.addPage();

      // Título da seção de cláusulas
      doc.fillColor(primaryColor)
         .fontSize(20)
         .text('CLÁUSULAS DO ACORDO', 60, 60, { align: 'center' });
      
      doc.fillColor(secondaryColor)
         .fontSize(10)
         .text('Acordo para Processamento de Dados Pessoais', 60, 90, { align: 'center' });

      doc.moveTo(60, 110).lineTo(535, 110).stroke(primaryColor);

      yPos = 140;

      // Renderizar cada cláusula
      data.clauses.forEach((clause, index) => {
        // Verificar se precisa de nova página
        if (yPos > 700) {
          doc.addPage();
          yPos = 60;
        }

        // Número e título da cláusula
        doc.fillColor(primaryColor)
           .fontSize(12)
           .text(`CLÁUSULA ${clause.number} - ${clause.title.toUpperCase()}`, 60, yPos);
        
        yPos += 25;

        // Conteúdo da cláusula (remover markdown)
        const cleanContent = clause.content
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .replace(/#{1,6}\s/g, '')
          .replace(/\n\n/g, '\n');

        doc.fillColor(secondaryColor)
           .fontSize(10)
           .text(cleanContent, 60, yPos, { 
             width: 475,
             align: 'justify',
             lineGap: 4
           });

        yPos = doc.y + 30;
      });

      // Rodapé com número de página
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fillColor('#94a3b8')
           .fontSize(8)
           .text(`Página ${i + 1} de ${pages.count}`, 60, 780, { align: 'center' });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}


// Função para gerar Word (.docx) das cláusulas LGPD
export async function generateClausesWord(data: ClausesExportData): Promise<Buffer> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType } = await import('docx');
  
  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: 'Title',
          name: 'Title',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            size: 56,
            bold: true,
            color: '0f766e',
          },
          paragraph: {
            spacing: { after: 300 },
            alignment: AlignmentType.CENTER,
          },
        },
        {
          id: 'Subtitle',
          name: 'Subtitle',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            size: 24,
            color: '64748b',
          },
          paragraph: {
            spacing: { after: 400 },
            alignment: AlignmentType.CENTER,
          },
        },
        {
          id: 'ClauseTitle',
          name: 'Clause Title',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            size: 26,
            bold: true,
            color: '0f766e',
          },
          paragraph: {
            spacing: { before: 400, after: 200 },
          },
        },
        {
          id: 'ClauseContent',
          name: 'Clause Content',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            size: 22,
            color: '334155',
          },
          paragraph: {
            spacing: { after: 200 },
            alignment: AlignmentType.BOTH,
          },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: [
          // Título principal
          new Paragraph({
            text: 'ACORDO PARA PROCESSAMENTO',
            style: 'Title',
          }),
          new Paragraph({
            text: 'DE DADOS PESSOAIS',
            style: 'Title',
          }),
          new Paragraph({
            text: 'Data Processing Agreement (DPA)',
            style: 'Subtitle',
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Versão ${data.version}.0 • ${new Date(data.analysisDate).toLocaleDateString('pt-BR')}`,
                size: 20,
                color: '94a3b8',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
          }),
          
          // Identificação das Partes
          new Paragraph({
            text: 'IDENTIFICAÇÃO DAS PARTES',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          ...data.parties.flatMap((party) => [
            new Paragraph({
              children: [
                new TextRun({
                  text: party.role.toUpperCase(),
                  bold: true,
                  color: '0f766e',
                  size: 20,
                }),
              ],
              spacing: { before: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: party.name,
                  size: 24,
                }),
              ],
            }),
            ...(party.cnpj ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `CNPJ: ${party.cnpj}`,
                    size: 20,
                    color: '64748b',
                  }),
                ],
                spacing: { after: 200 },
              }),
            ] : []),
          ]),
          
          // Informações do Contrato
          new Paragraph({
            text: 'INFORMAÇÕES DO CONTRATO',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Título: ', bold: true, size: 22 }),
              new TextRun({ text: data.contractTitle, size: 22 }),
            ],
          }),
          ...(data.contractObject ? [
            new Paragraph({
              children: [
                new TextRun({ text: 'Objeto: ', bold: true, size: 22 }),
                new TextRun({ text: data.contractObject, size: 22 }),
              ],
            }),
          ] : []),
          new Paragraph({
            children: [
              new TextRun({ text: 'Arquivo Analisado: ', bold: true, size: 22 }),
              new TextRun({ text: data.fileName, size: 22 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Data da Análise: ', bold: true, size: 22 }),
              new TextRun({ text: new Date(data.analysisDate).toLocaleDateString('pt-BR'), size: 22 }),
            ],
            spacing: { after: 600 },
          }),
          
          // Quebra de página antes das cláusulas
          new Paragraph({
            text: '',
            pageBreakBefore: true,
          }),
          
          // Título da seção de cláusulas
          new Paragraph({
            text: 'CLÁUSULAS DO ACORDO',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          
          // Cláusulas
          ...data.clauses.flatMap((clause) => {
            const cleanContent = clause.content
              .replace(/\*\*/g, '')
              .replace(/\*/g, '')
              .replace(/#{1,6}\s/g, '');
            
            return [
              new Paragraph({
                text: `CLÁUSULA ${clause.number} - ${clause.title.toUpperCase()}`,
                style: 'ClauseTitle',
              }),
              new Paragraph({
                text: cleanContent,
                style: 'ClauseContent',
              }),
            ];
          }),
          
          // Espaço para assinaturas
          new Paragraph({
            text: '',
            pageBreakBefore: true,
          }),
          new Paragraph({
            text: 'ASSINATURAS',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
          }),
          ...data.parties.flatMap((party) => [
            new Paragraph({
              text: '_'.repeat(50),
              alignment: AlignmentType.CENTER,
              spacing: { before: 600 },
            }),
            new Paragraph({
              text: party.name,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: party.role,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
          ]),
          new Paragraph({
            children: [
              new TextRun({
                text: `Local e Data: _________________, ___ de ______________ de ${new Date().getFullYear()}`,
                size: 22,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 600 },
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}


// ==================== ACTIVITY REPORT PDF ====================

export interface ActivityReportData {
  userName: string;
  generatedAt: string;
  startDate: string;
  endDate: string;
  totalActions: number;
  actionCounts: Record<string, number>;
  dailyActivity: Record<string, number>;
  logs: {
    id: number;
    userId: number;
    userName: string;
    action: string;
    entityType: string;
    entityId: number;
    details: any;
    createdAt: string;
  }[];
}

const actionLabels: Record<string, string> = {
  'user_activated': 'Usuário Ativado',
  'user_deactivated': 'Usuário Desativado',
  'user_soft_delete': 'Usuário Removido',
  'user_created': 'Usuário Criado',
  'user_updated': 'Usuário Atualizado',
  'login': 'Login',
  'logout': 'Logout',
  'view': 'Visualização',
  'create': 'Criação',
  'update': 'Atualização',
  'delete': 'Exclusão',
};

export function generateActivityReportHTML(data: ActivityReportData): string {
  // Gerar linhas da tabela de logs
  const logsRows = data.logs.slice(0, 50).map(log => {
    const actionLabel = actionLabels[log.action] || log.action;
    const date = new Date(log.createdAt);
    const formattedDate = date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    return `
      <tr>
        <td>${formattedDate}</td>
        <td>${log.userName}</td>
        <td>${actionLabel}</td>
        <td>${log.entityType} #${log.entityId}</td>
      </tr>
    `;
  }).join('');

  // Gerar barras do gráfico de ações
  const maxActionCount = Math.max(...Object.values(data.actionCounts), 1);
  const actionBars = Object.entries(data.actionCounts).slice(0, 10).map(([action, count]) => {
    const percentage = (count / maxActionCount) * 100;
    const label = actionLabels[action] || action;
    return `
      <div style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="font-size: 11px; font-weight: 400;">${label}</span>
          <span style="font-size: 11px; font-weight: 500;">${count}</span>
        </div>
        <div style="height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
          <div style="height: 100%; width: ${percentage}%; background: linear-gradient(90deg, #6D28D9, #8B5CF6); border-radius: 4px;"></div>
        </div>
      </div>
    `;
  }).join('');

  // Gerar barras do gráfico de atividade diária
  const dailyEntries = Object.entries(data.dailyActivity).sort((a, b) => a[0].localeCompare(b[0])).slice(-14);
  const maxDailyCount = Math.max(...dailyEntries.map(([, v]) => v), 1);
  const dailyBars = dailyEntries.map(([date, count]) => {
    const height = (count / maxDailyCount) * 100;
    const formattedDate = new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return `
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <span style="font-size: 9px; color: #6b7280;">${count}</span>
        <div style="width: 100%; height: ${Math.max(height, 4)}px; background: linear-gradient(180deg, #6D28D9, #8B5CF6); border-radius: 4px 4px 0 0;"></div>
        <span style="font-size: 8px; color: #6b7280; transform: rotate(45deg); transform-origin: left; white-space: nowrap;">${formattedDate}</span>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Relatório de Atividades - Seusdados</title>
      <style>
        ${baseStyles}
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Header -->
        <div class="header">
          <div class="header-content">
            <div class="header-left">
              <div class="header-badge">Relatório de Atividades</div>
              <h1 class="header-title">Auditoria de Usuários</h1>
              <h2 class="header-subtitle">${data.userName}</h2>
            </div>
            <div class="header-right">
              <div class="header-date">
                <strong>Período:</strong> ${data.startDate} - ${data.endDate}<br>
                <strong>Gerado em:</strong> ${data.generatedAt}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Stats Grid -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${data.totalActions}</div>
            <div class="stat-label">Total de Ações</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${Object.keys(data.actionCounts).length}</div>
            <div class="stat-label">Tipos de Ações</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${Object.keys(data.dailyActivity).length}</div>
            <div class="stat-label">Dias com Atividade</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${Math.round(data.totalActions / Math.max(Object.keys(data.dailyActivity).length, 1))}</div>
            <div class="stat-label">Média Diária</div>
          </div>
        </div>
        
        <!-- Charts Section -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
          <div class="section">
            <h3 class="section-title">Distribuição por Tipo de Ação</h3>
            ${actionBars || '<p style="color: #6b7280; font-size: 11px;">Nenhum dado disponível</p>'}
          </div>
          <div class="section">
            <h3 class="section-title">Atividade Diária (últimos 14 dias)</h3>
            <div style="display: flex; align-items: flex-end; gap: 4px; height: 100px;">
              ${dailyBars || '<p style="color: #6b7280; font-size: 11px;">Nenhum dado disponível</p>'}
            </div>
          </div>
        </div>
        
        <!-- Logs Table -->
        <div class="section">
          <h3 class="section-title">Log de Atividades (últimos 50 registros)</h3>
          <table class="table">
            <thead>
              <tr>
                <th style="width: 20%;">Data/Hora</th>
                <th style="width: 25%;">Usuário</th>
                <th style="width: 25%;">Ação</th>
                <th style="width: 30%;">Entidade</th>
              </tr>
            </thead>
            <tbody>
              ${logsRows || '<tr><td colspan="4" style="text-align: center; color: #6b7280;">Nenhuma atividade registrada</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <div class="footer-left">
          Seusdados Consultoria em Gestão de Dados Limitada<br>
          Rua Eduardo Tomanik, 121, salas 10 e 11, Chácara Urbana, Jundiaí-SP<br>
          CNPJ 33.899.116/0001-63 | Responsável Técnico: Marcelo Fattori
        </div>
        <div class="footer-right">
          seusdados.com | dpo@seusdados.com<br>
          +55 11 4040 5552
        </div>
      </div>
    </body>
    </html>
  `;
}
