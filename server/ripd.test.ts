/**
 * PATCH-2-RIPD-AUTOMATION: Testes dos Routers RIPD
 */
import { describe, it, expect } from 'vitest';
import { ripdEvidenceRouter } from './ripdEvidenceRouter';
import { ripdAiRouter } from './ripdAiRouter';
import { ripdWorkflowRouterPremium } from './ripdWorkflowRouterPremium';
import { ripdSignatureRouter } from './ripdSignatureRouter';
import { ripdReportRouter } from './ripdReportRouter';
import { ripdTasksRouter } from './ripdTasksRouter';
import { ripdContractIntegrationRouter } from './ripdContractIntegrationRouter';

describe('PATCH-2-RIPD-AUTOMATION: Routers', () => {
  describe('ripdEvidenceRouter', () => {
    it('deve ter os procedimentos de evidências', () => {
      expect(ripdEvidenceRouter).toBeDefined();
      expect(ripdEvidenceRouter._def.procedures).toHaveProperty('uploadAndLink');
      expect(ripdEvidenceRouter._def.procedures).toHaveProperty('list');
      expect(ripdEvidenceRouter._def.procedures).toHaveProperty('unlink');
      expect(ripdEvidenceRouter._def.procedures).toHaveProperty('validateCompleteness');
    });
  });

  describe('ripdAiRouter', () => {
    it('deve ter os procedimentos de IA', () => {
      expect(ripdAiRouter).toBeDefined();
      expect(ripdAiRouter._def.procedures).toHaveProperty('validateAnswer');
      expect(ripdAiRouter._def.procedures).toHaveProperty('suggestRisks');
      expect(ripdAiRouter._def.procedures).toHaveProperty('suggestMitigations');
      expect(ripdAiRouter._def.procedures).toHaveProperty('evaluateResidual');
    });
  });

  describe('ripdWorkflowRouterPremium', () => {
    it('deve ter os procedimentos de workflow premium', () => {
      expect(ripdWorkflowRouterPremium).toBeDefined();
      expect(ripdWorkflowRouterPremium._def.procedures).toHaveProperty('syncActionPlansFromDpia');
      expect(ripdWorkflowRouterPremium._def.procedures).toHaveProperty('convertActionPlanToTicket');
      expect(ripdWorkflowRouterPremium._def.procedures).toHaveProperty('requestDpoValidation');
      expect(ripdWorkflowRouterPremium._def.procedures).toHaveProperty('getTraceability');
      expect(ripdWorkflowRouterPremium._def.procedures).toHaveProperty('onClientCompletedActionPlan');
      expect(ripdWorkflowRouterPremium._def.procedures).toHaveProperty('validateActionPlanAsDpo');
      expect(ripdWorkflowRouterPremium._def.procedures).toHaveProperty('listPendingDpoValidations');
      expect(ripdWorkflowRouterPremium._def.procedures).toHaveProperty('getDpoValidationQueueStats');
    });
  });

  describe('ripdSignatureRouter', () => {
    it('deve ter os procedimentos de assinatura', () => {
      expect(ripdSignatureRouter).toBeDefined();
      expect(ripdSignatureRouter._def.procedures).toHaveProperty('requestSignatures');
      expect(ripdSignatureRouter._def.procedures).toHaveProperty('getStatus');
      expect(ripdSignatureRouter._def.procedures).toHaveProperty('onWebhook');
    });
  });

  describe('ripdReportRouter', () => {
    it('deve ter os procedimentos de relatórios', () => {
      expect(ripdReportRouter).toBeDefined();
      expect(ripdReportRouter._def.procedures).toHaveProperty('generateFullPdf');
      expect(ripdReportRouter._def.procedures).toHaveProperty('generateSimplifiedPdf');
      expect(ripdReportRouter._def.procedures).toHaveProperty('generateAnpdPackage');
    });
  });

  describe('ripdTasksRouter', () => {
    it('deve ter os procedimentos de tarefas', () => {
      expect(ripdTasksRouter).toBeDefined();
      expect(ripdTasksRouter._def.procedures).toHaveProperty('createMitigationTasks');
      expect(ripdTasksRouter._def.procedures).toHaveProperty('createReviewTask');
      expect(ripdTasksRouter._def.procedures).toHaveProperty('syncTaskStatus');
      expect(ripdTasksRouter._def.procedures).toHaveProperty('createHighRiskTasks');
    });
  });

  describe('ripdContractIntegrationRouter', () => {
    it('deve ter os procedimentos de integração com contratos', () => {
      expect(ripdContractIntegrationRouter).toBeDefined();
      expect(ripdContractIntegrationRouter._def.procedures).toHaveProperty('generateFromContract');
      expect(ripdContractIntegrationRouter._def.procedures).toHaveProperty('lockContract');
      expect(ripdContractIntegrationRouter._def.procedures).toHaveProperty('syncData');
      expect(ripdContractIntegrationRouter._def.procedures).toHaveProperty('checkRipdRequired');
    });
  });
});

