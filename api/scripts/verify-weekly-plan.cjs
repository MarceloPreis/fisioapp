// Synthetic fixtures only; never accepts the application's clinical database.
require('reflect-metadata');
const assert = require('node:assert/strict');
const { DataSource } = require('typeorm');
const { SecurityBaseline1791374400000 } = require('../dist/database/migrations/1791374400000-security-baseline');
const { Patient } = require('../dist/patients/patient.entity');
const { Exercise } = require('../dist/exercises/exercise.entity');
const { Session } = require('../dist/sessions/session.entity');
const { PatientsService } = require('../dist/patients/patients.service');
const { SessionsService } = require('../dist/sessions/sessions.service');
const url = new URL(process.env.TEST_DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.endsWith('_tests')) throw new Error('Only local *_tests databases are allowed.');
const database = new DataSource({ type: 'postgres', url: url.href, entities: [__dirname + '/../dist/**/*.entity.js'], migrations: [SecurityBaseline1791374400000], synchronize: false });
(async () => {
  await database.initialize();
  try {
    await database.runMigrations();
    const patient = await database.getRepository(Patient).save({ fullName: 'Synthetic Weekly Plan', medicalRecordNumber: `TEST-${Date.now()}`, birthDate: '2000-01-01' });
    const exercise = await database.getRepository(Exercise).save({ title: 'Synthetic Exercise' });
    const patients = new PatientsService(database.getRepository(Patient), {});
    const matches = await patients.search('sYnThEtIc wEeKlY');
    assert.deepEqual(matches, [{ id: patient.id, fullName: patient.fullName }]);
    assert.equal((await patients.search('%')).length, 0);
    assert.equal((await patients.search("' OR 1=1 --")).length, 0);
    await database.getRepository(Patient).save(Array.from({ length: 25 }, (_, index) => ({ fullName: `Search fixture ${String(index).padStart(2, '0')}`, medicalRecordNumber: `SEARCH-${Date.now()}-${index}`, birthDate: '2000-01-01' })));
    const limited = await patients.search('Search fixture');
    assert.equal(limited.length, 20);
    assert.equal(limited[0].fullName, 'Search fixture 00');
    assert.equal(limited[19].fullName, 'Search fixture 19');
    const sessions = new SessionsService(database.getRepository(Session), {});
    const plan = { routines: [1, 2].map(day => ({ title: `Synthetic ${day}`, recurrenceDays: [day, day + 2], exercises: [{ exerciseId: exercise.id, sets: 3, reps: '10' }] })) };
    const saved = await patients.saveWeeklyPlan(patient.id, plan);
    assert.equal(saved.routines.length, 2);
    assert.deepEqual(saved.routines.map(item => item.recurrenceDays), [[1, 3], [2, 4]]);
    assert.equal(saved.routines[0].sessionExercises[0].sets, 3);
    assert.equal((await patients.getWeeklyPlan(patient.id)).routines.length, 2);
    const generation = await Promise.all([sessions.generateWeekSessions(), sessions.generateWeekSessions()]);
    assert.equal(generation.reduce((sum, item) => sum + item.generated, 0), 4);
    assert.equal((await sessions.generateWeekSessions()).generated, 0);
    const history = await database.getRepository(Session).find({ where: { patientId: patient.id, isTemplate: false } });
    assert.equal(history.length, 4);
    for (const session of history) {
      const expectedDays = session.title === 'Synthetic 1' ? [1, 3] : [2, 4];
      assert.ok(expectedDays.includes(new Date(String(session.scheduledDate).slice(0, 10) + 'T12:00:00Z').getUTCDay()));
    }
    const before = saved.routines.map(item => item.id).sort();
    await assert.rejects(patients.saveWeeklyPlan(patient.id, { routines: [{ ...plan.routines[0], id: patient.id }] }));
    await assert.rejects(patients.saveWeeklyPlan(patient.id, { routines: [{ ...plan.routines[0], exercises: [{ exerciseId: patient.id, sets: 1, reps: '10' }] }] }));
    await assert.rejects(patients.saveWeeklyPlan(patient.id, { routines: [{ ...plan.routines[0], exercises: [{ exerciseId: exercise.id, sets: 1, reps: '  ' }] }] }));
    assert.deepEqual((await patients.getWeeklyPlan(patient.id)).routines.map(item => item.id).sort(), before);
    // Inject a failure after replacement starts to prove the transaction restores templates.
    const originalTransaction = database.manager.transaction;
    database.manager.transaction = function (callback) {
      return originalTransaction.call(this, async manager => {
        const save = manager.save;
        manager.save = async function (entity, value, ...args) {
          if (entity === Session && value.title === 'Synthetic 2') throw new Error('Synthetic transaction failure');
          return save.call(this, entity, value, ...args);
        };
        return callback(manager);
      });
    };
    await assert.rejects(patients.saveWeeklyPlan(patient.id, plan), /Synthetic transaction failure/);
    database.manager.transaction = originalTransaction;
    assert.deepEqual((await patients.getWeeklyPlan(patient.id)).routines.map(item => item.id).sort(), before);
    await patients.saveWeeklyPlan(patient.id, plan);
    assert.equal((await sessions.generateWeekSessions()).generated, 0);
    await patients.saveWeeklyPlan(patient.id, { routines: [] });
    assert.equal((await patients.getWeeklyPlan(patient.id)).routines.length, 0);
    assert.deepEqual((await database.getRepository(Session).find({ where: { patientId: patient.id, isTemplate: false } })).map(item => item.id).sort(), history.map(item => item.id).sort());
    console.log('PASS: patient name search, literal query parameters, minimal fields, ordering, result limit, unified templates, recurrence dates, concurrent idempotency, validation, transaction rollback, rest week and preserved history. Synthetic fixtures only.');
  } finally { await database.destroy(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
