# Anexo G - Central de Direitos do Titular

**Seusdados Due Diligence - Documentação Técnica**

---

## 1. Visão Geral

O módulo **Central de Direitos do Titular** implementa os requisitos do Art. 18 da LGPD, oferecendo um portal público para que titulares de dados exerçam seus direitos e um painel interno para gestão das solicitações pelo DPO.

### Funcionalidades Principais

- Portal público de solicitações (sem autenticação)
- 7 tipos de direitos LGPD
- Geração de protocolo único
- Consulta de status por protocolo
- Painel de gestão para DPO
- Consolidação de fluxos de dados
- Geração de relatório de dados do titular
- Controle de prazo legal (15 dias)
- Histórico de atendimento

---

## 2. Arquitetura do Módulo

### 2.1 Componentes Frontend

| Arquivo | Descrição |
|---------|-----------|
| `DireitosTitular.tsx` | Portal público |
| `CentralDireitos.tsx` | Painel interno DPO |

### 2.2 Componentes Backend

| Arquivo | Descrição |
|---------|-----------|
| `fase3Router.ts` | Procedures tRPC |
| `fase3Service.ts` | Lógica de negócio |

---

## 3. Modelo de Dados

### 3.1 Tabela `data_subject_requests`

```sql
CREATE TABLE data_subject_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  protocol VARCHAR(20) NOT NULL UNIQUE,
  titular_name VARCHAR(255) NOT NULL,
  titular_email VARCHAR(255) NOT NULL,
  titular_document VARCHAR(20),
  titular_phone VARCHAR(20),
  request_type ENUM('acesso', 'retificacao', 'exclusao', 'portabilidade', 'revogacao', 'oposicao', 'informacao') NOT NULL,
  description TEXT,
  status ENUM('recebida', 'em_analise', 'respondida', 'arquivada') DEFAULT 'recebida',
  response TEXT,
  responded_at TIMESTAMP,
  responded_by_id INT,
  lgpd_deadline TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (responded_by_id) REFERENCES users(id)
);
```

### 3.2 Tabela `data_subject_request_history`

```sql
CREATE TABLE data_subject_request_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  description TEXT,
  performed_by_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES data_subject_requests(id),
  FOREIGN KEY (performed_by_id) REFERENCES users(id)
);
```

---

## 4. Tipos de Direitos (Art. 18 LGPD)

| Tipo | Código | Artigo | Descrição |
|------|--------|--------|-----------|
| Acesso | `acesso` | Art. 18, II | Acesso aos dados pessoais |
| Retificação | `retificacao` | Art. 18, III | Correção de dados |
| Exclusão | `exclusao` | Art. 18, VI | Eliminação de dados |
| Portabilidade | `portabilidade` | Art. 18, V | Transferência de dados |
| Revogação | `revogacao` | Art. 18, IX | Revogação de consentimento |
| Oposição | `oposicao` | Art. 18, §2º | Oposição ao tratamento |
| Informação | `informacao` | Art. 18, I | Informações sobre tratamento |

---

## 5. Portal Público

### 5.1 Acesso

- URL: `/direitos-titular`
- Sem autenticação (conforme Art. 18, §3º LGPD)
- Acessível por qualquer pessoa

### 5.2 Formulário de Solicitação

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| Nome | Sim | Nome completo do titular |
| E-mail | Sim | E-mail para contato |
| CPF | Não | Documento de identificação |
| Telefone | Não | Telefone para contato |
| Organização | Sim | Empresa destinatária |
| Tipo de Direito | Sim | Seleção do direito |
| Descrição | Não | Detalhes da solicitação |

### 5.3 Consulta de Status

- Busca por protocolo
- Exibe status atual
- Mostra prazo LGPD
- Exibe resposta (se houver)

---

## 6. Painel Interno (DPO)

### 6.1 Dashboard

- Total de solicitações
- Em análise
- Respondidas
- Atrasadas
- Gráfico por tipo
- Lista de pendências

### 6.2 Detalhes da Solicitação

- Informações do titular
- Tipo e descrição
- Status (editável)
- Prazo LGPD
- Campo de resposta
- Histórico de ações
- Botão gerar relatório

---

## 7. Fluxo de Atendimento

