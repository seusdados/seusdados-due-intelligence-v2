# Anexo C - Módulo de Análise de Contratos

**Seusdados Due Diligence - Documentação Técnica**

---

## 1. Visão Geral

O módulo de **Análise de Contratos** utiliza Inteligência Artificial para analisar documentos contratuais sob a ótica da LGPD, identificando riscos, gerando cláusulas de proteção de dados e criando planos de ação automatizados.

### Funcionalidades Principais

- Upload e análise automatizada de contratos
- Extração de informações via IA (partes, objeto, dados tratados)
- Mapa de Análise com 25+ campos estruturados
- Checklist de Conformidade LGPD (10 itens)
- Matriz de Priorização de Riscos
- Geração automática de cláusulas LGPD (18 blocos)
- Plano de ação baseado em riscos identificados
- Integração com Mapeamentos e Terceiros
- Modelo XAI (Explainable AI) com rastreabilidade
- Relatórios PDF profissionais

---

## 2. Arquitetura do Módulo

### 2.1 Componentes Frontend

| Arquivo | Descrição |
|---------|-----------|
| `ContractAnalysis.tsx` | Listagem e upload de contratos |
| `ContractAnalysisDetail.tsx` | Detalhes da análise (5 tabs) |
| `ContractActionPlan.tsx` | Plano de ação dedicado |
| `LgpdTemplateEditor.tsx` | Editor de templates de cláusulas |

### 2.2 Componentes Backend

| Arquivo | Descrição |
|---------|-----------|
| `contractAnalysisRouter.ts` | Procedures tRPC |
| `contractAnalysisService.ts` | Lógica de análise |
| `lgpdTemplateRouter.ts` | Gestão de templates |
| `lgpdClausesService.ts` | Geração de cláusulas |
| `xaiEngine.ts` | Motor de IA explicável |

---

## 3. Modelo de Dados

### 3.1 Tabela `contract_analyses`

```sql
CREATE TABLE contract_analyses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  document_id INT,
  title VARCHAR(255) NOT NULL,
  status ENUM('pending', 'analyzing', 'completed', 'reviewed', 'error') DEFAULT 'pending',
  contract_text LONGTEXT,
  analysis_result JSON,
  risk_summary JSON,
  created_by_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (document_id) REFERENCES ged_documents(id)
);
```

### 3.2 Tabela `contract_analysis_map`

```sql
CREATE TABLE contract_analysis_map (
  id INT AUTO_INCREMENT PRIMARY KEY,
  analysis_id INT NOT NULL,
  -- Identificação das Partes
  controller_name VARCHAR(255),
  controller_cnpj VARCHAR(18),
  operator_name VARCHAR(255),
  operator_cnpj VARCHAR(18),
  -- Objeto do Contrato
  contract_object TEXT,
  contract_purpose TEXT,
  -- Dados Pessoais
  data_categories JSON,
  sensitive_data TINYINT DEFAULT 0,
  sensitive_categories JSON,
  data_subjects JSON,
  -- Bases Legais
  legal_bases JSON,
  -- Tratamento
  processing_activities JSON,
  retention_period VARCHAR(255),
  storage_location VARCHAR(255),
  -- Transferência
  international_transfer TINYINT DEFAULT 0,
  transfer_countries JSON,
  transfer_mechanism VARCHAR(255),
  -- Segurança
  security_measures JSON,
  incident_procedures TEXT,
  -- Direitos dos Titulares
  rights_procedures TEXT,
  dpo_contact VARCHAR(255),
  -- Responsabilidades
  liability_clauses TEXT,
  subprocessors_allowed TINYINT,
  audit_rights TINYINT,
  -- Metadados
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (analysis_id) REFERENCES contract_analyses(id)
);
```

### 3.3 Tabela `contract_analysis_checklist`

```sql
CREATE TABLE contract_analysis_checklist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  analysis_id INT NOT NULL,
  item_code VARCHAR(20) NOT NULL,
  item_description TEXT NOT NULL,
  is_compliant TINYINT,
  notes TEXT,
  evidence_reference TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (analysis_id) REFERENCES contract_analyses(id)
);
```

### 3.4 Tabela `contract_analysis_risks`

```sql
CREATE TABLE contract_analysis_risks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  analysis_id INT NOT NULL,
  risk_code VARCHAR(20) NOT NULL,
  risk_title VARCHAR(255) NOT NULL,
  risk_description TEXT,
  probability INT,
  impact INT,
  priority ENUM('baixa', 'media', 'alta', 'critica'),
  mitigation_suggestion TEXT,
  lgpd_reference VARCHAR(100),
  status ENUM('identified', 'mitigated', 'accepted', 'transferred') DEFAULT 'identified',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (analysis_id) REFERENCES contract_analyses(id)
);
```

