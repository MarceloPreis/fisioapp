import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Exercise } from './exercise.entity';

export enum RuleOperator {
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
}

@Entity('exercise_rules')
export class ExerciseRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  exerciseId: string;

  @ManyToOne(() => Exercise, exercise => exercise.rules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exerciseId' })
  exercise: Exercise;

  @Column()
  jointA: string;

  @Column()
  jointB: string;

  @Column()
  jointC: string;

  @Column({ type: 'enum', enum: RuleOperator })
  conditionOperator: string;

  @Column('float')
  targetAngle: number;

  @Column({ default: 'ABSOLUTE' })
  validationPlane: string;

  @Column()
  feedbackMessage: string;
}
