import { describe, it, expect } from 'vitest';

/**
 * Testa a lógica de normalização de dados legados do analysisMap
 * para o formato estruturado esperado pelo MapeamentoAutoEditor
 */

// Função de normalização extraída do contractAnalysisRouter.ts
function normalizeAnalysisMapToMapeamento(am: any) {
  if (!am || !am.contractType || am.department) return am; // Já normalizado ou inválido
  return {
    department: am.contractType || 'Geral',
    departmentJustification: `Identificado automaticamente a partir do tipo de contrato: ${am.contractType || 'N/A'}`,
    processTitle: `Tratamento de dados - ${am.partnerName || 'Parceiro'}`,
    processDescription: am.contractObject || 'Objeto do contrato',
    processPurpose: am.contractObject || 'Finalidade do tratamento conforme contrato',
    dataCategories: [
      ...(am.commonData ? [{ name: am.commonData, sensivel: false, source: 'mapa_analise' }] : []),
      ...(am.sensitiveData ? [{ name: am.sensitiveData, sensivel: true, source: 'mapa_analise' }] : []),
    ],
    titularCategories: [
      'Titulares relacionados ao contrato',
      ...(am.hasMinorData ? ['Menores de idade'] : []),
      ...(am.hasElderlyData ? ['Idosos'] : []),
    ].filter(Boolean),
    legalBase: 'execucao_contrato',
    legalBaseJustification: 'Tratamento realizado para execução de contrato entre as partes.',
    sharing: [am.contractingParty, am.contractedParty].filter(Boolean),
    retentionPeriod: am.endDate || 'Conforme vigência do contrato',
    storageLocation: 'Sistemas do contratado',
    securityMeasures: [
      ...(am.securityRisks ? [`Mitigação: ${String(am.securityRisks).substring(0, 200)}`] : ['Controles de acesso']),
      'Criptografia de dados',
    ],
    internationalTransfer: false,
    internationalCountries: [],
    dataSource: 'contract_analysis',
    agentType: am.agentType || am.lgpdAgentType || null,
    agentTypeJustification: am.agentTypeJustification || null,
    titularRightsStatus: am.titularRightsStatus || null,
    titularRightsDetails: am.titularRightsDetails || null,
    dataEliminationStatus: am.dataEliminationStatus || null,
    dataEliminationDetails: am.dataEliminationDetails || null,
    hasProtectionClause: am.hasProtectionClause || null,
    protectionClauseDetails: am.protectionClauseDetails || null,
    suggestedClause: am.suggestedClause || null,
    legalRisks: am.legalRisks || null,
    actionPlan: am.actionPlan || null,
  };
}

describe('Normalização de Mapeamento', () => {
  it('deve converter analysisMap legado para formato estruturado', () => {
    const legacyData = {
      contractType: 'Certificado de Licença de Software',
      contractObject: 'Licença de uso do software Panda Adaptive Defense 360',
      partnerName: 'Panda Security',
      contractingParty: 'Biocap (Cliente)',
      contractedParty: 'Panda Security',
      commonData: 'Metadados de arquivos, logs de acesso, endereços IP',
      sensitiveData: null,
      agentType: 'operador',
      agentTypeJustification: 'A Panda Security atua como operador',
      hasMinorData: false,
      hasElderlyData: false,
      endDate: '2026-05-28',
      titularRightsStatus: 'nao',
      dataEliminationStatus: 'nao',
      securityRisks: 'Riscos de segurança identificados',
      actionPlan: 'Solicitar EULA completo',
      actionStatus: 'ajustar',
    };

    const result = normalizeAnalysisMapToMapeamento(legacyData);

    // Campos obrigatórios do MapeamentoAutoEditor
    expect(result.department).toBe('Certificado de Licença de Software');
    expect(result.processTitle).toBe('Tratamento de dados - Panda Security');
    expect(result.processDescription).toBe('Licença de uso do software Panda Adaptive Defense 360');
    expect(result.processPurpose).toBe('Licença de uso do software Panda Adaptive Defense 360');
    expect(result.legalBase).toBe('execucao_contrato');
    expect(result.legalBaseJustification).toContain('execução de contrato');
    
    // Categorias de dados
    expect(result.dataCategories).toHaveLength(1);
    expect(result.dataCategories[0].name).toContain('Metadados');
    expect(result.dataCategories[0].sensivel).toBe(false);
    
    // Titulares
    expect(result.titularCategories).toContain('Titulares relacionados ao contrato');
    
    // Compartilhamento
    expect(result.sharing).toContain('Biocap (Cliente)');
    expect(result.sharing).toContain('Panda Security');
    
    // Retenção
    expect(result.retentionPeriod).toBe('2026-05-28');
    
    // Segurança
    expect(result.securityMeasures.length).toBeGreaterThanOrEqual(2);
    expect(result.securityMeasures).toContain('Criptografia de dados');
    
    // Campos adicionais preservados
    expect(result.agentType).toBe('operador');
    expect(result.actionPlan).toBe('Solicitar EULA completo');
  });

  it('deve incluir dados sensíveis quando presentes', () => {
    const legacyData = {
      contractType: 'Contrato de Serviço',
      contractObject: 'Serviço de saúde',
      partnerName: 'Hospital',
      commonData: 'Nome, CPF',
      sensitiveData: 'Dados de saúde, prontuários',
      hasMinorData: true,
      hasElderlyData: true,
    };

    const result = normalizeAnalysisMapToMapeamento(legacyData);

    expect(result.dataCategories).toHaveLength(2);
    expect(result.dataCategories[0].sensivel).toBe(false);
    expect(result.dataCategories[1].sensivel).toBe(true);
    expect(result.dataCategories[1].name).toContain('saúde');
    
    expect(result.titularCategories).toContain('Menores de idade');
    expect(result.titularCategories).toContain('Idosos');
  });

  it('não deve normalizar dados já estruturados (com department)', () => {
    const structuredData = {
      department: 'TI',
      processTitle: 'Tratamento de dados - Parceiro',
      contractType: 'Contrato', // Pode ter contractType mas já tem department
    };

    const result = normalizeAnalysisMapToMapeamento(structuredData);
    expect(result).toBe(structuredData); // Retorna o mesmo objeto sem modificar
  });

  it('não deve normalizar dados nulos', () => {
    expect(normalizeAnalysisMapToMapeamento(null)).toBeNull();
    expect(normalizeAnalysisMapToMapeamento(undefined)).toBeUndefined();
  });

  it('deve lidar com campos ausentes graciosamente', () => {
    const minimalLegacy = {
      contractType: 'Contrato Genérico',
    };

    const result = normalizeAnalysisMapToMapeamento(minimalLegacy);

    expect(result.department).toBe('Contrato Genérico');
    expect(result.processTitle).toBe('Tratamento de dados - Parceiro');
    expect(result.processDescription).toBe('Objeto do contrato');
    expect(result.dataCategories).toHaveLength(0);
    expect(result.titularCategories).toContain('Titulares relacionados ao contrato');
    expect(result.sharing).toHaveLength(0);
    expect(result.retentionPeriod).toBe('Conforme vigência do contrato');
    expect(result.securityMeasures).toContain('Controles de acesso');
    expect(result.securityMeasures).toContain('Criptografia de dados');
  });
});
