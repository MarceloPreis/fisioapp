import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ type: 'varchar', nullable: true, unique: true }) cnpj: string | null;
  @CreateDateColumn() createdAt: Date;
}
