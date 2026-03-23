// server/governancaService.ts
import { addDays, isBefore } from "date-fns";
import * as db from "./db";

/**
 * Calcula as datas das reuniões do CPPD para um ano,
 * respeitando 01/02 a 30/11 e regime de frequência.
 */
export function generateMeetingDatesForYear(
  year: number,
  regime: "quinzenal" | "mensal" | "bimestral",
  dayOfWeek: "domingo" | "segunda" | "terca" | "quarta" | "quinta" | "sexta" | "sabado",
  time: string,
): Date[] {
  const start = new Date(Date.UTC(year, 1, 1, 12, 0, 0));
  const end = new Date(Date.UTC(year, 10, 30, 12, 0, 0));

  const dayIndexMap: Record<string, number> = {
    domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6,
  };

  const stepDays = regime === "quinzenal" ? 14 : regime === "mensal" ? 30 : 60;

  const [hourStr, minuteStr] = time.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  const dates: Date[] = [];
  const first = new Date(start);
  const targetDow = dayIndexMap[dayOfWeek];
  
  while (first.getUTCDay() !== targetDow) {
    first.setUTCDate(first.getUTCDate() + 1);
  }
  first.setUTCHours(hour, minute, 0, 0);

  let current = first;
  while (!isBefore(end, current)) {
    dates.push(new Date(current));
    current = addDays(current, stepDays);
  }

  return dates;
}

/**
 * Gera a configuração de programa padrão para ano1 (10 meses)
 */
export function getDefaultAno1ProgramDefinition() {
  return {
    phases: [
      { phaseNumber: 1, name: "Diagnóstico e Estruturação da Governança", theme: "Fundação do Programa de Privacidade", startMonth: 1, endMonth: 1, quarter: "Q1" as const, milestones: [
        { month: 1, name: "Relatório de Maturidade Inicial", description: "Avaliação de maturidade em privacidade e consolidação em relatório." },
        { month: 1, name: "Estruturação do CPPD e DPO", description: "Definição de membros, designação formal do encarregado e aprovação pela direção." },
        { month: 1, name: "Cronograma Detalhado do Programa", description: "Cronograma de implementação aprovado em CPPD." },
      ]},
      { phaseNumber: 2, name: "Mapeamento de Dados", theme: "Levantamento e inventário de tratamentos", startMonth: 2, endMonth: 2, quarter: "Q1" as const, milestones: [
        { month: 2, name: "Inventário de Dados (ROPA)", description: "Inventário de operações de tratamento por área." },
        { month: 2, name: "Fluxos de Dados e Sistemas", description: "Fluxograma de dados e matriz de sistemas e repositórios." },
      ]},
      { phaseNumber: 3, name: "Bases Legais", theme: "Fundamentação jurídica de tratamentos", startMonth: 3, endMonth: 3, quarter: "Q1" as const, milestones: [
        { month: 3, name: "Matriz de Bases Legais", description: "Definição de bases legais por finalidade de tratamento." },
      ]},
      { phaseNumber: 4, name: "Contratos e Terceiros", theme: "Fornecedores, operadores e cláusulas", startMonth: 4, endMonth: 4, quarter: "Q2" as const, milestones: [
        { month: 4, name: "Matriz de Fornecedores e Operadores", description: "Inventário de parceiros e avaliação de conformidade." },
      ]},
      { phaseNumber: 5, name: "Avaliação de Riscos", theme: "Análises de impacto e plano de mitigação", startMonth: 5, endMonth: 5, quarter: "Q2" as const, milestones: [
        { month: 5, name: "Relatório de Análise de Riscos", description: "Análises de riscos, avaliações de impacto e plano de mitigação." },
      ]},
      { phaseNumber: 6, name: "Políticas e Procedimentos", theme: "Normas internas e POPs", startMonth: 6, endMonth: 6, quarter: "Q3" as const, milestones: [
        { month: 6, name: "Política de Privacidade", description: "Política institucional aprovada pelo CPPD." },
        { month: 6, name: "Procedimentos Operacionais", description: "Procedimentos e normas internas aprovados." },
      ]},
      { phaseNumber: 7, name: "Capacitação e Cultura", theme: "Treinamentos e comunicação", startMonth: 7, endMonth: 7, quarter: "Q3" as const, milestones: [
        { month: 7, name: "Plano de Treinamento em Privacidade", description: "Programa de capacitação segmentado por público." },
      ]},
      { phaseNumber: 8, name: "Resposta a Incidentes", theme: "Preparação e simulação", startMonth: 8, endMonth: 8, quarter: "Q3" as const, milestones: [
        { month: 8, name: "Plano de Resposta a Incidentes", description: "Procedimentos para incidentes, comunicação e obrigações legais." },
      ]},
      { phaseNumber: 9, name: "Direitos dos Titulares", theme: "Atendimento de solicitações", startMonth: 9, endMonth: 9, quarter: "Q4" as const, milestones: [
        { month: 9, name: "Canal de Atendimento a Titulares", description: "Fluxos e prazos para exercício de direitos." },
      ]},
      { phaseNumber: 10, name: "Auditoria e Melhoria", theme: "Revisão e próximos passos", startMonth: 10, endMonth: 10, quarter: "Q4" as const, milestones: [
        { month: 10, name: "Relatório Final de Maturidade", description: "Comparativo antes/depois e plano de melhoria contínua." },
      ]},
    ],
  };
}

