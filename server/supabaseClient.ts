import { logger } from "./_core/logger";
/**
 * Cliente Supabase para futuras operações
 * 
 * Este arquivo configura a conexão com o Supabase para uso futuro.
 * Atualmente não é utilizado pelo sistema, mas está preparado para:
 * - Autenticação com Supabase Auth
 * - Storage com Supabase Storage
 * - Database com Supabase PostgreSQL
 * 
 * Para usar, adicione as variáveis de ambiente:
 * - SUPABASE_URL
 * - SUPABASE_ANON_KEY (para operações do cliente)
 * - SUPABASE_SERVICE_ROLE_KEY (para operações do servidor)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Variáveis de ambiente do Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Cliente para operações públicas (frontend)
let supabaseClient: SupabaseClient | null = null;

// Cliente para operações administrativas (backend)
let supabaseAdmin: SupabaseClient | null = null;

/**
 * Obtém o cliente Supabase para operações públicas
 * Usa a chave anônima (anon key) - segura para uso no frontend
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    logger.warn('[Supabase] Credenciais não configuradas. Configure SUPABASE_URL e SUPABASE_ANON_KEY.');
    return null;
  }
  
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    });
    logger.info('[Supabase] Cliente público inicializado');
  }
  
  return supabaseClient;
}

/**
 * Obtém o cliente Supabase para operações administrativas
 * Usa a service role key - APENAS para uso no backend
 * NUNCA exponha esta chave no frontend
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    logger.warn('[Supabase] Credenciais admin não configuradas. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
    return null;
  }
  
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    logger.info('[Supabase] Cliente admin inicializado');
  }
  
  return supabaseAdmin;
}

/**
 * Verifica se a conexão com o Supabase está configurada
 */
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && (supabaseAnonKey || supabaseServiceRoleKey));
}

/**
 * Testa a conexão com o Supabase
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  
  if (!client) {
    return {
      success: false,
      message: 'Supabase não está configurado. Adicione as variáveis de ambiente.',
    };
  }
  
  try {
    // Tenta fazer uma operação simples para verificar a conexão
    const { error } = await client.from('_test_connection').select('*').limit(1);
    
    // Se o erro for "relation does not exist", a conexão está OK
    // (a tabela não existe, mas a conexão funcionou)
    if (error && error.code === '42P01') {
      return {
        success: true,
        message: 'Conexão com Supabase estabelecida com sucesso.',
      };
    }
    
    if (error) {
      return {
        success: false,
        message: `Erro ao conectar: ${error.message}`,
      };
    }
    
    return {
      success: true,
      message: 'Conexão com Supabase estabelecida com sucesso.',
    };
  } catch (err) {
    return {
      success: false,
      message: `Erro ao conectar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
    };
  }
}

// Exporta tipos úteis do Supabase
export type { SupabaseClient } from '@supabase/supabase-js';
