# Modelo Matemático de Risco v3.1 — Validação de Produção

**Seusdados Consultoria em Gestão de Dados Limitada**
CNPJ 33.899.116/0001-63 | www.seusdados.com
Responsabilidade técnica: Marcelo Fattori

---

## Estado Atual

Todos os problemas P1-P4 descritos no patch foram corrigidos no patch de 2026-02-21 e validados com **115 testes automatizados**.

| Problema | Descrição | Status | Arquivo |
|----------|-----------|--------|---------|
| P1 | mapChecklistToMacroBlocks usa analysisBlock real | Corrigido | server/riskModelV31.ts:95-110 |
| P2 | Escala de risco consistente (conversor central) | Corrigido | server/riskScale.ts |
| P3 | Normalização de checklistStatus (DB vs IA) | Corrigido | server/riskModelV31.ts:286-313 |
| P4 | Cobertura dos 18 macro-blocos | Corrigido | server/riskModelV31.ts:371-399 |
| P5 | Pesos reais do checklist (weight 1-5) | Corrigido | server/riskModelV31.ts:353 |

---

## Arquitetura do Modelo

```
contractChecklist.ts (CHECKLIST_V2: 14 itens com analysisBlock + weight)
        ↓
riskModelV31.ts (mapChecklistToMacroBlocks → inferirRiscoV31)
        ↓
riskScale.ts (conversor central: texto ↔ DB enum)
        ↓
contractLayerSync.ts (recalibração + consistência entre camadas)
        ↓
contractAnalysisQueue.ts (pipeline: phaseRisks persiste governanceMetadata)
```

---

## Mapeamento Oficial: itemNumber → analysisBlock

| Item | Pergunta (resumo) | analysisBlock | Peso | Domínio |
|------|-------------------|---------------|------|---------|
| 1 | Identificação das partes | 1 | 4 | Identificação das Partes |
| 2 | Finalidade e base legal | 2 | 5 | Finalidade e Escopo |
| 3 | Dados pessoais e sensíveis | 4 | 4 | Finalidade e Escopo |
| 4 | Menores e idosos | 5 | 5 | Base Legal e Consentimento |
| 5 | Segurança da informação | 6 | 5 | Segurança Técnica |
| 6 | Subcontratação | 7 | 4 | Segurança Técnica |
| 7 | Direitos do titular | 11 | 4 | Incidentes e Notificação |
| 8 | Incidentes | 12 | 5 | Incidentes e Notificação |
| 9 | Auditoria | 13 | 3 | Retenção e Eliminação |
| 10 | Retenção e eliminação | 16 | 4 | Transferência Internacional |
| 11 | Transferência internacional | 9 | 4 | Direitos do Titular |
| 12 | Governança | 17 | 3 | Governança e Conformidade |
| 13 | Responsabilidade civil | 15 | 4 | Transferência Internacional |
| 14 | Encerramento | 18 | 3 | Governança e Conformidade |

**Blocos sem cobertura direta:** 3, 8, 10, 14 (marcados como `no_checklist_item`).

---

## Fórmula do GapScore

```
G = sum(weight_i * v(status_i)) / sum(weight_i)

v(atende) = 0.0
v(parcial) = 0.5
v(nao_atende) = 1.0
v(nao_identificado) = 0.7
```

O gapScore é calculado por macro-bloco e por domínio (cluster). O riskScore global é a média ponderada dos clusters.

---

## Pisos Jurídicos

| Piso | Condição | Nível Mínimo |
|------|----------|--------------|
| incidentes_ausente | Blocos 10-12 todos nao_atende/nao_identificado | Alto |
| seguranca_ausente | Blocos 6-7 todos nao_atende/nao_identificado | Alto |
| direitos_titular_ausente | Blocos 8-9 todos nao_atende/nao_identificado | Alto |
| transferencia_internacional_ausente | E4=true + blocos 15-16 todos nao_atende | Crítico |
| dados_sensiveis_larga_escala | B3+B4=sim + algum bloco 6-7 nao_atende | Crítico |
| dados_menores | B6/B7=true + >=3 itens nao_atende | Alto |
| retencao_eliminacao_ausente | Blocos 13-14 todos nao_atende/nao_identificado | Médio |

---

## Escala de Risco (riskScale.ts)

| Texto | DB Enum | Label | Prioridade | Score Mínimo |
|-------|---------|-------|------------|--------------|
| critico | 1 | Crítico | Crítica | 80 |
| alto | 2 | Alto | Alta | 60 |
| medio | 3 | Médio | Média | 30 |
| baixo | 4 | Baixo | Baixa | 10 |
| muito_baixo | 5 | Muito Baixo | Baixa | 0 |

---

## Testes Automatizados

| Arquivo | Testes | Cobertura |
|---------|--------|-----------|
| server/riskScale.test.ts | 20 | Conversão bijetiva, normalização, labels, prioridade |
| server/riskModelV31.test.ts | 28 | Mapeamento, pisos, clusters, consistência |
| server/riskModelV31.edge.test.ts | 37 | Cenários de borda P1-P5, validação de produção |
| server/contractLayerSync.test.ts | 30 | Recalibração, labels, documento consolidado |
| **Total** | **115** | |

---

## Validação em Produção

### SQL para verificar consistência

```sql
-- Verificar que governanceMetadata contém riskLevelDb numérico
SELECT id, 
  JSON_EXTRACT(governanceMetadata, '$.riskModelVersion') AS version,
  JSON_EXTRACT(governanceMetadata, '$.riskScore') AS score,
  JSON_EXTRACT(governanceMetadata, '$.riskLevelText') AS levelText,
  JSON_EXTRACT(governanceMetadata, '$.riskLevelDb') AS levelDb
FROM contract_analyses 
WHERE governanceMetadata IS NOT NULL
ORDER BY updatedAt DESC
LIMIT 20;

-- Verificar que riskLevel do DB é consistente com governanceMetadata
SELECT ca.id,
  ca.riskLevel AS dbLevel,
  JSON_EXTRACT(ca.governanceMetadata, '$.riskLevelDb') AS metadataDb,
  JSON_EXTRACT(ca.governanceMetadata, '$.riskLevelText') AS metadataText
FROM contract_analyses ca
WHERE ca.governanceMetadata IS NOT NULL
  AND ca.riskLevel != JSON_EXTRACT(ca.governanceMetadata, '$.riskLevelDb');
-- Se retornar linhas, há inconsistência

-- Verificar cobertura dos 18 macro-blocos
SELECT id,
  JSON_LENGTH(JSON_EXTRACT(governanceMetadata, '$.macroCoverage')) AS macroCoverageCount
FROM contract_analyses
WHERE governanceMetadata IS NOT NULL
  AND JSON_LENGTH(JSON_EXTRACT(governanceMetadata, '$.macroCoverage')) != 18;
-- Se retornar linhas, há análises com cobertura incompleta
```

### Fluxo UI para validação

1. Criar nova análise contratual com contrato de teste
2. Verificar que o checklist mostra 14 itens
3. Responder com mix de "sim", "nao", "parcial"
4. Verificar que o risco calculado reflete os gaps (não é genérico)
5. Verificar que clusters agrupam por domínio (não por item individual)
6. Verificar que pisos jurídicos disparam quando aplicável

---

**Seusdados Consultoria em Gestão de Dados Limitada**
CNPJ 33.899.116/0001-63 | www.seusdados.com