/**
 * Configura CPPD e gera reuniões automáticas para o ano
 */
export async function configureCppdAndGenerateMeetings(params: {
  organizationId: number;
  createdById: number;
  year: number;
  programType: "ano1" | "em_curso";
  regime: "quinzenal" | "mensal" | "bimestral";
  dayOfWeek: "domingo" | "segunda" | "terca" | "quarta" | "quinta" | "sexta" | "sabado";
  time: string;
  meetingLocationType: "teams" | "meet" | "outlook" | "google" | "outro";
  defaultMeetingUrl?: string;
  notes?: string | null;
}) {
  const startDate = new Date(Date.UTC(params.year, 1, 1));
  const endDate = new Date(Date.UTC(params.year, 10, 30));

  const cppdId = await db.upsertCppdConfig({
    organizationId: params.organizationId,
    createdById: params.createdById,
    year: params.year,
    programType: params.programType,
    regime: params.regime,
    dayOfWeek: params.dayOfWeek,
    time: params.time,
    startDate,
    endDate,
    meetingLocationType: params.meetingLocationType,
    defaultMeetingUrl: params.defaultMeetingUrl ?? null,
    status: "ativo",
    notes: params.notes ?? null,
  });

  // Gerar datas de reuniões
  const meetingDates = generateMeetingDatesForYear(
    params.year,
    params.regime,
    params.dayOfWeek,
    params.time,
  );

  // Verificar reuniões existentes
  const existingMeetings = await db.listMeetingsByOrgAndYear(params.organizationId, params.year);
  
  if (existingMeetings.length === 0) {
    for (let i = 0; i < meetingDates.length; i++) {
      await db.createMeeting({
        organizationId: params.organizationId,
        cppdId,
        programId: null,
        createdById: params.createdById,
        year: params.year,
        sequence: i + 1,
        date: meetingDates[i],
        durationMinutes: 90,
        status: "agendada",
        location: null,
        meetingProvider: params.meetingLocationType,
        meetingUrl: params.defaultMeetingUrl ?? null,
        calendarEventId: null,
        agendaTitle: `Reunião CPPD #${i + 1} - ${params.year}`,
        agendaSummary: null,
        agendaTemplateCode: null,
        recordingUrl: null,
        transcript: null,
        minutesPdfUrl: null,
        minutesStatus: "nao_gerada",
      });
    }
  }

  return { cppdId, meetingsGenerated: meetingDates.length };
}

/**
 * Inicializa programa e fases padrão para uma organização/ano
 */
export async function ensureGovernancaProgram(params: {
  organizationId: number;
  createdById: number;
  year: number;
  type: "ano1" | "em_curso";
}) {
  const program = await db.getOrCreateGovernancaProgram({
    organizationId: params.organizationId,
    createdById: params.createdById,
    year: params.year,
    type: params.type,
    status: "em_execucao",
    description: params.type === "ano1" 
      ? "Programa de implantação inicial em 10 meses."
      : "Programa de manutenção e melhoria contínua.",
  });

  const { phases } = await db.listProgramDashboard(params.organizationId, program.id);
  
  if (phases.length > 0) return program;

  if (params.type === "ano1") {
    const def = getDefaultAno1ProgramDefinition();
    for (const phaseDef of def.phases) {
      const phaseId = await db.createProgramPhase({
        organizationId: params.organizationId,
        programId: program.id,
        createdById: params.createdById,
        phaseNumber: phaseDef.phaseNumber,
        name: phaseDef.name,
        theme: phaseDef.theme,
        startMonth: phaseDef.startMonth,
        endMonth: phaseDef.endMonth,
        quarter: phaseDef.quarter,
        status: "nao_iniciado",
      });

      for (const m of phaseDef.milestones) {
        await db.createProgramMilestone({
          organizationId: params.organizationId,
          programId: program.id,
          phaseId,
          createdById: params.createdById,
          month: m.month,
          name: m.name,
          description: m.description,
          isCompleted: false,
          completedAt: null,
          evidenceDocumentUrl: null,
        });
      }
    }
  }

  return program;
}

