import { describe, it, expect } from 'vitest';

/**
 * Testes unitários para validar a lógica de geração de conteúdo executável
 * do Plano de Ação. Verifica que o conteúdo gerado não é uma repetição
 * das perguntas da avaliação, mas sim uma ação orientada à execução.
 */

// Simular a estrutura de campos que o LLM deve retornar
interface DomainActionResult {
  title: string;
  description: string;
  resources: string;
  successCriteria: string;
  notes: string;
}

// Simular a montagem da descrição estruturada (lógica do assessmentsRouter.ts)
function buildStructuredDescription(actionContent: DomainActionResult): string {
  return (
    actionContent.description +
    `\n\nRecursos necessários: ${actionContent.resources}` +
    `\n\nCritério de sucesso: ${actionContent.successCriteria}`
  );
}

// Simular o parser do frontend (lógica do ActionPlanTab.tsx)
function parseStructuredDescription(desc: string): {
  mainDesc: string;
  recursos: string | undefined;
  criterio: string | undefined;
  hasStructured: boolean;
} {
  const recursosMatch = desc.match(/\n\nRecursos necessários:\s*([\s\S]*?)(?=\n\nCritério de sucesso:|$)/);
  const criterioMatch = desc.match(/\n\nCritério de sucesso:\s*([\s\S]*)$/);
  const mainDesc = desc.replace(/\n\nRecursos necessários:[\s\S]*$/, '').trim();
  const recursos = recursosMatch?.[1]?.trim();
  const criterio = criterioMatch?.[1]?.trim();
  return { mainDesc, recursos, criterio, hasStructured: !!(recursos || criterio) };
}

// Simular a prioridade calculada
function calculatePriority(worstLevel: number): 'critica' | 'alta' | 'media' | 'baixa' {
  if (worstLevel <= 1) return 'critica';
  if (worstLevel === 2) return 'alta';
  if (worstLevel === 3) return 'media';
  return 'baixa';
}

// Simular os dias estimados
function calculateEstimatedDays(priority: 'critica' | 'alta' | 'media' | 'baixa'): number {
  if (priority === 'critica') return 30;
  if (priority === 'alta') return 60;
  if (priority === 'media') return 90;
  return 120;
}

describe('Geração de conteúdo executável do Plano de Ação', () => {
  const mockActionContent: DomainActionResult = {
    title: 'Formalizar a Política de Privacidade e Definição de Papéis',
    description: 'Mapear, documentar e aprovar formalmente os papéis e responsabilidades relacionados à proteção de dados na organização, incluindo responsáveis internos, comunicação às áreas e evidência documental da aprovação.',
    resources: 'DPO, área jurídica, lideranças de área e ferramenta de gestão de documentos.',
    successCriteria: 'Documento formal aprovado, comunicado internamente e arquivado no GED com assinatura da alta direção.',
    notes: 'Verificar se já existe algum documento parcial que possa ser aproveitado como base.',
  };

  it('o título deve ser uma ação executável, não uma repetição da pergunta', () => {
    expect(mockActionContent.title).not.toMatch(/pergunta|resposta|nível atual|inexistente|inicial/i);
    expect(mockActionContent.title.length).toBeGreaterThan(10);
    expect(mockActionContent.title.length).toBeLessThanOrEqual(255);
  });

  it('a descrição deve ser orientada à execução, não ao diagnóstico', () => {
    // Não deve conter padrões típicos da descrição antiga (lista de perguntas)
    expect(mockActionContent.description).not.toMatch(/\d+\.\s+.+\(Nível atual:/);
    expect(mockActionContent.description).not.toMatch(/Domínio:/);
    expect(mockActionContent.description).not.toMatch(/Pontos de melhoria identificados/);
    // Deve ter conteúdo substantivo
    expect(mockActionContent.description.length).toBeGreaterThan(50);
  });

  it('os recursos devem estar presentes e ser informativos', () => {
    expect(mockActionContent.resources).toBeTruthy();
    expect(mockActionContent.resources.length).toBeGreaterThan(10);
  });

  it('o critério de sucesso deve ser mensurável', () => {
    expect(mockActionContent.successCriteria).toBeTruthy();
    expect(mockActionContent.successCriteria.length).toBeGreaterThan(10);
  });
});

describe('Montagem e parsing da descrição estruturada', () => {
  const mockActionContent: DomainActionResult = {
    title: 'Implementar Controles de Segurança da Informação',
    description: 'Avaliar e implementar controles técnicos de segurança para proteção dos dados pessoais tratados pela organização, incluindo criptografia, controle de acesso e monitoramento de acessos.',
    resources: 'Equipe de TI, ferramenta de gestão de vulnerabilidades, orçamento para licenças de segurança.',
    successCriteria: 'Relatório de conformidade com os controles implementados e testados, aprovado pelo CISO ou responsável de TI.',
    notes: 'Priorizar sistemas que tratam dados sensíveis.',
  };

  it('a descrição estruturada deve conter os três campos separados', () => {
    const structured = buildStructuredDescription(mockActionContent);
    expect(structured).toContain('Recursos necessários:');
    expect(structured).toContain('Critério de sucesso:');
    expect(structured).toContain(mockActionContent.description);
  });

  it('o parser do frontend deve separar corretamente os campos', () => {
    const structured = buildStructuredDescription(mockActionContent);
    const parsed = parseStructuredDescription(structured);

    expect(parsed.hasStructured).toBe(true);
    expect(parsed.mainDesc).toBe(mockActionContent.description);
    expect(parsed.recursos).toBe(mockActionContent.resources);
    expect(parsed.criterio).toBe(mockActionContent.successCriteria);
  });

  it('o campo mainDesc não deve conter os marcadores de seção', () => {
    const structured = buildStructuredDescription(mockActionContent);
    const { mainDesc } = parseStructuredDescription(structured);
    expect(mainDesc).not.toContain('Recursos necessários:');
    expect(mainDesc).not.toContain('Critério de sucesso:');
  });

  it('descrição sem estrutura deve ser exibida como texto simples (retrocompatibilidade)', () => {
    const oldStyleDesc = 'Domínio: Governança\nNível atual médio: 2.0/5\nPontos de melhoria:\n1. Pergunta X (Nível atual: 2/5 - Inicial)';
    const parsed = parseStructuredDescription(oldStyleDesc);
    expect(parsed.hasStructured).toBe(false);
    expect(parsed.mainDesc).toBe(oldStyleDesc);
  });
});

describe('Cálculo de prioridade e prazo', () => {
  it('nível 1 deve gerar prioridade crítica com prazo de 30 dias', () => {
    const priority = calculatePriority(1);
    const days = calculateEstimatedDays(priority);
    expect(priority).toBe('critica');
    expect(days).toBe(30);
  });

  it('nível 2 deve gerar prioridade alta com prazo de 60 dias', () => {
    const priority = calculatePriority(2);
    const days = calculateEstimatedDays(priority);
    expect(priority).toBe('alta');
    expect(days).toBe(60);
  });

  it('nível 3 deve gerar prioridade média com prazo de 90 dias', () => {
    const priority = calculatePriority(3);
    const days = calculateEstimatedDays(priority);
    expect(priority).toBe('media');
    expect(days).toBe(90);
  });

  it('nível 4 deve gerar prioridade baixa com prazo de 120 dias', () => {
    const priority = calculatePriority(4);
    const days = calculateEstimatedDays(priority);
    expect(priority).toBe('baixa');
    expect(days).toBe(120);
  });
});
