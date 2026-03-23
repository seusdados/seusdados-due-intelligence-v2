import { logger } from "./_core/logger";
/**
 * Serviço de Integração GED-Mapeamentos
 * 
 * Este serviço gerencia a integração automática entre documentos ROT/POP
 * gerados pelo módulo de Mapeamentos e o sistema GED da organização.
 */

import * as dbModule from "./db";
import { extractInsertId } from "./db";
import { 
  mapeamentoGedDocuments,
  gedFolders,
  gedDocuments,
  rotOperations,
  organizations,
  users,
  type MapeamentoGedDocument,
  type InsertMapeamentoGedDocument,
  type GedFolder,
  type GedDocument
} from "../drizzle/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { storagePut } from "./storage";
import * as gedService from "./gedService";

// Helper para obter instância do banco
const getDb = async () => {
  const db = await dbModule.getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  return db;
};

// ==================== CONSTANTES ====================

const MAPEAMENTO_FOLDER_NAME = "Mapeamentos LGPD";
const MAPEAMENTO_FOLDER_ICON = "FileText";
const MAPEAMENTO_FOLDER_COLOR = "#6B21A8";

const SUBFOLDER_CONFIG = {
  rot: { name: "ROT - Registros de Operações", icon: "ClipboardList", color: "#3B82F6" },
  pop: { name: "POP - Procedimentos Operacionais", icon: "FileCheck", color: "#10B981" },
  ropa: { name: "ROPA - Relatórios ANPD", icon: "FileSpreadsheet", color: "#F59E0B" },
  evidence: { name: "Evidências", icon: "FileSearch", color: "#EF4444" },
};

// ==================== TIPOS ====================

export type DocumentType = "rot" | "pop" | "ropa" | "evidence";

export interface GedUser {
  id: number;
  role: "admin_global" | "consultor" | "sponsor";
  organizationId?: number | null;
}

export interface SaveDocumentToGedInput {
  rotId: number;
  organizationId: number;
  documentType: DocumentType;
  title: string;
  content: string; // Markdown ou HTML
  description?: string;
  userId: number;
  tags?: string[];
}

export interface LinkedDocument {
  id: number;
  rotId: number;
  gedDocumentId: number;
  documentType: DocumentType;
  version: number;
  isLatest: boolean;
  generatedAt: string;
  gedDocument?: GedDocument;
}

// ==================== FUNÇÕES DE PASTA ====================

/**
 * Obtém ou cria a pasta raiz de Mapeamentos LGPD para uma organização
 */
export async function getOrCreateMapeamentoFolder(
  organizationId: number,
  userId: number
): Promise<GedFolder> {
  const db = await getDb();
  
  logger.info("[GED-FOLDER] Buscando pasta raiz para org:", organizationId);
  
  // Buscar pasta existente - usar query mais simples
  const existingFolders = await db
    .select()
    .from(gedFolders)
    .where(
      and(
        eq(gedFolders.organizationId, organizationId),
        eq(gedFolders.name, MAPEAMENTO_FOLDER_NAME),
        eq(gedFolders.spaceType, "organization")
      )
    );
  
  logger.info("[GED-FOLDER] Pastas encontradas:", existingFolders.length);
  
  // Filtrar para encontrar a pasta raiz (sem parent)
  const existingFolder = existingFolders.find(f => f.parentFolderId === null);
  
  if (existingFolder) {
    logger.info("[GED-FOLDER] Pasta raiz encontrada, id:", existingFolder.id);
    return existingFolder;
  }
  
  // Criar pasta raiz
  const [newFolder] = await db.insert(gedFolders).values({
    name: MAPEAMENTO_FOLDER_NAME,
    description: "Documentos gerados automaticamente pelo módulo de Mapeamento de Processos e Dados",
    spaceType: "organization",
    organizationId,
    parentFolderId: null,
    path: `/${MAPEAMENTO_FOLDER_NAME}`,
    depth: 0,
    isSystemFolder: 1,
    icon: MAPEAMENTO_FOLDER_ICON,
    color: MAPEAMENTO_FOLDER_COLOR,
    sortOrder: 10,
    createdById: userId,
  }) as any;
  
  const folderId = extractInsertId(newFolder);
  const [created] = await db
    .select()
    .from(gedFolders)
    .where(eq(gedFolders.id, folderId));
  
  logger.info("[GED-FOLDER] Pasta raiz criada, id:", created?.id);
  
  if (!created) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao criar pasta de mapeamentos no GED' });
  }
  
  return created;
}

