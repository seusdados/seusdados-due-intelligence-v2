import { drizzle } from "drizzle-orm/node-postgres";
import { irCases, irIncidents, irActs, irDeadlines, irCisDocuments } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import pg from "pg";

let db: any;

async function getDb() {
  if (!db) {
    const connection = new pg.Pool({
      connectionString: process.env.DATABASE_URL || "",
      ssl: { rejectUnauthorized: false },
    });
    db = drizzle(connection);
  }
  return db;
}

/**
 * Serviço de Geração de Relatórios de Incidentes com CIS Fiel à ANPD
 * Gera PDF com histórico completo do incidente, atos processuais e CIS
 */

interface IncidentReport {
  incident: any;
  case: any;
  acts: any[];
  deadlines: any[];
  cisDocument: any;
}

/**
 * Busca dados completos do incidente para gerar relatório
 */
export async function getIncidentReportData(
  incidentId: string
): Promise<IncidentReport> {
  const database = await getDb();
  
  const incident = await database
    .select()
    .from(irIncidents)
    .where(eq(irIncidents.id, incidentId))
    .then((rows: any[]) => rows[0]);

  if (!incident) {
    throw new Error('Incidente não encontrado');
  }

  const caseData = await database
    .select()
    .from(irCases)
    .where(eq(irCases.incidentId, incidentId))
    .then((rows: any[]) => rows[0]);

  const acts = await database
    .select()
    .from(irActs)
    .where(eq(irActs.caseId, caseData?.id || ''))
    .orderBy(irActs.actDate);

  const deadlines = await database
    .select()
    .from(irDeadlines)
    .where(eq(irDeadlines.caseId, caseData?.id || ''))
    .orderBy(irDeadlines.dueDate);

  const cisDocument = await database
    .select()
    .from(irCisDocuments)
    .where(eq(irCisDocuments.caseId, caseData?.id || ''))
    .then((rows: any[]) => rows[0]);

  return { incident, case: caseData, acts, deadlines, cisDocument };
}

/**
 * Gera PDF com relatório completo do incidente
 * Inclui: Histórico, Atos Processuais, Prazos e CIS
 */
export async function generateIncidentReportPDF(
  incidentId: string
): Promise<Buffer> {
  const reportData = await getIncidentReportData(incidentId);
  const pdfDoc = await PDFDocument.create();

  // Registrar fonte
  pdfDoc.registerFontkit(fontkit);

  // Página 1: Capa e Resumo
  await addCoverPage(pdfDoc, reportData);

  // Página 2: Histórico do Incidente
  await addIncidentHistoryPage(pdfDoc, reportData);

  // Página 3: Atos Processuais
  await addActsPage(pdfDoc, reportData);

  // Página 4: Prazos
  await addDeadlinesPage(pdfDoc, reportData);

  // Páginas 5+: CIS Completo
  if (reportData.cisDocument) {
    await addCISPage(pdfDoc, reportData);
  }

  return Buffer.from(await pdfDoc.save());
}

/**
 * Adiciona página de capa ao PDF
 */
async function addCoverPage(pdfDoc: PDFDocument, reportData: IncidentReport): Promise<void> {
  const page = pdfDoc.addPage([595, 842]); // A4
  const { height, width } = page.getSize();

  // Cabeçalho com logo
  page.drawText('SEUSDADOS CONSULTORIA', {
    x: 50,
    y: height - 50,
    size: 20,
    color: rgb(0, 102, 204),
  });

  page.drawText('Relatório de Incidente de Segurança', {
    x: 50,
    y: height - 100,
    size: 24,
    color: rgb(0, 0, 0),
  });

  // Informações do incidente
  const incident = reportData.incident;
  const yStart = height - 150;

  page.drawText(`ID do Incidente: ${incident.id}`, {
    x: 50,
    y: yStart,
    size: 12,
    color: rgb(0, 0, 0),
  });

  page.drawText(`Tipo: ${incident.incidentType || 'N/A'}`, {
    x: 50,
    y: yStart - 30,
    size: 12,
    color: rgb(0, 0, 0),
  });

  page.drawText(`Severidade: ${incident.severity || 'N/A'}`, {
    x: 50,
    y: yStart - 60,
    size: 12,
    color: rgb(0, 0, 0),
  });

  page.drawText(`Data de Descoberta: ${formatDate(incident.discoveryDate)}`, {
    x: 50,
    y: yStart - 90,
    size: 12,
    color: rgb(0, 0, 0),
  });

  page.drawText(`Status: ${incident.status || 'Aberto'}`, {
    x: 50,
    y: yStart - 120,
    size: 12,
    color: rgb(0, 0, 0),
  });

  // Rodapé
  page.drawText(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, {
    x: 50,
    y: 30,
    size: 10,
    color: rgb(128, 128, 128),
  });
}

