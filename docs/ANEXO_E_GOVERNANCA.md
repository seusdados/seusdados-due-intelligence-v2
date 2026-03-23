# Anexo E - Módulo de Governança PPPD

**Seusdados Due Diligence - Documentação Técnica**

---

## 1. Visão Geral

O módulo de **Governança PPPD** (Programa de Privacidade e Proteção de Dados) oferece ferramentas para estruturar e gerenciar o programa de governança de dados da organização, incluindo gestão de comitês, reuniões, planos de implementação e acompanhamento contínuo.

### Funcionalidades Principais

- Configuração do CPPD (Comitê de Privacidade e Proteção de Dados)
- Gestão de membros do comitê com papéis definidos
- Calendário de reuniões com agenda e atas
- Sala de reunião virtual com cronômetro
- Programa de implementação por fases
- Planos mensais de governança (templates Ano 1 e Em Curso)
- Plano CPPD Contínuo com iniciativas e tarefas
- Notificações de documentos e ações atrasadas
- Geração automática de atas via IA

---

## 2. Arquitetura do Módulo

### 2.1 Componentes Frontend

| Arquivo | Descrição |
|---------|-----------|
| `Governanca.tsx` | Página principal com tabs |
| `GovernancaMeetingRoom.tsx` | Sala de reunião virtual |
| `GovernancaPlanoMensal.tsx` | Visualização de plano mensal |
| `PlanoCPPDContinuoTab.tsx` | Tab de plano contínuo |

### 2.2 Componentes Backend

| Arquivo | Descrição |
|---------|-----------|
| `governancaRouter.ts` | Procedures tRPC |
| `governancaService.ts` | Lógica de negócio |
| `cppdInitiativeRouter.ts` | Gestão de iniciativas |
| `cppdInitiativeService.ts` | Serviço de iniciativas |
| `overdueNotificationService.ts` | Notificações de atraso |

---

## 3. Modelo de Dados

### 3.1 Configuração do CPPD

```sql
CREATE TABLE governanca_cppd_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL UNIQUE,
  committee_name VARCHAR(255) DEFAULT 'CPPD',
  meeting_frequency ENUM('semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral') DEFAULT 'mensal',
  dpo_id INT,
  sponsor_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (dpo_id) REFERENCES users(id),
  FOREIGN KEY (sponsor_id) REFERENCES users(id)
);
```

### 3.2 Membros do Comitê

