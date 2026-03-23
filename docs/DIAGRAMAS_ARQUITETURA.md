# Diagramas de Arquitetura

**Seusdados Due Diligence - Visualização da Arquitetura do Sistema**

---

## 1. Arquitetura Geral do Sistema

```mermaid
flowchart TB
    subgraph Cliente["🖥️ Frontend (React 19)"]
        UI[Interface do Usuário]
        TRPC_CLIENT[tRPC Client]
        ROUTER[Wouter Router]
    end

    subgraph Servidor["⚙️ Backend (Express + tRPC)"]
        TRPC_SERVER[tRPC Server]
        AUTH[Auth Middleware]
        SERVICES[Business Services]
    end

    subgraph Dados["💾 Camada de Dados"]
        DRIZZLE[Drizzle ORM]
        MYSQL[(MySQL/TiDB)]
        S3[(AWS S3)]
    end

    subgraph Externos["🌐 Serviços Externos"]
        OAUTH[Manus OAuth]
        LLM[Manus Forge API]
        EMAIL[Email Service]
    end

    UI --> TRPC_CLIENT
    TRPC_CLIENT --> TRPC_SERVER
    TRPC_SERVER --> AUTH
    AUTH --> SERVICES
    SERVICES --> DRIZZLE
    DRIZZLE --> MYSQL
    SERVICES --> S3
    AUTH --> OAUTH
    SERVICES --> LLM
    SERVICES --> EMAIL
```

---

## 2. Fluxo de Autenticação OAuth

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend
    participant B as Backend
    participant O as Manus OAuth

    U->>F: Clica em "Login"
    F->>O: Redirect para OAuth Portal
    O->>U: Exibe tela de login
    U->>O: Insere credenciais
    O->>F: Callback com código
    F->>B: POST /api/oauth/callback
    B->>O: Troca código por token
    O->>B: Retorna access_token
    B->>B: Cria/atualiza usuário
    B->>B: Gera JWT de sessão
    B->>F: Set-Cookie (JWT)
    F->>U: Redirect para Dashboard
```

---

## 3. Estrutura de Módulos

```mermaid
mindmap
    root((Seusdados Due Diligence))
        Conformidade
            Avaliação PPPD
            Gap Analysis
            Plano de Ação
        Terceiros
            Cadastro
            Due Diligence
            Matriz de Risco
        Contratos
            Análise IA
            Cláusulas LGPD
            Checklist
        Mapeamentos
            ROPA
            ROT/POP
            Entrevista Digital
        Governança
            CPPD
            Reuniões
            Plano Contínuo
        MeuDPO
            Tickets
            SLA
            Notificações
        Central de Direitos
            Portal Público
            Atendimento
            Relatórios
        GED
            Documentos
            Versionamento
            Pastas
```

---

## 4. Fluxo de Avaliação de Conformidade

```mermaid
flowchart TD
    A[Criar Avaliação] --> B[Selecionar Organização]
    B --> C[Responder Questionário]
    C --> D{Todas as perguntas<br/>respondidas?}
    D -->|Não| C
    D -->|Sim| E[Calcular Maturidade]
    E --> F[Identificar Gaps]
    F --> G[Gerar Plano de Ação]
    G --> H[Gerar Relatório PDF]
    H --> I[Notificar Stakeholders]
    
    style A fill:#6366f1,color:#fff
    style E fill:#22c55e,color:#fff
    style H fill:#f97316,color:#fff
```

---

## 5. Fluxo de Due Diligence de Terceiros

```mermaid
flowchart TD
    A[Cadastrar Terceiro] --> B[Criar Avaliação]
    B --> C[Gerar Link Público]
    C --> D[Enviar para Terceiro]
    D --> E[Terceiro Responde]
    E --> F[Calcular Score]
    F --> G{Score >= Threshold?}
    G -->|Sim| H[Aprovar Terceiro]
    G -->|Não| I[Classificar Risco]
    I --> J[Gerar Plano de Mitigação]
    J --> K[Acompanhar Ações]
    H --> L[Monitoramento Contínuo]
    K --> L
    
    style A fill:#6366f1,color:#fff
    style F fill:#eab308,color:#000
    style H fill:#22c55e,color:#fff
    style I fill:#ef4444,color:#fff
