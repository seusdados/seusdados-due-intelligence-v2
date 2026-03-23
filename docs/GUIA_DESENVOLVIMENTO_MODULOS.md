# Guia de Desenvolvimento de Módulos Plug-and-Play

## Plataforma Seusdados Due Diligence

**Versão:** 1.0  
**Data:** Dezembro 2024  
**Autor:** Seusdados Consultoria

---

## Sumário Executivo

Este documento estabelece as diretrizes técnicas e padrões arquiteturais para o desenvolvimento de novos módulos na plataforma Seusdados Due Diligence. O objetivo é garantir que qualquer módulo desenvolvido externamente possa ser integrado de forma harmônica, mantendo a consistência visual, funcional e de segurança da plataforma.

A arquitetura da plataforma foi projetada seguindo o padrão **modular monolítico**, onde cada módulo funciona de forma independente mas compartilha a mesma base de autenticação, banco de dados e infraestrutura de notificações. Esta abordagem permite o desenvolvimento paralelo de funcionalidades sem conflitos de integração.

---

## 1. Arquitetura da Plataforma

### 1.1 Stack Tecnológico

A plataforma utiliza uma stack moderna e coesa que deve ser respeitada em todos os novos módulos:

| Camada | Tecnologia | Versão | Observações |
|--------|------------|--------|-------------|
| **Frontend** | React | 19.x | Com TypeScript obrigatório |
| **Estilização** | Tailwind CSS | 4.x | Seguir tokens de design |
| **Componentes UI** | shadcn/ui | Latest | Biblioteca padrão de componentes |
| **Roteamento** | Wouter | 3.x | Roteador leve para SPA |
| **Backend** | Express + tRPC | 4.x / 11.x | API tipada end-to-end |
| **Banco de Dados** | MySQL/TiDB | 8.x | Via Drizzle ORM |
| **ORM** | Drizzle | Latest | Schema-first approach |
| **Autenticação** | Manus OAuth | - | SSO integrado |
| **Armazenamento** | S3 | - | Para arquivos e documentos |
| **Runtime** | Node.js | 22.x | ESM modules |

### 1.2 Estrutura de Diretórios

Todo novo módulo deve seguir a estrutura de diretórios padrão da plataforma:

```
seusdados-due-diligence/
├── client/
│   └── src/
│       ├── pages/
│       │   └── NomeModulo.tsx           # Página principal do módulo
│       │   └── NomeModuloDetail.tsx     # Página de detalhes (se aplicável)
│       │   └── NomeModuloResult.tsx     # Página de resultados (se aplicável)
│       └── components/
│           └── NomeModulo/              # Componentes específicos do módulo
│               └── ComponenteX.tsx
├── server/
│   ├── nomeModuloRouter.ts              # Router tRPC do módulo
│   ├── nomeModuloService.ts             # Lógica de negócio do módulo
│   └── nomeModulo.test.ts               # Testes unitários obrigatórios
├── drizzle/
│   └── schema.ts                        # Adicionar tabelas do módulo aqui
└── shared/
    └── nomeModuloTypes.ts               # Tipos compartilhados (opcional)
```

### 1.3 Fluxo de Dados

O fluxo de dados na plataforma segue o padrão unidirecional com tRPC:

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │   Página    │───>│  tRPC Hook  │───>│  Estado Local       │  │
│  │   React     │<───│  useQuery   │<───│  (useState/Context) │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP (JSON-RPC)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │   Router    │───>│   Service   │───>│   Database (Drizzle)│  │
│  │   tRPC      │<───│   Layer     │<───│   MySQL/TiDB        │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Banco de Dados

### 2.1 Convenções de Schema

Todas as tabelas devem ser definidas no arquivo `drizzle/schema.ts` seguindo as convenções estabelecidas:

```typescript
// ==================== NOME DO MÓDULO ====================
export const nomeModuloTabela = mysqlTable("nome_modulo_tabela", {
  // Chave primária sempre como int autoincrement
  id: int("id").autoincrement().primaryKey(),
  
  // Referência obrigatória à organização (multitenancy)
  organizationId: int("organizationId").notNull(),
  
  // Referência ao usuário criador
  createdById: int("createdById").notNull(),
  
  // Campos específicos do módulo
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  // Status com enum tipado
  status: mysqlEnum("status", ["rascunho", "em_andamento", "concluido", "arquivado"])
    .default("rascunho").notNull(),
  
  // Campos de auditoria obrigatórios
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Tipos inferidos para uso no código
export type NomeModuloTabela = typeof nomeModuloTabela.$inferSelect;
export type InsertNomeModuloTabela = typeof nomeModuloTabela.$inferInsert;
```

