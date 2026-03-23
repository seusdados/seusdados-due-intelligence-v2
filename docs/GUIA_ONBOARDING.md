# Guia de Onboarding

**Seusdados Due Diligence - Primeiros Passos na Plataforma**

---

## Introdução

Este guia apresenta o passo-a-passo completo para configurar a plataforma Seusdados Due Diligence, desde o primeiro acesso até a execução da primeira avaliação de conformidade. O processo está dividido em etapas sequenciais que garantem uma implementação estruturada e eficiente do programa de privacidade e proteção de dados.

---

## Pré-requisitos

Antes de iniciar o processo de onboarding, certifique-se de ter em mãos as seguintes informações:

| Item | Descrição | Obrigatório |
|------|-----------|-------------|
| Dados da empresa | Nome, CNPJ, endereço, segmento | Sim |
| Contato do DPO | Nome, e-mail, telefone | Sim |
| Logo da empresa | Arquivo PNG ou SVG | Não |
| Lista de áreas | Departamentos da organização | Recomendado |
| Lista de terceiros | Fornecedores e parceiros | Recomendado |

---

## Etapa 1: Primeiro Acesso

### 1.1 Acessando a Plataforma

O acesso à plataforma é realizado através do sistema de autenticação Manus OAuth. Ao acessar a URL da plataforma, você será direcionado para a tela de login onde deverá utilizar suas credenciais Manus.

### 1.2 Tela Inicial

Após o login bem-sucedido, você será direcionado ao **Dashboard Principal**, que apresenta uma visão geral da plataforma com os principais módulos disponíveis:

| Módulo | Descrição |
|--------|-----------|
| Conformidade PPPD | Avaliação de maturidade LGPD |
| Gestão de Terceiros | Cadastro e due diligence |
| Análise de Contratos | Análise automatizada com IA |
| Mapeamentos | Inventário de dados (ROPA) |
| Governança PPPD | Gestão do programa |
| MeuDPO | Sistema de tickets |

### 1.3 Navegação

A navegação principal está localizada na barra lateral esquerda. O menu é organizado em seções lógicas que agrupam funcionalidades relacionadas. No canto superior direito, você encontra o seletor de organização (para consultores) e o menu do usuário.

---

## Etapa 2: Criar Organização

### 2.1 Acessar Gestão de Organizações

No menu lateral, clique em **Organizações** na seção "Visão Geral". Esta tela exibe todas as organizações cadastradas na plataforma.

### 2.2 Nova Organização

Clique no botão **"Nova Organização"** no canto superior direito da tela. Um formulário será exibido solicitando as informações básicas.

### 2.3 Preencher Dados Básicos

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| Nome | Razão social ou nome fantasia | Empresa ABC Ltda |
| CNPJ | Cadastro Nacional de Pessoa Jurídica | 12.345.678/0001-90 |
| Segmento | Área de atuação | Tecnologia |
| E-mail | E-mail principal de contato | contato@empresaabc.com.br |
| Telefone | Telefone de contato | (11) 3456-7890 |

### 2.4 Informações Complementares

Após salvar os dados básicos, você pode complementar o cadastro com informações adicionais como endereço completo, website e upload do logo da empresa. O logo será utilizado em relatórios e documentos gerados pela plataforma.

### 2.5 Configurações Iniciais

Ao criar a organização, o sistema automaticamente cria a estrutura de pastas no GED (Gestão Eletrônica de Documentos) com as seguintes pastas padrão: Políticas, Procedimentos, Contratos, Evidências, Relatórios e MeuDPO.

---

## Etapa 3: Configurar CPPD (Comitê de Privacidade)

### 3.1 Acessar Governança

No menu lateral, clique em **Governança PPPD** na seção "Conformidade LGPD". Esta é a central de gestão do programa de privacidade.

### 3.2 Configuração Inicial

Na aba **Configuração**, defina os parâmetros básicos do comitê:

| Campo | Descrição | Recomendação |
|-------|-----------|--------------|
| Nome do Comitê | Identificação do comitê | CPPD - [Nome da Empresa] |
| Frequência de Reuniões | Periodicidade dos encontros | Mensal |
| DPO Responsável | Encarregado de Proteção de Dados | Selecionar usuário |
| Sponsor | Patrocinador executivo | Diretor ou C-Level |

