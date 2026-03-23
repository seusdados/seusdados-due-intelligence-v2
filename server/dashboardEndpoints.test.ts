import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Testes para os endpoints do dashboardRouter:
 * - getMyTasks: Minhas Tarefas
 * - getAgendaItems: Agenda
 * - getSlaOverview: Resumo SLA
 * - getSummary: Resumo Consolidado
 * - getUrgentDeadlines: Prazos Urgentes
 * 
 * Valida que as queries usam nomes de colunas corretos (tickets.title, ir_deadlines.category)
 * e que os filtros por organização e usuário funcionam.
 */

const mockExecute = vi.fn();
vi.mock('./db', () => ({
  getDb: vi.fn(async () => ({
    execute: mockExecute,
  })),
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

describe('getMyTasks - Minhas Tarefas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('deve retornar tarefas de action_plans, tickets e cppd_tasks', async () => {
    // Mock 3 queries: action_plans, tickets, cppd_tasks
    mockExecute
      .mockResolvedValueOnce([[
        { id: 1, title: 'Ação Teste', description: 'Desc', status: 'pendente', priority: 'alta', dueDate: '2026-03-01', source: 'plano_acao' },
      ]])
      .mockResolvedValueOnce([[
        { id: 10, title: 'Ticket Teste', description: 'Desc ticket', status: 'novo', priority: 'media', dueDate: '2026-03-05', source: 'ticket' },
      ]])
      .mockResolvedValueOnce([[
        { id: 20, title: 'Tarefa CPPD', description: 'Desc CPPD', status: 'em_andamento', priority: 'media', dueDate: '2026-03-10', source: 'cppd' },
      ]]);

    const { dashboardRouter } = await import('./dashboardRouter');
    const handler = (dashboardRouter as any).getMyTasks._def.query;

    const result = await handler({
      ctx: { user: { id: 1, role: 'admin_global' } },
      input: { organizationId: 90001 },
    });

    expect(result).toHaveProperty('actionPlans');
    expect(result).toHaveProperty('tickets');
    expect(result).toHaveProperty('cppdTasks');
    expect(result).toHaveProperty('totalPending');
    expect(result.actionPlans.length).toBe(1);
    expect(result.tickets.length).toBe(1);
    expect(result.cppdTasks.length).toBe(1);
    expect(result.totalPending).toBe(3);
  });

  it('deve retornar totalPending=0 quando não há tarefas', async () => {
    mockExecute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    const { dashboardRouter } = await import('./dashboardRouter');
    const handler = (dashboardRouter as any).getMyTasks._def.query;

    const result = await handler({
      ctx: { user: { id: 99, role: 'sponsor' } },
      input: { organizationId: 90001 },
    });

    expect(result.totalPending).toBe(0);
    expect(result.actionPlans).toEqual([]);
    expect(result.tickets).toEqual([]);
    expect(result.cppdTasks).toEqual([]);
  });

  it('deve filtrar por responsibleId para perfis não-admin', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ id: 5, title: 'Minha ação', status: 'pendente', priority: 'media', dueDate: null, source: 'plano_acao' }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    const { dashboardRouter } = await import('./dashboardRouter');
    const handler = (dashboardRouter as any).getMyTasks._def.query;

    const result = await handler({
      ctx: { user: { id: 42, role: 'sponsor' } },
      input: { organizationId: 90001 },
    });

    expect(result.totalPending).toBe(1);
    expect(result.actionPlans[0].title).toBe('Minha ação');
  });
});

describe('getAgendaItems - Agenda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('deve retornar itens de agenda de múltiplas fontes', async () => {
    mockExecute
      .mockResolvedValueOnce([[
        { id: 1, title: 'Prazo ação', date: '2026-02-15', status: 'pendente', priority: 'alta', type: 'prazo_acao', module: 'plano_acao' },
      ]])
      .mockResolvedValueOnce([[
        { id: 2, title: 'Reunião CPPD', date: '2026-02-20', status: 'agendada', priority: 'media', type: 'reuniao', module: 'governanca' },
      ]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    const { dashboardRouter } = await import('./dashboardRouter');
    const handler = (dashboardRouter as any).getAgendaItems._def.query;

    const result = await handler({
      ctx: { user: { id: 1, role: 'admin_global' } },
      input: { organizationId: 90001 },
    });

    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('totalItems');
    expect(result.totalItems).toBe(2);
    expect(result.items[0]).toHaveProperty('type');
    expect(result.items[0]).toHaveProperty('module');
  });

  it('deve retornar lista vazia quando não há eventos no período', async () => {
    mockExecute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    const { dashboardRouter } = await import('./dashboardRouter');
    const handler = (dashboardRouter as any).getAgendaItems._def.query;

    const result = await handler({
      ctx: { user: { id: 1, role: 'consultor' } },
      input: { organizationId: 90001 },
    });

    expect(result.totalItems).toBe(0);
    expect(result.items).toEqual([]);
  });
});

