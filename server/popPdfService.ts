/**
 * popPdfService.ts
 * Gera HTML Visual Law para exportação do Procedimento Operacional Padrão (POP)
 * Seusdados Consultoria em Gestão de Dados Limitada
 * CNPJ 33.899.116/0001-63 — seusdados.com
 * Responsável Técnico: Marcelo Fattori
 */

interface PopPdfInput {
  processTitle: string;
  department?: string;
  organizationName?: string;
  steps: {
    title: string;
    actor?: string;
    channel?: string[];
    systems?: string[];
    dataUsed?: string[];
    operations?: string[];
    sharing?: string[];
    controls?: string;
    notes?: string;
  }[];
}

export function generatePopPdfHtml(input: PopPdfInput): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const org = input.organizationName || 'Organização';
  const dept = input.department || '';
  const process = input.processTitle || 'Processo';

  const stepsHtml = input.steps.map((s, idx) => {
    const tags = (arr: string[] | undefined, label: string) => {
      if (!arr || !arr.length) return '';
      return `
        <div class="field-row">
          <span class="field-label">${label}</span>
          <div class="tags">
            ${arr.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
          </div>
        </div>`;
    };

    const textField = (val: string | undefined, label: string) => {
      if (!val) return '';
      return `
        <div class="field-row">
          <span class="field-label">${label}</span>
          <span class="field-value">${escapeHtml(val)}</span>
        </div>`;
    };

    return `
      <div class="step-card">
        <div class="step-header">
          <div class="step-number">${idx + 1}</div>
          <div class="step-title-block">
            <div class="step-title">${escapeHtml(s.title || '(sem título)')}</div>
            ${s.actor ? `<div class="step-actor">Responsável: ${escapeHtml(s.actor)}</div>` : ''}
          </div>
        </div>
        <div class="step-body">
          ${tags(s.channel, 'Canais')}
          ${tags(s.systems, 'Sistemas')}
          ${tags(s.dataUsed, 'Dados pessoais')}
          ${tags(s.operations, 'Operações')}
          ${tags(s.sharing, 'Compartilhamentos')}
          ${textField(s.controls, 'Controles')}
          ${textField(s.notes, 'Observações')}
        </div>
      </div>`;
  }).join('');

  // Gerar diagrama de fluxo simples
  const flowDiagram = input.steps.length > 1 ? `
    <div class="flow-section">
      <h2 class="section-title">Diagrama de fluxo</h2>
      <div class="flow-diagram">
        ${input.steps.map((s, idx) => `
          <div class="flow-node">
            <div class="flow-circle">${idx + 1}</div>
            <div class="flow-label">${escapeHtml(s.title || `Etapa ${idx + 1}`)}</div>
          </div>
          ${idx < input.steps.length - 1 ? '<div class="flow-arrow">&#8594;</div>' : ''}
        `).join('')}
      </div>
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>POP - ${escapeHtml(process)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;500;600&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Poppins', sans-serif;
      font-weight: 300;
      color: #1f2937;
      line-height: 1.6;
      background: white;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 20mm;
      background: white;
      page-break-after: always;
    }
    .page:last-child { page-break-after: avoid; }

    /* Header */
    .header {
      background: linear-gradient(135deg, #2E1065 0%, #4C1D95 30%, #6D28D9 70%, #7C3AED 100%);
      padding: 30px 40px;
      margin: -20mm -20mm 30px -20mm;
      color: white;
    }
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .header-left { flex: 1; }
    .header-badge {
      display: inline-block;
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.3);
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      margin-bottom: 15px;
    }
    .header-title {
      font-size: 26px;
      font-weight: 200;
      letter-spacing: -0.02em;
      margin-bottom: 5px;
    }
    .header-subtitle {
      font-size: 16px;
      font-weight: 300;
      color: #fbbf24;
    }
    .header-right { text-align: right; }
    .header-date {
      font-size: 12px;
      font-weight: 300;
      opacity: 0.8;
    }

    /* Meta info */
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 30px;
    }
    .meta-card {
      background: linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(109,40,217,0.05) 100%);
      border-radius: 10px;
      padding: 16px;
      border-left: 3px solid #6D28D9;
    }
    .meta-label {
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #6D28D9;
      margin-bottom: 4px;
    }
    .meta-value {
      font-size: 14px;
      font-weight: 400;
      color: #111827;
    }

    /* Section title */
    .section-title {
      font-size: 18px;
      font-weight: 300;
      color: #2E1065;
      border-bottom: 2px solid #6D28D9;
      padding-bottom: 8px;
      margin-bottom: 20px;
      margin-top: 30px;
    }

    /* Step cards */
    .step-card {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      margin-bottom: 16px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .step-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 18px;
      background: linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(109,40,217,0.03) 100%);
      border-bottom: 1px solid #e5e7eb;
    }
    .step-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6D28D9, #7C3AED);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 500;
      flex-shrink: 0;
    }
    .step-title-block { flex: 1; }
    .step-title {
      font-size: 15px;
      font-weight: 500;
      color: #111827;
    }
    .step-actor {
      font-size: 12px;
      font-weight: 300;
      color: #6b7280;
      margin-top: 2px;
    }
    .step-body {
      padding: 14px 18px;
    }
    .field-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 8px;
    }
    .field-label {
      font-size: 11px;
      font-weight: 500;
      color: #6D28D9;
      min-width: 110px;
      flex-shrink: 0;
      padding-top: 3px;
    }
    .field-value {
      font-size: 13px;
      font-weight: 300;
      color: #374151;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .tag {
      display: inline-block;
      background: rgba(139,92,246,0.1);
      color: #4C1D95;
      font-size: 11px;
      font-weight: 400;
      padding: 2px 10px;
      border-radius: 12px;
    }

    /* Flow diagram */
    .flow-section { margin-top: 30px; }
    .flow-diagram {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 8px;
      padding: 20px;
      background: #faf5ff;
      border-radius: 10px;
      border: 1px solid #e9d5ff;
    }
    .flow-node { text-align: center; }
    .flow-circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6D28D9, #7C3AED);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 500;
      margin: 0 auto 6px;
    }
    .flow-label {
      font-size: 10px;
      font-weight: 400;
      color: #4C1D95;
      max-width: 100px;
      line-height: 1.3;
    }
    .flow-arrow {
      font-size: 20px;
      color: #6D28D9;
      padding: 0 4px;
    }

    /* Footer */
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      font-size: 10px;
      font-weight: 300;
      color: #9ca3af;
      text-align: center;
    }
    .footer strong {
      font-weight: 500;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="header-content">
        <div class="header-left">
          <div class="header-badge">Procedimento Operacional Padr\u00e3o</div>
          <div class="header-title">${escapeHtml(process)}</div>
          <div class="header-subtitle">POP \u2014 Mapeamento de Dados Pessoais</div>
        </div>
        <div class="header-right">
          <div class="header-date">
            <strong>${escapeHtml(org)}</strong><br>
            ${dateStr}<br>
            ${dept ? `\u00c1rea: ${escapeHtml(dept)}` : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- Meta -->
    <div class="meta-grid">
      <div class="meta-card">
        <div class="meta-label">Processo</div>
        <div class="meta-value">${escapeHtml(process)}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Total de etapas</div>
        <div class="meta-value">${input.steps.length}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Data de gera\u00e7\u00e3o</div>
        <div class="meta-value">${dateStr}</div>
      </div>
    </div>

    <!-- Flow Diagram -->
    ${flowDiagram}

    <!-- Steps -->
    <h2 class="section-title">Etapas detalhadas</h2>
    ${stepsHtml}

    <!-- Footer -->
    <div class="footer">
      Documento gerado por <strong>Seusdados Consultoria em Gest\u00e3o de Dados Limitada</strong><br>
      CNPJ 33.899.116/0001-63 \u2014 seusdados.com<br>
      Responsável Técnico: Marcelo Fattori
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
