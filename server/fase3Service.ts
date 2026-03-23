// server/fase3Service.ts
// Fase 3 - Central de Direitos do Titular
// Motor de consolidação de fluxos e gestão de solicitações LGPD

import { getDb } from "./db";
import { eq, and, like, or, desc, sql, isNotNull } from "drizzle-orm";
import {
  titularInstances,
  dataSubjectRequests,
  dataSubjectRequestHistory,
  mapeamentoResponses,
  mapeamentoProcesses,
  mapeamentoAreas,
  mapeamentoContexts,
  users,
  InsertTitularInstance,
  InsertDataSubjectRequest,
  InsertDataSubjectRequestHistory,
} from "../drizzle/schema";
import { storagePut } from "./storage";
import { TRPCError } from '@trpc/server';

// ==========================
// CONSOLIDAÇÃO DE TITULARES
// ==========================

// Mapeamento de sistemas por área (base de conhecimento)
const systemsByArea: Record<string, string> = {
  "RH": "Sistema de RH (ERP/Folha)",
  "Financeiro": "Sistema Financeiro (ERP)",
  "Comercial": "CRM",
  "Marketing": "Plataforma de Marketing (Mailchimp/RD Station)",
  "Atendimento ao Cliente": "Sistema de Tickets/Helpdesk",
  "TI": "Active Directory / IAM",
  "Jurídico": "Sistema de Gestão de Contratos",
  "Recepção": "Sistema de Agendamento",
  "Vendas": "CRM",
  "Produção": "Sistema de Produção (MES)",
  "Logística": "Sistema de Logística (WMS/TMS)",
  "Compras": "Sistema de Compras (ERP)",
  "Qualidade": "Sistema de Gestão da Qualidade (SGQ)",
};

// Consolida instâncias de titulares após conclusão da Fase 2
export async function consolidateTitularInstances(organizationId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Limpar instâncias antigas desta organização
  await db.delete(titularInstances).where(eq(titularInstances.organizationId, organizationId));

  // Buscar todas as respostas completas da organização
  const responses = await db
    .select({
      id: mapeamentoResponses.id,
      organizationId: mapeamentoResponses.organizationId,
      processId: mapeamentoResponses.processId,
      titularCategories: mapeamentoResponses.titularCategories,
      dataCategories: mapeamentoResponses.dataCategories,
      legalBase: mapeamentoResponses.legalBase,
      sharing: mapeamentoResponses.sharing,
      retentionPeriod: mapeamentoResponses.retentionPeriod,
      storageLocation: mapeamentoResponses.storageLocation,
    })
    .from(mapeamentoResponses)
    .where(
      and(
        eq(mapeamentoResponses.organizationId, organizationId),
        eq(mapeamentoResponses.completed, 1)
      )
    );

  let instancesCreated = 0;

  for (const resp of responses) {
    if (!resp.titularCategories || !Array.isArray(resp.titularCategories)) continue;

    // Buscar informações do processo e área
    const [process] = await db
      .select({
        title: mapeamentoProcesses.title,
        areaId: mapeamentoProcesses.areaId,
      })
      .from(mapeamentoProcesses)
      .where(eq(mapeamentoProcesses.id, resp.processId));

    if (!process) continue;

    const [area] = await db
      .select({ name: mapeamentoAreas.name })
      .from(mapeamentoAreas)
      .where(eq(mapeamentoAreas.id, process.areaId));

    const areaName = area?.name || "Não identificada";
    const systemName = systemsByArea[areaName] || resp.storageLocation || "Sistema Genérico";

    // Verificar se há dados sensíveis
    const dataCategories = resp.dataCategories as Array<{ name: string; sensivel?: boolean }> || [];
    const hasSensitiveData = dataCategories.some(d => d.sensivel === true);

    // Criar uma instância para cada categoria de titular
    for (const titularCat of resp.titularCategories as string[]) {
      await db.insert(titularInstances).values({
        organizationId,
        titularName: `Categoria: ${titularCat}`,
        titularCategory: titularCat,
        processId: resp.processId,
        responseId: resp.id,
        systemName,
        databaseTable: process.title.toLowerCase().replace(/\s+/g, "_"),
        legalBasis: resp.legalBase || "Não identificada",
        purpose: process.title,
        sharing: resp.sharing || [],
        retentionPeriod: resp.retentionPeriod || "Não definido",
        dataCategories: resp.dataCategories || [],
        hasSensitiveData: hasSensitiveData ? 1 : 0,
      } as any);
      instancesCreated++;
    }
  }

  return instancesCreated;
}

