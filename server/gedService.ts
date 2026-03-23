/**
 * GED Service - Gerenciamento Eletrônico de Documentos
 * 
 * Este serviço gerencia:
 * - Armazenamento seguro de documentos no S3
 * - Controle de acesso por organização e nível de privilégio
 * - Estrutura de pastas padrão por organização
 * - Compartilhamento entre GED Seusdados e GED Cliente
 */

import * as dbModule from "./db";
import { extractInsertId } from "./db";
import { 
  gedFolders, 
  gedDocuments, 
  gedPermissions, 
  gedAccessLogs,
  gedFolderTemplates,
  users,
  organizations,
  unifiedAssessments,
  type GedFolder,
  type GedDocument,
  type InsertGedFolder,
  type InsertGedDocument,
  type InsertGedPermission,
  type InsertGedAccessLog
} from "../drizzle/schema";
import { eq, and, or, like, desc, asc, isNull, inArray } from "drizzle-orm";
import { storagePut, storageGet } from "./storage";
import { TRPCError } from '@trpc/server';

// Helper para obter instância do banco
const getDb = async () => {
  const db = await dbModule.getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  return db;
};

// ==================== TIPOS ====================

export type SpaceType = "organization" | "seusdados";
export type AccessLevel = "view" | "download" | "edit" | "delete" | "admin";
export type UserRole = "admin_global" | "consultor" | "sponsor" | "comite" | "gestor_area" | "lider_processo" | "respondente" | "terceiro";

export interface GedUser {
  id: number;
  role: UserRole;
  organizationId?: number | null;
}

export interface FolderWithChildren extends GedFolder {
  children?: FolderWithChildren[];
  documentCount?: number;
}

// ==================== ESTRUTURA DE PASTAS PADRÃO ====================

const DEFAULT_ORGANIZATION_FOLDERS = [
  { name: "Contratos", path: "/Contratos", icon: "FileText", color: "#5f29cc", sortOrder: 1 },
  { name: "Políticas", path: "/Políticas", icon: "Shield", color: "#0ea5e9", sortOrder: 2 },
  { name: "Políticas LGPD", path: "/Políticas/LGPD", icon: "Lock", color: "#10b981", sortOrder: 1 },
  { name: "Políticas Segurança", path: "/Políticas/Segurança", icon: "ShieldCheck", color: "#f59e0b", sortOrder: 2 },
  { name: "Evidências", path: "/Evidências", icon: "FileCheck", color: "#10b981", sortOrder: 3 },
  { name: "Relatórios", path: "/Relatórios", icon: "BarChart", color: "#f59e0b", sortOrder: 4 },
  { name: "Relatórios Conformidade", path: "/Relatórios/Conformidade", icon: "ClipboardCheck", color: "#5f29cc", sortOrder: 1 },
  { name: "Relatórios Due Diligence", path: "/Relatórios/Due Diligence", icon: "FileSearch", color: "#0ea5e9", sortOrder: 2 },
  { name: "Documentos Gerais", path: "/Documentos Gerais", icon: "Folder", color: "#6b7280", sortOrder: 5 },
];

const DEFAULT_SEUSDADOS_FOLDERS = [
  { name: "Templates", path: "/Templates", icon: "FileTemplate", color: "#5f29cc", sortOrder: 1 },
  { name: "Templates Contratos", path: "/Templates/Contratos", icon: "FileText", color: "#5f29cc", sortOrder: 1 },
  { name: "Templates Políticas", path: "/Templates/Políticas", icon: "Shield", color: "#0ea5e9", sortOrder: 2 },
  { name: "Templates Relatórios", path: "/Templates/Relatórios", icon: "BarChart", color: "#10b981", sortOrder: 3 },
  { name: "Cláusulas Modelo", path: "/Cláusulas Modelo", icon: "FileCode", color: "#0ea5e9", sortOrder: 2 },
  { name: "Cláusulas LGPD", path: "/Cláusulas Modelo/LGPD", icon: "Lock", color: "#10b981", sortOrder: 1 },
  { name: "Cláusulas Contratuais", path: "/Cláusulas Modelo/Contratuais", icon: "FileText", color: "#f59e0b", sortOrder: 2 },
  { name: "Documentos Internos", path: "/Documentos Internos", icon: "FolderLock", color: "#ef4444", sortOrder: 3 },
  { name: "Clientes", path: "/Clientes", icon: "Building2", color: "#10b981", sortOrder: 4 },
];

// ==================== CONTROLE DE ACESSO ====================

/**
 * Verifica se o usuário tem acesso a um espaço (GED)
 */
export function canAccessSpace(user: GedUser, spaceType: SpaceType, organizationId?: number | null): boolean {
  // Admin global e consultores podem acessar qualquer espaço
  if (user.role === "admin_global" || user.role === "consultor") {
    return true;
  }
  
  // Todos os perfis de cliente só podem acessar o GED da sua própria organização
  const clientRoles = ["sponsor", "comite", "gestor_area", "lider_processo", "respondente", "terceiro"];
  if (clientRoles.includes(user.role)) {
    if (spaceType === "seusdados") {
      return false; // Perfis de cliente não acessam GED Seusdados
    }
    return organizationId === user.organizationId;
  }
  
  return false;
}

/**
 * Verifica se o usuário tem um nível específico de acesso a um recurso
 */
export function hasAccessLevel(
  userAccessLevel: AccessLevel, 
  requiredLevel: AccessLevel
): boolean {
  const levels: AccessLevel[] = ["view", "download", "edit", "delete", "admin"];
  const userIndex = levels.indexOf(userAccessLevel);
  const requiredIndex = levels.indexOf(requiredLevel);
  return userIndex >= requiredIndex;
}

/**
 * Obtém o nível de acesso padrão baseado no papel do usuário
 */
export function getDefaultAccessLevel(user: GedUser, spaceType: SpaceType): AccessLevel {
  if (user.role === "admin_global") {
    return "admin";
  }
  if (user.role === "consultor" || user.role === "admin_global" || user.role === "consultor") {
    return spaceType === "seusdados" ? "admin" : "edit";
  }
  // Perfis de cliente podem editar no GED da própria organização
  const clientRoles = ["sponsor", "comite", "gestor_area", "lider_processo", "respondente", "terceiro"];
  if (clientRoles.includes(user.role)) {
    if (spaceType === "organization") {
      return "edit";
    }
    // Clientes não acessam GED Seusdados
    return "download";
  }
  return "download";
}

// ==================== GERENCIAMENTO DE PASTAS ====================

/**
 * Cria a estrutura de pastas padrão para uma organização
 */
