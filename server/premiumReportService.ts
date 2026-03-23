/**
 * Serviço de Geração de Relatórios Premium
 * Gera relatórios HTML com visual corporativo premium para todas as funcionalidades
 */

import {
  premiumStyles,
  generateReportHeader,
  generateStatsGrid,
  generateSection,
  generateTable,
  generateProgressBar,
  generateBadge,
  generateExecutiveSummary,
  generateChecklist,
  generateTimeline,
  generateReportFooter,
  generateReportHTML,
  generateChartScript,
  chartColors,
  type StatConfig,
  type ChecklistItem,
  type TimelineItem,
  type ChartConfig
} from './reportTemplates';

// ==================== TIPOS ====================

export interface ComplianceReportInput {
  organizationName: string;
  assessmentDate: string;
  framework: string;
  overallScore: number;
  maturityLevel: number;
  maturityLabel: string;
  riskLevel: string;
  domains: Array<{
    name: string;
    score: number;
    maturity: number;
    questionsAnswered: number;
    totalQuestions: number;
  }>;
  recommendations: string[];
  actionPlan: Array<{
    priority: string;
    action: string;
    domain: string;
    deadline: string;
  }>;
  consultantName: string;
  consultantEmail: string;
}

export interface DueDiligenceReportInput {
  organizationName: string;
  thirdPartyName: string;
  thirdPartyType: string;
  assessmentDate: string;
  overallRiskScore: number;
  riskClassification: string;
  probabilityScore: number;
  impactScore: number;
  categories: Array<{
    name: string;
    score: number;
    maxScore: number;
    percentage: number;
  }>;
  criticalFindings: string[];
  recommendations: string[];
  consultantName: string;
  consultantEmail: string;
}

export interface ContractAnalysisReportInput {
  organizationName: string;
  contractName: string;
  analysisDate: string;
  complianceScore: number;
  executiveSummary: string;
  analysisMap: Record<string, string | null>;
  checklist: Array<{
    item: string;
    status: 'conforme' | 'parcial' | 'nao_conforme' | 'nao_aplicavel';
    observation?: string;
  }>;
  risks: Array<{
    description: string;
    level: string;
    area: string;
    action: string;
  }>;
  consultantName: string;
  consultantEmail: string;
}

export interface XaiReportInput {
  organizationName: string;
  analysisType: string;
  analysisDate: string;
  totalAlerts: number;
  criticalAlerts: number;
  clausesGenerated: number;
  actionsGenerated: number;
  alerts: Array<{
    id: string;
    tipo: string;
    severidade: string;
    titulo: string;
    descricao: string;
    confianca: number;
    regras: string[];
    fundamentos: string[];
  }>;
  clauses: Array<{
    id: string;
    titulo: string;
    bloco: string;
    confianca: number;
    fundamentos: string[];
  }>;
  actions: Array<{
    id: string;
    titulo: string;
    prioridade: string;
    prazo: string;
    confianca: number;
  }>;
  auditLog: Array<{
    timestamp: string;
    action: string;
    user: string;
  }>;
}

// ==================== FUNÇÕES AUXILIARES ====================

function getRiskBadgeType(risk: string): 'success' | 'warning' | 'danger' | 'info' {
  const lower = risk.toLowerCase();
  if (lower.includes('baixo') || lower.includes('low')) return 'success';
  if (lower.includes('moderado') || lower.includes('médio') || lower.includes('medium')) return 'warning';
  if (lower.includes('alto') || lower.includes('crítico') || lower.includes('high') || lower.includes('critical')) return 'danger';
  return 'info';
}

function getMaturityLabel(level: number): string {
  const labels: Record<number, string> = {
    1: 'Inicial',
    2: 'Gerenciado',
    3: 'Definido',
    4: 'Quantitativamente Gerenciado',
    5: 'Otimizado'
  };
  return labels[level] || 'Não avaliado';
}

function formatDate(date: string): string {
  try {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return date;
  }
}

// ==================== RELATÓRIO DE CONFORMIDADE PPPD ====================