### 3.3 Adicionar Membros

Na aba **Membros**, cadastre os participantes do comitê. Cada membro deve ter um papel definido que determina suas responsabilidades.

| Papel | Responsabilidades |
|-------|-------------------|
| DPO | Coordenação geral, interface com ANPD |
| Sponsor | Patrocínio executivo, recursos |
| Jurídico | Assessoria legal, contratos |
| TI | Segurança da informação, sistemas |
| RH | Treinamentos, políticas de pessoal |
| Compliance | Conformidade regulatória |

### 3.4 Agendar Primeira Reunião

Na aba **Reuniões**, clique em **"Nova Reunião"** para agendar o kick-off do programa. Defina a pauta inicial que deve incluir: apresentação do programa, definição de responsabilidades, cronograma de implementação e próximos passos.

---

## Etapa 4: Primeira Avaliação de Conformidade

### 4.1 Acessar Módulo de Conformidade

No menu lateral, clique em **Conformidade PPPD** na seção "Conformidade LGPD". Esta tela exibe todas as avaliações de conformidade realizadas.

### 4.2 Criar Nova Avaliação

Clique no botão **"Nova Avaliação"** e selecione a organização que será avaliada. A avaliação de conformidade PPPD analisa 10 domínios fundamentais da LGPD.

### 4.3 Domínios de Avaliação

A avaliação é estruturada em 10 domínios que cobrem todos os aspectos da conformidade com a LGPD:

| Domínio | Descrição | Perguntas |
|---------|-----------|-----------|
| Governança | Estrutura de governança de dados | 8-12 |
| Políticas | Políticas e normas internas | 6-10 |
| Processos | Processos de tratamento de dados | 10-15 |
| Tecnologia | Controles técnicos de segurança | 8-12 |
| Pessoas | Treinamento e conscientização | 5-8 |
| Terceiros | Gestão de fornecedores | 6-10 |
| Incidentes | Resposta a incidentes | 5-8 |
| Direitos | Atendimento aos titulares | 6-10 |
| Monitoramento | Métricas e indicadores | 5-8 |
| Melhoria | Melhoria contínua | 4-6 |

### 4.4 Responder Questionário

Para cada pergunta, selecione o nível de maturidade que melhor representa a situação atual da organização. Os níveis variam de 1 (Inicial) a 5 (Otimizado).

| Nível | Descrição |
|-------|-----------|
| 1 - Inicial | Processo inexistente ou ad-hoc |
| 2 - Básico | Processo definido, não padronizado |
| 3 - Intermediário | Processo padronizado e documentado |
| 4 - Avançado | Processo monitorado e medido |
| 5 - Otimizado | Melhoria contínua implementada |

### 4.5 Anexar Evidências

Para cada resposta, é recomendado anexar evidências que comprovem o nível de maturidade indicado. Utilize o botão de anexo para selecionar documentos do GED ou fazer upload de novos arquivos.

### 4.6 Finalizar Avaliação

Após responder todas as perguntas, clique em **"Finalizar Avaliação"**. O sistema calculará automaticamente o nível de maturidade por domínio e geral, identificará os gaps de conformidade e gerará recomendações de melhoria.

### 4.7 Gerar Relatório

Com a avaliação finalizada, clique em **"Gerar Relatório"** para criar um documento PDF profissional contendo o resumo executivo, análise por domínio, gaps identificados e plano de ação recomendado.

---

## Etapa 5: Cadastrar Terceiros

### 5.1 Acessar Gestão de Terceiros

No menu lateral, clique em **Terceiros** na seção "Gestão de Terceiros". Esta tela centraliza o cadastro de todos os fornecedores, parceiros e prestadores de serviço.

### 5.2 Cadastro Individual

Clique em **"Novo Terceiro"** para cadastrar um fornecedor individualmente. Preencha as informações básicas:

| Campo | Descrição |
|-------|-----------|
| Nome | Razão social do terceiro |
| CNPJ | Documento de identificação |
| Tipo | Fornecedor, Parceiro, Suboperador |
| Segmento | Área de atuação |
| Contato | Nome e e-mail do responsável |

### 5.3 Importação em Massa