```

---

## 6. Fluxo de Análise de Contratos

```mermaid
flowchart TD
    A[Upload do Contrato] --> B[Extração de Texto]
    B --> C[Análise via LLM]
    C --> D[Preencher Mapa de Análise]
    D --> E[Executar Checklist]
    E --> F[Identificar Riscos]
    F --> G[Gerar Cláusulas LGPD]
    G --> H[Criar Plano de Ação]
    H --> I{Aprovar Análise?}
    I -->|Sim| J[Gerar Mapeamento]
    I -->|Não| K[Refinar com IA]
    K --> C
    J --> L[Cadastrar Terceiro]
    
    style A fill:#6366f1,color:#fff
    style C fill:#8b5cf6,color:#fff
    style G fill:#22c55e,color:#fff
```

---

## 7. Fluxo de Mapeamentos (ROPA)

```mermaid
flowchart TD
    subgraph Fase0["Fase 0: Estrutura"]
        A[Definir Contexto] --> B[Selecionar Segmento]
        B --> C[Cadastrar DPO]
    end
    
    subgraph Fase1["Fase 1: Delegação"]
        D[Criar Áreas] --> E[Cadastrar Responsáveis]
        E --> F[Gerar Tokens]
        F --> G[Enviar Convites]
    end
    
    subgraph Fase2["Fase 2: Entrevista"]
        H[Responsável Acessa Link] --> I[Responde Entrevista]
        I --> J[Salva Processos]
    end
    
    subgraph Fase3["Fase 3: Documentação"]
        K[Gerar ROT] --> L[Gerar POP]
        L --> M[Exportar ROPA]
    end
    
    C --> D
    G --> H
    J --> K
    
    style A fill:#6366f1,color:#fff
    style H fill:#22c55e,color:#fff
    style M fill:#f97316,color:#fff
```

---

## 8. Fluxo de Governança PPPD

```mermaid
flowchart TD
    A[Configurar CPPD] --> B[Adicionar Membros]
    B --> C[Definir Papéis]
    C --> D[Agendar Reuniões]
    D --> E[Realizar Reunião]
    E --> F[Registrar Deliberações]
    F --> G[Gerar Ata via IA]
    G --> H[Criar Iniciativas]
    H --> I[Atribuir Tarefas]
    I --> J[Monitorar Progresso]
    J --> K{Iniciativa Concluída?}
    K -->|Não| J
    K -->|Sim| L[Registrar Evidências]
    L --> M[Atualizar Dashboard]
    
    style A fill:#6366f1,color:#fff
    style G fill:#8b5cf6,color:#fff
    style M fill:#22c55e,color:#fff
```

---

## 9. Fluxo de Tickets (MeuDPO)

```mermaid
stateDiagram-v2
    [*] --> Aberto: Criar Ticket
    Aberto --> EmAtendimento: Atribuir
    EmAtendimento --> AguardandoCliente: Solicitar Info
    AguardandoCliente --> EmAtendimento: Cliente Responde
    EmAtendimento --> Resolvido: Solucionar
    Resolvido --> Fechado: Confirmar
    Resolvido --> EmAtendimento: Reabrir
    Fechado --> [*]
    
    note right of Aberto: SLA Inicia
    note right of Resolvido: SLA Para