/**
 * Obtém ou cria uma subpasta para um tipo de documento específico
 */
export async function getOrCreateSubfolder(
  organizationId: number,
  parentFolderId: number,
  documentType: DocumentType,
  userId: number
): Promise<GedFolder> {
  const db = await getDb();
  const config = SUBFOLDER_CONFIG[documentType];
  
  // Buscar subpasta existente
  const [existingFolder] = await db
    .select()
    .from(gedFolders)
    .where(
      and(
        eq(gedFolders.organizationId, organizationId),
        eq(gedFolders.parentFolderId, parentFolderId),
        eq(gedFolders.name, config.name)
      )
    );
  
  if (existingFolder) {
    return existingFolder;
  }
  
  // Buscar pasta pai para calcular path
  const [parentFolder] = await db
    .select()
    .from(gedFolders)
    .where(eq(gedFolders.id, parentFolderId));
  
  const path = parentFolder ? `${parentFolder.path}/${config.name}` : `/${config.name}`;
  const depth = parentFolder ? parentFolder.depth + 1 : 1;
  
  // Criar subpasta
  const [newFolder] = await db.insert(gedFolders).values({
    name: config.name,
    description: `Documentos do tipo ${documentType.toUpperCase()} gerados automaticamente`,
    spaceType: "organization",
    organizationId,
    parentFolderId,
    path,
    depth,
    isSystemFolder: 1,
    icon: config.icon,
    color: config.color,
    sortOrder: Object.keys(SUBFOLDER_CONFIG).indexOf(documentType) + 1,
    createdById: userId,
  }) as any;
  
  const folderId = extractInsertId(newFolder);
  const [created] = await db
    .select()
    .from(gedFolders)
    .where(eq(gedFolders.id, folderId));
  
  logger.info("[GED-FOLDER] Subpasta criada, id:", created?.id);
  
  if (!created) {
    throw new Error(`Falha ao criar subpasta ${documentType} no GED`);
  }
  
  return created;
}

// ==================== FUNÇÕES DE DOCUMENTO ====================

/**
 * Salva um documento ROT/POP no GED automaticamente
 */
