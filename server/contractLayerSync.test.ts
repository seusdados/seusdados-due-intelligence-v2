/**
 * Testes Obrigatórios de Consistência entre Camadas
 * 
 * PATCH 2026-02-21: Testes atualizados para integração com riskScale.ts.
 * 
 * Testa as funções puras (sem DB):
 * 1. recalibrateRiskLevel - Recalibração de severidade conforme regras
 * 2. riskLevelLabel - Labels legíveis (via riskScale.ts)
 * 3. generateConsolidatedDocument - Documento consolidado com decisões
 * 4. Sanitização de campos null no mapa
 * 5. Consistência entre riskLevel DB e texto (via riskScale)
 * 
 * Seusdados Consultoria em Gestão de Dados Limitada
 * CNPJ 33.899.116/0001-63 | www.seusdados.com
 */

import { describe, it, expect } from 'vitest';
import {
  recalibrateRiskLevel,
  riskLevelLabel,
  generateConsolidatedDocument,
  type RiskWithDecision,
} from './contractLayerSync';
import {
  riskDbEnumToText,
  riskTextToDbEnum,
  normalizeRiskText,
} from './riskScale';

describe('Recalibração de Severidade - recalibrateRiskLevel', () => {

  it('deve elevar severidade para MÉDIO (3) quando ausência de cláusula LGPD e risco é BAIXO (4)', () => {
    const result = recalibrateRiskLevel('Ausência de cláusula LGPD no contrato', '4');
    expect(result).toBe('3');
  });

  it('deve elevar severidade para ALTO (2) quando ausência de notificação de incidente e risco é BAIXO (4)', () => {
    const result = recalibrateRiskLevel('Sem previsão de notificação de incidente de segurança', '4');
    expect(result).toBe('2');
  });

  it('deve elevar severidade para MÉDIO (3) quando ausência de retenção/eliminação e risco é BAIXO (4)', () => {
    const result = recalibrateRiskLevel('Não há política de retenção e eliminação de dados', '4');
    expect(result).toBe('3');
  });

  it('deve elevar severidade para ALTO (2) quando ausência de direitos do titular e risco é MUITO BAIXO (5)', () => {
    const result = recalibrateRiskLevel('Sem previsão de direitos do titular de dados pessoais', '5');
    expect(result).toBe('2');
  });

  it('deve elevar severidade para ALTO (2) quando transferência internacional sem salvaguardas', () => {
    const result = recalibrateRiskLevel('Transferência internacional de dados sem salvaguardas', '4');
    expect(result).toBe('2');
  });

  it('deve elevar severidade para MÉDIO (3) quando subcontratação sem controle', () => {
    const result = recalibrateRiskLevel('Subcontratação de suboperador sem controle adequado', '5');
    expect(result).toBe('3');
  });

  it('deve elevar severidade para MÉDIO (3) quando ausência de medidas de segurança', () => {
    const result = recalibrateRiskLevel('Ausência de medidas técnicas e organizacionais de segurança da informação', '5');
    expect(result).toBe('3');
  });

  it('NÃO deve alterar severidade quando já é suficiente (CRÍTICO permanece CRÍTICO)', () => {
    const result = recalibrateRiskLevel('Ausência de cláusula LGPD no contrato', '1');
    expect(result).toBe('1');
  });

  it('NÃO deve alterar severidade quando já é suficiente (ALTO permanece ALTO para regra MÉDIO)', () => {
    const result = recalibrateRiskLevel('Ausência de cláusula LGPD no contrato', '2');
    expect(result).toBe('2');
  });

  it('NÃO deve alterar severidade quando risco não corresponde a nenhuma regra', () => {
    const result = recalibrateRiskLevel('Risco genérico sem padrão específico', '4');
    expect(result).toBe('4');
  });

  it('deve aplicar a regra mais severa quando múltiplas regras se aplicam', () => {
    const result = recalibrateRiskLevel('Ausência de cláusula LGPD e notificação de incidente', '5');
    expect(result).toBe('2');
  });

  it('deve tratar nível inválido como MUITO BAIXO (5)', () => {
    const result = recalibrateRiskLevel('Ausência de cláusula LGPD', 'invalido');
    expect(result).toBe('3');
  });

  it('deve aceitar nível textual e converter para numérico', () => {
    const result = recalibrateRiskLevel('Ausência de cláusula LGPD', 'baixo');
    expect(result).toBe('3'); // baixo=4, recalibrado para 3
  });
});

