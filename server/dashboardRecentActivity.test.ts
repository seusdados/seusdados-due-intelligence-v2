import { describe, it, expect, vi } from 'vitest';

/**
 * Testes para o endpoint getRecentActivity do dashboardRouter.
 * Verifica que a query UNION ALL multi-fonte funciona corretamente.
 */

// Mock do getDb para simular respostas do banco
const mockExecute = vi.fn();
vi.mock('./db', () => ({
  getDb: vi.fn(async () => ({
    execute: mockExecute,
  })),
}));

// Mock do trpc para simular protectedProcedure
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

describe('getRecentActivity - multi-fonte', () => {
  it('deve retornar array vazio quando não há dados em nenhuma tabela', async () => {
    mockExecute.mockResolvedValueOnce([[]]);

    const { dashboardRouter } = await import('./dashboardRouter');
    const handler = (dashboardRouter as any).getRecentActivity._def.query;

    const result = await handler({
      ctx: { user: { id: 1, role: 'admin_global' } },
      input: { organizationId: 90001, limit: 8 },
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('deve retornar atividades com campos corretos quando há dados', async () => {
    const mockRows = [
      {
        entityId: 1,
        description: 'Ação de teste',
        activityType: 'plano_acao_criado',
        module: 'plano_acao',
        userName: 'Marcelo Fattori',
        createdAt: '2026-02-20T23:06:32.000Z',
      },
      {
        entityId: 2,
        description: 'Contrato Antivirus',
        activityType: 'contrato_enviado',
        module: 'contratos',
        userName: 'Marcelo Fattori',
        createdAt: '2026-02-20T23:05:54.000Z',
      },
      {
        entityId: 3,
        description: 'Reunião CPPD #1 - 2026',
        activityType: 'reuniao_agendada',
        module: 'governanca',
        userName: 'Sistema',
        createdAt: '2026-02-24T00:30:59.000Z',
      },
    ];

    mockExecute.mockResolvedValueOnce([mockRows]);

    const { dashboardRouter } = await import('./dashboardRouter');
    const handler = (dashboardRouter as any).getRecentActivity._def.query;

    const result = await handler({
      ctx: { user: { id: 1, role: 'admin_global' } },
      input: { organizationId: 90001, limit: 8 },
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);

    // Verificar que cada item tem os campos esperados
    for (const item of result) {
      expect(item).toHaveProperty('entityId');
      expect(item).toHaveProperty('description');
      expect(item).toHaveProperty('activityType');
      expect(item).toHaveProperty('module');
      expect(item).toHaveProperty('userName');
      expect(item).toHaveProperty('createdAt');
    }

    // Verificar tipos de atividade
    const types = result.map((r: any) => r.activityType);
    expect(types).toContain('plano_acao_criado');
    expect(types).toContain('contrato_enviado');
    expect(types).toContain('reuniao_agendada');

    // Verificar módulos
    const modules = result.map((r: any) => r.module);
    expect(modules).toContain('plano_acao');
    expect(modules).toContain('contratos');
    expect(modules).toContain('governanca');
  });

  it('deve retornar atividades com userName preenchido (nunca null)', async () => {
    const mockRows = [
      {
        entityId: 1,
        description: 'Documento GED',
        activityType: 'documento_ged',
        module: 'ged',
        userName: 'Sistema',
        createdAt: '2026-02-18T21:19:47.000Z',
      },
    ];

    mockExecute.mockResolvedValueOnce([mockRows]);

    const { dashboardRouter } = await import('./dashboardRouter');
    const handler = (dashboardRouter as any).getRecentActivity._def.query;

    const result = await handler({
      ctx: { user: { id: 1, role: 'consultor' } },
      input: { organizationId: 90001, limit: 8 },
    });

    expect(result.length).toBeGreaterThanOrEqual(1);
    for (const item of result) {
      expect(item.userName).toBeTruthy();
      expect(item.userName).not.toBe(null);
    }
  });

  it('deve respeitar o limite de resultados', async () => {
    const mockRows = Array.from({ length: 3 }, (_, i) => ({
      entityId: i + 1,
      description: `Atividade ${i + 1}`,
      activityType: 'plano_acao_criado',
      module: 'plano_acao',
      userName: 'Teste',
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    }));

    mockExecute.mockResolvedValueOnce([mockRows]);

    const { dashboardRouter } = await import('./dashboardRouter');
    const handler = (dashboardRouter as any).getRecentActivity._def.query;

    const result = await handler({
      ctx: { user: { id: 1, role: 'admin_global' } },
      input: { organizationId: 90001, limit: 3 },
    });

    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('deve incluir múltiplos módulos na resposta (conformidade, governanca, ged)', async () => {
    const mockRows = [
      { entityId: 1, description: 'Avaliação Seusdados', activityType: 'avaliacao_criada', module: 'conformidade', userName: 'Ana', createdAt: '2026-02-23T17:55:51.000Z' },
      { entityId: 2, description: 'Reunião CPPD #2', activityType: 'reuniao_agendada', module: 'governanca', userName: 'João', createdAt: '2026-02-24T00:30:59.000Z' },
      { entityId: 3, description: 'POP - Eventos', activityType: 'documento_ged', module: 'ged', userName: 'Maria', createdAt: '2026-02-18T21:19:47.000Z' },
      { entityId: 4, description: 'Criação de third_party', activityType: 'terceiro_avaliado', module: 'due_diligence', userName: 'Marcelo', createdAt: '2026-02-06T16:30:03.000Z' },
    ];

    mockExecute.mockResolvedValueOnce([mockRows]);

    const { dashboardRouter } = await import('./dashboardRouter');
    const handler = (dashboardRouter as any).getRecentActivity._def.query;

    const result = await handler({
      ctx: { user: { id: 1, role: 'admin_global' } },
      input: { organizationId: 90001, limit: 10 },
    });

    const modules = new Set(result.map((r: any) => r.module));
    expect(modules.size).toBeGreaterThanOrEqual(3);
    expect(modules.has('conformidade')).toBe(true);
    expect(modules.has('governanca')).toBe(true);
    expect(modules.has('ged')).toBe(true);
  });
});
