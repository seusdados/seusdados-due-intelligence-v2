import { getDb } from "./db";
import { ticketTags, ticketTagAssociations } from "../drizzle/schema";
import { eq, and, type InferSelectModel } from "drizzle-orm";
import { TRPCError } from '@trpc/server';

type TicketTag = InferSelectModel<typeof ticketTags>;

// ==================== CRUD DE TAGS ====================

export async function createTag(data: {
  organizationId: number;
  createdById: number;
  name: string;
  color?: string;
  description?: string;
}): Promise<TicketTag> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  const result = await db.insert(ticketTags).values({
    organizationId: data.organizationId,
    createdById: data.createdById,
    name: data.name,
    color: data.color || "#6366f1",
    description: data.description || null
  }).returning({ id: ticketTags.id });
  
  const insertId = result[0].id;
  const [tag] = await db.select().from(ticketTags).where(eq(ticketTags.id, insertId));
  return tag;
}

export async function updateTag(
  tagId: number,
  data: {
    name?: string;
    color?: string;
    description?: string;
  }
): Promise<TicketTag | null> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.update(ticketTags)
    .set({
      ...(data.name && { name: data.name }),
      ...(data.color && { color: data.color }),
      ...(data.description !== undefined && { description: data.description })
    })
    .where(eq(ticketTags.id, tagId));
  
  const [tag] = await db.select().from(ticketTags).where(eq(ticketTags.id, tagId));
  return tag || null;
}

export async function deleteTag(tagId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  // Primeiro remove as associações
  await db.delete(ticketTagAssociations).where(eq(ticketTagAssociations.tagId, tagId));
  
  // Depois remove a tag
  const result = await db.delete(ticketTags).where(eq(ticketTags.id, tagId));
  return result.rowCount > 0;
}

export async function getTagsByOrganization(organizationId: number): Promise<TicketTag[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ticketTags).where(eq(ticketTags.organizationId, organizationId));
}

export async function getTagById(tagId: number): Promise<TicketTag | null> {
  const db = await getDb();
  if (!db) return null;
  const [tag] = await db.select().from(ticketTags).where(eq(ticketTags.id, tagId));
  return tag || null;
}

// ==================== ASSOCIAÇÕES TICKET-TAG ====================

export async function addTagToTicket(ticketId: number, tagId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  // Verifica se já existe
  const [existing] = await db.select()
    .from(ticketTagAssociations)
    .where(and(
      eq(ticketTagAssociations.ticketId, ticketId),
      eq(ticketTagAssociations.tagId, tagId)
    ));
  
  if (!existing) {
    await db.insert(ticketTagAssociations).values({
      ticketId,
      tagId
    });
  }
}

export async function removeTagFromTicket(ticketId: number, tagId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  await db.delete(ticketTagAssociations)
    .where(and(
      eq(ticketTagAssociations.ticketId, ticketId),
      eq(ticketTagAssociations.tagId, tagId)
    ));
}

export async function getTagsForTicket(ticketId: number): Promise<TicketTag[]> {
  const db = await getDb();
  if (!db) return [];
  
  const associations = await db.select()
    .from(ticketTagAssociations)
    .where(eq(ticketTagAssociations.ticketId, ticketId));
  
  if (associations.length === 0) return [];
  
  const tagIds = associations.map((a: { tagId: number }) => a.tagId);
  const tags = await Promise.all(
    tagIds.map((id: number) => db.select().from(ticketTags).where(eq(ticketTags.id, id)))
  );
  
  return tags.flat().filter(Boolean);
}

export async function setTicketTags(ticketId: number, tagIds: number[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  // Remove todas as tags existentes
  await db.delete(ticketTagAssociations).where(eq(ticketTagAssociations.ticketId, ticketId));
  
  // Adiciona as novas tags
  if (tagIds.length > 0) {
    await db.insert(ticketTagAssociations).values(
      tagIds.map(tagId => ({
        ticketId,
        tagId
      }))
    );
  }
}