export async function createDefaultFoldersForOrganization(
  organizationId: number, 
  createdById: number
): Promise<void> {
  const folderMap = new Map<string, number>();
  
  for (const template of DEFAULT_ORGANIZATION_FOLDERS) {
    const pathParts = template.path.split("/").filter(Boolean);
    const parentPath = "/" + pathParts.slice(0, -1).join("/");
    const parentFolderId = parentPath === "/" ? null : folderMap.get(parentPath);
    
    const [folder] = await (await getDb()).insert(gedFolders).values({
      name: template.name,
      spaceType: "organization",
      organizationId,
      parentFolderId: parentFolderId || null,
      path: template.path,
      depth: pathParts.length - 1,
      isSystemFolder: 1,
      icon: template.icon,
      color: template.color,
      sortOrder: template.sortOrder,
      createdById,
    }) as any;
    const folderId = extractInsertId(folder);
    
    folderMap.set(template.path, folderId);
  }
  
  // Criar também a pasta do cliente no GED Seusdados
  const org = await (await getDb()).select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
  if (org.length > 0) {
    const clientFolderPath = `/Clientes/${org[0].name}`;
    await (await getDb()).insert(gedFolders).values({
      name: org[0].name,
      spaceType: "seusdados",
      organizationId, // Referência ao cliente
      parentFolderId: null, // Será atualizado depois
      path: clientFolderPath,
      depth: 1,
      isSystemFolder: 1,
      icon: "Building2",
      color: org[0].primaryColor || "#5f29cc",
      sortOrder: 0,
      createdById,
    });
  }
}

/**
 * Cria a estrutura de pastas padrão para o GED Seusdados
 */
export async function createDefaultSeusdadosFolders(createdById: number): Promise<void> {
  const folderMap = new Map<string, number>();
  
  for (const template of DEFAULT_SEUSDADOS_FOLDERS) {
    const pathParts = template.path.split("/").filter(Boolean);
    const parentPath = "/" + pathParts.slice(0, -1).join("/");
    const parentFolderId = parentPath === "/" ? null : folderMap.get(parentPath);
    
    const [folder] = await (await getDb()).insert(gedFolders).values({
      name: template.name,
      spaceType: "seusdados",
      organizationId: null,
      parentFolderId: parentFolderId || null,
      path: template.path,
      depth: pathParts.length - 1,
      isSystemFolder: 1,
      icon: template.icon,
      color: template.color,
      sortOrder: template.sortOrder,
      createdById,
    }) as any;
    const folderId = extractInsertId(folder);
    
    folderMap.set(template.path, folderId);
  }
}

/**
 * Lista pastas de um espaço
 */
export async function listFolders(
  user: GedUser,
  spaceType: SpaceType,
  organizationId?: number | null,
  parentFolderId?: number | null
): Promise<GedFolder[]> {
  if (!canAccessSpace(user, spaceType, organizationId)) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Acesso negado a este espaço' });
  }
  
  const conditions = [eq(gedFolders.spaceType, spaceType)];
  
  if (spaceType === "organization" && organizationId) {
    conditions.push(eq(gedFolders.organizationId, organizationId));
  }
  
  if (parentFolderId !== undefined) {
    if (parentFolderId === null) {
      conditions.push(isNull(gedFolders.parentFolderId));
    } else {
      conditions.push(eq(gedFolders.parentFolderId, parentFolderId));
    }
  }
  
  return (await getDb()).select()
    .from(gedFolders)
    .where(and(...conditions))
    .orderBy(asc(gedFolders.sortOrder), asc(gedFolders.name));
}

/**
 * Cria uma nova pasta
 */
export async function createFolder(
  user: GedUser,
  data: {
    name: string;
    description?: string;
    spaceType: SpaceType;
    organizationId?: number | null;
    parentFolderId?: number | null;
    icon?: string;
    color?: string;
  }
): Promise<GedFolder> {
  if (!canAccessSpace(user, data.spaceType, data.organizationId)) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Acesso negado a este espaço' });
  }
  
  // Verificar permissão de edição
  const accessLevel = getDefaultAccessLevel(user, data.spaceType);
  if (!hasAccessLevel(accessLevel, "edit")) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Permissão insuficiente para criar pastas' });
  }
  
  // Calcular path e depth
  let path = "/" + data.name;
  let depth = 0;
  
  if (data.parentFolderId) {
    const parent = await (await getDb()).select()
      .from(gedFolders)
      .where(eq(gedFolders.id, data.parentFolderId))
      .limit(1);
    
    if (parent.length > 0) {
      path = parent[0].path + "/" + data.name;
      depth = parent[0].depth + 1;
    }
  }
  
  const [folder] = await (await getDb()).insert(gedFolders).values({
    name: data.name,
    description: data.description,
    spaceType: data.spaceType,
    organizationId: data.organizationId,
    parentFolderId: data.parentFolderId,
    path,
    depth,
    isSystemFolder: 0,
    icon: data.icon,
    color: data.color,
    sortOrder: 0,
    createdById: user.id,
  }) as any;
  const folderId = extractInsertId(folder);
  
  const [created] = await (await getDb()).select()
    .from(gedFolders)
    .where(eq(gedFolders.id, folderId));
  
  return created;
}

/**
 * Obtém uma pasta pelo ID
 */
export async function getFolderById(
  user: GedUser,
  folderId: number
): Promise<GedFolder | null> {
  const [folder] = await (await getDb()).select()
    .from(gedFolders)
    .where(eq(gedFolders.id, folderId))
    .limit(1);
  
  if (!folder) return null;
  
  if (!canAccessSpace(user, folder.spaceType, folder.organizationId)) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Acesso negado a esta pasta' });
  }
  
  return folder;
}

/**
 * Exclui uma pasta (se não for do sistema)
 */
export async function deleteFolder(
  user: GedUser,
  folderId: number
): Promise<void> {
  const folder = await getFolderById(user, folderId);
  
  if (!folder) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Pasta não encontrada' });
  }
  
  if (folder.isSystemFolder) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Não é possível excluir pastas do sistema' });
  }
  
  const accessLevel = getDefaultAccessLevel(user, folder.spaceType);
  if (!hasAccessLevel(accessLevel, "delete")) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Permissão insuficiente para excluir pastas' });
  }
  
  // Verificar se há documentos ou subpastas
  const subfolders = await (await getDb()).select()
    .from(gedFolders)
    .where(eq(gedFolders.parentFolderId, folderId));
  
  if (subfolders.length > 0) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Não é possível excluir pasta com subpastas' });
  }
  
  const docs = await (await getDb()).select()
    .from(gedDocuments)
    .where(eq(gedDocuments.folderId, folderId));
  
  if (docs.length > 0) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Não é possível excluir pasta com documentos' });
  }
  
  await (await getDb()).delete(gedFolders).where(eq(gedFolders.id, folderId));
}

// ==================== GERENCIAMENTO DE DOCUMENTOS ====================

/**
 * Faz upload de um documento
 */
