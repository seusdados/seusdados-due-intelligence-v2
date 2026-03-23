# Módulo CPPD — Documentação de Produção

**Seusdados Consultoria em Gestão de Dados Limitada**
CNPJ 33.899.116/0001-63 | www.seusdados.com
Responsabilidade técnica: Marcelo Fattori

---

## 1. Visão Geral

O módulo CPPD (Comitê de Privacidade e Proteção de Dados) é o componente de governança da plataforma Seusdados Due Diligence. Ele gerencia todo o ciclo de vida de um comitê de privacidade: criação, membros, reuniões, atas, assinaturas, plano anual de atividades, iniciativas e auditoria.

### Componentes Principais

| Componente | Arquivo | Descrição |
|---|---|---|
| Router principal | `server/governancaRouter.ts` | 46 endpoints (reuniões, membros, atas, GED, assinaturas, auditoria) |
| Router de iniciativas | `server/cppdInitiativeRouter.ts` | 18 endpoints (iniciativas, tarefas, documentos, notificações) |
| Permissões | `server/services/cppdPermissions.ts` | 25 capabilities, RBAC contextual v2 (secretariat-aware) |
| GED | `server/providers/ged/index.ts` | Supabase Storage (primário) com fallback S3 local |
| Assinatura | `server/providers/signature/index.ts` | Manual, Gov.br (futuro) |
| PDF de atas | `server/services/cppdMinutesPdf.ts` | PDFKit com identidade visual Seusdados |
| Convites ICS | `server/utils/ics.ts` | RFC 5545, compatível com Google/Outlook/Apple |
| Auditoria | `server/audit/cppdAudit.ts` | Trilha de eventos com 14 tipos de ação |
| Overdue Job | `server/services/cppdOverdueJob.ts` | Verificação diária de ações vencidas |
| Convites de reunião | `server/services/cppdMeetingInvite.ts` | Envio de convites por e-mail com ICS |

---

## 2. Variáveis de Ambiente

### Obrigatórias

```env
# Banco de dados
DATABASE_URL=mysql://user:pass@host:port/database?ssl={"rejectUnauthorized":true}

# Autenticação (produção: Supabase Auth)
JWT_SECRET=<chave-secreta-jwt-256-bits>

# E-mail (Resend)
RESEND_API_KEY=re_xxxxxxxxxx
EMAIL_FROM=noreply@seusdados.com

# URL pública da aplicação (para links em e-mails)
PUBLIC_APP_URL=https://app.seusdados.com
```

### GED (Supabase Storage)

```env
# Supabase Storage — provider primário do GED
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# Bucket customizável (padrão: cppd-documents)
CPPD_SUPABASE_BUCKET=cppd-documents
```

### Opcionais

```env
# Notificações do proprietário
OWNER_OPEN_ID=<id-do-proprietario>
OWNER_NAME=<nome-do-proprietario>

# Assinatura Gov.br (futuro)
GOVBR_CLIENT_ID=<client-id>
GOVBR_CLIENT_SECRET=<client-secret>
GOVBR_REDIRECT_URI=https://app.seusdados.com/api/govbr/callback
```

---

## 3. Configuração do Bucket Supabase

### Passo a passo

1. Acesse o painel do Supabase → Storage
2. Crie um bucket chamado `cppd-documents` (ou o nome definido em `CPPD_SUPABASE_BUCKET`)
3. Configure como **privado** (não público)
4. Adicione a seguinte política RLS:

```sql
-- Permitir leitura/escrita pelo service_role
CREATE POLICY "service_role_full_access"
ON storage.objects
FOR ALL
USING (bucket_id = 'cppd-documents')
WITH CHECK (bucket_id = 'cppd-documents');
```

### Estrutura de pastas (gerada automaticamente)

```
organizations/
  org-{id}/
    cppd/
      {ano}/
        atas/
          ata_reuniao_01.pdf
          ata_reuniao_02.pdf
        deliberacoes/
        gravacoes/
        plano-acao/
```

### Fallback automático

Quando o Supabase não está configurado ou falha, o sistema automaticamente utiliza o provider local (S3 Manus). O log exibe:

```
[WARN] [GED] Supabase solicitado mas não configurado. Usando provider local como fallback direto.
[INFO] [GED] Provider Local (S3 Manus) ativado
```

---

## 4. Enforcement de Permissões

### Cobertura

| Router | Total de endpoints | Com enforcement | Sem enforcement |
|---|---|---|---|
| governancaRouter | 46 | 45 | 1 (getMyCapabilities — auto-serviço) |
| cppdInitiativeRouter | 18 | 18 | 0 |
| **Total** | **64** | **63** | **1** |

### Endpoint sem enforcement granular

| Endpoint | Justificativa |
|---|---|
| `getMyCapabilities` | Retorna as próprias capabilities do usuário (auto-serviço, protectedProcedure) |

### Como funciona o enforcement