### 2.2 Regras de Nomenclatura

| Elemento | Convenção | Exemplo |
|----------|-----------|---------|
| Nome da tabela | snake_case | `contract_analyses` |
| Nome da coluna | camelCase | `organizationId` |
| Chave primária | `id` | `id: int("id")` |
| Chave estrangeira | `{tabela}Id` | `userId`, `organizationId` |
| Timestamps | `createdAt`, `updatedAt` | Obrigatórios em todas as tabelas |
| Enums | Definir antes da tabela | `mysqlEnum("status", [...])` |

### 2.3 Tipos de Dados Recomendados

| Uso | Tipo Drizzle | Observações |
|-----|--------------|-------------|
| IDs | `int()` | Sempre autoincrement |
| Textos curtos | `varchar({ length: 255 })` | Até 255 caracteres |
| Textos longos | `text()` | Sem limite |
| Booleanos | `boolean()` | Com default explícito |
| Datas | `timestamp()` | Usar UTC sempre |
| Valores monetários | `int()` | Armazenar em centavos |
| Percentuais | `int()` | Armazenar 0-100 |
| JSON | `json()` | Para dados estruturados flexíveis |

### 2.4 Multitenancy

A plataforma opera em modo **multitenancy por organização**. Toda tabela que armazena dados de negócio DEVE incluir a coluna `organizationId` e todas as queries DEVEM filtrar por esta coluna:

```typescript
// ✅ CORRETO - Sempre filtrar por organizationId
export async function getModuloItems(organizationId: number) {
  return db.select()
    .from(nomeModuloTabela)
    .where(eq(nomeModuloTabela.organizationId, organizationId));
}

// ❌ INCORRETO - Nunca retornar dados sem filtro de organização
export async function getModuloItems() {
  return db.select().from(nomeModuloTabela); // PROIBIDO
}
```

### 2.5 Migrações

Após modificar o schema, execute o comando de migração:

```bash
pnpm db:push
```

Este comando gera e aplica as migrações automaticamente. Nunca edite o banco de dados diretamente.

---

## 3. Backend (tRPC)

### 3.1 Estrutura do Router

Cada módulo deve ter seu próprio router em arquivo separado:

```typescript
// server/nomeModuloRouter.ts
import { router, publicProcedure, protectedProcedure, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const nomeModuloRouter = router({
  // Listar itens (protegido)
  list: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      // Verificar acesso à organização
      if (ctx.user.role === 'cliente' && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      return db.getModuloItems(input.organizationId);
    }),

  // Criar item (protegido)
  create: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      title: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await db.createModuloItem({
        ...input,
        createdById: ctx.user.id,
      });
      return { id };
    }),

  // Atualizar item (protegido)
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.updateModuloItem(input.id, input);
      return { success: true };
    }),

  // Excluir item (admin apenas)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteModuloItem(input.id);
      return { success: true };
    }),
});
```

### 3.2 Níveis de Acesso (Procedures)

A plataforma define três níveis de acesso que devem ser usados conforme a sensibilidade da operação:

| Procedure | Acesso | Uso |
|-----------|--------|-----|
| `publicProcedure` | Qualquer usuário | Dados públicos, páginas de acesso externo |
| `protectedProcedure` | Usuário autenticado | Operações padrão (CRUD) |
| `adminProcedure` | Apenas admin_global | Operações administrativas sensíveis |

### 3.3 Contexto do Usuário

O contexto `ctx` disponibiliza informações do usuário autenticado:

```typescript
interface UserContext {
  id: number;              // ID do usuário
  openId: string;          // ID OAuth
  name: string;            // Nome do usuário
  email: string;           // E-mail
  role: 'admin_global' | 'consultor' | 'cliente';
  organizationId: number | null;  // Organização do cliente
}
```

### 3.4 Validação com Zod

Toda entrada de dados DEVE ser validada com Zod:

