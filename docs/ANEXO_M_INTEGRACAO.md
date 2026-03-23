# Anexo M - Integração e Sincronismo entre Módulos

**Seusdados Due Diligence - Documentação Técnica**

---

## 1. Visão Geral

A plataforma Seusdados Due Diligence foi projetada com uma arquitetura de módulos integrados, onde as informações fluem automaticamente entre os diferentes componentes do sistema. Este documento detalha os mecanismos de integração e sincronismo em tempo real.

---

## 2. Mapa de Integrações

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DASHBOARD PRINCIPAL                             │
│                     (Visão consolidada de todos os módulos)              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│  CONFORMIDADE │         │ DUE DILIGENCE │         │   ANÁLISE     │
│     PPPD      │         │   TERCEIROS   │         │  CONTRATOS    │
└───────┬───────┘         └───────┬───────┘         └───────┬───────┘
        │                         │                         │
        │    ┌────────────────────┼────────────────────┐    │
        │    │                    │                    │    │
        ▼    ▼                    ▼                    ▼    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           PLANOS DE AÇÃO                                 │
│              (Ações geradas automaticamente de todos os módulos)         │
└─────────────────────────────────────────────────────────────────────────┘
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│  MAPEAMENTOS  │◄────────│   TERCEIROS   │◄────────│     GED       │
│    (ROPA)     │         │  (Cadastro)   │         │ (Documentos)  │
└───────┬───────┘         └───────────────┘         └───────┬───────┘
        │                                                   │
        └───────────────────────┬───────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   CENTRAL DE DIREITOS │
                    │   (Portal do Titular) │
                    └───────────────────────┘
```

---

## 3. Integrações Detalhadas

### 3.1 Análise de Contratos → Terceiros

**Trigger**: Conclusão de análise de contrato

**Fluxo**:
```typescript
// Ao concluir análise de contrato
contractAnalysis.onComplete(analysisId) {
  // Extrair dados do operador
  const operatorData = extractOperatorFromAnalysis(analysisId);
  
  // Verificar se terceiro já existe
  const existing = await findThirdPartyByCnpj(operatorData.cnpj);
  
  if (!existing) {
    // Criar terceiro automaticamente
    const thirdPartyId = await thirdParty.create({
      organizationId: analysis.organizationId,
      name: operatorData.name,
      cnpj: operatorData.cnpj,
      type: 'suboperador',
      contactEmail: operatorData.contactEmail,
      description: `Criado automaticamente a partir da análise de contrato #${analysisId}`
    });
    
    // Vincular contrato ao terceiro
    await linkContractToThirdParty(analysisId, thirdPartyId);
  }
}
```

**Dados Sincronizados**:
- Nome do operador
- CNPJ
- E-mail de contato
- Tipo (suboperador)
- Vínculo com contrato

---

### 3.2 Análise de Contratos → Mapeamentos

**Trigger**: Botão "Gerar Mapeamento Automático"

**Fluxo**:
```typescript
// Extrair dados para mapeamento
contractAnalysis.previewMapeamentoExtraction(analysisId) {
  const analysis = await getAnalysisById(analysisId);
  const map = await getAnalysisMap(analysisId);
  
  return {
    processName: map.contractObject,
    purpose: map.contractPurpose,
    legalBasis: map.legalBases[0],
    dataCategories: map.dataCategories,
    sensitiveData: map.sensitiveData,
    dataSubjects: map.dataSubjects,
    retentionPeriod: map.retentionPeriod,
    securityMeasures: map.securityMeasures,
    internationalTransfer: map.internationalTransfer,
    thirdPartySharing: [{
      name: map.operatorName,
      purpose: map.contractPurpose
    }]
  };
}

