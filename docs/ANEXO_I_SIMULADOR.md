# Anexo I - Simulador CPPD

**Seusdados Due Diligence - Documentação Técnica**

---

## 1. Visão Geral

O **Simulador CPPD** é uma ferramenta de planejamento estratégico que permite às organizações simularem cenários de implementação do Programa de Privacidade e Proteção de Dados, calculando custos, prazos e recursos necessários para atingir diferentes níveis de maturidade.

### Funcionalidades Principais

- Simulação de cenários de implementação
- Cálculo de investimento necessário
- Estimativa de prazos por fase
- Análise de ROI (Retorno sobre Investimento)
- Comparativo entre cenários
- Geração de roadmap visual
- Exportação de plano de implementação
- Integração com Governança PPPD

---

## 2. Arquitetura do Módulo

### 2.1 Componentes Frontend

| Arquivo | Descrição |
|---------|-----------|
| `SimuladorCPPD.tsx` | Interface principal do simulador |
| `SimuladorCenarios.tsx` | Comparativo de cenários |
| `SimuladorRoadmap.tsx` | Visualização de roadmap |
| `SimuladorExport.tsx` | Exportação de planos |

### 2.2 Componentes Backend

| Arquivo | Descrição |
|---------|-----------|
| `simuladorRouter.ts` | Procedures tRPC |
| `simuladorService.ts` | Lógica de cálculos |
| `simuladorTemplates.ts` | Templates de cenários |

---

## 3. Modelo de Dados

### 3.1 Tabela `simulador_scenarios`

```sql
CREATE TABLE simulador_scenarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_maturity_level INT DEFAULT 3,
  current_maturity_level INT DEFAULT 1,
  timeline_months INT DEFAULT 12,
  budget_total DECIMAL(15,2),
  is_active TINYINT DEFAULT 1,
  created_by_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (created_by_id) REFERENCES users(id)
);
```

### 3.2 Tabela `simulador_phases`

```sql
CREATE TABLE simulador_phases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scenario_id INT NOT NULL,
  phase_number INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_month INT NOT NULL,
  duration_months INT NOT NULL,
  budget_allocated DECIMAL(15,2),
  resources_needed JSON,
  deliverables JSON,
  dependencies JSON,
  status ENUM('planned', 'in_progress', 'completed') DEFAULT 'planned',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scenario_id) REFERENCES simulador_scenarios(id)
);
```

### 3.3 Tabela `simulador_resources`

```sql
CREATE TABLE simulador_resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scenario_id INT NOT NULL,
  resource_type ENUM('interno', 'externo', 'tecnologia', 'treinamento') NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cost_monthly DECIMAL(15,2),
  cost_total DECIMAL(15,2),
  hours_monthly INT,
  start_month INT,
  end_month INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scenario_id) REFERENCES simulador_scenarios(id)
);
```

---

## 4. Níveis de Maturidade

O simulador trabalha com 5 níveis de maturidade LGPD:

| Nível | Nome | Descrição | % Conformidade |
|-------|------|-----------|----------------|
| 1 | Inicial | Processos inexistentes ou ad-hoc | 0-20% |
| 2 | Básico | Processos definidos, não padronizados | 21-40% |
| 3 | Intermediário | Processos padronizados e documentados | 41-60% |
| 4 | Avançado | Processos monitorados e medidos | 61-80% |
| 5 | Otimizado | Melhoria contínua implementada | 81-100% |

---

## 5. Templates de Cenários

### 5.1 Cenário Básico (12 meses)

```typescript
const cenarioBasico = {
  name: 'Implementação Básica',
  targetMaturity: 3,
  timeline: 12,
  phases: [
    { name: 'Diagnóstico', duration: 2, budget: 15000 },
    { name: 'Planejamento', duration: 1, budget: 10000 },
    { name: 'Governança', duration: 2, budget: 20000 },
    { name: 'Políticas', duration: 2, budget: 15000 },
    { name: 'Processos', duration: 2, budget: 25000 },
    { name: 'Treinamento', duration: 1, budget: 10000 },
    { name: 'Monitoramento', duration: 2, budget: 15000 }
  ],
  totalBudget: 110000
};
```

