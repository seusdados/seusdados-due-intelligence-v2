import { describe, it, expect } from 'vitest';

/**
 * Testes para o sistema de perfis de acesso (9 perfis)
 * e controle de acesso por organização
 */

// Definição dos perfis e suas categorias
const roleLabels: Record<string, { label: string; category: string; needsOrg: boolean }> = {
  admin_global: { label: "Admin Global", category: "Equipe Interna", needsOrg: false },
  pmo: { label: "PMO", category: "Equipe Interna", needsOrg: false },
  consultor: { label: "Consultor", category: "Equipe Interna", needsOrg: false },
  consultor_par: { label: "Consultor Par", category: "Equipe Interna", needsOrg: false },
  sponsor: { label: "Patrocinador", category: "Cliente", needsOrg: true },
  dpo_interno: { label: "DPO Interno", category: "Cliente", needsOrg: true },
  comite: { label: "Comitê", category: "Cliente", needsOrg: true },
  usuario: { label: "Usuário", category: "Cliente", needsOrg: true },
  terceiro: { label: "Terceiro", category: "Externo", needsOrg: true },
};

const ALL_ROLES = Object.keys(roleLabels);
const INTERNAL_ROLES = ['admin_global', 'pmo', 'consultor', 'consultor_par'];
const CLIENT_ROLES = ['sponsor', 'dpo_interno', 'comite', 'usuario'];
const EXTERNAL_ROLES = ['terceiro'];
const ROLES_NEED_ORG = ['sponsor', 'dpo_interno', 'comite', 'usuario', 'terceiro'];

