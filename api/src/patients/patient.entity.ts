import { Unique } from 'typeorm';
import { TenantOwned } from '../tenants/tenant-owned.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('patients')
@Unique(['tenantId', 'medicalRecordNumber'])
export class Patient extends TenantOwned {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fullName: string;

  @Column()
  medicalRecordNumber: string; // Número do Prontuário

  @Column({ type: 'date' })
  birthDate: string;

  @Column({ nullable: true })
  userId: string;

  @OneToOne(() => User, { nullable: true, onDelete: 'SET NULL', eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
