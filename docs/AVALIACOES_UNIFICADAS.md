# Sistema de Avaliações Unificadas

## Visão Geral

O Sistema de Avaliações Unificadas é uma plataforma completa para gerenciamento de avaliações de conformidade, maturidade e risco, integrando múltiplos frameworks normativos (LGPD, ISO 27001, NIST CSF) em uma interface unificada.

---

## Arquitetura

### Stack Tecnológico

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19 + TypeScript + Tailwind CSS 4 |
| Backend | Express 4 + tRPC 11 |
| Banco de Dados | MySQL/TiDB + Drizzle ORM |
| Autenticação | Manus OAuth |
| Armazenamento | S3 (evidências) |

### Estrutura de Diretórios

```
client/src/
├── components/
│   └── assessments/
│       ├── DeadlineAlertsWidget.tsx    # Widget de alertas de prazo
│       ├── EvidenceUploadModal.tsx     # Modal de upload de evidências
│       ├── FinalizationBlockedModal.tsx # Modal de bloqueio de finalização
│       ├── PendingEvidencesList.tsx    # Lista de evidências pendentes
│       └── ChartExporter.tsx           # Exportador de gráficos
├── hooks/
│   └── useAssessmentFinalization.ts    # Hook de finalização
└── pages/
    ├── UnifiedAssessments.tsx          # Dashboard principal
    ├── AssessmentDashboard.tsx         # Dashboard de avaliação
    ├── ConsultantPanel.tsx             # Painel do consultor
    ├── ProgressTracker.tsx             # Rastreador de progresso
    └── AssignmentDomains.tsx           # Atribuição de domínios

server/
├── services/
│   ├── deadlineNotificationService.ts  # Serviço de notificações
│   ├── assessmentEmailService.ts       # Serviço de email
│   ├── assessmentGedService.ts         # Serviço de GED
│   └── gedAccessControlService.ts      # Controle de acesso GED
├── assessmentsRouter.ts                # Router tRPC
└── db.ts                               # Helpers de banco
```

---

## Modelos de Dados

### Tabelas Principais

#### ua_assessments (Avaliações)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INT | ID único |
| code | VARCHAR | Código AC#YYYYMMDDHHMMXXX |
| framework | ENUM | Framework selecionado |
| status | ENUM | Status da avaliação |
| deadline | DATETIME | Prazo de conclusão |
| createdBy | INT | ID do criador |

#### ua_assignments (Atribuições)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INT | ID único |
| assessmentId | INT | FK para avaliação |
| domainId | INT | ID do domínio |
| assignedTo | INT | ID do respondente |
| status | ENUM | Status da atribuição |

#### ua_evidences (Evidências)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INT | ID único |
| assessmentId | INT | FK para avaliação |
| questionId | VARCHAR | ID da questão |
| type | ENUM | pdf ou link |
| fileKey | VARCHAR | Chave S3 |
| fileUrl | VARCHAR | URL do arquivo |

---

## Fluxos de Usuário

### Consultor Seusdados

```
1. Criar Avaliação (ID auto-gerado)
2. Selecionar Framework (padrão: Seusdados)
3. Atribuir Domínios a Respondentes
4. Definir Prazo (padrão: 15 dias)
5. Revisar Respostas + Evidências
6. Editar Análise de Risco
7. Liberar Resultado
8. Compartilhar com Sponsor/CPPD
```

### Usuário Cliente (Respondente)

```
1. Receber Notificação
2. Responder Questionário
3. Anexar Evidências (PDF 10MB ou link)
4. Receber Alertas (10d, 5d, 2d, 1d, hoje)
5. Visualizar Resultado (após liberação)
```

### Usuário Sponsor

```
1. Ver Resultado + Plano de Ação
2. Ver Gráfico Radar (maturidade)
3. Ver Análise de Risco (multi-norma)
4. Exportar Relatório
```

---

## Frameworks Suportados

| Framework | Descrição | Domínios |
|-----------|-----------|----------|
| seusdados | Framework proprietário Seusdados | 9 domínios (IA-01 a IA-09) |
| conformidade_lgpd | Conformidade LGPD | 10 domínios |
| misto | Combinação de frameworks | Variável |
| sgd | Sistema de Gestão de Dados | 8 domínios |
| ico | Information Commissioner's Office | 6 domínios |
| cnil | Commission Nationale de l'Informatique | 7 domínios |

---

## Sistema de Notificações

### Níveis de Urgência

