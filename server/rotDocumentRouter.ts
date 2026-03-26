// server/rotDocumentRouter.ts
// Router dedicado para visualização, exportação PDF e histórico de versões de ROT/POP
import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { eq, and, desc, sql, asc } from "drizzle-orm";
import { generateRopaPdfBytes, generateRopaCsv, generateROPAExcel } from "./ropaExportService";
import { saveBinaryDocumentToGed } from "./mapeamentoGedService";
import {
  rotOperations,
  organizations,
  users,
  mapeamentoResponses,
  mapeamentoGedDocuments,
  gedDocuments,
  textVersionHistory,
} from "../drizzle/schema";

// ==================== HELPERS ====================

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Não informada";
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "Não informada";
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

// ==================== ROUTER ====================

export const rotDocumentRouter = router({
  // Obter dados completos do ROT para visualização dedicada
  getRotDocument: protectedProcedure
    .input(z.object({ rotId: z.number().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });

      const [rot] = await db
        .select()
        .from(rotOperations)
        .where(eq(rotOperations.id, input.rotId));

      if (!rot) throw new TRPCError({ code: "NOT_FOUND", message: "ROT não encontrado" });

      // Buscar organização
      const [org] = await db
        .select({ name: organizations.name, cnpj: organizations.cnpj })
        .from(organizations)
        .where(eq(organizations.id, rot.organizationId));

      // Buscar criador
      const [creator] = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, rot.createdById));

      // Buscar aprovador se houver
      let approver = null;
      if (rot.approvedById) {
        const [a] = await db
          .select({ name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, rot.approvedById));
        approver = a || null;
      }

      // Buscar resposta vinculada (se houver)
      const responses = await db
        .select()
        .from(mapeamentoResponses)
        .where(eq(mapeamentoResponses.rotId, input.rotId));
      const linkedResponse = responses[0] || null;

      // Buscar documentos GED vinculados
      const gedDocs = await db
        .select({
          id: mapeamentoGedDocuments.id,
          documentType: mapeamentoGedDocuments.documentType,
          version: mapeamentoGedDocuments.version,
          isLatest: mapeamentoGedDocuments.isLatest,
          generatedAt: mapeamentoGedDocuments.generatedAt,
          gedDocId: mapeamentoGedDocuments.gedDocumentId,
        })
        .from(mapeamentoGedDocuments)
        .where(eq(mapeamentoGedDocuments.rotId, input.rotId))
        .orderBy(desc(mapeamentoGedDocuments.generatedAt));

      // Buscar conteúdo dos documentos GED
      const docsWithContent = [];
      for (const doc of gedDocs) {
        const [gedDoc] = await db
          .select({ name: gedDocuments.name, fileKey: gedDocuments.fileKey, fileUrl: gedDocuments.fileUrl, description: gedDocuments.description })
          .from(gedDocuments)
          .where(eq(gedDocuments.id, doc.gedDocId));
        docsWithContent.push({
          ...doc,
          title: gedDoc?.name || "",
          content: gedDoc?.description || "",
          fileKey: gedDoc?.fileKey || "",
          fileUrl: gedDoc?.fileUrl || "",
        });
      }

      return {
        rot: {
          ...rot,
          dataCategories: rot.dataCategories as any[],
          alternativeBases: rot.alternativeBases as any,
          risksIfNoConsent: rot.risksIfNoConsent as any,
          aiAnalysis: rot.aiAnalysis as any,
        },
        organization: org || { name: "Não informada", cnpj: "" },
        creator: creator || { name: "Sistema", email: "" },
        approver,
        linkedResponse: linkedResponse ? {
          id: linkedResponse.id,
          processTitle: (linkedResponse as any).processTitle || "",
          riskLevel: linkedResponse.riskLevel,
          riskScore: linkedResponse.riskScore,
          completed: linkedResponse.completed,
        } : null,
        documents: docsWithContent,
      };
    }),

  // Gerar HTML do documento ROT para visualização/impressão
  getRotHtml: protectedProcedure
    .input(z.object({ rotId: z.number().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [rot] = await db.select().from(rotOperations).where(eq(rotOperations.id, input.rotId));
      if (!rot) throw new TRPCError({ code: "NOT_FOUND" });

      const [org] = await db.select({ name: organizations.name, cnpj: organizations.cnpj }).from(organizations).where(eq(organizations.id, rot.organizationId));
      const [creator] = await db.select({ name: users.name }).from(users).where(eq(users.id, rot.createdById));

      const dataCategories = (rot.dataCategories as any[]) || [];
      const alternativeBases = (rot.alternativeBases as string[]) || [];
      const risksIfNoConsent = (rot.risksIfNoConsent as string[]) || [];
      const aiAnalysis = rot.aiAnalysis as any;

      const hasSensitive = dataCategories.some((d: any) => d.sensivel || d.sensitive);

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ROT - ${rot.title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;500;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Poppins', sans-serif; font-weight: 300; color: #1a1a2e; background: #fff; line-height: 1.6; }
  .document { max-width: 210mm; margin: 0 auto; padding: 20mm 25mm; }
  
  /* Cabeçalho */
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #6B3FD9; padding-bottom: 16px; margin-bottom: 32px; }
  .header-left { flex: 1; }
  .header-logo { height: 40px; margin-bottom: 8px; }
  .header-company { font-size: 10px; font-weight: 200; color: #666; }
  .header-right { text-align: right; }
  .header-right .doc-type { font-size: 18px; font-weight: 500; color: #6B3FD9; letter-spacing: 2px; }
  .header-right .doc-id { font-size: 10px; color: #999; margin-top: 4px; }
  
  /* Metadados */
  .metadata { background: linear-gradient(135deg, #f8f6ff 0%, #f0f8ff 100%); border-radius: 8px; padding: 20px; margin-bottom: 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .metadata-item { display: flex; flex-direction: column; }
  .metadata-label { font-size: 10px; font-weight: 500; color: #6B3FD9; text-transform: uppercase; letter-spacing: 1px; }
  .metadata-value { font-size: 13px; font-weight: 300; color: #333; }
  
  /* Seções */
  .section { margin-bottom: 28px; page-break-inside: avoid; }
  .section-number { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: #6B3FD9; color: #fff; border-radius: 50%; font-size: 13px; font-weight: 500; margin-right: 10px; }
  .section-title { display: flex; align-items: center; font-size: 16px; font-weight: 500; color: #1a1a2e; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e8e0f7; }
  .section-content { font-size: 13px; font-weight: 300; line-height: 1.7; padding-left: 38px; }
  .section-content p { margin-bottom: 8px; }
  
  /* Listas */
  .data-list { list-style: none; padding: 0; }
  .data-list li { padding: 6px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; display: flex; align-items: center; gap: 8px; }
  .data-list li:last-child { border-bottom: none; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 500; }
  .badge-sensitive { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
  .badge-normal { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
  .badge-consent { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
  
  /* Tabela */
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
  th { background: #6B3FD9; color: #fff; padding: 8px 12px; text-align: left; font-weight: 400; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-weight: 300; }
  tr:nth-child(even) { background: #fafafa; }
  
  /* Alerta */
  .alert { padding: 12px 16px; border-radius: 6px; margin: 12px 0; font-size: 12px; display: flex; align-items: flex-start; gap: 8px; }
  .alert-warning { background: #fffbeb; border-left: 3px solid #f59e0b; color: #92400e; }
  .alert-danger { background: #fef2f2; border-left: 3px solid #ef4444; color: #991b1b; }
  .alert-info { background: #f0f8ff; border-left: 3px solid #00A8E8; color: #1e40af; }
  
  /* Risco */
  .risk-box { padding: 16px; border-radius: 8px; margin: 8px 0; }
  .risk-baixa { background: #f0fdf4; border: 1px solid #bbf7d0; }
  .risk-media { background: #fffbeb; border: 1px solid #fde68a; }
  .risk-alta { background: #fef2f2; border: 1px solid #fecaca; }
  .risk-extrema { background: #fef2f2; border: 2px solid #ef4444; }
  .risk-level { font-size: 14px; font-weight: 500; margin-bottom: 8px; }
  
  /* Rodapé */
  .footer { margin-top: 48px; padding-top: 16px; border-top: 2px solid #6B3FD9; display: flex; justify-content: space-between; align-items: flex-end; font-size: 9px; color: #999; }
  .footer-left { font-weight: 200; }
  .footer-right { text-align: right; font-weight: 200; }
  .footer-brand { font-weight: 400; color: #6B3FD9; font-size: 10px; }
  
  /* Status */
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 500; }
  .status-rascunho { background: #f3f4f6; color: #6b7280; }
  .status-em_revisao { background: #fffbeb; color: #d97706; }
  .status-aprovado { background: #f0fdf4; color: #16a34a; }
  .status-arquivado { background: #f3f4f6; color: #9ca3af; }
  
  @media print {
    body { font-size: 11px; }
    .document { padding: 15mm 20mm; }
    .section { page-break-inside: avoid; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
<div class="document">
  <!-- CABEÇALHO -->
  <div class="header">
    <div class="header-left">
      <div style="font-size: 14px; font-weight: 500; color: #6B3FD9;">Seusdados</div>
      <div class="header-company">Seusdados Consultoria em Gestão de Dados Limitada</div>
      <div class="header-company">CNPJ: 33.899.116/0001-63 | seusdados.com</div>
      <div class="header-company">Responsabilidade Técnica: Marcelo Fattori</div>
    </div>
    <div class="header-right">
      <div class="doc-type">REGISTRO DE OPERACOES DE TRATAMENTO</div>
      <div class="doc-id">ROT-${String(rot.id).padStart(6, "0")} | Versao 1.0</div>
      <div class="doc-id">${formatDate(rot.createdAt)}</div>
    </div>
  </div>

  <!-- METADADOS -->
  <div class="metadata">
    <div class="metadata-item">
      <span class="metadata-label">Organizacao</span>
      <span class="metadata-value">${org?.name || "Nao informada"}</span>
    </div>
    <div class="metadata-item">
      <span class="metadata-label">CNPJ</span>
      <span class="metadata-value">${org?.cnpj || "Nao informado"}</span>
    </div>
    <div class="metadata-item">
      <span class="metadata-label">Departamento</span>
      <span class="metadata-value">${rot.department || "Nao especificado"}</span>
    </div>
    <div class="metadata-item">
      <span class="metadata-label">Situacao</span>
      <span class="status-badge status-${rot.status}">${rot.status === "rascunho" ? "Rascunho" : rot.status === "em_revisao" ? "Em Revisao" : rot.status === "aprovado" ? "Aprovado" : "Arquivado"}</span>
    </div>
    <div class="metadata-item">
      <span class="metadata-label">Elaborado por</span>
      <span class="metadata-value">${creator?.name || "Sistema"}</span>
    </div>
    <div class="metadata-item">
      <span class="metadata-label">Data de Criacao</span>
      <span class="metadata-value">${formatDate(rot.createdAt)}</span>
    </div>
    ${rot.approvedById ? `
    <div class="metadata-item">
      <span class="metadata-label">Aprovado por</span>
      <span class="metadata-value">Aprovador ID ${rot.approvedById}</span>
    </div>
    <div class="metadata-item">
      <span class="metadata-label">Data de Aprovacao</span>
      <span class="metadata-value">${formatDate(rot.approvedAt)}</span>
    </div>` : ""}
  </div>

  <!-- TÍTULO -->
  <h1 style="font-size: 22px; font-weight: 500; color: #1a1a2e; margin-bottom: 24px; padding-bottom: 8px; border-bottom: 2px solid #f0f0f0;">${rot.title}</h1>
  ${rot.description ? `<p style="font-size: 14px; font-weight: 300; color: #555; margin-bottom: 24px;">${rot.description}</p>` : ""}

  <!-- 1. FINALIDADE -->
  <div class="section">
    <div class="section-title"><span class="section-number">1</span>Finalidade do Tratamento</div>
    <div class="section-content"><p>${rot.purpose}</p></div>
  </div>

  <!-- 2. BASE LEGAL -->
  <div class="section">
    <div class="section-title"><span class="section-number">2</span>Base Legal</div>
    <div class="section-content">
      <p><strong>Base Legal Principal:</strong> ${rot.legalBase}</p>
      ${alternativeBases.length > 0 ? `<p><strong>Bases Alternativas:</strong></p><ul class="data-list">${alternativeBases.map((b: string) => `<li>${b}</li>`).join("")}</ul>` : ""}
      ${rot.requiresConsent ? `<div class="alert alert-warning">Este tratamento requer consentimento do titular conforme a LGPD.</div>` : ""}
      ${risksIfNoConsent.length > 0 ? `<div class="alert alert-danger"><div><strong>Riscos sem consentimento:</strong><ul style="margin-top: 4px; padding-left: 16px;">${risksIfNoConsent.map((r: string) => `<li>${r}</li>`).join("")}</ul></div></div>` : ""}
      ${rot.justification ? `<p style="margin-top: 8px;"><strong>Justificativa:</strong> ${rot.justification}</p>` : ""}
    </div>
  </div>

  <!-- 3. CATEGORIAS DE DADOS -->
  <div class="section">
    <div class="section-title"><span class="section-number">3</span>Categorias de Dados Pessoais</div>
    <div class="section-content">
      ${hasSensitive ? `<div class="alert alert-danger">Este tratamento envolve dados sensiveis conforme art. 5, II da LGPD. Medidas adicionais de protecao sao obrigatorias.</div>` : ""}
      <table>
        <thead><tr><th>Categoria</th><th>Classificacao</th></tr></thead>
        <tbody>${dataCategories.map((d: any) => `<tr><td>${d.name || d}</td><td>${(d.sensivel || d.sensitive) ? '<span class="badge badge-sensitive">Sensivel</span>' : '<span class="badge badge-normal">Normal</span>'}</td></tr>`).join("")}</tbody>
      </table>
    </div>
  </div>

  <!-- 4. TITULARES -->
  <div class="section">
    <div class="section-title"><span class="section-number">4</span>Categorias de Titulares</div>
    <div class="section-content">
      <p>${rot.titularCategory}</p>
    </div>
  </div>

  <!-- 5. ANÁLISE DE RISCO (se houver) -->
  ${aiAnalysis ? `
  <div class="section">
    <div class="section-title"><span class="section-number">5</span>Analise de Risco</div>
    <div class="section-content">
      <div class="risk-box risk-${(aiAnalysis as any)?.level || "media"}">
        <div class="risk-level">Nivel de Risco: ${((aiAnalysis as any)?.level || "Nao avaliado").toUpperCase()}</div>
        ${(aiAnalysis as any)?.factors ? `<p><strong>Fatores de Risco:</strong></p><ul class="data-list">${((aiAnalysis as any).factors as string[]).map((f: string) => `<li>${f}</li>`).join("")}</ul>` : ""}
        ${(aiAnalysis as any)?.mitigations ? `<p style="margin-top: 8px;"><strong>Acoes de Mitigacao:</strong></p><ul class="data-list">${((aiAnalysis as any).mitigations as string[]).map((m: string) => `<li>${m}</li>`).join("")}</ul>` : ""}
      </div>
    </div>
  </div>` : ""}

  <!-- RODAPÉ -->
  <div class="footer">
    <div class="footer-left">
      <div class="footer-brand">Seusdados Consultoria em Gestão de Dados Limitada</div>
      <div>CNPJ: 33.899.116/0001-63 | seusdados.com</div>
      <div>Responsabilidade Técnica: Marcelo Fattori</div>
    </div>
    <div class="footer-right">
      <div>Documento gerado em ${formatDateTime(new Date().toISOString())}</div>
      <div>ROT-${String(rot.id).padStart(6, "0")} | Documento Confidencial</div>
    </div>
  </div>
</div>
</body>
</html>`;

      return { html, title: rot.title, rotId: rot.id };
    }),

  // Gerar HTML do POP para visualização/impressão
  getPopHtml: protectedProcedure
    .input(z.object({ rotId: z.number().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [rot] = await db.select().from(rotOperations).where(eq(rotOperations.id, input.rotId));
      if (!rot) throw new TRPCError({ code: "NOT_FOUND" });

      const [org] = await db.select({ name: organizations.name, cnpj: organizations.cnpj }).from(organizations).where(eq(organizations.id, rot.organizationId));

      // Buscar POP do GED
      const popDocs = await db
        .select({ gedDocId: mapeamentoGedDocuments.gedDocumentId, version: mapeamentoGedDocuments.version })
        .from(mapeamentoGedDocuments)
        .where(and(eq(mapeamentoGedDocuments.rotId, input.rotId), eq(mapeamentoGedDocuments.documentType, "pop"), eq(mapeamentoGedDocuments.isLatest, 1)));

      let popContent = "";
      let popTitle = `POP - ${rot.title}`;
      if (popDocs.length > 0) {
        const [gedDoc] = await db.select({ name: gedDocuments.name, description: gedDocuments.description, fileUrl: gedDocuments.fileUrl }).from(gedDocuments).where(eq(gedDocuments.id, popDocs[0].gedDocId));
        // Try to fetch content from fileUrl if available
        if (gedDoc?.fileUrl) {
          try {
            const resp = await fetch(gedDoc.fileUrl);
            if (resp.ok) popContent = await resp.text();
          } catch { /* fallback to description */ }
        }
        if (!popContent) popContent = gedDoc?.description || "";
        popTitle = gedDoc?.name || popTitle;
      }

      // Converter Markdown básico para HTML
      const contentHtml = popContent
        .replace(/^### (.+)$/gm, '<h3 style="font-size: 15px; font-weight: 500; color: #1a1a2e; margin: 16px 0 8px 0;">$1</h3>')
        .replace(/^## (.+)$/gm, '<div class="section"><div class="section-title">$1</div></div>')
        .replace(/^# (.+)$/gm, '<h1 style="font-size: 22px; font-weight: 500; margin-bottom: 16px;">$1</h1>')
        .replace(/^\- \*\*(.+?):\*\* (.+)$/gm, '<div style="margin: 4px 0; font-size: 13px;"><strong>$1:</strong> $2</div>')
        .replace(/^\- (.+)$/gm, '<li style="font-size: 13px; padding: 4px 0;">$1</li>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n{2,}/g, '<br><br>')
        .replace(/\n/g, '<br>');

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${popTitle}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;500;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Poppins', sans-serif; font-weight: 300; color: #1a1a2e; background: #fff; line-height: 1.6; }
  .document { max-width: 210mm; margin: 0 auto; padding: 20mm 25mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #10B981; padding-bottom: 16px; margin-bottom: 32px; }
  .header-left { flex: 1; }
  .header-company { font-size: 10px; font-weight: 200; color: #666; }
  .header-right { text-align: right; }
  .header-right .doc-type { font-size: 18px; font-weight: 500; color: #10B981; letter-spacing: 2px; }
  .header-right .doc-id { font-size: 10px; color: #999; margin-top: 4px; }
  .metadata { background: linear-gradient(135deg, #f0fdf4 0%, #f0f8ff 100%); border-radius: 8px; padding: 20px; margin-bottom: 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .metadata-item { display: flex; flex-direction: column; }
  .metadata-label { font-size: 10px; font-weight: 500; color: #10B981; text-transform: uppercase; letter-spacing: 1px; }
  .metadata-value { font-size: 13px; font-weight: 300; color: #333; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 16px; font-weight: 500; color: #1a1a2e; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #d1fae5; }
  .content { font-size: 13px; font-weight: 300; line-height: 1.7; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 2px solid #10B981; display: flex; justify-content: space-between; align-items: flex-end; font-size: 9px; color: #999; }
  .footer-left { font-weight: 200; }
  .footer-right { text-align: right; font-weight: 200; }
  .footer-brand { font-weight: 400; color: #10B981; font-size: 10px; }
  @media print { body { font-size: 11px; } .document { padding: 15mm 20mm; } }
</style>
</head>
<body>
<div class="document">
  <div class="header">
    <div class="header-left">
      <div style="font-size: 14px; font-weight: 500; color: #10B981;">Seusdados</div>
      <div class="header-company">Seusdados Consultoria em Gestão de Dados Limitada</div>
      <div class="header-company">CNPJ: 33.899.116/0001-63 | seusdados.com</div>
      <div class="header-company">Responsabilidade Técnica: Marcelo Fattori</div>
    </div>
    <div class="header-right">
      <div class="doc-type">PROCEDIMENTO OPERACIONAL PADRAO</div>
      <div class="doc-id">POP-${String(rot.id).padStart(6, "0")} | Versao ${popDocs[0]?.version || 1}.0</div>
      <div class="doc-id">${formatDate(rot.createdAt)}</div>
    </div>
  </div>

  <div class="metadata">
    <div class="metadata-item">
      <span class="metadata-label">Organizacao</span>
      <span class="metadata-value">${org?.name || "Nao informada"}</span>
    </div>
    <div class="metadata-item">
      <span class="metadata-label">CNPJ</span>
      <span class="metadata-value">${org?.cnpj || "Nao informado"}</span>
    </div>
    <div class="metadata-item">
      <span class="metadata-label">ROT Vinculado</span>
      <span class="metadata-value">ROT-${String(rot.id).padStart(6, "0")} - ${rot.title}</span>
    </div>
    <div class="metadata-item">
      <span class="metadata-label">Base Legal</span>
      <span class="metadata-value">${rot.legalBase}</span>
    </div>
  </div>

  <h1 style="font-size: 22px; font-weight: 500; color: #1a1a2e; margin-bottom: 24px;">${popTitle}</h1>

  <div class="content">
    ${contentHtml || '<p style="color: #999;">Nenhum POP gerado para este ROT. Utilize a funcao de geracao automatica.</p>'}
  </div>

  <div class="footer">
    <div class="footer-left">
      <div class="footer-brand">Seusdados Consultoria em Gestão de Dados Limitada</div>
      <div>CNPJ: 33.899.116/0001-63 | seusdados.com</div>
      <div>Responsabilidade Técnica: Marcelo Fattori</div>
    </div>
    <div class="footer-right">
      <div>Documento gerado em ${formatDateTime(new Date().toISOString())}</div>
      <div>POP-${String(rot.id).padStart(6, "0")} | Documento Confidencial</div>
    </div>
  </div>
</div>
</body>
</html>`;

      return { html, title: popTitle, rotId: rot.id };
    }),

  // Listar histórico de versões de um campo
  getVersionHistory: protectedProcedure
    .input(z.object({
      entityType: z.enum(["rot", "pop", "justificativa", "base_legal", "analise_risco", "recomendacoes", "ropa"]),
      entityId: z.number().positive(),
      fieldName: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const conditions = [
        eq(textVersionHistory.entityType, input.entityType),
        eq(textVersionHistory.entityId, input.entityId),
      ];
      if (input.fieldName) {
        conditions.push(eq(textVersionHistory.fieldName, input.fieldName));
      }

      const versions = await db
        .select()
        .from(textVersionHistory)
        .where(and(...conditions))
        .orderBy(desc(textVersionHistory.version));

      return versions;
    }),

  // Salvar nova versão de um texto
  saveVersion: protectedProcedure
    .input(z.object({
      entityType: z.enum(["rot", "pop", "justificativa", "base_legal", "analise_risco", "recomendacoes", "ropa"]),
      entityId: z.number().positive(),
      organizationId: z.number().positive(),
      fieldName: z.string(),
      content: z.string(),
      previousContent: z.string().optional(),
      changeReason: z.string().optional(),
      changeType: z.enum(["criacao", "edicao_manual", "geracao_ia", "revisao", "aprovacao"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Buscar versão mais recente
      const [latest] = await db
        .select({ version: textVersionHistory.version })
        .from(textVersionHistory)
        .where(and(
          eq(textVersionHistory.entityType, input.entityType),
          eq(textVersionHistory.entityId, input.entityId),
          eq(textVersionHistory.fieldName, input.fieldName),
        ))
        .orderBy(desc(textVersionHistory.version))
        .limit(1);

      const nextVersion = (latest?.version || 0) + 1;

      await db.insert(textVersionHistory).values({
        entityType: input.entityType,
        entityId: input.entityId,
        organizationId: input.organizationId,
        fieldName: input.fieldName,
        content: input.content,
        previousContent: input.previousContent || null,
        version: nextVersion,
        changeReason: input.changeReason || null,
        changeType: input.changeType || "edicao_manual",
        createdById: ctx.user.id,
        createdByName: ctx.user.name,
      });

      return { version: nextVersion, success: true };
    }),

  // Comparar duas versões
  compareVersions: protectedProcedure
    .input(z.object({
      versionAId: z.number().positive(),
      versionBId: z.number().positive(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [versionA] = await db.select().from(textVersionHistory).where(eq(textVersionHistory.id, input.versionAId));
      const [versionB] = await db.select().from(textVersionHistory).where(eq(textVersionHistory.id, input.versionBId));

      if (!versionA || !versionB) throw new TRPCError({ code: "NOT_FOUND", message: "Versao nao encontrada" });

      return { versionA, versionB };
    }),

  // Listar todos os ROTs de uma organização com status dos documentos
  listRotsWithDocs: protectedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const rots = await db
        .select()
        .from(rotOperations)
        .where(eq(rotOperations.organizationId, input.organizationId))
        .orderBy(desc(rotOperations.createdAt));

      const result = [];
      for (const rot of rots) {
        // Contar documentos por tipo
        const docs = await db
          .select({ documentType: mapeamentoGedDocuments.documentType, cnt: sql<number>`COUNT(*)` })
          .from(mapeamentoGedDocuments)
          .where(eq(mapeamentoGedDocuments.rotId, rot.id))
          .groupBy(mapeamentoGedDocuments.documentType);

        const docCounts: Record<string, number> = {};
        for (const d of docs) {
          docCounts[d.documentType] = Number(d.cnt);
        }

        // Contar versões de texto
        const [versionCount] = await db
          .select({ cnt: sql<number>`COUNT(*)` })
          .from(textVersionHistory)
          .where(and(
            eq(textVersionHistory.entityType, "rot"),
            eq(textVersionHistory.entityId, rot.id),
          ));

        result.push({
          ...rot,
          dataCategories: rot.dataCategories as any[],
          alternativeBases: rot.alternativeBases as any,
          docCounts,
          versionCount: Number(versionCount?.cnt || 0),
        });
      }

      return result;
    }),

  // ==================== PREMIUM ROPA EXPORT ====================

  generateRopaPdf: protectedProcedure
    .input(z.object({ rotId: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [rot] = await db
        .select()
        .from(rotOperations)
        .where(eq(rotOperations.id, input.rotId));

      if (!rot) throw new TRPCError({ code: "NOT_FOUND", message: "ROT não encontrado" });
      if (
        ctx.user.organizationId !== rot.organizationId &&
        ctx.user.role !== "admin_global"
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const ropaData = (rot as any).ropaData;
      const pdfBytes = await generateRopaPdfBytes(ropaData || {}, `ROPA-${rot.title}`);

      const link = await saveBinaryDocumentToGed({
        rotId: input.rotId,
        organizationId: rot.organizationId,
        documentType: "ropa",
        title: `ROPA (PDF) - ${rot.title}`,
        content: "binary",
        description: "Exportação premium de ROPA em PDF",
        userId: ctx.user.id,
        tags: ["ropa", "export", "pdf"],
        bytes: pdfBytes,
        mimeType: "application/pdf",
        fileExtension: "pdf",
      });

      // Versionamento automático: salvar snapshot Markdown do ROPA
      try {
        const { generateROPADocument } = await import("./mapeamentoService");
        const ropaMarkdown = generateROPADocument(rot);
        const [latestV] = await db
          .select({ version: textVersionHistory.version })
          .from(textVersionHistory)
          .where(and(
            eq(textVersionHistory.entityType, "ropa"),
            eq(textVersionHistory.entityId, input.rotId),
            eq(textVersionHistory.fieldName, "ropa_completo"),
          ))
          .orderBy(desc(textVersionHistory.version))
          .limit(1);
        const nextV = (latestV?.version || 0) + 1;
        await db.insert(textVersionHistory).values({
          entityType: "ropa",
          entityId: input.rotId,
          organizationId: rot.organizationId,
          fieldName: "ropa_completo",
          content: ropaMarkdown,
          previousContent: null,
          version: nextV,
          changeReason: `Exportação ROPA PDF v${nextV}`,
          changeType: "geracao_ia",
          createdById: ctx.user.id,
          createdByName: ctx.user.name,
        });
      } catch (e) {
        console.warn("[ROPA] Falha ao versionar ROPA:", e);
      }

      return {
        ok: true,
        gedDocumentId: (link as any)?.gedDocumentId,
        url: (link as any)?.gedDocument?.fileUrl || null,
      };
    }),

  exportRopaCsv: protectedProcedure
    .input(z.object({ rotId: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [rot] = await db
        .select()
        .from(rotOperations)
        .where(eq(rotOperations.id, input.rotId));

      if (!rot) throw new TRPCError({ code: "NOT_FOUND", message: "ROT não encontrado" });
      if (
        ctx.user.organizationId !== rot.organizationId &&
        ctx.user.role !== "admin_global"
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const ropaData = (rot as any).ropaData;
      const csvContent = generateRopaCsv(ropaData || {}, rot.title);
      const csvBytes = Buffer.from(csvContent, "utf-8");

      const link = await saveBinaryDocumentToGed({
        rotId: input.rotId,
        organizationId: rot.organizationId,
        documentType: "ropa",
        title: `ROPA (CSV) - ${rot.title}`,
        content: "binary",
        description: "Exportação premium de ROPA em CSV",
        userId: ctx.user.id,
        tags: ["ropa", "export", "csv"],
        bytes: csvBytes,
        mimeType: "text/csv",
        fileExtension: "csv",
      });

      return {
        ok: true,
        gedDocumentId: (link as any)?.gedDocumentId,
        url: (link as any)?.gedDocument?.fileUrl || null,
      };
    }),

  // Exportação ROPA como Excel (.xlsx) com todas as operações da organização
  exportRopaExcel: protectedProcedure
    .input(z.object({ organizationId: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (
        ctx.user.organizationId !== input.organizationId &&
        ctx.user.role !== "admin_global"
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const excelBuffer = await generateROPAExcel(input.organizationId);

      const link = await saveBinaryDocumentToGed({
        rotId: 0,
        organizationId: input.organizationId,
        documentType: "ropa",
        title: `ROPA Completo (Excel) - Organizacao ${input.organizationId}`,
        content: "binary",
        description: "Exportacao premium de ROPA completo em Excel (.xlsx)",
        userId: ctx.user.id,
        tags: ["ropa", "export", "excel", "xlsx"],
        bytes: excelBuffer,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileExtension: "xlsx",
      });

      return {
        ok: true,
        gedDocumentId: (link as any)?.gedDocumentId,
        url: (link as any)?.gedDocument?.fileUrl || null,
      };
    }),
});
