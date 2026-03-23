import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { TRPCError } from '@trpc/server';

// Tipos para dados extraídos da análise contratual
interface ExtractedThirdPartyData {
  name: string;
  cnpj?: string;
  address?: string;
  contact?: string;
  email?: string;
  phone?: string;
  website?: string;
  businessType?: string;
}

interface ContractData {
  title: string;
  contractNumber?: string;
  contractType?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  signatureDate?: string;
  value?: number;
  currency?: string;
  riskLevel?: string;
  lgpdCompliant?: boolean;
  dataProcessingAgreement?: boolean;
  confidentialityClause?: boolean;
  dataTypes?: string[];
  processingPurposes?: string[];
  securityMeasures?: string[];
  internationalTransfer?: boolean;
  retentionPeriod?: string;
  area?: string;
}

// Buscar terceiro por CNPJ ou nome
async function findThirdPartyByCnpjOrName(
  organizationId: number,
  cnpj?: string,
  name?: string
): Promise<any | null> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  if (cnpj) {
    const { rows: result } = await db.execute(sql`
      SELECT * FROM third_parties 
      WHERE organization_id = ${organizationId} 
      AND cnpj = ${cnpj}
      LIMIT 1
    `);
    if (Array.isArray(result) && result.length > 0) {
      return result[0];
    }
  }
  
  if (name) {
    const { rows: result } = await db.execute(sql`
      SELECT * FROM third_parties 
      WHERE organization_id = ${organizationId} 
      AND (razao_social LIKE ${`%${name}%`} OR nome_fantasia LIKE ${`%${name}%`})
      LIMIT 1
    `);
    if (Array.isArray(result) && result.length > 0) {
      return result[0];
    }
  }
  
  return null;
}

// Registrar atividade do terceiro
async function registerActivity(
  thirdPartyId: number,
  organizationId: number,
  activityType: string,
  title: string,
  description: string,
  userId?: number,
  relatedType?: string,
  relatedId?: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.execute(sql`
    INSERT INTO third_party_activities (
      third_party_id, organization_id, activity_type, title, description,
      user_id, related_type, related_id, created_at
    ) VALUES (
      ${thirdPartyId}, ${organizationId}, ${activityType}, ${title}, ${description},
      ${userId || null}, ${relatedType || null}, ${relatedId || null}, NOW()
    )
  `);
}

// Criar ou atualizar terceiro a partir de dados extraídos
export async function syncThirdPartyFromContract(
  organizationId: number,
  thirdPartyData: ExtractedThirdPartyData,
  userId?: number
): Promise<{ thirdPartyId: number; created: boolean }> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  // Verificar se já existe
  const existing = await findThirdPartyByCnpjOrName(
    organizationId,
    thirdPartyData.cnpj,
    thirdPartyData.name
  );
  
  if (existing) {
    // Atualizar dados se necessário
    await db.execute(sql`
      UPDATE third_parties SET
        razao_social = COALESCE(${thirdPartyData.name}, razao_social),
        endereco = COALESCE(${thirdPartyData.address || null}, endereco),
        contato = COALESCE(${thirdPartyData.contact || null}, contato),
        email = COALESCE(${thirdPartyData.email || null}, email),
        telefone = COALESCE(${thirdPartyData.phone || null}, telefone),
        website = COALESCE(${thirdPartyData.website || null}, website),
        tipo_negocio = COALESCE(${thirdPartyData.businessType || null}, tipo_negocio),
        updated_at = NOW()
      WHERE id = ${existing.id}
    `);
    
    // Registrar atividade
    await registerActivity(
      existing.id,
      organizationId,
      'dados_atualizados',
      'Dados cadastrais atualizados',
      'Dados atualizados automaticamente a partir de análise contratual',
      userId
    );
    
    return { thirdPartyId: existing.id, created: false };
  }
  
  // Criar novo terceiro
  const { rows: insertResult } = await db.execute(sql`
    INSERT INTO third_parties (
      organization_id, razao_social, cnpj, endereco, contato, email, telefone, website, tipo_negocio,
      status, created_at, updated_at
    ) VALUES (
      ${organizationId}, ${thirdPartyData.name}, ${thirdPartyData.cnpj || null},
      ${thirdPartyData.address || null}, ${thirdPartyData.contact || null},
      ${thirdPartyData.email || null}, ${thirdPartyData.phone || null},
      ${thirdPartyData.website || null}, ${thirdPartyData.businessType || null},
      'ativo', NOW(), NOW()
    ) RETURNING id
  `);
  
  const thirdPartyId = (insertResult as any)[0]?.id;
  
  // Registrar atividade de criação
  await registerActivity(
    thirdPartyId,
    organizationId,
    'cadastro_criado',
    'Terceiro cadastrado automaticamente',
    'Cadastro criado a partir de análise contratual',
    userId
  );
  
  return { thirdPartyId, created: true };
}

