import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {config} from '../src/config.ts';
test('Supabase-style RLS policies isolate members and reject direct writes',{skip:process.env.INTEGRATION_TESTS!=='true'},async()=>{
  const name=`sift_rls_${randomUUID().replaceAll('-','')}`;const root=new pg.Client({connectionString:config.DATABASE_URL});await root.connect();let createdRole=false,db:pg.Client|undefined;
  try {
    if(!(await root.query("SELECT 1 FROM pg_roles WHERE rolname='authenticated'")).rowCount){await root.query('CREATE ROLE authenticated NOLOGIN');createdRole=true;}
    await root.query(`CREATE DATABASE ${name}`);const connection=new URL(config.DATABASE_URL);connection.pathname=`/${name}`;db=new pg.Client({connectionString:connection.href});await db.connect();
    await db.query("CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;");
    for(const migration of ['001_initial.sql','002_jobs.sql','003_storage.sql'])await db.query(await readFile(new URL(`../../migrations/${migration}`,import.meta.url),'utf8'));
    const orgA=randomUUID(),orgB=randomUUID(),user=randomUUID(),cohort=randomUUID();
    await db.query('INSERT INTO organizations(id,name) VALUES($1,\'A\'),($2,\'B\')',[orgA,orgB]);await db.query('INSERT INTO memberships(org_id,user_id,role) VALUES($1,$2,\'viewer\')',[orgA,user]);
    await db.query('INSERT INTO cohorts(id,org_id,name,workflow) VALUES($1,$2,\'Synthetic\',\'hackathon\')',[cohort,orgA]);
    await db.query('GRANT USAGE ON SCHEMA public TO authenticated; GRANT SELECT,INSERT ON ALL TABLES IN SCHEMA public TO authenticated;');
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user]);await db.query('SET ROLE authenticated');
    const organizations=(await db.query('SELECT id FROM organizations')).rows;assert.deepEqual(organizations.map(r=>r.id),[orgA]);
    assert.equal((await db.query('SELECT id FROM cohorts WHERE org_id=$1',[orgB])).rowCount,0);
    assert.equal((await db.query('SELECT id FROM cohorts WHERE org_id=$1',[orgA])).rowCount,1);
    await assert.rejects(db.query('INSERT INTO organizations(id,name) VALUES($1,\'Blocked\')',[randomUUID()]),/row-level security/);
    assert.equal((await db.query('SELECT * FROM outbox')).rowCount,0);
    await db.query("SELECT set_config('request.jwt.claim.sub','',false)");assert.equal((await db.query('SELECT id FROM organizations')).rowCount,0);
  } finally {
    if(db)await db.end();await root.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);if(createdRole)await root.query('DROP ROLE authenticated');await root.end();
  }
});
