import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Exercise } from './exercise.entity';

@Entity('exercise_count_rules')
export class ExerciseCountRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  exerciseId: string;

  @ManyToOne(() => Exercise, exercise => exercise.countRules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exerciseId' })
  exercise: Exercise;

  @Column()
  jointA: string;

  @Column()
  jointB: string;

  @Column()
  jointC: string;

  @Column('float')
  angleMin: number;

  @Column('float')
  angleMax: number;

  @Column({ default: 'ABSOLUTE' })
  validationPlane: string;
}
