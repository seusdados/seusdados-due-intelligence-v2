import PDFDocument from "pdfkit";
import { logger } from "./_core/logger";
import ExcelJS from "exceljs";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { rotOperations, organizations } from "../drizzle/schema";
import { TRPCError } from '@trpc/server';

// ==========================
// EXPORTAÇÃO ROPA - PDF
// ==========================

export async function generateROPAPDF(organizationId: number): Promise<Buffer> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Buscar organização
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId));

  // Buscar todos os ROTs da organização
  const rots = await db
    .select()
    .from(rotOperations)
    .where(eq(rotOperations.organizationId, organizationId));

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ 
      size: "A4", 
      margin: 50,
      info: {
        Title: `ROPA - ${org?.name || "Organização"}`,
        Author: "Seusdados Consultoria",
        Subject: "Registro de Atividades de Tratamento de Dados Pessoais"
      }
    });

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    doc.fontSize(20).font("Helvetica-Bold").fillColor("#6B21A8")
       .text("REGISTRO DE ATIVIDADES DE TRATAMENTO", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(14).font("Helvetica").fillColor("#374151")
       .text("(ROPA - Record of Processing Activities)", { align: "center" });
    doc.moveDown();
    doc.fontSize(10).fillColor("#6B7280")
       .text(`Conforme Art. 37 da LGPD (Lei nº 13.709/2018)`, { align: "center" });
    doc.moveDown(2);

    // Informações da Organização
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#1F2937")
       .text("DADOS DO CONTROLADOR");
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica").fillColor("#374151");
    doc.text(`Razão Social: ${org?.name || "Não informado"}`);
    doc.text(`CNPJ: ${org?.cnpj || "Não informado"}`);
    doc.text(`Endereço: ${org?.address || "Não informado"}`);
    doc.text(`Data de Geração: ${new Date().toLocaleDateString("pt-BR")}`);
    doc.moveDown(2);

    // Sumário
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#1F2937")
       .text("SUMÁRIO EXECUTIVO");
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica").fillColor("#374151");
    doc.text(`Total de Operações de Tratamento: ${rots.length}`);
    
    const statusCounts = {
      rascunho: rots.filter(r => r.status === "rascunho").length,
      em_revisao: rots.filter(r => r.status === "em_revisao").length,
      aprovado: rots.filter(r => r.status === "aprovado").length,
      arquivado: rots.filter(r => r.status === "arquivado").length,
    };
    doc.text(`Em Rascunho: ${statusCounts.rascunho}`);
    doc.text(`Em Revisão: ${statusCounts.em_revisao}`);
    doc.text(`Aprovados: ${statusCounts.aprovado}`);
    doc.text(`Arquivados: ${statusCounts.arquivado}`);
    doc.moveDown(2);

    // Operações de Tratamento
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#1F2937")
       .text("OPERAÇÕES DE TRATAMENTO DE DADOS PESSOAIS");
    doc.moveDown();

    rots.forEach((rot, index) => {
      // Verificar se precisa de nova página
      if (doc.y > 700) {
        doc.addPage();
      }

      doc.fontSize(11).font("Helvetica-Bold").fillColor("#6B21A8")
         .text(`${index + 1}. ${rot.title}`);
      doc.moveDown(0.3);

      doc.fontSize(9).font("Helvetica").fillColor("#374151");
      
      // Descrição
      doc.font("Helvetica-Bold").text("Descrição: ", { continued: true });
      doc.font("Helvetica").text(rot.description || "Não informada");
      
      // Departamento
      doc.font("Helvetica-Bold").text("Departamento: ", { continued: true });
      doc.font("Helvetica").text(rot.department || "Não informado");
      
      // Categoria de Titular
      doc.font("Helvetica-Bold").text("Categoria de Titular: ", { continued: true });
      doc.font("Helvetica").text(rot.titularCategory || "Não informada");
      
      // Finalidade
      doc.font("Helvetica-Bold").text("Finalidade: ", { continued: true });
      doc.font("Helvetica").text(rot.purpose || "Não informada");
      
      // Base Legal
      doc.font("Helvetica-Bold").text("Base Legal: ", { continued: true });
      doc.font("Helvetica").text(rot.legalBase || "Não definida");
      
      // Dados Tratados
      const dataCategories = rot.dataCategories as { name: string; sensivel: boolean }[] || [];
      const dataList = dataCategories.map(cat => `${cat.name}${cat.sensivel ? ' (sensível)' : ''}`).join(", ");
      doc.font("Helvetica-Bold").text("Dados Tratados: ", { continued: true });
      doc.font("Helvetica").text(dataList || "Não informados");
      
      // Nível de Risco
      doc.font("Helvetica-Bold").text("Nível de Risco: ", { continued: true });
      doc.font("Helvetica").text((rot as any).riskLevel || "Não avaliado");
      
      // Status
      const statusLabels: Record<string, string> = {
        rascunho: "Rascunho",
        em_revisao: "Em Revisão",
        aprovado: "Aprovado",
        arquivado: "Arquivado",
      };
      doc.font("Helvetica-Bold").text("Status: ", { continued: true });
      doc.font("Helvetica").text(statusLabels[rot.status || "rascunho"] || rot.status || "Rascunho");
      
      doc.moveDown(1.5);
    });

    // Rodapé
    doc.fontSize(8).fillColor("#9CA3AF")
       .text("Documento gerado automaticamente pelo sistema Seusdados Due Diligence", 50, 780, { align: "center" });

    doc.end();
  });
}

