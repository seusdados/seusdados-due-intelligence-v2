// Serviço de geração premium de ROT e POP
// Visual profissional com identidade Seusdados

interface RotPremiumData {
  rot: any;
  organizationName: string;
  consultantName: string;
  consultantEmail: string;
}

export function generateRotPremiumHTML(data: RotPremiumData): string {
  const { rot, organizationName, consultantName, consultantEmail } = data;
  const dataCategories = rot.dataCategories || [];
  const sensiveisCount = dataCategories.filter((d: any) => d.sensivel).length;
  const comuns = dataCategories.filter((d: any) => !d.sensivel);
  const sensiveis = dataCategories.filter((d: any) => d.sensivel);

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ROT Premium - ${rot.title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #1a202c;
      background: #ffffff;
    }
    
    .container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 20mm;
    }
    
    /* Header Premium */
    .header {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 40px;
      border-radius: 12px;
      margin-bottom: 40px;
      box-shadow: 0 10px 30px rgba(99, 102, 241, 0.3);
    }
    
    .header h1 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    
    .header .subtitle {
      font-size: 18px;
      opacity: 0.95;
      font-weight: 400;
    }
    
    .header .doc-type {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 14px;
      margin-top: 16px;
      font-weight: 500;
    }
    
    /* Metadata Card */
    .metadata {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 40px;
    }
    
    .metadata-item {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #6366f1;
    }
    
    .metadata-item .label {
      font-size: 12px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    
    .metadata-item .value {
      font-size: 16px;
      color: #1e293b;
      font-weight: 600;
    }
    
    /* Section Styling */
    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 3px solid #6366f1;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .section-title::before {
      content: '';
      width: 6px;
      height: 28px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 3px;
    }
    
    .content-box {
      background: #f8fafc;
      padding: 24px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      line-height: 1.8;
    }
    
    /* Table Premium */
    .premium-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 20px 0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    
    .premium-table thead {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
    }
    
    .premium-table th {
      padding: 16px;
      text-align: left;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .premium-table td {
      padding: 16px;
      border-bottom: 1px solid #e2e8f0;
      background: white;
    }
    
    .premium-table tbody tr:last-child td {
      border-bottom: none;
    }
    
    .premium-table tbody tr:hover {
      background: #f8fafc;
    }
    
    /* Badges */
    .badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .badge-sensitive {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }
    
    .badge-normal {
      background: #f0fdf4;
      color: #16a34a;
      border: 1px solid #bbf7d0;
    }
    
    .badge-risk-baixo {
      background: #f0fdf4;
      color: #16a34a;
    }
    
    .badge-risk-medio {
      background: #fef3c7;
      color: #d97706;
    }
    
    .badge-risk-alto {
      background: #fee2e2;
      color: #dc2626;
    }
    
    .badge-risk-critico {
      background: #fecaca;
      color: #991b1b;
      font-weight: 700;
    }
    
    /* Alert Box */
    .alert {
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      display: flex;
      align-items: start;
      gap: 16px;
    }
    
    .alert-warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      color: #92400e;
    }
    
    .alert-success {
      background: #d1fae5;
      border-left: 4px solid #10b981;
      color: #065f46;
    }
    
    .alert-icon {
      font-size: 24px;
      flex-shrink: 0;
    }
    
    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin: 30px 0;
    }
    
    .stat-card {
      background: white;
      padding: 24px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      border: 2px solid #e2e8f0;
    }
    
    .stat-card .number {
      font-size: 36px;
      font-weight: 700;
      color: #6366f1;
      margin-bottom: 8px;
    }
    
    .stat-card .label {
      font-size: 14px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    
    /* Footer */
    .footer {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 2px solid #e2e8f0;
      color: #64748b;
      font-size: 13px;
    }
    
    .footer-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .footer-section h4 {
      color: #1e293b;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .signature-line {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 2px solid #1e293b;
      text-align: center;
      font-weight: 600;
      color: #1e293b;
    }
    
    @media print {
      .container {
        padding: 0;
      }
      
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header Premium -->
    <div class="header">
      <div class="doc-type">LGPD - Lei Geral de Proteção de Dados</div>
      <h1>Registro de Operação de Tratamento</h1>
      <div class="subtitle">${rot.title}</div>
    </div>

    <!-- Metadata -->
    <div class="metadata">
      <div class="metadata-item">
        <div class="label">Organização</div>
        <div class="value">${organizationName}</div>
      </div>
      <div class="metadata-item">
        <div class="label">Departamento</div>
        <div class="value">${rot.department || "Não especificado"}</div>
      </div>
      <div class="metadata-item">
        <div class="label">Categoria de Titular</div>
        <div class="value">${rot.titularCategory || "Não especificado"}</div>
      </div>
      <div class="metadata-item">
        <div class="label">Data de Criação</div>
        <div class="value">${new Date(rot.createdAt).toLocaleDateString("pt-BR")}</div>
      </div>
    </div>

    <!-- Descrição -->
    <div class="section">
      <h2 class="section-title">Descrição da Operação</h2>
      <div class="content-box">
        ${rot.description || "Sem descrição disponível."}
      </div>
    </div>

    <!-- Finalidade -->
    <div class="section">
      <h2 class="section-title">Finalidade do Tratamento</h2>
      <div class="content-box">
        ${rot.purpose || "Não especificada."}
      </div>
    </div>

    <!-- Base Legal -->
    <div class="section">
      <h2 class="section-title">Base Legal (LGPD)</h2>
      <div class="content-box">
        <strong>Base Legal Principal:</strong> ${rot.legalBase || "Não especificada"}
        ${rot.justification ? `<br><br><strong>Justificativa:</strong> ${rot.justification}` : ""}
      </div>
      
      ${rot.requiresConsent 
        ? '<div class="alert alert-warning"><span class="alert-icon">⚠️</span><div><strong>Atenção:</strong> Esta operação requer consentimento explícito do titular dos dados.</div></div>'
        : '<div class="alert alert-success"><span class="alert-icon">✅</span><div>Esta operação não requer consentimento específico do titular.</div></div>'
      }
    </div>

    <!-- Estatísticas de Dados -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="number">${dataCategories.length}</div>
        <div class="label">Total de Categorias</div>
      </div>
      <div class="stat-card">
        <div class="number">${comuns.length}</div>
        <div class="label">Dados Comuns</div>
      </div>
      <div class="stat-card">
        <div class="number">${sensiveisCount}</div>
        <div class="label">Dados Sensíveis</div>
      </div>
    </div>

    <!-- Dados Tratados -->
    <div class="section">
      <h2 class="section-title">Categorias de Dados Tratados</h2>
      
      ${dataCategories.length > 0 ? `
        <table class="premium-table">
          <thead>
            <tr>
              <th>Categoria de Dado</th>
              <th style="text-align: center;">Classificação</th>
            </tr>
          </thead>
          <tbody>
            ${dataCategories.map((d: any) => `
              <tr>
                <td>${d.name}</td>
                <td style="text-align: center;">
                  ${d.sensivel 
                    ? '<span class="badge badge-sensitive">⚠️ Sensível</span>' 
                    : '<span class="badge badge-normal">✓ Comum</span>'
                  }
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<p style="text-align: center; color: #64748b; padding: 40px 0;">Nenhuma categoria de dados registrada.</p>'}
    </div>

    <!-- Análise de Risco -->
    <div class="section">
      <h2 class="section-title">Análise de Risco</h2>
      <div class="content-box">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; font-weight: 600; width: 200px;">Nível de Risco:</td>
            <td>
              <span class="badge badge-risk-${rot.riskLevel || 'baixo'}">
                ${(rot.riskLevel || 'baixo').toUpperCase()}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; font-weight: 600;">Score de Risco:</td>
            <td>${rot.riskScore || "N/A"}</td>
          </tr>
        </table>
        
        ${rot.recommendations ? `
          <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
            <h4 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #1e293b;">Recomendações</h4>
            <div style="line-height: 1.8;">${rot.recommendations}</div>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-grid">
        <div class="footer-section">
          <h4>Organização</h4>
          <p>${organizationName}</p>
        </div>
        <div class="footer-section">
          <h4>Consultor Responsável</h4>
          <p>${consultantName}<br>${consultantEmail}</p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 8px;">
        <p style="font-size: 12px; color: #64748b;">
          Documento gerado automaticamente pelo <strong>Sistema Seusdados Due Diligence</strong><br>
          Data de geração: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}
        </p>
      </div>
      
      <div class="signature-line">
        ${consultantName}<br>
        <span style="font-size: 12px; font-weight: 400; color: #64748b;">Consultor LGPD - Seusdados Consultoria</span>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

interface PopPremiumData {
  rot: any;
  organizationName: string;
  consultantName: string;
  consultantEmail: string;
}

export function generatePopPremiumHTML(data: PopPremiumData): string {
  const { rot, organizationName, consultantName, consultantEmail } = data;
  const dataCategories = rot.dataCategories || [];

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>POP Premium - ${rot.title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #1a202c;
      background: #ffffff;
    }
    
    .container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 20mm;
    }
    
    /* Header Premium */
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 40px;
      border-radius: 12px;
      margin-bottom: 40px;
      box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
    }
    
    .header h1 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    
    .header .subtitle {
      font-size: 18px;
      opacity: 0.95;
      font-weight: 400;
    }
    
    .header .doc-type {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 14px;
      margin-top: 16px;
      font-weight: 500;
    }
    
    /* Section Styling */
    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 3px solid #10b981;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .section-title::before {
      content: '';
      width: 6px;
      height: 28px;
      background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 3px;
    }
    
    /* Step Card */
    .step-card {
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      position: relative;
      padding-left: 80px;
    }
    
    .step-number {
      position: absolute;
      left: 24px;
      top: 24px;
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    
    .step-card h3 {
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 12px;
    }
    
    .step-card p {
      color: #475569;
      line-height: 1.8;
    }
    
    /* Checklist */
    .checklist {
      background: #f8fafc;
      padding: 24px;
      border-radius: 8px;
      border-left: 4px solid #10b981;
    }
    
    .checklist-item {
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: start;
      gap: 12px;
    }
    
    .checklist-item:last-child {
      border-bottom: none;
    }
    
    .checklist-item::before {
      content: '☐';
      font-size: 20px;
      color: #10b981;
      flex-shrink: 0;
    }
    
    /* Alert Box */
    .alert {
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      display: flex;
      align-items: start;
      gap: 16px;
    }
    
    .alert-info {
      background: #dbeafe;
      border-left: 4px solid #3b82f6;
      color: #1e40af;
    }
    
    .alert-icon {
      font-size: 24px;
      flex-shrink: 0;
    }
    
    /* Footer */
    .footer {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 2px solid #e2e8f0;
      color: #64748b;
      font-size: 13px;
      text-align: center;
    }
    
    .signature-line {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 2px solid #1e293b;
      text-align: center;
      font-weight: 600;
      color: #1e293b;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header Premium -->
    <div class="header">
      <div class="doc-type">Procedimento Operacional Padrão</div>
      <h1>POP - ${rot.title}</h1>
      <div class="subtitle">${organizationName}</div>
    </div>

    <!-- Objetivo -->
    <div class="section">
      <h2 class="section-title">1. Objetivo</h2>
      <div class="alert alert-info">
        <span class="alert-icon">🎯</span>
        <div>
          <strong>Finalidade deste procedimento:</strong><br>
          ${rot.purpose || "Estabelecer diretrizes para o tratamento de dados pessoais de forma adequada e em conformidade com a LGPD."}
        </div>
      </div>
    </div>

    <!-- Escopo -->
    <div class="section">
      <h2 class="section-title">2. Escopo e Aplicação</h2>
      <div class="step-card">
        <div class="step-number">📋</div>
        <h3>Área de Aplicação</h3>
        <p><strong>Departamento:</strong> ${rot.department || "Todos os departamentos"}</p>
        <p><strong>Categoria de Titular:</strong> ${rot.titularCategory || "Não especificado"}</p>
        <p><strong>Dados Tratados:</strong> ${dataCategories.length} categorias de dados pessoais</p>
      </div>
    </div>

    <!-- Procedimentos -->
    <div class="section">
      <h2 class="section-title">3. Procedimentos</h2>
      
      <div class="step-card">
        <div class="step-number">1</div>
        <h3>Coleta de Dados</h3>
        <p>Coletar apenas os dados pessoais estritamente necessários para a finalidade declarada: <strong>${rot.purpose || "não especificada"}</strong>.</p>
        <div class="checklist">
          <div class="checklist-item">Informar o titular sobre a coleta e finalidade</div>
          <div class="checklist-item">Coletar apenas dados necessários</div>
          <div class="checklist-item">Registrar a data e hora da coleta</div>
          ${rot.requiresConsent ? '<div class="checklist-item"><strong>Obter consentimento explícito do titular</strong></div>' : ''}
        </div>
      </div>

      <div class="step-card">
        <div class="step-number">2</div>
        <h3>Armazenamento Seguro</h3>
        <p>Armazenar os dados de forma segura, implementando medidas técnicas e organizacionais adequadas.</p>
        <div class="checklist">
          <div class="checklist-item">Utilizar criptografia para dados sensíveis</div>
          <div class="checklist-item">Implementar controle de acesso baseado em função</div>
          <div class="checklist-item">Manter logs de acesso aos dados</div>
          <div class="checklist-item">Realizar backups regulares</div>
        </div>
      </div>

      <div class="step-card">
        <div class="step-number">3</div>
        <h3>Uso e Processamento</h3>
        <p>Utilizar os dados exclusivamente para a finalidade declarada, com base na seguinte fundamentação legal: <strong>${rot.legalBase || "não especificada"}</strong>.</p>
        <div class="checklist">
          <div class="checklist-item">Verificar autorização antes do uso</div>
          <div class="checklist-item">Não compartilhar dados sem consentimento</div>
          <div class="checklist-item">Documentar todas as operações de tratamento</div>
          <div class="checklist-item">Respeitar os direitos dos titulares</div>
        </div>
      </div>

      <div class="step-card">
        <div class="step-number">4</div>
        <h3>Compartilhamento com Terceiros</h3>
        <p>Ao compartilhar dados com terceiros, garantir que estes também estejam em conformidade com a LGPD.</p>
        <div class="checklist">
          <div class="checklist-item">Verificar conformidade do terceiro</div>
          <div class="checklist-item">Formalizar acordo de processamento de dados</div>
          <div class="checklist-item">Limitar acesso ao mínimo necessário</div>
          <div class="checklist-item">Monitorar o uso por terceiros</div>
        </div>
      </div>

      <div class="step-card">
        <div class="step-number">5</div>
        <h3>Eliminação de Dados</h3>
        <p>Eliminar os dados quando não forem mais necessários para a finalidade declarada ou quando solicitado pelo titular.</p>
        <div class="checklist">
          <div class="checklist-item">Definir período de retenção</div>
          <div class="checklist-item">Revisar periodicamente a necessidade de manutenção</div>
          <div class="checklist-item">Eliminar de forma segura e irreversível</div>
          <div class="checklist-item">Documentar a eliminação</div>
        </div>
      </div>
    </div>

    <!-- Responsabilidades -->
    <div class="section">
      <h2 class="section-title">4. Responsabilidades</h2>
      <div class="step-card">
        <div class="step-number">👥</div>
        <h3>Equipe Responsável</h3>
        <p><strong>DPO (Encarregado de Dados):</strong> Supervisionar a conformidade com a LGPD</p>
        <p><strong>Gestor do Departamento:</strong> Garantir que os procedimentos sejam seguidos</p>
        <p><strong>Equipe Operacional:</strong> Executar os procedimentos conforme descrito</p>
      </div>
    </div>

    <!-- Revisão -->
    <div class="section">
      <h2 class="section-title">5. Revisão e Atualização</h2>
      <div class="alert alert-info">
        <span class="alert-icon">🔄</span>
        <div>
          Este procedimento deve ser revisado periodicamente (no mínimo anualmente) ou sempre que houver mudanças significativas nas operações de tratamento de dados.
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div style="margin-bottom: 30px; padding: 20px; background: #f8fafc; border-radius: 8px;">
        <p style="font-size: 12px; color: #64748b;">
          Documento gerado automaticamente pelo <strong>Sistema Seusdados Due Diligence</strong><br>
          Data de geração: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}
        </p>
      </div>
      
      <div class="signature-line">
        ${consultantName}<br>
        <span style="font-size: 12px; font-weight: 400; color: #64748b;">Consultor LGPD - Seusdados Consultoria</span>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
