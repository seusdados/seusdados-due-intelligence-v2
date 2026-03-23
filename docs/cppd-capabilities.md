# Módulo CPPD — Matriz de Capabilities (v2 — RBAC Contextual)

**Seusdados Consultoria em Gestão de Dados Limitada**
CNPJ 33.899.116/0001-63 | www.seusdados.com
Responsabilidade técnica: Marcelo Fattori

---

## 1. Visão Geral do Sistema de Permissões

O módulo CPPD utiliza um sistema de permissões baseado em **capabilities** (capacidades) calculadas a partir de **três fatores**:

1. **Role global** (`ctx.user.role`): papel do usuário na plataforma
2. **Papel contextual no CPPD** (`cppdRole`): derivado dos flags do membro
3. **Modelo de Secretaria** (`secretariat.model`): quem opera o CPPD da organização

### Roles Globais da Plataforma

| Role | Descrição | Nível de acesso CPPD |
|---|---|---|
| `admin_global` | Administrador global | TODAS as capabilities |
| `pmo` | Escritório de projetos | TODAS as capabilities |
| `consultor` | Consultor Seusdados | TODAS as capabilities |
| `consultor_par` | Consultor parceiro | TODAS as capabilities |
| `sponsor` | Patrocinador da organização | Read-only OU operacional (depende de secretariat + cppdRole) |
| `dpo_interno` | Encarregado de dados interno | Read-only OU operacional (depende de secretariat + cppdRole) |
| `comite` | Membro do comitê | Read-only OU operacional (depende de secretariat + cppdRole) |
| `usuario` | Usuário comum | Read-only OU operacional (depende de secretariat + cppdRole) |
| `terceiro` | Terceiro / externo | Nenhum acesso |

### Papéis Contextuais do CPPD (cppdRole)

| cppdRole | Derivado de | Descrição |
|---|---|---|
| `COORDENADOR_CPPD` | `isCoordinator = true` | Coordenador do comitê |
| `SECRETARIO_CPPD` | `isSecretary = true` | Secretário(a) do comitê |
| `MEMBRO_CPPD` | Membro ativo sem flags especiais | Membro regular |
| `CONVIDADO_CPPD` | Participante convidado | Acesso mínimo |

### Modelos de Secretaria

| Modelo | Descrição | Efeito sobre COORDENADOR/SECRETARIO |
|---|---|---|
| `seusdados` | Seusdados opera o CPPD (padrão) | Coordenador/Secretário do cliente **NÃO** operam |
| `grupo` | Grupo econômico opera o CPPD | Coordenador/Secretário do cliente **NÃO** operam |
| `cliente` | O próprio cliente opera o CPPD | Coordenador/Secretário do cliente **OPERAM** |

---

## 2. Regras de Cálculo (Motor v2)

```
SE globalRole ∈ {admin_global, pmo, consultor, consultor_par}:
  → TODAS as capabilities = true

SE globalRole ∈ {sponsor, dpo_interno, comite, usuario} E NÃO é membro ativo:
  → Somente read-only: canViewOwnTasks, canViewSponsorOverview, canDownloadFromGed

SE é membro ativo:
  → Capabilities base de membro (sempre):
    canDownloadFromGed, canViewSponsorOverview, canViewOrgOverdue,
    canViewOwnTasks, canCreateAction, canUpdateActionStatus, canUpdateAtividades
  → Se cppdRole = COORDENADOR_CPPD ou SECRETARIO_CPPD:
    canViewAuditTrail = true
  → Se secretariat.model = 'cliente' E cppdRole ∈ {COORDENADOR_CPPD, SECRETARIO_CPPD}:
    → TODAS as capabilities operacionais = true

SE globalRole = 'terceiro':
  → NENHUMA capability
```

---

## 3. Matriz Completa de Capabilities

### Legenda

- **S** = Sim (capability ativa)
- **-** = Não (capability inativa)
- **R** = Read-only (somente leitura)
- **C** = Somente se secretariat.model = 'cliente'

