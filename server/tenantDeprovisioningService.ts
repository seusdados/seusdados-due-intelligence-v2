/**
 * Seusdados Due Diligence - Tenant Deprovisioning Service
 * Serviço para desprovisionamento seguro de tenants (organizações)
 * 
 * Implementa o ciclo de vida completo de desprovisionamento:
 * 1. Soft delete (marcação para exclusão)
 * 2. Período de retenção (30 dias por padrão)
 * 3. Hard delete (exclusão definitiva)
 * 4. Auditoria completa do processo
 */

import { getDb } from './db';
import { 
  organizations, 
  users, 
  userOrganizations,
  thirdParties,
  complianceAssessments,
  thirdPartyAssessments,
  documents,
  auditLogs,
  tickets,
  contractAnalyses
} from '../drizzle/schema';
import { eq, and, lt, isNotNull } from 'drizzle-orm';
import { withTransaction } from './_core/transaction';
import { logger } from './_core/logger';
import { TRPCError } from '@trpc/server';

// Período de retenção padrão (30 dias)
const DEFAULT_RETENTION_DAYS = 30;

export interface DeprovisioningResult {
  success: boolean;
  organizationId: number;
  organizationName: string;
  action: 'soft_delete' | 'hard_delete' | 'restore' | 'cancel';
  scheduledDeletionDate?: Date;
  deletedAt?: Date;
  itemsDeleted?: {
    users: number;
    thirdParties: number;
    assessments: number;
    documents: number;
    tickets: number;
    contracts: number;
  };
  error?: string;
}

export interface DeprovisioningStatus {
  organizationId: number;
  organizationName: string;
  status: 'active' | 'pending_deletion' | 'deleted';
  scheduledDeletionDate?: Date;
  daysRemaining?: number;
  canRestore: boolean;
}

/**
 * Inicia o processo de desprovisionamento (soft delete)
 * Marca a organização para exclusão após o período de retenção
 */
export async function initiateDeprovisioning(
  organizationId: number,
  requestedBy: number,
  retentionDays: number = DEFAULT_RETENTION_DAYS
): Promise<DeprovisioningResult> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  try {
    // Buscar organização
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    if (!org) {
      return {
        success: false,
        organizationId,
        organizationName: 'Unknown',
        action: 'soft_delete',
        error: 'Organização não encontrada'
      };
    }

    // Verificar se já está marcada para exclusão
    if (org.deletedAt) {
      return {
        success: false,
        organizationId,
        organizationName: org.name,
        action: 'soft_delete',
        error: 'Organização já está marcada para exclusão'
      };
    }

    const scheduledDeletionDate = new Date();
    scheduledDeletionDate.setDate(scheduledDeletionDate.getDate() + retentionDays);

    // Executar soft delete em transação
    await withTransaction(async () => {
      // Marcar organização para exclusão
      await db
        .update(organizations)
        .set({
          deletedAt: new Date().toISOString(),
          // Armazenar data de exclusão programada em campo de metadados
          updatedAt: new Date().toISOString()
        })
        .where(eq(organizations.id, organizationId));

      // Registrar no audit log
      await db.insert(auditLogs).values({
        organizationId,
        userId: requestedBy,
        action: 'tenant_deprovisioning_initiated',
        entityType: 'organization',
        entityId: organizationId,
        details: JSON.stringify({
          scheduledDeletionDate: scheduledDeletionDate.toISOString(),
          retentionDays,
          requestedBy
        }),
        createdAt: new Date().toISOString()
      });
    }, 'initiate-tenant-deprovisioning');

    logger.info(`[Deprovisioning] Tenant ${organizationId} (${org.name}) marcado para exclusão em ${scheduledDeletionDate.toISOString()}`);

    return {
      success: true,
      organizationId,
      organizationName: org.name,
      action: 'soft_delete',
      scheduledDeletionDate
    };
  } catch (error: any) {
    logger.error('[Deprovisioning] Erro ao iniciar desprovisionamento', { error, organizationId });
    return {
      success: false,
      organizationId,
      organizationName: 'Unknown',
      action: 'soft_delete',
      error: error.message
    };
  }
}

/**
 * Cancela o desprovisionamento (restaura a organização)
 */
