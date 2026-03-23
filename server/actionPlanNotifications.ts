import * as db from './db';
import { notifyOwner } from './_core/notification';

interface ActionPlanItem {
  id: number;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  responsibleId: number | null;
  organizationId: number;
  actionCategory?: string | null;
}

// Interface estendida com dados para e-mail
interface ActionPlanItemWithEmail extends ActionPlanItem {
  daysUntilDue: number;
  responsibleEmail?: string;
  responsibleName?: string;
  organizationName?: string;
}

interface NotificationResult {
  actionId: number;
  title: string;
  daysUntilDue: number;
  notified: boolean;
  error?: string;
}

/**
 * Verifica ações com prazo próximo e envia notificações
 * @param daysThreshold - Número de dias antes do prazo para notificar (padrão: 7)
 */
export async function checkAndNotifyUpcomingDeadlines(daysThreshold: number = 7): Promise<{
  checked: number;
  notified: number;
  results: NotificationResult[];
}> {
  const results: NotificationResult[] = [];
  let notifiedCount = 0;

  try {
    // Buscar todas as organizações
    const organizations = await db.getAllOrganizations();
    
    for (const org of organizations) {
      // Buscar ações pendentes da organização
      const actions = await db.getActionPlansByOrganization(org.id) as ActionPlanItem[];
      
      const now = new Date();
      
      for (const action of actions) {
        // Ignorar ações sem prazo ou já concluídas/canceladas
        if (!action.dueDate || action.status === 'concluida' || action.status === 'cancelada') {
          continue;
        }
        
        const dueDate = new Date(action.dueDate);
        const diffTime = dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Verificar se está dentro do threshold (incluindo atrasadas)
        if (diffDays <= daysThreshold) {
          try {
            // Criar notificação no sistema
            const notificationData = {
              userId: action.responsibleId || 1, // Se não tiver responsável, notifica admin
              title: diffDays < 0 
                ? `⚠️ Ação ATRASADA: ${action.title}`
                : diffDays === 0
                  ? `🔔 Ação vence HOJE: ${action.title}`
                  : `📅 Ação vence em ${diffDays} dia(s): ${action.title}`,
              message: `A ação "${action.title}" ${
                diffDays < 0 
                  ? `está atrasada há ${Math.abs(diffDays)} dia(s)` 
                  : diffDays === 0
                    ? 'vence hoje'
                    : `vence em ${diffDays} dia(s)`
              }. Prioridade: ${action.priority}. ${
                action.actionCategory === 'operacional' 
                  ? 'Categoria: Operacional' 
                  : 'Categoria: Contratual'
              }`,
              type: (diffDays < 0 ? 'action_overdue' : 'action_due') as 'action_overdue' | 'action_due',
              link: `/plano-acao`,
            };
            
            await db.createNotification(notificationData);
            
            // Se for crítica ou atrasada, notificar também o owner
            if (action.priority === 'critica' || diffDays < 0) {
              await notifyOwner({
                title: notificationData.title,
                content: `${notificationData.message}\n\nOrganização: ${org.name}`,
              });
            }
            
            results.push({
              actionId: action.id,
              title: action.title,
              daysUntilDue: diffDays,
              notified: true,
            });
            notifiedCount++;
          } catch (error) {
            results.push({
              actionId: action.id,
              title: action.title,
              daysUntilDue: diffDays,
              notified: false,
              error: error instanceof Error ? error.message : 'Erro desconhecido',
            });
          }
        }
      }
    }
    
    return {
      checked: results.length,
      notified: notifiedCount,
      results,
    };
  } catch (error) {
    console.error('Erro ao verificar prazos de ações:', error);
    throw error;
  }
}

/**
 * Gera relatório de ações próximas do prazo com dados estendidos para e-mail
 */
export async function getUpcomingDeadlinesReport(organizationId?: number, daysThreshold: number = 7): Promise<{
  overdue: ActionPlanItemWithEmail[];
  dueToday: ActionPlanItemWithEmail[];
  dueSoon: ActionPlanItemWithEmail[];
  summary: {
    totalOverdue: number;
    totalDueToday: number;
    totalDueSoon: number;
    criticalCount: number;
  };
}> {
  const overdue: ActionPlanItemWithEmail[] = [];
  const dueToday: ActionPlanItemWithEmail[] = [];
  const dueSoon: ActionPlanItemWithEmail[] = [];
  let criticalCount = 0;
  
  const organizations = organizationId 
    ? [{ id: organizationId, name: '' }] 
    : await db.getAllOrganizations();
  
  // Criar mapa de organizações para nome
  const orgMap = new Map<number, string>();
  for (const org of organizations) {
    if ('name' in org) {
      orgMap.set(org.id, org.name as string);
    }
  }
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  for (const org of organizations) {
    const actions = await db.getActionPlansByOrganization(org.id) as ActionPlanItem[];
    
    for (const action of actions) {
      if (!action.dueDate || action.status === 'concluida' || action.status === 'cancelada') {
        continue;
      }
      
      const dueDate = new Date(action.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (action.priority === 'critica') {
        criticalCount++;
      }
      
      // Buscar dados do responsável se existir
      let responsibleEmail: string | undefined;
      let responsibleName: string | undefined;
      
      if (action.responsibleId) {
        const responsible = await db.getUserById(action.responsibleId);
        if (responsible) {
          responsibleEmail = responsible.email || undefined;
          responsibleName = responsible.name || undefined;
        }
      }
      
      const actionWithEmail: ActionPlanItemWithEmail = {
        ...action,
        daysUntilDue: diffDays,
        responsibleEmail,
        responsibleName,
        organizationName: orgMap.get(org.id) || 'N/A',
      };
      
      if (diffDays < 0) {
        overdue.push(actionWithEmail);
      } else if (diffDays === 0) {
        dueToday.push(actionWithEmail);
      } else if (diffDays <= daysThreshold) {
        dueSoon.push(actionWithEmail);
      }
    }
  }
  
  return {
    overdue,
    dueToday,
    dueSoon,
    summary: {
      totalOverdue: overdue.length,
      totalDueToday: dueToday.length,
      totalDueSoon: dueSoon.length,
      criticalCount,
    },
  };
}
