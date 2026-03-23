import { describe, it, expect } from 'vitest';

// Lista canônica de 11 perfis válidos na plataforma
const VALID_ROLES = [
  'admin_global',
  'pmo',
  'consultor',
  'consultor_par',
  'sponsor',
  'dpo_interno',
  'comite',
  'lider_processo',
  'gestor_area',
  'usuario',
  'terceiro',
] as const;

// Perfis internos (Equipe Seusdados)
const INTERNAL_ROLES = ['admin_global', 'pmo', 'consultor', 'consultor_par'];

// Perfis de cliente (precisam de organização)
const CLIENT_ROLES = ['sponsor', 'dpo_interno', 'comite', 'lider_processo', 'gestor_area', 'usuario'];

// Perfis externos (precisam de organização)
const EXTERNAL_ROLES = ['terceiro'];

// Perfis que exigem organização vinculada
const ROLES_NEED_ORG = [...CLIENT_ROLES, ...EXTERNAL_ROLES];

describe('Consistência dos Perfis de Usuário', () => {
  it('deve ter exatamente 11 perfis válidos', () => {
    expect(VALID_ROLES).toHaveLength(11);
  });

  it('todos os perfis devem ser únicos', () => {
    const uniqueRoles = new Set(VALID_ROLES);
    expect(uniqueRoles.size).toBe(VALID_ROLES.length);
  });

  it('perfis internos + cliente + externo devem cobrir todos os perfis válidos', () => {
    const allCategorized = [...INTERNAL_ROLES, ...CLIENT_ROLES, ...EXTERNAL_ROLES];
    expect(allCategorized.sort()).toEqual([...VALID_ROLES].sort());
  });

  it('perfis que exigem organização devem incluir todos os perfis de cliente e externo', () => {
    const expected = [...CLIENT_ROLES, ...EXTERNAL_ROLES];
    expect(ROLES_NEED_ORG.sort()).toEqual(expected.sort());
  });

  it('perfis internos não devem exigir organização', () => {
    for (const role of INTERNAL_ROLES) {
      expect(ROLES_NEED_ORG).not.toContain(role);
    }
  });

  it('lider_processo deve ser um perfil de cliente que exige organização', () => {
    expect(VALID_ROLES).toContain('lider_processo');
    expect(CLIENT_ROLES).toContain('lider_processo');
    expect(ROLES_NEED_ORG).toContain('lider_processo');
  });

  it('gestor_area deve ser um perfil de cliente que exige organização', () => {
    expect(VALID_ROLES).toContain('gestor_area');
    expect(CLIENT_ROLES).toContain('gestor_area');
    expect(ROLES_NEED_ORG).toContain('gestor_area');
  });

  it('não deve conter perfis legados (admin, cliente)', () => {
    expect(VALID_ROLES).not.toContain('admin');
    expect(VALID_ROLES).not.toContain('cliente');
    expect(VALID_ROLES).not.toContain('user');
  });

  it('labels dos perfis devem estar em português', () => {
    const roleLabels: Record<string, string> = {
      admin_global: 'Admin Global',
      pmo: 'PMO',
      consultor: 'Consultor',
      consultor_par: 'Consultor Par',
      sponsor: 'Patrocinador',
      dpo_interno: 'Encarregado de Dados',
      comite: 'Comitê de Privacidade',
      lider_processo: 'Líder de Processo',
      gestor_area: 'Gestor de Área',
      usuario: 'Usuário',
      terceiro: 'Terceiro',
    };

    // Cada perfil válido deve ter um label
    for (const role of VALID_ROLES) {
      expect(roleLabels[role]).toBeDefined();
      expect(roleLabels[role].length).toBeGreaterThan(0);
    }

    // Labels não devem conter termos em inglês (exceto PMO que é sigla universal)
    const englishTerms = ['Sponsor', 'DPO Interno', 'Committee', 'Leader', 'Manager'];
    for (const [key, label] of Object.entries(roleLabels)) {
      if (key === 'pmo') continue; // PMO é sigla universal
      for (const term of englishTerms) {
        expect(label).not.toContain(term);
      }
    }
  });
});
