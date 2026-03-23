/**
 * Serviço de Geração de PDF para RIPD
 * 
 * Desenvolvido por: Seusdados Consultoria em Gestão de Dados Limitada
 * CNPJ: 33.899.116/0001-63 | www.seusdados.com
 * Responsabilidade Técnica: Marcelo Fattori
 */
import puppeteer from 'puppeteer';
import archiver from 'archiver';
import { getDb } from './db';
import { sql } from 'drizzle-orm';
import { getOrCreateClientFolder, uploadDocument, type GedUser } from './gedService';
import { storagePut } from './storage';
import { Writable } from 'stream';

// Tipos auxiliares
interface RipdData {
  id: number;
  title: string;
  description: string;
  workflowStatus: string;
  createdAt: Date;
  updatedAt?: Date;
  version: number;
  dpoId?: number;
  finalPdfGedId?: number;
  simplifiedPdfGedId?: number;
  anpdPackageGedId?: number;
}

interface RiskData {
  id: number;
  title: string;
  description: string;
  inherentLikelihood?: number;
  inherentImpact?: number;
  inherentScore?: number;
  inherentLevel?: string;
  residualLikelihood?: number;
  residualImpact?: number;
  residualScore?: number;
  residualLevel?: string;
  acceptanceDecision?: string;
  acceptanceJustification?: string;
}

interface MitigationData {
  id: number;
  riskId: number;
  description: string;
  status?: string;
  responsibleId?: number;
  dueDate?: Date;
}

interface EvidenceData {
  id: number;
  questionId?: number;
  riskId?: number;
  mitigationId?: number;
  gedDocumentId: number;
  evidenceType: string;
  tags?: string;
}

interface ResponseData {
  id: number;
  questionId: number;
  answer: string;
  evidenceStatus?: string;
  evidenceCount?: number;
}

// GedUser importado de gedService

// Funções auxiliares exportadas para testes
export function getRiskColor(level: string): string {
  const colors: Record<string, string> = {
    critico: '#dc2626',
    alto: '#ea580c',
    medio: '#ca8a04',
    moderado: '#ca8a04',
    baixo: '#16a34a',
  };
  return colors[level] || '#6b7280';
}

export function getRiskLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    critico: 'Crítico',
    alto: 'Alto',
    medio: 'Médio',
    moderado: 'Médio',
    baixo: 'Baixo',
  };
  return labels[level] || 'Não avaliado';
}

export function formatDate(date: Date | null | undefined): string {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('pt-BR');
  } catch {
    return '';
  }
}

