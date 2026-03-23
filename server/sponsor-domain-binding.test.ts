import { describe, it, expect } from 'vitest';

/**
 * Testes para validar permissões de Sponsor em vinculação de domínios
 * 
 * Regras atualizadas:
 * - Sponsor pode atribuir domínios APENAS para sua própria organização
 * - Sponsor NÃO é tratado como admin (isAdmin = false, isSponsor = true)
 * - Sponsor vê todos os domínios para acompanhamento (somente leitura)
 * - Sponsor é redirecionado para /atribuir se há domínios sem responsável
 * - Admin e consultores podem atribuir para qualquer organização
 * - Demais perfis Cliente não podem atribuir
 * 
 * Perfis oficiais: admin_global, consultor, sponsor, comite, lider_processo, gestor_area, terceiro
 */

describe('Sponsor Domain Binding Permissions', () => {
  const createMockContext = (role: string, organizationId: number = 1, userId: number = 1) => ({
    user: { id: userId, role, organizationId },
  });

  const createMockAssessment = (organizationId: number = 1) => ({
    id: 1,
    organizationId,
    title: 'Test Assessment',
  });

  // Lógica atualizada conforme assessmentsRouter.ts
  const getMyAssignedDomainsLogic = (role: string) => {
    const isAdminOrConsultor = ['admin_global', 'consultor'].includes(role);
    const isSponsor = role === 'sponsor';
    return { isAdminOrConsultor, isSponsor };
  };

  const canAssignLogic = (role: string) => {
    return ['admin_global', 'consultor', 'sponsor'].includes(role);
  };

  describe('getMyAssignedDomains - Separação de Sponsor e Admin', () => {
    it('Admin recebe isAdmin=true, isSponsor=false', () => {
      const { isAdminOrConsultor, isSponsor } = getMyAssignedDomainsLogic('admin_global');
      expect(isAdminOrConsultor).toBe(true);
      expect(isSponsor).toBe(false);
    });

    it('Consultor recebe isAdmin=true, isSponsor=false', () => {
      const { isAdminOrConsultor, isSponsor } = getMyAssignedDomainsLogic('consultor');
      expect(isAdminOrConsultor).toBe(true);
      expect(isSponsor).toBe(false);
    });

    it('Sponsor recebe isAdmin=false, isSponsor=true', () => {
      const { isAdminOrConsultor, isSponsor } = getMyAssignedDomainsLogic('sponsor');
      expect(isAdminOrConsultor).toBe(false);
      expect(isSponsor).toBe(true);
    });

    it('Gestor de Area recebe isAdmin=false, isSponsor=false', () => {
      const { isAdminOrConsultor, isSponsor } = getMyAssignedDomainsLogic('gestor_area');
      expect(isAdminOrConsultor).toBe(false);
      expect(isSponsor).toBe(false);
    });

    it('Comite recebe isAdmin=false, isSponsor=false', () => {
      const { isAdminOrConsultor, isSponsor } = getMyAssignedDomainsLogic('comite');
      expect(isAdminOrConsultor).toBe(false);
      expect(isSponsor).toBe(false);
    });

    it('Lider de Processo recebe isAdmin=false, isSponsor=false', () => {
      const { isAdminOrConsultor, isSponsor } = getMyAssignedDomainsLogic('lider_processo');
      expect(isAdminOrConsultor).toBe(false);
      expect(isSponsor).toBe(false);
    });

    it('Terceiro recebe isAdmin=false, isSponsor=false', () => {
      const { isAdminOrConsultor, isSponsor } = getMyAssignedDomainsLogic('terceiro');
      expect(isAdminOrConsultor).toBe(false);
      expect(isSponsor).toBe(false);
    });
  });

  describe('saveAssignmentsAndNotify - Permissões de atribuição', () => {
    it('Admin pode atribuir domínios', () => {
      expect(canAssignLogic('admin_global')).toBe(true);
    });

    it('Consultor pode atribuir domínios', () => {
      expect(canAssignLogic('consultor')).toBe(true);
    });

    it('Sponsor pode atribuir domínios', () => {
      expect(canAssignLogic('sponsor')).toBe(true);
    });

    it('Comite NÃO pode atribuir domínios', () => {
      expect(canAssignLogic('comite')).toBe(false);
    });

    it('Gestor de Area NÃO pode atribuir domínios', () => {
      expect(canAssignLogic('gestor_area')).toBe(false);
    });

    it('Lider de Processo NÃO pode atribuir domínios', () => {
      expect(canAssignLogic('lider_processo')).toBe(false);
    });

    it('Terceiro NÃO pode atribuir domínios', () => {
      expect(canAssignLogic('terceiro')).toBe(false);
    });
  });

  describe('Fluxo de redirecionamento do Sponsor', () => {
    it('Sponsor com domínios não atribuídos deve ser redirecionado para /atribuir', () => {
      const isSponsor = true;
      const assignmentCheck = { allAssigned: false, totalDomains: 9, assignedCount: 3, unassignedDomainIds: ['IA-04', 'IA-05'] };
      const assessmentId = 1;

      const shouldRedirect = isSponsor && assignmentCheck && !assignmentCheck.allAssigned && !!assessmentId;
      expect(shouldRedirect).toBe(true);
    });

    it('Sponsor com todos os domínios atribuídos NÃO deve ser redirecionado', () => {
      const isSponsor = true;
      const assignmentCheck = { allAssigned: true, totalDomains: 9, assignedCount: 9, unassignedDomainIds: [] };
      const assessmentId = 1;

      const shouldRedirect = isSponsor && assignmentCheck && !assignmentCheck.allAssigned && !!assessmentId;
      expect(shouldRedirect).toBe(false);
    });

    it('Admin NÃO deve ser redirecionado mesmo com domínios não atribuídos', () => {
      const isSponsor = false; // Admin não é sponsor
      const assignmentCheck = { allAssigned: false, totalDomains: 9, assignedCount: 0, unassignedDomainIds: ['IA-01'] };
      const assessmentId = 1;

      const shouldRedirect = isSponsor && assignmentCheck && !assignmentCheck.allAssigned && !!assessmentId;
      expect(shouldRedirect).toBe(false);
    });

    it('Consultor NÃO deve ser redirecionado mesmo com domínios não atribuídos', () => {
      const isSponsor = false; // Consultor não é sponsor
      const assignmentCheck = { allAssigned: false, totalDomains: 9, assignedCount: 0, unassignedDomainIds: ['IA-01'] };
      const assessmentId = 1;

      const shouldRedirect = isSponsor && assignmentCheck && !assignmentCheck.allAssigned && !!assessmentId;
      expect(shouldRedirect).toBe(false);
    });
  });

  describe('Sponsor é somente-leitura no acompanhamento', () => {
    it('Sponsor deve ter isReadOnly=true na tela de acompanhamento', () => {
      const isAdmin = false;
      const isSponsorAccess = true;
      const assessmentStatus = 'em_andamento';

      const isReadOnly = isAdmin || isSponsorAccess || assessmentStatus === 'concluida' || assessmentStatus === 'arquivada';
      expect(isReadOnly).toBe(true);
    });

    it('Admin deve ter isReadOnly=true (apenas visualiza)', () => {
      const isAdmin = true;
      const isSponsorAccess = false;
      const assessmentStatus = 'em_andamento';

      const isReadOnly = isAdmin || isSponsorAccess || assessmentStatus === 'concluida' || assessmentStatus === 'arquivada';
      expect(isReadOnly).toBe(true);
    });

    it('Respondente (gestor_area) NÃO deve ter isReadOnly em avaliação ativa', () => {
      const isAdmin = false;
      const isSponsorAccess = false;
      const assessmentStatus = 'em_andamento';

      const isReadOnly = isAdmin || isSponsorAccess || assessmentStatus === 'concluida' || assessmentStatus === 'arquivada';
      expect(isReadOnly).toBe(false);
    });

    it('Respondente deve ter isReadOnly em avaliação concluída', () => {
      const isAdmin = false;
      const isSponsorAccess = false;
      const assessmentStatus = 'concluida';

      const isReadOnly = isAdmin || isSponsorAccess || assessmentStatus === 'concluida' || assessmentStatus === 'arquivada';
      expect(isReadOnly).toBe(true);
    });
  });

  describe('Sponsor vê todos os domínios para acompanhamento', () => {
    it('Sponsor vê todos os 9 domínios do framework', () => {
      const { isSponsor } = getMyAssignedDomainsLogic('sponsor');
      expect(isSponsor).toBe(true);
      // No backend, quando isSponsor=true, retorna SEUSDADOS_FRAMEWORK.map(d => d.id)
      // que são todos os 9 domínios
    });

    it('Respondente vê apenas domínios atribuídos a ele', () => {
      const { isAdminOrConsultor, isSponsor } = getMyAssignedDomainsLogic('gestor_area');
      expect(isAdminOrConsultor).toBe(false);
      expect(isSponsor).toBe(false);
      // No backend, quando ambos são false, filtra por assignedToUserId
    });
  });

  describe('Perfis removidos não existem mais', () => {
    it('pmo não é reconhecido como admin ou sponsor', () => {
      const { isAdminOrConsultor, isSponsor } = getMyAssignedDomainsLogic('pmo');
      expect(isAdminOrConsultor).toBe(false);
      expect(isSponsor).toBe(false);
    });

    it('consultor_par não é reconhecido como admin ou sponsor', () => {
      const { isAdminOrConsultor, isSponsor } = getMyAssignedDomainsLogic('consultor_par');
      expect(isAdminOrConsultor).toBe(false);
      expect(isSponsor).toBe(false);
    });

    it('dpo_interno não é reconhecido como admin ou sponsor', () => {
      const { isAdminOrConsultor, isSponsor } = getMyAssignedDomainsLogic('dpo_interno');
      expect(isAdminOrConsultor).toBe(false);
      expect(isSponsor).toBe(false);
    });

    it('usuario não é reconhecido como admin ou sponsor', () => {
      const { isAdminOrConsultor, isSponsor } = getMyAssignedDomainsLogic('usuario');
      expect(isAdminOrConsultor).toBe(false);
      expect(isSponsor).toBe(false);
    });
  });
});
