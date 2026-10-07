import { TenantOwned } from '../tenants/tenant-owned.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Session } from '../sessions/session.entity';
import { ExecutionNote } from './execution-note.entity';

@Entity('session_executions')
export class SessionExecution extends TenantOwned {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @ManyToOne(() => Session, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: Session;

  @Column({ nullable: true })
  videoObjectName: string;

  @OneToMany(() => ExecutionNote, note => note.execution, { cascade: true, eager: true })
  notes: ExecutionNote[];

  @CreateDateColumn()
  createdAt: Date;
}
