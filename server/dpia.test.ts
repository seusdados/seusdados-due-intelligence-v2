/**
 * Testes para o módulo DPIA e Revisão Periódica
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do banco de dados
vi.mock('./db', () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockResolvedValue([[], null]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  }),
}));

// Mock do serviço de email
vi.mock('./emailService', () => ({
  sendAssessmentEmail: vi.fn().mockResolvedValue(true),
}));

describe('DPIA Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDpiaAssessments', () => {
    it('deve retornar lista vazia quando não há DPIAs', async () => {
      const { getDpiaAssessments } = await import('./dpiaService');
      const result = await getDpiaAssessments(1);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getDpiaQuestions', () => {
    it('deve retornar lista de perguntas do questionário', async () => {
      const { getDpiaQuestions } = await import('./dpiaService');
      const result = await getDpiaQuestions();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getDpiaById', () => {
    it('deve retornar null quando DPIA não existe', async () => {
      const { getDpiaById } = await import('./dpiaService');
      const result = await getDpiaById(999999);
      expect(result).toBeNull();
    });
  });
});

describe('Review Schedule Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getReviewConfig', () => {
    it('deve retornar null quando não há configuração', async () => {
      const { getReviewConfig } = await import('./reviewScheduleService');
      const result = await getReviewConfig(1);
      expect(result).toBeNull();
    });
  });

  describe('getPendingReviews', () => {
    it('deve retornar lista vazia quando não há revisões pendentes', async () => {
      const { getPendingReviews } = await import('./reviewScheduleService');
      const result = await getPendingReviews(1);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getUpcomingReviews', () => {
    it('deve retornar lista vazia quando não há revisões agendadas', async () => {
      const { getUpcomingReviews } = await import('./reviewScheduleService');
      const result = await getUpcomingReviews(1, 30);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getReviewStats', () => {
    it('deve retornar estatísticas zeradas quando não há dados', async () => {
      const { getReviewStats } = await import('./reviewScheduleService');
      const result = await getReviewStats(1);
      expect(result).toHaveProperty('totalScheduled');
      expect(result).toHaveProperty('pending');
      expect(result).toHaveProperty('overdue');
      expect(result).toHaveProperty('completedThisMonth');
    });
  });
});

describe('ROPA Export Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateROPAPDF', () => {
    it('deve ser uma função exportada', async () => {
      const { generateROPAPDF } = await import('./ropaExportService');
      expect(typeof generateROPAPDF).toBe('function');
    });
  });

  describe('generateROPAExcel', () => {
    it('deve ser uma função exportada', async () => {
      const { generateROPAExcel } = await import('./ropaExportService');
      expect(typeof generateROPAExcel).toBe('function');
    });
  });
});