export async function uploadDocument(
  user: GedUser,
  data: {
    name: string;
    description?: string;
    folderId: number;
    file: Buffer;
    fileName: string;
    mimeType: string;
    tags?: string[];
    linkedEntityType?: string;
    linkedEntityId?: number;
  }
): Promise<GedDocument> {
  console.log('[uploadDocument] Iniciando upload. folderId:', data.folderId, 'user:', JSON.stringify(user));
  
  // Obter pasta para validar acesso
  const folder = await getFolderById(user, data.folderId);
  console.log('[uploadDocument] Pasta obtida:', JSON.stringify(folder));
  
  if (!folder) {
    console.error('[uploadDocument] Pasta não encontrada para folderId:', data.folderId);
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Pasta não encontrada' });
  }
  
  const accessLevel = getDefaultAccessLevel(user, folder.spaceType);
  if (!hasAccessLevel(accessLevel, "edit")) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Permissão insuficiente para fazer upload' });
  }
  
  // Gerar chave única para o arquivo
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const extension = data.fileName.split(".").pop() || "";
  const sanitizedName = data.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const fileKey = `ged/${folder.spaceType}/${folder.organizationId || "seusdados"}/${timestamp}-${randomSuffix}-${sanitizedName}`;
  
  // Upload para S3
  const { url } = await storagePut(fileKey, data.file, data.mimeType);
  
  // Inserir no banco
  await (await getDb()).insert(gedDocuments).values({
    name: data.name,
    description: data.description,
    spaceType: folder.spaceType,
    organizationId: folder.organizationId,
    folderId: data.folderId,
    fileName: data.fileName,
    fileKey,
    fileUrl: url,
    fileSize: data.file.length,
    mimeType: data.mimeType,
    fileExtension: extension,
    version: 1,
    isLatestVersion: 1,
    status: "active",
    tags: data.tags || [],
    linkedEntityType: data.linkedEntityType,
    linkedEntityId: data.linkedEntityId,
    createdById: user.id,
    lastModifiedById: user.id,
  });
  
  // Buscar o documento recém-criado pelo fileKey (mais confiável)
  const [created] = await (await getDb()).select()
    .from(gedDocuments)
    .where(eq(gedDocuments.fileKey, fileKey))
    .limit(1);
  
  if (!created) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Documento criado mas não encontrado' });
  }
  
  // Registrar log de acesso
  await logAccess(user.id, "document", created.id, "upload");
  
  return created;
}

/**
 * Lista documentos de uma pasta
 */
export async function listDocuments(
  user: GedUser,
  folderId: number
): Promise<GedDocument[]> {
  const folder = await getFolderById(user, folderId);
  if (!folder) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Pasta não encontrada' });
  }
  
  const docs = await (await getDb()).select()
    .from(gedDocuments)
    .where(and(
      eq(gedDocuments.folderId, folderId),
      eq(gedDocuments.isLatestVersion, 1),
      eq(gedDocuments.status, "active")
    ))
    .orderBy(desc(gedDocuments.createdAt));
  
  // Se for cliente acessando GED da organização, filtrar docs compartilhados do Seusdados
  const isClientRole = ['sponsor', 'comite', 'lider_processo', 'gestor_area', 'terceiro'].includes(user.role);
  if (isClientRole && folder.spaceType === "organization" && folder.organizationId) {
    // Buscar também docs compartilhados do GED Seusdados
    const orgId = folder.organizationId;
    const sharedDocs = await (await getDb()).select()
      .from(gedDocuments)
      .where(and(
        eq(gedDocuments.spaceType, "seusdados"),
        eq(gedDocuments.organizationId, orgId),
        eq(gedDocuments.isSharedWithClient, 1),
        eq(gedDocuments.isLatestVersion, 1),
        eq(gedDocuments.status, "active")
      ));
    
    return [...docs, ...sharedDocs];
  }
  
  return docs;
}

/**
 * Obtém um documento pelo ID
 */
export async function getDocumentById(
  user: GedUser,
  documentId: number
): Promise<GedDocument | null> {
  const [doc] = await (await getDb()).select()
    .from(gedDocuments)
    .where(eq(gedDocuments.id, documentId))
    .limit(1);
  
  if (!doc) return null;
  
  // Verificar acesso
  if (!canAccessSpace(user, doc.spaceType, doc.organizationId)) {
    // Verificar se é doc compartilhado
    if (doc.isSharedWithClient && user.organizationId === doc.organizationId) {
      return doc;
    }
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Acesso negado a este documento' });
  }
  
  return doc;
}

/**
 * Gera URL de download para um documento
 */
export async function getDocumentDownloadUrl(
  user: GedUser,
  documentId: number
): Promise<string> {
  const doc = await getDocumentById(user, documentId);
  if (!doc) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Documento não encontrado' });
  }
  
  // Registrar log de acesso
  await logAccess(user.id, "document", documentId, "download");
  
  // Gerar URL
  const { url } = await storageGet(doc.fileKey);
  return url;
}

/**
 * Compartilha um documento do GED Seusdados com o cliente
 */
export async function shareDocumentWithClient(
  user: GedUser,
  documentId: number,
  share: boolean
): Promise<GedDocument> {
  // Apenas consultores e admin podem compartilhar
  const isSeusdadosRole = ['admin_global', 'consultor'].includes(user.role);
  if (!isSeusdadosRole) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Apenas consultores podem compartilhar documentos' });
  }
  
  const [doc] = await (await getDb()).select()
    .from(gedDocuments)
    .where(eq(gedDocuments.id, documentId))
    .limit(1);
  
  if (!doc) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Documento não encontrado' });
  }
  
  if (doc.spaceType !== "seusdados") {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Apenas documentos do GED Seusdados podem ser compartilhados' });
  }
  
  await (await getDb()).update(gedDocuments)
    .set({
      isSharedWithClient: share ? 1 : 0,
      sharedAt: share ? new Date().toISOString() : null,
      sharedById: share ? user.id : null,
    })
    .where(eq(gedDocuments.id, documentId));
  
  // Registrar log
  await logAccess(user.id, "document", documentId, "share", { shared: share });
  
  const [updated] = await (await getDb()).select()
    .from(gedDocuments)
    .where(eq(gedDocuments.id, documentId));
  
  return updated;
}

/**
 * Exclui um documento (soft delete)
 */
export async function deleteDocument(
  user: GedUser,
  documentId: number
): Promise<void> {
  const doc = await getDocumentById(user, documentId);
  if (!doc) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Documento não encontrado' });
  }
  
  const accessLevel = getDefaultAccessLevel(user, doc.spaceType);
  if (!hasAccessLevel(accessLevel, "delete")) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Permissão insuficiente para excluir documentos' });
  }
  
  await (await getDb()).update(gedDocuments)
    .set({
      status: "deleted",
      deletedAt: new Date().toISOString(),
    })
    .where(eq(gedDocuments.id, documentId));
  
  await logAccess(user.id, "document", documentId, "delete");
}

/**
 * Move um documento para outra pasta
 */
export async function moveDocument(
  user: GedUser,
  documentId: number,
  targetFolderId: number
): Promise<GedDocument> {
  const doc = await getDocumentById(user, documentId);
  if (!doc) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Documento não encontrado' });
  }
  
  const targetFolder = await getFolderById(user, targetFolderId);
  if (!targetFolder) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Pasta de destino não encontrada' });
  }
  
  // Verificar se são do mesmo espaço
  if (doc.spaceType !== targetFolder.spaceType) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Não é possível mover documentos entre espaços diferentes' });
  }
  
  const accessLevel = getDefaultAccessLevel(user, doc.spaceType);
  if (!hasAccessLevel(accessLevel, "edit")) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Permissão insuficiente para mover documentos' });
  }
  
  await (await getDb()).update(gedDocuments)
    .set({
      folderId: targetFolderId,
      lastModifiedById: user.id,
    })
    .where(eq(gedDocuments.id, documentId));
  
  await logAccess(user.id, "document", documentId, "move", { targetFolderId });
  
  const [updated] = await (await getDb()).select()
    .from(gedDocuments)
    .where(eq(gedDocuments.id, documentId));
  
  return updated;
}

