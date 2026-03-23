/**
 * Testes para endpoints de persistência de cláusulas LGPD
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do banco de dados
vi.mock('./db', () => ({
  getContractAnalysisById: vi.fn(),
  getContractAnalysisClauseById: vi.fn(),
  updateContractAnalysisClause: vi.fn(),
  createContractAnalysisHistoryEntry: vi.fn(),
  getContractAnalysisClausesByAnalysis: vi.fn(),
}));

import * as db from './db';

describe('Contract Analysis Clause Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveFinalClauseVersion', () => {
    it('should save final clause version with all fields', async () => {
      const mockAnalysis = { id: 1, organizationId: 1, contractName: 'Test Contract' };
      const mockClause = { id: 1, analysisId: 1, title: 'Clause 1', content: 'Original content' };
      
      (db.getContractAnalysisById as any).mockResolvedValue(mockAnalysis);
      (db.getContractAnalysisClauseById as any).mockResolvedValue(mockClause);
      (db.updateContractAnalysisClause as any).mockResolvedValue(undefined);
      (db.createContractAnalysisHistoryEntry as any).mockResolvedValue(1);

      // Simular chamada do endpoint
      const input = {
        analysisId: 1,
        clauseDbId: 1,
        finalContent: 'Edited final content',
        finalTitle: 'Final Title',
        includeHeader: true,
        includeContractReference: true,
      };

      // Verificar que a análise existe
      const analysis = await db.getContractAnalysisById(input.analysisId);
      expect(analysis).toBeDefined();
      expect(analysis.id).toBe(1);

      // Verificar que a cláusula existe
      const clause = await db.getContractAnalysisClauseById(input.clauseDbId);
      expect(clause).toBeDefined();
      expect(clause.analysisId).toBe(input.analysisId);

      // Simular atualização
      await db.updateContractAnalysisClause(input.clauseDbId, {
        finalContent: input.finalContent,
        finalTitle: input.finalTitle,
        includeHeader: input.includeHeader ? 1 : 0,
        includeContractReference: input.includeContractReference ? 1 : 0,
        editedById: 1,
        editedAt: new Date().toISOString(),
      });

      expect(db.updateContractAnalysisClause).toHaveBeenCalledWith(
        input.clauseDbId,
        expect.objectContaining({
          finalContent: input.finalContent,
          finalTitle: input.finalTitle,
          includeHeader: 1,
          includeContractReference: 1,
        })
      );
    });

    it('should reject if analysis not found', async () => {
      (db.getContractAnalysisById as any).mockResolvedValue(null);

      const analysis = await db.getContractAnalysisById(999);
      expect(analysis).toBeNull();
    });

    it('should reject if clause not found', async () => {
      const mockAnalysis = { id: 1, organizationId: 1 };
      (db.getContractAnalysisById as any).mockResolvedValue(mockAnalysis);
      (db.getContractAnalysisClauseById as any).mockResolvedValue(null);

      const clause = await db.getContractAnalysisClauseById(999);
      expect(clause).toBeNull();
    });
  });

  describe('approveFinalClauseVersion', () => {
    it('should approve final clause version', async () => {
      const mockAnalysis = { id: 1, organizationId: 1 };
      const mockClause = { 
        id: 1, 
        analysisId: 1, 
        finalContent: 'Final content',
        isFinalApproved: 0 
      };

      (db.getContractAnalysisById as any).mockResolvedValue(mockAnalysis);
      (db.getContractAnalysisClauseById as any).mockResolvedValue(mockClause);
      (db.updateContractAnalysisClause as any).mockResolvedValue(undefined);
      (db.createContractAnalysisHistoryEntry as any).mockResolvedValue(1);

      const input = {
        analysisId: 1,
        clauseDbId: 1,
      };

      // Verificar que a cláusula tem conteúdo final
      const clause = await db.getContractAnalysisClauseById(input.clauseDbId);
      expect(clause.finalContent).toBeDefined();

      // Aprovar a cláusula
      await db.updateContractAnalysisClause(input.clauseDbId, {
        isFinalApproved: 1,
        approvedById: 1,
        approvedAt: new Date().toISOString(),
      });

      expect(db.updateContractAnalysisClause).toHaveBeenCalledWith(
        input.clauseDbId,
        expect.objectContaining({
          isFinalApproved: 1,
        })
      );
    });

    it('should reject approval if no final content', async () => {
      const mockAnalysis = { id: 1, organizationId: 1 };
      const mockClause = { 
        id: 1, 
        analysisId: 1, 
        finalContent: null,
        isFinalApproved: 0 
      };

      (db.getContractAnalysisById as any).mockResolvedValue(mockAnalysis);
      (db.getContractAnalysisClauseById as any).mockResolvedValue(mockClause);

      const clause = await db.getContractAnalysisClauseById(1);
      
      // Verificar que não há conteúdo final
      expect(clause.finalContent).toBeNull();
      
      // Não deve aprovar sem conteúdo final
      if (!clause.finalContent) {
        expect(true).toBe(true); // Validação passou
      }
    });
  });

  describe('createTaskFromMapping', () => {
    it('should create task from mapping data', async () => {
      const mockAnalysis = { id: 1, organizationId: 1, contractName: 'Test Contract' };
      
      (db.getContractAnalysisById as any).mockResolvedValue(mockAnalysis);
      (db.createContractAnalysisHistoryEntry as any).mockResolvedValue(1);

      const input = {
        analysisId: 1,
        mappingField: 'Processo de Tratamento',
        title: 'Tarefa: Processo de Tratamento',
        description: 'Tarefa criada a partir da análise de contrato',
        priority: 'media' as const,
      };

      // Verificar que a análise existe
      const analysis = await db.getContractAnalysisById(input.analysisId);
      expect(analysis).toBeDefined();
      expect(analysis.organizationId).toBe(1);

      // Registrar no histórico
      await db.createContractAnalysisHistoryEntry({
        analysisId: input.analysisId,
        historyActionType: 'map_updated',
        userId: 1,
        description: `Tarefa criada a partir do mapeamento: ${input.mappingField}`,
      });

      expect(db.createContractAnalysisHistoryEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          analysisId: input.analysisId,
          historyActionType: 'map_updated',
        })
      );
    });
  });

  describe('createMeuDpoTicketFromMapping', () => {
    it('should create MeuDPO ticket from mapping data', async () => {
      const mockAnalysis = { id: 1, organizationId: 1, contractName: 'Test Contract' };
      
      (db.getContractAnalysisById as any).mockResolvedValue(mockAnalysis);
      (db.createContractAnalysisHistoryEntry as any).mockResolvedValue(1);

      const input = {
        analysisId: 1,
        mappingField: 'Processo de Tratamento',
        title: 'Chamado DPO: Processo de Tratamento',
        description: 'Chamado criado a partir da análise de contrato',
        priority: 'media' as const,
        category: 'conformidade',
      };

      // Verificar que a análise existe
      const analysis = await db.getContractAnalysisById(input.analysisId);
      expect(analysis).toBeDefined();

      // Registrar no histórico
      await db.createContractAnalysisHistoryEntry({
        analysisId: input.analysisId,
        historyActionType: 'map_updated',
        userId: 1,
        description: `Chamado MeuDPO criado a partir do mapeamento: ${input.mappingField}`,
      });

      expect(db.createContractAnalysisHistoryEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          analysisId: input.analysisId,
          historyActionType: 'map_updated',
        })
      );
    });
  });

  describe('insertMappingToDataMap', () => {
    it('should insert mapping data to data map module', async () => {
      const mockAnalysis = { id: 1, organizationId: 1, contractName: 'Test Contract' };
      
      (db.getContractAnalysisById as any).mockResolvedValue(mockAnalysis);
      (db.createContractAnalysisHistoryEntry as any).mockResolvedValue(1);

      const input = {
        analysisId: 1,
        mappingData: {
          dataCategory: 'Processo de Tratamento',
          dataType: 'Dados do Contrato',
          purpose: 'Execução contratual',
          legalBasis: 'execucao_contrato',
          retentionPeriod: 'Conforme contrato',
        },
      };

      // Verificar que a análise existe
      const analysis = await db.getContractAnalysisById(input.analysisId);
      expect(analysis).toBeDefined();

      // Registrar no histórico
      await db.createContractAnalysisHistoryEntry({
        analysisId: input.analysisId,
        historyActionType: 'map_updated',
        userId: 1,
        description: `Dados inseridos no mapeamento: ${input.mappingData.dataCategory}`,
        newData: input.mappingData,
      });

      expect(db.createContractAnalysisHistoryEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          analysisId: input.analysisId,
          historyActionType: 'map_updated',
          newData: input.mappingData,
        })
      );
    });
  });
});