// Criar mapeamento
contractAnalysis.generateMapeamento(analysisId) {
  const extractedData = await previewMapeamentoExtraction(analysisId);
  
  const mapeamentoId = await mapeamento.createProcesso({
    ...extractedData,
    origin: 'contract_analysis',
    sourceId: analysisId
  });
  
  // Criar vínculo
  await createContractMapeamentoLink(analysisId, mapeamentoId);
  
  // Notificar responsável
  await notifyAreaResponsible(mapeamentoId);
  
  return { mapeamentoId };
}
```

**Dados Sincronizados**:
- Nome do processo
- Finalidade
- Base legal
- Categorias de dados
- Dados sensíveis
- Titulares
- Medidas de segurança
- Transferência internacional
- Compartilhamento com terceiros

---

### 3.3 MeuDPO → Análise de Contratos (Pré-análise)

**Trigger**: Anexo de contrato em ticket

**Fluxo**:
```typescript
// Detectar contrato anexado
tickets.onAttachment(ticketId, attachment) {
  if (isContractDocument(attachment.mimeType, attachment.fileName)) {
    // Iniciar pré-análise
    const preAnalysis = await contractPreAnalysis.analyze({
      ticketId,
      documentId: attachment.documentId
    });
    
    // Adicionar comentário interno
    await tickets.addComment({
      ticketId,
      content: `Pré-análise de contrato realizada automaticamente. 
                Partes identificadas: ${preAnalysis.parties.join(', ')}
                Riscos identificados: ${preAnalysis.risks.length}`,
      isInternal: true
    });
  }
}
```

**Dados Sincronizados**:
- Identificação das partes
- Objeto do contrato
- Riscos preliminares
- Recomendação de análise completa

---

### 3.4 Conformidade/Due Diligence → Planos de Ação

**Trigger**: Identificação de gaps na avaliação

**Fluxo**:
```typescript
// Gerar plano de ação de conformidade
actionPlans.generateFromCompliance(assessmentId, threshold) {
  const assessment = await getComplianceAssessment(assessmentId);
  const gaps = await identifyGaps(assessment, threshold);
  
  const actions = gaps.map(gap => ({
    organizationId: assessment.organizationId,
    assessmentType: 'compliance',
    assessmentId,
    title: `Implementar: ${gap.domain} - ${gap.question}`,
    description: gap.recommendation,
    priority: calculatePriority(gap.score),
    dueDate: calculateDueDate(gap.priority),
    lgpdReference: gap.lgpdReference
  }));
  
  return await createActionPlans(actions);
}