```sql
CREATE TABLE governanca_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_id INT NOT NULL,
  user_id INT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role ENUM('dpo', 'sponsor', 'juridico', 'ti', 'rh', 'compliance', 'seguranca', 'outro') NOT NULL,
  department VARCHAR(100),
  is_active TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (config_id) REFERENCES governanca_cppd_configs(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 3.3 Reuniões

```sql
CREATE TABLE governanca_meetings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  meeting_date TIMESTAMP NOT NULL,
  duration_minutes INT DEFAULT 60,
  location VARCHAR(255),
  meeting_type ENUM('ordinaria', 'extraordinaria', 'workshop') DEFAULT 'ordinaria',
  status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
  minutes_content TEXT,
  minutes_generated_at TIMESTAMP,
  created_by_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (config_id) REFERENCES governanca_cppd_configs(id),
  FOREIGN KEY (created_by_id) REFERENCES users(id)
);
```

### 3.4 Participantes

```sql
CREATE TABLE governanca_participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  meeting_id INT NOT NULL,
  member_id INT NOT NULL,
  attendance_status ENUM('pending', 'confirmed', 'declined', 'attended', 'absent') DEFAULT 'pending',
  notes TEXT,
  FOREIGN KEY (meeting_id) REFERENCES governanca_meetings(id),
  FOREIGN KEY (member_id) REFERENCES governanca_members(id)
);
```

### 3.5 Itens de Agenda

```sql
CREATE TABLE governanca_agenda_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  meeting_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  presenter_id INT,
  duration_minutes INT DEFAULT 15,
  order_index INT DEFAULT 0,
  status ENUM('pending', 'in_progress', 'completed', 'deferred') DEFAULT 'pending',
  decision TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES governanca_meetings(id),
  FOREIGN KEY (presenter_id) REFERENCES governanca_members(id)
);
```

### 3.6 Plano CPPD Contínuo - Iniciativas

```sql
CREATE TABLE cppd_initiatives (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category ENUM('governanca', 'conformidade', 'seguranca', 'treinamento', 'documentacao', 'tecnologia') NOT NULL,
  priority ENUM('baixa', 'media', 'alta', 'critica') DEFAULT 'media',
  status ENUM('planejada', 'em_andamento', 'concluida', 'cancelada', 'pausada') DEFAULT 'planejada',
  responsible_id INT,
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMP,
  progress INT DEFAULT 0,
  created_by_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (responsible_id) REFERENCES users(id),
  FOREIGN KEY (created_by_id) REFERENCES users(id)
);
```

### 3.7 Tarefas de Iniciativas

```sql
CREATE TABLE cppd_initiative_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  initiative_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('pendente', 'em_andamento', 'concluida', 'cancelada') DEFAULT 'pendente',
  responsible_id INT,
  due_date DATE,
  completed_at TIMESTAMP,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (initiative_id) REFERENCES cppd_initiatives(id),
  FOREIGN KEY (responsible_id) REFERENCES users(id)
);
```

### 3.8 Documentos de Iniciativas

```sql
CREATE TABLE cppd_initiative_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  initiative_id INT NOT NULL,
  document_id INT,
  title VARCHAR(255) NOT NULL,
  document_type ENUM('politica', 'procedimento', 'registro', 'evidencia', 'relatorio', 'outro') NOT NULL,
  status ENUM('pendente', 'em_elaboracao', 'em_revisao', 'aprovado', 'atrasado') DEFAULT 'pendente',
  due_date DATE,
  approved_at TIMESTAMP,
  approved_by_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (initiative_id) REFERENCES cppd_initiatives(id),
  FOREIGN KEY (document_id) REFERENCES ged_documents(id),
  FOREIGN KEY (approved_by_id) REFERENCES users(id)
);
```

---

## 4. Papéis do Comitê

### 4.1 Papéis Disponíveis

| Papel | Código | Responsabilidades |
|-------|--------|-------------------|
| DPO | `dpo` | Encarregado de Proteção de Dados |
| Sponsor | `sponsor` | Patrocinador executivo |
| Jurídico | `juridico` | Assessoria legal |
| TI | `ti` | Tecnologia da Informação |
| RH | `rh` | Recursos Humanos |
| Compliance | `compliance` | Conformidade |
| Segurança | `seguranca` | Segurança da Informação |
| Outro | `outro` | Outros participantes |

### 4.2 Estrutura Recomendada

```
┌─────────────────────────────────────────┐
│              SPONSOR                     │
│         (Patrocinador Executivo)         │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│                DPO                       │
│    (Encarregado de Proteção de Dados)   │
└─────────────────┬───────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼───┐   ┌─────▼─────┐   ┌───▼───┐
│Jurídico│   │    TI     │   │  RH   │
└───────┘   └───────────┘   └───────┘
```

---

## 5. Sala de Reunião Virtual

### 5.1 Funcionalidades

- Agenda em tempo real com status por item
- Cronômetro por item de agenda
- Registro de presenças
- Área de deliberações
- Botões de controle de status
- Geração automática de ata via IA

### 5.2 Fluxo da Reunião

```
┌─────────────────┐
│ Iniciar         │
│ Reunião         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Registrar       │
│ Presenças       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Percorrer       │
│ Agenda          │
│ (item a item)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Registrar       │
│ Deliberações    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Encerrar        │
│ Reunião         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Gerar Ata       │
│ (IA)            │
└─────────────────┘
```

### 5.3 Geração de Ata via IA

```typescript
const ataPrompt = `
Gere uma ata de reunião formal com base nas seguintes informações:

REUNIÃO: {{meetingTitle}}
DATA: {{meetingDate}}
PARTICIPANTES: {{participants}}

AGENDA:
{{#each agendaItems}}
- {{title}}: {{decision}}
{{/each}}

DELIBERAÇÕES:
{{deliberations}}

A ata deve incluir:
1. Cabeçalho com identificação
2. Lista de presentes e ausentes
3. Pauta discutida
4. Deliberações tomadas
5. Encaminhamentos com responsáveis e prazos
6. Encerramento
`;
```

---

## 6. Planos Mensais de Governança

### 6.1 Templates Disponíveis

| Template | Descrição | Meses |
|----------|-----------|-------|
| Ano 1 | Implementação inicial | 10 meses |
| Em Curso | Manutenção contínua | 10 meses |

### 6.2 Estrutura do Plano

```typescript
interface PlanoMensal {
  id: number;
  templateId: number;
  organizationId: number;
  title: string;
  startDate: Date;
  meses: Mes[];
}

