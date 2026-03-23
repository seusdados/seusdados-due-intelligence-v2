/**
 * Motor de Permissões de Mapeamentos
 * 
 * Implementa permissões cumulativas baseadas em múltiplos perfis por usuário.
 * Os perfis são: lider_processo, gestor_area, sponsor, comite.
 * 
 * Regras:
 * - Permissões são SOMADAS entre todos os perfis ativos do usuário
 * - Gestor de Área prevalece sobre Líder de Processo para delegação
 * - Admin global e consultor têm acesso total (bypass)
 */

import { getDb } from "../db";
import { userProfiles, mapeamentoDelegations, users } from "../../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ============================================================
// Tipos e Interfaces
// ============================================================

export type ProfileType = 
  | 'lider_processo' 
  | 'gestor_area' 
  | 'sponsor' 
  | 'comite';

export interface MapeamentoCapabilities {
  // Leitura
  canAccessModule: boolean;           // Pode acessar /mapeamentos
  canViewDashboard: boolean;          // Pode ver o dashboard de mapeamentos
  canViewOwnAreaProcesses: boolean;   // Pode ver processos da sua área
  canViewAllAreaProcesses: boolean;   // Pode ver processos de todas as áreas
  
  // Execução
  canRespondMapeamentos: boolean;     // Pode responder mapeamentos de processos
  canEditResponses: boolean;          // Pode editar respostas de mapeamentos
  
  // Gestão
  canDelegateProcesses: boolean;      // Pode delegar mapeamentos para Líder de Processo
  canRevokeDelegation: boolean;       // Pode revogar uma delegação
  canApproveResponses: boolean;       // Pode aprovar respostas de mapeamentos
  canManageRespondents: boolean;      // Pode gerenciar respondentes
  
  // Administração
  canCreateAreas: boolean;            // Pode criar áreas
  canEditAreas: boolean;              // Pode editar áreas
  canDeleteAreas: boolean;            // Pode excluir áreas
  canGenerateROT: boolean;            // Pode gerar ROT
  canGeneratePOP: boolean;            // Pode gerar POP
  canExportReports: boolean;          // Pode exportar relatórios
  canSendInvitations: boolean;        // Pode enviar convites para respondentes
  canManageActionPlans: boolean;      // Pode gerenciar planos de ação
  
  // Meta
  isFullAccess: boolean;              // Admin/consultor com acesso total
  activeProfiles: ProfileType[];      // Perfis ativos do usuário
  areaIds: number[];                  // IDs das áreas vinculadas
}

// ============================================================
// Mapeamento fixo de capabilities por perfil
// ============================================================

const PROFILE_CAPABILITIES: Record<ProfileType, Partial<MapeamentoCapabilities>> = {
  lider_processo: {
    canAccessModule: true,
    canViewDashboard: true,
    canViewOwnAreaProcesses: true,
    canViewAllAreaProcesses: false,
    canRespondMapeamentos: true,
    canEditResponses: true,
    canDelegateProcesses: false,     // NÃO pode delegar
    canRevokeDelegation: false,
    canApproveResponses: false,
    canManageRespondents: false,
    canCreateAreas: false,
    canEditAreas: false,
    canDeleteAreas: false,
    canGenerateROT: false,
    canGeneratePOP: false,
    canExportReports: true,
    canSendInvitations: false,
    canManageActionPlans: false,
  },
  gestor_area: {
    canAccessModule: true,
    canViewDashboard: true,
    canViewOwnAreaProcesses: true,
    canViewAllAreaProcesses: false,
    canRespondMapeamentos: true,
    canEditResponses: true,
    canDelegateProcesses: true,      // PODE delegar
    canRevokeDelegation: true,
    canApproveResponses: true,       // Responsável final
    canManageRespondents: true,
    canCreateAreas: false,
    canEditAreas: true,
    canDeleteAreas: false,
    canGenerateROT: true,
    canGeneratePOP: true,
    canExportReports: true,
    canSendInvitations: true,
    canManageActionPlans: true,
  },
  sponsor: {
    canAccessModule: true,
    canViewDashboard: true,
    canViewOwnAreaProcesses: false,
    canViewAllAreaProcesses: true,   // Visão gerencial de todas as áreas
    canRespondMapeamentos: false,
    canEditResponses: false,
    canDelegateProcesses: false,
    canRevokeDelegation: false,
    canApproveResponses: false,
    canManageRespondents: false,
    canCreateAreas: false,
    canEditAreas: false,
    canDeleteAreas: false,
    canGenerateROT: false,
    canGeneratePOP: false,
    canExportReports: true,
    canSendInvitations: false,
    canManageActionPlans: false,
  },

  comite: {
    canAccessModule: true,
    canViewDashboard: true,
    canViewOwnAreaProcesses: false,
    canViewAllAreaProcesses: true,
    canRespondMapeamentos: false,
    canEditResponses: false,
    canDelegateProcesses: false,
    canRevokeDelegation: false,
    canApproveResponses: false,
    canManageRespondents: false,
    canCreateAreas: false,
    canEditAreas: false,
    canDeleteAreas: false,
    canGenerateROT: false,
    canGeneratePOP: false,
    canExportReports: true,
    canSendInvitations: false,
    canManageActionPlans: false,
  },

};