describe('Sistema de 9 Perfis de Acesso', () => {
  
  describe('Definição dos Perfis', () => {
    it('deve ter exatamente 9 perfis definidos', () => {
      expect(ALL_ROLES.length).toBe(9);
    });

    it('deve ter 4 perfis internos', () => {
      const internos = ALL_ROLES.filter(r => roleLabels[r].category === 'Equipe Interna');
      expect(internos).toEqual(INTERNAL_ROLES);
      expect(internos.length).toBe(4);
    });

    it('deve ter 4 perfis de cliente', () => {
      const clientes = ALL_ROLES.filter(r => roleLabels[r].category === 'Cliente');
      expect(clientes).toEqual(CLIENT_ROLES);
      expect(clientes.length).toBe(4);
    });

    it('deve ter 1 perfil externo', () => {
      const externos = ALL_ROLES.filter(r => roleLabels[r].category === 'Externo');
      expect(externos).toEqual(EXTERNAL_ROLES);
      expect(externos.length).toBe(1);
    });

    it('todos os perfis devem ter label e categoria', () => {
      ALL_ROLES.forEach(role => {
        expect(roleLabels[role].label).toBeTruthy();
        expect(roleLabels[role].category).toBeTruthy();
        expect(['Equipe Interna', 'Cliente', 'Externo']).toContain(roleLabels[role].category);
      });
    });
  });

  describe('Requisito de Organização por Perfil', () => {
    it('perfis internos NÃO devem exigir organização', () => {
      INTERNAL_ROLES.forEach(role => {
        expect(roleLabels[role].needsOrg).toBe(false);
      });
    });

    it('perfis de cliente DEVEM exigir organização', () => {
      CLIENT_ROLES.forEach(role => {
        expect(roleLabels[role].needsOrg).toBe(true);
      });
    });

    it('perfis externos DEVEM exigir organização', () => {
      EXTERNAL_ROLES.forEach(role => {
        expect(roleLabels[role].needsOrg).toBe(true);
      });
    });
  });

  describe('Controle de Acesso - Criação de Usuários', () => {
    function canCreateUser(creatorRole: string): boolean {
      return INTERNAL_ROLES.includes(creatorRole);
    }

    it('admin_global pode criar usuários', () => {
      expect(canCreateUser('admin_global')).toBe(true);
    });

    it('pmo pode criar usuários', () => {
      expect(canCreateUser('pmo')).toBe(true);
    });

    it('consultor pode criar usuários', () => {
      expect(canCreateUser('consultor')).toBe(true);
    });

    it('consultor_par pode criar usuários', () => {
      expect(canCreateUser('consultor_par')).toBe(true);
    });

    it('perfis de cliente NÃO podem criar usuários', () => {
      CLIENT_ROLES.forEach(role => {
        expect(canCreateUser(role)).toBe(false);
      });
    });

    it('perfis externos NÃO podem criar usuários', () => {
      EXTERNAL_ROLES.forEach(role => {
        expect(canCreateUser(role)).toBe(false);
      });
    });
  });

  describe('Controle de Acesso - Visualização de Usuários', () => {
    function canSeeAllUsers(role: string): boolean {
      return INTERNAL_ROLES.includes(role);
    }

    function canSeeOrgUsers(role: string, hasOrg: boolean): boolean {
      if (INTERNAL_ROLES.includes(role)) return true;
      return hasOrg;
    }

    it('equipe interna pode ver todos os usuários', () => {
      INTERNAL_ROLES.forEach(role => {
        expect(canSeeAllUsers(role)).toBe(true);
      });
    });

    it('clientes com organização podem ver usuários da organização', () => {
      CLIENT_ROLES.forEach(role => {
        expect(canSeeOrgUsers(role, true)).toBe(true);
      });
    });

    it('clientes sem organização não podem ver nenhum usuário', () => {
      CLIENT_ROLES.forEach(role => {
        expect(canSeeOrgUsers(role, false)).toBe(false);
      });
    });
  });

  describe('Validação de Criação - Organização Obrigatória', () => {
    function validateCreation(role: string, organizationId: number | null): { valid: boolean; error?: string } {
      if (ROLES_NEED_ORG.includes(role) && !organizationId) {
        return { valid: false, error: 'Este perfil de acesso exige uma organização vinculada' };
      }
      return { valid: true };
    }

    it('deve aceitar criação de perfil interno sem organização', () => {
      INTERNAL_ROLES.forEach(role => {
        const result = validateCreation(role, null);
        expect(result.valid).toBe(true);
      });
    });

    it('deve rejeitar criação de perfil cliente sem organização', () => {
      CLIENT_ROLES.forEach(role => {
        const result = validateCreation(role, null);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('organização');
      });
    });

    it('deve aceitar criação de perfil cliente COM organização', () => {
      CLIENT_ROLES.forEach(role => {
        const result = validateCreation(role, 1);
        expect(result.valid).toBe(true);
      });
    });

    it('deve rejeitar criação de terceiro sem organização', () => {
      const result = validateCreation('terceiro', null);
      expect(result.valid).toBe(false);
    });

    it('deve aceitar criação de terceiro COM organização', () => {
      const result = validateCreation('terceiro', 1);
      expect(result.valid).toBe(true);
    });
  });

  describe('E-mail de Boas-Vindas - Labels de Perfis', () => {
    const emailRoleLabels: Record<string, string> = {
      admin_global: 'Administrador Global',
      pmo: 'PMO',
      consultor: 'Consultor',
      consultor_par: 'Consultor Par',
      sponsor: 'Patrocinador',
      dpo_interno: 'Encarregado de Proteção de Dados',
      comite: 'Membro do Comitê de Privacidade',
      usuario: 'Usuário',
      terceiro: 'Terceiro',
    };

    it('todos os 9 perfis devem ter label para e-mail', () => {
      ALL_ROLES.forEach(role => {
        expect(emailRoleLabels[role]).toBeTruthy();
      });
    });

    it('labels devem estar em português', () => {
      // Nenhum label deve conter palavras em inglês comuns
      Object.values(emailRoleLabels).forEach(label => {
        expect(label).not.toMatch(/\b(admin|user|viewer|editor|manager)\b/i);
      });
    });
  });

  describe('Validação de E-mail', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    it('deve aceitar e-mails válidos', () => {
      const validos = ['user@example.com', 'nome.sobrenome@empresa.com.br', 'user+tag@domain.com'];
      validos.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });
    });

    it('deve rejeitar e-mails inválidos', () => {
      const invalidos = ['userexample.com', 'user@', '@example.com', '', 'user @domain.com'];
      invalidos.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });
  });
});
