/**
 * Testes de segurança e autorização do fluxo de Maturidade V1
 * Cobre: tenant isolation, role checks, domain assignment checks
 */
import { describe, it, expect } from 'vitest';

// ─── Helpers de simulação ────────────────────────────────────────────────────

function makeUser(role: string, orgId: number | null = 1) {
  return { id: 1, role, organizationId: orgId, name: 'Teste', email: 'teste@teste.com' };
}

function makeAssessment(orgId: number) {
  return { id: 10, organizationId: orgId, status: 'concluida', framework: 'seusdados' };
}

// ─── Lógica extraída do assessmentsRouter (pura, sem DB) ─────────────────────

function canCreateAssessment(role: string): boolean {
  return ['admin_global', 'consultor'].includes(role);
}

function canGetAssessment(user: ReturnType<typeof makeUser>, assessment: ReturnType<typeof makeAssessment>): boolean {
  const isInternal = ['admin_global', 'consultor'].includes(user.role);
  if (isInternal) return true;
  if (user.organizationId && assessment.organizationId !== user.organizationId) return false;
  return true;
}

function canGenerateActionPlan(user: ReturnType<typeof makeUser>, assessment: ReturnType<typeof makeAssessment>): { ok: boolean; reason?: string } {
  const canGenerate = ['admin_global', 'consultor', 'sponsor'].includes(user.role);
  if (!canGenerate) return { ok: false, reason: 'FORBIDDEN_ROLE' };
  const isInternal = ['admin_global', 'consultor'].includes(user.role);
  if (!isInternal && user.organizationId && assessment.organizationId !== user.organizationId) {
    return { ok: false, reason: 'FORBIDDEN_TENANT' };
  }
  return { ok: true };
}

function canUploadEvidence(
  user: ReturnType<typeof makeUser>,
  questionId: string,
  assignments: Array<{ domainId: string; userId: number }>
): { ok: boolean; reason?: string } {
  const isInternal = ['admin_global', 'consultor'].includes(user.role);
  if (isInternal) return { ok: true };
  const domainId = questionId.match(/^(IA-\d{2})/)?.[1];
  if (!domainId) return { ok: true }; // sem domínio identificável, deixar passar
  const assigned = assignments.some(a => a.domainId === domainId && a.userId === user.id);
  if (!assigned) return { ok: false, reason: 'FORBIDDEN_NOT_ASSIGNED' };
  return { ok: true };
}

function canDeleteActionPlanItem(role: string): boolean {
  return ['admin_global', 'consultor', 'admin'].includes(role);
}

// ─── Testes ──────────────────────────────────────────────────────────────────

describe('Maturidade V1 - Autorização: criar avaliação', () => {
  it('admin_global pode criar avaliação', () => {
    expect(canCreateAssessment('admin_global')).toBe(true);
  });
  it('consultor pode criar avaliação', () => {
    expect(canCreateAssessment('consultor')).toBe(true);
  });
  it('sponsor NÃO pode criar avaliação', () => {
    expect(canCreateAssessment('sponsor')).toBe(false);
  });
  it('comite NÃO pode criar avaliação', () => {
    expect(canCreateAssessment('comite')).toBe(false);
  });
  it('respondente NÃO pode criar avaliação', () => {
    expect(canCreateAssessment('respondente')).toBe(false);
  });
});

describe('Maturidade V1 - Isolamento multi-tenant: obter avaliação', () => {
  const assessment = makeAssessment(5);

  it('admin_global pode ver avaliação de qualquer organização', () => {
    const user = makeUser('admin_global', 99);
    expect(canGetAssessment(user, assessment)).toBe(true);
  });
  it('consultor pode ver avaliação de qualquer organização', () => {
    const user = makeUser('consultor', 99);
    expect(canGetAssessment(user, assessment)).toBe(true);
  });
  it('sponsor da mesma organização pode ver avaliação', () => {
    const user = makeUser('sponsor', 5);
    expect(canGetAssessment(user, assessment)).toBe(true);
  });
  it('sponsor de organização diferente NÃO pode ver avaliação', () => {
    const user = makeUser('sponsor', 99);
    expect(canGetAssessment(user, assessment)).toBe(false);
  });
  it('respondente da mesma organização pode ver avaliação', () => {
    const user = makeUser('respondente', 5);
    expect(canGetAssessment(user, assessment)).toBe(true);
  });
  it('respondente de organização diferente NÃO pode ver avaliação', () => {
    const user = makeUser('respondente', 99);
    expect(canGetAssessment(user, assessment)).toBe(false);
  });
});

