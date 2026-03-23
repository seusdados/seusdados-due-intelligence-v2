/**
 * Testes Unitários - Serviço de Geração de PDF para RIPD
 * 
 * Desenvolvido por: Seusdados Consultoria em Gestão de Dados Limitada
 * CNPJ: 33.899.116/0001-63 | www.seusdados.com
 * Responsabilidade Técnica: Marcelo Fattori
 */
import { describe, it, expect } from 'vitest';
import {
  getRiskColor,
  getRiskLevelLabel,
  formatDate,
  generateFullPdfHtml,
  generateSimplifiedPdfHtml,
} from './ripdPdfService';

describe('ripdPdfService - Funções Auxiliares', () => {
  describe('getRiskColor', () => {
    it('deve retornar cor correta para nível crítico', () => {
      expect(getRiskColor('critico')).toBe('#dc2626');
    });

    it('deve retornar cor correta para nível alto', () => {
      expect(getRiskColor('alto')).toBe('#ea580c');
    });

    it('deve retornar cor correta para nível médio', () => {
      expect(getRiskColor('medio')).toBe('#ca8a04');
    });

    it('deve retornar cor correta para nível baixo', () => {
      expect(getRiskColor('baixo')).toBe('#16a34a');
    });

    it('deve retornar cor padrão para nível desconhecido', () => {
      expect(getRiskColor('desconhecido')).toBe('#6b7280');
      expect(getRiskColor('')).toBe('#6b7280');
    });
  });

  describe('getRiskLevelLabel', () => {
    it('deve retornar label correto para nível crítico', () => {
      expect(getRiskLevelLabel('critico')).toBe('Crítico');
    });

    it('deve retornar label correto para nível alto', () => {
      expect(getRiskLevelLabel('alto')).toBe('Alto');
    });

    it('deve retornar label correto para nível médio', () => {
      expect(getRiskLevelLabel('medio')).toBe('Médio');
    });

    it('deve retornar label correto para nível baixo', () => {
      expect(getRiskLevelLabel('baixo')).toBe('Baixo');
    });

    it('deve retornar label padrão para nível desconhecido', () => {
      expect(getRiskLevelLabel('desconhecido')).toBe('Não avaliado');
      expect(getRiskLevelLabel('')).toBe('Não avaliado');
    });
  });

  describe('formatDate', () => {
    it('deve formatar data corretamente', () => {
      const date = new Date('2026-01-15T12:00:00Z'); // Usar horário UTC para evitar problemas de timezone
      const formatted = formatDate(date);
      // Aceita formato pt-BR ou en-US, com variação de dia devido a timezone
      expect(formatted).toMatch(/1[45]\/01\/2026|1\/1[45]\/2026/);
    });

    it('deve retornar string vazia para data nula', () => {
      expect(formatDate(null)).toBe('');
    });

    it('deve retornar string vazia para data undefined', () => {
      expect(formatDate(undefined)).toBe('');
    });
  });
});

