# Anexo B - Módulo Due Diligence de Terceiros

**Seusdados Due Diligence - Documentação Técnica**

---

## 1. Visão Geral

O módulo de **Due Diligence de Terceiros** permite avaliar fornecedores, parceiros e suboperadores quanto à conformidade com a LGPD e práticas de segurança da informação. O sistema utiliza uma matriz de risco 5x5 para classificação de criticidade.

### Funcionalidades Principais

- Cadastro e gestão de terceiros
- Geração de links para autoavaliação
- Questionários estruturados por categoria
- Matriz de risco 5x5 (probabilidade x impacto)
- Classificação automática de criticidade
- Envio de e-mails com links de avaliação
- Acompanhamento de respostas em tempo real
- Sistema de lembretes automáticos
- Relatórios consolidados

---

## 2. Arquitetura do Módulo

### 2.1 Componentes Frontend

| Arquivo | Descrição |
|---------|-----------|
| `Terceiros.tsx` | Listagem de terceiros |
| `TerceiroNovo.tsx` | Cadastro de terceiro |
| `TerceiroEditar.tsx` | Edição de terceiro |
| `TerceiroDetalhes.tsx` | Perfil completo do terceiro |
| `TerceiroCadastroMassa.tsx` | Upload em massa (CSV/XLSX) |
| `DueDiligence.tsx` | Listagem de avaliações |
| `DueDiligenceNova.tsx` | Criação de avaliação |
| `DueDiligenceAvaliacao.tsx` | Formulário de avaliação |
| `DueDiligenceResultado.tsx` | Visualização de resultados |
| `TerceiroAvaliacao.tsx` | Página pública para terceiro responder |
| `EnviarLinks.tsx` | Gestão de links de avaliação |
| `AcompanhamentoLinks.tsx` | Dashboard de acompanhamento |

### 2.2 Componentes Backend

| Arquivo | Descrição |
|---------|-----------|
| `routers.ts` | Procedures tRPC |
| `db.ts` | Funções de banco de dados |
| `emailService.ts` | Envio de e-mails |
| `pdfService.ts` | Geração de relatórios |

---

## 3. Modelo de Dados

### 3.1 Tabela `third_parties`

```sql
CREATE TABLE third_parties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  trade_name VARCHAR(255),
  cnpj VARCHAR(18),
  type ENUM('fornecedor', 'parceiro', 'suboperador', 'outro') DEFAULT 'fornecedor',
  category VARCHAR(100),
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  description TEXT,
  risk_level ENUM('baixo', 'moderado', 'alto', 'critico'),
  is_active TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);
```

### 3.2 Tabela `third_party_assessments`

```sql
CREATE TABLE third_party_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  third_party_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('draft', 'sent', 'in_progress', 'completed', 'archived') DEFAULT 'draft',
  risk_score DECIMAL(5,2),
  risk_classification ENUM('baixo', 'moderado', 'alto', 'critico'),
  probability_score INT,
  impact_score INT,
  created_by_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (third_party_id) REFERENCES third_parties(id),
  FOREIGN KEY (created_by_id) REFERENCES users(id)
);
```

### 3.3 Tabela `access_links`

```sql
CREATE TABLE access_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(64) NOT NULL UNIQUE,
  third_party_id INT NOT NULL,
  organization_id INT NOT NULL,
  assessment_id INT,
  type ENUM('due_diligence', 'conformidade') DEFAULT 'due_diligence',
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  is_active TINYINT DEFAULT 1,
  created_by_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (third_party_id) REFERENCES third_parties(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);
```

---

## 4. Categorias de Avaliação

A avaliação de terceiros é estruturada em **6 categorias**:

| Categoria | Código | Peso |
|-----------|--------|------|
| Governança e Compliance | GC | 20% |
| Segurança da Informação | SI | 25% |
| Gestão de Dados Pessoais | GDP | 20% |
| Controles Técnicos | CT | 15% |
| Gestão de Incidentes | GI | 10% |
| Continuidade de Negócios | CN | 10% |

### 4.1 Escala de Respostas

| Valor | Descrição |
|-------|-----------|
| 0 | Não implementado |
| 1 | Parcialmente implementado |
| 2 | Implementado informalmente |
| 3 | Implementado e documentado |
| 4 | Implementado, documentado e auditado |

---

## 5. Matriz de Risco 5x5

### 5.1 Dimensões

