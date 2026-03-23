import { describe, it, expect } from 'vitest';

/**
 * Testes de lógica de transição de status da avaliação
 * 
 * Regras:
 * 1. Enquanto NÃO estiverem 100% dos domínios atribuídos → status = pendente_atribuicao
 * 2. Quando 100% dos domínios estiverem atribuídos → status = em_andamento
 * 3. Quando 100% dos domínios estiverem concluídos → status = concluida
 */

// Simula a lógica de determinação de status
function determineAssessmentStatus(
  totalFrameworkDomains: number,
  assignedDomainCount: number,
  allAssignmentsCompleted: boolean
): string {
  if (assignedDomainCount < totalFrameworkDomains) {
    return 'pendente_atribuicao';
  }
  if (allAssignmentsCompleted) {
    return 'concluida';
  }
  return 'em_andamento';
}

// Simula a lógica do frontend para labels de status
function getStatusLabel(status: string): string {
  switch (status) {
    case 'pendente_atribuicao':
    case 'programada':
      return 'Pendente de Atribuição';
    case 'em_andamento':
    case 'iniciada':
      return 'Em Andamento';
    case 'concluida':
      return 'Concluída';
    case 'arquivada':
      return 'Arquivada';
    default:
      return status;
  }
}

describe('Transição de Status da Avaliação', () => {
  const TOTAL_DOMAINS = 9; // Framework Seusdados tem 9 domínios

  describe('Regra 1: Pendente de atribuição', () => {
    it('deve retornar pendente_atribuicao quando 0 domínios atribuídos', () => {
      expect(determineAssessmentStatus(TOTAL_DOMAINS, 0, false)).toBe('pendente_atribuicao');
    });

    it('deve retornar pendente_atribuicao quando apenas 2 de 9 domínios atribuídos', () => {
      expect(determineAssessmentStatus(TOTAL_DOMAINS, 2, false)).toBe('pendente_atribuicao');
    });

    it('deve retornar pendente_atribuicao quando 8 de 9 domínios atribuídos', () => {
      expect(determineAssessmentStatus(TOTAL_DOMAINS, 8, false)).toBe('pendente_atribuicao');
    });

    it('deve retornar pendente_atribuicao quando apenas 1 domínio atribuído', () => {
      expect(determineAssessmentStatus(TOTAL_DOMAINS, 1, false)).toBe('pendente_atribuicao');
    });
  });

  describe('Regra 2: Em andamento', () => {
    it('deve retornar em_andamento quando todos os 9 domínios estão atribuídos mas não concluídos', () => {
      expect(determineAssessmentStatus(TOTAL_DOMAINS, 9, false)).toBe('em_andamento');
    });
  });

  describe('Regra 3: Concluída', () => {
    it('deve retornar concluida quando todos os domínios estão atribuídos E concluídos', () => {
      expect(determineAssessmentStatus(TOTAL_DOMAINS, 9, true)).toBe('concluida');
    });
  });

  describe('Caso impossível: concluída sem todos atribuídos', () => {
    it('deve retornar pendente_atribuicao mesmo se allCompleted=true mas domínios insuficientes', () => {
      // Se apenas 5 domínios estão atribuídos, mesmo que todos estejam "concluídos",
      // o status geral deve ser pendente_atribuicao porque faltam domínios
      expect(determineAssessmentStatus(TOTAL_DOMAINS, 5, true)).toBe('pendente_atribuicao');
    });
  });
});

describe('Labels de Status no Frontend', () => {
  it('deve exibir "Pendente de Atribuição" para status pendente_atribuicao', () => {
    expect(getStatusLabel('pendente_atribuicao')).toBe('Pendente de Atribuição');
  });

  it('deve exibir "Pendente de Atribuição" para status legado programada', () => {
    expect(getStatusLabel('programada')).toBe('Pendente de Atribuição');
  });

  it('deve exibir "Em Andamento" para status em_andamento', () => {
    expect(getStatusLabel('em_andamento')).toBe('Em Andamento');
  });

  it('deve exibir "Em Andamento" para status legado iniciada', () => {
    expect(getStatusLabel('iniciada')).toBe('Em Andamento');
  });

  it('deve exibir "Concluída" para status concluida', () => {
    expect(getStatusLabel('concluida')).toBe('Concluída');
  });

  it('deve exibir "Arquivada" para status arquivada', () => {
    expect(getStatusLabel('arquivada')).toBe('Arquivada');
  });
});