export async function saveDocumentToGed(
  input: SaveDocumentToGedInput
): Promise<LinkedDocument> {
  logger.info(`[GED-SAVE] Iniciando saveDocumentToGed para: ${input.documentType} rotId: ${input.rotId}`);
  const db = await getDb();
  logger.info("[GED-SAVE] Banco de dados conectado");
  
  // 1. Obter ou criar estrutura de pastas
  const rootFolder = await getOrCreateMapeamentoFolder(input.organizationId, input.userId);
  const subfolder = await getOrCreateSubfolder(
    input.organizationId,
    rootFolder.id,
    input.documentType,
    input.userId
  );
  
  // 2. Gerar arquivo (Markdown para PDF ou HTML)
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const sanitizedTitle = input.title.replace(/[^a-zA-Z0-9-]/g, "_").substring(0, 50);
  const fileName = `${input.documentType.toUpperCase()}_${sanitizedTitle}_${timestamp}.md`;
  const fileKey = `ged/organization/${input.organizationId}/mapeamentos/${input.documentType}/${timestamp}-${randomSuffix}-${fileName}`;
  
  // 3. Upload do conteúdo para S3
  const contentBuffer = Buffer.from(input.content, "utf-8");
  const { url } = await storagePut(fileKey, contentBuffer, "text/markdown");
  
  // 4. Verificar versão anterior
  const [latestLink] = await db
    .select()
    .from(mapeamentoGedDocuments)
    .where(
      and(
        eq(mapeamentoGedDocuments.rotId, input.rotId),
        eq(mapeamentoGedDocuments.documentType, input.documentType),
        eq(mapeamentoGedDocuments.isLatest, 1)
      )
    )
    .orderBy(desc(mapeamentoGedDocuments.version))
    .limit(1);
  
  const newVersion = latestLink ? latestLink.version + 1 : 1;
  
  // 5. Marcar versões anteriores como não-latest
  if (latestLink) {
    await db
      .update(mapeamentoGedDocuments)
      .set({ isLatest: 0 })
      .where(
        and(
          eq(mapeamentoGedDocuments.rotId, input.rotId),
          eq(mapeamentoGedDocuments.documentType, input.documentType)
        )
      );
  }
  
  // 6. Inserir documento no GED
  logger.info("[GED-SAVE] Inserindo documento no GED...");
  await db.insert(gedDocuments).values({
    name: input.title,
    description: input.description || `Documento ${input.documentType.toUpperCase()} gerado automaticamente`,
    spaceType: "organization",
    organizationId: input.organizationId,
    folderId: subfolder.id,
    fileName,
    fileKey,
    fileUrl: url,
    fileSize: contentBuffer.length,
    mimeType: "text/markdown",
    fileExtension: "md",
    version: newVersion,
    isLatestVersion: 1,
    status: "active",
    tags: input.tags || [input.documentType, "mapeamento", "lgpd", "automático"],
    linkedEntityType: "rot_operation",
    linkedEntityId: input.rotId,
    createdById: input.userId,
    lastModifiedById: input.userId,
  });
  
  // Buscar o documento recém-inserido pelo fileKey (único)
  const [createdGedDoc] = await db
    .select()
    .from(gedDocuments)
    .where(eq(gedDocuments.fileKey, fileKey));
  
  if (!createdGedDoc) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao criar documento no GED' });
  }
  logger.info("[GED-SAVE] Documento GED criado, id:", createdGedDoc.id);
  
  // 7. Criar vinculação
  logger.info("[GED-SAVE] Criando vinculação...");
  await db.insert(mapeamentoGedDocuments).values({
    rotId: input.rotId,
    gedDocumentId: createdGedDoc.id,
    documentType: input.documentType,
    version: newVersion,
    isLatest: 1,
    generatedById: input.userId,
    notes: `Versão ${newVersion} gerada automaticamente`,
  });
  
  // 8. Buscar a vinculação recém-criada
  const [createdLink] = await db
    .select()
    .from(mapeamentoGedDocuments)
    .where(
      and(
        eq(mapeamentoGedDocuments.rotId, input.rotId),
        eq(mapeamentoGedDocuments.gedDocumentId, createdGedDoc.id),
        eq(mapeamentoGedDocuments.documentType, input.documentType),
        eq(mapeamentoGedDocuments.version, newVersion)
      )
    );
  
  if (!createdLink) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao criar vinculação do documento' });
  }
  logger.info("[GED-SAVE] Vinculação criada, id:", createdLink.id);
  
  return {
    id: createdLink.id,
    rotId: createdLink.rotId,
    gedDocumentId: createdLink.gedDocumentId,
    documentType: createdLink.documentType as DocumentType,
    version: createdLink.version,
    isLatest: createdLink.isLatest === 1,
    generatedAt: createdLink.generatedAt || new Date().toISOString(),
    gedDocument: createdGedDoc,
  };
}

/**
 * Lista todos os documentos vinculados a um ROT
 */
export async function getLinkedDocuments(
  rotId: number
): Promise<LinkedDocument[]> {
  const db = await getDb();
  
  const links = await db
    .select()
    .from(mapeamentoGedDocuments)
    .where(eq(mapeamentoGedDocuments.rotId, rotId))
    .orderBy(desc(mapeamentoGedDocuments.generatedAt));
  
  // Buscar documentos GED associados
  const result: LinkedDocument[] = [];
  
  for (const link of links) {
    const [gedDoc] = await db
      .select()
      .from(gedDocuments)
      .where(eq(gedDocuments.id, link.gedDocumentId));
    
    result.push({
      id: link.id,
      rotId: link.rotId,
      gedDocumentId: link.gedDocumentId,
      documentType: link.documentType as DocumentType,
      version: link.version,
      isLatest: link.isLatest === 1,
      generatedAt: link.generatedAt || new Date().toISOString(),
      gedDocument: gedDoc,
    });
  }
  
  return result;
}

/**
 * Lista documentos mais recentes por tipo
 */