interface Mes {
  id: number;
  numero: number;
  titulo: string;
  blocoMacro: string;
  cor: string;
  icone: string;
  atividades: Atividade[];
  entregaveis: Entregavel[];
  status: 'pendente' | 'em_andamento' | 'concluido';
  progresso: number;
}
```

### 6.3 Blocos Macro (Ano 1)

| Mês | Bloco | Atividades Principais |
|-----|-------|----------------------|
| 1 | Diagnóstico | Mapeamento inicial, gap analysis |
| 2 | Planejamento | Roadmap, definição de prioridades |
| 3 | Governança | Estruturação do CPPD |
| 4 | Políticas | Elaboração de políticas |
| 5 | Processos | Mapeamento de processos |
| 6 | Tecnologia | Implementação de controles |
| 7 | Terceiros | Gestão de fornecedores |
| 8 | Treinamento | Capacitação de equipes |
| 9 | Monitoramento | Indicadores e métricas |
| 10 | Melhoria | Revisão e ajustes |

---

## 7. Plano CPPD Contínuo

### 7.1 Visão Geral

O Plano CPPD Contínuo permite gerenciar iniciativas de longo prazo com:

- Categorização por área (governança, conformidade, segurança, etc.)
- Priorização (baixa, média, alta, crítica)
- Tarefas vinculadas a cada iniciativa
- Documentos associados com prazos
- Notificações de atraso automáticas

### 7.2 Categorias de Iniciativas

| Categoria | Código | Exemplos |
|-----------|--------|----------|
| Governança | `governanca` | Estruturação CPPD, políticas |
| Conformidade | `conformidade` | Adequação LGPD, auditorias |
| Segurança | `seguranca` | Controles técnicos, ISO 27001 |
| Treinamento | `treinamento` | Capacitação, conscientização |
| Documentação | `documentacao` | Políticas, procedimentos |
| Tecnologia | `tecnologia` | Sistemas, ferramentas |

### 7.3 Filtros e Busca

- Por status (planejada, em andamento, concluída)
- Por responsável
- Por período (data início/fim)
- Por categoria
- Busca textual em título e descrição

---

## 8. Notificações de Atraso

### 8.1 Tipos de Notificação

| Tipo | Descrição | Destinatário |
|------|-----------|--------------|
| Documento atrasado | Documento com prazo vencido | Responsável + DPO |
| Tarefa atrasada | Tarefa com prazo vencido | Responsável |
| Iniciativa atrasada | Iniciativa com prazo vencido | Responsável + Sponsor |
| Reunião pendente | Reunião sem ata | DPO |

### 8.2 Processamento Automático

```typescript
// Verificar e enviar notificações
overdueNotification.process
  Input: { organizationId?: number }
  Output: {
    documentsNotified: number,
    tasksNotified: number,
    initiativesNotified: number
  }
```

---

## 9. Endpoints tRPC

### 9.1 Configuração

```typescript
// Obter/criar configuração
governanca.getOrCreateConfig
  Input: { organizationId: number }
  Output: CppdConfig

// Atualizar configuração
governanca.updateConfig
  Input: {
    organizationId: number,
    committeeName?: string,
    meetingFrequency?: string,
    dpoId?: number,
    sponsorId?: number
  }
  Output: { success: boolean }
```

### 9.2 Membros

```typescript
// Listar membros
governanca.listMembers
  Input: { configId: number }
  Output: Member[]