// Criar ou atualizar contrato vinculado ao terceiro
export async function syncContractToThirdParty(
  thirdPartyId: number,
  organizationId: number,
  contractAnalysisId: number,
  contractData: ContractData,
  documentUrl?: string,
  gedDocumentId?: number,
  userId?: number
): Promise<{ contractId: number; created: boolean }> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  // Verificar se já existe contrato vinculado a esta análise
  const { rows: existingResult } = await db.execute(sql`
    SELECT * FROM third_party_contracts 
    WHERE contract_analysis_id = ${contractAnalysisId}
    LIMIT 1
  `);
  
  if (Array.isArray(existingResult) && existingResult.length > 0) {
    const existing = existingResult[0] as any;
    
    // Atualizar contrato existente
    await db.execute(sql`
      UPDATE third_party_contracts SET
        title = ${contractData.title},
        contract_number = ${contractData.contractNumber || null},
        contract_type = ${contractData.contractType || null},
        description = ${contractData.description || null},
        start_date = ${contractData.startDate || null},
        end_date = ${contractData.endDate || null},
        signature_date = ${contractData.signatureDate || null},
        value = ${contractData.value || null},
        currency = ${contractData.currency || 'BRL'},
        risk_level = ${contractData.riskLevel || null},
        lgpd_compliant = ${contractData.lgpdCompliant ? 1 : 0},
        data_processing_agreement = ${contractData.dataProcessingAgreement ? 1 : 0},
        confidentiality_clause = ${contractData.confidentialityClause ? 1 : 0},
        data_types = ${JSON.stringify(contractData.dataTypes || [])},
        processing_purposes = ${JSON.stringify(contractData.processingPurposes || [])},
        security_measures = ${JSON.stringify(contractData.securityMeasures || [])},
        international_transfer = ${contractData.internationalTransfer ? 1 : 0},
        retention_period = ${contractData.retentionPeriod || null},
        area = ${contractData.area || null},
        document_url = ${documentUrl || null},
        ged_document_id = ${gedDocumentId || null},
        updated_at = NOW()
      WHERE id = ${existing.id}
    `);
    
    // Registrar atividade
    await registerActivity(
      thirdPartyId,
      organizationId,
      'contrato_atualizado',
      `Contrato "${contractData.title}" atualizado`,
      'Dados do contrato atualizados a partir de análise',
      userId,
      'contract',
      existing.id
    );
    
    return { contractId: existing.id, created: false };
  }
  
  // Criar novo contrato
  const { rows: insertResult } = await db.execute(sql`
    INSERT INTO third_party_contracts (
      third_party_id, organization_id, contract_analysis_id,
      title, contract_number, contract_type, description,
      start_date, end_date, signature_date, value, currency,
      status, risk_level, lgpd_compliant, data_processing_agreement, confidentiality_clause,
      data_types, processing_purposes, security_measures,
      international_transfer, retention_period, area,
      document_url, ged_document_id, created_at, updated_at, created_by_id
    ) VALUES (
      ${thirdPartyId}, ${organizationId}, ${contractAnalysisId},
      ${contractData.title}, ${contractData.contractNumber || null}, ${contractData.contractType || null}, ${contractData.description || null},
      ${contractData.startDate || null}, ${contractData.endDate || null}, ${contractData.signatureDate || null}, ${contractData.value || null}, ${contractData.currency || 'BRL'},
      'ativo', ${contractData.riskLevel || null}, ${contractData.lgpdCompliant ? 1 : 0}, ${contractData.dataProcessingAgreement ? 1 : 0}, ${contractData.confidentialityClause ? 1 : 0},
      ${JSON.stringify(contractData.dataTypes || [])}, ${JSON.stringify(contractData.processingPurposes || [])}, ${JSON.stringify(contractData.securityMeasures || [])},
      ${contractData.internationalTransfer ? 1 : 0}, ${contractData.retentionPeriod || null}, ${contractData.area || null},
      ${documentUrl || null}, ${gedDocumentId || null}, NOW(), NOW(), ${userId || null}
    ) RETURNING id
  `);
  
  const contractId = (insertResult as any)[0]?.id;
  
  // Registrar atividade
  await registerActivity(
    thirdPartyId,
    organizationId,
    'contrato_vinculado',
    `Contrato "${contractData.title}" vinculado`,
    'Novo contrato vinculado a partir de análise contratual',
    userId,
    'contract',
    contractId
  );
  
  return { contractId, created: true };
}

