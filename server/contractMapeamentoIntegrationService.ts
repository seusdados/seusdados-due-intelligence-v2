import { logger } from "./_core/logger";
/**
 * Serviço de Integração entre Análise de Contratos e Mapeamentos
 * Extrai automaticamente informações do contrato para criar mapeamentos de dados
 */

import { getDb } from "./db";
import { eq, and, desc, sql, or } from "drizzle-orm";
import {
  contractAnalyses,
  contractAnalysisMaps,
  contractMapeamentoLinks,
  mapeamentoContexts,
  mapeamentoAreas,
  mapeamentoProcesses,
  mapeamentoResponses,
  organizations,
} from "../drizzle/schema";

// ==========================
// TIPOS
// ==========================

export interface ExtractedMapeamentoData {
  // Área/Departamento identificado
  department: string;
  departmentJustification: string;
  
  // Processo identificado
  processTitle: string;
  processDescription: string;
  processPurpose: string;
  
  // Categorias de dados pessoais
  dataCategories: {
    name: string;
    sensivel: boolean;
    source: string; // "contrato", "mapa_analise", "ai_inferido"
  }[];
  
  // Categorias de titulares
  titularCategories: string[];
  
  // Base legal
  legalBase: string;
  legalBaseJustification: string;
  
  // Compartilhamento
  sharing: string[];
  
  // Armazenamento e retenção
  retentionPeriod: string;
  storageLocation: string;
  
  // Medidas de segurança
  securityMeasures: string[];
  
  // Transferência internacional
  internationalTransfer: boolean;
  internationalCountries: string[];
  
  // Origem dos dados
  dataSource: "contract_analysis";
  contractAnalysisId: number;
}

// ==========================
// MAPEAMENTO DE TIPOS DE CONTRATO PARA DEPARTAMENTOS
// ==========================

const contractTypeToDepartment: Record<string, string> = {
  // Prestação de serviços
  "prestação de serviços": "Compras/Suprimentos",
  "serviços": "Compras/Suprimentos",
  "outsourcing": "Compras/Suprimentos",
  "terceirização": "Compras/Suprimentos",
  
  // RH
  "trabalho": "Recursos Humanos",
  "emprego": "Recursos Humanos",
  "clt": "Recursos Humanos",
  "estágio": "Recursos Humanos",
  "aprendizagem": "Recursos Humanos",
  "menor aprendiz": "Recursos Humanos",
  "folha de pagamento": "Recursos Humanos",
  "benefícios": "Recursos Humanos",
  "plano de saúde": "Recursos Humanos",
  
  // TI
  "software": "Tecnologia da Informação",
  "licença": "Tecnologia da Informação",
  "saas": "Tecnologia da Informação",
  "cloud": "Tecnologia da Informação",
  "hospedagem": "Tecnologia da Informação",
  "desenvolvimento": "Tecnologia da Informação",
  "suporte técnico": "Tecnologia da Informação",
  "manutenção de sistemas": "Tecnologia da Informação",
  
  // Marketing
  "marketing": "Marketing",
  "publicidade": "Marketing",
  "propaganda": "Marketing",
  "mídia": "Marketing",
  "influenciador": "Marketing",
  
  // Comercial
  "vendas": "Comercial",
  "representação comercial": "Comercial",
  "distribuição": "Comercial",
  "franquia": "Comercial",
  
  // Jurídico
  "advocacia": "Jurídico",
  "assessoria jurídica": "Jurídico",
  "consultoria jurídica": "Jurídico",
  
  // Financeiro
  "financeiro": "Financeiro",
  "contabilidade": "Financeiro",
  "auditoria": "Financeiro",
  "cobrança": "Financeiro",
  
  // Saúde
  "saúde": "Saúde Ocupacional",
  "medicina do trabalho": "Saúde Ocupacional",
  "exames": "Saúde Ocupacional",
  
  // Segurança
  "segurança": "Segurança",
  "vigilância": "Segurança",
  "monitoramento": "Segurança",
  "cftv": "Segurança",
  
  // Logística
  "logística": "Logística",
  "transporte": "Logística",
  "entrega": "Logística",
  "armazenagem": "Logística",
};

// ==========================
// FUNÇÕES DE EXTRAÇÃO
// ==========================

