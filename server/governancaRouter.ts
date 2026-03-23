// server/governancaRouter.ts
import { z } from "zod";
import { router, clienteBlockedProcedure, clienteBlockedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { enforceCppdCapability } from "./services/cppdPermissions";
import {
  configureCppdAndGenerateMeetings,
  buildMeetingRoomView,
  ensureGovernancaProgram,
  getAllPlanoAnualTemplates,
  getPlanoAnualTemplateByType,
  seedPlanoAnualTemplates,
  instanciarPlanoAnualParaOrganizacao,
  getPlanoAnualCompletoOrganizacao,
  calcularProgressoPlano,
} from "./governancaService";

const configureCppdSchema = z.object({
  organizationId: z.number().positive(),
  year: z.number().min(2020).max(2100),
  programType: z.enum(["ano1", "em_curso"]),
  regime: z.enum(["quinzenal", "mensal", "bimestral"]),
  dayOfWeek: z.enum(["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"]),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  meetingLocationType: z.enum(["teams", "meet", "outlook", "google", "outro"]),
  defaultMeetingUrl: z.string().optional(),
  // Modelo de secretaria do CPPD (Parte A do RBAC)
  secretariatModel: z.enum(["seusdados", "grupo", "cliente"]).optional().default("seusdados"),
  secretariatProviderName: z.string().optional(),
  secretariatProviderOrgId: z.number().optional(),
  secretariatCoordinatorUserId: z.number().optional(),
});

const updateSecretariatSchema = z.object({
  organizationId: z.number().positive(),
  year: z.number().min(2020).max(2100),
  model: z.enum(["seusdados", "grupo", "cliente"]),
  providerName: z.string().optional(),
  providerOrganizationId: z.number().optional(),
  coordinatorUserId: z.number().optional(),
});

const addMemberSchema = z.object({
  organizationId: z.number().positive(),
  cppdId: z.number().positive(),
  userId: z.number().positive(),
  name: z.string().min(1),
  email: z.string().email(),
  roleInCommittee: z.enum(["sponsor", "dpo", "juridico", "ti", "rh", "seguranca_da_informacao", "processos", "comercial_marketing", "operacoes", "outro"]),
  isVoting: z.boolean().optional(),
  isCoordinator: z.boolean().optional(),
  isSecretary: z.boolean().optional(),
  isDpo: z.boolean().optional(),
});

const meetingRoomSchema = z.object({
  organizationId: z.number().positive(),
  meetingId: z.number().positive(),
});

const createActionSchema = z.object({
  organizationId: z.number().positive(),
  meetingId: z.number().positive(),
  agendaItemId: z.number().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["baixa", "media", "alta", "critica"]),
  dueDate: z.string().optional(),
  responsibleUserId: z.number().optional(),
  sponsorUserId: z.number().optional(),
});

const updateActionStatusSchema = z.object({
  organizationId: z.number().positive(),
  id: z.number().positive(),
  status: z.enum(["aberta", "em_andamento", "concluida", "cancelada"]),
});

export const governancaRouter = router({
  // Visão geral do ano
  overview: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      year: z.number().min(2020).max(2100),
    }))
    .query(async ({ input, ctx }) => {
      const { organizationId, year } = input;
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canViewSponsorOverview', organizationId);

      const cppdConfig = await db.getCppdConfigByOrgAndYear(organizationId, year);
      const meetings = await db.listMeetingsByOrgAndYear(organizationId, year);
      
      let program = null;
      let phases: any[] = [];
      let milestones: any[] = [];
      let controls: any[] = [];

      if (cppdConfig) {
        program = await db.getOrCreateGovernancaProgram({
          organizationId,
          createdById: ctx.user.id,
          year,
          type: cppdConfig.programType ?? "em_curso",
          status: "em_execucao",
          description: null,
        });

        if (program) {
          const dashboard = await db.listProgramDashboard(organizationId, program.id);
          phases = dashboard.phases;
          milestones = dashboard.milestones;
          controls = dashboard.controls;
        }
      }

      const openActions = await db.listOpenActionItemsByOrg(organizationId);

      // Calcular secretariat e capabilities para o frontend (Parte C do RBAC)
      const { getUserCppdCapabilities, parseSecretariat } = await import('./services/cppdPermissions');
      const capabilities = await getUserCppdCapabilities(userCtx, organizationId);
      const secretariat = cppdConfig?.notes ? parseSecretariat(cppdConfig.notes) : { model: 'seusdados' as const };

      return {
        cppdConfig,
        meetings,
        program,
        phases,
        milestones,
        controls,
        openActions,
        secretariat,
        capabilities,
      };
    }),

  // Configuração do CPPD + geração automática de reuniões
  configureCppd: clienteBlockedProcedure
    .input(configureCppdSchema)
    .mutation(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canConfigureCppd', input.organizationId);

      // Construir notes com secretaria
      const { serializeSecretariat } = await import('./services/cppdPermissions');
      const secretariatNotes = serializeSecretariat(null, {
        model: input.secretariatModel || 'seusdados',
        providerName: input.secretariatProviderName,
        providerOrganizationId: input.secretariatProviderOrgId,
        coordinatorUserId: input.secretariatCoordinatorUserId,
      });

      const result = await configureCppdAndGenerateMeetings({
        organizationId: input.organizationId,
        createdById: ctx.user.id,
        year: input.year,
        programType: input.programType,
        regime: input.regime,
        dayOfWeek: input.dayOfWeek,
        time: input.time,
        meetingLocationType: input.meetingLocationType,
        defaultMeetingUrl: input.defaultMeetingUrl,
        notes: secretariatNotes,
      });

      // Inicializar programa e fases
      await ensureGovernancaProgram({
        organizationId: input.organizationId,
        createdById: ctx.user.id,
        year: input.year,
        type: input.programType,
      });

      return result;
    }),

  // Listar membros do CPPD
  listMembers: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      cppdId: z.number().positive(),
    }))
    .query(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canDownloadFromGed', input.organizationId);

      return db.listCppdMembers(input.organizationId, input.cppdId);
    }),

  // Adicionar membro
  addMember: clienteBlockedProcedure
    .input(addMemberSchema)
    .mutation(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canManageMembers', input.organizationId);

      const memberId = await db.createCppdMember({
        organizationId: input.organizationId,
        cppdId: input.cppdId,
        createdById: ctx.user.id,
        userId: input.userId,
        nameSnapshot: input.name,
        emailSnapshot: input.email,
        roleInCommittee: input.roleInCommittee,
        isVoting: input.isVoting ?? true,
        isCoordinator: input.isCoordinator ?? false,
        isSecretary: input.isSecretary ?? false,
        isDpo: input.isDpo ?? false,
        status: "ativo",
        nominationTermUrl: null,
        confidentialityTermUrl: null,
        regimentUrl: null,
      });

      return { id: memberId };
    }),

  // Sala de Reunião
  meetingRoom: clienteBlockedProcedure
    .input(meetingRoomSchema)
    .query(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canDownloadFromGed', input.organizationId);

      return buildMeetingRoomView(input);
    }),

  // Criar tarefa/ação de reunião
  createActionItem: clienteBlockedProcedure
    .input(createActionSchema)
    .mutation(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canCreateAction', input.organizationId);

      const id = await db.createActionItem({
        organizationId: input.organizationId,
        meetingId: input.meetingId,
        agendaItemId: input.agendaItemId ?? null,
        createdById: ctx.user.id,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority,
        status: "aberta",
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        responsibleUserId: input.responsibleUserId,
        sponsorUserId: input.sponsorUserId ?? null,
        originModule: "governanca",
        originReference: `meeting:${input.meetingId}`,
      });

      return { id };
    }),

  // Atualizar status de tarefa
  updateActionStatus: clienteBlockedProcedure
    .input(updateActionStatusSchema)
    .mutation(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canUpdateActionStatus', input.organizationId);

      await db.updateActionItemStatus(input.organizationId, input.id, input.status);

      return { success: true };
    }),

  // Painel do programa de governança
  programDashboard: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      programId: z.number().positive(),
    }))
    .query(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canViewSponsorOverview', input.organizationId);

      return db.listProgramDashboard(input.organizationId, input.programId);
    }),

  // Gerar ata da reunião com IA
  generateMinutes: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      meetingId: z.number().positive(),
      participants: z.array(z.object({
        name: z.string(),
        role: z.string(),
        present: z.boolean(),
        arrivedAt: z.string().optional(),
      })),
      agendaItems: z.array(z.object({
        title: z.string(),
        notes: z.string(),
        decisions: z.array(z.string()),
        elapsedTime: z.number(),
      })),
      actionItems: z.array(z.object({
        title: z.string(),
        responsible: z.string(),
        dueDate: z.string().optional(),
        priority: z.string(),
      })),
      totalDuration: z.number(),
      startTime: z.string(),
      endTime: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canGenerateMinutes', input.organizationId);

      const { invokeLLM } = await import("./_core/llm");
      
      const presentParticipants = input.participants.filter(p => p.present);
      const absentParticipants = input.participants.filter(p => !p.present);
      const allDecisions = input.agendaItems.flatMap(item => item.decisions);
      
      const prompt = `Você é um secretário executivo especializado em atas de reuniões de comitês de privacidade e proteção de dados (CPPD).

Gere uma ata formal e profissional com base nas seguintes informações:

**DATA:** ${new Date().toLocaleDateString('pt-BR')}
**HORÁRIO:** ${input.startTime} às ${input.endTime}
**DURAÇÃO TOTAL:** ${Math.floor(input.totalDuration / 60)} minutos

**PARTICIPANTES PRESENTES (${presentParticipants.length}):**
${presentParticipants.map(p => `- ${p.name} (${p.role}) - chegou às ${p.arrivedAt || 'início'}`).join('\n')}

**PARTICIPANTES AUSENTES (${absentParticipants.length}):**
${absentParticipants.map(p => `- ${p.name} (${p.role})`).join('\n') || 'Nenhum'}

**PAUTA E DISCUSSÕES:**
${input.agendaItems.map((item, idx) => `
${idx + 1}. ${item.title}
   Tempo: ${Math.floor(item.elapsedTime / 60)} min
   Anotações: ${item.notes || 'Sem anotações'}
   Deliberações: ${item.decisions.length > 0 ? item.decisions.join('; ') : 'Nenhuma'}