```

---

## 10. Fluxo de Central de Direitos

```mermaid
flowchart TD
    subgraph Portal["Portal Público"]
        A[Titular Acessa Portal] --> B[Preenche Formulário]
        B --> C[Seleciona Tipo de Direito]
        C --> D[Envia Solicitação]
        D --> E[Recebe Protocolo]
    end
    
    subgraph Interno["Painel DPO"]
        F[DPO Recebe Notificação] --> G[Analisa Solicitação]
        G --> H{Tipo de Direito}
        H -->|Acesso| I[Consolidar Dados]
        H -->|Exclusão| J[Verificar Viabilidade]
        H -->|Outros| K[Processar Solicitação]
        I --> L[Gerar Relatório]
        J --> L
        K --> L
        L --> M[Responder Titular]
    end
    
    E --> F
    M --> N[Titular Consulta Status]
    
    style A fill:#6366f1,color:#fff
    style L fill:#22c55e,color:#fff
```

---

## 11. Integração entre Módulos

```mermaid
flowchart LR
    subgraph Entrada["Entrada de Dados"]
        CONTRATO[Análise de Contrato]
        AVALIACAO[Avaliação Conformidade]
        DUEDILIGENCE[Due Diligence]
    end
    
    subgraph Processamento["Processamento"]
        TERCEIROS[(Terceiros)]
        MAPEAMENTOS[(Mapeamentos)]
        PLANOS[(Planos de Ação)]
    end
    
    subgraph Saida["Saída"]
        GED[GED]
        RELATORIOS[Relatórios]
        DASHBOARD[Dashboard]
    end
    
    CONTRATO --> TERCEIROS
    CONTRATO --> MAPEAMENTOS
    CONTRATO --> PLANOS
    AVALIACAO --> PLANOS
    DUEDILIGENCE --> TERCEIROS
    DUEDILIGENCE --> PLANOS
    
    TERCEIROS --> GED
    MAPEAMENTOS --> GED
    PLANOS --> GED
    
    TERCEIROS --> RELATORIOS
    MAPEAMENTOS --> RELATORIOS
    PLANOS --> RELATORIOS
    
    TERCEIROS --> DASHBOARD
    MAPEAMENTOS --> DASHBOARD
    PLANOS --> DASHBOARD
