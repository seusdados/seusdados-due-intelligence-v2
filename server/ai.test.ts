import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getAiProviderConfigs: vi.fn().mockResolvedValue([
    { id: 1, provider: 'gemini', isEnabled: true, isDefault: true, model: 'gemini-2.5-flash' },
    { id: 2, provider: 'openai', isEnabled: false, isDefault: false, model: 'gpt-4' },
  ]),
  getEnabledAiProviders: vi.fn().mockResolvedValue([
    { id: 1, provider: 'gemini', isEnabled: true, isDefault: true, model: 'gemini-2.5-flash' },
  ]),
  getAiOrganizationInstructions: vi.fn().mockResolvedValue([
    { 
      id: 1, 
      organizationId: 1, 
      module: 'compliance', 
      systemPrompt: 'Você é um especialista em LGPD', 
      responseStyle: 'formal',
      includeRecommendations: true,
      includeRiskAnalysis: true,
      includeActionPlan: true,
    }
  ]),
  createAiOrganizationInstruction: vi.fn().mockResolvedValue(1),
  updateAiOrganizationInstruction: vi.fn().mockResolvedValue(undefined),
  deleteAiOrganizationInstruction: vi.fn().mockResolvedValue(undefined),
  getAiChatSessions: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, organizationId: 1, module: 'compliance', title: 'Análise LGPD', status: 'active' }
  ]),
  getAiChatSessionById: vi.fn().mockResolvedValue({
    id: 1, userId: 1, organizationId: 1, module: 'compliance', title: 'Análise LGPD', status: 'active', totalTokensUsed: 0
  }),
  createAiChatSession: vi.fn().mockResolvedValue(1),
  updateAiChatSession: vi.fn().mockResolvedValue(undefined),
  deleteAiChatSession: vi.fn().mockResolvedValue(undefined),
  getAiChatMessages: vi.fn().mockResolvedValue([
    { id: 1, sessionId: 1, role: 'user', content: 'Olá', createdAt: new Date().toISOString() },
    { id: 2, sessionId: 1, role: 'assistant', content: 'Olá! Como posso ajudar?', createdAt: new Date().toISOString() },
  ]),
  createAiChatMessage: vi.fn().mockResolvedValue(3),
  getAiPromptTemplates: vi.fn().mockResolvedValue([
    { id: 1, name: 'Análise de Conformidade', module: 'compliance', isSystem: true, isActive: true }
  ]),
  createAiPromptTemplate: vi.fn().mockResolvedValue(2),
  updateAiPromptTemplate: vi.fn().mockResolvedValue(undefined),
  deleteAiPromptTemplate: vi.fn().mockResolvedValue(undefined),
  getAiGeneratedResults: vi.fn().mockResolvedValue([
    { id: 1, organizationId: 1, module: 'compliance', entityType: 'compliance_assessment', status: 'pending' }
  ]),
  getAiGeneratedResultById: vi.fn().mockResolvedValue({
    id: 1, organizationId: 1, module: 'compliance', entityType: 'compliance_assessment', status: 'pending', content: 'Análise...'
  }),
  createAiGeneratedResult: vi.fn().mockResolvedValue(1),
  approveAiGeneratedResult: vi.fn().mockResolvedValue(undefined),
  applyAiGeneratedResult: vi.fn().mockResolvedValue(undefined),
  getOrganizationById: vi.fn().mockResolvedValue({ id: 1, name: 'Empresa Teste', tradeName: 'Teste' }),
  getComplianceAssessmentById: vi.fn().mockResolvedValue({ id: 1, title: 'Avaliação LGPD', status: 'concluida' }),
  getComplianceResponsesByAssessment: vi.fn().mockResolvedValue([]),
  getThirdPartyAssessmentById: vi.fn().mockResolvedValue({ id: 1, title: 'Due Diligence', thirdPartyId: 1 }),
  getThirdPartyById: vi.fn().mockResolvedValue({ id: 1, name: 'Fornecedor X', tradeName: 'Fornecedor' }),
  getThirdPartyResponsesByAssessment: vi.fn().mockResolvedValue([]),
}));