export async function getLatestDocuments(
  rotId: number
): Promise<Record<DocumentType, LinkedDocument | null>> {
  const db = await getDb();
  
  const result: Record<DocumentType, LinkedDocument | null> = {
    rot: null,
    pop: null,
    ropa: null,
    evidence: null,
  };
  
  for (const docType of Object.keys(result) as DocumentType[]) {
    const [link] = await db
      .select()
      .from(mapeamentoGedDocuments)
      .where(
        and(
          eq(mapeamentoGedDocuments.rotId, rotId),
          eq(mapeamentoGedDocuments.documentType, docType),
          eq(mapeamentoGedDocuments.isLatest, 1)
        )
      )
      .limit(1);
    
    if (link) {
      const [gedDoc] = await db
        .select()
        .from(gedDocuments)
        .where(eq(gedDocuments.id, link.gedDocumentId));
      
      result[docType] = {
        id: link.id,
        rotId: link.rotId,
        gedDocumentId: link.gedDocumentId,
        documentType: link.documentType as DocumentType,
        version: link.version,
        isLatest: link.isLatest === 1,
        generatedAt: link.generatedAt || new Date().toISOString(),
        gedDocument: gedDoc,
      };
    }
  }
  
  return result;
}

/**
 * Conta documentos por tipo para um ROT
 */
export async function countDocumentsByType(
  rotId: number
): Promise<Record<DocumentType, number>> {
  const db = await getDb();
  
  const links = await db
    .select()
    .from(mapeamentoGedDocuments)
    .where(eq(mapeamentoGedDocuments.rotId, rotId));
  
  const result: Record<DocumentType, number> = {
    rot: 0,
    pop: 0,
    ropa: 0,
    evidence: 0,
  };
  
  for (const link of links) {
    const docType = link.documentType as DocumentType;
    if (docType in result) {
      result[docType]++;
    }
  }
  
  return result;
}

/**
 * Obtém estatísticas de documentos GED para uma organização
 */
export async function getOrganizationGedStats(
  organizationId: number
): Promise<{
  totalDocuments: number;
  byType: Record<DocumentType, number>;
  latestGeneratedAt: string | null;
}> {
  const db = await getDb();
  
  // Buscar todos os ROTs da organização
  const rots = await db
    .select({ id: rotOperations.id })
    .from(rotOperations)
    .where(eq(rotOperations.organizationId, organizationId));
  
  const rotIds = rots.map(r => r.id);
  
  if (rotIds.length === 0) {
    return {
      totalDocuments: 0,
      byType: { rot: 0, pop: 0, ropa: 0, evidence: 0 },
      latestGeneratedAt: null,
    };
  }
  
  // Buscar todos os documentos vinculados
  const links = await db
    .select()
    .from(mapeamentoGedDocuments)
    .orderBy(desc(mapeamentoGedDocuments.generatedAt));
  
  const filteredLinks = links.filter(l => rotIds.includes(l.rotId));
  
  const byType: Record<DocumentType, number> = {
    rot: 0,
    pop: 0,
    ropa: 0,
    evidence: 0,
  };
  
  for (const link of filteredLinks) {
    const docType = link.documentType as DocumentType;
    if (docType in byType) {
      byType[docType]++;
    }
  }
  
  return {
    totalDocuments: filteredLinks.length,
    byType,
    latestGeneratedAt: filteredLinks[0]?.generatedAt || null,
  };
}


// ==================== HISTÓRICO DE VERSÕES ====================

export interface VersionHistoryItem {
  id: number;
  version: number;
  generatedAt: string;
  generatedById: number | null;
  generatedByName?: string;
  isLatest: boolean;
  notes: string | null;
  gedDocument?: {
    id: number;
    name: string;
    fileUrl: string;
    fileSize: number;
  };
}

/**
 * Obtém histórico completo de versões de um tipo de documento
 */
export async function getVersionHistory(
  rotId: number,
  documentType: DocumentType
): Promise<VersionHistoryItem[]> {
  const db = await getDb();
  
  const links = await db
    .select()
    .from(mapeamentoGedDocuments)
    .where(
      and(
        eq(mapeamentoGedDocuments.rotId, rotId),
        eq(mapeamentoGedDocuments.documentType, documentType)
      )
    )
    .orderBy(desc(mapeamentoGedDocuments.version));
  
  const result: VersionHistoryItem[] = [];
  
  for (const link of links) {
    // Buscar documento GED
    const [gedDoc] = await db
      .select({
        id: gedDocuments.id,
        name: gedDocuments.name,
        fileUrl: gedDocuments.fileUrl,
        fileSize: gedDocuments.fileSize,
      })
      .from(gedDocuments)
      .where(eq(gedDocuments.id, link.gedDocumentId));
    
    // Buscar nome do usuário que gerou
    let generatedByName: string | undefined;
    if (link.generatedById) {
      const [user] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, link.generatedById));
      generatedByName = user?.name || undefined;
    }
    
    result.push({
      id: link.id,
      version: link.version,
      generatedAt: link.generatedAt || new Date().toISOString(),
      generatedById: link.generatedById,
      generatedByName,
      isLatest: link.isLatest === 1,
      notes: link.notes,
      gedDocument: gedDoc ? {
        id: gedDoc.id,
        name: gedDoc.name,
        fileUrl: gedDoc.fileUrl || "",
        fileSize: gedDoc.fileSize || 0,
      } : undefined,
    });
  }
  
  return result;
}