Para cadastrar múltiplos terceiros, utilize a funcionalidade de importação em massa. Clique em **"Importar"** e faça upload de um arquivo CSV ou XLSX com os dados dos terceiros. O sistema validará os dados e exibirá um preview antes da importação definitiva.

### 5.4 Classificação de Risco Inicial

Ao cadastrar um terceiro, defina a classificação de risco inicial baseada no tipo de dados que ele terá acesso. Terceiros com acesso a dados sensíveis ou em grande volume devem ser priorizados para avaliação de due diligence.

---

## Etapa 6: Iniciar Due Diligence

### 6.1 Acessar Due Diligence

No menu lateral, clique em **Due Diligence** na seção "Gestão de Terceiros". Esta tela exibe todas as avaliações de due diligence em andamento e concluídas.

### 6.2 Criar Avaliação

Selecione um terceiro cadastrado e clique em **"Nova Avaliação"**. Escolha o modelo de questionário adequado ao tipo de terceiro e ao nível de risco identificado.

### 6.3 Gerar Link de Autoavaliação

O sistema gera automaticamente um link único que pode ser enviado ao terceiro para que ele mesmo responda o questionário de due diligence. Este link é válido por um período configurável (padrão: 30 dias).

### 6.4 Enviar Convite

Clique em **"Enviar Convite"** para disparar um e-mail ao terceiro contendo o link de autoavaliação, instruções de preenchimento e prazo para resposta.

### 6.5 Acompanhar Respostas

Na tela de Due Diligence, acompanhe o status de cada avaliação. O sistema exibe indicadores de progresso e envia lembretes automáticos para terceiros que não responderam dentro do prazo.

### 6.6 Analisar Resultados

Após o terceiro responder, o sistema calcula automaticamente o score de risco baseado na matriz 5x5 (probabilidade x impacto) e classifica o terceiro em uma das categorias: Baixo, Médio, Alto ou Crítico.

---

## Etapa 7: Configurar Mapeamentos

### 7.1 Acessar Mapeamentos

No menu lateral, clique em **Mapeamentos** na seção "Conformidade LGPD". Este módulo implementa o Registro de Operações de Tratamento (ROPA) exigido pelo Art. 37 da LGPD.

### 7.2 Definir Contexto (Fase 0)

Na primeira fase, defina o contexto organizacional: segmento de atuação, tipo de negócio e dados do DPO. O sistema sugere automaticamente uma estrutura de áreas baseada no segmento selecionado.

### 7.3 Criar Áreas (Fase 1)

Cadastre as áreas/departamentos da organização que realizam tratamento de dados pessoais. Para cada área, defina um responsável que será convidado a responder a entrevista de mapeamento.

### 7.4 Enviar Convites

O sistema gera links únicos para cada responsável de área. Clique em **"Enviar Convites"** para disparar e-mails com instruções para preenchimento da entrevista digital.

### 7.5 Entrevista Digital (Fase 2)

Os responsáveis acessam o link recebido e respondem a entrevista digital com interface de Legal Design. A entrevista coleta informações sobre processos de tratamento, categorias de dados, bases legais, medidas de segurança e compartilhamento com terceiros.

### 7.6 Gerar Documentação (Fase 3)

Com as respostas coletadas, o sistema gera automaticamente os documentos ROT (Registro de Operação de Tratamento) e POP (Procedimento Operacional Padrão) para cada processo mapeado. Estes documentos são salvos no GED e podem ser exportados em formato ROPA conforme modelo da ANPD.

---

## Etapa 8: Configurar MeuDPO

### 8.1 Acessar Configurações

No menu lateral, clique em **MeuDPO** e acesse a aba **Configurações**. Este módulo gerencia o sistema de tickets para atendimento de demandas relacionadas à privacidade.

### 8.2 Definir SLAs

Configure os prazos de atendimento (SLA) por nível de prioridade:

| Prioridade | SLA Recomendado |
|------------|-----------------|
| Baixa | 72 horas |
| Média | 48 horas |
| Alta | 24 horas |
| Urgente | 4 horas |

### 8.3 Configurar Notificações

Ative as notificações automáticas para os eventos relevantes: criação de ticket, atualização de status, alerta de SLA e violação de SLA. Defina os destinatários de cada tipo de notificação.

