import { logger } from "./_core/logger";
import { getDb, extractInsertId } from "./db";
import { eq, and, asc, desc } from "drizzle-orm";
import { 
  serviceCatalogBlocks, 
  serviceCatalogItems, 
  organizationServiceSlas,
  type ServiceCatalogBlock,
  type ServiceCatalogItem,
  type OrganizationServiceSla
} from "../drizzle/schema";

// ============================================
// BLOCOS DE SERVIÇOS
// ============================================

export async function getAllBlocks(): Promise<ServiceCatalogBlock[]> {
  const db = await getDb();
  if (!db) {
    logger.warn("[serviceCatalog] Database not available");
    return [];
  }
  
  const blocks = await db
    .select()
    .from(serviceCatalogBlocks)
    .where(eq(serviceCatalogBlocks.isActive, 1))
    .orderBy(asc(serviceCatalogBlocks.displayOrder));
  
  return blocks;
}

export async function getBlockById(id: number): Promise<ServiceCatalogBlock | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [block] = await db
    .select()
    .from(serviceCatalogBlocks)
    .where(eq(serviceCatalogBlocks.id, id))
    .limit(1);
  
  return block || null;
}

export async function getBlockByCode(code: string): Promise<ServiceCatalogBlock | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [block] = await db
    .select()
    .from(serviceCatalogBlocks)
    .where(eq(serviceCatalogBlocks.code, code))
    .limit(1);
  
  return block || null;
}

// ============================================
// ITENS DO CATÁLOGO (SERVIÇOS)
// ============================================

export async function getAllServices(): Promise<ServiceCatalogItem[]> {
  const db = await getDb();
  if (!db) return [];
  
  const services = await db
    .select()
    .from(serviceCatalogItems)
    .where(eq(serviceCatalogItems.isActive, 1))
    .orderBy(asc(serviceCatalogItems.blockId), asc(serviceCatalogItems.displayOrder));
  
  return services;
}

export async function getServicesByBlock(blockId: number): Promise<ServiceCatalogItem[]> {
  const db = await getDb();
  if (!db) return [];
  
  const services = await db
    .select()
    .from(serviceCatalogItems)
    .where(and(
      eq(serviceCatalogItems.blockId, blockId),
      eq(serviceCatalogItems.isActive, 1)
    ))
    .orderBy(asc(serviceCatalogItems.displayOrder));
  
  return services;
}

export async function getServiceById(id: number): Promise<ServiceCatalogItem | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [service] = await db
    .select()
    .from(serviceCatalogItems)
    .where(eq(serviceCatalogItems.id, id))
    .limit(1);
  
  return service || null;
}

export async function getServiceByCode(code: string): Promise<ServiceCatalogItem | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [service] = await db
    .select()
    .from(serviceCatalogItems)
    .where(eq(serviceCatalogItems.code, code))
    .limit(1);
  
  return service || null;
}

// ============================================
// CATÁLOGO COMPLETO COM BLOCOS E SERVIÇOS
// ============================================

export interface CatalogBlockWithServices extends ServiceCatalogBlock {
  services: ServiceCatalogItem[];
}

export async function getFullCatalog(): Promise<CatalogBlockWithServices[]> {
  const blocks = await getAllBlocks();
  const services = await getAllServices();
  
  const catalog: CatalogBlockWithServices[] = blocks.map(block => ({
    ...block,
    services: services.filter(s => s.blockId === block.id)
  }));
  
  return catalog;
}

// ============================================
// SLAs CUSTOMIZADOS POR ORGANIZAÇÃO
// ============================================

export async function getOrganizationSlas(organizationId: number): Promise<OrganizationServiceSla[]> {
  const db = await getDb();
  if (!db) return [];
  
  const slas = await db
    .select()
    .from(organizationServiceSlas)
    .where(eq(organizationServiceSlas.organizationId, organizationId));
  
  return slas;
}

export async function getEffectiveSlaForService(
  serviceId: number, 
  organizationId?: number
): Promise<{ slaHours: number; legalDeadlineDays: number | null }> {
  const service = await getServiceById(serviceId);
  if (!service) {
    throw new Error(`Serviço não encontrado: ${serviceId}`);
  }
  
  // Se não há organização, retorna SLA padrão
  if (!organizationId) {
    return {
      slaHours: service.slaHours,
      legalDeadlineDays: service.legalDeadlineDays
    };
  }
  
  const db = await getDb();
  if (!db) {
    return {
      slaHours: service.slaHours,
      legalDeadlineDays: service.legalDeadlineDays
    };
  }
  
  // Busca SLA customizado para a organização
  const [customSla] = await db
    .select()
    .from(organizationServiceSlas)
    .where(and(
      eq(organizationServiceSlas.organizationId, organizationId),
      eq(organizationServiceSlas.serviceItemId, serviceId),
      eq(organizationServiceSlas.isEnabled, 1)
    ))
    .limit(1);
  
  if (customSla) {
    return {
      slaHours: customSla.customSlaHours || service.slaHours,
      legalDeadlineDays: customSla.customLegalDeadlineDays || service.legalDeadlineDays
    };
  }
  
  return {
    slaHours: service.slaHours,
    legalDeadlineDays: service.legalDeadlineDays
  };
}

export async function setOrganizationSla(
  organizationId: number,
  serviceItemId: number,
  customSlaHours?: number,
  customLegalDeadlineDays?: number,
  notes?: string
): Promise<OrganizationServiceSla | null> {
  const db = await getDb();
  if (!db) return null;
  
  // Verifica se já existe
  const [existing] = await db
    .select()
    .from(organizationServiceSlas)
    .where(and(
      eq(organizationServiceSlas.organizationId, organizationId),
      eq(organizationServiceSlas.serviceItemId, serviceItemId)
    ))
    .limit(1);
  
  if (existing) {
    // Atualiza
    await db
      .update(organizationServiceSlas)
      .set({
        customSlaHours,
        customLegalDeadlineDays,
        notes
      })
      .where(eq(organizationServiceSlas.id, existing.id));
    
    return { ...existing, customSlaHours, customLegalDeadlineDays, notes } as OrganizationServiceSla;
  }
  
  // Cria novo
  const result = await db
    .insert(organizationServiceSlas)
    .values({
      organizationId,
      serviceItemId,
      customSlaHours,
      customLegalDeadlineDays,
      notes
    }) as any;
  
  const insertedId = extractInsertId(result);
  
  const [newSla] = await db
    .select()
    .from(organizationServiceSlas)
    .where(eq(organizationServiceSlas.id, insertedId))
    .limit(1);
  
  return newSla;
}

// ============================================
// ESTATÍSTICAS DO CATÁLOGO
// ============================================

export interface CatalogStats {
  totalBlocks: number;
  totalServices: number;
  servicesByBlock: { blockCode: string; blockName: string; count: number }[];
  servicesByPriority: { priority: string; count: number }[];
}

export async function getCatalogStats(): Promise<CatalogStats> {
  const blocks = await getAllBlocks();
  const services = await getAllServices();
  
  const servicesByBlock = blocks.map(block => ({
    blockCode: block.code,
    blockName: block.name,
    count: services.filter(s => s.blockId === block.id).length
  }));
  
  const priorityCounts: Record<string, number> = {};
  services.forEach(s => {
    priorityCounts[s.priority] = (priorityCounts[s.priority] || 0) + 1;
  });
  
  const servicesByPriority = Object.entries(priorityCounts).map(([priority, count]) => ({
    priority,
    count
  }));
  
  return {
    totalBlocks: blocks.length,
    totalServices: services.length,
    servicesByBlock,
    servicesByPriority
  };
}
