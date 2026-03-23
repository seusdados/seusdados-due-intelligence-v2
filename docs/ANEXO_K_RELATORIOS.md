# Anexo K - Relatórios Avançados

**Seusdados Due Diligence - Documentação Técnica**

---

## 1. Visão Geral

O módulo de **Relatórios Avançados** oferece geração automatizada de documentos profissionais em PDF, com templates personalizáveis, geração via IA e integração com todos os módulos da plataforma.

### Funcionalidades Principais

- Relatórios PDF profissionais
- Templates personalizáveis por organização
- Geração de conteúdo via IA
- Agendamento de relatórios
- Histórico de relatórios gerados
- Compartilhamento por link
- Marca d'água e proteção
- Múltiplos idiomas

---

## 2. Catálogo de Relatórios

### 2.1 Relatórios de Conformidade

| Relatório | Descrição | Páginas |
|-----------|-----------|---------|
| Avaliação de Maturidade | Resultado completo da avaliação PPPD | 15-25 |
| Gap Analysis | Análise de lacunas e recomendações | 10-15 |
| Plano de Adequação | Roadmap de implementação | 8-12 |
| Certificado de Avaliação | Documento de conclusão | 1-2 |

### 2.2 Relatórios de Terceiros

| Relatório | Descrição | Páginas |
|-----------|-----------|---------|
| Due Diligence Individual | Avaliação completa de um terceiro | 8-12 |
| Matriz de Riscos | Visão consolidada de todos os terceiros | 5-8 |
| Relatório de Incidentes | Histórico de incidentes com terceiros | 10-15 |
| Certificado de Conformidade | Atestado de avaliação do terceiro | 1-2 |

### 2.3 Relatórios de Contratos

| Relatório | Descrição | Páginas |
|-----------|-----------|---------|
| Análise Contratual | Resultado da análise de contrato | 10-15 |
| Cláusulas LGPD | Compilado de cláusulas sugeridas | 8-12 |
| Checklist de Conformidade | Status de conformidade contratual | 3-5 |
| Parecer Jurídico | Opinião legal sobre o contrato | 5-8 |

### 2.4 Relatórios de Governança

| Relatório | Descrição | Páginas |
|-----------|-----------|---------|
| Ata de Reunião | Registro formal de reunião do CPPD | 3-5 |
| Status do Programa | Progresso das iniciativas | 8-12 |
| Indicadores de Governança | KPIs do programa PPPD | 5-8 |
| Relatório Anual | Consolidado do ano | 20-30 |

### 2.5 Relatórios ROPA

| Relatório | Descrição | Páginas |
|-----------|-----------|---------|
| ROT Individual | Registro de Operação de Tratamento | 2-3 |
| ROPA Consolidado | Inventário completo de dados | 15-30 |
| POP | Procedimento Operacional Padrão | 3-5 |
| Mapa de Dados | Visualização de fluxos de dados | 5-8 |

---

## 3. Modelo de Dados

### 3.1 Tabela `report_templates`

```sql
CREATE TABLE report_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT,
  report_type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_html LONGTEXT NOT NULL,
  template_css TEXT,
  header_html TEXT,
  footer_html TEXT,
  variables JSON,
  is_default TINYINT DEFAULT 0,
  is_active TINYINT DEFAULT 1,
  created_by_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (created_by_id) REFERENCES users(id)
);
```

### 3.2 Tabela `report_schedules`

```sql
CREATE TABLE report_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  template_id INT,
  name VARCHAR(255) NOT NULL,
  frequency ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly') NOT NULL,
  day_of_week INT,
  day_of_month INT,
  parameters JSON,
  recipients JSON,
  is_active TINYINT DEFAULT 1,
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  created_by_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (template_id) REFERENCES report_templates(id),
  FOREIGN KEY (created_by_id) REFERENCES users(id)
);
```

### 3.3 Tabela `report_shares`

```sql
CREATE TABLE report_shares (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL,
  share_token VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMP,
  password_hash VARCHAR(255),
  access_count INT DEFAULT 0,
  max_access INT,
  created_by_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports(id),
  FOREIGN KEY (created_by_id) REFERENCES users(id)
);
```

---

## 4. Geração de Relatórios

### 4.1 Pipeline de Geração

```
┌─────────────────┐
│ 1. Coletar      │
│ Dados           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Processar    │
│ com IA          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Renderizar   │
│ Template        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. Gerar        │
│ Gráficos        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. Converter    │
│ para PDF        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 6. Upload       │
│ para S3         │
└─────────────────┘
```

