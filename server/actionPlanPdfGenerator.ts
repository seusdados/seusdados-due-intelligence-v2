import { logger } from "./_core/logger";
/**
 * Gerador de PDF para Plano de Ação de Análise de Contratos
 */

interface ActionPlanPdfInput {
  contractName: string;
  organizationName: string;
  actions: Array<{
    id: number;
    title: string;
    description: string;
    priority: string;
    status: string;
    dueDate: Date | null;
    notes: string;
    completedAt: Date | null;
  }>;
  generatedAt: Date;
}

const priorityLabelsAction: Record<string, string> = {
  'critica': 'Crítica',
  'alta': 'Alta',
  'media': 'Média',
  'baixa': 'Baixa',
};

const priorityColorsAction: Record<string, string> = {
  'critica': '#dc2626',
  'alta': '#ea580c',
  'media': '#ca8a04',
  'baixa': '#2563eb',
};

const statusLabelsAction: Record<string, string> = {
  'pendente': 'Pendente',
  'em_andamento': 'Em Andamento',
  'concluida': 'Concluída',
  'cancelada': 'Cancelada',
};

const statusColorsAction: Record<string, string> = {
  'pendente': '#6b7280',
  'em_andamento': '#2563eb',
  'concluida': '#16a34a',
  'cancelada': '#dc2626',
};

function getDeadlineStatusAction(dueDate: Date | null, status: string): 'ok' | 'warning' | 'overdue' | 'none' {
  if (!dueDate || status === 'concluida' || status === 'cancelada') return 'none';
  
  const now = new Date();
  const due = new Date(dueDate);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'warning';
  return 'ok';
}