describe('Labels de Nível de Risco - riskLevelLabel (via riskScale)', () => {
  it('deve retornar "Crítico" para nível 1', () => {
    expect(riskLevelLabel('1')).toBe('Crítico');
  });

  it('deve retornar "Alto" para nível 2', () => {
    expect(riskLevelLabel('2')).toBe('Alto');
  });

  it('deve retornar "Médio" para nível 3', () => {
    expect(riskLevelLabel('3')).toBe('Médio');
  });

  it('deve retornar "Baixo" para nível 4', () => {
    expect(riskLevelLabel('4')).toBe('Baixo');
  });

  it('deve retornar "Muito Baixo" para nível 5', () => {
    expect(riskLevelLabel('5')).toBe('Muito Baixo');
  });

  it('deve retornar label para texto descritivo', () => {
    expect(riskLevelLabel('critico')).toBe('Crítico');
    expect(riskLevelLabel('alto')).toBe('Alto');
    expect(riskLevelLabel('medio')).toBe('Médio');
  });
});

describe('Consistência riskScale — DB ↔ Texto', () => {
  it('risco do DB e risco textual do metadata devem ser coerentes', () => {
    // Simular: riskLevel do DB = "2", metadata.riskLevel = "alto"
    const dbLevel = "2";
    const metadataText = "alto";

    const dbToText = riskDbEnumToText(dbLevel);
    const textToDb = riskTextToDbEnum(metadataText);

    expect(dbToText).toBe(metadataText);
    expect(textToDb).toBe(dbLevel);
  });

  it('recalibrateRiskLevel deve produzir resultado coerente com riskScale', () => {
    const recalibrated = recalibrateRiskLevel('Sem previsão de notificação de incidente', '4');
    // recalibrated = "2" (alto)
    const textLevel = riskDbEnumToText(recalibrated);
    expect(textLevel).toBe("alto");
    // E o inverso
    expect(riskTextToDbEnum(textLevel)).toBe(recalibrated);
  });

  it('normalizeRiskText deve ser consistente com riskDbEnumToText', () => {
    // Todas as variações devem convergir para o mesmo resultado
    expect(normalizeRiskText("crítico")).toBe(riskDbEnumToText("1"));
    expect(normalizeRiskText("moderado")).toBe(riskDbEnumToText("3"));
    expect(normalizeRiskText("muito baixo")).toBe(riskDbEnumToText("5"));
  });
});

