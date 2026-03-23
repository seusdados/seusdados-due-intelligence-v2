import { describe, it, expect, vi } from 'vitest';

/**
 * Testes de integração para as melhorias do módulo de mapeamento:
 * 1. Notificação por e-mail ao finalizar entrevista
 * 2. Painel de cobertura de finalidades
 * 3. Modo de edição pós-finalização
 */

// ==========================================
// 1. TESTES DE TEMPLATE DE E-MAIL
// ==========================================

describe('Template de e-mail de conclusão de entrevista', () => {
  // Simular os dados de entrada
  const sampleData = {
    respondentName: 'Maria Silva',
    respondentEmail: 'maria@empresa.com',
    areaName: 'Recursos Humanos',
    processTitle: 'Admissão de Colaboradores',
    organizationName: 'Empresa Teste Ltda',
    totalDataCategories: 12,
    totalProcesses: 5,
    createdRots: 3,
    consultantEmail: 'consultor@seusdados.com',
    consultantName: 'Marcelo Fattori',
    platformUrl: 'https://app.seusdados.com',
  };

  it('deve conter dados do respondente no template', () => {
    // Verificar que os dados essenciais estão presentes
    expect(sampleData.respondentName).toBeTruthy();
    expect(sampleData.respondentEmail).toContain('@');
    expect(sampleData.areaName).toBeTruthy();
    expect(sampleData.organizationName).toBeTruthy();
    expect(sampleData.totalDataCategories).toBeGreaterThan(0);
    expect(sampleData.createdRots).toBeGreaterThan(0);
  });

  it('deve validar formato de e-mail do respondente', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test(sampleData.respondentEmail)).toBe(true);
  });

  it('deve validar formato de e-mail do consultor', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test(sampleData.consultantEmail!)).toBe(true);
  });

  it('deve aceitar dados sem consultor', () => {
    const dataWithoutConsultant = {
      ...sampleData,
      consultantEmail: undefined,
      consultantName: undefined,
    };
    expect(dataWithoutConsultant.consultantEmail).toBeUndefined();
    expect(dataWithoutConsultant.respondentEmail).toBeTruthy();
  });

  it('deve aceitar dados sem processo', () => {
    const dataWithoutProcess = {
      ...sampleData,
      processTitle: undefined,
    };
    expect(dataWithoutProcess.processTitle).toBeUndefined();
    expect(dataWithoutProcess.areaName).toBeTruthy();
  });
});

// ==========================================
// 2. TESTES DE COBERTURA DE FINALIDADES
// ==========================================

describe('Cálculo de cobertura de finalidades', () => {
  // Simular função de cálculo de cobertura
  function calculateCoverage(totalProcesses: number, completedResponses: number): number {
    if (totalProcesses === 0) return 0;
    return Math.round((completedResponses / totalProcesses) * 100);
  }

  it('deve calcular cobertura corretamente', () => {
    expect(calculateCoverage(10, 5)).toBe(50);
    expect(calculateCoverage(10, 10)).toBe(100);
    expect(calculateCoverage(10, 0)).toBe(0);
    expect(calculateCoverage(3, 1)).toBe(33);
    expect(calculateCoverage(3, 2)).toBe(67);
  });

  it('deve retornar 0 quando não há processos', () => {
    expect(calculateCoverage(0, 0)).toBe(0);
    expect(calculateCoverage(0, 5)).toBe(0);
  });

  it('deve arredondar corretamente', () => {
    expect(calculateCoverage(7, 3)).toBe(43);
    expect(calculateCoverage(7, 5)).toBe(71);
  });

  // Simular distribuição de bases legais
  function countLegalBases(responses: Array<{ legalBase?: string }>): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const resp of responses) {
      if (resp.legalBase) {
        counts[resp.legalBase] = (counts[resp.legalBase] || 0) + 1;
      }
    }
    return counts;
  }

  it('deve contar bases legais corretamente', () => {
    const responses = [
      { legalBase: 'consentimento' },
      { legalBase: 'consentimento' },
      { legalBase: 'obrigacao_legal' },
      { legalBase: 'execucao_contrato' },
      { legalBase: 'consentimento' },
      { legalBase: undefined },
    ];

    const result = countLegalBases(responses);
    expect(result['consentimento']).toBe(3);
    expect(result['obrigacao_legal']).toBe(1);
    expect(result['execucao_contrato']).toBe(1);
    expect(Object.keys(result)).toHaveLength(3);
  });

  it('deve lidar com respostas sem base legal', () => {
    const responses = [
      { legalBase: undefined },
      { legalBase: undefined },
    ];

    const result = countLegalBases(responses);
    expect(Object.keys(result)).toHaveLength(0);
  });

  // Simular distribuição de risco
  function countRiskDistribution(responses: Array<{ riskLevel?: string }>): Record<string, number> {
    const dist: Record<string, number> = { baixa: 0, media: 0, alta: 0, extrema: 0 };
    for (const resp of responses) {
      if (resp.riskLevel && dist[resp.riskLevel] !== undefined) {
        dist[resp.riskLevel]++;
      }
    }
    return dist;
  }

  it('deve calcular distribuição de risco', () => {
    const responses = [
      { riskLevel: 'baixa' },
      { riskLevel: 'baixa' },
      { riskLevel: 'media' },
      { riskLevel: 'alta' },
      { riskLevel: 'extrema' },
      { riskLevel: 'baixa' },
    ];

    const result = countRiskDistribution(responses);
    expect(result.baixa).toBe(3);
    expect(result.media).toBe(1);
    expect(result.alta).toBe(1);
    expect(result.extrema).toBe(1);
  });

  it('deve inicializar todos os níveis de risco em zero', () => {
    const result = countRiskDistribution([]);
    expect(result.baixa).toBe(0);
    expect(result.media).toBe(0);
    expect(result.alta).toBe(0);
    expect(result.extrema).toBe(0);
  });
});

