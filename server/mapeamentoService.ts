import { getAppBaseUrl } from "./appUrl";
import { logger } from "./_core/logger";
// server/mapeamentoService.ts
import { getDb } from "./db";
import { eq, and, desc, sql, inArray, isNull, lte } from "drizzle-orm";
import { generateRopaMarkdown, computeRopaCompleteness, shouldTriggerRipd, type RopaSnapshot } from "./ropaPremiumService";
import {
  mapeamentoContexts,
  mapeamentoAreas,
  mapeamentoRespondents,
  mapeamentoProcesses,
  mapeamentoResponses,
  riskAnalyses,
  riskActionPlans,
  users,
  rotOperations,
} from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import { ensureRipdFromRot } from "./ripdAutomationService";
import { saveDocumentToGed, saveBinaryDocumentToGed } from "./mapeamentoGedService";
import crypto from "crypto";
import { TRPCError } from "@trpc/server";

// helper: permite reuso no router sem duplicar "db not available"
export async function getDbSafe() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return db;
}

// ==========================
// KNOWLEDGE BASE - Áreas por Segmento
// ==========================

const areasBySegment: Record<string, Record<string, string[]>> = {
  saude: {
    clinica: ["Recepção", "Atendimento Médico", "Enfermagem", "Faturamento", "RH", "TI", "Administrativo"],
    hospital: ["Recepção", "Pronto-Socorro", "Internação", "Centro Cirúrgico", "UTI", "Faturamento", "RH", "TI", "Compras", "Jurídico"],
    laboratorio: ["Recepção", "Coleta", "Análises", "Laudos", "Faturamento", "RH", "TI"],
    plano_saude: ["Comercial", "Atendimento ao Cliente", "Autorização", "Faturamento", "RH", "TI", "Jurídico", "Compliance"],
  },
  educacao: {
    escola: ["Secretaria", "Coordenação Pedagógica", "Professores", "Financeiro", "RH", "TI"],
    universidade: ["Secretaria Acadêmica", "Coordenações de Curso", "Pesquisa", "Extensão", "Financeiro", "RH", "TI", "Jurídico"],
    curso_livre: ["Atendimento", "Pedagógico", "Financeiro", "Marketing", "TI"],
    plataforma_ead: ["Conteúdo", "Suporte ao Aluno", "Tecnologia", "Marketing", "Financeiro", "RH"],
  },
  varejo: {
    loja_fisica: ["Vendas", "Caixa", "Estoque", "RH", "Financeiro", "Marketing"],
    e_commerce: ["Vendas Online", "Logística", "Atendimento ao Cliente", "TI", "Marketing", "Financeiro", "RH"],
    franquia: ["Operações", "Expansão", "Marketing", "Treinamento", "Financeiro", "RH", "Jurídico"],
    atacado: ["Comercial", "Logística", "Compras", "Financeiro", "RH", "TI"],
  },
  financas: {
    banco: ["Agências", "Crédito", "Investimentos", "Compliance", "Jurídico", "TI", "RH", "Ouvidoria"],
    corretora: ["Mesa de Operações", "Compliance", "Atendimento ao Cliente", "TI", "RH", "Jurídico"],
    fintech: ["Produto", "Tecnologia", "Compliance", "Atendimento", "Marketing", "RH"],
    consultoria: ["Consultoria", "Comercial", "Administrativo", "RH", "TI"],
  },
  industria: {
    manufatura: ["Produção", "Qualidade", "Logística", "Compras", "RH", "TI", "Segurança do Trabalho", "Financeiro"],
    alimentos: ["Produção", "Qualidade", "P&D", "Logística", "Comercial", "RH", "TI", "Regulatório"],
    quimica: ["Produção", "P&D", "Qualidade", "Segurança", "Meio Ambiente", "RH", "TI", "Regulatório"],
    automotiva: ["Produção", "Engenharia", "Qualidade", "Logística", "Compras", "RH", "TI"],
  },
  servicos: {
    consultoria: ["Consultoria", "Comercial", "Projetos", "RH", "Financeiro", "TI"],
    marketing: ["Criação", "Mídia", "Atendimento", "Comercial", "RH", "Financeiro"],
    limpeza: ["Operações", "Supervisão", "RH", "Comercial", "Financeiro"],
    seguranca: ["Operações", "Monitoramento", "RH", "Comercial", "Financeiro", "Jurídico"],
  },
  tecnologia: {
    software: ["Desenvolvimento", "Produto", "QA", "Suporte", "Comercial", "RH", "Financeiro"],
    ia: ["Pesquisa", "Engenharia de ML", "Dados", "Produto", "Comercial", "RH"],
    infraestrutura: ["Operações", "Suporte", "Projetos", "Comercial", "RH", "Financeiro"],
    cloud: ["Engenharia", "Suporte", "Comercial", "Produto", "RH", "Financeiro"],
  },
};

// Processos sugeridos por área
const processesByArea: Record<string, { title: string; purpose: string }[]> = {
  "RH": [
    { title: "Recrutamento e Seleção", purpose: "Coleta e análise de currículos de candidatos" },
    { title: "Admissão de Funcionários", purpose: "Coleta de documentos e dados para registro" },
    { title: "Folha de Pagamento", purpose: "Processamento de salários e benefícios" },
    { title: "Controle de Ponto", purpose: "Registro de jornada de trabalho" },
    { title: "Treinamento e Desenvolvimento", purpose: "Gestão de capacitações" },
    { title: "Desligamento", purpose: "Processo de rescisão contratual" },
  ],
  "Financeiro": [
    { title: "Contas a Pagar", purpose: "Gestão de pagamentos a fornecedores" },
    { title: "Contas a Receber", purpose: "Gestão de recebimentos de clientes" },
    { title: "Faturamento", purpose: "Emissão de notas fiscais" },
    { title: "Conciliação Bancária", purpose: "Conferência de extratos" },
  ],
  "Comercial": [
    { title: "Prospecção de Clientes", purpose: "Captação de novos clientes" },
    { title: "Cadastro de Clientes", purpose: "Registro de dados de clientes" },
    { title: "Proposta Comercial", purpose: "Elaboração de propostas" },
    { title: "Pós-Venda", purpose: "Acompanhamento após a venda" },
  ],
  "TI": [
    { title: "Gestão de Acessos", purpose: "Controle de permissões de usuários" },
    { title: "Suporte Técnico", purpose: "Atendimento a chamados" },
    { title: "Backup de Dados", purpose: "Cópias de segurança" },
    { title: "Monitoramento de Sistemas", purpose: "Acompanhamento de infraestrutura" },
  ],
  "Atendimento ao Cliente": [
    { title: "Abertura de Chamados", purpose: "Registro de solicitações" },
    { title: "Resolução de Reclamações", purpose: "Tratamento de queixas" },
    { title: "Pesquisa de Satisfação", purpose: "Coleta de feedback" },
  ],
  "Marketing": [
    { title: "Campanhas de E-mail", purpose: "Envio de comunicações promocionais" },
    { title: "Gestão de Redes Sociais", purpose: "Publicação e interação em redes" },
    { title: "Eventos", purpose: "Organização de eventos corporativos" },
  ],
  "Jurídico": [
    { title: "Contratos", purpose: "Elaboração e gestão de contratos" },
    { title: "Contencioso", purpose: "Gestão de processos judiciais" },
    { title: "Compliance", purpose: "Conformidade regulatória" },
  ],
  "Recepção": [
    { title: "Cadastro de Visitantes", purpose: "Registro de entrada de visitantes" },
    { title: "Agendamento", purpose: "Marcação de consultas/reuniões" },
  ],
};

// ==========================
// FASE 0 - CONTEXTO ORGANIZACIONAL
// ==========================

export async function saveContext(data: {
  organizationId: number;
  segment: string;
  businessType: string;
  employeesRange?: string;
  unitsCount?: number;
  hasDataProtectionOfficer?: boolean;
  dataProtectionOfficerName?: string;
  dataProtectionOfficerEmail?: string;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Verificar se já existe contexto
  const [existing] = await db
    .select()
    .from(mapeamentoContexts)
    .where(eq(mapeamentoContexts.organizationId, data.organizationId));

  let contextId: number;
  if (existing) {
    await db
      .update(mapeamentoContexts)
      .set(data as any)
      .where(eq(mapeamentoContexts.id, existing.id));
    contextId = existing.id;
  } else {
    const result = await db.insert(mapeamentoContexts).values(data as any).returning({ id: mapeamentoContexts.id });
    contextId = Number(result[0]?.id || 0);
  }

  // OrgSync bidirecional: propagar para tabela organizations
  try {
    const { updateOrgProfile } = await import('./orgSyncService');
    await updateOrgProfile(data.organizationId, {
      segment: data.segment || null,
      businessType: data.businessType || null,
      units: data.unitsCount ? Number(data.unitsCount) : null,
      employeesRange: data.employeesRange || null,
      hasDpo: data.hasDataProtectionOfficer ?? null,
      dpoName: data.dataProtectionOfficerName || null,
      dpoEmail: data.dataProtectionOfficerEmail || null,
    });
  } catch (e) {
    console.warn('[OrgSync] Falha ao propagar contexto para organizations (não bloqueante):', e);
  }

  return contextId;
}

export async function getContext(organizationId: number) {
  const db = await getDb();
  if (!db) return null;

  const [context] = await db
    .select()
    .from(mapeamentoContexts)
    .where(eq(mapeamentoContexts.organizationId, organizationId));

  return context || null;
}

export function suggestAreas(segment: string, businessType: string): string[] {
  const segmentAreas = areasBySegment[segment];
  if (!segmentAreas) return ["RH", "Financeiro", "TI", "Comercial", "Administrativo"];
  
  return segmentAreas[businessType] || ["RH", "Financeiro", "TI", "Comercial", "Administrativo"];
}

export async function confirmAreas(
  organizationId: number,
  contextId: number,
  areas: { name: string; isCustom?: boolean }[]
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Buscar áreas existentes para evitar duplicação
  const existingAreas = await db
    .select({ name: mapeamentoAreas.name })
    .from(mapeamentoAreas)
    .where(eq(mapeamentoAreas.organizationId, organizationId));
  
  const existingNames = new Set(existingAreas.map(a => a.name.toLowerCase()));

  // Inserir apenas áreas que não existem
  for (const area of areas) {
    if (!existingNames.has(area.name.toLowerCase())) {
      await db.insert(mapeamentoAreas).values({
        organizationId,
        contextId,
        name: area.name,
        isCustom: area.isCustom ? 1 : 0,
        isActive: true,
      } as any);
      existingNames.add(area.name.toLowerCase());
    }
  }

  // Atualizar status do contexto
  await db
    .update(mapeamentoContexts)
    .set({ status: "concluido" } as any)
    .where(eq(mapeamentoContexts.organizationId, organizationId));

  return { success: true };
}

export async function listAreas(organizationId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(mapeamentoAreas)
    .where(eq(mapeamentoAreas.organizationId, organizationId))
    .orderBy(mapeamentoAreas.name);
}

async function timelineEvent(input: {
  organizationId: number;
  contextId?: number | null;
  areaId?: number | null;
  processId?: number | null;
  respondentId?: number | null;
  eventType: string;
  title?: string | null;
  message?: string | null;
  metadata?: any;
  createdById?: number | null;
}) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql`
      INSERT INTO mapeamento_timeline_events
        ("organizationId", "contextId", "areaId", "processId", "respondentId", "eventType", title, message, metadata, "createdById", "createdAt")
      VALUES
        (${input.organizationId}, ${input.contextId ?? null}, ${input.areaId ?? null}, ${input.processId ?? null}, ${input.respondentId ?? null},
         ${input.eventType}, ${input.title ?? null}, ${input.message ?? null}, ${input.metadata ? JSON.stringify(input.metadata) : null},
         ${input.createdById ?? null}, NOW())
    `);
  } catch (_) {}
}

// ==========================
// FASE 1 - DELEGAÇÃO E CONVITES
// ==========================

export async function createRespondent(data: {
  organizationId: number;
  areaId: number;
  processId?: number | null;
  name: string;
  email: string;
  phone?: string;
  role?: string;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Gerar token único (por processo, se informado)
  const inviteToken = crypto.randomBytes(32).toString("hex");
  const inviteExpiresAt = new Date();
  inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 30); // 30 dias de validade

  const result = await db.insert(mapeamentoRespondents).values({
    ...data,
    processId: data.processId ?? null,
    inviteToken,
    inviteExpiresAt,
    status: "pendente",
  } as any).returning({ id: mapeamentoRespondents.id });

  await timelineEvent({
    organizationId: data.organizationId,
    areaId: data.areaId,
    processId: data.processId ?? null,
    respondentId: Number(result[0]?.id || 0),
    eventType: "respondent_created",
    title: "Delegação criada",
    message: data.processId ? "Delegação criada por processo (token individual)." : "Delegação criada por área (modo legado).",
    metadata: { email: data.email, name: data.name, mode: data.processId ? "process" : "area" }
  });

  return {
    id: Number(result[0]?.id || 0),
    inviteToken,
  };
}