**Probabilidade** (1-5):
| Nível | Descrição |
|-------|-----------|
| 1 | Muito baixa |
| 2 | Baixa |
| 3 | Média |
| 4 | Alta |
| 5 | Muito alta |

**Impacto** (1-5):
| Nível | Descrição |
|-------|-----------|
| 1 | Insignificante |
| 2 | Menor |
| 3 | Moderado |
| 4 | Maior |
| 5 | Catastrófico |

### 5.2 Classificação de Risco

```
         IMPACTO
         1   2   3   4   5
    5  [ 5][10][15][20][25]  ← CRÍTICO (20-25)
P   4  [ 4][ 8][12][16][20]  ← ALTO (12-19)
R   3  [ 3][ 6][ 9][12][15]  ← MODERADO (6-11)
O   2  [ 2][ 4][ 6][ 8][10]  ← BAIXO (1-5)
B   1  [ 1][ 2][ 3][ 4][ 5]
```

### 5.3 Cálculo Automático

```typescript
function calculateRiskClassification(
  probability: number,
  impact: number
): string {
  const riskScore = probability * impact;
  
  if (riskScore >= 20) return 'critico';
  if (riskScore >= 12) return 'alto';
  if (riskScore >= 6) return 'moderado';
  return 'baixo';
}
```

---

## 6. Fluxo de Avaliação

### 6.1 Fluxo Completo

```
┌─────────────────┐
│ Cadastrar       │
│ Terceiro        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Criar           │
│ Avaliação       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Gerar Link      │
│ de Acesso       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Enviar E-mail   │
│ ao Terceiro     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Terceiro        │
│ Responde        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Calcular        │
│ Risco           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Gerar           │
│ Relatório       │
└─────────────────┘
```

### 6.2 Status do Link

| Status | Descrição |
|--------|-----------|
| `pending` | Link criado, não enviado |
| `sent` | E-mail enviado |
| `viewed` | Link acessado pelo terceiro |
| `completed` | Avaliação finalizada |
| `expired` | Link expirado |

---

## 7. Endpoints tRPC

### 7.1 Terceiros

```typescript
// Listar terceiros
thirdParty.list
  Input: { organizationId: number }
  Output: ThirdParty[]

// Criar terceiro
thirdParty.create
  Input: {
    organizationId: number,
    name: string,
    type: 'fornecedor' | 'parceiro' | 'suboperador' | 'outro',
    contactEmail?: string,
    // ... outros campos
  }
  Output: { id: number }

// Perfil completo
thirdParty.getFullProfile
  Input: { thirdPartyId: number, organizationId: number }
  Output: ThirdPartyProfile
```

### 7.2 Avaliações

```typescript
// Listar avaliações
dueDiligence.list
  Input: { organizationId: number }
  Output: Assessment[]

// Criar avaliação
dueDiligence.create
  Input: {
    organizationId: number,
    thirdPartyId: number,
    title: string,
    sendEmail?: boolean
  }
  Output: { id: number, linkToken?: string }

// Salvar respostas (público)
dueDiligence.savePublicResponses
  Input: {
    token: string,
    responses: Response[]
  }
  Output: { success: boolean }
```

### 7.3 Links de Acesso

```typescript
// Gerar link
accessLink.create
  Input: {
    thirdPartyId: number,
    organizationId: number,
    assessmentId: number,
    expiresInDays?: number
  }
  Output: { token: string, url: string }

// Enviar e-mail
accessLink.sendEmail
  Input: { linkId: number }
  Output: { success: boolean }

// Enviar lembretes
accessLink.sendReminders
  Input: { organizationId: number }
  Output: { sent: number }
```

---

## 8. Cadastro em Massa

### 8.1 Formato CSV/XLSX

```csv
nome,nome_fantasia,cnpj,tipo,categoria,contato_nome,contato_email,contato_telefone
"Empresa A","Emp A","12.345.678/0001-90","fornecedor","TI","João Silva","joao@empresa.com","(11) 99999-9999"
"Empresa B","Emp B","98.765.432/0001-10","parceiro","Consultoria","Maria Santos","maria@empresa.com","(21) 88888-8888"
```

### 8.2 Validações

- CNPJ válido (formato e dígitos verificadores)
- E-mail válido
- Tipo dentro dos valores permitidos
- Campos obrigatórios preenchidos

### 8.3 Processamento

