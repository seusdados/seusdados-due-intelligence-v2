/**
 * Sistema de Templates de Relatórios Premium
 * Design Visual Law com gráficos Chart.js e visual corporativo premium
 */

// ==================== ESTILOS BASE PREMIUM ====================

export const premiumStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700&display=swap');
  
  :root {
    --primary-gradient: linear-gradient(135deg, #2E1065 0%, #4C1D95 30%, #6D28D9 70%, #7C3AED 100%);
    --secondary-gradient: linear-gradient(135deg, #0EA5E9 0%, #2563EB 50%, #4F46E5 100%);
    --success-gradient: linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%);
    --warning-gradient: linear-gradient(135deg, #D97706 0%, #F59E0B 50%, #FBBF24 100%);
    --danger-gradient: linear-gradient(135deg, #DC2626 0%, #EF4444 50%, #F87171 100%);
    --neutral-gradient: linear-gradient(135deg, #374151 0%, #4B5563 50%, #6B7280 100%);
    
    --primary-color: #6D28D9;
    --primary-dark: #4C1D95;
    --primary-light: #8B5CF6;
    --accent-color: #FBBF24;
    --text-primary: #1F2937;
    --text-secondary: #6B7280;
    --text-muted: #9CA3AF;
    --border-color: #E5E7EB;
    --bg-light: #F9FAFB;
    --bg-card: #FFFFFF;
    
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    
    --radius-sm: 6px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-xl: 24px;
  }
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-weight: 300;
    color: var(--text-primary);
    line-height: 1.6;
    background: var(--bg-light);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  .report-container {
    max-width: 1200px;
    margin: 0 auto;
    background: white;
    box-shadow: var(--shadow-xl);
  }
  
  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 25mm 20mm;
    background: white;
    page-break-after: always;
    position: relative;
  }
  
  .page:last-child {
    page-break-after: avoid;
  }
  
  @media screen {
    .page {
      margin: 20px auto;
      box-shadow: var(--shadow-lg);
    }
  }
  
  @media print {
    .page {
      margin: 0;
      box-shadow: none;
    }
    
    .no-print {
      display: none !important;
    }
  }
  
  .report-header {
    background: var(--primary-gradient);
    margin: -25mm -20mm 30px -20mm;
    padding: 40px 40px 35px;
    color: white;
    position: relative;
    overflow: hidden;
  }
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    position: relative;
    z-index: 1;
  }
  
  .header-left {
    flex: 1;
  }
  
  .header-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.25);
    padding: 8px 18px;
    border-radius: 30px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-bottom: 20px;
  }
  
  .header-title {
    font-size: 32px;
    font-weight: 200;
    letter-spacing: -0.03em;
    margin-bottom: 8px;
    line-height: 1.2;
  }
  
  .header-subtitle {
    font-size: 18px;
    font-weight: 400;
    color: var(--accent-color);
    letter-spacing: 0.02em;
  }
  
  .header-right {
    text-align: right;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 12px;
  }
  
  .header-logo {
    height: 45px;
    filter: brightness(0) invert(1);
  }
  
  .header-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    font-weight: 300;
    opacity: 0.85;
  }
  
  .header-meta-item {
    display: flex;
    align-items: center;
    gap: 6px;
    justify-content: flex-end;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 35px;
  }
  
  .stats-grid-3 {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .stats-grid-5 {
    grid-template-columns: repeat(5, 1fr);
  }
  
  .stat-card {
    background: var(--bg-light);
    border-radius: var(--radius-lg);
    padding: 24px 20px;
    text-align: center;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--border-color);
  }
  
  .stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--primary-gradient);
  }
  
  .stat-card.success::before { background: var(--success-gradient); }
  .stat-card.warning::before { background: var(--warning-gradient); }
  .stat-card.danger::before { background: var(--danger-gradient); }
  .stat-card.info::before { background: var(--secondary-gradient); }
  
  .stat-value {
    font-size: 38px;
    font-weight: 200;
    color: var(--primary-color);
    letter-spacing: -0.03em;
    line-height: 1;
    margin-bottom: 8px;
  }
  
  .stat-value.success { color: #059669; }
  .stat-value.warning { color: #D97706; }
  .stat-value.danger { color: #DC2626; }
  .stat-value.info { color: #0EA5E9; }
  
  .stat-label {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--text-secondary);
  }
  
  .stat-sublabel {
    font-size: 11px;
    font-weight: 400;
    color: var(--text-muted);
    margin-top: 4px;
  }
  
  .section {
    margin-bottom: 35px;
  }
  
  .section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 2px solid var(--border-color);
  }
  
  .section-icon {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--primary-gradient);
    border-radius: var(--radius-md);
    color: white;
  }
  
  .section-title {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--primary-color);
    flex: 1;
  }
  
  .section-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 20px;
    background: rgba(109, 40, 217, 0.1);
    color: var(--primary-color);
  }
  
  .card {
    background: white;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }
  
  .card-header {
    padding: 18px 24px;
    background: var(--bg-light);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .card-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
  }
  
  .card-body {
    padding: 24px;
  }
  
  .table-container {
    overflow-x: auto;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
  }
  
  .table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  
  .table th {
    background: var(--bg-light);
    padding: 14px 16px;
    text-align: left;
    font-weight: 600;
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-secondary);
    border-bottom: 2px solid var(--border-color);
  }
  
  .table td {
    padding: 14px 16px;
    border-bottom: 1px solid var(--border-color);
    vertical-align: middle;
  }
  
  .table tr:last-child td {
    border-bottom: none;
  }
  
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  
  .badge-success {
    background: rgba(5, 150, 105, 0.1);
    color: #059669;
  }
  
  .badge-warning {
    background: rgba(217, 119, 6, 0.1);
    color: #D97706;
  }
  
  .badge-danger {
    background: rgba(220, 38, 38, 0.1);
    color: #DC2626;
  }
  
  .badge-info {
    background: rgba(14, 165, 233, 0.1);
    color: #0EA5E9;
  }
  
  .badge-primary {
    background: rgba(109, 40, 217, 0.1);
    color: #6D28D9;
  }
  
  .progress-container {
    margin-bottom: 16px;
  }
  
  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .progress-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-primary);
  }
  
  .progress-value {
    font-size: 12px;
    font-weight: 600;
    color: var(--primary-color);
  }
  
  .progress-bar {
    height: 10px;
    background: var(--bg-light);
    border-radius: 10px;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    border-radius: 10px;
    background: var(--primary-gradient);
  }
  
  .progress-fill.success { background: var(--success-gradient); }
  .progress-fill.warning { background: var(--warning-gradient); }
  .progress-fill.danger { background: var(--danger-gradient); }
  
  .chart-container {
    position: relative;
    width: 100%;
    min-height: 300px;
    padding: 20px;
    background: white;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
  }
  
  .chart-container canvas {
    max-width: 100%;
    max-height: 280px;
  }
  
  .chart-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 16px;
    text-align: center;
  }
  
  .executive-summary {
    background: linear-gradient(135deg, rgba(109, 40, 217, 0.05) 0%, rgba(139, 92, 246, 0.08) 100%);
    border-radius: var(--radius-lg);
    padding: 28px;
    margin-bottom: 30px;
    border-left: 4px solid var(--primary-color);
  }
  
  .executive-summary-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--primary-color);
    margin-bottom: 12px;
  }
  
  .executive-summary-text {
    font-size: 14px;
    font-weight: 300;
    line-height: 1.8;
    color: var(--text-primary);
  }
  
  .checklist {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .checklist-item {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 16px 20px;
    background: var(--bg-light);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
  }
  
  .checklist-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .checklist-icon.success {
    background: rgba(5, 150, 105, 0.15);
    color: #059669;
  }
  
  .checklist-icon.warning {
    background: rgba(217, 119, 6, 0.15);
    color: #D97706;
  }
  
  .checklist-icon.danger {
    background: rgba(220, 38, 38, 0.15);
    color: #DC2626;
  }
  
  .checklist-content {
    flex: 1;
  }
  
  .checklist-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 4px;
  }
  
  .checklist-description {
    font-size: 11px;
    color: var(--text-secondary);
  }
  
  .timeline {
    position: relative;
    padding-left: 30px;
  }
  
  .timeline::before {
    content: '';
    position: absolute;
    left: 10px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--border-color);
  }
  
  .timeline-item {
    position: relative;
    padding-bottom: 24px;
  }
  
  .timeline-item:last-child {
    padding-bottom: 0;
  }
  
  .timeline-dot {
    position: absolute;
    left: -24px;
    top: 4px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--primary-color);
    border: 3px solid white;
    box-shadow: var(--shadow-sm);
  }
  
  .timeline-content {
    background: var(--bg-light);
    padding: 16px 20px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
  }
  
  .timeline-date {
    font-size: 10px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 6px;
  }
  
  .timeline-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 4px;
  }
  
  .timeline-description {
    font-size: 12px;
    color: var(--text-secondary);
  }
  
  .report-footer {
    position: absolute;
    bottom: 15mm;
    left: 20mm;
    right: 20mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 15px;
    border-top: 1px solid var(--border-color);
    font-size: 9px;
    color: var(--text-muted);
  }
  
  .page-number {
    font-weight: 600;
    color: var(--primary-color);
  }
  
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .mt-2 { margin-top: 16px; }
  .mb-2 { margin-bottom: 16px; }
  .flex { display: flex; }
  .gap-2 { gap: 16px; }
  .grid { display: grid; }
  .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
  .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
  .font-medium { font-weight: 500; }
  .font-semibold { font-weight: 600; }
  .text-sm { font-size: 12px; }
  .text-primary { color: var(--primary-color); }
  .text-success { color: #059669; }
  .text-warning { color: #D97706; }
  .text-danger { color: #DC2626; }
`;

// ==================== COMPONENTES REUTILIZÁVEIS ====================

export interface ReportHeaderConfig {
  badge: string;
  title: string;
  subtitle: string;
  organizationName: string;
  date: string;
  reportId?: string;
  logoUrl?: string;
}

export function generateReportHeader(config: ReportHeaderConfig): string {
  return `
    <div class="report-header">
      <div class="header-content">
        <div class="header-left">
          <div class="header-badge">${config.badge}</div>
          <h1 class="header-title">${config.title}</h1>
          <p class="header-subtitle">${config.subtitle}</p>
        </div>
        <div class="header-right">
          <img src="${config.logoUrl || '/logo.png'}" alt="Logo" class="header-logo" onerror="this.style.display='none'" />
          <div class="header-meta">
            <div class="header-meta-item">${config.organizationName}</div>
            <div class="header-meta-item">${config.date}</div>
            ${config.reportId ? `<div class="header-meta-item">#${config.reportId}</div>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

export interface StatConfig {
  value: string | number;
  label: string;
  sublabel?: string;
  type?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export function generateStatsGrid(stats: StatConfig[]): string {
  const gridClass = stats.length === 3 ? 'stats-grid stats-grid-3' : 
                    stats.length === 5 ? 'stats-grid stats-grid-5' : 'stats-grid';
  
  return `
    <div class="${gridClass}">
      ${stats.map(stat => `
        <div class="stat-card ${stat.type || ''}">
          <div class="stat-value ${stat.type || ''}">${stat.value}</div>
          <div class="stat-label">${stat.label}</div>
          ${stat.sublabel ? `<div class="stat-sublabel">${stat.sublabel}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

export interface SectionConfig {
  icon?: string;
  title: string;
  badge?: string;
  content: string;
}

export function generateSection(config: SectionConfig): string {
  return `
    <div class="section">
      <div class="section-header">
        ${config.icon ? `<div class="section-icon">${config.icon}</div>` : ''}
        <h2 class="section-title">${config.title}</h2>
        ${config.badge ? `<span class="section-badge">${config.badge}</span>` : ''}
      </div>
      ${config.content}
    </div>
  `;
}

export interface TableConfig {
  headers: string[];
  rows: string[][];
  highlight?: number[];
}

export function generateTable(config: TableConfig): string {
  return `
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            ${config.headers.map(h => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${config.rows.map((row, idx) => `
            <tr ${config.highlight?.includes(idx) ? 'style="background: rgba(109, 40, 217, 0.05);"' : ''}>
              ${row.map(cell => `<td>${cell}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export interface ProgressBarConfig {
  label: string;
  value: number;
  max?: number;
  type?: 'default' | 'success' | 'warning' | 'danger';
}

export function generateProgressBar(config: ProgressBarConfig): string {
  const max = config.max || 100;
  const percentage = Math.min((config.value / max) * 100, 100);
  
  return `
    <div class="progress-container">
      <div class="progress-header">
        <span class="progress-label">${config.label}</span>
        <span class="progress-value">${config.value}${config.max ? `/${config.max}` : '%'}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${config.type || ''}" style="width: ${percentage}%"></div>
      </div>
    </div>
  `;
}

export function generateBadge(text: string, type: 'success' | 'warning' | 'danger' | 'info' | 'primary' = 'primary'): string {
  return `<span class="badge badge-${type}">${text}</span>`;
}

export function generateExecutiveSummary(text: string): string {
  return `
    <div class="executive-summary">
      <div class="executive-summary-title">Resumo Executivo</div>
      <div class="executive-summary-text">${text}</div>
    </div>
  `;
}

export interface ChecklistItem {
  title: string;
  description?: string;
  status: 'success' | 'warning' | 'danger';
}

export function generateChecklist(items: ChecklistItem[]): string {
  const icons: Record<string, string> = {
    success: '✓',
    warning: '!',
    danger: '✗'
  };
  
  return `
    <div class="checklist">
      ${items.map(item => `
        <div class="checklist-item">
          <div class="checklist-icon ${item.status}">${icons[item.status]}</div>
          <div class="checklist-content">
            <div class="checklist-title">${item.title}</div>
            ${item.description ? `<div class="checklist-description">${item.description}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

export interface TimelineItem {
  date: string;
  title: string;
  description?: string;
}

export function generateTimeline(items: TimelineItem[]): string {
  return `
    <div class="timeline">
      ${items.map(item => `
        <div class="timeline-item">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-date">${item.date}</div>
            <div class="timeline-title">${item.title}</div>
            ${item.description ? `<div class="timeline-description">${item.description}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

export interface ReportFooterConfig {
  pageNumber: number;
  totalPages: number;
  generatedBy?: string;
  confidential?: boolean;
}

export function generateReportFooter(config: ReportFooterConfig): string {
  return `
    <div class="report-footer">
      <div>Gerado por ${config.generatedBy || 'Seusdados Consultoria'}</div>
      <div>${config.confidential ? '<span style="color: #DC2626; font-weight: 600;">CONFIDENCIAL</span>' : ''}</div>
      <div>Página <span class="page-number">${config.pageNumber}</span> de ${config.totalPages}</div>
    </div>
  `;
}

// ==================== TEMPLATE BASE ====================

export interface ReportHTMLConfig {
  title: string;
  styles?: string;
  body: string;
  scripts?: string;
}

export function generateReportHTML(config: ReportHTMLConfig): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title} - Seusdados</title>
  <style>
    ${premiumStyles}
    ${config.styles || ''}
  </style>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
</head>
<body>
  <div class="report-container">
    ${config.body}
  </div>
  ${config.scripts ? `<script>${config.scripts}</script>` : ''}
</body>
</html>
  `;
}

// ==================== CHART.JS HELPERS ====================

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

export interface ChartConfig {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'polarArea';
  data: {
    labels: string[];
    datasets: ChartDataset[];
  };
  options?: Record<string, unknown>;
}

export function generateChartScript(charts: ChartConfig[]): string {
  return charts.map(chart => `
    new Chart(document.getElementById('${chart.id}'), {
      type: '${chart.type}',
      data: ${JSON.stringify(chart.data)},
      options: ${JSON.stringify(chart.options || {})}
    });
  `).join('\n');
}

export const chartColors = {
  primary: ['#6D28D9', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE'],
  success: ['#059669', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0'],
  warning: ['#D97706', '#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A'],
  danger: ['#DC2626', '#EF4444', '#F87171', '#FCA5A5', '#FECACA'],
  info: ['#0EA5E9', '#38BDF8', '#7DD3FC', '#BAE6FD', '#E0F2FE'],
  gradient: ['#2E1065', '#4C1D95', '#6D28D9', '#8B5CF6', '#A78BFA']
};