export function generateCompliancePremiumReport(input: ComplianceReportInput): string {
  const header = generateReportHeader({
    badge: `${input.framework} • CONFORMIDADE`,
    title: 'Relatório de Conformidade',
    subtitle: 'Programa de Proteção de Dados Pessoais',
    organizationName: input.organizationName,
    date: formatDate(input.assessmentDate),
    reportId: `CONF-${Date.now().toString(36).toUpperCase()}`
  });

  const stats: StatConfig[] = [
    { value: `${input.overallScore}%`, label: 'Score Geral', type: input.overallScore >= 70 ? 'success' : input.overallScore >= 40 ? 'warning' : 'danger' },
    { value: input.maturityLevel, label: 'Nível de Maturidade', sublabel: input.maturityLabel },
    { value: input.domains.length, label: 'Domínios Avaliados', type: 'info' },
    { value: input.actionPlan.length, label: 'Ações Recomendadas', type: 'warning' }
  ];

  const executiveSummary = generateExecutiveSummary(
    `A avaliação de conformidade da organização ${input.organizationName} utilizando o framework ${input.framework} resultou em um score geral de ${input.overallScore}%, correspondendo ao nível de maturidade ${input.maturityLevel} (${input.maturityLabel}). O nível de risco atual é classificado como ${input.riskLevel}. Foram identificadas ${input.actionPlan.length} ações prioritárias para melhoria da conformidade.`
  );

  // Gráfico de domínios
  const domainsChartId = 'domains-chart';
  const domainsChart: ChartConfig = {
    id: domainsChartId,
    type: 'bar',
    data: {
      labels: input.domains.map(d => d.name.substring(0, 20)),
      datasets: [{
        label: 'Score (%)',
        data: input.domains.map(d => d.score),
        backgroundColor: chartColors.primary,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true, max: 100 }
      }
    }
  };

  const domainsSection = generateSection({
    title: 'Avaliação por Domínio',
    badge: `${input.domains.length} domínios`,
    content: `
      <div class="chart-container">
        <canvas id="${domainsChartId}"></canvas>
      </div>
      <div class="mt-2">
        ${input.domains.map(d => generateProgressBar({
          label: d.name,
          value: d.score,
          type: d.score >= 70 ? 'success' : d.score >= 40 ? 'warning' : 'danger'
        })).join('')}
      </div>
    `
  });

  // Checklist de recomendações
  const recommendationsItems: ChecklistItem[] = input.recommendations.slice(0, 10).map(r => ({
    title: r,
    status: 'warning' as const
  }));

  const recommendationsSection = generateSection({
    title: 'Recomendações Prioritárias',
    badge: `${input.recommendations.length} itens`,
    content: generateChecklist(recommendationsItems)
  });

  // Plano de ação
  const actionPlanSection = generateSection({
    title: 'Plano de Ação',
    badge: `${input.actionPlan.length} ações`,
    content: generateTable({
      headers: ['Prioridade', 'Ação', 'Domínio', 'Prazo'],
      rows: input.actionPlan.map(a => [
        generateBadge(a.priority, getRiskBadgeType(a.priority)),
        a.action,
        a.domain,
        a.deadline
      ])
    })
  });

  const footer = generateReportFooter({
    pageNumber: 1,
    totalPages: 1,
    generatedBy: `${input.consultantName} - Seusdados Consultoria`,
    confidential: true
  });

  const body = `
    <div class="page">
      ${header}
      ${generateStatsGrid(stats)}
      ${executiveSummary}
      ${domainsSection}
    </div>
    <div class="page">
      ${recommendationsSection}
      ${actionPlanSection}
      ${footer}
    </div>
  `;

  return generateReportHTML({
    title: `Relatório de Conformidade - ${input.organizationName}`,
    body,
    scripts: generateChartScript([domainsChart])
  });
}

// ==================== RELATÓRIO DE DUE DILIGENCE ====================