/**
 * Monta a view da sala de reunião
 */
export async function buildMeetingRoomView(params: {
  organizationId: number;
  meetingId: number;
}) {
  const [meeting, participants, agendaItems, meetingActionItems, orgOpenActionItems] = await Promise.all([
    db.getMeetingById(params.organizationId, params.meetingId),
    db.listMeetingParticipants(params.organizationId, params.meetingId),
    db.listAgendaItems(params.organizationId, params.meetingId),
    db.listActionItemsByMeeting(params.organizationId, params.meetingId),
    db.listOpenActionItemsByOrg(params.organizationId),
  ]);

  return { meeting, participants, agendaItems, meetingActionItems, orgOpenActionItems };
}


// ==================== PLANOS MENSAIS ====================

import { allPlanoTemplates, PlanoAnualTemplate, MesTemplate } from "./seeds/governancaPlanosMensais";
import { TRPCError } from '@trpc/server';

/**
 * Obtém todos os templates de planos anuais disponíveis
 */
export function getAllPlanoAnualTemplates(): PlanoAnualTemplate[] {
  return allPlanoTemplates;
}

/**
 * Obtém um template de plano anual pelo tipo (ano1 ou em_curso)
 */
export function getPlanoAnualTemplateByType(programModel: "ano1" | "em_curso"): PlanoAnualTemplate | undefined {
  return allPlanoTemplates.find(t => t.programModel === programModel);
}

/**
 * Inicializa os templates no banco de dados (seed)
 */
export async function seedPlanoAnualTemplates(): Promise<void> {
  for (const template of allPlanoTemplates) {
    // Verificar se já existe
    const existing = await db.getPlanoAnualTemplateByKey(template.templateKey);
    if (existing) continue;

    // Criar template do plano anual
    const planoId = await db.createPlanoAnualTemplate({
      templateKey: template.templateKey,
      programModel: template.programModel,
      label: template.label,
      description: template.description,
      totalMonths: template.totalMonths,
      isActive: true,
    });

    // Criar templates de meses
    for (const mes of template.months) {
      await db.createMesTemplate({
        planoAnualTemplateId: planoId,
        templateKey: mes.templateKey,
        monthNumber: mes.monthNumber,
        macroBlock: mes.macroBlock,
        title: mes.title,
        theme: mes.theme,
        activities: mes.activities,
        deliverables: mes.deliverables,
        blockColor: mes.blockColor,
        icon: mes.icon,
      });
    }
  }
}

/**
 * Instancia um plano anual para uma organização
 */
export async function instanciarPlanoAnualParaOrganizacao(params: {
  organizationId: number;
  createdById: number;
  templateId: number;
  year: number;
  startDate: Date;
}): Promise<{ planoId: number; mesesCriados: number }> {
  // Obter template do plano
  const template = await db.getPlanoAnualTemplateById(params.templateId);
  if (!template) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Template de plano anual não encontrado' });
  }

  // Obter templates de meses
  const mesesTemplates = await db.listMesTemplatesByPlanoId(params.templateId);

  // Criar instância do plano para a organização
  const planoId = await db.createPlanoAnualOrganizacao({
    organizationId: params.organizationId,
    templateId: params.templateId,
    year: params.year,
    startDate: params.startDate,
    status: "planejado",
    notes: null,
    createdById: params.createdById,
  });

  // Criar instâncias de meses
  for (const mesTemplate of mesesTemplates) {
    // Calcular datas previstas (cada mês tem ~30 dias)
    const scheduledStartDate = new Date(params.startDate);
    scheduledStartDate.setMonth(scheduledStartDate.getMonth() + mesTemplate.monthNumber - 1);
    
    const scheduledEndDate = new Date(scheduledStartDate);
    scheduledEndDate.setMonth(scheduledEndDate.getMonth() + 1);
    scheduledEndDate.setDate(scheduledEndDate.getDate() - 1);

    const mesOrgId = await db.createMesOrganizacao({
      planoOrganizacaoId: planoId,
      organizationId: params.organizationId,
      mesTemplateId: mesTemplate.id,
      monthNumber: mesTemplate.monthNumber,
      scheduledStartDate,
      scheduledEndDate,
      actualStartDate: null,
      actualEndDate: null,
      status: "nao_iniciado",
      notes: null,
    });

    // Criar atividades do mês
    const activities = mesTemplate.activities as string[];
    for (let i = 0; i < activities.length; i++) {
      await db.createAtividadeOrganizacao({
        mesOrganizacaoId: mesOrgId,
        organizationId: params.organizationId,
        order: i + 1,
        description: activities[i],
        status: "pendente",
        assignedToId: null,
        assignedToName: null,
        completedAt: null,
        notes: null,
      });
    }

    // Criar entregáveis do mês
    const deliverables = mesTemplate.deliverables as string[];
    for (let i = 0; i < deliverables.length; i++) {
      await db.createEntregavelOrganizacao({
        mesOrganizacaoId: mesOrgId,
        organizationId: params.organizationId,
        order: i + 1,
        name: deliverables[i],
        description: null,
        status: "pendente",
        assignedToId: null,
        assignedToName: null,
        documentId: null,
        documentUrl: null,
        dueDate: scheduledEndDate,
        completedAt: null,
        notes: null,
      });
    }
  }

  return { planoId, mesesCriados: mesesTemplates.length };
}

