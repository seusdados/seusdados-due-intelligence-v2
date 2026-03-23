# Relatório Técnico: Incompatibilidade Manus ↔ Projeto Atual

**Data:** 23 de Março de 2026  
**Projeto:** Seusdados Due Diligence & Intelligence  
**Objetivo:** Documentar as diferenças arquiteturais entre o código gerado pela IA Manus e o projeto em produção no DigitalOcean, explicando por que um simples "push" do Manus **não funciona** no ambiente atual.

---

## 1. Visão Geral do Problema

O código gerado pelo Manus foi desenvolvido para rodar **exclusivamente dentro da infraestrutura proprietária do Manus**, que inclui:

- Banco de dados **MySQL** gerenciado internamente
- Storage de arquivos via **Forge API** (API interna do Manus)
- Autenticação via **OAuth Server** próprio do Manus
- Deploy automático no domínio `*.manus.space`

O projeto atual roda em infraestrutura completamente diferente:

- Banco de dados **PostgreSQL** no DigitalOcean
- Storage via **DigitalOcean Spaces** (S3-compatible)
- Autenticação via **JWT local** (email/senha)
- Deploy no **DigitalOcean App Platform**

**Não existe compatibilidade direta entre as duas infraestruturas.** Cada camada do sistema precisou ser reescrita ou adaptada.

---

## 2. Quebras Críticas (Breaking Changes)

### 2.1 Banco de Dados: MySQL → PostgreSQL

Esta é a maior mudança. **Todo o schema do banco** (50+ tabelas, 70 migrações) precisou ser convertido.

| Item | Manus (MySQL) | Projeto Atual (PostgreSQL) |
|------|---------------|---------------------------|
| Driver ORM | `drizzle-orm/mysql-core` + `mysql2` | `drizzle-orm/pg-core` + `pg` |
| Dialeto Drizzle | `dialect: "mysql"` | `dialect: "postgresql"` |
| Definição de tabelas | `mysqlTable(...)` | `pgTable(...)` |
| Chave primária | `int().autoincrement().notNull()` | `serial().primaryKey()` |
| Campos booleanos | `tinyint().default(1)` (0 ou 1) | `boolean().default(true)` |
| Enums | `mysqlEnum(['valor1','valor2'])` | `text()` (sem enum nativo) |
| Timestamps | `default('CURRENT_TIMESTAMP')` | `defaultNow()` |
| Texto longo | `longtext()` | `text()` |
| Inteiros | `int()` | `integer()` / `serial()` |
| SSL | Não utiliza | Obrigatório (`sslmode=require`) |

**Exemplo concreto** — tabela `access_links`:

```typescript
// ❌ MANUS (MySQL) — NÃO FUNCIONA no projeto atual
import { mysqlTable, int, tinyint, mysqlEnum, timestamp } from "drizzle-orm/mysql-core"

export const accessLinks = mysqlTable("access_links", {
  id: int().autoincrement().notNull(),
  type: mysqlEnum(['due_diligence','conformidade']).default('due_diligence').notNull(),
  isActive: tinyint().default(1).notNull(),
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});
```

```typescript
// ✅ PROJETO ATUAL (PostgreSQL) — Versão funcional
import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core"

export const accessLinks = pgTable("access_links", {
  id: serial().primaryKey(),
  type: text().default('due_diligence').notNull(),
  isActive: boolean().default(true).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});
```

**Impacto:** Cada uma das 50+ tabelas precisou ser reescrita manualmente. As 70 migrações SQL são incompatíveis entre dialetos (sintaxe MySQL ≠ sintaxe PostgreSQL). Não existe conversão automática.

---

### 2.2 Storage de Arquivos: Forge API → DigitalOcean Spaces

O Manus utiliza uma **API proprietária** chamada Forge para armazenar arquivos. Essa API **só existe dentro da infraestrutura do Manus** — não é acessível externamente.

