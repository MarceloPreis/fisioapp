import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Session } from './session.entity';
import { Exercise } from '../exercises/exercise.entity';

@Entity('session_exercises')
export class SessionExercise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @ManyToOne(() => Session, session => session.sessionExercises, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: Session;

  @Column()
  exerciseId: string;

  @ManyToOne(() => Exercise, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exerciseId' })
  exercise: Exercise;

  @Column()
  sets: number;

  @Column()
  reps: string; // Usando string para permitir "10 a 12" ou "Falha"

  @Column('jsonb', { nullable: true, default: '[]' })
  completedSets: boolean[];
}
