/**
 * Serviço de Geração de PDF da Ata do CPPD
 * 
 * Converte o conteúdo Markdown da ata em PDF formatado
 * com identidade visual Seusdados (gradiente roxo/azul, tipografia Inter Light).
 * 
 * Segue o padrão HTML-to-PDF do pdfService.ts existente.
 */

import PDFDocument from 'pdfkit';
import { logger } from '../_core/logger';

export interface MinutesPdfData {
  /** Nome da organização cliente */
  organizationName: string;
  /** Título da reunião */
  meetingTitle: string;
  /** Data da reunião (formatada) */
  meetingDate: string;
  /** Número sequencial da reunião */
  sequence: number;
  /** Ano de referência */
  year: number;
  /** Conteúdo da ata (Markdown) */
  minutesContent: string;
  /** Lista de participantes */
  participants: Array<{
    name: string;
    role: string;
    present: boolean;
  }>;
  /** Lista de signatários (se houver) */
  signers?: Array<{
    name: string;
    role: string;
  }>;
  /** Nome do consultor responsável */
  consultantName?: string;
}

/**
 * Gera o PDF da ata do CPPD com identidade visual Seusdados.
 * 
 * Layout:
 * - Capa com gradiente roxo/azul, logo, título e dados da reunião
 * - Página de participantes com tabela
 * - Conteúdo da ata formatado
 * - Rodapé com dados da Seusdados e paginação
 * - Página de assinaturas (se houver signatários)
 */
