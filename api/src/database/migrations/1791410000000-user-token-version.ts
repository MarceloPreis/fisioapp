import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserTokenVersion1791410000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      `ALTER TABLE "users"
       ADD COLUMN IF NOT EXISTS "tokenVersion" integer NOT NULL DEFAULT 0`,
    );
  }

  async down(): Promise<void> {
    throw new Error('Reversão automática desabilitada: preservar a revogação de tokens.');
  }
}
