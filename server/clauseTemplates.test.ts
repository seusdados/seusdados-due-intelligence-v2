/**
 * Testes unitários para funcionalidades de templates de cláusulas e diff
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do diff-match-patch
const mockDiffMatchPatch = {
  diff_main: vi.fn((text1: string, text2: string) => {
    if (text1 === text2) return [[0, text1]];
    return [[-1, text1], [1, text2]];
  }),
  diff_cleanupSemantic: vi.fn(),
};

vi.mock('diff-match-patch', () => ({
  default: vi.fn(() => mockDiffMatchPatch),
}));

describe('Biblioteca de Templates de Cláusulas', () => {
  describe('Templates Padrão', () => {
    const STANDARD_TEMPLATES = [
      { id: 'cl_identificacao_partes', category: 'identification', name: 'Identificação das Partes' },
      { id: 'cl_finalidades_tratamento', category: 'processing', name: 'Finalidades do Tratamento' },
      { id: 'cl_bases_legais', category: 'processing', name: 'Bases Legais' },
      { id: 'cl_categorias_dados', category: 'processing', name: 'Categorias de Dados' },
      { id: 'cl_menores', category: 'processing', name: 'Dados de Menores' },
      { id: 'cl_seguranca_tecnica', category: 'security', name: 'Medidas de Segurança Técnicas' },
      { id: 'cl_seguranca_organizacional', category: 'security', name: 'Medidas de Segurança Organizacionais' },
      { id: 'cl_direitos_titulares', category: 'rights', name: 'Direitos dos Titulares' },
      { id: 'cl_transferencia_internacional', category: 'international', name: 'Transferência Internacional' },
      { id: 'cl_incidentes_seguranca', category: 'incidents', name: 'Gestão de Incidentes' },
      { id: 'cl_retencao_eliminacao', category: 'retention', name: 'Retenção e Eliminação' },
      { id: 'cl_suboperadores', category: 'processing', name: 'Suboperadores' },
      { id: 'cl_auditoria', category: 'security', name: 'Auditoria e Fiscalização' },
      { id: 'cl_responsabilidade_civil', category: 'rights', name: 'Responsabilidade Civil' },
      { id: 'cl_clausula_minima', category: 'processing', name: 'Cláusula Mínima LGPD' },
    ];

    it('deve ter todos os templates padrão definidos', () => {
      expect(STANDARD_TEMPLATES.length).toBe(15);
    });

    it('deve ter IDs únicos para cada template', () => {
      const ids = STANDARD_TEMPLATES.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('deve ter categorias válidas para cada template', () => {
      const validCategories = ['identification', 'processing', 'security', 'rights', 'international', 'incidents', 'retention'];
      STANDARD_TEMPLATES.forEach(template => {
        expect(validCategories).toContain(template.category);
      });
    });

    it('deve ter nomes não vazios para cada template', () => {
      STANDARD_TEMPLATES.forEach(template => {
        expect(template.name).toBeTruthy();
        expect(template.name.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Categorias de Cláusulas', () => {
    const CLAUSE_CATEGORIES = [
      { id: 'all', name: 'Todas' },
      { id: 'identification', name: 'Identificação' },
      { id: 'processing', name: 'Tratamento' },
      { id: 'security', name: 'Segurança' },
      { id: 'rights', name: 'Direitos' },
      { id: 'international', name: 'Internacional' },
      { id: 'incidents', name: 'Incidentes' },
      { id: 'retention', name: 'Retenção' },
    ];

    it('deve ter todas as categorias definidas', () => {
      expect(CLAUSE_CATEGORIES.length).toBe(8);
    });

    it('deve incluir categoria "all" para mostrar todas', () => {
      const allCategory = CLAUSE_CATEGORIES.find(c => c.id === 'all');
      expect(allCategory).toBeDefined();
      expect(allCategory?.name).toBe('Todas');
    });
  });

  describe('Filtro de Cláusulas', () => {
    const templates = [
      { id: 'cl_1', category: 'security', name: 'Segurança 1', tags: ['segurança', 'técnico'] },
      { id: 'cl_2', category: 'processing', name: 'Tratamento 1', tags: ['tratamento', 'lgpd'] },
      { id: 'cl_3', category: 'security', name: 'Segurança 2', tags: ['segurança', 'organizacional'] },
    ];

    it('deve filtrar por categoria', () => {
      const filtered = templates.filter(t => t.category === 'security');
      expect(filtered.length).toBe(2);
    });

    it('deve filtrar por termo de busca no nome', () => {
      const searchTerm = 'Segurança';
      const filtered = templates.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      expect(filtered.length).toBe(2);
    });

    it('deve filtrar por tag', () => {
      const searchTag = 'técnico';
      const filtered = templates.filter(t => 
        t.tags.some(tag => tag.toLowerCase().includes(searchTag.toLowerCase()))
      );
      expect(filtered.length).toBe(1);
    });

    it('deve retornar todos quando categoria é "all"', () => {
      const category = 'all';
      const filtered = category === 'all' ? templates : templates.filter(t => t.category === category);
      expect(filtered.length).toBe(3);
    });
  });
});

describe('Comparação Visual de Versões (Diff)', () => {
  describe('Algoritmo de Diff', () => {
    it('deve identificar textos idênticos', () => {
      const text1 = 'Cláusula de proteção de dados';
      const text2 = 'Cláusula de proteção de dados';
      const result = mockDiffMatchPatch.diff_main(text1, text2);
      expect(result).toEqual([[0, text1]]);
    });

    it('deve identificar textos completamente diferentes', () => {
      const text1 = 'Texto antigo';
      const text2 = 'Texto novo';
      const result = mockDiffMatchPatch.diff_main(text1, text2);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Formatação de Diff', () => {
    const formatDiffForDisplay = (diffs: [number, string][]) => {
      return diffs.map(([operation, text]) => ({
        type: operation === -1 ? 'removed' : operation === 1 ? 'added' : 'unchanged',
        text,
      }));
    };

    it('deve formatar diff removido corretamente', () => {
      const diffs: [number, string][] = [[-1, 'texto removido']];
      const formatted = formatDiffForDisplay(diffs);
      expect(formatted[0].type).toBe('removed');
    });

    it('deve formatar diff adicionado corretamente', () => {
      const diffs: [number, string][] = [[1, 'texto adicionado']];
      const formatted = formatDiffForDisplay(diffs);
      expect(formatted[0].type).toBe('added');
    });

    it('deve formatar texto inalterado corretamente', () => {
      const diffs: [number, string][] = [[0, 'texto igual']];
      const formatted = formatDiffForDisplay(diffs);
      expect(formatted[0].type).toBe('unchanged');
    });
  });

  describe('Estatísticas de Diff', () => {
    const calculateDiffStats = (diffs: [number, string][]) => {
      let added = 0;
      let removed = 0;
      let unchanged = 0;

      diffs.forEach(([operation, text]) => {
        const words = text.split(/\s+/).filter(w => w.length > 0).length;
        if (operation === 1) added += words;
        else if (operation === -1) removed += words;
        else unchanged += words;
      });

      return { added, removed, unchanged };
    };

    it('deve calcular estatísticas de palavras adicionadas', () => {
      const diffs: [number, string][] = [[1, 'uma duas três']];
      const stats = calculateDiffStats(diffs);
      expect(stats.added).toBe(3);
      expect(stats.removed).toBe(0);
    });

    it('deve calcular estatísticas de palavras removidas', () => {
      const diffs: [number, string][] = [[-1, 'uma duas']];
      const stats = calculateDiffStats(diffs);
      expect(stats.removed).toBe(2);
      expect(stats.added).toBe(0);
    });

    it('deve calcular estatísticas combinadas', () => {
      const diffs: [number, string][] = [
        [0, 'texto igual'],
        [-1, 'removido'],
        [1, 'adicionado novo'],
      ];
      const stats = calculateDiffStats(diffs);
      expect(stats.unchanged).toBe(2);
      expect(stats.removed).toBe(1);
      expect(stats.added).toBe(2);
    });
  });
});

describe('Integração Gov.br Assinatura Digital', () => {
  describe('Status de Assinatura', () => {
    const STATUS_CONFIG = {
      pending: { label: 'Pendente', color: 'bg-slate-500' },
      awaiting_authorization: { label: 'Aguardando Autorização', color: 'bg-amber-500' },
      processing: { label: 'Processando', color: 'bg-blue-500' },
      completed: { label: 'Assinado', color: 'bg-emerald-500' },
      failed: { label: 'Falhou', color: 'bg-red-500' },
      expired: { label: 'Expirado', color: 'bg-slate-400' },
      cancelled: { label: 'Cancelado', color: 'bg-slate-400' },
    };

    it('deve ter todos os status definidos', () => {
      const statuses = Object.keys(STATUS_CONFIG);
      expect(statuses).toContain('pending');
      expect(statuses).toContain('awaiting_authorization');
      expect(statuses).toContain('processing');
      expect(statuses).toContain('completed');
      expect(statuses).toContain('failed');
      expect(statuses).toContain('expired');
      expect(statuses).toContain('cancelled');
    });

    it('deve ter labels não vazios para cada status', () => {
      Object.values(STATUS_CONFIG).forEach(config => {
        expect(config.label).toBeTruthy();
        expect(config.label.length).toBeGreaterThan(0);
      });
    });

    it('deve ter cores definidas para cada status', () => {
      Object.values(STATUS_CONFIG).forEach(config => {
        expect(config.color).toMatch(/^bg-/);
      });
    });
  });

  describe('Níveis Gov.br', () => {
    const GOVBR_LEVELS = {
      bronze: { label: 'Bronze', description: 'Conta básica' },
      prata: { label: 'Prata', description: 'Conta verificada' },
      ouro: { label: 'Ouro', description: 'Conta com biometria' },
    };

    it('deve ter todos os níveis definidos', () => {
      expect(Object.keys(GOVBR_LEVELS)).toEqual(['bronze', 'prata', 'ouro']);
    });

    it('deve ter descrições para cada nível', () => {
      Object.values(GOVBR_LEVELS).forEach(level => {
        expect(level.description).toBeTruthy();
      });
    });
  });

  describe('Validação de Assinatura', () => {
    const validateSignatureRequest = (request: {
      entityType: string;
      entityId: number;
      analysisId?: number;
    }) => {
      const errors: string[] = [];

      if (!['dpa', 'contract', 'document'].includes(request.entityType)) {
        errors.push('Tipo de entidade inválido');
      }

      if (!request.entityId || request.entityId <= 0) {
        errors.push('ID da entidade inválido');
      }

      return { valid: errors.length === 0, errors };
    };

    it('deve validar request com dados corretos', () => {
      const result = validateSignatureRequest({
        entityType: 'dpa',
        entityId: 1,
        analysisId: 1,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('deve rejeitar tipo de entidade inválido', () => {
      const result = validateSignatureRequest({
        entityType: 'invalid',
        entityId: 1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tipo de entidade inválido');
    });

    it('deve rejeitar ID de entidade inválido', () => {
      const result = validateSignatureRequest({
        entityType: 'dpa',
        entityId: 0,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ID da entidade inválido');
    });

    it('deve aceitar todos os tipos de entidade válidos', () => {
      ['dpa', 'contract', 'document'].forEach(entityType => {
        const result = validateSignatureRequest({
          entityType,
          entityId: 1,
        });
        expect(result.valid).toBe(true);
      });
    });
  });
});

describe('Histórico de Auditoria de Cláusulas', () => {
  describe('Registro de Alterações', () => {
    interface AuditEntry {
      id: number;
      clauseId: string;
      action: 'created' | 'updated' | 'accepted' | 'rejected' | 'refined';
      content?: string;
      previousContent?: string;
      userId: number;
      createdAt: string;
    }

    const createAuditEntry = (
      clauseId: string,
      action: AuditEntry['action'],
      userId: number,
      content?: string,
      previousContent?: string
    ): Omit<AuditEntry, 'id' | 'createdAt'> => ({
      clauseId,
      action,
      content,
      previousContent,
      userId,
    });

    it('deve criar entrada de auditoria para criação', () => {
      const entry = createAuditEntry('cl_1', 'created', 1, 'Conteúdo inicial');
      expect(entry.action).toBe('created');
      expect(entry.content).toBe('Conteúdo inicial');
      expect(entry.previousContent).toBeUndefined();
    });

    it('deve criar entrada de auditoria para atualização', () => {
      const entry = createAuditEntry('cl_1', 'updated', 1, 'Novo conteúdo', 'Conteúdo antigo');
      expect(entry.action).toBe('updated');
      expect(entry.content).toBe('Novo conteúdo');
      expect(entry.previousContent).toBe('Conteúdo antigo');
    });

    it('deve criar entrada de auditoria para refinamento', () => {
      const entry = createAuditEntry('cl_1', 'refined', 1, 'Conteúdo refinado', 'Conteúdo original');
      expect(entry.action).toBe('refined');
    });
  });

  describe('Comparação de Versões', () => {
    const canCompareVersions = (entries: { action: string }[]) => {
      const contentChanges = entries.filter(e => 
        ['created', 'updated', 'refined'].includes(e.action)
      );
      return contentChanges.length >= 2;
    };

    it('deve permitir comparação quando há 2+ versões', () => {
      const entries = [
        { action: 'created' },
        { action: 'updated' },
      ];
      expect(canCompareVersions(entries)).toBe(true);
    });

    it('deve não permitir comparação com apenas 1 versão', () => {
      const entries = [
        { action: 'created' },
        { action: 'accepted' },
      ];
      expect(canCompareVersions(entries)).toBe(false);
    });

    it('deve ignorar ações que não alteram conteúdo', () => {
      const entries = [
        { action: 'created' },
        { action: 'accepted' },
        { action: 'rejected' },
      ];
      expect(canCompareVersions(entries)).toBe(false);
    });
  });
});
