# Anexo L - Usuários e Organizações

**Seusdados Due Diligence - Documentação Técnica**

---

## 1. Visão Geral

O módulo de **Usuários e Organizações** gerencia toda a estrutura de acesso à plataforma, incluindo autenticação via OAuth, controle de permissões baseado em papéis (RBAC) e gestão hierárquica de organizações.

### Funcionalidades Principais

- Autenticação via Manus OAuth
- Gestão de usuários com papéis
- Estrutura hierárquica de organizações
- Controle de acesso granular (RBAC)
- Convites por e-mail
- Perfil de usuário personalizável
- Auditoria de acessos
- Multi-tenancy por organização

---

## 2. Arquitetura do Módulo

### 2.1 Componentes Frontend

| Arquivo | Descrição |
|---------|-----------|
| `Organizacoes.tsx` | Listagem de organizações |
| `OrganizacaoDetalhes.tsx` | Detalhes da organização |
| `Usuarios.tsx` | Gestão de usuários |
| `Perfil.tsx` | Perfil do usuário |
| `Convites.tsx` | Gestão de convites |

### 2.2 Componentes Backend

| Arquivo | Descrição |
|---------|-----------|
| `authRouter.ts` | Autenticação OAuth |
| `usersRouter.ts` | Gestão de usuários |
| `organizationsRouter.ts` | Gestão de organizações |
| `invitesRouter.ts` | Sistema de convites |

---

## 3. Modelo de Dados

### 3.1 Tabela `users`

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  open_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  role ENUM('admin', 'user') DEFAULT 'user',
  is_active TINYINT DEFAULT 1,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 3.2 Tabela `organizations`

```sql
CREATE TABLE organizations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) UNIQUE,
  segment VARCHAR(100),
  logo_url VARCHAR(500),
  primary_color VARCHAR(7) DEFAULT '#6366f1',
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  is_active TINYINT DEFAULT 1,
  created_by_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_id) REFERENCES users(id)
);
```

### 3.3 Tabela `organization_users`

```sql
CREATE TABLE organization_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('admin_global', 'consultor', 'cliente') NOT NULL,
  is_dpo TINYINT DEFAULT 0,
  is_sponsor TINYINT DEFAULT 0,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_org_user (organization_id, user_id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 3.4 Tabela `invites`

```sql
CREATE TABLE invites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  role ENUM('admin_global', 'consultor', 'cliente') NOT NULL,
  token VARCHAR(64) UNIQUE NOT NULL,
  status ENUM('pending', 'accepted', 'expired', 'cancelled') DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL,
  invited_by_id INT NOT NULL,
  accepted_at TIMESTAMP,
  accepted_by_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (invited_by_id) REFERENCES users(id),
  FOREIGN KEY (accepted_by_id) REFERENCES users(id)
);
```

### 3.5 Tabela `audit_logs`

```sql
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  organization_id INT,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id INT,
  details JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);
```

---

## 4. Papéis e Permissões (RBAC)

### 4.1 Papéis do Sistema

| Papel | Código | Descrição |
|-------|--------|-----------|
| Admin Global | `admin_global` | Acesso total à plataforma |
| Consultor | `consultor` | Acesso a todas as organizações |
| Cliente | `cliente` | Acesso apenas à própria organização |

### 4.2 Matriz de Permissões

| Recurso | admin_global | consultor | cliente |
|---------|--------------|-----------|---------|
| **Organizações** |
| Criar | ✓ | ✓ | ✗ |
| Editar | ✓ | ✓ | ✗ |
| Excluir | ✓ | ✗ | ✗ |
| Ver todas | ✓ | ✓ | ✗ |
| Ver própria | ✓ | ✓ | ✓ |
| **Usuários** |
| Convidar | ✓ | ✓ | ✗ |
| Editar papel | ✓ | ✗ | ✗ |
| Remover | ✓ | ✓ | ✗ |
| **Avaliações** |
| Criar | ✓ | ✓ | ✗ |
| Editar | ✓ | ✓ | ✗ |
| Ver | ✓ | ✓ | ✓ |
| **Terceiros** |
| Criar | ✓ | ✓ | ✗ |
| Editar | ✓ | ✓ | ✗ |
| Ver | ✓ | ✓ | ✓ |
| **Tickets** |
| Criar | ✓ | ✓ | ✓ |
| Atribuir | ✓ | ✓ | ✗ |
| Fechar | ✓ | ✓ | ✗ |
| **Governança** |
| Configurar CPPD | ✓ | ✓ | ✗ |
| Criar iniciativas | ✓ | ✓ | ✓ (DPO) |
| Ver | ✓ | ✓ | ✓ |
| **Relatórios** |
| Gerar | ✓ | ✓ | ✓ |
| Ver todos | ✓ | ✓ | ✗ |

### 4.3 Implementação de Permissões

```typescript
// Middleware de verificação de papel
function requireRole(...allowedRoles: Role[]) {
  return (ctx: Context) => {
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    
    const userRole = ctx.user.organizationRole || ctx.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    
    return ctx;
  };
}