// ==========================
// EXPORTAÇÃO ROPA - EXCEL
// ==========================

export async function generateROPAExcel(organizationId: number): Promise<Buffer> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Buscar organização
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId));

  // Buscar todos os ROTs da organização
  const rots = await db
    .select()
    .from(rotOperations)
    .where(eq(rotOperations.organizationId, organizationId));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Seusdados Consultoria";
  workbook.created = new Date();

  // Aba de Informações Gerais
  const infoSheet = workbook.addWorksheet("Informações");
  infoSheet.columns = [
    { header: "Campo", key: "campo", width: 30 },
    { header: "Valor", key: "valor", width: 50 },
  ];

  infoSheet.addRows([
    { campo: "Razão Social", valor: org?.name || "Não informado" },
    { campo: "CNPJ", valor: org?.cnpj || "Não informado" },
    { campo: "Endereço", valor: org?.address || "Não informado" },
    { campo: "Data de Geração", valor: new Date().toLocaleDateString("pt-BR") },
    { campo: "Total de Operações", valor: rots.length },
  ]);

  // Estilizar header
  infoSheet.getRow(1).font = { bold: true };
  infoSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF6B21A8" },
  };
  infoSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  // Aba de Operações de Tratamento
  const ropaSheet = workbook.addWorksheet("ROPA");
  ropaSheet.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "Título", key: "titulo", width: 30 },
    { header: "Descrição", key: "descricao", width: 40 },
    { header: "Departamento", key: "departamento", width: 20 },
    { header: "Categoria de Titular", key: "titular", width: 20 },
    { header: "Finalidade", key: "finalidade", width: 30 },
    { header: "Base Legal", key: "baseLegal", width: 40 },
    { header: "Dados Tratados", key: "dados", width: 40 },
    { header: "Dados Sensíveis", key: "sensiveis", width: 15 },
    { header: "Nível de Risco", key: "risco", width: 15 },
    { header: "Status", key: "status", width: 15 },
    { header: "Criado em", key: "criadoEm", width: 15 },
  ];

  const statusLabels: Record<string, string> = {
    rascunho: "Rascunho",
    em_revisao: "Em Revisão",
    aprovado: "Aprovado",
    arquivado: "Arquivado",
  };

  const riskLabels: Record<string, string> = {
    baixo: "Baixo",
    medio: "Médio",
    alto: "Alto",
    critico: "Crítico",
  };

  rots.forEach((rot) => {
    const dataCategories = rot.dataCategories as { name: string; sensivel: boolean }[] || [];
    const dataList = dataCategories.map(cat => cat.name).join(", ");
    const hasSensitive = dataCategories.some(cat => cat.sensivel);

    ropaSheet.addRow({
      id: rot.id,
      titulo: rot.title,
      descricao: rot.description || "",
      departamento: rot.department || "",
      titular: rot.titularCategory || "",
      finalidade: rot.purpose || "",
      baseLegal: rot.legalBase || "",
      dados: dataList,
      sensiveis: hasSensitive ? "Sim" : "Não",
      risco: riskLabels[(rot as any).riskLevel || ""] || "Não avaliado",
      status: statusLabels[rot.status || "rascunho"] || rot.status || "Rascunho",
      criadoEm: rot.createdAt ? new Date(rot.createdAt).toLocaleDateString("pt-BR") : "",
    });
  });

  // Estilizar header
  ropaSheet.getRow(1).font = { bold: true };
  ropaSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF6B21A8" },
  };
  ropaSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  // Adicionar filtros
  ropaSheet.autoFilter = {
    from: "A1",
    to: "L1",
  };

  // Congelar primeira linha
  ropaSheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}