---

## 4. Fluxo de Análise

### 4.1 Processo Completo

```
┌─────────────────┐
│ Upload do       │
│ Contrato        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Extração de     │
│ Texto (PDF)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Análise via     │
│ LLM (IA)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Preenchimento   │
│ Mapa de Análise │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Checklist de    │
│ Conformidade    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Identificação   │
│ de Riscos       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Geração de      │
│ Cláusulas LGPD  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Plano de        │
│ Ação            │
└─────────────────┘
```

### 4.2 Status da Análise

| Status | Descrição |
|--------|-----------|
| `pending` | Aguardando análise |
| `analyzing` | Análise em andamento |
| `completed` | Análise concluída |
| `reviewed` | Revisada por humano |
| `error` | Erro na análise |

---

## 5. Motor de Análise (IA)

### 5.1 Prompt de Análise

```typescript
const analysisPrompt = `
Analise o contrato a seguir sob a ótica da LGPD e extraia:

1. IDENTIFICAÇÃO DAS PARTES
   - Controlador (nome, CNPJ)
   - Operador (nome, CNPJ)

2. OBJETO E FINALIDADE
   - Objeto do contrato
   - Finalidade do tratamento de dados

3. DADOS PESSOAIS TRATADOS
   - Categorias de dados
   - Dados sensíveis (se houver)
   - Categorias de titulares

4. BASES LEGAIS
   - Bases legais aplicáveis (Art. 7 LGPD)

5. MEDIDAS DE SEGURANÇA
   - Medidas técnicas mencionadas
   - Medidas organizacionais

6. RISCOS IDENTIFICADOS
   - Lacunas contratuais
   - Cláusulas problemáticas
   - Ausências críticas

Responda em formato JSON estruturado.
`;
```

### 5.2 Validação de Resposta

```typescript
interface AnalysisResult {
  parties: {
    controller: { name: string; cnpj?: string };
    operator: { name: string; cnpj?: string };
  };
  object: {
    description: string;
    purpose: string;
  };
  personalData: {
    categories: string[];
    sensitiveData: boolean;
    sensitiveCategories?: string[];
    dataSubjects: string[];
  };
  legalBases: string[];
  securityMeasures: string[];
  risks: Array<{
    code: string;
    title: string;
    description: string;
    probability: number;
    impact: number;
    lgpdReference: string;
  }>;
}
```

---

## 6. Checklist de Conformidade

### 6.1 Itens do Checklist

| Código | Item | Referência LGPD |
|--------|------|-----------------|
| CK01 | Identificação clara das partes | Art. 5, VI e VII |
| CK02 | Definição de finalidades específicas | Art. 6, I |
| CK03 | Especificação de dados tratados | Art. 9 |
| CK04 | Base legal definida | Art. 7 |
| CK05 | Medidas de segurança | Art. 46 |
| CK06 | Procedimentos para incidentes | Art. 48 |
| CK07 | Direitos dos titulares | Art. 18 |
| CK08 | Transferência internacional | Art. 33-36 |
| CK09 | Suboperadores autorizados | Art. 39 |
| CK10 | Cláusula de confidencialidade | Art. 47 |

### 6.2 Avaliação Automática

```typescript
function evaluateChecklist(
  analysisMap: ContractAnalysisMap
): ChecklistResult[] {
  const results: ChecklistResult[] = [];
  
  // CK01 - Identificação das partes
  results.push({
    itemCode: 'CK01',
    isCompliant: !!(analysisMap.controllerName && analysisMap.operatorName),
    notes: analysisMap.controllerName 
      ? 'Partes identificadas' 
      : 'Partes não identificadas claramente'
  });
  
  // ... demais itens
  
  return results;
}
```

---

## 7. Geração de Cláusulas LGPD

### 7.1 Blocos de Cláusulas (18 templates)