// Busca por titular com fuzzy match
export async function searchTitular(
  organizationId: number,
  query: string
): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const results = await db
    .select({
      id: titularInstances.id,
      titularName: titularInstances.titularName,
      titularEmail: titularInstances.titularEmail,
      titularDocument: titularInstances.titularDocument,
      titularCategory: titularInstances.titularCategory,
      processId: titularInstances.processId,
      systemName: titularInstances.systemName,
      legalBasis: titularInstances.legalBasis,
      purpose: titularInstances.purpose,
      sharing: titularInstances.sharing,
      retentionPeriod: titularInstances.retentionPeriod,
      dataCategories: titularInstances.dataCategories,
      hasSensitiveData: titularInstances.hasSensitiveData,
    })
    .from(titularInstances)
    .where(
      and(
        eq(titularInstances.organizationId, organizationId),
        or(
          like(titularInstances.titularName, `%${query}%`),
          like(titularInstances.titularEmail, `%${query}%`),
          like(titularInstances.titularDocument, `%${query}%`),
          like(titularInstances.titularCategory, `%${query}%`)
        )
      )
    );

  // Enriquecer com informações do processo
  const enrichedResults = [];
  for (const result of results) {
    const [process] = await db
      .select({
        title: mapeamentoProcesses.title,
        areaId: mapeamentoProcesses.areaId,
      })
      .from(mapeamentoProcesses)
      .where(eq(mapeamentoProcesses.id, result.processId));

    let areaName = "Não identificada";
    if (process?.areaId) {
      const [area] = await db
        .select({ name: mapeamentoAreas.name })
        .from(mapeamentoAreas)
        .where(eq(mapeamentoAreas.id, process.areaId));
      areaName = area?.name || "Não identificada";
    }

    enrichedResults.push({
      ...result,
      processTitle: process?.title || "Não identificado",
      areaName,
    });
  }

  return enrichedResults;
}

// Listar todas as categorias de titulares da organização
export async function listTitularCategories(organizationId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const results = await db
    .selectDistinct({ category: titularInstances.titularCategory })
    .from(titularInstances)
    .where(
      and(
        eq(titularInstances.organizationId, organizationId),
        isNotNull(titularInstances.titularCategory)
      )
    );

  return results.map(r => r.category).filter(Boolean) as string[];
}

// Obter visão consolidada por categoria de titular
export async function getTitularConsolidatedView(
  organizationId: number,
  titularCategory: string
): Promise<any> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const instances = await db
    .select()
    .from(titularInstances)
    .where(
      and(
        eq(titularInstances.organizationId, organizationId),
        eq(titularInstances.titularCategory, titularCategory)
      )
    );

  // Agrupar por processo
  const processos: Record<number, any> = {};
  const sistemas = new Set<string>();
  const basesLegais = new Set<string>();
  const finalidades = new Set<string>();
  const compartilhamentos = new Set<string>();
  let temDadosSensiveis = false;

  for (const inst of instances) {
    if (!processos[inst.processId]) {
      const [process] = await db
        .select({
          title: mapeamentoProcesses.title,
          areaId: mapeamentoProcesses.areaId,
        })
        .from(mapeamentoProcesses)
        .where(eq(mapeamentoProcesses.id, inst.processId));

      let areaName = "Não identificada";
      if (process?.areaId) {
        const [area] = await db
          .select({ name: mapeamentoAreas.name })
          .from(mapeamentoAreas)
          .where(eq(mapeamentoAreas.id, process.areaId));
        areaName = area?.name || "Não identificada";
      }

      processos[inst.processId] = {
        id: inst.processId,
        title: process?.title || "Não identificado",
        area: areaName,
        instances: [],
      };
    }

    processos[inst.processId].instances.push(inst);
    sistemas.add(inst.systemName);
    if (inst.legalBasis) basesLegais.add(inst.legalBasis);
    if (inst.purpose) finalidades.add(inst.purpose);
    
    const sharing = inst.sharing as string[] || [];
    sharing.forEach(s => compartilhamentos.add(s));
    
    if (inst.hasSensitiveData) temDadosSensiveis = true;
  }

  return {
    titularCategory,
    totalInstances: instances.length,
    processos: Object.values(processos),
    sistemas: Array.from(sistemas),
    basesLegais: Array.from(basesLegais),
    finalidades: Array.from(finalidades),
    compartilhamentos: Array.from(compartilhamentos),
    temDadosSensiveis,
  };
}

