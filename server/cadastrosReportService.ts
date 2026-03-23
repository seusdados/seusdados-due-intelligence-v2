// Serviço de geração de relatório de cadastros em PDF
import PDFDocument from 'pdfkit';

export interface CadastrosReportData {
  generatedAt: string;
  generatedBy: string;
  stats: {
    totalOrgs: number;
    activeOrgs: number;
    inactiveOrgs: number;
    totalUsers: number;
    activeUsers: number;
    adminCount: number;
    consultorCount: number;
    clienteCount: number;
    pendingInvites: number;
    acceptedInvites: number;
    expiredInvites: number;
  };
  organizations: {
    id: number;
    name: string;
    cnpj: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    state: string | null;
    isActive: boolean;
    userCount: number;
    createdAt: string;
  }[];
  users: {
    id: number;
    name: string | null;
    email: string;
    role: string;
    organizationName: string | null;
    isActive: boolean;
    createdAt: string;
  }[];
  invites: {
    id: number;
    email: string;
    role: string;
    status: string;
    organizationName: string | null;
    createdAt: string;
    expiresAt: string;
  }[];
}

const COLORS = {
  primary: '#8b5cf6',
  primaryDark: '#7c3aed',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  muted: '#64748b',
  text: '#1e293b',
  textLight: '#64748b',
  border: '#e2e8f0',
  background: '#f8fafc'
};

const ROLE_LABELS: Record<string, string> = {
  admin_global: 'Admin Global',
  consultor: 'Consultor',
  cliente: 'Cliente'
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  accepted: 'Aceito',
  expired: 'Expirado',
  cancelled: 'Cancelado'
};