/**
 * Adiciona página de histórico do incidente
 */
async function addIncidentHistoryPage(pdfDoc: PDFDocument, reportData: IncidentReport): Promise<void> {
  const page = pdfDoc.addPage([595, 842]); // A4
  const { height } = page.getSize();

  let yPosition = height - 50;

  page.drawText('HISTÓRICO DO INCIDENTE', {
    x: 50,
    y: yPosition,
    size: 16,
    color: rgb(0, 102, 204),
  });

  yPosition -= 40;

  const incident = reportData.incident;

  // Descrição
  page.drawText('Descrição:', {
    x: 50,
    y: yPosition,
    size: 12,
    color: rgb(0, 0, 0),
  });

  yPosition -= 20;
  const description = incident.description || 'Sem descrição';
  const wrappedDescription = wrapText(description, 80);
  wrappedDescription.forEach((line: string) => {
    page.drawText(line, {
      x: 60,
      y: yPosition,
      size: 10,
      color: rgb(0, 0, 0),
    });
    yPosition -= 15;
  });

  yPosition -= 10;

  // Dados Afetados
  page.drawText('Dados Afetados:', {
    x: 50,
    y: yPosition,
    size: 12,
    color: rgb(0, 0, 0),
  });

  yPosition -= 20;
  const affectedData = incident.affectedData || 'Não especificado';
  const wrappedAffected = wrapText(affectedData, 80);
  wrappedAffected.forEach((line: string) => {
    page.drawText(line, {
      x: 60,
      y: yPosition,
      size: 10,
      color: rgb(0, 0, 0),
    });
    yPosition -= 15;
  });

  yPosition -= 10;

  // Causa Raiz
  page.drawText('Causa Raiz:', {
    x: 50,
    y: yPosition,
    size: 12,
    color: rgb(0, 0, 0),
  });

  yPosition -= 20;
  const rootCause = incident.rootCause || 'Sob investigação';
  const wrappedCause = wrapText(rootCause, 80);
  wrappedCause.forEach((line: string) => {
    page.drawText(line, {
      x: 60,
      y: yPosition,
      size: 10,
      color: rgb(0, 0, 0),
    });
    yPosition -= 15;
  });
}

/**
 * Adiciona página de atos processuais
 */
async function addActsPage(pdfDoc: PDFDocument, reportData: IncidentReport): Promise<void> {
  const page = pdfDoc.addPage([595, 842]); // A4
  const { height } = page.getSize();

  let yPosition = height - 50;

  page.drawText('ATOS PROCESSUAIS', {
    x: 50,
    y: yPosition,
    size: 16,
    color: rgb(0, 102, 204),
  });

  yPosition -= 40;

  const acts = reportData.acts;

  if (acts.length === 0) {
    page.drawText('Nenhum ato processual registrado', {
      x: 50,
      y: yPosition,
      size: 10,
      color: rgb(128, 128, 128),
    });
    return;
  }

  acts.forEach((act: any, index: number) => {
    if (yPosition < 100) {
      // Criar nova página se necessário
      const newPage = pdfDoc.addPage([595, 842]);
      yPosition = 842 - 50;
    }

    page.drawText(`${index + 1}. ${act.category}`, {
      x: 50,
      y: yPosition,
      size: 11,
      color: rgb(0, 0, 0),
    });

    yPosition -= 20;

    page.drawText(`Data: ${formatDate(act.createdAt)}`, {
      x: 60,
      y: yPosition,
      size: 10,
      color: rgb(64, 64, 64),
    });

    yPosition -= 15;

    page.drawText(`Tipo: ${act.actType || 'N/A'}`, {
      x: 60,
      y: yPosition,
      size: 10,
      color: rgb(64, 64, 64),
    });

    yPosition -= 20;
  });
}

/**
 * Adiciona página de prazos
 */
async function addDeadlinesPage(pdfDoc: PDFDocument, reportData: IncidentReport): Promise<void> {
  const page = pdfDoc.addPage([595, 842]); // A4
  const { height } = page.getSize();

  let yPosition = height - 50;

  page.drawText('PRAZOS E OBRIGAÇÕES', {
    x: 50,
    y: yPosition,
    size: 16,
    color: rgb(0, 102, 204),
  });

  yPosition -= 40;

  const deadlines = reportData.deadlines;

  if (deadlines.length === 0) {
    page.drawText('Nenhum prazo registrado', {
      x: 50,
      y: yPosition,
      size: 10,
      color: rgb(128, 128, 128),
    });
    return;
  }

  deadlines.forEach((deadline) => {
    if (yPosition < 100) {
      const newPage = pdfDoc.addPage([595, 842]);
      yPosition = 842 - 50;
    }

    const statusColor = deadline.status === 'vencido' ? rgb(255, 0, 0) : rgb(0, 128, 0);

    page.drawText(`• ${deadline.category}`, {
      x: 50,
      y: yPosition,
      size: 11,
      color: statusColor,
    });

    yPosition -= 20;

    page.drawText(`Vencimento: ${formatDate(deadline.dueDate)} | Status: ${deadline.status}`, {
      x: 60,
      y: yPosition,
      size: 10,
      color: rgb(64, 64, 64),
    });

    yPosition -= 25;
  });
}

