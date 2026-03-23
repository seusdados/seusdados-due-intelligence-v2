// Serviço de Relatórios de Tickets MeuDPO
// Gera relatórios em PDF com métricas de tickets

import { getDb } from "./db";
import { tickets, users, organizations } from "../drizzle/schema";
import { and, eq, gte, lte, sql, desc, count } from "drizzle-orm";
import { TRPCError } from '@trpc/server';

// ==================== TIPOS ====================

export interface TicketReportFilters {
  organizationId?: number;
  consultantId?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}

export interface TicketMetrics {
  totalTickets: number;
  ticketsAbertos: number;
  ticketsResolvidos: number;
  ticketsCancelados: number;
  ticketsEmAtraso: number;
  tempoMedioResolucao: number; // em horas
  slaCumprido: number; // porcentagem
  ticketsPorTipo: { tipo: string; quantidade: number }[];
  ticketsPorPrioridade: { prioridade: string; quantidade: number }[];
  ticketsPorStatus: { status: string; quantidade: number }[];
  ticketsPorConsultor: { consultor: string; quantidade: number; resolvidos: number }[];
}

export interface TicketReportData {
  titulo: string;
  periodo: string;
  organizacao?: string;
  consultor?: string;
  geradoEm: string;
  metricas: TicketMetrics;
  tickets: {
    id: number;
    titulo: string;
    tipo: string;
    prioridade: string;
    status: string;
    criadoEm: string;
    prazo?: string;
    resolvidoEm?: string;
    responsavel?: string;
    organizacao: string;
  }[];
}

// ==================== FUNÇÕES DE RELATÓRIO ====================

/**
 * Gera dados do relatório de tickets
 */
