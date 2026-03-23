/**
 * Testes do Framework SeusDados - Maturidade LGPD
 */

import { describe, it, expect } from 'vitest';
import {
  SEUSDADOS_DOMAINS,
  SEUSDADOS_MATURITY_LEVELS,
  getAllQuestions,
  getQuestionById,
  getDomainByCode,
  calculateDomainScore,
  calculateOverallScore,
  calculateAllDomainScores,
  generateActionPlan,
} from './frameworks/seusdados-framework';

describe('Framework SeusDados - Estrutura de Dados', () => {
  it('deve ter exatamente 5 domínios', () => {
    expect(SEUSDADOS_DOMAINS).toHaveLength(5);
  });

  it('deve ter os domínios corretos', () => {
    const domainCodes = SEUSDADOS_DOMAINS.map(d => d.code);
    expect(domainCodes).toContain('CULTURA_ORGANIZACIONAL');
    expect(domainCodes).toContain('PROCESSOS_DE_NEGOCIO');
    expect(domainCodes).toContain('GOVERNANCA_DE_TI');
    expect(domainCodes).toContain('SEGURANCA_DA_INFORMACAO');
    expect(domainCodes).toContain('INTELIGENCIA_ARTIFICIAL');
  });

  it('deve ter exatamente 39 perguntas no total', () => {
    const allQuestions = getAllQuestions();
    expect(allQuestions).toHaveLength(39);
  });

  it('deve ter 5 níveis de maturidade', () => {
    expect(SEUSDADOS_MATURITY_LEVELS).toHaveLength(5);
  });

  it('cada pergunta deve ter exatamente 5 opções', () => {
    const allQuestions = getAllQuestions();
    allQuestions.forEach(question => {
      expect(question.options).toHaveLength(5);
    });
  });

  it('cada opção deve ter níveis de 1 a 5', () => {
    const allQuestions = getAllQuestions();
    allQuestions.forEach(question => {
      const levels = question.options.map(o => o.level).sort((a, b) => a - b);
      expect(levels).toEqual([1, 2, 3, 4, 5]);
    });
  });
});

describe('Framework SeusDados - Domínios', () => {
  it('Cultura Organizacional deve ter 8 perguntas', () => {
    const domain = getDomainByCode('CULTURA_ORGANIZACIONAL');
    expect(domain).toBeDefined();
    expect(domain?.questions).toHaveLength(8);
  });

  it('Processos de Negócio deve ter 4 perguntas', () => {
    const domain = getDomainByCode('PROCESSOS_DE_NEGOCIO');
    expect(domain).toBeDefined();
    expect(domain?.questions).toHaveLength(4);
  });

  it('Governança de TI deve ter 10 perguntas', () => {
    const domain = getDomainByCode('GOVERNANCA_DE_TI');
    expect(domain).toBeDefined();
    expect(domain?.questions).toHaveLength(10);
  });

  it('Segurança da Informação deve ter 8 perguntas', () => {
    const domain = getDomainByCode('SEGURANCA_DA_INFORMACAO');
    expect(domain).toBeDefined();
    expect(domain?.questions).toHaveLength(8);
  });

  it('Inteligência Artificial deve ter 9 perguntas', () => {
    const domain = getDomainByCode('INTELIGENCIA_ARTIFICIAL');
    expect(domain).toBeDefined();
    expect(domain?.questions).toHaveLength(9);
  });
});

describe('Framework SeusDados - Busca de Perguntas', () => {
  it('deve encontrar pergunta por ID', () => {
    const question = getQuestionById('CO-01');
    expect(question).toBeDefined();
    expect(question?.id).toBe('CO-01');
    expect(question?.prompt).toContain('CPPD');
  });

  it('deve retornar undefined para ID inexistente', () => {
    const question = getQuestionById('INEXISTENTE');
    expect(question).toBeUndefined();
  });

  it('deve encontrar domínio por código', () => {
    const domain = getDomainByCode('SEGURANCA_DA_INFORMACAO');
    expect(domain).toBeDefined();
    expect(domain?.label).toBe('Segurança da Informação');
  });
});

describe('Framework SeusDados - Cálculo de Scores', () => {
  it('deve calcular score do domínio corretamente', () => {
    const answers = [
      { questionCode: 'CO-01', selectedLevel: 3 },
      { questionCode: 'CO-02', selectedLevel: 4 },
      { questionCode: 'CO-03', selectedLevel: 2 },
      { questionCode: 'CO-04', selectedLevel: 5 },
      { questionCode: 'CO-05', selectedLevel: 3 },
      { questionCode: 'CO-06', selectedLevel: 4 },
      { questionCode: 'CO-07', selectedLevel: 3 },
      { questionCode: 'CO-08', selectedLevel: 4 },
    ];

    const score = calculateDomainScore(answers, 'CULTURA_ORGANIZACIONAL');
    expect(score.domainCode).toBe('CULTURA_ORGANIZACIONAL');
    expect(score.answeredQuestions).toBe(8);
    expect(score.totalQuestions).toBe(8);
    expect(score.scoreAvg).toBeCloseTo(3.5, 1);
  });

  it('deve calcular score geral corretamente', () => {
    const answers = [
      { questionCode: 'CO-01', selectedLevel: 4 },
      { questionCode: 'CO-02', selectedLevel: 4 },
      { questionCode: 'PN-01', selectedLevel: 3 },
      { questionCode: 'PN-02', selectedLevel: 3 },
    ];

    const score = calculateOverallScore(answers);
    expect(score.answeredQuestions).toBe(4);
    expect(score.scoreAvg).toBe(3.5);
    expect(score.levelRounded).toBe(4);
  });

  it('deve retornar score zero para respostas vazias', () => {
    const score = calculateOverallScore([]);
    expect(score.scoreAvg).toBe(0);
    expect(score.levelRounded).toBe(0);
    expect(score.answeredQuestions).toBe(0);
  });

  it('deve calcular scores de todos os domínios', () => {
    const answers = [
      { questionCode: 'CO-01', selectedLevel: 4 },
      { questionCode: 'PN-01', selectedLevel: 3 },
      { questionCode: 'GT-01', selectedLevel: 5 },
      { questionCode: 'SI-01', selectedLevel: 2 },
      { questionCode: 'IA-01', selectedLevel: 4 },
    ];

    const scores = calculateAllDomainScores(answers);
    expect(scores).toHaveLength(5);
    
    const coScore = scores.find(s => s.domainCode === 'CULTURA_ORGANIZACIONAL');
    expect(coScore?.scoreAvg).toBe(4);
    
    const siScore = scores.find(s => s.domainCode === 'SEGURANCA_DA_INFORMACAO');
    expect(siScore?.scoreAvg).toBe(2);
  });
});

