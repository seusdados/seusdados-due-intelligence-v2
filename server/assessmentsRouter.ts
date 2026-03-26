import { getAppBaseUrl } from "./appUrl";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db";
import { sql, eq, and, inArray, like } from "drizzle-orm";
import {
  unifiedAssessments,
  assessmentAssignments,
  assessmentResponses,
  assessmentEvidences,
  riskAnalysis,
  assessmentResults,
  assessmentActionPlan,
} from "../drizzle/schema";
import { SEUSDADOS_FRAMEWORK, getTotalQuestions } from "../shared/frameworkSeusdados";
import { getActionPlanById, assertResponsibleOrInternal, ACTION_PLAN_SUBMIT_ALLOWED_STATUSES, ACTION_PLAN_VALIDATION_AWAITING_STATUSES, ACTION_PLAN_VALIDATION_OPEN_STATUSES } from "./actionPlanAccess";

/**
 * Router para Avaliações Unificadas (/avaliacoes)
 * Fluxo: Criar -> Atribuir Domínios -> Respondentes preenchem -> Auto-conclusão -> Análise
 */
export const assessmentsRouter = router({
  /**
   * Criar nova avaliação
   */
  create: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        framework: z.enum(["seusdados", "conformidade_lgpd", "misto", "sgd", "ico", "cnil"]),
        deadline: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha na conexão com o banco de dados" });

      // Apenas internos (admin_global, consultor) podem criar avaliações
      const canCreate = ['admin_global', 'consultor'].includes(ctx.user.role);
      if (!canCreate) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas a equipe interna pode criar novas avaliações de maturidade.' });
      }

      // Isolamento multi-tenant: consultor só pode criar para organizações que gerencia
      // (admin_global pode criar para qualquer organização)

      try {
        const orgId = input.organizationId;
        if (!orgId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Organização é obrigatória para criar uma avaliação' });
        }
        const code = `AC#${Date.now()}`;
        const deadlineStr = input.deadline.toISOString().slice(0, 19).replace('T', ' ');
        const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

        const insertResult = await db.execute(
          sql`INSERT INTO ua_assessments ("organizationId", "assessmentCode", framework, status, deadline, "defaultDeadlineDays", "createdById", "createdAt", "updatedAt") 
              VALUES (${orgId}, ${code}, ${input.framework}, 'pendente_atribuicao', ${deadlineStr}, 15, ${ctx.user.id}, ${nowStr}, ${nowStr})
              RETURNING id`
        );

        const rows = (insertResult as any).rows ?? insertResult[0];
        const insertId = rows?.[0]?.id;
        if (!insertId) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao obter ID da avaliação criada' });
        }

        return { id: insertId, assessmentCode: code };
      } catch (error) {
        console.error('Erro ao criar avaliação:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Falha ao criar avaliação"
        });
      }
    }),

  /**
   * Listar avaliações
   */
  list: protectedProcedure
    .input(z.object({ organizationId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const orgId = input?.organizationId || ctx.user.organizationId;
      const isInternal = ['admin_global', 'consultor', 'sponsor'].includes(ctx.user.role);

      // Internos veem todas (ou filtradas por org se especificado)
      if (isInternal && !orgId) {
        return db.select().from(unifiedAssessments);
      }

      return db
        .select()
        .from(unifiedAssessments)
        .where(eq(unifiedAssessments.organizationId, orgId || 0));
     }),

  /**
   * Listar avaliações por organização (endpoint exclusivo para /plano-acao/maturidade)
   * Exige organizationId obrigatório para garantir isolamento multi-tenant
   */
  listByOrganization: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      // Para perfil Comitê: retornar apenas avaliações onde o usuário tem domínio atribuído
      if (ctx.user.role === 'comite') {
        const userId = ctx.user.id;
        // Buscar IDs de avaliações onde o usuário tem atribuição
        const assignments = await db
          .select({ assessmentId: assessmentAssignments.assessmentId })
          .from(assessmentAssignments)
          .where(eq(assessmentAssignments.assignedToUserId, userId));

        if (assignments.length === 0) return [];

        const linkedAssessmentIds = [...new Set(assignments.map(a => a.assessmentId))];

        return db
          .select()
          .from(unifiedAssessments)
          .where(
            and(
              eq(unifiedAssessments.organizationId, input.organizationId),
              inArray(unifiedAssessments.id, linkedAssessmentIds)
            )
          );
      }

      // Para todos os outros perfis (Sponsor, Admin, Consultor): retornar todas da organização
      return db
        .select()
        .from(unifiedAssessments)
        .where(eq(unifiedAssessments.organizationId, input.organizationId));
    }),

  /**
   * Obter avaliação por ID
   * Isolamento multi-tenant: internos veem qualquer avaliação; clientes apenas da própria organização
   */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      const result = await db
        .select()
        .from(unifiedAssessments)
        .where(eq(unifiedAssessments.id, input.id));

      const assessment = result[0] || null;
      if (!assessment) return null;

      // Internos (admin_global, consultor) podem ver qualquer avaliação
      const isInternal = ['admin_global', 'consultor'].includes(ctx.user.role);
      if (isInternal) return assessment;

      // Clientes só podem ver avaliações da própria organização
      if (ctx.user.organizationId && assessment.organizationId !== ctx.user.organizationId) {
        return null;
      }
      return assessment;
    }),

  /**
   * Salvar atribuições de domínios em lote e notificar por e-mail
   * Cada domínio pode ter no máximo 1 usuário atribuído
   * Apenas admin/consultor pode atribuir
   */
  saveAssignmentsAndNotify: protectedProcedure
    .input(z.object({
      assessmentId: z.number(),
      assignments: z.array(z.object({
        domainId: z.string(),
        domainName: z.string(),
        userId: z.number(),
        userName: z.string(),
        userEmail: z.string(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const canAssign = ['admin_global', 'consultor', 'sponsor'].includes(ctx.user.role);
      if (!canAssign) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores, consultores e sponsors podem atribuir domínios" });
      }

      // Buscar avaliação
      const [assessment] = await db.select().from(unifiedAssessments).where(eq(unifiedAssessments.id, input.assessmentId));
      if (!assessment) throw new TRPCError({ code: "NOT_FOUND", message: "Avaliação não encontrada" });

      // Buscar atribuições ANTERIORES para comparar e detectar mudanças
      const previousAssignments = await db
        .select()
        .from(assessmentAssignments)
        .where(eq(assessmentAssignments.assessmentId, input.assessmentId));
      
      // Criar mapa de atribuições anteriores: domainId → userId
      const previousMap = new Map<string, number>();
      for (const prev of previousAssignments) {
        previousMap.set(prev.domainId, prev.assignedToUserId);
      }

      // Identificar quais domínios tiveram responsável ALTERADO (novo ou diferente)
      const changedAssignments = input.assignments.filter(a => {
        const previousUserId = previousMap.get(a.domainId);
        // Notificar se: (1) domínio não tinha atribuição, ou (2) responsável mudou
        return previousUserId === undefined || previousUserId !== a.userId;
      });

      // Remover atribuições anteriores para os domínios que estão sendo reatribuídos
      const domainIds = input.assignments.map(a => a.domainId);
      if (domainIds.length > 0) {
        for (const domainId of domainIds) {
          await db.delete(assessmentAssignments).where(
            and(
              eq(assessmentAssignments.assessmentId, input.assessmentId),
              eq(assessmentAssignments.domainId, domainId)
            )
          );
        }
      }

      // Inserir novas atribuições
      const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const deadlineStr = assessment.deadline;

      for (const assignment of input.assignments) {
        await db.insert(assessmentAssignments).values({
          assessmentId: input.assessmentId,
          domainId: assignment.domainId,
          domainName: assignment.domainName,
          assignedToUserId: assignment.userId,
          assignedToName: assignment.userName,
          assignedToEmail: assignment.userEmail,
          status: "pendente",
          deadline: deadlineStr,
          createdAt: nowStr,
          updatedAt: nowStr,
        });
      }

      // Verificar se TODOS os domínios do framework estão atribuídos
      const allAssignmentsAfterSave = await db
        .select({ domainId: assessmentAssignments.domainId })
        .from(assessmentAssignments)
        .where(eq(assessmentAssignments.assessmentId, input.assessmentId));
      
      const assignedDomainIds = new Set(allAssignmentsAfterSave.map(a => a.domainId));
      const totalFrameworkDomains = SEUSDADOS_FRAMEWORK.length;
      const allDomainsAssigned = assignedDomainIds.size >= totalFrameworkDomains;
      
      if (allDomainsAssigned) {
        // 100% dos domínios atribuídos → status muda para em_andamento
        await db.update(unifiedAssessments)
          .set({ status: 'em_andamento' })
          .where(eq(unifiedAssessments.id, input.assessmentId));
      } else {
        // Ainda há domínios sem atribuição → manter pendente_atribuicao
        if (assessment.status !== 'pendente_atribuicao') {
          await db.update(unifiedAssessments)
            .set({ status: 'pendente_atribuicao' })
            .where(eq(unifiedAssessments.id, input.assessmentId));
        }
      }

      // Agrupar APENAS domínios alterados por usuário para enviar e-mail
      // Primeira atribuição: notifica todos. Re-atribuição: notifica apenas quem mudou.
      const userAssignments: Record<string, { email: string; name: string; domains: string[] }> = {};
      for (const a of changedAssignments) {
        if (!userAssignments[a.userEmail]) {
          userAssignments[a.userEmail] = { email: a.userEmail, name: a.userName, domains: [] };
        }
        userAssignments[a.userEmail].domains.push(a.domainName);
      }

      // Enviar e-mails
      const emailResults: { email: string; success: boolean }[] = [];
      try {
        const { sendAssessmentEmail } = await import("./emailService");
        const baseUrl = getAppBaseUrl();

        for (const [email, userData] of Object.entries(userAssignments)) {
          try {
            const domainList = userData.domains.join(', ');
            await sendAssessmentEmail({
              to: email,
              recipientName: userData.name,
              assessmentTitle: `Avaliação ${assessment.assessmentCode} - Domínios: ${domainList}`,
              assessmentUrl: `${baseUrl}/avaliacoes/${input.assessmentId}`,
              organizationName: "Organização",
              consultantName: ctx.user.name || ctx.user.email || "Seusdados",
              expiresAt: assessment.deadline,
              assessmentType: 'conformidade',
            });
            emailResults.push({ email, success: true });
          } catch (err) {
            console.error(`Erro ao enviar e-mail para ${email}:`, err);
            emailResults.push({ email, success: false });
          }
        }
      } catch (err) {
        console.error('Erro ao importar emailService:', err);
      }

      return {
        success: true,
        assignmentsCount: input.assignments.length,
        emailsSent: emailResults.filter(e => e.success).length,
        emailsFailed: emailResults.filter(e => !e.success).length,
      };
    }),

  /**
   * Listar atribuições de uma avaliação
   */
  getAssignments: protectedProcedure
    .input(z.object({ assessmentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(assessmentAssignments)
        .where(eq(assessmentAssignments.assessmentId, input.assessmentId));
    }),

  /**
   * Obter domínios atribuídos ao usuário logado para uma avaliação
   * Retorna apenas os domínios que o respondente pode ver/responder
   */
  getMyAssignedDomains: protectedProcedure
    .input(z.object({ assessmentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { domains: [], isAdmin: false };

      const isAdminOrConsultor = ['admin_global', 'consultor'].includes(ctx.user.role);
      const isSponsor = ctx.user.role === 'sponsor';

      if (isAdminOrConsultor) {
        // Admin/consultor vê todos os domínios (somente leitura)
        const allAssignments = await db
          .select()
          .from(assessmentAssignments)
          .where(eq(assessmentAssignments.assessmentId, input.assessmentId));
        return { domains: allAssignments.map(a => a.domainId), isAdmin: true, isSponsor: false, assignments: allAssignments };
      }

      if (isSponsor) {
        // Sponsor vê todos os domínios para acompanhamento, mas NÃO é admin (não edita respostas)
        const allAssignments = await db
          .select()
          .from(assessmentAssignments)
          .where(eq(assessmentAssignments.assessmentId, input.assessmentId));
        return { 
          domains: SEUSDADOS_FRAMEWORK.map(d => d.id), 
          isAdmin: false, 
          isSponsor: true, 
          assignments: allAssignments 
        };
      }

      // Respondente vê apenas seus domínios
      const myAssignments = await db
        .select()
        .from(assessmentAssignments)
        .where(
          and(
            eq(assessmentAssignments.assessmentId, input.assessmentId),
            eq(assessmentAssignments.assignedToUserId, ctx.user.id)
          )
        );

      return {
        domains: myAssignments.map(a => a.domainId),
        isAdmin: false,
        isSponsor: false,
        assignments: myAssignments,
      };
    }),

  /**
   * Salvar resposta com verificação de acesso por domínio
   * Usa UPSERT: se já existe resposta para (assessmentId, questionId), atualiza
   * Salvamento automático - chamado a cada mudança de resposta
   */
  saveResponseWithAccess: protectedProcedure
    .input(z.object({
      assessmentId: z.number(),
      questionId: z.string(),
      questionText: z.string(),
      selectedLevel: z.number().min(1).max(5),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Extrair domínio do questionId (ex: "IA-01-Q01" -> "IA-01")
      const domainMatch = input.questionId.match(/^(IA-\d{2})/);
      if (!domainMatch) throw new TRPCError({ code: "BAD_REQUEST", message: "Formato de questão inválido" });
      const domainId = domainMatch[1];

      // Verificar permissão de resposta por domínio
      // Admin e Consultor podem responder qualquer domínio (equipe interna)
      // Sponsor e demais perfis só podem responder domínios atribuídos a eles
      const isInternalAdmin = ['admin_global', 'consultor'].includes(ctx.user.role);

      if (!isInternalAdmin) {
        const [assignment] = await db
          .select()
          .from(assessmentAssignments)
          .where(
            and(
              eq(assessmentAssignments.assessmentId, input.assessmentId),
              eq(assessmentAssignments.domainId, domainId),
              eq(assessmentAssignments.assignedToUserId, ctx.user.id)
            )
          );

        if (!assignment) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem permissão para responder este domínio. Apenas domínios atribuídos a você podem ser respondidos." });
        }

        // Atualizar status da atribuição para 'em_andamento' se ainda estiver 'pendente'
        if (assignment.status === 'pendente') {
          await db.update(assessmentAssignments)
            .set({ status: 'em_andamento', startedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') })
            .where(eq(assessmentAssignments.id, assignment.id));
        }
      }

      // Buscar assignment ID para o domínio
      const [assignmentRow] = await db
        .select()
        .from(assessmentAssignments)
        .where(
          and(
            eq(assessmentAssignments.assessmentId, input.assessmentId),
            eq(assessmentAssignments.domainId, domainId)
          )
        );

      const assignmentId = assignmentRow?.id || 0;
      const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // UPSERT: verificar se já existe resposta
      const [existing] = await db
        .select()
        .from(assessmentResponses)
        .where(
          and(
            eq(assessmentResponses.assessmentId, input.assessmentId),
            eq(assessmentResponses.questionId, input.questionId)
          )
        );

      if (existing) {
        // Atualizar resposta existente
        await db.update(assessmentResponses)
          .set({
            selectedLevel: input.selectedLevel,
            notes: input.notes || existing.notes,
            respondedByUserId: ctx.user.id,
            respondedAt: nowStr,
            updatedAt: nowStr,
          })
          .where(eq(assessmentResponses.id, existing.id));
        return { id: existing.id, updated: true };
      } else {
        // Inserir nova resposta
        const result = await db.insert(assessmentResponses).values({
          assessmentId: input.assessmentId,
          assignmentId,
          questionId: input.questionId,
          questionText: input.questionText,
          selectedLevel: input.selectedLevel,
          respondedByUserId: ctx.user.id,
          respondedAt: nowStr,
          notes: input.notes,
          createdAt: nowStr,
          updatedAt: nowStr,
        }).returning({ id: assessmentResponses.id });
        return { id: result[0].id, updated: false };
      }
    }),

  /**
   * Obter respostas filtradas por domínios atribuídos ao usuário
   */
  getResponsesFiltered: protectedProcedure
    .input(z.object({ assessmentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const isInternal = ['admin_global', 'consultor', 'sponsor'].includes(ctx.user.role);

      if (isInternal) {
        // Admin/consultor vê todas as respostas
        return db
          .select()
          .from(assessmentResponses)
          .where(eq(assessmentResponses.assessmentId, input.assessmentId));
      }

      // Respondente vê apenas respostas dos seus domínios
      const myAssignments = await db
        .select()
        .from(assessmentAssignments)
        .where(
          and(
            eq(assessmentAssignments.assessmentId, input.assessmentId),
            eq(assessmentAssignments.assignedToUserId, ctx.user.id)
          )
        );

      const myDomainIds = myAssignments.map(a => a.domainId);
      if (myDomainIds.length === 0) return [];

      // Filtrar respostas cujo questionId começa com um dos domínios atribuídos
      const allResponses = await db
        .select()
        .from(assessmentResponses)
        .where(eq(assessmentResponses.assessmentId, input.assessmentId));

      return allResponses.filter(r => {
        const match = r.questionId.match(/^(IA-\d{2})/);
        return match && myDomainIds.includes(match[1]);
      });
    }),

  /**
   * Marcar domínio como concluído pelo respondente
   * Verifica se todas as questões do domínio foram respondidas
   * Se todos os domínios estiverem concluídos, marca a avaliação como 'concluida'
   */
  completeDomain: protectedProcedure
    .input(z.object({
      assessmentId: z.number(),
      domainId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verificar atribuição
      const [assignment] = await db
        .select()
        .from(assessmentAssignments)
        .where(
          and(
            eq(assessmentAssignments.assessmentId, input.assessmentId),
            eq(assessmentAssignments.domainId, input.domainId),
            eq(assessmentAssignments.assignedToUserId, ctx.user.id)
          )
        );

      if (!assignment) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem permissão para este domínio" });
      }

      // Verificar se todas as questões do domínio foram respondidas
      const domain = SEUSDADOS_FRAMEWORK.find(d => d.id === input.domainId);
      if (!domain) throw new TRPCError({ code: "BAD_REQUEST", message: "Domínio não encontrado" });

      const responses = await db
        .select()
        .from(assessmentResponses)
        .where(eq(assessmentResponses.assessmentId, input.assessmentId));

      const domainResponses = responses.filter(r => r.questionId.startsWith(input.domainId));
      const totalQuestions = domain.questions.length;

      if (domainResponses.length < totalQuestions) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Faltam ${totalQuestions - domainResponses.length} questões para concluir este domínio`
        });
      }

      // Validar evidências obrigatórias para perfis Cliente (Sponsor e Comitê)
      const isClientRole = ['sponsor', 'comite'].includes(ctx.user.role || '');
      if (isClientRole) {
        // Buscar todas as evidências do domínio na tabela correta (assessmentEvidences)
        const domainEvidences = await db
          .select()
          .from(assessmentEvidences)
          .where(
            and(
              eq(assessmentEvidences.assessmentId, input.assessmentId),
              like(assessmentEvidences.questionId, `${input.domainId}%`)
            )
          );

        // Agrupar evidências por questionId
        const evidenceCountByQuestion: Record<string, number> = {};
        domainEvidences.forEach(ev => {
          evidenceCountByQuestion[ev.questionId] = (evidenceCountByQuestion[ev.questionId] || 0) + 1;
        });

        // Verificar quais perguntas com nível > 1 não têm evidência
        const missingEvidenceQuestions: string[] = [];
        domainResponses.forEach(r => {
          // Nível 1 = Não/Não se aplica → não exige evidência
          // Nível > 1 = qualquer resposta positiva → exige evidência
          if (r.selectedLevel > 1) {
            const evidenceCount = evidenceCountByQuestion[r.questionId] || 0;
            if (evidenceCount === 0) {
              const question = domain.questions.find(q => q.id === r.questionId);
              if (question) {
                missingEvidenceQuestions.push(question.text || question.id);
              } else {
                missingEvidenceQuestions.push(r.questionId);
              }
            }
          }
        });

        if (missingEvidenceQuestions.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Este domínio ainda não pode ser concluído. Ainda faltam evidências obrigatórias em ${missingEvidenceQuestions.length} pergunta(s) aplicável(is).`
          });
        }
      }

      // ✅ Todas as validações passaram - marcar atribuição como concluída
      const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db.update(assessmentAssignments)
        .set({ status: 'concluida', completedAt: nowStr })
        .where(eq(assessmentAssignments.id, assignment.id));

      // Verificar se TODOS os domínios do framework estão atribuídos E concluídos
      const allAssignments = await db
        .select()
        .from(assessmentAssignments)
        .where(eq(assessmentAssignments.assessmentId, input.assessmentId));

      const assignedDomainIds = new Set(allAssignments.map(a => a.domainId));
      const totalFrameworkDomains = SEUSDADOS_FRAMEWORK.length;
      const allDomainsAssigned = assignedDomainIds.size >= totalFrameworkDomains;

      const allCompleted = allDomainsAssigned && allAssignments.length > 0 && allAssignments.every(a =>
        a.id === assignment.id ? true : a.status === 'concluida'
      );

      if (allCompleted) {
        // Todos os domínios atribuídos E concluídos → avaliação concluída
        await db.update(unifiedAssessments)
          .set({ status: 'concluida' })
          .where(eq(unifiedAssessments.id, input.assessmentId));

        // Plano de Ação deve ser gerado manualmente pelo usuário autorizado via botão na interface.
      } else if (!allDomainsAssigned) {
        // Ainda há domínios sem atribuição → manter pendente_atribuicao
        await db.update(unifiedAssessments)
          .set({ status: 'pendente_atribuicao' })
          .where(eq(unifiedAssessments.id, input.assessmentId));
      }

      return {
        domainCompleted: true,
        assessmentCompleted: allCompleted,
        pendingDomains: allAssignments.filter(a => a.id !== assignment.id && a.status !== 'concluida').length,
      };
    }),

  /**
   * Dados de Análise para Admin/Consultores
   * Inclui: progresso por domínio, respostas consolidadas, métricas de maturidade
   */
  getAnalysisData: protectedProcedure
    .input(z.object({ assessmentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const isInternal = ['admin_global', 'consultor', 'sponsor'].includes(ctx.user.role);
      const isComite = ctx.user.role === 'comite';

      // Buscar avaliação
      const [assessment] = await db.select().from(unifiedAssessments).where(eq(unifiedAssessments.id, input.assessmentId));
      if (!assessment) throw new TRPCError({ code: "NOT_FOUND" });

      // Para perfil Comitê: verificar vínculo direto com a avaliação (domínio atribuído)
      if (isComite) {
        if (assessment.organizationId !== ctx.user.organizationId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para acessar esta avaliação" });
        }
        // Verificar se o usuário tem ao menos um domínio atribuído nesta avaliação
        const [link] = await db
          .select({ id: assessmentAssignments.id })
          .from(assessmentAssignments)
          .where(
            and(
              eq(assessmentAssignments.assessmentId, input.assessmentId),
              eq(assessmentAssignments.assignedToUserId, ctx.user.id)
            )
          )
          .limit(1);
        if (!link) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você não possui vínculo com esta avaliação" });
        }
        // Comitê vinculado: acesso liberado independente do status da avaliação
      } else if (!isInternal) {
        // Outros perfis não internos: exigir avaliação concluída
        if (assessment.status !== 'concluida') {
          throw new TRPCError({ code: "FORBIDDEN", message: "A análise só está disponível após a conclusão de todos os domínios da avaliação" });
        }
        if (assessment.organizationId !== ctx.user.organizationId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para acessar esta avaliação" });
        }
      }

      // Buscar atribuições
      const assignments = await db
        .select()
        .from(assessmentAssignments)
        .where(eq(assessmentAssignments.assessmentId, input.assessmentId));

      // Buscar todas as respostas
      const responses = await db
        .select()
        .from(assessmentResponses)
        .where(eq(assessmentResponses.assessmentId, input.assessmentId));

      // Buscar evidências
      const evidences = await db
        .select()
        .from(assessmentEvidences)
        .where(eq(assessmentEvidences.assessmentId, input.assessmentId));

      // Calcular progresso por domínio
      const domainProgress = SEUSDADOS_FRAMEWORK.map(domain => {
        const totalQuestions = domain.questions.length;
        const domainResponses = responses.filter(r => r.questionId.startsWith(domain.id));
        const answeredQuestions = domainResponses.length;
        const assignment = assignments.find(a => a.domainId === domain.id);
        const domainEvidences = evidences.filter(e => e.questionId.startsWith(domain.id));

        // Calcular média de maturidade do domínio
        const avgLevel = domainResponses.length > 0
          ? domainResponses.reduce((sum, r) => sum + r.selectedLevel, 0) / domainResponses.length
          : 0;

        return {
          domainId: domain.id,
          domainName: domain.name,
          totalQuestions,
          answeredQuestions,
          progressPercent: totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0,
          averageLevel: parseFloat(avgLevel.toFixed(2)),
          assignedTo: assignment ? { name: assignment.assignedToName, email: assignment.assignedToEmail, status: assignment.status } : null,
          evidenceCount: domainEvidences.length,
          responses: domainResponses.map(r => ({
            questionId: r.questionId,
            questionText: r.questionText,
            selectedLevel: r.selectedLevel,
            notes: r.notes,
            respondedAt: r.respondedAt,
          })),
        };
      });

      // Métricas gerais
      const totalQuestions = getTotalQuestions();
      const totalAnswered = responses.length;
      const overallProgress = totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0;
      const overallAverage = responses.length > 0
        ? parseFloat((responses.reduce((sum, r) => sum + r.selectedLevel, 0) / responses.length).toFixed(2))
        : 0;

      // Dados para matriz de risco 5x5
      // Calcular risco por domínio: probabilidade = (5 - avgLevel) normalizado 1-5, impacto = peso do domínio 1-5
      const riskMatrixData = domainProgress
        .filter(d => d.averageLevel > 0)
        .map(d => {
          // Quanto menor o nível de maturidade, maior a probabilidade de risco (escala 1-5)
          // avgLevel 5 → prob 1 (otimizado = baixa probabilidade)
          // avgLevel 1 → prob 5 (inexistente = altíssima probabilidade)
          const probability = Math.max(1, Math.min(5, Math.round(6 - d.averageLevel)));

          // Impacto baseado na criticidade do domínio (escala 1-5)
          // Domínios críticos (governança, segurança, terceiros) têm base mais alta
          const criticalDomains = ['IA-01', 'IA-04', 'IA-05'];
          const highDomains = ['IA-02', 'IA-03', 'IA-06'];
          const impactBase = criticalDomains.includes(d.domainId) ? 4.0
            : highDomains.includes(d.domainId) ? 3.0
            : 2.0;
          // Ajuste fino pelo nível de maturidade
          const impact = Math.max(1, Math.min(5, Math.round(impactBase + (5 - d.averageLevel) * 0.2)));

          const score = probability * impact;

          return {
            domainId: d.domainId,
            domainName: d.domainName,
            probability,
            impact,
            severity: score,
            averageLevel: d.averageLevel,
            riskLevel: score >= 20 ? 'muito_critica' as const
              : score >= 15 ? 'critica' as const
              : score >= 10 ? 'alta' as const
              : score >= 5 ? 'media' as const
              : 'baixa' as const,
          };
        });

      return {
        assessment,
        domainProgress,
        overallProgress,
        overallAverage,
        totalQuestions,
        totalAnswered,
        totalEvidences: evidences.length,
        assignmentsCount: assignments.length,
        completedAssignments: assignments.filter(a => a.status === 'concluida').length,
        riskMatrixData,
      };
    }),

  /**
   * Reenviar convite por e-mail para um respondente específico
   */
  resendInvitation: protectedProcedure
    .input(z.object({
      assessmentId: z.number(),
      assignmentId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const isInternal = ['admin_global', 'consultor', 'sponsor'].includes(ctx.user.role);
      if (!isInternal) throw new TRPCError({ code: "FORBIDDEN" });

      const [assignment] = await db
        .select()
        .from(assessmentAssignments)
        .where(eq(assessmentAssignments.id, input.assignmentId));

      if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "Atribuição não encontrada" });

      const [assessment] = await db
        .select()
        .from(unifiedAssessments)
        .where(eq(unifiedAssessments.id, input.assessmentId));

      try {
        const { sendAssessmentEmail } = await import("./emailService");
        const baseUrl = getAppBaseUrl();

        await sendAssessmentEmail({
          to: assignment.assignedToEmail,
          recipientName: assignment.assignedToName,
          assessmentTitle: `Avaliação ${assessment?.assessmentCode || ''} - Domínio: ${assignment.domainName}`,
          assessmentUrl: `${baseUrl}/avaliacoes/${input.assessmentId}`,
          organizationName: "Organização",
          consultantName: ctx.user.name || ctx.user.email || "Seusdados",
          expiresAt: assessment?.deadline,
          assessmentType: 'conformidade',
        });

        return { success: true };
      } catch (err) {
        console.error('Erro ao reenviar convite:', err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao enviar e-mail" });
      }
    }),

  // ==================== ENDPOINTS EXISTENTES MANTIDOS ====================

  /**
   * Atribuir domínio individual (legado - mantido para compatibilidade)
   */
  assignDomain: protectedProcedure
    .input(
      z.object({
        assessmentId: z.number(),
        domainId: z.string(),
        domainName: z.string(),
        userId: z.number(),
        userName: z.string(),
        userEmail: z.string(),
        deadline: z.date(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const result = await db.insert(assessmentAssignments).values({
        assessmentId: input.assessmentId,
        domainId: input.domainId,
        domainName: input.domainName,
        assignedToUserId: input.userId,
        assignedToName: input.userName,
        assignedToEmail: input.userEmail,
        status: "pendente",
        deadline: input.deadline.toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).returning({ id: assessmentAssignments.id });

      return { id: result[0].id };
    }),

  /**
   * Minhas atribuições (todas as avaliações)
   */
  myAssignments: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    return db
      .select()
      .from(assessmentAssignments)
      .where(eq(assessmentAssignments.assignedToUserId, ctx.user.id));
  }),

  /**
   * Salvar resposta (legado - mantido para compatibilidade)
   */
  saveResponse: protectedProcedure
    .input(
      z.object({
        assessmentId: z.number(),
        assignmentId: z.number(),
        questionId: z.string(),
        questionText: z.string(),
        selectedLevel: z.number().min(1).max(5),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const result = await db.insert(assessmentResponses).values({
        assessmentId: input.assessmentId,
        assignmentId: input.assignmentId,
        questionId: input.questionId,
        questionText: input.questionText,
        selectedLevel: input.selectedLevel,
        respondedByUserId: ctx.user.id,
        respondedAt: new Date().toISOString(),
        notes: input.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).returning({ id: assessmentResponses.id });

      return { id: result[0].id };
    }),

  /**
   * Upload evidência
   */
  uploadEvidence: protectedProcedure
    .input(
      z.object({
        assessmentId: z.number(),
        responseId: z.number(),
        questionId: z.string(),
        type: z.enum(["pdf", "link", "file"]),
        fileName: z.string().optional(),
        fileUrl: z.string(),
        fileKey: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verificação de acesso: internos podem fazer upload em qualquer avaliação
      // Clientes só podem fazer upload em domínios que lhes foram atribuídos
      const isInternal = ['admin_global', 'consultor'].includes(ctx.user.role);
      if (!isInternal) {
        // Extrair o domainId do questionId (formato: IA-01.Q01)
        const domainId = input.questionId.match(/^(IA-\d{2})/)?.[1];
        if (domainId) {
          const [assignment] = await db
            .select({ id: assessmentAssignments.id })
            .from(assessmentAssignments)
            .where(
              and(
                eq(assessmentAssignments.assessmentId, input.assessmentId),
                eq(assessmentAssignments.domainId, domainId),
                eq(assessmentAssignments.assignedToUserId, ctx.user.id)
              )
            );
          if (!assignment) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para enviar evidências neste domínio.' });
          }
        }
      }

      const result = await db.insert(assessmentEvidences).values({
        assessmentId: input.assessmentId,
        responseId: input.responseId,
        questionId: input.questionId,
        type: input.type,
        fileName: input.fileName,
        fileUrl: input.fileUrl,
        fileKey: input.fileKey,
        description: input.description,
        uploadedByUserId: ctx.user.id,
        uploadedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }).returning({ id: assessmentEvidences.id });

      return { id: result[0].id };
    }),

  /**
   * Resumo de evidências de um domínio (quais perguntas têm/não têm evidência)
   * Usado para validar se o domínio pode ser concluído
   */
  getDomainEvidenceSummary: protectedProcedure
    .input(z.object({ assessmentId: z.number(), domainId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { evidencesByQuestion: {} as Record<string, number> };

      // Buscar todas as evidências do domínio (questionId começa com domainId)
      const evidences = await db
        .select()
        .from(assessmentEvidences)
        .where(
          and(
            eq(assessmentEvidences.assessmentId, input.assessmentId),
            like(assessmentEvidences.questionId, `${input.domainId}%`)
          )
        );

      // Agrupar por questionId: { 'IA-01-Q1': 2, 'IA-01-Q3': 1 }
      const evidencesByQuestion: Record<string, number> = {};
      evidences.forEach(ev => {
        evidencesByQuestion[ev.questionId] = (evidencesByQuestion[ev.questionId] || 0) + 1;
      });

      return { evidencesByQuestion };
    }),

  /**
   * Evidências de uma pergunta
   */
  getEvidences: protectedProcedure
    .input(z.object({ assessmentId: z.number(), questionId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(assessmentEvidences)
        .where(
          and(
            eq(assessmentEvidences.assessmentId, input.assessmentId),
            eq(assessmentEvidences.questionId, input.questionId)
          )
        );
    }),

  /**
   * Criar análise de risco
   */
  createRiskAnalysis: protectedProcedure
    .input(
      z.object({
        assessmentId: z.number(),
        domainId: z.string(),
        questionId: z.string(),
        riskLevel: z.enum(["baixa", "media", "alta", "critica"]),
        probability: z.number().min(1).max(5),
        impact: z.number().min(1).max(5),
        referencedNorms: z.array(
          z.object({ norm: z.string(), articles: z.array(z.string()) })
        ),
        mitigation: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const result = await db.insert(riskAnalysis).values({
        assessmentId: input.assessmentId,
        domainId: input.domainId,
        questionId: input.questionId,
        riskLevel: input.riskLevel,
        probability: input.probability,
        impact: input.impact,
        severity: input.probability * input.impact,
        referencedNorms: input.referencedNorms,
        mitigation: input.mitigation,
        editedByConsultant: 1,
        editedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).returning({ id: riskAnalysis.id });

      return { id: result[0].id };
    }),

  /**
   * Análises de risco
   */
  getRiskAnalyses: protectedProcedure
    .input(z.object({ assessmentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(riskAnalysis)
        .where(eq(riskAnalysis.assessmentId, input.assessmentId));
    }),

  /**
   * Criar plano de ação
   */
  createActionPlan: protectedProcedure
    .input(
      z.object({
        assessmentId: z.number(),
        domainId: z.string(),
        title: z.string(),
        description: z.string(),
        priority: z.enum(["baixa", "media", "alta", "critica"]),
        dueDate: z.date(),
        normsReferenced: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const result = await db.insert(assessmentActionPlan).values({
        assessmentId: input.assessmentId,
        domainId: input.domainId,
        title: input.title,
        description: input.description,
        priority: input.priority,
        status: "pendente",
        dueDate: input.dueDate.toISOString(),
        normsReferenced: input.normsReferenced,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).returning({ id: assessmentActionPlan.id });

      return { id: result[0].id };
    }),

  /**
   * Planos de ação
   */
  getActionPlans: protectedProcedure
    .input(z.object({ assessmentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(assessmentActionPlan)
        .where(eq(assessmentActionPlan.assessmentId, input.assessmentId));
    }),

  /**
   * Obter resultados
   */
  getResults: protectedProcedure
    .input(z.object({ assessmentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const result = await db
        .select()
        .from(assessmentResults)
        .where(eq(assessmentResults.assessmentId, input.assessmentId));

      return result[0] || null;
    }),

  /**
   * Calcular média de maturidade por domínio
   */
  getDomainMaturityAverages: protectedProcedure
    .input(z.object({ organizationId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { domains: [], overallAverage: 0, totalResponses: 0 };

      try {
        const orgId = input?.organizationId || ctx.user.organizationId;

        const DOMAINS = SEUSDADOS_FRAMEWORK.map(d => ({ id: d.id, name: d.name }));

        const completedAssessments = await db
          .select({ id: unifiedAssessments.id })
          .from(unifiedAssessments)
          .where(
            and(
              eq(unifiedAssessments.status, 'concluida'),
              orgId ? eq(unifiedAssessments.organizationId, orgId) : sql`1=1`
            )
          );

        if (completedAssessments.length === 0) {
          return {
            domains: DOMAINS.map(d => ({ id: d.id, name: d.name, average: 0, responseCount: 0 })),
            overallAverage: 0,
            totalResponses: 0,
          };
        }

        const assessmentIds = completedAssessments.map(a => a.id);

        const responses = await db
          .select({
            questionId: assessmentResponses.questionId,
            selectedLevel: assessmentResponses.selectedLevel,
          })
          .from(assessmentResponses)
          .where(
            sql`${assessmentResponses.assessmentId} IN (${sql.join(assessmentIds.map(id => sql`${id}`), sql`, `)})`
          );

        const domainResponses: Record<string, number[]> = {};
        DOMAINS.forEach(d => { domainResponses[d.id] = []; });

        responses.forEach(r => {
          const domainMatch = r.questionId.match(/^(IA-\d{2})/);
          if (domainMatch && domainResponses[domainMatch[1]]) {
            domainResponses[domainMatch[1]].push(r.selectedLevel);
          }
        });

        const domainsWithAverages = DOMAINS.map(d => {
          const levels = domainResponses[d.id];
          const average = levels.length > 0
            ? parseFloat((levels.reduce((a, b) => a + b, 0) / levels.length).toFixed(2))
            : 0;
          return { id: d.id, name: d.name, average, responseCount: levels.length };
        });

        const allAverages = domainsWithAverages.filter(d => d.average > 0).map(d => d.average);
        const overallAverage = allAverages.length > 0
          ? parseFloat((allAverages.reduce((a, b) => a + b, 0) / allAverages.length).toFixed(2))
          : 0;

        return { domains: domainsWithAverages, overallAverage, totalResponses: responses.length };
      } catch (error) {
        console.error('Erro ao calcular média de maturidade:', error);
        return { domains: [], overallAverage: 0, totalResponses: 0 };
      }
    }),

  /**
   * Upload de arquivo de evidência para S3
   */
  uploadEvidenceFile: protectedProcedure
    .input(
      z.object({
        assessmentId: z.number(),
        questionId: z.string(),
        fileName: z.string(),
        fileBase64: z.string(),
        contentType: z.string().default('application/octet-stream'),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { storagePut } = await import('./storage');

      try {
        const fileBuffer = Buffer.from(input.fileBase64, 'base64');
        // Validar tamanho (50MB)
        if (fileBuffer.length > 50 * 1024 * 1024) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Arquivo excede o tamanho máximo de 50MB' });
        }

        // Buscar a avaliação para obter organizationId
        const db = await getDb();
        const [assessment] = await db!.select({
          id: unifiedAssessments.id,
          organizationId: unifiedAssessments.organizationId,
          assessmentCode: unifiedAssessments.assessmentCode,
        })
          .from(unifiedAssessments)
          .where(eq(unifiedAssessments.id, input.assessmentId))
          .limit(1);

        const organizationId = assessment?.organizationId || ctx.user.organizationId || 0;
        const assessmentCode = assessment?.assessmentCode || null;

        // Criar ou obter pasta GED com estrutura correta:
        // Evidências → Evidências - Avaliações de Conformidade → AC#CODIGO_REAL → Evidências da Avaliação
        const gedService = await import('./gedService');
        const evidenceFolder = await gedService.getOrCreateEvidenceFolderForAssessment(
          ctx.user.id,
          organizationId,
          input.assessmentId,
          'avaliacao',
          assessmentCode
        );

        const timestamp = Date.now();
        const sanitizedFileName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileKey = `ged/org-${organizationId}/evidencias-avaliacao/${evidenceFolder.name}/${timestamp}_${sanitizedFileName}`;

        const { url, key } = await storagePut(fileKey, fileBuffer, input.contentType);

        // Salvar como documento no GED da organização
        try {
          const gedUserRole = (ctx.user.role || 'sponsor') as gedService.UserRole;
          await gedService.uploadDocument(
            { id: ctx.user.id, role: gedUserRole, organizationId },
            {
              name: input.fileName,
              description: input.description || `Evidência da pergunta ${input.questionId} - Avaliação ${assessmentCode || input.assessmentId}`,
              folderId: evidenceFolder.id,
              file: fileBuffer,
              fileName: input.fileName,
              mimeType: input.contentType,
              tags: ['evidência', 'avaliação'],
              linkedEntityType: 'assessment',
              linkedEntityId: input.assessmentId,
            }
          );
        } catch (gedError) {
          // Não bloquear o upload se o GED falhar - o arquivo já está no S3
          console.error('[uploadEvidenceFile] Erro ao salvar no GED (não crítico):', gedError);
        }

        return { success: true, fileUrl: url, fileKey: key, fileName: input.fileName };
      } catch (error) {
        console.error('[uploadEvidenceFile] Erro no upload:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao fazer upload do arquivo' });
      }
    }),

  /**
   * Obter alertas de prazo para dashboard
   */
  getDeadlineAlerts: protectedProcedure
    .query(async () => {
      const { getDeadlineAlertsSummary } = await import('./services/assessmentDeadlineNotifications');
      return getDeadlineAlertsSummary();
    }),

  /**
   * Processar notificações de prazo manualmente
   */
  processDeadlineNotifications: protectedProcedure
    .mutation(async () => {
      const { processDeadlineNotifications } = await import('./services/assessmentDeadlineNotifications');
      return processDeadlineNotifications();
    }),

  /**
   * Estatísticas gerais
   */
  getStats: protectedProcedure
    .input(z.object({ organizationId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { total: 0, pendentes_atribuicao: 0, em_andamento: 0, concluidas: 0, arquivadas: 0 };

      try {
        const orgId = input?.organizationId || ctx.user.organizationId;

        const assessments = await db
          .select({ status: unifiedAssessments.status })
          .from(unifiedAssessments)
          .where(orgId ? eq(unifiedAssessments.organizationId, orgId) : sql`1=1`);

        return {
          total: assessments.length,
          pendentes_atribuicao: assessments.filter(a => a.status === 'pendente_atribuicao' || a.status === 'programada').length,
          em_andamento: assessments.filter(a => a.status === 'em_andamento' || a.status === 'iniciada').length,
          concluidas: assessments.filter(a => a.status === 'concluida').length,
          arquivadas: assessments.filter(a => a.status === 'arquivada').length,
        };
      } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        return { total: 0, pendentes_atribuicao: 0, em_andamento: 0, concluidas: 0, arquivadas: 0 };
      }
    }),

  /**
   * Enviar convites (legado)
   */
  sendInvitations: protectedProcedure
    .input(z.object({
      assessmentId: z.number(),
      respondentIds: z.array(z.number()),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      try {
        const { rows: assessmentRows } = await db.execute(
          sql`SELECT * FROM ua_assessments WHERE id = ${input.assessmentId}`
        ) as any;
        const assessment = assessmentRows[0];

        if (!assessment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Avaliação não encontrada" });
        }

        const idList = input.respondentIds.join(",");
        const { rows: respondentRows } = await db.execute(
          sql`SELECT id, name, email FROM users WHERE id IN (${idList})`
        ) as any;

        const { sendAssessmentEmailLegacy } = await import("./emailService");
        const baseUrl = getAppBaseUrl();

        const emailPromises = respondentRows.map((respondent: any) => {
          const assessmentLink = `${baseUrl}/avaliacoes/${input.assessmentId}`;
          return sendAssessmentEmailLegacy({
            thirdPartyName: respondent.name,
            thirdPartyEmail: respondent.email,
            organizationName: assessment.organizationName || "Organizacao",
            assessmentLink,
            expiresAt: assessment.deadline,
            senderName: ctx.user.name || ctx.user.email || "Seusdados",
          });
        });

        await Promise.all(emailPromises);

        return { success: true, sent: respondentRows.length };
      } catch (error) {
        console.error("Erro ao enviar convites:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Falha ao enviar convites"
        });
      }
    }),

  /**
   * Gerar plano de ação automático baseado nas respostas de maturidade
   */
  generateAssessmentActionPlan: protectedProcedure
    .input(z.object({ assessmentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verificação de role: apenas internos (admin_global, consultor) e sponsor podem gerar plano
      const canGenerate = ['admin_global', 'consultor', 'sponsor'].includes(ctx.user.role);
      if (!canGenerate) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas a equipe interna ou o Sponsor podem gerar o Plano de Ação.' });
      }

      // Buscar avaliação
      const [assessment] = await db.select().from(unifiedAssessments).where(eq(unifiedAssessments.id, input.assessmentId));
      if (!assessment) throw new TRPCError({ code: "NOT_FOUND" });

      // Isolamento multi-tenant: clientes só podem gerar plano para avaliações da própria organização
      const isInternal = ['admin_global', 'consultor'].includes(ctx.user.role);
      if (!isInternal && ctx.user.organizationId && assessment.organizationId !== ctx.user.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para gerar o plano de ação desta avaliação.' });
      }

      // Validação 1: A avaliação precisa estar concluída
      if (assessment.status !== 'concluida') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'O Plano de Ação só pode ser gerado após a conclusão completa da avaliação. Finalize todos os domínios antes de continuar.'
        });
      }

      // Validação 2: Proteção contra duplicatas — verificar se já existe plano gerado para esta avaliação
      const { actionPlans: apTableCheck } = await import('../drizzle/schema');
      const existingActions = await db
        .select({ id: apTableCheck.id })
        .from(apTableCheck)
        .where(eq(apTableCheck.assessmentId, input.assessmentId))
        .limit(1);

      if (existingActions.length > 0) {
        return {
          success: false,
          count: 0,
          message: 'O Plano de Ação já foi gerado para esta avaliação. Não é possível gerar um novo plano para a mesma avaliação.'
        };
      }

      // Buscar respostas
      const responses = await db
        .select()
        .from(assessmentResponses)
        .where(eq(assessmentResponses.assessmentId, input.assessmentId));

      if (responses.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhuma resposta encontrada para gerar plano de ação" });
      }

      // Importar framework e helpers
      const { SEUSDADOS_FRAMEWORK: fw } = await import("../shared/frameworkSeusdados");
      const dbHelpers = await import("./db");

      // Mapeamento de domínio para responsável sugerido
      const DOMAIN_RESPONSIBLE: Record<string, string> = {
        'IA-01': 'DPO / Alta Direção',
        'IA-02': 'DPO / Área de TI',
        'IA-03': 'DPO / Jurídico',
        'IA-04': 'DPO / Áreas de Negócio',
        'IA-05': 'TI / Segurança da Informação',
        'IA-06': 'DPO / TI / Jurídico',
        'IA-07': 'Compras / Jurídico / DPO',
        'IA-08': 'RH / DPO',
        'IA-09': 'TI / Desenvolvimento / DPO',
      };

      // Coletar todas as perguntas com gap em lista plana (1 ação por pergunta)
      const { QUESTION_OPTIONS: qOptsManual } = await import('../shared/frameworkSeusdados');
      const allGapQuestionsManual: Array<{
        questionId: string;
        questionText: string;
        level: number;
        severity: string;
        domainId: string;
        domainName: string;
        answerText?: string;
      }> = [];

      for (const resp of responses) {
        if (resp.selectedLevel < 5) {
          const domain = fw.find(d => resp.questionId.startsWith(d.id));
          const domainId = domain?.id || resp.questionId.split('-').slice(0, 2).join('-');
          const domainName = domain?.name || domainId;
          const severity =
            resp.selectedLevel <= 1 ? 'critica' :
            resp.selectedLevel === 2 ? 'alta' :
            resp.selectedLevel === 3 ? 'media' : 'baixa';
          const answerText = qOptsManual[resp.questionId]?.find(o => o.level === resp.selectedLevel)?.text;

          allGapQuestionsManual.push({
            questionId: resp.questionId,
            questionText: resp.questionText,
            level: resp.selectedLevel,
            severity,
            domainId,
            domainName,
            answerText,
          });
        }
      }

      if (allGapQuestionsManual.length === 0) {
        return { success: true, count: 0, message: "Nenhum gap identificado - todos os controles estão com nível adequado" };
      }

      // Gerar 1 ação por PERGUNTA com gap usando LLM para conteúdo específico
      const createdActions: number[] = [];

      // Buscar nome da organização para o prompt do LLM
      const { organizations: orgsTable } = await import('../drizzle/schema');
      const [org] = await db!.select({ name: orgsTable.name })
        .from(orgsTable)
        .where(eq(orgsTable.id, assessment.organizationId))
        .limit(1);
      const organizationName = org?.name || 'Organização';

      const aiService = await import('./aiService');

      for (const questionGap of allGapQuestionsManual) {
        const priority: 'critica' | 'alta' | 'media' | 'baixa' =
          questionGap.level <= 1 ? 'critica' :
          questionGap.level === 2 ? 'alta' :
          questionGap.level === 3 ? 'media' : 'baixa';

        const estimatedDays =
          priority === 'critica' ? 30 :
          priority === 'alta' ? 60 :
          priority === 'media' ? 90 : 120;

        const responsible = DOMAIN_RESPONSIBLE[questionGap.domainId] || 'DPO';
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + estimatedDays);

        // Gerar conteúdo executável via LLM específico para esta pergunta
        const actionContent = await aiService.generateActionItemForQuestion(
          questionGap.questionId,
          questionGap.questionText,
          questionGap.domainName,
          questionGap.domainId,
          organizationName,
          questionGap.level,
          priority
        );

        // Montar descrição estruturada com os campos do LLM
        const description =
          actionContent.description +
          `\n\nRecursos necessários: ${actionContent.resources}` +
          `\n\nCritério de sucesso: ${actionContent.successCriteria}`;

        const notes = actionContent.notes
          ? `Responsável sugerido: ${responsible}. Domínio: ${questionGap.domainName}. ${actionContent.notes}`
          : `Responsável sugerido: ${responsible}. Domínio: ${questionGap.domainName}. Controle ID: ${questionGap.questionId}.`;

        const id = await dbHelpers.createActionPlan({
          organizationId: assessment.organizationId,
          assessmentType: 'compliance',
          assessmentId: input.assessmentId,
          title: actionContent.title,
          description,
          priority,
          status: 'pendente',
          dueDate: dueDate.toISOString(),
          notes,
          sourceQuestionKey: questionGap.questionId,
          sourceQuestionText: questionGap.questionText,
          sourceDomainName: questionGap.domainName,
          sourceSelectedLevel: questionGap.level,
          sourceSelectedAnswer: questionGap.answerText || null,
        });
        createdActions.push(id);
      }

      return {
        success: true,
        count: createdActions.length,
        actionIds: createdActions,
      };
    }),

  /**
   * Refinar ação individual do plano com IA
   */
  refineAssessmentAction: protectedProcedure
    .input(z.object({
      actionId: z.number(),
      instruction: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const dbHelpers = await import("./db");
      const aiService = await import("./aiService");

      // Buscar ação existente
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { actionPlans: apTable } = await import("../drizzle/schema");
      const [action] = await db.select().from(apTable).where(eq(apTable.id, input.actionId));
      if (!action) throw new TRPCError({ code: "NOT_FOUND", message: "Ação não encontrada" });

      const previousContent = `Título: ${action.title}\nDescrição: ${action.description}\nPrioridade: ${action.priority}\nNotas: ${action.notes || ''}`;

      const response = await aiService.refineActionPlan(
        previousContent,
        input.instruction,
        { module: 'action_plans', entityType: 'compliance_assessment', entityId: action.assessmentId }
      );

      // Extrair título e descrição refinados
      const lines = response.content.split('\n').filter(l => l.trim());
      const newTitle = lines[0]?.replace(/^[#*]+\s*/, '').replace(/^título[:\s]*/i, '').trim() || action.title;
      const newDescription = lines.slice(1).join('\n').trim() || response.content;

      await dbHelpers.updateActionPlan(input.actionId, {
        title: newTitle.substring(0, 255),
        description: newDescription,
      } as any);

      return {
        success: true,
        refinedTitle: newTitle.substring(0, 255),
        refinedDescription: newDescription,
        tokensUsed: response.tokensUsed,
      };
    }),

  /**
   * Excluir uma ação individual do Plano de Ação
   * Apenas Admin Global e Consultor podem excluir
   */
  deleteActionPlanItem: protectedProcedure
    .input(z.object({ actionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Apenas admin_global e consultor podem excluir ações
      const allowedRoles = ['admin_global', 'consultor', 'admin'];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas Administradores e Consultores podem excluir ações do plano.',
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      const { actionPlans: apTable } = await import('../drizzle/schema');

      // Verificar se a ação existe
      const [action] = await db
        .select({ id: apTable.id, organizationId: apTable.organizationId })
        .from(apTable)
        .where(eq(apTable.id, input.actionId));

      if (!action) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada.' });
      }

      // Isolamento multi-tenant: consultor não pode excluir ações de outras organizações
      // admin_global pode excluir qualquer ação
      if (ctx.user.role !== 'admin_global' && action.organizationId !== null) {
        // Para consultor: verificar se a ação pertence a uma organização que ele gerencia
        // Por ora, consultores só podem excluir ações de avaliações que criaram ou gerenciam
        // (sem restrição adicional além da role check já feita acima)
      }

      // Excluir a ação
      await db.delete(apTable).where(eq(apTable.id, input.actionId));

      return { success: true, deletedId: input.actionId };
    }),

  /**
   * Verificar se todos os domínios de uma avaliação têm responsáveis atribuídos
   * Usado para redirecionar Sponsor para tela de atribuição quando necessário
   */
  checkAllDomainsAssigned: protectedProcedure
    .input(z.object({ assessmentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { allAssigned: false, totalDomains: SEUSDADOS_FRAMEWORK.length, assignedCount: 0, unassignedDomainIds: SEUSDADOS_FRAMEWORK.map(d => d.id) };

      const assignments = await db
        .select({ domainId: assessmentAssignments.domainId })
        .from(assessmentAssignments)
        .where(eq(assessmentAssignments.assessmentId, input.assessmentId));

      const assignedDomainIds = new Set(assignments.map(a => a.domainId));
      const unassignedDomainIds = SEUSDADOS_FRAMEWORK
        .filter(d => !assignedDomainIds.has(d.id))
        .map(d => d.id);

      return {
        allAssigned: unassignedDomainIds.length === 0,
        totalDomains: SEUSDADOS_FRAMEWORK.length,
        assignedCount: assignedDomainIds.size,
        unassignedDomainIds,
      };
    }),

  /**
   * Buscar todas as evidências de uma avaliação (para exibição na aba Respostas)
   */
  getAllEvidencesByAssessment: protectedProcedure
    .input(z.object({ assessmentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      // Verificar permissão básica
      const isInternal = ['admin_global', 'consultor', 'sponsor'].includes(ctx.user.role);
      const isComite = ctx.user.role === 'comite';
      if (!isInternal && !isComite) {
        const [assessment] = await db
          .select({ organizationId: unifiedAssessments.organizationId })
          .from(unifiedAssessments)
          .where(eq(unifiedAssessments.id, input.assessmentId));
        if (!assessment || assessment.organizationId !== ctx.user.organizationId) return [];
      }
      return db
        .select()
        .from(assessmentEvidences)
        .where(eq(assessmentEvidences.assessmentId, input.assessmentId));
    }),

  // ==================== PAINEL DE VALIDAÇÃO DO CONSULTOR ====================

  /**
   * Responsável envia ação para validação do consultor
   */
  submitForValidation: protectedProcedure
    .input(z.object({
      actionId: z.number(),
      observations: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });

      const [action] = await db
        .select()
        .from(assessmentActionPlan)
        .where(eq(assessmentActionPlan.id, input.actionId));

      if (!action) throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });

      // Apenas o responsável pela ação ou perfis internos podem enviar para validação
      const isInternal = ['admin_global', 'consultor'].includes(ctx.user.role);
      const isResponsible = action.responsibleUserId === ctx.user.id;
      if (!isInternal && !isResponsible) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas o responsável pela ação pode enviá-la para validação' });
      }

      const allowedStatuses = ['em_andamento', 'ajustes_solicitados', 'pendente'];
      if (!allowedStatuses.includes(action.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Ação com status "${action.status}" não pode ser enviada para validação` });
      }

      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db
        .update(assessmentActionPlan)
        .set({
          status: 'aguardando_validacao' as any,
          submittedForValidationAt: now,
          observations: input.observations || action.observations,
          validationRejectionReason: null,
          updatedAt: now,
        })
        .where(eq(assessmentActionPlan.id, input.actionId));

      // Notificação de validação desativada conforme solicitação (reduzir ruído para equipe interna)

      return { success: true };
    }),

  /**
   * Consultor assume a validação de uma ação
   */
  assumeValidation: protectedProcedure
    .input(z.object({ actionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });

      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas consultores podem assumir validações' });
      }

      const [action] = await db
        .select()
        .from(assessmentActionPlan)
        .where(eq(assessmentActionPlan.id, input.actionId));

      if (!action) throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
      if (!['aguardando_validacao', 'aguardando_nova_validacao'].includes(action.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta ação não está aguardando validação' });
      }

      await db
        .update(assessmentActionPlan)
        .set({
          status: 'em_validacao' as any,
          validatorId: ctx.user.id,
          validatorName: ctx.user.name || ctx.user.email || 'Consultor',
          updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        })
        .where(eq(assessmentActionPlan.id, input.actionId));

      return { success: true };
    }),

  /**
   * Consultor aprova a ação
   */
  approveValidation: protectedProcedure
    .input(z.object({
      actionId: z.number(),
      validationNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });

      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas consultores podem aprovar validações' });
      }

      const [action] = await db
        .select()
        .from(assessmentActionPlan)
        .where(eq(assessmentActionPlan.id, input.actionId));

      if (!action) throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
      if (!['em_validacao', 'aguardando_validacao', 'aguardando_nova_validacao'].includes(action.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta ação não está em processo de validação' });
      }

      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db
        .update(assessmentActionPlan)
        .set({
          status: 'concluida' as any,
          validatorId: ctx.user.id,
          validatorName: ctx.user.name || ctx.user.email || 'Consultor',
          validatedAt: now,
          validationNotes: input.validationNotes || null,
          validationRejectionReason: null,
          updatedAt: now,
        })
        .where(eq(assessmentActionPlan.id, input.actionId));

      // Notificar responsável
      try {
        if (action.responsibleUserId) {
          const { sendGenericEmail } = await import('./emailService');
          const { rows: responsibleRows } = await db.execute(
            sql`SELECT name, email FROM users WHERE id = ${action.responsibleUserId}`
          ) as any;
          const responsible = responsibleRows?.[0];
          if (responsible?.email) {
            const baseUrl = getAppBaseUrl();
            await sendGenericEmail({
              to: responsible.email,
              subject: `Ação aprovada: ${action.title || 'Ação do Plano'}`,
              html: `<p>Olá, ${responsible.name || 'Responsável'},</p><p>Sua ação foi <strong>aprovada</strong> pelo consultor <strong>${ctx.user.name || ctx.user.email}</strong>.</p>${input.validationNotes ? `<p><strong>Observações:</strong> ${input.validationNotes}</p>` : ''}<p><a href="${baseUrl}/plano-acao/maturidade?assessmentId=${action.assessmentId}">Acesse o Plano de Ação</a></p><br><p>Seusdados Consultoria em Gestão de Dados Limitada</p>`,
            }).catch(err => console.error('Erro ao notificar:', err));
          }
        }
      } catch (err) {
        console.error('Erro ao enviar notificação de aprovação:', err);
      }

      return { success: true };
    }),

  /**
   * Consultor recusa a ação e solicita ajustes
   */
  rejectValidation: protectedProcedure
    .input(z.object({
      actionId: z.number(),
      rejectionReason: z.string().min(10, 'Informe o motivo da recusa (mínimo 10 caracteres)'),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });

      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas consultores podem recusar validações' });
      }

      const [action] = await db
        .select()
        .from(assessmentActionPlan)
        .where(eq(assessmentActionPlan.id, input.actionId));

      if (!action) throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
      if (!['em_validacao', 'aguardando_validacao', 'aguardando_nova_validacao'].includes(action.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta ação não está em processo de validação' });
      }

      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db
        .update(assessmentActionPlan)
        .set({
          status: 'ajustes_solicitados' as any,
          validatorId: ctx.user.id,
          validatorName: ctx.user.name || ctx.user.email || 'Consultor',
          validationRejectionReason: input.rejectionReason,
          validatedAt: null,
          updatedAt: now,
        })
        .where(eq(assessmentActionPlan.id, input.actionId));

      // Notificar responsável
      try {
        if (action.responsibleUserId) {
          const { sendGenericEmail } = await import('./emailService');
          const { rows: responsibleRows } = await db.execute(
            sql`SELECT name, email FROM users WHERE id = ${action.responsibleUserId}`
          ) as any;
          const responsible = responsibleRows?.[0];
          if (responsible?.email) {
            const baseUrl = getAppBaseUrl();
            await sendGenericEmail({
              to: responsible.email,
              subject: `Ajustes solicitados: ${action.title || 'Ação do Plano'}`,
              html: `<p>Olá, ${responsible.name || 'Responsável'},</p><p>O consultor <strong>${ctx.user.name || ctx.user.email}</strong> solicitou ajustes na sua ação.</p><p><strong>Motivo:</strong> ${input.rejectionReason}</p><p>Por favor, realize os ajustes e reenvie para validação.</p><p><a href="${baseUrl}/plano-acao/maturidade?assessmentId=${action.assessmentId}">Acesse o Plano de Ação</a></p><br><p>Seusdados Consultoria em Gestão de Dados Limitada</p>`,
            }).catch(err => console.error('Erro ao notificar:', err));
          }
        }
      } catch (err) {
        console.error('Erro ao enviar notificação de recusa:', err);
      }

      return { success: true };
    }),

  /**
   * Buscar fila de validação para o painel do consultor
   */
  getValidationQueue: protectedProcedure
    .input(z.object({
      statusFilter: z.enum(['aguardando_validacao', 'aguardando_nova_validacao', 'em_validacao', 'ajustes_solicitados', 'concluida', 'all']).optional().default('all'),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a consultores' });
      }

      const validationStatuses = ['aguardando_validacao', 'aguardando_nova_validacao', 'em_validacao', 'ajustes_solicitados', 'concluida'];
      const whereStatus = input.statusFilter === 'all'
        ? inArray(assessmentActionPlan.status, validationStatuses as any)
        : eq(assessmentActionPlan.status, input.statusFilter as any);

      const actions = await db
        .select()
        .from(assessmentActionPlan)
        .where(whereStatus)
        .orderBy(assessmentActionPlan.submittedForValidationAt);

      const assessmentIds = [...new Set(actions.map(a => a.assessmentId))];
      let assessmentMap: Record<number, any> = {};
      if (assessmentIds.length > 0) {
        const { organizations: orgsTable } = await import('../drizzle/schema');
        const assessments = await db
          .select({
            id: unifiedAssessments.id,
            assessmentCode: unifiedAssessments.assessmentCode,
            organizationName: orgsTable.tradeName,
          })
          .from(unifiedAssessments)
          .leftJoin(orgsTable, eq(unifiedAssessments.organizationId, orgsTable.id))
          .where(inArray(unifiedAssessments.id, assessmentIds));
        assessmentMap = Object.fromEntries(assessments.map(a => [a.id, a]));
      }

      return actions.map(a => ({
        ...a,
        assessmentCode: assessmentMap[a.assessmentId]?.assessmentCode || `#${a.assessmentId}`,
        organizationName: assessmentMap[a.assessmentId]?.organizationName || 'Organização',
      }));
    }),

  /**
   * Painel Global da Equipe Interna
   * Retorna todas as ações de todas as organizações com filtros avançados
   */
  getGlobalActionQueue: protectedProcedure
    .input(z.object({
      statusFilter: z.string().optional().default('all'),
      priorityFilter: z.string().optional().default('all'),
      organizationId: z.number().optional(),
      search: z.string().optional(),
      page: z.number().optional().default(1),
      pageSize: z.number().optional().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito à Equipe Interna' });
      }
      // Buscar ações da tabela action_plans (dados reais de todos os módulos)
      const { rows: rows } = await db.execute(sql`
        SELECT 
          ap.id,
          ap."assessmentId",
          ap."assessmentType",
          ap.title,
          ap.description,
          ap.priority,
          ap.status,
          ap."dueDate",
          ap."responsibleId" as responsibleUserId,
          COALESCE(ap."responsibleName", u.name) as responsibleName,
          ap."organizationId",
          ap."createdAt",
          ap."updatedAt",
          ap."validatorId",
          ap."validatorName",
          ap."submittedForValidationAt",
          ap."validationRejectionReason",
          ap.observations,
          org."tradeName" as organizationName,
          COALESCE(ua."assessmentCode", CONCAT('AC#', ap."assessmentId")) as assessmentCode
        FROM action_plans ap
        LEFT JOIN organizations org ON ap."organizationId" = org.id
        LEFT JOIN users u ON ap."responsibleId" = u.id
        LEFT JOIN ua_assessments ua ON ap."assessmentId" = ua.id
        ORDER BY ap."updatedAt" DESC
      `) as any;
      let allActions: any[] = Array.isArray(rows) ? rows : [];
      let filtered = allActions;
      if (input.statusFilter !== 'all') {
        filtered = filtered.filter((a: any) => a.status === input.statusFilter);
      }
      if (input.priorityFilter !== 'all') {
        filtered = filtered.filter((a: any) => a.priority === input.priorityFilter);
      }
      if (input.organizationId) {
        filtered = filtered.filter((a: any) => a.organizationId === input.organizationId);
      }
      if (input.search && input.search.trim()) {
        const q = input.search.toLowerCase();
        filtered = filtered.filter((a: any) =>
          a.title?.toLowerCase().includes(q) ||
          a.assessmentCode?.toLowerCase().includes(q) ||
          a.organizationName?.toLowerCase().includes(q) ||
          a.responsibleName?.toLowerCase().includes(q) ||
          a.validatorName?.toLowerCase().includes(q) ||
          String(a.id).includes(q)
        );
      }
      const total = filtered.length;
      const offset = (input.page - 1) * input.pageSize;
      const items = filtered.slice(offset, offset + input.pageSize);
      return { items, total };
    }),

  /**
   * Estatísticas globais para o painel da Equipe Interna
   */
  getGlobalActionStats: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { pendente: 0, em_andamento: 0, aguardando_validacao: 0, aguardando_nova_validacao: 0, em_validacao: 0, ajustes_solicitados: 0, concluida: 0, total: 0, vencidas: 0 };
      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito à Equipe Interna' });
      }
      const { rows: rows } = await db.execute(sql`SELECT status, "dueDate" FROM action_plans`) as any;
      const allActions: any[] = Array.isArray(rows) ? rows : [];
      const now = new Date();
      const stats: Record<string, number> = {
        pendente: 0, em_andamento: 0, aguardando_validacao: 0, aguardando_nova_validacao: 0, em_validacao: 0,
        ajustes_solicitados: 0, concluida: 0, concluida_cliente: 0, cancelada: 0,
        total: allActions.length, vencidas: 0,
      };
      for (const a of allActions) {
        if (a.status in stats) stats[a.status]++;
        if (a.dueDate && new Date(a.dueDate) < now && !['concluida','concluida_cliente','cancelada'].includes(a.status)) {
          stats.vencidas++;
        }
      }
      return stats;
    }),

  /**
   * Listar organizações com ações (para filtro do painel global)
   */
  getOrganizationsWithActions: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito à Equipe Interna' });
      }
      const { rows: rows } = await db.execute(sql`
        SELECT DISTINCT org.id, org."tradeName" as name
        FROM action_plans ap
        INNER JOIN organizations org ON ap."organizationId" = org.id
        ORDER BY org."tradeName"
      `) as any;
      return Array.isArray(rows) ? rows : [];
    }),

  /**
   * Enviar ação do plano (action_plans) para validação
   * Usado pelo responsável da ação
   */
  submitActionForValidation: protectedProcedure
    .input(z.object({
      actionId: z.number(),
      observations: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
      const { rows: rows } = await db.execute(sql`
        SELECT ap.*, u.name as responsibleUserName, u.email as responsibleEmail,
               org."tradeName" as organizationName
        FROM action_plans ap
        LEFT JOIN users u ON ap."responsibleId" = u.id
        LEFT JOIN organizations org ON ap."organizationId" = org.id
        WHERE ap.id = ${input.actionId}
      `) as any;
      const action = Array.isArray(rows) ? rows[0] : null;
      if (!action) throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
      const isInternal = ['admin_global', 'consultor'].includes(ctx.user.role);
      const isResponsible = action.responsibleId === ctx.user.id;
      if (!isInternal && !isResponsible) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas o responsável pela ação pode enviá-la para validação' });
      }
      const allowedStatuses = ['em_andamento', 'ajustes_solicitados', 'pendente'];
      if (!allowedStatuses.includes(action.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Ação com status "${action.status}" não pode ser enviada para validação` });
      }
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      // Se a ação já passou por uma validação anterior (ajustes solicitados), usa status diferente
      const newStatus = action.status === 'ajustes_solicitados' ? 'aguardando_nova_validacao' : 'aguardando_validacao';
      // Preservar o validatorId existente no reenvio (para que o consultor original possa decidir diretamente)
      if (newStatus === 'aguardando_nova_validacao' && action.validatorId) {
        await db.execute(sql`
          UPDATE action_plans SET
            status = ${newStatus},
            "submittedForValidationAt" = ${now},
            observations = COALESCE(${input.observations || null}, observations),
            "validationRejectionReason" = NULL,
            "updatedAt" = ${now}
          WHERE id = ${input.actionId}
        `);
      } else {
        await db.execute(sql`
          UPDATE action_plans SET
            status = ${newStatus},
            "submittedForValidationAt" = ${now},
            observations = COALESCE(${input.observations || null}, observations),
            "validationRejectionReason" = NULL,
            "updatedAt" = ${now}
          WHERE id = ${input.actionId}
        `);
      }
      // Registrar no histórico
      await db.execute(sql`
        INSERT INTO action_plan_history ("actionPlanId", "changedById", "changeType", "previousValue", "newValue", notes, "createdAt")
        VALUES (${input.actionId}, ${ctx.user.id}, 'envio_validacao', ${action.status}, ${newStatus}, ${input.observations || (newStatus === 'aguardando_nova_validacao' ? 'Ação reenviada para validação após ajustes' : 'Ação enviada para validação')}, ${now})
      `);
      // Notificação de validação desativada conforme solicitação (reduzir ruído para equipe interna)
      return { success: true };
    }),

  /**
   * Consultor assume a validação de uma ação (action_plans)
   */
  assumeActionValidation: protectedProcedure
    .input(z.object({ actionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas consultores podem assumir validações' });
      }
      const { rows: rows } = await db.execute(sql`SELECT * FROM action_plans WHERE id = ${input.actionId}`) as any;
      const action = Array.isArray(rows) ? rows[0] : null;
      if (!action) throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
      if (!['aguardando_validacao', 'aguardando_nova_validacao'].includes(action.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta ação não está aguardando validação' });
      }
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const validatorName = ctx.user.name || ctx.user.email || 'Consultor';
      await db.execute(sql`
        UPDATE action_plans SET
          status = 'em_validacao',
          "validatorId" = ${ctx.user.id},
          "validatorName" = ${validatorName},
          "updatedAt" = ${now}
        WHERE id = ${input.actionId}
      `);
      await db.execute(sql`
        INSERT INTO action_plan_history ("actionPlanId", "changedById", "changeType", "previousValue", "newValue", notes, "createdAt")
        VALUES (${input.actionId}, ${ctx.user.id}, 'status', 'aguardando_validacao', 'em_validacao', ${`Consultor ${validatorName} assumiu a validação`}, ${now})
      `);
      return { success: true };
    }),

  /**
   * Consultor aprova a ação (action_plans)
   */
  approveActionValidation: protectedProcedure
    .input(z.object({
      actionId: z.number(),
      validationNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas consultores podem aprovar validações' });
      }
      const { rows: rows } = await db.execute(sql`
        SELECT ap.*, u.name as responsibleUserName, u.email as responsibleEmail
        FROM action_plans ap LEFT JOIN users u ON ap."responsibleId" = u.id
        WHERE ap.id = ${input.actionId}
      `) as any;
      const action = Array.isArray(rows) ? rows[0] : null;
      if (!action) throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
      if (!['em_validacao', 'aguardando_validacao', 'aguardando_nova_validacao'].includes(action.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta ação não está em processo de validação' });
      }
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const validatorName = ctx.user.name || ctx.user.email || 'Consultor';
      await db.execute(sql`
        UPDATE action_plans SET
          status = 'concluida',
          "validatorId" = ${ctx.user.id},
          "validatorName" = ${validatorName},
          "validatedAt" = ${now},
          "validationNotes" = ${input.validationNotes || null},
          "validationRejectionReason" = NULL,
          "updatedAt" = ${now}
        WHERE id = ${input.actionId}
      `);
      await db.execute(sql`
        INSERT INTO action_plan_history ("actionPlanId", "changedById", "changeType", "previousValue", "newValue", notes, "createdAt")
        VALUES (${input.actionId}, ${ctx.user.id}, 'validacao_aprovada', ${action.status}, 'concluida', ${input.validationNotes || `Ação aprovada pelo consultor ${validatorName}`}, ${now})
      `);
      // Notificar responsável
      try {
        if (action.responsibleEmail) {
          const { sendGenericEmail } = await import('./emailService');
          const baseUrl = getAppBaseUrl();
          await sendGenericEmail({
            to: action.responsibleEmail,
            subject: `Ação aprovada: ${action.title}`,
            html: `<p>Olá, ${action.responsibleUserName || 'Responsável'},</p><p>Sua ação foi <strong>aprovada</strong> pelo consultor <strong>${validatorName}</strong>.</p>${input.validationNotes ? `<p><strong>Observações:</strong> ${input.validationNotes}</p>` : ''}<p><a href="${baseUrl}/dashboard">Acesse o Plano de Ação</a></p><br><p>Seusdados Consultoria em Gestão de Dados Limitada</p>`,
          }).catch(() => {});
        }
      } catch (_) {}
      return { success: true };
    }),

  /**
   * Consultor recusa a ação e solicita ajustes (action_plans)
   */
  rejectActionValidation: protectedProcedure
    .input(z.object({
      actionId: z.number(),
      rejectionReason: z.string().min(10, 'Informe o motivo da recusa (mínimo 10 caracteres)'),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas consultores podem recusar validações' });
      }
      const { rows: rows } = await db.execute(sql`
        SELECT ap.*, u.name as responsibleUserName, u.email as responsibleEmail
        FROM action_plans ap LEFT JOIN users u ON ap."responsibleId" = u.id
        WHERE ap.id = ${input.actionId}
      `) as any;
      const action = Array.isArray(rows) ? rows[0] : null;
      if (!action) throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
      if (!['em_validacao', 'aguardando_validacao', 'aguardando_nova_validacao'].includes(action.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta ação não está em processo de validação' });
      }
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const validatorName = ctx.user.name || ctx.user.email || 'Consultor';
      await db.execute(sql`
        UPDATE action_plans SET
          status = 'ajustes_solicitados',
          "validatorId" = ${ctx.user.id},
          "validatorName" = ${validatorName},
          "validationRejectionReason" = ${input.rejectionReason},
          "validatedAt" = NULL,
          "updatedAt" = ${now}
        WHERE id = ${input.actionId}
      `);
      await db.execute(sql`
        INSERT INTO action_plan_history ("actionPlanId", "changedById", "changeType", "previousValue", "newValue", notes, "createdAt")
        VALUES (${input.actionId}, ${ctx.user.id}, 'validacao_recusada', ${action.status}, 'ajustes_solicitados', ${input.rejectionReason}, ${now})
      `);
      // Notificar responsável
      try {
        if (action.responsibleEmail) {
          const { sendGenericEmail } = await import('./emailService');
          const baseUrl = getAppBaseUrl();
          await sendGenericEmail({
            to: action.responsibleEmail,
            subject: `Ajustes solicitados: ${action.title}`,
            html: `<p>Olá, ${action.responsibleUserName || 'Responsável'},</p><p>O consultor <strong>${validatorName}</strong> solicitou ajustes na sua ação.</p><p><strong>Motivo:</strong> ${input.rejectionReason}</p><p>Por favor, realize os ajustes e reenvie para validação.</p><p><a href="${baseUrl}/dashboard">Acesse o Plano de Ação</a></p><br><p>Seusdados Consultoria em Gestão de Dados Limitada</p>`,
          }).catch(() => {});
        }
      } catch (_) {}
      return { success: true };
    }),

  /**
   * Buscar detalhes completos de uma ação (action_plans) para o consultor
   */
  getActionDetails: protectedProcedure
    .input(z.object({ actionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito à Equipe Interna' });
      }
      const { rows: rows } = await db.execute(sql`
        SELECT ap.*,
               u.name as responsibleUserName, u.email as responsibleEmail,
               org."tradeName" as organizationName,
               COALESCE(ua."assessmentCode", CONCAT('AC#', ap."assessmentId")) as assessmentCode
        FROM action_plans ap
        LEFT JOIN users u ON ap."responsibleId" = u.id
        LEFT JOIN organizations org ON ap."organizationId" = org.id
        LEFT JOIN ua_assessments ua ON ap."assessmentId" = ua.id
        WHERE ap.id = ${input.actionId}
      `) as any;
      const action = Array.isArray(rows) ? rows[0] : null;
      if (!action) return null;
      // Buscar evidências (JOIN com ged_documents e documents)
      const { rows: evidRows } = await db.execute(sql`
        SELECT 
          e.id, e."actionPlanId", e."documentId", e.description, e."addedById", e."createdAt",
          COALESCE(gd.name, d.name) as "documentName",
          COALESCE(gd."fileUrl", d."fileUrl") as "fileUrl",
          COALESCE(gd."mimeType", d."mimeType") as "mimeType",
          COALESCE(gd."fileSize", d."fileSize") as "fileSize",
          COALESCE(gd."fileName", gd.name, d.name) as "fileName",
          u2.name as "addedByName"
        FROM action_plan_evidence e
        LEFT JOIN ged_documents gd ON e."documentId" = gd.id
        LEFT JOIN documents d ON e."documentId" = d.id
        LEFT JOIN users u2 ON e."addedById" = u2.id
        WHERE e."actionPlanId" = ${input.actionId}
        ORDER BY e."createdAt" DESC
      `) as any;
      // Buscar histórico
      const { rows: histRows } = await db.execute(sql`
         SELECT h.*, u.name as "changedByName"
        FROM action_plan_history h
        LEFT JOIN users u ON h."changedById" = u.id
        WHERE h."actionPlanId" = ${input.actionId}
        ORDER BY h."createdAt" ASC
      `) as any;
      return {
        ...action,
        evidences: Array.isArray(evidRows) ? evidRows : [],
        history: Array.isArray(histRows) ? histRows : [],
      };
    }),
  /**
   * Transferir validação para outro consultor
   */
  transferActionValidation: protectedProcedure
    .input(z.object({
      actionId: z.number(),
      newValidatorId: z.number(),
      transferReason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas consultores podem transferir validações' });
      }
      // Buscar a ação
      const { rows: rows } = await db.execute(sql`
        SELECT ap.*, u.name as responsibleUserName, u.email as responsibleEmail
        FROM action_plans ap LEFT JOIN users u ON ap."responsibleId" = u.id
        WHERE ap.id = ${input.actionId}
      `) as any;
      const action = Array.isArray(rows) ? rows[0] : null;
      if (!action) throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
      if (!['em_validacao', 'aguardando_validacao', 'aguardando_nova_validacao'].includes(action.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta ação não está em processo de validação' });
      }
      // Buscar o novo consultor
      const { rows: newValidatorRows } = await db.execute(sql`
        SELECT id, name, email FROM users WHERE id = ${input.newValidatorId} AND role IN ('consultor', 'admin_global')
      `) as any;
      const newValidator = Array.isArray(newValidatorRows) ? newValidatorRows[0] : null;
      if (!newValidator) throw new TRPCError({ code: 'NOT_FOUND', message: 'Consultor não encontrado' });
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const previousValidatorName = action.validatorName || ctx.user.name || 'Consultor anterior';
      const transferredByName = ctx.user.name || ctx.user.email || 'Consultor';
      // Atualizar o validador da ação (sem alterar o status)
      await db.execute(sql`
        UPDATE action_plans SET
          "validatorId" = ${newValidator.id},
          "validatorName" = ${newValidator.name},
          "updatedAt" = ${now}
        WHERE id = ${input.actionId}
      `);
      // Registrar no histórico
      const historyNote = `Validação transferida de ${previousValidatorName} para ${newValidator.name}. Transferido por: ${transferredByName}${input.transferReason ? `. Motivo: ${input.transferReason}` : ''}`;
      await db.execute(sql`
        INSERT INTO action_plan_history ("actionPlanId", "changedById", "changeType", "previousValue", "newValue", notes, "createdAt")
        VALUES (${input.actionId}, ${ctx.user.id}, 'transferencia_validacao', ${previousValidatorName}, ${newValidator.name}, ${historyNote}, ${now})
      `);
      // Notificar o novo consultor por e-mail
      try {
        if (newValidator.email) {
          const { sendGenericEmail } = await import('./emailService');
          const baseUrl = getAppBaseUrl();
          await sendGenericEmail({
            to: newValidator.email,
            subject: `Validação transferida para você: ${action.title}`,
            html: `<p>Olá, ${newValidator.name},</p><p>A validação da ação <strong>${action.title}</strong> foi transferida para você por <strong>${transferredByName}</strong>.</p>${input.transferReason ? `<p><strong>Motivo:</strong> ${input.transferReason}</p>` : ''}<p>Por favor, acesse o sistema para analisar e tomar uma decisão.</p><p><a href="${baseUrl}/plano-acao/validacao/${input.actionId}">Acessar validação</a></p><br><p>Seusdados Consultoria em Gestão de Dados Limitada</p>`,
          }).catch(() => {});
        }
      } catch (_) {}
      return { success: true, newValidatorName: newValidator.name };
    }),

  // ==================== OVERRIDES DE SEGURANÇA E CONSISTÊNCIA ====================
  deleteActionPlanItem: protectedProcedure
    .input(z.object({ actionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const allowedRoles = ['admin_global', 'consultor'];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas Administradores Globais e Consultores podem excluir ações do plano.',
        });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const { actionPlans: apTable, actionPlanEvidence: apeTable, actionPlanHistory: aphTable } = await import('../drizzle/schema');
      const [action] = await db
        .select({ id: apTable.id, organizationId: apTable.organizationId })
        .from(apTable)
        .where(eq(apTable.id, input.actionId));
      if (!action) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada.' });
      }
      await db.delete(apeTable).where(eq(apeTable.actionPlanId, input.actionId));
      await db.delete(aphTable).where(eq(aphTable.actionPlanId, input.actionId));
      await db.delete(apTable).where(eq(apTable.id, input.actionId));
      return { success: true, deletedId: input.actionId };
    }),

  submitActionForValidation: protectedProcedure
    .input(z.object({
      actionId: z.number(),
      observations: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
      const action = await getActionPlanById(input.actionId);
      if (!action) throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
      assertResponsibleOrInternal(ctx.user as any, action);
      if (!action.responsibleId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Defina um responsável antes de enviar a ação para validação.' });
      }
      if (!ACTION_PLAN_SUBMIT_ALLOWED_STATUSES.includes(action.status as any)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Ação com status "${action.status}" não pode ser enviada para validação` });
      }
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const newStatus = action.status === 'ajustes_solicitados' ? 'aguardando_nova_validacao' : 'aguardando_validacao';
      await db.execute(sql`
        UPDATE action_plans SET
          status = ${newStatus},
          "submittedForValidationAt" = ${now},
          observations = COALESCE(${input.observations || null}, observations),
          "validationRejectionReason" = NULL,
          "updatedAt" = ${now}
        WHERE id = ${input.actionId}
      `);
      await db.execute(sql`
        INSERT INTO action_plan_history ("actionPlanId", "changedById", "changeType", "previousValue", "newValue", notes, "createdAt")
        VALUES (${input.actionId}, ${ctx.user.id}, 'envio_validacao', ${action.status}, ${newStatus}, ${input.observations || (newStatus === 'aguardando_nova_validacao' ? 'Ação reenviada para validação após ajustes' : 'Ação enviada para validação')}, ${now})
      `);
      // Notificação de validação desativada conforme solicitação (reduzir ruído para equipe interna)
      return { success: true };
    }),

  assumeActionValidation: protectedProcedure
    .input(z.object({ actionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas consultores podem assumir validações' });
      }
      const action = await getActionPlanById(input.actionId);
      if (!action) throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
      if (!ACTION_PLAN_VALIDATION_AWAITING_STATUSES.includes(action.status as any)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta ação não está aguardando validação' });
      }
      if (action.validatorId && action.validatorId !== ctx.user.id && ctx.user.role !== 'admin_global') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Esta ação já está vinculada a outro consultor. Use a transferência de validação.' });
      }
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const validatorName = ctx.user.name || ctx.user.email || 'Consultor';
      await db.execute(sql`
        UPDATE action_plans SET
          status = 'em_validacao',
          "validatorId" = ${ctx.user.id},
          "validatorName" = ${validatorName},
          "updatedAt" = ${now}
        WHERE id = ${input.actionId}
      `);
      await db.execute(sql`
        INSERT INTO action_plan_history ("actionPlanId", "changedById", "changeType", "previousValue", "newValue", notes, "createdAt")
        VALUES (${input.actionId}, ${ctx.user.id}, 'status', ${action.status}, 'em_validacao', ${`Consultor ${validatorName} assumiu a validação`}, ${now})
      `);
      return { success: true };
    }),

  approveActionValidation: protectedProcedure
    .input(z.object({
      actionId: z.number(),
      validationNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas consultores podem aprovar validações' });
      }
      const action = await getActionPlanById(input.actionId);
      if (!action) throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
      if (!ACTION_PLAN_VALIDATION_OPEN_STATUSES.includes(action.status as any)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta ação não está em processo de validação' });
      }
      if (action.validatorId && action.validatorId !== ctx.user.id && ctx.user.role !== 'admin_global') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Somente o consultor responsável por esta validação pode aprová-la.' });
      }
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const validatorName = ctx.user.name || ctx.user.email || 'Consultor';
      await db.execute(sql`
        UPDATE action_plans SET
          status = 'concluida',
          "validatorId" = ${ctx.user.id},
          "validatorName" = ${validatorName},
          "validatedAt" = ${now},
          "validationNotes" = ${input.validationNotes || null},
          "validationRejectionReason" = NULL,
          "updatedAt" = ${now}
        WHERE id = ${input.actionId}
      `);
      await db.execute(sql`
        INSERT INTO action_plan_history ("actionPlanId", "changedById", "changeType", "previousValue", "newValue", notes, "createdAt")
        VALUES (${input.actionId}, ${ctx.user.id}, 'validacao_aprovada', ${action.status}, 'concluida', ${input.validationNotes || `Ação aprovada pelo consultor ${validatorName}`}, ${now})
      `);
      try {
        if (action.responsibleEmail) {
          const { sendGenericEmail } = await import('./emailService');
          const baseUrl = getAppBaseUrl();
          await sendGenericEmail({
            to: action.responsibleEmail,
            subject: `Ação aprovada: ${action.title}`,
            html: `<p>Olá, ${action.responsibleUserName || 'Responsável'},</p><p>Sua ação foi <strong>aprovada</strong> pelo consultor <strong>${validatorName}</strong>.</p>${input.validationNotes ? `<p><strong>Observações:</strong> ${input.validationNotes}</p>` : ''}<p><a href="${baseUrl}/dashboard">Acesse o Plano de Ação</a></p><br><p>Seusdados Consultoria em Gestão de Dados Limitada</p>`,
          }).catch(() => {});
        }
      } catch (_) {}
      return { success: true };
    }),

  rejectActionValidation: protectedProcedure
    .input(z.object({
      actionId: z.number(),
      rejectionReason: z.string().min(10, 'Informe o motivo da recusa (mínimo 10 caracteres)'),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas consultores podem recusar validações' });
      }
      const action = await getActionPlanById(input.actionId);
      if (!action) throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
      if (!ACTION_PLAN_VALIDATION_OPEN_STATUSES.includes(action.status as any)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta ação não está em processo de validação' });
      }
      if (action.validatorId && action.validatorId !== ctx.user.id && ctx.user.role !== 'admin_global') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Somente o consultor responsável por esta validação pode solicitar ajustes.' });
      }
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const validatorName = ctx.user.name || ctx.user.email || 'Consultor';
      await db.execute(sql`
        UPDATE action_plans SET
          status = 'ajustes_solicitados',
          "validatorId" = ${ctx.user.id},
          "validatorName" = ${validatorName},
          "validationRejectionReason" = ${input.rejectionReason},
          "validatedAt" = NULL,
          "updatedAt" = ${now}
        WHERE id = ${input.actionId}
      `);
      await db.execute(sql`
        INSERT INTO action_plan_history ("actionPlanId", "changedById", "changeType", "previousValue", "newValue", notes, "createdAt")
        VALUES (${input.actionId}, ${ctx.user.id}, 'validacao_recusada', ${action.status}, 'ajustes_solicitados', ${input.rejectionReason}, ${now})
      `);
      try {
        if (action.responsibleEmail) {
          const { sendGenericEmail } = await import('./emailService');
          const baseUrl = getAppBaseUrl();
          await sendGenericEmail({
            to: action.responsibleEmail,
            subject: `Ajustes solicitados: ${action.title}`,
            html: `<p>Olá, ${action.responsibleUserName || 'Responsável'},</p><p>O consultor <strong>${validatorName}</strong> solicitou ajustes na sua ação.</p><p><strong>Motivo:</strong> ${input.rejectionReason}</p><p>Por favor, realize os ajustes e reenvie para validação.</p><p><a href="${baseUrl}/dashboard">Acesse o Plano de Ação</a></p><br><p>Seusdados Consultoria em Gestão de Dados Limitada</p>`,
          }).catch(() => {});
        }
      } catch (_) {}
      return { success: true };
    }),

  getActionDetails: protectedProcedure
    .input(z.object({ actionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito à Equipe Interna' });
      }
      const action = await getActionPlanById(input.actionId);
      if (!action) return null;
      const { rows: evidRows } = await db.execute(sql`
        SELECT 
          e.id, e."actionPlanId", e."documentId", e.description, e."addedById", e."createdAt",
          COALESCE(gd.name, d.name) as "documentName",
          COALESCE(gd."fileUrl", d."fileUrl") as "fileUrl",
          COALESCE(gd."mimeType", d."mimeType") as "mimeType",
          COALESCE(gd."fileSize", d."fileSize") as "fileSize",
          COALESCE(gd."fileName", gd.name, d.name) as "fileName",
          u2.name as "addedByName"
        FROM action_plan_evidence e
        LEFT JOIN ged_documents gd ON e."documentId" = gd.id
        LEFT JOIN documents d ON e."documentId" = d.id
        LEFT JOIN users u2 ON e."addedById" = u2.id
        WHERE e."actionPlanId" = ${input.actionId}
        ORDER BY e."createdAt" DESC
      `) as any;
      const { rows: histRows } = await db.execute(sql`
        SELECT h.*, u.name as "changedByName"
        FROM action_plan_history h
        LEFT JOIN users u ON h."changedById" = u.id
        WHERE h."actionPlanId" = ${input.actionId}
        ORDER BY h."createdAt" ASC
      `) as any;
      return {
        ...action,
        evidences: Array.isArray(evidRows) ? evidRows : [],
        history: Array.isArray(histRows) ? histRows : [],
      };
    }),

  transferActionValidation: protectedProcedure
    .input(z.object({
      actionId: z.number(),
      newValidatorId: z.number(),
      transferReason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas consultores podem transferir validações' });
      }
      const action = await getActionPlanById(input.actionId);
      if (!action) throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
      if (!ACTION_PLAN_VALIDATION_OPEN_STATUSES.includes(action.status as any)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta ação não está em processo de validação' });
      }
      if (action.validatorId && action.validatorId !== ctx.user.id && ctx.user.role !== 'admin_global') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Somente o consultor responsável por esta validação pode transferi-la.' });
      }
      const { rows: newValidatorRows } = await db.execute(sql`
        SELECT id, name, email FROM users WHERE id = ${input.newValidatorId} AND role IN ('consultor', 'admin_global')
      `) as any;
      const newValidator = Array.isArray(newValidatorRows) ? newValidatorRows[0] : null;
      if (!newValidator) throw new TRPCError({ code: 'NOT_FOUND', message: 'Consultor não encontrado' });
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const previousValidatorName = action.validatorName || ctx.user.name || 'Consultor anterior';
      const transferredByName = ctx.user.name || ctx.user.email || 'Consultor';
      await db.execute(sql`
        UPDATE action_plans SET
          "validatorId" = ${newValidator.id},
          "validatorName" = ${newValidator.name},
          "updatedAt" = ${now}
        WHERE id = ${input.actionId}
      `);
      const historyNote = `Validação transferida de ${previousValidatorName} para ${newValidator.name}. Transferido por: ${transferredByName}${input.transferReason ? `. Motivo: ${input.transferReason}` : ''}`;
      await db.execute(sql`
        INSERT INTO action_plan_history ("actionPlanId", "changedById", "changeType", "previousValue", "newValue", notes, "createdAt")
        VALUES (${input.actionId}, ${ctx.user.id}, 'transferencia_validacao', ${previousValidatorName}, ${newValidator.name}, ${historyNote}, ${now})
      `);
      try {
        if (newValidator.email) {
          const { sendGenericEmail } = await import('./emailService');
          const baseUrl = getAppBaseUrl();
          await sendGenericEmail({
            to: newValidator.email,
            subject: `Validação transferida para você: ${action.title}`,
            html: `<p>Olá, ${newValidator.name},</p><p>A validação da ação <strong>${action.title}</strong> foi transferida para você por <strong>${transferredByName}</strong>.</p>${input.transferReason ? `<p><strong>Motivo:</strong> ${input.transferReason}</p>` : ''}<p>Por favor, acesse o sistema para analisar e tomar uma decisão.</p><p><a href="${baseUrl}/plano-acao/validacao/${input.actionId}">Acessar validação</a></p><br><p>Seusdados Consultoria em Gestão de Dados Limitada</p>`,
          }).catch(() => {});
        }
      } catch (_) {}
      return { success: true, newValidatorName: newValidator.name };
    }),

  /**
   * Listar consultores disponíveis para transferência de validação
   */
  listConsultors: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const { rows: rows } = await db.execute(sql`
        SELECT id, name, email FROM users
        WHERE role IN ('consultor', 'admin_global')
        ORDER BY name ASC
      `) as any;
      return Array.isArray(rows) ? rows : [];
    }),

  /**
   * Atualizar status de ações vencidas (cron-like)
   */
  markOverdueActions: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { updated: 0 };
      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      // Não alterar ações que já estão em validação ou concluídas
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const { rows: result } = await db.execute(sql`
        UPDATE action_plans SET
          status = 'cancelada',
          "updatedAt" = ${now}
        WHERE "dueDate" < NOW()
          AND status IN ('pendente', 'em_andamento')
          AND "dueDate" IS NOT NULL
      `) as any;
      return { updated: result?.rowCount || 0 };
    }),
});