// Gerar HTML do PDF Completo
export function generateFullPdfHtml(data: {
  ripd: RipdData;
  organization: { name: string };
  responses: ResponseData[];
  risks: RiskData[];
  mitigations: MitigationData[];
  evidences: EvidenceData[];
  dpo?: { name: string };
}): string {
  const { ripd, organization, responses, risks, mitigations, evidences, dpo } = data;
  
  // Estatísticas de risco (aceita tanto 'medio' quanto 'moderado')
  const riskStats = {
    critico: risks.filter(r => r.inherentLevel === 'critico').length,
    alto: risks.filter(r => r.inherentLevel === 'alto').length,
    medio: risks.filter(r => r.inherentLevel === 'medio' || r.inherentLevel === 'moderado').length,
    baixo: risks.filter(r => r.inherentLevel === 'baixo').length,
  };

  const residualStats = {
    critico: risks.filter(r => r.residualLevel === 'critico').length,
    alto: risks.filter(r => r.residualLevel === 'alto').length,
    medio: risks.filter(r => r.residualLevel === 'medio' || r.residualLevel === 'moderado').length,
    baixo: risks.filter(r => r.residualLevel === 'baixo').length,
  };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>RIPD - ${ripd.title}</title>
  <style>
    @page { size: A4; margin: 2cm; }
    body { font-family: 'Poppins', Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #333; }
    .cover { page-break-after: always; text-align: center; padding-top: 100px; }
    .cover h1 { color: #6B3FD9; font-size: 28pt; margin-bottom: 20px; }
    .cover .org { font-size: 18pt; color: #00A8E8; margin-bottom: 40px; }
    .cover .meta { font-size: 12pt; color: #666; margin-top: 60px; }
    .cover .meta p { margin: 5px 0; }
    .section { page-break-inside: avoid; margin-bottom: 30px; }
    .section h2 { color: #6B3FD9; border-bottom: 2px solid #00A8E8; padding-bottom: 10px; font-size: 16pt; }
    .section h3 { color: #00A8E8; font-size: 14pt; margin-top: 20px; }
    .summary-box { background: #f8f9fa; border-left: 4px solid #6B3FD9; padding: 15px; margin: 20px 0; }
    .risk-matrix { display: flex; gap: 20px; margin: 20px 0; }
    .risk-column { flex: 1; }
    .risk-bar { display: flex; align-items: center; margin: 10px 0; }
    .risk-bar .label { width: 80px; font-weight: bold; }
    .risk-bar .bar { height: 20px; border-radius: 4px; }
    .risk-bar .count { margin-left: 10px; font-weight: bold; }
    .thermometer { display: flex; height: 30px; border-radius: 15px; overflow: hidden; margin: 20px 0; }
    .thermometer .segment { display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #6B3FD9; color: white; }
    tr:nth-child(even) { background: #f8f9fa; }
    .risk-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; color: white; font-size: 10pt; }
    .evidence-list { list-style: none; padding: 0; }
    .evidence-list li { padding: 8px; background: #f0f0f0; margin: 5px 0; border-radius: 4px; }
    .footer { text-align: center; font-size: 9pt; color: #666; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 10px; }
    .footer img { height: 30px; margin-bottom: 5px; }
  </style>
</head>
<body>
  <!-- CAPA -->
  <div class="cover">
    <h1>Relatório de Impacto à Proteção de Dados Pessoais</h1>
    <p class="org">${organization.name}</p>
    <h2 style="color: #333; font-size: 20pt;">${ripd.title}</h2>
    <div class="meta">
      <p><strong>Versão:</strong> ${ripd.version}</p>
      <p><strong>Status:</strong> ${ripd.workflowStatus}</p>
      <p><strong>Data de Criação:</strong> ${formatDate(ripd.createdAt)}</p>
      <p><strong>Última Atualização:</strong> ${formatDate(ripd.updatedAt)}</p>
      ${dpo ? `<p><strong>Encarregado (DPO):</strong> ${dpo.name}</p>` : ''}
    </div>
  </div>

  <!-- RESUMO EXECUTIVO -->
  <div class="section">
    <h2>Resumo Executivo</h2>
    <div class="summary-box">
      <p>${ripd.description || 'Este documento apresenta a análise de impacto à proteção de dados pessoais realizada para o processo em questão, identificando riscos e medidas de mitigação conforme exigido pela Lei Geral de Proteção de Dados (LGPD).'}</p>
    </div>
    <p><strong>Total de Riscos Identificados:</strong> ${risks.length}</p>
    <p><strong>Mitigações Planejadas:</strong> ${mitigations.length}</p>
    <p><strong>Evidências Anexadas:</strong> ${evidences.length}</p>
    <p><strong>Respostas Registradas:</strong> ${responses.length}</p>
  </div>

  <!-- MATRIZ DE RISCO -->
  <div class="section">
    <h2>Matriz de Risco</h2>
    <h3>Comparativo: Risco Inerente vs Residual</h3>
    
    <div class="risk-matrix">
      <div class="risk-column">
        <h4>Risco Inerente</h4>
        <div class="thermometer">
          ${riskStats.critico > 0 ? `<div class="segment" style="background: #dc2626; flex: ${riskStats.critico};">${riskStats.critico}</div>` : ''}
          ${riskStats.alto > 0 ? `<div class="segment" style="background: #ea580c; flex: ${riskStats.alto};">${riskStats.alto}</div>` : ''}
          ${riskStats.medio > 0 ? `<div class="segment" style="background: #ca8a04; flex: ${riskStats.medio};">${riskStats.medio}</div>` : ''}
          ${riskStats.baixo > 0 ? `<div class="segment" style="background: #16a34a; flex: ${riskStats.baixo};">${riskStats.baixo}</div>` : ''}
        </div>
        <div class="risk-bar"><span class="label" style="color: #dc2626;">Crítico</span><div class="bar" style="background: #dc2626; width: ${riskStats.critico * 30}px;"></div><span class="count">${riskStats.critico}</span></div>
        <div class="risk-bar"><span class="label" style="color: #ea580c;">Alto</span><div class="bar" style="background: #ea580c; width: ${riskStats.alto * 30}px;"></div><span class="count">${riskStats.alto}</span></div>
        <div class="risk-bar"><span class="label" style="color: #ca8a04;">Médio</span><div class="bar" style="background: #ca8a04; width: ${riskStats.medio * 30}px;"></div><span class="count">${riskStats.medio}</span></div>
        <div class="risk-bar"><span class="label" style="color: #16a34a;">Baixo</span><div class="bar" style="background: #16a34a; width: ${riskStats.baixo * 30}px;"></div><span class="count">${riskStats.baixo}</span></div>
      </div>
      <div class="risk-column">
        <h4>Risco Residual</h4>
        <div class="thermometer">
          ${residualStats.critico > 0 ? `<div class="segment" style="background: #dc2626; flex: ${residualStats.critico};">${residualStats.critico}</div>` : ''}
          ${residualStats.alto > 0 ? `<div class="segment" style="background: #ea580c; flex: ${residualStats.alto};">${residualStats.alto}</div>` : ''}
          ${residualStats.medio > 0 ? `<div class="segment" style="background: #ca8a04; flex: ${residualStats.medio};">${residualStats.medio}</div>` : ''}
          ${residualStats.baixo > 0 ? `<div class="segment" style="background: #16a34a; flex: ${residualStats.baixo};">${residualStats.baixo}</div>` : ''}
        </div>
        <div class="risk-bar"><span class="label" style="color: #dc2626;">Crítico</span><div class="bar" style="background: #dc2626; width: ${residualStats.critico * 30}px;"></div><span class="count">${residualStats.critico}</span></div>
        <div class="risk-bar"><span class="label" style="color: #ea580c;">Alto</span><div class="bar" style="background: #ea580c; width: ${residualStats.alto * 30}px;"></div><span class="count">${residualStats.alto}</span></div>
        <div class="risk-bar"><span class="label" style="color: #ca8a04;">Médio</span><div class="bar" style="background: #ca8a04; width: ${residualStats.medio * 30}px;"></div><span class="count">${residualStats.medio}</span></div>
        <div class="risk-bar"><span class="label" style="color: #16a34a;">Baixo</span><div class="bar" style="background: #16a34a; width: ${residualStats.baixo * 30}px;"></div><span class="count">${residualStats.baixo}</span></div>
      </div>
    </div>
  </div>

  <!-- LISTA DE RISCOS -->
  <div class="section">
    <h2>Riscos Identificados</h2>
    ${risks.length === 0 ? '<p>Nenhum risco identificado.</p>' : `
    <table>
      <thead>
        <tr>
          <th>Risco</th>
          <th>Prob.</th>
          <th>Impacto</th>
          <th>Score</th>
          <th>Nível Inerente</th>
          <th>Nível Residual</th>
          <th>Decisão</th>
        </tr>
      </thead>
      <tbody>
        ${risks.map(risk => `
        <tr>
          <td><strong>${risk.title}</strong><br><small>${risk.description?.substring(0, 100) || ''}...</small></td>
          <td>${risk.inherentLikelihood || '-'}</td>
          <td>${risk.inherentImpact || '-'}</td>
          <td>${risk.inherentScore || '-'}</td>
          <td><span class="risk-badge" style="background: ${getRiskColor(risk.inherentLevel || '')}">${getRiskLevelLabel(risk.inherentLevel || '')}</span></td>
          <td><span class="risk-badge" style="background: ${getRiskColor(risk.residualLevel || '')}">${getRiskLevelLabel(risk.residualLevel || '')}</span></td>
          <td>${risk.acceptanceDecision || 'Pendente'}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    `}
  </div>

  <!-- MITIGAÇÕES -->
  <div class="section">
    <h2>Medidas de Mitigação</h2>
    ${mitigations.length === 0 ? '<p>Nenhuma mitigação registrada.</p>' : `
    <table>
      <thead>
        <tr>
          <th>Descrição</th>
          <th>Status</th>
          <th>Prazo</th>
        </tr>
      </thead>
      <tbody>
        ${mitigations.map(m => `
        <tr>
          <td>${m.description}</td>
          <td>${m.status || 'Pendente'}</td>
          <td>${formatDate(m.dueDate) || '-'}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    `}
  </div>

  <!-- ÍNDICE DE EVIDÊNCIAS -->
  <div class="section">
    <h2>Índice de Evidências</h2>
    ${evidences.length === 0 ? '<p>Nenhuma evidência anexada.</p>' : `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Tipo</th>
          <th>Vínculo</th>
          <th>Tags</th>
          <th>Doc. GED</th>
        </tr>
      </thead>
      <tbody>
        ${evidences.map(e => `
        <tr>
          <td>${e.id}</td>
          <td>${e.evidenceType}</td>
          <td>${e.questionId ? `Pergunta #${e.questionId}` : e.riskId ? `Risco #${e.riskId}` : e.mitigationId ? `Mitigação #${e.mitigationId}` : '-'}</td>
          <td>${e.tags || '-'}</td>
          <td>${e.gedDocumentId}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    `}
  </div>

  <!-- RODAPÉ -->
  <div class="footer">
    <p>Documento gerado automaticamente pelo sistema Seusdados Due Diligence</p>
    <p>Seusdados Consultoria em Gestão de Dados Limitada | CNPJ: 33.899.116/0001-63 | www.seusdados.com</p>
    <p>Responsabilidade Técnica: Marcelo Fattori</p>
  </div>
</body>
</html>`;
}

// Gerar HTML do PDF Simplificado
export function generateSimplifiedPdfHtml(data: {
  ripd: RipdData;
  organization: { name: string };
  risks: RiskData[];
  dpo?: { name: string };
}): string {
  const { ripd, organization, risks, dpo } = data;
  
  // Top 5 riscos por score
  const topRisks = [...risks]
    .sort((a, b) => (b.inherentScore || 0) - (a.inherentScore || 0))
    .slice(0, 5);

  const riskStats = {
    critico: risks.filter(r => r.inherentLevel === 'critico').length,
    alto: risks.filter(r => r.inherentLevel === 'alto').length,
    medio: risks.filter(r => r.inherentLevel === 'medio' || r.inherentLevel === 'moderado').length,
    baixo: risks.filter(r => r.inherentLevel === 'baixo').length,
  };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>RIPD Simplificado - ${ripd.title}</title>
  <style>
    @page { size: A4; margin: 2cm; }
    body { font-family: 'Poppins', Arial, sans-serif; font-size: 12pt; line-height: 1.8; color: #333; }
    .header { text-align: center; margin-bottom: 40px; }
    .header h1 { color: #6B3FD9; font-size: 24pt; margin-bottom: 10px; }
    .header .org { font-size: 16pt; color: #00A8E8; }
    .section { margin-bottom: 30px; }
    .section h2 { color: #6B3FD9; border-bottom: 2px solid #00A8E8; padding-bottom: 8px; font-size: 18pt; }
    .highlight-box { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 10px; padding: 20px; margin: 20px 0; }
    .stats { display: flex; justify-content: space-around; text-align: center; margin: 30px 0; }
    .stat-item { padding: 15px; }
    .stat-number { font-size: 36pt; font-weight: bold; }
    .stat-label { font-size: 12pt; color: #666; }
    .risk-summary { margin: 20px 0; }
    .risk-item { background: #fff; border-left: 4px solid; padding: 15px; margin: 10px 0; border-radius: 0 8px 8px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .footer { text-align: center; font-size: 10pt; color: #666; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Resumo do RIPD</h1>
    <p class="org">${organization.name}</p>
    <p style="font-size: 14pt; color: #333;">${ripd.title}</p>
  </div>

  <div class="section">
    <h2>Resumo Executivo</h2>
    <div class="highlight-box">
      <p>${ripd.description || 'Este documento apresenta um resumo simplificado da análise de impacto à proteção de dados pessoais, destacando os principais riscos identificados e as medidas adotadas para proteger os dados pessoais tratados.'}</p>
    </div>
  </div>

  <div class="section">
    <h2>Visão Geral dos Riscos</h2>
    <div class="stats">
      <div class="stat-item">
        <div class="stat-number" style="color: #dc2626;">${riskStats.critico}</div>
        <div class="stat-label">Críticos</div>
      </div>
      <div class="stat-item">
        <div class="stat-number" style="color: #ea580c;">${riskStats.alto}</div>
        <div class="stat-label">Altos</div>
      </div>
      <div class="stat-item">
        <div class="stat-number" style="color: #ca8a04;">${riskStats.medio}</div>
        <div class="stat-label">Médios</div>
      </div>
      <div class="stat-item">
        <div class="stat-number" style="color: #16a34a;">${riskStats.baixo}</div>
        <div class="stat-label">Baixos</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Principais Riscos</h2>
    <div class="risk-summary">
      ${topRisks.length === 0 ? '<p>Nenhum risco identificado.</p>' : topRisks.map(risk => `
      <div class="risk-item" style="border-color: ${getRiskColor(risk.inherentLevel || '')}">
        <strong>${risk.title}</strong>
        <p>${risk.description?.substring(0, 200) || 'Sem descrição'}${(risk.description?.length || 0) > 200 ? '...' : ''}</p>
        <small>Nível: ${getRiskLevelLabel(risk.inherentLevel || '')} → ${getRiskLevelLabel(risk.residualLevel || '')} (após mitigação)</small>
      </div>
      `).join('')}
    </div>
  </div>

  <div class="section">
    <h2>Informações do Documento</h2>
    <div class="highlight-box">
      <p><strong>Versão:</strong> ${ripd.version}</p>
      <p><strong>Status:</strong> ${ripd.workflowStatus}</p>
      <p><strong>Data:</strong> ${formatDate(ripd.createdAt)}</p>
      ${dpo ? `<p><strong>Encarregado (DPO):</strong> ${dpo.name}</p>` : ''}
    </div>
  </div>

  <div class="footer">
    <p>Documento simplificado gerado pelo sistema Seusdados Due Diligence</p>
    <p>Para informações detalhadas, consulte o relatório completo.</p>
    <p>Seusdados Consultoria em Gestão de Dados Limitada | CNPJ: 33.899.116/0001-63 | www.seusdados.com</p>
  </div>
</body>
</html>`;
}

// Gerar PDF a partir de HTML
export async function generatePdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

// Buscar dados do RIPD
async function fetchRipdData(ripdId: number, organizationId: number) {
  const db = await getDb();
  
  // Buscar RIPD
  const { rows: ripdRows } = await db.execute(sql`
    SELECT * FROM dpia_assessments 
    WHERE id = ${ripdId} AND organization_id = ${organizationId}
  `) as any;
  const ripd = ripdRows[0];
  if (!ripd) throw new Error('RIPD não encontrado');

  // Buscar organização
  const { rows: orgRows } = await db.execute(sql`
    SELECT name FROM organizations WHERE id = ${organizationId}
  `) as any;
  const organization = orgRows[0] || { name: 'Organização' };

  // Buscar respostas
  const { rows: responseRows } = await db.execute(sql`
    SELECT * FROM dpia_responses WHERE dpia_id = ${ripdId}
  `) as any;
  const responses = responseRows as unknown as ResponseData[];

  // Buscar riscos
  const { rows: riskRows } = await db.execute(sql`
    SELECT * FROM dpia_risks WHERE dpia_id = ${ripdId}
  `) as any;
  const risks = riskRows as unknown as RiskData[];

  // Buscar mitigações
  const { rows: mitigationRows } = await db.execute(sql`
    SELECT * FROM dpia_mitigations WHERE dpia_id = ${ripdId}
  `) as any;
  const mitigations = mitigationRows as unknown as MitigationData[];

  // Buscar evidências
  const { rows: evidenceRows } = await db.execute(sql`
    SELECT * FROM ripd_evidences WHERE "ripdId" = ${ripdId} AND "organizationId" = ${organizationId}
  `) as any;
  const evidences = evidenceRows as EvidenceData[];

  // Buscar DPO
  let dpo = undefined;
  if (ripd.dpo_id) {
    const { rows: dpoRows } = await db.execute(sql`
      SELECT name FROM users WHERE id = ${ripd.dpo_id}
    `) as any;
    dpo = dpoRows[0];
  }

  return { ripd, organization, responses, risks, mitigations, evidences, dpo };
}

// Gerar PDF Completo e salvar no GED
export async function generateFullPdf(
  ripdId: number,
  organizationId: number,
  userId: number
): Promise<{ gedDocumentId: number; url: string }> {
  const data = await fetchRipdData(ripdId, organizationId);
  const html = generateFullPdfHtml(data);
  const pdfBuffer = await generatePdf(html);
  
  // Upload para S3
  const timestamp = Date.now();
  const fileKey = `ripd/${organizationId}/${ripdId}/ripd_completo_${timestamp}.pdf`;
  const { url: s3Url } = await storagePut(fileKey, pdfBuffer, 'application/pdf');
  
  // Criar usuário GED
  const gedUser: GedUser = {
    id: userId,
    organizationId,
    role: 'admin_global',
  };
  
  // Criar pasta no GED
  const folder = await getOrCreateClientFolder(
    gedUser,
    organizationId,
    'Relatórios RIPD'
  );
  
  // Upload para GED
  const gedDoc = await uploadDocument(
    gedUser,
    {
      name: `RIPD_Completo_${data.ripd.title}_v${data.ripd.version}.pdf`,
      folderId: folder.id,
      file: pdfBuffer,
      fileName: `RIPD_Completo_${data.ripd.title}_v${data.ripd.version}.pdf`,
      mimeType: 'application/pdf',
      linkedEntityType: 'ripd',
      linkedEntityId: ripdId,
      tags: ['ripd', 'pdf', 'completo', 'anpd'],
    }
  );
  
  // Atualizar RIPD com o ID do documento
  const db = await getDb();
  await db.execute(sql`
    UPDATE dpia_assessments 
    SET "finalPdfGedId" = ${gedDoc.id}
    WHERE id = ${ripdId} AND organization_id = ${organizationId}
  `);
  
  return { gedDocumentId: gedDoc.id, url: gedDoc.fileUrl || s3Url };
}

// Gerar PDF Simplificado e salvar no GED
export async function generateSimplifiedPdf(
  ripdId: number,
  organizationId: number,
  userId: number
): Promise<{ gedDocumentId: number; url: string }> {
  const data = await fetchRipdData(ripdId, organizationId);
  const html = generateSimplifiedPdfHtml(data);
  const pdfBuffer = await generatePdf(html);
  
  // Upload para S3
  const timestamp = Date.now();
  const fileKey = `ripd/${organizationId}/${ripdId}/ripd_simplificado_${timestamp}.pdf`;
  const { url: s3Url } = await storagePut(fileKey, pdfBuffer, 'application/pdf');
  
  // Criar usuário GED
  const gedUser: GedUser = {
    id: userId,
    organizationId,
    role: 'admin_global',
  };
  
  // Criar pasta no GED
  const folder = await getOrCreateClientFolder(
    gedUser,
    organizationId,
    'Relatórios RIPD'
  );
  
  // Upload para GED
  const gedDoc = await uploadDocument(
    gedUser,
    {
      name: `RIPD_Simplificado_${data.ripd.title}_v${data.ripd.version}.pdf`,
      folderId: folder.id,
      file: pdfBuffer,
      fileName: `RIPD_Simplificado_${data.ripd.title}_v${data.ripd.version}.pdf`,
      mimeType: 'application/pdf',
      linkedEntityType: 'ripd',
      linkedEntityId: ripdId,
      tags: ['ripd', 'pdf', 'simplificado'],
    }
  );
  
  // Atualizar RIPD com o ID do documento
  const db = await getDb();
  await db.execute(sql`
    UPDATE dpia_assessments 
    SET "simplifiedPdfGedId" = ${gedDoc.id}
    WHERE id = ${ripdId} AND organization_id = ${organizationId}
  `);
  
  return { gedDocumentId: gedDoc.id, url: gedDoc.fileUrl || s3Url };
}

// Gerar Pacote ANPD (ZIP)
export async function generateAnpdPackage(
  ripdId: number,
  organizationId: number,
  userId: number
): Promise<{ gedDocumentId: number; url: string }> {
  const data = await fetchRipdData(ripdId, organizationId);
  
  // Gerar PDFs
  const fullHtml = generateFullPdfHtml(data);
  const simplifiedHtml = generateSimplifiedPdfHtml(data);
  const fullPdf = await generatePdf(fullHtml);
  const simplifiedPdf = await generatePdf(simplifiedHtml);
  
  // Gerar índice de evidências
  const evidenciasIndex = {
    ripdId,
    organizationId,
    generatedAt: new Date().toISOString(),
    evidences: data.evidences.map(e => ({
      id: e.id,
      gedDocumentId: e.gedDocumentId,
      type: e.evidenceType,
      tags: e.tags,
      linkedTo: e.questionId ? { type: 'question', id: e.questionId }
        : e.riskId ? { type: 'risk', id: e.riskId }
        : e.mitigationId ? { type: 'mitigation', id: e.mitigationId }
        : null,
    })),
  };
  
  // Gerar trilha de auditoria
  const db = await getDb();
  const auditRows = await db.execute(sql`
    SELECT * FROM audit_logs 
    WHERE "entityType" = 'dpia_assessment' AND "entityId" = ${ripdId}
    ORDER BY "createdAt" DESC
    LIMIT 100
  `);
  
  const auditTrail = {
    ripdId,
    organizationId,
    generatedAt: new Date().toISOString(),
    workflowStatus: data.ripd.workflowStatus,
    version: data.ripd.version,
    events: (auditRows as unknown as any[]).map(row => ({
      timestamp: row.createdAt,
      action: row.action,
      userId: row.userId,
      details: row.details,
    })),
  };
  
  // Criar ZIP
  const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    const writable = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });
    
    writable.on('finish', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
    
    archive.pipe(writable);
    archive.append(fullPdf, { name: 'ripd_completo.pdf' });
    archive.append(simplifiedPdf, { name: 'ripd_simplificado.pdf' });
    archive.append(JSON.stringify(evidenciasIndex, null, 2), { name: 'evidencias_index.json' });
    archive.append(JSON.stringify(auditTrail, null, 2), { name: 'audit_trail.json' });
    archive.finalize();
  });
  
  // Upload para S3
  const timestamp = Date.now();
  const fileKey = `ripd/${organizationId}/${ripdId}/pacote_anpd_${timestamp}.zip`;
  const { url: s3Url } = await storagePut(fileKey, zipBuffer, 'application/zip');
  
  // Criar usuário GED
  const gedUser: GedUser = {
    id: userId,
    organizationId,
    role: 'admin_global',
  };
  
  // Criar pasta no GED
  const folder = await getOrCreateClientFolder(
    gedUser,
    organizationId,
    'Pacotes ANPD'
  );
  
  // Upload para GED
  const gedDoc = await uploadDocument(
    gedUser,
    {
      name: `Pacote_ANPD_${data.ripd.title}_v${data.ripd.version}.zip`,
      folderId: folder.id,
      file: zipBuffer,
      fileName: `Pacote_ANPD_${data.ripd.title}_v${data.ripd.version}.zip`,
      mimeType: 'application/zip',
      linkedEntityType: 'ripd',
      linkedEntityId: ripdId,
      tags: ['ripd', 'anpd', 'package', 'zip'],
    }
  );
  
  // Atualizar RIPD com o ID do documento
  await db.execute(sql`
    UPDATE dpia_assessments 
    SET "anpdPackageGedId" = ${gedDoc.id}
    WHERE id = ${ripdId} AND organization_id = ${organizationId}
  `);
  
  return { gedDocumentId: gedDoc.id, url: gedDoc.fileUrl || s3Url };
}