export async function listRespondents(organizationId: number, areaId?: number) {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select({
      id: mapeamentoRespondents.id,
      organizationId: mapeamentoRespondents.organizationId,
      areaId: mapeamentoRespondents.areaId,
      name: mapeamentoRespondents.name,
      email: mapeamentoRespondents.email,
      phone: mapeamentoRespondents.phone,
      role: mapeamentoRespondents.role,
      inviteToken: mapeamentoRespondents.inviteToken,
      inviteSentAt: mapeamentoRespondents.inviteSentAt,
      status: mapeamentoRespondents.status,
      startedAt: mapeamentoRespondents.startedAt,
      completedAt: mapeamentoRespondents.completedAt,
      areaName: mapeamentoAreas.name,
    })
    .from(mapeamentoRespondents)
    .leftJoin(mapeamentoAreas, eq(mapeamentoRespondents.areaId, mapeamentoAreas.id))
    .where(eq(mapeamentoRespondents.organizationId, organizationId))
    .orderBy(desc(mapeamentoRespondents.createdAt));

  if (areaId) {
    return db
      .select({
        id: mapeamentoRespondents.id,
        organizationId: mapeamentoRespondents.organizationId,
        areaId: mapeamentoRespondents.areaId,
        name: mapeamentoRespondents.name,
        email: mapeamentoRespondents.email,
        phone: mapeamentoRespondents.phone,
        role: mapeamentoRespondents.role,
        inviteToken: mapeamentoRespondents.inviteToken,
        inviteSentAt: mapeamentoRespondents.inviteSentAt,
        status: mapeamentoRespondents.status,
        startedAt: mapeamentoRespondents.startedAt,
        completedAt: mapeamentoRespondents.completedAt,
        areaName: mapeamentoAreas.name,
      })
      .from(mapeamentoRespondents)
      .leftJoin(mapeamentoAreas, eq(mapeamentoRespondents.areaId, mapeamentoAreas.id))
      .where(
        and(
          eq(mapeamentoRespondents.organizationId, organizationId),
          eq(mapeamentoRespondents.areaId, areaId)
        )
      )
      .orderBy(desc(mapeamentoRespondents.createdAt));
  }

  return query;
}

export async function markInviteSent(respondentId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  await db
    .update(mapeamentoRespondents)
    .set({
      inviteSentAt: new Date(),
      status: "convidado",
    } as any)
    .where(eq(mapeamentoRespondents.id, respondentId));

  // best effort timeline
  const { rows: rows } = await db.execute(sql`SELECT "organizationId", "areaId", "processId" FROM mapeamento_respondents WHERE id=${respondentId} LIMIT 1`);
  const r = (rows as any[])[0];
  if (r) await timelineEvent({
    organizationId: r.organizationId, areaId: r.areaId, processId: r.processId, respondentId,
    eventType: "invite_sent", title: "Convite enviado", message: "Convite marcado como enviado."
  });
}

export async function getRespondentByToken(token: string) {
  const db = await getDb();
  if (!db) return null;

  const [respondent] = await db
    .select({
      id: mapeamentoRespondents.id,
      organizationId: mapeamentoRespondents.organizationId,
      areaId: mapeamentoRespondents.areaId,
      name: mapeamentoRespondents.name,
      email: mapeamentoRespondents.email,
      status: mapeamentoRespondents.status,
      inviteExpiresAt: mapeamentoRespondents.inviteExpiresAt,
      processId: (mapeamentoRespondents as any).processId,
      areaName: mapeamentoAreas.name,
    })
    .from(mapeamentoRespondents)
    .leftJoin(mapeamentoAreas, eq(mapeamentoRespondents.areaId, mapeamentoAreas.id))
    .where(eq(mapeamentoRespondents.inviteToken, token));

  if (!respondent) return null;

  // Verificar expiração
  if (respondent.inviteExpiresAt && new Date(respondent.inviteExpiresAt) < new Date()) {
    return null;
  }

  return respondent;
}

// ==========================
// FASE 2 - ENTREVISTA DIGITAL
// ==========================

export async function getInterviewByToken(token: string) {
  const db = await getDb();
  if (!db) return null;

  const respondent = await getRespondentByToken(token);
  if (!respondent) return null;
  const readOnly = respondent.status === "concluiu";

  // timeline: token opened
  await timelineEvent({ organizationId: respondent.organizationId, areaId: respondent.areaId, processId: respondent.processId ?? null, respondentId: respondent.id, eventType: "token_opened", title: "Link acessado" });

  // Buscar ou criar processos para a área
  let processes = await db
    .select()
    .from(mapeamentoProcesses)
    .where(and(eq(mapeamentoProcesses.organizationId, respondent.organizationId), eq(mapeamentoProcesses.areaId, respondent.areaId!), eq(mapeamentoProcesses.isActive, 1)));

  if (processes.length === 0 && respondent.areaName) {
    // Gerar processos sugeridos
    const suggested = processesByArea[respondent.areaName] || [];
    for (const p of suggested) {
      await db.insert(mapeamentoProcesses).values({
        organizationId: respondent.organizationId,
        areaId: respondent.areaId,
        title: p.title,
        purpose: p.purpose,
        isAiGenerated: 1,
      } as any);
    }
    
    processes = await db
      .select()
      .from(mapeamentoProcesses)
      .where(and(eq(mapeamentoProcesses.organizationId, respondent.organizationId), eq(mapeamentoProcesses.areaId, respondent.areaId!), eq(mapeamentoProcesses.isActive, 1)));
  }

  // Buscar respostas existentes
  const responses = await db
    .select()
    .from(mapeamentoResponses)
    .where(eq(mapeamentoResponses.respondentId, respondent.id));

  // Atualizar status se ainda não iniciou
  if (!readOnly && (respondent.status === "convidado" || respondent.status === "pendente")) {
    await db
      .update(mapeamentoRespondents)
      .set({
        status: "em_andamento",
        startedAt: new Date(),
      } as any)
      .where(eq(mapeamentoRespondents.id, respondent.id));
  }

  // ===== Premium: token por processo =====
  if (respondent.processId) {
    const proc = processes.find((p: any) => Number(p.id) === Number(respondent.processId));
    const filtered = proc ? [proc] : [];
    const processResponses = await db
      .select()
      .from(mapeamentoResponses)
      .where(and(eq(mapeamentoResponses.respondentId, respondent.id), eq(mapeamentoResponses.processId, Number(respondent.processId))));
    return {
      readOnly,
      respondent,
      processes: filtered,
      responses: processResponses,
      completedCount: processResponses.filter(r => r.completed).length,
      totalCount: filtered.length,
      mode: "process"
    };
  }

  return {
    readOnly,
    respondent,
    processes,
    responses,
    completedCount: responses.filter(r => r.completed).length,
    totalCount: processes.length,
    mode: "area"
  };
}

export async function saveResponse(
  token: string,
  processId: number,
  responseData: {
    dataCategories?: { name: string; sensivel: boolean }[];
    titularCategories?: string[];
    legalBase?: string;
    sharing?: string[];
    consentObtained?: boolean;
    retentionPeriod?: string;
    storageLocation?: string;
    securityMeasures?: string[];
    internationalTransfer?: boolean;
    internationalCountries?: string[];
    notes?: string;
    ropaData?: any;
  },
  options?: { completed?: boolean }
) {

  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const respondent = await getRespondentByToken(token);
  if (!respondent) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Respondente não encontrado' });

  await timelineEvent({ organizationId: respondent.organizationId, areaId: respondent.areaId, processId, respondentId: respondent.id, eventType: "response_saved", title: "Resposta salva", message: options?.completed ? "Resposta marcada como concluída." : "Rascunho salvo." });

  // Calcular risco
  const riskResult = calculateRiskScore(responseData);

  // Premium: se houver DataUses validados, consolidar base legal do processo automaticamente
  const inferredLegalBase = computeProcessLegalBaseFromDataUses((responseData as any).ropaData?.dataUses);
  if (inferredLegalBase) {
    (responseData as any).legalBase = inferredLegalBase;
  }

  // Verificar se já existe resposta
  const [existing] = await db
    .select()
    .from(mapeamentoResponses)
    .where(
      and(
        eq(mapeamentoResponses.respondentId, respondent.id),
        eq(mapeamentoResponses.processId, processId)
      )
    );

  const data = {
    organizationId: respondent.organizationId,
    respondentId: respondent.id,
    processId,
    dataCategories: responseData.dataCategories || [],
    titularCategories: responseData.titularCategories || [],
    legalBase: responseData.legalBase,
    sharing: responseData.sharing || [],
    consentObtained: responseData.consentObtained ? 1 : 0,
    retentionPeriod: responseData.retentionPeriod,
    storageLocation: responseData.storageLocation,
    securityMeasures: responseData.securityMeasures || [],
    internationalTransfer: responseData.internationalTransfer ? 1 : 0,
    internationalCountries: responseData.internationalCountries || [],
    riskLevel: riskResult.level,
    riskScore: riskResult.score,
    requiresAction: riskResult.level === "alta" || riskResult.level === "extrema" ? 1 : 0,
    notes: responseData.notes,
      ropaData: (responseData as any).ropaData,
      completed: options?.completed ? 1 : 0,
    completedAt: options?.completed ? new Date().toISOString() : null,
  };

  if (existing) {
    await db
      .update(mapeamentoResponses)
      .set(data as any)
      .where(eq(mapeamentoResponses.id, existing.id));
  } else {
    await db.insert(mapeamentoResponses).values(data as any);
  }

  return { success: true, riskLevel: riskResult.level };
}

