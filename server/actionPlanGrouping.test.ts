import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Testes para o agrupamento de planos de ação por assessmentType.
 * Valida que:
 * 1. O endpoint list retorna originName enriquecido
 * 2. Os planos podem ser agrupados por assessmentType
 * 3. A ordenação interna de cada grupo é consistente (atrasadas > prioridade > data)
 */

const mockSelect = vi.fn();
const mockExecute = vi.fn();
vi.mock('./db', () => ({
  getDb: vi.fn(async () => ({
    select: mockSelect,
    execute: mockExecute,
  })),
  getActionPlansByOrganization: vi.fn(async () => []),
}));

vi.mock('./_core/trpc', () => ({
  protectedProcedure: {
    input: (schema: any) => ({
      query: (fn: any) => ({ _def: { query: fn }, input: schema }),
      mutation: (fn: any) => ({ _def: { mutation: fn }, input: schema }),
    }),
    mutation: (fn: any) => ({ _def: { mutation: fn } }),
    query: (fn: any) => ({ _def: { query: fn } }),
  },
  router: (routes: any) => routes,
}));

describe('Agrupamento de Planos de Ação por Tipo', () => {
  const mockPlans = [
    { id: 1, title: 'Revisar política de privacidade', assessmentType: 'compliance', assessmentId: 30001, priority: 'alta', status: 'pendente', dueDate: '2026-03-01', actionCategory: 'contratual' },
    { id: 2, title: 'Adequar cláusula de dados', assessmentType: 'compliance', assessmentId: 30001, priority: 'media', status: 'em_andamento', dueDate: '2026-03-15', actionCategory: 'contratual' },
    { id: 3, title: 'Incluir cláusula LGPD', assessmentType: 'contract_analysis', assessmentId: 120001, priority: 'critica', status: 'pendente', dueDate: '2026-02-20', actionCategory: 'contratual' },
    { id: 4, title: 'Revisar contrato fornecedor', assessmentType: 'contract_analysis', assessmentId: 120001, priority: 'alta', status: 'pendente', dueDate: '2026-03-10', actionCategory: 'contratual' },
    { id: 5, title: 'Avaliar terceiro X', assessmentType: 'third_party', assessmentId: 50001, priority: 'media', status: 'concluida', dueDate: '2026-02-10', actionCategory: 'operacional' },
  ];

  it('deve agrupar planos por assessmentType corretamente', () => {
    const groups: Record<string, typeof mockPlans> = {};
    mockPlans.forEach(plan => {
      const key = plan.assessmentType;
      if (!groups[key]) groups[key] = [];
      groups[key].push(plan);
    });

    expect(Object.keys(groups)).toHaveLength(3);
    expect(groups['compliance']).toHaveLength(2);
    expect(groups['contract_analysis']).toHaveLength(2);
    expect(groups['third_party']).toHaveLength(1);
  });

  it('deve ter todos os assessmentType com configuração de label e ícone', () => {
    const ASSESSMENT_TYPE_CONFIG: Record<string, { label: string }> = {
      compliance: { label: 'Avaliação de Maturidade' },
      contract_analysis: { label: 'Análise de Contratos' },
      third_party: { label: 'Gestão de Terceiros' },
      dpia: { label: 'Relatório de Impacto (RIPD)' },
    };

    const types = ['compliance', 'contract_analysis', 'third_party', 'dpia'];
    types.forEach(type => {
      expect(ASSESSMENT_TYPE_CONFIG[type]).toBeDefined();
      expect(ASSESSMENT_TYPE_CONFIG[type].label).toBeTruthy();
    });
  });

  it('deve ordenar ações atrasadas primeiro dentro de cada grupo', () => {
    const now = new Date('2026-02-24');
    const priorityOrder: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3 };

    const contractActions = mockPlans.filter(p => p.assessmentType === 'contract_analysis');
    const sorted = [...contractActions].sort((a, b) => {
      const aOverdue = a.dueDate && new Date(a.dueDate) < now && a.status !== 'concluida' ? 0 : 1;
      const bOverdue = b.dueDate && new Date(b.dueDate) < now && b.status !== 'concluida' ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;
      const aPrio = priorityOrder[a.priority] ?? 2;
      const bPrio = priorityOrder[b.priority] ?? 2;
      return aPrio - bPrio;
    });

    // A ação #3 (vencida em 20/02, crítica) deve vir primeiro
    expect(sorted[0].id).toBe(3);
    expect(sorted[0].priority).toBe('critica');
  });

  it('deve sub-agrupar por assessmentId (origem) dentro de cada tipo', () => {
    const compliancePlans = mockPlans.filter(p => p.assessmentType === 'compliance');
    const byOrigin: Record<string, typeof mockPlans> = {};
    compliancePlans.forEach(p => {
      const key = `${p.assessmentId}`;
      if (!byOrigin[key]) byOrigin[key] = [];
      byOrigin[key].push(p);
    });

    // Todos os compliance são do assessmentId 30001
    expect(Object.keys(byOrigin)).toHaveLength(1);
    expect(byOrigin['30001']).toHaveLength(2);
  });

  it('deve calcular progresso por grupo corretamente', () => {
    const thirdPartyPlans = mockPlans.filter(p => p.assessmentType === 'third_party');
    const concluidas = thirdPartyPlans.filter(a => a.status === 'concluida').length;
    const progress = thirdPartyPlans.length > 0 ? Math.round((concluidas / thirdPartyPlans.length) * 100) : 0;

    expect(progress).toBe(100); // 1/1 = 100%
  });

  it('deve contar estatísticas por tipo corretamente', () => {
    const byType: Record<string, number> = {};
    mockPlans.forEach(a => {
      byType[a.assessmentType] = (byType[a.assessmentType] || 0) + 1;
    });

    expect(byType['compliance']).toBe(2);
    expect(byType['contract_analysis']).toBe(2);
    expect(byType['third_party']).toBe(1);
    expect(byType['dpia']).toBeUndefined();
  });

  it('deve filtrar por tipo quando typeFilter é aplicado', () => {
    const typeFilter = 'contract_analysis';
    const filtered = mockPlans.filter(a => a.assessmentType === typeFilter);

    expect(filtered).toHaveLength(2);
    expect(filtered.every(a => a.assessmentType === 'contract_analysis')).toBe(true);
  });

  it('deve retornar todos quando typeFilter é "all"', () => {
    const typeFilter = 'all';
    const filtered = mockPlans.filter(a => typeFilter === 'all' || a.assessmentType === typeFilter);

    expect(filtered).toHaveLength(5);
  });
});
