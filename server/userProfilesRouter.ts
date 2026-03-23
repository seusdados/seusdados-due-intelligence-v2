/**
 * Router de Perfis de Usuário e Delegação de Mapeamentos
 * 
 * Endpoints para:
 * - Gestão de perfis (atribuir/remover/listar) — admin/consultor
 * - Capabilities do usuário corrente — qualquer autenticado
 * - Delegação de mapeamentos — Gestor de Área
 */

import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getUserProfiles,
  assignProfile,
  removeProfile,
  listOrganizationProfiles,
  computeMapeamentoCapabilities,
  enforceMapeamentoCapability,
  createDelegation,
  revokeDelegation,
  completeDelegation,
  listDelegations,
  type ProfileType,
} from "./services/mapeamentoPermissions";

export const userProfilesRouter = router({
  // ============================================================
  // Gestão de Perfis (admin/consultor)
  // ============================================================

  /**
   * Atribui um perfil a um usuário
   */
  assignProfile: protectedProcedure
    .input(z.object({
      userId: z.number().positive(),
      organizationId: z.number().positive(),
      profileType: z.enum(['lider_processo', 'gestor_area', 'sponsor', 'comite']),
      areaId: z.number().positive().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Apenas admin/consultor pode atribuir perfis
      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores podem atribuir perfis' });
      }

      // Validar que lider_processo e gestor_area exigem areaId
      if (['lider_processo', 'gestor_area'].includes(input.profileType) && !input.areaId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Perfis de Líder de Processo e Gestor de Área exigem vinculação a uma área',
        });
      }

      const result = await assignProfile({
        userId: input.userId,
        organizationId: input.organizationId,
        profileType: input.profileType as ProfileType,
        areaId: input.areaId,
        assignedBy: ctx.user.id,
      });

      return result;
    }),

  /**
   * Remove (desativa) um perfil de um usuário
   */
  removeProfile: protectedProcedure
    .input(z.object({
      profileId: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores podem remover perfis' });
      }

      await removeProfile(input.profileId);
      return { success: true };
    }),

  /**
   * Lista todos os perfis de uma organização
   */
  listProfiles: protectedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
    }))
    .query(async ({ input, ctx }) => {
      if (!['admin_global', 'consultor'].includes(ctx.user.role)) {
        // Usuário comum pode ver apenas seus próprios perfis
        const myProfiles = await getUserProfiles(ctx.user.id, input.organizationId);
        return myProfiles;
      }

      return listOrganizationProfiles(input.organizationId);
    }),

  // ============================================================
  // Capabilities do Usuário Corrente
  // ============================================================

  /**
   * Retorna as capabilities de mapeamento do usuário corrente
   */
  getMyMapeamentoCapabilities: protectedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
    }))
    .query(async ({ input, ctx }) => {
      const profiles = await getUserProfiles(ctx.user.id, input.organizationId);
      const capabilities = computeMapeamentoCapabilities(ctx.user.role, profiles);
      return capabilities;
    }),

  // ============================================================
  // Delegação de Mapeamentos (Gestor de Área)
  // ============================================================

  /**
   * Delega um mapeamento de processo para um Líder de Processo
   */
  delegateProcess: protectedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      areaId: z.number().positive(),
      processId: z.number().positive(),
      delegatedTo: z.number().positive(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verificar capabilities do usuário
      const profiles = await getUserProfiles(ctx.user.id, input.organizationId);
      const capabilities = computeMapeamentoCapabilities(ctx.user.role, profiles);
      enforceMapeamentoCapability(capabilities, 'canDelegateProcesses');

      const result = await createDelegation({
        organizationId: input.organizationId,
        areaId: input.areaId,
        processId: input.processId,
        delegatedBy: ctx.user.id,
        delegatedTo: input.delegatedTo,
        notes: input.notes,
      });

      return result;
    }),

  /**
   * Revoga uma delegação
   */
  revokeDelegation: protectedProcedure
    .input(z.object({
      delegationId: z.number().positive(),
      organizationId: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      const profiles = await getUserProfiles(ctx.user.id, input.organizationId);
      const capabilities = computeMapeamentoCapabilities(ctx.user.role, profiles);
      enforceMapeamentoCapability(capabilities, 'canRevokeDelegation');

      await revokeDelegation(input.delegationId, ctx.user.id);
      return { success: true };
    }),

  /**
   * Conclui uma delegação
   */
  completeDelegation: protectedProcedure
    .input(z.object({
      delegationId: z.number().positive(),
      organizationId: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Tanto o delegante quanto o delegado podem concluir
      await completeDelegation(input.delegationId);
      return { success: true };
    }),

  /**
   * Lista delegações de uma organização
   */
  listDelegations: protectedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      areaId: z.number().positive().optional(),
      status: z.enum(['ativa', 'concluida', 'revogada']).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const profiles = await getUserProfiles(ctx.user.id, input.organizationId);
      const capabilities = computeMapeamentoCapabilities(ctx.user.role, profiles);
      enforceMapeamentoCapability(capabilities, 'canAccessModule');

      // Se não é admin/consultor, filtrar apenas delegações do próprio usuário
      const filters: any = {};
      if (input.areaId) filters.areaId = input.areaId;
      if (input.status) filters.status = input.status;

      if (!capabilities.isFullAccess && !capabilities.canDelegateProcesses) {
        filters.delegatedTo = ctx.user.id;
      }

      return listDelegations(input.organizationId, filters);
    }),

  /**
   * Lista usuários com perfil Líder de Processo de uma área (para seleção na delegação)
   */
  listAreaLeaders: protectedProcedure
    .input(z.object({
      organizationId: z.number().positive(),
      areaId: z.number().positive(),
    }))
    .query(async ({ input, ctx }) => {
      const profiles = await getUserProfiles(ctx.user.id, input.organizationId);
      const capabilities = computeMapeamentoCapabilities(ctx.user.role, profiles);
      enforceMapeamentoCapability(capabilities, 'canDelegateProcesses');

      const allProfiles = await listOrganizationProfiles(input.organizationId);
      return allProfiles.filter(p => 
        p.profileType === 'lider_processo' && 
        (p.areaId === input.areaId || p.areaId === null)
      );
    }),
});