export async function finalizeInterview(token: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const respondent = await getRespondentByToken(token);
  if (!respondent) return { success: false };

  // ===== Premium: token por processo finaliza só aquele processo =====
  if (respondent.processId) {
    const pid = Number(respondent.processId);
    const process = await db
      .select()
      .from(mapeamentoProcesses)
      .where(and(eq(mapeamentoProcesses.organizationId, respondent.organizationId), eq(mapeamentoProcesses.id, pid), eq(mapeamentoProcesses.isActive, 1)))
      .then((x: any) => x?.[0]);

    const [resp] = await db
      .select()
      .from(mapeamentoResponses)
      .where(and(eq(mapeamentoResponses.respondentId, respondent.id), eq(mapeamentoResponses.processId, pid)));

    if (!process || !resp || Number(resp.completed || 0) !== 1) {
      return { success: false, reason: "incomplete", missing: [{ processId: pid, title: process?.title || "Processo" }] };
    }

    // marca respondent como concluiu (processo)
    await db.update(mapeamentoRespondents).set({ status: "concluiu", completedAt: new Date() } as any).where(eq(mapeamentoRespondents.id, respondent.id));
    await timelineEvent({ organizationId: respondent.organizationId, areaId: respondent.areaId, processId: pid, respondentId: respondent.id, eventType: "finalized_process", title: "Processo finalizado", message: "Entrevista finalizada para 1 processo (token individual)." });

    // Reaproveita o fluxo existente: roda a mesma lógica de gerar ROT/POP/ROPA só para esse processo
    // Cai no fluxo padrão abaixo com 1 elemento
    const processesForRot = [process];
    const responsesForRot = [resp];
    const responseByProcessForRot = new Map<number, any>();
    responseByProcessForRot.set(pid, resp);
    // Nota: o fluxo de geração de ROT/POP/ROPA será executado pelo código abaixo
    // pois não retornamos aqui - deixamos cair no loop de geração
  }

  // 1) Buscar processos ativos da área do respondente (modo legado)
  const processes = await db
    .select()
    .from(mapeamentoProcesses)
    .where(
      and(
        eq(mapeamentoProcesses.organizationId, respondent.organizationId),
        eq(mapeamentoProcesses.areaId, respondent.areaId),
        eq(mapeamentoProcesses.isActive, 1)
      )
    );

  // 2) Buscar respostas do respondente
  const responses = await db
    .select()
    .from(mapeamentoResponses)
    .where(eq(mapeamentoResponses.respondentId, respondent.id));

  const responseByProcess = new Map<number, any>();
  for (const r of responses) responseByProcess.set(r.processId, r);

  const missing = processes
    .filter(p => {
      const r = responseByProcess.get(p.id);
      return !r || Number(r.completed || 0) !== 1;
    })
    .map(p => ({ processId: p.id, title: p.title }));

  if (missing.length > 0) {
    return { success: false, reason: 'incomplete', missing };
  }

  // 3) Resolver um usuário "sistema" para auditoria (createdById / GED)
  const [sysUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.organizationId, respondent.organizationId),
        eq(users.isActive, 1)
      )
    )
    .orderBy(users.id)
    .limit(1);

  const systemUserId = Number(sysUser?.id || 1);

  // 4) Buscar nome da área para preencher department
  const [area] = await db
    .select()
    .from(mapeamentoAreas)
    .where(and(eq(mapeamentoAreas.id, respondent.areaId), eq(mapeamentoAreas.organizationId, respondent.organizationId)));

  const departmentName = area?.name || null;

  // 5) Gerar 1 ROT por processo (Modelo 2) + salvar ROT/POP no GED + agendar revisão
  const { saveDocumentToGed } = await import('./mapeamentoGedService');
  const { scheduleReviewForRot } = await import('./reviewScheduleService');

  let createdRots = 0;
  let documentsSaved = 0;
  let schedulesCreated = 0;
  let actionPlansGenerated = 0;

  for (const p of processes) {
    const resp = responseByProcess.get(p.id);
    if (!resp) continue;

    // Se já existe ROT vinculado, pula (idempotência)
    if (resp.rotId) continue;

    const titularCategories = Array.isArray(resp.titularCategories) ? resp.titularCategories : [];
    const dataCategories = Array.isArray(resp.dataCategories) ? resp.dataCategories : [];
    const sharing = Array.isArray(resp.sharing) ? resp.sharing : [];
    const securityMeasures = Array.isArray(resp.securityMeasures) ? resp.securityMeasures : [];
    const intlCountries = Array.isArray(resp.internationalCountries) ? resp.internationalCountries : [];

    // ===== PREMIUM: Exportar DataUses validados para popular legalBase e purpose do ROT =====
    const dataUses: any[] = (resp.ropaData as any)?.dataUses || [];
    const validatedUses = dataUses.filter((du: any) =>
      du.legalBasisValidated && (du.legalBasisValidated.status === 'accepted' || du.legalBasisValidated.status === 'adjusted')
    );

    // Inferir legalBase consolidada a partir dos DataUses validados
    let inferredLegalBase = resp.legalBase || 'execucao_contrato';
    if (validatedUses.length > 0) {
      const baseCounts: Record<string, number> = {};
      for (const du of validatedUses) {
        const code = du.legalBasisValidated?.code;
        if (code) baseCounts[code] = (baseCounts[code] || 0) + 1;
      }
      // Prioridade: consentimento > legitimo_interesse > obrigacao_legal > mais frequente
      if (baseCounts['consentimento']) inferredLegalBase = 'consentimento';
      else if (baseCounts['legitimo_interesse']) inferredLegalBase = 'legitimo_interesse';
      else if (baseCounts['obrigacao_legal']) inferredLegalBase = 'obrigacao_legal';
      else {
        const sorted = Object.entries(baseCounts).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) inferredLegalBase = sorted[0][0];
      }
    }

    // Inferir purpose consolidado a partir das finalidades dos DataUses
    let inferredPurpose = p.purpose || p.description || 'Não especificado';
    if (validatedUses.length > 0) {
      const allPurposes = new Set<string>();
      for (const du of validatedUses) {
        if (Array.isArray(du.purposes)) du.purposes.forEach((pp: string) => allPurposes.add(pp));
      }
      const purposeArr = Array.from(allPurposes);
      if (purposeArr.length > 0) inferredPurpose = purposeArr.join('; ');
    }

    const rotInsert = await db.insert(rotOperations).values({
      organizationId: respondent.organizationId,
      createdById: systemUserId,
      title: p.title,
      description: p.description || null,
      department: departmentName || undefined,
      titularCategory: titularCategories.join(', ') || 'Não especificado',
      dataCategories: dataCategories,
      purpose: inferredPurpose,
      legalBase: inferredLegalBase,
      requiresConsent: (inferredLegalBase === 'consentimento') ? 1 : 0,
      status: 'rascunho',
    } as any).returning({ id: rotOperations.id });

    const rotId = Number(rotInsert[0]?.id || 0);
    createdRots++;

    // Vincular response -> rot
    await db
      .update(mapeamentoResponses)
      .set({ rotId } as any)
      .where(eq(mapeamentoResponses.id, resp.id));

    // Gerar documentos em Markdown (determinístico) e salvar no GED
    const rotDoc = generateROTDocument({
      title: p.title,
      department: departmentName,
      pointFocal: { name: respondent.name, email: respondent.email },
      purpose: inferredPurpose,
      legalBase: inferredLegalBase,
      requiresConsent: (inferredLegalBase === 'consentimento'),
      dataCategories,
      titularCategories,
      sharing,
      internationalTransfer: Number(resp.internationalTransfer || 0) === 1,
      internationalCountries: intlCountries,
      retentionPeriod: resp.retentionPeriod,
      storageLocation: resp.storageLocation,
      securityMeasures,
      ropaData: (resp as any).ropaData || null,
      riskAssessment: {
        level: resp.riskLevel,
        factors: [],
        mitigations: []
      },
      recommendations: [],
    });

    const popDoc = generatePOPDocument({
      title: `POP - ${p.title}`,
      objective: "Descrever o procedimento operacional para execução do tratamento de dados pessoais com conformidade à LGPD.",
      scope: `Aplicável ao processo: ${p.title}.`,
      processTitle: p.title,
      department: departmentName,
      pointFocal: { name: respondent.name, email: respondent.email },
      titularCategories,
      dataCategories,
      legalBase: resp.legalBase || 'execucao_contrato',
      retentionPeriod: resp.retentionPeriod,
      storageLocation: resp.storageLocation,
      securityMeasures,
      sharing,
      internationalTransfer: Number(resp.internationalTransfer || 0) === 1,
      internationalCountries: intlCountries,
      ropaData: (resp as any).ropaData || null,
      responsibilities: [
        { role: "DPO / Encarregado", description: "Validar conformidade, orientar e revisar periodicamente." },
        { role: "Gestor da Área", description: "Garantir execução do procedimento e evidências." },
        { role: "Operação", description: "Executar as etapas e registrar evidências." },
      ],
      documents: ["ROT", "POP", "Política de Privacidade (se aplicável)"],
      records: ["Evidências de execução do processo", "Logs / registros de acesso (quando aplicável)"],
      indicators: ["Percentual de processos revisados no período", "Incidentes / não conformidades associadas"],
      revision: { frequency: "Anual", criteria: ["Mudanças no processo", "Mudanças regulatórias", "Incidentes relevantes"] }
    });

    const rotLinked = await saveDocumentToGed({
      organizationId: respondent.organizationId,
      userId: systemUserId,
      rotId,
      documentType: 'rot',
      title: `ROT - ${p.title}`,
      description: `ROT gerado automaticamente a partir da entrevista de mapeamento (Modelo 2).`,
      content: rotDoc,
    });

    const popLinked = await saveDocumentToGed({
      organizationId: respondent.organizationId,
      userId: systemUserId,
      rotId,
      documentType: 'pop',
      title: `POP - ${p.title}`,
      description: `POP gerado automaticamente a partir da entrevista de mapeamento (Modelo 2).`,
      content: popDoc,
    });

    documentsSaved += 2;

    // Persistir fileKeys no ROT
    await db
      .update(rotOperations)
      .set({
        rotFileKey: rotLinked?.gedDocument?.fileKey,
        popFileKey: popLinked?.gedDocument?.fileKey,
        updatedAt: new Date().toISOString(),
      } as any)
      .where(eq(rotOperations.id, rotId));

    // ===== PREMIUM: Gerar ROPA automaticamente e salvar no GED =====
    try {
      const snapshot: RopaSnapshot = {
        version: "premium-v1",
        processTitle: p.title,
        areaName: departmentName || undefined,
        purpose: inferredPurpose || null,
        legalBase: inferredLegalBase || null,
        dataSubjects: titularCategories,
        dataCategories: dataCategories,
        retentionPeriod: resp.retentionPeriod || null,
        storageLocation: resp.storageLocation || null,
        securityMeasures: securityMeasures,
        internationalTransfer: Number(resp.internationalTransfer || 0) === 1,
        internationalCountries: intlCountries,
        sharing: sharing,
        riskLevel: resp.riskLevel || null,
        riskScore: resp.riskScore || null,
        ropaData: resp.ropaData || null,
      };

      const completeness = computeRopaCompleteness(snapshot);
      const ropaMd = generateRopaMarkdown(snapshot);

      const ropaDoc = await saveDocumentToGed({
        rotId,
        organizationId: respondent.organizationId,
        documentType: "ropa",
        title: `ROPA - ${p.title}`,
        content: ropaMd,
        description: `ROPA premium gerado automaticamente a partir do mapeamento (completude ${(completeness.percent * 100).toFixed(0)}%).`,
        userId: systemUserId,
        tags: ["ropa", "premium", "mapeamento", "lgpd"],
      });

      documentsSaved++;

      await db.update(rotOperations).set({
        ropaData: snapshot as any,
        ropaFileKey: (ropaDoc as any)?.gedDocument?.fileKey || null,
      } as any).where(eq(rotOperations.id, rotId));

      // Gatilho automático de RIPD/DPIA quando necessário
      if (shouldTriggerRipd(snapshot) && completeness.canTriggerRipd) {
        try {
          await ensureRipdFromRot({ rotId, organizationId: respondent.organizationId, actorUserId: systemUserId });
        } catch (e) {
          logger.error("[AUTO-RIPD] Falha ao gerar RIPD automaticamente:", e);
        }
      }
    } catch (e) {
      logger.error("[ROPA-PREMIUM] Falha ao gerar/salvar ROPA:", e);
    }

    // Agendar revisão
    const schedId = await scheduleReviewForRot(rotId, respondent.organizationId);
    if (schedId) schedulesCreated++;

    // Gerar análise de risco + ações se necessário
    if (Number(resp.requiresAction || 0) === 1) {
      const analysisResult = await db.insert(riskAnalyses).values({
        organizationId: respondent.organizationId,
        sourceType: "rot",
        sourceId: rotId,
        riskLevel: resp.riskLevel,
        riskScore: resp.riskScore,
        riskFactors: [],
        analyzedById: systemUserId,
        status: "pendente",
      } as any).returning({ id: riskAnalyses.id });

      const analysisId = Number(analysisResult[0]?.id || 0);

      const actions = generateActionPlans(resp, analysisId, respondent.organizationId);
      for (const action of actions) {
        await db.insert(riskActionPlans).values(action as any);
        actionPlansGenerated++;
      }
    }
  }

  // 6) Atualizar status do respondente
  await db
    .update(mapeamentoRespondents)
    .set({
      status: "concluiu",
      completedAt: new Date().toISOString(),
    } as any)
    .where(eq(mapeamentoRespondents.id, respondent.id));

  await timelineEvent({
    organizationId: respondent.organizationId,
    areaId: respondent.areaId,
    processId: respondent.processId ?? null,
    respondentId: respondent.id,
    eventType: "finalized", title: "Finalização concluída", message: "ROT/POP/ROPA gerados (quando aplicável)."
  });

  // 7) Enviar notificações por e-mail (assíncrono, não bloqueia retorno)
  try {
    const { sendInterviewCompletionEmails } = await import('./emailService');
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, respondent.organizationId));

    // Buscar consultor responsável (primeiro admin_global ou consultor da org)
    const [consultant] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(
        and(
          eq(users.organizationId, respondent.organizationId),
          eq(users.isActive, 1)
        )
      )
      .orderBy(users.id)
      .limit(1);

    // Contar dados mapeados
    const totalDataCategories = responses.reduce((acc, r) => {
      const cats = Array.isArray(r.dataCategories) ? r.dataCategories : [];
      return acc + cats.length;
    }, 0);

    const emailResult = await sendInterviewCompletionEmails({
      respondentName: respondent.name,
      respondentEmail: respondent.email,
      areaName: respondent.areaName || departmentName || 'Não informada',
      processTitle: respondent.processId ? processes.find(p => p.id === Number(respondent.processId))?.title : undefined,
      organizationName: org?.name || 'Organização',
      totalDataCategories,
      totalProcesses: processes.length,
      createdRots,
      consultantEmail: consultant?.email || undefined,
      consultantName: consultant?.name || undefined,
    });

    await timelineEvent({
      organizationId: respondent.organizationId,
      areaId: respondent.areaId,
      processId: respondent.processId ?? null,
      respondentId: respondent.id,
      eventType: "email_sent",
      title: "Notificações enviadas",
      message: `Respondente: ${emailResult.respondentSent ? 'enviado' : 'falhou'}. Consultor: ${emailResult.consultantSent ? 'enviado' : 'não enviado'}.`,
      metadata: emailResult,
    });
  } catch (emailErr) {
    logger.error('[finalizeInterview] Erro ao enviar notificações por e-mail:', emailErr);
    // Não bloqueia a finalização se o e-mail falhar
  }

  return { success: true, createdRots, documentsSaved, schedulesCreated, actionPlansGenerated };
}