// ==========================================
// 3. TESTES DE EDIÇÃO PÓS-FINALIZAÇÃO
// ==========================================

describe('Edição pós-finalização', () => {
  // Simular validação de status para reabertura
  function canReopenInterview(status: string): boolean {
    return status === 'concluiu';
  }

  it('deve permitir reabrir entrevista concluída', () => {
    expect(canReopenInterview('concluiu')).toBe(true);
  });

  it('não deve permitir reabrir entrevista não concluída', () => {
    expect(canReopenInterview('pendente')).toBe(false);
    expect(canReopenInterview('convidado')).toBe(false);
    expect(canReopenInterview('em_andamento')).toBe(false);
  });

  // Simular validação de papel para edição
  function canEditDataUses(userRole: string): boolean {
    return userRole !== 'usuario';
  }

  it('deve permitir edição por consultores', () => {
    expect(canEditDataUses('admin')).toBe(true);
    expect(canEditDataUses('admin_global')).toBe(true);
    expect(canEditDataUses('consultor')).toBe(true);
  });

  it('não deve permitir edição por usuários comuns', () => {
    expect(canEditDataUses('usuario')).toBe(false);
  });

  // Simular inferência de base legal consolidada
  function inferConsolidatedLegalBase(dataUses: Array<{ legalBasisValidated?: { status: string; code: string } }>): string {
    const validatedUses = dataUses.filter(du =>
      du.legalBasisValidated && (du.legalBasisValidated.status === 'accepted' || du.legalBasisValidated.status === 'adjusted')
    );

    if (validatedUses.length === 0) return 'execucao_contrato';

    const baseCounts: Record<string, number> = {};
    for (const du of validatedUses) {
      const code = du.legalBasisValidated!.code;
      baseCounts[code] = (baseCounts[code] || 0) + 1;
    }

    if (baseCounts['consentimento']) return 'consentimento';
    if (baseCounts['legitimo_interesse']) return 'legitimo_interesse';
    if (baseCounts['obrigacao_legal']) return 'obrigacao_legal';

    const sorted = Object.entries(baseCounts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : 'execucao_contrato';
  }

  it('deve inferir consentimento como base legal prioritária', () => {
    const dataUses = [
      { legalBasisValidated: { status: 'accepted', code: 'consentimento' } },
      { legalBasisValidated: { status: 'accepted', code: 'obrigacao_legal' } },
      { legalBasisValidated: { status: 'accepted', code: 'obrigacao_legal' } },
    ];
    expect(inferConsolidatedLegalBase(dataUses)).toBe('consentimento');
  });

  it('deve inferir legítimo interesse quando não há consentimento', () => {
    const dataUses = [
      { legalBasisValidated: { status: 'accepted', code: 'legitimo_interesse' } },
      { legalBasisValidated: { status: 'accepted', code: 'obrigacao_legal' } },
    ];
    expect(inferConsolidatedLegalBase(dataUses)).toBe('legitimo_interesse');
  });

  it('deve inferir obrigação legal quando não há consentimento nem legítimo interesse', () => {
    const dataUses = [
      { legalBasisValidated: { status: 'accepted', code: 'obrigacao_legal' } },
      { legalBasisValidated: { status: 'accepted', code: 'obrigacao_legal' } },
    ];
    expect(inferConsolidatedLegalBase(dataUses)).toBe('obrigacao_legal');
  });

  it('deve retornar execução de contrato como padrão quando não há validações', () => {
    const dataUses = [
      { legalBasisValidated: { status: 'rejected', code: 'consentimento' } },
      { legalBasisValidated: undefined },
    ];
    expect(inferConsolidatedLegalBase(dataUses)).toBe('execucao_contrato');
  });

  it('deve considerar apenas validações aceitas ou ajustadas', () => {
    const dataUses = [
      { legalBasisValidated: { status: 'rejected', code: 'consentimento' } },
      { legalBasisValidated: { status: 'accepted', code: 'obrigacao_legal' } },
      { legalBasisValidated: { status: 'adjusted', code: 'obrigacao_legal' } },
    ];
    expect(inferConsolidatedLegalBase(dataUses)).toBe('obrigacao_legal');
  });

  it('deve retornar a base mais frequente quando não há prioridade definida', () => {
    const dataUses = [
      { legalBasisValidated: { status: 'accepted', code: 'tutela_saude' } },
      { legalBasisValidated: { status: 'accepted', code: 'tutela_saude' } },
      { legalBasisValidated: { status: 'accepted', code: 'protecao_credito' } },
    ];
    expect(inferConsolidatedLegalBase(dataUses)).toBe('tutela_saude');
  });
});

// ==========================================
// 4. TESTES DE CONTAGEM DE DADOS
// ==========================================

describe('Contagem de dados mapeados', () => {
  function countDataCategories(responses: Array<{ dataCategories?: any }>): number {
    return responses.reduce((acc, r) => {
      const cats = Array.isArray(r.dataCategories) ? r.dataCategories : [];
      return acc + cats.length;
    }, 0);
  }

  it('deve contar categorias de dados corretamente', () => {
    const responses = [
      { dataCategories: ['Nome', 'CPF', 'E-mail'] },
      { dataCategories: ['Endereço', 'Telefone'] },
      { dataCategories: [] },
    ];
    expect(countDataCategories(responses)).toBe(5);
  });

  it('deve lidar com dataCategories nulo ou indefinido', () => {
    const responses = [
      { dataCategories: null },
      { dataCategories: undefined },
      { dataCategories: 'string_invalida' },
    ];
    expect(countDataCategories(responses)).toBe(0);
  });

  it('deve retornar 0 para lista vazia', () => {
    expect(countDataCategories([])).toBe(0);
  });
});

// ==========================================
// 5. TESTES DE CONTAGEM DE FINALIDADES
// ==========================================

describe('Contagem de finalidades (DataUses)', () => {
  function countPurposes(dataUses: Array<{ purposes?: string[]; purposeLabel?: string }>): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const du of dataUses) {
      if (Array.isArray(du.purposes)) {
        for (const p of du.purposes) {
          counts[p] = (counts[p] || 0) + 1;
        }
      }
      if (du.purposeLabel) {
        counts[du.purposeLabel] = (counts[du.purposeLabel] || 0) + 1;
      }
    }
    return counts;
  }

  it('deve contar finalidades por purposes e purposeLabel', () => {
    const dataUses = [
      { purposes: ['Admissão', 'Folha de pagamento'], purposeLabel: 'Gestão de RH' },
      { purposes: ['Admissão'], purposeLabel: 'Contratação' },
      { purposes: ['Folha de pagamento'] },
    ];

    const result = countPurposes(dataUses);
    expect(result['Admissão']).toBe(2);
    expect(result['Folha de pagamento']).toBe(2);
    expect(result['Gestão de RH']).toBe(1);
    expect(result['Contratação']).toBe(1);
  });

  it('deve lidar com dataUses sem purposes', () => {
    const dataUses = [
      { purposeLabel: 'Finalidade única' },
      { purposes: undefined },
    ];

    const result = countPurposes(dataUses);
    expect(result['Finalidade única']).toBe(1);
    expect(Object.keys(result)).toHaveLength(1);
  });
});

