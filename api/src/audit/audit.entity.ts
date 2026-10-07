import { TenantOwned } from '../tenants/tenant-owned.entity';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity('audit_events')
export class AuditEvent extends TenantOwned {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() userId: string;
  @Column() ip: string;
  @Column() action: string;
  @Column() resource: string;
  @Column({ nullable: true }) resourceId: string;
  @CreateDateColumn() createdAt: Date;
}