// ==========================
// CÁLCULO DE RISCO
// ==========================

function calculateRiskScore(data: {
  dataCategories?: { name: string; sensivel: boolean }[];
  consentObtained?: boolean;
  internationalTransfer?: boolean;
  securityMeasures?: string[];
}): { level: "baixa" | "media" | "alta" | "extrema"; score: number } {
  let score = 0;

  // Dados sensíveis (+0.3)
  const hasSensitive = data.dataCategories?.some(d => d.sensivel);
  if (hasSensitive) score += 0.3;

  // Sem consentimento (+0.25)
  if (!data.consentObtained) score += 0.25;

  // Transferência internacional (+0.2)
  if (data.internationalTransfer) score += 0.2;

  // Poucas medidas de segurança (+0.15)
  if (!data.securityMeasures || data.securityMeasures.length < 2) score += 0.15;

  // Volume de dados (+0.1)
  if (data.dataCategories && data.dataCategories.length > 5) score += 0.1;

  let level: "baixa" | "media" | "alta" | "extrema";
  if (score >= 0.6) level = "extrema";
  else if (score >= 0.4) level = "alta";
  else if (score >= 0.2) level = "media";
  else level = "baixa";

  return { level, score: Math.round(score * 100) / 100 };
}

function computeProcessLegalBaseFromDataUses(dataUses: any) {
  if (!Array.isArray(dataUses) || dataUses.length === 0) return null;

  // Precedência (mais "forte" primeiro)
  const precedence = [
    "obrigacao_legal",
    "execucao_contrato",
    "exercicio_direitos",
    "tutela_saude",
    "legitimo_interesse",
    "consentimento"
  ];

  const counts = new Map<string, number>();
  for (const u of dataUses) {
    const v = u?.legalBasisValidated?.code || u?.legalBasisSuggested?.code;
    if (!v) continue;
    counts.set(v, (counts.get(v) || 0) + 1);
  }

  // escolhe pela precedência e, em empate, pelo maior count
  let best: string | null = null;
  let bestScore = -1;
  for (const code of precedence) {
    const c = counts.get(code) || 0;
    // favorece precedência: baseScore = c + bônus por precedência
    const bonus = (precedence.length - precedence.indexOf(code)) * 0.01;
    const score = c + bonus;
    if (score > bestScore) { bestScore = score; best = code; }
  }
  return best;
}

function generateActionPlans(
  response: any,
  analysisId: number,
  organizationId: number
): any[] {
  const actions: any[] = [];
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 15);

  // Ação para consentimento
  if (!response.consentObtained) {
    actions.push({
      organizationId,
      analysisId,
      title: "Obter consentimento para tratamento de dados",
      description: "Implementar mecanismo de coleta de consentimento conforme art. 7º da LGPD",
      priority: "alta",
      assigneeRole: "titular",
      dueDate,
      estimatedEffortHours: 4,
      status: "pendente",
    });
  }

  // Ação para transferência internacional
  if (response.internationalTransfer) {
    const dueDateIntl = new Date();
    dueDateIntl.setDate(dueDateIntl.getDate() + 30);
    actions.push({
      organizationId,
      analysisId,
      title: "Avaliar adequação para transferência internacional",
      description: "Verificar se países de destino possuem nível adequado de proteção (art. 33 da LGPD)",
      priority: "alta",
      assigneeRole: "dpo",
      dueDate: dueDateIntl,
      estimatedEffortHours: 8,
      status: "pendente",
    });
  }

  // Ação genérica de revisão
  if (response.riskLevel === "alta" || response.riskLevel === "extrema") {
    const dueDateReview = new Date();
    dueDateReview.setDate(dueDateReview.getDate() + 7);
    actions.push({
      organizationId,
      analysisId,
      title: "Revisão pelo DPO",
      description: "Validar processo e plano de mitigação com o Encarregado de Proteção de Dados",
      priority: "media",
      assigneeRole: "dpo",
      dueDate: dueDateReview,
      estimatedEffortHours: 2,
      status: "pendente",
    });
  }

  return actions;
}

// ==========================
// ESTATÍSTICAS
// ==========================

export async function getMapeamentoStats(organizationId: number) {
  const db = await getDb();
  if (!db) return null;

  const [context] = await db
    .select()
    .from(mapeamentoContexts)
    .where(eq(mapeamentoContexts.organizationId, organizationId));

  const areas = await db
    .select()
    .from(mapeamentoAreas)
    .where(eq(mapeamentoAreas.organizationId, organizationId));

  const respondents = await db
    .select()
    .from(mapeamentoRespondents)
    .where(eq(mapeamentoRespondents.organizationId, organizationId));

  const responses = await db
    .select()
    .from(mapeamentoResponses)
    .where(eq(mapeamentoResponses.organizationId, organizationId));

  const pendingActions = await db
    .select()
    .from(riskActionPlans)
    .where(
      and(
        eq(riskActionPlans.organizationId, organizationId),
        eq(riskActionPlans.status, "pendente")
      )
    );

  return {
    hasContext: !!context,
    contextStatus: context?.status || null,
    areasCount: areas.length,
    respondentsCount: respondents.length,
    respondentsCompleted: respondents.filter(r => r.status === "concluiu").length,
    responsesCount: responses.length,
    responsesWithRisk: responses.filter(r => r.requiresAction).length,
    pendingActionsCount: pendingActions.length,
    phase: !context ? 0 : context.status === "em_andamento" ? 0 : respondents.length === 0 ? 1 : 2,
  };
}

// ==========================
// PLANOS DE AÇÃO
// ==========================

export async function listActionPlans(organizationId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];

  if (status) {
    return db
      .select()
      .from(riskActionPlans)
      .where(
        and(
          eq(riskActionPlans.organizationId, organizationId),
          eq(riskActionPlans.status, status as any)
        )
      )
      .orderBy(riskActionPlans.dueDate);
  }

  return db
    .select()
    .from(riskActionPlans)
    .where(eq(riskActionPlans.organizationId, organizationId))
    .orderBy(riskActionPlans.dueDate);
}

export async function updateActionPlan(
  id: number,
  data: {
    status?: string;
    completedAt?: Date;
    completedById?: number;
    evidence?: string;
    evidenceFileKey?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  await db
    .update(riskActionPlans)
    .set(data as any)
    .where(eq(riskActionPlans.id, id));
}

export async function getOverdueActions(organizationId: number) {
  const db = await getDb();
  if (!db) return [];

  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  return db
    .select()
    .from(riskActionPlans)
    .where(
      and(
        eq(riskActionPlans.organizationId, organizationId),
        eq(riskActionPlans.status, "pendente"),
        lte(riskActionPlans.dueDate, threeDaysFromNow.toISOString())
      )
    )
    .orderBy(riskActionPlans.dueDate);
}


// ==========================
// GERAÇÃO DE ROT COM IA
// ==========================

export async function generateROTFromResponse(
  organizationId: number,
  responseId: number
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Buscar a resposta
  const [response] = await db
    .select()
    .from(mapeamentoResponses)
    .where(eq(mapeamentoResponses.id, responseId));

  if (!response) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Resposta não encontrada' });

  // Buscar o processo
  const [process] = await db
    .select()
    .from(mapeamentoProcesses)
    .where(eq(mapeamentoProcesses.id, response.processId));

  if (!process) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Processo não encontrado' });

  // Preparar dados para a IA
  const dataCategories = response.dataCategories ? JSON.parse(response.dataCategories as string) : [];
  const titularCategories = response.titularCategories ? JSON.parse(response.titularCategories as string) : [];
  const securityMeasures = response.securityMeasures ? JSON.parse(response.securityMeasures as string) : [];
  const sharing = response.sharing ? JSON.parse(response.sharing as string) : [];

  // Gerar ROT com IA
  const prompt = `Você é um especialista em LGPD e proteção de dados. Gere um Registro de Operações de Tratamento (ROT) completo em formato JSON para o seguinte processo:

PROCESSO: ${process.title}
DESCRIÇÃO: ${process.description || process.purpose || "Não informada"}

DADOS COLETADOS:
${dataCategories.map((d: any) => `- ${d.name} ${d.sensivel ? "(SENSÍVEL)" : ""}`).join("\n")}

CATEGORIAS DE TITULARES:
${titularCategories.join(", ")}

BASE LEGAL INFORMADA: ${response.legalBase || "Não informada"}

MEDIDAS DE SEGURANÇA:
${securityMeasures.join(", ")}

COMPARTILHAMENTO: ${sharing.length > 0 ? sharing.join(", ") : "Não informado"}

TRANSFERÊNCIA INTERNACIONAL: ${response.internationalTransfer ? "Sim" : "Não"}

PERÍODO DE RETENÇÃO: ${response.retentionPeriod || "Não informado"}

LOCAL DE ARMAZENAMENTO: ${response.storageLocation || "Não informado"}

Gere um JSON com a seguinte estrutura:
{
  "title": "Título do ROT",
  "purpose": "Finalidade detalhada do tratamento",
  "legalBase": "Base legal completa com artigo da LGPD",
  "requiresConsent": true/false,
  "alternativeBases": ["bases legais alternativas se aplicável"],
  "risksIfNoConsent": ["riscos identificados"],
  "recommendations": ["recomendações de conformidade"],
  "retentionJustification": "justificativa para o período de retenção",
  "securityRecommendations": ["medidas de segurança adicionais recomendadas"],
  "riskAssessment": {
    "level": "baixa|media|alta|extrema",
    "factors": ["fatores de risco identificados"],
    "mitigations": ["ações de mitigação sugeridas"]
  }
}

Responda APENAS com o JSON, sem explicações adicionais.`;

  try {
    const llmResponse = await invokeLLM({
      messages: [
        { role: "system", content: "Você é um especialista em LGPD. Responda apenas em JSON válido." },
        { role: "user", content: prompt },
      ],
    });

    const rawContent = llmResponse.choices[0]?.message?.content || "{}";
    const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
    
    // Extrair JSON da resposta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Resposta da IA não contém JSON válido' });
    
    const rotData = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      rot: {
        title: rotData.title || process.title,
        description: process.description || process.purpose,
        purpose: rotData.purpose,
        legalBase: rotData.legalBase,
        requiresConsent: rotData.requiresConsent,
        alternativeBases: rotData.alternativeBases,
        risksIfNoConsent: rotData.risksIfNoConsent,
        recommendations: rotData.recommendations,
        retentionJustification: rotData.retentionJustification,
        securityRecommendations: rotData.securityRecommendations,
        riskAssessment: rotData.riskAssessment,
        dataCategories,
        titularCategories,
        securityMeasures,
        sharing,
        retentionPeriod: response.retentionPeriod,
        storageLocation: response.storageLocation,
        internationalTransfer: !!response.internationalTransfer,
        sourceResponseId: responseId,
      },
    };
  } catch (error) {
    logger.error("Erro ao gerar ROT com IA:", error);
    return {
      success: false,
      error: "Falha ao gerar ROT com IA",
    };
  }
}

// ==========================
// GERAÇÃO DE POP COM IA
// ==========================

