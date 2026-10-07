import { MigrationInterface, QueryRunner } from 'typeorm';

export const LEGACY_TENANT_ID = '00000000-0000-4000-8000-000000000001';

export class MultiTenant1791390000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    const tables = ['users', 'patients', 'categories', 'exercises', 'sessions', 'session_executions', 'appointments', 'audit_events'];
    await runner.query(`LOCK TABLE ${tables.map(table => `"${table}"`).join(', ')} IN SHARE ROW EXCLUSIVE MODE`);
    // Require an explicit ownership assertion for an existing installation.
    const [{ populated }] = await runner.query(`SELECT EXISTS(SELECT 1 FROM users) OR EXISTS(SELECT 1 FROM patients) OR EXISTS(SELECT 1 FROM audit_events) OR EXISTS(SELECT 1 FROM categories) OR EXISTS(SELECT 1 FROM exercises) OR EXISTS(SELECT 1 FROM sessions) OR EXISTS(SELECT 1 FROM appointments) AS populated`);
    if (populated && process.env.LEGACY_SINGLE_TENANT_CONFIRMED !== 'true') throw new Error('Confirme que os registros legados pertencem à mesma clínica com LEGACY_SINGLE_TENANT_CONFIRMED=true antes de migrar.');
    await runner.query(`CREATE TABLE tenants (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), name varchar NOT NULL, cnpj varchar UNIQUE, "createdAt" timestamp NOT NULL DEFAULT now())`);
    await runner.query(`INSERT INTO tenants(id, name) VALUES ($1, 'Clínica SITF')`, [LEGACY_TENANT_ID]);
    for (const table of tables) {
      // A constant default fills existing rows without updating immutable audit events.
      await runner.query(`ALTER TABLE "${table}" ADD COLUMN "tenantId" uuid NOT NULL DEFAULT '${LEGACY_TENANT_ID}' REFERENCES tenants(id) ON DELETE RESTRICT`);
      await runner.query(`ALTER TABLE "${table}" ALTER COLUMN "tenantId" DROP DEFAULT`);
      await runner.query(`CREATE INDEX "${table}_tenant_idx" ON "${table}" ("tenantId")`);
      await runner.query(`ALTER TABLE "${table}" ADD CONSTRAINT "${table}_tenant_id_unique" UNIQUE ("tenantId", id)`);
    }
    // Generated TypeORM constraint names differ from baseline SQL names.
    for (const [table, column] of [['patients', 'medicalRecordNumber'], ['categories', 'name']]) {
      const constraints = await runner.query(`SELECT c.conname FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1] WHERE c.conrelid = $1::regclass AND c.contype = 'u' AND array_length(c.conkey, 1) = 1 AND a.attname = $2`, [table, column]);
      for (const { conname } of constraints) await runner.query(`ALTER TABLE "${table}" DROP CONSTRAINT "${conname.replaceAll('"', '""')}"`);
      await runner.query(`ALTER TABLE "${table}" ADD CONSTRAINT "${table}_tenant_business_unique" UNIQUE ("tenantId", "${column}")`);
    }
    for (const [table, column, parent] of [
      ['patients', 'userId', 'users'], ['exercises', 'categoryId', 'categories'],
      ['sessions', 'patientId', 'patients'], ['session_executions', 'sessionId', 'sessions'],
      ['appointments', 'patient_id', 'patients'],
    ]) await runner.query(`ALTER TABLE "${table}" ADD CONSTRAINT "${table}_${column}_tenant_fk" FOREIGN KEY ("tenantId", "${column}") REFERENCES "${parent}" ("tenantId", id)`);
    // Auxiliary rows inherit ownership from their parent. Session exercises bridge
    // two roots, so enforce equal tenants at the database boundary as well.
    await runner.query(`CREATE FUNCTION sitf_session_exercise_tenant() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM sessions s JOIN exercises e ON e."tenantId" = s."tenantId" WHERE s.id = NEW."sessionId" AND e.id = NEW."exerciseId") THEN
          RAISE EXCEPTION 'Cross-tenant prescription rejected' USING ERRCODE = '23503';
        END IF;
        RETURN NEW;
      END $$`);
    await runner.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM session_exercises se JOIN sessions s ON s.id = se."sessionId" JOIN exercises e ON e.id = se."exerciseId" WHERE s."tenantId" <> e."tenantId") THEN RAISE EXCEPTION 'Inconsistent legacy prescription'; END IF;
    END $$`);
    await runner.query(`CREATE TRIGGER sitf_session_exercise_tenant BEFORE INSERT OR UPDATE ON session_exercises FOR EACH ROW EXECUTE FUNCTION sitf_session_exercise_tenant()`);
    // Moving a root could invalidate inherited ownership, media and audit history.
    await runner.query(`CREATE FUNCTION sitf_tenant_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW."tenantId" IS DISTINCT FROM OLD."tenantId" THEN RAISE EXCEPTION 'Tenant ownership is immutable'; END IF;
      RETURN NEW;
    END $$`);
    for (const table of tables.filter(table => table !== 'audit_events')) await runner.query(`CREATE TRIGGER sitf_tenant_immutable BEFORE UPDATE ON "${table}" FOR EACH ROW EXECUTE FUNCTION sitf_tenant_immutable()`);
    await runner.query(`CREATE INDEX sessions_tenant_patient_idx ON sessions ("tenantId", "patientId", "isTemplate")`);
    await runner.query(`CREATE INDEX executions_tenant_session_idx ON session_executions ("tenantId", "sessionId")`);
    await runner.query(`CREATE INDEX appointments_tenant_start_idx ON appointments ("tenantId", start_time)`);
  }

  async down(): Promise<void> {
    throw new Error('Reversão automática desabilitada: remover isolamento pode expor dados entre clínicas. Restaure um backup validado.');
  }
}