/**
 * Busca documentos por termo
 */
export async function searchDocuments(
  user: GedUser,
  spaceType: SpaceType,
  organizationId: number | null,
  searchTerm: string
): Promise<GedDocument[]> {
  if (!canAccessSpace(user, spaceType, organizationId)) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Acesso negado a este espaço' });
  }
  
  const conditions = [
    eq(gedDocuments.spaceType, spaceType),
    eq(gedDocuments.isLatestVersion, 1),
    eq(gedDocuments.status, "active"),
    or(
      like(gedDocuments.name, `%${searchTerm}%`),
      like(gedDocuments.fileName, `%${searchTerm}%`),
      like(gedDocuments.description, `%${searchTerm}%`)
    )
  ];
  
  if (spaceType === "organization" && organizationId) {
    conditions.push(eq(gedDocuments.organizationId, organizationId));
  }
  
  return (await getDb()).select()
    .from(gedDocuments)
    .where(and(...conditions))
    .orderBy(desc(gedDocuments.createdAt))
    .limit(50);
}

// ==================== LOGS DE ACESSO ====================

export async function logAccess(
  userId: number,
  resourceType: "folder" | "document",
  resourceId: number,
  action: "view" | "download" | "upload" | "edit" | "delete" | "share" | "move" | "rename",
  details?: Record<string, unknown>
): Promise<void> {
  await (await getDb()).insert(gedAccessLogs).values({
    resourceType,
    resourceId,
    userId,
    action,
    details: details || null,
  });
}

// ==================== ESTATÍSTICAS ====================

/**
 * Obtém estatísticas do GED de uma organização
 */
export async function getGedStats(
  user: GedUser,
  spaceType: SpaceType,
  organizationId?: number | null
): Promise<{
  totalFolders: number;
  totalDocuments: number;
  totalSize: number;
  recentDocuments: GedDocument[];
}> {
  if (!canAccessSpace(user, spaceType, organizationId)) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Acesso negado a este espaço' });
  }
  
  const folderConditions = [eq(gedFolders.spaceType, spaceType)];
  const docConditions = [
    eq(gedDocuments.spaceType, spaceType),
    eq(gedDocuments.isLatestVersion, 1),
    eq(gedDocuments.status, "active")
  ];
  
  if (spaceType === "organization" && organizationId) {
    folderConditions.push(eq(gedFolders.organizationId, organizationId));
    docConditions.push(eq(gedDocuments.organizationId, organizationId));
  }
  
  const folders = await (await getDb()).select()
    .from(gedFolders)
    .where(and(...folderConditions));
  
  const docs = await (await getDb()).select()
    .from(gedDocuments)
    .where(and(...docConditions));
  
  const recentDocs = await (await getDb()).select()
    .from(gedDocuments)
    .where(and(...docConditions))
    .orderBy(desc(gedDocuments.createdAt))
    .limit(5);
  
  const totalSize = docs.reduce((sum: number, doc: GedDocument) => sum + (doc.fileSize || 0), 0);
  
  return {
    totalFolders: folders.length,
    totalDocuments: docs.length,
    totalSize,
    recentDocuments: recentDocs,
  };
}


/**
 * Busca ou cria uma pasta no GED do cliente
 * Usado por consultores para fazer upload direto no GED de uma organização
 */
export async function getOrCreateClientFolder(
  user: GedUser,
  organizationId: number,
  folderName: string
): Promise<GedFolder> {
  // Apenas consultores e admins podem usar esta função
  if (user.role !== 'admin_global' && user.role !== 'consultor') {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Apenas consultores podem acessar o GED de clientes' });
  }

  // Buscar pasta existente com o nome especificado
  const existingFolders = await (await getDb()).select()
    .from(gedFolders)
    .where(and(
      eq(gedFolders.spaceType, 'organization'),
      eq(gedFolders.organizationId, organizationId),
      eq(gedFolders.name, folderName),
      isNull(gedFolders.parentFolderId)
    ))
    .limit(1);

  if (existingFolders.length > 0) {
    return existingFolders[0];
  }

  // Criar a pasta se não existir
  const db = await getDb();
  
  // Usar insert simples e depois buscar pelo nome (mais confiável que $returningId)
  await db.insert(gedFolders)
    .values({
      name: folderName,
      description: `Pasta ${folderName} criada automaticamente`,
      spaceType: 'organization',
      organizationId,
      parentFolderId: null,
      path: `/${folderName}`,
      depth: 0,
      isSystemFolder: 0,
      icon: folderName === 'Contratos' ? 'FileText' : 'Folder',
      color: folderName === 'Contratos' ? '#10b981' : null,
      sortOrder: 100,
      createdById: user.id,
    });

  // Buscar a pasta recém-criada pelo nome (mais confiável)
  const newFolder = await db.select()
    .from(gedFolders)
    .where(and(
      eq(gedFolders.spaceType, 'organization'),
      eq(gedFolders.organizationId, organizationId),
      eq(gedFolders.name, folderName),
      isNull(gedFolders.parentFolderId)
    ))
    .limit(1);

  if (!newFolder[0]) {
    console.error('[GED] Erro ao criar pasta - pasta não encontrada após insert');
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Pasta criada mas não encontrada' });
  }

  return newFolder[0];
}


// Verificar se usuário pode editar pasta
export function canEditFolder(user: GedUser, folder: any): boolean {
  // Admin global e consultor podem editar qualquer pasta
  if (user.role === 'admin_global' || user.role === 'consultor') {
    return true;
  }
  
  // Cliente só pode editar pastas da sua organização (exceto pastas de sistema)
  const isSeusdadosRole = ['admin_global', 'consultor'].includes(user.role);
  if (!isSeusdadosRole) {
    if (folder.isSystemFolder) {
      return false;
    }
    return folder.organizationId === user.organizationId;
  }
  
  return true;
}

// Verificar se usuário pode editar documento
export function canEditDocument(user: GedUser, document: any): boolean {
  // Admin global e consultor podem editar qualquer documento
  if (user.role === 'admin_global' || user.role === 'consultor') {
    return true;
  }
  
  // Cliente só pode editar documentos da sua organização
  const isSeusdadosRole = ['admin_global', 'consultor'].includes(user.role);
  if (!isSeusdadosRole) {
    return document.organizationId === user.organizationId;
  }
  
  return true;
}

// Renomear pasta
export async function renameFolder(folderId: number, newName: string): Promise<void> {
  await (await getDb()).update(gedFolders)
    .set({ 
      name: newName,
      updatedAt: new Date().toISOString()
    })
    .where(eq(gedFolders.id, folderId));
}

// Renomear documento
export async function renameDocument(documentId: number, newName: string): Promise<void> {
  await (await getDb()).update(gedDocuments)
    .set({ 
      name: newName,
      updatedAt: new Date().toISOString()
    })
    .where(eq(gedDocuments.id, documentId));
}