// Uso em procedures
const adminProcedure = protectedProcedure.use(requireRole('admin_global'));
const consultorProcedure = protectedProcedure.use(requireRole('admin_global', 'consultor'));
```

---

## 5. Autenticação OAuth

### 5.1 Fluxo de Autenticação

```
┌─────────────────┐
│ 1. Usuário      │
│ clica em Login  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Redirect     │
│ para Manus OAuth│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Usuário      │
│ autentica       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. Callback     │
│ com código      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. Trocar código│
│ por token       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 6. Criar/atualizar│
│ usuário local   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 7. Criar sessão │
│ (cookie JWT)    │
└─────────────────┘
```

### 5.2 Configuração OAuth

```typescript
// Variáveis de ambiente
const oauthConfig = {
  clientId: process.env.VITE_APP_ID,
  serverUrl: process.env.OAUTH_SERVER_URL,
  portalUrl: process.env.VITE_OAUTH_PORTAL_URL,
  callbackUrl: `${process.env.APP_URL}/api/oauth/callback`
};

// URL de login
function getLoginUrl(): string {
  return `${oauthConfig.portalUrl}/login?app_id=${oauthConfig.clientId}`;
}
```

---

## 6. Sistema de Convites

### 6.1 Fluxo de Convite

```
┌─────────────────┐
│ 1. Admin cria   │
│ convite         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Sistema gera │
│ token único     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. E-mail       │
│ enviado         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. Usuário      │
│ clica no link   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. Validar      │
│ token           │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────────────┐
│Usuário│ │ Novo usuário  │
│existe │ │ (criar conta) │
└───┬───┘ └───────┬───────┘
    │             │
    └──────┬──────┘
           │
           ▼
┌─────────────────┐
│ 6. Vincular à   │
│ organização     │
└─────────────────┘
```

### 6.2 Template de E-mail

```html
<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
  <header style="text-align: center; padding: 20px;">
    <img src="{{organizationLogo}}" alt="Logo" style="max-height: 60px;" />
  </header>
  
  <main style="padding: 20px;">
    <h1>Você foi convidado!</h1>
    
    <p>Olá,</p>
    
    <p>
      <strong>{{invitedBy}}</strong> convidou você para participar da 
      organização <strong>{{organizationName}}</strong> na plataforma 
      Seusdados Due Diligence.
    </p>
    
    <p>
      Você terá acesso como <strong>{{roleName}}</strong>.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{inviteUrl}}" style="
        background: #6366f1;
        color: white;
        padding: 12px 24px;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 500;
      ">
        Aceitar Convite
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">
      Este convite expira em {{expiresIn}} dias.
    </p>
  </main>
  
  <footer style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p>Seusdados Due Diligence</p>
  </footer>
</div>
```

---

## 7. Gestão de Organizações

### 7.1 Estrutura Hierárquica

```
┌─────────────────────────────────────────┐
│           SEUSDADOS (Admin Global)       │
└─────────────────────────────────────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
    ▼               ▼               ▼
┌─────────┐   ┌─────────┐   ┌─────────┐
│ Org A   │   │ Org B   │   │ Org C   │
│(Cliente)│   │(Cliente)│   │(Cliente)│
└─────────┘   └─────────┘   └─────────┘
```

### 7.2 Configurações da Organização

```typescript
interface OrganizationSettings {
  // Identidade
  name: string;
  cnpj?: string;
  segment?: string;
  logoUrl?: string;
  primaryColor?: string;
  
  // Contato
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  website?: string;
  
  // Configurações
  defaultLanguage?: string;
  timezone?: string;
  dateFormat?: string;
  
  // Funcionalidades
  enabledModules?: string[];
  customFields?: CustomField[];
}
```

---

## 8. Endpoints tRPC

### 8.1 Autenticação

```typescript
// Obter usuário atual
auth.me
  Output: User | null

// Logout
auth.logout
  Output: { success: boolean }
```

### 8.2 Usuários

```typescript
// Listar usuários
users.list
  Input: { organizationId?: number, role?: string }
  Output: User[]

// Obter usuário
users.getById
  Input: { userId: number }
  Output: User

// Atualizar perfil
users.updateProfile
  Input: { name?: string, avatarUrl?: string }
  Output: { success: boolean }

