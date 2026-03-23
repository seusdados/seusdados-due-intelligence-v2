# Anexo F - Módulo MeuDPO

**Seusdados Due Diligence - Documentação Técnica**

---

## 1. Visão Geral

O módulo **MeuDPO** é um sistema de gestão de tickets para atendimento jurídico-compliance, permitindo que clientes registrem solicitações e consultores/DPOs gerenciem o atendimento com controle de SLA, priorização e rastreabilidade.

### Funcionalidades Principais

- Abertura de chamados com wizard guiado
- Categorização por tipo e prioridade
- Controle de SLA configurável
- Sistema de comentários e anexos
- Tags personalizadas
- Notificações por e-mail
- Painel de SLA com métricas
- Relatórios consolidados
- Atribuição automática de tickets
- Botão inteligente (SmartDPOButton)

---

## 2. Arquitetura do Módulo

### 2.1 Componentes Frontend

| Arquivo | Descrição |
|---------|-----------|
| `Tickets.tsx` | Listagem de tickets |
| `TicketDetail.tsx` | Detalhes do ticket |
| `TicketDetailPremium.tsx` | Interface premium |
| `NovoTicketCliente.tsx` | Wizard de abertura |
| `MeudpoSLA.tsx` | Painel de SLA |
| `MeudpoConfig.tsx` | Configurações |
| `MeudpoProdutividade.tsx` | Métricas de produtividade |
| `MeudpoTemplates.tsx` | Templates de resposta |
| `TicketReports.tsx` | Relatórios |
| `TicketTags.tsx` | Gestão de tags |
| `SmartDPOButton.tsx` | Botão inteligente |
| `AcionarDPO.tsx` | Modal de abertura |
| `GerenciarComoDPO.tsx` | Painel de gestão |

### 2.2 Componentes Backend

| Arquivo | Descrição |
|---------|-----------|
| `ticketsRouter.ts` | Procedures tRPC |
| `ticketService.ts` | Lógica de negócio |
| `ticketTagService.ts` | Gestão de tags |
| `emailService.ts` | Notificações |

---

## 3. Modelo de Dados

### 3.1 Tabela `tickets`

```sql
CREATE TABLE tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type ENUM('duvida', 'incidente', 'solicitacao', 'reclamacao', 'sugestao', 'direito_titular', 'outro') DEFAULT 'duvida',
  priority ENUM('baixa', 'media', 'alta', 'urgente') DEFAULT 'media',
  status ENUM('aberto', 'em_atendimento', 'aguardando_cliente', 'resolvido', 'fechado') DEFAULT 'aberto',
  category VARCHAR(100),
  assigned_to_id INT,
  created_by_id INT NOT NULL,
  sla_due_at TIMESTAMP,
  first_response_at TIMESTAMP,
  resolved_at TIMESTAMP,
  closed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (assigned_to_id) REFERENCES users(id),
  FOREIGN KEY (created_by_id) REFERENCES users(id)
);
```

### 3.2 Tabela `ticket_comments`

```sql
CREATE TABLE ticket_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  is_internal TINYINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 3.3 Tabela `ticket_attachments`

```sql
CREATE TABLE ticket_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  comment_id INT,
  original_filename VARCHAR(255) NOT NULL,
  storage_url VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100),
  file_size INT,
  uploaded_by_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (comment_id) REFERENCES ticket_comments(id),
  FOREIGN KEY (uploaded_by_id) REFERENCES users(id)
);
```

### 3.4 Tabela `ticket_tags`

```sql
CREATE TABLE ticket_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#6366f1',
  description TEXT,
  is_active TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);
