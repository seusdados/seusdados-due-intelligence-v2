# Anexo J - Dashboard e Relatórios

**Seusdados Due Diligence - Documentação Técnica**

---

## 1. Visão Geral

O módulo de **Dashboard e Relatórios** oferece uma visão consolidada de todas as métricas da plataforma, permitindo acompanhamento em tempo real do status de conformidade, terceiros, tickets e governança.

### Funcionalidades Principais

- Dashboard principal com KPIs consolidados
- Gráficos interativos (Recharts)
- Filtros por organização e período
- Relatórios PDF automatizados
- Exportação de dados em múltiplos formatos
- Alertas e notificações visuais
- Comparativos temporais
- Drill-down para detalhes

---

## 2. Arquitetura do Módulo

### 2.1 Componentes Frontend

| Arquivo | Descrição |
|---------|-----------|
| `Dashboard.tsx` | Dashboard principal |
| `DashboardStats.tsx` | Cards de estatísticas |
| `DashboardCharts.tsx` | Gráficos consolidados |
| `Reports.tsx` | Central de relatórios |
| `ReportViewer.tsx` | Visualizador de relatórios |

### 2.2 Componentes Backend

| Arquivo | Descrição |
|---------|-----------|
| `dashboardRouter.ts` | Procedures tRPC |
| `dashboardService.ts` | Agregação de dados |
| `reportService.ts` | Geração de relatórios |

---

## 3. Modelo de Dados

### 3.1 Tabela `dashboard_snapshots`

```sql
CREATE TABLE dashboard_snapshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT,
  snapshot_date DATE NOT NULL,
  metrics JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);
```

### 3.2 Tabela `reports`

```sql
CREATE TABLE reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT,
  report_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  parameters JSON,
  file_url VARCHAR(500),
  file_key VARCHAR(255),
  status ENUM('pending', 'generating', 'completed', 'error') DEFAULT 'pending',
  generated_by_id INT NOT NULL,
  generated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (generated_by_id) REFERENCES users(id)
);
```

---

## 4. KPIs do Dashboard

### 4.1 Visão Geral

| KPI | Descrição | Fonte |
|-----|-----------|-------|
| Organizações | Total de organizações ativas | organizations |
| Maturidade Média | Média de maturidade LGPD | compliance_assessments |
| Terceiros | Total de terceiros cadastrados | third_parties |
| Risco Médio | Média de risco de terceiros | due_diligence_assessments |
| Tickets Abertos | Tickets pendentes | tickets |
| SLA Cumprido | % de tickets no prazo | tickets |

### 4.2 Cards de Estatísticas

```typescript
interface DashboardStats {
  organizations: {
    total: number;
    active: number;
    withAssessment: number;
  };
  compliance: {
    assessmentsTotal: number;
    averageMaturity: number;
    byLevel: Record<number, number>;
  };
  thirdParties: {
    total: number;
    byRisk: {
      baixo: number;
      medio: number;
      alto: number;
      critico: number;
    };
    pendingAssessment: number;
  };
  tickets: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    slaCompliance: number;
  };
  governance: {
    initiativesTotal: number;
    initiativesCompleted: number;
    documentsOverdue: number;
    tasksOverdue: number;
  };
}
```

---

## 5. Gráficos Disponíveis

### 5.1 Gráfico de Maturidade por Domínio

```typescript
// Radar chart com 10 domínios
const maturityByDomain = {
  type: 'radar',
  data: [
    { domain: 'Governança', score: 3.5 },
    { domain: 'Políticas', score: 4.0 },
    { domain: 'Processos', score: 2.8 },
    { domain: 'Tecnologia', score: 3.2 },
    { domain: 'Pessoas', score: 3.0 },
    { domain: 'Terceiros', score: 2.5 },
    { domain: 'Incidentes', score: 3.8 },
    { domain: 'Direitos', score: 3.3 },
    { domain: 'Monitoramento', score: 2.9 },
    { domain: 'Melhoria', score: 2.7 }
  ]
};
```

### 5.2 Evolução de Maturidade

```typescript
// Line chart temporal
const maturityEvolution = {
  type: 'line',
  data: [
    { month: 'Jan', level: 1.5 },
    { month: 'Fev', level: 1.8 },
    { month: 'Mar', level: 2.2 },
    { month: 'Abr', level: 2.5 },
    { month: 'Mai', level: 2.8 },
    { month: 'Jun', level: 3.0 }
  ]
};
```