### 8.4 Criar Tags

Crie tags personalizadas para categorizar os tickets de acordo com as necessidades da organização. As tags facilitam a filtragem e geração de relatórios.

### 8.5 Testar Fluxo

Crie um ticket de teste para validar o fluxo completo: abertura, atribuição, comentários, anexos e fechamento. Verifique se as notificações estão sendo enviadas corretamente.

---

## Etapa 9: Verificar Central de Direitos

### 9.1 Acessar Central de Direitos

No menu lateral, clique em **Central de Direitos** na seção "Conformidade LGPD". Este módulo implementa o portal público para exercício de direitos dos titulares conforme Art. 18 da LGPD.

### 9.2 Verificar Portal Público

Acesse a URL pública do portal de direitos para verificar se está funcionando corretamente. O portal permite que titulares de dados enviem solicitações sem necessidade de autenticação.

### 9.3 Testar Solicitação

Faça uma solicitação de teste através do portal público. Verifique se o protocolo é gerado corretamente e se a notificação é enviada ao DPO responsável.

### 9.4 Configurar Respostas

No painel interno, configure templates de resposta para os tipos mais comuns de solicitação. Isso agiliza o atendimento e garante consistência nas respostas.

---

## Etapa 10: Primeiros Relatórios

### 10.1 Relatório de Conformidade

Com a primeira avaliação concluída, gere o **Relatório de Conformidade** que apresenta o diagnóstico inicial da organização, incluindo nível de maturidade, gaps identificados e recomendações priorizadas.

### 10.2 Relatório de Terceiros

Gere o **Relatório de Terceiros** que consolida a visão de todos os fornecedores cadastrados, classificação de risco e status das avaliações de due diligence.

### 10.3 Dashboard Executivo

Acesse o **Dashboard** para visualizar os KPIs consolidados da organização. Esta visão permite acompanhar a evolução do programa de privacidade ao longo do tempo.

---

## Checklist de Onboarding

Utilize este checklist para garantir que todas as etapas foram concluídas:

| Etapa | Tarefa | Status |
|-------|--------|--------|
| 1 | Primeiro acesso realizado | ☐ |
| 2 | Organização criada | ☐ |
| 2 | Logo da empresa configurado | ☐ |
| 3 | CPPD configurado | ☐ |
| 3 | Membros do comitê cadastrados | ☐ |
| 3 | Primeira reunião agendada | ☐ |
| 4 | Avaliação de conformidade criada | ☐ |
| 4 | Questionário respondido | ☐ |
| 4 | Relatório gerado | ☐ |
| 5 | Terceiros cadastrados | ☐ |
| 6 | Due diligence iniciado | ☐ |
| 7 | Contexto de mapeamento definido | ☐ |
| 7 | Áreas cadastradas | ☐ |
| 8 | SLAs configurados | ☐ |
| 9 | Portal de direitos verificado | ☐ |
| 10 | Primeiro relatório gerado | ☐ |

---

## Próximos Passos

Após concluir o onboarding básico, recomendamos as seguintes ações para evolução do programa:

1. **Análise de Contratos**: Utilize o módulo de Análise de Contratos para revisar os contratos com terceiros críticos e garantir que contenham cláusulas adequadas de proteção de dados.

2. **Plano de Ação**: Com base nos gaps identificados na avaliação de conformidade, crie um plano de ação estruturado com responsáveis e prazos definidos.

3. **Treinamentos**: Planeje treinamentos de conscientização sobre LGPD para os colaboradores, priorizando as áreas que tratam maior volume de dados pessoais.

4. **Monitoramento Contínuo**: Estabeleça uma rotina de monitoramento dos indicadores do dashboard e revisão periódica das avaliações de conformidade e due diligence.

5. **Documentação**: Mantenha o GED atualizado com todas as políticas, procedimentos e evidências de conformidade.

---

## Suporte

Em caso de dúvidas ou dificuldades durante o processo de onboarding, utilize os seguintes canais de suporte:

| Canal | Uso |
|-------|-----|
| MeuDPO | Tickets de suporte técnico |
| E-mail | suporte@seusdados.com.br |
| Documentação | /docs na plataforma |

---

**Voltar para**: [Índice da Documentação](./INDICE_DOCUMENTACAO.md)
