# Índice da Documentação Técnica

**Seusdados Due Diligence - Plataforma Integrada de Governança, Conformidade e Proteção de Dados**

---

## Documentação Principal

| Documento | Descrição | Páginas |
|-----------|-----------|---------|
| [README.md](./README.md) | Visão geral, stack tecnológica, arquitetura e instalação | ~15 |

---

## Anexos por Módulo

### Conformidade e Avaliações

| Anexo | Módulo | Descrição |
|-------|--------|-----------|
| [Anexo A](./ANEXO_A_CONFORMIDADE.md) | Conformidade PPPD | Avaliação de maturidade LGPD com questionários por domínio |
| [Anexo B](./ANEXO_B_DUE_DILIGENCE.md) | Due Diligence | Gestão e avaliação de terceiros com matriz de risco 5x5 |
| [Anexo C](./ANEXO_C_ANALISE_CONTRATOS.md) | Análise de Contratos | Análise automatizada com IA, cláusulas LGPD e XAI |
| [Anexo D](./ANEXO_D_MAPEAMENTOS.md) | Mapeamentos (ROPA) | Inventário de dados pessoais com entrevista digital |

### Governança e Gestão

| Anexo | Módulo | Descrição |
|-------|--------|-----------|
| [Anexo E](./ANEXO_E_GOVERNANCA.md) | Governança PPPD | Comitê, reuniões, planos mensais e CPPD contínuo |
| [Anexo F](./ANEXO_F_MEUDPO.md) | MeuDPO | Sistema de tickets com SLA, notificações e relatórios |
| [Anexo G](./ANEXO_G_CENTRAL_DIREITOS.md) | Central de Direitos | Portal público para exercício de direitos LGPD |
| [Anexo H](./ANEXO_H_GED.md) | GED | Gestão eletrônica de documentos com versionamento |

### Simulação e Relatórios

| Anexo | Módulo | Descrição |
|-------|--------|-----------|
| [Anexo I](./ANEXO_I_SIMULADOR.md) | Simulador CPPD | Simulação de cenários de implementação |
| [Anexo J](./ANEXO_J_DASHBOARD.md) | Dashboard | Visão consolidada de KPIs e métricas |
| [Anexo K](./ANEXO_K_RELATORIOS.md) | Relatórios | Geração automatizada de relatórios PDF |
| [Anexo L](./ANEXO_L_USUARIOS.md) | Usuários | Gestão de usuários e organizações |

### Integração e Infraestrutura

| Anexo | Módulo | Descrição |
|-------|--------|-----------|
| [Anexo M](./ANEXO_M_INTEGRACAO.md) | Integração | Sincronismo em tempo real entre todos os módulos |

---

## Guias e Recursos

| Documento | Descrição |
|-----------|-----------|
| [Guia de Desenvolvimento](./GUIA_DESENVOLVIMENTO_MODULOS.md) | Padrões de código, estrutura de arquivos e boas práticas |
| [Guia de Onboarding](./GUIA_ONBOARDING.md) | Passo-a-passo para novos usuários configurarem a plataforma |
| [Diagramas de Arquitetura](./DIAGRAMAS_ARQUITETURA.md) | Visualização em Mermaid da arquitetura e fluxos |

---

## Resumo dos Módulos

### 1. Conformidade PPPD
- 10 domínios de avaliação
- 5 níveis de maturidade
- Relatórios PDF profissionais
- Integração com planos de ação

### 2. Due Diligence de Terceiros
- Cadastro individual e em massa (CSV/XLSX)
- Links de autoavaliação
- Matriz de risco 5x5
- Sistema de lembretes automáticos

### 3. Análise de Contratos
- Extração automática via IA
- Mapa de análise (25+ campos)
- Checklist de conformidade (10 itens)
- 18 blocos de cláusulas LGPD
- Modelo XAI com explicabilidade

### 4. Mapeamentos (ROPA)
- Wizard em 3 fases
- Entrevista digital com Legal Design
- Geração de ROT e POP via IA
- Exportação ROPA conforme ANPD

### 5. Governança PPPD
- Configuração do CPPD
- Gestão de membros e papéis
- Sala de reunião virtual
- Planos mensais (Ano 1 e Em Curso)
- Plano CPPD Contínuo

### 6. MeuDPO
- 7 tipos de tickets
- 4 níveis de prioridade
- Controle de SLA configurável
- SmartDPOButton (role-based)
- Atribuição automática

### 7. Central de Direitos
- Portal público (sem autenticação)
- 7 tipos de direitos LGPD
- Geração de protocolo
- Prazo legal de 15 dias
- Consolidação de fluxos de dados

### 8. GED
- Estrutura hierárquica de pastas
- Versionamento de documentos
- GED Seusdados vs GED Cliente
- Integração com todos os módulos

---

## Tecnologias Utilizadas

### Frontend
- React 19 + TypeScript
- Tailwind CSS 4
- Radix UI + shadcn/ui
- Recharts + Framer Motion
- Wouter (roteamento)

### Backend
- Node.js 22 + Express
- tRPC 11 (API type-safe)
- Drizzle ORM
- Zod (validação)

### Banco de Dados
- MySQL/TiDB
- AWS S3 (arquivos)

### IA e Automação
- Manus Forge API (LLM)
- Motor XAI (Explainable AI)
- Geração de documentos via IA

---

## Contato

**Seusdados Consultoria**
- Website: https://seusdados.com.br
- Suporte: https://help.manus.im

---

*Documentação gerada em 15 de dezembro de 2025*
