import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { SessionExecution } from './execution.entity';

@Entity('execution_notes')
export class ExecutionNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  executionId: string;

  @ManyToOne(() => SessionExecution, exec => exec.notes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'executionId' })
  execution: SessionExecution;

  @Column('float')
  timestampSeconds: number;

  @Column()
  description: string;
}
