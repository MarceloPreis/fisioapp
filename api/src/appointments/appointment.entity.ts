import { TenantOwned } from '../tenants/tenant-owned.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

import { Patient } from '../patients/patient.entity';


@Entity('appointments')
export class Appointment extends TenantOwned {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_name' })
  patientName: string;

  @Column({ name: 'patient_id', type: 'uuid', nullable: true })
  patientId: string | null;

  @ManyToOne(() => Patient, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ default: 'Atendimento' })
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'timestamp', name: 'start_time' })
  startTime: Date;

  @Column({ type: 'timestamp', name: 'end_time' })
  endTime: Date;

  @Column({ name: 'google_event_id', nullable: true })
  googleEventId: string;

  @Column({ name: 'therapist_id', nullable: true })
  therapistId: string; // In a real app, this would be a ManyToOne relation to User/Therapist

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
