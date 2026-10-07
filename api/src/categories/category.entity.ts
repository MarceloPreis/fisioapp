import { Unique } from 'typeorm';
import { TenantOwned } from '../tenants/tenant-owned.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { Exercise } from '../exercises/exercise.entity';

@Entity('categories')
@Unique(['tenantId', 'name'])
export class Category extends TenantOwned {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @OneToMany(() => Exercise, exercise => exercise.category)
  exercises: Exercise[];

  @CreateDateColumn()
  createdAt: Date;
}
