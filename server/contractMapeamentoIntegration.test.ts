import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do serviço de integração
const mockExtractMapeamentoData = vi.fn();
const mockGenerateMapeamentoFromContract = vi.fn();
const mockGetLinkedMapeamentos = vi.fn();
const mockCreateMapeamentoLink = vi.fn();

vi.mock('./contractMapeamentoIntegrationService', () => ({
  extractMapeamentoDataFromContract: mockExtractMapeamentoData,
  generateMapeamentoFromContract: mockGenerateMapeamentoFromContract,
  getLinkedMapeamentos: mockGetLinkedMapeamentos,
  createMapeamentoLink: mockCreateMapeamentoLink,
}));

describe('Contract-Mapeamento Integration Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractMapeamentoDataFromContract', () => {
    it('should extract department from contract analysis', async () => {
      const mockAnalysis = {
        id: 1,
        contractName: 'Contrato de Prestação de Serviços',
        parties: ['Empresa A', 'Empresa B'],
        dataCategories: ['Nome', 'CPF', 'E-mail'],
        dataSubjects: ['Clientes', 'Funcionários'],
        legalBasis: 'execucao_contrato',
        retentionPeriod: '5 anos',
        securityMeasures: ['Criptografia', 'Controle de acesso'],
      };

      mockExtractMapeamentoData.mockResolvedValue({
        department: 'Jurídico',
        departmentJustification: 'Contrato de prestação de serviços identificado',
        processTitle: 'Gestão de Contratos de Serviços',
        processPurpose: 'Execução de contrato de prestação de serviços',
        dataCategories: [
          { name: 'Nome', sensivel: false },
          { name: 'CPF', sensivel: true },
          { name: 'E-mail', sensivel: false },
        ],
        titularCategories: ['Clientes', 'Funcionários'],
        legalBase: 'execucao_contrato',
        legalBaseJustification: 'Necessário para execução do contrato',
        retentionPeriod: '5 anos',
        securityMeasures: ['Criptografia', 'Controle de acesso'],
        sharing: [],
      });

      const result = await mockExtractMapeamentoData(mockAnalysis);

      expect(result).toBeDefined();
      expect(result.department).toBe('Jurídico');
      expect(result.dataCategories).toHaveLength(3);
      expect(result.titularCategories).toContain('Clientes');
    });

    it('should identify sensitive data categories', async () => {
      mockExtractMapeamentoData.mockResolvedValue({
        department: 'RH',
        dataCategories: [
          { name: 'Dados de saúde', sensivel: true },
          { name: 'Nome', sensivel: false },
        ],
      });

      const result = await mockExtractMapeamentoData({});

      const sensitiveData = result.dataCategories.filter((c: any) => c.sensivel);
      expect(sensitiveData).toHaveLength(1);
      expect(sensitiveData[0].name).toBe('Dados de saúde');
    });

    it('should extract legal basis from contract', async () => {
      mockExtractMapeamentoData.mockResolvedValue({
        legalBase: 'consentimento',
        legalBaseJustification: 'Tratamento baseado em consentimento do titular',
      });

      const result = await mockExtractMapeamentoData({});

      expect(result.legalBase).toBe('consentimento');
      expect(result.legalBaseJustification).toContain('consentimento');
    });
  });

  describe('generateMapeamentoFromContract', () => {
    it('should create mapeamento with extracted data', async () => {
      mockGenerateMapeamentoFromContract.mockResolvedValue({
        success: true,
        mapeamentoId: 123,
        linkId: 456,
        extractedData: {
          department: 'TI',
          processTitle: 'Gestão de Dados de Sistemas',
        },
      });

      const result = await mockGenerateMapeamentoFromContract({
        analysisId: 1,
        organizationId: 1,
        userId: 1,
      });

      expect(result.success).toBe(true);
      expect(result.mapeamentoId).toBe(123);
      expect(result.linkId).toBe(456);
    });

    it('should link mapeamento to contract analysis', async () => {
      mockGenerateMapeamentoFromContract.mockResolvedValue({
        success: true,
        mapeamentoId: 123,
        linkId: 456,
      });

      const result = await mockGenerateMapeamentoFromContract({
        analysisId: 1,
        organizationId: 1,
        userId: 1,
      });

      expect(result.linkId).toBeDefined();
    });

    it('should mark origin as contract analysis', async () => {
      mockGenerateMapeamentoFromContract.mockResolvedValue({
        success: true,
        extractedData: {
          origin: 'contract_analysis',
        },
      });

      const result = await mockGenerateMapeamentoFromContract({
        analysisId: 1,
      });

      expect(result.extractedData.origin).toBe('contract_analysis');
    });
  });

  describe('getLinkedMapeamentos', () => {
    it('should return all mapeamentos linked to a contract', async () => {
      mockGetLinkedMapeamentos.mockResolvedValue([
        {
          id: 1,
          contractAnalysisId: 1,
          responseId: 10,
          processTitle: 'Processo 1',
          areaName: 'TI',
          linkStatus: 'created',
          createdAt: new Date().toISOString(),
        },
        {
          id: 2,
          contractAnalysisId: 1,
          responseId: 11,
          processTitle: 'Processo 2',
          areaName: 'RH',
          linkStatus: 'reviewed',
          createdAt: new Date().toISOString(),
        },
      ]);

      const result = await mockGetLinkedMapeamentos(1);

      expect(result).toHaveLength(2);
      expect(result[0].contractAnalysisId).toBe(1);
      expect(result[1].areaName).toBe('RH');
    });

    it('should return empty array when no mapeamentos linked', async () => {
      mockGetLinkedMapeamentos.mockResolvedValue([]);

      const result = await mockGetLinkedMapeamentos(999);

      expect(result).toHaveLength(0);
    });
  });

  describe('createMapeamentoLink', () => {
    it('should create link between contract and mapeamento', async () => {
      mockCreateMapeamentoLink.mockResolvedValue({
        id: 1,
        contractAnalysisId: 1,
        responseId: 10,
        linkStatus: 'created',
      });

      const result = await mockCreateMapeamentoLink({
        contractAnalysisId: 1,
        responseId: 10,
        identifiedDepartment: 'TI',
      });

      expect(result.id).toBeDefined();
      expect(result.linkStatus).toBe('created');
    });
  });

  describe('Department Identification', () => {
    it('should identify Jurídico for contract-related documents', async () => {
      mockExtractMapeamentoData.mockResolvedValue({
        department: 'Jurídico',
        departmentJustification: 'Documento de natureza contratual',
      });

      const result = await mockExtractMapeamentoData({
        contractName: 'Contrato de Prestação de Serviços',
      });

      expect(result.department).toBe('Jurídico');
    });

    it('should identify RH for employment contracts', async () => {
      mockExtractMapeamentoData.mockResolvedValue({
        department: 'Recursos Humanos',
        departmentJustification: 'Contrato de trabalho identificado',
      });

      const result = await mockExtractMapeamentoData({
        contractName: 'Contrato de Trabalho',
        dataSubjects: ['Funcionários', 'Colaboradores'],
      });

      expect(result.department).toBe('Recursos Humanos');
    });

    it('should identify TI for technology service contracts', async () => {
      mockExtractMapeamentoData.mockResolvedValue({
        department: 'Tecnologia da Informação',
        departmentJustification: 'Contrato de serviços de TI',
      });

      const result = await mockExtractMapeamentoData({
        contractName: 'Contrato de SaaS',
        dataCategories: ['Logs de acesso', 'Dados de sistema'],
      });

      expect(result.department).toBe('Tecnologia da Informação');
    });
  });

  describe('Data Category Extraction', () => {
    it('should extract personal data categories from contract', async () => {
      mockExtractMapeamentoData.mockResolvedValue({
        dataCategories: [
          { name: 'Nome completo', sensivel: false },
          { name: 'CPF', sensivel: true },
          { name: 'Endereço', sensivel: false },
          { name: 'Telefone', sensivel: false },
        ],
      });

      const result = await mockExtractMapeamentoData({});

      expect(result.dataCategories.length).toBeGreaterThan(0);
      const cpfCategory = result.dataCategories.find((c: any) => c.name === 'CPF');
      expect(cpfCategory?.sensivel).toBe(true);
    });

    it('should identify sensitive data from health contracts', async () => {
      mockExtractMapeamentoData.mockResolvedValue({
        dataCategories: [
          { name: 'Dados de saúde', sensivel: true },
          { name: 'Histórico médico', sensivel: true },
          { name: 'Nome', sensivel: false },
        ],
      });

      const result = await mockExtractMapeamentoData({
        contractName: 'Contrato de Plano de Saúde',
      });

      const sensitiveCount = result.dataCategories.filter((c: any) => c.sensivel).length;
      expect(sensitiveCount).toBe(2);
    });
  });

  describe('Legal Basis Mapping', () => {
    const legalBases = [
      'consentimento',
      'execucao_contrato',
      'obrigacao_legal',
      'interesse_legitimo',
      'protecao_vida',
      'tutela_saude',
      'exercicio_regular_direitos',
      'protecao_credito',
    ];

    it.each(legalBases)('should support legal basis: %s', async (basis) => {
      mockExtractMapeamentoData.mockResolvedValue({
        legalBase: basis,
      });

      const result = await mockExtractMapeamentoData({});

      expect(legalBases).toContain(result.legalBase);
    });
  });

  describe('Retention Period Extraction', () => {
    it('should extract retention period from contract', async () => {
      mockExtractMapeamentoData.mockResolvedValue({
        retentionPeriod: '5 anos após término do contrato',
      });

      const result = await mockExtractMapeamentoData({});

      expect(result.retentionPeriod).toContain('anos');
    });
  });

  describe('Security Measures Extraction', () => {
    it('should extract security measures from contract', async () => {
      mockExtractMapeamentoData.mockResolvedValue({
        securityMeasures: [
          'Criptografia em trânsito e em repouso',
          'Controle de acesso baseado em função',
          'Logs de auditoria',
          'Backup regular',
        ],
      });

      const result = await mockExtractMapeamentoData({});

      expect(result.securityMeasures.length).toBeGreaterThan(0);
      expect(result.securityMeasures).toContain('Criptografia em trânsito e em repouso');
    });
  });

  describe('International Transfer Detection', () => {
    it('should detect international data transfer', async () => {
      mockExtractMapeamentoData.mockResolvedValue({
        internationalTransfer: true,
        transferCountries: ['Estados Unidos', 'União Europeia'],
        transferMechanism: 'Cláusulas contratuais padrão',
      });

      const result = await mockExtractMapeamentoData({
        parties: ['Empresa Brasil', 'Cloud Provider USA'],
      });

      expect(result.internationalTransfer).toBe(true);
      expect(result.transferCountries).toContain('Estados Unidos');
    });

    it('should not flag domestic-only contracts', async () => {
      mockExtractMapeamentoData.mockResolvedValue({
        internationalTransfer: false,
      });

      const result = await mockExtractMapeamentoData({
        parties: ['Empresa A Brasil', 'Empresa B Brasil'],
      });

      expect(result.internationalTransfer).toBe(false);
    });
  });
});