// Listar versões de um documento
export async function listDocumentVersions(
  user: GedUser,
  documentId: number
): Promise<any[]> {
  // Primeiro, obter o documento atual para verificar acesso
  const currentDoc = await getDocumentById(user, documentId);
  if (!currentDoc) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Documento não encontrado' });
  }
  
  // Buscar todas as versões do documento (incluindo versões anteriores)
  const versions = await (await getDb()).select()
    .from(gedDocuments)
    .where(
      or(
        eq(gedDocuments.id, documentId),
        eq(gedDocuments.previousVersionId, documentId)
      )
    )
    .orderBy(desc(gedDocuments.version));
  
  // Se o documento atual tem previousVersionId, buscar a cadeia completa
  if (currentDoc.previousVersionId) {
    const allVersions = await (await getDb()).select()
      .from(gedDocuments)
      .where(
        or(
          eq(gedDocuments.id, currentDoc.previousVersionId),
          eq(gedDocuments.previousVersionId, currentDoc.previousVersionId)
        )
      )
      .orderBy(desc(gedDocuments.version));
    
    // Combinar e remover duplicatas
    const combined = [...versions, ...allVersions];
    const uniqueVersions = combined.filter((v, i, arr) => 
      arr.findIndex(x => x.id === v.id) === i
    );
    
    return uniqueVersions.sort((a, b) => b.version - a.version);
  }
  
  return versions;
}

// Restaurar versão anterior de um documento
export async function restoreDocumentVersion(
  user: GedUser,
  documentId: number,
  versionId: number
): Promise<void> {
  // Verificar se a versão existe
  const [versionToRestore] = await (await getDb()).select()
    .from(gedDocuments)
    .where(eq(gedDocuments.id, versionId))
    .limit(1);
  
  if (!versionToRestore) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Versão não encontrada' });
  }
  
  // Obter documento atual
  const currentDoc = await getDocumentById(user, documentId);
  if (!currentDoc) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Documento não encontrado' });
  }
  
  // Marcar versão atual como não mais a última
  await (await getDb()).update(gedDocuments)
    .set({isLatestVersion: 0, })
    .where(eq(gedDocuments.id, documentId));
  
  // Criar nova versão baseada na versão a restaurar
  const newVersion = currentDoc.version + 1;
  
  await (await getDb()).insert(gedDocuments).values({
    name: versionToRestore.name,
    description: versionToRestore.description,
    folderId: currentDoc.folderId,
    spaceType: currentDoc.spaceType,
    organizationId: currentDoc.organizationId,
    fileName: versionToRestore.fileName,
    fileKey: versionToRestore.fileKey,
    fileUrl: versionToRestore.fileUrl,
    fileSize: versionToRestore.fileSize,
    mimeType: versionToRestore.mimeType,
    fileExtension: versionToRestore.fileExtension,
    version: newVersion,
    previousVersionId: documentId,
    isLatestVersion: 1,
    status: 'active',
    isSharedWithClient: currentDoc.isSharedWithClient,
    tags: versionToRestore.tags,
    metadata: versionToRestore.metadata,
    linkedEntityType: currentDoc.linkedEntityType,
    linkedEntityId: currentDoc.linkedEntityId,
    createdById: user.id,
    lastModifiedById: user.id,
  });
}


// ==================== ESTRUTURA GED DUE DILIGENCE DE TERCEIROS ====================

/**
 * Estrutura de pastas padrão para Due Diligence de Terceiros
 */
const DUE_DILIGENCE_FOLDER_STRUCTURE = [
  { name: "Contratos Analisados", path: "/Contratos Analisados", icon: "FileSearch", color: "#5f29cc", sortOrder: 1 },
  { name: "Relatórios de Análise", path: "/Relatórios de Análise", icon: "FileText", color: "#0ea5e9", sortOrder: 2 },
  { name: "Cláusulas Sugeridas", path: "/Cláusulas Sugeridas", icon: "FileCode", color: "#10b981", sortOrder: 3 },
  { name: "DPAs Gerados", path: "/DPAs Gerados", icon: "Shield", color: "#f59e0b", sortOrder: 4 },
  { name: "Histórico de Versões", path: "/Histórico de Versões", icon: "History", color: "#6b7280", sortOrder: 5 },
];

/**
 * Cria a estrutura de pastas de Due Diligence para uma organização no GED Seusdados
 */