```typescript
// Schemas reutilizáveis
const createItemSchema = z.object({
  organizationId: z.number().positive(),
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  priority: z.enum(['baixa', 'media', 'alta', 'critica']),
  dueDate: z.string().datetime().optional(),
});

// Uso no procedure
create: protectedProcedure
  .input(createItemSchema)
  .mutation(async ({ input }) => { ... });
```

### 3.5 Registro do Router

Após criar o router, registre-o no arquivo principal `server/routers.ts`:

```typescript
// server/routers.ts
import { nomeModuloRouter } from "./nomeModuloRouter";

export const appRouter = router({
  // ... routers existentes
  nomeModulo: nomeModuloRouter,
});
```

---

## 4. Frontend (React + TypeScript)

### 4.1 Estrutura de Página

Todas as páginas devem seguir o padrão de layout com DashboardLayout:

```tsx
// client/src/pages/NomeModulo.tsx
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

export default function NomeModulo() {
  const { user } = useAuth();
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  
  // Query com tRPC
  const { data: items, isLoading } = trpc.nomeModulo.list.useQuery(
    { organizationId: selectedOrgId! },
    { enabled: !!selectedOrgId }
  );

  // Mutation com tRPC
  const createMutation = trpc.nomeModulo.create.useMutation({
    onSuccess: () => {
      // Invalidar cache para recarregar dados
      trpc.useUtils().nomeModulo.list.invalidate();
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-primary uppercase tracking-wider">
              NOME DO MÓDULO
            </p>
            <h1 className="text-3xl font-light text-foreground">
              Título do <span className="text-primary">Módulo</span>
            </h1>
          </div>
          <Button onClick={() => createMutation.mutate({ ... })}>
            Nova Ação
          </Button>
        </div>

        {/* Conteúdo */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Itens</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div>Carregando...</div>
            ) : (
              <div>{/* Renderizar items */}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
```

### 4.2 Componentes UI (shadcn/ui)

A plataforma utiliza shadcn/ui como biblioteca de componentes. Sempre importe de `@/components/ui/`:

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
```

### 4.3 Tokens de Design

Utilize as variáveis CSS definidas no tema para manter consistência visual:

| Token | Uso | Classe Tailwind |
|-------|-----|-----------------|
| `--primary` | Cor principal (roxo) | `text-primary`, `bg-primary` |
| `--secondary` | Cor secundária | `text-secondary`, `bg-secondary` |
| `--accent` | Destaques | `text-accent`, `bg-accent` |
| `--muted` | Textos secundários | `text-muted-foreground` |
| `--destructive` | Ações destrutivas | `text-destructive`, `bg-destructive` |
| `--border` | Bordas | `border-border` |
| `--background` | Fundo | `bg-background` |
| `--foreground` | Texto principal | `text-foreground` |

### 4.4 Padrões de Estado

Sempre implemente os três estados básicos em componentes de dados:

```tsx
// Estado de carregamento
if (isLoading) {
  return <Skeleton className="h-32 w-full" />;
}

// Estado de erro
if (error) {
  return (
    <Alert variant="destructive">
      <AlertDescription>Erro ao carregar dados: {error.message}</AlertDescription>
    </Alert>
  );
}

// Estado vazio
if (!data || data.length === 0) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <p>Nenhum item encontrado.</p>
      <Button className="mt-4">Criar Primeiro Item</Button>
    </div>
  );
}

// Estado com dados
return <div>{/* Renderizar dados */}</div>;
```

### 4.5 Registro de Rotas

Adicione a rota no arquivo `client/src/App.tsx`:

```tsx
// client/src/App.tsx
import NomeModulo from "@/pages/NomeModulo";
import NomeModuloDetail from "@/pages/NomeModuloDetail";

