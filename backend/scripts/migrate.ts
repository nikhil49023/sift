import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool, transaction } from '../src/db.ts';
import {config,local} from '../src/config.ts';
try {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now())');
  const directory = fileURLToPath(new URL('../../migrations/', import.meta.url));
  for (const name of (await readdir(directory)).filter(n=>n.endsWith('.sql')).sort()) {
    await transaction(async client => {
      await client.query('SELECT pg_advisory_xact_lock(734821)');
      if ((await client.query('SELECT 1 FROM schema_migrations WHERE name=$1',[name])).rowCount) return;
      await client.query(await readFile(`${directory}/${name}`, 'utf8'));
      await client.query('INSERT INTO schema_migrations(name) VALUES($1)',[name]);
      console.log(`Applied ${name}`);
    });
  }
  if(local) await transaction(async client=> {
    await client.query('INSERT INTO organizations(id,name) VALUES($1,$2) ON CONFLICT DO NOTHING',[config.LOCAL_ORG_ID,'Local development']);
    await client.query('INSERT INTO memberships(org_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[config.LOCAL_ORG_ID,config.LOCAL_USER_ID,'admin']);
  });
} finally { await pool.end(); }