/**
 * Obtém o plano anual de uma organização com todos os meses, atividades e entregáveis
 */
export async function getPlanoAnualCompletoOrganizacao(params: {
  organizationId: number;
  planoId: number;
}): Promise<{
  plano: Awaited<ReturnType<typeof db.getPlanoAnualOrganizacaoById>>;
  template: Awaited<ReturnType<typeof db.getPlanoAnualTemplateById>>;
  meses: Array<{
    mes: Awaited<ReturnType<typeof db.getMesOrganizacaoById>>;
    template: Awaited<ReturnType<typeof db.getMesTemplateById>>;
    atividades: Awaited<ReturnType<typeof db.listAtividadesByMesOrganizacao>>;
    entregaveis: Awaited<ReturnType<typeof db.listEntregaveisByMesOrganizacao>>;
  }>;
}> {
  const plano = await db.getPlanoAnualOrganizacaoById(params.organizationId, params.planoId);
  if (!plano) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Plano anual não encontrado' });
  }

  const template = await db.getPlanoAnualTemplateById(plano.templateId);
  const mesesOrganizacao = await db.listMesesOrganizacaoByPlano(params.organizationId, params.planoId);

  const meses = await Promise.all(
    mesesOrganizacao.map(async (mesOrg) => {
      const mesTemplate = await db.getMesTemplateById(mesOrg.mesTemplateId);
      const atividades = await db.listAtividadesByMesOrganizacao(params.organizationId, mesOrg.id);
      const entregaveis = await db.listEntregaveisByMesOrganizacao(params.organizationId, mesOrg.id);

      return {
        mes: mesOrg,
        template: mesTemplate,
        atividades,
        entregaveis,
      };
    })
  );

  return { plano, template, meses };
}

/**
 * Calcula estatísticas de progresso do plano
 */
export function calcularProgressoPlano(meses: Array<{
  atividades: Array<{ status: string }>;
  entregaveis: Array<{ status: string }>;
}>): {
  totalAtividades: number;
  atividadesConcluidas: number;
  totalEntregaveis: number;
  entregaveisConcluidos: number;
  percentualAtividades: number;
  percentualEntregaveis: number;
  percentualGeral: number;
} {
  let totalAtividades = 0;
  let atividadesConcluidas = 0;
  let totalEntregaveis = 0;
  let entregaveisConcluidos = 0;

  for (const mes of meses) {
    totalAtividades += mes.atividades.length;
    atividadesConcluidas += mes.atividades.filter(a => a.status === "concluida").length;
    totalEntregaveis += mes.entregaveis.length;
    entregaveisConcluidos += mes.entregaveis.filter(e => e.status === "aprovado").length;
  }

  const percentualAtividades = totalAtividades > 0 ? Math.round((atividadesConcluidas / totalAtividades) * 100) : 0;
  const percentualEntregaveis = totalEntregaveis > 0 ? Math.round((entregaveisConcluidos / totalEntregaveis) * 100) : 0;
  const percentualGeral = Math.round((percentualAtividades + percentualEntregaveis) / 2);

  return {
    totalAtividades,
    atividadesConcluidas,
    totalEntregaveis,
    entregaveisConcluidos,
    percentualAtividades,
    percentualEntregaveis,
    percentualGeral,
  };
}