/**
 * Adiciona página com CIS (Comunicação de Incidente de Segurança)
 */
async function addCISPage(pdfDoc: PDFDocument, reportData: IncidentReport): Promise<void> {
  const page = pdfDoc.addPage([595, 842]); // A4
  const { height } = page.getSize();

  let yPosition = height - 50;

  // Cabeçalho CIS - Fiel ao formulário ANPD
  page.drawText('COMUNICAÇÃO DE INCIDENTE DE SEGURANÇA (CIS)', {
    x: 50,
    y: yPosition,
    size: 14,
    color: rgb(0, 0, 0),
  });

  yPosition -= 30;

  page.drawText('Agência Nacional de Proteção de Dados Pessoais (ANPD)', {
    x: 50,
    y: yPosition,
    size: 10,
    color: rgb(0, 102, 204),
  });

  yPosition -= 20;

  const cisDoc = reportData.cisDocument;
  const incident = reportData.incident;

  // Seção 1: Identificação do Controlador
  page.drawText('1. IDENTIFICAÇÃO DO CONTROLADOR', {
    x: 50,
    y: yPosition,
    size: 12,
    color: rgb(0, 0, 0),
  });

  yPosition -= 20;

  page.drawText(`Razão Social: ${cisDoc?.controllerName || 'N/A'}`, {
    x: 60,
    y: yPosition,
    size: 10,
    color: rgb(0, 0, 0),
  });

  yPosition -= 15;

  page.drawText(`CNPJ: ${cisDoc?.controllerCnpj || 'N/A'}`, {
    x: 60,
    y: yPosition,
    size: 10,
    color: rgb(0, 0, 0),
  });

  yPosition -= 20;

  // Seção 2: Descrição do Incidente
  page.drawText('2. DESCRIÇÃO DO INCIDENTE', {
    x: 50,
    y: yPosition,
    size: 12,
    color: rgb(0, 0, 0),
  });

  yPosition -= 20;

  page.drawText(`Tipo de Incidente: ${incident.incidentType || 'N/A'}`, {
    x: 60,
    y: yPosition,
    size: 10,
    color: rgb(0, 0, 0),
  });

  yPosition -= 15;

  page.drawText(`Data de Descoberta: ${formatDate(incident.discoveryDate)}`, {
    x: 60,
    y: yPosition,
    size: 10,
    color: rgb(0, 0, 0),
  });

  yPosition -= 15;

  page.drawText(`Severidade: ${incident.severity || 'N/A'}`, {
    x: 60,
    y: yPosition,
    size: 10,
    color: rgb(0, 0, 0),
  });

  yPosition -= 20;

  // Seção 3: Dados Afetados
  page.drawText('3. DADOS PESSOAIS AFETADOS', {
    x: 50,
    y: yPosition,
    size: 12,
    color: rgb(0, 0, 0),
  });

  yPosition -= 20;

  const affectedData = incident.affectedData || 'Não especificado';
  const wrappedData = wrapText(affectedData, 80);
  wrappedData.forEach((line: string) => {
    page.drawText(line, {
      x: 60,
      y: yPosition,
      size: 10,
      color: rgb(0, 0, 0),
    });
    yPosition -= 12;
  });

  yPosition -= 10;

  // Seção 4: Medidas Adotadas
  page.drawText('4. MEDIDAS ADOTADAS', {
    x: 50,
    y: yPosition,
    size: 12,
    color: rgb(0, 0, 0),
  });

  yPosition -= 20;

  const measures = cisDoc?.measuresAdopted || 'Sob investigação';
  const wrappedMeasures = wrapText(measures, 80);
  wrappedMeasures.forEach((line: string) => {
    page.drawText(line, {
      x: 60,
      y: yPosition,
      size: 10,
      color: rgb(0, 0, 0),
    });
    yPosition -= 12;
  });

  // Rodapé
  page.drawText(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, {
    x: 50,
    y: 30,
    size: 9,
    color: rgb(128, 128, 128),
  });
}

/**
 * Utilitários
 */

function formatDate(date: any): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR');
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    if ((currentLine + word).length > maxCharsPerLine) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines;
}