| Capability | admin/consultor | CLIENT_ROLE sem membro | Membro ativo | Coord/Sec (seusdados) | Coord/Sec (cliente) | terceiro |
|---|---|---|---|---|---|---|
| **Configuração** | | | | | | |
| canConfigureCppd | S | - | - | - | S | - |
| canManageMembers | S | - | - | - | S | - |
| **Reuniões** | | | | | | |
| canCreateMeeting | S | - | - | - | S | - |
| canEditAgenda | S | - | - | - | S | - |
| canGenerateMinutes | S | - | - | - | S | - |
| canApproveMinutes | S | - | - | - | S | - |
| canSendForSignature | S | - | - | - | S | - |
| canUploadSignedDocument | S | - | - | - | S | - |
| canFinalizeSignature | S | - | - | - | S | - |
| **Ações** | | | | | | |
| canCreateAction | S | - | S | S | S | - |
| canUpdateActionStatus | S | - | S | S | S | - |
| canDeleteAction | S | - | - | - | S | - |
| **GED** | | | | | | |
| canStoreInGed | S | - | - | - | S | - |
| canDownloadFromGed | S | R | S | S | S | - |
| **Convites** | | | | | | |
| canSendInvitations | S | - | - | - | S | - |
| canCancelInvitations | S | - | - | - | S | - |
| **Overdue Job** | | | | | | |
| canRunOverdueCheck | S | - | - | - | S | - |
| **Auditoria** | | | | | | |
| canViewAuditTrail | S | - | - | S | S | - |
| **Plano Anual** | | | | | | |
| canManagePlanoAnual | S | - | - | - | S | - |
| canUpdateAtividades | S | - | S | S | S | - |
| **Dashboard / Consultas** | | | | | | |
| canViewSponsorOverview | S | R | S | S | S | - |
| canViewOrgOverdue | S | - | S | S | S | - |
| canViewOwnTasks | S | R | S | S | S | - |
| **Presença** | | | | | | |
| canManageAttendance | S | - | - | - | S | - |
| **Transcrição** | | | | | | |
| canTranscribeMeeting | S | - | - | - | S | - |

---

## 4. Mapeamento Endpoint → Capability

### governancaRouter.ts (46 endpoints) — 100% cobertos

| Endpoint | Tipo | Capability | Descrição |
|---|---|---|---|
| overview | query | canViewSponsorOverview | Visão geral do comitê |
| configureCppd | mutation | canConfigureCppd | Configurar CPPD |
| listMembers | query | canDownloadFromGed | Listar membros |
| addMember | mutation | canManageMembers | Adicionar membro |
| meetingRoom | query | canDownloadFromGed | Dados da sala de reunião |
| createActionItem | mutation | canCreateAction | Criar item de ação |
| updateActionStatus | mutation | canUpdateActionStatus | Atualizar status de ação |
| programDashboard | query | canViewSponsorOverview | Painel do programa |
| generateMinutes | mutation | canGenerateMinutes | Gerar ata via IA |
| updateMember | mutation | canManageMembers | Atualizar membro |
| removeMember | mutation | canManageMembers | Remover membro |
| sendMeetingInvitation | mutation | canSendInvitations | Enviar convite (singular) |
| listPlanoAnualTemplates | query | canViewOwnTasks | Listar templates |
| getPlanoAnualTemplateByType | query | canViewOwnTasks | Obter template por tipo |
| listPlanosAnuaisOrganizacao | query | canViewSponsorOverview | Listar planos anuais |
| instanciarPlanoAnual | mutation | canManagePlanoAnual | Instanciar plano anual |
| getPlanoAnualCompleto | query | canViewSponsorOverview | Obter plano completo |
| updateAtividadeStatus | mutation | canUpdateActionStatus | Atualizar atividade |
| updateAtividadeAssignee | mutation | canUpdateActionStatus | Atualizar responsável |
| updateEntregavelStatus | mutation | canUpdateActionStatus | Atualizar entregável |
| updateEntregavelDocument | mutation | canStoreInGed | Atualizar documento |
| updateMesStatus | mutation | canManagePlanoAnual | Atualizar mês |
| transcribeReuniao | mutation | canGenerateMinutes | Transcrever reunião |
| updateParticipantAttendance | mutation | canManageAttendance | Registrar presença |
| listMeetingParticipants | query | canDownloadFromGed | Listar participantes |
| addMeetingParticipant | mutation | canManageMembers | Adicionar participante |
| attendanceReport | query | canViewSponsorOverview | Relatório de presença |
| generatePremiumAta | mutation | canGenerateMinutes | Gerar PDF da ata |
| checkLowAttendance | query | canManageAttendance | Verificar baixa presença |
| sendLowAttendanceAlert | mutation | canManageAttendance | Enviar alerta presença |
| approveMinutes | mutation | canApproveMinutes | Aprovar ata |
| storeMinutesInGed | mutation | canStoreInGed | Armazenar ata no GED |
| getMinutesStatus | query | canDownloadFromGed | Status da ata |
| sendForSignature | mutation | canSendForSignature | Enviar para assinatura |
| uploadSignedDocument | mutation | canSendForSignature | Upload assinado |
| finalizeSignature | mutation | canFinalizeSignature | Finalizar assinatura |
| listSignatureProviders | query | canViewOwnTasks | Listar providers |
| listAuditEvents | query | canViewAuditTrail | Listar eventos auditoria |
| getAuditStats | query | canViewAuditTrail | Estatísticas auditoria |
| getMyOpenTasks | query | canViewOwnTasks | Minhas tarefas |
| getSponsorOverview | query | canViewSponsorOverview | Visão do sponsor |
| getOrgOverdue | query | canViewSponsorOverview | Itens vencidos |
| runOverdueCheckNow | mutation | canRunOverdueCheck | Executar verificação |
| getOverdueJobStatus | query | canRunOverdueCheck | Status do job |
| getMyCapabilities | query | *(protectedProcedure)* | Minhas capabilities |
| sendMeetingInvitations | mutation | canSendInvitations | Enviar convites (lote) |

