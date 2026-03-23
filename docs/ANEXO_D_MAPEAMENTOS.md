# Anexo D - Módulo de Mapeamentos (ROPA)

**Seusdados Due Diligence - Documentação Técnica**

---

## 1. Visão Geral

O módulo de **Mapeamentos** implementa o processo de inventário de dados pessoais (ROPA - Record of Processing Activities) conforme exigido pelo Art. 37 da LGPD. O sistema utiliza uma abordagem de entrevista digital com Legal Design para coletar informações de forma intuitiva.

### Funcionalidades Principais

- Wizard de mapeamento em 3 fases
- Entrevista digital com Legal Design
- Knowledge base de processos por segmento
- Geração automática de ROT (Registro de Operações de Tratamento)
- Geração de POP (Procedimento Operacional Padrão) via IA
- Análise de risco automatizada
- Exportação ROPA conforme modelo ANPD
- Dashboard de progresso por área
- Sistema de lembretes para responsáveis
- Integração com GED para documentos

---

## 2. Arquitetura do Módulo

### 2.1 Componentes Frontend

| Arquivo | Descrição |
|---------|-----------|
| `Mapeamentos.tsx` | Listagem de mapeamentos |
| `MapeamentoWizard.tsx` | Wizard de criação (3 fases) |
| `MapeamentoDetalhes.tsx` | Detalhes do mapeamento |
| `MapeamentosDashboard.tsx` | Dashboard de progresso |
| `EntrevistaDigital.tsx` | Página pública de entrevista |

### 2.2 Componentes Backend

| Arquivo | Descrição |
|---------|-----------|
| `mapeamentoRouter.ts` | Procedures tRPC |
| `mapeamentoService.ts` | Lógica de negócio |
| `rotRouter.ts` | Geração de ROT/POP |
| `fase3Router.ts` | Central de Direitos |

---

## 3. Modelo de Dados

### 3.1 Tabela `mapeamento_contexto`

```sql
CREATE TABLE mapeamento_contexto (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  segment VARCHAR(100),
  business_type VARCHAR(100),
  dpo_name VARCHAR(255),
  dpo_email VARCHAR(255),
  dpo_phone VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);
```

### 3.2 Tabela `mapeamento_areas`

```sql
CREATE TABLE mapeamento_areas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contexto_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  responsible_name VARCHAR(255),
  responsible_email VARCHAR(255),
  status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contexto_id) REFERENCES mapeamento_contexto(id)
);
```

### 3.3 Tabela `mapeamento_respondentes`

```sql
CREATE TABLE mapeamento_respondentes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  area_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(64) UNIQUE,
  status ENUM('pending', 'sent', 'viewed', 'completed') DEFAULT 'pending',
  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (area_id) REFERENCES mapeamento_areas(id)
);
```

### 3.4 Tabela `mapeamento_processos`

```sql
CREATE TABLE mapeamento_processos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  area_id INT NOT NULL,
  respondente_id INT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  purpose TEXT,
  legal_basis VARCHAR(100),
  legal_basis_justification TEXT,
  data_categories JSON,
  sensitive_data TINYINT DEFAULT 0,
  sensitive_categories JSON,
  data_subjects JSON,
  storage_type VARCHAR(100),
  storage_location VARCHAR(255),
  retention_period VARCHAR(100),
  security_measures JSON,
  international_transfer TINYINT DEFAULT 0,
  transfer_countries JSON,
  third_party_sharing JSON,
  risk_level ENUM('baixo', 'medio', 'alto', 'critico'),
  status ENUM('draft', 'completed', 'reviewed') DEFAULT 'draft',
  origin VARCHAR(50) DEFAULT 'manual',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (area_id) REFERENCES mapeamento_areas(id),
  FOREIGN KEY (respondente_id) REFERENCES mapeamento_respondentes(id)
);
```

---

## 4. Fases do Wizard

### 4.1 Fase 0 - Estrutura Organizacional

**Objetivo**: Definir contexto da organização

**Campos**:
- Segmento de atuação (dropdown com 10+ opções)
- Tipo de negócio
- Nome do DPO (Encarregado)
- E-mail do DPO
- Telefone do DPO

**Knowledge Base de Segmentos**:
```typescript
const segments = [
  { id: 'saude', name: 'Saúde', areas: ['Recepção', 'Prontuário', 'Faturamento', 'RH'] },
  { id: 'educacao', name: 'Educação', areas: ['Secretaria', 'Pedagógico', 'Financeiro', 'RH'] },
  { id: 'varejo', name: 'Varejo', areas: ['Vendas', 'Marketing', 'RH', 'Logística'] },
  { id: 'financeiro', name: 'Financeiro', areas: ['Cadastro', 'Crédito', 'Cobrança', 'Compliance'] },
  // ... outros segmentos
];
```