// ==========================
// FUNÇÕES DE WRAPPER PARA ROUTER
// ==========================

export async function getRotStats(organizationId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const rots = await db
    .select()
    .from(rotOperations)
    .where(eq(rotOperations.organizationId, organizationId));

  return {
    total: rots.length,
    rascunho: rots.filter(r => r.status === "rascunho").length,
    emRevisao: rots.filter(r => r.status === "em_revisao").length,
    aprovado: rots.filter(r => r.status === "aprovado").length,
    arquivado: rots.filter(r => r.status === "arquivado").length,
  };
}

export async function exportROPAPDF(organizationId: number, user: any) {
  const pdfBuffer = await generateROPAPDF(organizationId);
  const base64 = pdfBuffer.toString('base64');
  
  return {
    data: base64,
    filename: `ROPA-${organizationId}-${Date.now()}.pdf`,
    mimeType: 'application/pdf'
  };
}

export async function exportROPAExcel(organizationId: number, user: any) {
  const excelBuffer = await generateROPAExcel(organizationId);
  const base64 = excelBuffer.toString('base64');
  
  return {
    data: base64,
    filename: `ROPA-${organizationId}-${Date.now()}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
}


// ==========================
// PREMIUM: ROPA CSV (Excel-friendly)
// ==========================

export function generateRopaCsv(ropaData: any, rotTitle: string): string {
  const BOM = "\uFEFF";
  const sep = ";";
  const rows: string[][] = [];

  rows.push(["Campo", "Valor"]);
  rows.push(["Processo", rotTitle || ""]);
  rows.push(["Versão", ropaData?.version || "premium-v1"]);
  rows.push(["Área", ropaData?.areaName || ""]);
  rows.push(["Finalidade", ropaData?.purpose || ""]);
  rows.push(["Base Legal", ropaData?.legalBase || ""]);
  rows.push(["Titulares", Array.isArray(ropaData?.dataSubjects) ? ropaData.dataSubjects.join(", ") : ""]);

  const cats = Array.isArray(ropaData?.dataCategories) ? ropaData.dataCategories : [];
  const comuns = cats.filter((c: any) => !c?.sensivel).map((c: any) => c?.name || "").join(", ");
  const sensiveis = cats.filter((c: any) => c?.sensivel).map((c: any) => c?.name || "").join(", ");
  rows.push(["Dados Comuns", comuns]);
  rows.push(["Dados Sensíveis", sensiveis]);

  const rd = ropaData?.ropaData || {};
  rows.push(["Fontes de Coleta", Array.isArray(rd.collectionSources) ? rd.collectionSources.join(", ") : ""]);
  rows.push(["Canais de Coleta", Array.isArray(rd.collectionChannels) ? rd.collectionChannels.join(", ") : ""]);
  rows.push(["Sistemas Utilizados", Array.isArray(rd.systemsUsed) ? rd.systemsUsed.join(", ") : ""]);
  rows.push(["Perfis de Acesso", Array.isArray(rd.accessProfiles) ? rd.accessProfiles.join(", ") : ""]);
  rows.push(["Logs/Rastreabilidade", rd.logsAndTraceability || ""]);
  rows.push(["Critério de Descarte", rd.disposalCriteria || ""]);
  rows.push(["Volume/Frequência", rd.volumeFrequency || ""]);

  // Operadores
  const ops = Array.isArray(rd.operators) ? rd.operators : [];
  if (ops.length > 0) {
    rows.push(["", ""]);
    rows.push(["--- Operadores/Terceiros ---", ""]);
    for (const op of ops) {
      rows.push([
        `Operador: ${op.name || ""}`,
        `Papel: ${op.role || "operador"} | Serviço: ${op.serviceType || ""} | País: ${op.country || ""} | Contrato: ${op.hasContract ? "Sim" : "Não"} | DPA: ${op.hasDpa ? "Sim" : "Não"}`
      ]);
    }
  }

  rows.push(["", ""]);
  rows.push(["Compartilhamento", Array.isArray(ropaData?.sharing) ? ropaData.sharing.join(", ") : ""]);
  rows.push(["Transferência Internacional", ropaData?.internationalTransfer ? "Sim" : "Não"]);
  rows.push(["Países", Array.isArray(ropaData?.internationalCountries) ? ropaData.internationalCountries.join(", ") : ""]);
  rows.push(["Período de Retenção", ropaData?.retentionPeriod || ""]);
  rows.push(["Local de Armazenamento", ropaData?.storageLocation || ""]);
  rows.push(["Medidas de Segurança", Array.isArray(ropaData?.securityMeasures) ? ropaData.securityMeasures.join(", ") : ""]);
  rows.push(["Crianças/Adolescentes", rd.childrenOrTeens ? "Sim" : "Não"]);
  rows.push(["Monitoramento Sistemático", rd.systematicMonitoring ? "Sim" : "Não"]);
  rows.push(["Larga Escala", rd.largeScale ? "Sim" : "Não"]);
  rows.push(["Nível de Risco", ropaData?.riskLevel || ""]);
  rows.push(["Score de Risco", ropaData?.riskScore != null ? String(ropaData.riskScore) : ""]);

  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => {
          const escaped = String(cell).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(sep)
    )
    .join("\n");

  return BOM + csvContent;
}


// ==========================
// PREMIUM: ROPA PDF (HTML-based)
// ==========================

export async function generateRopaPdfBytes(ropaDataOrMarkdown: any, title: string): Promise<Buffer> {
  const html = generateRopaHtml(ropaDataOrMarkdown, title);

  try {
    const { generatePDF } = await import("./pdfService");
    return await generatePDF(html);
  } catch (e) {
    logger.error("[ROPA-PDF] Erro ao gerar PDF via pdfService, tentando fallback:", e);
    return Buffer.from(html, "utf-8");
  }
}

function generateRopaHtml(ropaData: any, title: string): string {
  const isMarkdown = typeof ropaData === "string";

  if (isMarkdown) {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${escHtml(title)}</title>
  <style>
    body { font-family: 'Inter', 'Segoe UI', sans-serif; font-size: 12px; color: #1a1a2e; margin: 40px; line-height: 1.6; }
    h1 { color: #6B3FD9; font-size: 22px; border-bottom: 2px solid #6B3FD9; padding-bottom: 8px; }
    h2 { color: #00A8E8; font-size: 16px; margin-top: 24px; }
    .footer { margin-top: 40px; font-size: 10px; color: #888; text-align: center; border-top: 1px solid #ddd; padding-top: 12px; }
    pre { white-space: pre-wrap; font-family: inherit; }
  </style>
</head>
<body>
  <pre>${escHtml(ropaData)}</pre>
  <div class="footer">
    Documento gerado automaticamente pelo Sistema Seusdados Due Diligence<br>
    Seusdados Consultoria em Gestão de Dados Limitada - CNPJ 33.899.116/0001-63 - seusdados.com
  </div>
</body>
</html>`;
  }

  const rd = ropaData?.ropaData || {};
  const cats = Array.isArray(ropaData?.dataCategories) ? ropaData.dataCategories : [];
  const comuns = cats.filter((c: any) => !c?.sensivel).map((c: any) => c?.name || "").join(", ");
  const sensiveis = cats.filter((c: any) => c?.sensivel).map((c: any) => c?.name || "").join(", ");
  const ops = Array.isArray(rd.operators) ? rd.operators : [];

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${escHtml(title)}</title>
  <style>
    body { font-family: 'Inter', 'Segoe UI', sans-serif; font-size: 12px; color: #1a1a2e; margin: 40px; line-height: 1.6; }
    h1 { color: #6B3FD9; font-size: 22px; border-bottom: 2px solid #6B3FD9; padding-bottom: 8px; }
    h2 { color: #00A8E8; font-size: 16px; margin-top: 24px; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
    th { background: #f0e6ff; color: #6B3FD9; }
    .field-label { font-weight: 600; color: #333; min-width: 200px; }
    .danger { background: #f8d7da; border: 1px solid #f5c6cb; padding: 8px 12px; border-radius: 4px; margin: 8px 0; }
    .footer { margin-top: 40px; font-size: 10px; color: #888; text-align: center; border-top: 1px solid #ddd; padding-top: 12px; }
  </style>
</head>
<body>
  <h1>ROPA - Registro de Operações de Tratamento</h1>
  <p><strong>Processo:</strong> ${escHtml(ropaData?.processTitle || title)}</p>
  <p><strong>Área:</strong> ${escHtml(ropaData?.areaName || "\u2014")}</p>
  <p><strong>Data de Geração:</strong> ${new Date().toLocaleDateString("pt-BR")}</p>

  <h2>1. Finalidade do Tratamento</h2>
  <p>${escHtml(ropaData?.purpose || "\u2014")}</p>

  <h2>2. Base Legal</h2>
  <p>${escHtml(ropaData?.legalBase || "\u2014")}</p>

  <h2>3. Categorias de Titulares</h2>
  <p>${escHtml(Array.isArray(ropaData?.dataSubjects) ? ropaData.dataSubjects.join(", ") : "\u2014")}</p>

  <h2>4. Categorias de Dados</h2>
  <table>
    <tr><th>Tipo</th><th>Dados</th></tr>
    <tr><td class="field-label">Dados Comuns</td><td>${escHtml(comuns || "\u2014")}</td></tr>
    <tr><td class="field-label">Dados Sensíveis</td><td>${escHtml(sensiveis || "\u2014")}</td></tr>
  </table>
  ${sensiveis ? '<div class="danger">Este tratamento envolve dados sensíveis conforme art. 5, II da LGPD.</div>' : ""}

  <h2>5. Operadores / Terceiros</h2>
  ${ops.length > 0 ? `
  <table>
    <tr><th>Nome</th><th>Papel</th><th>Serviço</th><th>País</th><th>Contrato</th><th>DPA</th><th>Anexo Seg.</th></tr>
    ${ops.map((o: any) => `
    <tr>
      <td>${escHtml(o.name || "")}</td>
      <td>${escHtml(o.role || "operador")}</td>
      <td>${escHtml(o.serviceType || "")}</td>
      <td>${escHtml(o.country || "")}</td>
      <td>${o.hasContract ? "Sim" : "Não"}</td>
      <td>${o.hasDpa ? "Sim" : "Não"}</td>
      <td>${o.hasSecurityAnnex ? "Sim" : "Não"}</td>
    </tr>`).join("")}  
  </table>` : "<p>\u2014</p>"}

  <h2>6. Retenção e Segurança</h2>
  <table>
    <tr><th>Campo</th><th>Valor</th></tr>
    <tr><td class="field-label">Período de Retenção</td><td>${escHtml(ropaData?.retentionPeriod || "\u2014")}</td></tr>
    <tr><td class="field-label">Local de Armazenamento</td><td>${escHtml(ropaData?.storageLocation || "\u2014")}</td></tr>
    <tr><td class="field-label">Medidas de Segurança</td><td>${escHtml(fmtArrPremium(ropaData?.securityMeasures))}</td></tr>
  </table>

  <h2>7. Análise de Risco</h2>
  <p><strong>Nível:</strong> ${escHtml(ropaData?.riskLevel || "\u2014")} | <strong>Score:</strong> ${ropaData?.riskScore != null ? ropaData.riskScore : "\u2014"}</p>

  <div class="footer">
    Documento gerado automaticamente pelo Sistema Seusdados Due Diligence<br>
    Seusdados Consultoria em Gestão de Dados Limitada - CNPJ 33.899.116/0001-63 - seusdados.com<br>
    Responsável Técnico: Marcelo Fattori
  </div>
</body>
</html>`;
}

function escHtml(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtArrPremium(v?: any[]): string {
  if (!v || !Array.isArray(v) || v.length === 0) return "\u2014";
  return v.map((x) => String(x)).join(", ");
}