```

### 3.5 Tabela `meudpo_settings`

```sql
CREATE TABLE meudpo_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL UNIQUE,
  -- SLA por prioridade (em horas)
  sla_baixa INT DEFAULT 72,
  sla_media INT DEFAULT 48,
  sla_alta INT DEFAULT 24,
  sla_urgente INT DEFAULT 4,
  -- Notificações
  notify_on_create TINYINT DEFAULT 1,
  notify_on_update TINYINT DEFAULT 1,
  notify_on_sla_warning TINYINT DEFAULT 1,
  notify_on_sla_breach TINYINT DEFAULT 1,
  sla_warning_threshold INT DEFAULT 80,
  -- Atribuição automática
  auto_assign_enabled TINYINT DEFAULT 0,
  auto_assign_method ENUM('round_robin', 'least_busy', 'random') DEFAULT 'round_robin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);
```

---

## 4. Tipos de Ticket

| Tipo | Código | Descrição |
|------|--------|-----------|
| Dúvida | `duvida` | Esclarecimento sobre LGPD |
| Incidente | `incidente` | Incidente de segurança |
| Solicitação | `solicitacao` | Solicitação de serviço |
| Reclamação | `reclamacao` | Reclamação de titular |
| Sugestão | `sugestao` | Sugestão de melhoria |
| Direito Titular | `direito_titular` | Exercício de direito LGPD |
| Outro | `outro` | Outros assuntos |

---

## 5. Níveis de Prioridade

| Prioridade | Código | SLA Padrão | Cor |
|------------|--------|------------|-----|
| Baixa | `baixa` | 72 horas | Verde |
| Média | `media` | 48 horas | Amarelo |
| Alta | `alta` | 24 horas | Laranja |
| Urgente | `urgente` | 4 horas | Vermelho |

---

## 6. Status do Ticket

| Status | Código | Descrição |
|--------|--------|-----------|
| Aberto | `aberto` | Aguardando atendimento |
| Em Atendimento | `em_atendimento` | Sendo trabalhado |
| Aguardando Cliente | `aguardando_cliente` | Pendente de resposta |
| Resolvido | `resolvido` | Solução aplicada |
| Fechado | `fechado` | Encerrado |

### 6.1 Fluxo de Status

```
┌─────────────────┐
│     ABERTO      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ EM ATENDIMENTO  │◄────────────────┐
└────────┬────────┘                 │
         │                          │
    ┌────┴────┐                     │
    │         │                     │
    ▼         ▼                     │
┌───────┐ ┌───────────────────┐     │
│RESOL- │ │ AGUARDANDO        │─────┘
│VIDO   │ │ CLIENTE           │
└───┬───┘ └───────────────────┘
    │
    ▼
┌─────────────────┐
│    FECHADO      │
└─────────────────┘
```

---

## 7. SmartDPOButton

### 7.1 Comportamento por Role

| Role | Comportamento |
|------|---------------|
| Cliente | Abre modal "Acionar DPO" para criar ticket |
| Consultor | Abre painel "Gerenciar como DPO" |
| Admin Global | Abre painel "Gerenciar como DPO" |

### 7.2 Implementação

```typescript
function SmartDPOButton({ organizationId }: Props) {
  const { user } = useAuth();
  
  if (user?.role === 'cliente') {
    return <AcionarDPO organizationId={organizationId} />;
  }
  
  return <GerenciarComoDPO organizationId={organizationId} />;
}
```

### 7.3 Painel "Gerenciar como DPO"

Funcionalidades:
- Lista de ações pendentes
- Documentos atrasados
- Tarefas do plano CPPD
- Upload rápido de documentos
- Acesso rápido a tickets

---

## 8. Wizard de Abertura

### 8.1 Passos do Wizard

| Passo | Título | Campos |
|-------|--------|--------|
| 1 | Tipo | Seleção do tipo de ticket |
| 2 | Detalhes | Título, descrição, prioridade |
| 3 | Anexos | Upload de arquivos |
| 4 | Confirmação | Revisão e envio |

### 8.2 Interface

- Progress bar indicando passo atual
- Navegação anterior/próximo
- Drag-and-drop para anexos
- Preview de arquivos
- Integração com GED

---

## 9. Controle de SLA

### 9.1 Cálculo de SLA

```typescript
function calculateSlaDueAt(
  priority: string,
  settings: MeudpoSettings,
  createdAt: Date
): Date {
  const slaHours = {
    baixa: settings.slaBaixa,
    media: settings.slaMedia,
    alta: settings.slaAlta,
    urgente: settings.slaUrgente
  };
  
  return addHours(createdAt, slaHours[priority]);
}
```

### 9.2 Indicadores Visuais

| Estado | Cor | Condição |
|--------|-----|----------|
| No prazo | Verde | > 20% do tempo restante |
| Alerta | Amarelo | < 20% do tempo restante |
| Atrasado | Vermelho | Prazo vencido |

### 9.3 Métricas de SLA

- Taxa de cumprimento de SLA
- Tempo médio de primeira resposta
- Tempo médio de resolução
- Tickets por status
- Tickets por prioridade

---

## 10. Endpoints tRPC

### 10.1 Tickets

```typescript
// Listar tickets
tickets.list
  Input: {
    organizationId?: number,
    status?: string,
    type?: string,
    priority?: string,
    assignedToId?: number,
    search?: string
  }
  Output: Ticket[]