### 4.2 Fase 1 - Delegação e Convites

**Objetivo**: Cadastrar responsáveis por área

**Funcionalidades**:
- Sugestão automática de áreas baseada no segmento
- Cadastro de responsável por área (nome, e-mail)
- Geração de token único para entrevista
- Envio de convite por e-mail
- Controle de status (pendente, enviado, visualizado, concluído)

**Fluxo de Convite**:
```
┌─────────────────┐
│ Cadastrar       │
│ Responsável     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Gerar Token     │
│ Único           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Enviar E-mail   │
│ com Link        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Responsável     │
│ Acessa Link     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Responde        │
│ Entrevista      │
└─────────────────┘
```

### 4.3 Fase 2 - Entrevista Digital

**Objetivo**: Coletar informações de tratamento de dados

**Interface com Legal Design**:
- Chips visuais coloridos por sensibilidade
- Legenda de cores explicativa
- Sugestões proativas da IA
- Justificativas legais inline
- Progress bar de conclusão

**Categorias de Dados**:
```typescript
const dataCategories = [
  { id: 'identificacao', name: 'Identificação', sensitive: false, color: 'blue' },
  { id: 'contato', name: 'Contato', sensitive: false, color: 'green' },
  { id: 'financeiro', name: 'Financeiro', sensitive: false, color: 'yellow' },
  { id: 'saude', name: 'Saúde', sensitive: true, color: 'red' },
  { id: 'biometrico', name: 'Biométrico', sensitive: true, color: 'red' },
  { id: 'genetico', name: 'Genético', sensitive: true, color: 'red' },
  { id: 'religiao', name: 'Religião', sensitive: true, color: 'red' },
  { id: 'politico', name: 'Político', sensitive: true, color: 'red' },
  { id: 'sexual', name: 'Vida Sexual', sensitive: true, color: 'red' },
  { id: 'etnia', name: 'Etnia/Raça', sensitive: true, color: 'red' },
];
```

**Bases Legais (Art. 7 LGPD)**:
```typescript
const legalBases = [
  { id: 'consentimento', name: 'Consentimento', article: 'Art. 7, I' },
  { id: 'obrigacao_legal', name: 'Obrigação Legal', article: 'Art. 7, II' },
  { id: 'politicas_publicas', name: 'Políticas Públicas', article: 'Art. 7, III' },
  { id: 'pesquisa', name: 'Pesquisa', article: 'Art. 7, IV' },
  { id: 'contrato', name: 'Execução de Contrato', article: 'Art. 7, V' },
  { id: 'processo', name: 'Processo Judicial', article: 'Art. 7, VI' },
  { id: 'vida', name: 'Proteção da Vida', article: 'Art. 7, VII' },
  { id: 'saude', name: 'Tutela da Saúde', article: 'Art. 7, VIII' },
  { id: 'legitimo_interesse', name: 'Legítimo Interesse', article: 'Art. 7, IX' },
  { id: 'credito', name: 'Proteção ao Crédito', article: 'Art. 7, X' },
];
```

---

## 5. Geração de Documentos

### 5.1 ROT (Registro de Operações de Tratamento)

Documento gerado automaticamente com:

- Identificação do processo
- Finalidade do tratamento
- Base legal e justificativa
- Categorias de dados
- Categorias de titulares
- Prazo de retenção
- Medidas de segurança
- Compartilhamento com terceiros
- Transferência internacional

**Template ROT**:
```markdown
# REGISTRO DE OPERAÇÕES DE TRATAMENTO

## 1. Identificação
- **Processo**: {{processName}}
- **Área**: {{areaName}}
- **Responsável**: {{responsibleName}}

## 2. Finalidade
{{purpose}}

## 3. Base Legal
- **Base**: {{legalBasis}}
- **Justificativa**: {{legalBasisJustification}}

## 4. Dados Tratados
### Categorias de Dados
{{#each dataCategories}}
- {{this}}
{{/each}}

### Dados Sensíveis
{{#if sensitiveData}}
- {{#each sensitiveCategories}}{{this}}, {{/each}}
{{else}}
Não há tratamento de dados sensíveis.
{{/if}}

## 5. Titulares
{{#each dataSubjects}}
- {{this}}
{{/each}}

## 6. Armazenamento
- **Tipo**: {{storageType}}
- **Local**: {{storageLocation}}
- **Retenção**: {{retentionPeriod}}

## 7. Segurança
{{#each securityMeasures}}
- {{this}}
{{/each}}

## 8. Compartilhamento
{{#if thirdPartySharing}}
{{#each thirdPartySharing}}
- {{name}}: {{purpose}}
{{/each}}
{{else}}
Não há compartilhamento com terceiros.
{{/if}}

## 9. Transferência Internacional
{{#if internationalTransfer}}
Países: {{#each transferCountries}}{{this}}, {{/each}}
{{else}}
Não há transferência internacional.
{{/if}}
```

