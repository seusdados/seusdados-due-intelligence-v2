import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

// Schema de validação do updateProfile (espelhando o do router)
const updateProfileSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200).optional(),
  phone: z.string().max(20).optional().nullable(),
});

describe('Update Profile', () => {
  describe('Input Validation', () => {
    it('deve aceitar nome válido', () => {
      const result = updateProfileSchema.safeParse({ name: 'Karen Teste' });
      expect(result.success).toBe(true);
    });

    it('deve aceitar telefone válido', () => {
      const result = updateProfileSchema.safeParse({ phone: '(11) 99999-9999' });
      expect(result.success).toBe(true);
    });

    it('deve aceitar nome e telefone juntos', () => {
      const result = updateProfileSchema.safeParse({
        name: 'Karen Teste',
        phone: '(11) 99999-9999',
      });
      expect(result.success).toBe(true);
    });

    it('deve aceitar telefone nulo (para limpar)', () => {
      const result = updateProfileSchema.safeParse({ phone: null });
      expect(result.success).toBe(true);
    });

    it('deve rejeitar nome vazio', () => {
      const result = updateProfileSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar nome muito longo (>200 chars)', () => {
      const result = updateProfileSchema.safeParse({ name: 'A'.repeat(201) });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar telefone muito longo (>20 chars)', () => {
      const result = updateProfileSchema.safeParse({ phone: '1'.repeat(21) });
      expect(result.success).toBe(false);
    });

    it('deve aceitar objeto vazio (nenhuma alteração)', () => {
      const result = updateProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('deve aceitar apenas nome sem telefone', () => {
      const result = updateProfileSchema.safeParse({ name: 'Novo Nome' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Novo Nome');
        expect(result.data.phone).toBeUndefined();
      }
    });

    it('deve aceitar apenas telefone sem nome', () => {
      const result = updateProfileSchema.safeParse({ phone: '(21) 98765-4321' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phone).toBe('(21) 98765-4321');
        expect(result.data.name).toBeUndefined();
      }
    });
  });

  describe('Update Logic', () => {
    it('deve construir updateData corretamente com nome', () => {
      const input = { name: 'Karen Silva', phone: undefined };
      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.phone !== undefined) updateData.phone = input.phone || null;

      expect(updateData).toEqual({ name: 'Karen Silva' });
    });

    it('deve construir updateData corretamente com telefone', () => {
      const input = { name: undefined, phone: '(11) 99999-9999' };
      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.phone !== undefined) updateData.phone = input.phone || null;

      expect(updateData).toEqual({ phone: '(11) 99999-9999' });
    });

    it('deve construir updateData corretamente com ambos', () => {
      const input = { name: 'Karen Silva', phone: '(11) 99999-9999' };
      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.phone !== undefined) updateData.phone = input.phone || null;

      expect(updateData).toEqual({ name: 'Karen Silva', phone: '(11) 99999-9999' });
    });

    it('deve converter telefone vazio para null', () => {
      const input = { phone: '' };
      const updateData: Record<string, unknown> = {};
      if (input.phone !== undefined) updateData.phone = input.phone || null;

      expect(updateData).toEqual({ phone: null });
    });

    it('deve detectar nenhuma alteração quando input está vazio', () => {
      const input = {};
      const updateData: Record<string, unknown> = {};
      if ((input as any).name !== undefined) updateData.name = (input as any).name;
      if ((input as any).phone !== undefined) updateData.phone = (input as any).phone || null;

      expect(Object.keys(updateData).length).toBe(0);
    });
  });

  describe('Phone Format Validation', () => {
    const validPhones = [
      '(11) 99999-9999',
      '11999999999',
      '+55 11 99999-9999',
      '(21) 3456-7890',
      '',
    ];

    const invalidPhones = [
      '1'.repeat(21), // muito longo
    ];

    it('deve aceitar formatos de telefone válidos', () => {
      validPhones.forEach(phone => {
        const result = updateProfileSchema.safeParse({ phone });
        expect(result.success).toBe(true);
      });
    });

    it('deve rejeitar telefones inválidos', () => {
      invalidPhones.forEach(phone => {
        const result = updateProfileSchema.safeParse({ phone });
        expect(result.success).toBe(false);
      });
    });
  });
});