// ==========================
// SOLICITAÇÕES DE DIREITOS
// ==========================

// Criar nova solicitação de direito
export async function createRequest(data: {
  organizationId: number;
  titularName: string;
  titularEmail?: string;
  titularDocument?: string;
  requestType: string;
  description?: string;
  receivedVia?: string;
  externalProtocol?: string;
  createdById?: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Calcular prazo (15 dias conforme LGPD)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 15);

  const result = await db.insert(dataSubjectRequests).values({
    ...data,
    dueDate: dueDate.toISOString().slice(0, 19).replace('T', ' '),
  } as any).returning({ id: dataSubjectRequests.id });

  const requestId = Number(result[0]?.id || 0);

  // Registrar no histórico
  await addRequestHistory(requestId, {
    action: "criacao",
    newStatus: "recebida",
    notes: `Solicitação de ${data.requestType} criada`,
    performedById: data.createdById,
  });

  return requestId;
}

// Listar solicitações
export async function listRequests(
  organizationId: number,
  filters?: {
    status?: string;
    requestType?: string;
    limit?: number;
  }
): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  let query = db
    .select()
    .from(dataSubjectRequests)
    .where(eq(dataSubjectRequests.organizationId, organizationId))
    .orderBy(desc(dataSubjectRequests.createdAt));

  const results = await query;

  // Filtrar em memória se necessário
  let filtered = results;
  if (filters?.status) {
    filtered = filtered.filter(r => r.status === filters.status);
  }
  if (filters?.requestType) {
    filtered = filtered.filter(r => r.requestType === filters.requestType);
  }
  if (filters?.limit) {
    filtered = filtered.slice(0, filters.limit);
  }

  // Enriquecer com informações do responsável
  const enriched = [];
  for (const req of filtered) {
    let assignedTo = null;
    if (req.assignedToId) {
      const [user] = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, req.assignedToId));
      assignedTo = user;
    }

    // Calcular dias restantes
    const now = new Date();
    const due = req.dueDate ? new Date(req.dueDate) : null;
    const daysRemaining = due ? Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

    enriched.push({
      ...req,
      assignedTo,
      daysRemaining,
      isOverdue: daysRemaining !== null && daysRemaining < 0 && req.status !== 'respondida' && req.status !== 'negada' && req.status !== 'arquivada',
    });
  }

  return enriched;
}

// Obter detalhes de uma solicitação
export async function getRequest(requestId: number): Promise<any> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const [request] = await db
    .select()
    .from(dataSubjectRequests)
    .where(eq(dataSubjectRequests.id, requestId));

  if (!request) return null;

  // Buscar histórico
  const history = await db
    .select()
    .from(dataSubjectRequestHistory)
    .where(eq(dataSubjectRequestHistory.requestId, requestId))
    .orderBy(desc(dataSubjectRequestHistory.createdAt));

  // Enriquecer histórico com nomes
  const enrichedHistory = [];
  for (const h of history) {
    let performedBy = null;
    if (h.performedById) {
      const [user] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, h.performedById));
      performedBy = user?.name;
    }
    enrichedHistory.push({ ...h, performedBy });
  }

  // Buscar dados do titular na organização
  const titularData = await searchTitular(request.organizationId, request.titularName);

  return {
    ...request,
    history: enrichedHistory,
    titularData,
  };
}

// Atualizar status da solicitação
export async function updateRequestStatus(
  requestId: number,
  newStatus: string,
  notes?: string,
  performedById?: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const [current] = await db
    .select({ status: dataSubjectRequests.status })
    .from(dataSubjectRequests)
    .where(eq(dataSubjectRequests.id, requestId));

  if (!current) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Solicitação não encontrada' });

  const updateData: any = { status: newStatus };
  if (newStatus === 'respondida' || newStatus === 'negada') {
    updateData.respondedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  }

  await db
    .update(dataSubjectRequests)
    .set(updateData)
    .where(eq(dataSubjectRequests.id, requestId));

  await addRequestHistory(requestId, {
    action: "status_change",
    previousStatus: current.status,
    newStatus,
    notes,
    performedById,
  });
}