### 5.2 POP (Procedimento Operacional Padrão)

Gerado via IA com base no ROT:

```typescript
const popPrompt = `
Com base no ROT a seguir, gere um POP (Procedimento Operacional Padrão) 
que inclua:

1. Objetivo do procedimento
2. Responsabilidades
3. Passo a passo do tratamento
4. Controles de segurança
5. Procedimentos de descarte
6. Registros necessários
7. Indicadores de conformidade

ROT:
{{rotContent}}
`;
```

---

## 6. Análise de Risco

### 6.1 Cálculo Automático

```typescript
function calculateRiskLevel(processo: Processo): string {
  let riskScore = 0;
  
  // Dados sensíveis (+3)
  if (processo.sensitiveData) riskScore += 3;
  
  // Menores de idade (+2)
  if (processo.dataSubjects.includes('menores')) riskScore += 2;
  
  // Transferência internacional (+2)
  if (processo.internationalTransfer) riskScore += 2;
  
  // Grande volume (+1)
  if (processo.volume === 'alto') riskScore += 1;
  
  // Compartilhamento com terceiros (+1)
  if (processo.thirdPartySharing?.length > 0) riskScore += 1;
  
  // Classificação
  if (riskScore >= 6) return 'critico';
  if (riskScore >= 4) return 'alto';
  if (riskScore >= 2) return 'medio';
  return 'baixo';
}
```

### 6.2 Recomendações Automáticas

```typescript
function generateRecommendations(processo: Processo): Recommendation[] {
  const recommendations: Recommendation[] = [];
  
  if (processo.sensitiveData) {
    recommendations.push({
      title: 'Avaliar necessidade de RIPD',
      description: 'Dados sensíveis requerem Relatório de Impacto',
      priority: 'alta',
      lgpdReference: 'Art. 38'
    });
  }
  
  if (processo.legalBasis === 'consentimento') {
    recommendations.push({
      title: 'Implementar gestão de consentimento',
      description: 'Garantir registro e revogação de consentimento',
      priority: 'alta',
      lgpdReference: 'Art. 8'
    });
  }
  
  // ... outras recomendações
  
  return recommendations;
}
```

---

## 7. Endpoints tRPC

### 7.1 Contexto e Áreas

```typescript
// Criar contexto
mapeamento.createContexto
  Input: {
    organizationId: number,
    segment: string,
    businessType: string,
    dpoName: string,
    dpoEmail: string
  }
  Output: { id: number }

// Listar áreas
mapeamento.listAreas
  Input: { contextoId: number }
  Output: Area[]

// Criar área
mapeamento.createArea
  Input: {
    contextoId: number,
    name: string,
    responsibleName: string,
    responsibleEmail: string
  }
  Output: { id: number }
```

### 7.2 Respondentes e Convites

```typescript
// Criar respondente
mapeamento.createRespondente
  Input: {
    areaId: number,
    name: string,
    email: string
  }
  Output: { id: number, token: string }

// Enviar convite
mapeamento.sendInvite
  Input: { respondenteId: number }
  Output: { success: boolean }

// Validar token
mapeamento.validateToken
  Input: { token: string }
  Output: { valid: boolean, area: Area, processos: Processo[] }
```

### 7.3 Processos

```typescript
// Listar processos
mapeamento.listProcessos
  Input: { areaId: number }
  Output: Processo[]

// Criar processo
mapeamento.createProcesso
  Input: ProcessoInput
  Output: { id: number }

// Atualizar processo
mapeamento.updateProcesso
  Input: { id: number, ...ProcessoInput }
  Output: { success: boolean }

// Salvar resposta (público)
mapeamento.savePublicResponse
  Input: { token: string, processoId: number, data: ProcessoData }
  Output: { success: boolean }
```

### 7.4 Documentos