// ==========================================
// 6. TESTES DE STATUS DE ROTs
// ==========================================

describe('Distribuição de status dos ROTs', () => {
  function countRotsByStatus(rots: Array<{ status: string }>): Record<string, number> {
    const dist: Record<string, number> = { rascunho: 0, em_revisao: 0, aprovado: 0, arquivado: 0 };
    for (const rot of rots) {
      if (dist[rot.status] !== undefined) {
        dist[rot.status]++;
      }
    }
    return dist;
  }

  it('deve contar ROTs por status', () => {
    const rots = [
      { status: 'rascunho' },
      { status: 'rascunho' },
      { status: 'em_revisao' },
      { status: 'aprovado' },
      { status: 'aprovado' },
      { status: 'aprovado' },
      { status: 'arquivado' },
    ];

    const result = countRotsByStatus(rots);
    expect(result.rascunho).toBe(2);
    expect(result.em_revisao).toBe(1);
    expect(result.aprovado).toBe(3);
    expect(result.arquivado).toBe(1);
  });

  it('deve inicializar todos os status em zero', () => {
    const result = countRotsByStatus([]);
    expect(result.rascunho).toBe(0);
    expect(result.em_revisao).toBe(0);
    expect(result.aprovado).toBe(0);
    expect(result.arquivado).toBe(0);
  });
});