export async function cancelDeprovisioning(
  organizationId: number,
  requestedBy: number
): Promise<DeprovisioningResult> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    if (!org) {
      return {
        success: false,
        organizationId,
        organizationName: 'Unknown',
        action: 'restore',
        error: 'Organização não encontrada'
      };
    }

    if (!org.deletedAt) {
      return {
        success: false,
        organizationId,
        organizationName: org.name,
        action: 'restore',
        error: 'Organização não está marcada para exclusão'
      };
    }

    await withTransaction(async () => {
      // Restaurar organização
      await db
        .update(organizations)
        .set({
          deletedAt: null,
          updatedAt: new Date().toISOString()
        })
        .where(eq(organizations.id, organizationId));

      // Registrar no audit log
      await db.insert(auditLogs).values({
        organizationId,
        userId: requestedBy,
        action: 'tenant_deprovisioning_cancelled',
        entityType: 'organization',
        entityId: organizationId,
        details: JSON.stringify({ requestedBy }),
        createdAt: new Date().toISOString()
      });
    }, 'cancel-tenant-deprovisioning');

    logger.info(`[Deprovisioning] Desprovisionamento do tenant ${organizationId} (${org.name}) cancelado`);

    return {
      success: true,
      organizationId,
      organizationName: org.name,
      action: 'restore'
    };
  } catch (error: any) {
    logger.error('[Deprovisioning] Erro ao cancelar desprovisionamento', { error, organizationId });
    return {
      success: false,
      organizationId,
      organizationName: 'Unknown',
      action: 'restore',
      error: error.message
    };
  }
}

/**
 * Executa o hard delete de uma organização
 * Remove todos os dados permanentemente
 */
export async function executeHardDelete(
  organizationId: number,
  requestedBy: number
): Promise<DeprovisioningResult> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    if (!org) {
      return {
        success: false,
        organizationId,
        organizationName: 'Unknown',
        action: 'hard_delete',
        error: 'Organização não encontrada'
      };
    }

    // Verificar se passou o período de retenção
    if (org.deletedAt) {
      const retentionEndDate = new Date(org.deletedAt);
      retentionEndDate.setDate(retentionEndDate.getDate() + DEFAULT_RETENTION_DAYS);
      
      if (new Date() < retentionEndDate) {
        return {
          success: false,
          organizationId,
          organizationName: org.name,
          action: 'hard_delete',
          error: `Período de retenção não expirou. Exclusão programada para ${retentionEndDate.toISOString()}`
        };
      }
    }

    const itemsDeleted = {
      users: 0,
      thirdParties: 0,
      assessments: 0,
      documents: 0,
      tickets: 0,
      contracts: 0
    };

    await withTransaction(async () => {
      // 1. Remover vínculos de usuários
      const userOrgResult = await db
        .delete(userOrganizations)
        .where(eq(userOrganizations.organizationId, organizationId));
      itemsDeleted.users = (userOrgResult as any).rowCount || 0;

      // 2. Remover terceiros
      const thirdPartiesResult = await db
        .delete(thirdParties)
        .where(eq(thirdParties.organizationId, organizationId));
      itemsDeleted.thirdParties = (thirdPartiesResult as any).rowCount || 0;

      // 3. Remover avaliações de conformidade
      const assessmentsResult = await db
        .delete(complianceAssessments)
        .where(eq(complianceAssessments.organizationId, organizationId));
      itemsDeleted.assessments = (assessmentsResult as any).rowCount || 0;

      // 4. Remover avaliações de terceiros
      await db
        .delete(thirdPartyAssessments)
        .where(eq(thirdPartyAssessments.organizationId, organizationId));

      // 5. Remover documentos
      const documentsResult = await db
        .delete(documents)
        .where(eq(documents.organizationId, organizationId));
      itemsDeleted.documents = (documentsResult as any).rowCount || 0;

      // 6. Remover tickets
      const ticketsResult = await db
        .delete(tickets)
        .where(eq(tickets.organizationId, organizationId));
      itemsDeleted.tickets = (ticketsResult as any).rowCount || 0;

      // 7. Remover análises de contratos
      const contractsResult = await db
        .delete(contractAnalyses)
        .where(eq(contractAnalyses.organizationId, organizationId));
      itemsDeleted.contracts = (contractsResult as any).rowCount || 0;

      // 8. Registrar no audit log antes de excluir a organização
      await db.insert(auditLogs).values({
        organizationId: null, // Organização será excluída
        userId: requestedBy,
        action: 'tenant_hard_deleted',
        entityType: 'organization',
        entityId: organizationId,
        details: JSON.stringify({
          organizationName: org.name,
          itemsDeleted,
          deletedAt: new Date().toISOString()
        }),
        createdAt: new Date().toISOString()
      });

      // 9. Remover a organização
      await db
        .delete(organizations)
        .where(eq(organizations.id, organizationId));

    }, 'execute-tenant-hard-delete');

    logger.info(`[Deprovisioning] Tenant ${organizationId} (${org.name}) excluído permanentemente`, { itemsDeleted });

    return {
      success: true,
      organizationId,
      organizationName: org.name,
      action: 'hard_delete',
      deletedAt: new Date(),
      itemsDeleted
    };
  } catch (error: any) {
    logger.error('[Deprovisioning] Erro ao executar hard delete', { error, organizationId });
    return {
      success: false,
      organizationId,
      organizationName: 'Unknown',
      action: 'hard_delete',
      error: error.message
    };
  }
}