/**
 * Identifica o departamento responsável com base no tipo de contrato
 */
function identifyDepartment(contractMap: any): { department: string; justification: string } {
  const contractType = (contractMap.contractType || "").toLowerCase();
  const contractObject = (contractMap.contractObject || "").toLowerCase();
  
  // Buscar match no tipo de contrato
  for (const [keyword, dept] of Object.entries(contractTypeToDepartment)) {
    if (contractType.includes(keyword) || contractObject.includes(keyword)) {
      return {
        department: dept,
        justification: `Identificado automaticamente com base no tipo de contrato "${contractMap.contractType}" que contém "${keyword}".`,
      };
    }
  }
  
  // Fallback baseado no agente LGPD
  if (contractMap.lgpdAgentType === "operador" || contractMap.lgpdAgentType === "suboperador") {
    return {
      department: "Compras/Suprimentos",
      justification: `Contrato com operador/suboperador de dados, geralmente gerenciado por Compras/Suprimentos.`,
    };
  }
  
  return {
    department: "Jurídico",
    justification: `Departamento padrão para contratos não classificados automaticamente.`,
  };
}

/**
 * Extrai categorias de dados pessoais do mapa de análise
 */
function extractDataCategories(contractMap: any): { name: string; sensivel: boolean; source: string }[] {
  const categories: { name: string; sensivel: boolean; source: string }[] = [];
  
  // Dados comuns
  if (contractMap.commonData) {
    const commonDataItems = contractMap.commonData.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
    for (const item of commonDataItems) {
      categories.push({
        name: item,
        sensivel: false,
        source: "mapa_analise",
      });
    }
  }
  
  // Dados sensíveis
  if (contractMap.sensitiveData) {
    const sensitiveDataItems = contractMap.sensitiveData.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
    for (const item of sensitiveDataItems) {
      categories.push({
        name: item,
        sensivel: true,
        source: "mapa_analise",
      });
    }
  }
  
  // Se não encontrou nada, adicionar categorias genéricas baseadas no contexto
  if (categories.length === 0) {
    categories.push({
      name: "Dados de identificação (nome, CPF, RG)",
      sensivel: false,
      source: "ai_inferido",
    });
    categories.push({
      name: "Dados de contato (e-mail, telefone, endereço)",
      sensivel: false,
      source: "ai_inferido",
    });
  }
  
  return categories;
}

/**
 * Extrai categorias de titulares do contrato
 */
function extractTitularCategories(contractMap: any): string[] {
  const categories: string[] = [];
  
  // Inferir com base no tipo de contrato
  const contractType = (contractMap.contractType || "").toLowerCase();
  const contractObject = (contractMap.contractObject || "").toLowerCase();
  
  // Funcionários
  if (contractType.includes("trabalho") || contractType.includes("rh") || 
      contractObject.includes("folha") || contractObject.includes("funcionário")) {
    categories.push("Funcionários");
    categories.push("Colaboradores");
  }
  
  // Clientes
  if (contractType.includes("comercial") || contractType.includes("vendas") ||
      contractObject.includes("usuario")) {
    categories.push("Clientes");
  }
  
  // Menores
  if (contractMap.hasMinorData) {
    categories.push("Menores de idade");
  }
  
  // Idosos
  if (contractMap.hasElderlyData) {
    categories.push("Idosos");
  }
  
  // Fallback
  if (categories.length === 0) {
    categories.push("Titulares relacionados ao contrato");
  }
  
  return categories;
}

/**
 * Extrai base legal do contrato
 */
function extractLegalBase(contractMap: any): { base: string; justification: string } {
  // Verificar se há menção a consentimento
  if (contractMap.titularRightsDetails?.toLowerCase().includes("consentimento")) {
    return {
      base: "consentimento",
      justification: "Contrato menciona obtenção de consentimento do titular.",
    };
  }
  
  // Verificar tipo de agente
  if (contractMap.lgpdAgentType === "operador" || contractMap.lgpdAgentType === "suboperador") {
    return {
      base: "execucao_contrato",
      justification: "Tratamento realizado por operador para execução de contrato com o controlador.",
    };
  }
  
  // Verificar se é contrato de trabalho
  const contractType = (contractMap.contractType || "").toLowerCase();
  if (contractType.includes("trabalho") || contractType.includes("emprego")) {
    return {
      base: "obrigacao_legal",
      justification: "Tratamento necessário para cumprimento de obrigação legal trabalhista.",
    };
  }
  
  return {
    base: "execucao_contrato",
    justification: "Base legal padrão para contratos comerciais.",
  };
}