/**
 * Obtém conteúdo de uma versão específica para comparação
 */
export async function getVersionContent(
  versionId: number
): Promise<{ content: string; metadata: VersionHistoryItem } | null> {
  const db = await getDb();
  
  const [link] = await db
    .select()
    .from(mapeamentoGedDocuments)
    .where(eq(mapeamentoGedDocuments.id, versionId));
  
  if (!link) return null;
  
  const [gedDoc] = await db
    .select()
    .from(gedDocuments)
    .where(eq(gedDocuments.id, link.gedDocumentId));
  
  if (!gedDoc || !gedDoc.fileUrl) return null;
  
  // Buscar conteúdo do arquivo
  try {
    const response = await fetch(gedDoc.fileUrl);
    const content = await response.text();
    
    let generatedByName: string | undefined;
    if (link.generatedById) {
      const [user] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, link.generatedById));
      generatedByName = user?.name || undefined;
    }
    
    return {
      content,
      metadata: {
        id: link.id,
        version: link.version,
        generatedAt: link.generatedAt || new Date().toISOString(),
        generatedById: link.generatedById,
        generatedByName,
        isLatest: link.isLatest === 1,
        notes: link.notes,
        gedDocument: {
          id: gedDoc.id,
          name: gedDoc.name,
          fileUrl: gedDoc.fileUrl,
          fileSize: gedDoc.fileSize || 0,
        },
      },
    };
  } catch (error) {
    logger.error("Erro ao buscar conteúdo da versão:", error);
    return null;
  }
}

/**
 * Compara duas versões de um documento
 */
export async function compareVersions(
  versionId1: number,
  versionId2: number
): Promise<{
  version1: { content: string; metadata: VersionHistoryItem };
  version2: { content: string; metadata: VersionHistoryItem };
  differences: {
    added: number;
    removed: number;
    unchanged: number;
  };
} | null> {
  const v1 = await getVersionContent(versionId1);
  const v2 = await getVersionContent(versionId2);
  
  if (!v1 || !v2) return null;
  
  // Calcular diferenças simples (contagem de linhas)
  const lines1 = v1.content.split("\n");
  const lines2 = v2.content.split("\n");
  
  const set1 = new Set(lines1);
  const set2 = new Set(lines2);
  
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  
  for (const line of lines2) {
    if (set1.has(line)) {
      unchanged++;
    } else {
      added++;
    }
  }
  
  for (const line of lines1) {
    if (!set2.has(line)) {
      removed++;
    }
  }
  
  return {
    version1: v1,
    version2: v2,
    differences: { added, removed, unchanged },
  };
}

// ==================== SAVE BINARY DOCUMENT ====================

/**
 * Salva um documento binário (PDF, CSV, etc.) no GED.
 * Diferente de saveDocumentToGed que salva texto/markdown.
 */