// Capabilities de acesso total (admin_global, consultor)
const FULL_ACCESS_CAPABILITIES: MapeamentoCapabilities = {
  canAccessModule: true,
  canViewDashboard: true,
  canViewOwnAreaProcesses: true,
  canViewAllAreaProcesses: true,
  canRespondMapeamentos: true,
  canEditResponses: true,
  canDelegateProcesses: true,
  canRevokeDelegation: true,
  canApproveResponses: true,
  canManageRespondents: true,
  canCreateAreas: true,
  canEditAreas: true,
  canDeleteAreas: true,
  canGenerateROT: true,
  canGeneratePOP: true,
  canExportReports: true,
  canSendInvitations: true,
  canManageActionPlans: true,
  isFullAccess: true,
  activeProfiles: [],
  areaIds: [],
};

// ============================================================
// Funções de consulta ao banco
// ============================================================

/**
 * Busca todos os perfis ativos de um usuário em uma organização
 */
export async function getUserProfiles(userId: number, organizationId: number) {
  const db = await getDb();
  const profiles = await db
    .select()
    .from(userProfiles)
    .where(
      and(
        eq(userProfiles.userId, userId),
        eq(userProfiles.organizationId, organizationId),
        eq(userProfiles.isActive, 1)
      )
    );
  return profiles;
}

/**
 * Atribui um perfil a um usuário
 */
export async function assignProfile(params: {
  userId: number;
  organizationId: number;
  profileType: ProfileType;
  areaId?: number;
  assignedBy: number;
}) {
  const db = await getDb();
  
  // Verificar se já existe perfil ativo com o mesmo tipo e área
  const existing = await db
    .select()
    .from(userProfiles)
    .where(
      and(
        eq(userProfiles.userId, params.userId),
        eq(userProfiles.organizationId, params.organizationId),
        eq(userProfiles.profileType, params.profileType),
        eq(userProfiles.isActive, 1),
        ...(params.areaId ? [eq(userProfiles.areaId, params.areaId)] : [])
      )
    );
  
  if (existing.length > 0) {
    return { id: existing[0].id, alreadyExists: true };
  }
  
  const [result] = await db.insert(userProfiles).values({
    userId: params.userId,
    organizationId: params.organizationId,
    profileType: params.profileType,
    areaId: params.areaId ?? null,
    assignedBy: params.assignedBy,
  }).returning({ id: userProfiles.id });
  
  return { id: result.id, alreadyExists: false };
}

/**
 * Remove (desativa) um perfil de um usuário
 */
export async function removeProfile(profileId: number) {
  const db = await getDb();
  await db
    .update(userProfiles)
    .set({ isActive: false })
    .where(eq(userProfiles.id, profileId));
}

/**
 * Lista todos os perfis de uma organização (para admin)
 */
