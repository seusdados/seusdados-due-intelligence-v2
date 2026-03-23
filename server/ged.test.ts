import { describe, it, expect } from 'vitest';
import * as gedService from './gedService';

describe('GED Service', () => {
  describe('canAccessSpace', () => {
    it('should allow admin_global access to all spaces', () => {
      const user: gedService.GedUser = {
        id: 1,
        role: 'admin_global',
        organizationId: null,
      };
      
      // Admin global can access seusdados space
      expect(gedService.canAccessSpace(user, 'seusdados', null)).toBe(true);
      
      // Admin global can access any organization space
      expect(gedService.canAccessSpace(user, 'organization', 1)).toBe(true);
      expect(gedService.canAccessSpace(user, 'organization', 2)).toBe(true);
    });

    it('should allow consultor access to all spaces', () => {
      const user: gedService.GedUser = {
        id: 2,
        role: 'consultor',
        organizationId: null,
      };
      
      // Consultor can access seusdados space
      expect(gedService.canAccessSpace(user, 'seusdados', null)).toBe(true);
      
      // Consultor can access any organization space
      expect(gedService.canAccessSpace(user, 'organization', 1)).toBe(true);
    });

    it('should restrict cliente to their own organization', () => {
      const user: gedService.GedUser = {
        id: 3,
        role: 'usuario',
        organizationId: 1,
      };
      
      // Cliente cannot access seusdados space
      expect(gedService.canAccessSpace(user, 'seusdados', null)).toBe(false);
      
      // Cliente can access their own organization
      expect(gedService.canAccessSpace(user, 'organization', 1)).toBe(true);
      
      // Cliente cannot access other organizations
      expect(gedService.canAccessSpace(user, 'organization', 2)).toBe(false);
    });
  });

  describe('hasAccessLevel', () => {
    it('should correctly check admin access level', () => {
      expect(gedService.hasAccessLevel('admin', 'view')).toBe(true);
      expect(gedService.hasAccessLevel('admin', 'download')).toBe(true);
      expect(gedService.hasAccessLevel('admin', 'edit')).toBe(true);
      expect(gedService.hasAccessLevel('admin', 'delete')).toBe(true);
      expect(gedService.hasAccessLevel('admin', 'admin')).toBe(true);
    });

    it('should correctly check edit access level', () => {
      expect(gedService.hasAccessLevel('edit', 'view')).toBe(true);
      expect(gedService.hasAccessLevel('edit', 'download')).toBe(true);
      expect(gedService.hasAccessLevel('edit', 'edit')).toBe(true);
      expect(gedService.hasAccessLevel('edit', 'delete')).toBe(false);
      expect(gedService.hasAccessLevel('edit', 'admin')).toBe(false);
    });

    it('should correctly check download access level', () => {
      expect(gedService.hasAccessLevel('download', 'view')).toBe(true);
      expect(gedService.hasAccessLevel('download', 'download')).toBe(true);
      expect(gedService.hasAccessLevel('download', 'edit')).toBe(false);
      expect(gedService.hasAccessLevel('download', 'delete')).toBe(false);
    });

    it('should correctly check view access level', () => {
      expect(gedService.hasAccessLevel('view', 'view')).toBe(true);
      expect(gedService.hasAccessLevel('view', 'download')).toBe(false);
      expect(gedService.hasAccessLevel('view', 'edit')).toBe(false);
    });
  });

  describe('getDefaultAccessLevel', () => {
    it('should return admin for admin_global', () => {
      const user: gedService.GedUser = {
        id: 1,
        role: 'admin_global',
        organizationId: null,
      };
      
      expect(gedService.getDefaultAccessLevel(user, 'seusdados')).toBe('admin');
      expect(gedService.getDefaultAccessLevel(user, 'organization')).toBe('admin');
    });

    it('should return appropriate level for consultor', () => {
      const user: gedService.GedUser = {
        id: 2,
        role: 'consultor',
        organizationId: null,
      };
      
      // Consultor has admin access to seusdados, edit to organizations
      expect(gedService.getDefaultAccessLevel(user, 'seusdados')).toBe('admin');
      expect(gedService.getDefaultAccessLevel(user, 'organization')).toBe('edit');
    });

    it('should return download for cliente', () => {
      const user: gedService.GedUser = {
        id: 3,
        role: 'usuario',
        organizationId: 1,
      };
      
      expect(gedService.getDefaultAccessLevel(user, 'organization')).toBe('download');
    });
  });

  describe('User role types', () => {
    it('should accept valid user roles', () => {
      const validRoles: gedService.UserRole[] = [
        'admin_global',
        'consultor',
        'usuario',
      ];
      
      validRoles.forEach(role => {
        const user: gedService.GedUser = {
          id: 1,
          role,
          organizationId: ['admin_global', 'pmo', 'consultor', 'consultor_par'].includes(role) ? null : 1,
        };
        
        // Should not throw
        expect(() => gedService.canAccessSpace(user, 'organization', 1)).not.toThrow();
      });
    });
  });

  describe('Space types', () => {
    it('should handle organization space type', () => {
      const user: gedService.GedUser = {
        id: 1,
        role: 'admin_global',
        organizationId: null,
      };
      
      expect(gedService.canAccessSpace(user, 'organization', 1)).toBe(true);
    });

    it('should handle seusdados space type', () => {
      const user: gedService.GedUser = {
        id: 1,
        role: 'admin_global',
        organizationId: null,
      };
      
      expect(gedService.canAccessSpace(user, 'seusdados', null)).toBe(true);
    });
  });

  describe('Access level hierarchy', () => {
    it('should follow correct hierarchy: view < download < edit < delete < admin', () => {
      // View is lowest
      expect(gedService.hasAccessLevel('view', 'view')).toBe(true);
      expect(gedService.hasAccessLevel('view', 'download')).toBe(false);
      
      // Download includes view
      expect(gedService.hasAccessLevel('download', 'view')).toBe(true);
      expect(gedService.hasAccessLevel('download', 'download')).toBe(true);
      expect(gedService.hasAccessLevel('download', 'edit')).toBe(false);
      
      // Edit includes download and view
      expect(gedService.hasAccessLevel('edit', 'view')).toBe(true);
      expect(gedService.hasAccessLevel('edit', 'download')).toBe(true);
      expect(gedService.hasAccessLevel('edit', 'edit')).toBe(true);
      expect(gedService.hasAccessLevel('edit', 'delete')).toBe(false);
      
      // Delete includes edit, download, and view
      expect(gedService.hasAccessLevel('delete', 'view')).toBe(true);
      expect(gedService.hasAccessLevel('delete', 'download')).toBe(true);
      expect(gedService.hasAccessLevel('delete', 'edit')).toBe(true);
      expect(gedService.hasAccessLevel('delete', 'delete')).toBe(true);
      expect(gedService.hasAccessLevel('delete', 'admin')).toBe(false);
      
      // Admin includes all
      expect(gedService.hasAccessLevel('admin', 'view')).toBe(true);
      expect(gedService.hasAccessLevel('admin', 'download')).toBe(true);
      expect(gedService.hasAccessLevel('admin', 'edit')).toBe(true);
      expect(gedService.hasAccessLevel('admin', 'delete')).toBe(true);
      expect(gedService.hasAccessLevel('admin', 'admin')).toBe(true);
    });
  });

  describe('Organization isolation', () => {
    it('should isolate cliente users to their organization', () => {
      const clienteOrg1: gedService.GedUser = {
        id: 10,
        role: 'usuario',
        organizationId: 1,
      };
      
      const clienteOrg2: gedService.GedUser = {
        id: 11,
        role: 'usuario',
        organizationId: 2,
      };
      
      // Each cliente can only access their own org
      expect(gedService.canAccessSpace(clienteOrg1, 'organization', 1)).toBe(true);
      expect(gedService.canAccessSpace(clienteOrg1, 'organization', 2)).toBe(false);
      
      expect(gedService.canAccessSpace(clienteOrg2, 'organization', 1)).toBe(false);
      expect(gedService.canAccessSpace(clienteOrg2, 'organization', 2)).toBe(true);
    });

    it('should allow consultores to access all organizations', () => {
      const consultor: gedService.GedUser = {
        id: 20,
        role: 'consultor',
        organizationId: null,
      };
      
      expect(gedService.canAccessSpace(consultor, 'organization', 1)).toBe(true);
      expect(gedService.canAccessSpace(consultor, 'organization', 2)).toBe(true);
      expect(gedService.canAccessSpace(consultor, 'organization', 100)).toBe(true);
    });
  });
});