// Criar ticket
tickets.create
  Input: {
    organizationId: number,
    title: string,
    description?: string,
    type: string,
    priority?: string,
    category?: string
  }
  Output: { id: number }

// Atualizar status
tickets.updateStatus
  Input: {
    ticketId: number,
    status: string
  }
  Output: { success: boolean }

// Atribuir ticket
tickets.assign
  Input: {
    ticketId: number,
    assignedToId: number
  }
  Output: { success: boolean }
```

### 10.2 Comentários

```typescript
// Adicionar comentário
tickets.addComment
  Input: {
    ticketId: number,
    content: string,
    isInternal?: boolean
  }
  Output: { id: number }

// Listar comentários
tickets.listComments
  Input: { ticketId: number }
  Output: Comment[]
```

### 10.3 Anexos

```typescript
// Upload de anexo
tickets.uploadAttachment
  Input: {
    ticketId: number,
    commentId?: number,
    fileUrl: string,
    fileName: string,
    mimeType: string,
    fileSize: number
  }
  Output: { id: number }
```

### 10.4 Tags

```typescript
// Listar tags
tickets.listTags
  Input: { organizationId: number }
  Output: Tag[]

// Criar tag
tickets.createTag
  Input: {
    organizationId: number,
    name: string,
    color?: string,
    description?: string
  }
  Output: { id: number }

// Associar tag
tickets.addTag
  Input: { ticketId: number, tagId: number }
  Output: { success: boolean }
```

### 10.5 Configurações

```typescript
// Obter configurações
tickets.getSettings
  Input: { organizationId: number }
  Output: MeudpoSettings

// Atualizar configurações
tickets.updateSettings
  Input: {
    organizationId: number,
    slaBaixa?: number,
    slaMedia?: number,
    slaAlta?: number,
    slaUrgente?: number,
    notifyOnCreate?: boolean,
    autoAssignEnabled?: boolean,
    autoAssignMethod?: string
  }
  Output: { success: boolean }
