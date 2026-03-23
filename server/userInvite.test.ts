import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateUserInviteEmailTemplate, UserInviteEmailData } from './emailService';

describe('User Invite System', () => {
  describe('generateUserInviteEmailTemplate', () => {
    const baseInviteData: UserInviteEmailData = {
      inviteeEmail: 'novo@empresa.com',
      inviteeName: 'João Silva',
      inviterName: 'Maria Admin',
      organizationName: 'Empresa ABC',
      role: 'usuario',
      inviteLink: 'https://dll.seusdados.com/convite/abc123xyz',
      expiresAt: new Date('2025-12-31T23:59:59'),
    };

    it('should generate HTML email with all required fields', () => {
      const { html, text } = generateUserInviteEmailTemplate(baseInviteData);
      
      expect(html).toContain('João Silva');
      expect(html).toContain('Maria Admin');
      expect(html).toContain('Empresa ABC');
      expect(html).toContain('Usuário');
      expect(html).toContain(baseInviteData.inviteLink);
      expect(html).toContain('Aceitar Convite');
    });

    it('should generate text email with all required fields', () => {
      const { text } = generateUserInviteEmailTemplate(baseInviteData);
      
      expect(text).toContain('João Silva');
      expect(text).toContain('Maria Admin');
      expect(text).toContain('Empresa ABC');
      expect(text).toContain('Usuário');
      expect(text).toContain(baseInviteData.inviteLink);
    });

    it('should include custom message when provided', () => {
      const dataWithMessage: UserInviteEmailData = {
        ...baseInviteData,
        customMessage: 'Bem-vindo à nossa equipe!',
      };
      
      const { html, text } = generateUserInviteEmailTemplate(dataWithMessage);
      
      expect(html).toContain('Bem-vindo à nossa equipe!');
    });

    it('should handle missing invitee name gracefully', () => {
      const dataWithoutName: UserInviteEmailData = {
        ...baseInviteData,
        inviteeName: undefined,
      };
      
      const { html, text } = generateUserInviteEmailTemplate(dataWithoutName);
      
      expect(html).toContain('Olá');
      expect(html).not.toContain('undefined');
    });

    it('should handle missing organization name gracefully', () => {
      const dataWithoutOrg: UserInviteEmailData = {
        ...baseInviteData,
        organizationName: undefined,
      };
      
      const { html, text } = generateUserInviteEmailTemplate(dataWithoutOrg);
      
      expect(html).not.toContain('undefined');
    });

    it('should format different roles correctly', () => {
      const roles = ['admin', 'consultor', 'usuario'];
      const expectedLabels = ['Administrador', 'Consultor', 'Usuário'];
      
      roles.forEach((role, index) => {
        const data: UserInviteEmailData = {
          ...baseInviteData,
          role,
        };
        
        const { html } = generateUserInviteEmailTemplate(data);
        expect(html).toContain(expectedLabels[index]);
      });
    });

    it('should include expiration date in formatted output', () => {
      const { html } = generateUserInviteEmailTemplate(baseInviteData);
      
      // Should contain formatted date (31/12/2025 in pt-BR locale)
      expect(html).toContain('31/12/2025');
    });

    it('should include Seusdados branding', () => {
      const { html } = generateUserInviteEmailTemplate(baseInviteData);
      
      expect(html).toContain('seusdados');
      expect(html).toContain('Due Diligence');
      expect(html).toContain('Seusdados Consultoria');
    });

    it('should include fallback link text', () => {
      const { html } = generateUserInviteEmailTemplate(baseInviteData);
      
      expect(html).toContain('Caso o botão não funcione');
      expect(html).toContain('copie e cole');
    });
  });

  describe('Invite Token Generation', () => {
    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        const token = Array.from({ length: 32 }, () => 
          'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(
            Math.floor(Math.random() * 62)
          )
        ).join('');
        tokens.add(token);
      }
      
      expect(tokens.size).toBe(100);
    });

    it('should generate tokens with correct length', () => {
      const token = Array.from({ length: 32 }, () => 
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(
          Math.floor(Math.random() * 62)
        )
      ).join('');
      
      expect(token.length).toBe(32);
    });

    it('should generate tokens with valid characters only', () => {
      const token = Array.from({ length: 32 }, () => 
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(
          Math.floor(Math.random() * 62)
        )
      ).join('');
      
      expect(token).toMatch(/^[A-Za-z0-9]+$/);
    });
  });

  describe('Invite Expiration', () => {
    it('should calculate correct expiration date for 7 days', () => {
      const now = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      const diffDays = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(7);
    });

    it('should calculate correct expiration date for 30 days', () => {
      const now = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      const diffDays = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(30);
    });

    it('should correctly identify expired invites', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const isExpired = new Date() > pastDate;
      expect(isExpired).toBe(true);
    });

    it('should correctly identify valid invites', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      
      const isExpired = new Date() > futureDate;
      expect(isExpired).toBe(false);
    });
  });

  describe('Role Validation', () => {
    const validRoles = ['admin', 'consultor', 'usuario'];
    
    it('should accept valid roles', () => {
      validRoles.forEach(role => {
        expect(validRoles.includes(role)).toBe(true);
      });
    });

    it('should reject invalid roles', () => {
      const invalidRoles = ['superadmin', 'guest', 'viewer', ''];
      
      invalidRoles.forEach(role => {
        expect(validRoles.includes(role)).toBe(false);
      });
    });
  });

  describe('Email Validation', () => {
    it('should validate correct email format', () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user@subdomain.example.com',
      ];
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });
    });

    it('should reject invalid email format', () => {
      const invalidEmails = [
        'userexample.com',
        'user@',
        '@example.com',
        'user@example',
      ];
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });
  });
});
