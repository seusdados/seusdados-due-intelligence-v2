import { useAuth } from './useAuth';
import { useMemo } from 'react';

/**
 * Hook para verificar permissões de um usuário
 * Suporta múltiplos papéis de cliente atribuídos ao mesmo usuário
 */
export function usePermissions() {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) {
      return {
        hasRole: () => false,
        hasAnyRole: () => false,
        hasAllRoles: () => false,
        isSponsor: false,
        isDPOInterno: false,
        isComite: false,
        isLiderProcesso: false,
        isGestorArea: false,
        isAdmin: false,
        isConsultor: false,
        isInternal: false,
        isCliente: false,
        clientRoles: [],
      };
    }

    // Papéis de cliente do usuário (papel principal + papéis adicionais)
    const clientRoles = (user as any).clientRoles || [];
    const allRoles = [user.role, ...clientRoles];

    return {
      /**
       * Verifica se o usuário tem um papel específico
       */
      hasRole: (role: string): boolean => {
        return allRoles.includes(role);
      },

      /**
       * Verifica se o usuário tem QUALQUER UM dos papéis especificados
       */
      hasAnyRole: (roles: string[]): boolean => {
        return roles.some(role => allRoles.includes(role));
      },

      /**
       * Verifica se o usuário tem TODOS os papéis especificados
       */
      hasAllRoles: (roles: string[]): boolean => {
        return roles.every(role => allRoles.includes(role));
      },

      // Atalhos para papéis de cliente comuns
      isSponsor: allRoles.includes('sponsor'),
      isDPOInterno: allRoles.includes('sponsor'),
      isComite: allRoles.includes('comite'),
      isLiderProcesso: allRoles.includes('lider_processo'),
      isGestorArea: allRoles.includes('gestor_area'),

      // Atalhos para papéis de sistema
      isAdmin: user.role === 'admin_global',
      isConsultor: ['consultor', 'admin_global'].includes(user.role),
      isInternal: ['admin_global', 'consultor'].includes(user.role),
      isCliente: ['sponsor', 'comite', 'lider_processo', 'gestor_area'].includes(user.role),

      // Array de papéis de cliente
      clientRoles,
    };
  }, [user]);
}