### 5.2 Cenário Acelerado (6 meses)

```typescript
const cenarioAcelerado = {
  name: 'Implementação Acelerada',
  targetMaturity: 3,
  timeline: 6,
  phases: [
    { name: 'Diagnóstico + Planejamento', duration: 1, budget: 30000 },
    { name: 'Governança + Políticas', duration: 2, budget: 50000 },
    { name: 'Processos + Tecnologia', duration: 2, budget: 60000 },
    { name: 'Treinamento + Go-Live', duration: 1, budget: 25000 }
  ],
  totalBudget: 165000
};
```

### 5.3 Cenário Completo (18 meses)

```typescript
const cenarioCompleto = {
  name: 'Implementação Completa',
  targetMaturity: 5,
  timeline: 18,
  phases: [
    { name: 'Diagnóstico', duration: 2, budget: 20000 },
    { name: 'Planejamento', duration: 2, budget: 15000 },
    { name: 'Governança', duration: 2, budget: 30000 },
    { name: 'Políticas', duration: 2, budget: 20000 },
    { name: 'Processos', duration: 3, budget: 40000 },
    { name: 'Tecnologia', duration: 2, budget: 50000 },
    { name: 'Terceiros', duration: 2, budget: 25000 },
    { name: 'Treinamento', duration: 1, budget: 15000 },
    { name: 'Monitoramento', duration: 2, budget: 20000 }
  ],
  totalBudget: 235000
};
```

---

## 6. Cálculos do Simulador

### 6.1 Cálculo de Investimento

```typescript
function calculateInvestment(scenario: Scenario): InvestmentBreakdown {
  const breakdown = {
    consultoria: 0,
    tecnologia: 0,
    treinamento: 0,
    interno: 0
  };
  
  scenario.resources.forEach(resource => {
    switch (resource.type) {
      case 'externo':
        breakdown.consultoria += resource.costTotal;
        break;
      case 'tecnologia':
        breakdown.tecnologia += resource.costTotal;
        break;
      case 'treinamento':
        breakdown.treinamento += resource.costTotal;
        break;
      case 'interno':
        breakdown.interno += resource.costTotal;
        break;
    }
  });
  
  return {
    ...breakdown,
    total: Object.values(breakdown).reduce((a, b) => a + b, 0)
  };
}
```

### 6.2 Cálculo de ROI

```typescript
function calculateROI(scenario: Scenario): ROIAnalysis {
  const investment = calculateInvestment(scenario);
  
  // Benefícios estimados
  const benefits = {
    // Redução de multas (até 2% do faturamento)
    multaEvitada: scenario.annualRevenue * 0.02 * 0.3,
    // Redução de incidentes (custo médio por incidente)
    incidentesEvitados: 3 * 150000,
    // Eficiência operacional
    eficiencia: scenario.annualRevenue * 0.005,
    // Vantagem competitiva
    competitividade: scenario.annualRevenue * 0.01
  };
  
  const totalBenefits = Object.values(benefits).reduce((a, b) => a + b, 0);
  const roi = ((totalBenefits - investment.total) / investment.total) * 100;
  const paybackMonths = (investment.total / (totalBenefits / 12));
  
  return {
    investment,
    benefits,
    totalBenefits,
    roi,
    paybackMonths
  };
}
```

---

## 7. Roadmap Visual

### 7.1 Estrutura do Roadmap

```typescript
interface RoadmapItem {
  id: number;
  phaseId: number;
  name: string;
  startMonth: number;
  endMonth: number;
  progress: number;
  dependencies: number[];
  milestones: Milestone[];
}

interface Milestone {
  id: number;
  name: string;
  month: number;
  type: 'deliverable' | 'checkpoint' | 'decision';
}
```

### 7.2 Visualização Gantt

O roadmap é renderizado como um gráfico de Gantt interativo:

- Barras coloridas por fase
- Dependências visualizadas com setas
- Marcos destacados
- Progresso indicado por preenchimento
- Tooltip com detalhes

---

## 8. Endpoints tRPC

### 8.1 Cenários

