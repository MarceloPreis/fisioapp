// Opt-in integration check against a NEW, isolated local PostgreSQL container only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DataSource } = require('typeorm');
const { databaseConnectionOptions } = require('../dist/database/connection-options');

async function verify() {
  const url = new URL(process.env.TEST_DATABASE_URL || '');
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.endsWith('_tests')) {
    throw new Error('Only an isolated local *_tests database is allowed.');
  }
  const admin = new DataSource({ type: 'postgres', installExtensions: false, ...databaseConnectionOptions({ DATABASE_URL: url.href }),
    entities: [path.join(__dirname, '../dist/**/*.entity.js')],
    migrations: [path.join(__dirname, '../dist/database/migrations/*.js')], synchronize: false });
  let runtime;
  await admin.initialize();
  try {
    const [{ populated }] = await admin.query("SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public') AS populated");
    assert.equal(populated, false, 'Use a fresh test database');
    await admin.query('CREATE SCHEMA IF NOT EXISTS extensions');
    // Supabase commonly installs UUID functions outside public.
    await admin.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions');
    await admin.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
    END $$`);
    await admin.runMigrations();
    assert.equal((await admin.runMigrations()).length, 0);
    const permissions = fs.readFileSync(path.join(__dirname, 'supabase-runtime.sql'), 'utf8');
    await admin.query(permissions);
    await admin.query(permissions);
    await admin.query("ALTER ROLE sitf_runtime LOGIN PASSWORD 'synthetic-only'");
    const runtimeUrl = new URL(url);
    runtimeUrl.username = 'sitf_runtime';
    runtimeUrl.password = 'synthetic-only';
    runtime = new DataSource({ type: 'postgres', ...databaseConnectionOptions({ DATABASE_URL: runtimeUrl.href }) });
    await runtime.initialize();
    const tenantId = '00000000-0000-4000-8000-000000000001';
    const [user] = await runtime.query(`INSERT INTO users ("tenantId", name, email, "passwordHash", role)
      VALUES ($1, 'Synthetic', 'synthetic@example.test', 'synthetic-hash', 'PHYSIO') RETURNING id`, [tenantId]);
    assert.equal((await runtime.query('SELECT id FROM users WHERE id = $1', [user.id])).length, 1);
    const [audit] = await runtime.query(`INSERT INTO audit_events ("tenantId", "userId", ip, action, resource)
      VALUES ($1, $2, '127.0.0.1', 'TEST', 'synthetic') RETURNING id`, [tenantId, user.id]);
    await assert.rejects(runtime.query('UPDATE audit_events SET action = $1 WHERE id = $2', ['tamper', audit.id]), /permission denied/);
    await assert.rejects(runtime.query('DELETE FROM audit_events WHERE id = $1', [audit.id]), /permission denied/);
    await assert.rejects(runtime.query('TRUNCATE audit_events'), /permission denied/);
    await assert.rejects(admin.query('UPDATE audit_events SET action = $1 WHERE id = $2', ['tamper', audit.id]), /immutable/);
    const [{ protected: protectedAudit, owner, superuser }] = await runtime.query(`SELECT
      EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid = 'audit_events'::regclass AND tgname = 'sitf_audit_no_mutation' AND tgenabled = 'O') AS protected,
      (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS superuser,
      (SELECT relowner = (SELECT oid FROM pg_roles WHERE rolname = current_user) FROM pg_class WHERE oid = 'audit_events'::regclass) AS owner`);
    assert.equal(protectedAudit, true); assert.equal(owner, false); assert.equal(superuser, false);
    for (const role of ['anon', 'authenticated']) {
      const [{ exposed }] = await admin.query(`SELECT EXISTS(SELECT 1 FROM pg_tables WHERE schemaname = 'public'
        AND has_table_privilege($1, format('%I.%I', schemaname, tablename), 'SELECT')) AS exposed`, [role]);
      assert.equal(exposed, false, `${role} must not read application tables`);
    }
    console.log('PASS: all migrations, extensions schema, idempotent permissions, runtime RLS, private Data API and immutable audit. Synthetic data only.');
  } finally {
    if (runtime?.isInitialized) await runtime.destroy();
    await admin.destroy();
  }
}
verify().catch(error => {
  console.error('Isolated Supabase database verification failed:', error.code || error.name);
  process.exitCode = 1;
});