export async function createDueDiligenceFoldersForOrganization(
  organizationId: number,
  organizationName: string,
  createdById: number
): Promise<{ seusdadosFolderId: number; clientFolderId: number }> {
  const db = await getDb();
  
  // 1. Buscar ou criar pasta "Clientes" no GED Seusdados
  let clientesFolder = await db.select()
    .from(gedFolders)
    .where(and(
      eq(gedFolders.spaceType, 'seusdados'),
      eq(gedFolders.name, 'Clientes'),
      isNull(gedFolders.parentFolderId)
    ))
    .limit(1);
  
  let clientesFolderId: number;
  if (clientesFolder.length === 0) {
    const [newFolder] = await db.insert(gedFolders).values({
      name: 'Clientes',
      spaceType: 'seusdados',
      organizationId: null,
      parentFolderId: null,
      path: '/Clientes',
      depth: 0,
      isSystemFolder: 1,
      icon: 'Building2',
      color: '#10b981',
      sortOrder: 4,
      createdById,
    }) as any;
    clientesFolderId = extractInsertId(newFolder);
  } else {
    clientesFolderId = clientesFolder[0].id;
  }
  
  // 2. Criar pasta da organização dentro de "Clientes"
  let orgFolder = await db.select()
    .from(gedFolders)
    .where(and(
      eq(gedFolders.spaceType, 'seusdados'),
      eq(gedFolders.organizationId, organizationId),
      eq(gedFolders.parentFolderId, clientesFolderId)
    ))
    .limit(1);
  
  let orgFolderId: number;
  if (orgFolder.length === 0) {
    const [newOrgFolder] = await db.insert(gedFolders).values({
      name: organizationName,
      spaceType: 'seusdados',
      organizationId,
      parentFolderId: clientesFolderId,
      path: `/Clientes/${organizationName}`,
      depth: 1,
      isSystemFolder: 1,
      icon: 'Building2',
      color: '#5f29cc',
      sortOrder: 0,
      createdById,
    }) as any;
    orgFolderId = extractInsertId(newOrgFolder);
  } else {
    orgFolderId = orgFolder[0].id;
  }
  
  // 3. Criar pasta "Due Diligence de Terceiros" dentro da organização
  let dueDiligenceFolder = await db.select()
    .from(gedFolders)
    .where(and(
      eq(gedFolders.spaceType, 'seusdados'),
      eq(gedFolders.name, 'Due Diligence de Terceiros'),
      eq(gedFolders.parentFolderId, orgFolderId)
    ))
    .limit(1);
  
  let dueDiligenceFolderId: number;
  if (dueDiligenceFolder.length === 0) {
    const [newDDFolder] = await db.insert(gedFolders).values({
      name: 'Due Diligence de Terceiros',
      spaceType: 'seusdados',
      organizationId,
      parentFolderId: orgFolderId,
      path: `/Clientes/${organizationName}/Due Diligence de Terceiros`,
      depth: 2,
      isSystemFolder: 1,
      icon: 'FileSearch',
      color: '#0ea5e9',
      sortOrder: 1,
      createdById,
    }) as any;
    dueDiligenceFolderId = extractInsertId(newDDFolder);
  } else {
    dueDiligenceFolderId = dueDiligenceFolder[0].id;
  }
  
  // 4. Criar subpastas da estrutura de Due Diligence
  for (const template of DUE_DILIGENCE_FOLDER_STRUCTURE) {
    const existingSubfolder = await db.select()
      .from(gedFolders)
      .where(and(
        eq(gedFolders.spaceType, 'seusdados'),
        eq(gedFolders.name, template.name),
        eq(gedFolders.parentFolderId, dueDiligenceFolderId)
      ))
      .limit(1);
    
    if (existingSubfolder.length === 0) {
      await db.insert(gedFolders).values({
        name: template.name,
        spaceType: 'seusdados',
        organizationId,
        parentFolderId: dueDiligenceFolderId,
        path: `/Clientes/${organizationName}/Due Diligence de Terceiros${template.path}`,
        depth: 3,
        isSystemFolder: 1,
        icon: template.icon,
        color: template.color,
        sortOrder: template.sortOrder,
        createdById,
      });
    }
  }
  
  // 5. Criar réplica no GED da organização cliente
  let clientDDFolder = await db.select()
    .from(gedFolders)
    .where(and(
      eq(gedFolders.spaceType, 'organization'),
      eq(gedFolders.organizationId, organizationId),
      eq(gedFolders.name, 'Due Diligence de Terceiros'),
      isNull(gedFolders.parentFolderId)
    ))
    .limit(1);
  
  let clientDDFolderId: number;
  if (clientDDFolder.length === 0) {
    const [newClientDDFolder] = await db.insert(gedFolders).values({
      name: 'Due Diligence de Terceiros',
      description: 'Documentos de análise de contratos e due diligence de terceiros',
      spaceType: 'organization',
      organizationId,
      parentFolderId: null,
      path: '/Due Diligence de Terceiros',
      depth: 0,
      isSystemFolder: 1,
      icon: 'FileSearch',
      color: '#0ea5e9',
      sortOrder: 6,
      createdById,
    }) as any;
    clientDDFolderId = extractInsertId(newClientDDFolder);
  } else {
    clientDDFolderId = clientDDFolder[0].id;
  }
  
  // 6. Criar subpastas no GED do cliente (apenas as relevantes para o cliente)
  const clientSubfolders = [
    { name: "Contratos Analisados", icon: "FileSearch", color: "#5f29cc", sortOrder: 1 },
    { name: "Relatórios Finais", icon: "FileText", color: "#0ea5e9", sortOrder: 2 },
    { name: "DPAs e Cláusulas", icon: "Shield", color: "#10b981", sortOrder: 3 },
  ];
  
  for (const subfolder of clientSubfolders) {
    const existingSubfolder = await db.select()
      .from(gedFolders)
      .where(and(
        eq(gedFolders.spaceType, 'organization'),
        eq(gedFolders.organizationId, organizationId),
        eq(gedFolders.name, subfolder.name),
        eq(gedFolders.parentFolderId, clientDDFolderId)
      ))
      .limit(1);
    
    if (existingSubfolder.length === 0) {
      await db.insert(gedFolders).values({
        name: subfolder.name,
        spaceType: 'organization',
        organizationId,
        parentFolderId: clientDDFolderId,
        path: `/Due Diligence de Terceiros/${subfolder.name}`,
        depth: 1,
        isSystemFolder: 1,
        icon: subfolder.icon,
        color: subfolder.color,
        sortOrder: subfolder.sortOrder,
        createdById,
      });
    }
  }
  
  return {
    seusdadosFolderId: dueDiligenceFolderId,
    clientFolderId: clientDDFolderId,
  };
}

/**
 * Salva documento de análise de contrato no GED
 */
export async function saveContractAnalysisToGed(
  user: GedUser,
  organizationId: number,
  organizationName: string,
  analysisId: number,
  contractName: string,
  documentType: 'contract' | 'report' | 'clause' | 'dpa',
  file: Buffer,
  fileName: string,
  mimeType: string,
  version?: number
): Promise<{ seusdadosDocId: number; clientDocId?: number }> {
  // Garantir que a estrutura de pastas existe
  const folders = await createDueDiligenceFoldersForOrganization(
    organizationId,
    organizationName,
    user.id
  );
  
  const db = await getDb();
  
  // Determinar pasta de destino baseado no tipo de documento
  let seusdadosSubfolderName: string;
  let clientSubfolderName: string;
  
  switch (documentType) {
    case 'contract':
      seusdadosSubfolderName = 'Contratos Analisados';
      clientSubfolderName = 'Contratos Analisados';
      break;
    case 'report':
      seusdadosSubfolderName = 'Relatórios de Análise';
      clientSubfolderName = 'Relatórios Finais';
      break;
    case 'clause':
      seusdadosSubfolderName = 'Cláusulas Sugeridas';
      clientSubfolderName = 'DPAs e Cláusulas';
      break;
    case 'dpa':
      seusdadosSubfolderName = 'DPAs Gerados';
      clientSubfolderName = 'DPAs e Cláusulas';
      break;
    default:
      seusdadosSubfolderName = 'Contratos Analisados';
      clientSubfolderName = 'Contratos Analisados';
  }
  
  // Buscar pasta de destino no GED Seusdados
  const seusdadosSubfolder = await db.select()
    .from(gedFolders)
    .where(and(
      eq(gedFolders.spaceType, 'seusdados'),
      eq(gedFolders.organizationId, organizationId),
      eq(gedFolders.name, seusdadosSubfolderName),
      eq(gedFolders.parentFolderId, folders.seusdadosFolderId)
    ))
    .limit(1);
  
  if (seusdadosSubfolder.length === 0) {
    throw new Error(`Pasta ${seusdadosSubfolderName} não encontrada no GED Seusdados`);
  }
  
  // Fazer upload do documento no GED Seusdados
  const seusdadosDoc = await uploadDocument(user, {
    name: `${contractName} - ${documentType === 'contract' ? 'Contrato Original' : documentType === 'report' ? 'Relatório de Análise' : documentType === 'clause' ? 'Cláusulas Sugeridas' : 'DPA'}${version ? ` v${version}` : ''}`,
    description: `Documento gerado pela análise de contrato #${analysisId}`,
    folderId: seusdadosSubfolder[0].id,
    file,
    fileName,
    mimeType,
    tags: ['due-diligence', 'analise-contrato', documentType],
    linkedEntityType: 'contract_analysis',
    linkedEntityId: analysisId,
  });
  
  // Buscar pasta de destino no GED do cliente
  const clientSubfolder = await db.select()
    .from(gedFolders)
    .where(and(
      eq(gedFolders.spaceType, 'organization'),
      eq(gedFolders.organizationId, organizationId),
      eq(gedFolders.name, clientSubfolderName),
      eq(gedFolders.parentFolderId, folders.clientFolderId)
    ))
    .limit(1);
  
  let clientDocId: number | undefined;
  
  // Se a pasta do cliente existe, criar cópia do documento
  if (clientSubfolder.length > 0) {
    const clientDoc = await uploadDocument(user, {
      name: seusdadosDoc.name,
      description: seusdadosDoc.description || undefined,
      folderId: clientSubfolder[0].id,
      file,
      fileName,
      mimeType,
      tags: ['due-diligence', 'analise-contrato', documentType],
      linkedEntityType: 'contract_analysis',
      linkedEntityId: analysisId,
    });
    clientDocId = clientDoc.id;
    
    // Marcar documento como compartilhado com cliente
    await db.update(gedDocuments)
      .set({ isSharedWithClient: 1 })
      .where(eq(gedDocuments.id, seusdadosDoc.id));
  }
  
  return {
    seusdadosDocId: seusdadosDoc.id,
    clientDocId,
  };
}

