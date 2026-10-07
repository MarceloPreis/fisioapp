import { MigrationInterface, QueryRunner } from 'typeorm';

export class PatientReports1791400000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE patient_reports (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "tenantId" uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
      "patientId" uuid NOT NULL, "authorId" uuid NOT NULL,
      title varchar(200) NOT NULL CHECK (length(trim(title)) > 0),
      content text NOT NULL CHECK (length(trim(content)) BETWEEN 1 AND 100000),
      "createdAt" timestamp NOT NULL DEFAULT now(),
      FOREIGN KEY ("tenantId", "patientId") REFERENCES patients("tenantId", id) ON DELETE RESTRICT,
      FOREIGN KEY ("tenantId", "authorId") REFERENCES users("tenantId", id) ON DELETE RESTRICT
    )`);
    await runner.query(`CREATE INDEX patient_reports_patient_date_idx ON patient_reports("tenantId", "patientId", "createdAt" DESC, id DESC)`);
    await runner.query(`CREATE TRIGGER patient_reports_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON patient_reports FOR EACH STATEMENT EXECUTE FUNCTION sitf_audit_immutable()`);
  }
  async down(): Promise<void> {
    throw new Error('Reversão automática desabilitada: preservar relatórios clínicos.');
  }
}
