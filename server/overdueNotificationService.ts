import { getDb } from "./db";
import { cppdInitiatives, cppdInitiativeTasks, cppdOverdueNotifications } from "../drizzle/schema";
import { eq, and, lte, or, isNull, sql, desc } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

// Types
export type NotificationType = 'initiative_overdue' | 'task_overdue' | 'document_pending' | 'deadline_approaching';

export interface OverdueItem {
  id: number;
  type: 'initiative' | 'task';
  title: string;
  description?: string;
  plannedEndDate: string;
  daysOverdue: number;
  responsibleName?: string;
  responsibleEmail?: string;
  organizationId: number;
}

export interface NotificationResult {
  success: boolean;
  itemsNotified: number;
  errors: string[];
}

// Check for overdue initiatives
export async function getOverdueInitiatives(organizationId?: number): Promise<OverdueItem[]> {
  const db = await getDb();
  const today = new Date().toISOString().split('T')[0];
  
  const baseConditions: any[] = [
    lte(cppdInitiatives.plannedEndDate, today),
    or(
      eq(cppdInitiatives.status, 'planejado'),
      eq(cppdInitiatives.status, 'em_andamento')
    )
  ];
  if (organizationId) {
    baseConditions.push(eq(cppdInitiatives.organizationId, organizationId));
  }
  
  const results = await db
    .select({
      id: cppdInitiatives.id,
      title: cppdInitiatives.title,
      description: cppdInitiatives.description,
      plannedEndDate: cppdInitiatives.plannedEndDate,
      responsibleName: cppdInitiatives.responsibleName,
      responsibleEmail: cppdInitiatives.responsibleEmail,
      organizationId: cppdInitiatives.organizationId,
    })
    .from(cppdInitiatives)
    .where(and(...baseConditions));
  
  return results.map(item => {
    const endDate = new Date(item.plannedEndDate!);
    const todayDate = new Date(today);
    const daysOverdue = Math.floor((todayDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      id: item.id,
      type: 'initiative' as const,
      title: item.title,
      description: item.description || undefined,
      plannedEndDate: item.plannedEndDate!,
      daysOverdue,
      responsibleName: item.responsibleName || undefined,
      responsibleEmail: item.responsibleEmail || undefined,
      organizationId: item.organizationId,
    };
  });
}

// Check for overdue tasks
export async function getOverdueTasks(organizationId?: number): Promise<OverdueItem[]> {
  const db = await getDb();
  const today = new Date().toISOString().split('T')[0];
  
  const results = await db
    .select({
      id: cppdInitiativeTasks.id,
      title: cppdInitiativeTasks.title,
      description: cppdInitiativeTasks.description,
      dueDate: cppdInitiativeTasks.dueDate,
      responsibleName: cppdInitiativeTasks.assignedToName,
      initiativeId: cppdInitiativeTasks.initiativeId,
    })
    .from(cppdInitiativeTasks)
    .where(
      and(
        lte(cppdInitiativeTasks.dueDate, today),
        or(
          eq(cppdInitiativeTasks.status, 'pendente'),
          eq(cppdInitiativeTasks.status, 'em_andamento')
        )
      )
    );

  // Get organization IDs from initiatives
  const initiativeIds = Array.from(new Set(results.map(r => r.initiativeId)));
  const initiatives = await db
    .select({ id: cppdInitiatives.id, organizationId: cppdInitiatives.organizationId })
    .from(cppdInitiatives)
    .where(sql`${cppdInitiatives.id} IN (${initiativeIds.join(',')})`);
  
  const initiativeOrgMap = new Map(initiatives.map(i => [i.id, i.organizationId]));
  
  return results
    .filter(item => !organizationId || initiativeOrgMap.get(item.initiativeId) === organizationId)
    .map(item => {
      const endDate = new Date(item.dueDate!);
      const todayDate = new Date(today);
      const daysOverdue = Math.floor((todayDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        id: item.id,
        type: 'task' as const,
        title: item.title,
        description: item.description || undefined,
        plannedEndDate: item.dueDate!,
        daysOverdue,
        responsibleName: item.responsibleName || undefined,
        responsibleEmail: undefined,
        organizationId: initiativeOrgMap.get(item.initiativeId) || 0,
      };
    });
}

// Get all overdue items
export async function getAllOverdueItems(organizationId?: number): Promise<OverdueItem[]> {
  const [initiatives, tasks] = await Promise.all([
    getOverdueInitiatives(organizationId),
    getOverdueTasks(organizationId),
  ]);
  
  return [...initiatives, ...tasks].sort((a, b) => b.daysOverdue - a.daysOverdue);
}

// Send notification for overdue items
export async function sendOverdueNotifications(organizationId?: number): Promise<NotificationResult> {
  const overdueItems = await getAllOverdueItems(organizationId);
  const errors: string[] = [];
  let itemsNotified = 0;
  
  if (overdueItems.length === 0) {
    return { success: true, itemsNotified: 0, errors: [] };
  }
  
  // Group by organization
  const byOrg = new Map<number, OverdueItem[]>();
  overdueItems.forEach(item => {
    const items = byOrg.get(item.organizationId) || [];
    items.push(item);
    byOrg.set(item.organizationId, items);
  });
  
  // Send notifications per organization
  for (const [orgId, items] of Array.from(byOrg)) {
    try {
      const initiativeCount = items.filter(i => i.type === 'initiative').length;
      const taskCount = items.filter(i => i.type === 'task').length;
      
      const criticalItems = items.filter(i => i.daysOverdue > 30);
      const urgentItems = items.filter(i => i.daysOverdue > 7 && i.daysOverdue <= 30);
      
      const content = `
## Resumo de Itens Atrasados

**Total de itens atrasados:** ${items.length}
- Iniciativas: ${initiativeCount}
- Tarefas: ${taskCount}

### Itens Críticos (> 30 dias de atraso)
${criticalItems.length > 0 ? criticalItems.map(i => `- **${i.title}** - ${i.daysOverdue} dias de atraso`).join('\n') : 'Nenhum item crítico'}

### Itens Urgentes (7-30 dias de atraso)
${urgentItems.length > 0 ? urgentItems.map(i => `- **${i.title}** - ${i.daysOverdue} dias de atraso`).join('\n') : 'Nenhum item urgente'}

### Lista Completa
${items.map(i => `- [${i.type === 'initiative' ? 'Iniciativa' : 'Tarefa'}] **${i.title}** - ${i.daysOverdue} dias de atraso (Prazo: ${i.plannedEndDate})`).join('\n')}
      `.trim();
      
      await notifyOwner({
        title: `⚠️ Alerta: ${items.length} itens atrasados no Plano CPPD`,
        content,
      });
      
      // Record notification in database
      const db = await getDb();
      await db.insert(cppdOverdueNotifications).values({
        organizationId: orgId,
        itemType: 'initiative',
        itemId: items[0].id,
        itemTitle: `${items.length} itens atrasados`,
        dueDate: new Date().toISOString(),
        daysOverdue: Math.max(...items.map(i => i.daysOverdue)),
        notificationSentAt: new Date().toISOString(),
        notifiedEmail: 'owner',
        notificationStatus: 'sent',
      });
      
      itemsNotified += items.length;
    } catch (error) {
      errors.push(`Erro ao notificar organização ${orgId}: ${error}`);
    }
  }
  
  return {
    success: errors.length === 0,
    itemsNotified,
    errors,
  };
}

// Get notification history
export async function getNotificationHistory(organizationId: number, limit = 50) {
  const db = await getDb();
  
  return db
    .select()
    .from(cppdOverdueNotifications)
    .where(eq(cppdOverdueNotifications.organizationId, organizationId))
    .orderBy(desc(cppdOverdueNotifications.notificationSentAt))
    .limit(limit);
}

// Get items approaching deadline (within X days)
export async function getItemsApproachingDeadline(organizationId: number, daysAhead = 7): Promise<OverdueItem[]> {
  const db = await getDb();
  const today = new Date();
  const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const todayStr = today.toISOString().split('T')[0];
  const futureDateStr = futureDate.toISOString().split('T')[0];
  
  const initiatives = await db
    .select({
      id: cppdInitiatives.id,
      title: cppdInitiatives.title,
      description: cppdInitiatives.description,
      plannedEndDate: cppdInitiatives.plannedEndDate,
      responsibleName: cppdInitiatives.responsibleName,
      responsibleEmail: cppdInitiatives.responsibleEmail,
      organizationId: cppdInitiatives.organizationId,
    })
    .from(cppdInitiatives)
    .where(
      and(
        eq(cppdInitiatives.organizationId, organizationId),
        sql`${cppdInitiatives.plannedEndDate} > ${todayStr}`,
        sql`${cppdInitiatives.plannedEndDate} <= ${futureDateStr}`,
        or(
          eq(cppdInitiatives.status, 'planejado'),
          eq(cppdInitiatives.status, 'em_andamento')
        )
      )
    );
  
  return initiatives.map(item => {
    const endDate = new Date(item.plannedEndDate!);
    const daysUntil = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      id: item.id,
      type: 'initiative' as const,
      title: item.title,
      description: item.description || undefined,
      plannedEndDate: item.plannedEndDate!,
      daysOverdue: -daysUntil, // Negative means days until deadline
      responsibleName: item.responsibleName || undefined,
      responsibleEmail: item.responsibleEmail || undefined,
      organizationId: item.organizationId,
    };
  });
}
