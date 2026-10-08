import { TenantOwned } from '../tenants/tenant-owned.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User extends TenantOwned {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Column({ default: 'PATIENT' })
  role: string;

  @Column({ type: 'integer', default: 0 })
  tokenVersion: number;

  @CreateDateColumn()
  createdAt: Date;
}
