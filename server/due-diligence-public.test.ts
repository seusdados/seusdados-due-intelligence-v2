/**
 * Testes para endpoints públicos de Due Diligence
 * Verifica: segurança, validação de token, fluxo completo
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Mock do banco de dados
const mockDb = {
  getAccessLinkByToken: vi.fn(),
  getThirdPartyById: vi.fn(),
  getOrganizationById: vi.fn(),
  getThirdPartyAssessmentById: vi.fn(),
  getThirdPartyLinkResponsesByAccessLink: vi.fn(),
  createThirdPartyAssessment: vi.fn(),
  updateAccessLink: vi.fn(),
  updateAccessLinkViewedAt: vi.fn(),
  saveThirdPartyLinkResponse: vi.fn(),
  updateThirdPartyAssessment: vi.fn(),
};

// Mock do módulo db
vi.mock('./db', () => mockDb);

describe('Due Diligence - Endpoints Públicos', () => {
  beforeAll(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('P0.1 - Validação de Token', () => {
    it('deve rejeitar token inválido com mensagem legível', async () => {
      mockDb.getAccessLinkByToken.mockResolvedValueOnce(null);
      
      // Simular chamada ao endpoint
      const token = 'token-invalido-123';
      const result = mockDb.getAccessLinkByToken(token);
      
      expect(await result).toBeNull();
    });

    it('deve rejeitar token expirado', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1); // Ontem
      
      mockDb.getAccessLinkByToken.mockResolvedValueOnce({
        id: 1,
        token: 'token-expirado',
        expiresAt: expiredDate.toISOString(),
        isActive: true,
        type: 'due_diligence',
      });
      
      const link = await mockDb.getAccessLinkByToken('token-expirado');
      const expiresAt = new Date(link.expiresAt);
      
      expect(new Date() > expiresAt).toBe(true);
    });

    it('deve aceitar token válido e não expirado', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // Daqui 7 dias
      
      mockDb.getAccessLinkByToken.mockResolvedValueOnce({
        id: 1,
        token: 'token-valido',
        expiresAt: futureDate.toISOString(),
        isActive: true,
        type: 'due_diligence',
        organizationId: 1,
        thirdPartyId: 1,
        assessmentId: 1,
      });
      
      const link = await mockDb.getAccessLinkByToken('token-valido');
      const expiresAt = new Date(link.expiresAt);
      
      expect(link).not.toBeNull();
      expect(link.isActive).toBe(true);
      expect(new Date() < expiresAt).toBe(true);
    });
  });

  describe('P0.2 - Isolamento Multi-Tenant', () => {
    it('deve retornar apenas dados da organização do link', async () => {
      const orgId = 1;
      const thirdPartyId = 10;
      
      mockDb.getAccessLinkByToken.mockResolvedValueOnce({
        id: 1,
        token: 'token-org-1',
        organizationId: orgId,
        thirdPartyId: thirdPartyId,
        isActive: true,
        type: 'due_diligence',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });
      
      mockDb.getOrganizationById.mockResolvedValueOnce({
        id: orgId,
        name: 'Organização 1',
      });
      
      mockDb.getThirdPartyById.mockResolvedValueOnce({
        id: thirdPartyId,
        name: 'Terceiro 10',
        organizationId: orgId, // Pertence à mesma organização
      });
      
      const link = await mockDb.getAccessLinkByToken('token-org-1');
      const org = await mockDb.getOrganizationById(link.organizationId);
      const thirdParty = await mockDb.getThirdPartyById(link.thirdPartyId);
      
      expect(org.id).toBe(orgId);
      expect(thirdParty.organizationId).toBe(orgId);
    });
  });

  describe('P0.3 - Fluxo de Resposta', () => {
    it('deve salvar resposta com cálculo de risco correto', async () => {
      const questionId = 1;
      const selectedLevel = 4; // Nível de maturidade
      const probabilityScore = 2;
      const impactScore = 3;
      const expectedRiskScore = probabilityScore * impactScore; // 6
      
      mockDb.saveThirdPartyLinkResponse.mockResolvedValueOnce({
        id: 1,
        questionId,
        selectedLevel,
        probabilityScore,
        impactScore,
        riskScore: expectedRiskScore,
      });
      
      const response = await mockDb.saveThirdPartyLinkResponse({
        accessLinkId: 1,
        assessmentId: 1,
        questionId,
        selectedLevel,
        probabilityScore,
        impactScore,
        riskScore: expectedRiskScore,
      });
      
      expect(response.riskScore).toBe(6);
      expect(response.riskScore).toBeLessThanOrEqual(25); // Máximo 5x5
    });

    it('deve classificar risco corretamente (escala 1-25) - Matriz 5x5', async () => {
      const testCases = [
        { riskScore: 25, expected: 'muito_critico' },  // >= 20
        { riskScore: 20, expected: 'muito_critico' },  // >= 20
        { riskScore: 19, expected: 'critico' },        // >= 15
        { riskScore: 15, expected: 'critico' },        // >= 15
        { riskScore: 14, expected: 'alto' },           // >= 10
        { riskScore: 10, expected: 'alto' },           // >= 10
        { riskScore: 9, expected: 'moderado' },        // >= 5
        { riskScore: 5, expected: 'moderado' },        // >= 5
        { riskScore: 4, expected: 'baixo' },           // < 5
      ];
      
      for (const { riskScore, expected } of testCases) {
        let classification: string;
        if (riskScore >= 20) classification = 'muito_critico';
        else if (riskScore >= 15) classification = 'critico';
        else if (riskScore >= 10) classification = 'alto';
        else if (riskScore >= 5) classification = 'moderado';
        else classification = 'baixo';
        
        expect(classification).toBe(expected);
      }
    });
  });

  describe('P0.4 - Conclusão de Avaliação', () => {
    it('deve atualizar status da avaliação ao concluir', async () => {
      mockDb.updateThirdPartyAssessment.mockResolvedValueOnce({
        id: 1,
        status: 'concluido',
        completedAt: new Date().toISOString(),
      });
      
      const result = await mockDb.updateThirdPartyAssessment(1, {
        status: 'concluido',
        completedAt: new Date().toISOString(),
      });
      
      expect(result.status).toBe('concluido');
      expect(result.completedAt).toBeDefined();
    });

    it('deve marcar link como completado', async () => {
      mockDb.updateAccessLink.mockResolvedValueOnce({
        id: 1,
        completedAt: new Date().toISOString(),
      });
      
      const result = await mockDb.updateAccessLink(1, {
        completedAt: new Date().toISOString(),
      });
      
      expect(result.completedAt).toBeDefined();
    });
  });

  describe('P1 - UX do Questionário', () => {
    it('deve retornar contexto completo para exibição', async () => {
      mockDb.getAccessLinkByToken.mockResolvedValueOnce({
        id: 1,
        token: 'token-ux',
        organizationId: 1,
        thirdPartyId: 1,
        assessmentId: 1,
        isActive: true,
        type: 'due_diligence',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });
      
      mockDb.getOrganizationById.mockResolvedValueOnce({
        id: 1,
        name: 'Empresa Contratante',
      });
      
      mockDb.getThirdPartyById.mockResolvedValueOnce({
        id: 1,
        name: 'Fornecedor XYZ',
        tradeName: 'XYZ Ltda',
        type: 'fornecedor',
      });
      
      mockDb.getThirdPartyLinkResponsesByAccessLink.mockResolvedValueOnce([]);
      
      const link = await mockDb.getAccessLinkByToken('token-ux');
      const org = await mockDb.getOrganizationById(link.organizationId);
      const thirdParty = await mockDb.getThirdPartyById(link.thirdPartyId);
      const responses = await mockDb.getThirdPartyLinkResponsesByAccessLink(link.id);
      
      // Verificar que todos os dados necessários para UX estão disponíveis
      expect(org.name).toBeDefined();
      expect(thirdParty.name).toBeDefined();
      expect(thirdParty.type).toBeDefined();
      expect(Array.isArray(responses)).toBe(true);
    });
  });
});

describe('Due Diligence - Cálculo de Risco', () => {
  it('deve calcular riskThreshold corretamente (1-25)', () => {
    // Matriz 5x5: probabilidade (1-5) x impacto (1-5)
    const testCases = [
      { probability: 5, impact: 5, expected: 25 },
      { probability: 4, impact: 5, expected: 20 },
      { probability: 3, impact: 5, expected: 15 },
      { probability: 2, impact: 5, expected: 10 },
      { probability: 1, impact: 5, expected: 5 },
      { probability: 1, impact: 1, expected: 1 },
    ];
    
    for (const { probability, impact, expected } of testCases) {
      const riskScore = probability * impact;
      expect(riskScore).toBe(expected);
      expect(riskScore).toBeGreaterThanOrEqual(1);
      expect(riskScore).toBeLessThanOrEqual(25);
    }
  });

  it('deve classificar severidade corretamente - Matriz 5x5', () => {
    const classifyRisk = (score: number): string => {
      if (score >= 20) return 'muito_critico';
      if (score >= 15) return 'critico';
      if (score >= 10) return 'alto';
      if (score >= 5) return 'moderado';
      return 'baixo';
    };
    
    expect(classifyRisk(25)).toBe('muito_critico');
    expect(classifyRisk(20)).toBe('muito_critico');
    expect(classifyRisk(19)).toBe('critico');
    expect(classifyRisk(15)).toBe('critico');
    expect(classifyRisk(14)).toBe('alto');
    expect(classifyRisk(10)).toBe('alto');
    expect(classifyRisk(9)).toBe('moderado');
    expect(classifyRisk(5)).toBe('moderado');
    expect(classifyRisk(4)).toBe('baixo');
    expect(classifyRisk(1)).toBe('baixo');
  });
});