```typescript
// Gerar ROT
mapeamento.generateROT
  Input: { processoId: number }
  Output: { content: string, documentId: number }

// Gerar POP
mapeamento.generatePOP
  Input: { processoId: number }
  Output: { content: string, documentId: number }

// Exportar ROPA
mapeamento.exportROPA
  Input: { organizationId: number, format: 'pdf' | 'xlsx' }
  Output: { url: string }
```

---

## 8. Dashboard de Mapeamentos

### 8.1 Métricas Exibidas

- Total de áreas mapeadas
- Progresso por área (%)
- Processos por nível de risco
- Entrevistas pendentes
- Documentos gerados

### 8.2 Visualizações

- Gráfico de progresso por área
- Mapa de calor de riscos por departamento
- Timeline de entrevistas
- Lista de pendências

---

## 9. Sistema de Lembretes

### 9.1 Configuração

```typescript
interface LembreteConfig {
  organizationId: number;
  daysAfterInvite: number;      // Dias após convite
  reminderInterval: number;      // Intervalo entre lembretes
  maxReminders: number;          // Máximo de lembretes
  notifyDPO: boolean;           // Notificar DPO
}
```

### 9.2 Processamento

```typescript
// Processar lembretes
mapeamento.processReminders
  Input: { organizationId?: number }
  Output: { sent: number, skipped: number }
```

---

## 10. Exportação ROPA

### 10.1 Formato ANPD

Exportação conforme modelo da ANPD:

| Campo | Descrição |
|-------|-----------|
| Processo | Nome do processo |
| Finalidade | Objetivo do tratamento |
| Base Legal | Fundamentação legal |
| Dados Pessoais | Categorias de dados |
| Titulares | Categorias de titulares |
| Compartilhamento | Terceiros envolvidos |
| Transferência | Países de destino |
| Retenção | Prazo de guarda |
| Segurança | Medidas implementadas |

### 10.2 Exportação em Lote

```typescript
// Exportar ZIP com todos os documentos
mapeamento.exportBatch
  Input: { organizationId: number }
  Output: { zipUrl: string }
```

Conteúdo do ZIP:
- ROTs individuais (Markdown)
- POPs individuais (Markdown)
- ROPA consolidado (Excel)
- Resumo executivo (PDF)

---

## 11. Integração com Outros Módulos

### 11.1 Análise de Contratos

Mapeamentos podem ser gerados a partir de contratos:

```typescript
// Gerar mapeamento de contrato
contractAnalysis.generateMapeamento({
  analysisId: number
}) → mapeamento.createFromContract
```

### 11.2 GED

Documentos são salvos automaticamente no GED:

```typescript
// Salvar ROT no GED
mapeamento.saveToGED({
  processoId: number,
  documentType: 'rot' | 'pop'
}) → ged.createDocument
```

### 11.3 Central de Direitos

Mapeamentos alimentam a Central de Direitos:

```typescript
// Consolidar fluxos de dados
fase3.consolidateDataFlows({
  organizationId: number,
  titularEmail: string
}) → DataFlowMap
```

---

## 12. Segurança e Permissões

### 12.1 Controle de Acesso

| Ação | admin_global | consultor | cliente |
|------|--------------|-----------|---------|
| Criar contexto | ✓ | ✓ | ✗ |
| Gerenciar áreas | ✓ | ✓ | ✗ |
| Enviar convites | ✓ | ✓ | ✗ |
| Ver mapeamentos | ✓ | ✓ | ✓ |
| Gerar documentos | ✓ | ✓ | ✓ |
| Exportar ROPA | ✓ | ✓ | ✓ |

### 12.2 Acesso Público

A entrevista digital (`/entrevista?token=xxx`) é pública:

- Token único e de uso único
- Expira após período configurado
- Não expõe dados de outros processos
- Registra IP e timestamp

---

## 13. Boas Práticas

1. **Planejamento**: Mapear estrutura organizacional antes
2. **Responsáveis**: Identificar conhecedores dos processos
3. **Linguagem**: Usar termos compreensíveis nas entrevistas
4. **Revisão**: Validar respostas com áreas jurídica e TI
5. **Atualização**: Revisar mapeamentos anualmente

---

## 14. Referências Técnicas

- LGPD Art. 37 - Registro de Operações de Tratamento
- LGPD Art. 38 - Relatório de Impacto
- ANPD - Modelo de ROPA
- ISO 27701:2019 - Inventário de Dados

---

**Anterior**: [Anexo C - Análise de Contratos](./ANEXO_C_ANALISE_CONTRATOS.md)  
**Próximo**: [Anexo E - Governança PPPD](./ANEXO_E_GOVERNANCA.md)