export function generateDueDiligencePremiumReport(input: DueDiligenceReportInput): string {
  const header = generateReportHeader({
    badge: 'DUE DILIGENCE • TERCEIROS',
    title: 'Relatório de Due Diligence',
    subtitle: `Avaliação de ${input.thirdPartyName}`,
    organizationName: input.organizationName,
    date: formatDate(input.assessmentDate),
    reportId: `DD-${Date.now().toString(36).toUpperCase()}`
  });

  const stats: StatConfig[] = [
    { value: input.overallRiskScore.toFixed(1), label: 'Score de Risco', type: getRiskBadgeType(input.riskClassification) },
    { value: input.riskClassification, label: 'Classificação', type: getRiskBadgeType(input.riskClassification) },
    { value: input.probabilityScore.toFixed(1), label: 'Probabilidade', type: 'info' },
    { value: input.impactScore.toFixed(1), label: 'Impacto', type: 'warning' }
  ];

  const executiveSummary = generateExecutiveSummary(
    `A avaliação de due diligence do terceiro ${input.thirdPartyName} (${input.thirdPartyType}) resultou em um score de risco de ${input.overallRiskScore.toFixed(1)}, classificado como ${input.riskClassification}. A probabilidade de ocorrência de riscos foi avaliada em ${input.probabilityScore.toFixed(1)} e o impacto potencial em ${input.impactScore.toFixed(1)}. Foram identificados ${input.criticalFindings.length} achados críticos que requerem atenção imediata.`
  );

  // Gráfico de categorias
  const categoriesChartId = 'categories-chart';
  const categoriesChart: ChartConfig = {
    id: categoriesChartId,
    type: 'radar',
    data: {
      labels: input.categories.map(c => c.name),
      datasets: [{
        label: 'Score (%)',
        data: input.categories.map(c => c.percentage),
        backgroundColor: 'rgba(109, 40, 217, 0.2)',
        borderColor: '#6D28D9',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      scales: {
        r: {
          beginAtZero: true,
          max: 100
        }
      }
    }
  };

  const categoriesSection = generateSection({
    title: 'Avaliação por Categoria',
    badge: `${input.categories.length} categorias`,
    content: `
      <div class="grid grid-cols-2 gap-2">
        <div class="chart-container">
          <canvas id="${categoriesChartId}"></canvas>
        </div>
        <div>
          ${input.categories.map(c => generateProgressBar({
            label: c.name,
            value: c.percentage,
            type: c.percentage >= 70 ? 'success' : c.percentage >= 40 ? 'warning' : 'danger'
          })).join('')}
        </div>
      </div>
    `
  });

  // Achados críticos
  const findingsItems: ChecklistItem[] = input.criticalFindings.map(f => ({
    title: f,
    status: 'danger' as const
  }));

  const findingsSection = generateSection({
    title: 'Achados Críticos',
    badge: `${input.criticalFindings.length} itens`,
    content: findingsItems.length > 0 ? generateChecklist(findingsItems) : '<p class="text-muted">Nenhum achado crítico identificado.</p>'
  });

  // Recomendações
  const recommendationsItems: ChecklistItem[] = input.recommendations.map(r => ({
    title: r,
    status: 'warning' as const
  }));

  const recommendationsSection = generateSection({
    title: 'Recomendações',
    badge: `${input.recommendations.length} itens`,
    content: generateChecklist(recommendationsItems)
  });

  const footer = generateReportFooter({
    pageNumber: 1,
    totalPages: 1,
    generatedBy: `${input.consultantName} - Seusdados Consultoria`,
    confidential: true
  });

  const body = `
    <div class="page">
      ${header}
      ${generateStatsGrid(stats)}
      ${executiveSummary}
      ${categoriesSection}
    </div>
    <div class="page">
      ${findingsSection}
      ${recommendationsSection}
      ${footer}
    </div>
  `;

  return generateReportHTML({
    title: `Relatório de Due Diligence - ${input.thirdPartyName}`,
    body,
    scripts: generateChartScript([categoriesChart])
  });
}

// ==================== RELATÓRIO DE ANÁLISE DE CONTRATOS ====================

export function generateContractAnalysisPremiumReport(input: ContractAnalysisReportInput): string {
  const header = generateReportHeader({
    badge: 'LGPD • ANÁLISE CONTRATUAL',
    title: 'Relatório de Análise de Contrato',
    subtitle: input.contractName,
    organizationName: input.organizationName,
    date: formatDate(input.analysisDate),
    reportId: `AC-${Date.now().toString(36).toUpperCase()}`
  });

  const conformeCount = input.checklist.filter(c => c.status === 'conforme').length;
  const parcialCount = input.checklist.filter(c => c.status === 'parcial').length;
  const naoConformeCount = input.checklist.filter(c => c.status === 'nao_conforme').length;
  const criticalRisks = input.risks.filter(r => r.level.toLowerCase().includes('crítico') || r.level.toLowerCase().includes('alto')).length;

  const stats: StatConfig[] = [
    { value: `${input.complianceScore}%`, label: 'Score de Conformidade', type: input.complianceScore >= 70 ? 'success' : input.complianceScore >= 40 ? 'warning' : 'danger' },
    { value: conformeCount, label: 'Itens Conformes', type: 'success' },
    { value: naoConformeCount, label: 'Não Conformes', type: 'danger' },
    { value: criticalRisks, label: 'Riscos Críticos', type: criticalRisks > 0 ? 'danger' : 'success' }
  ];

  const executiveSummary = generateExecutiveSummary(input.executiveSummary || 
    `A análise do contrato "${input.contractName}" resultou em um score de conformidade de ${input.complianceScore}%. Foram identificados ${conformeCount} itens conformes, ${parcialCount} parcialmente conformes e ${naoConformeCount} não conformes. O contrato apresenta ${criticalRisks} riscos críticos que requerem atenção.`
  );

  // Checklist de conformidade
  const checklistItems: ChecklistItem[] = input.checklist.map(c => ({
    title: c.item,
    description: c.observation,
    status: c.status === 'conforme' ? 'success' : c.status === 'parcial' ? 'warning' : 'danger'
  }));

  const checklistSection = generateSection({
    title: 'Checklist de Conformidade LGPD',
    badge: `${input.checklist.length} itens`,
    content: generateChecklist(checklistItems)
  });

  // Matriz de riscos
  const risksSection = generateSection({
    title: 'Matriz de Priorização de Riscos',
    badge: `${input.risks.length} riscos`,
    content: generateTable({
      headers: ['Nível', 'Descrição', 'Área', 'Ação Requerida'],
      rows: input.risks.map(r => [
        generateBadge(r.level, getRiskBadgeType(r.level)),
        r.description,
        r.area,
        r.action
      ])
    })
  });

  // Mapa de análise (campos principais)
  const analysisMapEntries = Object.entries(input.analysisMap)
    .filter(([_, v]) => v !== null && v !== '')
    .slice(0, 15);

  const analysisMapSection = generateSection({
    title: 'Mapa de Análise',
    badge: `${analysisMapEntries.length} campos`,
    content: generateTable({
      headers: ['Campo', 'Valor'],
      rows: analysisMapEntries.map(([k, v]) => [
        k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        String(v || '-')
      ])
    })
  });

  const footer = generateReportFooter({
    pageNumber: 1,
    totalPages: 2,
    generatedBy: `${input.consultantName} - Seusdados Consultoria`,
    confidential: true
  });

  const body = `
    <div class="page">
      ${header}
      ${generateStatsGrid(stats)}
      ${executiveSummary}
      ${checklistSection}
    </div>
    <div class="page">
      ${risksSection}
      ${analysisMapSection}
      ${footer}
    </div>
  `;

  return generateReportHTML({
    title: `Análise de Contrato - ${input.contractName}`,
    body
  });
}

// ==================== RELATÓRIO XAI ====================

export function generateXaiPremiumReport(input: XaiReportInput): string {
  const header = generateReportHeader({
    badge: 'IA EXPLICÁVEL • XAI',
    title: 'Relatório de IA Explicável',
    subtitle: input.analysisType,
    organizationName: input.organizationName,
    date: formatDate(input.analysisDate),
    reportId: `XAI-${Date.now().toString(36).toUpperCase()}`
  });

  const stats: StatConfig[] = [
    { value: input.totalAlerts, label: 'Alertas Gerados', type: 'info' },
    { value: input.criticalAlerts, label: 'Alertas Críticos', type: input.criticalAlerts > 0 ? 'danger' : 'success' },
    { value: input.clausesGenerated, label: 'Cláusulas Geradas', type: 'success' },
    { value: input.actionsGenerated, label: 'Ações Geradas', type: 'warning' }
  ];

  const executiveSummary = generateExecutiveSummary(
    `A análise com IA Explicável (XAI) da ${input.analysisType} gerou ${input.totalAlerts} alertas, sendo ${input.criticalAlerts} críticos. Foram geradas ${input.clausesGenerated} cláusulas LGPD e ${input.actionsGenerated} ações de plano de ação. Cada item inclui explicabilidade completa com evidências, regras aplicadas e fundamentos legais.`
  );

  // Alertas
  const alertsSection = generateSection({
    title: 'Alertas Identificados',
    badge: `${input.alerts.length} alertas`,
    content: input.alerts.length > 0 ? generateTable({
      headers: ['ID', 'Tipo', 'Severidade', 'Título', 'Confiança'],
      rows: input.alerts.slice(0, 10).map(a => [
        a.id,
        a.tipo,
        generateBadge(a.severidade, getRiskBadgeType(a.severidade)),
        a.titulo,
        `${(a.confianca * 100).toFixed(0)}%`
      ])
    }) : '<p class="text-muted">Nenhum alerta identificado.</p>'
  });

  // Cláusulas geradas
  const clausesSection = generateSection({
    title: 'Cláusulas LGPD Geradas',
    badge: `${input.clauses.length} cláusulas`,
    content: input.clauses.length > 0 ? generateTable({
      headers: ['ID', 'Título', 'Bloco', 'Confiança', 'Fundamentos'],
      rows: input.clauses.slice(0, 10).map(c => [
        c.id,
        c.titulo,
        c.bloco,
        `${(c.confianca * 100).toFixed(0)}%`,
        c.fundamentos.slice(0, 2).join(', ')
      ])
    }) : '<p class="text-muted">Nenhuma cláusula gerada.</p>'
  });

  // Ações geradas
  const actionsSection = generateSection({
    title: 'Ações do Plano',
    badge: `${input.actions.length} ações`,
    content: input.actions.length > 0 ? generateTable({
      headers: ['ID', 'Título', 'Prioridade', 'Prazo', 'Confiança'],
      rows: input.actions.slice(0, 10).map(a => [
        a.id,
        a.titulo,
        generateBadge(a.prioridade, getRiskBadgeType(a.prioridade)),
        a.prazo,
        `${(a.confianca * 100).toFixed(0)}%`
      ])
    }) : '<p class="text-muted">Nenhuma ação gerada.</p>'
  });

  // Log de auditoria
  const auditItems: TimelineItem[] = input.auditLog.slice(0, 10).map(log => ({
    date: new Date(log.timestamp).toLocaleString('pt-BR'),
    title: log.action,
    description: `Executado por ${log.user}`
  }));

  const auditSection = generateSection({
    title: 'Log de Auditoria',
    badge: `${input.auditLog.length} registros`,
    content: auditItems.length > 0 ? generateTimeline(auditItems) : '<p class="text-muted">Nenhum registro de auditoria.</p>'
  });

  const footer = generateReportFooter({
    pageNumber: 1,
    totalPages: 2,
    generatedBy: 'Seusdados XAI Engine',
    confidential: true
  });

  const body = `
    <div class="page">
      ${header}
      ${generateStatsGrid(stats)}
      ${executiveSummary}
      ${alertsSection}
    </div>
    <div class="page">
      ${clausesSection}
      ${actionsSection}
      ${auditSection}
      ${footer}
    </div>
  `;

  return generateReportHTML({
    title: `Relatório XAI - ${input.analysisType}`,
    body
  });
}

// ==================== RELATÓRIO INTEGRADO CONTRATO + MAPEAMENTO ====================

export interface ContractMapeamentoIntegratedReportInput {
  // Dados do contrato
  organizationName: string;
  contractName: string;
  contractAnalysisDate: string;
  contractComplianceScore: number;
  contractRisks: Array<{
    severity: 'critico' | 'alto' | 'medio' | 'baixo';
    description: string;
    recommendation: string;
  }>;
  contractClauses: Array<{
    name: string;
    status: 'conforme' | 'parcial' | 'nao_conforme' | 'nao_aplicavel';
  }>;
  
  // Dados do mapeamento
  mapeamentoDate: string;
  department: string;
  processTitle: string;
  processDescription: string;
  dataCategories: Array<{
    name: string;
    sensivel: boolean;
  }>;
  titularCategories: string[];
  legalBase: string;
  retentionPeriod: string;
  storageLocation: string;
  securityMeasures: string[];
  internationalTransfer: boolean;
  internationalCountries: string[];
  riskLevel: string;
  
  // Metadados
  consultantName: string;
  consultantEmail: string;
}

/**
 * Gera relatório integrado de Análise de Contrato + Mapeamento de Dados
 */
export function generateContractMapeamentoIntegratedReport(input: ContractMapeamentoIntegratedReportInput): string {
  // Cabeçalho
  const header = generateReportHeader({
    badge: 'LGPD/ANPD',
    title: 'Relatório Integrado',
    subtitle: 'Análise de Contrato + Mapeamento de Dados',
    organizationName: input.organizationName,
    date: input.contractAnalysisDate
  });

  // Estatísticas
  const criticalRisks = input.contractRisks.filter(r => r.severity === 'critico').length;
  const highRisks = input.contractRisks.filter(r => r.severity === 'alto').length;
  const sensitiveData = input.dataCategories.filter(d => d.sensivel).length;
  
  const stats: StatConfig[] = [
    { label: 'Score Conformidade', value: `${input.contractComplianceScore}%`, type: input.contractComplianceScore >= 70 ? 'success' : input.contractComplianceScore >= 50 ? 'warning' : 'danger' },
    { label: 'Riscos Críticos', value: criticalRisks.toString(), type: criticalRisks > 0 ? 'danger' : 'success' },
    { label: 'Riscos Altos', value: highRisks.toString(), type: highRisks > 0 ? 'warning' : 'success' },
    { label: 'Dados Sensíveis', value: sensitiveData.toString(), type: sensitiveData > 0 ? 'info' : 'default' }
  ];
  const statsGrid = generateStatsGrid(stats);

  // Resumo Executivo
  const summaryItems = [
    `Contrato analisado: ${input.contractName}`,
    `Área/Departamento: ${input.department}`,
    `Processo mapeado: ${input.processTitle}`,
    `Base legal identificada: ${input.legalBase}`,
    `Nível de risco do mapeamento: ${input.riskLevel}`,
    input.internationalTransfer ? `Transferência internacional para: ${input.internationalCountries.join(', ')}` : 'Sem transferência internacional de dados'
  ];
  const executiveSummary = generateExecutiveSummary(summaryItems.map(item => `<p style="margin-bottom: 8px;">${item}</p>`).join(''));

  // Seção de Análise de Contrato
  const contractRisksTable = input.contractRisks.length > 0 ? generateTable({
    headers: ['Severidade', 'Descrição', 'Recomendação'],
    rows: input.contractRisks.map(r => [
      generateBadge(r.severity, r.severity === 'critico' ? 'danger' : r.severity === 'alto' ? 'warning' : 'info'),
      r.description,
      r.recommendation
    ])
  }) : '<p style="color: #10b981;">Nenhum risco identificado no contrato.</p>';

  const contractSection = generateSection({ title: 'Análise de Contrato LGPD', content: `
    <p style="margin-bottom: 16px;"><strong>Contrato:</strong> ${input.contractName}</p>
    <p style="margin-bottom: 16px;"><strong>Data da Análise:</strong> ${input.contractAnalysisDate}</p>
    ${generateProgressBar({ label: 'Score de Conformidade', value: input.contractComplianceScore })}
    <h4 style="margin-top: 24px; margin-bottom: 12px;">Riscos Identificados</h4>
    ${contractRisksTable}
  ` });

  // Seção de Mapeamento de Dados
  const dataCategoriesHtml = input.dataCategories.map(d => 
    `<span style="display: inline-block; padding: 4px 12px; margin: 4px; border-radius: 16px; font-size: 12px; ${d.sensivel ? 'background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;' : 'background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;'}">
      ${d.name} ${d.sensivel ? '(Sensível)' : ''}
    </span>`
  ).join('');

  const titularCategoriesHtml = input.titularCategories.map(t => 
    `<span style="display: inline-block; padding: 4px 12px; margin: 4px; border-radius: 16px; font-size: 12px; background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe;">${t}</span>`
  ).join('');

  const securityMeasuresHtml = input.securityMeasures.map(s => 
    `<li style="margin-bottom: 8px;">${s}</li>`
  ).join('');

  const mapeamentoSection = generateSection({ title: 'Mapeamento de Dados', content: `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
      <div>
        <p style="color: #64748b; font-size: 12px; margin-bottom: 4px;">ÁREA/DEPARTAMENTO</p>
        <p style="font-weight: 500;">${input.department}</p>
      </div>
      <div>
        <p style="color: #64748b; font-size: 12px; margin-bottom: 4px;">BASE LEGAL</p>
        <p style="font-weight: 500;">${input.legalBase}</p>
      </div>
      <div>
        <p style="color: #64748b; font-size: 12px; margin-bottom: 4px;">PERÍODO DE RETENÇÃO</p>
        <p style="font-weight: 500;">${input.retentionPeriod || 'Não especificado'}</p>
      </div>
      <div>
        <p style="color: #64748b; font-size: 12px; margin-bottom: 4px;">LOCAL DE ARMAZENAMENTO</p>
        <p style="font-weight: 500;">${input.storageLocation || 'Não especificado'}</p>
      </div>
    </div>

    <h4 style="margin-top: 24px; margin-bottom: 12px;">Processo</h4>
    <p style="margin-bottom: 8px;"><strong>${input.processTitle}</strong></p>
    <p style="color: #64748b; margin-bottom: 24px;">${input.processDescription}</p>

    <h4 style="margin-bottom: 12px;">Categorias de Dados Pessoais</h4>
    <div style="margin-bottom: 24px;">${dataCategoriesHtml}</div>

    <h4 style="margin-bottom: 12px;">Categorias de Titulares</h4>
    <div style="margin-bottom: 24px;">${titularCategoriesHtml}</div>

    <h4 style="margin-bottom: 12px;">Medidas de Segurança</h4>
    <ul style="margin: 0; padding-left: 20px;">${securityMeasuresHtml}</ul>

    ${input.internationalTransfer ? `
      <h4 style="margin-top: 24px; margin-bottom: 12px;">Transferência Internacional</h4>
      <p style="color: #f59e0b;">Países: ${input.internationalCountries.join(', ')}</p>
    ` : ''}
  ` });

  // Rodapé
  const footer = generateReportFooter({
    pageNumber: 1,
    totalPages: 1,
    generatedBy: `${input.consultantName} (${input.consultantEmail})`,
    confidential: true
  });

  const body = `
    <div style="max-width: 900px; margin: 0 auto; padding: 40px;">
      ${header}
      ${statsGrid}
      ${executiveSummary}
      ${contractSection}
      ${mapeamentoSection}
      ${footer}
    </div>
  `;

  return generateReportHTML({
    title: `Relatório Integrado - ${input.contractName}`,
    body
  });
}

// ==================== EXPORTAÇÃO ====================

export {
  premiumStyles,
  generateReportHeader,
  generateStatsGrid,
  generateSection,
  generateTable,
  generateProgressBar,
  generateBadge,
  generateExecutiveSummary,
  generateChecklist,
  generateTimeline,
  generateReportFooter,
  generateReportHTML,
  generateChartScript,
  chartColors
};