export async function generateTicketReportData(filters: TicketReportFilters): Promise<TicketReportData> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const { organizationId, consultantId, dateFrom, dateTo, status } = filters;

  // Construir condições de filtro
  const conditions: any[] = [];
  
  if (organizationId) {
    conditions.push(eq(tickets.organizationId, organizationId));
  }
  
  if (consultantId) {
    conditions.push(eq(tickets.assignedToId, consultantId));
  }
  
  if (dateFrom) {
    conditions.push(gte(tickets.createdAt, dateFrom));
  }
  
  if (dateTo) {
    conditions.push(lte(tickets.createdAt, dateTo));
  }
  
  if (status) {
    conditions.push(eq(tickets.status, status as any));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Buscar tickets
  const ticketsList = await db.select({
    id: tickets.id,
    title: tickets.title,
    ticketType: tickets.ticketType,
    priority: tickets.priority,
    status: tickets.status,
    createdAt: tickets.createdAt,
    deadline: tickets.deadline,
    assignedToId: tickets.assignedToId,
    organizationId: tickets.organizationId
  })
  .from(tickets)
  .where(whereClause)
  .orderBy(desc(tickets.createdAt))
  .limit(1000);

  // Buscar nomes das organizações e responsáveis
  const orgIds = Array.from(new Set(ticketsList.map(t => t.organizationId)));
  const userIds = Array.from(new Set(ticketsList.filter(t => t.assignedToId).map(t => t.assignedToId!)));

  const orgsMap = new Map<number, string>();
  const usersMap = new Map<number, string>();

  if (orgIds.length > 0) {
    const orgs = await db.select({ id: organizations.id, name: organizations.name })
      .from(organizations);
    orgs.forEach(o => orgsMap.set(o.id, o.name));
  }

  if (userIds.length > 0) {
    const usersList = await db.select({ id: users.id, name: users.name })
      .from(users);
    usersList.forEach(u => usersMap.set(u.id, u.name || 'Sem nome'));
  }

  // Calcular métricas
  const now = new Date();
  const totalTickets = ticketsList.length;
  const ticketsAbertos = ticketsList.filter(t => !['resolvido', 'cancelado'].includes(t.status)).length;
  const ticketsResolvidos = ticketsList.filter(t => t.status === 'resolvido').length;
  const ticketsCancelados = ticketsList.filter(t => t.status === 'cancelado').length;
  const ticketsEmAtraso = ticketsList.filter(t => 
    t.deadline && new Date(t.deadline) < now && !['resolvido', 'cancelado'].includes(t.status)
  ).length;

  // Tempo médio de resolução (estimado baseado em tickets resolvidos)
  const resolvedTickets = ticketsList.filter(t => t.status === 'resolvido');
  let tempoMedioResolucao = 0;
  if (resolvedTickets.length > 0) {
    // Estimativa: 24h para tickets resolvidos (sem campo resolvedAt)
    tempoMedioResolucao = 24;
  }

  // SLA cumprido (estimado baseado em tickets não atrasados)
  const ticketsComPrazo = ticketsList.filter(t => t.deadline);
  let slaCumprido = 100;
  if (ticketsComPrazo.length > 0) {
    const naoAtrasados = ticketsComPrazo.filter(t => 
      t.status === 'resolvido' || (t.deadline && new Date(t.deadline) > now)
    ).length;
    slaCumprido = Math.round((naoAtrasados / ticketsComPrazo.length) * 100);
  }

  // Tickets por tipo
  const tiposMap = new Map<string, number>();
  ticketsList.forEach(t => {
    tiposMap.set(t.ticketType, (tiposMap.get(t.ticketType) || 0) + 1);
  });
  const ticketsPorTipo = Array.from(tiposMap.entries()).map(([tipo, quantidade]) => ({
    tipo: formatTicketType(tipo),
    quantidade
  }));

  // Tickets por prioridade
  const prioridadesMap = new Map<string, number>();
  ticketsList.forEach(t => {
    prioridadesMap.set(t.priority, (prioridadesMap.get(t.priority) || 0) + 1);
  });
  const ticketsPorPrioridade = Array.from(prioridadesMap.entries()).map(([prioridade, quantidade]) => ({
    prioridade: formatPriority(prioridade),
    quantidade
  }));

  // Tickets por status
  const statusMap = new Map<string, number>();
  ticketsList.forEach(t => {
    statusMap.set(t.status, (statusMap.get(t.status) || 0) + 1);
  });
  const ticketsPorStatus = Array.from(statusMap.entries()).map(([status, quantidade]) => ({
    status: formatStatus(status),
    quantidade
  }));

  // Tickets por consultor
  const consultorMap = new Map<number, { nome: string; total: number; resolvidos: number }>();
  ticketsList.forEach(t => {
    if (t.assignedToId) {
      const existing = consultorMap.get(t.assignedToId) || { 
        nome: usersMap.get(t.assignedToId) || 'Desconhecido', 
        total: 0, 
        resolvidos: 0 
      };
      existing.total++;
      if (t.status === 'resolvido') existing.resolvidos++;
      consultorMap.set(t.assignedToId, existing);
    }
  });
  const ticketsPorConsultor = Array.from(consultorMap.values()).map(c => ({
    consultor: c.nome,
    quantidade: c.total,
    resolvidos: c.resolvidos
  }));

  // Buscar nome da organização e consultor para o título
  let organizacaoNome: string | undefined;
  let consultorNome: string | undefined;

  if (organizationId) {
    organizacaoNome = orgsMap.get(organizationId);
  }

  if (consultantId) {
    consultorNome = usersMap.get(consultantId);
  }

  // Formatar período
  let periodo = 'Todos os períodos';
  if (dateFrom && dateTo) {
    periodo = `${formatDate(dateFrom)} a ${formatDate(dateTo)}`;
  } else if (dateFrom) {
    periodo = `A partir de ${formatDate(dateFrom)}`;
  } else if (dateTo) {
    periodo = `Até ${formatDate(dateTo)}`;
  }

  return {
    titulo: 'Relatório de Tickets MeuDPO',
    periodo,
    organizacao: organizacaoNome,
    consultor: consultorNome,
    geradoEm: new Date().toISOString(),
    metricas: {
      totalTickets,
      ticketsAbertos,
      ticketsResolvidos,
      ticketsCancelados,
      ticketsEmAtraso,
      tempoMedioResolucao,
      slaCumprido,
      ticketsPorTipo,
      ticketsPorPrioridade,
      ticketsPorStatus,
      ticketsPorConsultor
    },
    tickets: ticketsList.map(t => ({
      id: t.id,
      titulo: t.title,
      tipo: formatTicketType(t.ticketType),
      prioridade: formatPriority(t.priority),
      status: formatStatus(t.status),
      criadoEm: t.createdAt,
      prazo: t.deadline || undefined,
      resolvidoEm: undefined,
      responsavel: t.assignedToId ? usersMap.get(t.assignedToId) : undefined,
      organizacao: orgsMap.get(t.organizationId) || 'Desconhecida'
    }))
  };
}

