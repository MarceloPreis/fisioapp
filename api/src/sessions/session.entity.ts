import { TenantOwned } from '../tenants/tenant-owned.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Patient } from '../patients/patient.entity';
import { SessionExercise } from './session-exercise.entity';

@Entity('sessions')
export class Session extends TenantOwned {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  patientId: string;

  @ManyToOne(() => Patient, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column({ default: 'PENDENTE' })
  status: string; // PENDENTE, CONCLUIDO

  @OneToMany(() => SessionExercise, se => se.session, { cascade: true, eager: true })
  sessionExercises: SessionExercise[];

  @Column({ type: 'boolean', default: false })
  isTemplate: boolean;

  @Column({ type: 'int', array: true, nullable: true })
  recurrenceDays: number[]; // 0=Sunday, 1=Monday... 6=Saturday

  @Column({ type: 'date', nullable: true })
  scheduledDate: string;

  @CreateDateColumn()
  createdAt: Date;
}
