/**
 * Serviço de Autenticação Local
 * Permite login com e-mail e senha armazenados no banco de dados local
 */

import bcrypt from 'bcryptjs';
import { getDb } from './db';
import { sql } from 'drizzle-orm';
import { users } from '../drizzle/schema';
type User = typeof users.$inferSelect & { passwordHash?: string; temporaryPassword?: string; passwordExpiresAt?: string };

export interface LocalAuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * Valida credenciais de login local (e-mail + senha)
 */
export async function validateLocalCredentials(
  email: string,
  password: string
): Promise<LocalAuthResult> {
  const db = await getDb();
  
  // Buscar usuário pelo e-mail
  const result = await db.execute(sql`
    SELECT id, "openId", name, email, "loginMethod", role, "createdAt", "updatedAt", 
           "lastSignedIn", "organizationId", "avatarUrl", phone, "isActive", 
           temporary_password as "temporaryPassword", 
           password_expires_at as "passwordExpiresAt",
           must_change_password as "mustChangePassword",
           password_hash as "passwordHash"
    FROM users 
    WHERE email = ${email} 
    AND "isActive" = true
    ORDER BY 
      CASE WHEN "loginMethod" = 'local' AND password_hash IS NOT NULL THEN 0 ELSE 1 END,
      id DESC
    LIMIT 1
  `);
  
  const usersResult = (result.rows as unknown as User[]);
  
  if (!usersResult || usersResult.length === 0) {
    return {
      success: false,
      error: 'Usuário não encontrado ou inativo'
    };
  }
  
  const user = usersResult[0];
  
  // Verificar se o usuário tem senha local configurada
  if (!user.passwordHash) {
    return {
      success: false,
      error: 'Este usuário não possui login local configurado. Use o login via OAuth.'
    };
  }
  
  // Validar a senha
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  
  if (!isValidPassword) {
    return {
      success: false,
      error: 'Senha incorreta'
    };
  }
  
  // Atualizar último login
  await db.execute(sql`
    UPDATE users 
    SET "lastSignedIn" = NOW() 
    WHERE id = ${user.id}
  `);
  
  return {
    success: true,
    user
  };
}

/**
 * Cria hash de senha para armazenamento
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Atualiza a senha de um usuário
 */
export async function updateUserPassword(
  userId: number,
  newPassword: string
): Promise<boolean> {
  const db = await getDb();
  const passwordHash = await hashPassword(newPassword);
  
  await db.execute(sql`
    UPDATE users 
    SET password_hash = ${passwordHash},
        must_change_password = false,
        temporary_password = NULL,
        password_expires_at = NULL
    WHERE id = ${userId}
  `);
  
  return true;
}

/**
 * Cria um novo usuário com login local (auto-registro)
 */
export async function createLocalUser(
  name: string,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();

  // Verificar se já existe usuário com este e-mail
  const existing = await db.execute(sql`
    SELECT id FROM users WHERE email = ${email} LIMIT 1
  `);
  if (existing.rows && existing.rows.length > 0) {
    return { success: false, error: "Já existe um usuário com este e-mail." };
  }

  const passwordHash = await hashPassword(password);
  const openId = `local_${crypto.randomUUID()}`;

  await db.execute(sql`
    INSERT INTO users ("openId", name, email, "loginMethod", role, "createdAt", "updatedAt", "lastSignedIn", "isActive", password_hash, must_change_password)
    VALUES (${openId}, ${name}, ${email}, 'local', 'sponsor', NOW(), NOW(), NOW(), true, ${passwordHash}, false)
  `);

  return { success: true };
}