/**
 * Salva versão de cláusula no histórico do GED
 */
export async function saveClauseVersionToGed(
  user: GedUser,
  organizationId: number,
  organizationName: string,
  analysisId: number,
  contractName: string,
  clauseTitle: string,
  clauseContent: string,
  versionNumber: number
): Promise<number> {
  // Garantir que a estrutura de pastas existe
  const folders = await createDueDiligenceFoldersForOrganization(
    organizationId,
    organizationName,
    user.id
  );
  
  const db = await getDb();
  
  // Buscar pasta de histórico de versões
  const historyFolder = await db.select()
    .from(gedFolders)
    .where(and(
      eq(gedFolders.spaceType, 'seusdados'),
      eq(gedFolders.organizationId, organizationId),
      eq(gedFolders.name, 'Histórico de Versões'),
      eq(gedFolders.parentFolderId, folders.seusdadosFolderId)
    ))
    .limit(1);
  
  if (historyFolder.length === 0) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Pasta de Histórico de Versões não encontrada' });
  }
  
  // Criar documento de texto com o conteúdo da cláusula
  const content = `# ${clauseTitle}\n\n## Versão ${versionNumber}\n\n${clauseContent}`;
  const buffer = Buffer.from(content, 'utf-8');
  const fileName = `${contractName}-${clauseTitle.replace(/[^a-zA-Z0-9]/g, '-')}-v${versionNumber}.md`;
  
  const doc = await uploadDocument(user, {
    name: `${clauseTitle} - v${versionNumber}`,
    description: `Versão ${versionNumber} da cláusula "${clauseTitle}" do contrato "${contractName}"`,
    folderId: historyFolder[0].id,
    file: buffer,
    fileName,
    mimeType: 'text/markdown',
    tags: ['clausula', 'versao', `v${versionNumber}`],
    linkedEntityType: 'contract_analysis',
    linkedEntityId: analysisId,
  });
  
  return doc.id;
}

/**
 * Lista documentos de Due Diligence de uma organização
 */
export async function listDueDiligenceDocuments(
  user: GedUser,
  organizationId: number,
  documentType?: 'contract' | 'report' | 'clause' | 'dpa'
): Promise<GedDocument[]> {
  const db = await getDb();
  
  // Buscar pasta de Due Diligence
  const ddFolder = await db.select()
    .from(gedFolders)
    .where(and(
      eq(gedFolders.spaceType, ['admin_global', 'consultor'].includes(user.role) ? 'seusdados' : 'organization'),
      eq(gedFolders.organizationId, organizationId),
      eq(gedFolders.name, 'Due Diligence de Terceiros')
    ))
    .limit(1);
  
  if (ddFolder.length === 0) {
    return [];
  }
  
  // Buscar todas as subpastas
  const subfolders = await db.select()
    .from(gedFolders)
    .where(eq(gedFolders.parentFolderId, ddFolder[0].id));
  
  const folderIds = [ddFolder[0].id, ...subfolders.map(f => f.id)];
  
  // Buscar documentos
  let conditions = [
    inArray(gedDocuments.folderId, folderIds),
    eq(gedDocuments.isLatestVersion, 1),
    eq(gedDocuments.status, 'active')
  ];
  
  if (documentType) {
    conditions.push(like(gedDocuments.tags, `%${documentType}%`));
  }
  
  const docs = await db.select()
    .from(gedDocuments)
    .where(and(...conditions))
    .orderBy(desc(gedDocuments.createdAt));
  
  return docs;
}


/**
 * Cria ou obtém a pasta GED vinculada a uma avaliação específica.
 * Nome padrão: AC#<assessmentId> DD-MM-AAAA
 * A pasta é criada dentro do GED da organização correspondente.
 * Garante isolamento por organização.
 */