/**
 * Extrai medidas de segurança do contrato
 */
function extractSecurityMeasures(contractMap: any): string[] {
  const measures: string[] = [];
  
  // Verificar se há cláusula de proteção
  if (contractMap.hasProtectionClause === "sim") {
    measures.push("Cláusula de proteção de dados no contrato");
  }
  
  // Verificar detalhes de segurança
  if (contractMap.securityRisks) {
    // Se há riscos de segurança identificados, inferir que há medidas
    measures.push("Controles de acesso");
    measures.push("Criptografia de dados");
  }
  
  // Medidas padrão
  if (measures.length === 0) {
    measures.push("Controles contratuais");
  }
  
  return measures;
}

/**
 * Extrai informações de compartilhamento
 */
function extractSharing(contractMap: any): string[] {
  const sharing: string[] = [];
  
  // Adicionar as partes do contrato
  if (contractMap.contractedParty) {
    sharing.push(contractMap.contractedParty);
  }
  
  // Verificar se há suboperadores
  if (contractMap.lgpdAgentType === "suboperador") {
    sharing.push("Suboperador de dados");
  }
  
  return sharing;
}

// ==========================
// FUNÇÕES PRINCIPAIS
// ==========================

/**
 * Extrai dados do contrato para criar mapeamento
 */
export async function extractMapeamentoFromContract(
  contractAnalysisId: number
): Promise<ExtractedMapeamentoData | null> {
  const db = await getDb();
  if (!db) return null;
  
  // Buscar análise de contrato
  const [analysis] = await db
    .select()
    .from(contractAnalyses)
    .where(eq(contractAnalyses.id, contractAnalysisId));
  
  if (!analysis) return null;
  
  // Buscar mapa de análise
  const [contractMap] = await db
    .select()
    .from(contractAnalysisMaps)
    .where(eq(contractAnalysisMaps.analysisId, contractAnalysisId));
  
  if (!contractMap) return null;
  
  // Identificar departamento
  const { department, justification: deptJustification } = identifyDepartment(contractMap);
  
  // Extrair categorias de dados
  const dataCategories = extractDataCategories(contractMap);
  
  // Extrair categorias de titulares
  const titularCategories = extractTitularCategories(contractMap);
  
  // Extrair base legal
  const { base: legalBase, justification: legalJustification } = extractLegalBase(contractMap);
  
  // Extrair medidas de segurança
  const securityMeasures = extractSecurityMeasures(contractMap);
  
  // Extrair compartilhamento
  const sharing = extractSharing(contractMap);
  
  // Montar dados extraídos
  const extractedData: ExtractedMapeamentoData = {
    department,
    departmentJustification: deptJustification,
    
    processTitle: `Tratamento de dados - ${contractMap.partnerName || analysis.contractName}`,
    processDescription: contractMap.contractObject || `Processo de tratamento de dados relacionado ao contrato ${analysis.contractName}`,
    processPurpose: contractMap.contractObject || "Execução de contrato com terceiro",
    
    dataCategories,
    titularCategories,
    
    legalBase,
    legalBaseJustification: legalJustification,
    
    sharing,
    
    retentionPeriod: contractMap.endDate ? `Até ${contractMap.endDate}` : "Duração do contrato",
    storageLocation: "Sistemas do contratado",
    
    securityMeasures,
    
    internationalTransfer: false, // Pode ser inferido do contrato
    internationalCountries: [],
    
    dataSource: "contract_analysis",
    contractAnalysisId,
  };
  
  return extractedData;
}

/**
 * Cria mapeamento a partir dos dados extraídos do contrato
 * @param contractAnalysisId - ID da análise de contrato
 * @param userId - ID do usuário que está criando
 * @param initialStatus - Status inicial do mapeamento ('draft' para revisão, 'created' para aprovado)
 */