### cppdInitiativeRouter.ts (18 endpoints) — 100% cobertos

| Endpoint | Tipo | Capability | Descrição |
|---|---|---|---|
| list | query | canViewOwnTasks | Listar iniciativas |
| getById | query | canViewOwnTasks | Obter iniciativa |
| create | mutation | canManagePlanoAnual | Criar iniciativa |
| update | mutation | canUpdateAtividades | Atualizar iniciativa |
| delete | mutation | canManagePlanoAnual | Deletar iniciativa |
| getStats | query | canViewOwnTasks | Estatísticas |
| getRoadmap | query | canViewOwnTasks | Roadmap |
| checkOverdue | query | canViewSponsorOverview | Verificar atrasos |
| listTasks | query | canViewOwnTasks | Listar tarefas |
| createTask | mutation | canUpdateAtividades | Criar tarefa |
| updateTask | mutation | canUpdateAtividades | Atualizar tarefa |
| deleteTask | mutation | canManagePlanoAnual | Deletar tarefa |
| listDocuments | query | canUpdateAtividades | Listar documentos |
| addDocument | mutation | canUpdateAtividades | Adicionar documento |
| removeDocument | mutation | canManagePlanoAnual | Remover documento |
| sendOverdueNotifications | mutation | canRunOverdueCheck | Enviar notificações |
| getApproachingDeadline | query | canViewSponsorOverview | Prazos próximos |
| getNotificationHistory | query | canViewAuditTrail | Histórico notificações |

---

## 5. Persistência da Secretaria

A configuração da secretaria é armazenada no campo `notes` (JSON) da tabela `governanca_cppd_configs`:

```json
{
  "cppdSecretariat": {
    "model": "cliente",
    "providerName": "Empresa XYZ",
    "providerOrganizationId": 42,
    "coordinatorUserId": 15
  }
}
```

### Funções auxiliares

- `parseSecretariat(notes)` — extrai o modelo de secretaria do JSON
- `serializeSecretariat(existingNotes, secretariat)` — serializa preservando outros dados
- `deriveCppdRole(member)` — deriva o papel contextual a partir dos flags

---

## 6. Endpoint de Consulta de Capabilities

O frontend pode consultar as capabilities do usuário logado via:

```typescript
const { data: caps } = trpc.governanca.getMyCapabilities.useQuery({
  organizationId: user.organizationId,
});

// Exemplo de uso condicional na UI:
{caps?.canCreateMeeting && (
  <Button onClick={handleCreateMeeting}>Nova Reunião</Button>
)}
```

O endpoint `getMyCapabilities` já busca automaticamente o membro e a secretaria do banco, retornando as capabilities calculadas pelo motor v2.

---

**Seusdados Consultoria em Gestão de Dados Limitada**
CNPJ 33.899.116/0001-63 | www.seusdados.com
Responsabilidade técnica: Marcelo Fattori