// Atribuir responsável
export async function assignRequest(
  requestId: number,
  assignedToId: number,
  performedById?: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  await db
    .update(dataSubjectRequests)
    .set({ assignedToId })
    .where(eq(dataSubjectRequests.id, requestId));

  const [user] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, assignedToId));

  await addRequestHistory(requestId, {
    action: "assignment",
    notes: `Atribuído a ${user?.name || 'Usuário'}`,
    performedById,
  });
}

// Adicionar ao histórico
async function addRequestHistory(requestId: number, data: {
  action: string;
  previousStatus?: string;
  newStatus?: string;
  notes?: string;
  performedById?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(dataSubjectRequestHistory).values({
    requestId,
    ...data,
  } as any);
}

// ==========================
// GERAÇÃO DE RELATÓRIOS
// ==========================

// Gerar relatório de dados do titular (para direito de acesso)
export async function generateDataReport(data: {
  organizationId: number;
  titularName: string;
  titularEmail?: string;
  titularDocument?: string;
  requestId?: number;
}): Promise<string> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Buscar dados do titular
  const titularData = await searchTitular(data.organizationId, data.titularName);

  // Buscar contexto da organização
  const [context] = await db
    .select()
    .from(mapeamentoContexts)
    .where(eq(mapeamentoContexts.organizationId, data.organizationId));

  // Gerar HTML do relatório
  const html = generateReportHTML({
    titularName: data.titularName,
    titularEmail: data.titularEmail,
    titularDocument: data.titularDocument,
    organizationName: context?.segment || "Organização",
    data: titularData,
    generatedAt: new Date().toISOString(),
  });

  // Salvar no S3
  const fileName = `relatorio-titular-${Date.now()}.html`;
  const { url } = await storagePut(
    `reports/dsr/${data.organizationId}/${fileName}`,
    Buffer.from(html),
    "text/html"
  );

  // Atualizar solicitação se fornecida
  if (data.requestId) {
    await db
      .update(dataSubjectRequests)
      .set({ responseUrl: url })
      .where(eq(dataSubjectRequests.id, data.requestId));
  }

  return url;
}