### 5.3 Distribuição de Riscos de Terceiros

```typescript
// Pie chart
const riskDistribution = {
  type: 'pie',
  data: [
    { name: 'Baixo', value: 45, color: '#22c55e' },
    { name: 'Médio', value: 30, color: '#eab308' },
    { name: 'Alto', value: 18, color: '#f97316' },
    { name: 'Crítico', value: 7, color: '#ef4444' }
  ]
};
```

### 5.4 Tickets por Status

```typescript
// Bar chart
const ticketsByStatus = {
  type: 'bar',
  data: [
    { status: 'Aberto', count: 12 },
    { status: 'Em Atendimento', count: 8 },
    { status: 'Aguardando', count: 5 },
    { status: 'Resolvido', count: 45 },
    { status: 'Fechado', count: 120 }
  ]
};
```

### 5.5 SLA Performance

```typescript
// Gauge chart
const slaPerformance = {
  type: 'gauge',
  value: 87,
  thresholds: [
    { value: 70, color: '#ef4444' },
    { value: 85, color: '#eab308' },
    { value: 100, color: '#22c55e' }
  ]
};
```

---

## 6. Filtros e Segmentação

### 6.1 Filtros Disponíveis

| Filtro | Tipo | Opções |
|--------|------|--------|
| Organização | Select | Lista de organizações |
| Período | DateRange | Últimos 7/30/90 dias, personalizado |
| Módulo | MultiSelect | Conformidade, Terceiros, Tickets, etc. |
| Status | MultiSelect | Ativo, Pendente, Concluído |

### 6.2 Implementação

```typescript
interface DashboardFilters {
  organizationId?: number;
  startDate?: Date;
  endDate?: Date;
  modules?: string[];
  status?: string[];
}

// Aplicar filtros
const filteredStats = await dashboard.getStats({
  ...filters,
  organizationId: selectedOrg || undefined
});
```

---

## 7. Tipos de Relatórios

### 7.1 Relatório de Conformidade

| Seção | Conteúdo |
|-------|----------|
| Resumo Executivo | Visão geral de maturidade |
| Análise por Domínio | Detalhamento dos 10 domínios |
| Gaps Identificados | Lista de não conformidades |
| Plano de Ação | Ações recomendadas |
| Evolução Temporal | Comparativo com avaliações anteriores |

### 7.2 Relatório de Terceiros

| Seção | Conteúdo |
|-------|----------|
| Resumo | Total de terceiros e distribuição de risco |
| Matriz de Risco | Visualização 5x5 |
| Terceiros Críticos | Lista detalhada |
| Due Diligence Pendentes | Avaliações a realizar |
| Recomendações | Ações por nível de risco |

### 7.3 Relatório de Tickets (MeuDPO)

| Seção | Conteúdo |
|-------|----------|
| Resumo | KPIs de atendimento |
| Performance de SLA | Cumprimento por prioridade |
| Distribuição | Por tipo, status, consultor |
| Tendências | Evolução temporal |
| Detalhamento | Lista de tickets do período |

### 7.4 Relatório Consolidado

| Seção | Conteúdo |
|-------|----------|
| Dashboard Executivo | Visão 360° da organização |
| Conformidade | Resumo de maturidade |
| Terceiros | Resumo de riscos |
| Governança | Status do programa |
| Tickets | Performance de atendimento |
| Próximos Passos | Ações prioritárias |

---

## 8. Endpoints tRPC

### 8.1 Dashboard

```typescript
// Obter estatísticas
dashboard.getStats
  Input: { organizationId?: number, startDate?: string, endDate?: string }
  Output: DashboardStats

// Obter gráficos
dashboard.getCharts
  Input: { organizationId?: number, chartTypes: string[] }
  Output: ChartData[]

// Obter alertas
dashboard.getAlerts
  Input: { organizationId?: number }
  Output: Alert[]

// Salvar snapshot
dashboard.saveSnapshot
  Input: { organizationId?: number }
  Output: { id: number }
```

### 8.2 Relatórios

```typescript
// Listar relatórios
reports.list
  Input: { organizationId?: number, type?: string }
  Output: Report[]

// Gerar relatório
reports.generate
  Input: {
    organizationId?: number,
    type: string,
    title: string,
    parameters?: Record<string, any>
  }
  Output: { id: number, status: string }

// Obter status
reports.getStatus
  Input: { reportId: number }
  Output: { status: string, progress?: number, fileUrl?: string }

// Download
reports.download
  Input: { reportId: number }
  Output: { url: string }
```

