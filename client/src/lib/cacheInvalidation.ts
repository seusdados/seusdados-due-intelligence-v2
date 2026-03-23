/**
 * Seusdados Due Diligence - Cache Invalidation Utilities
 * Utilitários padronizados para invalidação de cache no frontend
 */

import { trpc } from './trpc';

// Mapeamento de entidades para queries relacionadas
const ENTITY_QUERY_MAP: Record<string, string[]> = {
  ticket: ['tickets.list', 'tickets.getById', 'tickets.getByOrganization'],
  organization: ['organizations.list', 'organizations.getById'],
  thirdParty: ['thirdParty.list', 'thirdParty.getById'],
  user: ['users.list', 'users.getById'],
  notification: ['notifications.list', 'notifications.getUnreadCount'],
};

export type EntityType = keyof typeof ENTITY_QUERY_MAP;

export function useInvalidation() {
  const utils = trpc.useUtils();

  const invalidateEntity = async (entityType: EntityType) => {
    const queries = ENTITY_QUERY_MAP[entityType] || [];
    await Promise.all(
      queries.map(async (queryPath) => {
        try {
          const parts = queryPath.split('.');
          let current: any = utils;
          for (const part of parts) {
            if (current?.[part]) current = current[part];
            else return;
          }
          if (current?.invalidate) await current.invalidate();
        } catch (e) {
          console.warn(`Cache invalidation failed for ${queryPath}`);
        }
      })
    );
  };

  const invalidateAll = async () => {
    await utils.invalidate();
  };

  return { invalidateEntity, invalidateAll, utils };
}

export const INVALIDATION_PATTERNS = {
  ticketMutation: ['ticket', 'notification'] as EntityType[],
  organizationMutation: ['organization', 'user', 'thirdParty'] as EntityType[],
  thirdPartyMutation: ['thirdParty'] as EntityType[],
};

export default { useInvalidation, INVALIDATION_PATTERNS };
