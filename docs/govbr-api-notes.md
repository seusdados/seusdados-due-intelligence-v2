# API de Assinatura Eletrônica Gov.br - Notas de Integração

## Visão Geral
A API de assinatura Gov.br segue princípios REST e usa OAuth 2.0 para autorização.
Requer conta Gov.br nível Prata ou Ouro para assinaturas avançadas.

## Endpoints de Homologação (Staging)
- Autorização: https://cas.staging.iti.br/oauth2.0/authorize
- Token: https://cas.staging.iti.br/oauth2.0/token
- Certificado: https://assinatura-api.staging.iti.br/externo/v2/certificadoPublico
- Assinatura PKCS#7: https://assinatura-api.staging.iti.br/externo/v2/assinarPKCS7
- Validador: https://verificador.staging.iti.br/

## Endpoints de Produção
- Validador: https://validar.iti.gov.br

## Fluxo de Integração
1. Requisitar Autenticação (Login Único Gov.br)
2. Verificar nível da conta (Prata/Ouro)
3. Gerar access token
4. Obter certificado do usuário
5. Realizar assinatura digital (HASH SHA-256 em PKCS#7)

## Parâmetros OAuth
- response_type: code
- client_id: Chave de acesso cadastrada
- scope: sign, signature_session, govbr, icp_brasil
- redirect_uri: URL de retorno cadastrada

## Requisitos
- Credenciais devem ser solicitadas por Gestor Público
- Sistema deve estar integrado com Login Único
- Domínio oficial do governo (gov.br, mil.br, edu.br, etc.)

## Nota Importante
Para empresas privadas como a Seusdados, a integração direta com Gov.br 
pode não ser viável devido aos requisitos de domínio governamental.

Alternativa: Usar serviços de assinatura eletrônica terceirizados que 
já possuem integração com ICP-Brasil/Gov.br, como:
- DocuSign com ICP-Brasil
- Assinafy
- ClickSign
- D4Sign
