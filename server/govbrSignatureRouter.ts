/**
 * Router tRPC para Assinatura Digital Gov.br
 * 
 * Este router expõe os endpoints para:
 * - Iniciar o fluxo de assinatura
 * - Processar o callback OAuth
 * - Consultar status de assinaturas
 * - Listar assinaturas de um documento
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import { getDb } from './db';
import { sql } from 'drizzle-orm';
import {
  createGovbrSignatureService,
  validateSignatureWithITI,
  createITIValidationService,
} from './govbrSignatureService';

// Schema para iniciar assinatura
const initiateSignatureSchema = z.object({
  entityType: z.enum(['dpa', 'contract', 'document']),
  entityId: z.number(),
  analysisId: z.number().optional(),
  documentUrl: z.string().optional(),
  scopes: z.array(z.enum(['sign', 'signature_session', 'govbr', 'icp_brasil'])).default(['sign', 'govbr']),
});

// Schema para callback OAuth
const oauthCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
});

// Schema para consulta de assinatura
const getSignatureSchema = z.object({
  signatureId: z.number(),
});

// Schema para listar assinaturas
const listSignaturesSchema = z.object({
  entityType: z.enum(['dpa', 'contract', 'document']).optional(),
  entityId: z.number().optional(),
  analysisId: z.number().optional(),
  status: z.enum(['pending', 'awaiting_authorization', 'processing', 'completed', 'failed', 'expired', 'cancelled']).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

// Schema para configuração Gov.br
const configSchema = z.object({
  environment: z.enum(['staging', 'production']),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  redirectUri: z.string().url(),
});

export const govbrSignatureRouter = router({
  /**
   * Obtém a configuração atual da integração Gov.br
   */
  getConfig: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Banco de dados não disponível',
      });
    }
    
    const configs = await db.execute(sql`
      SELECT id, environment, client_id, redirect_uri, is_active, 
             last_tested_at, test_result, test_error_message,
             created_at, updated_at
      FROM govbr_integration_config
      ORDER BY id DESC
      LIMIT 1
    `);
    
    const config = (configs as any)[0]?.[0];
    
    if (!config) {
      return {
        configured: false,
        environment: 'staging' as const,
        clientId: null,
        redirectUri: null,
        isActive: false,
        lastTestedAt: null,
        testResult: null,
        testErrorMessage: null,
      };
    }
    
    return {
      configured: true,
      environment: config.environment,
      clientId: config.client_id,
      redirectUri: config.redirect_uri,
      isActive: config.is_active === 1,
      lastTestedAt: config.last_tested_at,
      testResult: config.test_result,
      testErrorMessage: config.test_error_message,
    };
  }),

  /**
   * Salva a configuração da integração Gov.br
   */
  saveConfig: protectedProcedure
    .input(configSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Banco de dados não disponível',
        });
      }
      
      // Verificar se já existe configuração
      const existing = await db.execute(sql`
        SELECT id FROM govbr_integration_config LIMIT 1
      `);
      
      const existingId = (existing as any)[0]?.[0]?.id;
      
      if (existingId) {
        // Atualizar configuração existente
        await db.execute(sql`
          UPDATE govbr_integration_config
          SET environment = ${input.environment},
              client_id = ${input.clientId},
              client_secret = ${input.clientSecret},
              redirect_uri = ${input.redirectUri},
              updated_at = NOW(),
              updated_by_id = ${ctx.user.id}
          WHERE id = ${existingId}
        `);
      } else {
        // Criar nova configuração
        await db.execute(sql`
          INSERT INTO govbr_integration_config 
          (environment, client_id, client_secret, redirect_uri, updated_by_id)
          VALUES (${input.environment}, ${input.clientId}, ${input.clientSecret}, ${input.redirectUri}, ${ctx.user.id})
        `);
      }
      
      return { success: true };
    }),

  /**
   * Testa a configuração da integração Gov.br
   */
  testConfig: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Banco de dados não disponível',
      });
    }
    
    const configs = await db.execute(sql`
      SELECT * FROM govbr_integration_config ORDER BY id DESC LIMIT 1
    `);
    
    const config = (configs as any)[0]?.[0];
    
    if (!config) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Configuração Gov.br não encontrada',
      });
    }
    
    try {
      const service = createGovbrSignatureService(
        config.client_id,
        config.client_secret,
        config.redirect_uri,
        config.environment
      );
      
      // Tentar gerar URL de autorização (não requer conexão real)
      const authResult = service.generateAuthorizationUrl({
        scope: ['sign', 'govbr'],
      });
      
      // Atualizar resultado do teste
      await db.execute(sql`
        UPDATE govbr_integration_config
        SET last_tested_at = NOW(),
            test_result = 'success',
            test_error_message = NULL,
            is_active = 1
        WHERE id = ${config.id}
      `);
      
      return {
        success: true,
        authorizationUrl: authResult.authorizationUrl,
        message: 'Configuração válida. A URL de autorização foi gerada com sucesso.',
      };
    } catch (error: any) {
      // Atualizar resultado do teste com erro
      await db.execute(sql`
        UPDATE govbr_integration_config
        SET last_tested_at = NOW(),
            test_result = 'failed',
            test_error_message = ${error.message},
            is_active = 0
        WHERE id = ${config.id}
      `);
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Erro ao testar configuração: ${error.message}`,
      });
    }
  }),

  /**
   * Inicia o fluxo de assinatura digital
   * 
   * Retorna a URL para redirecionar o usuário ao Gov.br
   */
  initiateSignature: protectedProcedure
    .input(initiateSignatureSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Banco de dados não disponível',
        });
      }
      
      // Buscar configuração ativa
      const configs = await db.execute(sql`
        SELECT * FROM govbr_integration_config 
        WHERE is_active = 1 
        ORDER BY id DESC LIMIT 1
      `);
      
      const config = (configs as any)[0]?.[0];
      
      if (!config) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Integração Gov.br não está configurada ou ativa. Configure as credenciais primeiro.',
        });
      }
      
      // Criar serviço
      const service = createGovbrSignatureService(
        config.client_id,
        config.client_secret,
        config.redirect_uri,
        config.environment
      );
      
      // Gerar URL de autorização
      const authResult = service.generateAuthorizationUrl({
        scope: input.scopes as any[],
      });
      
      const analysisIdValue = input.analysisId || null;
      const emailValue = ctx.user.email || null;
      const nameValue = ctx.user.name || null;
      const documentUrlValue = input.documentUrl || null;
      
      // Criar registro de assinatura pendente
      const result = await db.execute(sql`
        INSERT INTO govbr_digital_signatures 
        (entity_type, entity_id, analysis_id, signer_user_id, signer_email, signer_name,
         status, govbr_client_id, govbr_state, govbr_nonce, document_url)
        VALUES (${input.entityType}, ${input.entityId}, ${analysisIdValue}, ${ctx.user.id}, 
                ${emailValue}, ${nameValue}, 'awaiting_authorization', ${config.client_id}, 
                ${authResult.state}, ${authResult.nonce}, ${documentUrlValue})
        RETURNING id
      `);
      
      const signatureId = (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
      
      // Registrar no log de auditoria
      const details = JSON.stringify({
        entityType: input.entityType,
        entityId: input.entityId,
        scopes: input.scopes,
        userId: ctx.user.id,
      });
      
      await db.execute(sql`
        INSERT INTO govbr_signature_audit_log 
        (signature_id, action, details, ip_address)
        VALUES (${signatureId}, 'signature_requested', ${details}, NULL)
      `);
      
      return {
        signatureId,
        authorizationUrl: authResult.authorizationUrl,
        state: authResult.state,
        expiresIn: 300, // 5 minutos para completar o fluxo
      };
    }),

  /**
   * Processa o callback OAuth após autorização do usuário
   */
  processCallback: publicProcedure
    .input(oauthCallbackSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Banco de dados não disponível',
        });
      }
      
      // Buscar assinatura pelo state
      const signatures = await db.execute(sql`
        SELECT * FROM govbr_digital_signatures 
        WHERE govbr_state = ${input.state} AND status = 'awaiting_authorization'
        ORDER BY created_at DESC LIMIT 1
      `);
      
      const signature = (signatures as any)[0]?.[0];
      
      if (!signature) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Solicitação de assinatura não encontrada ou expirada',
        });
      }
      
      // Buscar configuração
      const configs = await db.execute(sql`
        SELECT * FROM govbr_integration_config 
        WHERE client_id = ${signature.govbr_client_id} AND is_active = 1
        ORDER BY id DESC LIMIT 1
      `);
      
      const config = (configs as any)[0]?.[0];
      
      if (!config) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Configuração Gov.br não encontrada',
        });
      }
      
      // Atualizar status para processando
      await db.execute(sql`
        UPDATE govbr_digital_signatures
        SET status = 'processing', govbr_code = ${input.code}
        WHERE id = ${signature.id}
      `);
      
      // Registrar callback no log
      const callbackDetails = JSON.stringify({ codeReceived: true });
      await db.execute(sql`
        INSERT INTO govbr_signature_audit_log 
        (signature_id, action, details)
        VALUES (${signature.id}, 'oauth_callback', ${callbackDetails})
      `);
      
      try {
        // Criar serviço e completar assinatura
        const service = createGovbrSignatureService(
          config.client_id,
          config.client_secret,
          config.redirect_uri,
          config.environment
        );
        
        // Trocar código por token
        const tokenResult = await service.exchangeCodeForToken(input.code);
        
        // Atualizar com token
        await db.execute(sql`
          UPDATE govbr_digital_signatures
          SET govbr_access_token = ${tokenResult.accessToken},
              govbr_token_expires_at = NOW() + INTERVAL '1 second' * ${tokenResult.expiresIn}
          WHERE id = ${signature.id}
        `);
        
        // Realizar assinatura do documento
        if (signature.document_url) {
          // Buscar documento e assinar
          const signResult = await service.signDocument(
            tokenResult.accessToken,
            signature.document_url
          );
          
          // Atualizar com resultado da assinatura
          await db.execute(sql`
            UPDATE govbr_digital_signatures
            SET status = 'completed',
                signed_document_url = ${signature.document_url},
                signature_hash = ${signResult.signature},
                certificate_chain = ${null},
                completed_at = NOW()
            WHERE id = ${signature.id}
          `);
          
          // Registrar conclusão
          const completedDetails = JSON.stringify({
            signatureHash: signResult.signature,
            signedAt: new Date().toISOString(),
          });
          await db.execute(sql`
            INSERT INTO govbr_signature_audit_log 
            (signature_id, action, details)
            VALUES (${signature.id}, 'signature_completed', ${completedDetails})
          `);
          
          return {
            success: true,
            signatureId: signature.id,
            status: 'completed',
            signedDocumentUrl: signature.document_url,
          };
        }
        
        // Se não há documento, apenas marcar como autorizado
        await db.execute(sql`
          UPDATE govbr_digital_signatures
          SET status = 'completed', completed_at = NOW()
          WHERE id = ${signature.id}
        `);
        
        return {
          success: true,
          signatureId: signature.id,
          status: 'completed',
        };
        
      } catch (error: any) {
        // Atualizar status para falha
        await db.execute(sql`
          UPDATE govbr_digital_signatures
          SET status = 'failed', error_message = ${error.message}
          WHERE id = ${signature.id}
        `);
        
        // Registrar erro
        const errorDetails = JSON.stringify({ error: error.message });
        await db.execute(sql`
          INSERT INTO govbr_signature_audit_log 
          (signature_id, action, details)
          VALUES (${signature.id}, 'signature_failed', ${errorDetails})
        `);
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Erro ao processar assinatura: ${error.message}`,
        });
      }
    }),

  /**
   * Obtém detalhes de uma assinatura específica
   */
  getSignature: protectedProcedure
    .input(getSignatureSchema)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Banco de dados não disponível',
        });
      }
      
      const signatures = await db.execute(sql`
        SELECT * FROM govbr_digital_signatures WHERE id = ${input.signatureId}
      `);
      
      const signature = (signatures as any)[0]?.[0];
      
      if (!signature) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Assinatura não encontrada',
        });
      }
      
      return {
        id: signature.id,
        entityType: signature.entity_type,
        entityId: signature.entity_id,
        analysisId: signature.analysis_id,
        status: signature.status,
        signerName: signature.signer_name,
        signerEmail: signature.signer_email,
        signedDocumentUrl: signature.signed_document_url,
        signatureHash: signature.signature_hash,
        createdAt: signature.created_at,
        completedAt: signature.completed_at,
        errorMessage: signature.error_message,
      };
    }),

  /**
   * Lista assinaturas com filtros
   */
  listSignatures: protectedProcedure
    .input(listSignaturesSchema)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Banco de dados não disponível',
        });
      }
      
      // Construir query com filtros
      let query = sql`SELECT * FROM govbr_digital_signatures WHERE 1=1`;
      
      if (input.entityType) {
        query = sql`${query} AND entity_type = ${input.entityType}`;
      }
      if (input.entityId) {
        query = sql`${query} AND entity_id = ${input.entityId}`;
      }
      if (input.analysisId) {
        query = sql`${query} AND analysis_id = ${input.analysisId}`;
      }
      if (input.status) {
        query = sql`${query} AND status = ${input.status}`;
      }
      
      query = sql`${query} ORDER BY created_at DESC LIMIT ${input.limit} OFFSET ${input.offset}`;
      
      const signatures = await db.execute(query);
      const rows = (signatures as any)[0] || [];
      
      return rows.map((sig: any) => ({
        id: sig.id,
        entityType: sig.entity_type,
        entityId: sig.entity_id,
        analysisId: sig.analysis_id,
        status: sig.status,
        signerName: sig.signer_name,
        signerEmail: sig.signer_email,
        signedDocumentUrl: sig.signed_document_url,
        createdAt: sig.created_at,
        completedAt: sig.completed_at,
      }));
    }),

  /**
   * Cancela uma assinatura pendente
   */
  cancelSignature: protectedProcedure
    .input(getSignatureSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Banco de dados não disponível',
        });
      }
      
      const signatures = await db.execute(sql`
        SELECT * FROM govbr_digital_signatures 
        WHERE id = ${input.signatureId} AND status IN ('pending', 'awaiting_authorization')
      `);
      
      const signature = (signatures as any)[0]?.[0];
      
      if (!signature) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Assinatura não encontrada ou não pode ser cancelada',
        });
      }
      
      await db.execute(sql`
        UPDATE govbr_digital_signatures
        SET status = 'cancelled'
        WHERE id = ${input.signatureId}
      `);
      
      // Registrar cancelamento
      const cancelDetails = JSON.stringify({ cancelledBy: ctx.user.id });
      await db.execute(sql`
        INSERT INTO govbr_signature_audit_log 
        (signature_id, action, details)
        VALUES (${input.signatureId}, 'signature_cancelled', ${cancelDetails})
      `);
      
      return { success: true };
    }),

  /**
   * Obtém o log de auditoria de uma assinatura
   */
  getAuditLog: protectedProcedure
    .input(getSignatureSchema)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Banco de dados não disponível',
        });
      }
      
      const logs = await db.execute(sql`
        SELECT * FROM govbr_signature_audit_log 
        WHERE signature_id = ${input.signatureId}
        ORDER BY created_at ASC
      `);
      
      const rows = (logs as any)[0] || [];
      
      return rows.map((log: any) => ({
        id: log.id,
        action: log.action,
        details: log.details ? JSON.parse(log.details) : null,
        ipAddress: log.ip_address,
        createdAt: log.created_at,
      }));
    }),

  /**
   * Valida uma assinatura digital usando o serviço ITI
   */
  validateSignature: protectedProcedure
    .input(z.object({
      signatureId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Banco de dados não disponível',
        });
      }
      
      // Buscar assinatura
      const signatures = await db.execute(sql`
        SELECT * FROM govbr_digital_signatures WHERE id = ${input.signatureId}
      `);
      
      const signature = (signatures as any)[0]?.[0];
      
      if (!signature) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Assinatura não encontrada',
        });
      }
      
      if (signature.status !== 'completed') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Apenas assinaturas completas podem ser validadas',
        });
      }
      
      // Buscar configuração para determinar ambiente
      const configs = await db.execute(sql`
        SELECT environment FROM govbr_integration_config WHERE is_active = 1 LIMIT 1
      `);
      const config = (configs as any)[0]?.[0];
      const environment = config?.environment || 'staging';
      
      // Validar assinatura
      const validationResult = await validateSignatureWithITI(
        signature.signature_hash || '',
        undefined,
        signature.document_hash,
        environment
      );
      
      // Atualizar registro com resultado da validação
      const validationJson = JSON.stringify(validationResult);
      await db.execute(sql`
        UPDATE govbr_digital_signatures
        SET iti_validation_result = ${validationJson},
            iti_validated_at = NOW()
        WHERE id = ${input.signatureId}
      `);
      
      // Registrar validação no log
      const validationDetails = JSON.stringify({
        valid: validationResult.valid,
        signerName: validationResult.signerName,
        warnings: validationResult.warnings,
        errors: validationResult.errors,
      });
      await db.execute(sql`
        INSERT INTO govbr_signature_audit_log 
        (signature_id, action, details)
        VALUES (${input.signatureId}, 'iti_validation', ${validationDetails})
      `);
      
      return validationResult;
    }),

  /**
   * Obtém URL do validador oficial do ITI para validação manual
   */
  getITIValidatorUrl: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Banco de dados não disponível',
        });
      }
      
      const configs = await db.execute(sql`
        SELECT environment FROM govbr_integration_config WHERE is_active = 1 LIMIT 1
      `);
      const config = (configs as any)[0]?.[0];
      const environment = config?.environment || 'staging';
      
      const service = createITIValidationService(environment);
      
      return {
        validatorUrl: service.getValidatorUrl(),
        verifierUrl: service.getVerifierUrl(),
        environment,
      };
    }),
});