describe('Framework SeusDados - Geração de Plano de Ação', () => {
  it('deve gerar ações para perguntas com nível < 4', () => {
    const answers = [
      { questionCode: 'CO-01', selectedLevel: 2 },
      { questionCode: 'CO-02', selectedLevel: 4 },
      { questionCode: 'CO-03', selectedLevel: 1 },
      { questionCode: 'CO-04', selectedLevel: 5 },
    ];

    const actionPlan = generateActionPlan(answers);
    expect(actionPlan.length).toBe(2); // CO-01 (nível 2) e CO-03 (nível 1)
  });

  it('deve priorizar ações por nível (P0 para nível 1)', () => {
    const answers = [
      { questionCode: 'CO-01', selectedLevel: 1 },
      { questionCode: 'CO-02', selectedLevel: 2 },
      { questionCode: 'CO-03', selectedLevel: 3 },
    ];

    const actionPlan = generateActionPlan(answers);
    expect(actionPlan[0].priority).toBe('P0');
    expect(actionPlan[0].currentLevel).toBe(1);
  });

  it('deve definir esforço baseado no gap', () => {
    const answers = [
      { questionCode: 'CO-01', selectedLevel: 1 }, // gap = 3, esforço L
      { questionCode: 'CO-02', selectedLevel: 2 }, // gap = 2, esforço M
      { questionCode: 'CO-03', selectedLevel: 3 }, // gap = 1, esforço S
    ];

    const actionPlan = generateActionPlan(answers);
    
    const action1 = actionPlan.find(a => a.relatedQuestionIds.includes('CO-01'));
    expect(action1?.effort).toBe('L');
    
    const action2 = actionPlan.find(a => a.relatedQuestionIds.includes('CO-02'));
    expect(action2?.effort).toBe('M');
    
    const action3 = actionPlan.find(a => a.relatedQuestionIds.includes('CO-03'));
    expect(action3?.effort).toBe('S');
  });

  it('não deve gerar ações para perguntas com nível >= 4', () => {
    const answers = [
      { questionCode: 'CO-01', selectedLevel: 4 },
      { questionCode: 'CO-02', selectedLevel: 5 },
    ];

    const actionPlan = generateActionPlan(answers);
    expect(actionPlan).toHaveLength(0);
  });

  it('deve ordenar ações por prioridade', () => {
    const answers = [
      { questionCode: 'CO-01', selectedLevel: 3 }, // P2
      { questionCode: 'CO-02', selectedLevel: 1 }, // P0
      { questionCode: 'CO-03', selectedLevel: 2 }, // P1
    ];

    const actionPlan = generateActionPlan(answers);
    expect(actionPlan[0].priority).toBe('P0');
    expect(actionPlan[1].priority).toBe('P1');
    expect(actionPlan[2].priority).toBe('P2');
  });
});

describe('Framework SeusDados - Metadados de Frameworks', () => {
  it('perguntas devem ter tags de frameworks', () => {
    const question = getQuestionById('CO-01');
    expect(question?.frameworkTags).toBeDefined();
    expect(question?.frameworkTags.length).toBeGreaterThan(0);
  });

  it('perguntas devem ter metadados ISO quando aplicável', () => {
    const question = getQuestionById('CO-01');
    expect(question?.frameworkMetadata.iso).toBeDefined();
    expect(question?.frameworkMetadata.iso?.family).toBeDefined();
    expect(question?.frameworkMetadata.iso?.topics).toBeDefined();
  });

  it('perguntas devem ter metadados NIST quando aplicável', () => {
    const question = getQuestionById('CO-01');
    expect(question?.frameworkMetadata.nist_privacy).toBeDefined();
    expect(question?.frameworkMetadata.nist_privacy?.functions).toBeDefined();
    expect(question?.frameworkMetadata.nist_privacy?.categories).toBeDefined();
  });

  it('perguntas devem ter metadados LGPD quando aplicável', () => {
    const question = getQuestionById('CO-01');
    expect(question?.frameworkMetadata.lgpd).toBeDefined();
    expect(question?.frameworkMetadata.lgpd?.topics).toBeDefined();
  });

  it('perguntas de IA devem ter metadados de IA', () => {
    const question = getQuestionById('IA-01');
    expect(question?.frameworkMetadata.ia).toBeDefined();
    expect(question?.frameworkMetadata.ia?.topics).toBeDefined();
  });
});