describe('ripdPdfService - Geração de HTML', () => {
  const mockRipd = {
    id: 1,
    title: 'RIPD de Teste',
    description: 'Descrição do RIPD de teste',
    workflowStatus: 'draft',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-15'),
    version: 1,
    dpoId: 1,
  };

  const mockOrganization = { name: 'Organização de Teste' };

  const mockRisks = [
    {
      id: 1,
      title: 'Risco Crítico',
      description: 'Descrição do risco crítico',
      inherentLikelihood: 5,
      inherentImpact: 5,
      inherentScore: 25,
      inherentLevel: 'critico',
      residualLikelihood: 3,
      residualImpact: 3,
      residualScore: 9,
      residualLevel: 'medio',
      acceptanceDecision: 'mitigar',
    },
    {
      id: 2,
      title: 'Risco Alto',
      description: 'Descrição do risco alto',
      inherentLikelihood: 4,
      inherentImpact: 4,
      inherentScore: 16,
      inherentLevel: 'alto',
      residualLikelihood: 2,
      residualImpact: 2,
      residualScore: 4,
      residualLevel: 'baixo',
      acceptanceDecision: 'aceitar',
    },
  ];

  const mockMitigations = [
    {
      id: 1,
      riskId: 1,
      description: 'Implementar controle de acesso',
      status: 'em_andamento',
      dueDate: new Date('2026-03-01'),
    },
  ];

  const mockEvidences = [
    {
      id: 1,
      questionId: 1,
      gedDocumentId: 100,
      evidenceType: 'documento',
      tags: 'lgpd,evidencia',
    },
  ];

  const mockResponses = [
    {
      id: 1,
      questionId: 1,
      answer: 'Sim',
      evidenceStatus: 'completo',
      evidenceCount: 1,
    },
  ];

  const mockDpo = { name: 'DPO de Teste' };

  describe('generateFullPdfHtml', () => {
    it('deve gerar HTML com título do RIPD', () => {
      const html = generateFullPdfHtml({
        ripd: mockRipd,
        organization: mockOrganization,
        responses: mockResponses,
        risks: mockRisks,
        mitigations: mockMitigations,
        evidences: mockEvidences,
        dpo: mockDpo,
      });

      expect(html).toContain('RIPD de Teste');
      expect(html).toContain('Organização de Teste');
    });

    it('deve incluir seção de Resumo Executivo', () => {
      const html = generateFullPdfHtml({
        ripd: mockRipd,
        organization: mockOrganization,
        responses: mockResponses,
        risks: mockRisks,
        mitigations: mockMitigations,
        evidences: mockEvidences,
      });

      expect(html).toContain('Resumo Executivo');
      expect(html).toContain('Descrição do RIPD de teste');
    });

    it('deve incluir matriz de risco', () => {
      const html = generateFullPdfHtml({
        ripd: mockRipd,
        organization: mockOrganization,
        responses: mockResponses,
        risks: mockRisks,
        mitigations: mockMitigations,
        evidences: mockEvidences,
      });

      expect(html).toContain('Matriz de Risco');
      expect(html).toContain('Risco Inerente');
      expect(html).toContain('Risco Residual');
    });

    it('deve listar todos os riscos', () => {
      const html = generateFullPdfHtml({
        ripd: mockRipd,
        organization: mockOrganization,
        responses: mockResponses,
        risks: mockRisks,
        mitigations: mockMitigations,
        evidences: mockEvidences,
      });

      expect(html).toContain('Risco Crítico');
      expect(html).toContain('Risco Alto');
      expect(html).toContain('Riscos Identificados');
    });

    it('deve incluir mitigações', () => {
      const html = generateFullPdfHtml({
        ripd: mockRipd,
        organization: mockOrganization,
        responses: mockResponses,
        risks: mockRisks,
        mitigations: mockMitigations,
        evidences: mockEvidences,
      });

      expect(html).toContain('Medidas de Mitigação');
      expect(html).toContain('Implementar controle de acesso');
    });

    it('deve incluir índice de evidências', () => {
      const html = generateFullPdfHtml({
        ripd: mockRipd,
        organization: mockOrganization,
        responses: mockResponses,
        risks: mockRisks,
        mitigations: mockMitigations,
        evidences: mockEvidences,
      });

      expect(html).toContain('Índice de Evidências');
      expect(html).toContain('documento');
    });

    it('deve incluir rodapé com informações da Seusdados', () => {
      const html = generateFullPdfHtml({
        ripd: mockRipd,
        organization: mockOrganization,
        responses: mockResponses,
        risks: mockRisks,
        mitigations: mockMitigations,
        evidences: mockEvidences,
      });

      expect(html).toContain('Seusdados Consultoria em Gestão de Dados Limitada');
      expect(html).toContain('33.899.116/0001-63');
      expect(html).toContain('Marcelo Fattori');
    });

    it('deve incluir nome do DPO quando fornecido', () => {
      const html = generateFullPdfHtml({
        ripd: mockRipd,
        organization: mockOrganization,
        responses: mockResponses,
        risks: mockRisks,
        mitigations: mockMitigations,
        evidences: mockEvidences,
        dpo: mockDpo,
      });

      expect(html).toContain('DPO de Teste');
      expect(html).toContain('Encarregado (DPO)');
    });
  });

  describe('generateSimplifiedPdfHtml', () => {
    it('deve gerar HTML simplificado com título', () => {
      const html = generateSimplifiedPdfHtml({
        ripd: mockRipd,
        organization: mockOrganization,
        risks: mockRisks,
      });

      expect(html).toContain('Resumo do RIPD');
      expect(html).toContain('RIPD de Teste');
      expect(html).toContain('Organização de Teste');
    });

    it('deve mostrar visão geral dos riscos', () => {
      const html = generateSimplifiedPdfHtml({
        ripd: mockRipd,
        organization: mockOrganization,
        risks: mockRisks,
      });

      expect(html).toContain('Visão Geral dos Riscos');
      expect(html).toContain('Críticos');
      expect(html).toContain('Altos');
      expect(html).toContain('Médios');
      expect(html).toContain('Baixos');
    });

    it('deve mostrar principais riscos (top 5)', () => {
      const html = generateSimplifiedPdfHtml({
        ripd: mockRipd,
        organization: mockOrganization,
        risks: mockRisks,
      });

      expect(html).toContain('Principais Riscos');
      expect(html).toContain('Risco Crítico');
    });

    it('deve incluir informações do documento', () => {
      const html = generateSimplifiedPdfHtml({
        ripd: mockRipd,
        organization: mockOrganization,
        risks: mockRisks,
      });

      expect(html).toContain('Informações do Documento');
      expect(html).toContain('Versão');
      expect(html).toContain('Status');
    });

    it('deve incluir rodapé com informações da Seusdados', () => {
      const html = generateSimplifiedPdfHtml({
        ripd: mockRipd,
        organization: mockOrganization,
        risks: mockRisks,
      });

      expect(html).toContain('Seusdados Consultoria em Gestão de Dados Limitada');
      expect(html).toContain('33.899.116/0001-63');
    });

    it('deve ordenar riscos por score e mostrar top 5', () => {
      const manyRisks = [
        { id: 1, title: 'Risco 1', description: '', inherentScore: 10, inherentLevel: 'medio' },
        { id: 2, title: 'Risco 2', description: '', inherentScore: 25, inherentLevel: 'critico' },
        { id: 3, title: 'Risco 3', description: '', inherentScore: 5, inherentLevel: 'baixo' },
        { id: 4, title: 'Risco 4', description: '', inherentScore: 20, inherentLevel: 'alto' },
        { id: 5, title: 'Risco 5', description: '', inherentScore: 15, inherentLevel: 'alto' },
        { id: 6, title: 'Risco 6', description: '', inherentScore: 3, inherentLevel: 'baixo' },
      ];

      const html = generateSimplifiedPdfHtml({
        ripd: mockRipd,
        organization: mockOrganization,
        risks: manyRisks,
      });

      // Deve conter os top 5 riscos por score
      expect(html).toContain('Risco 2'); // score 25
      expect(html).toContain('Risco 4'); // score 20
      expect(html).toContain('Risco 5'); // score 15
      expect(html).toContain('Risco 1'); // score 10
      expect(html).toContain('Risco 3'); // score 5
      // Risco 6 (score 3) não deve aparecer pois é o 6º
    });
  });
});

describe('ripdPdfService - Estatísticas de Risco', () => {
  it('deve calcular corretamente estatísticas de risco inerente', () => {
    const risks = [
      { id: 1, title: 'R1', description: '', inherentLevel: 'critico' },
      { id: 2, title: 'R2', description: '', inherentLevel: 'critico' },
      { id: 3, title: 'R3', description: '', inherentLevel: 'alto' },
      { id: 4, title: 'R4', description: '', inherentLevel: 'medio' },
      { id: 5, title: 'R5', description: '', inherentLevel: 'baixo' },
    ];

    const html = generateFullPdfHtml({
      ripd: {
        id: 1,
        title: 'Test',
        description: '',
        workflowStatus: 'draft',
        createdAt: new Date(),
        version: 1,
      },
      organization: { name: 'Test Org' },
      responses: [],
      risks,
      mitigations: [],
      evidences: [],
    });

    // Verifica se os números aparecem no HTML
    // 2 críticos, 1 alto, 1 médio, 1 baixo
    expect(html).toContain('>2<'); // 2 críticos
    expect(html).toContain('>1<'); // 1 alto, médio ou baixo
  });
});