`).join('')}

**DELIBERAÇÕES FORMAIS:**
${allDecisions.length > 0 ? allDecisions.map((d, i) => `${i + 1}. ${d}`).join('\n') : 'Nenhuma deliberação formal registrada'}

**PLANO DE AÇÃO:**
${input.actionItems.length > 0 ? input.actionItems.map((a, i) => `${i + 1}. ${a.title} - Responsável: ${a.responsible} - Prazo: ${a.dueDate || 'A definir'} - Prioridade: ${a.priority}`).join('\n') : 'Nenhuma ação definida'}

Gere a ata em formato Markdown profissional, incluindo:
1. Cabeçalho com identificação da reunião
2. Lista de presença com verificação de quórum
3. Resumo de cada item da pauta com discussões e deliberações
4. Seção de deliberações e decisões
5. Plano de ação com responsáveis e prazos
6. Encerramento e próximos passos
7. Espaço para assinaturas`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "Você é um secretário executivo especializado em atas de reuniões corporativas, especialmente de comitês de privacidade e proteção de dados. Gere atas formais, profissionais e completas em português brasileiro." },
          { role: "user", content: prompt }
        ]
      });

      const messageContent = response.choices[0]?.message?.content;
      const minutesContent = typeof messageContent === 'string' ? messageContent : '';

      // Salvar ata no banco
      await db.saveMeetingMinutes(input.organizationId, input.meetingId, minutesContent, ctx.user.id);

      return { minutes: minutesContent };
    }),

  // Atualizar membro do CPPD
  updateMember: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      memberId: z.number().positive(),
      roleInCommittee: z.enum(["sponsor", "dpo", "juridico", "ti", "rh", "seguranca_da_informacao", "processos", "comercial_marketing", "operacoes", "outro"]).optional(),
      isVoting: z.boolean().optional(),
      isCoordinator: z.boolean().optional(),
      isSecretary: z.boolean().optional(),
      isDpo: z.boolean().optional(),
      status: z.enum(["ativo", "inativo", "afastado"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canManageMembers', input.organizationId);

      await db.updateCppdMember(input.organizationId, input.memberId, {
        roleInCommittee: input.roleInCommittee,
        isVoting: input.isVoting,
        isCoordinator: input.isCoordinator,
        isSecretary: input.isSecretary,
        isDpo: input.isDpo,
        status: input.status,
      });

      return { success: true };
    }),

  // Remover membro do CPPD
  removeMember: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      memberId: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canManageMembers', input.organizationId);

      await db.removeCppdMember(input.organizationId, input.memberId);

      return { success: true };
    }),

  // Enviar convocação de reunião
  sendMeetingInvitation: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      meetingId: z.number().positive(),
      cppdId: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canSendInvitations', input.organizationId);

      // Buscar membros ativos
      const members = await db.listCppdMembers(input.organizationId, input.cppdId);
      const activeMembers = members.filter((m: { status: string }) => m.status === 'ativo');

      // Buscar dados da reunião
      const meeting = await db.getMeetingById(input.organizationId, input.meetingId);
      if (!meeting) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Reunião não encontrada" });
      }

      // Enviar e-mail para cada membro (simulação)
      const sentTo: string[] = [];
      for (const member of activeMembers) {
        // Em produção, aqui chamaria o serviço de e-mail
        sentTo.push((member as { emailSnapshot: string }).emailSnapshot);
      }

      return { 
        success: true, 
        sentCount: sentTo.length,
        sentTo 
      };
    }),

  // ==================== PLANOS MENSAIS ====================

  // Listar templates de planos anuais disponíveis
  listPlanoAnualTemplates: clienteBlockedProcedure
    .input(z.object({ organizationId: z.number().positive().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = input?.organizationId || ctx.user.organizationId || 0;
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canViewOwnTasks', orgId);
      // Garantir que os templates existam no banco
      await seedPlanoAnualTemplates();
      
      const templates = await db.listPlanoAnualTemplates();
      return templates;
    }),

  // Obter template de plano anual por tipo
  getPlanoAnualTemplateByType: clienteBlockedProcedure
    .input(z.object({
      programModel: z.enum(["ano1", "em_curso"]),
      organizationId: z.number().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const orgId = input.organizationId || ctx.user.organizationId || 0;
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canViewOwnTasks', orgId);
      return getPlanoAnualTemplateByType(input.programModel);
    }),

  // Listar planos anuais de uma organização
  listPlanosAnuaisOrganizacao: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
    }))
    .query(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canViewSponsorOverview', input.organizationId);
      
      return db.listPlanosAnuaisOrganizacao(input.organizationId);
    }),

  // Instanciar plano anual para organização
  instanciarPlanoAnual: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      templateId: z.number().positive(),
      year: z.number().min(2020).max(2100),
      startDate: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canManagePlanoAnual', input.organizationId);
      
      const result = await instanciarPlanoAnualParaOrganizacao({
        organizationId: input.organizationId,
        createdById: ctx.user.id,
        templateId: input.templateId,
        year: input.year,
        startDate: new Date(input.startDate),
      });
      
      return result;
    }),

  // Obter plano anual completo com meses, atividades e entregáveis
  getPlanoAnualCompleto: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      planoId: z.number().positive(),
    }))
    .query(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canViewSponsorOverview', input.organizationId);
      
      const planoCompleto = await getPlanoAnualCompletoOrganizacao({
        organizationId: input.organizationId,
        planoId: input.planoId,
      });
      
      const progresso = calcularProgressoPlano(planoCompleto.meses);
      
      return { ...planoCompleto, progresso };
    }),

  // Atualizar status de atividade
  updateAtividadeStatus: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      atividadeId: z.number().positive(),
      status: z.enum(["pendente", "em_andamento", "concluida", "cancelada"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canUpdateActionStatus', input.organizationId);
      
      const completedAt = input.status === "concluida" ? new Date() : null;
      await db.updateAtividadeStatus(input.organizationId, input.atividadeId, input.status, completedAt);
      
      return { success: true };
    }),

  // Atualizar responsável de atividade
  updateAtividadeAssignee: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      atividadeId: z.number().positive(),
      assignedToId: z.number().nullable(),
      assignedToName: z.string().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canUpdateActionStatus', input.organizationId);
      
      await db.updateAtividadeAssignee(input.organizationId, input.atividadeId, input.assignedToId, input.assignedToName);
      
      return { success: true };
    }),

  // Atualizar status de entregável
  updateEntregavelStatus: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      entregavelId: z.number().positive(),
      status: z.enum(["pendente", "em_elaboracao", "em_revisao", "aprovado", "arquivado"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canUpdateActionStatus', input.organizationId);
      
      const completedAt = input.status === "aprovado" ? new Date() : null;
      await db.updateEntregavelStatus(input.organizationId, input.entregavelId, input.status, completedAt);
      
      return { success: true };
    }),

  // Vincular documento a entregável
  updateEntregavelDocument: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      entregavelId: z.number().positive(),
      documentId: z.number().nullable(),
      documentUrl: z.string().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canStoreInGed', input.organizationId);
      
      await db.updateEntregavelDocument(input.organizationId, input.entregavelId, input.documentId, input.documentUrl);
      
      return { success: true };
    }),

  // Atualizar status do mês
  updateMesStatus: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      mesId: z.number().positive(),
      status: z.enum(["nao_iniciado", "em_andamento", "concluido"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canManagePlanoAnual', input.organizationId);
      
      await db.updateMesOrganizacaoStatus(input.organizationId, input.mesId, input.status);
      
      // Atualizar datas reais se necessário
      if (input.status === "em_andamento") {
        await db.updateMesOrganizacaoActualDates(input.organizationId, input.mesId, new Date(), null);
      } else if (input.status === "concluido") {
        const mes = await db.getMesOrganizacaoById(input.organizationId, input.mesId);
        if (mes) {
          await db.updateMesOrganizacaoActualDates(input.organizationId, input.mesId, mes.actualStartDate, new Date());
        }
      }
      
      return { success: true };
    }),

  // Transcrever áudio de reunião e salvar no banco
  transcribeReuniao: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      meetingId: z.number().positive(),
      audioUrl: z.string().url(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canGenerateMinutes', input.organizationId);

      const { transcribeAudio } = await import('./_core/voiceTranscription');
      
      // Transcrever áudio
      const result = await transcribeAudio({
        audioUrl: input.audioUrl,
        language: 'pt',
        prompt: 'Transcrição de reunião do Comitê de Privacidade e Proteção de Dados (CPPD)'
      });

      // Verificar se a transcrição foi bem sucedida
      if ('error' in result) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.error || 'Erro na transcrição' });
      }

      // Salvar transcrição no banco
      await db.updateGovernancaMeetingTranscript(input.organizationId, input.meetingId, result.text);

      return {
        success: true,
        transcription: result.text,
        language: result.language || 'pt',
      };
    }),

  // ==================== PRESENÇAS E AUSÊNCIAS ====================

  // Registrar presença/ausência em reunião
  updateParticipantAttendance: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      meetingId: z.number().positive(),
      participantId: z.number().positive(),
      attendanceStatus: z.enum(['nao_confirmado', 'presente', 'ausente', 'justificado']),
      joinTime: z.string().optional(),
      leaveTime: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canManageAttendance', input.organizationId);

      await db.updateMeetingParticipantAttendance(
        input.organizationId,
        input.participantId,
        input.attendanceStatus,
        input.joinTime ? new Date(input.joinTime) : null,
        input.leaveTime ? new Date(input.leaveTime) : null,
        input.notes || null
      );

      // Log de atividade (comentado - função não implementada)
      // TODO: Implementar logUserActivity se necessário

      return { success: true };
    }),

  // Listar participantes de uma reunião com status de presença
  listMeetingParticipants: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      meetingId: z.number().positive(),
    }))
    .query(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canDownloadFromGed', input.organizationId);

      return db.listMeetingParticipants(input.organizationId, input.meetingId);
    }),

  // Adicionar participante a uma reunião
  addMeetingParticipant: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      meetingId: z.number().positive(),
      userId: z.number().positive(),
      name: z.string(),
      email: z.string().email(),
      role: z.enum(['membro', 'convidado', 'consultor', 'secretario', 'presidente']),
    }))
    .mutation(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canManageMembers', input.organizationId);

      const id = await db.createMeetingParticipant({
        organizationId: input.organizationId,
        meetingId: input.meetingId,
        createdById: ctx.user.id,
        userId: input.userId,
        nameSnapshot: input.name,
        emailSnapshot: input.email,
        role: input.role,
        attendanceStatus: 'nao_confirmado',
      });

      return { id };
    }),

  // Relatório de presenças/ausências por período
  attendanceReport: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      year: z.number().min(2020).max(2100).optional(),
      userId: z.number().positive().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canViewSponsorOverview', input.organizationId);

      const report = await db.getAttendanceReport(
        input.organizationId,
        input.year,
        input.userId
      );

      return report;
    }),

  // Gerar ata premium de reunião
  generatePremiumAta: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      meetingId: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canGenerateMinutes', input.organizationId);

      const meeting = await db.getGovernancaMeetingById(input.organizationId, input.meetingId);
      if (!meeting) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Reunião não encontrada" });
      }

      const organization = await db.getOrganizationById(input.organizationId);
      // TODO: Implementar governancaPremiumService
      // const { generateAtaPremiumHTML } = await import('./governancaPremiumService');
      // const { generatePDF } = await import('./pdfService');

      // TODO: Implementar geração de ata premium
      // const html = await generateAtaPremiumHTML({
      //   meeting,
      //   organizationName: organization?.name || 'Organização',
      //   consultantName: ctx.user.name || 'Consultor Seusdados',
      //   consultantEmail: ctx.user.email || 'dpo@seusdados.com',
      // });

      // const pdfBuffer = await generatePDF(html);
      // const base64 = pdfBuffer.toString('base64');

      return {
        success: true,
        pdfBase64: '',
        message: 'Geração de ata premium em desenvolvimento',
      };
    }),

  // Verificar e notificar usuários com baixa presença
  checkLowAttendance: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      year: z.number().min(2020).max(2100).optional(),
      threshold: z.number().min(0).max(100).optional(), // Limiar de presença (default 70%)
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, year = new Date().getFullYear(), threshold = 70 } = input;
      
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canManageAttendance', organizationId);

      // Buscar relatório de presenças
      const attendanceReport = await db.getAttendanceReport(organizationId, year);
      
      if (!attendanceReport || !attendanceReport.byUser || attendanceReport.byUser.length === 0) {
        return {
          success: true,
          message: 'Nenhum registro de presença encontrado',
          lowAttendanceUsers: [],
          notificationsSent: 0,
        };
      }

      // Agrupar por usuário e calcular taxa de presença
      const userAttendance = new Map<number, {
        userId: number;
        name: string;
        email: string;
        total: number;
        presentes: number;
        taxa: number;
      }>();

      attendanceReport.byUser.forEach((record: any) => {
        const userId = record.userId;
        if (!userAttendance.has(userId)) {
          userAttendance.set(userId, {
            userId,
            name: record.nameSnapshot || 'Usuário',
            email: record.emailSnapshot || '',
            total: 0,
            presentes: 0,
            taxa: 0,
          });
        }
        const u = userAttendance.get(userId)!;
        u.total++;
        if (record.attendanceStatus === 'presente') {
          u.presentes++;
        }
      });

      // Calcular taxa e filtrar usuários com baixa presença
      const lowAttendanceUsers: Array<{
        userId: number;
        name: string;
        email: string;
        taxa: number;
        presentes: number;
        total: number;
      }> = [];

      userAttendance.forEach((u) => {
        u.taxa = u.total > 0 ? Math.round((u.presentes / u.total) * 100) : 0;
        if (u.taxa < threshold && u.total >= 2) { // Mínimo de 2 reuniões para considerar
          lowAttendanceUsers.push(u);
        }
      });

      // Ordenar por taxa (menor primeiro)
      lowAttendanceUsers.sort((a, b) => a.taxa - b.taxa);

      // Enviar notificação ao owner se houver usuários com baixa presença
      let notificationsSent = 0;
      if (lowAttendanceUsers.length > 0) {
        const { notifyOwner } = await import('./_core/notification');
        const organization = await db.getOrganizationById(organizationId);
        
        const usersList = lowAttendanceUsers
          .slice(0, 10) // Limitar a 10 usuários na notificação
          .map(u => `- ${u.name}: ${u.taxa}% (${u.presentes}/${u.total} reuniões)`)
          .join('\n');

        const title = `⚠️ Alerta de Baixa Presença - ${organization?.name || 'Organização'}`;
        const content = `Foram identificados ${lowAttendanceUsers.length} membro(s) do CPPD com taxa de presença abaixo de ${threshold}% em ${year}:\n\n${usersList}\n\nRecomendamos entrar em contato com estes membros para verificar a situação e tomar as medidas necessárias.`;

        const sent = await notifyOwner({ title, content });
        if (sent) {
          notificationsSent = 1;
        }
      }

      return {
        success: true,
        message: lowAttendanceUsers.length > 0 
          ? `Encontrados ${lowAttendanceUsers.length} usuário(s) com baixa presença`
          : 'Todos os membros estão com presença adequada',
        lowAttendanceUsers,
        notificationsSent,
        threshold,
      };
    }),

  // Enviar alerta individual para usuário com baixa presença
  sendLowAttendanceAlert: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      userId: z.number().positive(),
      year: z.number().min(2020).max(2100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, userId, year = new Date().getFullYear() } = input;
      
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canManageAttendance', organizationId);

      // Buscar dados do usuário
      const user = await db.getUserById(userId);
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
      }

      // Buscar relatório de presenças do usuário
      const attendanceReport = await db.getAttendanceReport(organizationId, year, userId);
      const userRecords = attendanceReport?.byUser || [];
      
      const total = userRecords.length;
      const presentes = userRecords.filter((r: any) => r.attendanceStatus === 'presente').length;
      const taxa = total > 0 ? Math.round((presentes / total) * 100) : 0;

      // Enviar notificação
      const { notifyOwner } = await import('./_core/notification');
      const organization = await db.getOrganizationById(organizationId);

      const title = `📧 Alerta de Presença Enviado - ${user.name || user.email}`;
      const content = `Foi enviado um alerta de baixa presença para ${user.name || user.email} (${user.email}).\n\nOrganização: ${organization?.name || 'N/A'}\nTaxa de Presença: ${taxa}%\nReuniões: ${presentes}/${total}\nAno: ${year}\n\nO membro foi notificado sobre a necessidade de melhorar sua participação nas reuniões do CPPD.`;

      const sent = await notifyOwner({ title, content });

      // Log de atividade (comentado - função não implementada)
      // TODO: Implementar logUserActivity se necessário

      return {
        success: sent,
        message: sent 
          ? `Alerta enviado para ${user.name || user.email}`
          : 'Falha ao enviar notificação',
        userData: {
          name: user.name,
          email: user.email,
          taxa,
          presentes,
          total,
        },
      };
    }),

  // ─── P1-D: Aprovar ata e armazenar no GED ───
  approveMinutes: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      meetingId: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canApproveMinutes', input.organizationId);

      const meeting = await db.getMeetingById(input.organizationId, input.meetingId);
      if (!meeting) throw new TRPCError({ code: 'NOT_FOUND', message: 'Reunião não encontrada' });
      if (!meeting.minutesContent) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ata ainda não foi gerada' });

      // Atualizar status para em_assinatura
      await db.updateMeetingMinutesStatus(input.organizationId, input.meetingId, 'em_assinatura');

      return { success: true, message: 'Ata aprovada e pronta para assinatura' };
    }),

  // ─── P1-D: Armazenar ata no GED ───
  storeMinutesInGed: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      meetingId: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canStoreInGed', input.organizationId);

      const meeting = await db.getMeetingById(input.organizationId, input.meetingId);
      if (!meeting) throw new TRPCError({ code: 'NOT_FOUND', message: 'Reunião não encontrada' });
      if (!meeting.minutesContent) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ata ainda não foi gerada' });

      // Importar GED provider e serviço de PDF
      const { getGedProvider, buildCppdGedPaths } = await import('./providers/ged/index');
      const { generateMinutesPdf } = await import('./services/cppdMinutesPdf');
      const ged = getGedProvider(); // Usa provider local por padrão

      const year = meeting.year || new Date().getFullYear();
      const paths = buildCppdGedPaths(input.organizationId, year, input.meetingId);

      // Garantir que a pasta de atas existe
      await ged.ensureFolder(paths.atas);

      // Buscar participantes da reunião
      const participants = await db.listMeetingParticipants(input.organizationId, input.meetingId);

      // Buscar nome da organização
      const org = await db.getOrganizationById(input.organizationId);
      const orgName = org?.name || org?.razaoSocial || `Organização ${input.organizationId}`;

      // Gerar PDF real com identidade visual Seusdados
      const pdfBuffer = await generateMinutesPdf({
        organizationName: orgName,
        meetingTitle: meeting.title || `${meeting.sequence || 1}ª Reunião Ordinária do CPPD`,
        meetingDate: meeting.scheduledDate
          ? new Date(meeting.scheduledDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
          : new Date().toLocaleDateString('pt-BR'),
        sequence: meeting.sequence || 1,
        year,
        minutesContent: meeting.minutesContent,
        participants: (participants || []).map((p: any) => ({
          name: p.name || p.userName || 'Participante',
          role: p.role || p.cppdRole || 'Membro',
          present: p.present ?? true,
        })),
        consultantName: 'Marcelo Fattori',
      });

      const gedKey = paths.ataFile(meeting.sequence || 1, 'pdf');

      // Armazenar PDF no GED
      const result = await ged.put({
        key: gedKey,
        data: pdfBuffer,
        contentType: 'application/pdf',
        fileName: `ata_reuniao_${String(meeting.sequence || 1).padStart(2, '0')}.pdf`,
      });

      if (!result.success) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.error || 'Falha ao armazenar no GED' });
      }

      // Atualizar meeting com referência ao GED
      await db.updateMeetingMinutesPdf(input.organizationId, input.meetingId, result.file.url, result.file.key);

      // Log de auditoria
      const { logCppdEvent } = await import('./audit/cppdAudit');
      await logCppdEvent({
        organizationId: input.organizationId,
        userId: ctx.user.id,
        action: 'ata_armazenada_ged',
        entityType: 'meeting',
        entityId: input.meetingId,
        details: { gedKey: result.file.key, gedUrl: result.file.url },
      });

      return {
        success: true,
        gedKey: result.file.key,
        gedUrl: result.file.url,
      };
    }),

  // ─── Obter status da ata ───
  getMinutesStatus: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      meetingId: z.number().positive(),
    }))
    .query(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canDownloadFromGed', input.organizationId);

      const meeting = await db.getMeetingById(input.organizationId, input.meetingId);
      if (!meeting) throw new TRPCError({ code: 'NOT_FOUND', message: 'Reunião não encontrada' });

      return {
        minutesStatus: meeting.minutesStatus || 'nao_gerada',
        hasContent: !!meeting.minutesContent,
        hasPdf: !!meeting.minutesPdfUrl,
        gedDocumentKey: meeting.gedDocumentKey || null,
        signersSnapshot: meeting.signersSnapshot || [],
        minutesPdfUrl: meeting.minutesPdfUrl || null,
      };
    }),

  // ─── P2-G: Enviar ata para assinatura ───
  sendForSignature: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      meetingId: z.number().positive(),
      signers: z.array(z.object({
        userId: z.number().positive(),
        name: z.string(),
        role: z.string(),
        email: z.string().optional(),
      })),
      deadline: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canSendForSignature', input.organizationId);

      const meeting = await db.getMeetingById(input.organizationId, input.meetingId);
      if (!meeting) throw new TRPCError({ code: 'NOT_FOUND', message: 'Reunião não encontrada' });
      if (!meeting.minutesContent) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ata ainda não foi gerada' });

      const { getSignatureProvider } = await import('./providers/signature/index');
      const sig = getSignatureProvider();

      const result = await sig.sendForSignature({
        organizationId: input.organizationId,
        meetingId: input.meetingId,
        documentContent: meeting.minutesContent,
        documentUrl: meeting.minutesPdfUrl || undefined,
        gedKey: meeting.gedDocumentKey || undefined,
        signers: input.signers,
        deadline: input.deadline,
      });

      if (result.success) {
        // Salvar snapshot dos signatários
        const snapshot = input.signers.map(s => ({
          userId: s.userId,
          name: s.name,
          role: s.role,
        }));
        await db.updateMeetingSignersSnapshot(input.organizationId, input.meetingId, snapshot);
        await db.updateMeetingMinutesStatus(input.organizationId, input.meetingId, 'em_assinatura');

        // Log de auditoria
        const { logCppdEvent } = await import('./audit/cppdAudit');
        await logCppdEvent({
          organizationId: input.organizationId,
          userId: ctx.user.id,
          action: 'ata_enviada_assinatura',
          entityType: 'meeting',
          entityId: input.meetingId,
          details: { provider: sig.name, signers: input.signers.map(s => s.name) },
        });

        // Enviar e-mails de convite para assinatura aos signatários
        try {
          const { sendSignatureInviteToAll } = await import('./services/cppdSignatureEmail');
          const org = await db.getOrganizationById(input.organizationId);
          const orgName = org?.name || org?.razaoSocial || `Organização ${input.organizationId}`;
          const meetingDate = meeting.scheduledDate
            ? new Date(meeting.scheduledDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
            : new Date().toLocaleDateString('pt-BR');

          const appUrl = process.env.PUBLIC_APP_URL || '';
          const platformUrl = appUrl
            ? `${appUrl}/governanca/${input.organizationId}/reuniao/${input.meetingId}`
            : undefined;

          const emailResult = await sendSignatureInviteToAll(
            input.signers.map(s => ({ name: s.name, role: s.role, email: s.email })),
            {
              organizationName: orgName,
              meetingSequence: meeting.sequence || 1,
              year: meeting.year || new Date().getFullYear(),
              meetingDate,
              pdfUrl: meeting.minutesPdfUrl || undefined,
              platformUrl,
              deadline: input.deadline,
              senderName: ctx.user.name || 'Administrador',
            }
          );

          // Log dos e-mails enviados
          await logCppdEvent({
            organizationId: input.organizationId,
            userId: ctx.user.id,
            action: 'emails_assinatura_enviados',
            entityType: 'meeting',
            entityId: input.meetingId,
            details: {
              sent: emailResult.sent,
              failed: emailResult.failed,
              results: emailResult.results.map(r => ({ email: r.email, success: r.success })),
            },
          });
        } catch (emailError: any) {
          // E-mail não deve bloquear o fluxo de assinatura
          console.error('[sendForSignature] Falha ao enviar e-mails:', emailError?.message);
        }
      }

      return result;
    }),

  // ─── P2-G: Upload de documento assinado (fluxo manual) ───
  uploadSignedDocument: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      meetingId: z.number().positive(),
      fileBase64: z.string(),
      fileName: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canSendForSignature', input.organizationId);

      const { getSignatureProvider } = await import('./providers/signature/index');
      const sig = getSignatureProvider();

      const pdfBuffer = Buffer.from(input.fileBase64, 'base64');

      const result = await sig.uploadSigned({
        organizationId: input.organizationId,
        meetingId: input.meetingId,
        signedPdfData: pdfBuffer,
        fileName: input.fileName,
        uploadedByUserId: ctx.user.id,
      });

      if (result.success && result.signedDocumentUrl) {
        await db.updateMeetingMinutesPdf(
          input.organizationId,
          input.meetingId,
          result.signedDocumentUrl,
          result.gedKey || null
        );

        // Log de auditoria
        const { logCppdEvent } = await import('./audit/cppdAudit');
        await logCppdEvent({
          organizationId: input.organizationId,
          userId: ctx.user.id,
          action: 'documento_assinado_enviado',
          entityType: 'meeting',
          entityId: input.meetingId,
          details: { fileName: input.fileName, gedKey: result.gedKey },
        });
      }

      return result;
    }),

  // ─── P2-H: Finalizar processo de assinatura ───
  finalizeSignature: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      meetingId: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canFinalizeSignature', input.organizationId);

      const { getSignatureProvider } = await import('./providers/signature/index');
      const sig = getSignatureProvider();

      const result = await sig.finalize(input.organizationId, input.meetingId);

      if (result.success) {
        await db.updateMeetingMinutesStatus(input.organizationId, input.meetingId, 'assinada');

        // Atualizar status da reunião para concluída
        const dbInstance = await db.getDb();
        if (dbInstance) {
          const { governancaMeetings } = await import('../drizzle/schema');
          const { eq, and } = await import('drizzle-orm');
          await dbInstance.update(governancaMeetings).set({
            status: 'concluida',
          }).where(and(
            eq(governancaMeetings.organizationId, input.organizationId),
            eq(governancaMeetings.id, input.meetingId)
          ));
        }

        // Log de auditoria
        const { logCppdEvent } = await import('./audit/cppdAudit');
        await logCppdEvent({
          organizationId: input.organizationId,
          userId: ctx.user.id,
          action: 'assinatura_finalizada',
          entityType: 'meeting',
          entityId: input.meetingId,
          details: { provider: sig.name },
        });
      }

      return result;
    }),

  // ─── Listar providers de assinatura disponíveis ───
  listSignatureProviders: clienteBlockedProcedure
    .input(z.object({ organizationId: z.number().positive().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = input?.organizationId || ctx.user.organizationId || 0;
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canViewOwnTasks', orgId);
      const { listSignatureProviders } = await import('./providers/signature/index');
      return listSignatureProviders();
    }),

  // ═══════════════════════════════════════
  // DASHBOARD DE AUDITORIA DO CPPD
  // ═══════════════════════════════════════

  // ─── Listar eventos de auditoria com filtros avançados ───
  listAuditEvents: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      page: z.number().min(1).default(1),
      pageSize: z.number().min(10).max(100).default(25),
      action: z.string().optional(),
      entityType: z.string().optional(),
      entityId: z.number().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      userId: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canViewAuditTrail', input.organizationId);

      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Banco indisponível' });

      const { auditLogs } = await import('../drizzle/schema');
      const { eq, and, like, desc, gte, lte, sql, count } = await import('drizzle-orm');

      // Montar condições dinâmicas
      const conditions: any[] = [
        eq(auditLogs.organizationId, input.organizationId),
        like(auditLogs.action, 'cppd_%'),
      ];

      if (input.action) {
        conditions.push(eq(auditLogs.action, `cppd_${input.action}`));
      }
      if (input.entityType) {
        conditions.push(eq(auditLogs.entityType, input.entityType));
      }
      if (input.entityId) {
        conditions.push(eq(auditLogs.entityId, input.entityId));
      }
      if (input.userId) {
        conditions.push(eq(auditLogs.userId, input.userId));
      }
      if (input.dateFrom) {
        conditions.push(gte(auditLogs.createdAt, input.dateFrom));
      }
      if (input.dateTo) {
        conditions.push(lte(auditLogs.createdAt, input.dateTo));
      }

      const whereClause = and(...conditions);

      // Buscar total
      const [totalResult] = await dbInstance
        .select({ total: count() })
        .from(auditLogs)
        .where(whereClause);
      const total = totalResult?.total || 0;

      // Buscar eventos paginados
      const offset = (input.page - 1) * input.pageSize;
      const events = await dbInstance
        .select()
        .from(auditLogs)
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(input.pageSize)
        .offset(offset);

      // Enriquecer com nomes de usuário
      const userIds = Array.from(new Set(events.map(e => e.userId).filter(Boolean))) as number[];
      let userMap: Record<number, string> = {};
      if (userIds.length > 0) {
        try {
          const { users } = await import('../drizzle/schema');
          const userRows = await dbInstance
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(sql`${users.id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);
          userMap = Object.fromEntries(userRows.map(u => [u.id, u.name || 'Usuário']));
        } catch { /* ignorar se falhar */ }
      }

      return {
        events: events.map(e => ({
          id: e.id,
          action: e.action.replace('cppd_', ''),
          actionLabel: translateAction(e.action),
          entityType: e.entityType,
          entityId: e.entityId,
          userId: e.userId,
          userName: e.userId ? (userMap[e.userId] || `Usuário #${e.userId}`) : 'Sistema',
          details: e.details,
          createdAt: e.createdAt,
        })),
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  // ─── Estatísticas de auditoria para o dashboard ───
  getAuditStats: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canViewAuditTrail', input.organizationId);

      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Banco indisponível' });

      const { auditLogs } = await import('../drizzle/schema');
      const { eq, and, like, count, gte, lte, sql } = await import('drizzle-orm');

      const conditions: any[] = [
        eq(auditLogs.organizationId, input.organizationId),
        like(auditLogs.action, 'cppd_%'),
      ];
      if (input.dateFrom) conditions.push(gte(auditLogs.createdAt, input.dateFrom));
      if (input.dateTo) conditions.push(lte(auditLogs.createdAt, input.dateTo));

      const whereClause = and(...conditions);

      // Total de eventos
      const [totalResult] = await dbInstance
        .select({ total: count() })
        .from(auditLogs)
        .where(whereClause);

      // Contagem por ação
      const actionCounts = await dbInstance
        .select({
          action: auditLogs.action,
          total: count(),
        })
        .from(auditLogs)
        .where(whereClause)
        .groupBy(auditLogs.action);

      // Transformar em objeto amigável
      const byAction: Record<string, number> = {};
      for (const row of actionCounts) {
        byAction[row.action.replace('cppd_', '')] = row.total;
      }

      return {
        totalEvents: totalResult?.total || 0,
        atasGeradas: byAction['ata_gerada'] || 0,
        atasAprovadas: byAction['ata_aprovada'] || 0,
        atasArmazenadasGed: byAction['ata_armazenada_ged'] || 0,
        atasEnviadasAssinatura: byAction['ata_enviada_assinatura'] || 0,
        assinaturasFinalizadas: byAction['assinatura_finalizada'] || 0,
        emailsEnviados: byAction['emails_assinatura_enviados'] || 0,
        reunioesCriadas: byAction['reuniao_criada'] || 0,
        byAction,
      };
    }),

  // ═══════════════════════════════════════
  // QUERIES CONSOLIDADAS (FASE 5)
  // ═══════════════════════════════════════

  // ─── Minhas tarefas abertas (para o usuário logado) ───
  getMyOpenTasks: clienteBlockedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canViewOwnTasks', input.organizationId);

      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Banco indisponível' });

      const { governancaActionItems } = await import('../drizzle/schema');
      const { eq, and, notInArray, desc } = await import('drizzle-orm');

      const tasks = await dbInstance
        .select()
        .from(governancaActionItems)
        .where(
          and(
            eq(governancaActionItems.organizationId, input.organizationId),
            eq(governancaActionItems.assignedToUserId, ctx.user.id),
            notInArray(governancaActionItems.status, ['concluida', 'cancelada']),
          )
        )
        .orderBy(desc(governancaActionItems.dueDate))
        .limit(50);

      const now = new Date();
      return tasks.map(t => ({
        ...t,
        isOverdue: t.dueDate ? new Date(t.dueDate) < now : false,
        daysUntilDue: t.dueDate ? Math.ceil((new Date(t.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null,
      }));
    }),

  // ─── Visão geral do Sponsor (todas as ações da organização) ───
  getSponsorOverview: clienteBlockedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canViewSponsorOverview', input.organizationId);

      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Banco indisponível' });

      const { governancaActionItems, governancaMeetings } = await import('../drizzle/schema');
      const { eq, and, count, sql } = await import('drizzle-orm');

      // Total de ações por status
      const statusCounts = await dbInstance
        .select({ status: governancaActionItems.status, total: count() })
        .from(governancaActionItems)
        .where(eq(governancaActionItems.organizationId, input.organizationId))
        .groupBy(governancaActionItems.status);

      // Total de reuniões
      const [meetingCount] = await dbInstance
        .select({ total: count() })
        .from(governancaMeetings)
        .where(eq(governancaMeetings.organizationId, input.organizationId));

      // Ações vencidas
      const now = new Date().toISOString().split('T')[0] + 'T00:00:00';
      const { lt, notInArray, isNotNull } = await import('drizzle-orm');
      const [overdueCount] = await dbInstance
        .select({ total: count() })
        .from(governancaActionItems)
        .where(
          and(
            eq(governancaActionItems.organizationId, input.organizationId),
            lt(governancaActionItems.dueDate, now),
            notInArray(governancaActionItems.status, ['concluida', 'cancelada']),
            isNotNull(governancaActionItems.dueDate),
          )
        );

      const byStatus: Record<string, number> = {};
      for (const row of statusCounts) {
        byStatus[row.status] = row.total;
      }

      return {
        totalActions: Object.values(byStatus).reduce((a, b) => a + b, 0),
        abertas: byStatus['aberta'] || 0,
        emAndamento: byStatus['em_andamento'] || 0,
        concluidas: byStatus['concluida'] || 0,
        canceladas: byStatus['cancelada'] || 0,
        vencidas: overdueCount?.total || 0,
        totalMeetings: meetingCount?.total || 0,
      };
    }),

  // ─── Ações vencidas da organização (para dashboard) ───
  getOrgOverdue: clienteBlockedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canViewSponsorOverview', input.organizationId);

      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Banco indisponível' });

      const { governancaActionItems } = await import('../drizzle/schema');
      const { eq, and, lt, notInArray, isNotNull, desc } = await import('drizzle-orm');

      const now = new Date().toISOString().split('T')[0] + 'T00:00:00';

      const overdueActions = await dbInstance
        .select()
        .from(governancaActionItems)
        .where(
          and(
            eq(governancaActionItems.organizationId, input.organizationId),
            lt(governancaActionItems.dueDate, now),
            notInArray(governancaActionItems.status, ['concluida', 'cancelada']),
            isNotNull(governancaActionItems.dueDate),
          )
        )
        .orderBy(desc(governancaActionItems.dueDate))
        .limit(100);

      const nowDate = new Date();
      return overdueActions.map(a => ({
        ...a,
        daysOverdue: a.dueDate ? Math.floor((nowDate.getTime() - new Date(a.dueDate).getTime()) / (1000 * 60 * 60 * 24)) : 0,
      }));
    }),

  // ═══════════════════════════════════════
  // OVERDUE JOB — VERIFICAÇÃO DE AÇÕES VENCIDAS
  // ═══════════════════════════════════════

  // ─── Executar verificação manual de ações vencidas ───
  runOverdueCheckNow: clienteBlockedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .mutation(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canRunOverdueCheck', input.organizationId);

      const { runCppdOverdueCheck } = await import('./services/cppdOverdueJob');
      const result = await runCppdOverdueCheck();
      return result;
    }),

  // ─── Status do job de verificação de ações vencidas ───
  getOverdueJobStatus: clienteBlockedProcedure
    .input(z.object({ organizationId: z.number().positive().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = input?.organizationId || ctx.user.organizationId || 0;
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canRunOverdueCheck', orgId);
      const { getCppdOverdueJobStatus } = await import('./services/cppdOverdueJob');
      return getCppdOverdueJobStatus();
    }),

  // ═══════════════════════════════════════
  // PERMISSÕES / CAPABILITIES (FASE 6)
  // ═══════════════════════════════════════

  // ─── Retorna capabilities do usuário logado para o frontend ───
  getMyCapabilities: clienteBlockedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      const { getUserCppdCapabilities } = await import('./services/cppdPermissions');
      return getUserCppdCapabilities(
        { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId },
        input.organizationId,
      );
    }),

  // ─── Atualizar modelo de secretaria do CPPD (Parte A do RBAC) ───
  updateSecretariat: clienteBlockedProcedure
    .input(updateSecretariatSchema)
    .mutation(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canConfigureCppd', input.organizationId);

      const { serializeSecretariat } = await import('./services/cppdPermissions');

      // Buscar config atual
      const cppdConfig = await db.getCppdConfigByOrgAndYear(input.organizationId, input.year);
      if (!cppdConfig) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Configuracao CPPD nao encontrada para este ano' });
      }

      const existingNotes = cppdConfig.notes;
      const newNotes = serializeSecretariat(existingNotes, {
        model: input.model,
        providerName: input.providerName,
        providerOrganizationId: input.providerOrganizationId,
        coordinatorUserId: input.coordinatorUserId,
      });

      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Banco indisponivel' });
      const { sql } = await import('drizzle-orm');
      await dbInstance.execute(sql`
        UPDATE governanca_cppd_configs SET notes = ${newNotes}, "updatedAt" = NOW()
        WHERE id = ${(cppdConfig as any).id}
      `);

      return { success: true, secretariat: { model: input.model } };
    }),

  // ═══════════════════════════════════════
  // CONVITES DE REUNIÃO (ICS + E-MAIL)
  // ═══════════════════════════════════════

  // ─── Enviar convites de reunião com ICS ───
  sendMeetingInvitations: clienteBlockedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      meetingId: z.number().positive(),
      isCancellation: z.boolean().optional().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const userCtx = { userId: ctx.user.id, systemRole: ctx.user.role, organizationId: ctx.user.organizationId };
      await enforceCppdCapability(userCtx, 'canSendInvitations', input.organizationId);

      // Buscar dados da reunião
      const meeting = await db.getMeetingById(input.organizationId, input.meetingId);
      if (!meeting) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Reunião não encontrada' });
      }

      // Buscar participantes
      const participants = await db.listMeetingParticipants(input.organizationId, input.meetingId);

      // Filtrar participantes com e-mail
      const participantsWithEmail = participants.filter((p: any) => p.email);
      if (participantsWithEmail.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nenhum participante com e-mail cadastrado' });
      }

      // Buscar nome da organização
      let orgName = 'CPPD';
      try {
        const dbInstance = await db.getDb();
        if (dbInstance) {
          const { organizations } = await import('../drizzle/schema');
          const { eq } = await import('drizzle-orm');
          const [org] = await dbInstance.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, input.organizationId)).limit(1);
          if (org?.name) orgName = org.name;
        }
      } catch { /* ignorar */ }

      // Calcular horário de término (2 horas após início se não definido)
      const startDate = meeting.scheduledDate ? new Date(meeting.scheduledDate) : new Date();
      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

      // URL da plataforma
      const platformUrl = process.env.PUBLIC_APP_URL
        ? `${process.env.PUBLIC_APP_URL}/governanca/reuniao/${input.meetingId}`
        : undefined;

      const { sendMeetingInvites } = await import('./services/cppdMeetingInvite');

      const result = await sendMeetingInvites({
        organizationId: input.organizationId,
        meetingId: input.meetingId,
        meetingTitle: meeting.title || `Reunião ${meeting.sequence || ''} do CPPD`,
        sequence: meeting.sequence || 0,
        meetingType: meeting.meetingType || 'Ordinária',
        startDate,
        endDate,
        location: meeting.location || undefined,
        agenda: meeting.agenda || undefined,
        platformUrl,
        organizerName: ctx.user.name || 'Secretaria CPPD',
        organizerEmail: ctx.user.email || process.env.EMAIL_FROM || 'noreply@seusdados.com',
        organizationName: orgName,
        participants: participantsWithEmail.map((p: any) => ({
          name: p.name || p.memberName || 'Participante',
          email: p.email,
          role: p.role || p.memberRole || 'membro',
        })),
        sentByUserId: ctx.user.id,
        sentByUserName: ctx.user.name || 'Sistema',
        isCancellation: input.isCancellation,
      });

      return {
        success: result.sent > 0,
        sent: result.sent,
        errors: result.errors,
        total: participantsWithEmail.length,
        details: result.details,
        message: result.sent > 0
          ? `${result.sent} convite(s) enviado(s) com sucesso${result.errors > 0 ? `, ${result.errors} falha(s)` : ''}`
          : 'Nenhum convite enviado. Verifique os e-mails dos participantes.',
      };
    }),
});

