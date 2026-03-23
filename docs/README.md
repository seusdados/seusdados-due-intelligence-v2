# Seusdados Due Diligence

**Plataforma Integrada de Governança, Conformidade e Proteção de Dados**

Versão: 1.0.0  
Última atualização: 15 de dezembro de 2025

---

## Visão Geral

O **Seusdados Due Diligence** é uma plataforma web completa desenvolvida para auxiliar organizações na gestão de conformidade com a Lei Geral de Proteção de Dados (LGPD) e outras regulamentações de privacidade. A ferramenta oferece módulos integrados para avaliação de terceiros, análise de contratos, mapeamento de dados pessoais, gestão de tickets de suporte DPO, governança corporativa e muito mais.

### Principais Características

- **Multi-tenant**: Suporte a múltiplas organizações com isolamento de dados
- **Autenticação OAuth**: Integração com Manus OAuth para autenticação segura
- **Inteligência Artificial**: Análise automatizada de contratos e geração de recomendações
- **Relatórios Premium**: Geração de PDFs profissionais com análises detalhadas
- **Real-time**: Sincronização em tempo real entre módulos via tRPC
- **Responsivo**: Interface adaptada para desktop e dispositivos móveis

---

## Stack Tecnológica

### Frontend
| Tecnologia | Versão | Descrição |
|------------|--------|-----------|
| React | 19.2.1 | Biblioteca de UI |
| TypeScript | 5.9.3 | Tipagem estática |
| Tailwind CSS | 4.1.14 | Framework de estilos |
| Vite | 7.1.7 | Build tool e dev server |
| Wouter | 3.3.5 | Roteamento |
| TanStack Query | 5.90.2 | Gerenciamento de estado servidor |
| Radix UI | - | Componentes acessíveis |
| Recharts | 2.15.2 | Gráficos e visualizações |
| Framer Motion | 12.23.22 | Animações |

### Backend
| Tecnologia | Versão | Descrição |
|------------|--------|-----------|
| Node.js | 22.x | Runtime JavaScript |
| Express | 4.21.2 | Framework HTTP |
| tRPC | 11.6.0 | API type-safe |
| Drizzle ORM | 0.44.5 | ORM para banco de dados |
| Zod | 4.1.12 | Validação de schemas |
| PDF-lib | 1.17.1 | Geração de PDFs |
| ExcelJS | 4.4.0 | Exportação Excel |

### Banco de Dados
| Tecnologia | Descrição |
|------------|-----------|
| MySQL/TiDB | Banco de dados relacional |
| AWS S3 | Armazenamento de arquivos |

### Infraestrutura
| Tecnologia | Descrição |
|------------|-----------|
| Manus Platform | Hospedagem e deploy |
| Manus OAuth | Autenticação |
| Manus Forge API | LLM e serviços de IA |

---

## Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │   Pages     │ │ Components  │ │   Hooks     │ │  Contexts │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
│                           │                                     │
│                    tRPC Client                                  │
└───────────────────────────┼─────────────────────────────────────┘
                            │ HTTP/WebSocket
┌───────────────────────────┼─────────────────────────────────────┐
│                        BACKEND (Node.js)                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │   Routers   │ │  Services   │ │   Core      │ │    DB     │ │
│  │   (tRPC)    │ │  (Business) │ │  (Auth/LLM) │ │ (Drizzle) │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└───────────────────────────┼─────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────┐
│                     BANCO DE DADOS                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    MySQL/TiDB                            │   │
│  │  • 50+ tabelas relacionais                              │   │
│  │  • Migrations versionadas                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      AWS S3                              │   │
│  │  • Documentos e evidências                              │   │
│  │  • Relatórios gerados                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Estrutura de Diretórios

```
seusdados-due-diligence/
├── client/                    # Frontend React
│   ├── public/               # Assets estáticos
│   ├── src/
│   │   ├── components/       # Componentes reutilizáveis
│   │   │   ├── ui/          # Componentes base (shadcn/ui)
│   │   │   └── *.tsx        # Componentes de negócio
│   │   ├── contexts/        # Contextos React
│   │   ├── hooks/           # Hooks customizados
│   │   ├── lib/             # Utilitários e configurações
│   │   ├── pages/           # Páginas da aplicação
│   │   ├── App.tsx          # Componente raiz e rotas
│   │   ├── main.tsx         # Entry point
│   │   └── index.css        # Estilos globais
│   └── index.html           # Template HTML
├── server/                   # Backend Node.js
│   ├── _core/               # Infraestrutura core
│   │   ├── context.ts       # Contexto tRPC
│   │   ├── env.ts           # Variáveis de ambiente
│   │   ├── llm.ts           # Integração LLM
│   │   ├── oauth.ts         # Autenticação OAuth
│   │   └── trpc.ts          # Configuração tRPC
│   ├── lgpd/                # Motor de regras LGPD
│   ├── xai/                 # Motor XAI (Explainable AI)
│   ├── *Router.ts           # Routers tRPC por módulo
│   ├── *Service.ts          # Serviços de negócio
│   ├── db.ts                # Funções de banco de dados
│   └── routers.ts           # Agregador de routers
├── drizzle/                  # Schema e migrations
│   ├── schema.ts            # Definição de tabelas
│   ├── relations.ts         # Relacionamentos
│   └── *.sql                # Arquivos de migration
├── shared/                   # Código compartilhado
│   ├── types.ts             # Tipos TypeScript
│   └── const.ts             # Constantes
├── docs/                     # Documentação
├── package.json             # Dependências
├── tsconfig.json            # Configuração TypeScript
├── vite.config.ts           # Configuração Vite
└── drizzle.config.ts        # Configuração Drizzle
```