export async function generatePOPFromROT(
  organizationId: number,
  rotId: number
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Buscar o ROT (usando a tabela existente de rots)
  const { rotOperations } = await import("../drizzle/schema");
  const [rot] = await db
    .select()
    .from(rotOperations)
    .where(eq(rotOperations.id, rotId));

  if (!rot) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'ROT não encontrado' });

  const prompt = `Você é um especialista em LGPD e proteção de dados. Gere um Procedimento Operacional Padrão (POP) detalhado para o seguinte Registro de Operações de Tratamento:

TÍTULO: ${rot.title}
FINALIDADE: ${rot.purpose}
BASE LEGAL: ${rot.legalBase}
REQUER CONSENTIMENTO: ${rot.requiresConsent ? "Sim" : "Não"}

Gere um JSON com a seguinte estrutura de POP:
{
  "title": "Título do POP",
  "objective": "Objetivo do procedimento",
  "scope": "Abrangência do procedimento",
  "responsibilities": [
    {"role": "Cargo/Função", "description": "Responsabilidades"}
  ],
  "steps": [
    {"order": 1, "title": "Título do passo", "description": "Descrição detalhada", "responsible": "Responsável"}
  ],
  "documents": ["Documentos relacionados"],
  "records": ["Registros a serem mantidos"],
  "indicators": ["Indicadores de controle"],
  "revision": {
    "frequency": "Frequência de revisão",
    "criteria": ["Critérios para revisão"]
  }
}

Responda APENAS com o JSON, sem explicações adicionais.`;

  try {
    const llmResponse = await invokeLLM({
      messages: [
        { role: "system", content: "Você é um especialista em LGPD. Responda apenas em JSON válido." },
        { role: "user", content: prompt },
      ],
    });

    const rawContent2 = llmResponse.choices[0]?.message?.content || "{}";
    const content2 = typeof rawContent2 === 'string' ? rawContent2 : JSON.stringify(rawContent2);
    
    const jsonMatch = content2.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Resposta da IA não contém JSON válido' });
    
    const popData = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      pop: {
        ...popData,
        sourceRotId: rotId,
        organizationId,
      },
    };
  } catch (error) {
    logger.error("Erro ao gerar POP com IA:", error);
    return {
      success: false,
      error: "Falha ao gerar POP com IA",
    };
  }
}

// ==========================
// EXPORTAÇÃO DE DOCUMENTOS
// ==========================

export function generateROTDocument(rot: any): string {
  /**
   * PREMIUM (fiel ao mapeamento):
   * - ROT Enxuto (12 campos) sempre
   * - ROT Completo (30 campos) quando houver sinais de maturidade/criticidade
   * - Não inventa realidade: PENDENTE quando faltar dado
   */
  const now = new Date();
  const fmtDate = now.toLocaleDateString("pt-BR");

  const ropa = rot.ropaData || {};
  const operators = Array.isArray(ropa.operators) ? ropa.operators : [];
  const channels = Array.isArray(ropa.collectionChannels) ? ropa.collectionChannels : [];
  const systems = Array.isArray(ropa.systemsUsed) ? ropa.systemsUsed : [];
  const sources = Array.isArray(ropa.collectionSources) ? ropa.collectionSources : [];
  const accessProfiles = Array.isArray(ropa.accessProfiles) ? ropa.accessProfiles : [];

  const dataCats = Array.isArray(rot.dataCategories) ? rot.dataCategories : [];
  const titularCats = Array.isArray(rot.titularCategories) ? rot.titularCategories : [];
  const sharing = Array.isArray(rot.sharing) ? rot.sharing : [];
  const security = Array.isArray(rot.securityMeasures) ? rot.securityMeasures : [];

  const hasSensitive = dataCats.some((d: any) => !!d?.sensivel);
  const hasIntl = !!rot.internationalTransfer;
  const intlCountries = Array.isArray(rot.internationalCountries) ? rot.internationalCountries : [];
  const hasSharing = sharing.length > 0 || operators.length > 0;

  const retentionPeriod = rot.retentionPeriod || ropa.retentionPeriod || null;
  const retentionLegalBasis = ropa.retentionLegalBasis || null;
  const disposalCriteria = ropa.disposalCriteria || null;
  const logs = ropa.logsAndTraceability || null;
  const volumeFrequency = ropa.volumeFrequency || null;
  const paperRecords = ropa.paperRecords;
  const storageLocation = rot.storageLocation || ropa.storageLocation || null;

  const requiredMissing: string[] = [];
  const addMissing = (label: string, ok: any) => { if (!ok) requiredMissing.push(label); };

  addMissing("Nome do processo", rot.title);
  addMissing("Área responsável", rot.department);
  addMissing("Ponto focal", rot.pointFocal?.name || rot.pointFocal?.email);
  addMissing("Titulares", titularCats.length);
  addMissing("Dados tratados", dataCats.length);
  addMissing("Finalidade", rot.purpose);
  addMissing("Base legal", rot.legalBase);
  addMissing("Canais de coleta", channels.length);
  addMissing("Sistemas usados", systems.length);
  addMissing("Compartilhamento/Operadores", hasSharing);
  addMissing("Retenção (prazo)", retentionPeriod);
  addMissing("Segurança básica", security.length);

  const completeness = Math.max(0, Math.round(((12 - requiredMissing.length) / 12) * 100));

  const riskLevel = String(rot.riskAssessment?.level || "").toLowerCase();
  const shouldFull =
    hasSensitive || hasIntl || operators.length > 0 || (riskLevel && riskLevel !== "baixa");

  const fmtList = (arr: any[]) => (arr && arr.length ? arr.map(String).join(", ") : "PENDENTE");
  const fmtDataCats = () => {
    if (!dataCats.length) return "PENDENTE";
    const comuns = dataCats.filter((d: any) => !d?.sensivel).map((d: any) => d?.name).filter(Boolean);
    const sens = dataCats.filter((d: any) => !!d?.sensivel).map((d: any) => d?.name).filter(Boolean);
    return [
      `- Dados comuns: ${comuns.length ? comuns.join(", ") : "—"}`,
      `- Dados sensíveis: ${sens.length ? sens.join(", ") : "—"}`,
    ].join("\n");
  };

  const fmtOperators = () => {
    if (!operators.length) return "—";
    return operators.map((o: any) => {
      const name = o.name || "Operador (PENDENTE)";
      const role = o.role || "operador";
      const svc = o.serviceType || "—";
      const country = o.country || "—";
      const dpa = o.hasDpa ? "Sim" : "Não/Não sei";
      const contract = o.hasContract ? "Sim" : "Não/Não sei";
      const sec = o.hasSecurityAnnex ? "Sim" : "Não/Não sei";
      const dataShared = Array.isArray(o.dataShared) ? o.dataShared.join(", ") : "—";
      return `- **${name}** (${role})
  - Serviço: ${svc}
  - País: ${country}
  - Dados compartilhados: ${dataShared}
  - Contrato: ${contract} | DPA: ${dpa} | Anexo segurança: ${sec}
  - Observações: ${o.notes || "—"}`;
    }).join("\n");
  };

  const evidenceSuggested = [
    { k: "Base legal", v: "Contrato / obrigação legal / LI / consentimento (quando aplicável)" },
    { k: "Canais", v: "Print do ponto de coleta (site/app/WhatsApp/formulário)" },
    { k: "Sistemas", v: "Print de telas / relatório + perfis de acesso" },
    { k: "Operadores", v: "Contrato + DPA + anexo de segurança" },
    { k: "Retenção", v: "Política/tabela temporalidade + procedimento de descarte" },
    { k: "Logs", v: "Relatório/print de logs e rastreabilidade (quando aplicável)" },
  ];

  return `
# ROT — Registro de Operações de Tratamento (Premium / fiel ao mapeamento)

**Processo:** ${rot.title || "PENDENTE"}
**Área responsável:** ${rot.department || "PENDENTE"}
**Ponto focal:** ${(rot.pointFocal?.name || "PENDENTE")} ${(rot.pointFocal?.email ? `<${rot.pointFocal.email}>` : "")}
**Data:** ${fmtDate}
**Completude mínima (ROT Enxuto):** ${completeness}% ${requiredMissing.length ? "⚠️" : "✅"}

${requiredMissing.length ? `## Pendências obrigatórias (não inventar informações)
${requiredMissing.map((x) => `- ${x}`).join("\n")}
` : ""}

---

## ROT Enxuto (12 campos) — "preenche rápido e já serve"

| Campo | Valor (derivado do mapeamento) |
|---|---|
| 1. Nome do processo | ${rot.title || "PENDENTE"} |
| 2. Área responsável | ${rot.department || "PENDENTE"} |
| 3. Ponto focal | ${(rot.pointFocal?.name || "PENDENTE")} ${(rot.pointFocal?.email ? `(${rot.pointFocal.email})` : "")} |
| 4. Titulares | ${fmtList(titularCats)} |
| 5. Dados tratados | ${dataCats.length ? dataCats.map((d:any)=>`${d.name}${d.sensivel?" (sensível)":""}`).join(", ") : "PENDENTE"} |
| 6. Finalidade | ${rot.purpose || "PENDENTE"} |
| 7. Base legal | ${rot.legalBase || "PENDENTE"} |
| 8. Como coleta (canais) | ${fmtList(channels)} |
| 9. Sistemas usados | ${fmtList(systems)} |
| 10. Compartilha com alguém? | ${hasSharing ? "Sim" : "PENDENTE"} — ${sharing.length ? sharing.join(", ") : (operators.length ? "ver operadores" : "—")} |
| 11. Retenção (prazo) | ${retentionPeriod || "PENDENTE"} |
| 12. Segurança básica | ${security.length ? security.join(", ") : "PENDENTE"} |

---

${shouldFull ? `## ROT Completo (30 campos) — "padrão auditoria e maturidade"

| Campo | Valor |
|---|---|
| 1. ID do processo | ${rot.id || "PENDENTE"} |
| 2. Nome do processo | ${rot.title || "PENDENTE"} |
| 3. Descrição do tratamento | ${rot.purpose || rot.description || "PENDENTE"} |
| 4. Área responsável | ${rot.department || "PENDENTE"} |
| 5. Ponto focal | ${(rot.pointFocal?.name || "PENDENTE")} ${(rot.pointFocal?.email ? `(${rot.pointFocal.email})` : "")} |
| 6. Categoria de titulares | ${fmtList(titularCats)} |
| 7. Dados pessoais (lista) | ${fmtDataCats()} |
| 8. Dados sensíveis (quais) | ${hasSensitive ? "Sim (ver lista acima)" : "Não"} |
| 9. Crianças/adolescentes | ${ropa.childrenOrTeens ? "Sim" : "Não/Não informado"} |
| 10. Finalidade | ${rot.purpose || "PENDENTE"} |
| 11. Base legal | ${rot.legalBase || "PENDENTE"} |
| 12. Operações de tratamento | ${fmtList(ropa.operations || [])} |
| 13. Fonte de coleta | ${fmtList(sources)} |
| 14. Canal de coleta | ${fmtList(channels)} |
| 15. Sistemas envolvidos | ${fmtList(systems)} |
| 16. Dados em papel? | ${paperRecords === true ? "Sim" : paperRecords === false ? "Não" : "Não informado"} |
| 17. Local de armazenamento | ${storageLocation || "PENDENTE"} |
| 18. Compartilhamentos | ${sharing.length ? sharing.join(", ") : "—"} |
| 19. Operadores (fornecedores) | ${operators.length ? "Sim (ver lista abaixo)" : "—"} |
| 20. Transferência internacional | ${hasIntl ? "Sim" : "Não"} |
| 21. Perfil de acesso | ${accessProfiles.length ? accessProfiles.join(", ") : "PENDENTE"} |
| 22. Medidas de segurança | ${security.length ? security.join(", ") : "PENDENTE"} |
| 23. Logs e rastreabilidade | ${logs || "PENDENTE"} |
| 24. Retenção (prazo) | ${retentionPeriod || "PENDENTE"} |
| 25. Base do prazo | ${retentionLegalBasis || "PENDENTE"} |
| 26. Descarte/eliminação | ${disposalCriteria || "PENDENTE"} |
| 27. Volume e frequência | ${volumeFrequency || "PENDENTE"} |
| 28. Risco do tratamento | ${(rot.riskAssessment?.level || "PENDENTE")} |
| 29. Necessita DPIA/LIA | ${ropa.needsDpiaLia ? "Sim" : "Não/Não informado"} |
| 30. Evidências + revisão | ${fmtList(ropa.evidences || [])} |

### Operadores (fornecedores)
${fmtOperators()}

### Transferência internacional
${hasIntl ? `- Países: ${intlCountries.length ? intlCountries.join(", ") : "PENDENTE"}
- Garantias/contratos: ${ropa.internationalSafeguards || "PENDENTE"}` : "—"}
` : ""}

---

## Evidências mínimas sugeridas (não inventadas)
${evidenceSuggested.map((e)=>`- ${e.k}: ${e.v}`).join("\n")}

---

## Histórico
| Versão | Data | Responsável | Alterações |
|---|---|---|---|
| 1.0 | ${fmtDate} | Sistema | Geração automática baseada no mapeamento (sem inventar informações). |

*Campos "PENDENTE" devem ser completados no mapeamento/ROPA para refletir a operação real.*
`;
}

