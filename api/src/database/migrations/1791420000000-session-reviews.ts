import { MigrationInterface, QueryRunner } from 'typeorm';

export class SessionReviews1791420000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE session_reviews (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "tenantId" uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
      "sessionId" uuid NOT NULL,
      "reviewerId" uuid NOT NULL,
      "reviewerName" varchar NOT NULL CHECK (length(trim("reviewerName")) > 0),
      disposition varchar(20) NOT NULL CHECK (disposition IN ('REVIEWED', 'FOLLOW_UP', 'NEXT_VISIT')),
      note text CHECK (note IS NULL OR length(note) <= 4000),
      "createdAt" timestamp NOT NULL DEFAULT now(),
      FOREIGN KEY ("tenantId", "sessionId") REFERENCES sessions("tenantId", id) ON DELETE RESTRICT,
      FOREIGN KEY ("tenantId", "reviewerId") REFERENCES users("tenantId", id) ON DELETE RESTRICT
    )`);
    await runner.query(`CREATE INDEX session_reviews_latest_idx ON session_reviews("tenantId", "sessionId", "createdAt" DESC, id DESC)`);
    await runner.query(`CREATE TRIGGER session_reviews_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON session_reviews FOR EACH STATEMENT EXECUTE FUNCTION sitf_audit_immutable()`);
  }

  async down(): Promise<void> {
    throw new Error('Reversão automática desabilitada: preservar o histórico de revisões.');
  }
}
