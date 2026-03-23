# Anexo A - Módulo de Conformidade PPPD

**Seusdados Due Diligence - Documentação Técnica**

---

## 1. Visão Geral

O módulo de **Conformidade PPPD** (Programa de Privacidade e Proteção de Dados) permite avaliar o nível de maturidade de uma organização em relação à Lei Geral de Proteção de Dados (LGPD). A avaliação é estruturada em domínios que cobrem todos os aspectos relevantes da conformidade.

### Funcionalidades Principais

- Criação e gestão de avaliações de conformidade
- Questionários estruturados por domínio
- Cálculo automático de níveis de maturidade
- Matriz de risco visual
- Geração de relatórios PDF profissionais
- Histórico comparativo de avaliações
- Integração com planos de ação

---

## 2. Arquitetura do Módulo

### 2.1 Componentes Frontend

| Arquivo | Descrição |
|---------|-----------|
| `Conformidade.tsx` | Listagem de avaliações |
| `ConformidadeNova.tsx` | Criação de nova avaliação |
| `ConformidadeAvaliacao.tsx` | Formulário de avaliação |
| `ConformidadeResultado.tsx` | Visualização de resultados |

### 2.2 Componentes Backend

| Arquivo | Descrição |
|---------|-----------|
| `routers.ts` | Procedures tRPC para conformidade |
| `db.ts` | Funções de banco de dados |
| `pdfService.ts` | Geração de relatórios |
| `premiumReportService.ts` | Relatórios premium |

---

## 3. Modelo de Dados

### 3.1 Tabela `compliance_assessments`

```sql
CREATE TABLE compliance_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('draft', 'in_progress', 'completed', 'archived') DEFAULT 'draft',
  maturity_level ENUM('inicial', 'basico', 'definido', 'gerenciado', 'otimizado'),
  overall_score DECIMAL(5,2),
  created_by_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (created_by_id) REFERENCES users(id)
);
```

### 3.2 Tabela `compliance_responses`

```sql
CREATE TABLE compliance_responses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT NOT NULL,
  domain VARCHAR(100) NOT NULL,
  question_id VARCHAR(50) NOT NULL,
  response_value INT,
  notes TEXT,
  evidence_ids JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assessment_id) REFERENCES compliance_assessments(id)
);
```

---

## 4. Domínios de Avaliação

A avaliação de conformidade é estruturada em **10 domínios**:

| Domínio | Código | Peso |
|---------|--------|------|
| Governança e Responsabilização | GOV | 15% |
| Bases Legais | BL | 12% |
| Direitos dos Titulares | DT | 12% |
| Segurança da Informação | SI | 15% |
| Gestão de Incidentes | GI | 10% |
| Transferência Internacional | TI | 8% |
| Gestão de Terceiros | GT | 10% |
| Privacy by Design | PBD | 8% |
| Treinamento e Conscientização | TC | 5% |
| Documentação e Registros | DR | 5% |

### 4.1 Escala de Respostas

Cada questão utiliza uma escala de 0 a 4:

| Valor | Descrição |
|-------|-----------|
| 0 | Não implementado |
| 1 | Parcialmente implementado |
| 2 | Implementado informalmente |
| 3 | Implementado e documentado |
| 4 | Implementado, documentado e monitorado |

---

## 5. Níveis de Maturidade

O sistema calcula automaticamente o nível de maturidade com base nas respostas:

| Nível | Score | Descrição |
|-------|-------|-----------|
| Inicial | 0-20% | Processos inexistentes ou ad-hoc |
| Básico | 21-40% | Processos iniciais definidos |
| Definido | 41-60% | Processos documentados |
| Gerenciado | 61-80% | Processos monitorados |
| Otimizado | 81-100% | Melhoria contínua |

### 5.1 Cálculo do Score

```typescript
function calculateOverallScore(responses: Response[]): number {
  const domainScores = {};
  const domainWeights = {
    GOV: 0.15, BL: 0.12, DT: 0.12, SI: 0.15,
    GI: 0.10, TI: 0.08, GT: 0.10, PBD: 0.08,
    TC: 0.05, DR: 0.05
  };

  // Calcular score por domínio
  for (const response of responses) {
    if (!domainScores[response.domain]) {
      domainScores[response.domain] = { sum: 0, count: 0 };
    }
    domainScores[response.domain].sum += response.value;
    domainScores[response.domain].count++;
  }

  // Calcular score ponderado
  let weightedScore = 0;
  for (const [domain, data] of Object.entries(domainScores)) {
    const domainScore = (data.sum / (data.count * 4)) * 100;
    weightedScore += domainScore * domainWeights[domain];
  }

  return weightedScore;
}
```