export async function listOrganizationProfiles(organizationId: number) {
  const db = await getDb();
  const profiles = await db
    .select({
      id: userProfiles.id,
      userId: userProfiles.userId,
      profileType: userProfiles.profileType,
      areaId: userProfiles.areaId,
      isActive: userProfiles.isActive,
      createdAt: userProfiles.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(userProfiles)
    .innerJoin(users, eq(userProfiles.userId, users.id))
    .where(
      and(
        eq(userProfiles.organizationId, organizationId),
        eq(userProfiles.isActive, 1)
      )
    );
  return profiles;
}

// ============================================================
// Motor de Capabilities Cumulativas
// ============================================================

/**
 * Calcula as capabilities cumulativas de um usuário baseado em todos os seus perfis ativos.
 * As permissões são SOMADAS (OR lógico): se qualquer perfil concede uma capability, ela é concedida.
 */
export function computeMapeamentoCapabilities(
  userRole: string,
  profiles: Array<{ profileType: string; areaId: number | null; isActive: number }>
): MapeamentoCapabilities {
  // Admin global e consultor têm acesso total (bypass)
  if (['admin_global', 'consultor'].includes(userRole)) {
    return { ...FULL_ACCESS_CAPABILITIES };
  }
  
  // Filtrar apenas perfis ativos
  const activeProfiles = profiles.filter(p => p.isActive === 1);
  const profileTypes = activeProfiles.map(p => p.profileType as ProfileType);
  const areaIds = activeProfiles
    .filter(p => p.areaId !== null)
    .map(p => p.areaId as number);
  
  // Se não tem perfis ativos, usa o role principal do usuário como fallback
  if (activeProfiles.length === 0) {
    const fallbackType = mapUserRoleToProfileType(userRole);
    if (fallbackType) {
      const fallbackCaps = PROFILE_CAPABILITIES[fallbackType];
      return {
        canAccessModule: fallbackCaps.canAccessModule ?? false,
        canViewDashboard: fallbackCaps.canViewDashboard ?? false,
        canViewOwnAreaProcesses: fallbackCaps.canViewOwnAreaProcesses ?? false,
        canViewAllAreaProcesses: fallbackCaps.canViewAllAreaProcesses ?? false,
        canRespondMapeamentos: fallbackCaps.canRespondMapeamentos ?? false,
        canEditResponses: fallbackCaps.canEditResponses ?? false,
        canDelegateProcesses: fallbackCaps.canDelegateProcesses ?? false,
        canRevokeDelegation: fallbackCaps.canRevokeDelegation ?? false,
        canApproveResponses: fallbackCaps.canApproveResponses ?? false,
        canManageRespondents: fallbackCaps.canManageRespondents ?? false,
        canCreateAreas: fallbackCaps.canCreateAreas ?? false,
        canEditAreas: fallbackCaps.canEditAreas ?? false,
        canDeleteAreas: fallbackCaps.canDeleteAreas ?? false,
        canGenerateROT: fallbackCaps.canGenerateROT ?? false,
        canGeneratePOP: fallbackCaps.canGeneratePOP ?? false,
        canExportReports: fallbackCaps.canExportReports ?? false,
        canSendInvitations: fallbackCaps.canSendInvitations ?? false,
        canManageActionPlans: fallbackCaps.canManageActionPlans ?? false,
        isFullAccess: false,
        activeProfiles: [fallbackType],
        areaIds: [],
      };
    }
    // Sem perfil e sem role mapeável: acesso mínimo
    return {
      canAccessModule: false,
      canViewDashboard: false,
      canViewOwnAreaProcesses: false,
      canViewAllAreaProcesses: false,
      canRespondMapeamentos: false,
      canEditResponses: false,
      canDelegateProcesses: false,
      canRevokeDelegation: false,
      canApproveResponses: false,
      canManageRespondents: false,
      canCreateAreas: false,
      canEditAreas: false,
      canDeleteAreas: false,
      canGenerateROT: false,
      canGeneratePOP: false,
      canExportReports: false,
      canSendInvitations: false,
      canManageActionPlans: false,
      isFullAccess: false,
      activeProfiles: [],
      areaIds: [],
    };
  }
  
  // Somar capabilities de todos os perfis (OR lógico)
  const merged: MapeamentoCapabilities = {
    canAccessModule: false,
    canViewDashboard: false,
    canViewOwnAreaProcesses: false,
    canViewAllAreaProcesses: false,
    canRespondMapeamentos: false,
    canEditResponses: false,
    canDelegateProcesses: false,
    canRevokeDelegation: false,
    canApproveResponses: false,
    canManageRespondents: false,
    canCreateAreas: false,
    canEditAreas: false,
    canDeleteAreas: false,
    canGenerateROT: false,
    canGeneratePOP: false,
    canExportReports: false,
    canSendInvitations: false,
    canManageActionPlans: false,
    isFullAccess: false,
    activeProfiles: Array.from(new Set(profileTypes)),
    areaIds: Array.from(new Set(areaIds)),
  };
  
  for (const profile of activeProfiles) {
    const caps = PROFILE_CAPABILITIES[profile.profileType as ProfileType];
    if (!caps) continue;
    
    // OR lógico: se qualquer perfil concede, está concedido
    for (const key of Object.keys(caps) as Array<keyof typeof caps>) {
      if (caps[key] === true) {
        (merged as any)[key] = true;
      }
    }
  }
  
  return merged;
}

/**
 * Mapeia o role principal do usuário para um ProfileType (fallback)
 */
function mapUserRoleToProfileType(role: string): ProfileType | null {
  const mapping: Record<string, ProfileType> = {
    sponsor: 'sponsor',
    comite: 'comite',
    lider_processo: 'lider_processo',
    gestor_area: 'gestor_area',
  };
  return mapping[role] ?? null;
}

// ============================================================
// Enforcement
// ============================================================

/**
 * Verifica se o usuário tem uma capability específica.
 * Lança TRPCError FORBIDDEN se não tiver.
 */
export function enforceMapeamentoCapability(
  capabilities: MapeamentoCapabilities,
  capability: keyof Omit<MapeamentoCapabilities, 'isFullAccess' | 'activeProfiles' | 'areaIds'>
): void {
  if (capabilities.isFullAccess) return;
  if (!capabilities[capability]) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Permissão negada: ${capability}`,
    });
  }
}

/**
 * Verifica se o usuário tem acesso a uma área específica.
 * Lança TRPCError FORBIDDEN se não tiver.
 */
export function enforceMapeamentoAreaAccess(
  capabilities: MapeamentoCapabilities,
  areaId: number
): void {
  if (capabilities.isFullAccess) return;
  if (capabilities.canViewAllAreaProcesses) return;
  if (!capabilities.areaIds.includes(areaId)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Permissão negada: acesso à área não autorizado',
    });
  }
}

// ============================================================
// Delegação de Mapeamentos
// ============================================================

/**
 * Cria uma delegação de mapeamento (Gestor → Líder)
 */
export async function createDelegation(params: {
  organizationId: number;
  areaId: number;
  processId: number;
  delegatedBy: number;
  delegatedTo: number;
  notes?: string;
}) {
  const db = await getDb();
  
  // Verificar se o destinatário tem perfil lider_processo na área
  const targetProfiles = await db
    .select()
    .from(userProfiles)
    .where(
      and(
        eq(userProfiles.userId, params.delegatedTo),
        eq(userProfiles.organizationId, params.organizationId),
        eq(userProfiles.profileType, 'lider_processo'),
        eq(userProfiles.isActive, 1)
      )
    );
  
  if (targetProfiles.length === 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'O destinatário não possui perfil de Líder de Processo ativo',
    });
  }
  
  const [result] = await db.insert(mapeamentoDelegations).values({
    organizationId: params.organizationId,
    areaId: params.areaId,
    processId: params.processId,
    delegatedBy: params.delegatedBy,
    delegatedTo: params.delegatedTo,
    notes: params.notes ?? null,
  }).returning({ id: mapeamentoDelegations.id });
  
  return { id: result.id };
}

/**
 * Revoga uma delegação
 */
export async function revokeDelegation(delegationId: number, userId: number) {
  const db = await getDb();
  await db
    .update(mapeamentoDelegations)
    .set({ 
      status: 'revogada',
      revokedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(mapeamentoDelegations.id, delegationId),
        eq(mapeamentoDelegations.delegatedBy, userId)
      )
    );
}

/**
 * Conclui uma delegação
 */
export async function completeDelegation(delegationId: number) {
  const db = await getDb();
  await db
    .update(mapeamentoDelegations)
    .set({ 
      status: 'concluida',
      completedAt: new Date().toISOString(),
    })
    .where(eq(mapeamentoDelegations.id, delegationId));
}

/**
 * Lista delegações ativas de uma organização
 */
export async function listDelegations(organizationId: number, filters?: {
  areaId?: number;
  delegatedBy?: number;
  delegatedTo?: number;
  status?: 'ativa' | 'concluida' | 'revogada';
}) {
  const db = await getDb();
  const conditions = [eq(mapeamentoDelegations.organizationId, organizationId)];
  
  if (filters?.areaId) conditions.push(eq(mapeamentoDelegations.areaId, filters.areaId));
  if (filters?.delegatedBy) conditions.push(eq(mapeamentoDelegations.delegatedBy, filters.delegatedBy));
  if (filters?.delegatedTo) conditions.push(eq(mapeamentoDelegations.delegatedTo, filters.delegatedTo));
  if (filters?.status) conditions.push(eq(mapeamentoDelegations.status, filters.status));
  
  const delegations = await db
    .select()
    .from(mapeamentoDelegations)
    .where(and(...conditions));
  
  return delegations;
}