export function generatePOPDocument(pop: any): string {
  const now = new Date();
  const fmtDate = now.toLocaleDateString("pt-BR");
  const ropa = pop.ropaData || {};
  const steps = Array.isArray(ropa.processSteps) ? ropa.processSteps : [];

  const fmtList = (a:any[]) => (a && a.length ? a.map(String).join(", ") : "PENDENTE");
  const dataCats = Array.isArray(pop.dataCategories) ? pop.dataCategories : [];
  const dataList = dataCats.length ? dataCats.map((d:any)=>`${d.name}${d.sensivel?" (sensível)":""}`).join(", ") : "PENDENTE";
  const systems = Array.isArray(ropa.systemsUsed) ? ropa.systemsUsed : [];
  const channels = Array.isArray(ropa.collectionChannels) ? ropa.collectionChannels : [];
  const operators = Array.isArray(ropa.operators) ? ropa.operators : [];

  const mermaid = (() => {
    if (!steps.length) {
      return `flowchart TD
  A[Etapas do processo (PENDENTE)] --> B[Complete roupaData.processSteps]
  B --> C[Gerar POP com passo a passo real]`;
    }
    const nodes = steps.map((s:any, idx:number) => {
      const id = `S${idx+1}`;
      const label = String(s.title || `Etapa ${idx+1}`).replace(/[\[\]\(\)]/g,"");
      return { id, label };
    });
    const lines = [`flowchart TD`];
    for (const n of nodes) lines.push(`  ${n.id}[${n.label}]`);
    for (let i=0;i<nodes.length-1;i++) lines.push(`  ${nodes[i].id} --> ${nodes[i+1].id}`);
    if (operators.length) lines.push(`  ${nodes[nodes.length-1].id} --> OP[Operadores/Terceiros]`);
    return lines.join("\n");
  })();

  const renderSteps = () => {
    if (!steps.length) {
      return `### Etapas do processo — PENDENTE
Este POP não irá inventar como a empresa trabalha. Para torná-lo útil, complete no mapeamento (ROPA) as **etapas do processo**.

Modelo recomendado (pouca digitação):
- Etapa | Responsável | Canal | Sistema | Dados usados | Operações | Compartilha? | Controles/Logs
`;
    }
    return steps.map((s:any, idx:number) => {
      const order = idx+1;
      const title = s.title || `Etapa ${order}`;
      const actor = s.actor || s.responsible || "PENDENTE";
      const ops = Array.isArray(s.operations) ? s.operations : [];
      const stepChannels = Array.isArray(s.channel) ? s.channel : [];
      const stepSystems = Array.isArray(s.systems) ? s.systems : [];
      const stepData = Array.isArray(s.dataUsed) ? s.dataUsed : [];
      const stepSharing = Array.isArray(s.sharing) ? s.sharing : [];
      const notes = s.notes || "";

      return `### ${order}. ${title}
**Responsável:** ${actor}

- Operações de tratamento: ${fmtList(ops)}
- Canais: ${fmtList(stepChannels)}
- Sistemas: ${fmtList(stepSystems)}
- Dados usados: ${fmtList(stepData)}
- Compartilhamentos: ${stepSharing.length ? stepSharing.join(", ") : "—"}
- Controles/Logs: ${s.controls || s.logs || "PENDENTE"}
${notes ? `\n**Observações:** ${notes}\n` : ""}`;
    }).join("\n\n");
  };

  return `
# POP — Procedimento Operacional do Tratamento (Premium / fiel ao mapeamento)

**Processo:** ${pop.processTitle || pop.title || "PENDENTE"}
**Área:** ${pop.department || "PENDENTE"}
**Ponto focal:** ${(pop.pointFocal?.name || "PENDENTE")} ${(pop.pointFocal?.email ? `<${pop.pointFocal.email}>` : "")}
**Data:** ${fmtDate}

---

## 1) Resumo operacional do tratamento
- Titulares: ${fmtList(pop.titularCategories || [])}
- Dados tratados: ${dataList}
- Base legal (informada): ${pop.legalBase || "PENDENTE"}
- Canais: ${fmtList(channels)}
- Sistemas: ${fmtList(systems)}
- Operadores/Terceiros: ${operators.length ? operators.map((o:any)=>o.name).filter(Boolean).join(", ") : "—"}
- Armazenamento: ${pop.storageLocation || ropa.storageLocation || "PENDENTE"}
- Retenção: ${pop.retentionPeriod || "PENDENTE"}
- Segurança: ${Array.isArray(pop.securityMeasures) && pop.securityMeasures.length ? pop.securityMeasures.join(", ") : "PENDENTE"}

---

## 2) Responsabilidades
| Papel | Responsabilidade |
|---|---|
${(pop.responsibilities || []).map((r:any)=>`| ${r.role} | ${r.description} |`).join("\n")}

---

## 3) Procedimento passo a passo (o que acontece na empresa)
${renderSteps()}

---

## 4) Diagrama do fluxo (ilustrado)
\`\`\`mermaid
${mermaid}
\`\`\`

---

## 5) Evidências/Registros esperados
- Evidências por etapa (prints, relatórios, contratos, DPA, anexos de segurança)
- Logs e rastreabilidade: ${ropa.logsAndTraceability || "PENDENTE"}
- Descarte/eliminação: ${ropa.disposalCriteria || "PENDENTE"}

---

## 6) Revisão
- Frequência: ${pop.revision?.frequency || "Anual"}
- Critérios:
${(pop.revision?.criteria || ["Mudanças no processo", "Mudanças regulatórias", "Incidentes relevantes"]).map((c:string)=>`- ${c}`).join("\n")}

---

## Histórico
| Versão | Data | Responsável | Alterações |
|---|---|---|---|
| 1.0 | ${fmtDate} | Sistema | Geração automática baseada no mapeamento (sem inventar informações). |

*Se o passo a passo estiver "PENDENTE", complete as etapas em roupaData.processSteps para refletir a operação real.*
`;
}


// ==========================
// NOTIFICAÇÕES DE ENTREVISTA
// ==========================

import { organizations } from "../drizzle/schema";
import { ENV } from "./_core/env";

export async function sendInterviewInvitation(
  respondentId: number,
  baseUrl: string
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Buscar o respondente
  const [respondent] = await db
    .select()
    .from(mapeamentoRespondents)
    .where(eq(mapeamentoRespondents.id, respondentId));

  if (!respondent) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Respondente não encontrado' });
  }

  // Buscar a área
  const [area] = await db
    .select()
    .from(mapeamentoAreas)
    .where(eq(mapeamentoAreas.id, respondent.areaId));

  if (!area) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Área não encontrada' });
  }

  // Buscar o contexto
  const [context] = await db
    .select()
    .from(mapeamentoContexts)
    .where(eq(mapeamentoContexts.id, area.contextId));

  if (!context) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Contexto não encontrado' });
  }

  // Buscar a organização
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, context.organizationId));

  const interviewLink = `${baseUrl}/entrevista/${respondent.inviteToken}`;
  const organizationName = org?.name || "Organização";

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite para Entrevista de Mapeamento de Dados</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6B21A8 0%, #3B82F6 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 300; margin: 0;">
                Seusdados Consultoria
              </h1>
              <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 10px 0 0;">
                Mapeamento de Processos e Dados Pessoais
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1f2937; font-size: 20px; font-weight: 500; margin: 0 0 20px;">
                Olá, ${respondent.name}!
              </h2>
              
              <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
                Você foi designado(a) como responsável pela área <strong>${area.name}</strong> 
                no processo de mapeamento de dados pessoais da <strong>${organizationName}</strong>.
              </p>
              
              <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
                Precisamos que você responda a uma entrevista digital sobre os processos e dados 
                pessoais tratados na sua área. Suas respostas são essenciais para garantir a 
                conformidade com a LGPD (Lei Geral de Proteção de Dados).
              </p>
              
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 25px 0;">
                <p style="color: #6b7280; font-size: 13px; margin: 0 0 5px;">Sua área:</p>
                <p style="color: #1f2937; font-size: 16px; font-weight: 500; margin: 0;">${area.name}</p>
                <p style="color: #6b7280; font-size: 13px; margin: 15px 0 5px;">Seu cargo:</p>
                <p style="color: #1f2937; font-size: 16px; font-weight: 500; margin: 0;">${respondent.role || "Não informado"}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${interviewLink}" 
                   style="display: inline-block; background: linear-gradient(135deg, #6B21A8 0%, #3B82F6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 500;">
                  Iniciar Entrevista
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 20px 0 0;">
                Se o botão não funcionar, copie e cole este link no seu navegador:
              </p>
              <p style="color: #6B21A8; font-size: 12px; word-break: break-all; margin: 5px 0 0;">
                ${interviewLink}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 25px 40px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                Este e-mail foi enviado automaticamente pelo sistema Seusdados Due Diligence.<br>
                Em caso de dúvidas, entre em contato com o DPO da sua organização.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  try {
    // Notifica o owner sobre o convite gerado
    if (ENV.forgeApiUrl && ENV.forgeApiKey) {
      const endpoint = `${ENV.forgeApiUrl.endsWith('/') ? ENV.forgeApiUrl : ENV.forgeApiUrl + '/'}webdevtoken.v1.WebDevService/SendNotification`;
      
      await fetch(endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${ENV.forgeApiKey}`,
          "content-type": "application/json",
          "connect-protocol-version": "1",
        },
        body: JSON.stringify({
          title: `📋 Convite de Entrevista - ${respondent.name}`,
          content: `Um convite de entrevista foi gerado para ${respondent.name} (${respondent.email}) da área ${area.name}.\n\nLink: ${interviewLink}\n\nEnvie este link por e-mail ou WhatsApp para o responsável.`,
        }),
      });
    }

    // Atualizar status do respondente para "convidado"
    await db
      .update(mapeamentoRespondents)
      .set({
        status: "convidado",
        inviteSentAt: new Date().toISOString(),
      })
      .where(eq(mapeamentoRespondents.id, respondentId));

    return { success: true, message: `Link de entrevista gerado com sucesso para ${respondent.email}. O link foi registrado e pode ser enviado manualmente.` };
  } catch (error) {
    logger.error("Erro ao enviar convite:", error);
    return { success: false, message: `Erro ao processar convite: ${error}` };
  }
}

export async function sendBulkInterviewInvitations(
  contextId: number,
  baseUrl: string
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Buscar todas as áreas do contexto
  const areas = await db
    .select()
    .from(mapeamentoAreas)
    .where(eq(mapeamentoAreas.contextId, contextId));

  const areaIds = areas.map(a => a.id);
  if (areaIds.length === 0) {
    return { sent: 0, failed: 0, errors: ["Nenhuma área encontrada"] };
  }

  // Buscar todos os respondentes pendentes
  const respondents = await db
    .select()
    .from(mapeamentoRespondents)
    .where(
      and(
        inArray(mapeamentoRespondents.areaId, areaIds),
        eq(mapeamentoRespondents.status, "pendente")
      )
    );

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const respondent of respondents) {
    try {
      const result = await sendInterviewInvitation(respondent.id, baseUrl);
      if (result.success) {
        sent++;
      } else {
        failed++;
        errors.push(`${respondent.name}: ${result.message}`);
      }
    } catch (error) {
      failed++;
      errors.push(`${respondent.name}: ${error}`);
    }
  }

  return { sent, failed, errors };
}


// ==========================
// LEMBRETES AUTOMÁTICOS
// ==========================

export interface ReminderConfig {
  id?: number;
  organizationId: number;
  daysBeforeReminder: number;
  reminderFrequencyDays: number;
  maxReminders: number;
  emailTemplate?: string;
  isActive: boolean;
}

export async function getReminderConfig(organizationId: number): Promise<ReminderConfig | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.execute(
    sql`SELECT * FROM mapeamento_reminder_config WHERE "organizationId" = ${organizationId}`
  );
  
  const rows = (result as any)[0] || [];
  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    organizationId: row.organizationId,
    daysBeforeReminder: row.daysBeforeReminder,
    reminderFrequencyDays: row.reminderFrequencyDays,
    maxReminders: row.maxReminders,
    emailTemplate: row.emailTemplate,
    isActive: row.isActive === 1,
  };
}

export async function saveReminderConfig(config: ReminderConfig): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  await db.execute(
    sql`INSERT INTO mapeamento_reminder_config 
        ("organizationId", "daysBeforeReminder", "reminderFrequencyDays", "maxReminders", "emailTemplate", "isActive")
        VALUES (${config.organizationId}, ${config.daysBeforeReminder}, ${config.reminderFrequencyDays}, 
                ${config.maxReminders}, ${config.emailTemplate || null}, ${config.isActive ? 1 : 0})
        ON CONFLICT ("organizationId") DO UPDATE SET
        "daysBeforeReminder" = EXCLUDED."daysBeforeReminder",
        "reminderFrequencyDays" = EXCLUDED."reminderFrequencyDays",
        "maxReminders" = EXCLUDED."maxReminders",
        "emailTemplate" = EXCLUDED."emailTemplate",
        "isActive" = EXCLUDED."isActive"`
  );
}

export interface PendingReminder {
  respondentId: number;
  respondentName: string;
  respondentEmail: string;
  areaName: string;
  organizationId: number;
  organizationName: string;
  invitedAt: string;
  remindersSent: number;
  lastReminderAt?: string;
}

export async function getPendingReminders(organizationId: number): Promise<PendingReminder[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(
    sql`SELECT 
          r.id as respondentId,
          r.name as respondent_name,
          r.email as respondent_email,
          a.name as area_name,
          r."organizationId",
          o.name as organization_name,
          r."createdAt" as invited_at,
          COALESCE(h."reminderCount", 0) as reminders_sent,
          h."sentAt" as last_reminder_at
        FROM mapeamento_respondents r
        LEFT JOIN mapeamento_areas a ON r."areaId" = a.id
        LEFT JOIN organizations o ON r."organizationId" = o.id
        LEFT JOIN (
          SELECT "respondentId", MAX(reminderCount) as reminderCount, MAX(sentAt) as sentAt
          FROM mapeamento_reminder_history
          GROUP BY "respondentId"
        ) h ON r.id = h."respondentId"
        WHERE r."organizationId" = ${organizationId}
        AND r.status = 'pendente'
        ORDER BY r."createdAt" ASC`
  );

  const rows = (result as any)[0] || [];
  return rows.map((row: any) => ({
    respondentId: row.respondentId,
    respondentName: row.respondent_name,
    respondentEmail: row.respondent_email,
    areaName: row.area_name || "Não especificada",
    organizationId: row.organizationId,
    organizationName: row.organization_name || "Organização",
    invitedAt: row.invited_at,
    remindersSent: row.reminders_sent || 0,
    lastReminderAt: row.last_reminder_at,
  }));
}

export async function sendReminder(
  respondentId: number,
  organizationId: number,
  email: string,
  name: string,
  areaName: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const config = await getReminderConfig(organizationId);
    
    const historyResult = await db.execute(
      sql`SELECT MAX(reminderCount) as count FROM mapeamento_reminder_history 
          WHERE "respondentId" = ${respondentId}`
    );
    const currentCount = ((historyResult as any)[0]?.[0]?.count || 0) + 1;

    if (config && currentCount > config.maxReminders) {
      return false;
    }

    await db.execute(
      sql`INSERT INTO mapeamento_reminder_history 
          ("respondentId", "organizationId", "reminderCount", "emailSentTo", status)
          VALUES (${respondentId}, ${organizationId}, ${currentCount}, ${email}, 'sent')`
    );

    logger.info(`[Reminder] Lembrete #${currentCount} enviado para ${email} (${name}) - Área: ${areaName}`);

    return true;
  } catch (error) {
    logger.error("[Reminder] Erro ao enviar lembrete:", error);
    return false;
  }
}

export async function getReminderHistory(organizationId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(
    sql`SELECT 
          h.*,
          r.name as respondent_name,
          r.email as respondent_email,
          a.name as area_name
        FROM mapeamento_reminder_history h
        LEFT JOIN mapeamento_respondents r ON h."respondentId" = r.id
        LEFT JOIN mapeamento_areas a ON r."areaId" = a.id
        WHERE h."organizationId" = ${organizationId}
        ORDER BY h."sentAt" DESC
        LIMIT 100`
  );

  return (result as any)[0] || [];
}


// ==========================
// GESTÃO DE RESPONDENTES
// ==========================

/**
 * Renova o token de um respondente, gerando novo token e estendendo a validade
 */
export async function renewRespondentToken(respondentId: number): Promise<{ success: boolean; newToken: string; expiresAt: Date }> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Verificar se o respondente existe
  const [respondent] = await db
    .select()
    .from(mapeamentoRespondents)
    .where(eq(mapeamentoRespondents.id, respondentId));

  if (!respondent) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Respondente não encontrado' });
  }

  // Não renovar se já concluiu
  if (respondent.status === "concluiu") {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Não é possível renovar token de entrevista já concluída' });
  }

  // Gerar novo token
  const newToken = crypto.randomBytes(32).toString("hex");
  
  // Nova validade: 30 dias a partir de agora
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await db
    .update(mapeamentoRespondents)
    .set({
      inviteToken: newToken,
      inviteExpiresAt: expiresAt,
    } as any)
    .where(eq(mapeamentoRespondents.id, respondentId));

  return { success: true, newToken, expiresAt };
}