---

## 9. Geração de PDF

### 9.1 Template de Relatório

```typescript
async function generatePdfReport(
  type: string,
  data: ReportData,
  organizationId?: number
): Promise<Buffer> {
  const template = await loadTemplate(type);
  const organization = organizationId 
    ? await getOrganization(organizationId) 
    : null;
  
  const html = renderTemplate(template, {
    ...data,
    organization,
    generatedAt: new Date(),
    logo: organization?.logoUrl || defaultLogo
  });
  
  return await htmlToPdf(html, {
    format: 'A4',
    margin: { top: 20, right: 20, bottom: 20, left: 20 },
    displayHeaderFooter: true,
    headerTemplate: getHeaderTemplate(organization),
    footerTemplate: getFooterTemplate()
  });
}
```

### 9.2 Estrutura do PDF

```html
<div class="report">
  <header class="report-header">
    <img src="{{logo}}" alt="Logo" />
    <h1>{{title}}</h1>
    <p>Gerado em: {{generatedAt}}</p>
  </header>
  
  <section class="executive-summary">
    <h2>Resumo Executivo</h2>
    {{executiveSummary}}
  </section>
  
  <section class="charts">
    <h2>Análise Visual</h2>
    {{#each charts}}
      <img src="{{this.imageUrl}}" alt="{{this.title}}" />
    {{/each}}
  </section>
  
  <section class="details">
    <h2>Detalhamento</h2>
    {{details}}
  </section>
  
  <section class="recommendations">
    <h2>Recomendações</h2>
    {{recommendations}}
  </section>
  
  <footer class="report-footer">
    <p>Seusdados Due Diligence - Confidencial</p>
  </footer>
</div>
```

---

## 10. Alertas e Notificações

### 10.1 Tipos de Alertas

| Tipo | Condição | Prioridade |
|------|----------|------------|
| SLA em risco | Ticket próximo do prazo | Alta |
| Avaliação atrasada | Due diligence pendente | Média |
| Documento vencido | Prazo de documento expirado | Alta |
| Maturidade baixa | Score < 2 em domínio | Média |
| Terceiro crítico | Risco crítico identificado | Alta |

### 10.2 Exibição no Dashboard

```typescript
interface Alert {
  id: number;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  link: string;
  createdAt: Date;
  isRead: boolean;
}

// Componente de alertas
function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  return (
    <div className="alerts-panel">
      {alerts.map(alert => (
        <AlertCard key={alert.id} alert={alert} />
      ))}
    </div>
  );
}
```

---

## 11. Exportação de Dados

### 11.1 Formatos Disponíveis

| Formato | Uso |
|---------|-----|
| PDF | Relatórios formais |
| XLSX | Análise em planilha |
| CSV | Integração com outros sistemas |
| JSON | API e automação |

### 11.2 Exportação em Lote

```typescript
// Exportar dados consolidados
dashboard.exportData
  Input: {
    organizationId?: number,
    modules: string[],
    format: 'xlsx' | 'csv' | 'json',
    startDate?: string,
    endDate?: string
  }
  Output: { url: string }
```

---

## 12. Segurança e Permissões

### 12.1 Controle de Acesso

| Ação | admin_global | consultor | cliente |
|------|--------------|-----------|---------|
| Ver dashboard global | ✓ | ✓ | ✗ |
| Ver dashboard org | ✓ | ✓ | ✓ |
| Gerar relatórios | ✓ | ✓ | ✓ |
| Exportar dados | ✓ | ✓ | ✓ (própria org) |
| Configurar alertas | ✓ | ✓ | ✗ |

---

## 13. Boas Práticas

1. **Atualização**: Manter dados em tempo real
2. **Clareza**: Usar visualizações intuitivas
3. **Contexto**: Incluir comparativos temporais
4. **Ação**: Vincular alertas a ações
5. **Personalização**: Permitir filtros flexíveis

---

## 14. Referências Técnicas

- Recharts - Biblioteca de gráficos React
- WeasyPrint - Geração de PDF
- ISO 27001 - Métricas de SGSI
- NIST CSF - Métricas de Cibersegurança

---

**Anterior**: [Anexo I - Simulador CPPD](./ANEXO_I_SIMULADOR.md)  
**Próximo**: [Anexo K - Relatórios Avançados](./ANEXO_K_RELATORIOS.md)