/**
 * Obtém o status de desprovisionamento de uma organização
 */
export async function getDeprovisioningStatus(
  organizationId: number
): Promise<DeprovisioningStatus | null> {
  const db = await getDb();
  if (!db) return null;

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId));

  if (!org) return null;

  if (!org.deletedAt) {
    return {
      organizationId,
      organizationName: org.name,
      status: 'active',
      canRestore: false
    };
  }

  const scheduledDeletionDate = new Date(org.deletedAt);
  scheduledDeletionDate.setDate(scheduledDeletionDate.getDate() + DEFAULT_RETENTION_DAYS);
  
  const now = new Date();
  const daysRemaining = Math.ceil((scheduledDeletionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    organizationId,
    organizationName: org.name,
    status: 'pending_deletion',
    scheduledDeletionDate,
    daysRemaining: Math.max(0, daysRemaining),
    canRestore: daysRemaining > 0
  };
}

/**
 * Lista todas as organizações pendentes de exclusão
 */
export async function listPendingDeletions(): Promise<DeprovisioningStatus[]> {
  const db = await getDb();
  if (!db) return [];

  const pendingOrgs = await db
    .select()
    .from(organizations)
    .where(isNotNull(organizations.deletedAt));

  return pendingOrgs.map(org => {
    const scheduledDeletionDate = new Date(org.deletedAt!);
    scheduledDeletionDate.setDate(scheduledDeletionDate.getDate() + DEFAULT_RETENTION_DAYS);
    
    const now = new Date();
    const daysRemaining = Math.ceil((scheduledDeletionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      organizationId: org.id,
      organizationName: org.name,
      status: 'pending_deletion' as const,
      scheduledDeletionDate,
      daysRemaining: Math.max(0, daysRemaining),
      canRestore: daysRemaining > 0
    };
  });
}

/**
 * Job para processar exclusões expiradas
 * Deve ser executado periodicamente (ex: diariamente)
 */
export async function processExpiredDeletions(): Promise<{
  processed: number;
  errors: string[];
}> {
  const db = await getDb();
  if (!db) return { processed: 0, errors: ['Database not available'] };

  const errors: string[] = [];
  let processed = 0;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DEFAULT_RETENTION_DAYS);

  const expiredOrgs = await db
    .select()
    .from(organizations)
    .where(
      and(
        isNotNull(organizations.deletedAt),
        lt(organizations.deletedAt, cutoffDate.toISOString())
      )
    );

  for (const org of expiredOrgs) {
    const result = await executeHardDelete(org.id, 0); // 0 = sistema
    if (result.success) {
      processed++;
    } else {
      errors.push(`Org ${org.id}: ${result.error}`);
    }
  }

  logger.info(`[Deprovisioning] Processamento de exclusões expiradas: ${processed} processadas, ${errors.length} erros`);

  return { processed, errors };
}

export default {
  initiateDeprovisioning,
  cancelDeprovisioning,
  executeHardDelete,
  getDeprovisioningStatus,
  listPendingDeletions,
  processExpiredDeletions
};