// ─── Função auxiliar para traduzir ações de auditoria ───
function translateAction(action: string): string {
  const translations: Record<string, string> = {
    'cppd_ata_gerada': 'Ata gerada',
    'cppd_ata_aprovada': 'Ata aprovada',
    'cppd_ata_armazenada_ged': 'Ata armazenada no GED',
    'cppd_ata_enviada_assinatura': 'Ata enviada para assinatura',
    'cppd_emails_assinatura_enviados': 'Convites de assinatura enviados',
    'cppd_documento_assinado_enviado': 'Documento assinado enviado',
    'cppd_assinatura_finalizada': 'Assinatura finalizada',
    'cppd_reuniao_criada': 'Reunião criada',
    'cppd_reuniao_cancelada': 'Reunião cancelada',
    'cppd_membro_adicionado': 'Membro adicionado',
    'cppd_membro_removido': 'Membro removido',
    'cppd_configuracao_alterada': 'Configuração alterada',
    'cppd_convite_reuniao_enviado': 'Convites de reunião enviados',
    'cppd_convite_cancelamento_enviado': 'Cancelamento de reunião enviado',
    'cppd_acao_vencida_notificada': 'Ação vencida notificada',
  };
  return translations[action] || action.replace('cppd_', '').replace(/_/g, ' ');
}
