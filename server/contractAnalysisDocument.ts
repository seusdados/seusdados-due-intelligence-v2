// server/contractAnalysisDocument.ts
//
// Resolver robusto de URL/mimeType do documento.
// - Suporta camelCase + snake_case
// - Tenta extrair URL de metadata JSON
// - Integra com presignedUrlService.ts (se existir) via dynamic import
// - Se não houver URL acessível, retorna null (e loga chaves para debug)

import { logger } from "./_core/logger";
import * as dbModule from "./db";
import { sql } from "drizzle-orm";

export type ResolvedDocument = {
  fileUrl: string;
  mimeType: string | null;
  fileName: string | null;
  storageKey?: string | null;
};

async function getDbConnOrNull(): Promise<any | null> {
  try {
    const conn = await dbModule.getDb();
    return conn;
  } catch {}
  return null;
}

function pickFirst(row: Record<string, any>, keys: string[]): any {
  for (const k of keys) {
    if (row && row[k] != null && String(row[k]).trim() !== "") return row[k];
  }
  return null;
}

function normalizeStr(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function safeJson(v: any): any | null {
  if (!v) return null;
  if (typeof v === "object") return v;
  if (typeof v !== "string") return null;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

function pickFromMetadata(meta: any): { url?: string; mime?: string; name?: string; key?: string } {
  if (!meta || typeof meta !== "object") return {};
  const url =
    meta.presignedUrl ||
    meta.presigned_url ||
    meta.fileUrl ||
    meta.file_url ||
    meta.downloadUrl ||
    meta.download_url ||
    meta.publicUrl ||
    meta.public_url ||
    meta.url ||
    meta.storageUrl ||
    meta.storage_url;

  const mime = meta.mimeType || meta.mime_type || meta.contentType || meta.content_type;
  const name = meta.fileName || meta.file_name || meta.originalName || meta.original_name || meta.name;
  const key =
    meta.storageKey ||
    meta.storage_key ||
    meta.s3Key ||
    meta.s3_key ||
    meta.key ||
    meta.path ||
    meta.objectKey ||
    meta.object_key;

  return {
    url: url ? String(url) : undefined,
    mime: mime ? String(mime) : undefined,
    name: name ? String(name) : undefined,
    key: key ? String(key) : undefined,
  };
}

function looksPresigned(url: string): boolean {
  const u = url.toLowerCase();
  return u.includes("x-amz-signature") || u.includes("x-amz-credential") || u.includes("signature=");
}

async function tryPresign(params: { documentId: number; storageKey?: string | null; fileUrl?: string | null }): Promise<string | null> {
  try {
    const mod: any = await import("./presignedUrlService");

    // Tenta diversas assinaturas/nomes comuns
    const candidates: Array<{ name: string; fn: any }> = [
      { name: "getPresignedUrlForDocument", fn: mod.getPresignedUrlForDocument },
      { name: "getPresignedUrlForKey", fn: mod.getPresignedUrlForKey },
      { name: "generatePresignedUrl", fn: mod.generatePresignedUrl },
      { name: "getPresignedUrl", fn: mod.getPresignedUrl },
      { name: "createPresignedUrl", fn: mod.createPresignedUrl },
    ].filter((c) => typeof c.fn === "function");

    for (const c of candidates) {
      try {
        // Heurística por aridade
        if (c.fn.length >= 2 && params.storageKey) {
          const out = await c.fn(params.storageKey, params.documentId);
          if (typeof out === "string" && out.trim()) return out.trim();
        }
        if (c.fn.length >= 1) {
          const out = await c.fn(params.storageKey ?? params.documentId ?? params.fileUrl);
          if (typeof out === "string" && out.trim()) return out.trim();
        }
        // fallback object-call
        const out = await c.fn({ documentId: params.documentId, storageKey: params.storageKey, fileUrl: params.fileUrl });
        if (typeof out === "string" && out.trim()) return out.trim();
      } catch {
        // tenta próximo
      }
    }
  } catch {
    // service não existe ou falhou — segue sem presign
  }
  return null;
}

export async function resolveDocumentForAnalysis(documentId: number): Promise<ResolvedDocument | null> {
  const db = await getDbConnOrNull();
  if (!db) {
    logger.warn("[ContractAnalysisDocument] DB connection not available; cannot resolve document URL.");
    return null;
  }

  const tableCandidates = ["ged_documents", "documents", "ged_document", "gedDocuments"];
  let row: any = null;

  for (const t of tableCandidates) {
    try {
      const result: any = await db.execute(sql`SELECT * FROM ${sql.raw(t)} WHERE id = ${documentId} LIMIT 1`);
      let rows: any[] = [];
      if (result?.rows && Array.isArray(result.rows)) {
        rows = result.rows;
      } else if (Array.isArray(result)) {
        rows = result;
      }
      if (rows && rows.length) {
        row = rows[0];
        logger.info('[ContractAnalysisDocument] Document found', { table: t, documentId, hasFileUrl: !!row?.fileUrl, keys: Object.keys(row || {}).slice(0, 10) });
        break;
      }
    } catch {
      // tenta próximo nome
    }
  }

  if (!row) return null;

  const meta = safeJson(pickFirst(row, ["metadata", "meta", "extra", "extras", "data"]));
  const metaPicked = pickFromMetadata(meta);

  let fileUrl =
    normalizeStr(
      pickFirst(row, [
        // camelCase
        "presignedUrl",
        "signedUrl",
        "downloadUrl",
        "fileUrl",
        "url",
        "publicUrl",
        "storageUrl",
        // snake_case
        "presigned_url",
        "signed_url",
        "download_url",
        "file_url",
        "public_url",
        "storage_url",
      ])
    ) || (metaPicked.url ? normalizeStr(metaPicked.url) : null);

  const mimeType =
    normalizeStr(
      pickFirst(row, [
        "mimeType",
        "mimetype",
        "contentType",
        "fileType",
        "mime_type",
        "content_type",
        "file_type",
      ])
    ) || (metaPicked.mime ? normalizeStr(metaPicked.mime) : null);

  const fileName =
    normalizeStr(
      pickFirst(row, ["fileName", "filename", "name", "originalName", "file_name", "original_name"])
    ) || (metaPicked.name ? normalizeStr(metaPicked.name) : null);

  const storageKey =
    normalizeStr(
      pickFirst(row, [
        "storageKey",
        "s3Key",
        "key",
        "path",
        "objectKey",
        "storage_key",
        "s3_key",
        "object_key",
      ])
    ) || (metaPicked.key ? normalizeStr(metaPicked.key) : null);

  // Se já tem URL mas não parece presigned e temos storageKey, tenta presign
  if (storageKey && (!fileUrl || !looksPresigned(fileUrl))) {
    const presigned = await tryPresign({ documentId, storageKey, fileUrl });
    if (presigned) fileUrl = presigned;
  }

  // fallback: base pública + key
  if (!fileUrl) {
    const base = process.env.MANUS_STORAGE_PUBLIC_BASE_URL;
    if (base && storageKey) {
      const b = String(base).replace(/\/+$/, "");
      const k = String(storageKey).replace(/^\/+/, "");
      return { fileUrl: `${b}/${k}`, mimeType, fileName, storageKey };
    }

    logger.warn("[ContractAnalysisDocument] Documento encontrado, mas sem URL resolvível", {
      documentId,
      keys: Object.keys(row || {}),
      hasMetadata: Boolean(meta),
      hasStorageKey: Boolean(storageKey),
    });

    return null;
  }

  return { fileUrl, mimeType, fileName, storageKey };
}