// Dentro do Switch de rotas
<Route path="/nome-modulo" component={NomeModulo} />
<Route path="/nome-modulo/:id" component={NomeModuloDetail} />
```

### 4.6 Menu Lateral

Adicione o item no menu lateral em `client/src/components/DashboardLayout.tsx`:

```tsx
// Dentro do array menuItems
{
  icon: IconName,           // Ícone do Lucide React
  label: "Nome do Módulo",
  path: "/nome-modulo",
  roles: ["admin_global", "consultor", "cliente"], // Roles com acesso
  badge: "Novo",            // Opcional: badge de destaque
}
```

---

## 5. Autenticação e Autorização

### 5.1 Sistema de Roles

A plataforma define três roles com diferentes níveis de acesso:

| Role | Descrição | Acesso |
|------|-----------|--------|
| `admin_global` | Administrador Seusdados | Acesso total a todas as organizações |
| `consultor` | Consultor Seusdados | Acesso às organizações atribuídas |
| `cliente` | Usuário do cliente | Acesso apenas à própria organização |

### 5.2 Verificação de Acesso no Backend

Sempre verifique o acesso à organização em procedures protegidas:

```typescript
// Padrão de verificação de acesso
list: protectedProcedure
  .input(z.object({ organizationId: z.number() }))
  .query(async ({ input, ctx }) => {
    // Admin e consultor podem acessar qualquer organização
    if (ctx.user.role === 'admin_global' || ctx.user.role === 'consultor') {
      return db.getItems(input.organizationId);
    }
    
    // Cliente só acessa sua própria organização
    if (ctx.user.organizationId !== input.organizationId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
    }
    
    return db.getItems(input.organizationId);
  }),
```

### 5.3 Verificação de Acesso no Frontend

Use o hook `useAuth` para verificar permissões:

```tsx
import { useAuth } from "@/contexts/AuthContext";

function MyComponent() {
  const { user, isAdmin, isConsultor, isCliente } = useAuth();

  // Renderização condicional por role
  return (
    <div>
      {isAdmin && <AdminOnlySection />}
      {(isAdmin || isConsultor) && <ConsultorSection />}
      <CommonSection />
    </div>
  );
}
```

---

## 6. Notificações e E-mails

### 6.1 Serviço de E-mail

A plataforma possui um serviço de e-mail integrado. Para enviar notificações:

```typescript
// server/emailService.ts
import { sendEmail } from "./emailService";

// Enviar e-mail personalizado
await sendEmail({
  to: "destinatario@email.com",
  subject: "Assunto do E-mail",
  html: generateEmailTemplate(data),
  text: "Versão texto plano",
});
```

### 6.2 Templates de E-mail

Siga o padrão visual dos templates existentes:

```typescript
export function generateNomeModuloEmailTemplate(data: EmailData): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px;">
          <!-- Header com gradiente Seusdados -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e3a5f 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 300; margin: 0;">
                Título do <span style="color: #d4a853;">E-mail</span>
              </h1>
            </td>
          </tr>
          <!-- Conteúdo -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                ${data.content}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
```

### 6.3 Notificações do Proprietário

Para notificar o proprietário da plataforma sobre eventos importantes:

```typescript
import { notifyOwner } from "./_core/notification";

await notifyOwner({
  title: "Novo Evento no Módulo",
  content: "Descrição detalhada do evento ocorrido.",
});
```

---

## 7. Integração com IA

### 7.1 Serviço de LLM

A plataforma possui integração com LLM para análises e geração de conteúdo:

```typescript
import { invokeLLM } from "./_core/llm";

const response = await invokeLLM({
  messages: [
    { role: "system", content: "Você é um especialista em proteção de dados." },
    { role: "user", content: "Analise o seguinte contrato: ..." },
  ],
  // Opcional: forçar resposta em JSON
  response_format: {
    type: "json_object",
  },
});

const content = response.choices[0]?.message?.content;
```

### 7.2 Boas Práticas de Prompts

Ao criar prompts para análise, siga estas diretrizes:

1. **Seja específico**: Defina claramente o contexto e o resultado esperado
2. **Use exemplos**: Forneça exemplos do formato de saída desejado
3. **Limite o escopo**: Divida análises complexas em etapas menores
4. **Valide a saída**: Sempre parse e valide a resposta da IA

```typescript
const prompt = `
Analise o documento a seguir e retorne um JSON com a estrutura:
{
  "score": number (0-100),
  "riscos": [{ "titulo": string, "nivel": "baixo"|"medio"|"alto"|"critico" }],
  "recomendacoes": [string]
}

DOCUMENTO:
${documentText}
`;
```

---

## 8. Armazenamento de Arquivos (S3)

### 8.1 Upload de Arquivos

Use o serviço de storage para upload de arquivos:

```typescript
import { storagePut } from "./storage";

