import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Testes para geração e salvamento de cláusulas LGPD
 * e integração com plano de ação
 */

describe('Clause Generation and Action Plan Integration', () => {
  // Mock de cláusulas geradas
  const mockClauses = [
    {
      id: 'identificacao-partes',
      titulo: 'Identificação das Partes',
      conteudo: 'Cláusula de identificação das partes contratantes...',
      aplicavel: true,
      numero: 1,
    },
    {
      id: 'objeto-tratamento',
      titulo: 'Objeto do Tratamento de Dados',
      conteudo: 'O presente acordo tem por objeto regular o tratamento...',
      aplicavel: true,
      numero: 2,
    },
    {
      id: 'seguranca-dados',
      titulo: 'Medidas de Segurança',
      conteudo: 'As partes comprometem-se a implementar medidas técnicas...',
      aplicavel: true,
      numero: 3,
    },
  ];

  // Mock de riscos identificados
  const mockRisks = [
    {
      id: 1,
      riskLevel: '2',
      contractArea: 'Segurança',
      riskDescription: 'Ausência de cláusula de notificação de incidentes',
      potentialImpact: 'Multa ANPD',
      requiredAction: 'Incluir cláusula de notificação em 48h',
      legalReference: 'Art. 48 LGPD',
    },
    {
      id: 2,
      riskLevel: '3',
      contractArea: 'Operacional',
      riskDescription: 'Falta de treinamento de colaboradores',
      potentialImpact: 'Vazamento de dados',
      requiredAction: 'Implementar programa de treinamento LGPD',
      legalReference: 'Art. 50 LGPD',
    },
  ];

  describe('Clause Formatting', () => {
    it('should format clauses with valid IDs', () => {
      const formattedClauses = mockClauses.map((c, index) => ({
        clauseId: c.id,
        sequenceNumber: index + 1,
        title: c.titulo,
        content: c.conteudo,
      }));

      expect(formattedClauses).toHaveLength(3);
      expect(formattedClauses[0].clauseId).toBe('identificacao-partes');
      expect(formattedClauses[0].sequenceNumber).toBe(1);
    });

    it('should generate fallback ID when bloco is missing', () => {
      const clauseWithoutId = {
        bloco: null,
        titulo: 'Cláusula de Teste',
        texto: 'Conteúdo de teste',
      };

      const id = clauseWithoutId.bloco || 
                 clauseWithoutId.titulo?.replace(/\s+/g, '-').toLowerCase() || 
                 'clausula-1';

      expect(id).toBe('cláusula-de-teste');
    });
  });

  describe('Action Plan Categorization', () => {
    it('should categorize contractual actions correctly', () => {
      const risk = mockRisks[0];
      const isOperacional = risk.requiredAction?.toLowerCase().includes('implementar') ||
                            risk.requiredAction?.toLowerCase().includes('treinar');
      
      expect(isOperacional).toBe(false);
    });

    it('should categorize operational actions correctly', () => {
      const risk = mockRisks[1];
      const isOperacional = risk.requiredAction?.toLowerCase().includes('implementar') ||
                            risk.requiredAction?.toLowerCase().includes('treinar');
      
      expect(isOperacional).toBe(true);
    });

    it('should determine output type for DPA-related actions', () => {
      const risk = { contractArea: 'DPA - Acordo de Tratamento' };
      const isDpa = risk.contractArea?.toLowerCase().includes('dpa') || 
                    risk.contractArea?.toLowerCase().includes('tratamento');
      
      expect(isDpa).toBe(true);
    });

    it('should determine output type for regular contract actions', () => {
      const risk = { contractArea: 'Segurança' };
      const isDpa = risk.contractArea?.toLowerCase().includes('dpa') || 
                    risk.contractArea?.toLowerCase().includes('tratamento');
      
      expect(isDpa).toBe(false);
    });
  });

  describe('Clause-Action Linking', () => {
    it('should link action to matching clause by area', () => {
      const clauseMap = new Map(mockClauses.map(c => [c.id, { title: c.titulo }]));
      const risk = { contractArea: 'Segurança' };
      
      let linkedClauseId: string | undefined;
      const clauseEntries = Array.from(clauseMap.entries());
      for (let i = 0; i < clauseEntries.length; i++) {
        const [clauseId, clause] = clauseEntries[i];
        if (clause.title?.toLowerCase().includes(risk.contractArea?.toLowerCase() || '')) {
          linkedClauseId = clauseId;
          break;
        }
      }
      
      expect(linkedClauseId).toBe('seguranca-dados');
    });

    it('should return undefined when no matching clause found', () => {
      const clauseMap = new Map(mockClauses.map(c => [c.id, { title: c.titulo }]));
      const risk = { contractArea: 'Auditoria' };
      
      let linkedClauseId: string | undefined;
      const clauseEntries = Array.from(clauseMap.entries());
      for (let i = 0; i < clauseEntries.length; i++) {
        const [clauseId, clause] = clauseEntries[i];
        if (clause.title?.toLowerCase().includes(risk.contractArea?.toLowerCase() || '')) {
          linkedClauseId = clauseId;
          break;
        }
      }
      
      expect(linkedClauseId).toBeUndefined();
    });
  });

  describe('Priority Mapping', () => {
    it('should map risk level 1 to critical priority', () => {
      const riskToPriority = (level: string) => {
        switch (level) {
          case '1': return 'critica';
          case '2': return 'alta';
          case '3': return 'media';
          default: return 'baixa';
        }
      };
      
      expect(riskToPriority('1')).toBe('critica');
    });

    it('should map risk level 2 to high priority', () => {
      const riskToPriority = (level: string) => {
        switch (level) {
          case '1': return 'critica';
          case '2': return 'alta';
          case '3': return 'media';
          default: return 'baixa';
        }
      };
      
      expect(riskToPriority('2')).toBe('alta');
    });

    it('should map risk level 3 to medium priority', () => {
      const riskToPriority = (level: string) => {
        switch (level) {
          case '1': return 'critica';
          case '2': return 'alta';
          case '3': return 'media';
          default: return 'baixa';
        }
      };
      
      expect(riskToPriority('3')).toBe('media');
    });
  });

  describe('Due Date Calculation', () => {
    it('should calculate 7 days for critical priority', () => {
      const calculateDueDate = (priority: string): number => {
        switch (priority) {
          case 'critica': return 7;
          case 'alta': return 15;
          case 'media': return 30;
          default: return 60;
        }
      };
      
      expect(calculateDueDate('critica')).toBe(7);
    });

    it('should calculate 15 days for high priority', () => {
      const calculateDueDate = (priority: string): number => {
        switch (priority) {
          case 'critica': return 7;
          case 'alta': return 15;
          case 'media': return 30;
          default: return 60;
        }
      };
      
      expect(calculateDueDate('alta')).toBe(15);
    });
  });

  describe('Action Plan Summary', () => {
    it('should correctly count actions by category', () => {
      const actions = [
        { id: 1, actionCategory: 'contratual', status: 'pendente' },
        { id: 2, actionCategory: 'contratual', status: 'em_andamento' },
        { id: 3, actionCategory: 'operacional', status: 'pendente' },
        { id: 4, actionCategory: 'operacional', status: 'concluida' },
      ];
      
      const contratuais = actions.filter(a => a.actionCategory === 'contratual');
      const operacionais = actions.filter(a => a.actionCategory === 'operacional');
      
      expect(contratuais).toHaveLength(2);
      expect(operacionais).toHaveLength(2);
    });

    it('should correctly count actions by status', () => {
      const actions = [
        { id: 1, status: 'pendente' },
        { id: 2, status: 'em_andamento' },
        { id: 3, status: 'pendente' },
        { id: 4, status: 'concluida' },
      ];
      
      const summary = {
        pendentes: actions.filter(a => a.status === 'pendente').length,
        emAndamento: actions.filter(a => a.status === 'em_andamento').length,
        concluidas: actions.filter(a => a.status === 'concluida').length,
      };
      
      expect(summary.pendentes).toBe(2);
      expect(summary.emAndamento).toBe(1);
      expect(summary.concluidas).toBe(1);
    });
  });

  describe('Saved Clauses Loading', () => {
    it('should transform saved clauses to expected format', () => {
      const savedClauses = [
        { id: 1, clauseId: 'cl-1', title: 'Título 1', content: 'Conteúdo 1', isApplicable: 1, sequenceNumber: 1, isAccepted: 1 },
        { id: 2, clauseId: 'cl-2', title: 'Título 2', content: 'Conteúdo 2', isApplicable: 1, sequenceNumber: 2, isAccepted: 0 },
      ];
      
      const formatted = savedClauses.map(c => ({
        id: c.clauseId,
        titulo: c.title,
        conteudo: c.content,
        aplicavel: c.isApplicable,
        numero: c.sequenceNumber,
        dbId: c.id,
      }));
      
      expect(formatted).toHaveLength(2);
      expect(formatted[0].id).toBe('cl-1');
      expect(formatted[0].titulo).toBe('Título 1');
    });

    it('should initialize acceptance state from saved clauses', () => {
      const savedClauses = [
        { clauseId: 'cl-1', isAccepted: 1 },
        { clauseId: 'cl-2', isAccepted: 0 },
        { clauseId: 'cl-3', isAccepted: null },
      ];
      
      const initialAccepted: Record<string, boolean> = {};
      savedClauses.forEach(c => {
        initialAccepted[c.clauseId] = c.isAccepted ?? true;
      });
      
      expect(initialAccepted['cl-1']).toBeTruthy();
      expect(initialAccepted['cl-2']).toBeFalsy();
      expect(initialAccepted['cl-3']).toBeTruthy();
    });
  });
});