```typescript
// Em cada endpoint protegido:
const userCtx = {
  userId: ctx.user.id,
  systemRole: ctx.user.role,
  organizationId: ctx.user.organizationId
};
await enforceCppdCapability(userCtx, 'canCreateMeeting', input.organizationId);
// Se o usuário não tem a capability, lança TRPCError FORBIDDEN
```

---

## 5. Fluxo de Reunião

```
1. Criar reunião (canCreateMeeting)
2. Editar pauta (canEditAgenda)
3. Enviar convites ICS (canSendInvitations)
4. Registrar presença (canManageAttendance)
5. Gerar ata via IA (canGenerateMinutes)
6. Aprovar ata (canApproveMinutes)
7. Gerar PDF da ata (canGenerateMinutes)
8. Armazenar no GED (canStoreInGed)
9. Enviar para assinatura (canSendForSignature)
10. Upload do documento assinado (canUploadSignedDocument)
11. Finalizar assinatura (canFinalizeSignature)
```

---

## 6. Testes

### Executar testes de hardening

```bash
npx vitest run server/hardening.test.ts
```

### Cobertura dos testes

| Categoria | Testes | Descrição |
|---|---|---|
| Permissões v2 (hardening.test.ts) | 14 | admin, consultor, sponsor read-only, sponsor+coord+cliente, dpo_interno read-only, usuário, membro ativo, secretária (seusdados vs cliente), coordenador (seusdados vs cliente), DPO comitê, membro inativo |
| GED Fallback | 4 | Fallback para local, bucket parametrizável, provider noop, caminhos GED |
| ICS | 5 | Campos obrigatórios, attendees com line folding, VALARM, cancelamento, UID |
| Enforcement 5 endpoints (cppdFinalization.test.ts) | 13 | canViewOwnTasks (8 cenários), canRunOverdueCheck (5 cenários) |
| E2E Fluxo Reunião | 11 | Criar, convidar ICS, presença, ata PDF, assinatura manual+govbr |
| Gov.br Provider | 5 | Provider manual, govbr, status, finalize, env toggle |
| **Total** | **51** | Todos passando |

### Executar todos os testes do projeto

```bash
npx vitest run
```

---

## 7. Resolução de Problemas

### E-mails não são enviados

1. Verificar `RESEND_API_KEY` está configurada
2. Verificar `EMAIL_FROM` é um domínio verificado no Resend
3. Verificar logs: `[INFO] Convite enviado para: email@exemplo.com`

### GED não armazena documentos

1. Verificar `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`
2. Verificar se o bucket `cppd-documents` existe
3. Verificar política RLS do bucket
4. Se Supabase falhar, o sistema usa fallback local automaticamente

### Ata PDF não gera

1. Verificar se PDFKit está instalado: `pnpm list pdfkit`
2. Verificar se a fonte Helvetica está disponível (padrão do PDFKit)
3. Verificar logs de erro no endpoint `generatePremiumAta`

### Convites ICS não aparecem no calendário

1. Verificar se o e-mail contém o anexo `convite.ics` com `content-type: text/calendar`
2. Verificar se DTSTART e DTEND estão no formato correto (YYYYMMDDTHHMMSSZ)
3. Testar o ICS manualmente: salvar como `.ics` e abrir no calendário

### Permissão negada (FORBIDDEN)

1. Verificar o role do usuário no sistema (`ctx.user.role`)
2. Verificar se o usuário é membro ativo do comitê
3. Verificar a capability necessária no endpoint (ver seção 4)
4. Usar endpoint `getMyCapabilities` para verificar capabilities do usuário

---

## 8. Checklist de Validação Manual

### Pré-requisitos

- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados migrado (`pnpm db:push`)
- [ ] Bucket Supabase criado com política RLS

### Fluxo de Reunião

- [ ] Criar reunião com pauta
- [ ] Adicionar participantes
- [ ] Enviar convites (verificar e-mail com ICS)
- [ ] Registrar presença
- [ ] Gerar ata via IA
- [ ] Aprovar ata
- [ ] Gerar PDF da ata (verificar identidade visual)
- [ ] Armazenar no GED
- [ ] Enviar para assinatura
- [ ] Upload do documento assinado
- [ ] Finalizar assinatura

### Permissões (v2 — secretariat-aware)

- [ ] Usuário sem capability recebe erro FORBIDDEN
- [ ] Admin/consultor tem acesso total
- [ ] Sponsor sem membro: somente read-only (não pode criar reunião)
- [ ] Secretária com secretariat=cliente pode criar reuniões e gerar atas
- [ ] Secretária com secretariat=seusdados NÃO pode criar reuniões
- [ ] Membro inativo não pode criar reuniões
- [ ] Terceiro não tem nenhuma capability

### GED

- [ ] Upload de documento no Supabase
- [ ] Download de documento do Supabase
- [ ] Fallback para S3 local quando Supabase falha

### Plano Anual

- [ ] Instanciar plano anual a partir de template
- [ ] Atualizar status de atividades
- [ ] Atualizar entregáveis

---

**Seusdados Consultoria em Gestão de Dados Limitada**
CNPJ 33.899.116/0001-63 | www.seusdados.com
Responsabilidade técnica: Marcelo Fattori
