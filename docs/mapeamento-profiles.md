# Perfis de Mapeamento de Processos

> Documento técnico — Seusdados Consultoria em Gestão de Dados Ltda.
> CNPJ 33.899.116/0001-63 | www.seusdados.com
> Responsabilidade técnica: Marcelo Fattori

---

## Visão Geral

O módulo de Mapeamento de Processos (`/mapeamentos`) suporta **múltiplos perfis por usuário**, com permissões cumulativas. Um mesmo usuário pode possuir simultaneamente os perfis de Líder de Processo e Gestor de Área (ou qualquer combinação), e as permissões são somadas sem conflito.

---

## Perfis Disponíveis

### Líder de Processo (`lider_processo`)

Perfil voltado à **execução e acompanhamento** dos mapeamentos de processos de uma área específica.

| Permissão | Valor |
|-----------|-------|
| Acessar módulo /mapeamentos | Sim |
| Visualizar dashboard | Sim |
| Responder mapeamentos da área | Sim |
| Editar respostas próprias | Sim |
| Delegar mapeamentos | **Não** |
| Aprovar respostas | Não |
| Gerenciar respondentes | Não |
| Criar/editar áreas | Não |
| Exportar relatórios | Não |

### Gestor de Área (`gestor_area`)

Perfil responsável pela **gestão da área** e coordenação dos mapeamentos de processos.

| Permissão | Valor |
|-----------|-------|
| Acessar módulo /mapeamentos | Sim |
| Visualizar dashboard | Sim |
| Responder mapeamentos | Sim |
| Editar respostas | Sim |
| **Delegar mapeamentos** | **Sim** |
| **Revogar delegação** | **Sim** |
| **Aprovar respostas** | **Sim** |
| **Gerenciar respondentes** | **Sim** |
| Gerar ROT/POP | Sim |
| Exportar relatórios | Sim |
| Enviar convites | Sim |
| Gerenciar plano de ação | Sim |
| Criar/editar áreas | Não |
| Excluir áreas | Não |

---

## Perfis Existentes (Comportamento no Módulo)

| Perfil | Acesso | Dashboard | Responder | Delegar | Aprovar | Exportar |
|--------|--------|-----------|-----------|---------|---------|----------|
| admin_global | Total | Sim | Sim | Sim | Sim | Sim |
| consultor | Total | Sim | Sim | Sim | Sim | Sim |
| pmo | Total | Sim | Sim | Sim | Sim | Sim |
| sponsor | Leitura | Sim | Não | Não | Não | Sim |
| dpo_interno | Supervisão | Sim | Não | Não | Sim | Sim |
| comite | Leitura | Sim | Não | Não | Não | Sim |
| usuario | Execução | Sim | Sim | Não | Não | Não |
| terceiro | Sem acesso | Não | Não | Não | Não | Não |

---

## Regras de Combinação de Perfis

1. **Permissões são cumulativas**: cada perfil ativo contribui com suas capabilities, que são somadas via OR lógico.
2. **Gestor de Área + Líder de Processo**: prevalecem as permissões de Gestor de Área para delegação (pois o Líder não tem essa capability, a soma resulta em `true` vindo do Gestor).
3. **Múltiplas áreas**: um usuário pode ter o mesmo perfil em áreas diferentes. As `areaIds` são unificadas.
4. **Perfis inativos são ignorados**: apenas perfis com `isActive = 1` contribuem para as capabilities.
5. **Fallback**: se o usuário não tem perfis atribuídos na tabela `user_profiles`, o sistema usa as capabilities padrão do role principal (ex.: sponsor = leitura, usuario = execução).

---

## Modelo de Dados

### Tabela `user_profiles`

Associação N:N entre usuários e perfis, com escopo por organização e área.

```sql
CREATE TABLE user_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  organization_id INT NOT NULL,
  profile_type ENUM('lider_processo','gestor_area','sponsor','dpo_interno','comite','usuario','terceiro') NOT NULL,
  area_id INT,                    -- Área vinculada (obrigatório para lider_processo e gestor_area)
  is_active TINYINT DEFAULT 1,
  assigned_by INT,                -- Quem atribuiu o perfil
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_org_profile_area (user_id, organization_id, profile_type, area_id)
);
```

### Tabela `mapeamento_delegations`

Registro de delegações de mapeamentos (Gestor de Área para Líder de Processo).

```sql
CREATE TABLE mapeamento_delegations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  area_id INT NOT NULL,
  process_id INT,                 -- NULL = delegação de toda a área
  delegated_by INT NOT NULL,      -- Gestor de Área (user_id)
  delegated_to INT NOT NULL,      -- Líder de Processo (user_id)
  status ENUM('ativa','revogada','concluida') DEFAULT 'ativa',
  notes TEXT,
  delegated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## Endpoints da API

### Router: `userProfiles`

| Endpoint | Método | Capability Exigida | Descrição |
|----------|--------|-------------------|-----------|
| `getMyProfiles` | query | Autenticado | Lista perfis do usuário corrente |
| `getMyMapeamentoCapabilities` | query | Autenticado | Retorna capabilities calculadas |
| `listOrgProfiles` | query | admin/consultor | Lista todos os perfis da organização |
| `assignProfile` | mutation | admin/consultor | Atribui perfil a um usuário |
| `removeProfile` | mutation | admin/consultor | Remove perfil de um usuário |
| `delegateProcess` | mutation | canDelegateProcesses | Delega mapeamento para Líder |
| `revokeDelegation` | mutation | canRevokeDelegation | Revoga delegação ativa |
| `listDelegations` | query | Autenticado | Lista delegações da organização |

---

## Variáveis de Ambiente

Nenhuma variável de ambiente adicional é necessária. O sistema utiliza as tabelas `user_profiles` e `mapeamento_delegations` no banco de dados existente.

---

## Como Atribuir Perfis

### Via Interface (Admin/Consultor)

1. Acesse **Cadastros > Usuários**
2. Selecione o usuário
3. Na seção de perfis, clique em "Atribuir Perfil"
4. Selecione o tipo de perfil e a área (quando aplicável)

### Via API

```typescript
// Atribuir perfil de Gestor de Área
trpc.userProfiles.assignProfile.mutate({
  organizationId: 1,
  userId: 42,
  profileType: "gestor_area",
  areaId: 10,
});

// Atribuir perfil de Líder de Processo
trpc.userProfiles.assignProfile.mutate({
  organizationId: 1,
  userId: 55,
  profileType: "lider_processo",
  areaId: 10,
});
```

### Via SQL (Administração direta)

```sql
-- Atribuir Gestor de Área
INSERT INTO user_profiles (user_id, organization_id, profile_type, area_id, assigned_by)
VALUES (42, 1, 'gestor_area', 10, 1);

-- Atribuir Líder de Processo
INSERT INTO user_profiles (user_id, organization_id, profile_type, area_id, assigned_by)
VALUES (55, 1, 'lider_processo', 10, 1);
```

---

## Fluxo de Delegação

```
Gestor de Área (área 10)
  │
  ├── Delega processo "Coleta de Dados" → Líder de Processo (área 10)
  │     └── Líder responde o mapeamento
  │     └── Gestor aprova a resposta
  │
  └── Delega toda a área → Líder de Processo (área 10)
        └── Líder responde todos os processos da área
        └── Gestor aprova as respostas
```

---

> Seusdados Consultoria em Gestão de Dados Ltda.
> CNPJ 33.899.116/0001-63 | www.seusdados.com
