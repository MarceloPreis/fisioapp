import { MigrationInterface, QueryRunner } from 'typeorm';

export class SecurityBaseline1791374400000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await runner.query(`CREATE TABLE IF NOT EXISTS users (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), name varchar NOT NULL, email varchar UNIQUE NOT NULL, "passwordHash" varchar NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now())`);
    await runner.query(`CREATE TABLE IF NOT EXISTS patients (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "fullName" varchar NOT NULL, "medicalRecordNumber" varchar UNIQUE NOT NULL, "birthDate" date NOT NULL, "userId" uuid UNIQUE REFERENCES users(id) ON DELETE SET NULL, "createdAt" timestamp NOT NULL DEFAULT now())`);
    await runner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role varchar NOT NULL DEFAULT 'PATIENT'`);
    // Only the known legacy administrator is promoted; other accounts remain least-privileged.
    await runner.query(`UPDATE users SET role = 'PHYSIO' WHERE email = 'admin' AND NOT EXISTS (SELECT 1 FROM patients WHERE patients."userId" = users.id)`);
    await runner.query(`CREATE TABLE IF NOT EXISTS categories (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), name varchar UNIQUE NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now())`);
    await runner.query(`CREATE TABLE IF NOT EXISTS exercises (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), title varchar NOT NULL, description text, "categoryId" uuid REFERENCES categories(id) ON DELETE SET NULL, "videoUrl" varchar, "createdAt" timestamp NOT NULL DEFAULT now())`);
    await runner.query(`DO $$ BEGIN CREATE TYPE exercise_rules_conditionoperator_enum AS ENUM ('GREATER_THAN','LESS_THAN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await runner.query(`CREATE TABLE IF NOT EXISTS exercise_rules (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "exerciseId" uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE, "jointA" varchar NOT NULL, "jointB" varchar NOT NULL, "jointC" varchar NOT NULL, "conditionOperator" exercise_rules_conditionoperator_enum NOT NULL, "targetAngle" double precision NOT NULL, "validationPlane" varchar NOT NULL DEFAULT 'ABSOLUTE', "feedbackMessage" varchar NOT NULL)`);
    await runner.query(`CREATE TABLE IF NOT EXISTS exercise_count_rules (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "exerciseId" uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE, "jointA" varchar NOT NULL, "jointB" varchar NOT NULL, "jointC" varchar NOT NULL, "angleMin" double precision NOT NULL, "angleMax" double precision NOT NULL, "validationPlane" varchar NOT NULL DEFAULT 'ABSOLUTE')`);
    await runner.query(`CREATE TABLE IF NOT EXISTS sessions (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), title varchar NOT NULL, "patientId" uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE, status varchar NOT NULL DEFAULT 'PENDENTE', "isTemplate" boolean NOT NULL DEFAULT false, "recurrenceDays" integer[], "scheduledDate" date, "createdAt" timestamp NOT NULL DEFAULT now())`);
    await runner.query(`CREATE TABLE IF NOT EXISTS session_exercises (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "sessionId" uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE, "exerciseId" uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE, sets integer NOT NULL, reps varchar NOT NULL, "completedSets" jsonb DEFAULT '[]')`);
    await runner.query(`CREATE TABLE IF NOT EXISTS session_executions (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "sessionId" uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE, "videoObjectName" varchar, "createdAt" timestamp NOT NULL DEFAULT now())`);
    await runner.query(`CREATE TABLE IF NOT EXISTS execution_notes (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "executionId" uuid NOT NULL REFERENCES session_executions(id) ON DELETE CASCADE, "timestampSeconds" double precision NOT NULL, description varchar NOT NULL)`);
    await runner.query(`CREATE TABLE IF NOT EXISTS appointments (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), patient_name varchar NOT NULL, description varchar, start_time timestamp NOT NULL, end_time timestamp NOT NULL, google_event_id varchar, therapist_id varchar, created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now())`);
    await runner.query(`CREATE TABLE IF NOT EXISTS audit_events (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "userId" varchar NOT NULL, ip varchar NOT NULL, action varchar NOT NULL, resource varchar NOT NULL, "resourceId" varchar, "createdAt" timestamp NOT NULL DEFAULT now())`);
    await runner.query(`CREATE OR REPLACE FUNCTION sitf_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit events are immutable'; END $$`);
    await runner.query(`CREATE TRIGGER sitf_audit_no_mutation BEFORE UPDATE OR DELETE OR TRUNCATE ON audit_events FOR EACH STATEMENT EXECUTE FUNCTION sitf_audit_immutable()`);
  }
  async down(): Promise<void> {
    throw new Error('Reversão automática desabilitada: preservar dados clínicos e auditoria.');
  }
}