// Função principal de sincronismo após análise contratual
export async function syncFromContractAnalysis(
  organizationId: number,
  contractAnalysisId: number,
  analysisResult: any,
  documentName?: string,
  documentUrl?: string,
  gedDocumentId?: number,
  userId?: number
): Promise<{
  thirdPartyId: number;
  thirdPartyCreated: boolean;
  contractId: number;
  contractCreated: boolean;
}> {
  // Extrair dados do terceiro da análise
  const thirdPartyData: ExtractedThirdPartyData = {
    name: analysisResult.counterpartyName || analysisResult.parteContratada || 'Terceiro não identificado',
    cnpj: analysisResult.counterpartyCnpj || analysisResult.cnpjContratada,
    address: analysisResult.counterpartyAddress || analysisResult.enderecoContratada,
    contact: analysisResult.counterpartyContact,
    email: analysisResult.counterpartyEmail || analysisResult.emailContratada,
    phone: analysisResult.counterpartyPhone || analysisResult.telefoneContratada,
    website: analysisResult.counterpartyWebsite,
    businessType: analysisResult.counterpartyBusinessType || analysisResult.tipoNegocio
  };
  
  // Sincronizar terceiro
  const { thirdPartyId, created: thirdPartyCreated } = await syncThirdPartyFromContract(
    organizationId,
    thirdPartyData,
    userId
  );
  
  // Extrair dados do contrato
  const contractData: ContractData = {
    title: documentName || analysisResult.contractTitle || 'Contrato sem título',
    contractNumber: analysisResult.contractNumber || analysisResult.numeroContrato,
    contractType: analysisResult.contractType || analysisResult.tipoContrato,
    description: analysisResult.contractDescription || analysisResult.objetoContrato,
    startDate: analysisResult.startDate || analysisResult.dataInicio,
    endDate: analysisResult.endDate || analysisResult.dataTermino,
    signatureDate: analysisResult.signatureDate || analysisResult.dataAssinatura,
    value: analysisResult.contractValue || analysisResult.valorContrato,
    currency: analysisResult.currency || 'BRL',
    riskLevel: analysisResult.riskLevel || analysisResult.nivelRisco,
    lgpdCompliant: analysisResult.lgpdCompliant || analysisResult.conformeLgpd,
    dataProcessingAgreement: analysisResult.hasDataProcessingAgreement || analysisResult.possuiDpa,
    confidentialityClause: analysisResult.hasConfidentialityClause || analysisResult.possuiClausulaConfidencialidade,
    dataTypes: analysisResult.dataTypes || analysisResult.tiposDados || [],
    processingPurposes: analysisResult.processingPurposes || analysisResult.finalidadesTratamento || [],
    securityMeasures: analysisResult.securityMeasures || analysisResult.medidasSeguranca || [],
    internationalTransfer: analysisResult.internationalTransfer || analysisResult.transferenciaInternacional,
    retentionPeriod: analysisResult.retentionPeriod || analysisResult.periodoRetencao,
    area: analysisResult.area || analysisResult.areaResponsavel
  };
  
  // Sincronizar contrato
  const { contractId, created: contractCreated } = await syncContractToThirdParty(
    thirdPartyId,
    organizationId,
    contractAnalysisId,
    contractData,
    documentUrl,
    gedDocumentId,
    userId
  );
  
  // Registrar atividade de análise
  await registerActivity(
    thirdPartyId,
    organizationId,
    'analise_contrato',
    `Análise contratual realizada: ${documentName || 'Documento'}`,
    'Análise de conformidade LGPD do contrato concluída',
    userId,
    'contract_analysis',
    contractAnalysisId
  );
  
  return {
    thirdPartyId,
    thirdPartyCreated,
    contractId,
    contractCreated
  };
}

// Buscar contratos com vencimento próximo
export async function getExpiringContracts(
  organizationId: number,
  daysAhead: number = 30
): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const { rows: result } = await db.execute(sql`
    SELECT 
      tpc.*,
      tp.razao_social as third_party_name,
      tp.cnpj as third_party_cnpj
    FROM third_party_contracts tpc
    JOIN third_parties tp ON tpc.third_party_id = tp.id
    WHERE tpc.organization_id = ${organizationId}
    AND tpc.status = 'ativo'
    AND tpc.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '1 day' * ${daysAhead}
    ORDER BY tpc.end_date ASC
  `);
  
  return Array.isArray(result) ? result : [];
}