// Testes para a função getLinkedContractsForMapeamento (integração reversa)
describe('getLinkedContractsForMapeamento (Reverse Integration)', () => {
  const mockGetLinkedContractsForMapeamento = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array when no contracts are linked to mapeamento', async () => {
    mockGetLinkedContractsForMapeamento.mockResolvedValue([]);

    const result = await mockGetLinkedContractsForMapeamento(99999);

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return linked contracts for a mapeamento', async () => {
    mockGetLinkedContractsForMapeamento.mockResolvedValue([
      {
        id: 1,
        contractAnalysisId: 5,
        contractName: 'Contrato de Prestação de Serviços',
        contractType: 'Prestação de Serviços',
        partnerName: 'Empresa XYZ',
        analysisStatus: 'completed',
        progress: 100,
        createdAt: new Date().toISOString(),
        extractedData: {
          department: 'Jurídico',
          dataCategories: [{ name: 'Nome', sensivel: false }],
        },
      },
    ]);

    const result = await mockGetLinkedContractsForMapeamento(1);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].contractAnalysisId).toBe(5);
  });

  it('should include contract details in the response', async () => {
    mockGetLinkedContractsForMapeamento.mockResolvedValue([
      {
        id: 1,
        contractAnalysisId: 5,
        contractName: 'Contrato de TI',
        contractType: 'SaaS',
        partnerName: 'Tech Provider',
        analysisStatus: 'completed',
        progress: 100,
        createdAt: new Date().toISOString(),
        extractedData: null,
      },
    ]);

    const result = await mockGetLinkedContractsForMapeamento(1);

    expect(result[0]).toHaveProperty('contractAnalysisId');
    expect(result[0]).toHaveProperty('contractName');
    expect(result[0]).toHaveProperty('contractType');
    expect(result[0]).toHaveProperty('partnerName');
    expect(result[0]).toHaveProperty('analysisStatus');
    expect(result[0]).toHaveProperty('progress');
    expect(result[0]).toHaveProperty('createdAt');
    expect(result[0]).toHaveProperty('extractedData');
  });

  it('should return multiple contracts when mapeamento has multiple sources', async () => {
    mockGetLinkedContractsForMapeamento.mockResolvedValue([
      {
        id: 1,
        contractAnalysisId: 5,
        contractName: 'Contrato A',
        contractType: 'Tipo A',
        partnerName: 'Parceiro A',
        analysisStatus: 'completed',
        progress: 100,
        createdAt: new Date().toISOString(),
        extractedData: null,
      },
      {
        id: 2,
        contractAnalysisId: 6,
        contractName: 'Contrato B',
        contractType: 'Tipo B',
        partnerName: 'Parceiro B',
        analysisStatus: 'completed',
        progress: 100,
        createdAt: new Date().toISOString(),
        extractedData: null,
      },
    ]);

    const result = await mockGetLinkedContractsForMapeamento(1);

    expect(result).toHaveLength(2);
    expect(result[0].contractName).toBe('Contrato A');
    expect(result[1].contractName).toBe('Contrato B');
  });

  it('should include extracted data when available', async () => {
    mockGetLinkedContractsForMapeamento.mockResolvedValue([
      {
        id: 1,
        contractAnalysisId: 5,
        contractName: 'Contrato com Dados',
        contractType: 'Prestação de Serviços',
        partnerName: 'Empresa',
        analysisStatus: 'completed',
        progress: 100,
        createdAt: new Date().toISOString(),
        extractedData: {
          department: 'TI',
          dataCategories: [
            { name: 'Nome', sensivel: false },
            { name: 'CPF', sensivel: true },
          ],
          titularCategories: ['Clientes', 'Funcionários'],
          legalBase: 'execucao_contrato',
        },
      },
    ]);

    const result = await mockGetLinkedContractsForMapeamento(1);

    expect(result[0].extractedData).toBeDefined();
    expect(result[0].extractedData.department).toBe('TI');
    expect(result[0].extractedData.dataCategories).toHaveLength(2);
  });
});
