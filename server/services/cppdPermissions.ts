/**
 * Sistema de Permissões do CPPD — v2 (RBAC Contextual)
 *
 * Modelo:
 *   - Roles GLOBAIS da plataforma: admin_global, consultor, sponsor, comite, lider_processo, gestor_area, terceiro
 *   - Secretaria do CPPD (por org/ano): seusdados | grupo | cliente
 *   - Papéis CONTEXTUAIS do CPPD (por membro): COORDENADOR_CPPD | SECRETARIO_CPPD | MEMBRO_CPPD | CONVIDADO_CPPD
 *
 * O "poder de operar" o CPPD NÃO deriva do role global; deriva de:
 *   1) papéis contextuais (membro/coordenador/secretário) +
 *   2) modelo de secretaria
 *
 * Regras:
 *   - admin_global / consultor: TODAS as capabilities
 *   - sponsor/standard:
 *     - Se NÃO é membro: somente read-only
 *     - Se é membro:
 *       - Sempre: VIEW_CPPD, VIEW_MEETING, VIEW_ACTIONS, MARK_SELF_ATTENDANCE, VIEW_MINUTES
 *       - Se secretariat.model=cliente e cppdRole in (COORDENADOR_CPPD, SECRETARIO_CPPD):
 *         → habilitar todas as capabilities operacionais
 *       - Caso contrário: bloquear operacionais
 */

// ─── Tipos ───

export type SecretariatModel = 'seusdados' | 'grupo' | 'cliente';

export interface CppdSecretariat {
  model: SecretariatModel;
  providerName?: string;
  providerOrganizationId?: number;
  coordinatorUserId?: number;
}

export type CppdContextualRole = 'COORDENADOR_CPPD' | 'SECRETARIO_CPPD' | 'MEMBRO_CPPD' | 'CONVIDADO_CPPD';

export interface CppdCapabilities {
  // Configuração
  canConfigureCppd: boolean;
  canManageMembers: boolean;
  // Reuniões
  canCreateMeeting: boolean;
  canEditAgenda: boolean;
  canGenerateMinutes: boolean;
  canApproveMinutes: boolean;
  canSendForSignature: boolean;
  canUploadSignedDocument: boolean;
  canFinalizeSignature: boolean;
  // Ações
  canCreateAction: boolean;
  canUpdateActionStatus: boolean;
  canDeleteAction: boolean;
  // GED
  canStoreInGed: boolean;
  canDownloadFromGed: boolean;
  // Convites
  canSendInvitations: boolean;
  canCancelInvitations: boolean;
  // Overdue Job
  canRunOverdueCheck: boolean;
  // Auditoria
  canViewAuditTrail: boolean;
  // Plano Anual
  canManagePlanoAnual: boolean;
  canUpdateAtividades: boolean;
  // Dashboard / Queries
  canViewSponsorOverview: boolean;
  canViewOrgOverdue: boolean;
  canViewOwnTasks: boolean;
  // Presença
  canManageAttendance: boolean;
  // Transcrição
  canTranscribeMeeting: boolean;
}

export interface UserContext {
  userId: number;
  systemRole: string;
  organizationId?: number | null;
}

export interface MemberContext {
  roleInCommittee?: string | null;
  isSecretary?: boolean;
  isCoordinator?: boolean;
  isDpo?: boolean;
  isVoting?: boolean;
  status?: string;
  cppdRole?: CppdContextualRole;
}

// ─── Constantes ───

const ADMIN_ROLES = ['admin_global'];
const CONSULTANT_ROLES = ['admin_global', 'consultor'];
const CLIENT_ROLES = ['sponsor', 'comite', 'lider_processo', 'gestor_area'];

// ─── Helpers ───