// Gerar HTML do relatório
function generateReportHTML(data: {
  titularName: string;
  titularEmail?: string;
  titularDocument?: string;
  organizationName: string;
  data: any[];
  generatedAt: string;
}): string {
  const processos = data.data.reduce((acc: any, item: any) => {
    const key = item.processTitle || item.purpose;
    if (!acc[key]) {
      acc[key] = {
        title: key,
        area: item.areaName,
        items: [],
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {});

  const processosHtml = Object.values(processos).map((p: any) => `
    <div class="process-card">
      <h3>${p.title}</h3>
      <p class="area-badge">${p.area}</p>
      <table>
        <tr><th>Sistema</th><th>Base Legal</th><th>Finalidade</th><th>Retenção</th></tr>
        ${p.items.map((item: any) => `
          <tr>
            <td>${item.systemName}</td>
            <td>${item.legalBasis}</td>
            <td>${item.purpose}</td>
            <td>${item.retentionPeriod}</td>
          </tr>
        `).join('')}
      </table>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Dados do Titular - LGPD</title>
  <style>
    body { font-family: 'Inter', sans-serif; max-width: 900px; margin: 0 auto; padding: 40px; color: #1a1a2e; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
    .header h1 { margin: 0 0 10px 0; font-weight: 300; }
    .header p { margin: 5px 0; opacity: 0.9; }
    .section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .section h2 { color: #667eea; margin-top: 0; font-weight: 500; }
    .process-card { background: white; padding: 20px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .process-card h3 { margin: 0 0 10px 0; color: #1a1a2e; }
    .area-badge { display: inline-block; background: #e0e7ff; color: #667eea; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
    th { background: #f8f9fa; font-weight: 500; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
    .lgpd-notice { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Relatório de Dados Pessoais</h1>
    <p><strong>Titular:</strong> ${data.titularName}</p>
    ${data.titularEmail ? `<p><strong>E-mail:</strong> ${data.titularEmail}</p>` : ''}
    ${data.titularDocument ? `<p><strong>Documento:</strong> ${data.titularDocument}</p>` : ''}
    <p><strong>Gerado em:</strong> ${new Date(data.generatedAt).toLocaleString('pt-BR')}</p>
  </div>

  <div class="lgpd-notice">
    <strong>Direito de Acesso (Art. 18, II - LGPD)</strong><br>
    Este relatório apresenta todos os dados pessoais tratados pela organização referentes ao titular identificado.
  </div>

  <div class="section">
    <h2>Dados Tratados por Processo</h2>
    ${processosHtml || '<p>Nenhum dado encontrado para este titular.</p>'}
  </div>

  <div class="section">
    <h2>Resumo</h2>
    <p><strong>Total de processos:</strong> ${Object.keys(processos).length}</p>
    <p><strong>Total de registros:</strong> ${data.data.length}</p>
  </div>

  <div class="footer">
    <p>Relatório gerado automaticamente pela plataforma Seusdados Due Diligence</p>
    <p>Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</p>
  </div>
</body>
</html>
  `;
}

// ==========================
// ESTATÍSTICAS
// ==========================

export async function getRequestStats(organizationId: number): Promise<any> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const requests = await db
    .select()
    .from(dataSubjectRequests)
    .where(eq(dataSubjectRequests.organizationId, organizationId));

  const now = new Date();
  const stats = {
    total: requests.length,
    byStatus: {} as Record<string, number>,
    byType: {} as Record<string, number>,
    overdue: 0,
    avgResponseTime: 0,
  };

  let totalResponseTime = 0;
  let respondedCount = 0;

  for (const req of requests) {
    // Por status
    stats.byStatus[req.status] = (stats.byStatus[req.status] || 0) + 1;

    // Por tipo
    stats.byType[req.requestType] = (stats.byType[req.requestType] || 0) + 1;

    // Atrasados
    if (req.dueDate && req.status !== 'respondida' && req.status !== 'negada' && req.status !== 'arquivada') {
      const due = new Date(req.dueDate);
      if (due < now) stats.overdue++;
    }

    // Tempo médio de resposta
    if (req.respondedAt && req.receivedAt) {
      const received = new Date(req.receivedAt);
      const responded = new Date(req.respondedAt);
      totalResponseTime += responded.getTime() - received.getTime();
      respondedCount++;
    }
  }

  if (respondedCount > 0) {
    stats.avgResponseTime = Math.round(totalResponseTime / respondedCount / (1000 * 60 * 60 * 24)); // em dias
  }

  return stats;
}


// ==========================
// FUNÇÕES PÚBLICAS (SEM LOGIN)
// Conformidade com Art. 18, § 3º da LGPD
// ==========================

// Buscar solicitação por protocolo e e-mail (para consulta pública)
export async function getRequestByProtocol(
  protocol: string,
  email: string
): Promise<{
  id: number;
  externalProtocol: string | null;
  requestType: string;
  status: string;
  createdAt: string | null;
  respondedAt: string | null;
} | null> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const results = await db
    .select({
      id: dataSubjectRequests.id,
      externalProtocol: dataSubjectRequests.externalProtocol,
      requestType: dataSubjectRequests.requestType,
      status: dataSubjectRequests.status,
      createdAt: dataSubjectRequests.createdAt,
      respondedAt: dataSubjectRequests.respondedAt,
    })
    .from(dataSubjectRequests)
    .where(
      and(
        eq(dataSubjectRequests.externalProtocol, protocol),
        eq(dataSubjectRequests.titularEmail, email)
      )
    )
    .limit(1);

  return results[0] || null;
}

// Listar organizações disponíveis para solicitação pública
// Retorna apenas organizações que têm o canal de direitos habilitado
export async function getPublicOrganizations(): Promise<
  Array<{ id: number; name: string }>
> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Importar a tabela de organizações
  const { organizations } = await import("../drizzle/schema");

  // Por enquanto, retorna todas as organizações ativas
  // TODO: Adicionar campo "publicRightsEnabled" para filtrar
  const results = await db
    .select({
      id: organizations.id,
      name: organizations.name,
    })
    .from(organizations)
    .limit(100);

  return results;
}
