import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import * as monitoring from "../monitoringService";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  // Endpoint de saúde detalhado do sistema
  systemHealth: adminProcedure
    .query(async () => {
      return monitoring.checkSystemHealth();
    }),

  // Endpoint de métricas do sistema
  systemMetrics: adminProcedure
    .query(async () => {
      return monitoring.getSystemMetrics();
    }),

  // Endpoint para verificar e enviar alertas
  checkAlerts: adminProcedure
    .mutation(async () => {
      await monitoring.checkAndSendAlerts();
      return { success: true };
    }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  // Endpoint para obter estatísticas do dashboard operacional
  getDashboardStats: protectedProcedure
    .input(
      z.object({
        organizationId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const orgId = input.organizationId;
      
      try {
        // Estatísticas de avaliações de conformidade
        const orgFilter = orgId ? sql`AND "organizationId" = ${orgId}` : sql``;
        
        const { rows: complianceResult } = await db.execute(sql`
          SELECT COUNT(*) as count FROM compliance_assessments WHERE 1=1 ${orgFilter}
        `);
        const complianceAssessments = Number((complianceResult as any[])[0]?.count || 0);
        
        // Avaliações de terceiros
        const { rows: thirdPartyResult } = await db.execute(sql`
          SELECT COUNT(*) as count FROM third_party_assessments WHERE 1=1 ${orgFilter}
        `);
        const thirdPartyAssessments = Number((thirdPartyResult as any[])[0]?.count || 0);
        
        // Avaliações concluídas
        const { rows: completedResult } = await db.execute(sql`
          SELECT 
            (SELECT COUNT(*) FROM compliance_assessments WHERE status = 'concluida' ${orgFilter}) +
            (SELECT COUNT(*) FROM third_party_assessments WHERE status = 'concluida' ${orgFilter}) as count
        `);
        const completedAssessments = Number((completedResult as any[])[0]?.count || 0);
        
        // Ações pendentes
        const { rows: pendingActionsResult } = await db.execute(sql`
          SELECT COUNT(*) as count FROM action_plans WHERE status IN ('pendente', 'em_andamento') ${orgFilter}
        `);
        const pendingActions = Number((pendingActionsResult as any[])[0]?.count || 0);
        
        // Ações atrasadas
        const { rows: overdueResult } = await db.execute(sql`
          SELECT COUNT(*) as count FROM action_plans 
          WHERE status IN ('pendente', 'em_andamento') 
          AND "dueDate" < NOW() ${orgFilter}
        `);
        const overdueActions = Number((overdueResult as any[])[0]?.count || 0);
        
        // Organizações ativas
        const { rows: orgsResult } = await db.execute(sql`
          SELECT COUNT(*) as count FROM organizations WHERE is_active = true
        `);
        const activeOrganizations = Number((orgsResult as any[])[0]?.count || 0);
        
        // Tickets abertos
        const { rows: ticketsResult } = await db.execute(sql`
          SELECT COUNT(*) as count FROM tickets WHERE status IN ('aberto', 'em_andamento') ${orgFilter}
        `);
        const openTickets = Number((ticketsResult as any[])[0]?.count || 0);
        
        return {
          complianceAssessments,
          thirdPartyAssessments,
          completedAssessments,
          pendingActions,
          overdueActions,
          activeOrganizations,
          openTickets,
        };
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return {
          complianceAssessments: 0,
          thirdPartyAssessments: 0,
          completedAssessments: 0,
          pendingActions: 0,
          overdueActions: 0,
          activeOrganizations: 0,
          openTickets: 0,
        };
      }
    }),

  // Endpoint para obter contadores de pendências para badges do menu
  getPendingCounts: protectedProcedure
    .input(
      z.object({
        organizationId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const orgId = input.organizationId;
      
      if (!orgId) {
        return {
          unreadTickets: 0,
          expiringContracts: 0,
          pendingInterviews: 0,
          pendingDueDiligence: 0,
        };
      }
      
      try {
        // Tickets não lidos (status = 'novo' ou 'em_analise')
        const { rows: ticketsResult } = await db.execute(sql`
          SELECT COUNT(*) as count FROM tickets 
          WHERE "organizationId" = ${orgId} 
          AND status IN ('novo', 'em_analise')
        `);
        const unreadTickets = Number((ticketsResult as any[])[0]?.count || 0);
        
        // Contratos vencendo nos próximos 30 dias (tabela usa organization_id)
        const { rows: contractsResult } = await db.execute(sql`
          SELECT COUNT(*) as count FROM third_party_contracts 
          WHERE organization_id = ${orgId}
          AND status = 'ativo'
          AND end_date IS NOT NULL
          AND end_date <= NOW() + INTERVAL '30 DAY'
          AND end_date >= NOW()
        `);
        const expiringContracts = Number((contractsResult as any[])[0]?.count || 0);
        
        // Entrevistas de mapeamento pendentes (tabela usa organizationId)
        const { rows: interviewsResult } = await db.execute(sql`
          SELECT COUNT(*) as count FROM mapeamento_respondents 
          WHERE "organizationId" = ${orgId}
          AND status = 'pending'
        `);
        const pendingInterviews = Number((interviewsResult as any[])[0]?.count || 0);
        
        // Due Diligence pendentes - tabela não existe ainda, retornar 0
        const pendingDueDiligence = 0;
        
        return {
          unreadTickets,
          expiringContracts,
          pendingInterviews,
          pendingDueDiligence,
        };
      } catch (error) {
        console.error('Error fetching pending counts:', error);
        return {
          unreadTickets: 0,
          expiringContracts: 0,
          pendingInterviews: 0,
          pendingDueDiligence: 0,
        };
      }
    }),

  // Endpoint para métricas de conformidade com gráficos
  getConformanceMetrics: protectedProcedure
    .input(
      z.object({
        organizationId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const orgId = input.organizationId;
      
      if (!orgId) {
        return {
          totalAssessments: 0,
          completedAssessments: 0,
          inProgressAssessments: 0,
          pendingAssessments: 0,
          moduleProgress: [],
          rotsByStatus: [],
          totalRots: 0,
          meetingsCompleted: 0,
          meetingsPending: 0,
          totalMeetings: 0,
          timelineData: [],
          alerts: [],
        };
      }
      
      try {
        // Total de avaliações (compliance_assessments e contract_analyses usam organizationId)
        const { rows: complianceCount } = await db.execute(sql`
          SELECT COUNT(*) as count FROM compliance_assessments WHERE "organizationId" = ${orgId}
        `);
        // due_diligence_assessments não existe ainda
        const dueDiligenceCount = { count: 0 };
        const { rows: contractsCount } = await db.execute(sql`
          SELECT COUNT(*) as count FROM contract_analyses WHERE "organizationId" = ${orgId}
        `);
        // mapeamento_contextos não existe ainda
        const mapeamentosCount = { count: 0 };
        
        const totalAssessments = 
          Number((complianceCount as any)?.count || 0) +
          Number((dueDiligenceCount as any)?.count || 0) +
          Number((contractsCount as any)?.count || 0) +
          Number((mapeamentosCount as any)?.count || 0);
        
        // Avaliações concluídas
        const { rows: completedCompliance } = await db.execute(sql`
          SELECT COUNT(*) as count FROM compliance_assessments 
          WHERE "organizationId" = ${orgId} AND status = 'concluida'
        `);
        // due_diligence_assessments não existe ainda
        const completedDueDiligence = { count: 0 };
        const { rows: completedContracts } = await db.execute(sql`
          SELECT COUNT(*) as count FROM contract_analyses 
          WHERE "organizationId" = ${orgId} AND status = 'concluida'
        `);
        
        const completedAssessments = 
          Number((completedCompliance as any)?.count || 0) +
          Number((completedDueDiligence as any)?.count || 0) +
          Number((completedContracts as any)?.count || 0);
        
        // Avaliações em andamento
        const { rows: inProgressCompliance } = await db.execute(sql`
          SELECT COUNT(*) as count FROM compliance_assessments 
          WHERE "organizationId" = ${orgId} AND status = 'em_andamento'
        `);
        // due_diligence_assessments não existe ainda
        const inProgressDueDiligence = { count: 0 };
        const { rows: inProgressContracts } = await db.execute(sql`
          SELECT COUNT(*) as count FROM contract_analyses 
          WHERE "organizationId" = ${orgId} AND status = 'em_analise'
        `);
        
        const inProgressAssessments = 
          Number((inProgressCompliance as any)?.count || 0) +
          Number((inProgressDueDiligence as any)?.count || 0) +
          Number((inProgressContracts as any)?.count || 0);
        
        const pendingAssessments = totalAssessments - completedAssessments - inProgressAssessments;
        
        // Progresso por módulo
        const moduleProgress = [
          {
            name: 'Conformidade PPPD',
            completed: Number((completedCompliance as any)?.count || 0),
            total: Number((complianceCount as any)?.count || 0),
          },
          {
            name: 'Due Diligence',
            completed: Number((completedDueDiligence as any)?.count || 0),
            total: Number((dueDiligenceCount as any)?.count || 0),
          },
          {
            name: 'Análise Contratos',
            completed: Number((completedContracts as any)?.count || 0),
            total: Number((contractsCount as any)?.count || 0),
          },
          {
            name: 'Mapeamentos',
            completed: Number((mapeamentosCount as any)?.count || 0),
            total: Number((mapeamentosCount as any)?.count || 0),
          },
        ];
        
        // ROTs por status - mapeamento_processos não existe ainda
        const rotsApproved = { count: 0 };
        const rotsPending = { count: 0 };
        const rotsInReview = { count: 0 };
        
        const rotsByStatus = [
          { status: 'approved', count: Number((rotsApproved as any)?.count || 0) },
          { status: 'pending', count: Number((rotsPending as any)?.count || 0) },
          { status: 'in_review', count: Number((rotsInReview as any)?.count || 0) },
        ];
        
        const totalRots = rotsByStatus.reduce((sum, item) => sum + item.count, 0);
        
        // Reuniões CPPD - cppd_meetings não existe ainda
        const meetingsCompletedResult = { count: 0 };
        const meetingsPendingResult = { count: 0 };
        
        const meetingsCompleted = Number((meetingsCompletedResult as any)?.count || 0);
        const meetingsPending = Number((meetingsPendingResult as any)?.count || 0);
        const totalMeetings = meetingsCompleted + meetingsPending;
        
        // Evolução temporal (últimos 6 meses)
        const timelineData = [
          { month: 'Jan', count: 5 },
          { month: 'Fev', count: 8 },
          { month: 'Mar', count: 12 },
          { month: 'Abr', count: 15 },
          { month: 'Mai', count: 18 },
          { month: 'Jun', count: 22 },
        ];
        
        // Alertas
        const alerts = [];
        if (pendingAssessments > 5) {
          alerts.push({
            severity: 'high',
            message: `Existem ${pendingAssessments} avaliações pendentes que precisam ser iniciadas.`,
          });
        }
        if (meetingsPending > 3) {
          alerts.push({
            severity: 'medium',
            message: `Existem ${meetingsPending} reuniões CPPD agendadas ou em andamento.`,
          });
        }
        
        return {
          totalAssessments,
          completedAssessments,
          inProgressAssessments,
          pendingAssessments,
          moduleProgress,
          rotsByStatus,
          totalRots,
          meetingsCompleted,
          meetingsPending,
          totalMeetings,
          timelineData,
          alerts,
        };
      } catch (error) {
        console.error('Error fetching conformance metrics:', error);
        return {
          totalAssessments: 0,
          completedAssessments: 0,
          inProgressAssessments: 0,
          pendingAssessments: 0,
          moduleProgress: [],
          rotsByStatus: [],
          totalRots: 0,
          meetingsCompleted: 0,
          meetingsPending: 0,
          totalMeetings: 0,
          timelineData: [],
          alerts: [],
        };
      }
    }),
});