/** Extrai o cppdSecretariat do campo notes (JSON) de governanca_cppd_configs */
export function parseSecretariat(notes: string | null | undefined): CppdSecretariat {
  if (!notes) return { model: 'seusdados' };
  try {
    const parsed = JSON.parse(notes);
    if (parsed?.cppdSecretariat && typeof parsed.cppdSecretariat === 'object') {
      const s = parsed.cppdSecretariat;
      const model = ['seusdados', 'grupo', 'cliente'].includes(s.model) ? s.model : 'seusdados';
      return {
        model: model as SecretariatModel,
        providerName: s.providerName ?? undefined,
        providerOrganizationId: s.providerOrganizationId ?? undefined,
        coordinatorUserId: s.coordinatorUserId ?? undefined,
      };
    }
  } catch { /* JSON inválido, retorna default */ }
  return { model: 'seusdados' };
}

/** Serializa o cppdSecretariat para o campo notes (preservando outros dados) */
export function serializeSecretariat(
  existingNotes: string | null | undefined,
  secretariat: CppdSecretariat,
): string {
  let existing: Record<string, unknown> = {};
  if (existingNotes) {
    try { existing = JSON.parse(existingNotes); } catch { /* ignora */ }
  }
  existing.cppdSecretariat = secretariat;
  return JSON.stringify(existing);
}

/** Deriva o papel contextual do CPPD a partir dos flags do membro */
export function deriveCppdRole(member: MemberContext | null | undefined): CppdContextualRole | null {
  if (!member || member.status !== 'ativo') return null;
  if (member.isCoordinator) return 'COORDENADOR_CPPD';
  if (member.isSecretary) return 'SECRETARIO_CPPD';
  if (member.cppdRole) return member.cppdRole;
  return 'MEMBRO_CPPD';
}

// ─── Motor de Capabilities ───

export interface ComputeCapabilitiesInput {
  globalRole: string;
  secretariat: CppdSecretariat;
  isMember: boolean;
  cppdRole: CppdContextualRole | null;
  userId: number;
}

/**
 * Calcula as 25 capabilities do CPPD com base no contexto completo.
 * Esta é a ÚNICA fonte de verdade para permissões do CPPD.
 */
export function computeCppdCapabilities(input: ComputeCapabilitiesInput): CppdCapabilities {
  const { globalRole, secretariat, isMember, cppdRole } = input;

  const isAdmin = ADMIN_ROLES.includes(globalRole);
  const isConsultant = CONSULTANT_ROLES.includes(globalRole);
  const isClientRole = CLIENT_ROLES.includes(globalRole);

  // Admin e consultores: TODAS as capabilities
  if (isAdmin || isConsultant) {
    return allCapabilities(true);
  }

  // Não é membro: somente read-only
  if (!isMember || !cppdRole) {
    return {
      ...allCapabilities(false),
      canDownloadFromGed: isClientRole,
      canViewSponsorOverview: isClientRole,
      canViewOwnTasks: isClientRole,
    };
  }

  // É membro — capabilities base (sempre disponíveis para membros)
  const baseCapabilities: CppdCapabilities = {
    ...allCapabilities(false),
    canDownloadFromGed: true,
    canViewSponsorOverview: true,
    canViewOrgOverdue: true,
    canViewOwnTasks: true,
    canViewAuditTrail: cppdRole === 'COORDENADOR_CPPD' || cppdRole === 'SECRETARIO_CPPD',
    canUpdateActionStatus: true,
    canCreateAction: true,
    canUpdateAtividades: true,
  };

  // Se secretaria = cliente e papel = COORDENADOR ou SECRETARIO → operacional completo
  if (
    secretariat.model === 'cliente' &&
    (cppdRole === 'COORDENADOR_CPPD' || cppdRole === 'SECRETARIO_CPPD')
  ) {
    return {
      ...allCapabilities(true),
      canRunOverdueCheck: true,
    };
  }

  // Membro comum (qualquer modelo de secretaria) ou secretaria != cliente
  return baseCapabilities;
}

