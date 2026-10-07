import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TenantOwned } from '../tenants/tenant-owned.entity';
import { Patient } from './patient.entity';
import { User } from '../users/user.entity';

@Entity('patient_reports')
export class PatientReport extends TenantOwned {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) patientId: string;
  @ManyToOne(() => Patient, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patientId' }) patient: Patient;
  @Column({ type: 'uuid' }) authorId: string;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'authorId' }) author: User;
  @Column({ length: 200 }) title: string;
  @Column({ type: 'text' }) content: string;
  @CreateDateColumn() createdAt: Date;
}