describe('Maturidade V1 - Autorização: gerar plano de ação', () => {
  const assessment = makeAssessment(5);

  it('admin_global pode gerar plano de qualquer organização', () => {
    const user = makeUser('admin_global', 99);
    expect(canGenerateActionPlan(user, assessment)).toEqual({ ok: true });
  });
  it('consultor pode gerar plano de qualquer organização', () => {
    const user = makeUser('consultor', 99);
    expect(canGenerateActionPlan(user, assessment)).toEqual({ ok: true });
  });
  it('sponsor da mesma organização pode gerar plano', () => {
    const user = makeUser('sponsor', 5);
    expect(canGenerateActionPlan(user, assessment)).toEqual({ ok: true });
  });
  it('sponsor de organização diferente NÃO pode gerar plano', () => {
    const user = makeUser('sponsor', 99);
    const result = canGenerateActionPlan(user, assessment);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('FORBIDDEN_TENANT');
  });
  it('comite NÃO pode gerar plano (role insuficiente)', () => {
    const user = makeUser('comite', 5);
    const result = canGenerateActionPlan(user, assessment);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('FORBIDDEN_ROLE');
  });
  it('respondente NÃO pode gerar plano (role insuficiente)', () => {
    const user = makeUser('respondente', 5);
    const result = canGenerateActionPlan(user, assessment);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('FORBIDDEN_ROLE');
  });
});

describe('Maturidade V1 - Autorização: upload de evidência', () => {
  const assignments = [
    { domainId: 'IA-01', userId: 10 },
    { domainId: 'IA-02', userId: 20 },
  ];

  it('admin_global pode fazer upload em qualquer domínio', () => {
    const user = { ...makeUser('admin_global', 5), id: 99 };
    expect(canUploadEvidence(user, 'IA-01.Q01', assignments)).toEqual({ ok: true });
  });
  it('consultor pode fazer upload em qualquer domínio', () => {
    const user = { ...makeUser('consultor', 5), id: 99 };
    expect(canUploadEvidence(user, 'IA-03.Q01', assignments)).toEqual({ ok: true });
  });
  it('respondente atribuído ao domínio pode fazer upload', () => {
    const user = { ...makeUser('respondente', 5), id: 10 };
    expect(canUploadEvidence(user, 'IA-01.Q02', assignments)).toEqual({ ok: true });
  });
  it('respondente NÃO atribuído ao domínio NÃO pode fazer upload', () => {
    const user = { ...makeUser('respondente', 5), id: 10 };
    const result = canUploadEvidence(user, 'IA-02.Q01', assignments);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('FORBIDDEN_NOT_ASSIGNED');
  });
  it('respondente de domínio diferente NÃO pode fazer upload', () => {
    const user = { ...makeUser('respondente', 5), id: 10 };
    const result = canUploadEvidence(user, 'IA-03.Q01', assignments);
    expect(result.ok).toBe(false);
  });
});

describe('Maturidade V1 - Autorização: excluir item do plano de ação', () => {
  it('admin_global pode excluir', () => {
    expect(canDeleteActionPlanItem('admin_global')).toBe(true);
  });
  it('consultor pode excluir', () => {
    expect(canDeleteActionPlanItem('consultor')).toBe(true);
  });
  it('sponsor NÃO pode excluir', () => {
    expect(canDeleteActionPlanItem('sponsor')).toBe(false);
  });
  it('comite NÃO pode excluir', () => {
    expect(canDeleteActionPlanItem('comite')).toBe(false);
  });
  it('respondente NÃO pode excluir', () => {
    expect(canDeleteActionPlanItem('respondente')).toBe(false);
  });
});