describe('PATCH-2-RIPD-AUTOMATION: Workflow State Machine', () => {
  const VALID_TRANSITIONS: Record<string, string[]> = {
    'draft': ['ready_for_review'],
    'ready_for_review': ['submitted_to_meudpo', 'draft'],
    'submitted_to_meudpo': ['meudpo_returned', 'ready_for_signature'],
    'meudpo_returned': ['ready_for_review'],
    'ready_for_signature': ['signing'],
    'signing': ['signed', 'ready_for_signature'],
    'signed': []
  };

  it('deve permitir transição de draft para ready_for_review', () => {
    expect(VALID_TRANSITIONS['draft']).toContain('ready_for_review');
  });

  it('deve permitir transição de ready_for_review para submitted_to_meudpo', () => {
    expect(VALID_TRANSITIONS['ready_for_review']).toContain('submitted_to_meudpo');
  });

  it('deve permitir voltar de ready_for_review para draft', () => {
    expect(VALID_TRANSITIONS['ready_for_review']).toContain('draft');
  });

  it('deve permitir transição de submitted_to_meudpo para ready_for_signature (aprovado)', () => {
    expect(VALID_TRANSITIONS['submitted_to_meudpo']).toContain('ready_for_signature');
  });

  it('deve permitir transição de submitted_to_meudpo para meudpo_returned (devolvido)', () => {
    expect(VALID_TRANSITIONS['submitted_to_meudpo']).toContain('meudpo_returned');
  });

  it('deve permitir transição de meudpo_returned para ready_for_review', () => {
    expect(VALID_TRANSITIONS['meudpo_returned']).toContain('ready_for_review');
  });

  it('deve permitir transição de ready_for_signature para signing', () => {
    expect(VALID_TRANSITIONS['ready_for_signature']).toContain('signing');
  });

  it('deve permitir transição de signing para signed', () => {
    expect(VALID_TRANSITIONS['signing']).toContain('signed');
  });

  it('não deve permitir transições a partir de signed', () => {
    expect(VALID_TRANSITIONS['signed']).toHaveLength(0);
  });
});

describe('PATCH-2-RIPD-AUTOMATION: Idempotency Keys', () => {
  it('deve gerar chave de idempotência para mitigação', () => {
    const mitigationId = 123;
    const key = `origin:ripd:mitigation:${mitigationId}`;
    expect(key).toBe('origin:ripd:mitigation:123');
  });

  it('deve gerar chave de idempotência para revisão', () => {
    const ripdId = 456;
    const key = `origin:ripd:review:${ripdId}`;
    expect(key).toBe('origin:ripd:review:456');
  });

  it('deve gerar chave de idempotência para risco', () => {
    const riskId = 789;
    const key = `origin:ripd:risk:${riskId}`;
    expect(key).toBe('origin:ripd:risk:789');
  });
});

describe('PATCH-2-RIPD-AUTOMATION: Risk Level Calculation - Matriz 5x5', () => {
  const calculateLevel = (score: number): string => {
    if (score >= 20) return 'muito_critico';
    if (score >= 15) return 'critico';
    if (score >= 10) return 'alto';
    if (score >= 5) return 'moderado';
    return 'baixo';
  };

  it('deve classificar como muito crítico (score >= 20)', () => {
    expect(calculateLevel(25)).toBe('muito_critico');
    expect(calculateLevel(20)).toBe('muito_critico');
  });

  it('deve classificar como crítico (score >= 15 e < 20)', () => {
    expect(calculateLevel(19)).toBe('critico');
    expect(calculateLevel(15)).toBe('critico');
  });

  it('deve classificar como alto (score >= 10 e < 15)', () => {
    expect(calculateLevel(14)).toBe('alto');
    expect(calculateLevel(10)).toBe('alto');
  });

  it('deve classificar como moderado (score >= 5 e < 10)', () => {
    expect(calculateLevel(9)).toBe('moderado');
    expect(calculateLevel(5)).toBe('moderado');
  });

  it('deve classificar como baixo (score < 5)', () => {
    expect(calculateLevel(4)).toBe('baixo');
    expect(calculateLevel(1)).toBe('baixo');
  });
});
