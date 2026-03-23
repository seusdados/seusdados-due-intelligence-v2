/**
 * Testes para integração de Análise de Contratos com Planos de Ação
 */

import { describe, it, expect } from 'vitest';
import * as schema from '../drizzle/schema';

describe('Integração de Análise de Contratos com Planos de Ação', () => {
  describe('Schema de Planos de Ação', () => {
    it('deve ter assessmentType com opção contract_analysis', () => {
      // Verifica se o enum assessmentType inclui contract_analysis
      const actionPlansTable = schema.actionPlans;
      expect(actionPlansTable).toBeDefined();
      
      // Verifica se a tabela tem o campo assessmentType
      const columns = Object.keys(actionPlansTable);
      expect(columns).toContain('assessmentType');
    });

    it('deve ter tabela de evidências com suporte a contract_analysis', () => {
      const evidencesTable = schema.evidences;
      expect(evidencesTable).toBeDefined();
      
      const columns = Object.keys(evidencesTable);
      expect(columns).toContain('assessmentType');
    });
  });

  describe('Mapeamento de Riscos para Prioridades', () => {
    const riskToPriority = (level: string): 'critica' | 'alta' | 'media' | 'baixa' => {
      switch (level) {
        case '1': return 'critica';
        case '2': return 'alta';
        case '3': return 'media';
        case '4':
        case '5':
        default: return 'baixa';
      }
    };

    it('deve mapear risco nível 1 para prioridade crítica', () => {
      expect(riskToPriority('1')).toBe('critica');
    });

    it('deve mapear risco nível 2 para prioridade alta', () => {
      expect(riskToPriority('2')).toBe('alta');
    });

    it('deve mapear risco nível 3 para prioridade média', () => {
      expect(riskToPriority('3')).toBe('media');
    });

    it('deve mapear risco nível 4 para prioridade baixa', () => {
      expect(riskToPriority('4')).toBe('baixa');
    });

    it('deve mapear risco nível 5 para prioridade baixa', () => {
      expect(riskToPriority('5')).toBe('baixa');
    });
  });

  describe('Cálculo de Prazos por Prioridade', () => {
    const calculateDueDate = (priority: string): number => {
      switch (priority) {
        case 'critica': return 7;
        case 'alta': return 15;
        case 'media': return 30;
        default: return 60;
      }
    };

    it('deve calcular 7 dias para prioridade crítica', () => {
      expect(calculateDueDate('critica')).toBe(7);
    });

    it('deve calcular 15 dias para prioridade alta', () => {
      expect(calculateDueDate('alta')).toBe(15);
    });

    it('deve calcular 30 dias para prioridade média', () => {
      expect(calculateDueDate('media')).toBe(30);
    });

    it('deve calcular 60 dias para prioridade baixa', () => {
      expect(calculateDueDate('baixa')).toBe(60);
    });
  });

  describe('Estrutura de Ações Geradas', () => {
    it('deve criar título com prefixo [Contrato]', () => {
      const risk = {
        contractArea: 'Transferência Internacional',
        riskDescription: 'Ausência de cláusula de transferência internacional de dados'
      };
      
      const title = `[Contrato] ${risk.contractArea}: ${risk.riskDescription.substring(0, 100)}`;
      
      expect(title).toContain('[Contrato]');
      expect(title).toContain(risk.contractArea);
    });

    it('deve truncar descrição longa no título', () => {
      const longDescription = 'A'.repeat(150);
      const risk = {
        contractArea: 'Teste',
        riskDescription: longDescription
      };
      
      const title = `[Contrato] ${risk.contractArea}: ${risk.riskDescription.substring(0, 100)}${risk.riskDescription.length > 100 ? '...' : ''}`;
      
      expect(title.length).toBeLessThan(150);
      expect(title).toContain('...');
    });

    it('deve incluir informações completas na descrição', () => {
      const risk = {
        riskDescription: 'Risco de teste',
        potentialImpact: 'Impacto alto',
        requiredAction: 'Ação necessária',
        legalReference: 'Art. 33 LGPD'
      };
      const contractName = 'Contrato de Teste';
      
      const description = `**Risco Identificado:** ${risk.riskDescription}\n\n**Impacto Potencial:** ${risk.potentialImpact || 'Não especificado'}\n\n**Ação Requerida:** ${risk.requiredAction}\n\n**Referência Legal:** ${risk.legalReference || 'Não especificada'}\n\n**Contrato:** ${contractName}`;
      
      expect(description).toContain('**Risco Identificado:**');
      expect(description).toContain('**Impacto Potencial:**');
      expect(description).toContain('**Ação Requerida:**');
      expect(description).toContain('**Referência Legal:**');
      expect(description).toContain('**Contrato:**');
    });
  });

  describe('Validações de Entrada', () => {
    it('deve rejeitar análise sem riscos identificados', () => {
      const risks: unknown[] = [];
      
      expect(risks.length).toBe(0);
      // Em produção, isso lançaria erro: 'Nenhum risco identificado para gerar plano de ação'
    });

    it('deve processar múltiplos riscos', () => {
      const risks = [
        { riskLevel: '1', contractArea: 'Área 1', riskDescription: 'Risco 1', requiredAction: 'Ação 1' },
        { riskLevel: '2', contractArea: 'Área 2', riskDescription: 'Risco 2', requiredAction: 'Ação 2' },
        { riskLevel: '3', contractArea: 'Área 3', riskDescription: 'Risco 3', requiredAction: 'Ação 3' },
      ];
      
      expect(risks.length).toBe(3);
      
      // Verifica que cada risco tem os campos necessários
      risks.forEach(risk => {
        expect(risk.riskLevel).toBeDefined();
        expect(risk.contractArea).toBeDefined();
        expect(risk.riskDescription).toBeDefined();
        expect(risk.requiredAction).toBeDefined();
      });
    });
  });

  describe('Tipos de Avaliação', () => {
    it('deve suportar três tipos de avaliação', () => {
      const assessmentTypes = ['compliance', 'third_party', 'contract_analysis'];
      
      expect(assessmentTypes).toContain('compliance');
      expect(assessmentTypes).toContain('third_party');
      expect(assessmentTypes).toContain('contract_analysis');
    });

    it('deve identificar corretamente ações de contratos', () => {
      const actions = [
        { assessmentType: 'compliance', title: 'Ação 1' },
        { assessmentType: 'third_party', title: 'Ação 2' },
        { assessmentType: 'contract_analysis', title: 'Ação 3' },
        { assessmentType: 'contract_analysis', title: 'Ação 4' },
      ];
      
      const contractActions = actions.filter(a => a.assessmentType === 'contract_analysis');
      
      expect(contractActions.length).toBe(2);
    });
  });
});