| Item | Manus (Forge API) | Projeto Atual (DO Spaces) |
|------|-------------------|---------------------------|
| Provider | Forge API interno | DigitalOcean Spaces (S3) |
| Autenticação | `Bearer token` (`BUILT_IN_FORGE_API_KEY`) | AWS credentials (`DO_SPACES_KEY` + `DO_SPACES_SECRET`) |
| Upload | HTTP POST FormData para `v1/storage/upload` | `PutObjectCommand` via AWS SDK |
| Download | API call para `v1/storage/downloadUrl` | CDN estático + Presigned URLs |
| CDN | Não possui | `due-intelligence-storage.nyc3.cdn.digitaloceanspaces.com` |
| Variáveis de ambiente | `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` | `DO_SPACES_KEY`, `DO_SPACES_SECRET`, `DO_SPACES_REGION`, `DO_SPACES_ENDPOINT`, `DO_SPACES_BUCKET`, `DO_SPACES_CDN_ENDPOINT` |

**O arquivo `server/storage.ts` foi completamente reescrito** — de ~80 linhas de proxy HTTP para Forge API, para ~80 linhas de integração S3-compatible com AWS SDK.

```typescript
// ❌ MANUS — Depende do Forge (não funciona fora do Manus)
const baseUrl = ENV.forgeApiUrl;  // API interna do Manus
const apiKey = ENV.forgeApiKey;   // Token do Manus
// POST para v1/storage/upload com FormData

// ✅ PROJETO ATUAL — DigitalOcean Spaces
const client = new S3Client({
  region: ENV.doSpacesRegion,
  endpoint: ENV.doSpacesEndpoint,
  credentials: { accessKeyId: ENV.doSpacesKey, secretAccessKey: ENV.doSpacesSecret },
});
// PutObjectCommand direto para S3
```

**Impacto:** Sem essa reescrita, nenhum upload/download de arquivo funciona (evidências, documentos, GED, relatórios PDF, etc.).

---

### 2.3 Autenticação: OAuth Manus → JWT Local

O Manus possui um servidor OAuth próprio que gerencia login dos usuários. Esse serviço **não existe fora do Manus**.

| Item | Manus (OAuth) | Projeto Atual (JWT Local) |
|------|---------------|---------------------------|
| Método de login | OAuth code exchange via servidor Manus | Email + senha com hash bcrypt |
| SDK Server | `exchangeCodeForToken()`, `getUserInfo()` | `createSessionToken()`, `verifySession()` |
| OAuth routes | `registerOAuthRoutes()` ativo | Desabilitado (stub) |
| User info | Obtido via OAuth `getUserInfoByToken()` | Já existe no banco local |
| Dependência externa | Servidor OAuth do Manus | Nenhuma — tudo local |

**Impacto:** Se mantido o código OAuth do Manus, nenhum usuário consegue fazer login, pois o servidor OAuth referenciado não existe na infraestrutura DigitalOcean.

---

### 2.4 Conexão com Banco: Configuração SSL

O PostgreSQL no DigitalOcean exige conexão SSL com certificados auto-assinados. O código do Manus não possui nenhum tratamento SSL.

```typescript
// ❌ MANUS — Conexão simples MySQL, sem SSL
const pool = mysql.createPool({ uri: DATABASE_URL, connectionLimit: 10 });

// ✅ PROJETO ATUAL — PostgreSQL com SSL obrigatório
const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: isLocalhost ? false : { rejectUnauthorized: false },
});
```

**Impacto:** Sem essa configuração, a conexão com o banco **é recusada** pelo servidor DigitalOcean.

---

### 2.5 CORS e Domínios

| Item | Manus | Projeto Atual |
|------|-------|---------------|
| Domínio produção | `seusdados-due-diligence.manus.space` | `due-intelligence-2zorf.ondigitalocean.app` |
| CORS origins | `*.manus.space` | `*.ondigitalocean.app` + `dll.seusdados.com` |

---