---

## 6. Endpoints tRPC

### 6.1 Listagem de Avaliações

```typescript
compliance.list
  Input: { organizationId: number }
  Output: ComplianceAssessment[]
```

### 6.2 Criar Avaliação

```typescript
compliance.create
  Input: {
    organizationId: number,
    title: string,
    description?: string
  }
  Output: { id: number }
```

### 6.3 Salvar Respostas

```typescript
compliance.saveResponses
  Input: {
    assessmentId: number,
    responses: Array<{
      domain: string,
      questionId: string,
      value: number,
      notes?: string
    }>
  }
  Output: { success: boolean }
```

### 6.4 Finalizar Avaliação

```typescript
compliance.complete
  Input: { assessmentId: number }
  Output: {
    success: boolean,
    overallScore: number,
    maturityLevel: string
  }
```

### 6.5 Gerar Relatório

```typescript
compliance.generateReport
  Input: { assessmentId: number }
  Output: { url: string }
```

---

## 7. Interface do Usuário

### 7.1 Tela de Listagem

A tela de listagem exibe todas as avaliações da organização com:

- Status (rascunho, em andamento, concluída)
- Data de criação
- Nível de maturidade (se concluída)
- Ações (continuar, visualizar, excluir)

### 7.2 Formulário de Avaliação

O formulário apresenta:

- Sidebar com navegação por domínios
- Questões numeradas com escala de resposta
- Campo de observações por questão
- Botão para anexar evidências
- Progress bar de conclusão
- Botões de navegação (anterior/próximo)

### 7.3 Visualização de Resultados

A página de resultados inclui:

- Score geral e nível de maturidade
- Gráfico radar por domínio
- Matriz de risco visual
- Lista de gaps identificados
- Recomendações priorizadas
- Botão para gerar plano de ação
- Exportação em PDF

---

## 8. Relatórios

### 8.1 Relatório Padrão

Conteúdo do relatório PDF:

1. Capa com logo e informações da organização
2. Sumário executivo
3. Metodologia de avaliação
4. Resultados por domínio
5. Matriz de risco
6. Gaps identificados
7. Recomendações
8. Plano de ação sugerido

### 8.2 Relatório Premium

O relatório premium adiciona:

- Gráficos interativos
- Benchmarking setorial
- Análise de tendências
- Roadmap de implementação
- Anexos com evidências

---

## 9. Integração com Outros Módulos

### 9.1 Planos de Ação

Gaps identificados podem ser convertidos em ações:

```typescript
// Gerar plano de ação a partir de gaps
actionPlans.generateFromCompliance({
  assessmentId: number,
  gaps: Gap[]
})
```

### 9.2 GED

Evidências são armazenadas no GED:

```typescript
// Vincular documento como evidência
compliance.attachEvidence({
  assessmentId: number,
  questionId: string,
  documentId: number
})
```

### 9.3 Chat IA

Análise assistida por IA:

```typescript
// Gerar recomendações com IA
ai.generateComplianceRecommendations({
  assessmentId: number,
  organizationContext: string
})
```

---

## 10. Segurança e Permissões

### 10.1 Controle de Acesso

| Ação | admin_global | consultor | cliente |
|------|--------------|-----------|---------|
| Listar avaliações | ✓ Todas | ✓ Todas | ✓ Própria org |
| Criar avaliação | ✓ | ✓ | ✓ |
| Editar avaliação | ✓ | ✓ | ✓ Própria |
| Excluir avaliação | ✓ | ✓ | ✗ |
| Gerar relatório | ✓ | ✓ | ✓ |

### 10.2 Auditoria

Todas as ações são registradas:

- Criação de avaliação
- Alteração de respostas
- Finalização
- Geração de relatórios

---

## 11. Boas Práticas

1. **Planejamento**: Definir escopo e participantes antes de iniciar
2. **Evidências**: Anexar documentos comprobatórios às respostas
3. **Revisão**: Validar respostas com responsáveis de cada área
4. **Periodicidade**: Realizar avaliações semestrais ou anuais
5. **Acompanhamento**: Monitorar evolução através do histórico

---

## 12. Referências Técnicas

- LGPD (Lei 13.709/2018)
- ANPD - Guia Orientativo para Agentes de Tratamento
- ISO 27701:2019 - Gestão de Privacidade
- NIST Privacy Framework

---

**Próximo**: [Anexo B - Módulo Due Diligence](./ANEXO_B_DUE_DILIGENCE.md)
