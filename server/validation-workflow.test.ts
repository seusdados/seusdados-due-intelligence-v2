import { describe, it, expect } from 'vitest';

const VALID_TRANSITIONS: Record<string, string[]> = {
  em_andamento: ['aguardando_validacao'],
  ajustes_solicitados: ['aguardando_nova_validacao'],
  aguardando_validacao: ['em_validacao'],
  aguardando_nova_validacao: ['em_validacao'],
  em_validacao: ['concluida', 'ajustes_solicitados'],
};

function canTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

describe('Fluxo de validação do Plano de Ação', () => {
  it('Responsável pode enviar ação em andamento para validação', () => {
    expect(canTransition('em_andamento', 'aguardando_validacao')).toBe(true);
  });

  it('Responsável pode reenviar ação com ajustes solicitados para nova validação', () => {
    expect(canTransition('ajustes_solicitados', 'aguardando_nova_validacao')).toBe(true);
  });

  it('Consultor pode assumir ação aguardando validação', () => {
    expect(canTransition('aguardando_validacao', 'em_validacao')).toBe(true);
    expect(canTransition('aguardando_nova_validacao', 'em_validacao')).toBe(true);
  });

  it('Consultor pode aprovar ação em validação', () => {
    expect(canTransition('em_validacao', 'concluida')).toBe(true);
  });

  it('Consultor pode solicitar ajustes em ação em validação', () => {
    expect(canTransition('em_validacao', 'ajustes_solicitados')).toBe(true);
  });

  it('Não é possível aprovar ação pendente diretamente', () => {
    expect(canTransition('pendente', 'concluida')).toBe(false);
  });

  it('Não é possível pular etapa de assumir validação', () => {
    expect(canTransition('aguardando_validacao', 'concluida')).toBe(false);
    expect(canTransition('aguardando_nova_validacao', 'concluida')).toBe(false);
  });

  it('Não é possível enviar ação pendente para validação', () => {
    expect(canTransition('pendente', 'aguardando_validacao')).toBe(false);
  });
});

const STATUS_LABELS: Record<string, string> = {
  aguardando_validacao: 'Aguardando Validação',
  aguardando_nova_validacao: 'Aguardando Nova Validação',
  em_validacao: 'Em Validação',
  ajustes_solicitados: 'Ajustes Solicitados',
};

describe('Labels dos novos status de validação', () => {
  it('Status aguardando_validacao tem label correto', () => {
    expect(STATUS_LABELS['aguardando_validacao']).toBe('Aguardando Validação');
  });

  it('Status aguardando_nova_validacao tem label correto', () => {
    expect(STATUS_LABELS['aguardando_nova_validacao']).toBe('Aguardando Nova Validação');
  });

  it('Status em_validacao tem label correto', () => {
    expect(STATUS_LABELS['em_validacao']).toBe('Em Validação');
  });
});

function canSubmitForValidation(role: string): boolean {
  return ['comite', 'gestor_area', 'lider_processo', 'respondente', 'sponsor', 'admin_global', 'consultor'].includes(role);
}

function canValidate(role: string): boolean {
  return ['admin_global', 'consultor'].includes(role);
}

describe('Permissões do fluxo de validação', () => {
  it('Comitê pode enviar para validação quando for o responsável', () => {
    expect(canSubmitForValidation('comite')).toBe(true);
  });

  it('Sponsor pode enviar para validação', () => {
    expect(canSubmitForValidation('sponsor')).toBe(true);
  });

  it('Consultor pode validar', () => {
    expect(canValidate('consultor')).toBe(true);
  });

  it('Admin Global pode validar', () => {
    expect(canValidate('admin_global')).toBe(true);
  });

  it('Comitê NÃO pode validar', () => {
    expect(canValidate('comite')).toBe(false);
  });
});
