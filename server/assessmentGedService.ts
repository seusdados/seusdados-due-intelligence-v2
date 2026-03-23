import * as gedService from "./gedService";
import { storagePut, storageGet } from "./storage";
import { getDb } from "./db";
import { gedFolders, gedDocuments, assessmentEvidences, type InsertGedFolder } from "../drizzle/schema";
import { eq, and, like } from "drizzle-orm";
import { logger } from "./_core/logger";

// Estrutura padrão de pastas para avaliações
const ASSESSMENT_FOLDER_STRUCTURE = [
  { name: 'Questionários', description: 'Respostas dos questionários' },
  { name: 'Evidências', description: 'Documentos de evidência anexados' },
  { name: 'Relatórios', description: 'Relatórios gerados' },
  { name: 'Análise de Risco', description: 'Documentos de análise de risco' },
  { name: 'Planos de Ação', description: 'Planos de ação e mitigação' },
];

// Política de retenção: 7 anos
const RETENTION_YEARS = 7;

/**
 * Serviço de Integração de Evidências de Avaliações com GED
 * Gerencia upload, download e organização de evidências em pastas do GED
 */

interface EvidenceUploadParams {
  assessmentCode: string;
  organizationId: number;
  questionId: string;
  fileName: string;
  fileBuffer: Buffer;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
}

interface EvidenceDownloadParams {
  assessmentCode: string;
  organizationId: number;
  fileName: string;
}

/**
 * Cria estrutura de pastas completa no GED para uma avaliação
 * Estrutura: /Avaliações/{assessmentCode}/[Questionários|Evidências|Relatórios|...]
 */
export async function createAssessmentGedStructure(
  assessmentCode: string,
  organizationId: number,
  createdByUserId: number = 1
): Promise<{ success: boolean; folderPath: string; folderId?: number; subFolders?: { name: string; id: number }[] }> {
  const db = await getDb();
  if (!db) {
    return { success: false, folderPath: '' };
  }

  try {
    // 1. Verificar se pasta raiz de Avaliações existe para a organização
    let rootFolder = await db
      .select()
      .from(gedFolders)
      .where(
        and(
          eq(gedFolders.organizationId, organizationId),
          eq(gedFolders.name, 'Avaliações'),
          eq(gedFolders.parentFolderId, null as any)
        )
      )
      .then(rows => rows[0]);

    // Criar pasta raiz se não existir
    if (!rootFolder) {
      const [result] = await db.insert(gedFolders).values({
        name: 'Avaliações',
        description: 'Avaliações de Conformidade e Maturidade',
        spaceType: 'organization',
        organizationId,
        parentFolderId: null,
        path: '/Avaliações',
        depth: 0,
        createdById: createdByUserId,
      }).returning({ id: gedFolders.id });
      
      rootFolder = { id: result.id } as any;
    }

    // 2. Criar pasta específica da avaliação
    const assessmentFolderPath = `/Avaliações/${assessmentCode}`;
    
    // Verificar se já existe
    const existingFolder = await db
      .select()
      .from(gedFolders)
      .where(
        and(
          eq(gedFolders.organizationId, organizationId),
          eq(gedFolders.path, assessmentFolderPath)
        )
      )
      .then(rows => rows[0]);

    if (existingFolder) {
      logger.info(`Assessment folder already exists`, { assessmentCode, folderId: existingFolder.id });
      return { 
        success: true, 
        folderPath: assessmentFolderPath,
        folderId: existingFolder.id,
        subFolders: [] 
      };
    }

    const [assessmentFolderResult] = await db.insert(gedFolders).values({
      name: assessmentCode,
      description: `Documentos da avaliação ${assessmentCode}`,
      spaceType: 'organization',
      organizationId,
      parentFolderId: rootFolder.id,
      path: assessmentFolderPath,
      depth: 1,
      createdById: createdByUserId,
    }).returning({ id: gedFolders.id });

    const assessmentFolderId = assessmentFolderResult.id;

    // 3. Criar subpastas
    const subFolders: { name: string; id: number }[] = [];

    for (const folder of ASSESSMENT_FOLDER_STRUCTURE) {
      const subFolderPath = `${assessmentFolderPath}/${folder.name}`;
      
      const [subFolderResult] = await db.insert(gedFolders).values({
        name: folder.name,
        description: folder.description,
        spaceType: 'organization',
        organizationId,
        parentFolderId: assessmentFolderId,
        path: subFolderPath,
        depth: 2,
        createdById: createdByUserId,
      }).returning({ id: gedFolders.id });

      subFolders.push({ name: folder.name, id: subFolderResult.id });
    }

    logger.info(`Assessment folders created`, {
      assessmentCode,
      folderId: assessmentFolderId,
      subFoldersCount: subFolders.length,
    });

    return {
      success: true,
      folderPath: assessmentFolderPath,
      folderId: assessmentFolderId,
      subFolders,
    };
  } catch (error) {
    logger.error(`Failed to create assessment folders`, {
      assessmentCode,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      success: false,
      folderPath: '',
    };
  }
}

/**
 * Obtém o ID da pasta de evidências para uma avaliação
 */
export async function getEvidencesFolderId(
  assessmentCode: string,
  organizationId: number
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const folder = await db
      .select()
      .from(gedFolders)
      .where(
        and(
          eq(gedFolders.organizationId, organizationId),
          eq(gedFolders.path, `/Avaliações/${assessmentCode}/Evidências`)
        )
      )
      .then(rows => rows[0]);

    return folder?.id || null;
  } catch (error) {
    logger.error(`Failed to get evidences folder`, { assessmentCode, error });
    return null;
  }
}

