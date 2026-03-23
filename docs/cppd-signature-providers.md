# Provedores de Assinatura — Módulo CPPD

Documento técnico desenvolvido por **Seusdados Consultoria em Gestão de Dados Limitada**.
CNPJ 33.899.116/0001-63 | www.seusdados.com | Responsabilidade técnica: Marcelo Fattori.

---

## Visão Geral

O módulo CPPD utiliza uma arquitetura de provedores plugáveis para assinatura de documentos (atas, deliberações). O sistema seleciona automaticamente o provedor com base na variável de ambiente `SIGNATURE_PROVIDER`.

O código-fonte dos provedores está em `server/providers/signature/`.

## Provedores Disponíveis

| Provedor | Tipo | Operacional | Requer Serviço Externo | Descrição |
|----------|------|-------------|------------------------|-----------|
| Manual | `manual` | Sim | Não | Pacote de assinatura manual: gera documento para download, o signatário assina fisicamente (ou digitalmente fora da plataforma) e faz upload do documento assinado. |
| Gov.br | `govbr` | Não (esqueleto) | Sim | Assinatura digital via portal Gov.br com certificado ICP-Brasil. Requer credenciais OAuth2 do Gov.br. |
| Nenhum | `noop` | Não | Não | Provedor stub que retorna erros claros. Usado quando nenhum provedor está configurado. |

## Provedor Padrão: Manual

O provedor manual é o padrão e não requer configuração adicional. O fluxo é o seguinte.

1. O sistema gera o documento (ata em PDF) e disponibiliza para download.
2. Os signatários baixam o documento, assinam (fisicamente ou com certificado externo) e fazem upload do documento assinado.
3. O sistema registra a assinatura com metadados (data, hora, hash do documento, nome do signatário).

Nenhuma variável de ambiente adicional é necessária para o provedor manual.

## Provedor Gov.br (Esqueleto)

O provedor Gov.br é um esqueleto preparado para futura integração com a API de Assinatura Digital do Governo Federal. Quando implementado, permitirá assinatura digital qualificada (ICP-Brasil) diretamente pelo portal Gov.br.

### Como Habilitar

Para habilitar o provedor Gov.br, as seguintes variáveis de ambiente devem ser configuradas.

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `SIGNATURE_PROVIDER` | Sim | Definir como `govbr` |
| `GOVBR_CLIENT_ID` | Sim | Identificador do cliente OAuth2 registrado no portal Gov.br |
| `GOVBR_CLIENT_SECRET` | Sim | Segredo do cliente OAuth2 |
| `GOVBR_API_URL` | Sim | URL base da API de assinatura do Gov.br |
| `GOVBR_REDIRECT_URI` | Não | URI de redirecionamento após autenticação OAuth2 (padrão: URL da aplicação + `/api/govbr/callback`) |
| `GOVBR_ENVIRONMENT` | Não | Ambiente da API: `staging` ou `production` (padrão: `staging`) |

### Exemplo de Configuração (.env)

```env
SIGNATURE_PROVIDER=govbr
GOVBR_CLIENT_ID=seu_client_id_aqui
GOVBR_CLIENT_SECRET=seu_client_secret_aqui
GOVBR_API_URL=https://assinatura.staging.iti.br
GOVBR_REDIRECT_URI=https://app.seusdados.com/api/govbr/callback
GOVBR_ENVIRONMENT=staging
```

### Fluxo Previsto (quando implementado)

1. O sistema autentica via OAuth2 no portal Gov.br.
2. O documento (PDF da ata) é enviado para a API de assinatura.
3. Cada signatário recebe um link para assinar no portal Gov.br.
4. O sistema recebe confirmação via retorno de chamada (webhook) quando cada assinatura é coletada.
5. O documento final assinado com certificado ICP-Brasil é baixado e armazenado no GED.

### Referências

A documentação oficial da API de Assinatura Digital do Gov.br está disponível em https://www.gov.br/governodigital/pt-br/assinatura-eletronica.

## Mecanismo de Seleção Automática

O sistema seleciona o provedor na seguinte ordem de prioridade.

1. Se `SIGNATURE_PROVIDER` está definido, usa o provedor correspondente.
2. Se não está definido, usa `manual` como padrão.
3. Se o provedor solicitado não é reconhecido, usa `noop` e registra aviso no log.

O provedor é instanciado uma única vez e mantido em cache para evitar re-instanciação a cada chamada. O cache é invalidado apenas quando o tipo de provedor muda.

## Mecanismo de Retorno ao Manual (Fallback)

Quando o provedor Gov.br estiver implementado e operacional, o sistema deve seguir a seguinte lógica de fallback.

1. Tentar assinatura via Gov.br.
2. Se a API Gov.br retornar erro (rede, 403, 5xx), registrar o erro no log.
3. Oferecer ao usuário a opção de prosseguir com assinatura manual.
4. O sistema nunca deve bloquear o fluxo de assinatura por falha do provedor externo.

## Como Adicionar um Novo Provedor

Para adicionar um novo provedor de assinatura (por exemplo, DocuSign ou Clicksign), os seguintes passos devem ser seguidos.

1. Criar arquivo em `server/providers/signature/providers/<nome>.ts`.
2. Implementar a interface `SignatureProvider` definida em `server/providers/signature/types.ts`.
3. Registrar o novo provedor no `switch` de `getSignatureProvider()` em `server/providers/signature/index.ts`.
4. Adicionar o tipo ao `SignatureProviderType` em `server/providers/signature/types.ts`.
5. Atualizar a função `listSignatureProviders()` para incluir o novo provedor.
6. Adicionar testes unitários em `server/cppdFinalization.test.ts`.

## Interface do Provedor

Todos os provedores devem implementar os seguintes métodos.

| Método | Descrição |
|--------|-----------|
| `sendForSignature(request)` | Envia documento para assinatura dos signatários |
| `getStatus(organizationId, meetingId)` | Consulta status atual do processo de assinatura |
| `uploadSigned(request)` | Recebe upload de documento assinado (para provedor manual) |
| `finalize(organizationId, meetingId)` | Finaliza o processo de assinatura |
| `meta()` | Retorna informações sobre o provedor (nome, operacional, requer serviço externo) |

---

Documento desenvolvido por **Seusdados Consultoria em Gestão de Dados Limitada**.
CNPJ 33.899.116/0001-63 | www.seusdados.com | Responsabilidade técnica: Marcelo Fattori.