/**
 * Reenvia o convite por email para um respondente
 */
export async function resendInvite(respondentId: number): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Verificar se o respondente existe
  const [respondent] = await db
    .select()
    .from(mapeamentoRespondents)
    .where(eq(mapeamentoRespondents.id, respondentId));

  if (!respondent) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Respondente não encontrado' });
  }

  // Não reenviar se já concluiu
  if (respondent.status === "concluiu") {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Não é possível reenviar convite para entrevista já concluída' });
  }

  // Se o token estiver expirado, renovar primeiro
  if (respondent.inviteExpiresAt && new Date(respondent.inviteExpiresAt) < new Date()) {
    await renewRespondentToken(respondentId);
  }

  // Determinar a URL base
  const baseUrl = getAppBaseUrl();

  // Enviar o convite
  const result = await sendInterviewInvitation(respondentId, baseUrl);

  return result;
}

/**
 * Exclui um respondente (apenas se não tiver respostas)
 */
export async function deleteRespondent(respondentId: number): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Verificar se o respondente existe
  const [respondent] = await db
    .select()
    .from(mapeamentoRespondents)
    .where(eq(mapeamentoRespondents.id, respondentId));

  if (!respondent) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Respondente não encontrado' });
  }

  // Verificar se tem respostas
  const responses = await db
    .select({ id: mapeamentoResponses.id })
    .from(mapeamentoResponses)
    .where(eq(mapeamentoResponses.respondentId, respondentId))
    .limit(1);

  if (responses.length > 0) {
    throw new TRPCError({ 
      code: 'BAD_REQUEST', 
      message: 'Não é possível excluir respondente que já possui respostas. Considere arquivar em vez de excluir.' 
    });
  }

  // Excluir o respondente
  await db
    .delete(mapeamentoRespondents)
    .where(eq(mapeamentoRespondents.id, respondentId));

  return { success: true, message: 'Respondente excluído com sucesso' };
}

/**
 * PREMIUM: reatribuir processo (respondente redireciona ao dono do processo).
 * Cria novo respondent com novo token (process-level), marca evento em timeline.
 */