// Adicionar membro
governanca.addMember
  Input: {
    configId: number,
    name: string,
    email?: string,
    role: string,
    department?: string
  }
  Output: { id: number }

// Remover membro
governanca.removeMember
  Input: { memberId: number }
  Output: { success: boolean }
```

### 9.3 Reuniões

```typescript
// Listar reuniões
governanca.listMeetings
  Input: { configId: number, status?: string }
  Output: Meeting[]

// Criar reunião
governanca.createMeeting
  Input: {
    configId: number,
    title: string,
    meetingDate: string,
    durationMinutes?: number,
    meetingType?: string
  }
  Output: { id: number }

// Gerar ata
governanca.generateMinutes
  Input: { meetingId: number }
  Output: { content: string }
```

### 9.4 Iniciativas

```typescript
// Listar iniciativas
cppdInitiative.list
  Input: {
    organizationId: number,
    status?: string,
    category?: string,
    responsibleId?: number
  }
  Output: Initiative[]

// Criar iniciativa
cppdInitiative.create
  Input: {
    organizationId: number,
    title: string,
    category: string,
    priority?: string,
    responsibleId?: number,
    startDate?: string,
    dueDate?: string
  }
  Output: { id: number }

// Atualizar progresso
cppdInitiative.updateProgress
  Input: { initiativeId: number, progress: number }
  Output: { success: boolean }
```

---

## 10. Interface do Usuário

### 10.1 Tabs da Página Principal

| Tab | Conteúdo |
|-----|----------|
| Configuração | Dados do CPPD, frequência de reuniões |
| Membros | Lista de membros do comitê |
| Reuniões | Calendário e histórico de reuniões |
| Programa | Fases de implementação |
| Planos Mensais | Templates e planos ativos |
| Plano CPPD Contínuo | Iniciativas de longo prazo |

### 10.2 Ações Disponíveis

- Configurar CPPD
- Adicionar/remover membros
- Agendar reuniões
- Iniciar sala de reunião
- Gerar atas
- Criar iniciativas
- Acompanhar progresso

---

## 11. Integração com Outros Módulos

### 11.1 MeuDPO

Ações do plano podem gerar tickets:

```typescript
// Criar ticket de ação
cppdInitiative.createTicket({
  initiativeId: number,
  taskId?: number
}) → tickets.create
```

### 11.2 GED

Documentos são armazenados no GED:

```typescript
// Vincular documento
cppdInitiative.linkDocument({
  initiativeId: number,
  documentId: number,
  documentType: string
})
```

### 11.3 Notificações

Sistema de notificações integrado:

```typescript
// Notificar responsável
notifications.send({
  userId: number,
  type: 'initiative_overdue',
  data: { initiativeId: number }
})
```

---

## 12. Segurança e Permissões

### 12.1 Controle de Acesso

| Ação | admin_global | consultor | cliente |
|------|--------------|-----------|---------|
| Configurar CPPD | ✓ | ✓ | ✗ |
| Gerenciar membros | ✓ | ✓ | ✗ |
| Agendar reuniões | ✓ | ✓ | ✓ (DPO) |
| Participar reuniões | ✓ | ✓ | ✓ (membros) |
| Criar iniciativas | ✓ | ✓ | ✓ (DPO) |
| Ver dashboard | ✓ | ✓ | ✓ |

---

## 13. Boas Práticas

1. **Estrutura**: Definir papéis claros no comitê
2. **Frequência**: Manter reuniões regulares
3. **Documentação**: Registrar todas as deliberações
4. **Acompanhamento**: Monitorar iniciativas continuamente
5. **Comunicação**: Manter stakeholders informados

---

## 14. Referências Técnicas

- LGPD Art. 50 - Boas Práticas e Governança
- LGPD Art. 41 - Encarregado (DPO)
- ISO 27001:2022 - Governança de Segurança
- NIST Privacy Framework - Govern Function

---

**Anterior**: [Anexo D - Mapeamentos](./ANEXO_D_MAPEAMENTOS.md)  
**Próximo**: [Anexo F - MeuDPO](./ANEXO_F_MEUDPO.md)