export async function createMapeamentoFromContract(
  contractAnalysisId: number,
  userId: number,
  initialStatus: 'draft' | 'created' = 'created'
): Promise<{ success: boolean; linkId?: number; contextId?: number; areaId?: number; processId?: number; responseId?: number; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };
  
  try {
    // Buscar análise de contrato
    const [analysis] = await db
      .select()
      .from(contractAnalyses)
      .where(eq(contractAnalyses.id, contractAnalysisId));
    
    if (!analysis) {
      return { success: false, error: "Análise de contrato não encontrada" };
    }
    
    // Verificar se já existe vinculação
    const [existingLink] = await db
      .select()
      .from(contractMapeamentoLinks)
      .where(eq(contractMapeamentoLinks.contractAnalysisId, contractAnalysisId));
    
    // Se já existe link criado ou aprovado, retornar
    if (existingLink && (existingLink.linkStatus === "created" || existingLink.linkStatus === "approved")) {
      return { 
        success: true, 
        linkId: existingLink.id,
        contextId: existingLink.contextId || undefined,
        areaId: existingLink.areaId || undefined,
        processId: existingLink.processId || undefined,
        responseId: existingLink.responseId || undefined,
      };
    }
    
    // Extrair dados do contrato
    const extractedData = await extractMapeamentoFromContract(contractAnalysisId);
    if (!extractedData) {
      return { success: false, error: "Não foi possível extrair dados do contrato" };
    }
    
    // Buscar organização
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, analysis.organizationId));
    
    // Verificar se já existe contexto de mapeamento para a organização
    let [context] = await db
      .select()
      .from(mapeamentoContexts)
      .where(eq(mapeamentoContexts.organizationId, analysis.organizationId));
    
    let contextId: number;
    if (!context) {
      // Criar contexto
      const contextResult = await db.insert(mapeamentoContexts).values({
        organizationId: analysis.organizationId,
        segment: "servicos",
        businessType: "consultoria",
        status: "em_andamento",
      } as any).returning({ id: mapeamentoContexts.id });
      contextId = contextResult[0]?.id || 0;
    } else {
      contextId = context.id;
    }
    
    // Verificar se já existe área com o nome identificado
    let [area] = await db
      .select()
      .from(mapeamentoAreas)
      .where(
        and(
          eq(mapeamentoAreas.organizationId, analysis.organizationId),
          eq(mapeamentoAreas.name, extractedData.department)
        )
      );
    
    let areaId: number;
    if (!area) {
      // Criar área
      const areaResult = await db.insert(mapeamentoAreas).values({
        organizationId: analysis.organizationId,
        contextId,
        name: extractedData.department,
        description: extractedData.departmentJustification,
        isCustom: 0,
        isActive: true,
      } as any).returning({ id: mapeamentoAreas.id });
      areaId = areaResult[0]?.id || 0;
    } else {
      areaId = area.id;
    }
    
    // Criar processo
    const processResult = await db.insert(mapeamentoProcesses).values({
      organizationId: analysis.organizationId,
      areaId,
      title: extractedData.processTitle,
      description: extractedData.processDescription,
      purpose: extractedData.processPurpose,
      isAiGenerated: 0, // Gerado a partir de contrato
      isActive: true,
    } as any).returning({ id: mapeamentoProcesses.id });
    const processId = processResult[0]?.id || 0;
    
    // Calcular risco
    const hasSensitive = extractedData.dataCategories.some(d => d.sensivel);
    let riskLevel: "baixa" | "media" | "alta" | "extrema" = "baixa";
    let riskScore = 0.2;
    
    if (hasSensitive) {
      riskLevel = "alta";
      riskScore = 0.7;
    } else if (extractedData.internationalTransfer) {
      riskLevel = "media";
      riskScore = 0.5;
    }
    
    // Criar resposta (mapeamento preenchido)
    const responseResult = await db.insert(mapeamentoResponses).values({
      organizationId: analysis.organizationId,
      respondentId: 0, // Gerado automaticamente
      processId,
      dataCategories: JSON.stringify(extractedData.dataCategories),
      titularCategories: JSON.stringify(extractedData.titularCategories),
      legalBase: extractedData.legalBase,
      sharing: JSON.stringify(extractedData.sharing),
      consentObtained: extractedData.legalBase === "consentimento" ? 1 : 0,
      retentionPeriod: extractedData.retentionPeriod,
      storageLocation: extractedData.storageLocation,
      securityMeasures: JSON.stringify(extractedData.securityMeasures),
      internationalTransfer: extractedData.internationalTransfer ? 1 : 0,
      internationalCountries: JSON.stringify(extractedData.internationalCountries),
      riskLevel,
      riskScore: riskScore.toString(),
      requiresAction: riskLevel === "alta" || (riskLevel as string) === "extrema" ? 1 : 0,
      notes: `Mapeamento gerado automaticamente a partir da análise de contrato #${contractAnalysisId}. ${extractedData.departmentJustification}`,
      completed: 1,
      completedAt: new Date().toISOString(),
    } as any).returning({ id: mapeamentoResponses.id });
    const responseId = responseResult[0]?.id || 0;
    
    // Criar ou atualizar vinculação
    let linkId: number;
    if (existingLink) {
      await db
        .update(contractMapeamentoLinks)
        .set({
          contextId,
          areaId,
          processId,
          responseId,
          extractedData: JSON.stringify(extractedData),
          identifiedDepartment: extractedData.department,
          linkStatus: initialStatus,
          createdById: userId,
        } as any)
        .where(eq(contractMapeamentoLinks.id, existingLink.id));
      linkId = existingLink.id;
    } else {
      const linkResult = await db.insert(contractMapeamentoLinks).values({
        contractAnalysisId,
        contextId,
        areaId,
        processId,
        responseId,
        extractionSource: "contract_map",
        extractedData: JSON.stringify(extractedData),
        identifiedDepartment: extractedData.department,
        linkStatus: initialStatus,
        createdById: userId,
      } as any).returning({ id: contractMapeamentoLinks.id });
      linkId = linkResult[0]?.id || 0;
    }
    
    // Enviar notificação por e-mail
    try {
      const { notifyMapeamentoFromContract } = await import('./emailService');
      
      // Buscar nome da organização
      const [org] = await db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, analysis.organizationId));
      
      await notifyMapeamentoFromContract({
        contractName: analysis.contractName || 'Contrato sem nome',
        contractAnalysisId,
        mapeamentoId: responseId,
        department: extractedData.department,
        organizationName: org?.name || 'Organização',
        extractedDataSummary: {
          dataCategories: extractedData.dataCategories.length,
          titularCategories: extractedData.titularCategories.length,
          legalBase: extractedData.legalBase,
        },
      });
    } catch (notifyError) {
      logger.error('Erro ao enviar notificação de mapeamento:', notifyError);
      // Não falha a operação se a notificação falhar
    }
    
    return {
      success: true,
      linkId,
      contextId,
      areaId,
      processId,
      responseId,
    };
    
  } catch (error: any) {
    logger.error("Erro ao criar mapeamento a partir do contrato:", error);
    
    // Registrar erro na vinculação
    await db.insert(contractMapeamentoLinks).values({
      contractAnalysisId,
      extractionSource: "contract_map",
      linkStatus: "error",
      errorMessage: error.message,
      createdById: userId,
    } as any);
    
    return { success: false, error: error.message };
  }
}