export async function reassignProcessByToken(params: {
  token: string;
  newName: string;
  newEmail: string;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

  const respondent = await getRespondentByToken(params.token);
  if (!respondent) throw new TRPCError({ code: "NOT_FOUND", message: "Token inválido" });
  if (!respondent.processId) throw new TRPCError({ code: "BAD_REQUEST", message: "Reatribuição só é suportada em token por processo." });

  const created = await createRespondent({
    organizationId: respondent.organizationId,
    areaId: respondent.areaId,
    processId: Number(respondent.processId),
    name: params.newName,
    email: params.newEmail,
    role: "delegado_process",
  });

  await timelineEvent({
    organizationId: respondent.organizationId,
    areaId: respondent.areaId,
    processId: Number(respondent.processId),
    respondentId: respondent.id,
    eventType: "reassigned",
    title: "Processo reatribuído",
    message: `Respondente solicitou reatribuição para ${params.newEmail}`,
    metadata: { old: { id: respondent.id, email: respondent.email }, new: { id: created.id, email: params.newEmail }, newToken: created.inviteToken }
  });

  // marca antigo como pendente/aguardando (não apaga histórico)
  await db.update(mapeamentoRespondents).set({ status: "pendente" } as any).where(eq(mapeamentoRespondents.id, respondent.id));

  return { ok: true, newRespondentId: created.id, newToken: created.inviteToken };
}

// ==================== ROPA MARKDOWN ====================
export function generateROPADocument(rot: any): string {
  const rd = rot.ropaData || {};
  const lines: string[] = [];
  
  lines.push(`# Registro de Atividades de Tratamento (ROPA)`);
  lines.push(``);
  lines.push(`**Processo:** ${rot.title || "Sem titulo"}`);
  lines.push(`**Area:** ${rot.areaName || rot.department || "---"}`);
  lines.push(`**Base legal:** ${rot.legalBase || rot.inferredLegalBase || "PENDENTE"}`);
  lines.push(`**Finalidade:** ${rot.purpose || rot.inferredPurpose || "PENDENTE"}`);
  lines.push(``);

  const sources = rd.collectionSources || [];
  if (sources.length > 0) {
    lines.push(`## Fontes de coleta`);
    sources.forEach((s: string) => lines.push(`- ${s}`));
    lines.push(``);
  }

  const channels = rd.collectionChannels || [];
  if (channels.length > 0) {
    lines.push(`## Canais de coleta`);
    channels.forEach((c: string) => lines.push(`- ${c}`));
    lines.push(``);
  }

  const systems = rd.systemsUsed || [];
  if (systems.length > 0) {
    lines.push(`## Sistemas utilizados`);
    systems.forEach((s: string) => lines.push(`- ${s}`));
    lines.push(``);
  }

  const operators = rd.operators || [];
  if (operators.length > 0) {
    lines.push(`## Operadores e terceiros`);
    lines.push(``);
    lines.push(`| Nome | Tipo | Finalidade | Contrato |`);
    lines.push(`|------|------|-----------|----------|`);
    operators.forEach((op: any) => {
      lines.push(`| ${op.name || "---"} | ${op.type || "---"} | ${op.purpose || "---"} | ${op.hasContract ? "Sim" : "Nao"} |`);
    });
    lines.push(``);
  }

  const dataCats = rot.dataCategories || rd.dataCategories || [];
  if (dataCats.length > 0) {
    lines.push(`## Categorias de dados tratados`);
    dataCats.forEach((d: string) => lines.push(`- ${d}`));
    lines.push(``);
  }

  const titularCats = rot.titularCategories || (rot.titularCategory ? [rot.titularCategory] : []);
  if (titularCats.length > 0) {
    lines.push(`## Categorias de titulares`);
    titularCats.forEach((t: string) => lines.push(`- ${t}`));
    lines.push(``);
  }

  lines.push(`## Indicadores de risco (RIPD/DPIA)`);
  lines.push(``);
  lines.push(`| Indicador | Valor |`);
  lines.push(`|-----------|-------|`);
  lines.push(`| Criancas/Adolescentes | ${rd.childrenOrTeens ? "**Sim**" : "Nao"} |`);
  lines.push(`| Monitoramento sistematico | ${rd.systematicMonitoring ? "**Sim**" : "Nao"} |`);
  lines.push(`| Larga escala | ${rd.largeScale ? "**Sim**" : "Nao"} |`);
  lines.push(`| Dados sensiveis | ${rd.sensitiveData ? "**Sim**" : "Nao"} |`);
  lines.push(``);

  if (rot.retentionPeriod || rd.retentionPeriod) {
    lines.push(`## Retencao de dados`);
    lines.push(`**Periodo:** ${rot.retentionPeriod || rd.retentionPeriod || "PENDENTE"}`);
    if (rd.retentionLegalBasis) {
      lines.push(`**Base legal da retencao:** ${rd.retentionLegalBasis}`);
    }
    lines.push(``);
  }

  if (rot.storageLocation || rd.storageLocation) {
    lines.push(`## Armazenamento`);
    lines.push(`**Local:** ${rot.storageLocation || rd.storageLocation || "PENDENTE"}`);
    lines.push(``);
  }

  if (rot.internationalTransfer || rd.internationalTransfer) {
    lines.push(`## Transferencia internacional`);
    lines.push(`**Transferencia:** Sim`);
    const countries = rot.internationalCountries || rd.internationalCountries || [];
    if (countries.length > 0) {
      lines.push(`**Paises:** ${countries.join(", ")}`);
    }
    lines.push(``);
  }

  if (rd.paperRecords) {
    lines.push(`> **Atencao:** Este processo possui registros em papel/arquivo fisico.`);
    lines.push(``);
  }

  const measures = rot.securityMeasures || rd.securityMeasures || [];
  if (measures.length > 0) {
    lines.push(`## Medidas de seguranca`);
    measures.forEach((m: string) => lines.push(`- ${m}`));
    lines.push(``);
  }

  const dataUses = rd.dataUses || [];
  if (dataUses.length > 0) {
    lines.push(`## Finalidades por dado (Data Uses)`);
    lines.push(``);
    lines.push(`| Dado | Finalidade | Base legal | Validacao |`);
    lines.push(`|------|-----------|-----------|-----------|`);
    dataUses.forEach((du: any) => {
      const validation = du.legalBasisValidated?.status || "pendente";
      lines.push(`| ${du.dataCategory || "---"} | ${du.purposeLabel || "---"} | ${du.suggestedLegalBasis || "---"} | ${validation} |`);
    });
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(`*Documento gerado automaticamente pela plataforma Seusdados Due Diligence*`);

  return lines.join("\n");
}


// ==========================
// COBERTURA DE FINALIDADES
// ==========================

export async function getCoverageSummary(organizationId: number) {
  const db = await getDbSafe();

  // Buscar todas as áreas
  const areas = await db
    .select()
    .from(mapeamentoAreas)
    .where(eq(mapeamentoAreas.organizationId, organizationId));

  // Buscar todos os processos
  const processes = await db
    .select()
    .from(mapeamentoProcesses)
    .where(and(eq(mapeamentoProcesses.organizationId, organizationId), eq(mapeamentoProcesses.isActive, 1)));

  // Buscar todos os respondentes
  const respondents = await db
    .select()
    .from(mapeamentoRespondents)
    .where(eq(mapeamentoRespondents.organizationId, organizationId));

  // Buscar todas as respostas
  const allResponses = await db
    .select()
    .from(mapeamentoResponses)
    .where(eq(mapeamentoResponses.organizationId, organizationId));

  // Buscar ROTs gerados
  const rots = await db
    .select()
    .from(rotOperations)
    .where(eq(rotOperations.organizationId, organizationId));

  // Calcular cobertura por área
  const areasCoverage = areas.map(area => {
    const areaProcesses = processes.filter(p => p.areaId === area.id);
    const areaRespondents = respondents.filter(r => r.areaId === area.id);
    const areaResponses = allResponses.filter(r => {
      const proc = areaProcesses.find(p => p.id === r.processId);
      return !!proc;
    });
    const completedResponses = areaResponses.filter(r => Number(r.completed || 0) === 1);
    const responsesWithRot = areaResponses.filter(r => r.rotId);

    return {
      areaId: area.id,
      areaName: area.name,
      totalProcesses: areaProcesses.length,
      completedInterviews: completedResponses.length,
      rotsGenerated: responsesWithRot.length,
      respondentsCount: areaRespondents.length,
      respondentsCompleted: areaRespondents.filter(r => r.status === 'concluiu').length,
      coveragePercent: areaProcesses.length > 0
        ? Math.round((completedResponses.length / areaProcesses.length) * 100)
        : 0,
    };
  });

  // Distribuição de bases legais
  const legalBaseCounts: Record<string, number> = {};
  const purposeCounts: Record<string, number> = {};
  let totalDataUses = 0;
  let validatedDataUses = 0;
  let totalDataCategories = 0;

  for (const resp of allResponses) {
    // Contar categorias de dados
    const cats = Array.isArray(resp.dataCategories) ? resp.dataCategories : [];
    totalDataCategories += cats.length;

    // Contar bases legais
    if (resp.legalBase) {
      legalBaseCounts[resp.legalBase] = (legalBaseCounts[resp.legalBase] || 0) + 1;
    }

    // Analisar DataUses
    const ropaData = resp.ropaData as any;
    const dataUses: any[] = ropaData?.dataUses || [];
    totalDataUses += dataUses.length;

    for (const du of dataUses) {
      if (du.legalBasisValidated && (du.legalBasisValidated.status === 'accepted' || du.legalBasisValidated.status === 'adjusted')) {
        validatedDataUses++;
        const code = du.legalBasisValidated.code;
        if (code) legalBaseCounts[code] = (legalBaseCounts[code] || 0) + 1;
      }
      // Contar finalidades
      if (Array.isArray(du.purposes)) {
        for (const p of du.purposes) {
          purposeCounts[p] = (purposeCounts[p] || 0) + 1;
        }
      }
      if (du.purposeLabel) {
        purposeCounts[du.purposeLabel] = (purposeCounts[du.purposeLabel] || 0) + 1;
      }
    }
  }

  // Distribuição de risco
  const riskDistribution: Record<string, number> = { baixa: 0, media: 0, alta: 0, extrema: 0 };
  for (const resp of allResponses) {
    if (resp.riskLevel) {
      riskDistribution[resp.riskLevel] = (riskDistribution[resp.riskLevel] || 0) + 1;
    }
  }

  // Top finalidades
  const topPurposes = Object.entries(purposeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([label, count]) => ({ label, count }));

  // Distribuição de bases legais formatada
  const legalBaseLabels: Record<string, string> = {
    consentimento: 'Consentimento',
    obrigacao_legal: 'Obrigação legal',
    execucao_contrato: 'Execução de contrato',
    legitimo_interesse: 'Legítimo interesse',
    exercicio_direitos: 'Exercício de direitos',
    tutela_saude: 'Tutela da saúde',
    protecao_credito: 'Proteção ao crédito',
    pesquisa: 'Pesquisa',
    politicas_publicas: 'Políticas públicas',
    protecao_vida: 'Proteção da vida',
  };

  const legalBaseDistribution = Object.entries(legalBaseCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([code, count]) => ({
      code,
      label: legalBaseLabels[code] || code,
      count,
    }));

  // ROTs por status
  const rotsByStatus: Record<string, number> = { rascunho: 0, em_revisao: 0, aprovado: 0, arquivado: 0 };
  for (const rot of rots) {
    rotsByStatus[rot.status] = (rotsByStatus[rot.status] || 0) + 1;
  }

  return {
    summary: {
      totalAreas: areas.length,
      totalProcesses: processes.length,
      totalRespondents: respondents.length,
      respondentsCompleted: respondents.filter(r => r.status === 'concluiu').length,
      totalResponses: allResponses.length,
      completedResponses: allResponses.filter(r => Number(r.completed || 0) === 1).length,
      totalRots: rots.length,
      totalDataCategories,
      totalDataUses,
      validatedDataUses,
      overallCoverage: processes.length > 0
        ? Math.round((allResponses.filter(r => Number(r.completed || 0) === 1).length / processes.length) * 100)
        : 0,
    },
    areasCoverage,
    legalBaseDistribution,
    riskDistribution,
    topPurposes,
    rotsByStatus,
  };
}

// ==========================
// EDIÇÃO PÓS-FINALIZAÇÃO
// ==========================

/**
 * Reabrir entrevista finalizada para edição (apenas consultores)
 */
export async function reopenInterview(
  respondentId: number,
  organizationId: number,
  actorUserId: number,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  const db = await getDbSafe();

  // Verificar respondente
  const [respondent] = await db
    .select()
    .from(mapeamentoRespondents)
    .where(and(eq(mapeamentoRespondents.id, respondentId), eq(mapeamentoRespondents.organizationId, organizationId)));

  if (!respondent) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Respondente não encontrado.' });
  }

  if (respondent.status !== 'concluiu') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'A entrevista não está finalizada. Apenas entrevistas concluídas podem ser reabertas.' });
  }

  // Reabrir: voltar status para em_andamento
  await db
    .update(mapeamentoRespondents)
    .set({ status: 'em_andamento', completedAt: null } as any)
    .where(eq(mapeamentoRespondents.id, respondentId));

  // Marcar respostas como não concluídas (permite edição)
  const responses = await db
    .select()
    .from(mapeamentoResponses)
    .where(eq(mapeamentoResponses.respondentId, respondentId));

  for (const resp of responses) {
    await db
      .update(mapeamentoResponses)
      .set({ completed: 0 } as any)
      .where(eq(mapeamentoResponses.id, resp.id));
  }

  // Registrar na timeline
  await timelineEvent({
    organizationId,
    areaId: respondent.areaId,
    processId: (respondent as any).processId ?? null,
    respondentId: respondent.id,
    eventType: 'interview_reopened',
    title: 'Entrevista reaberta',
    message: reason || 'Entrevista reaberta para edição pelo consultor.',
    createdById: actorUserId,
    metadata: { reason, reopenedBy: actorUserId },
  });

  return { success: true, message: 'Entrevista reaberta com sucesso. O respondente pode acessar o link original para editar.' };
}

/**
 * Atualizar DataUses de uma resposta (edição pós-finalização por consultor)
 */
export async function updateDataUses(
  responseId: number,
  organizationId: number,
  dataUses: any[],
  actorUserId: number,
  regenerateDocuments?: boolean
): Promise<{ success: boolean; message: string; regenerated?: boolean }> {
  const db = await getDbSafe();

  // Buscar a resposta
  const [resp] = await db
    .select()
    .from(mapeamentoResponses)
    .where(and(eq(mapeamentoResponses.id, responseId), eq(mapeamentoResponses.organizationId, organizationId)));

  if (!resp) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Resposta não encontrada.' });
  }

  // Atualizar ropaData com os novos DataUses
  const currentRopaData = (resp.ropaData as any) || {};
  const updatedRopaData = {
    ...currentRopaData,
    dataUses,
    lastEditedBy: actorUserId,
    lastEditedAt: new Date().toISOString(),
  };

  await db
    .update(mapeamentoResponses)
    .set({ ropaData: updatedRopaData } as any)
    .where(eq(mapeamentoResponses.id, responseId));

  // Registrar na timeline
  const [respondent] = await db
    .select()
    .from(mapeamentoRespondents)
    .where(eq(mapeamentoRespondents.id, resp.respondentId));

  await timelineEvent({
    organizationId,
    areaId: respondent?.areaId ?? null,
    processId: resp.processId ?? null,
    respondentId: resp.respondentId,
    eventType: 'datauses_edited',
    title: 'Finalidades editadas',
    message: `${dataUses.length} finalidade(s) atualizada(s) pelo consultor.`,
    createdById: actorUserId,
    metadata: { dataUsesCount: dataUses.length, regenerateDocuments },
  });

  // Regenerar documentos se solicitado e se houver ROT vinculado
  let regenerated = false;
  if (regenerateDocuments && resp.rotId) {
    try {
      const rotId = Number(resp.rotId);

      // Recalcular base legal consolidada
      const validatedUses = dataUses.filter((du: any) =>
        du.legalBasisValidated && (du.legalBasisValidated.status === 'accepted' || du.legalBasisValidated.status === 'adjusted')
      );

      let inferredLegalBase = resp.legalBase || 'execucao_contrato';
      if (validatedUses.length > 0) {
        const baseCounts: Record<string, number> = {};
        for (const du of validatedUses) {
          const code = du.legalBasisValidated?.code;
          if (code) baseCounts[code] = (baseCounts[code] || 0) + 1;
        }
        if (baseCounts['consentimento']) inferredLegalBase = 'consentimento';
        else if (baseCounts['legitimo_interesse']) inferredLegalBase = 'legitimo_interesse';
        else if (baseCounts['obrigacao_legal']) inferredLegalBase = 'obrigacao_legal';
        else {
          const sorted = Object.entries(baseCounts).sort((a, b) => b[1] - a[1]);
          if (sorted.length > 0) inferredLegalBase = sorted[0][0];
        }
      }

      // Inferir purpose consolidado
      let inferredPurpose = '';
      if (validatedUses.length > 0) {
        const allPurposes = new Set<string>();
        for (const du of validatedUses) {
          if (Array.isArray(du.purposes)) du.purposes.forEach((pp: string) => allPurposes.add(pp));
          if (du.purposeLabel) allPurposes.add(du.purposeLabel);
        }
        inferredPurpose = Array.from(allPurposes).join('; ');
      }

      // Atualizar ROT com nova base legal e finalidade
      await db
        .update(rotOperations)
        .set({
          legalBase: inferredLegalBase,
          purpose: inferredPurpose || undefined,
          requiresConsent: inferredLegalBase === 'consentimento' ? 1 : 0,
          updatedAt: new Date().toISOString(),
        } as any)
        .where(eq(rotOperations.id, rotId));

      regenerated = true;

      await timelineEvent({
        organizationId,
        areaId: respondent?.areaId ?? null,
        processId: resp.processId ?? null,
        respondentId: resp.respondentId,
        eventType: 'documents_regenerated',
        title: 'Documentos atualizados',
        message: `ROT atualizado com nova base legal (${inferredLegalBase}) após edição de finalidades.`,
        createdById: actorUserId,
      });
    } catch (err) {
      logger.error('[updateDataUses] Erro ao regenerar documentos:', err);
    }
  }

  return {
    success: true,
    message: `Finalidades atualizadas com sucesso.${regenerated ? ' Documentos regenerados.' : ''}`,
    regenerated,
  };
}