// Buscar contratos vencidos
export async function getExpiredContracts(
  organizationId: number
): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const { rows: result } = await db.execute(sql`
    SELECT 
      tpc.*,
      tp.razao_social as third_party_name,
      tp.cnpj as third_party_cnpj
    FROM third_party_contracts tpc
    JOIN third_parties tp ON tpc.third_party_id = tp.id
    WHERE tpc.organization_id = ${organizationId}
    AND tpc.status = 'ativo'
    AND tpc.end_date < CURRENT_DATE
    ORDER BY tpc.end_date DESC
  `);
  
  return Array.isArray(result) ? result : [];
}

// ==================== GERENCIAMENTO CONTRATUAL ====================

// Renovar contrato
export async function renewContract(
  contractId: number,
  newEndDate: string,
  userId?: number
): Promise<{ newContractId: number }> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  // Buscar contrato atual
  const { rows: contractResult } = await db.execute(sql`
    SELECT * FROM third_party_contracts WHERE id = ${contractId}
  `);
  
  if (!Array.isArray(contractResult) || contractResult.length === 0) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Contrato não encontrado' });
  }
  
  const contract = contractResult[0] as any;
  
  // Atualizar contrato atual para renovado
  await db.execute(sql`
    UPDATE third_party_contracts 
    SET status = 'renovado', updated_at = NOW()
    WHERE id = ${contractId}
  `);
  
  // Criar novo contrato com nova data de vencimento
  const { rows: insertResult } = await db.execute(sql`
    INSERT INTO third_party_contracts (
      third_party_id, organization_id, contract_analysis_id,
      title, contract_number, contract_type, description,
      start_date, end_date, status, risk_level,
      lgpd_compliant, data_processing_agreement, confidentiality_clause,
      created_at, updated_at, created_by_id, previous_contract_id
    ) VALUES (
      ${contract.third_party_id}, ${contract.organization_id}, ${contract.contract_analysis_id},
      ${contract.title + ' (Renovação)'}, ${contract.contract_number}, ${contract.contract_type}, ${contract.description},
      ${contract.end_date || new Date().toISOString().split('T')[0]}, ${newEndDate}, 'ativo', ${contract.risk_level},
      ${contract.lgpd_compliant}, ${contract.data_processing_agreement}, ${contract.confidentiality_clause},
      NOW(), NOW(), ${userId || null}, ${contractId}
    ) RETURNING id
  `);
  
  const newContractId = (insertResult as any)[0]?.id;
  
  // Registrar atividade
  await registerActivity(
    contract.third_party_id,
    contract.organization_id,
    'contrato_renovado',
    `Contrato "${contract.title}" renovado`,
    `Nova vigência até ${newEndDate}`,
    userId,
    'contract',
    newContractId
  );
  
  return { newContractId };
}

// Cancelar contrato
export async function cancelContract(
  contractId: number,
  reason: string,
  userId?: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const { rows: contractResult } = await db.execute(sql`
    SELECT * FROM third_party_contracts WHERE id = ${contractId}
  `);
  
  if (!Array.isArray(contractResult) || contractResult.length === 0) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Contrato não encontrado' });
  }
  
  const contract = contractResult[0] as any;
  
  await db.execute(sql`
    UPDATE third_party_contracts 
    SET status = 'cancelado', cancellation_reason = ${reason}, updated_at = NOW()
    WHERE id = ${contractId}
  `);
  
  await registerActivity(
    contract.third_party_id,
    contract.organization_id,
    'contrato_cancelado',
    `Contrato "${contract.title}" cancelado`,
    reason,
    userId,
    'contract',
    contractId
  );
}

// Obter estatísticas de contratos
export async function getContractStats(organizationId: number): Promise<any> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const { rows: result } = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'ativo' THEN 1 ELSE 0 END) as ativos,
      SUM(CASE WHEN status = 'ativo' AND end_date < CURRENT_DATE THEN 1 ELSE 0 END) as vencidos,
      SUM(CASE WHEN status = 'ativo' AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END) as vencendo_30_dias,
      SUM(CASE WHEN status = 'cancelado' THEN 1 ELSE 0 END) as cancelados,
      SUM(CASE WHEN status = 'renovado' THEN 1 ELSE 0 END) as renovados
    FROM third_party_contracts
    WHERE organization_id = ${organizationId}
  `);
  
  return Array.isArray(result) && result.length > 0 ? result[0] : {};
}

// Atualizar status de contratos vencidos
export async function updateExpiredContractStatus(organizationId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const { rows: result } = await db.execute(sql`
    UPDATE third_party_contracts 
    SET status = 'vencido', updated_at = NOW()
    WHERE organization_id = ${organizationId}
    AND status = 'ativo'
    AND end_date < CURRENT_DATE
  `);
  
  return (result as any).rowCount || 0;
}