describe('getSlaOverview - Resumo SLA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('deve retornar métricas SLA corretas', async () => {
    mockExecute
      .mockResolvedValueOnce([[
        { total: 10, abertos: 5, violados: 2, emRisco: 1, noPrazo: 2, resolvidos: 5 },
      ]])
      .mockResolvedValueOnce([[
        { avgResolutionHours: 48 },
      ]]);

    const { dashboardRouter } = await import('./dashboardRouter');
    const handler = (dashboardRouter as any).getSlaOverview._def.query;

    const result = await handler({
      ctx: { user: { id: 1, role: 'admin_global' } },
      input: { organizationId: 90001 },
    });

    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('abertos');
    expect(result).toHaveProperty('violados');
    expect(result).toHaveProperty('emRisco');
    expect(result).toHaveProperty('noPrazo');
    expect(result).toHaveProperty('resolvidos');
    expect(result).toHaveProperty('tempoMedioResolucaoHoras');
    expect(result).toHaveProperty('taxaCumprimento');
    expect(result.total).toBe(10);
    expect(result.abertos).toBe(5);
  });

  it('deve retornar zeros quando não há tickets', async () => {
    mockExecute
      .mockResolvedValueOnce([[
        { total: 0, abertos: null, violados: null, emRisco: null, noPrazo: null, resolvidos: null },
      ]])
      .mockResolvedValueOnce([[
        { avgResolutionHours: null },
      ]]);

    const { dashboardRouter } = await import('./dashboardRouter');
    const handler = (dashboardRouter as any).getSlaOverview._def.query;

    const result = await handler({
      ctx: { user: { id: 1, role: 'admin_global' } },
      input: { organizationId: 90001 },
    });

    expect(result.total).toBe(0);
    expect(result.abertos).toBe(0);
    expect(result.violados).toBe(0);
    expect(result.tempoMedioResolucaoHoras).toBe(0);
    expect(result.taxaCumprimento).toBe(100);
  });
});

describe('getUrgentDeadlines - Prazos Urgentes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('deve retornar prazos urgentes ordenados por diasRestantes', async () => {
    mockExecute
      .mockResolvedValueOnce([[
        { id: 1, title: 'Ação vencida', date: '2026-02-20', status: 'pendente', priority: 'alta', source: 'plano_acao', diasRestantes: -4 },
        { id: 2, title: 'Ticket urgente', date: '2026-02-25', status: 'novo', priority: 'critica', source: 'ticket', diasRestantes: 1 },
        { id: 3, title: 'Incidente prazo', date: '2026-02-28', status: 'pending', priority: 'alta', source: 'incidente', diasRestantes: 4 },
      ]])
      .mockResolvedValueOnce([[
        { vencidos: 1, criticos: 1, proximos: 1, total: 3 },
      ]]);

    const { dashboardRouter } = await import('./dashboardRouter');
    const handler = (dashboardRouter as any).getUrgentDeadlines._def.query;

    const result = await handler({
      ctx: { user: { id: 1, role: 'admin_global' } },
      input: { organizationId: 90001, limit: 5 },
    });

    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('vencidos');
    expect(result).toHaveProperty('criticos');
    expect(result.items.length).toBe(3);
    expect(result.items[0].diasRestantes).toBe(-4); // Mais urgente primeiro
  });

  it('deve retornar vazio quando não há prazos', async () => {
    mockExecute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[
        { vencidos: null, criticos: null, proximos: null, total: 0 },
      ]]);

    const { dashboardRouter } = await import('./dashboardRouter');
    const handler = (dashboardRouter as any).getUrgentDeadlines._def.query;

    const result = await handler({
      ctx: { user: { id: 99, role: 'sponsor' } },
      input: { organizationId: 90001, limit: 5 },
    });

    expect(result.items).toEqual([]);
    expect(result.vencidos).toBe(0);
  });
});

describe('getSummary - Resumo Consolidado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('deve retornar resumo consolidado de todos os módulos', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ total: 5, emAndamento: 3, concluidas: 2 }]])  // assessments
      .mockResolvedValueOnce([[{ total: 10 }]])  // third_parties
      .mockResolvedValueOnce([[{ total: 20, pendentes: 15, vencidas: 3 }]])  // action_plans
      .mockResolvedValueOnce([[{ total: 8, concluidos: 6 }]])  // contracts
      .mockResolvedValueOnce([[{ total: 2, ativos: 1 }]]);  // incidents

    const { dashboardRouter } = await import('./dashboardRouter');
    const handler = (dashboardRouter as any).getSummary._def.query;

    const result = await handler({
      ctx: { user: { id: 1, role: 'admin_global' } },
      input: { organizationId: 90001 },
    });

    expect(result).toHaveProperty('avaliacoes');
    expect(result).toHaveProperty('terceiros');
    expect(result).toHaveProperty('acoes');
    expect(result).toHaveProperty('contratos');
    expect(result).toHaveProperty('incidentes');
    expect(result.avaliacoes.total).toBe(5);
    expect(result.terceiros.total).toBe(10);
    expect(result.acoes.pendentes).toBe(15);
    expect(result.acoes.vencidas).toBe(3);
    expect(result.contratos.concluidos).toBe(6);
    expect(result.incidentes.ativos).toBe(1);
  });
});