export async function saveBinaryDocumentToGed(input: {
  rotId: number;
  organizationId: number;
  documentType: DocumentType;
  title: string;
  content: string; // ignorado para binários
  description?: string;
  userId: number;
  tags?: string[];
  bytes: Buffer;
  mimeType: string;
  fileExtension: string;
}): Promise<LinkedDocument> {
  logger.info(`[GED-BINARY] Salvando documento binário: ${input.documentType} rotId: ${input.rotId}`);
  const db = await getDb();

  // 1. Obter ou criar estrutura de pastas
  const rootFolder = await getOrCreateMapeamentoFolder(input.organizationId, input.userId);
  const subfolder = await getOrCreateSubfolder(
    input.organizationId,
    rootFolder.id,
    input.documentType,
    input.userId
  );

  // 2. Gerar nome de arquivo
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const sanitizedTitle = input.title.replace(/[^a-zA-Z0-9-]/g, "_").substring(0, 50);
  const fileName = `${input.documentType.toUpperCase()}_${sanitizedTitle}_${timestamp}.${input.fileExtension}`;
  const fileKey = `ged/organization/${input.organizationId}/mapeamentos/${input.documentType}/${timestamp}-${randomSuffix}-${fileName}`;

  // 3. Upload do binário para S3
  const { url } = await storagePut(fileKey, input.bytes, input.mimeType);

  // 4. Verificar versão anterior
  const [latestLink] = await db
    .select()
    .from(mapeamentoGedDocuments)
    .where(
      and(
        eq(mapeamentoGedDocuments.rotId, input.rotId),
        eq(mapeamentoGedDocuments.documentType, input.documentType)
      )
    )
    .orderBy(desc(mapeamentoGedDocuments.version))
    .limit(1);

  const newVersion = latestLink ? latestLink.version + 1 : 1;
  if (latestLink) {
    await db
      .update(mapeamentoGedDocuments)
      .set({ isLatest: 0 })
      .where(
        and(
          eq(mapeamentoGedDocuments.rotId, input.rotId),
          eq(mapeamentoGedDocuments.documentType, input.documentType)
        )
      );
  }

  // 5. Inserir documento no GED
  await db.insert(gedDocuments).values({
    name: input.title,
    description: input.description || `Documento ${input.documentType.toUpperCase()} gerado automaticamente`,
    spaceType: "organization",
    organizationId: input.organizationId,
    folderId: subfolder.id,
    fileName,
    fileKey,
    fileUrl: url,
    fileSize: input.bytes.length,
    mimeType: input.mimeType,
    fileExtension: input.fileExtension,
    version: newVersion,
    isLatestVersion: 1,
    status: "active",
    tags: input.tags || [input.documentType, "mapeamento", "lgpd", "automático"],
    linkedEntityType: "rot_operation",
    linkedEntityId: input.rotId,
    createdById: input.userId,
    lastModifiedById: input.userId,
  });

  const [createdGedDoc] = await db
    .select()
    .from(gedDocuments)
    .where(eq(gedDocuments.fileKey, fileKey));

  if (!createdGedDoc) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao criar documento binário no GED" });
  }

  // 6. Criar vinculação
  await db.insert(mapeamentoGedDocuments).values({
    rotId: input.rotId,
    gedDocumentId: createdGedDoc.id,
    documentType: input.documentType,
    version: newVersion,
    isLatest: 1,
    generatedById: input.userId,
    notes: `Versão ${newVersion} gerada automaticamente`,
  });

  const [createdLink] = await db
    .select()
    .from(mapeamentoGedDocuments)
    .where(
      and(
        eq(mapeamentoGedDocuments.rotId, input.rotId),
        eq(mapeamentoGedDocuments.gedDocumentId, createdGedDoc.id),
        eq(mapeamentoGedDocuments.documentType, input.documentType),
        eq(mapeamentoGedDocuments.version, newVersion)
      )
    );

  return {
    ...(createdLink as any),
    gedDocument: createdGedDoc,
  };
}

// ==================== NOTIFICAÇÕES ====================

import { notifyOwner } from "./_core/notification";
import { TRPCError } from '@trpc/server';

/**
 * Notifica o DPO sobre novo documento gerado
 */
export async function notifyDPOAboutNewDocument(
  organizationId: number,
  documentType: DocumentType,
  documentTitle: string,
  rotTitle: string
): Promise<boolean> {
  const db = await getDb();
  
  // Buscar informações da organização
  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, organizationId));
  
  const orgName = org?.name || "Organização";
  const typeLabels: Record<DocumentType, string> = {
    rot: "Registro de Operação de Tratamento (ROT)",
    pop: "Procedimento Operacional Padrão (POP)",
    ropa: "Relatório ROPA",
    evidence: "Evidência",
  };
  
  const title = `Novo Documento Gerado - ${typeLabels[documentType]}`;
  const content = `Um novo documento foi gerado e salvo no GED:

**Organização:** ${orgName}
**Tipo:** ${typeLabels[documentType]}
**Título:** ${documentTitle}
**Mapeamento:** ${rotTitle}
**Data:** ${new Date().toLocaleString("pt-BR")}

Acesse o sistema para visualizar o documento completo.`;
  
  try {
    return await notifyOwner({ title, content });
  } catch (error) {
    logger.error("Erro ao notificar DPO:", error);
    return false;
  }
}