/**
 * Lista mapeamentos vinculados a uma análise de contrato
 */
export async function getLinkedMapeamentos(contractAnalysisId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const links = await db
    .select({
      id: contractMapeamentoLinks.id,
      contractAnalysisId: contractMapeamentoLinks.contractAnalysisId,
      contextId: contractMapeamentoLinks.contextId,
      areaId: contractMapeamentoLinks.areaId,
      processId: contractMapeamentoLinks.processId,
      responseId: contractMapeamentoLinks.responseId,
      identifiedDepartment: contractMapeamentoLinks.identifiedDepartment,
      linkStatus: contractMapeamentoLinks.linkStatus,
      extractedData: contractMapeamentoLinks.extractedData,
      createdAt: contractMapeamentoLinks.createdAt,
      // Dados do processo
      processTitle: mapeamentoProcesses.title,
      processDescription: mapeamentoProcesses.description,
      // Dados da área
      areaName: mapeamentoAreas.name,
    })
    .from(contractMapeamentoLinks)
    .leftJoin(mapeamentoProcesses, eq(contractMapeamentoLinks.processId, mapeamentoProcesses.id))
    .leftJoin(mapeamentoAreas, eq(contractMapeamentoLinks.areaId, mapeamentoAreas.id))
    .where(eq(contractMapeamentoLinks.contractAnalysisId, contractAnalysisId))
    .orderBy(desc(contractMapeamentoLinks.createdAt));
  
  return links;
}