describe('Documento Consolidado - generateConsolidatedDocument', () => {
  const makeRisk = (overrides: Partial<RiskWithDecision>): RiskWithDecision => ({
    id: 1,
    analysisId: 100,
    contractArea: null,
    analysisBlock: null,
    riskDescription: 'Risco teste',
    riskLevel: '3',
    riskLevelText: 'medio',
    originalRiskLevel: '4',
    recalibratedRiskLevel: '3',
    potentialImpact: null,
    requiredAction: 'Ação necessária',
    suggestedDeadline: null,
    legalReference: null,
    decision: null,
    decisionNotes: null,
    linkedGapIds: [],
    linkedClauseIds: [],
    ...overrides,
  });

  it('deve agrupar riscos por tipo de decisão', () => {
    const risks = [
      makeRisk({ id: 1, decision: 'capitulo_lgpd' }),
      makeRisk({ id: 2, decision: 'celebrar_dpa' }),
      makeRisk({ id: 3, decision: 'aditamento' }),
      makeRisk({ id: 4, decision: 'risco_assumido' }),
      makeRisk({ id: 5, decision: 'em_negociacao' }),
      makeRisk({ id: 6, decision: null }),
    ];

    const result = generateConsolidatedDocument(risks);

    expect(result.capitulo_lgpd.length).toBe(1);
    expect(result.celebrar_dpa.length).toBe(1);
    expect(result.aditamento.length).toBe(1);
    expect(result.risco_assumido.length).toBe(1);
    expect(result.em_negociacao.length).toBe(1);
    expect(result.sem_decisao.length).toBe(1);
  });

  it('deve gerar resumo com contagem de cada grupo', () => {
    const risks = [
      makeRisk({ id: 1, decision: 'capitulo_lgpd' }),
      makeRisk({ id: 2, decision: 'capitulo_lgpd' }),
      makeRisk({ id: 3, decision: 'celebrar_dpa' }),
      makeRisk({ id: 4, decision: null }),
    ];

    const result = generateConsolidatedDocument(risks);

    expect(result.summary).toContain('2 risco(s) requerem inserção de Capítulo LGPD');
    expect(result.summary).toContain('1 risco(s) requerem celebração de DPA');
    expect(result.summary).toContain('1 risco(s) aguardando decisão');
  });

  it('deve indicar riscos pendentes quando há riscos sem decisão', () => {
    const risks = [
      makeRisk({ id: 1, decision: null }),
      makeRisk({ id: 2, decision: null }),
    ];

    const result = generateConsolidatedDocument(risks);

    expect(result.sem_decisao.length).toBe(2);
    expect(result.summary).toContain('aguardando decisão');
  });

  it('deve lidar com lista vazia de riscos', () => {
    const result = generateConsolidatedDocument([]);

    expect(result.capitulo_lgpd.length).toBe(0);
    expect(result.celebrar_dpa.length).toBe(0);
    expect(result.aditamento.length).toBe(0);
    expect(result.risco_assumido.length).toBe(0);
    expect(result.em_negociacao.length).toBe(0);
    expect(result.sem_decisao.length).toBe(0);
    expect(result.summary).toBe('.');
  });

  it('deve agrupar todos os riscos quando todos têm a mesma decisão', () => {
    const risks = [
      makeRisk({ id: 1, decision: 'celebrar_dpa' }),
      makeRisk({ id: 2, decision: 'celebrar_dpa' }),
      makeRisk({ id: 3, decision: 'celebrar_dpa' }),
    ];

    const result = generateConsolidatedDocument(risks);

    expect(result.celebrar_dpa.length).toBe(3);
    expect(result.capitulo_lgpd.length).toBe(0);
    expect(result.summary).toContain('3 risco(s) requerem celebração de DPA');
  });
});

describe('Sanitização de Campos Null no Mapa', () => {
  it('deve substituir campos null por NÃO IDENTIFICADO', () => {
    const mapData: Record<string, any> = {
      contractType: null,
      lgpdRole: null,
      startDate: null,
      endDate: null,
      personalData: null,
      object: 'Prestação de serviços de TI',
    };

    const sanitized = Object.fromEntries(
      Object.entries(mapData).map(([key, value]) => [
        key,
        value === null ? 'NÃO IDENTIFICADO' : value,
      ])
    );

    expect(sanitized.contractType).toBe('NÃO IDENTIFICADO');
    expect(sanitized.lgpdRole).toBe('NÃO IDENTIFICADO');
    expect(sanitized.startDate).toBe('NÃO IDENTIFICADO');
    expect(sanitized.endDate).toBe('NÃO IDENTIFICADO');
    expect(sanitized.personalData).toBe('NÃO IDENTIFICADO');
    expect(sanitized.object).toBe('Prestação de serviços de TI');
  });

  it('deve preservar campos com valor', () => {
    const mapData: Record<string, any> = {
      contractType: 'Prestação de Serviços',
      lgpdRole: 'Controlador',
      startDate: '2025-01-01',
      endDate: '2026-01-01',
    };

    const sanitized = Object.fromEntries(
      Object.entries(mapData).map(([key, value]) => [
        key,
        value === null ? 'NÃO IDENTIFICADO' : value,
      ])
    );

    expect(sanitized.contractType).toBe('Prestação de Serviços');
    expect(sanitized.lgpdRole).toBe('Controlador');
    expect(sanitized.startDate).toBe('2025-01-01');
    expect(sanitized.endDate).toBe('2026-01-01');
  });

  it('deve tratar strings vazias como valor válido (não substituir)', () => {
    const mapData: Record<string, any> = {
      contractType: '',
      lgpdRole: null,
    };

    const sanitized = Object.fromEntries(
      Object.entries(mapData).map(([key, value]) => [
        key,
        value === null ? 'NÃO IDENTIFICADO' : value,
      ])
    );

    expect(sanitized.contractType).toBe('');
    expect(sanitized.lgpdRole).toBe('NÃO IDENTIFICADO');
  });
});