```typescript
// Upload de arquivo
thirdParty.bulkUpload
  Input: {
    organizationId: number,
    fileUrl: string,
    createAssessments?: boolean,
    sendEmails?: boolean
  }
  Output: {
    created: number,
    errors: Array<{ row: number, error: string }>
  }
```

---

## 9. Sistema de Lembretes

### 9.1 Configuração

```typescript
interface ReminderConfig {
  organizationId: number;
  daysBeforeReminder: number;      // Dias após envio para primeiro lembrete
  reminderInterval: number;         // Intervalo entre lembretes (dias)
  maxReminders: number;             // Máximo de lembretes
  isEnabled: boolean;
}
```

### 9.2 Processamento Automático

```typescript
// Executar lembretes (chamado via cron)
reminders.process
  Input: { organizationId?: number }
  Output: {
    processed: number,
    sent: number,
    skipped: number
  }
```

---

## 10. Interface do Terceiro

### 10.1 Página Pública (`/avaliacao/:token`)

A página de avaliação para terceiros inclui:

- Header com logo da organização solicitante
- Instruções claras sobre o processo
- Formulário com questões por categoria
- Progress bar de conclusão
- Botão de salvar rascunho
- Botão de finalizar avaliação
- Confirmação de envio

### 10.2 Design Visual Law

O formulário segue princípios de Legal Design:

- Linguagem clara e acessível
- Ícones explicativos
- Tooltips com informações adicionais
- Cores que indicam criticidade
- Feedback visual de progresso

---

## 11. Relatórios

### 11.1 Relatório Individual

Conteúdo do relatório PDF:

1. Identificação do terceiro
2. Resumo executivo
3. Classificação de risco
4. Matriz de risco visual
5. Resultados por categoria
6. Gaps identificados
7. Recomendações
8. Histórico de avaliações

### 11.2 Relatório Consolidado

Para visão geral de todos os terceiros:

- Distribuição por classificação de risco
- Terceiros com risco crítico/alto
- Evolução temporal
- Comparativo entre terceiros

---

## 12. Integração com Outros Módulos

### 12.1 Análise de Contratos

Ao concluir análise de contrato, terceiro é cadastrado automaticamente:

```typescript
// Sincronismo automático
contractAnalysis.onComplete → thirdParty.createFromContract
```

### 12.2 Mapeamentos

Terceiros aparecem como destinatários de compartilhamento:

```typescript
// Vincular terceiro ao mapeamento
mapeamento.addThirdPartySharing({
  mapeamentoId: number,
  thirdPartyId: number,
  purpose: string
})
```

### 12.3 Planos de Ação

Riscos identificados geram ações:

```typescript
// Gerar plano de ação
actionPlans.generateFromDueDiligence({
  assessmentId: number,
  riskThreshold: 'alto' | 'critico'
})
```

---

## 13. Segurança e Permissões

### 13.1 Controle de Acesso

| Ação | admin_global | consultor | cliente |
|------|--------------|-----------|---------|
| Listar terceiros | ✓ Todos | ✓ Todos | ✓ Própria org |
| Cadastrar terceiro | ✓ | ✓ | ✓ |
| Criar avaliação | ✓ | ✓ | ✓ |
| Enviar e-mail | ✓ | ✓ | ✓ |
| Ver resultados | ✓ | ✓ | ✓ |
| Excluir terceiro | ✓ | ✓ | ✗ |

### 13.2 Acesso Público

A página de avaliação (`/avaliacao/:token`) é pública, mas:

- Token é único e de uso único
- Expira após período configurado
- Registra IP e timestamp de acesso
- Não expõe dados da organização

---

## 14. Boas Práticas

1. **Categorização**: Classificar terceiros por tipo e criticidade
2. **Periodicidade**: Reavaliar terceiros críticos anualmente
3. **Evidências**: Solicitar documentação comprobatória
4. **Monitoramento**: Acompanhar evolução do risco
5. **Contratos**: Vincular avaliação ao contrato vigente

---

## 15. Referências Técnicas

- LGPD Art. 39 - Responsabilidade do Controlador
- LGPD Art. 42 - Responsabilidade Solidária
- ISO 27001:2022 - Gestão de Fornecedores
- NIST Cybersecurity Framework - Supply Chain Risk Management

---

**Anterior**: [Anexo A - Conformidade PPPD](./ANEXO_A_CONFORMIDADE.md)  
**Próximo**: [Anexo C - Análise de Contratos](./ANEXO_C_ANALISE_CONTRATOS.md)
