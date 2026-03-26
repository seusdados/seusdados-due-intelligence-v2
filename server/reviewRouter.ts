/**
 * Review Router - Expõe funções de revisão periódica via tRPC
 * 
 * Seusdados Consultoria em Gestão de Dados Limitada
 * CNPJ: 33.899.116/0001-63
 * seusdados.com
 */

import { router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  runReviewAlertCheck,
  getReviewCronJobStatus,
  startReviewCronJob,
  stopReviewCronJob,
  updateReviewCronJobConfig,
} from "./reviewCronJob";

export const reviewRouter = router({
  /**
   * Executa verificação manual de alertas de revisão
   * Processa RIPDs e Mapeamentos com nextReviewDate próximo ou vencido
   */
  triggerManualCheck: adminProcedure
    .mutation(async () => {
      console.log('[ReviewRouter] Iniciando verificação manual de revisões...');
      const result = await runReviewAlertCheck();
      console.log('[ReviewRouter] Verificação concluída:', JSON.stringify(result));
      return result;
    }),

  /**
   * Retorna status atual do cron job de revisão
   */
  getCronStatus: protectedProcedure
    .query(() => {
      return getReviewCronJobStatus();
    }),

  /**
   * Inicia o cron job de revisão (apenas admin)
   */
  startCron: adminProcedure
    .mutation(() => {
      startReviewCronJob();
      return { success: true, message: 'Cron job iniciado' };
    }),

  /**
   * Para o cron job de revisão (apenas admin)
   */
  stopCron: adminProcedure
    .mutation(() => {
      stopReviewCronJob();
      return { success: true, message: 'Cron job parado' };
    }),

  /**
   * Atualiza configuração do cron job
   */
  updateConfig: adminProcedure
    .input(z.object({
      enabled: z.boolean().optional(),
      intervalMs: z.number().min(60000).optional(), // Mínimo 1 minuto
    }))
    .mutation(({ input }) => {
      updateReviewCronJobConfig(input);
      return { success: true, config: input };
    }),
});