```

---

## 12. Modelo de Dados (ER Simplificado)

```mermaid
erDiagram
    USERS ||--o{ ORGANIZATION_USERS : "pertence a"
    ORGANIZATIONS ||--o{ ORGANIZATION_USERS : "tem"
    ORGANIZATIONS ||--o{ COMPLIANCE_ASSESSMENTS : "tem"
    ORGANIZATIONS ||--o{ THIRD_PARTIES : "tem"
    ORGANIZATIONS ||--o{ TICKETS : "tem"
    ORGANIZATIONS ||--o{ MAPEAMENTO_CONTEXTO : "tem"
    
    THIRD_PARTIES ||--o{ DUE_DILIGENCE_ASSESSMENTS : "avaliado por"
    COMPLIANCE_ASSESSMENTS ||--o{ COMPLIANCE_RESPONSES : "tem"
    DUE_DILIGENCE_ASSESSMENTS ||--o{ DUE_DILIGENCE_RESPONSES : "tem"
    
    TICKETS ||--o{ TICKET_COMMENTS : "tem"
    TICKETS ||--o{ TICKET_ATTACHMENTS : "tem"
    
    MAPEAMENTO_CONTEXTO ||--o{ MAPEAMENTO_AREAS : "tem"
    MAPEAMENTO_AREAS ||--o{ MAPEAMENTO_PROCESSOS : "tem"
    
    CONTRACT_ANALYSES ||--o{ CONTRACT_ANALYSIS_RISKS : "identifica"
    CONTRACT_ANALYSES ||--o{ CONTRACT_ANALYSIS_CHECKLIST : "tem"
    
    GED_FOLDERS ||--o{ GED_DOCUMENTS : "contém"
    
    USERS {
        int id PK
        string open_id
        string email
        string name
        string role
    }
    
    ORGANIZATIONS {
        int id PK
        string name
        string cnpj
        string segment
    }
    
    THIRD_PARTIES {
        int id PK
        int organization_id FK
        string name
        string cnpj
        string risk_level
    }
    
    TICKETS {
        int id PK
        int organization_id FK
        string title
        string status
        string priority
    }
```

---

## 13. Arquitetura de Componentes Frontend

```mermaid
flowchart TB
    subgraph App["App.tsx"]
        ROUTER[Router]
        PROVIDERS[Providers]
    end
    
    subgraph Layouts["Layouts"]
        DASHBOARD_LAYOUT[DashboardLayout]
        PUBLIC_LAYOUT[PublicLayout]
    end
    
    subgraph Pages["Pages"]
        HOME[Home]
        CONFORMIDADE[Conformidade]
        TERCEIROS[Terceiros]
        CONTRATOS[Contratos]
        MAPEAMENTOS[Mapeamentos]
        GOVERNANCA[Governança]
        MEUDPO[MeuDPO]
        GED[GED]
    end
    
    subgraph Components["Componentes Compartilhados"]
        UI[UI Components]
        CHARTS[Charts]
        FORMS[Forms]
    end
    
    ROUTER --> PROVIDERS
    PROVIDERS --> DASHBOARD_LAYOUT
    PROVIDERS --> PUBLIC_LAYOUT
    DASHBOARD_LAYOUT --> Pages
    PUBLIC_LAYOUT --> Pages
    Pages --> Components
```

---

## 14. Pipeline de Geração de Relatórios

```mermaid
flowchart LR
    A[Solicitar Relatório] --> B[Coletar Dados]
    B --> C[Processar com IA]
    C --> D[Renderizar Template]
    D --> E[Gerar Gráficos]
    E --> F[Converter para PDF]
    F --> G[Upload para S3]
    G --> H[Notificar Usuário]
    
    style A fill:#6366f1,color:#fff
    style C fill:#8b5cf6,color:#fff
    style F fill:#f97316,color:#fff
    style H fill:#22c55e,color:#fff
```

---

## 15. Matriz de Risco 5x5

```mermaid
quadrantChart
    title Matriz de Risco de Terceiros
    x-axis Baixa Probabilidade --> Alta Probabilidade
    y-axis Baixo Impacto --> Alto Impacto
    quadrant-1 Crítico
    quadrant-2 Alto
    quadrant-3 Baixo
    quadrant-4 Médio
    Fornecedor A: [0.8, 0.9]
    Fornecedor B: [0.3, 0.7]
    Fornecedor C: [0.6, 0.4]
    Fornecedor D: [0.2, 0.2]
    Fornecedor E: [0.7, 0.6]
```

---

## 16. Ciclo de Vida de Avaliação

```mermaid
flowchart TD
    A((Início)) --> B[Criar Avaliação]
    B --> C[Em Andamento]
    C --> D{Concluída?}
    D -->|Não| C
    D -->|Sim| E[Revisão]
    E --> F{Aprovada?}
    F -->|Não| G[Ajustes]
    G --> E
    F -->|Sim| H[Finalizada]
    H --> I[Arquivada]
    I --> J((Fim))
    
    C -->|Cancelar| K[Cancelada]
    K --> J
```

---

## Como Renderizar os Diagramas

Os diagramas acima estão em formato **Mermaid** e podem ser renderizados de várias formas:

1. **GitHub**: Suporta Mermaid nativamente em arquivos Markdown
2. **VS Code**: Extensão "Markdown Preview Mermaid Support"
3. **Online**: [Mermaid Live Editor](https://mermaid.live)
4. **CLI**: `manus-render-diagram` (disponível no sandbox)

Para gerar imagens PNG dos diagramas:

```bash
manus-render-diagram DIAGRAMAS_ARQUITETURA.md output/
```

---

**Voltar para**: [Índice da Documentação](./INDICE_DOCUMENTACAO.md)