| Dias Restantes | Nível | Cor | Ícone |
|----------------|-------|-----|-------|
| ≤ 1 | Crítico | 🔴 Vermelho | ⚠️ |
| 2 | Alto | 🟠 Laranja | ⏰ |
| 3-5 | Médio | 🟡 Amarelo | 📋 |
| > 5 | Baixo | 🟢 Verde | ℹ️ |

### Marcos de Notificação

- **10 dias**: "Você tem 10 dias para responder"
- **5 dias**: "Faltam 5 dias - Urgente!"
- **2 dias**: "Alerta Crítico - 2 dias"
- **1 dia**: "Alerta Crítico - 1 dia"
- **Hoje**: "Vence hoje!"

---

## Análise de Risco Multi-Norma

### Matriz de Risco (5 Colunas)

| Domínio | LGPD Art | ISO 27001 | NIST CSF | Severidade |
|---------|----------|-----------|----------|------------|
| IA-01 | 5,6,7 | A.8.1 | ID.AM-1 | 🔴 Crítica |
| IA-02 | 5,8 | A.9.1 | ID.GV-1 | 🟠 Alta |
| IA-03 | 6 | A.10.1 | PR.AC-1 | 🟡 Média |

### Cálculo de Severidade

```
Severidade = Probabilidade × Impacto

≥ 20: Crítica
≥ 12: Alta
≥ 6: Média
< 6: Baixa
```

---

## Controle de Acesso GED

### Regras de Acesso

| Papel | Evidências | Respostas | Análises | Resultados |
|-------|------------|-----------|----------|------------|
| Admin | ✅ Total | ✅ Total | ✅ Total | ✅ Total |
| Consultor | ✅ Leitura | ✅ Leitura | ✅ Edição | ✅ Edição |
| Sponsor | ❌ | ❌ | ❌ | ✅ Liberados |
| Respondente | ✅ Próprias | ✅ Próprias | ❌ | ✅ Liberados |

### Política de Retenção

- **Período**: 7 anos (conforme LGPD)
- **Compressão**: Automática após 1 ano
- **Exclusão**: Apenas Admin pode excluir

---

## API Endpoints (tRPC)

### Avaliações

| Procedure | Tipo | Descrição |
|-----------|------|-----------|
| assessments.list | Query | Listar avaliações |
| assessments.get | Query | Obter avaliação por ID |
| assessments.create | Mutation | Criar avaliação |
| assessments.update | Mutation | Atualizar avaliação |
| assessments.delete | Mutation | Excluir avaliação |

### Atribuições

| Procedure | Tipo | Descrição |
|-----------|------|-----------|
| assignments.list | Query | Listar atribuições |
| assignments.create | Mutation | Criar atribuição |
| assignments.update | Mutation | Atualizar atribuição |

### Evidências

| Procedure | Tipo | Descrição |
|-----------|------|-----------|
| evidences.list | Query | Listar evidências |
| evidences.upload | Mutation | Upload de evidência |
| evidences.delete | Mutation | Excluir evidência |

### Resultados

| Procedure | Tipo | Descrição |
|-----------|------|-----------|
| results.get | Query | Obter resultado |
| results.release | Mutation | Liberar resultado |

---

## Testes

### Testes Unitários

- **756 testes** passando
- Cobertura de validações, cálculos e lógica de negócio

### Testes de Integração

- **21 testes** para notificações, evidências e progresso

### Testes E2E

- **34 testes** para fluxo completo de avaliação

---

## Experiência Cinematográfica

### Princípios de Design

1. **Clean & Minimal**: Sem poluição visual
2. **Animações Suaves**: Transições de 300ms
3. **Feedback Imediato**: Confirmações visuais
4. **Tipografia Hierárquica**: Títulos 32px, corpo 16px
5. **Cores Estratégicas**: Verde (sucesso), Vermelho (risco), Azul (info)
6. **Espaçamento Generoso**: Respira bem
7. **Ícones Intuitivos**: Universalmente reconhecíveis
8. **Responsivo**: Mobile-first

---

## Changelog

### v1.0.0 (2026-01-23)

- ✅ Sistema completo de avaliações unificadas
- ✅ Suporte a 6 frameworks
- ✅ Análise de risco multi-norma
- ✅ Sistema de notificações com escalação
- ✅ Upload de evidências com drag-drop
- ✅ Controle de acesso ao GED
- ✅ 811 testes passando

---

## Suporte

Para dúvidas ou suporte técnico, entre em contato:

- **Email**: suporte@seusdados.com.br
- **Documentação**: https://docs.seusdados.com.br

---

© 2026 Seusdados Consultoria. Todos os direitos reservados.
