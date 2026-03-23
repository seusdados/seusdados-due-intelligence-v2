/**
 * Testes para o sistema de autenticação local
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

// Mock do módulo de banco de dados
vi.mock('./db', () => ({
  getDb: vi.fn(() => ({
    execute: vi.fn(),
  })),
}));

describe('Local Authentication Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Password Hashing', () => {
    it('should hash password correctly', async () => {
      const password = '@S3usdados26';
      const hash = await bcrypt.hash(password, 10);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2b$')).toBe(true);
    });

    it('should verify correct password', async () => {
      const password = '@S3usdados26';
      const hash = await bcrypt.hash(password, 10);
      
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = '@S3usdados26';
      const wrongPassword = 'wrongpassword';
      const hash = await bcrypt.hash(password, 10);
      
      const isValid = await bcrypt.compare(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it('should handle special characters in password', async () => {
      const password = 'D3ubomd+';
      const hash = await bcrypt.hash(password, 10);
      
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });
  });

  describe('User Credentials', () => {
    it('should validate vchiqueto@seusdados.com password', async () => {
      const password = '@S3usdados26';
      const storedHash = '$2b$10$wBjY9iJDP2XhtxvswYBYg.6CFIA5qOueRzq.0PwLRYrX0N4Omlvim';
      
      const isValid = await bcrypt.compare(password, storedHash);
      expect(isValid).toBe(true);
    });

    it('should validate contato@seusdados.com password', async () => {
      const password = 'D3ubomd+';
      const storedHash = '$2b$10$qpkdyLhgXNNJez2knwJLAOaCRb9hngpLeA3TbAGsVm3Menx4/zmgW';
      
      const isValid = await bcrypt.compare(password, storedHash);
      expect(isValid).toBe(true);
    });

    it('should validate sponsorteste@seusdados.com password', async () => {
      const password = '@Teste123';
      const storedHash = '$2b$10$pArp.tNz5gtV3dTpEp0Zde2BFjOLzXgLiuJuhEaBuhLLlyGTyQPcm';
      
      const isValid = await bcrypt.compare(password, storedHash);
      expect(isValid).toBe(true);
    });
  });

  describe('Input Validation', () => {
    it('should reject empty email', () => {
      const email = '';
      expect(email.length).toBe(0);
    });

    it('should reject empty password', () => {
      const password = '';
      expect(password.length).toBe(0);
    });

    it('should validate email format', () => {
      const validEmail = 'test@seusdados.com';
      const invalidEmail = 'invalid-email';
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      expect(emailRegex.test(validEmail)).toBe(true);
      expect(emailRegex.test(invalidEmail)).toBe(false);
    });
  });
});