| Bloco | Título | Descrição |
|-------|--------|-----------|
| 01 | Identificação das Partes | Qualificação de controlador e operador |
| 02 | Finalidades do Tratamento | Propósitos específicos e legítimos |
| 03 | Bases Legais | Fundamentação legal do tratamento |
| 04 | Categorias de Dados | Tipos de dados pessoais tratados |
| 05 | Dados de Menores | Tratamento especial para menores |
| 06 | Medidas de Segurança | Controles técnicos e organizacionais |
| 07 | Compartilhamento | Regras para compartilhamento |
| 08 | Suboperadores | Autorização e responsabilidades |
| 09 | Transferência Internacional | Mecanismos de transferência |
| 10 | Registros de Tratamento | Obrigação de manter registros |
| 11 | Direitos dos Titulares | Procedimentos de atendimento |
| 12 | Incidentes de Segurança | Notificação e resposta |
| 13 | Auditoria | Direito de auditoria |
| 14 | Obrigações do Operador | Deveres específicos |
| 15 | Responsabilidade Civil | Indenização e limites |
| 16 | Retenção e Eliminação | Prazos e procedimentos |
| 17 | Governança | DPO e políticas |
| 18 | Devolução e Portabilidade | Término do contrato |

### 7.2 Template com Variáveis

```typescript
const template = `
CLÁUSULA {{numero}} - MEDIDAS DE SEGURANÇA

{{numero}}.1. O OPERADOR compromete-se a implementar medidas técnicas e 
organizacionais adequadas para proteger os dados pessoais contra:
a) Acesso não autorizado;
b) Destruição acidental ou ilícita;
c) Perda, alteração ou divulgação não autorizada.