/**
 * Gera HTML do relatório para conversão em PDF
 */
export function generateTicketReportHTML(data: TicketReportData): string {
  const { titulo, periodo, organizacao, consultor, geradoEm, metricas, tickets } = data;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #1e293b;
      background: #fff;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #7c3aed;
    }
    
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #7c3aed;
      margin-bottom: 10px;
    }
    
    .title {
      font-size: 20px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 5px;
    }
    
    .subtitle {
      font-size: 14px;
      color: #64748b;
    }
    
    .meta {
      display: flex;
      justify-content: space-between;
      margin-top: 15px;
      font-size: 11px;
      color: #64748b;
    }
    
    .section {
      margin-bottom: 30px;
    }
    
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 15px;
      padding-bottom: 5px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    
    .metric-card {
      background: #f8fafc;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    
    .metric-value {
      font-size: 24px;
      font-weight: 700;
      color: #7c3aed;
    }
    
    .metric-label {
      font-size: 10px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .metric-value.success { color: #22c55e; }
    .metric-value.warning { color: #f59e0b; }
    .metric-value.danger { color: #ef4444; }
    
    .chart-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .chart-card {
      background: #f8fafc;
      border-radius: 8px;
      padding: 15px;
    }
    
    .chart-title {
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 10px;
    }
    
    .bar-chart {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .bar-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .bar-label {
      width: 120px;
      font-size: 10px;
      color: #64748b;
    }
    
    .bar-container {
      flex: 1;
      height: 16px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #7c3aed, #a855f7);
      border-radius: 4px;
    }
    
    .bar-value {
      width: 40px;
      font-size: 10px;
      font-weight: 600;
      text-align: right;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    
    th {
      background: #f1f5f9;
      padding: 10px 8px;
      text-align: left;
      font-weight: 600;
      color: #475569;
      border-bottom: 2px solid #e2e8f0;
    }
    
    td {
      padding: 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    tr:nth-child(even) {
      background: #f8fafc;
    }
    
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 500;
    }
    
    .badge-novo { background: #dbeafe; color: #1d4ed8; }
    .badge-em_analise { background: #fef3c7; color: #b45309; }
    .badge-aguardando { background: #f3e8ff; color: #7c3aed; }
    .badge-resolvido { background: #dcfce7; color: #16a34a; }
    .badge-cancelado { background: #f1f5f9; color: #64748b; }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
    }
    
    @media print {
      .container { padding: 20px; }
      .metrics-grid { grid-template-columns: repeat(4, 1fr); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">seusdados</div>
      <h1 class="title">${titulo}</h1>
      <p class="subtitle">${organizacao ? `Organização: ${organizacao}` : 'Todas as Organizações'}${consultor ? ` | Consultor: ${consultor}` : ''}</p>
      <div class="meta">
        <span>Período: ${periodo}</span>
        <span>Gerado em: ${formatDateTime(geradoEm)}</span>
      </div>
    </div>
    
    <div class="section">
      <h2 class="section-title">Resumo Executivo</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${metricas.totalTickets}</div>
          <div class="metric-label">Total de Tickets</div>
        </div>
        <div class="metric-card">
          <div class="metric-value warning">${metricas.ticketsAbertos}</div>
          <div class="metric-label">Em Aberto</div>
        </div>
        <div class="metric-card">
          <div class="metric-value success">${metricas.ticketsResolvidos}</div>
          <div class="metric-label">Resolvidos</div>
        </div>
        <div class="metric-card">
          <div class="metric-value danger">${metricas.ticketsEmAtraso}</div>
          <div class="metric-label">Em Atraso</div>
        </div>
      </div>
      
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${metricas.tempoMedioResolucao}h</div>
          <div class="metric-label">Tempo Médio Resolução</div>
        </div>
        <div class="metric-card">
          <div class="metric-value ${metricas.slaCumprido >= 90 ? 'success' : metricas.slaCumprido >= 70 ? 'warning' : 'danger'}">${metricas.slaCumprido}%</div>
          <div class="metric-label">SLA Cumprido</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${metricas.ticketsCancelados}</div>
          <div class="metric-label">Cancelados</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${metricas.ticketsPorConsultor.length}</div>
          <div class="metric-label">Consultores Ativos</div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h2 class="section-title">Distribuição por Categoria</h2>
      <div class="chart-row">
        <div class="chart-card">
          <div class="chart-title">Por Tipo</div>
          <div class="bar-chart">
            ${metricas.ticketsPorTipo.map(t => `
              <div class="bar-item">
                <span class="bar-label">${t.tipo}</span>
                <div class="bar-container">
                  <div class="bar-fill" style="width: ${(t.quantidade / metricas.totalTickets) * 100}%"></div>
                </div>
                <span class="bar-value">${t.quantidade}</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-title">Por Prioridade</div>
          <div class="bar-chart">
            ${metricas.ticketsPorPrioridade.map(p => `
              <div class="bar-item">
                <span class="bar-label">${p.prioridade}</span>
                <div class="bar-container">
                  <div class="bar-fill" style="width: ${(p.quantidade / metricas.totalTickets) * 100}%"></div>
                </div>
                <span class="bar-value">${p.quantidade}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      
      <div class="chart-row">
        <div class="chart-card">
          <div class="chart-title">Por Status</div>
          <div class="bar-chart">
            ${metricas.ticketsPorStatus.map(s => `
              <div class="bar-item">
                <span class="bar-label">${s.status}</span>
                <div class="bar-container">
                  <div class="bar-fill" style="width: ${(s.quantidade / metricas.totalTickets) * 100}%"></div>
                </div>
                <span class="bar-value">${s.quantidade}</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-title">Por Consultor</div>
          <div class="bar-chart">
            ${metricas.ticketsPorConsultor.slice(0, 5).map(c => `
              <div class="bar-item">
                <span class="bar-label">${c.consultor}</span>
                <div class="bar-container">
                  <div class="bar-fill" style="width: ${(c.quantidade / metricas.totalTickets) * 100}%"></div>
                </div>
                <span class="bar-value">${c.quantidade}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h2 class="section-title">Lista de Tickets (${tickets.length})</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Título</th>
            <th>Tipo</th>
            <th>Prioridade</th>
            <th>Status</th>
            <th>Criado</th>
            <th>Prazo</th>
            <th>Responsável</th>
          </tr>
        </thead>
        <tbody>
          ${tickets.slice(0, 50).map(t => `
            <tr>
              <td>${t.id}</td>
              <td>${t.titulo.substring(0, 40)}${t.titulo.length > 40 ? '...' : ''}</td>
              <td>${t.tipo}</td>
              <td>${t.prioridade}</td>
              <td><span class="badge badge-${t.status.toLowerCase().replace(/[^a-z]/g, '_')}">${t.status}</span></td>
              <td>${formatDate(t.criadoEm)}</td>
              <td>${t.prazo ? formatDate(t.prazo) : '-'}</td>
              <td>${t.responsavel || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${tickets.length > 50 ? `<p style="margin-top: 10px; font-size: 10px; color: #64748b;">Exibindo 50 de ${tickets.length} tickets</p>` : ''}
    </div>
    
    <div class="footer">
      <p>Seusdados Consultoria em Gestão de Dados Ltda. | CNPJ 33.899.116/0001-63</p>
      <p>www.seusdados.com | dpo@seusdados.com | +55 11 4040 5552</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ==================== FUNÇÕES AUXILIARES ====================

function formatTicketType(type: string): string {
  const types: Record<string, string> = {
    solicitacao_titular: "Solicitação de Titular",
    incidente_seguranca: "Incidente de Segurança",
    duvida_juridica: "Dúvida Jurídica",
    consultoria_geral: "Consultoria Geral",
    auditoria: "Auditoria",
    treinamento: "Treinamento",
    documentacao: "Documentação"
  };
  return types[type] || type;
}

function formatPriority(priority: string): string {
  const priorities: Record<string, string> = {
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
    critica: "Crítica"
  };
  return priorities[priority] || priority;
}

function formatStatus(status: string): string {
  const statuses: Record<string, string> = {
    novo: "Novo",
    em_analise: "Em Análise",
    aguardando_cliente: "Aguardando Cliente",
    aguardando_terceiro: "Aguardando Terceiro",
    resolvido: "Resolvido",
    cancelado: "Cancelado"
  };
  return statuses[status] || status;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
