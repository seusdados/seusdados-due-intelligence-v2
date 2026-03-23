# Verificação — CPPD RBAC Superpatch

**Data**: 23/02/2026  
**Autor**: Seusdados Consultoria em Gestão de Dados Limitada  
**CNPJ**: 33.899.116/0001-63  
**Responsabilidade técnica**: Marcelo Fattori

---

## 1. Resumo

Este documento verifica a implementação completa do sistema RBAC (Controle de Acesso Baseado em Papéis) para o módulo CPPD (Comitê de Proteção e Privacidade de Dados) da plataforma Seusdados Due Diligence.

## 2. Componentes Implementados

### Parte A — Modelo de Secretaria do CPPD

| Item | Descrição | Arquivo | Status |
|------|-----------|---------|--------|
| RA.1 | Persistência de secretaria em `governanca_cppd_configs.notes` | `server/services/cppdPermissions.ts` | Implementado |
| RA.2 | Seleção de modelo de secretaria na configuração do CPPD | `client/src/pages/Governanca.tsx` | Implementado |
| RA.3 | Regra: `seusdados`/`grupo` bloqueia operações de sponsor/standard | `server/services/cppdPermissions.ts` | Implementado |

**Modelos suportados**:
- `seusdados` — Secretaria executada pela Seusdados (padrão)
- `grupo` — Secretaria executada por empresa do grupo
- `cliente` — Secretaria executada pelo próprio cliente

### Parte B — Papéis Contextuais

| Item | Descrição | Arquivo | Status |
|------|-----------|---------|--------|
| RB.1 | Papéis COORDENADOR/SECRETARIO/MEMBRO/CONVIDADO | `server/services/cppdPermissions.ts` | Implementado |
| RB.2 | Derivação automática de papel contextual | `deriveCppdRole()` | Implementado |

**Hierarquia de papéis contextuais**:
1. `COORDENADOR_CPPD` — Coordenador do comitê (flags: `isCoordinator`)
2. `SECRETARIO_CPPD` — Secretário do comitê (flags: `isSecretary`)
3. `MEMBRO_CPPD` — Membro votante ou não-votante
4. `CONVIDADO_CPPD` — Convidado sem poder de voto

### Parte C — Motor de 25 Capabilities

| Item | Descrição | Arquivo | Status |
|------|-----------|---------|--------|
| RC.1 | `computeCppdCapabilities()` | `server/services/cppdPermissions.ts` | Implementado |
| RC.2 | Capabilities expostas em `overview` e `getMyCapabilities` | `server/governancaRouter.ts` | Implementado |
| RC.3 | `enforceCppdCapability()` para enforcement | `server/services/cppdPermissions.ts` | Implementado |

**Lista das 25 capabilities**:

| Capability | Descrição |
|------------|-----------|
| `canConfigureCppd` | Configurar o CPPD (ano, regime, secretaria) |
| `canManageMembers` | Adicionar/remover membros do comitê |
| `canCreateMeeting` | Criar reuniões |
| `canEditAgenda` | Editar pauta de reuniões |
| `canGenerateMinutes` | Gerar ata com IA |
| `canApproveMinutes` | Aprovar ata gerada |
| `canSendForSignature` | Enviar ata para assinatura |
| `canUploadSignedDocument` | Enviar documento assinado |
| `canFinalizeSignature` | Finalizar processo de assinatura |
| `canCreateAction` | Criar itens de ação |
| `canUpdateActionStatus` | Atualizar status de ações |
| `canDeleteAction` | Excluir ações |
| `canStoreInGed` | Salvar documentos no GED |
| `canDownloadFromGed` | Baixar documentos do GED |
| `canSendInvitations` | Enviar convites para reuniões |
| `canCancelInvitations` | Cancelar convites |
| `canRunOverdueCheck` | Executar verificação de atrasos |
| `canViewAuditTrail` | Visualizar trilha de auditoria |
| `canManagePlanoAnual` | Gerenciar plano anual |
| `canUpdateAtividades` | Atualizar atividades do plano |
| `canViewSponsorOverview` | Visualizar painel do sponsor |
| `canViewOrgOverdue` | Visualizar atrasos da organização |
| `canViewOwnTasks` | Visualizar próprias tarefas |
| `canManageAttendance` | Gerenciar presença em reuniões |
| `canTranscribeMeeting` | Transcrever reuniões |

### Parte D — Enforcement Backend

| Item | Descrição | Status |
|------|-----------|--------|
| RD.1 | Enforcement em todos endpoints mutáveis | Implementado |
| RD.2 | Self-attendance vs edit-all-attendance | Implementado |
| RD.3 | createActionItem com restrição | Implementado |
| RD.4 | Overdue check restrito por modelo | Implementado |

### Parte E — Frontend Consistente

| Item | Descrição | Status |
|------|-----------|--------|
| RE.1 | Card de Secretaria + modal de configuração | Implementado |
| RE.2 | MeetingRoom com botões condicionais | Implementado |
| RE.3 | Botões de ata, convites, assinatura, GED condicionais | Implementado |

### Parte F — Testes

| Arquivo | Testes | Status |
|---------|--------|--------|
| `server/services/cppdServices.test.ts` | 9 testes | Passando |
| `server/cppdFinalization.test.ts` | 29 testes | Passando |
| **Total** | **38 testes** | **Todos passando** |

## 3. Matriz de Capabilities por Cenário

| Cenário | Papel Global | Membro? | Papel Contextual | Secretaria | Resultado |
|---------|-------------|---------|------------------|------------|-----------|
| 1 | `admin_global` | N/A | N/A | Qualquer | TODAS as capabilities |
| 2 | `consultor` | N/A | N/A | Qualquer | TODAS as capabilities |
| 3 | `sponsor` | Não | — | Qualquer | Somente leitura |
| 4 | `sponsor` | Sim | MEMBRO_CPPD | `seusdados` | Base (sem operacionais) |
| 5 | `sponsor` | Sim | COORDENADOR_CPPD | `cliente` | TODAS (operacional completo) |
| 6 | `terceiro` | N/A | N/A | Qualquer | NENHUMA capability |

## 4. Arquivos Modificados

### Backend
- `server/services/cppdPermissions.ts` — Motor de capabilities v2 (352 linhas)
- `server/governancaRouter.ts` — Endpoints com enforcement + updateSecretariat + overview com capabilities
- `server/governancaService.ts` — Aceita notes como parâmetro na configuração

### Frontend
- `client/src/pages/Governanca.tsx` — Seleção de secretaria + card de secretaria + capabilities
- `client/src/pages/GovernancaMeetingRoom.tsx` — Botões condicionais por capability
- `client/src/App.tsx` — Rota /governanca/plano/:planoId corrigida

### Testes
- `server/cppdFinalization.test.ts` — 29 testes (enforcement + E2E + Gov.br)
- `server/services/cppdServices.test.ts` — 9 testes (PDF + e-mail + auditoria)

### Documentação
- `docs/VERIFY_CPPD_RBAC_SUPERPATCH.md` — Este documento

## 5. Validação

```
TypeScript (governança): 0 erros
Testes CPPD: 38/38 passando
Build: OK
```

---

**Seusdados Consultoria em Gestão de Dados Limitada**  
CNPJ 33.899.116/0001-63 | www.seusdados.com  
Responsabilidade técnica: Marcelo Fattori
