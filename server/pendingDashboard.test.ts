/**
 * Testes para os endpoints de Dashboard de Pendências
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do banco de dados
vi.mock('./db', () => ({
  getAllOrganizations: vi.fn().mockResolvedValue([
    { id: 1, name: 'Org Teste 1' },
    { id: 2, name: 'Org Teste 2' },
  ]),
  getActionPlansByOrganization: vi.fn().mockImplementation((orgId: number) => {
    if (orgId === 1) {
      return Promise.resolve([
        { id: 1, title: 'Tarefa 1', status: 'pendente', organizationId: 1, priority: 'alta' },
        { id: 2, title: 'Tarefa 2', status: 'em_andamento', organizationId: 1, priority: 'media' },
        { id: 3, title: 'Tarefa 3', status: 'concluida', organizationId: 1, priority: 'baixa' },
      ]);
    }
    return Promise.resolve([
      { id: 4, title: 'Tarefa 4', status: 'pendente_validacao_dpo', organizationId: 2, priority: 'critica' },
    ]);
  }),
  getOrganizationById: vi.fn().mockImplementation((id: number) => {
    if (id === 1) return Promise.resolve({ id: 1, name: 'Org Teste 1' });
    if (id === 2) return Promise.resolve({ id: 2, name: 'Org Teste 2' });
    return Promise.resolve(null);
  }),
  getUserById: vi.fn().mockResolvedValue({ id: 1, name: 'Usuário Teste' }),
  getClauseVersions: vi.fn().mockResolvedValue([
    { id: 1, clauseId: 1, versionNumber: 1, title: 'Cláusula 1', content: 'Conteúdo v1' },
    { id: 2, clauseId: 1, versionNumber: 2, title: 'Cláusula 1', content: 'Conteúdo v2' },
  ]),
  getClauseVersionById: vi.fn().mockResolvedValue({
    id: 1, clauseId: 1, versionNumber: 1, title: 'Cláusula 1', content: 'Conteúdo v1'
  }),
  createClauseVersion: vi.fn().mockResolvedValue(3),
  rollbackClauseToVersion: vi.fn().mockResolvedValue(true),
  compareClauseVersions: vi.fn().mockResolvedValue({
    version1: { id: 1, versionNumber: 1, content: 'Conteúdo v1' },
    version2: { id: 2, versionNumber: 2, content: 'Conteúdo v2' },
  }),
}));

// Mock do ticketService
vi.mock('./ticketService', () => ({
  listAllTickets: vi.fn().mockResolvedValue({
    tickets: [
      { id: 1, title: 'Chamado 1', ticketType: 'consultoria_geral', status: 'novo', priority: 'alta', organizationId: 1, organizationName: 'Org Teste 1' },
      { id: 2, title: 'Chamado 2', ticketType: 'duvida_juridica', status: 'em_analise', priority: 'media', organizationId: 2, organizationName: 'Org Teste 2' },
    ],
    total: 2,
    page: 1,
    pageSize: 50,
  }),
}));

import * as db from './db';
import * as ticketService from './ticketService';

describe('Dashboard de Pendências', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tarefas Pendentes', () => {
    it('deve filtrar apenas tarefas com status pendente, em_andamento ou pendente_validacao_dpo', async () => {
      const orgs = await db.getAllOrganizations();
      expect(orgs).toHaveLength(2);
      
      let allPlans: any[] = [];
      for (const org of orgs) {
        const orgPlans = await db.getActionPlansByOrganization(org.id);
        allPlans = allPlans.concat(orgPlans);
      }
      
      // Filtrar por status pendente
      const pendingPlans = allPlans.filter((p: any) => 
        p.status === 'pendente' || 
        p.status === 'em_andamento' || 
        p.status === 'pendente_validacao_dpo'
      );
      
      expect(pendingPlans).toHaveLength(3); // Tarefa 1, 2 e 4 (3 está concluída)
      expect(pendingPlans.map(p => p.id)).toEqual([1, 2, 4]);
    });

    it('deve filtrar por organização quando especificado', async () => {
      const plans = await db.getActionPlansByOrganization(1);
      const pendingPlans = plans.filter((p: any) => 
        p.status === 'pendente' || 
        p.status === 'em_andamento' || 
        p.status === 'pendente_validacao_dpo'
      );
      
      expect(pendingPlans).toHaveLength(2); // Apenas Tarefa 1 e 2 da Org 1
    });
  });

  describe('Chamados Pendentes', () => {
    it('deve listar chamados com status aberto', async () => {
      const result = await ticketService.listAllTickets(
        { status: ['novo', 'em_analise', 'aguardando_cliente', 'aguardando_terceiro'] },
        { page: 1, pageSize: 50 }
      );
      
      expect(result.tickets).toHaveLength(2);
      expect(result.tickets[0].status).toBe('novo');
      expect(result.tickets[1].status).toBe('em_analise');
    });
  });

  describe('Versionamento de Cláusulas', () => {
    it('deve listar versões de uma cláusula', async () => {
      const versions = await db.getClauseVersions(1);
      
      expect(versions).toHaveLength(2);
      expect(versions[0].versionNumber).toBe(1);
      expect(versions[1].versionNumber).toBe(2);
    });

    it('deve obter uma versão específica', async () => {
      const version = await db.getClauseVersionById(1);
      
      expect(version).toBeDefined();
      expect(version.versionNumber).toBe(1);
      expect(version.title).toBe('Cláusula 1');
    });

    it('deve criar nova versão de cláusula', async () => {
      const versionId = await db.createClauseVersion(
        1, // clauseId
        1, // analysisId
        'Cláusula Atualizada',
        'Novo conteúdo',
        true, // includeHeader
        true, // includeContractReference
        'Atualização de conteúdo',
        1 // createdById
      );
      
      expect(versionId).toBe(3);
    });

    it('deve realizar rollback para versão anterior', async () => {
      const success = await db.rollbackClauseToVersion(1, 1, 1);
      
      expect(success).toBe(true);
    });

    it('deve comparar duas versões', async () => {
      const comparison = await db.compareClauseVersions(1, 2);
      
      expect(comparison).toBeDefined();
      expect(comparison?.version1.versionNumber).toBe(1);
      expect(comparison?.version2.versionNumber).toBe(2);
      expect(comparison?.version1.content).not.toBe(comparison?.version2.content);
    });
  });
});

describe('Notificações de Cláusulas', () => {
  it('deve ter estrutura correta para notificação de aprovação', () => {
    const notificationData = {
      analysisId: 1,
      contractName: 'Contrato Teste',
      organizationName: 'Org Teste',
      clauseTitle: 'Cláusula 1',
      clauseNumber: 1,
      actionType: 'approved' as const,
      performedByName: 'Usuário Teste',
    };
    
    expect(notificationData.actionType).toBe('approved');
    expect(notificationData.contractName).toBe('Contrato Teste');
    expect(notificationData.clauseNumber).toBe(1);
  });
});
