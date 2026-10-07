import { MigrationInterface, QueryRunner } from 'typeorm';

export class AppointmentPatientTitle1791380000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    // Legacy names are preserved; a name alone cannot safely identify a patient.
    await runner.query(`ALTER TABLE appointments ADD COLUMN patient_id uuid REFERENCES patients(id) ON DELETE RESTRICT`);
    await runner.query(`ALTER TABLE appointments ADD COLUMN title varchar NOT NULL DEFAULT 'Atendimento'`);
    await runner.query(`CREATE INDEX appointments_patient_id_idx ON appointments(patient_id)`);
  }

  async down(): Promise<void> {
    throw new Error('Reversão automática desabilitada: preservar vínculos e títulos dos eventos.');
  }
}