// Upload de arquivo
const fileKey = `${organizationId}/modulo/${Date.now()}-${fileName}`;
const { url } = await storagePut(fileKey, fileBuffer, "application/pdf");

// Salvar URL no banco de dados
await db.saveFileReference({
  organizationId,
  fileUrl: url,
  fileKey,
  fileName,
  mimeType: "application/pdf",
});
```

### 8.2 Integração com GED

Para arquivos que devem aparecer no GED (Gerenciamento Eletrônico de Documentos):

```typescript
import * as gedService from "./gedService";

// Criar documento no GED
const document = await gedService.createDocument({
  organizationId,
  folderId: targetFolderId,
  name: fileName,
  fileUrl: uploadedUrl,
  fileKey,
  mimeType: "application/pdf",
  size: fileBuffer.length,
  createdById: userId,
});
```

---

## 9. Geração de PDFs

### 9.1 Serviço de PDF

A plataforma utiliza PDFKit para geração de relatórios:

```typescript
import { generatePDF } from "./pdfService";

// Gerar PDF a partir de HTML
const htmlContent = generateReportHTML(data);
const pdfBuffer = await generatePDF(htmlContent);

// Retornar como base64 para download no frontend
return { pdf: pdfBuffer.toString('base64') };
```

### 9.2 Template de Relatório

Siga o padrão visual dos relatórios existentes:

```typescript
export function generateNomeModuloReportHTML(data: ReportData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
    body { font-family: 'Inter', sans-serif; color: #1e293b; }
    .header { background: linear-gradient(135deg, #5f29cc, #0ea5e9); padding: 40px; color: white; }
    .content { padding: 40px; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 18px; font-weight: 600; color: #5f29cc; border-bottom: 2px solid #5f29cc; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background-color: #f8fafc; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="font-weight: 300; margin: 0;">SEUSDADOS</h1>
    <p style="margin: 5px 0 0 0; opacity: 0.8;">Consultoria em Proteção de Dados</p>
  </div>
  <div class="content">
    ${data.sections.map(section => `
      <div class="section">
        <h2 class="section-title">${section.title}</h2>
        ${section.content}
      </div>
    `).join('')}
  </div>
</body>
</html>
  `;
}
```

---

## 10. Testes Unitários

### 10.1 Estrutura de Testes

Todo módulo DEVE incluir testes unitários usando Vitest:

```typescript
// server/nomeModulo.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';

describe('Módulo Nome do Módulo', () => {
  describe('Estrutura do Schema', () => {
    it('deve ter tabela de itens do módulo', () => {
      expect(db.nomeModuloTabela).toBeDefined();
    });
  });

  describe('Funções de Banco de Dados', () => {
    it('deve criar item corretamente', async () => {
      const id = await db.createModuloItem({
        organizationId: 1,
        title: 'Teste',
        createdById: 1,
      });
      expect(id).toBeGreaterThan(0);
    });

    it('deve listar itens por organização', async () => {
      const items = await db.getModuloItems(1);
      expect(Array.isArray(items)).toBe(true);
    });
  });

  describe('Validações', () => {
    it('deve rejeitar título vazio', async () => {
      await expect(db.createModuloItem({
        organizationId: 1,
        title: '',
        createdById: 1,
      })).rejects.toThrow();
    });
  });
});
```

### 10.2 Execução de Testes

```bash
# Executar todos os testes
pnpm test

# Executar testes de um módulo específico
pnpm test server/nomeModulo.test.ts

# Executar com watch mode
pnpm test --watch
```

---

## 11. Checklist de Entrega

Antes de entregar um módulo para integração, verifique se todos os itens foram atendidos:

### 11.1 Backend

- [ ] Router tRPC criado em arquivo separado (`server/nomeModuloRouter.ts`)
- [ ] Service layer com lógica de negócio (`server/nomeModuloService.ts`)
- [ ] Schema de banco de dados adicionado (`drizzle/schema.ts`)
- [ ] Funções de banco de dados em `server/db.ts`
- [ ] Validação com Zod em todos os inputs
- [ ] Verificação de acesso por organização
- [ ] Testes unitários com cobertura mínima de 80%
- [ ] Router registrado em `server/routers.ts`

### 11.2 Frontend

- [ ] Página principal do módulo (`client/src/pages/NomeModulo.tsx`)
- [ ] Páginas secundárias se necessário (Detail, Result, etc.)
- [ ] Componentes específicos em pasta dedicada
- [ ] Uso de DashboardLayout
- [ ] Uso de componentes shadcn/ui
- [ ] Estados de loading, erro e vazio implementados
- [ ] Rota registrada em `client/src/App.tsx`
- [ ] Item de menu adicionado em DashboardLayout

### 11.3 Documentação

- [ ] README do módulo com descrição funcional
- [ ] Documentação de endpoints (inputs/outputs)
- [ ] Exemplos de uso

### 11.4 Qualidade

- [ ] Código TypeScript sem erros (`pnpm typecheck`)
- [ ] Lint sem warnings (`pnpm lint`)
- [ ] Testes passando (`pnpm test`)
- [ ] Build funcionando (`pnpm build`)

---

## 12. Exemplo Completo: Módulo de Auditoria

Para ilustrar a aplicação prática deste guia, apresentamos um exemplo completo de um módulo fictício de Auditoria:

### 12.1 Schema

```typescript
// drizzle/schema.ts
export const audits = mysqlTable("audits", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  createdById: int("createdById").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  auditType: mysqlEnum("auditType", ["interna", "externa", "certificacao"]).notNull(),
  status: mysqlEnum("status", ["planejada", "em_andamento", "concluida", "cancelada"]).default("planejada").notNull(),
  scheduledDate: timestamp("scheduledDate"),
  completedDate: timestamp("completedDate"),
  findings: int("findings").default(0),
  criticalFindings: int("criticalFindings").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Audit = typeof audits.$inferSelect;
export type InsertAudit = typeof audits.$inferInsert;
```

### 12.2 Router

```typescript
// server/auditRouter.ts
import { router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

export const auditRouter = router({
  list: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role === 'cliente' && ctx.user.organizationId !== input.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      return db.getAudits(input.organizationId);
    }),

  create: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      title: z.string().min(1),
      description: z.string().optional(),
      auditType: z.enum(['interna', 'externa', 'certificacao']),
      scheduledDate: z.string().datetime().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await db.createAudit({
        ...input,
        createdById: ctx.user.id,
        scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : null,
      });
      return { id };
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['planejada', 'em_andamento', 'concluida', 'cancelada']),
    }))
    .mutation(async ({ input }) => {
      await db.updateAuditStatus(input.id, input.status);
      return { success: true };
    }),
});
```

### 12.3 Página Frontend

```tsx
// client/src/pages/Auditorias.tsx
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { ClipboardCheck, Plus } from "lucide-react";

export default function Auditorias() {
  const { user } = useAuth();
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(
    user?.organizationId || null
  );

  const { data: audits, isLoading } = trpc.audit.list.useQuery(
    { organizationId: selectedOrgId! },
    { enabled: !!selectedOrgId }
  );

  const statusColors = {
    planejada: "bg-blue-100 text-blue-800",
    em_andamento: "bg-yellow-100 text-yellow-800",
    concluida: "bg-green-100 text-green-800",
    cancelada: "bg-gray-100 text-gray-800",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-primary uppercase tracking-wider">
              GESTÃO DE AUDITORIAS
            </p>
            <h1 className="text-3xl font-light text-foreground">
              Auditorias de <span className="text-primary">Conformidade</span>
            </h1>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nova Auditoria
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              Lista de Auditorias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : !audits?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma auditoria cadastrada.
              </div>
            ) : (
              <div className="space-y-4">
                {audits.map((audit) => (
                  <div key={audit.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{audit.title}</h3>
                      <p className="text-sm text-muted-foreground">{audit.description}</p>
                    </div>
                    <Badge className={statusColors[audit.status]}>
                      {audit.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
```

---

## 13. Contato e Suporte

Para dúvidas sobre integração de módulos ou esclarecimentos técnicos, entre em contato com a equipe de desenvolvimento da Seusdados:

- **E-mail técnico:** dev@seusdados.com
- **Documentação online:** https://docs.seusdados.com
- **Repositório:** Acesso mediante autorização

---

**Documento elaborado pela Seusdados Consultoria em Proteção de Dados**  
*Versão 1.0 - Dezembro 2024*