export async function generateMinutesPdf(data: MinutesPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 60, bottom: 70, left: 50, right: 50 },
        bufferPages: true,
        info: {
          Title: `Ata da ${data.sequence}ª Reunião Ordinária do CPPD - ${data.year}`,
          Author: 'Seusdados Consultoria em Gestão de Dados',
          Creator: 'Seusdados Due Diligence Platform',
          Subject: `Ata CPPD - ${data.organizationName}`,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = 495; // 595 - 50 - 50
      const purple = '#6D28D9';
      const darkPurple = '#2E1065';
      const cyan = '#00A8E8';
      const gray = '#6b7280';
      const darkGray = '#1f2937';

      // ═══════════════════════════════════════
      // CAPA
      // ═══════════════════════════════════════
      
      // Gradiente simulado (faixa superior)
      doc.rect(0, 0, 595, 200).fill(darkPurple);
      doc.rect(0, 160, 595, 40).fillOpacity(0.5).fill(purple);
      doc.fillOpacity(1);

      // Logo textual
      doc.fontSize(32).fillColor('#ffffff').font('Helvetica-Bold');
      doc.text('SEUSDADOS', 50, 50, { width: pageWidth });
      doc.fontSize(11).font('Helvetica').fillColor('#e9d5ff');
      doc.text('CONSULTORIA EM GESTÃO DE DADOS', 50, 88, { width: pageWidth });

      // Linha decorativa cyan
      doc.rect(50, 115, 80, 3).fill(cyan);

      // Badge
      doc.fontSize(9).fillColor('#ffffff').font('Helvetica');
      doc.text('COMITÊ DE PRIVACIDADE E PROTEÇÃO DE DADOS', 50, 135, { width: pageWidth });

      // Data no canto direito
      doc.fontSize(10).fillColor('#e9d5ff');
      doc.text(data.meetingDate, 350, 170, { width: 195, align: 'right' });

      // Título da ata
      doc.fillColor(darkGray);
      doc.fontSize(24).font('Helvetica-Bold');
      doc.text(`${data.sequence}ª Reunião Ordinária`, 50, 240, { width: pageWidth });
      doc.fontSize(14).font('Helvetica').fillColor(gray);
      doc.text(`Comitê de Privacidade e Proteção de Dados — ${data.year}`, 50, 275, { width: pageWidth });

      // Organização
      doc.moveDown(2);
      doc.fontSize(12).fillColor(purple).font('Helvetica-Bold');
      doc.text('Organização', 50, 320);
      doc.fontSize(14).fillColor(darkGray).font('Helvetica');
      doc.text(data.organizationName, 50, 340, { width: pageWidth });

      // Dados da reunião
      doc.moveDown(2);
      doc.fontSize(12).fillColor(purple).font('Helvetica-Bold');
      doc.text('Data da Reunião', 50, 390);
      doc.fontSize(12).fillColor(darkGray).font('Helvetica');
      doc.text(data.meetingDate, 50, 410);

      doc.fontSize(12).fillColor(purple).font('Helvetica-Bold');
      doc.text('Reunião Nº', 300, 390);
      doc.fontSize(12).fillColor(darkGray).font('Helvetica');
      doc.text(`${String(data.sequence).padStart(2, '0')}/${data.year}`, 300, 410);

      // Participantes resumo
      const presentCount = data.participants.filter(p => p.present).length;
      doc.fontSize(12).fillColor(purple).font('Helvetica-Bold');
      doc.text('Participantes', 50, 460);
      doc.fontSize(12).fillColor(darkGray).font('Helvetica');
      doc.text(`${presentCount} presentes de ${data.participants.length} convocados`, 50, 480);

      // Consultor
      if (data.consultantName) {
        doc.fontSize(12).fillColor(purple).font('Helvetica-Bold');
        doc.text('Responsável Técnico', 50, 530);
        doc.fontSize(12).fillColor(darkGray).font('Helvetica');
        doc.text(data.consultantName, 50, 550);
      }

      // Rodapé da capa
      doc.fontSize(8).fillColor(gray).font('Helvetica');
      doc.text(
        'Seusdados Consultoria em Gestão de Dados Ltda. | CNPJ 33.899.116/0001-63 | www.seusdados.com',
        50, 750, { width: pageWidth, align: 'center' }
      );

      // ═══════════════════════════════════════
      // PÁGINA DE PARTICIPANTES
      // ═══════════════════════════════════════
      doc.addPage();
      
      // Header da página
      drawPageHeader(doc, 'Lista de Participantes', purple, darkPurple, cyan);
      
      let y = 120;
      
      // Cabeçalho da tabela
      doc.rect(50, y, pageWidth, 25).fill('#f3f4f6');
      doc.fontSize(9).fillColor(darkGray).font('Helvetica-Bold');
      doc.text('Nome', 60, y + 7, { width: 200 });
      doc.text('Função', 260, y + 7, { width: 150 });
      doc.text('Presença', 420, y + 7, { width: 80 });
      y += 25;

      // Linhas da tabela
      for (const p of data.participants) {
        if (y > 700) {
          doc.addPage();
          drawPageHeader(doc, 'Lista de Participantes (cont.)', purple, darkPurple, cyan);
          y = 120;
        }

        // Linha alternada
        if (data.participants.indexOf(p) % 2 === 0) {
          doc.rect(50, y, pageWidth, 22).fill('#fafafa');
        }

        doc.fontSize(9).fillColor(darkGray).font('Helvetica');
        doc.text(p.name, 60, y + 6, { width: 200 });
        doc.text(p.role, 260, y + 6, { width: 150 });
        
        // Indicador de presença
        if (p.present) {
          doc.rect(435, y + 6, 10, 10).fill('#22c55e');
          doc.fontSize(8).fillColor(darkGray);
          doc.text('Presente', 450, y + 7);
        } else {
          doc.rect(435, y + 6, 10, 10).fill('#ef4444');
          doc.fontSize(8).fillColor(darkGray);
          doc.text('Ausente', 450, y + 7);
        }
        y += 22;
      }

      // ═══════════════════════════════════════
      // CONTEÚDO DA ATA
      // ═══════════════════════════════════════
      doc.addPage();
      drawPageHeader(doc, 'Ata da Reunião', purple, darkPurple, cyan);
      
      y = 120;

      // Processar o Markdown em seções
      const lines = data.minutesContent.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          y += 8;
          continue;
        }

        // Verificar se precisa de nova página
        if (y > 710) {
          doc.addPage();
          drawPageHeader(doc, 'Ata da Reunião (cont.)', purple, darkPurple, cyan);
          y = 120;
        }

        // Títulos (## ou ###)
        if (trimmed.startsWith('### ')) {
          y += 10;
          doc.fontSize(11).fillColor(purple).font('Helvetica-Bold');
          doc.text(trimmed.replace(/^###\s+/, ''), 50, y, { width: pageWidth });
          y += 20;
        } else if (trimmed.startsWith('## ')) {
          y += 15;
          doc.fontSize(13).fillColor(darkPurple).font('Helvetica-Bold');
          doc.text(trimmed.replace(/^##\s+/, ''), 50, y, { width: pageWidth });
          y += 25;
          // Linha decorativa
          doc.rect(50, y, 60, 2).fill(cyan);
          y += 10;
        } else if (trimmed.startsWith('# ')) {
          y += 15;
          doc.fontSize(16).fillColor(darkPurple).font('Helvetica-Bold');
          doc.text(trimmed.replace(/^#\s+/, ''), 50, y, { width: pageWidth });
          y += 30;
          doc.rect(50, y, 80, 3).fill(purple);
          y += 15;
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          // Bullet points
          doc.fontSize(10).fillColor(darkGray).font('Helvetica');
          doc.circle(60, y + 5, 2).fill(purple);
          const textHeight = doc.heightOfString(trimmed.replace(/^[-*]\s+/, ''), { width: pageWidth - 25 });
          doc.fillColor(darkGray);
          doc.text(trimmed.replace(/^[-*]\s+/, ''), 70, y, { width: pageWidth - 25 });
          y += textHeight + 6;
        } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
          // Texto em negrito
          doc.fontSize(10).fillColor(darkGray).font('Helvetica-Bold');
          const cleanText = trimmed.replace(/\*\*/g, '');
          const textHeight = doc.heightOfString(cleanText, { width: pageWidth });
          doc.text(cleanText, 50, y, { width: pageWidth });
          y += textHeight + 6;
        } else {
          // Parágrafo normal
          doc.fontSize(10).fillColor(darkGray).font('Helvetica');
          // Limpar formatação Markdown inline
          const cleanText = trimmed
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/`(.*?)`/g, '$1');
          const textHeight = doc.heightOfString(cleanText, { width: pageWidth });
          doc.text(cleanText, 50, y, { width: pageWidth });
          y += textHeight + 6;
        }
      }

      // ═══════════════════════════════════════
      // PÁGINA DE ASSINATURAS (se houver signatários)
      // ═══════════════════════════════════════
      if (data.signers && data.signers.length > 0) {
        doc.addPage();
        drawPageHeader(doc, 'Assinaturas', purple, darkPurple, cyan);
        
        y = 140;
        
        doc.fontSize(10).fillColor(gray).font('Helvetica');
        doc.text(
          'Os abaixo assinados declaram que a presente ata reflete fielmente as deliberações e encaminhamentos da reunião.',
          50, y, { width: pageWidth }
        );
        y += 50;

        for (const signer of data.signers) {
          if (y > 650) {
            doc.addPage();
            drawPageHeader(doc, 'Assinaturas (cont.)', purple, darkPurple, cyan);
            y = 120;
          }

          // Linha de assinatura
          doc.rect(50, y + 40, 250, 0.5).fill(gray);
          doc.fontSize(11).fillColor(darkGray).font('Helvetica-Bold');
          doc.text(signer.name, 50, y + 48, { width: 250 });
          doc.fontSize(9).fillColor(gray).font('Helvetica');
          doc.text(signer.role, 50, y + 63, { width: 250 });
          
          // Campo de data
          doc.fontSize(9).fillColor(gray).font('Helvetica');
          doc.text('Data: ____/____/________', 350, y + 48, { width: 200 });
          
          y += 100;
        }
      }

      // ═══════════════════════════════════════
      // RODAPÉS EM TODAS AS PÁGINAS
      // ═══════════════════════════════════════
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        
        // Linha separadora do rodapé
        doc.rect(50, 760, pageWidth, 0.5).fill('#e5e7eb');
        
        // Texto do rodapé
        doc.fontSize(7).fillColor(gray).font('Helvetica');
        doc.text(
          'Seusdados Consultoria em Gestão de Dados Ltda. | CNPJ 33.899.116/0001-63 | www.seusdados.com',
          50, 768, { width: pageWidth - 50, align: 'left' }
        );
        doc.text(
          `Página ${i + 1} de ${totalPages}`,
          350, 768, { width: 195, align: 'right' }
        );
      }

      doc.end();
    } catch (error: any) {
      logger.error('[CppdMinutesPdf] Erro ao gerar PDF:', error?.message || String(error));
      reject(error);
    }
  });
}

/**
 * Desenha o header padrão de cada página interna.
 */
function drawPageHeader(
  doc: PDFKit.PDFDocument,
  title: string,
  purple: string,
  darkPurple: string,
  cyan: string
): void {
  // Faixa superior
  doc.rect(0, 0, 595, 80).fill(darkPurple);
  
  // Logo
  doc.fontSize(14).fillColor('#ffffff').font('Helvetica-Bold');
  doc.text('SEUSDADOS', 50, 25, { width: 200 });
  doc.fontSize(8).fillColor('#e9d5ff').font('Helvetica');
  doc.text('CONSULTORIA EM GESTÃO DE DADOS', 50, 45);
  
  // Título da seção
  doc.fontSize(14).fillColor('#ffffff').font('Helvetica-Bold');
  doc.text(title, 250, 30, { width: 295, align: 'right' });
  
  // Linha decorativa
  doc.rect(50, 78, 495, 2).fill(cyan);
}
