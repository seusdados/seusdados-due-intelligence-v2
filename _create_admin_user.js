import bcrypt from 'bcryptjs';
import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;

const NAME = 'Lucas Santos';
const EMAIL = 'lsantos@seusdados.com';
const PASSWORD = '@D24m2a99';
const ROLE = 'admin_global';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Erro: DATABASE_URL não definida.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

  // Verificar se já existe
  const existing = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [EMAIL]);
  if (existing.rows.length > 0) {
    console.log('Usuário já existe com este e-mail. ID:', existing.rows[0].id);
    await pool.end();
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const openId = `local_${crypto.randomUUID()}`;

  await pool.query(
    `INSERT INTO users ("openId", name, email, "loginMethod", role, "createdAt", "updatedAt", "lastSignedIn", "isActive", password_hash, must_change_password)
     VALUES ($1, $2, $3, 'local', $4, NOW(), NOW(), NOW(), true, $5, false)`,
    [openId, NAME, EMAIL, ROLE, passwordHash]
  );

  const created = await pool.query('SELECT id, name, email, role, "isActive" FROM users WHERE email = $1 LIMIT 1', [EMAIL]);
  console.log('Usuário criado com sucesso:');
  console.log(JSON.stringify(created.rows[0], null, 2));
  await pool.end();
  process.exit(0);
}

main().catch(e => { console.error('Erro:', e.message); process.exit(1); });
