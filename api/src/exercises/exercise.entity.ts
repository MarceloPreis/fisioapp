import { TenantOwned } from '../tenants/tenant-owned.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Category } from '../categories/category.entity';
import { ExerciseRule } from './exercise-rule.entity';
import { ExerciseCountRule } from './exercise-count-rule.entity';

@Entity('exercises')
export class Exercise extends TenantOwned {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  categoryId: string;

  @ManyToOne(() => Category, category => category.exercises, { eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ nullable: true })
  videoUrl: string; // URL (ex: YouTube/Vimeo/MinIO) para o paciente ver como faz

  @OneToMany(() => ExerciseRule, rule => rule.exercise, { cascade: true, eager: true })
  rules: ExerciseRule[];

  @OneToMany(() => ExerciseCountRule, countRule => countRule.exercise, { cascade: true, eager: true })
  countRules: ExerciseCountRule[];

  @CreateDateColumn()
  createdAt: Date;
}