```
┌─────────────────┐
│ Titular envia   │
│ solicitação     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Sistema gera    │
│ protocolo       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ DPO recebe      │
│ notificação     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ DPO analisa     │
│ solicitação     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────────────────┐
│Gerar  │ │ Responder         │
│Relat. │ │ diretamente       │
└───┬───┘ └─────────┬─────────┘
    │               │
    └───────┬───────┘
            │
            ▼
┌─────────────────┐
│ Titular recebe  │
│ resposta        │
└─────────────────┘
```

---

## 8. Prazo Legal

### 8.1 Cálculo do Prazo

```typescript
function calculateLgpdDeadline(createdAt: Date): Date {
  // Art. 18, §5º - 15 dias corridos
  return addDays(createdAt, 15);
}
```

### 8.2 Indicadores de Prazo

| Estado | Cor | Condição |
|--------|-----|----------|
| No prazo | Verde | > 5 dias restantes |
| Alerta | Amarelo | 1-5 dias restantes |
| Urgente | Laranja | < 24 horas |
| Atrasado | Vermelho | Prazo vencido |

---

## 9. Geração de Relatório

### 9.1 Relatório de Dados do Titular

Para solicitações de **acesso**, o sistema gera relatório com:

- Identificação do titular
- Dados pessoais tratados
- Finalidades do tratamento
- Bases legais aplicadas
- Compartilhamento com terceiros
- Período de retenção
- Medidas de segurança

### 9.2 Consolidação de Fluxos

```typescript
async function consolidateDataFlows(
  organizationId: number,
  titularEmail: string
): Promise<DataFlowMap> {
  // Buscar em mapeamentos
  const mapeamentos = await getMapeamentosByTitular(organizationId, titularEmail);
  
  // Buscar em contratos
  const contratos = await getContratosByTitular(organizationId, titularEmail);
  
  // Buscar em terceiros
  const terceiros = await getTerceirosCompartilhamento(organizationId);
  
  return {
    mapeamentos,
    contratos,
    terceiros,
    consolidatedData: mergeDataFlows(mapeamentos, contratos, terceiros)
  };
}
```

---

## 10. Endpoints tRPC

### 10.1 Públicos

```typescript
// Criar solicitação (público)
fase3.createPublicRequest
  Input: {
    organizationId: number,
    titularName: string,
    titularEmail: string,
    titularDocument?: string,
    requestType: string,
    description?: string
  }
  Output: { protocol: string }

// Consultar status (público)
fase3.getPublicStatus
  Input: { protocol: string }
  Output: RequestStatus

// Listar organizações (público)
fase3.listOrganizations
  Output: Organization[]
```

### 10.2 Protegidos

```typescript
// Listar solicitações
fase3.listRequests
  Input: {
    organizationId: number,
    status?: string,
    type?: string
  }
  Output: Request[]

// Atualizar status
fase3.updateRequestStatus
  Input: {
    requestId: number,
    status: string
  }
  Output: { success: boolean }

// Responder solicitação
fase3.respondRequest
  Input: {
    requestId: number,
    response: string
  }
  Output: { success: boolean }

// Gerar relatório
fase3.generateTitularReport
  Input: {
    requestId: number,
    titularEmail: string
  }
  Output: { reportHtml: string }
```

---

## 11. Segurança e Permissões

### 11.1 Acesso Público

- Formulário de solicitação: público
- Consulta de status: público (com protocolo)
- Não expõe dados de outros titulares

### 11.2 Acesso Interno

| Ação | admin_global | consultor | cliente (DPO) |
|------|--------------|-----------|---------------|
| Ver solicitações | ✓ Todas | ✓ Todas | ✓ Própria org |
| Responder | ✓ | ✓ | ✓ |
| Gerar relatório | ✓ | ✓ | ✓ |
| Configurar | ✓ | ✓ | ✗ |

---

## 12. Referências Técnicas

- LGPD Art. 18 - Direitos do Titular
- LGPD Art. 18, §3º - Acesso facilitado
- LGPD Art. 18, §5º - Prazo de 15 dias
- ANPD - Guia de Direitos do Titular

---

**Anterior**: [Anexo F - MeuDPO](./ANEXO_F_MEUDPO.md)  
**Próximo**: [Anexo H - GED](./ANEXO_H_GED.md)
