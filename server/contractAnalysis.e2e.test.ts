/**
 * Testes E2E para o fluxo completo de Análise de Contratos
 * Valida: Upload → Análise → Mapa → Checklist → Riscos → Cláusulas
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db } from './db';

describe('Contract Analysis E2E Flow', () => {
  let analysisId: string;
  const testContractText = `
    CONTRATO DE PRESTAÇÃO DE SERVIÇOS

    PARTES:
    - Contratante: Empresa ABC LTDA
    - Contratado: Fornecedor XYZ Consultoria

    OBJETO: Serviços de processamento de dados pessoais

    VIGÊNCIA: 01/01/2024 a 31/12/2024

    DADOS PESSOAIS:
    - Dados comuns: Nome, CPF, e-mail, telefone
    - Dados sensíveis: Informações de saúde
    - Menores: Sim, dados de crianças de 0-12 anos

    SEGURANÇA:
    - Criptografia de dados em trânsito
    - Acesso restrito por autenticação

    DIREITOS:
    - Direito de acesso aos dados
    - Direito de retificação
    - Direito de exclusão

    TRANSFERÊNCIA INTERNACIONAL: Sim, para EUA
  `;

  beforeEach(() => {
    // Limpar dados de teste
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup
  });

  it('should complete full analysis workflow: analysis → mapping → risks → clauses', async () => {
    // 1. Criar análise
    const analysis = await db.createContractAnalysis({
      organizationId: 'test-org',
      contractName: 'Test Contract E2E',
      contractText: testContractText,
      analysisType: 'full',
      contractAnalysisStatus: 'pending',
      progress: 0,
    });

    analysisId = analysis.id;
    expect(analysisId).toBeDefined();
    expect(analysis.contractAnalysisStatus).toBe('pending');

    // 2. Verificar que mapa foi criado (autopreenchimento)
    const map = await db.getContractAnalysisMap(analysisId);
    expect(map).toBeDefined();
    expect(map?.lgpdAgentType).not.toBeNull();
    expect(map?.startDate).not.toBe('NÃO IDENTIFICADO');
    expect(map?.commonData).not.toBeNull();
    expect(map?.sensitiveData).not.toBeNull();

    // 3. Verificar que checklist foi criado
    const checklist = await db.getContractChecklistItems(analysisId);
    expect(checklist).toBeDefined();
    expect(checklist.length).toBeGreaterThan(0);

    // Validar normalização de status
    for (const item of checklist) {
      expect(['sim', 'nao', 'parcial']).toContain(item.checklistStatus);
      expect(item.question).toBeDefined();
    }

    // 4. Verificar que riscos foram criados
    const risks = await db.getContractRiskItems(analysisId);
    expect(risks).toBeDefined();
    expect(risks.length).toBeGreaterThan(0);

    // Validar estrutura de risco
    for (const risk of risks) {
      expect(risk.riskDescription).toBeDefined();
      expect(['1', '2', '3', '4', '5']).toContain(String(risk.riskLevel));
      expect(risk.contractArea).toBeDefined();
    }

    // 5. Verificar governanceMetadata com componentes G/E/A
    const analysisData = await db.getContractAnalysis(analysisId);
    expect(analysisData?.governanceMetadata).toBeDefined();

    const metadata = analysisData?.governanceMetadata as any;
    expect(metadata?.riskScore).toBeDefined();
    expect(metadata?.riskLevel).toBeDefined();
    expect(metadata?.clusters).toBeDefined();
    expect(metadata?.components).toBeDefined();

    // Validar componentes G/E/A
    expect(metadata?.components?.G).toBeDefined(); // Gaps
    expect(metadata?.components?.E).toBeDefined(); // Exposição
    expect(metadata?.components?.A).toBeDefined(); // Agravantes

    // 6. Verificar que cláusulas podem ser geradas
    const clauses = await db.getContractAnalysisClauses(analysisId);
    expect(clauses).toBeDefined();

    // Se houver cláusulas, validar formato
    if (clauses && clauses.length > 0) {
      for (const clause of clauses) {
        expect(clause.clauseType).toMatch(/aditivo|dpa|capitulo_lgpd/);
        expect(clause.clauseContent).toBeDefined();
      }
    }

    // 7. Validar progresso geral
    expect(analysisData?.progress).toBeGreaterThanOrEqual(0);
    expect(analysisData?.progress).toBeLessThanOrEqual(100);
  });

  it('should handle missing data gracefully with fallbacks', async () => {
    // Contrato com informações mínimas
    const minimalContract = `
      CONTRATO SIMPLES
      Partes: A e B
      Objeto: Serviço
    `;

    const analysis = await db.createContractAnalysis({
      organizationId: 'test-org',
      contractName: 'Minimal Contract',
      contractText: minimalContract,
      analysisType: 'full',
      contractAnalysisStatus: 'pending',
      progress: 0,
    });

    analysisId = analysis.id;

    // Verificar que mapa foi criado com fallbacks
    const map = await db.getContractAnalysisMap(analysisId);
    expect(map?.lgpdAgentType).toBe('controlador'); // Fallback
    expect(map?.commonData).toBeDefined(); // Nunca null
    expect(map?.sensitiveData).toBeDefined(); // Nunca null

    // Verificar checklist mesmo com dados mínimos
    const checklist = await db.getContractChecklistItems(analysisId);
    expect(checklist.length).toBeGreaterThan(0);
  });

  it('should validate checklist status normalization', async () => {
    const analysis = await db.createContractAnalysis({
      organizationId: 'test-org',
      contractName: 'Status Normalization Test',
      contractText: testContractText,
      analysisType: 'full',
      contractAnalysisStatus: 'pending',
      progress: 0,
    });

    analysisId = analysis.id;

    const checklist = await db.getContractChecklistItems(analysisId);

    // Validar que todos os status são normalizados
    const validStatuses = ['sim', 'nao', 'parcial'];
    for (const item of checklist) {
      expect(validStatuses).toContain(item.checklistStatus);
      // Verificar que não há valores brutos como "yes", "no", "true", "false"
      expect(item.checklistStatus).not.toMatch(/yes|no|true|false/i);
    }
  });

  it('should ensure risk clusters >= 3 when problems >= 3', async () => {
    const analysis = await db.createContractAnalysis({
      organizationId: 'test-org',
      contractName: 'Risk Clustering Test',
      contractText: testContractText,
      analysisType: 'full',
      contractAnalysisStatus: 'pending',
      progress: 0,
    });

    analysisId = analysis.id;

    const checklist = await db.getContractChecklistItems(analysisId);
    const badItems = checklist.filter(c => c.checklistStatus === 'nao' || c.checklistStatus === 'parcial');

    if (badItems.length >= 3) {
      const metadata = await db.getContractAnalysis(analysisId);
      const clusters = (metadata?.governanceMetadata as any)?.clusters;
      expect(clusters?.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('should display risk rationale with governance metadata', async () => {
    const analysis = await db.createContractAnalysis({
      organizationId: 'test-org',
      contractName: 'Risk Rationale Test',
      contractText: testContractText,
      analysisType: 'full',
      contractAnalysisStatus: 'pending',
      progress: 0,
    });

    analysisId = analysis.id;

    const metadata = await db.getContractAnalysis(analysisId);
    const gov = metadata?.governanceMetadata as any;

    // Validar que há racional disponível
    expect(gov?.consistencyNotes).toBeDefined();
    expect(Array.isArray(gov?.consistencyNotes)).toBe(true);

    // Validar que há informações sobre pisos jurídicos
    if (gov?.pisoAplicado) {
      expect(gov.pisoAplicado).toMatch(/piso|floor|base/i);
    }

    // Validar componentes G/E/A
    expect(gov?.components?.G).toBeDefined();
    expect(gov?.components?.E).toBeDefined();
    expect(gov?.components?.A).toBeDefined();
  });

  it('should maintain layout consistency for clauses tab', async () => {
    const analysis = await db.createContractAnalysis({
      organizationId: 'test-org',
      contractName: 'Clauses Layout Test',
      contractText: testContractText,
      analysisType: 'full',
      contractAnalysisStatus: 'pending',
      progress: 0,
    });

    analysisId = analysis.id;

    const clauses = await db.getContractAnalysisClauses(analysisId);

    // Validar que apenas formatos permitidos existem
    const allowedFormats = ['aditivo', 'dpa', 'capitulo_lgpd'];
    for (const clause of clauses || []) {
      expect(allowedFormats).toContain(clause.clauseType);
      // Validar que não há "contrato" como formato
      expect(clause.clauseType).not.toBe('contrato');
    }
  });
});