export async function generateActionPlanPdf(input: ActionPlanPdfInput): Promise<Buffer> {
  const { contractName, organizationName, actions, generatedAt } = input;
  
  // Estatísticas
  const stats = {
    total: actions.length,
    pendentes: actions.filter(a => a.status === 'pendente').length,
    emAndamento: actions.filter(a => a.status === 'em_andamento').length,
    concluidas: actions.filter(a => a.status === 'concluida').length,
    criticas: actions.filter(a => a.priority === 'critica').length,
    atrasadas: actions.filter(a => getDeadlineStatusAction(a.dueDate, a.status) === 'overdue').length,
  };
  
  const progressPercent = stats.total > 0 
    ? Math.round((stats.concluidas / stats.total) * 100) 
    : 0;
  
  // Ordenar ações por prioridade
  const priorityOrder: Record<string, number> = { 'critica': 0, 'alta': 1, 'media': 2, 'baixa': 3 };
  const sortedActions = [...actions].sort((a, b) => 
    (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3)
  );
  
  // Gerar linhas da tabela
  const tableRows = sortedActions.map(action => {
    const deadlineStatus = getDeadlineStatusAction(action.dueDate, action.status);
    const rowClass = deadlineStatus === 'overdue' ? 'overdue' : deadlineStatus === 'warning' ? 'warning' : '';
    const dueDateStr = action.dueDate ? new Date(action.dueDate).toLocaleDateString('pt-BR') : '-';
    const deadlineClass = deadlineStatus === 'overdue' ? 'deadline-alert' : deadlineStatus === 'warning' ? 'deadline-warning' : '';
    const priorityColor = priorityColorsAction[action.priority] || '#6b7280';
    const statusColor = statusColorsAction[action.status] || '#6b7280';
    const priorityLabel = priorityLabelsAction[action.priority] || action.priority;
    const statusLabel = statusLabelsAction[action.status] || action.status;
    const descShort = action.description.substring(0, 150) + (action.description.length > 150 ? '...' : '');
    const deadlineNote = deadlineStatus === 'overdue' ? ' (Atrasado)' : deadlineStatus === 'warning' ? ' (Próximo)' : '';
    
    return `
      <tr class="${rowClass}">
        <td>
          <div class="action-title">${action.title}</div>
          <div class="action-description">${descShort}</div>
        </td>
        <td><span class="badge" style="background: ${priorityColor};">${priorityLabel}</span></td>
        <td><span class="badge" style="background: ${statusColor};">${statusLabel}</span></td>
        <td>${action.notes || '-'}</td>
        <td class="${deadlineClass}">${dueDateStr}${deadlineNote}</td>
      </tr>
    `;
  }).join('');
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.5; color: #1f2937; background: #fff; }
    .header { background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%); color: white; padding: 30px 40px; margin-bottom: 30px; }
    .header h1 { font-size: 24pt; font-weight: 300; margin-bottom: 5px; }
    .header .subtitle { font-size: 12pt; opacity: 0.9; }
    .header .meta { margin-top: 15px; font-size: 9pt; opacity: 0.8; }
    .content { padding: 0 40px 40px; }
    .stats-grid { display: flex; gap: 15px; margin-bottom: 30px; flex-wrap: wrap; }
    .stat-card { background: #f9fafb; border-radius: 8px; padding: 15px; text-align: center; flex: 1; min-width: 100px; }
    .stat-card .value { font-size: 24pt; font-weight: 300; color: #1f2937; }
    .stat-card .label { font-size: 8pt; color: #6b7280; text-transform: uppercase; }
    .stat-card.critical .value { color: #dc2626; }
    .stat-card.overdue .value { color: #dc2626; }
    .stat-card.completed .value { color: #16a34a; }
    .progress-section { background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
    .progress-bar { height: 12px; background: #e5e7eb; border-radius: 6px; overflow: hidden; margin-top: 10px; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #7c3aed, #2563eb); border-radius: 6px; }
    .section-title { font-size: 14pt; font-weight: 500; color: #1f2937; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #7c3aed; }
    .action-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .action-table th { background: #f3f4f6; padding: 12px 10px; text-align: left; font-weight: 500; font-size: 9pt; text-transform: uppercase; color: #6b7280; }
    .action-table td { padding: 12px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    .action-table tr.overdue { background: #fef2f2; }
    .action-table tr.warning { background: #fffbeb; }
    .action-title { font-weight: 500; color: #1f2937; margin-bottom: 4px; }
    .action-description { font-size: 9pt; color: #6b7280; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 8pt; font-weight: 500; color: white; }
    .deadline-alert { color: #dc2626; font-weight: 500; }
    .deadline-warning { color: #ea580c; font-weight: 500; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 8pt; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Plano de Ação</h1>
    <div class="subtitle">${contractName}</div>
    <div class="meta">
      <strong>Organização:</strong> ${organizationName} | 
      <strong>Gerado em:</strong> ${generatedAt.toLocaleDateString('pt-BR')} às ${generatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
    </div>
  </div>
  
  <div class="content">
    <div class="stats-grid">
      <div class="stat-card">
        <div class="value">${stats.total}</div>
        <div class="label">Total</div>
      </div>
      <div class="stat-card">
        <div class="value">${stats.pendentes}</div>
        <div class="label">Pendentes</div>
      </div>
      <div class="stat-card">
        <div class="value">${stats.emAndamento}</div>
        <div class="label">Em Andamento</div>
      </div>
      <div class="stat-card completed">
        <div class="value">${stats.concluidas}</div>
        <div class="label">Concluídas</div>
      </div>
      <div class="stat-card critical">
        <div class="value">${stats.criticas}</div>
        <div class="label">Críticas</div>
      </div>
      <div class="stat-card overdue">
        <div class="value">${stats.atrasadas}</div>
        <div class="label">Atrasadas</div>
      </div>
    </div>
    
    <div class="progress-section">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 500;">Progresso do Plano</span>
        <span style="font-weight: 600; color: #7c3aed;">${progressPercent}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progressPercent}%;"></div>
      </div>
    </div>
    
    <h2 class="section-title">Ações do Plano</h2>
    
    <table class="action-table">
      <thead>
        <tr>
          <th style="width: 40%;">Ação</th>
          <th style="width: 12%;">Prioridade</th>
          <th style="width: 12%;">Status</th>
          <th style="width: 18%;">Responsável</th>
          <th style="width: 18%;">Prazo</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
    
    <div class="footer">
      <p>Documento gerado automaticamente pelo sistema Seusdados Due Diligence</p>
      <p>Este plano de ação é parte integrante da análise de conformidade LGPD do contrato especificado.</p>
    </div>
  </div>
</body>
</html>
`;

  // Usar a função generatePDF do pdfService
  logger.info(`[ActionPlanPDF] HTML gerado, tamanho: ${html.length} caracteres`);
  try {
    const { generatePDF } = await import('./pdfService');
    const pdfBuffer = await generatePDF(html);
    logger.info(`[ActionPlanPDF] PDF gerado com sucesso, tamanho: ${pdfBuffer.length} bytes`);
    return pdfBuffer;
  } catch (error) {
    logger.error('[ActionPlanPDF] Erro ao gerar PDF:', error);
    throw error;
  }
}
