import { Column, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Tenant } from './tenant.entity';

export abstract class TenantOwned {
  @Index()
  @Column({ type: 'uuid' }) tenantId: string;
  @ManyToOne(() => Tenant, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' }) tenant: Tenant;
}