export async function getOrCreateAssessmentFolder(
  userId: number,
  organizationId: number,
  assessmentId: number,
  assessmentDate?: string
): Promise<GedFolder> {
  const dateStr = assessmentDate
    ? new Date(assessmentDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
    : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  
  const folderName = `AC#${assessmentId} ${dateStr}`;
  
  // Buscar pasta existente com o nome exato na organização
  const existing = await (await getDb()).select()
    .from(gedFolders)
    .where(and(
      eq(gedFolders.spaceType, 'organization'),
      eq(gedFolders.organizationId, organizationId),
      eq(gedFolders.name, folderName)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  // Buscar ou criar pasta-pai "Evidências" na organização
  let evidenciasFolder = await (await getDb()).select()
    .from(gedFolders)
    .where(and(
      eq(gedFolders.spaceType, 'organization'),
      eq(gedFolders.organizationId, organizationId),
      eq(gedFolders.name, 'Evidências')
    ))
    .limit(1);
  
  let parentFolderId: number | null = null;
  let parentPath = '';
  
  if (evidenciasFolder.length > 0) {
    parentFolderId = evidenciasFolder[0].id;
    parentPath = evidenciasFolder[0].path;
  } else {
    // Criar pasta Evidências
    await (await getDb()).insert(gedFolders).values({
      name: 'Evidências',
      description: 'Evidências de avaliações e planos de ação',
      spaceType: 'organization',
      organizationId,
      parentFolderId: null,
      path: '/Evidências',
      depth: 0,
      isSystemFolder: 1,
      icon: 'Shield',
      color: '#8b5cf6',
      sortOrder: 50,
      createdById: userId,
    });
    
    const newParent = await (await getDb()).select()
      .from(gedFolders)
      .where(and(
        eq(gedFolders.spaceType, 'organization'),
        eq(gedFolders.organizationId, organizationId),
        eq(gedFolders.name, 'Evidências')
      ))
      .limit(1);
    
    if (newParent.length > 0) {
      parentFolderId = newParent[0].id;
      parentPath = newParent[0].path;
    }
  }
  
  // Criar a pasta da avaliação
  const path = parentPath ? `${parentPath}/${folderName}` : `/${folderName}`;
  const depth = parentFolderId ? 1 : 0;
  
  await (await getDb()).insert(gedFolders).values({
    name: folderName,
    description: `Evidências da avaliação #${assessmentId} - ${dateStr}`,
    spaceType: 'organization',
    organizationId,
    parentFolderId,
    path,
    depth,
    isSystemFolder: 0,
    icon: 'FileCheck',
    color: '#10b981',
    sortOrder: 0,
    createdById: userId,
  });
  
  const created = await (await getDb()).select()
    .from(gedFolders)
    .where(and(
      eq(gedFolders.spaceType, 'organization'),
      eq(gedFolders.organizationId, organizationId),
      eq(gedFolders.name, folderName)
    ))
    .limit(1);
  
  if (!created[0]) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao criar pasta de avaliação no GED' });
  }
  
  return created[0];
}

/**
 * Cria ou obtém a pasta GED para evidências de uma avaliação, usando a estrutura correta:
 * GED Cliente → Evidências → Evidências - Avaliações de Conformidade → AC#CODIGO_REAL → [subpasta]
 *
 * @param userId - ID do usuário que está fazendo o upload
 * @param organizationId - ID da organização dona da avaliação
 * @param assessmentId - ID numérico da avaliação (para buscar o assessmentCode real)
 * @param subfolderType - 'avaliacao' para evidências da avaliação, 'plano_acao' para evidências do plano de ação
 * @param assessmentCodeOverride - Código real da avaliação (ex.: AC#1772800895359), se já conhecido
 */
export async function getOrCreateEvidenceFolderForAssessment(
  userId: number,
  organizationId: number,
  assessmentId: number,
  subfolderType: 'avaliacao' | 'plano_acao',
  assessmentCodeOverride?: string | null
): Promise<GedFolder> {
  const db = await getDb();

  // 1. Buscar o assessmentCode real da avaliação
  let assessmentCode = assessmentCodeOverride;
  if (!assessmentCode) {
    const [assessment] = await db.select({ assessmentCode: unifiedAssessments.assessmentCode })
      .from(unifiedAssessments)
      .where(eq(unifiedAssessments.id, assessmentId))
      .limit(1);
    assessmentCode = assessment?.assessmentCode || `AC#${assessmentId}`;
  }

  // Nome da subpasta final
  const subfolderName = subfolderType === 'avaliacao'
    ? 'Evidências da Avaliação'
    : 'Evidências do Plano de Ação';

  // Helper: buscar ou criar uma pasta pelo nome dentro de um pai
  async function getOrCreateFolder(
    name: string,
    parentFolderId: number | null,
    parentPath: string,
    depth: number,
    opts: { icon?: string; color?: string; description?: string; isSystemFolder?: number; sortOrder?: number } = {}
  ): Promise<GedFolder> {
    const conditions: any[] = [
      eq(gedFolders.spaceType, 'organization'),
      eq(gedFolders.organizationId, organizationId),
      eq(gedFolders.name, name),
    ];
    if (parentFolderId !== null) {
      conditions.push(eq(gedFolders.parentFolderId, parentFolderId));
    } else {
      conditions.push(isNull(gedFolders.parentFolderId));
    }

    const existing = await db.select().from(gedFolders).where(and(...conditions)).limit(1);
    if (existing.length > 0) return existing[0];

    const path = parentPath ? `${parentPath}/${name}` : `/${name}`;
    await db.insert(gedFolders).values({
      name,
      description: opts.description || name,
      spaceType: 'organization',
      organizationId,
      parentFolderId,
      path,
      depth,
      isSystemFolder: opts.isSystemFolder ?? 0,
      icon: opts.icon || 'Folder',
      color: opts.color || '#8b5cf6',
      sortOrder: opts.sortOrder ?? 0,
      createdById: userId,
    });

    const created = await db.select().from(gedFolders).where(and(...conditions)).limit(1);
    if (!created[0]) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Erro ao criar pasta "${name}" no GED` });
    return created[0];
  }

  // 2. Nível 0: "Evidências" (pasta raiz)
  const evidenciasFolder = await getOrCreateFolder(
    'Evidências',
    null,
    '',
    0,
    { icon: 'Shield', color: '#8b5cf6', description: 'Evidências de avaliações e planos de ação', isSystemFolder: 1, sortOrder: 50 }
  );

  // 3. Nível 1: "Evidências - Avaliações de Conformidade"
  const conformidadeFolder = await getOrCreateFolder(
    'Evidências - Avaliações de Conformidade',
    evidenciasFolder.id,
    evidenciasFolder.path,
    1,
    { icon: 'ClipboardCheck', color: '#6366f1', description: 'Evidências organizadas por avaliação de conformidade', isSystemFolder: 1, sortOrder: 1 }
  );

  // 4. Nível 2: "AC#CODIGO_REAL" (pasta da avaliação)
  const assessmentFolder = await getOrCreateFolder(
    assessmentCode,
    conformidadeFolder.id,
    conformidadeFolder.path,
    2,
    { icon: 'FileSearch', color: '#0ea5e9', description: `Evidências da avaliação ${assessmentCode}`, isSystemFolder: 0, sortOrder: 0 }
  );

  // 5. Nível 3: subpasta específica ("Evidências da Avaliação" ou "Evidências do Plano de Ação")
  const subFolder = await getOrCreateFolder(
    subfolderName,
    assessmentFolder.id,
    assessmentFolder.path,
    3,
    {
      icon: subfolderType === 'avaliacao' ? 'FileCheck' : 'ListChecks',
      color: subfolderType === 'avaliacao' ? '#10b981' : '#f59e0b',
      description: subfolderType === 'avaliacao'
        ? `Evidências anexadas diretamente nas perguntas da avaliação ${assessmentCode}`
        : `Evidências anexadas nas ações do Plano de Ação da avaliação ${assessmentCode}`,
      isSystemFolder: 0,
      sortOrder: subfolderType === 'avaliacao' ? 1 : 2,
    }
  );

  return subFolder;
}

/**
 * Lista documentos do GED de uma organização específica, com isolamento total.
 * Apenas documentos da organização do usuário são retornados.
 */
export async function listOrganizationDocuments(
  organizationId: number,
  folderId?: number
): Promise<any[]> {
  const conditions: any[] = [
    eq(gedDocuments.spaceType, 'organization'),
    eq(gedDocuments.organizationId, organizationId),
    eq(gedDocuments.status, 'active'),
  ];
  
  if (folderId) {
    conditions.push(eq(gedDocuments.folderId, folderId));
  }
  
  const docs = await (await getDb()).select()
    .from(gedDocuments)
    .where(and(...conditions))
    .orderBy(desc(gedDocuments.createdAt));
  
  return docs;
}

/**
 * Lista pastas do GED de uma organização específica, com isolamento total.
 */
export async function listOrganizationFolders(
  organizationId: number,
  parentFolderId?: number | null
): Promise<GedFolder[]> {
  const conditions: any[] = [
    eq(gedFolders.spaceType, 'organization'),
    eq(gedFolders.organizationId, organizationId),
  ];
  
  if (parentFolderId !== undefined) {
    if (parentFolderId === null) {
      conditions.push(isNull(gedFolders.parentFolderId));
    } else {
      conditions.push(eq(gedFolders.parentFolderId, parentFolderId));
    }
  }
  
  const folders = await (await getDb()).select()
    .from(gedFolders)
    .where(and(...conditions))
    .orderBy(gedFolders.sortOrder, gedFolders.name);
  
  return folders;
}
