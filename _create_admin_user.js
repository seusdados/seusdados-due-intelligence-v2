import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

const NAME = 'Lucas Santos';
const EMAIL = 'lsantos@seusdados.com';
const PASSWORD = '@D24m2a99';
const ROLE = 'admin_global';

async function main() {
  const { getDb } = await import('./server/db.js');
  const db = await getDb();

  // Verificar se já existe
  const existing = await db.execute(sql`SELECT id FROM users WHERE email = ${EMAIL} LIMIT 1`);
  if (existing.rows && existing.rows.length > 0) {
    console.log('Usuário já existe com este e-mail. ID:', existing.rows[0].id);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const openId = `local_${crypto.randomUUID()}`;

  await db.execute(sql`
    INSERT INTO users ("openId", name, email, "loginMethod", role, "createdAt", "updatedAt", "lastSignedIn", "isActive", password_hash, must_change_password)
    VALUES (${openId}, ${NAME}, ${EMAIL}, 'local', ${ROLE}, NOW(), NOW(), NOW(), true, ${passwordHash}, false)
  `);

  const created = await db.execute(sql`SELECT id, name, email, role, "isActive" FROM users WHERE email = ${EMAIL} LIMIT 1`);
  console.log('Usuário criado com sucesso:');
  console.log(JSON.stringify(created.rows[0], null, 2));
  process.exit(0);
}

main().catch(e => { console.error('Erro:', e.message); process.exit(1); });