// Gerar plano de ação de due diligence
actionPlans.generateFromDueDiligence(assessmentId, riskThreshold) {
  const assessment = await getDueDiligenceAssessment(assessmentId);
  const risks = await getRisksAboveThreshold(assessment, riskThreshold);
  
  const actions = risks.map(risk => ({
    organizationId: assessment.organizationId,
    assessmentType: 'third_party',
    assessmentId,
    title: `Mitigar risco: ${risk.title}`,
    description: risk.mitigation,
    priority: risk.classification,
    dueDate: calculateDueDate(risk.classification)
  }));
  
  return await createActionPlans(actions);
}
```

---

### 3.5 Mapeamentos → GED

**Trigger**: Geração de ROT/POP

**Fluxo**:
```typescript
// Gerar e salvar ROT no GED
mapeamento.generateAndSaveROT(processoId) {
  const processo = await getProcesso(processoId);
  const rotContent = await generateROTContent(processo);
  
  // Upload para S3
  const { url, key } = await storagePut(
    `rot/${processo.organizationId}/${processoId}.md`,
    rotContent,
    'text/markdown'
  );
  
  // Criar documento no GED
  const documentId = await ged.createDocument({
    folderId: await getOrCreateROTFolder(processo.organizationId),
    name: `ROT - ${processo.name}.md`,
    fileUrl: url,
    fileKey: key,
    mimeType: 'text/markdown'
  });
  
  // Criar vínculo
  await createMapeamentoGedLink(processoId, documentId, 'rot');
  
  // Notificar DPO
  await notifyDPO(processo.organizationId, 'Novo ROT gerado');
  
  return { documentId, content: rotContent };
}
```

---

### 3.6 Central de Direitos → Mapeamentos

**Trigger**: Solicitação de acesso a dados

**Fluxo**:
```typescript
// Consolidar dados do titular
fase3.consolidateDataFlows(organizationId, titularEmail) {
  // Buscar em mapeamentos
  const mapeamentos = await db.query(`
    SELECT * FROM mapeamento_processos 
    WHERE organization_id = ? 
    AND JSON_CONTAINS(data_subjects, ?)
  `, [organizationId, JSON.stringify(titularEmail)]);
  
  // Buscar em contratos
  const contratos = await db.query(`
    SELECT * FROM contract_analyses 
    WHERE organization_id = ?
    AND analysis_result LIKE ?
  `, [organizationId, `%${titularEmail}%`]);
  
  // Buscar compartilhamento com terceiros
  const terceiros = await db.query(`
    SELECT tp.*, mp.third_party_sharing
    FROM third_parties tp
    JOIN mapeamento_processos mp ON JSON_CONTAINS(mp.third_party_sharing, JSON_OBJECT('id', tp.id))
    WHERE tp.organization_id = ?
  `, [organizationId]);
  
  return {
    mapeamentos,
    contratos,
    terceiros,
    consolidatedReport: generateConsolidatedReport(mapeamentos, contratos, terceiros)
  };
}
```

---

### 3.7 Governança → Notificações

**Trigger**: Documentos/ações atrasados

**Fluxo**:
```typescript
// Processar notificações de atraso
overdueNotification.process(organizationId) {
  // Documentos atrasados
  const overdueDocuments = await getOverdueDocuments(organizationId);
  for (const doc of overdueDocuments) {
    await sendNotification({
      userId: doc.responsibleId,
      type: 'document_overdue',
      title: 'Documento atrasado',
      message: `O documento "${doc.title}" está atrasado desde ${doc.dueDate}`,
      link: `/governanca?tab=plano-continuo`
    });
  }
  
  // Tarefas atrasadas
  const overdueTasks = await getOverdueTasks(organizationId);
  for (const task of overdueTasks) {
    await sendNotification({
      userId: task.responsibleId,
      type: 'task_overdue',
      title: 'Tarefa atrasada',
      message: `A tarefa "${task.title}" está atrasada`,
      link: `/governanca?tab=plano-continuo`
    });
  }
  
  // Notificar DPO sobre totais
  const dpo = await getDPO(organizationId);
  if (overdueDocuments.length > 0 || overdueTasks.length > 0) {
    await sendNotification({
      userId: dpo.id,
      type: 'overdue_summary',
      title: 'Resumo de pendências',
      message: `${overdueDocuments.length} documentos e ${overdueTasks.length} tarefas atrasados`
    });
  }
}
```

---

## 4. Sincronismo em Tempo Real

### 4.1 Arquitetura tRPC

O sincronismo é realizado através de:

1. **Invalidação de Cache**: Após mutações, queries relacionadas são invalidadas
2. **Polling**: Queries críticas usam polling automático
3. **Callbacks**: Ações encadeadas via callbacks de sucesso

```typescript
// Exemplo de invalidação de cache
const createThirdPartyMutation = trpc.thirdParty.create.useMutation({
  onSuccess: () => {
    // Invalidar lista de terceiros
    utils.thirdParty.list.invalidate();
    // Invalidar dashboard
    utils.dashboard.getStats.invalidate();
    // Invalidar due diligence relacionado
    utils.dueDiligence.list.invalidate();
  }
});
```

### 4.2 Eventos de Sincronismo

| Evento | Módulos Afetados |
|--------|------------------|
| Novo terceiro | Dashboard, Due Diligence, Mapeamentos |
| Avaliação concluída | Dashboard, Planos de Ação, Relatórios |
| Contrato analisado | Terceiros, Mapeamentos, Planos de Ação |
| Documento gerado | GED, Governança, Notificações |
| Ticket criado | Dashboard, Notificações, Central de Direitos |

---

## 5. Tabelas de Vinculação

### 5.1 `contract_mapeamento_links`

```sql
CREATE TABLE contract_mapeamento_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contract_analysis_id INT NOT NULL,
  mapeamento_processo_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contract_analysis_id) REFERENCES contract_analyses(id),
  FOREIGN KEY (mapeamento_processo_id) REFERENCES mapeamento_processos(id)
);
```

### 5.2 `mapeamento_ged_links`

```sql
CREATE TABLE mapeamento_ged_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mapeamento_processo_id INT NOT NULL,
  ged_document_id INT NOT NULL,
  document_type ENUM('rot', 'pop', 'evidencia') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mapeamento_processo_id) REFERENCES mapeamento_processos(id),
  FOREIGN KEY (ged_document_id) REFERENCES ged_documents(id)
);
```

### 5.3 `action_plan_evidence`

```sql
CREATE TABLE action_plan_evidence (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action_plan_id INT NOT NULL,
  document_id INT NOT NULL,
  description TEXT,
  added_by_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (action_plan_id) REFERENCES action_plans(id),
  FOREIGN KEY (document_id) REFERENCES ged_documents(id)
);
```

---

## 6. Fluxos de Dados Consolidados

### 6.1 Fluxo de Conformidade Completo

```
┌─────────────────┐
│ 1. Criar        │
│ Avaliação       │
│ Conformidade    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Responder    │
│ Questionário    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Calcular     │
│ Maturidade      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. Identificar  │
│ Gaps            │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. Gerar Plano  │
│ de Ação         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 6. Criar        │
│ Iniciativas     │
│ Governança      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 7. Monitorar    │
│ Progresso       │
└─────────────────┘
```

### 6.2 Fluxo de Terceiros Completo

```
┌─────────────────┐
│ 1. Analisar     │
│ Contrato        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Cadastrar    │
│ Terceiro        │
│ (automático)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Criar        │
│ Avaliação       │
│ Due Diligence   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. Enviar Link  │
│ para Terceiro   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. Terceiro     │
│ Responde        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 6. Calcular     │
│ Risco           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 7. Gerar        │
│ Mapeamento      │
│ (automático)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 8. Criar Plano  │
│ de Ação         │
└─────────────────┘
```

---

## 7. APIs de Integração

### 7.1 Endpoints de Sincronismo

```typescript
// Sincronizar terceiro com contrato
integration.syncThirdPartyFromContract
  Input: { contractAnalysisId: number }
  Output: { thirdPartyId: number, created: boolean }

