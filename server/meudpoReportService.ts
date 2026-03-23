import { eq, and, gte, lte, sql, desc, count } from "drizzle-orm";
import { getDb } from "./db";
import {
  tickets,
  ticketComments,
  organizations,
  users,
  complianceAssessments,
  thirdPartyAssessments,
  meudpoSettings,
} from "../drizzle/schema";
import { generatePDF } from "./pdfService";
import { TRPCError } from '@trpc/server';

interface ReportFilters {
  organizationId: number;
  startDate?: Date;
  endDate?: Date;
}

interface TicketMetrics {
  total: number;
  abertos: number;
  emAndamento: number;
  resolvidos: number;
  fechados: number;
  porPrioridade: {
    critica: number;
    alta: number;
    media: number;
    baixa: number;
  };
  porTipo: Record<string, number>;
  tempoMedioResolucao: number;
  slaAtendido: number;
  slaViolado: number;
}

interface ConsolidatedReportData {
  organization: {
    id: number;
    name: string;
    tradeName?: string;
    cnpj?: string;
  };
  period: {
    start: string;
    end: string;
  };
  tickets: TicketMetrics;
  compliance: {
    total: number;
    concluidas: number;
    emAndamento: number;
    mediaMaturidade: number;
  };
  dueDiligence: {
    total: number;
    concluidas: number;
    emAndamento: number;
    mediaScore: number;
  };
  generatedAt: string;
  generatedBy: string;
}

// Gerar dados do relatório consolidado
export async function generateConsolidatedReportData(
  filters: ReportFilters,
  userId: number
): Promise<ConsolidatedReportData> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const { organizationId, startDate, endDate } = filters;
  const now = new Date();
  const defaultStartDate = startDate || new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const defaultEndDate = endDate || now;

  // Buscar organização
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId));

  if (!org) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Organização não encontrada' });

  // Buscar usuário que gerou
  const [user] = await db.select().from(users).where(eq(users.id, userId));

  // Buscar métricas de tickets
  const ticketMetrics = await getTicketMetrics(db, organizationId, defaultStartDate, defaultEndDate);

  // Buscar métricas de compliance
  const complianceMetrics = await getComplianceMetrics(db, organizationId, defaultStartDate, defaultEndDate);

  // Buscar métricas de due diligence
  const dueDiligenceMetrics = await getDueDiligenceMetrics(db, organizationId, defaultStartDate, defaultEndDate);

  return {
    organization: {
      id: org.id,
      name: org.name,
      tradeName: org.tradeName || undefined,
      cnpj: org.cnpj || undefined,
    },
    period: {
      start: defaultStartDate.toISOString().split("T")[0],
      end: defaultEndDate.toISOString().split("T")[0],
    },
    tickets: ticketMetrics,
    compliance: complianceMetrics,
    dueDiligence: dueDiligenceMetrics,
    generatedAt: now.toISOString(),
    generatedBy: user?.name || "Sistema",
  };
}

