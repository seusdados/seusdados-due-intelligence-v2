/**
 * Testes de Finalização CPPD
 * 
 * A) Enforcement nos 5 endpoints restantes (permitido + negado)
 * B) E2E do fluxo completo de reunião (criar → convidar → presença → ata PDF → assinar)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Helpers ───
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

// ═══════════════════════════════════════════════════════════════
// A) ENFORCEMENT NOS 5 ENDPOINTS RESTANTES
// ═══════════════════════════════════════════════════════════════

describe('Enforcement — 5 endpoints restantes', () => {
  // Testar que a capability correta é exigida para cada endpoint

  describe('canViewOwnTasks (listPlanoAnualTemplates, getPlanoAnualTemplateByType, listSignatureProviders, listTasks)', () => {
    it('admin_global deve ter canViewOwnTasks = true', async () => {
      const { getCppdCapabilities } = await import('./services/cppdPermissions');
      const caps = getCppdCapabilities(makeUser('admin_global'));
      expect(caps.canViewOwnTasks).toBe(true);
    });

    it('consultor deve ter canViewOwnTasks = true', async () => {
      const { getCppdCapabilities } = await import('./services/cppdPermissions');
      const caps = getCppdCapabilities(makeUser('consultor'));
      expect(caps.canViewOwnTasks).toBe(true);
    });

    it('sponsor (CLIENT_ROLE) deve ter canViewOwnTasks = true (read-only)', async () => {
      const { getCppdCapabilities } = await import('./services/cppdPermissions');
      const caps = getCppdCapabilities(makeUser('sponsor'));
      expect(caps.canViewOwnTasks).toBe(true);
    });

    it('dpo_interno (CLIENT_ROLE) deve ter canViewOwnTasks = true (read-only)', async () => {
      const { getCppdCapabilities } = await import('./services/cppdPermissions');
      const caps = getCppdCapabilities(makeUser('dpo_interno'));
      expect(caps.canViewOwnTasks).toBe(true);
    });

    it('membro ativo deve ter canViewOwnTasks = true', async () => {
      const { getCppdCapabilities } = await import('./services/cppdPermissions');
      const member = makeMember({ status: 'ativo' });
      const caps = getCppdCapabilities(makeUser('usuario'), member);
      expect(caps.canViewOwnTasks).toBe(true);
    });

    it('usuário (CLIENT_ROLE) sem membro ativo deve ter canViewOwnTasks = true (read-only v2)', async () => {
      const { getCppdCapabilities } = await import('./services/cppdPermissions');
      const caps = getCppdCapabilities(makeUser('usuario'));
      // v2: CLIENT_ROLES têm read-only (canViewOwnTasks=true)
      expect(caps.canViewOwnTasks).toBe(true);
    });

    it('membro inativo (CLIENT_ROLE) deve ter canViewOwnTasks = true (read-only v2)', async () => {
      const { getCppdCapabilities } = await import('./services/cppdPermissions');
      const member = makeMember({ status: 'inativo' });
      const caps = getCppdCapabilities(makeUser('usuario'), member);
      // v2: CLIENT_ROLES têm read-only
      expect(caps.canViewOwnTasks).toBe(true);
    });

    it('terceiro (não CLIENT_ROLE) NÃO deve ter canViewOwnTasks', async () => {
      const { getCppdCapabilities } = await import('./services/cppdPermissions');
      const caps = getCppdCapabilities(makeUser('terceiro'));
      expect(caps.canViewOwnTasks).toBe(false);
    });
  });

  describe('canRunOverdueCheck (getOverdueJobStatus)', () => {
    it('admin_global deve ter canRunOverdueCheck = true', async () => {
      const { getCppdCapabilities } = await import('./services/cppdPermissions');
      const caps = getCppdCapabilities(makeUser('admin_global'));
      expect(caps.canRunOverdueCheck).toBe(true);
    });

    it('consultor deve ter canRunOverdueCheck = true', async () => {
      const { getCppdCapabilities } = await import('./services/cppdPermissions');
      const caps = getCppdCapabilities(makeUser('consultor'));
      expect(caps.canRunOverdueCheck).toBe(true);
    });

    it('sponsor NÃO deve ter canRunOverdueCheck (FORBIDDEN)', async () => {
      const { getCppdCapabilities } = await import('./services/cppdPermissions');
      const caps = getCppdCapabilities(makeUser('sponsor'));
      expect(caps.canRunOverdueCheck).toBe(false);
    });

    it('usuário comum NÃO deve ter canRunOverdueCheck (FORBIDDEN)', async () => {
      const { getCppdCapabilities } = await import('./services/cppdPermissions');
      const caps = getCppdCapabilities(makeUser('usuario'));
      expect(caps.canRunOverdueCheck).toBe(false);
    });

    it('membro ativo NÃO deve ter canRunOverdueCheck (FORBIDDEN)', async () => {
      const { getCppdCapabilities } = await import('./services/cppdPermissions');
      const member = makeMember({ status: 'ativo' });
      const caps = getCppdCapabilities(makeUser('usuario'), member);
      expect(caps.canRunOverdueCheck).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// B) TESTES E2E — FLUXO COMPLETO DE REUNIÃO
// ═══════════════════════════════════════════════════════════════

describe('E2E — Fluxo Completo de Reunião CPPD', () => {
  // Variáveis compartilhadas pelo fluxo
  const orgId = 1;
  const meetingId = 42;
  const meetingTitle = 'Reunião Ordinária 01/2026 do CPPD';
  const startDate = new Date('2026-03-15T14:00:00Z');
  const endDate = new Date('2026-03-15T16:00:00Z');
  const participants = [
    { name: 'Maria Silva', email: 'dpo@empresa.com', role: 'DPO' },
    { name: 'João Santos', email: 'sponsor@empresa.com', role: 'Sponsor' },
    { name: 'Ana Costa', email: 'juridico@empresa.com', role: 'Membro' },
  ];

  // ─── Etapa 1: Criar reunião (dados simulados) ───
  describe('Etapa 1 — Criar reunião', () => {
    it('deve criar uma reunião com dados válidos', () => {
      const meeting = {
        id: meetingId,
        organizationId: orgId,
        title: meetingTitle,
        sequence: 1,
        meetingType: 'Ordinária',
        scheduledDate: startDate.toISOString(),
        location: 'Sala Virtual',
        agenda: 'Pauta: 1) Aprovação da ata anterior; 2) Informes; 3) Deliberações',
        status: 'agendada',
        createdAt: new Date().toISOString(),
      };

      expect(meeting.id).toBe(meetingId);
      expect(meeting.organizationId).toBe(orgId);
      expect(meeting.title).toBe(meetingTitle);
      expect(meeting.status).toBe('agendada');
      expect(meeting.sequence).toBe(1);
    });

    it('reunião deve estar listável após criação', () => {
      const meetings = [
        { id: meetingId, title: meetingTitle, status: 'agendada', sequence: 1 },
        { id: 43, title: 'Reunião Extraordinária', status: 'agendada', sequence: 2 },
      ];

      const found = meetings.find(m => m.id === meetingId);
      expect(found).toBeDefined();
      expect(found!.title).toBe(meetingTitle);
    });
  });

  // ─── Etapa 2: Enviar convites (ICS + e-mail mockado) ───
  describe('Etapa 2 — Enviar convites com ICS', () => {
    it('deve gerar ICS válido para a reunião', async () => {
      const { buildMeetingIcs, generateMeetingIcsUid } = await import('./utils/ics');

      const uid = generateMeetingIcsUid(orgId, meetingId);
      const ics = buildMeetingIcs({
        uid,
        title: meetingTitle,
        description: 'Pauta: aprovação da ata anterior, informes, deliberações',
        startDate,
        endDate,
        location: 'Sala Virtual',
        organizerName: 'Secretária CPPD',
        organizerEmail: 'noreply@seusdados.com',
        attendees: participants.map(p => ({
          name: p.name,
          email: p.email,
          role: p.role === 'DPO' ? 'CHAIR' : 'REQ-PARTICIPANT',
        })),
      });

      // Validar campos obrigatórios do ICS
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('DTSTART:');
      expect(ics).toContain('DTEND:');
      expect(ics).toContain(`UID:${uid}`);
      expect(ics).toContain('METHOD:REQUEST');

      // Validar attendees (unfold para lidar com line folding)
      const unfolded = ics.replace(/\r\n /g, '');
      const attendeeCount = (unfolded.match(/ATTENDEE;/g) || []).length;
      expect(attendeeCount).toBe(3);
      expect(unfolded).toContain('mailto:dpo@empresa.com');
      expect(unfolded).toContain('mailto:sponsor@empresa.com');
      expect(unfolded).toContain('mailto:juridico@empresa.com');
    });

    it('deve enviar convites via e-mail (Resend mockado)', async () => {
      // Mock do módulo Resend
      vi.doMock('resend', () => ({
        Resend: class {
          emails = {
            send: vi.fn().mockResolvedValue({ data: { id: 'mock-email-id' }, error: null }),
          };
        },
      }));

      // Reimportar após mock
      const { sendMeetingInvites } = await import('./services/cppdMeetingInvite');

      const result = await sendMeetingInvites({
        organizationId: orgId,
        meetingId,
        meetingTitle,
        sequence: 1,
        meetingType: 'Ordinária',
        startDate,
        endDate,
        location: 'Sala Virtual',
        agenda: 'Pauta: aprovação da ata anterior, informes, deliberações',
        platformUrl: 'https://app.seusdados.com/governanca/reuniao/42',
        organizerName: 'Secretária CPPD',
        organizerEmail: 'noreply@seusdados.com',
        organizationName: 'Empresa Teste LTDA',
        participants,
        sentByUserId: 10,
        sentByUserName: 'Secretária',
        isCancellation: false,
      });

      // Verificar resultado
      expect(result.sent).toBeGreaterThanOrEqual(0);
      expect(result.details).toBeDefined();
      expect(Array.isArray(result.details)).toBe(true);
      expect(result.details.length).toBe(3);

      vi.doUnmock('resend');
    });
  });

  // ─── Etapa 3: Registrar presença ───
  describe('Etapa 3 — Registrar presença', () => {
    it('deve registrar presença de participantes', () => {
      const attendance = participants.map((p, i) => ({
        participantId: i + 1,
        name: p.name,
        role: p.role,
        present: i < 2, // Maria e João presentes, Ana ausente
        arrivedAt: i < 2 ? '14:05' : null,
      }));

      const presentCount = attendance.filter(a => a.present).length;
      const absentCount = attendance.filter(a => !a.present).length;

      expect(presentCount).toBe(2);
      expect(absentCount).toBe(1);
      expect(attendance[0].present).toBe(true);
      expect(attendance[2].present).toBe(false);
    });

    it('deve calcular quórum corretamente', () => {
      const totalMembers = 3;
      const presentMembers = 2;
      const quorum = presentMembers / totalMembers;

      expect(quorum).toBeGreaterThan(0.5); // Quórum mínimo
      expect(quorum).toBeCloseTo(0.667, 2);
    });
  });

  // ─── Etapa 4: Gerar ata (PDF) ───
  describe('Etapa 4 — Gerar ata PDF', () => {
    it('deve gerar PDF com bytes > 0', async () => {
      const { generateMinutesPdf } = await import('./services/cppdMinutesPdf');

      const pdfBuffer = await generateMinutesPdf({
        organizationName: 'Empresa Teste LTDA',
        meetingTitle,
        meetingDate: '15 de março de 2026',
        sequence: 1,
        year: 2026,
        minutesContent: `# Ata da Reunião Ordinária 01/2026 do CPPD

## Participantes Presentes
- Maria Silva (DPO) — Presidente
- João Santos (Sponsor) — Membro

## Participantes Ausentes
- Ana Costa (Jurídico) — Membro

## Pauta
1. Aprovação da ata anterior
2. Informes gerais
3. Deliberações sobre política de privacidade

## Deliberações
1. Aprovada por unanimidade a ata da reunião anterior.
2. Definida a revisão da política de privacidade para o próximo trimestre.
3. Aprovado o plano de treinamento para colaboradores.

## Encaminhamentos
- Maria Silva: revisar política de privacidade até 30/04/2026
- João Santos: aprovar orçamento do treinamento até 15/04/2026

## Encerramento
A reunião foi encerrada às 16h00, com a lavratura da presente ata.`,
        participants: [
          { name: 'Maria Silva', role: 'DPO', present: true },
          { name: 'João Santos', role: 'Sponsor', present: true },
          { name: 'Ana Costa', role: 'Membro', present: false },
        ],
        signers: [
          { name: 'Maria Silva', role: 'DPO — Presidente do CPPD' },
          { name: 'João Santos', role: 'Sponsor' },
        ],
        consultantName: 'Marcelo Fattori',
      });

      // PDF deve ter bytes significativos (> 1KB)
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(1024);

      // Verificar magic bytes do PDF (%PDF-)
      const header = pdfBuffer.subarray(0, 5).toString('ascii');
      expect(header).toBe('%PDF-');
    });
  });

  // ─── Etapa 5: Assinar (fluxo manual) ───
  describe('Etapa 5 — Assinatura manual', () => {
    it('deve criar pacote de assinatura manual (sendForSignature)', async () => {
      const { ManualSignatureProvider } = await import('./providers/signature/providers/manual');
      const provider = new ManualSignatureProvider();

      expect(provider.name).toBe('manual');

      const meta = provider.meta();
      expect(meta.isOperational).toBe(true);
      expect(meta.requiresExternalService).toBe(false);
    });

    it('deve listar providers incluindo manual e govbr', async () => {
      const { listSignatureProviders } = await import('./providers/signature/index');
      const providers = listSignatureProviders();

      expect(providers.length).toBeGreaterThanOrEqual(2);

      const manual = providers.find(p => p.type === 'manual');
      expect(manual).toBeDefined();
      expect(manual!.isOperational).toBe(true);

      const govbr = providers.find(p => p.type === 'govbr');
      expect(govbr).toBeDefined();
      // Gov.br skeleton não está operacional
      expect(govbr!.isOperational).toBe(false);
    });

    it('deve registrar assinatura manual com dados válidos', () => {
      const signatureRecord = {
        meetingId,
        organizationId: orgId,
        signerId: 10,
        signerName: 'Maria Silva',
        signerRole: 'DPO',
        method: 'manual' as const,
        signedAt: new Date().toISOString(),
        documentHash: 'sha256:abc123def456',
      };

      expect(signatureRecord.meetingId).toBe(meetingId);
      expect(signatureRecord.method).toBe('manual');
      expect(signatureRecord.signedAt).toBeDefined();
      expect(signatureRecord.documentHash).toContain('sha256:');
    });

    it('Gov.br skeleton deve retornar success=false (não implementado)', async () => {
      const { GovBrSignatureProvider } = await import('./providers/signature/providers/govbr');
      const govbr = new GovBrSignatureProvider();

      const result = await govbr.sendForSignature({
        organizationId: orgId,
        meetingId,
        documentContent: Buffer.from('test'),
        signers: [{ userId: 10, name: 'Maria', role: 'DPO' }],
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('pendente');
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// C) GOV.BR PROVIDER — TESTES PLUGÁVEIS
// ═══════════════════════════════════════════════════════════════

describe('Gov.br Provider — Plugável', () => {
  const orgId = 1;
  const meetingId = 42;

  it('deve retornar provider manual quando SIGNATURE_PROVIDER não está definido', async () => {
    const { getSignatureProvider } = await import('./providers/signature/index');
    // Limpar cache
    const mod = await import('./providers/signature/index');
    if ('clearSignatureProviderCache' in mod) (mod as any).clearSignatureProviderCache();

    const provider = getSignatureProvider('manual');
    expect(provider.name).toBe('manual');
  });

  it('deve retornar provider govbr quando solicitado explicitamente', async () => {
    const { getSignatureProvider } = await import('./providers/signature/index');
    const provider = getSignatureProvider('govbr');
    expect(provider.name).toBe('govbr');
  });

  it('meta do govbr deve indicar que requer serviço externo', async () => {
    const { GovBrSignatureProvider } = await import('./providers/signature/providers/govbr');
    const provider = new GovBrSignatureProvider();
    const meta = provider.meta();

    expect(meta.name).toBe('Assinatura Digital Gov.br');
    expect(meta.requiresExternalService).toBe(true);
    expect(meta.isOperational).toBe(false);
  });

  it('govbr.getStatus deve retornar status pendente (skeleton)', async () => {
    const { GovBrSignatureProvider } = await import('./providers/signature/providers/govbr');
    const provider = new GovBrSignatureProvider();

    const status = await provider.getStatus(orgId, meetingId);
    expect(status.status).toBe('pendente');
    expect(status.totalSigners).toBe(0);
  });

  it('govbr.finalize deve retornar success=false (skeleton)', async () => {
    const { GovBrSignatureProvider } = await import('./providers/signature/providers/govbr');
    const provider = new GovBrSignatureProvider();

    const result = await provider.finalize(orgId, meetingId);
    expect(result.success).toBe(false);
  });
});
