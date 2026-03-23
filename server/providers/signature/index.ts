/**
 * Assinatura Eletrônica — Seletor de Provider
 * 
 * Seleciona o provider de assinatura com base na variável de ambiente
 * SIGNATURE_PROVIDER (padrão: 'manual').
 * 
 * Providers disponíveis:
 *   - manual: download/upload de documento assinado fisicamente
 *   - govbr: assinatura digital via Gov.br (skeleton)
 *   - noop: stub (nenhum provider configurado)
 */

import type { SignatureProvider, SignatureProviderType } from './types';
import { ManualSignatureProvider } from './providers/manual';
import { NoopSignatureProvider } from './providers/stub';
import { GovBrSignatureProvider } from './providers/govbr';
import { logger } from '../../_core/logger';

let _cachedProvider: SignatureProvider | null = null;
let _cachedType: string | null = null;

/**
 * Retorna a instância do provider de assinatura configurado.
 * Usa cache para evitar re-instanciação a cada chamada.
 */
export function getSignatureProvider(forceType?: SignatureProviderType): SignatureProvider {
  const requestedType = forceType || process.env.SIGNATURE_PROVIDER || 'manual';

  // Retorna cache se o tipo não mudou
  if (_cachedProvider && _cachedType === requestedType) {
    return _cachedProvider;
  }

  switch (requestedType) {
    case 'manual':
      _cachedProvider = new ManualSignatureProvider();
      break;
    case 'govbr':
      _cachedProvider = new GovBrSignatureProvider();
      break;
    case 'noop':
      _cachedProvider = new NoopSignatureProvider();
      break;
    default:
      logger.warn(`[Assinatura] Provider desconhecido: "${requestedType}". Usando noop.`);
      _cachedProvider = new NoopSignatureProvider();
  }

  _cachedType = requestedType;
  logger.info(`[Assinatura] Provider ativo: ${_cachedProvider.name}`);
  return _cachedProvider;
}

/**
 * Lista todos os providers disponíveis com seus status
 */
export function listSignatureProviders(): Array<{ type: SignatureProviderType; name: string; isOperational: boolean; requiresExternalService: boolean }> {
  return [
    { type: 'manual', ...new ManualSignatureProvider().meta() },
    { type: 'govbr', ...new GovBrSignatureProvider().meta() },
    { type: 'noop', ...new NoopSignatureProvider().meta() },
  ];
}