async function getTicketMetrics(
  db: any,
  organizationId: number,
  startDate: Date,
  endDate: Date
): Promise<TicketMetrics> {
  // Total de tickets no período
  const allTickets = await db
    .select()
    .from(tickets)
    .where(
      and(
        eq(tickets.organizationId, organizationId),
        sql`${tickets.createdAt} >= ${startDate}`,
        sql`${tickets.createdAt} <= ${endDate}`
      )
    );

  const total = allTickets.length;
  const abertos = allTickets.filter((t: any) => t.status === "aberto").length;
  const emAndamento = allTickets.filter((t: any) => t.status === "em_andamento").length;
  const resolvidos = allTickets.filter((t: any) => t.status === "resolvido").length;
  const fechados = allTickets.filter((t: any) => t.status === "fechado").length;

  const porPrioridade = {
    critica: allTickets.filter((t: any) => t.priority === "critica").length,
    alta: allTickets.filter((t: any) => t.priority === "alta").length,
    media: allTickets.filter((t: any) => t.priority === "media").length,
    baixa: allTickets.filter((t: any) => t.priority === "baixa").length,
  };

  const porTipo: Record<string, number> = {};
  allTickets.forEach((t: any) => {
    porTipo[t.ticketType] = (porTipo[t.ticketType] || 0) + 1;
  });

  // Calcular tempo médio de resolução (em horas)
  const resolvedTickets = allTickets.filter(
    (t: any) => t.status === "resolvido" || t.status === "fechado"
  );
  let tempoMedioResolucao = 0;
  if (resolvedTickets.length > 0) {
    const totalHours = resolvedTickets.reduce((acc: number, t: any) => {
      if (t.resolvedAt && t.createdAt) {
        const diff = new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime();
        return acc + diff / (1000 * 60 * 60);
      }
      return acc;
    }, 0);
    tempoMedioResolucao = Math.round(totalHours / resolvedTickets.length);
  }

  // Calcular SLA (simplificado - baseado em prioridade)
  const slaLimits: Record<string, number> = {
    critica: 4,
    alta: 8,
    media: 24,
    baixa: 72,
  };

  let slaAtendido = 0;
  let slaViolado = 0;
  resolvedTickets.forEach((t: any) => {
    if (t.resolvedAt && t.createdAt) {
      const hours = (new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
      const limit = slaLimits[t.priority] || 24;
      if (hours <= limit) {
        slaAtendido++;
      } else {
        slaViolado++;
      }
    }
  });

  return {
    total,
    abertos,
    emAndamento,
    resolvidos,
    fechados,
    porPrioridade,
    porTipo,
    tempoMedioResolucao,
    slaAtendido,
    slaViolado,
  };
}

async function getComplianceMetrics(
  db: any,
  organizationId: number,
  startDate: Date,
  endDate: Date
) {
  const assessments = await db
    .select()
    .from(complianceAssessments)
    .where(
      and(
        eq(complianceAssessments.organizationId, organizationId),
        sql`${complianceAssessments.createdAt} >= ${startDate}`,
        sql`${complianceAssessments.createdAt} <= ${endDate}`
      )
    );

  const total = assessments.length;
  const concluidas = assessments.filter((a: any) => a.status === "completed").length;
  const emAndamento = assessments.filter((a: any) => a.status === "in_progress").length;

  const completedWithScore = assessments.filter(
    (a: any) => a.status === "completed" && a.maturityLevel
  );
  const mediaMaturidade =
    completedWithScore.length > 0
      ? completedWithScore.reduce((acc: number, a: any) => acc + (a.maturityLevel || 0), 0) /
        completedWithScore.length
      : 0;

  return {
    total,
    concluidas,
    emAndamento,
    mediaMaturidade: Math.round(mediaMaturidade * 10) / 10,
  };
}

async function getDueDiligenceMetrics(
  db: any,
  organizationId: number,
  startDate: Date,
  endDate: Date
) {
  const assessments = await db
    .select()
    .from(thirdPartyAssessments)
    .where(
      and(
        eq(thirdPartyAssessments.organizationId, organizationId),
        sql`${thirdPartyAssessments.createdAt} >= ${startDate}`,
        sql`${thirdPartyAssessments.createdAt} <= ${endDate}`
      )
    );

  const total = assessments.length;
  const concluidas = assessments.filter((a: any) => a.status === "completed").length;
  const emAndamento = assessments.filter((a: any) => a.status === "in_progress").length;

  const completedWithScore = assessments.filter(
    (a: any) => a.status === "completed" && a.overallScore
  );
  const mediaScore =
    completedWithScore.length > 0
      ? completedWithScore.reduce((acc: number, a: any) => acc + (a.overallScore || 0), 0) /
        completedWithScore.length
      : 0;

  return {
    total,
    concluidas,
    emAndamento,
    mediaScore: Math.round(mediaScore * 10) / 10,
  };
}

// Gerar HTML do relatório
export function generateConsolidatedReportHTML(data: ConsolidatedReportData): string {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR");
  };

  const slaPercentage =
    data.tickets.slaAtendido + data.tickets.slaViolado > 0
      ? Math.round(
          (data.tickets.slaAtendido / (data.tickets.slaAtendido + data.tickets.slaViolado)) * 100
        )
      : 0;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório Consolidado - ${data.organization.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; line-height: 1.5; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #5f29cc 0%, #7c3aed 100%); color: white; padding: 30px; margin-bottom: 20px; border-radius: 8px; }
    .header h1 { font-size: 24px; margin-bottom: 5px; }
    .header p { opacity: 0.9; }
    .section { background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .section-title { font-size: 16px; font-weight: 600; color: #5f29cc; margin-bottom: 15px; border-bottom: 2px solid #5f29cc; padding-bottom: 8px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
    .metric-card { background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .metric-value { font-size: 28px; font-weight: 700; color: #5f29cc; }
    .metric-label { font-size: 11px; color: #666; margin-top: 5px; }
    .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    .table th, .table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    .table th { background: #5f29cc; color: white; font-weight: 600; }
    .table tr:nth-child(even) { background: #f8f9fa; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .footer { text-align: center; color: #666; font-size: 10px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
    .two-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .progress-bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; margin-top: 5px; }
    .progress-fill { height: 100%; background: #5f29cc; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Relatório Consolidado de Auditoria</h1>
      <p>${data.organization.name}${data.organization.tradeName ? ` (${data.organization.tradeName})` : ""}</p>
      <p style="margin-top: 10px; font-size: 11px;">
        Período: ${formatDate(data.period.start)} a ${formatDate(data.period.end)}
      </p>
    </div>

    <div class="section">
      <div class="section-title">📊 Resumo Executivo - MeuDPO (Tickets)</div>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${data.tickets.total}</div>
          <div class="metric-label">Total de Tickets</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${data.tickets.resolvidos + data.tickets.fechados}</div>
          <div class="metric-label">Resolvidos</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${data.tickets.tempoMedioResolucao}h</div>
          <div class="metric-label">Tempo Médio Resolução</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${slaPercentage}%</div>
          <div class="metric-label">SLA Atendido</div>
        </div>
      </div>

      <div class="two-cols" style="margin-top: 20px;">
        <div>
          <h4 style="margin-bottom: 10px;">Por Status</h4>
          <table class="table">
            <tr><td>Abertos</td><td style="text-align: right;"><strong>${data.tickets.abertos}</strong></td></tr>
            <tr><td>Em Andamento</td><td style="text-align: right;"><strong>${data.tickets.emAndamento}</strong></td></tr>
            <tr><td>Resolvidos</td><td style="text-align: right;"><strong>${data.tickets.resolvidos}</strong></td></tr>
            <tr><td>Fechados</td><td style="text-align: right;"><strong>${data.tickets.fechados}</strong></td></tr>
          </table>
        </div>
        <div>
          <h4 style="margin-bottom: 10px;">Por Prioridade</h4>
          <table class="table">
            <tr><td><span class="badge badge-danger">Crítica</span></td><td style="text-align: right;"><strong>${data.tickets.porPrioridade.critica}</strong></td></tr>
            <tr><td><span class="badge badge-warning">Alta</span></td><td style="text-align: right;"><strong>${data.tickets.porPrioridade.alta}</strong></td></tr>
            <tr><td><span class="badge" style="background: #dbeafe; color: #1e40af;">Média</span></td><td style="text-align: right;"><strong>${data.tickets.porPrioridade.media}</strong></td></tr>
            <tr><td><span class="badge badge-success">Baixa</span></td><td style="text-align: right;"><strong>${data.tickets.porPrioridade.baixa}</strong></td></tr>
          </table>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">✅ Conformidade PPPD</div>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${data.compliance.total}</div>
          <div class="metric-label">Total Avaliações</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${data.compliance.concluidas}</div>
          <div class="metric-label">Concluídas</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${data.compliance.emAndamento}</div>
          <div class="metric-label">Em Andamento</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${data.compliance.mediaMaturidade}</div>
          <div class="metric-label">Média Maturidade</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">🔍 Due Diligence de Terceiros</div>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${data.dueDiligence.total}</div>
          <div class="metric-label">Total Avaliações</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${data.dueDiligence.concluidas}</div>
          <div class="metric-label">Concluídas</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${data.dueDiligence.emAndamento}</div>
          <div class="metric-label">Em Andamento</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${data.dueDiligence.mediaScore}%</div>
          <div class="metric-label">Score Médio</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>Relatório gerado em ${formatDate(data.generatedAt)} por ${data.generatedBy}</p>
      <p style="margin-top: 5px;">Seusdados Consultoria - Plataforma de Due Diligence e Conformidade</p>
    </div>
  </div>
</body>
</html>
  `;
}

// Gerar PDF do relatório
export async function generateConsolidatedReportPDF(
  filters: ReportFilters,
  userId: number
): Promise<Buffer> {
  const data = await generateConsolidatedReportData(filters, userId);
  const html = generateConsolidatedReportHTML(data);
  return generatePDF(html);
}
