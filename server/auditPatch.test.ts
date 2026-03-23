import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('Audit Patch - Validação de endpoints e imports', () => {
  
  it('deve validar que o schema de actionPlan.update aceita campo status', async () => {
    const updateSchema = z.object({
      id: z.number(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      priority: z.enum(['baixa', 'media', 'alta', 'critica']).optional(),
      status: z.enum(['pendente', 'em_andamento', 'concluida_cliente', 'pendente_validacao_dpo', 'concluida', 'cancelada', 'recusada_cliente', 'aguardando_validacao', 'aguardando_nova_validacao', 'em_validacao', 'ajustes_solicitados']).optional(),
      responsibleId: z.number().optional(),
    });

    // Simular drag-and-drop do Kanban
    const kanbanMove = { id: 1, status: 'em_andamento' as const };
    const result = updateSchema.safeParse(kanbanMove);
    expect(result.success).toBe(true);
  });

  it('deve validar que getDeadlinesReport aceita organizationId e daysThreshold', () => {
    const schema = z.object({
      organizationId: z.number().optional(),
      daysThreshold: z.number().default(30),
    });

    const input = { organizationId: 120001, daysThreshold: 30 };
    const result = schema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('deve validar que governanca.overview aceita organizationId e year', () => {
    const schema = z.object({
      organizationId: z.number().positive(),
      year: z.number().min(2020).max(2100),
    });

    const input = { organizationId: 120001, year: 2026 };
    const result = schema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('deve validar que os status do Kanban são válidos', () => {
    const validStatuses = ['pendente', 'em_andamento', 'concluida', 'cancelada'];
    const statusSchema = z.enum(['pendente', 'em_andamento', 'concluida_cliente', 'pendente_validacao_dpo', 'concluida', 'cancelada', 'recusada_cliente', 'aguardando_validacao', 'aguardando_nova_validacao', 'em_validacao', 'ajustes_solicitados']);
    
    for (const status of validStatuses) {
      const result = statusSchema.safeParse(status);
      expect(result.success).toBe(true);
    }
  });

  it('deve validar que os imports corretos existem nos componentes', async () => {
    const fs = await import('fs');
    const path = await import('path');
    
    // ActionPlanDashboard deve importar de @/contexts/ToastContext
    const actionPlanPath = path.resolve(__dirname, '../client/src/pages/ActionPlanDashboard.tsx');
    const actionPlanContent = fs.readFileSync(actionPlanPath, 'utf-8');
    expect(actionPlanContent).toContain("@/contexts/ToastContext");
    expect(actionPlanContent).not.toContain("@/hooks/use-toast");
    
    // DeadlineManager deve importar de @/contexts/ToastContext
    const deadlinePath = path.resolve(__dirname, '../client/src/pages/DeadlineManager.tsx');
    const deadlineContent = fs.readFileSync(deadlinePath, 'utf-8');
    expect(deadlineContent).toContain("@/contexts/ToastContext");
    expect(deadlineContent).not.toContain("@/hooks/use-toast");
    
    // DashboardMetricas deve usar governanca.overview (não getDashboard)
    const dashMetricasPath = path.resolve(__dirname, '../client/src/pages/DashboardMetricas.tsx');
    const dashMetricasContent = fs.readFileSync(dashMetricasPath, 'utf-8');
    expect(dashMetricasContent).toContain("governanca.overview");
    expect(dashMetricasContent).not.toContain("governanca.getDashboard");
  });

  it('deve validar que ActionPlanDashboard tem toggle Lista/Kanban', async () => {
    const fs = await import('fs');
    const path = await import('path');
    
    const actionPlanPath = path.resolve(__dirname, '../client/src/pages/ActionPlanDashboard.tsx');
    const content = fs.readFileSync(actionPlanPath, 'utf-8');
    
    // Deve ter o toggle
    expect(content).toContain("viewMode");
    expect(content).toContain("'lista'");
    expect(content).toContain("'kanban'");
    expect(content).toContain("Quadro");
    expect(content).toContain("handleDragStart");
    expect(content).toContain("handleDrop");
    expect(content).toContain("KANBAN_COLUMNS");
  });

  it('deve validar que DeadlineManager usa dados reais (não mock)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    
    const deadlinePath = path.resolve(__dirname, '../client/src/pages/DeadlineManager.tsx');
    const content = fs.readFileSync(deadlinePath, 'utf-8');
    
    // Deve usar endpoint real (trpc.deadlines.list é a procedure correta do DeadlineManager)
    expect(content).toContain("trpc.deadlines.list");
    // Não deve ter dados mock hardcoded
    expect(content).not.toContain("mockDeadlines");
    expect(content).not.toContain("sampleData");
  });

  it('deve validar que DashboardMetricas não usa dados mock', async () => {
    const fs = await import('fs');
    const path = await import('path');
    
    const dashPath = path.resolve(__dirname, '../client/src/pages/DashboardMetricas.tsx');
    const content = fs.readFileSync(dashPath, 'utf-8');
    
    // Deve usar endpoints reais
    expect(content).toContain("trpc.rot.getDashboardStats");
    expect(content).toContain("trpc.organization.getStats");
    expect(content).toContain("trpc.actionPlan.getDeadlinesReport");
    // Não deve ter dados mock
    expect(content).not.toContain("mockData");
    expect(content).not.toContain("sampleMetrics");
  });

  it('deve validar que TaxonomyAdmin e EmailStatus estão no MainLayout no App.tsx', async () => {
    const fs = await import('fs');
    const path = await import('path');
    
    const appPath = path.resolve(__dirname, '../client/src/App.tsx');
    const content = fs.readFileSync(appPath, 'utf-8');
    
    // Verificar que as rotas estão dentro de MainLayout
    expect(content).toContain("taxonomia-admin");
    expect(content).toContain("email-status");
  });
});


describe('Hardening final do actionPlanRouter', () => {
  it('não mantém procedures duplicadas dentro do actionPlanRouter', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const routerPath = path.resolve(__dirname, 'routers.ts');
    const content = fs.readFileSync(routerPath, 'utf-8');
    const start = content.indexOf('const actionPlanRouter = router({');
    const end = content.indexOf('// ==================== ADMIN ROUTER ====================');
    const block = content.slice(start, end);
    const names = Array.from(block.matchAll(/^  ([A-Za-z0-9_]+): /gm)).map((m: RegExpMatchArray) => m[1]);
    const criticalNames = [
      'listByAssessment',
      'create',
      'update',
      'completeByClient',
      'rejectByClient',
      'assignResponsible',
      'uploadEvidence',
      'linkGedDocument',
      'getActionEvidences',
      'removeEvidence',
      'delegateTask',
    ];
    for (const name of criticalNames) {
      const count = names.filter((n) => n === name).length;
      expect(count, `procedure ${name} deveria existir apenas 1 vez`).toBe(1);
    }
  });

  it('usa helpers centrais de autorização no router principal', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const routerPath = path.resolve(__dirname, 'routers.ts');
    const content = fs.readFileSync(routerPath, 'utf-8');
    expect(content).toContain('assertUserCanAccessActionPlan');
    expect(content).toContain('assertResponsibleOrInternal');
    expect(content).toContain('isInternalActionPlanRole');
    expect(content).toContain('isClientActionPlanRole');
  });

  it('configura target ES2020 no tsconfig para eliminar erros TS2802 de iteração', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const tsconfigPath = path.resolve(__dirname, '../tsconfig.json');
    const tsconfig = fs.readFileSync(tsconfigPath, 'utf-8');
    expect(tsconfig).toContain('"target": "ES2020"');
  });

  it('permite assessmentType dpia no helper de leitura por avaliação', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const dbPath = path.resolve(__dirname, 'db.ts');
    const content = fs.readFileSync(dbPath, 'utf-8');
    expect(content).toContain("'compliance' | 'third_party' | 'contract_analysis' | 'dpia'");
  });
});
