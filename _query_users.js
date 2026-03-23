import { sql } from 'drizzle-orm';

async function main() {
  const { getDb } = await import('./server/db.js');
  const db = await getDb();
  const r = await db.execute(sql`SELECT id, name, email, role, organization_id as org_id, is_active FROM users ORDER BY id`);
  const rows = r.rows || r;
  console.log('Total users:', rows.length);
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