/**
 * Obtém detalhes de um mapeamento vinculado
 */
export async function getMapeamentoDetails(linkId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [link] = await db
    .select()
    .from(contractMapeamentoLinks)
    .where(eq(contractMapeamentoLinks.id, linkId));
  
  if (!link || !link.responseId) return null;
  
  // Buscar resposta completa
  const [response] = await db
    .select()
    .from(mapeamentoResponses)
    .where(eq(mapeamentoResponses.id, link.responseId));
  
  // Buscar processo
  const [process] = link.processId ? await db
    .select()
    .from(mapeamentoProcesses)
    .where(eq(mapeamentoProcesses.id, link.processId)) : [null];
  
  // Buscar área
  const [area] = link.areaId ? await db
    .select()
    .from(mapeamentoAreas)
    .where(eq(mapeamentoAreas.id, link.areaId)) : [null];
  
  return {
    link,
    response,
    process,
    area,
  };
}


/**
 * Obtém os contratos vinculados a um mapeamento (integração reversa)
 * Permite visualizar na página de mapeamento quais contratos geraram aquele registro
 */
export async function getLinkedContractsForMapeamento(
  input: { responseId?: number; rotId?: number }
): Promise<{
  id: number;
  contractAnalysisId: number;
  contractName: string;
  contractType: string;
  partnerName: string;
  analysisStatus: string;
  progress: number;
  createdAt: Date;
  extractedData: any;
}[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar links que apontam para este mapeamento (por responseId ou rotId)
  const { responseId, rotId } = input;
  const filters = [];
  if (responseId) filters.push(eq(contractMapeamentoLinks.responseId, responseId));
  if (rotId) filters.push(eq(contractMapeamentoLinks.rotId, rotId));
  
  if (filters.length === 0) return [];
  
  const links = await db
    .select({
      id: contractMapeamentoLinks.id,
      contractAnalysisId: contractMapeamentoLinks.contractAnalysisId,
      extractedData: contractMapeamentoLinks.extractedData,
      createdAt: contractMapeamentoLinks.createdAt,
      rotId: contractMapeamentoLinks.rotId,
      responseId: contractMapeamentoLinks.responseId,
    })
    .from(contractMapeamentoLinks)
    .where(filters.length === 1 ? filters[0] : or(...filters))
    .orderBy(desc(contractMapeamentoLinks.createdAt));
  
  if (links.length === 0) return [];
  
  // Buscar detalhes de cada contrato
  const result = [];
  for (const link of links) {
    const [analysis] = await db
      .select({
        id: contractAnalyses.id,
        contractName: contractAnalyses.contractName,
        status: contractAnalyses.contractAnalysisStatus,
        progress: contractAnalyses.progress,
      })
      .from(contractAnalyses)
      .where(eq(contractAnalyses.id, link.contractAnalysisId));
    
    if (analysis) {
      // Buscar mapa de análise para obter tipo e parceiro
      const [contractMap] = await db
        .select({
          contractType: contractAnalysisMaps.contractType,
          partnerName: contractAnalysisMaps.partnerName,
        })
        .from(contractAnalysisMaps)
        .where(eq(contractAnalysisMaps.analysisId, link.contractAnalysisId));
      
      result.push({
        id: link.id,
        contractAnalysisId: analysis.id,
        contractName: analysis.contractName || "Contrato sem nome",
        contractType: contractMap?.contractType || "Não informado",
        partnerName: contractMap?.partnerName || "Não informado",
        analysisStatus: analysis.status || "pending",
        progress: analysis.progress || 0,
        createdAt: link.createdAt,
        extractedData: link.extractedData ? JSON.parse(link.extractedData as string) : null,
      });
    }
  }
  
  return result;
}