```

---

## 11. Notificações por E-mail

### 11.1 Eventos de Notificação

| Evento | Destinatário | Conteúdo |
|--------|--------------|----------|
| Ticket criado | Consultor/DPO | Novo ticket aberto |
| Status alterado | Cliente | Atualização de status |
| Comentário adicionado | Cliente/Consultor | Novo comentário |
| SLA em alerta | Consultor | 80% do prazo consumido |
| SLA violado | Consultor + Sponsor | Prazo vencido |

### 11.2 Template de E-mail

```typescript
const emailTemplate = `
<div style="font-family: Inter, sans-serif;">
  <h2>{{subject}}</h2>
  
  <p>Olá {{recipientName}},</p>
  
  <p>{{message}}</p>
  
  <div style="background: #f3f4f6; padding: 16px; border-radius: 8px;">
    <p><strong>Ticket:</strong> #{{ticketId}} - {{ticketTitle}}</p>
    <p><strong>Status:</strong> {{status}}</p>
    <p><strong>Prioridade:</strong> {{priority}}</p>
    <p><strong>SLA:</strong> {{slaDueAt}}</p>
  </div>
  
  <p>
    <a href="{{ticketUrl}}" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
      Ver Ticket
    </a>
  </p>
</div>
`;
```

---

## 12. Relatórios

### 12.1 Tipos de Relatório

| Relatório | Conteúdo |
|-----------|----------|
| Consolidado | Visão geral de todos os tickets |
| Por Período | Tickets em intervalo de datas |
| Por Tipo | Distribuição por tipo |
| Por SLA | Análise de cumprimento |
| Por Consultor | Produtividade individual |

### 12.2 Métricas Incluídas

- Total de tickets
- Tickets por status
- Tickets por prioridade
- Taxa de SLA cumprido
- Tempo médio de resolução
- Tickets por consultor
- Evolução temporal

---

## 13. Atribuição Automática

### 13.1 Métodos Disponíveis

| Método | Código | Descrição |
|--------|--------|-----------|
| Round Robin | `round_robin` | Distribui sequencialmente |
| Menos Ocupado | `least_busy` | Atribui ao menos carregado |
| Aleatório | `random` | Distribuição aleatória |

### 13.2 Implementação

```typescript
async function autoAssignTicket(
  ticketId: number,
  organizationId: number,
  method: string
): Promise<number> {
  const consultants = await getAvailableConsultants(organizationId);
  
  switch (method) {
    case 'round_robin':
      return getNextInRotation(consultants);
    case 'least_busy':
      return getLeastBusyConsultant(consultants);
    case 'random':
      return getRandomConsultant(consultants);
  }
}
```

---

## 14. Integração com Outros Módulos

### 14.1 GED

Anexos são armazenados no GED:

```typescript
// Salvar anexo no GED
tickets.uploadAttachment → ged.createDocument({
  folderId: meudpoFolderId,
  fileName: attachment.fileName,
  fileUrl: attachment.fileUrl
})
```

### 14.2 Análise de Contratos

Contratos anexados são pré-analisados:

```typescript
// Pré-análise automática
tickets.onAttachContract → contractPreAnalysis.analyze({
  ticketId: number,
  documentId: number
})
```

### 14.3 Central de Direitos

Tickets de direito do titular são sincronizados:

```typescript
// Sincronizar com Central
tickets.create({ type: 'direito_titular' }) → fase3.createRequest({
  ticketId: number,
  requestType: string
})
```

---

## 15. Segurança e Permissões

### 15.1 Controle de Acesso

| Ação | admin_global | consultor | cliente |
|------|--------------|-----------|---------|
| Listar tickets | ✓ Todos | ✓ Todos | ✓ Próprios |
| Criar ticket | ✓ | ✓ | ✓ |
| Atribuir ticket | ✓ | ✓ | ✗ |
| Comentar (interno) | ✓ | ✓ | ✗ |
| Alterar status | ✓ | ✓ | ✗ |
| Configurar SLA | ✓ | ✓ | ✗ |
| Ver relatórios | ✓ | ✓ | ✗ |

---

## 16. Boas Práticas

1. **Categorização**: Usar tipos e tags consistentes
2. **SLA**: Definir prazos realistas por prioridade
3. **Comunicação**: Manter cliente informado
4. **Documentação**: Registrar todas as interações
5. **Escalação**: Definir processo de escalação

---

## 17. Referências Técnicas

- LGPD Art. 18 - Direitos do Titular
- LGPD Art. 41 - Atribuições do DPO
- ITIL v4 - Gestão de Incidentes
- ISO 20000 - Gestão de Serviços de TI

---

**Anterior**: [Anexo E - Governança PPPD](./ANEXO_E_GOVERNANCA.md)  
**Próximo**: [Anexo G - Central de Direitos](./ANEXO_G_CENTRAL_DIREITOS.md)
