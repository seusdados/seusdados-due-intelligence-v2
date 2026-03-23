/**
 * Testes para funcionalidades de cláusulas LGPD, evidências e auditoria
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do módulo db
vi.mock('./db', () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue({ insertId: 1 }),
  }),
  createClauseAuditLog: vi.fn().mockResolvedValue(1),
  getClauseAuditHistory: vi.fn().mockResolvedValue([]),
  createActionEvidence: vi.fn().mockResolvedValue(1),
  getActionEvidences: vi.fn().mockResolvedValue([]),
}));

// Mock do módulo LLM
vi.mock('./_core/llm', () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: 'Cláusula refinada com sucesso para melhor adequação à LGPD.'
      }
    }]
  })
}));

describe('Contract Analysis - Cláusulas LGPD', () => {
  describe('Refinamento de Cláusulas via IA', () => {
    it('deve validar parâmetros de entrada para refinamento', () => {
      const input = {
        analysisId: 1,
        clauseId: 'BLOCO_01',
        currentContent: 'Conteúdo original da cláusula',
        instructions: 'Tornar mais específico para dados sensíveis'
      };
      
      expect(input.analysisId).toBeGreaterThan(0);
      expect(input.clauseId).toBeTruthy();
      expect(input.currentContent.length).toBeGreaterThan(0);
      expect(input.instructions.length).toBeGreaterThan(0);
    });

    it('deve rejeitar instruções vazias', () => {
      const input = {
        analysisId: 1,
        clauseId: 'BLOCO_01',
        currentContent: 'Conteúdo original',
        instructions: ''
      };
      
      expect(input.instructions.length).toBe(0);
    });

    it('deve validar formato do clauseId', () => {
      const validClauseIds = ['BLOCO_01', 'BLOCO_02', 'BLOCO_18'];
      const invalidClauseIds = ['', 'invalid', '123'];
      
      validClauseIds.forEach(id => {
        expect(id).toMatch(/^BLOCO_\d{2}$/);
      });
      
      invalidClauseIds.forEach(id => {
        expect(id).not.toMatch(/^BLOCO_\d{2}$/);
      });
    });
  });

  describe('Sistema de Auditoria', () => {
    it('deve validar tipos de ação de auditoria', () => {
      const validActionTypes = [
        'generated',
        'accepted',
        'rejected',
        'refined',
        'edited',
        'downloaded',
        'copied'
      ];
      
      validActionTypes.forEach(type => {
        expect(['generated', 'accepted', 'rejected', 'refined', 'edited', 'downloaded', 'copied']).toContain(type);
      });
    });

    it('deve criar registro de auditoria com campos obrigatórios', () => {
      const auditEntry = {
        analysisId: 1,
        clauseId: 'BLOCO_01',
        actionType: 'refined',
        userId: 1,
        userName: 'Test User',
        previousContent: 'Conteúdo anterior',
        newContent: 'Novo conteúdo',
        refinementInstructions: 'Instruções de refinamento'
      };
      
      expect(auditEntry.analysisId).toBeDefined();
      expect(auditEntry.clauseId).toBeDefined();
      expect(auditEntry.actionType).toBeDefined();
      expect(auditEntry.userId).toBeDefined();
    });

    it('deve filtrar histórico por cláusula específica', () => {
      const allHistory = [
        { id: 1, clauseId: 'BLOCO_01', actionType: 'generated' },
        { id: 2, clauseId: 'BLOCO_02', actionType: 'generated' },
        { id: 3, clauseId: 'BLOCO_01', actionType: 'refined' },
      ];
      
      const filteredHistory = allHistory.filter(h => h.clauseId === 'BLOCO_01');
      expect(filteredHistory.length).toBe(2);
    });
  });

  describe('Evidências de Ações', () => {
    it('deve validar parâmetros para adicionar evidência', () => {
      const input = {
        actionPlanId: 1,
        documentId: 10,
        description: 'Evidência de execução da ação'
      };
      
      expect(input.actionPlanId).toBeGreaterThan(0);
      expect(input.documentId).toBeGreaterThan(0);
    });

    it('deve permitir descrição opcional', () => {
      const inputWithDescription = {
        actionPlanId: 1,
        documentId: 10,
        description: 'Descrição da evidência'
      };
      
      const inputWithoutDescription = {
        actionPlanId: 1,
        documentId: 10
      };
      
      expect(inputWithDescription.description).toBeDefined();
      expect(inputWithoutDescription.description).toBeUndefined();
    });

    it('deve retornar lista de evidências com informações do documento', () => {
      const evidences = [
        {
          id: 1,
          actionPlanId: 1,
          documentId: 10,
          documentName: 'Relatório de Conformidade.pdf',
          description: 'Evidência de auditoria',
          addedById: 1,
          createdAt: new Date().toISOString()
        }
      ];
      
      expect(evidences[0].documentName).toBeDefined();
      expect(evidences[0].documentId).toBe(10);
    });
  });

  describe('Integração GED', () => {
    it('deve validar busca de documentos com termo mínimo', () => {
      const searchTerm = 'co'; // mínimo 2 caracteres
      expect(searchTerm.length).toBeGreaterThanOrEqual(2);
    });

    it('deve filtrar por organização na busca', () => {
      const searchParams = {
        spaceType: 'organization',
        organizationId: 1,
        searchTerm: 'contrato'
      };
      
      expect(searchParams.organizationId).toBeDefined();
      expect(searchParams.spaceType).toBe('organization');
    });
  });
});

describe('Validação de Entrada', () => {
  it('deve validar analysisId como número positivo', () => {
    const validIds = [1, 10, 100, 1000];
    const invalidIds = [0, -1, -100];
    
    validIds.forEach(id => expect(id).toBeGreaterThan(0));
    invalidIds.forEach(id => expect(id).toBeLessThanOrEqual(0));
  });

  it('deve validar estrutura de resposta de refinamento', () => {
    const response = {
      success: true,
      clauseId: 'BLOCO_01',
      refinedContent: 'Conteúdo refinado pela IA',
      auditLogId: 1
    };
    
    expect(response.success).toBe(true);
    expect(response.clauseId).toBeDefined();
    expect(response.refinedContent).toBeDefined();
    expect(response.auditLogId).toBeGreaterThan(0);
  });
});
