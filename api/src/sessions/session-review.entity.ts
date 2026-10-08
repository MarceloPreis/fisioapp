import { TenantOwned } from '../tenants/tenant-owned.entity';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('session_reviews')
export class SessionReview extends TenantOwned {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @Column()
  reviewerId: string;

  @Column()
  reviewerName: string;

  @Column({ type: 'varchar', length: 20 })
  disposition: 'REVIEWED' | 'FOLLOW_UP' | 'NEXT_VISIT';

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