// Sincronizar mapeamento com contrato
integration.syncMapeamentoFromContract
  Input: { contractAnalysisId: number }
  Output: { mapeamentoId: number }

// Consolidar dados do titular
integration.consolidateTitularData
  Input: { organizationId: number, titularIdentifier: string }
  Output: ConsolidatedData

// Processar notificações pendentes
integration.processNotifications
  Input: { organizationId?: number }
  Output: { sent: number, failed: number }
```

---

## 8. Boas Práticas de Integração

1. **Idempotência**: Operações de sincronismo devem ser idempotentes
2. **Validação**: Validar dados antes de criar vínculos
3. **Logs**: Registrar todas as operações de integração
4. **Rollback**: Implementar rollback em caso de falha
5. **Notificações**: Informar usuários sobre sincronismos automáticos

---

## 9. Troubleshooting

### 9.1 Problemas Comuns

| Problema | Causa | Solução |
|----------|-------|---------|
| Terceiro não criado | CNPJ duplicado | Verificar terceiros existentes |
| Mapeamento incompleto | Dados faltantes no contrato | Completar análise manualmente |
| Notificação não enviada | E-mail inválido | Verificar cadastro do usuário |
| Vínculo não criado | ID inexistente | Verificar integridade dos dados |

### 9.2 Logs de Integração

```typescript
// Estrutura de log
interface IntegrationLog {
  id: number;
  timestamp: Date;
  sourceModule: string;
  targetModule: string;
  action: string;
  sourceId: number;
  targetId: number;
  status: 'success' | 'error';
  errorMessage?: string;
  userId: number;
}
```

---

**Anterior**: [Anexo L - Usuários](./ANEXO_L_USUARIOS.md)  
**Voltar para**: [README Principal](./README.md)