## 3. Resumo das Variáveis de Ambiente

### Variáveis do Manus que NÃO funcionam no projeto atual:
```
BUILT_IN_FORGE_API_URL    → API proprietária do Manus (não existe)
BUILT_IN_FORGE_API_KEY    → Token do Manus (não funciona)
OAUTH_SERVER_URL          → Servidor OAuth do Manus (não existe)
OWNER_OPEN_ID             → ID do OAuth Manus
```

### Variáveis NOVAS necessárias no projeto atual:
```
DATABASE_URL              → PostgreSQL no DigitalOcean (não MySQL)
DO_SPACES_KEY             → Credencial DigitalOcean Spaces
DO_SPACES_SECRET          → Credencial DigitalOcean Spaces
DO_SPACES_REGION          → nyc3
DO_SPACES_ENDPOINT        → https://nyc3.digitaloceanspaces.com
DO_SPACES_BUCKET          → due-intelligence-storage
DO_SPACES_CDN_ENDPOINT    → CDN do DigitalOcean Spaces
PUBLIC_APP_URL            → URL do App Platform DigitalOcean
FRONTEND_URL              → URL do frontend no DigitalOcean
```

---

## 4. Quantificação do Trabalho Realizado

| Componente | Tipo de alteração | Complexidade |
|------------|------------------|-------------|
| Schema do banco (50+ tabelas) | Reescrita completa MySQL → PostgreSQL | **Alta** |
| 70 migrações SQL | Regeneradas para dialeto PostgreSQL | **Alta** |
| `server/db.ts` (conexão) | Reescrito: mysql2 → pg com SSL | **Média** |
| `drizzle.config.ts` | Reescrito: dialect mysql → postgresql com SSL | **Média** |
| `server/storage.ts` (storage) | Reescrito: Forge API → DigitalOcean Spaces S3 | **Alta** |
| `server/_core/sdk.ts` (auth) | Reescrito: OAuth completo → JWT local | **Alta** |
| `server/_core/env.ts` (config) | Adicionadas 6+ novas variáveis DO Spaces | **Baixa** |
| `server/_core/index.ts` (server) | CORS, OAuth desabilitado, static assets | **Média** |
| Configuração SSL/TLS | Adicionada em db.ts e drizzle.config.ts | **Média** |
| Deploy & CI/CD | Configurado para DigitalOcean App Platform | **Média** |
| Debugging & correções | Erros de runtime por incompatibilidade de tipos | **Alta** |

---

## 5. O Que Se Manteve Igual

Para ser justo, estas partes **não precisaram de alteração** significativa:

- **Email** — integração Resend permaneceu igual
- **Lógica de negócio** — routers tRPC, services, cron jobs
- **Frontend React** — componentes, páginas, hooks
- **Framework tRPC** — camada de API type-safe
- **Padrões de resiliência** — circuit breaker, retry with backoff
- **Estrutura de pastas** — mesma organização modular

---

## 6. Conclusão

Aplicar o código do Manus diretamente no projeto atual resulta em **falha imediata** em múltiplas camadas:

1. **Banco de dados** não conecta (MySQL ≠ PostgreSQL, sem SSL)
2. **Nenhuma query funciona** (sintaxe MySQL ≠ PostgreSQL)
3. **Storage não funciona** (Forge API não existe fora do Manus)
4. **Login não funciona** (servidor OAuth do Manus inacessível)
5. **Deploy não funciona** (domínios e CORS diferentes)

A migração exigiu **reescrita de componentes críticos da infraestrutura**, mantendo a lógica de negócio intacta. Não é uma questão de "ajustar algumas configurações" — são **camadas inteiras do sistema** que operam de forma fundamentalmente diferente.

Qualquer novo código gerado pelo Manus precisará passar pelo mesmo processo de adaptação antes de poder ser integrado ao projeto em produção.

---

*Documento gerado para fins de comunicação técnica e registro de escopo de trabalho.*
