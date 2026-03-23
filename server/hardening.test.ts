/**
 * Testes de Hardening CPPD — Fase Final
 * 
 * A) getCppdCapabilities: verifica capabilities por UserContext + MemberContext
 * B) GED Fallback: simula falha Supabase e verifica fallback para local
 * C) ICS: valida que o anexo gerado contém DTSTART/DTEND/UID/SUMMARY e ATTENDEE
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Helpers: criar UserContext e MemberContext ───

function makeUser(systemRole: string, userId = 10, organizationId = 1) {
  return { userId, systemRole, organizationId };
}

function makeMember(opts: {
  roleInCommittee?: string;
  isSecretary?: boolean;
  isCoordinator?: boolean;
  isDpo?: boolean;
  isVoting?: boolean;
  status?: string;
} = {}) {
  return {
    roleInCommittee: opts.roleInCommittee ?? null,
    isSecretary: opts.isSecretary ?? false,
    isCoordinator: opts.isCoordinator ?? false,
    isDpo: opts.isDpo ?? false,
    isVoting: opts.isVoting ?? false,
    status: opts.status ?? 'ativo',
  };
}

// ─── A) getCppdCapabilities: verificar capabilities por role ───

describe('getCppdCapabilities — Cálculo de Permissões', () => {
  it('admin_global deve ter TODAS as capabilities de configuração', async () => {
    const { getCppdCapabilities } = await import('./services/cppdPermissions');
    const caps = getCppdCapabilities(makeUser('admin_global'));
    expect(caps.canConfigureCppd).toBe(true);
    expect(caps.canManageMembers).toBe(true);
    expect(caps.canCreateMeeting).toBe(true);
    expect(caps.canManagePlanoAnual).toBe(true);
    expect(caps.canDeleteAction).toBe(true);
    expect(caps.canRunOverdueCheck).toBe(true);
    expect(caps.canViewAuditTrail).toBe(true);
  });

  it('consultor deve ter capabilities administrativas', async () => {
    const { getCppdCapabilities } = await import('./services/cppdPermissions');
    const caps = getCppdCapabilities(makeUser('consultor'));
    expect(caps.canConfigureCppd).toBe(true);
    expect(caps.canManageMembers).toBe(true);
    expect(caps.canCreateMeeting).toBe(true);
    expect(caps.canGenerateMinutes).toBe(true);
    expect(caps.canApproveMinutes).toBe(true);
    expect(caps.canViewAuditTrail).toBe(true);
  });

  it('sponsor SEM membro deve ter somente read-only (v2: secretariat-aware)', async () => {
    const { getCppdCapabilities } = await import('./services/cppdPermissions');
    const caps = getCppdCapabilities(makeUser('sponsor'));
    // Sponsor sem membro: read-only
    expect(caps.canViewSponsorOverview).toBe(true);
    expect(caps.canViewOwnTasks).toBe(true);
    expect(caps.canDownloadFromGed).toBe(true);
    // NÃO pode operar
    expect(caps.canCreateMeeting).toBe(false);
    expect(caps.canConfigureCppd).toBe(false);
    expect(caps.canManageMembers).toBe(false);
  });

  it('sponsor COORDENADOR com secretariat=cliente deve ter capabilities operacionais', async () => {
    const { getCppdCapabilities } = await import('./services/cppdPermissions');
    const member = makeMember({ status: 'ativo', isCoordinator: true });
    const caps = getCppdCapabilities(makeUser('sponsor'), member, { model: 'cliente' });
    expect(caps.canCreateMeeting).toBe(true);
    expect(caps.canEditAgenda).toBe(true);
    expect(caps.canGenerateMinutes).toBe(true);
    expect(caps.canApproveMinutes).toBe(true);
    expect(caps.canSendInvitations).toBe(true);
    expect(caps.canManageAttendance).toBe(true);
  });

  it('dpo_interno SEM membro deve ter somente read-only (v2)', async () => {
    const { getCppdCapabilities } = await import('./services/cppdPermissions');
    const caps = getCppdCapabilities(makeUser('dpo_interno'));
    // DPO sem membro: read-only
    expect(caps.canViewSponsorOverview).toBe(true);
    expect(caps.canViewOwnTasks).toBe(true);
    expect(caps.canDownloadFromGed).toBe(true);
    // NÃO pode operar sem ser membro
    expect(caps.canApproveMinutes).toBe(false);
    expect(caps.canConfigureCppd).toBe(false);
    expect(caps.canCreateMeeting).toBe(false);
  });

  it('usuário comum sem membro ativo NÃO deve ter capabilities de gestão', async () => {
    const { getCppdCapabilities } = await import('./services/cppdPermissions');
    const caps = getCppdCapabilities(makeUser('usuario'));
    expect(caps.canConfigureCppd).toBe(false);
    expect(caps.canManageMembers).toBe(false);
    expect(caps.canCreateMeeting).toBe(false);
    expect(caps.canApproveMinutes).toBe(false);
    expect(caps.canDeleteAction).toBe(false);
    expect(caps.canRunOverdueCheck).toBe(false);
    expect(caps.canViewAuditTrail).toBe(false);
  });

  it('membro ativo do comitê deve ter capabilities de participação', async () => {
    const { getCppdCapabilities } = await import('./services/cppdPermissions');
    const member = makeMember({ status: 'ativo' });
    const caps = getCppdCapabilities(makeUser('usuario'), member);
    expect(caps.canCreateAction).toBe(true);
    expect(caps.canUpdateActionStatus).toBe(true);
    expect(caps.canDownloadFromGed).toBe(true);
    expect(caps.canViewOwnTasks).toBe(true);
    // Membro ativo NÃO pode configurar
    expect(caps.canConfigureCppd).toBe(false);
    expect(caps.canManageMembers).toBe(false);
    expect(caps.canDeleteAction).toBe(false);
  });

  it('secretária com secretariat=seusdados deve ter somente capabilities base de membro (v2)', async () => {
    const { getCppdCapabilities } = await import('./services/cppdPermissions');
    const member = makeMember({ status: 'ativo', isSecretary: true });
    // secretariat default = seusdados → secretária não opera
    const caps = getCppdCapabilities(makeUser('usuario'), member);
    expect(caps.canCreateAction).toBe(true);
    expect(caps.canUpdateActionStatus).toBe(true);
    expect(caps.canViewAuditTrail).toBe(true); // SECRETARIO_CPPD
    // NÃO pode operar (secretariat != cliente)
    expect(caps.canCreateMeeting).toBe(false);
    expect(caps.canEditAgenda).toBe(false);
  });

  it('secretária com secretariat=cliente deve ter capabilities operacionais completas (v2)', async () => {
    const { getCppdCapabilities } = await import('./services/cppdPermissions');
    const member = makeMember({ status: 'ativo', isSecretary: true });
    const caps = getCppdCapabilities(makeUser('usuario'), member, { model: 'cliente' });
    expect(caps.canCreateMeeting).toBe(true);
    expect(caps.canEditAgenda).toBe(true);
    expect(caps.canGenerateMinutes).toBe(true);
    expect(caps.canSendInvitations).toBe(true);
    expect(caps.canStoreInGed).toBe(true);
    expect(caps.canManageAttendance).toBe(true);
    expect(caps.canTranscribeMeeting).toBe(true);
  });

  it('coordenador com secretariat=seusdados deve ter somente capabilities base (v2)', async () => {
    const { getCppdCapabilities } = await import('./services/cppdPermissions');
    const member = makeMember({ status: 'ativo', isCoordinator: true });
    const caps = getCppdCapabilities(makeUser('usuario'), member);
    expect(caps.canCreateAction).toBe(true);
    expect(caps.canViewAuditTrail).toBe(true); // COORDENADOR_CPPD
    // NÃO pode operar (secretariat = seusdados)
    expect(caps.canCreateMeeting).toBe(false);
  });

  it('coordenador com secretariat=cliente deve ter capabilities de gestão completas (v2)', async () => {
    const { getCppdCapabilities } = await import('./services/cppdPermissions');
    const member = makeMember({ status: 'ativo', isCoordinator: true });
    const caps = getCppdCapabilities(makeUser('usuario'), member, { model: 'cliente' });
    expect(caps.canCreateMeeting).toBe(true);
    expect(caps.canEditAgenda).toBe(true);
    expect(caps.canGenerateMinutes).toBe(true);
    expect(caps.canSendInvitations).toBe(true);
    expect(caps.canViewAuditTrail).toBe(true);
    expect(caps.canManageAttendance).toBe(true);
  });

  it('membro DPO do comitê (secretariat=seusdados) deve ter capabilities base de membro (v2)', async () => {
    const { getCppdCapabilities } = await import('./services/cppdPermissions');
    const member = makeMember({ status: 'ativo', isDpo: true, roleInCommittee: 'dpo' });
    const caps = getCppdCapabilities(makeUser('usuario'), member);
    // Membro DPO sem secretariat=cliente: capabilities base
    expect(caps.canCreateAction).toBe(true);
    expect(caps.canUpdateActionStatus).toBe(true);
    expect(caps.canDownloadFromGed).toBe(true);
    // NÃO pode aprovar sem secretariat=cliente
    expect(caps.canApproveMinutes).toBe(false);
  });

  it('membro inativo NÃO deve ter capabilities de participação (v2)', async () => {
    const { getCppdCapabilities } = await import('./services/cppdPermissions');
    const member = makeMember({ status: 'inativo', isSecretary: true });
    const caps = getCppdCapabilities(makeUser('usuario'), member);
    // Mesmo sendo secretária, se inativo, não tem capabilities de membro
    expect(caps.canCreateMeeting).toBe(false);
    expect(caps.canCreateAction).toBe(false);
    // usuario com membro inativo: CLIENT_ROLES dá read-only
    expect(caps.canDownloadFromGed).toBe(true); // CLIENT_ROLE read-only
    expect(caps.canViewOwnTasks).toBe(true); // CLIENT_ROLE read-only
  });
});

// ─── B) GED Fallback ───

describe('GED Provider com Fallback', () => {
  beforeEach(async () => {
    const { clearGedProviderCache } = await import('./providers/ged/index');
    clearGedProviderCache();
  });

  it('deve retornar provider local quando Supabase não está configurado', async () => {
    // Sem SUPABASE_URL, deve cair para local
    const originalUrl = process.env.SUPABASE_URL;
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const { getGedProvider, clearGedProviderCache } = await import('./providers/ged/index');
    clearGedProviderCache();

    const provider = getGedProvider({ provider: 'supabase', basePath: 'test/' });
    // Quando Supabase não está configurado, deve ser provider local
    expect(provider.name).toBe('local');

    // Restaurar
    if (originalUrl) process.env.SUPABASE_URL = originalUrl;
    if (originalKey) process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  it('deve usar bucket parametrizável via CPPD_SUPABASE_BUCKET', async () => {
    const { getCppdBucketName } = await import('./providers/ged/index');

    // Default
    const originalBucket = process.env.CPPD_SUPABASE_BUCKET;
    delete process.env.CPPD_SUPABASE_BUCKET;
    expect(getCppdBucketName()).toBe('cppd-documents');

    // Customizado
    process.env.CPPD_SUPABASE_BUCKET = 'meu-bucket-custom';
    expect(getCppdBucketName()).toBe('meu-bucket-custom');

    // Restaurar
    if (originalBucket) {
      process.env.CPPD_SUPABASE_BUCKET = originalBucket;
    } else {
      delete process.env.CPPD_SUPABASE_BUCKET;
    }
  });

  it('deve retornar noop para provider desconhecido', async () => {
    const { getGedProvider, clearGedProviderCache } = await import('./providers/ged/index');
    clearGedProviderCache();

    const provider = getGedProvider({ provider: 'noop' as any, basePath: 'test/' });
    expect(provider.name).toBe('noop');
  });

  it('buildCppdGedPaths deve gerar caminhos corretos', async () => {
    const { buildCppdGedPaths } = await import('./providers/ged/index');

    const paths = buildCppdGedPaths(42, 2026);
    expect(paths.root).toBe('organizations/org-42/cppd/2026/');
    expect(paths.atas).toBe('organizations/org-42/cppd/2026/atas/');
    expect(paths.deliberacoes).toBe('organizations/org-42/cppd/2026/deliberacoes/');
    expect(paths.gravacoes).toBe('organizations/org-42/cppd/2026/gravacoes/');
    expect(paths.planoAcao).toBe('organizations/org-42/cppd/2026/plano-acao/');
    expect(paths.ataFile(3)).toBe('organizations/org-42/cppd/2026/atas/ata_reuniao_03.pdf');
    expect(paths.ataFile(12, 'md')).toBe('organizations/org-42/cppd/2026/atas/ata_reuniao_12.md');
  });
});

// ─── C) ICS Validation ───

describe('Geração de Arquivo ICS', () => {
  it('deve conter DTSTART, DTEND, UID, SUMMARY obrigatórios', async () => {
    const { buildMeetingIcs } = await import('./utils/ics');

    const ics = buildMeetingIcs({
      uid: 'cppd-org1-meeting42@seusdados.com',
      title: 'Reunião Ordinária CPPD',
      description: 'Pauta: aprovação da ata anterior, informes, deliberações',
      startDate: new Date('2026-03-15T14:00:00Z'),
      endDate: new Date('2026-03-15T16:00:00Z'),
      organizerName: 'Maria Silva',
      organizerEmail: 'dpo@empresa.com',
    });

    expect(ics).toContain('DTSTART:');
    expect(ics).toContain('DTEND:');
    expect(ics).toContain('UID:cppd-org1-meeting42@seusdados.com');
    expect(ics).toContain('SUMMARY:');
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('METHOD:REQUEST');
    expect(ics).toContain('PRODID:-//Seusdados//CPPD Governanca//PT-BR');
  });

  it('deve conter pelo menos 1 ATTENDEE quando participantes são fornecidos', async () => {
    const { buildMeetingIcs } = await import('./utils/ics');

    const ics = buildMeetingIcs({
      uid: 'cppd-org1-meeting43@seusdados.com',
      title: 'Reunião Extraordinária CPPD',
      description: 'Análise de incidente',
      startDate: new Date('2026-04-01T10:00:00Z'),
      endDate: new Date('2026-04-01T11:30:00Z'),
      organizerName: 'João Santos',
      organizerEmail: 'sponsor@empresa.com',
      attendees: [
        { name: 'Maria Silva', email: 'dpo@empresa.com', role: 'CHAIR' },
        { name: 'Ana Costa', email: 'juridico@empresa.com', role: 'REQ-PARTICIPANT' },
        { name: 'Pedro Lima', email: 'ti@empresa.com' },
      ],
    });

    // Unfold ICS lines (RFC 5545: CRLF + space = continuation)
    const unfolded = ics.replace(/\r\n /g, '');
    const attendeeCount = (unfolded.match(/ATTENDEE;/g) || []).length;
    expect(attendeeCount).toBe(3);
    expect(unfolded).toContain('ATTENDEE;ROLE=CHAIR');
    expect(unfolded).toContain('ATTENDEE;ROLE=REQ-PARTICIPANT');
    expect(unfolded).toContain('mailto:dpo@empresa.com');
    expect(unfolded).toContain('mailto:juridico@empresa.com');
    expect(unfolded).toContain('mailto:ti@empresa.com');  });

  it('deve conter VALARM (lembrete) por padrão', async () => {
    const { buildMeetingIcs } = await import('./utils/ics');

    const ics = buildMeetingIcs({
      uid: 'test-alarm@seusdados.com',
      title: 'Teste Alarme',
      description: 'Verificar alarme',
      startDate: new Date('2026-05-01T09:00:00Z'),
      endDate: new Date('2026-05-01T10:00:00Z'),
      organizerName: 'Teste',
      organizerEmail: 'teste@test.com',
    });

    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('END:VALARM');
    expect(ics).toContain('TRIGGER:-PT30M'); // 30 min default
  });

  it('deve suportar STATUS:CANCELLED para cancelamentos', async () => {
    const { buildMeetingIcs } = await import('./utils/ics');

    const ics = buildMeetingIcs({
      uid: 'test-cancel@seusdados.com',
      title: 'Reunião Cancelada',
      description: 'Cancelamento',
      startDate: new Date('2026-06-01T09:00:00Z'),
      endDate: new Date('2026-06-01T10:00:00Z'),
      organizerName: 'Teste',
      organizerEmail: 'teste@test.com',
      status: 'CANCELLED',
      sequence: 1,
    });

    expect(ics).toContain('STATUS:CANCELLED');
    expect(ics).toContain('SEQUENCE:1');
  });

  it('generateMeetingIcsUid deve gerar UID no formato correto', async () => {
    const { generateMeetingIcsUid } = await import('./utils/ics');

    const uid = generateMeetingIcsUid(5, 42);
    expect(uid).toBe('cppd-org5-meeting42@seusdados.com');
  });
});