// Alterar papel
users.updateRole
  Input: { userId: number, organizationId: number, role: string }
  Output: { success: boolean }

// Remover de organização
users.removeFromOrganization
  Input: { userId: number, organizationId: number }
  Output: { success: boolean }
```

### 8.3 Organizações

```typescript
// Listar organizações
organizations.list
  Input: { search?: string, segment?: string }
  Output: Organization[]

// Criar organização
organizations.create
  Input: {
    name: string,
    cnpj?: string,
    segment?: string,
    email?: string
  }
  Output: { id: number }

// Atualizar organização
organizations.update
  Input: { organizationId: number, ...fields }
  Output: { success: boolean }

// Obter estatísticas
organizations.getStats
  Input: { organizationId: number }
  Output: OrganizationStats
```

### 8.4 Convites

```typescript
// Listar convites
invites.list
  Input: { organizationId: number, status?: string }
  Output: Invite[]

// Criar convite
invites.create
  Input: {
    organizationId: number,
    email: string,
    role: string
  }
  Output: { id: number, token: string }

// Validar token
invites.validate
  Input: { token: string }
  Output: { valid: boolean, invite?: Invite }

// Aceitar convite
invites.accept
  Input: { token: string }
  Output: { success: boolean, organizationId: number }

// Cancelar convite
invites.cancel
  Input: { inviteId: number }
  Output: { success: boolean }

// Reenviar convite
invites.resend
  Input: { inviteId: number }
  Output: { success: boolean }
```

---

## 9. Auditoria

### 9.1 Eventos Auditados

| Evento | Descrição |
|--------|-----------|
| `user.login` | Login de usuário |
| `user.logout` | Logout de usuário |
| `user.invite.create` | Convite criado |
| `user.invite.accept` | Convite aceito |
| `org.create` | Organização criada |
| `org.update` | Organização atualizada |
| `assessment.create` | Avaliação criada |
| `report.generate` | Relatório gerado |
| `document.upload` | Documento enviado |

### 9.2 Consulta de Logs

```typescript
// Listar logs de auditoria
audit.list
  Input: {
    organizationId?: number,
    userId?: number,
    action?: string,
    startDate?: string,
    endDate?: string,
    limit?: number,
    offset?: number
  }
  Output: {
    logs: AuditLog[],
    total: number
  }
```

---

## 10. Multi-tenancy

### 10.1 Isolamento de Dados

```typescript
// Middleware de organização
function withOrganization(ctx: Context, organizationId: number) {
  // Verificar se usuário tem acesso
  const hasAccess = await checkOrganizationAccess(
    ctx.user.id,
    organizationId
  );
  
  if (!hasAccess) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  
  return { ...ctx, organizationId };
}

// Uso em queries
const getTickets = protectedProcedure
  .input(z.object({ organizationId: z.number() }))
  .query(async ({ ctx, input }) => {
    const { organizationId } = await withOrganization(ctx, input.organizationId);
    
    return db.query.tickets.findMany({
      where: eq(tickets.organizationId, organizationId)
    });
  });
```

### 10.2 Filtro Global

```typescript
// Hook para filtrar por organização
function useOrganizationFilter() {
  const { selectedOrganization } = useOrganization();
  
  return {
    organizationId: selectedOrganization?.id,
    isGlobalView: !selectedOrganization
  };
}
```

---

## 11. Segurança

### 11.1 Proteções Implementadas

| Proteção | Descrição |
|----------|-----------|
| JWT Seguro | Tokens assinados com segredo |
| HttpOnly Cookies | Proteção contra XSS |
| CSRF Token | Proteção contra CSRF |
| Rate Limiting | Limite de requisições |
| Senha Hash | bcrypt para senhas |
| Sessão Expirada | Timeout de inatividade |

### 11.2 Configurações de Segurança

```typescript
const securityConfig = {
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '7d'
  },
  session: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // requisições por janela
  }
};
```

---

## 12. Boas Práticas

1. **Princípio do menor privilégio**: Atribuir papel mínimo necessário
2. **Revisão periódica**: Auditar acessos regularmente
3. **Convites com prazo**: Expirar convites não aceitos
4. **Logs de auditoria**: Manter histórico de ações
5. **Segregação de dados**: Isolar dados por organização

---

## 13. Referências Técnicas

- LGPD Art. 46 - Medidas de Segurança
- LGPD Art. 47 - Sigilo de Dados
- OAuth 2.0 - RFC 6749
- JWT - RFC 7519
- OWASP - Autenticação Segura

---

**Anterior**: [Anexo K - Relatórios](./ANEXO_K_RELATORIOS.md)  
**Próximo**: [Anexo M - Integração](./ANEXO_M_INTEGRACAO.md)