/** Helper: gera objeto com todas as capabilities = valor */
function allCapabilities(value: boolean): CppdCapabilities {
  return {
    canConfigureCppd: value,
    canManageMembers: value,
    canCreateMeeting: value,
    canEditAgenda: value,
    canGenerateMinutes: value,
    canApproveMinutes: value,
    canSendForSignature: value,
    canUploadSignedDocument: value,
    canFinalizeSignature: value,
    canCreateAction: value,
    canUpdateActionStatus: value,
    canDeleteAction: value,
    canStoreInGed: value,
    canDownloadFromGed: value,
    canSendInvitations: value,
    canCancelInvitations: value,
    canRunOverdueCheck: value,
    canViewAuditTrail: value,
    canManagePlanoAnual: value,
    canUpdateAtividades: value,
    canViewSponsorOverview: value,
    canViewOrgOverdue: value,
    canViewOwnTasks: value,
    canManageAttendance: value,
    canTranscribeMeeting: value,
  };
}

// ─── Backward-compatible wrapper ───

/**
 * Calcula capabilities (wrapper compatível com testes existentes).
 * Aceita opcionalmente o secretariat; se omitido, assume seusdados.
 */
export function getCppdCapabilities(
  user: UserContext,
  member?: MemberContext | null,
  secretariat?: CppdSecretariat,
): CppdCapabilities {
  const cppdRole = deriveCppdRole(member ?? null);
  const isMember = member != null && member.status === 'ativo';
  return computeCppdCapabilities({
    globalRole: user.systemRole,
    secretariat: secretariat ?? { model: 'seusdados' },
    isMember,
    cppdRole,
    userId: user.userId,
  });
}

// ─── Enforcement ───

/**
 * Verifica se o usuário tem uma capability específica.
 * Lança TRPCError FORBIDDEN se não tiver.
 * Retorna as capabilities completas para uso posterior.
 */
export async function enforceCppdCapability(
  user: UserContext,
  capability: keyof CppdCapabilities,
  organizationId: number,
): Promise<CppdCapabilities> {
  const capabilities = await getUserCppdCapabilities(user, organizationId);
  if (!capabilities[capability]) {
    const { TRPCError } = await import('@trpc/server');
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Permissao insuficiente: ${capability}`,
    });
  }
  return capabilities;
}

/**
 * Retorna capabilities completas do usuário para o frontend.
 * Busca membro + secretariat do banco.
 */
export async function getUserCppdCapabilities(
  user: UserContext,
  organizationId: number,
): Promise<CppdCapabilities> {
  let member: MemberContext | null = null;
  let secretariat: CppdSecretariat = { model: 'seusdados' };

  try {
    const { getDb } = await import('../db');
    const dbInstance = await getDb();
    if (dbInstance) {
      const { governancaCppdMembers, governancaCppdConfigs } = await import('../../drizzle/schema');
      const { eq, and } = await import('drizzle-orm');

      // Buscar membro
      const [memberRow] = await dbInstance
        .select({
          roleInCommittee: governancaCppdMembers.roleInCommittee,
          isSecretary: governancaCppdMembers.isSecretary,
          isCoordinator: governancaCppdMembers.isCoordinator,
          isDpo: governancaCppdMembers.isDpo,
          isVoting: governancaCppdMembers.isVoting,
          status: governancaCppdMembers.status,
        })
        .from(governancaCppdMembers)
        .where(
          and(
            eq(governancaCppdMembers.userId, user.userId),
            eq(governancaCppdMembers.organizationId, organizationId),
          )
        )
        .limit(1);

      if (memberRow) {
        member = {
          roleInCommittee: memberRow.roleInCommittee,
          isSecretary: memberRow.isSecretary === 1,
          isCoordinator: memberRow.isCoordinator === 1,
          isDpo: memberRow.isDpo === 1,
          isVoting: memberRow.isVoting === 1,
          status: memberRow.status,
        };
      }

      // Buscar secretariat da config mais recente
      const currentYear = new Date().getFullYear();
      const [configRow] = await dbInstance
        .select({ notes: governancaCppdConfigs.notes })
        .from(governancaCppdConfigs)
        .where(
          and(
            eq(governancaCppdConfigs.organizationId, organizationId),
            eq(governancaCppdConfigs.year, currentYear),
          )
        )
        .limit(1);

      if (configRow) {
        secretariat = parseSecretariat(configRow.notes);
      }
    }
  } catch {
    // Se não conseguir buscar, continua com defaults
  }

  return getCppdCapabilities(user, member, secretariat);
}