{{numero}}.2. As medidas mínimas incluem:
{{#each medidasSeguranca}}
- {{this}};
{{/each}}

{{numero}}.3. O OPERADOR deverá notificar o CONTROLADOR em até 
{{prazoNotificacao}} horas sobre qualquer incidente de segurança.

Referência: Art. 46 da Lei 13.709/2018 (LGPD)
`;
```

### 7.3 Editor de Templates

O editor permite:

- Visualizar todos os 18 blocos
- Editar texto com preview em tempo real
- Inserir variáveis disponíveis
- Salvar templates personalizados por organização
- Restaurar template padrão
- Histórico de alterações

---

## 8. Plano de Ação

### 8.1 Geração Automática

Riscos identificados são convertidos em ações:

```typescript
function generateActionPlan(risks: Risk[]): ActionPlanItem[] {
  return risks
    .filter(r => r.priority === 'alta' || r.priority === 'critica')
    .map(risk => ({
      title: `Mitigar: ${risk.title}`,
      description: risk.mitigation_suggestion,
      priority: risk.priority,
      dueDate: calculateDueDate(risk.priority),
      lgpdReference: risk.lgpd_reference
    }));
}

function calculateDueDate(priority: string): Date {
  const days = {
    critica: 7,
    alta: 15,
    media: 30,
    baixa: 60
  };
  return addDays(new Date(), days[priority]);
}
```

### 8.2 Interface do Plano

A tab de Plano de Ação inclui:

- Cards por ação com risco, impacto e referência legal
- Edição inline de título, descrição, prazo e responsável
- Indicadores visuais de prazo (atrasado, próximo)
- Botão de ajuste via IA
- Anexo de evidências do GED
- Exportação em PDF

---

## 9. Modelo XAI (Explainable AI)

### 9.1 Conceito

O modelo XAI adiciona explicabilidade às decisões da IA:

- **Alertas**: Explicação do motivo de cada alerta
- **Cláusulas**: Justificativa legal para cada cláusula
- **Ações**: Rastreabilidade da origem de cada ação

### 9.2 Estrutura de Explicação

```typescript
interface XaiExplanation {
  ruleId: string;           // ID da regra aplicada
  ruleName: string;         // Nome da regra
  ruleSource: string;       // Fonte (LGPD, ANPD, ISO)
  articleReference: string; // Artigo de lei
  explanation: string;      // Explicação em linguagem natural
  confidence: number;       // Nível de confiança (0-1)
  evidence: string[];       // Evidências no contrato
}
```

### 9.3 Arquivo de Regras

As regras são definidas em YAML:

```yaml
rules:
  - id: LGPD_ART7_I
    name: Consentimento do Titular
    source: LGPD
    article: Art. 7, I
    description: |
      O tratamento de dados pessoais somente poderá ser realizado
      mediante o fornecimento de consentimento pelo titular.
    triggers:
      - keywords: [consentimento, autorização, aceite]
      - context: base_legal
    action: verify_consent_clause
```

---

## 10. Endpoints tRPC

### 10.1 Análises

```typescript
// Listar análises
contractAnalysis.list
  Input: { organizationId: number }
  Output: ContractAnalysis[]

// Iniciar análise
contractAnalysis.start
  Input: {
    organizationId: number,
    documentId?: number,
    contractText?: string,
    title: string
  }
  Output: { id: number }

// Obter detalhes
contractAnalysis.getById
  Input: { id: number }
  Output: ContractAnalysisDetail

// Refinar análise
contractAnalysis.refine
  Input: {
    analysisId: number,
    instructions: string
  }
  Output: { success: boolean }
```

### 10.2 Cláusulas

```typescript
// Gerar cláusulas
contractAnalysis.generateClauses
  Input: { analysisId: number }
  Output: GeneratedClauses[]

// Refinar cláusula
contractAnalysis.refineClause
  Input: {
    analysisId: number,
    clauseId: string,
    instructions: string
  }
  Output: { content: string }

// Aceitar/rejeitar cláusula
contractAnalysis.updateClauseStatus
  Input: {
    analysisId: number,
    clauseId: string,
    accepted: boolean
  }
  Output: { success: boolean }
```

### 10.3 Plano de Ação

```typescript
// Gerar plano
contractAnalysis.generateActionPlan
  Input: { analysisId: number }
  Output: ActionPlanItem[]

// Atualizar ação
contractAnalysis.updateAction
  Input: {
    actionId: number,
    title?: string,
    description?: string,
    dueDate?: string,
    responsibleId?: number,
    status?: string
  }
  Output: { success: boolean }
```

---

## 11. Integração com Outros Módulos

### 11.1 Mapeamentos

Análise de contrato pode gerar mapeamento automaticamente:

```typescript
// Extrair dados para mapeamento
contractAnalysis.previewMapeamentoExtraction
  Input: { analysisId: number }
  Output: MapeamentoPreview

// Gerar mapeamento
contractAnalysis.generateMapeamento
  Input: { analysisId: number }
  Output: { mapeamentoId: number }
```

### 11.2 Terceiros

Ao concluir análise, terceiro é cadastrado:

```typescript
// Sincronismo automático
contractAnalysis.onComplete → thirdParty.createFromContract({
  name: analysisMap.operatorName,
  cnpj: analysisMap.operatorCnpj,
  type: 'suboperador'
})
```

### 11.3 MeuDPO

Contratos anexados em tickets são pré-analisados:

```typescript
// Pré-análise de contrato em ticket
contractPreAnalysis.analyze
  Input: { ticketId: number, documentId: number }
  Output: PreAnalysisResult
```

---

## 12. Interface do Usuário

### 12.1 Tabs da Página de Detalhes

| Tab | Conteúdo |
|-----|----------|
| Mapa de Análise | Campos extraídos do contrato |
| Checklist | 10 itens de conformidade |
| Riscos | Matriz de riscos identificados |
| Cláusulas LGPD | 18 blocos de cláusulas geradas |
| Plano de Ação | Ações para mitigar riscos |
| Mapeamentos | Mapeamentos vinculados |

### 12.2 Ações Disponíveis

- Ver contrato original (modal)
- Editar resultado da análise
- Gerar relatório PDF
- Exportar cláusulas aceitas
- Vincular ao terceiro
- Gerar mapeamento

---

## 13. Segurança e Permissões

### 13.1 Controle de Acesso

| Ação | admin_global | consultor | cliente |
|------|--------------|-----------|---------|
| Listar análises | ✓ Todas | ✓ Todas | ✓ Própria org |
| Iniciar análise | ✓ | ✓ | ✗ |
| Ver resultados | ✓ | ✓ | ✓ |
| Editar análise | ✓ | ✓ | ✗ |
| Gerar cláusulas | ✓ | ✓ | ✗ |
| Gerar relatório | ✓ | ✓ | ✓ |

---

## 14. Boas Práticas

1. **Qualidade do documento**: PDFs com texto selecionável
2. **Revisão humana**: Sempre revisar análise da IA
3. **Personalização**: Ajustar templates por tipo de contrato
4. **Versionamento**: Manter histórico de análises
5. **Integração**: Vincular a terceiros e mapeamentos

---

## 15. Referências Técnicas

- LGPD (Lei 13.709/2018) - Todos os artigos
- ANPD - Guia de Boas Práticas para Contratos
- ISO 27701:2019 - Cláusulas contratuais
- Cláusulas Contratuais Padrão (CCPs) da UE

---

**Anterior**: [Anexo B - Due Diligence](./ANEXO_B_DUE_DILIGENCE.md)  
**Próximo**: [Anexo D - Mapeamentos](./ANEXO_D_MAPEAMENTOS.md)
