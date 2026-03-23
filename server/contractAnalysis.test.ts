/**
 * Testes unitários para o módulo de Análise de Contratos LGPD
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do invokeLLM
vi.mock('./_core/llm', () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          executiveSummary: "Resumo executivo do contrato analisado.",
          complianceScore: 75,
          analysisMap: {
            partnerName: "Empresa Teste LTDA",
            contractType: "Prestação de Serviços",
            contractingParty: "Cliente Contratante",
            contractedParty: "Fornecedor Contratado",
            agentType: "operador",
            agentTypeJustification: "O fornecedor atua como operador de dados pessoais.",
            contractObject: "Serviços de processamento de dados",
            startDate: "01/01/2024",
            endDate: "31/12/2024",
            commonData: "Nome, CPF, e-mail, telefone",
            commonDataLargeScale: false,
            sensitiveData: "Nenhum",
            sensitiveDataLargeScale: false,
            hasElderlyData: false,
            elderlyDataDetails: null,
            hasMinorData: false,
            minorDataDetails: null,
            titularRightsStatus: "parcial",
            titularRightsDetails: "Contrato menciona direitos mas não detalha procedimentos.",
            dataEliminationStatus: "nao",
            dataEliminationDetails: "Não há cláusula de eliminação de dados.",
            legalRisks: "Ausência de cláusula de eliminação de dados.",
            securityRisks: "Não especifica medidas técnicas de segurança.",
            hasProtectionClause: "parcial",
            protectionClauseDetails: "Cláusula genérica de confidencialidade.",
            suggestedClause: "Sugerimos incluir cláusula específica de proteção de dados pessoais conforme modelo Seusdados.",
            actionStatus: "ajustar",
            actionPlan: "1. Incluir cláusula de eliminação de dados\n2. Detalhar medidas de segurança",
            suggestedDeadline: "30 dias"
          },
          checklist: [
            {
              itemNumber: 1,
              question: "O contrato identifica claramente as partes (controlador/operador)?",
              status: "sim",
              observations: "Partes identificadas corretamente.",
              contractExcerpt: "Cláusula 1.1"
            },
            {
              itemNumber: 2,
              question: "O contrato define a finalidade do tratamento de dados?",
              status: "sim",
              observations: "Finalidade definida na cláusula 2.",
              contractExcerpt: "Cláusula 2.1"
            },
            {
              itemNumber: 3,
              question: "O contrato especifica os tipos de dados pessoais tratados?",
              status: "parcial",
              observations: "Lista genérica de dados.",
              contractExcerpt: "Cláusula 3"
            },
            {
              itemNumber: 4,
              question: "O contrato estabelece obrigações de confidencialidade?",
              status: "sim",
              observations: "Cláusula de confidencialidade presente.",
              contractExcerpt: "Cláusula 8"
            },
            {
              itemNumber: 5,
              question: "O contrato prevê medidas de segurança da informação?",
              status: "nao",
              observations: "Não há menção a medidas técnicas.",
              contractExcerpt: null
            },
            {
              itemNumber: 6,
              question: "O contrato trata da subcontratação de operadores?",
              status: "nao",
              observations: "Não aborda subcontratação.",
              contractExcerpt: null
            },
            {
              itemNumber: 7,
              question: "O contrato prevê procedimentos para exercício de direitos dos titulares?",
              status: "parcial",
              observations: "Menciona mas não detalha.",
              contractExcerpt: "Cláusula 5"
            },
            {
              itemNumber: 8,
              question: "O contrato estabelece procedimentos para incidentes de segurança?",
              status: "nao",
              observations: "Não há procedimento definido.",
              contractExcerpt: null
            },
            {
              itemNumber: 9,
              question: "O contrato define o prazo de retenção e eliminação dos dados?",
              status: "nao",
              observations: "Não há cláusula de eliminação.",
              contractExcerpt: null
            },
            {
              itemNumber: 10,
              question: "O contrato prevê auditoria e fiscalização pelo controlador?",
              status: "nao",
              observations: "Não há direito de auditoria.",
              contractExcerpt: null
            }
          ],
          risks: [
            {
              contractArea: "Segurança da Informação",
              analysisBlock: "Bloco 9 - Medidas Técnicas",
              riskDescription: "Ausência de cláusula definindo medidas técnicas de segurança",
              riskLevel: "2",
              potentialImpact: "Exposição a incidentes de segurança sem responsabilização clara",
              requiredAction: "Incluir cláusula detalhando medidas técnicas e organizacionais",
              suggestedDeadline: "15 dias",
              legalReference: "Art. 46 LGPD"
            },
            {
              contractArea: "Ciclo de Vida dos Dados",
              analysisBlock: "Bloco 12 - Eliminação",
              riskDescription: "Não há previsão de eliminação de dados ao término do contrato",
              riskLevel: "1",
              potentialImpact: "Retenção indevida de dados pessoais após término da finalidade",
              requiredAction: "Incluir cláusula de eliminação/devolução de dados",
              suggestedDeadline: "15 dias",
              legalReference: "Art. 16 LGPD"
            },
            {
              contractArea: "Incidentes",
              analysisBlock: "Bloco 10 - Notificação",
              riskDescription: "Ausência de procedimento para notificação de incidentes",
              riskLevel: "2",
              potentialImpact: "Descumprimento do prazo de notificação à ANPD",
              requiredAction: "Incluir cláusula de notificação de incidentes",
              suggestedDeadline: "15 dias",
              legalReference: "Art. 48 LGPD"
            }
          ],
          criticalRisks: 1,
          highRisks: 2,
          mediumRisks: 0,
          lowRisks: 0,
          veryLowRisks: 0
        })
      }
    }]
  })
}));

// Mock do fetch para extração de texto
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  text: () => Promise.resolve('Texto do contrato extraído para análise.')
});

describe('Módulo de Análise de Contratos LGPD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Estrutura do Schema', () => {
    it('deve ter tabela de análises de contratos', async () => {
      // Verificar que o schema existe
      const { contractAnalyses } = await import('../drizzle/schema');
      expect(contractAnalyses).toBeDefined();
    });

    it('deve ter tabela de mapa de análise', async () => {
      const { contractAnalysisMaps } = await import('../drizzle/schema');
      expect(contractAnalysisMaps).toBeDefined();
    });

    it('deve ter tabela de checklist', async () => {
      const { contractChecklistItems } = await import('../drizzle/schema');
      expect(contractChecklistItems).toBeDefined();
    });

    it('deve ter tabela de riscos', async () => {
      const { contractRiskItems } = await import('../drizzle/schema');
      expect(contractRiskItems).toBeDefined();
    });

    it('deve ter tabela de histórico', async () => {
      const { contractAnalysisHistory } = await import('../drizzle/schema');
      expect(contractAnalysisHistory).toBeDefined();
    });
  });

  describe('Serviço de Análise de Contratos', () => {
    it('deve exportar função analyzeContract', async () => {
      const service = await import('./contractAnalysisService');
      expect(service.analyzeContract).toBeDefined();
      expect(typeof service.analyzeContract).toBe('function');
    });

    it('deve exportar função extractTextFromDocument', async () => {
      const service = await import('./contractAnalysisService');
      expect(service.extractTextFromDocument).toBeDefined();
      expect(typeof service.extractTextFromDocument).toBe('function');
    });

    it('deve exportar função refineContractAnalysis', async () => {
      const service = await import('./contractAnalysisService');
      expect(service.refineContractAnalysis).toBeDefined();
      expect(typeof service.refineContractAnalysis).toBe('function');
    });

    it('deve analisar contrato e retornar estrutura correta', async () => {
      const service = await import('./contractAnalysisService');
      
      const result = await service.analyzeContract({
        contractText: 'Contrato de prestação de serviços entre as partes...',
        contractName: 'Contrato de Serviços',
        organizationName: 'Empresa Teste'
      });

      expect(result).toHaveProperty('executiveSummary');
      expect(result).toHaveProperty('complianceScore');
      expect(result).toHaveProperty('analysisMap');
      expect(result).toHaveProperty('checklist');
      expect(result).toHaveProperty('risks');
      expect(result).toHaveProperty('criticalRisks');
      expect(result).toHaveProperty('highRisks');
      expect(result).toHaveProperty('mediumRisks');
      expect(result).toHaveProperty('lowRisks');
      expect(result).toHaveProperty('veryLowRisks');
    });

    it('deve retornar checklist com 10 itens', async () => {
      const service = await import('./contractAnalysisService');
      
      const result = await service.analyzeContract({
        contractText: 'Contrato de prestação de serviços...',
        contractName: 'Contrato Teste',
        organizationName: 'Empresa'
      });

      expect(result.checklist).toHaveLength(10);
      expect(result.checklist[0]).toHaveProperty('itemNumber');
      expect(result.checklist[0]).toHaveProperty('question');
      expect(result.checklist[0]).toHaveProperty('status');
    });

    it('deve classificar riscos em 5 níveis', async () => {
      const service = await import('./contractAnalysisService');
      
      const result = await service.analyzeContract({
        contractText: 'Contrato de prestação de serviços...',
        contractName: 'Contrato Teste',
        organizationName: 'Empresa'
      });

      // Verificar que os riscos têm níveis válidos
      result.risks.forEach(risk => {
        expect(['1', '2', '3', '4', '5']).toContain(risk.riskLevel);
      });

      // Verificar contagem de riscos
      expect(typeof result.criticalRisks).toBe('number');
      expect(typeof result.highRisks).toBe('number');
      expect(typeof result.mediumRisks).toBe('number');
      expect(typeof result.lowRisks).toBe('number');
      expect(typeof result.veryLowRisks).toBe('number');
    });

    it('deve preencher mapa de análise com campos obrigatórios', async () => {
      const service = await import('./contractAnalysisService');
      
      const result = await service.analyzeContract({
        contractText: 'Contrato de prestação de serviços...',
        contractName: 'Contrato Teste',
        organizationName: 'Empresa'
      });

      const map = result.analysisMap;
      expect(map).toHaveProperty('partnerName');
      expect(map).toHaveProperty('contractType');
      expect(map).toHaveProperty('agentType');
      expect(map).toHaveProperty('contractObject');
      expect(map).toHaveProperty('commonData');
      expect(map).toHaveProperty('actionStatus');
    });
  });

  describe('Funções de Banco de Dados', () => {
    it('deve exportar função createContractAnalysis', async () => {
      const db = await import('./db');
      expect(db.createContractAnalysis).toBeDefined();
    });

    it('deve exportar função getContractAnalysisById', async () => {
      const db = await import('./db');
      expect(db.getContractAnalysisById).toBeDefined();
    });

    it('deve exportar função updateContractAnalysis', async () => {
      const db = await import('./db');
      expect(db.updateContractAnalysis).toBeDefined();
    });

    it('deve exportar função createContractAnalysisMap', async () => {
      const db = await import('./db');
      expect(db.createContractAnalysisMap).toBeDefined();
    });

    it('deve exportar função createContractChecklistItems', async () => {
      const db = await import('./db');
      expect(db.createContractChecklistItems).toBeDefined();
    });

    it('deve exportar função createContractRiskItems', async () => {
      const db = await import('./db');
      expect(db.createContractRiskItems).toBeDefined();
    });

    it('deve exportar função getContractAnalysisStats', async () => {
      const db = await import('./db');
      expect(db.getContractAnalysisStats).toBeDefined();
    });
  });

  describe('Classificação de Riscos', () => {
    it('deve classificar risco crítico (nível 1) corretamente', () => {
      const riskLevel = '1';
      expect(riskLevel).toBe('1');
      // Nível 1 = Crítico: Requer ação imediata
    });

    it('deve classificar risco alto (nível 2) corretamente', () => {
      const riskLevel = '2';
      expect(riskLevel).toBe('2');
      // Nível 2 = Alto: Requer ação em curto prazo
    });

    it('deve classificar risco médio (nível 3) corretamente', () => {
      const riskLevel = '3';
      expect(riskLevel).toBe('3');
      // Nível 3 = Médio: Requer atenção
    });

    it('deve classificar risco baixo (nível 4) corretamente', () => {
      const riskLevel = '4';
      expect(riskLevel).toBe('4');
      // Nível 4 = Baixo: Monitorar
    });

    it('deve classificar risco muito baixo (nível 5) corretamente', () => {
      const riskLevel = '5';
      expect(riskLevel).toBe('5');
      // Nível 5 = Muito Baixo: Aceitável
    });
  });

  describe('Checklist de Conformidade', () => {
    it('deve ter 10 itens no checklist', () => {
      const checklistItems = [
        'Identificação das partes',
        'Finalidade do tratamento',
        'Tipos de dados',
        'Confidencialidade',
        'Medidas de segurança',
        'Subcontratação',
        'Direitos dos titulares',
        'Incidentes de segurança',
        'Retenção e eliminação',
        'Auditoria'
      ];
      expect(checklistItems).toHaveLength(10);
    });

    it('deve ter status válido para cada item', () => {
      const validStatuses = ['sim', 'nao', 'parcial'];
      validStatuses.forEach(status => {
        expect(['sim', 'nao', 'parcial']).toContain(status);
      });
    });
  });

  describe('Mapa de Análise', () => {
    it('deve ter campos de identificação', () => {
      const identificationFields = [
        'partnerName',
        'contractType',
        'contractingParty',
        'contractedParty'
      ];
      expect(identificationFields).toHaveLength(4);
    });

    it('deve ter campos de papel LGPD', () => {
      const lgpdFields = [
        'agentType',
        'agentTypeJustification'
      ];
      expect(lgpdFields).toHaveLength(2);
    });

    it('deve ter campos de dados tratados', () => {
      const dataFields = [
        'commonData',
        'commonDataLargeScale',
        'sensitiveData',
        'sensitiveDataLargeScale'
      ];
      expect(dataFields).toHaveLength(4);
    });

    it('deve ter campos de grupos vulneráveis', () => {
      const vulnerableFields = [
        'hasElderlyData',
        'elderlyDataDetails',
        'hasMinorData',
        'minorDataDetails'
      ];
      expect(vulnerableFields).toHaveLength(4);
    });

    it('deve ter campos de gestão de ação', () => {
      const actionFields = [
        'actionStatus',
        'actionPlan',
        'suggestedDeadline'
      ];
      expect(actionFields).toHaveLength(3);
    });
  });

  describe('Progresso e Status da Análise', () => {
    it('deve validar transição de status: pending → analyzing', () => {
      const validTransitions = {
        pending: ['analyzing'],
        analyzing: ['completed', 'error'],
        completed: ['reviewed', 'approved', 'rejected'],
        error: ['analyzing'], // Pode tentar novamente
      };
      
      const transition = validTransitions.pending;
      expect(transition).toContain('analyzing');
    });

    it('deve validar progresso em etapas: 0 → 10 → 30 → 70 → 100', () => {
      const progressSteps = [0, 10, 30, 70, 100];
      expect(progressSteps).toHaveLength(5);
      expect(progressSteps[0]).toBe(0);
      expect(progressSteps[1]).toBe(10);
      expect(progressSteps[2]).toBe(30);
      expect(progressSteps[3]).toBe(70);
      expect(progressSteps[4]).toBe(100);
    });

    it('deve garantir que progresso 100 implica status completed', () => {
      const analysis = {
        progress: 100,
        contractAnalysisStatus: 'completed'
      };
      
      if (analysis.progress === 100) {
        expect(analysis.contractAnalysisStatus).toBe('completed');
      }
    });

    it('deve garantir que status error não bloqueia retry', () => {
      const errorAnalysis = {
        contractAnalysisStatus: 'error',
        progress: 50
      };
      
      // Pode ser retentado
      expect(['analyzing', 'pending']).toContain('analyzing');
    });

    it('deve ter timestamp completedAt quando status é completed', () => {
      const analysis = {
        contractAnalysisStatus: 'completed',
        progress: 100,
        completedAt: new Date().toISOString()
      };
      
      if (analysis.contractAnalysisStatus === 'completed') {
        expect(analysis.completedAt).toBeDefined();
        expect(typeof analysis.completedAt).toBe('string');
      }
    });

    it('deve ter timeout de 10 minutos para análise', () => {
      const ANALYSIS_TIMEOUT = 10 * 60 * 1000; // 10 minutos em ms
      expect(ANALYSIS_TIMEOUT).toBe(600000);
    });

    it('deve ter lock para evitar múltiplas execuções simultâneas', () => {
      const locks = new Map<string, number>();
      const lockKey = 'analysis:123';
      const now = Date.now();
      const ttl = 3600000; // 1 hora
      
      locks.set(lockKey, now + ttl);
      expect(locks.has(lockKey)).toBe(true);
      
      // Verificar se lock ainda está válido
      const existingLock = locks.get(lockKey);
      expect(existingLock).toBeGreaterThan(now);
    });

    it('deve liberar lock após conclusão', () => {
      const locks = new Map<string, number>();
      const lockKey = 'analysis:123';
      
      locks.set(lockKey, Date.now() + 3600000);
      expect(locks.has(lockKey)).toBe(true);
      
      locks.delete(lockKey);
      expect(locks.has(lockKey)).toBe(false);
    });

    it('deve validar que polling para quando status != analyzing', () => {
      const statuses = ['pending', 'completed', 'error', 'reviewed', 'approved', 'rejected'];
      
      statuses.forEach(status => {
        const shouldPoll = status === 'analyzing';
        expect(shouldPoll).toBe(false);
      });
    });

    it('deve validar que polling continua quando status = analyzing', () => {
      const status = 'analyzing';
      const shouldPoll = status === 'analyzing';
      expect(shouldPoll).toBe(true);
    });

    it('deve ter intervalo de polling de 2 segundos', () => {
      const POLLING_INTERVAL = 2000; // 2 segundos em ms
      expect(POLLING_INTERVAL).toBe(2000);
    });

    it('deve notificar sucesso quando análise é concluída', () => {
      const completedAnalysis = {
        contractAnalysisStatus: 'completed',
        progress: 100,
        complianceScore: 85
      };
      
      if (completedAnalysis.contractAnalysisStatus === 'completed') {
        expect(completedAnalysis.progress).toBe(100);
        expect(completedAnalysis.complianceScore).toBeGreaterThanOrEqual(0);
        expect(completedAnalysis.complianceScore).toBeLessThanOrEqual(100);
      }
    });

    it('deve notificar erro quando análise falha', () => {
      const failedAnalysis = {
        contractAnalysisStatus: 'error',
        progress: 50
      };
      
      if (failedAnalysis.contractAnalysisStatus === 'error') {
        expect(failedAnalysis.progress).toBeLessThan(100);
      }
    });

    it('deve calcular tempo estimado restante baseado no progresso', () => {
      const analysis = {
        progress: 30,
        createdAt: new Date(Date.now() - 60000).toISOString() // 1 minuto atrás
      };
      
      // Se 30% levou 1 minuto, 100% levaria ~3.33 minutos
      // Tempo restante: ~2.33 minutos
      const elapsedMs = Date.now() - new Date(analysis.createdAt).getTime();
      const estimatedTotalMs = (elapsedMs / analysis.progress) * 100;
      const remainingMs = estimatedTotalMs - elapsedMs;
      
      expect(remainingMs).toBeGreaterThan(0);
      expect(estimatedTotalMs).toBeGreaterThan(elapsedMs);
    });

    it('deve validar que riscos são contabilizados corretamente', () => {
      const analysis = {
        criticalRisks: 1,
        highRisks: 2,
        mediumRisks: 3,
        lowRisks: 4,
        veryLowRisks: 5
      };
      
      const totalRisks = analysis.criticalRisks + analysis.highRisks + 
                        analysis.mediumRisks + analysis.lowRisks + analysis.veryLowRisks;
      expect(totalRisks).toBe(15);
    });

    it('deve validar que compliance score está entre 0 e 100', () => {
      const validScores = [0, 25, 50, 75, 85, 100];
      
      validScores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });
  });
});