```typescript
// Listar cenários
simulador.listScenarios
  Input: { organizationId: number }
  Output: Scenario[]

// Criar cenário
simulador.createScenario
  Input: {
    organizationId: number,
    name: string,
    targetMaturityLevel: number,
    timelineMonths: number,
    templateId?: string
  }
  Output: { id: number }

// Atualizar cenário
simulador.updateScenario
  Input: {
    scenarioId: number,
    name?: string,
    budgetTotal?: number,
    timelineMonths?: number
  }
  Output: { success: boolean }

// Duplicar cenário
simulador.duplicateScenario
  Input: { scenarioId: number, newName: string }
  Output: { id: number }
```

### 8.2 Fases

```typescript
// Listar fases
simulador.listPhases
  Input: { scenarioId: number }
  Output: Phase[]

// Adicionar fase
simulador.addPhase
  Input: {
    scenarioId: number,
    name: string,
    startMonth: number,
    durationMonths: number,
    budgetAllocated?: number
  }
  Output: { id: number }

// Reordenar fases
simulador.reorderPhases
  Input: { scenarioId: number, phaseOrder: number[] }
  Output: { success: boolean }
```

### 8.3 Cálculos

```typescript
// Calcular investimento
simulador.calculateInvestment
  Input: { scenarioId: number }
  Output: InvestmentBreakdown

// Calcular ROI
simulador.calculateROI
  Input: { scenarioId: number, annualRevenue: number }
  Output: ROIAnalysis

// Comparar cenários
simulador.compareScenarios
  Input: { scenarioIds: number[] }
  Output: ScenarioComparison
```

---

## 9. Integração com Governança

### 9.1 Converter Cenário em Plano

```typescript
// Converter cenário aprovado em plano de governança
simulador.convertToGovernancePlan
  Input: { scenarioId: number }
  Output: { planId: number }

// Fluxo:
// 1. Criar plano mensal baseado nas fases
// 2. Criar iniciativas CPPD para cada fase
// 3. Criar tarefas para cada entregável
// 4. Configurar notificações de prazo
```

### 9.2 Sincronismo de Progresso

```typescript
// Atualizar progresso do cenário baseado na governança
simulador.syncProgress
  Input: { scenarioId: number }
  Output: {
    phasesUpdated: number,
    overallProgress: number
  }
```

---

## 10. Exportação

### 10.1 Formatos Disponíveis

| Formato | Conteúdo |
|---------|----------|
| PDF | Relatório executivo completo |
| XLSX | Planilha com cronograma e orçamento |
| PPTX | Apresentação para stakeholders |
| JSON | Dados estruturados para integração |

### 10.2 Conteúdo do Relatório

1. Resumo executivo
2. Análise de maturidade atual
3. Cenário proposto
4. Cronograma de implementação
5. Investimento necessário
6. Análise de ROI
7. Riscos e mitigações
8. Próximos passos

---

## 11. Segurança e Permissões

### 11.1 Controle de Acesso

| Ação | admin_global | consultor | cliente |
|------|--------------|-----------|---------|
| Criar cenário | ✓ | ✓ | ✗ |
| Editar cenário | ✓ | ✓ | ✗ |
| Ver cenários | ✓ | ✓ | ✓ |
| Aprovar cenário | ✓ | ✗ | ✓ (sponsor) |
| Exportar | ✓ | ✓ | ✓ |

---

## 12. Boas Práticas

1. **Realismo**: Usar estimativas conservadoras
2. **Flexibilidade**: Criar múltiplos cenários
3. **Validação**: Revisar com stakeholders
4. **Iteração**: Ajustar conforme progresso
5. **Documentação**: Registrar premissas

---

## 13. Referências Técnicas

- LGPD Art. 50 - Boas Práticas e Governança
- ISO 27001:2022 - Planejamento de SGSI
- NIST Privacy Framework - Govern Function
- PMBOK - Gestão de Projetos

---

**Anterior**: [Anexo H - GED](./ANEXO_H_GED.md)  
**Próximo**: [Anexo J - Dashboard](./ANEXO_J_DASHBOARD.md)
