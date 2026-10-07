// This verifier refuses any database outside an explicitly named local test database.
const { DataSource } = require('typeorm');
const { SecurityBaseline1791374400000 } = require('../dist/database/migrations/1791374400000-security-baseline');
const { Patient } = require('../dist/patients/patient.entity');
const { User } = require('../dist/users/user.entity');
const assert = require('node:assert/strict');
const url = new URL(process.env.TEST_DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.endsWith('_tests')) throw new Error('Only a local *_tests database is allowed.');
const database = new DataSource({ type: 'postgres', url: url.href, entities: [__dirname + '/../dist/**/*.entity.js'], migrations: [SecurityBaseline1791374400000], synchronize: false });
(async () => {
  await database.initialize();
  try {
    await database.runMigrations();
    assert.equal((await database.runMigrations()).length, 0);
    const user = await database.getRepository(User).save({ name: 'Synthetic', email: `synthetic-${Date.now()}@example.test`, passwordHash: 'synthetic-hash', role: 'PATIENT' });
    const patient = await database.getRepository(Patient).save({ fullName: 'Synthetic Example', medicalRecordNumber: `SYNTHETIC-${Date.now()}`, birthDate: '2000-01-01', userId: user.id });
    const loaded = await database.getRepository(Patient).findOneByOrFail({ id: patient.id });
    assert.equal(loaded.user.passwordHash, undefined);
    const [event] = await database.query(`INSERT INTO audit_events ("userId",ip,action,resource) VALUES ($1,'127.0.0.1','TEST','synthetic') RETURNING id`, [user.id]);
    for (const sql of [`UPDATE audit_events SET action = 'tamper' WHERE id = $1`, `DELETE FROM audit_events WHERE id = $1`]) await assert.rejects(database.query(sql, [event.id]), /immutable/);
    await assert.rejects(database.query('TRUNCATE audit_events'), /immutable/);
    assert.equal((await database.query('SELECT id FROM audit_events WHERE id = $1', [event.id])).length, 1);
    console.log('PASS: migration, repeat execution, password exclusion, immutable audit UPDATE/DELETE/TRUNCATE. Synthetic fixtures only.');
  } finally { await database.destroy(); }
})().catch(error => { console.error('Synthetic database verification failed:', error.message); process.exitCode = 1; });