---

## Módulos do Sistema

A plataforma é composta por 12 módulos principais, cada um documentado em anexo separado:

| Módulo | Descrição | Anexo |
|--------|-----------|-------|
| **Conformidade PPPD** | Avaliação de conformidade com LGPD | [Anexo A](./ANEXO_A_CONFORMIDADE.md) |
| **Due Diligence** | Gestão e avaliação de terceiros | [Anexo B](./ANEXO_B_DUE_DILIGENCE.md) |
| **Análise de Contratos** | Análise automatizada com IA | [Anexo C](./ANEXO_C_ANALISE_CONTRATOS.md) |
| **Mapeamentos** | Mapeamento de dados pessoais (ROPA) | [Anexo D](./ANEXO_D_MAPEAMENTOS.md) |
| **Governança PPPD** | Gestão de governança corporativa | [Anexo E](./ANEXO_E_GOVERNANCA.md) |
| **MeuDPO** | Sistema de tickets e suporte | [Anexo F](./ANEXO_F_MEUDPO.md) |
| **Central de Direitos** | Portal de direitos do titular | [Anexo G](./ANEXO_G_CENTRAL_DIREITOS.md) |
| **GED** | Gestão eletrônica de documentos | [Anexo H](./ANEXO_H_GED.md) |
| **Simulador CPPD** | Simulação de cenários | [Anexo I](./ANEXO_I_SIMULADOR.md) |
| **Chat IA** | Assistente inteligente | [Anexo J](./ANEXO_J_CHAT_IA.md) |
| **Organizações** | Gestão multi-tenant | [Anexo K](./ANEXO_K_ORGANIZACOES.md) |
| **Usuários** | Gestão de usuários e permissões | [Anexo L](./ANEXO_L_USUARIOS.md) |

---

## Autenticação e Autorização

### Fluxo de Autenticação

1. Usuário acessa a aplicação
2. Redirecionamento para Manus OAuth Portal
3. Autenticação via provedor (Google, Microsoft, etc.)
4. Callback com token JWT
5. Criação de sessão via cookie seguro
6. Acesso aos recursos protegidos

### Níveis de Acesso (Roles)

| Role | Descrição | Permissões |
|------|-----------|------------|
| `admin_global` | Administrador global | Acesso total ao sistema |
| `consultor` | Consultor Seusdados | Acesso a todas as organizações |
| `cliente` | Usuário cliente | Acesso apenas à sua organização |

### Procedures tRPC

```typescript
// Acesso público (sem autenticação)
publicProcedure

// Requer autenticação
protectedProcedure

// Requer role admin_global
adminProcedure
```

---

## Banco de Dados

### Principais Tabelas

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários do sistema |
| `organizations` | Organizações/clientes |
| `third_parties` | Terceiros cadastrados |
| `compliance_assessments` | Avaliações de conformidade |
| `third_party_assessments` | Avaliações de terceiros |
| `contract_analyses` | Análises de contratos |
| `mapeamento_processos` | Processos de tratamento |
| `tickets` | Tickets MeuDPO |
| `ged_documents` | Documentos GED |
| `governanca_avaliacoes` | Avaliações de governança |

### Migrations

As migrations são gerenciadas pelo Drizzle Kit:

```bash
# Gerar migration
pnpm db:push

# Aplicar migrations
drizzle-kit migrate
```

---

## Integração entre Módulos

A integração entre módulos é realizada através de:

1. **tRPC Procedures**: Chamadas type-safe entre frontend e backend
2. **Serviços Compartilhados**: Lógica de negócio reutilizável
3. **Tabelas de Vinculação**: Relacionamentos no banco de dados
4. **Eventos e Notificações**: Sistema de notificações em tempo real

Consulte o [Anexo M - Integração e Sincronismo](./ANEXO_M_INTEGRACAO.md) para detalhes completos.

---

## Instalação e Configuração

### Pré-requisitos

- Node.js 22.x ou superior
- pnpm 10.x
- MySQL 8.x ou TiDB
- Conta Manus Platform

### Instalação

```bash
# Clonar repositório
git clone <repository-url>
cd seusdados-due-diligence

# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# Aplicar migrations
pnpm db:push

# Iniciar em desenvolvimento
pnpm dev
```

### Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string MySQL |
| `JWT_SECRET` | Segredo para tokens JWT |
| `VITE_APP_ID` | ID da aplicação Manus |
| `OAUTH_SERVER_URL` | URL do servidor OAuth |
| `BUILT_IN_FORGE_API_KEY` | Chave API Manus Forge |

---

## Testes

```bash
# Executar todos os testes
pnpm test

# Executar testes específicos
pnpm test -- --grep "contract"
```

O projeto utiliza **Vitest** para testes unitários e de integração.

---

## Deploy

O deploy é realizado através da plataforma Manus:

1. Criar checkpoint via `webdev_save_checkpoint`
2. Clicar no botão **Publish** na interface
3. Aguardar build e deploy automático

---

## Suporte

Para suporte técnico ou dúvidas, entre em contato:

- **Email**: suporte@seusdados.com.br
- **Portal**: https://help.manus.im

---

## Licença

Este software é propriedade da Seusdados Consultoria. Todos os direitos reservados.

---

**Seusdados Consultoria** - Proteção de Dados com Inteligência