### 4.2 Geração de Conteúdo via IA

```typescript
async function generateAIContent(
  reportType: string,
  data: ReportData
): Promise<AIGeneratedContent> {
  const prompt = getPromptForReportType(reportType);
  
  const response = await invokeLLM({
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: JSON.stringify(data) }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: prompt.schema
    }
  });
  
  return JSON.parse(response.choices[0].message.content);
}

// Exemplo de prompt para relatório de conformidade
const compliancePrompt = {
  system: `Você é um especialista em LGPD. Analise os dados de avaliação 
           e gere um relatório executivo com:
           1. Resumo da situação atual
           2. Principais gaps identificados
           3. Recomendações priorizadas
           4. Próximos passos sugeridos`,
  schema: {
    name: 'compliance_report',
    schema: {
      type: 'object',
      properties: {
        executiveSummary: { type: 'string' },
        currentStatus: { type: 'string' },
        gaps: { type: 'array', items: { type: 'object' } },
        recommendations: { type: 'array', items: { type: 'object' } },
        nextSteps: { type: 'array', items: { type: 'string' } }
      }
    }
  }
};
```

---

## 5. Templates de Relatório

### 5.1 Estrutura do Template

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    {{templateCss}}
  </style>
</head>
<body>
  <header class="report-header">
    {{> header}}
  </header>
  
  <main class="report-content">
    <section class="cover-page">
      <img src="{{organization.logoUrl}}" alt="Logo" />
      <h1>{{title}}</h1>
      <p class="subtitle">{{subtitle}}</p>
      <p class="date">{{formatDate generatedAt 'DD/MM/YYYY'}}</p>
    </section>
    
    <section class="table-of-contents">
      <h2>Sumário</h2>
      {{> tableOfContents sections}}
    </section>
    
    {{#each sections}}
    <section class="section" id="section-{{@index}}">
      <h2>{{this.title}}</h2>
      {{{this.content}}}
    </section>
    {{/each}}
  </main>
  
  <footer class="report-footer">
    {{> footer}}
  </footer>
</body>
</html>
```

### 5.2 Variáveis Disponíveis

| Variável | Descrição |
|----------|-----------|
| `{{organization.name}}` | Nome da organização |
| `{{organization.logoUrl}}` | URL do logo |
| `{{generatedAt}}` | Data de geração |
| `{{generatedBy.name}}` | Nome do gerador |
| `{{title}}` | Título do relatório |
| `{{sections}}` | Array de seções |
| `{{charts}}` | Array de gráficos |
| `{{data.*}}` | Dados específicos do relatório |

### 5.3 Helpers Handlebars

```typescript
// Formatar data
Handlebars.registerHelper('formatDate', (date, format) => {
  return dayjs(date).format(format);
});

// Formatar número
Handlebars.registerHelper('formatNumber', (number, decimals) => {
  return number.toFixed(decimals);
});

// Formatar moeda
Handlebars.registerHelper('formatCurrency', (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
});

// Cor por nível de risco
Handlebars.registerHelper('riskColor', (level) => {
  const colors = {
    baixo: '#22c55e',
    medio: '#eab308',
    alto: '#f97316',
    critico: '#ef4444'
  };
  return colors[level] || '#6b7280';
});
```

---

## 6. Gráficos em Relatórios

### 6.1 Geração de Gráficos

```typescript
async function generateChartImage(
  chartConfig: ChartConfig
): Promise<string> {
  // Usar Puppeteer para renderizar gráfico
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Renderizar componente React com Recharts
  await page.setContent(renderChartHtml(chartConfig));
  
  // Capturar screenshot
  const imageBuffer = await page.screenshot({
    type: 'png',
    clip: chartConfig.dimensions
  });
  
  await browser.close();
  
  // Upload para S3
  const { url } = await storagePut(
    `charts/${uuid()}.png`,
    imageBuffer,
    'image/png'
  );
  
  return url;
}
```

### 6.2 Tipos de Gráficos

| Tipo | Uso | Biblioteca |
|------|-----|------------|
| Radar | Maturidade por domínio | Recharts |
| Line | Evolução temporal | Recharts |
| Bar | Comparativos | Recharts |
| Pie | Distribuição | Recharts |
| Gauge | Indicadores | Recharts |
| Heatmap | Matriz de riscos | Custom |

---

## 7. Agendamento de Relatórios

### 7.1 Configuração de Agendamento

```typescript
interface ReportSchedule {
  id: number;
  organizationId: number;
  reportType: string;
  templateId?: number;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  dayOfWeek?: number;  // 0-6 para semanal
  dayOfMonth?: number; // 1-31 para mensal
  parameters?: Record<string, any>;
  recipients: string[];
  isActive: boolean;
}
```

### 7.2 Processamento de Agendamentos

```typescript
// Executado via cron job
async function processScheduledReports() {
  const dueSchedules = await getSchedulesDue();
  
  for (const schedule of dueSchedules) {
    try {
      // Gerar relatório
      const report = await generateReport({
        organizationId: schedule.organizationId,
        type: schedule.reportType,
        templateId: schedule.templateId,
        parameters: schedule.parameters
      });
      
      // Enviar para destinatários
      for (const email of schedule.recipients) {
        await sendReportEmail(email, report);
      }
      
      // Atualizar próxima execução
      await updateNextRun(schedule.id);
      
    } catch (error) {
      await logScheduleError(schedule.id, error);
    }
  }
}
```

---

## 8. Compartilhamento

### 8.1 Criar Link de Compartilhamento

```typescript
// Criar link compartilhável
reports.createShareLink
  Input: {
    reportId: number,
    expiresInDays?: number,
    password?: string,
    maxAccess?: number
  }
  Output: {
    shareUrl: string,
    token: string,
    expiresAt?: Date
  }
```

### 8.2 Acesso via Link

```typescript
// Acessar relatório compartilhado
reports.accessShared
  Input: {
    token: string,
    password?: string
  }
  Output: {
    report: Report,
    downloadUrl: string
  }
```

---

## 9. Endpoints tRPC

### 9.1 Templates

```typescript
// Listar templates
reports.listTemplates
  Input: { organizationId?: number, reportType?: string }
  Output: Template[]

// Criar template
reports.createTemplate
  Input: {
    organizationId?: number,
    reportType: string,
    name: string,
    templateHtml: string,
    templateCss?: string
  }
  Output: { id: number }

// Atualizar template
reports.updateTemplate
  Input: { templateId: number, ...fields }
  Output: { success: boolean }
```

### 9.2 Geração

```typescript
// Gerar relatório
reports.generate
  Input: {
    organizationId?: number,
    type: string,
    templateId?: number,
    title: string,
    parameters?: Record<string, any>
  }
  Output: { id: number, status: string }

// Gerar com IA
reports.generateWithAI
  Input: {
    organizationId?: number,
    type: string,
    sourceData: any,
    instructions?: string
  }
  Output: { id: number, status: string }

// Verificar status
reports.getStatus
  Input: { reportId: number }
  Output: { status: string, progress: number, fileUrl?: string }
```

### 9.3 Agendamentos

```typescript
// Listar agendamentos
reports.listSchedules
  Input: { organizationId: number }
  Output: Schedule[]

// Criar agendamento
reports.createSchedule
  Input: {
    organizationId: number,
    reportType: string,
    name: string,
    frequency: string,
    recipients: string[]
  }
  Output: { id: number }

// Pausar/retomar
reports.toggleSchedule
  Input: { scheduleId: number, isActive: boolean }
  Output: { success: boolean }
```

---

## 10. Segurança

### 10.1 Proteção de Relatórios

| Recurso | Descrição |
|---------|-----------|
| Marca d'água | Nome do usuário e data |
| Senha | Proteção por senha no compartilhamento |
| Expiração | Links com prazo de validade |
| Limite de acessos | Número máximo de downloads |
| Auditoria | Log de todos os acessos |

### 10.2 Controle de Acesso

| Ação | admin_global | consultor | cliente |
|------|--------------|-----------|---------|
| Gerar relatórios | ✓ | ✓ | ✓ |
| Criar templates | ✓ | ✓ | ✗ |
| Agendar relatórios | ✓ | ✓ | ✓ |
| Compartilhar | ✓ | ✓ | ✓ |
| Ver todos | ✓ | ✓ | ✗ |

---

## 11. Boas Práticas

1. **Clareza**: Usar linguagem acessível
2. **Visualização**: Incluir gráficos relevantes
3. **Contexto**: Explicar métricas e termos
4. **Ação**: Incluir recomendações práticas
5. **Branding**: Manter identidade visual

---

## 12. Referências Técnicas

- WeasyPrint - Geração de PDF
- Puppeteer - Renderização de gráficos
- Handlebars - Templates
- LGPD Art. 37 - Registro de Operações

---

**Anterior**: [Anexo J - Dashboard](./ANEXO_J_DASHBOARD.md)  
**Próximo**: [Anexo L - Usuários e Organizações](./ANEXO_L_USUARIOS.md)
