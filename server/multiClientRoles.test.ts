/**
 * Testes para suporte a múltiplos papéis de Cliente
 * Valida: atribuição, persistência, verificação de permissões
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hasAnyRole, hasAllRoles } from './_core/trpc';

describe('Multiple Client Roles Support', () => {
  describe('hasAnyRole function', () => {
    it('should return true if user has main role in required roles', () => {
      const result = hasAnyRole('sponsor', [], ['sponsor', 'gestor_area']);
      expect(result).toBe(true);
    });

    it('should return true if user has any client role in required roles', () => {
      const result = hasAnyRole('usuario', ['gestor_area', 'lider_processo'], ['sponsor', 'gestor_area']);
      expect(result).toBe(true);
    });

    it('should return false if user has none of the required roles', () => {
      const result = hasAnyRole('usuario', ['sponsor'], ['gestor_area', 'lider_processo']);
      expect(result).toBe(false);
    });

    it('should return false if user has no client roles and main role does not match', () => {
      const result = hasAnyRole('usuario', [], ['sponsor', 'gestor_area']);
      expect(result).toBe(false);
    });

    it('should handle undefined clientRoles', () => {
      const result = hasAnyRole('sponsor', undefined, ['sponsor']);
      expect(result).toBe(true);
    });
  });

  describe('hasAllRoles function', () => {
    it('should return true if user has all required roles', () => {
      const result = hasAllRoles('sponsor', ['gestor_area'], ['sponsor', 'gestor_area']);
      expect(result).toBe(true);
    });

    it('should return false if user is missing any required role', () => {
      const result = hasAllRoles('sponsor', ['gestor_area'], ['sponsor', 'gestor_area', 'lider_processo']);
      expect(result).toBe(false);
    });

    it('should return true if main role satisfies all requirements', () => {
      const result = hasAllRoles('sponsor', [], ['sponsor']);
      expect(result).toBe(true);
    });

    it('should handle undefined clientRoles', () => {
      const result = hasAllRoles('sponsor', undefined, ['sponsor']);
      expect(result).toBe(true);
    });
  });

  describe('Client Role Combinations', () => {
    it('should support Sponsor + Gestor de Área combination', () => {
      const userRole = 'sponsor';
      const userClientRoles = ['gestor_area'];
      
      // Should have access to sponsor features
      expect(hasAnyRole(userRole, userClientRoles, ['sponsor'])).toBe(true);
      
      // Should have access to gestor features
      expect(hasAnyRole(userRole, userClientRoles, ['gestor_area'])).toBe(true);
      
      // Should NOT have access to lider_processo features
      expect(hasAnyRole(userRole, userClientRoles, ['lider_processo'])).toBe(false);
    });

    it('should support Sponsor + Líder de Processo combination', () => {
      const userRole = 'sponsor';
      const userClientRoles = ['lider_processo'];
      
      expect(hasAnyRole(userRole, userClientRoles, ['sponsor'])).toBe(true);
      expect(hasAnyRole(userRole, userClientRoles, ['lider_processo'])).toBe(true);
      expect(hasAnyRole(userRole, userClientRoles, ['gestor_area'])).toBe(false);
    });

    it('should support Comitê + Gestor de Área combination', () => {
      const userRole = 'comite';
      const userClientRoles = ['gestor_area'];
      
      expect(hasAnyRole(userRole, userClientRoles, ['comite'])).toBe(true);
      expect(hasAnyRole(userRole, userClientRoles, ['gestor_area'])).toBe(true);
      expect(hasAnyRole(userRole, userClientRoles, ['sponsor'])).toBe(false);
    });

    it('should support Comitê + Líder de Processo combination', () => {
      const userRole = 'comite';
      const userClientRoles = ['lider_processo'];
      
      expect(hasAnyRole(userRole, userClientRoles, ['comite'])).toBe(true);
      expect(hasAnyRole(userRole, userClientRoles, ['lider_processo'])).toBe(true);
    });

    it('should support multiple additional roles (3+)', () => {
      const userRole = 'sponsor';
      const userClientRoles = ['gestor_area', 'lider_processo', 'dpo_interno'];
      
      expect(hasAnyRole(userRole, userClientRoles, ['sponsor'])).toBe(true);
      expect(hasAnyRole(userRole, userClientRoles, ['gestor_area'])).toBe(true);
      expect(hasAnyRole(userRole, userClientRoles, ['lider_processo'])).toBe(true);
      expect(hasAnyRole(userRole, userClientRoles, ['dpo_interno'])).toBe(true);
    });
  });

  describe('Permission Union Logic', () => {
    it('should grant access if user has ANY of the required roles (OR logic)', () => {
      const userRole = 'usuario';
      const userClientRoles = ['gestor_area'];
      const requiredRoles = ['sponsor', 'gestor_area', 'lider_processo'];
      
      // User should have access because they have 'gestor_area'
      expect(hasAnyRole(userRole, userClientRoles, requiredRoles)).toBe(true);
    });

    it('should deny access if user has NONE of the required roles', () => {
      const userRole = 'usuario';
      const userClientRoles = [];
      const requiredRoles = ['sponsor', 'gestor_area', 'lider_processo'];
      
      // User should NOT have access
      expect(hasAnyRole(userRole, userClientRoles, requiredRoles)).toBe(false);
    });

    it('should enforce AND logic when hasAllRoles is used', () => {
      const userRole = 'sponsor';
      const userClientRoles = ['gestor_area'];
      
      // User has both roles
      expect(hasAllRoles(userRole, userClientRoles, ['sponsor', 'gestor_area'])).toBe(true);
      
      // User does not have all required roles
      expect(hasAllRoles(userRole, userClientRoles, ['sponsor', 'gestor_area', 'lider_processo'])).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty clientRoles array', () => {
      const result = hasAnyRole('sponsor', [], ['sponsor']);
      expect(result).toBe(true);
    });

    it('should handle empty required roles array', () => {
      const result = hasAnyRole('sponsor', ['gestor_area'], []);
      expect(result).toBe(false);
    });

    it('should handle null/undefined values gracefully', () => {
      expect(hasAnyRole('sponsor', undefined, ['sponsor'])).toBe(true);
      expect(hasAnyRole('sponsor', undefined, ['gestor_area'])).toBe(false);
    });

    it('should be case-sensitive for role names', () => {
      const result = hasAnyRole('sponsor', [], ['Sponsor']);
      expect(result).toBe(false);
    });
  });
});