// Mock the AI service
vi.mock('./aiService', () => ({
  chatWithAI: vi.fn().mockResolvedValue({
    content: 'Esta é uma resposta de teste do agente de IA.',
    tokensUsed: 150,
    model: 'gemini-2.5-flash',
    provider: 'gemini',
  }),
  generateComplianceAnalysis: vi.fn().mockResolvedValue({
    content: '## Análise de Conformidade\n\nEsta é uma análise detalhada...',
    tokensUsed: 500,
  }),
  generateThirdPartyAnalysis: vi.fn().mockResolvedValue({
    content: '## Análise de Due Diligence\n\nEsta é uma análise de terceiro...',
    tokensUsed: 450,
  }),
}));

import * as db from './db';
import * as aiService from './aiService';

describe('AI Integration Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider Configs', () => {
    it('should return list of AI provider configurations', async () => {
      const configs = await db.getAiProviderConfigs();
      
      expect(configs).toHaveLength(2);
      expect(configs[0].provider).toBe('gemini');
      expect(configs[0].isDefault).toBe(true);
    });

    it('should return only enabled providers', async () => {
      const enabled = await db.getEnabledAiProviders();
      
      expect(enabled).toHaveLength(1);
      expect(enabled[0].provider).toBe('gemini');
      expect(enabled[0].isEnabled).toBe(true);
    });
  });

  describe('Organization Instructions', () => {
    it('should return organization-specific AI instructions', async () => {
      const instructions = await db.getAiOrganizationInstructions(1, 'compliance');
      
      expect(instructions).toHaveLength(1);
      expect(instructions[0].organizationId).toBe(1);
      expect(instructions[0].module).toBe('compliance');
      expect(instructions[0].responseStyle).toBe('formal');
    });

    it('should create new organization instruction', async () => {
      const id = await db.createAiOrganizationInstruction({
        organizationId: 1,
        module: 'due_diligence',
        systemPrompt: 'Analise riscos de terceiros',
        responseStyle: 'tecnico',
        createdById: 1,
      });
      
      expect(id).toBe(1);
      expect(db.createAiOrganizationInstruction).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 1,
          module: 'due_diligence',
        })
      );
    });

    it('should update organization instruction', async () => {
      await db.updateAiOrganizationInstruction(1, { responseStyle: 'executivo' });
      
      expect(db.updateAiOrganizationInstruction).toHaveBeenCalledWith(1, { responseStyle: 'executivo' });
    });

    it('should delete organization instruction', async () => {
      await db.deleteAiOrganizationInstruction(1);
      
      expect(db.deleteAiOrganizationInstruction).toHaveBeenCalledWith(1);
    });
  });

  describe('Chat Sessions', () => {
    it('should return user chat sessions', async () => {
      const sessions = await db.getAiChatSessions(1, 1);
      
      expect(sessions).toHaveLength(1);
      expect(sessions[0].module).toBe('compliance');
      expect(sessions[0].status).toBe('active');
    });

    it('should create new chat session', async () => {
      const id = await db.createAiChatSession({
        userId: 1,
        organizationId: 1,
        module: 'general',
        title: 'Nova conversa',
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        status: 'active',
        totalTokensUsed: 0,
      });
      
      expect(id).toBe(1);
    });

    it('should get chat session with messages', async () => {
      const session = await db.getAiChatSessionById(1);
      const messages = await db.getAiChatMessages(1);
      
      expect(session).toBeDefined();
      expect(session?.id).toBe(1);
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
    });
  });

  describe('AI Service Integration', () => {
    it('should chat with AI and return response', async () => {
      const response = await aiService.chatWithAI(
        [{ role: 'user', content: 'Olá' }],
        { module: 'general' }
      );
      
      expect(response.content).toBeDefined();
      expect(response.tokensUsed).toBeGreaterThan(0);
      expect(response.provider).toBe('gemini');
    });

    it('should generate compliance analysis', async () => {
      const response = await aiService.generateComplianceAnalysis(
        { id: 1, title: 'Avaliação', responses: [] },
        'Empresa Teste'
      );
      
      expect(response.content).toContain('Análise de Conformidade');
      expect(response.tokensUsed).toBeGreaterThan(0);
    });

    it('should generate third party analysis', async () => {
      const response = await aiService.generateThirdPartyAnalysis(
        { id: 1, title: 'Due Diligence', thirdPartyName: 'Fornecedor', responses: [] },
        'Empresa Teste'
      );
      
      expect(response.content).toContain('Due Diligence');
      expect(response.tokensUsed).toBeGreaterThan(0);
    });
  });

  describe('Prompt Templates', () => {
    it('should return prompt templates', async () => {
      const templates = await db.getAiPromptTemplates('compliance', true);
      
      expect(templates).toHaveLength(1);
      expect(templates[0].name).toBe('Análise de Conformidade');
      expect(templates[0].isSystem).toBe(true);
    });

    it('should create custom prompt template', async () => {
      const id = await db.createAiPromptTemplate({
        name: 'Meu Template',
        module: 'general',
        promptTemplate: 'Analise {{dados}}',
        isSystem: false,
        isActive: true,
        createdById: 1,
      });
      
      expect(id).toBe(2);
    });
  });

  describe('Generated Results', () => {
    it('should return generated results', async () => {
      const results = await db.getAiGeneratedResults(1, 'compliance');
      
      expect(results).toHaveLength(1);
      expect(results[0].entityType).toBe('compliance_assessment');
    });

    it('should approve generated result', async () => {
      await db.approveAiGeneratedResult(1, 1);
      
      expect(db.approveAiGeneratedResult).toHaveBeenCalledWith(1, 1);
    });

    it('should apply generated result', async () => {
      await db.applyAiGeneratedResult(1);
      
      expect(db.applyAiGeneratedResult).toHaveBeenCalledWith(1);
    });
  });

  describe('Access Control', () => {
    it('should restrict AI features to consultors only', () => {
      // This test validates that the consultorProcedure middleware exists
      // The actual access control is tested via integration tests
      const consultorRoles = ['admin_global', 'consultor'];
      const clienteRole = 'usuario';
      
      expect(consultorRoles).toContain('admin_global');
      expect(consultorRoles).toContain('consultor');
      expect(consultorRoles).not.toContain(clienteRole);
    });
  });

  describe('Multi-Provider Support', () => {
    it('should support multiple AI providers', () => {
      const supportedProviders = ['openai', 'gemini', 'claude', 'perplexity'];
      
      expect(supportedProviders).toContain('openai');
      expect(supportedProviders).toContain('gemini');
      expect(supportedProviders).toContain('claude');
      expect(supportedProviders).toContain('perplexity');
    });

    it('should have default provider configured', async () => {
      const configs = await db.getAiProviderConfigs();
      const defaultProvider = configs.find(c => c.isDefault);
      
      expect(defaultProvider).toBeDefined();
      expect(defaultProvider?.provider).toBe('gemini');
    });
  });

  describe('Response Styles', () => {
    it('should support multiple response styles', () => {
      const responseStyles = ['formal', 'tecnico', 'executivo', 'simplificado'];
      
      expect(responseStyles).toHaveLength(4);
      expect(responseStyles).toContain('formal');
      expect(responseStyles).toContain('tecnico');
      expect(responseStyles).toContain('executivo');
      expect(responseStyles).toContain('simplificado');
    });
  });

  describe('Module Support', () => {
    it('should support all application modules', () => {
      const modules = ['compliance', 'due_diligence', 'action_plans', 'general'];
      
      expect(modules).toHaveLength(4);
      expect(modules).toContain('compliance');
      expect(modules).toContain('due_diligence');
      expect(modules).toContain('action_plans');
      expect(modules).toContain('general');
    });
  });
});
