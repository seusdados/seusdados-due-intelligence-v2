import { describe, it, expect } from 'vitest';
import {
  DUE_DILIGENCE_FRAMEWORK,
  DUE_DILIGENCE_SECTIONS,
  DD_QUESTION_OPTIONS,
  getDueDiligenceQuestionById,
  getDueDiligenceQuestionByNumber,
  getDueDiligenceQuestionsBySection,
  getTotalDueDiligenceQuestions,
  calculateDueDiligenceRiskScore,
  generateDueDiligenceRecommendations
} from '../shared/frameworkDueDiligence';

describe('Due Diligence Framework', () => {
  describe('Framework Structure', () => {
    it('should have exactly 12 questions', () => {
      expect(DUE_DILIGENCE_FRAMEWORK.length).toBe(12);
      expect(getTotalDueDiligenceQuestions()).toBe(12);
    });

    it('should have 4 sections', () => {
      expect(DUE_DILIGENCE_SECTIONS.length).toBe(4);
    });

    it('should have questions with correct IDs (DD-01 to DD-12)', () => {
      const expectedIds = Array.from({ length: 12 }, (_, i) => `DD-${String(i + 1).padStart(2, '0')}`);
      const actualIds = DUE_DILIGENCE_FRAMEWORK.map(q => q.id);
      expect(actualIds).toEqual(expectedIds);
    });

    it('each question should have exactly 5 options (a-e)', () => {
      DUE_DILIGENCE_FRAMEWORK.forEach(question => {
        expect(question.options.length).toBe(5);
        const letters = question.options.map(o => o.letter);
        expect(letters).toEqual(['a', 'b', 'c', 'd', 'e']);
      });
    });

    it('each option should have level 1-5', () => {
      DUE_DILIGENCE_FRAMEWORK.forEach(question => {
        const levels = question.options.map(o => o.level);
        expect(levels).toEqual([1, 2, 3, 4, 5]);
      });
    });

    it('each question should have evidence examples', () => {
      DUE_DILIGENCE_FRAMEWORK.forEach(question => {
        expect(question.evidence).toBeDefined();
        expect(question.evidence.prompt).toBeTruthy();
        expect(question.evidence.examples.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Question Lookup Functions', () => {
    it('should find question by ID', () => {
      const question = getDueDiligenceQuestionById('DD-01');
      expect(question).toBeDefined();
      expect(question?.number).toBe(1);
      expect(question?.section).toBe('Contexto do Tratamento');
    });

    it('should find question by number', () => {
      const question = getDueDiligenceQuestionByNumber(5);
      expect(question).toBeDefined();
      expect(question?.id).toBe('DD-05');
    });

    it('should find questions by section', () => {
      const questions = getDueDiligenceQuestionsBySection('DD-S1');
      expect(questions.length).toBe(3); // Contexto do Tratamento has 3 questions
    });

    it('should return undefined for non-existent question', () => {
      const question = getDueDiligenceQuestionById('DD-99');
      expect(question).toBeUndefined();
    });
  });

  describe('Question Options Mapping', () => {
    it('should have options for all 12 questions', () => {
      expect(Object.keys(DD_QUESTION_OPTIONS).length).toBe(12);
    });

    it('should have correct structure for each question options', () => {
      const options = DD_QUESTION_OPTIONS['DD-01'];
      expect(options).toBeDefined();
      expect(options.length).toBe(5);
      expect(options[0]).toHaveProperty('letter');
      expect(options[0]).toHaveProperty('text');
      expect(options[0]).toHaveProperty('level');
    });
  });

  describe('Risk Score Calculation', () => {
    it('should calculate risk score for all low-risk responses', () => {
      const responses: Record<string, number> = {};
      DUE_DILIGENCE_FRAMEWORK.forEach(q => {
        // For inherent questions (1-3), level 1 is lowest risk
        // For control questions (4-12), level 5 is lowest risk
        responses[q.id] = q.type === 'inherent' ? 1 : 5;
      });

      const result = calculateDueDiligenceRiskScore(responses);
      expect(result.riskLevel).toBe('baixo');
      expect(result.percentage).toBeLessThan(30);
    });

    it('should calculate risk score for all high-risk responses', () => {
      const responses: Record<string, number> = {};
      DUE_DILIGENCE_FRAMEWORK.forEach(q => {
        // For inherent questions (1-3), level 5 is highest risk
        // For control questions (4-12), level 1 is highest risk
        responses[q.id] = q.type === 'inherent' ? 5 : 1;
      });

      const result = calculateDueDiligenceRiskScore(responses);
      expect(['alto', 'critico']).toContain(result.riskLevel);
      expect(result.percentage).toBeGreaterThan(50);
    });

    it('should handle partial responses', () => {
      const responses: Record<string, number> = {
        'DD-01': 3,
        'DD-02': 3,
        'DD-03': 3
      };

      const result = calculateDueDiligenceRiskScore(responses);
      expect(result.totalScore).toBeGreaterThan(0);
      expect(result.maxScore).toBe(25);
    });

    it('should separate inherent and control risks', () => {
      const responses: Record<string, number> = {};
      DUE_DILIGENCE_FRAMEWORK.forEach(q => {
        responses[q.id] = 3; // Middle level for all
      });

      const result = calculateDueDiligenceRiskScore(responses);
      expect(result.inherentRisk).toBeGreaterThan(0);
      expect(result.controlRisk).toBeGreaterThan(0);
    });
  });

  describe('Recommendations Generation', () => {
    it('should generate recommendations for high-risk responses', () => {
      const responses: Record<string, number> = {
        'DD-01': 5, // High risk inherent
        'DD-04': 1, // High risk control (no responsible)
        'DD-07': 1  // High risk control (no security)
      };

      const recommendations = generateDueDiligenceRecommendations(responses);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty('priority');
      expect(recommendations[0]).toHaveProperty('recommendation');
    });

    it('should not generate recommendations for low-risk responses', () => {
      const responses: Record<string, number> = {
        'DD-01': 1, // Low risk inherent
        'DD-04': 5, // Low risk control
        'DD-07': 5  // Low risk control
      };

      const recommendations = generateDueDiligenceRecommendations(responses);
      expect(recommendations.length).toBe(0);
    });

    it('should order recommendations by priority', () => {
      const responses: Record<string, number> = {};
      DUE_DILIGENCE_FRAMEWORK.forEach(q => {
        responses[q.id] = q.type === 'inherent' ? 4 : 2; // Medium-high risk
      });

      const recommendations = generateDueDiligenceRecommendations(responses);
      if (recommendations.length > 1) {
        const priorities = recommendations.map(r => r.priority);
        const priorityOrder = { alta: 0, media: 1, baixa: 2 };
        for (let i = 1; i < priorities.length; i++) {
          expect(priorityOrder[priorities[i]]).toBeGreaterThanOrEqual(priorityOrder[priorities[i - 1]]);
        }
      }
    });
  });

  describe('Section Distribution', () => {
    it('should have correct questions per section', () => {
      const sectionCounts: Record<string, number> = {
        'DD-S1': 3, // Contexto do Tratamento
        'DD-S2': 3, // Governança LGPD
        'DD-S3': 3, // Controles Práticos
        'DD-S4': 3  // Incidentes e Resposta
      };

      Object.entries(sectionCounts).forEach(([sectionId, expectedCount]) => {
        const questions = getDueDiligenceQuestionsBySection(sectionId);
        expect(questions.length).toBe(expectedCount);
      });
    });

    it('should have inherent type for first 3 questions', () => {
      const inherentQuestions = DUE_DILIGENCE_FRAMEWORK.filter(q => q.type === 'inherent');
      expect(inherentQuestions.length).toBe(3);
      expect(inherentQuestions.map(q => q.number)).toEqual([1, 2, 3]);
    });

    it('should have control type for questions 4-12', () => {
      const controlQuestions = DUE_DILIGENCE_FRAMEWORK.filter(q => q.type === 'control');
      expect(controlQuestions.length).toBe(9);
      expect(controlQuestions.map(q => q.number)).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });
  });

  describe('LGPD References', () => {
    it('each option should have LGPD references', () => {
      DUE_DILIGENCE_FRAMEWORK.forEach(question => {
        question.options.forEach(option => {
          expect(option.lgpdRefs).toBeDefined();
          expect(Array.isArray(option.lgpdRefs)).toBe(true);
        });
      });
    });

    it('should reference key LGPD articles', () => {
      const allRefs = new Set<string>();
      DUE_DILIGENCE_FRAMEWORK.forEach(question => {
        question.options.forEach(option => {
          option.lgpdRefs.forEach(ref => allRefs.add(ref));
        });
      });

      // Check for key articles
      const refsString = Array.from(allRefs).join(' ');
      expect(refsString).toContain('Art. 6');
      expect(refsString).toContain('Art. 46');
      expect(refsString).toContain('Art. 48');
    });
  });
});