export async function generateCadastrosReport(data: CadastrosReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 70, left: 50, right: 50 },
        bufferPages: true,
        info: {
          Title: 'Relatório de Cadastros - Seusdados',
          Author: 'Seusdados Consultoria',
          Creator: 'Seusdados Due Diligence Platform'
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // ========== PÁGINA 1: CAPA E RESUMO ==========
      
      // Header com gradiente simulado
      doc.rect(0, 0, doc.page.width, 150).fill(COLORS.primary);
      
      // Logo/Título
      doc.fontSize(28).fillColor('white').font('Helvetica-Bold');
      doc.text('RELATÓRIO DE CADASTROS', 50, 50, { align: 'center' });
      
      doc.fontSize(14).font('Helvetica');
      doc.text('Visão Consolidada de Organizações e Usuários', 50, 90, { align: 'center' });
      
      doc.fontSize(10);
      doc.text(`Gerado em: ${data.generatedAt}`, 50, 120, { align: 'center' });

      // Seção de Estatísticas
      let y = 180;
      
      doc.fillColor(COLORS.text).fontSize(16).font('Helvetica-Bold');
      doc.text('Resumo Executivo', 50, y);
      y += 30;

      // Cards de estatísticas
      const cardWidth = (pageWidth - 30) / 4;
      const cardHeight = 70;
      const cards = [
        { label: 'Organizações', value: data.stats.totalOrgs.toString(), sub: `${data.stats.activeOrgs} ativas`, color: COLORS.primary },
        { label: 'Usuários', value: data.stats.totalUsers.toString(), sub: `${data.stats.activeUsers} ativos`, color: COLORS.success },
        { label: 'Convites', value: data.stats.pendingInvites.toString(), sub: 'pendentes', color: COLORS.warning },
        { label: 'Consultores', value: data.stats.consultorCount.toString(), sub: `${data.stats.clienteCount} clientes`, color: COLORS.info }
      ];

      cards.forEach((card, i) => {
        const x = 50 + i * (cardWidth + 10);
        
        // Card background
        doc.roundedRect(x, y, cardWidth, cardHeight, 5).fill(COLORS.background);
        doc.roundedRect(x, y, cardWidth, cardHeight, 5).stroke(COLORS.border);
        
        // Barra de cor no topo
        doc.rect(x, y, cardWidth, 4).fill(card.color);
        
        // Valor
        doc.fillColor(card.color).fontSize(24).font('Helvetica-Bold');
        doc.text(card.value, x + 10, y + 15, { width: cardWidth - 20, align: 'center' });
        
        // Label
        doc.fillColor(COLORS.textLight).fontSize(9).font('Helvetica');
        doc.text(card.label, x + 10, y + 42, { width: cardWidth - 20, align: 'center' });
        doc.text(card.sub, x + 10, y + 54, { width: cardWidth - 20, align: 'center' });
      });

      y += cardHeight + 40;

      // Distribuição por Role
      doc.fillColor(COLORS.text).fontSize(14).font('Helvetica-Bold');
      doc.text('Distribuição de Usuários por Perfil', 50, y);
      y += 25;

      const roles = [
        { label: 'Admin Global', count: data.stats.adminCount, color: COLORS.danger },
        { label: 'Consultores', count: data.stats.consultorCount, color: COLORS.success },
        { label: 'Clientes', count: data.stats.clienteCount, color: COLORS.info }
      ];

      const totalUsers = data.stats.totalUsers || 1;
      roles.forEach((role, i) => {
        const percentage = Math.round((role.count / totalUsers) * 100);
        const barWidth = (pageWidth - 150) * (percentage / 100);
        
        doc.fillColor(COLORS.text).fontSize(10).font('Helvetica');
        doc.text(role.label, 50, y + 3);
        
        // Barra de progresso
        doc.roundedRect(150, y, pageWidth - 150, 15, 3).fill(COLORS.border);
        if (barWidth > 0) {
          doc.roundedRect(150, y, barWidth, 15, 3).fill(role.color);
        }
        
        doc.fillColor(COLORS.text).fontSize(9);
        doc.text(`${role.count} (${percentage}%)`, 150 + pageWidth - 150 + 5, y + 3);
        
        y += 25;
      });

      // ========== PÁGINA 2: LISTA DE ORGANIZAÇÕES ==========
      doc.addPage();
      y = 50;

      doc.fillColor(COLORS.primary).fontSize(18).font('Helvetica-Bold');
      doc.text('Organizações Cadastradas', 50, y);
      y += 35;

      // Cabeçalho da tabela
      const orgColWidths = [180, 100, 80, 60, 70];
      const orgHeaders = ['Nome', 'CNPJ', 'Cidade/UF', 'Usuários', 'Status'];
      
      doc.rect(50, y, pageWidth, 25).fill(COLORS.primary);
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
      
      let xPos = 55;
      orgHeaders.forEach((header, i) => {
        doc.text(header, xPos, y + 8, { width: orgColWidths[i] - 10 });
        xPos += orgColWidths[i];
      });
      y += 25;

      // Linhas da tabela
      doc.font('Helvetica').fontSize(8);
      data.organizations.slice(0, 20).forEach((org, i) => {
        if (y > doc.page.height - 100) {
          doc.addPage();
          y = 50;
        }

        const bgColor = i % 2 === 0 ? '#ffffff' : COLORS.background;
        doc.rect(50, y, pageWidth, 22).fill(bgColor);
        
        doc.fillColor(COLORS.text);
        xPos = 55;
        
        doc.text(org.name.substring(0, 30), xPos, y + 6, { width: orgColWidths[0] - 10 });
        xPos += orgColWidths[0];
        
        doc.text(org.cnpj || '-', xPos, y + 6, { width: orgColWidths[1] - 10 });
        xPos += orgColWidths[1];
        
        doc.text(`${org.city || '-'}/${org.state || '-'}`, xPos, y + 6, { width: orgColWidths[2] - 10 });
        xPos += orgColWidths[2];
        
        doc.text(org.userCount.toString(), xPos, y + 6, { width: orgColWidths[3] - 10, align: 'center' });
        xPos += orgColWidths[3];
        
        const statusColor = org.isActive ? COLORS.success : COLORS.danger;
        doc.fillColor(statusColor).text(org.isActive ? 'Ativa' : 'Inativa', xPos, y + 6, { width: orgColWidths[4] - 10 });
        
        y += 22;
      });

      if (data.organizations.length > 20) {
        y += 10;
        doc.fillColor(COLORS.textLight).fontSize(8).font('Helvetica-Oblique');
        doc.text(`... e mais ${data.organizations.length - 20} organizações`, 50, y);
      }

      // ========== PÁGINA 3: LISTA DE USUÁRIOS ==========
      doc.addPage();
      y = 50;

      doc.fillColor(COLORS.primary).fontSize(18).font('Helvetica-Bold');
      doc.text('Usuários Cadastrados', 50, y);
      y += 35;

      // Cabeçalho da tabela
      const userColWidths = [140, 160, 80, 110];
      const userHeaders = ['Nome', 'E-mail', 'Perfil', 'Organização'];
      
      doc.rect(50, y, pageWidth, 25).fill(COLORS.primary);
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
      
      xPos = 55;
      userHeaders.forEach((header, i) => {
        doc.text(header, xPos, y + 8, { width: userColWidths[i] - 10 });
        xPos += userColWidths[i];
      });
      y += 25;

      // Linhas da tabela
      doc.font('Helvetica').fontSize(8);
      data.users.slice(0, 25).forEach((user, i) => {
        if (y > doc.page.height - 100) {
          doc.addPage();
          y = 50;
        }

        const bgColor = i % 2 === 0 ? '#ffffff' : COLORS.background;
        doc.rect(50, y, pageWidth, 22).fill(bgColor);
        
        doc.fillColor(COLORS.text);
        xPos = 55;
        
        doc.text((user.name || 'Sem nome').substring(0, 25), xPos, y + 6, { width: userColWidths[0] - 10 });
        xPos += userColWidths[0];
        
        doc.text(user.email.substring(0, 28), xPos, y + 6, { width: userColWidths[1] - 10 });
        xPos += userColWidths[1];
        
        const roleColor = user.role === 'admin_global' ? COLORS.danger : user.role === 'consultor' ? COLORS.success : COLORS.info;
        doc.fillColor(roleColor).text(ROLE_LABELS[user.role] || user.role, xPos, y + 6, { width: userColWidths[2] - 10 });
        xPos += userColWidths[2];
        
        doc.fillColor(COLORS.text).text((user.organizationName || '-').substring(0, 20), xPos, y + 6, { width: userColWidths[3] - 10 });
        
        y += 22;
      });

      if (data.users.length > 25) {
        y += 10;
        doc.fillColor(COLORS.textLight).fontSize(8).font('Helvetica-Oblique');
        doc.text(`... e mais ${data.users.length - 25} usuários`, 50, y);
      }

      // ========== RODAPÉ EM TODAS AS PÁGINAS ==========
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        
        // Linha separadora
        doc.moveTo(50, doc.page.height - 50).lineTo(doc.page.width - 50, doc.page.height - 50).stroke(COLORS.border);
        
        // Texto do rodapé
        doc.fillColor(COLORS.textLight).fontSize(8).font('Helvetica');
        doc.text('Seusdados Consultoria - Relatório de Cadastros', 50, doc.page.height - 40);
        doc.text(`Página ${i + 1} de ${pageCount}`, doc.page.width - 100, doc.page.height - 40, { align: 'right' });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
