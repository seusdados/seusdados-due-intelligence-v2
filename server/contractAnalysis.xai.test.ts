/**
 * Testes para os endpoints XAI de análise de contratos
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLoadedRules, analyzeContractWithXai, generateClausulaWithXai, generateAcaoPlanoWithXai } from './xai/xaiEngine';

describe('XAI Engine - Motor de IA Explicável', () => {
  describe('getLoadedRules', () => {
    it('deve retornar as regras carregadas do arquivo YAML', () => {
      const rules = getLoadedRules();
      
      expect(rules).toBeDefined();
      expect(rules.policy_set).toBeDefined();
      expect(rules.versao).toBeDefined();
      expect(rules.regras).toBeDefined();
      expect(Array.isArray(rules.regras)).toBe(true);
      expect(rules.regras.length).toBeGreaterThan(0);
    });

    it('deve ter regras com estrutura correta', () => {
      const rules = getLoadedRules();
      const primeiraRegra = rules.regras[0];
      
      expect(primeiraRegra.id).toBeDefined();
      expect(primeiraRegra.descricao).toBeDefined();
      expect(primeiraRegra.criterio_objetivo).toBeDefined();
      expect(primeiraRegra.normas).toBeDefined();
      expect(Array.isArray(primeiraRegra.normas)).toBe(true);
    });
  });

  describe('analyzeContractWithXai', () => {
    it('deve analisar texto de contrato e retornar alertas', async () => {
      const contractText = `
        Este contrato estabelece os termos para tratamento de dados pessoais.
        O Operador deverá notificar o Controlador sobre qualquer incidente de segurança.
        Dados sensíveis serão tratados conforme a LGPD.
      `;
      
      const alertas = await analyzeContractWithXai(contractText, {
        usuario: 'teste@seusdados.com',
        organizationId: 1
      });
      
      expect(Array.isArray(alertas)).toBe(true);
      // Alertas podem ou não ser gerados dependendo do texto
    });
  });

  describe('generateClausulaWithXai', () => {
    it('deve gerar cláusula com explicabilidade', async () => {
      const bloco = 'BLOCO_01_IDENTIFICACAO';
      const contextoContrato = 'Contrato de prestação de serviços de TI com tratamento de dados pessoais.';
      
      const clausulaXai = await generateClausulaWithXai(bloco, contextoContrato, {
        usuario: 'teste@seusdados.com',
        organizationId: 1
      });
      
      expect(clausulaXai).toBeDefined();
      expect(clausulaXai.id).toBeDefined();
      expect(clausulaXai.titulo).toBeDefined();
      expect(clausulaXai.bloco).toBe(bloco);
      expect(clausulaXai.explicabilidade).toBeDefined();
      expect(clausulaXai.explicabilidade.confianca).toBeGreaterThanOrEqual(0);
      expect(clausulaXai.explicabilidade.confianca).toBeLessThanOrEqual(1);
      expect(clausulaXai.explicabilidade.auditoria).toBeDefined();
      expect(clausulaXai.explicabilidade.auditoria.modelo).toBeDefined();
    }, 30000); // Timeout de 30 segundos para chamada LLM
  });

  describe('generateAcaoPlanoWithXai', () => {
    it('deve gerar ação do plano com explicabilidade', async () => {
      const risco = {
        id: 1,
        riskDescription: 'Risco de vazamento de dados pessoais',
        riskLevel: '2' as const,
        contractArea: 'Segurança da Informação',
        requiredAction: 'Implementar controles de acesso'
      };
      
      const acaoXai = await generateAcaoPlanoWithXai(risco, {
        usuario: 'teste@seusdados.com',
        organizationId: 1
      });
      
      expect(acaoXai).toBeDefined();
      expect(acaoXai.id).toBeDefined();
      expect(acaoXai.titulo).toBeDefined();
      expect(acaoXai.descricao).toBeDefined();
      expect(acaoXai.prioridade).toBeDefined();
      expect(['baixa', 'media', 'alta', 'critica', 'altíssima']).toContain(acaoXai.prioridade);
      expect(acaoXai.prazo).toBeDefined();
      expect(acaoXai.responsavel).toBeDefined();
      expect(acaoXai.explicabilidade).toBeDefined();
      expect(acaoXai.explicabilidade.confianca).toBeGreaterThanOrEqual(0);
      expect(acaoXai.explicabilidade.auditoria).toBeDefined();
    }, 30000); // Timeout de 30 segundos para chamada LLM
  });
});

describe('XAI Types - Estrutura de Dados', () => {
  it('deve ter tipos corretos para AlertaXAI', () => {
    const alerta = {
      id: 'ALERTA-001',
      tipo: 'risco' as const,
      severidade: 'alta' as const,
      titulo: 'Alerta de Teste',
      descricao: 'Descrição do alerta',
      explicabilidade: {
        confianca: 0.85,
        incerteza: 0.15,
        evidencias: [{
          pagina: 1,
          trecho: 'Trecho relevante',
          similaridade: 0.9
        }],
        regras_aplicadas: [{
          id: 'REGRA-001',
          descricao: 'Descrição da regra',
          criterio_objetivo: 'Critério'
        }],
        fundamentos: [{
          norma: 'LGPD',
          artigo_item: 'Art. 7º',
          justificativa: 'Justificativa'
        }],
        raciocinio: ['Passo 1', 'Passo 2'],
        contrapontos: ['Contraponto 1'],
        sugestoes: ['Sugestão 1'],
        auditoria: {
          modelo: 'Seusdados-XAI-1.0',
          policy_set: 'LGPD-ANPD-ISO27701',
          timestamp: new Date().toISOString()
        }
      }
    };
    
    expect(alerta.id).toBeDefined();
    expect(alerta.tipo).toBe('risco');
    expect(alerta.severidade).toBe('alta');
    expect(alerta.explicabilidade.confianca).toBe(0.85);
  });

  it('deve ter tipos corretos para ClausulaLGPDExplicavel', () => {
    const clausula = {
      id: 'CLAUSULA-001',
      titulo: 'Cláusula de Teste',
      conteudo: 'Conteúdo',
      bloco: 'Bloco 01',
      categoria: 'Categoria',
      explicabilidade: {
        confianca: 0.9,
        incerteza: 0.1,
        evidencias: [],
        regras_aplicadas: [],
        fundamentos: [],
        raciocinio: [],
        contrapontos: [],
        sugestoes_alternativas: [],
        auditoria: {
          modelo: 'Seusdados-XAI-Clausulas-1.0',
          policy_set: 'LGPD-ANPD-ISO27701',
          timestamp: new Date().toISOString()
        }
      }
    };
    
    expect(clausula.id).toBeDefined();
    expect(clausula.explicabilidade.confianca).toBe(0.9);
  });

  it('deve ter tipos corretos para AcaoPlanoExplicavel', () => {
    const acao = {
      id: 'ACAO-001',
      titulo: 'Ação de Teste',
      descricao: 'Descrição',
      prioridade: 'alta' as const,
      prazo: '15 dias',
      responsavel: 'DPO',
      status: 'pendente',
      explicabilidade: {
        confianca: 0.8,
        incerteza: 0.2,
        riscos_associados: [],
        regras_aplicadas: [],
        fundamentos: [],
        raciocinio: [],
        contrapontos: [],
        alternativas: [],
        auditoria: {
          modelo: 'Seusdados-XAI-ActionPlan-1.0',
          policy_set: 'LGPD-ANPD-ISO27701',
          timestamp: new Date().toISOString()
        }
      }
    };
    
    expect(acao.id).toBeDefined();
    expect(acao.prioridade).toBe('alta');
    expect(acao.explicabilidade.confianca).toBe(0.8);
  });
});