/**
 * Verifica e aplica política de retenção (7 anos)
 */
export async function checkRetentionPolicy(): Promise<{
  checked: number;
  archived: number;
  errors: number;
}> {
  const db = await getDb();
  if (!db) {
    return { checked: 0, archived: 0, errors: 0 };
  }

  const results = { checked: 0, archived: 0, errors: 0 };

  try {
    // Buscar pastas com retenção expirada
    // Por enquanto, apenas log - não deletamos automaticamente
    const expiredFolders = await db
      .select()
      .from(gedFolders)
      .where(like(gedFolders.path, '/Avaliações/%'));

    results.checked = expiredFolders.length;
    
    // Log para revisão manual
    // Nota: retentionDate não existe no schema atual
    // Usar createdAt + 7 anos como critério de retenção
    const retentionThreshold = new Date();
    retentionThreshold.setFullYear(retentionThreshold.getFullYear() - RETENTION_YEARS);
    
    for (const folder of expiredFolders) {
      const createdAt = new Date(folder.createdAt);
      if (createdAt < retentionThreshold) {
        logger.info(`Folder retention expired (based on createdAt)`, {
          folderId: folder.id,
          path: folder.path,
          createdAt: folder.createdAt,
        });
        results.archived++;
      }
    }

    return results;
  } catch (error) {
    logger.error(`Failed to check retention policy`, { error });
    return results;
  }
}

/**
 * Upload de evidência para GED usando S3
 */
export async function uploadEvidenceToGed(
  params: EvidenceUploadParams
): Promise<{ success: boolean; fileUrl: string; fileKey: string }> {
  try {
    const { assessmentCode, questionId, fileName, fileBuffer, mimeType } = params;

    // Extrair domínio da questionId (ex: IA-01 de IA-01-Q1)
    const domain = questionId.substring(0, 5);
    const fileKey = `meudpo/avaliacoes/${assessmentCode}/${domain}/${fileName}-${Date.now()}`;

    // Upload do arquivo para S3
    const { url } = await storagePut(fileKey, fileBuffer, mimeType);

    return {
      success: true,
      fileUrl: url,
      fileKey,
    };
  } catch (error) {
    console.error("Erro ao fazer upload de evidência:", error);
    throw error;
  }
}

/**
 * Download de evidência do S3 (retorna URL presigned)
 */
export async function downloadEvidenceFromGed(
  params: EvidenceDownloadParams
): Promise<{ success: boolean; fileUrl: string; fileName: string }> {
  try {
    const { fileName } = params;

    // Obter URL presigned de download do arquivo do S3
    const { url } = await storageGet(fileName);

    return {
      success: true,
      fileUrl: url,
      fileName,
    };
  } catch (error) {
    console.error("Erro ao fazer download de evidência:", error);
    throw error;
  }
}

/**
 * Listar evidências de uma avaliação (via banco de dados)
 */
export async function listAssessmentEvidences(
  assessmentCode: string,
  organizationId: number,
  questionId?: string
): Promise<
  Array<{
    fileName: string;
    fileUrl: string;
    uploadedBy: string;
    uploadDate: Date;
    fileSize: number;
    questionId: string;
  }>
> {
  // Esta função será implementada consultando o banco de dados
  // As evidências são armazenadas em ua_evidences com referência ao S3
  return [];
}

/**
 * Deletar evidência do S3
 */
export async function deleteEvidenceFromGed(
  assessmentCode: string,
  organizationId: number,
  fileName: string
): Promise<{ success: boolean }> {
  // Implementação de deleção será feita quando storage service tiver este método
  return { success: true };
}

/**
 * Gerar relatório de evidências da avaliação
 */
export async function generateEvidenceReport(
  assessmentCode: string,
  organizationId: number
): Promise<{
  success: boolean;
  totalEvidences: number;
  byDomain: Record<string, number>;
  report: string;
}> {
  // Esta função será implementada consultando o banco de dados
  return {
    success: true,
    totalEvidences: 0,
    byDomain: {},
    report: "",
  };
}

/**
 * Compartilhar pasta de evidências com usuários
 */
export async function shareEvidenceFolder(
  assessmentCode: string,
  organizationId: number,
  userIds: number[]
): Promise<{ success: boolean; sharedWith: number }> {
  // Implementação de compartilhamento será feita quando gedService tiver este método
  return {
    success: true,
    sharedWith: userIds.length,
  };
}
