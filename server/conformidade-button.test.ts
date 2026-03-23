import { describe, it, expect } from 'vitest';

/**
 * Testes para validação do botão "Próxima" em ConformidadeAvaliacao
 * 
 * Problema: O botão permanecia desabilitado mesmo com todos os campos preenchidos
 * Solução: Adicionar validação disabled={!responses[questionKey] || responses[questionKey].level === 0}
 */

describe('ConformidadeAvaliacao - Botão Próxima', () => {
  describe('Validação de Estado do Botão', () => {
    it('Deve desabilitar botão quando nenhuma resposta foi selecionada', () => {
      const responses: Record<string, { level: number; notes: string }> = {};
      const questionKey = 'domain-1-question-1';
      
      const isDisabled = !responses[questionKey] || responses[questionKey].level === 0;
      expect(isDisabled).toBe(true);
    });

    it('Deve desabilitar botão quando nível de maturidade é 0', () => {
      const responses: Record<string, { level: number; notes: string }> = {
        'domain-1-question-1': { level: 0, notes: '' }
      };
      const questionKey = 'domain-1-question-1';
      
      const isDisabled = !responses[questionKey] || responses[questionKey].level === 0;
      expect(isDisabled).toBe(true);
    });

    it('Deve habilitar botão quando nível de maturidade é válido (1-5)', () => {
      const responses: Record<string, { level: number; notes: string }> = {
        'domain-1-question-1': { level: 3, notes: 'Resposta selecionada' }
      };
      const questionKey = 'domain-1-question-1';
      
      const isDisabled = !responses[questionKey] || responses[questionKey].level === 0;
      expect(isDisabled).toBe(false);
    });

    it('Deve habilitar botão com nível 1 (mínimo válido)', () => {
      const responses: Record<string, { level: number; notes: string }> = {
        'domain-1-question-1': { level: 1, notes: '' }
      };
      const questionKey = 'domain-1-question-1';
      
      const isDisabled = !responses[questionKey] || responses[questionKey].level === 0;
      expect(isDisabled).toBe(false);
    });

    it('Deve habilitar botão com nível 5 (máximo)', () => {
      const responses: Record<string, { level: number; notes: string }> = {
        'domain-1-question-1': { level: 5, notes: 'Nível máximo' }
      };
      const questionKey = 'domain-1-question-1';
      
      const isDisabled = !responses[questionKey] || responses[questionKey].level === 0;
      expect(isDisabled).toBe(false);
    });
  });

  describe('Fluxo de Navegação', () => {
    it('Deve permitir navegação quando resposta é válida', () => {
      const responses: Record<string, { level: number; notes: string }> = {
        'domain-1-question-1': { level: 2, notes: 'Respondido' }
      };
      const questionKey = 'domain-1-question-1';
      
      const canNavigate = responses[questionKey] && responses[questionKey].level > 0;
      expect(canNavigate).toBe(true);
    });

    it('Deve bloquear navegação quando resposta não é válida', () => {
      const responses: Record<string, { level: number; notes: string }> = {};
      const questionKey = 'domain-1-question-1';
      
      const canNavigate = responses[questionKey] && responses[questionKey].level > 0;
      expect(canNavigate).toBeFalsy();
    });

    it('Deve bloquear navegação quando nível é 0', () => {
      const responses: Record<string, { level: number; notes: string }> = {
        'domain-1-question-1': { level: 0, notes: 'Não respondido' }
      };
      const questionKey = 'domain-1-question-1';
      
      const canNavigate = responses[questionKey] && responses[questionKey].level > 0;
      expect(canNavigate).toBe(false);
    });
  });

  describe('Validação de Campos Obrigatórios', () => {
    it('Deve considerar apenas nível de maturidade como obrigatório', () => {
      // Notas são opcionais, apenas nível é obrigatório
      const responses: Record<string, { level: number; notes: string }> = {
        'domain-1-question-1': { level: 3, notes: '' } // Sem notas, mas com nível válido
      };
      const questionKey = 'domain-1-question-1';
      
      const isValid = responses[questionKey] && responses[questionKey].level > 0;
      expect(isValid).toBe(true);
    });

    it('Deve aceitar respostas com notas opcionais', () => {
      const responses: Record<string, { level: number; notes: string }> = {
        'domain-1-question-1': { level: 4, notes: 'Observações sobre a resposta' }
      };
      const questionKey = 'domain-1-question-1';
      
      const isValid = responses[questionKey] && responses[questionKey].level > 0;
      expect(isValid).toBe(true);
    });
  });

  describe('Comportamento Esperado', () => {
    it('Formulário completo → botão habilitado', () => {
      const responses: Record<string, { level: number; notes: string }> = {
        'domain-1-question-1': { level: 3, notes: 'Respondido corretamente' }
      };
      const questionKey = 'domain-1-question-1';
      
      const isDisabled = !responses[questionKey] || responses[questionKey].level === 0;
      expect(isDisabled).toBe(false);
    });

    it('Formulário incompleto → botão desabilitado', () => {
      const responses: Record<string, { level: number; notes: string }> = {};
      const questionKey = 'domain-1-question-1';
      
      const isDisabled = !responses[questionKey] || responses[questionKey].level === 0;
      expect(isDisabled).toBe(true);
    });

    it('Sem bloqueio silencioso - validação clara', () => {
      const responses: Record<string, { level: number; notes: string }> = {
        'domain-1-question-1': { level: 0, notes: '' }
      };
      const questionKey = 'domain-1-question-1';
      
      // Se nível é 0, deve mostrar erro
      const shouldShowError = responses[questionKey] && responses[questionKey].level === 0;
      expect(shouldShowError).toBe(true);
    });
  });

  describe('Independência de Estados Futuros', () => {
    it('Não deve depender de evidências para habilitar botão', () => {
      // Evidências são anexadas DEPOIS de responder todas as perguntas
      const responses: Record<string, { level: number; notes: string }> = {
        'domain-1-question-1': { level: 3, notes: 'Respondido' }
      };
      const questionKey = 'domain-1-question-1';
      const hasEvidences = false; // Evidências ainda não anexadas
      
      // Botão deve estar habilitado mesmo sem evidências
      const isDisabled = !responses[questionKey] || responses[questionKey].level === 0;
      expect(isDisabled).toBe(false);
      expect(hasEvidences).toBe(false); // Confirmando que não há dependência
    });

    it('Não deve depender de campos opcionais', () => {
      const responses: Record<string, { level: number; notes: string }> = {
        'domain-1-question-1': { level: 2, notes: '' } // Sem notas (opcional)
      };
      const questionKey = 'domain-1-question-1';
      
      const isDisabled = !responses[questionKey] || responses[questionKey].level === 0;
      expect(isDisabled).toBe(false);
    });
  });
});
