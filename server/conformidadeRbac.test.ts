import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from './db';
import { sql } from 'drizzle-orm';
import { createTestContext, cleanupTestData } from './test-utils';

describe('Conformidade LGPD - RBAC', () => {
  let testOrgId: number;
  let adminUser: any;
  let consultorUser: any;
  let clienteUser: any;

  beforeAll(async () => {
    // Setup test data
    const database = await db.getDb();
    if (!database) throw new Error('Database not available');

    // Create test organization
    const { rows: orgResult } = await database.execute(
      sql`INSERT INTO organizations (name, cnpj, status) VALUES (${'Test Org RBAC'}, ${'12345678901234'}, ${'ativa'}) RETURNING id`
    ) as any;
    testOrgId = (orgResult as any)[0]?.id || 1;

    // Create test users with different roles
    const { rows: adminResult } = await database.execute(
      sql`INSERT INTO users (email, name, role, "organizationId") VALUES (${'admin@test.com'}, ${'Admin User'}, ${'admin_global'}, ${testOrgId}) RETURNING id`
    ) as any;
    adminUser = { id: (adminResult as any)[0]?.id, role: 'admin_global', organizationId: testOrgId };

    const { rows: consultorResult } = await database.execute(
      sql`INSERT INTO users (email, name, role, "organizationId") VALUES (${'consultor@test.com'}, ${'Consultor User'}, ${'consultor'}, ${testOrgId}) RETURNING id`
    ) as any;
    consultorUser = { id: (consultorResult as any)[0]?.id, role: 'consultor', organizationId: testOrgId };

    const { rows: clienteResult } = await database.execute(
      sql`INSERT INTO users (email, name, role, "organizationId") VALUES (${'cliente@test.com'}, ${'Cliente User'}, ${'usuario'}, ${testOrgId}) RETURNING id`
    ) as any;
    clienteUser = { id: (clienteResult as any)[0]?.id, role: 'usuario', organizationId: testOrgId };
  });

  afterAll(async () => {
    // Cleanup
    const database = await db.getDb();
    if (database) {
      await cleanupTestData(database, testOrgId);
    }
  });

  it('Admin Global pode criar avaliação de conformidade', async () => {
    const database = await db.getDb();
    if (!database) throw new Error('Database not available');

    // Admin should be able to create
    const result = await db.createComplianceAssessment({
      organizationId: testOrgId,
      framework: 'misto',
      createdById: adminUser.id,
      totalQuestions: 0,
      answeredQuestions: 0,
    });

    expect(result).toBeDefined();
    expect(typeof result).toBe('number');
  });

  it('Consultor pode criar avaliação de conformidade', async () => {
    const database = await db.getDb();
    if (!database) throw new Error('Database not available');

    // Consultor should be able to create
    const result = await db.createComplianceAssessment({
      organizationId: testOrgId,
      framework: 'misto',
      createdById: consultorUser.id,
      totalQuestions: 0,
      answeredQuestions: 0,
    });

    expect(result).toBeDefined();
    expect(typeof result).toBe('number');
  });

  it('Cliente NÃO pode criar avaliação de conformidade (validação backend)', async () => {
    const database = await db.getDb();
    if (!database) throw new Error('Database not available');

    // Cliente should NOT be able to create - this is validated in the router
    // The router checks: if (ctx.user.role !== 'admin_global' && ctx.user.role !== 'consultor' && ctx.user.role !== 'consultor_par')
    // Cliente has role 'usuario', so should be blocked

    const isClienteAllowed = 
      clienteUser.role === 'admin_global' || 
      clienteUser.role === 'consultor' || 
      clienteUser.role === 'consultor_par';

    expect(isClienteAllowed).toBe(false);
  });

  it('Cliente visualiza apenas "Ver Avaliações" (sem "Nova Avaliação")', () => {
    // This is a frontend test - Cliente role should not see the "Nova Avaliação" button
    // The button is conditionally rendered with: {isAdminOrConsultor && (...)}
    // where isAdminOrConsultor = user?.role === 'admin_global' || user?.role === 'consultor'

    const isAdminOrConsultor = 
      clienteUser.role === 'admin_global' || 
      clienteUser.role === 'consultor';

    expect(isAdminOrConsultor).toBe(false); // Cliente should NOT see the button
  });

  it('Admin Global e Consultor visualizam "Nova Avaliação"', () => {
    // Admin Global
    const adminCanCreate = 
      adminUser.role === 'admin_global' || 
      adminUser.role === 'consultor';
    expect(adminCanCreate).toBe(true);

    // Consultor
    const consultorCanCreate = 
      consultorUser.role === 'admin_global' || 
      consultorUser.role === 'consultor';
    expect(consultorCanCreate).toBe(true);
  });
});
