import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEvent } from './audit.entity';
@Injectable()
export class AuditIntegrityService implements OnModuleInit {
  constructor(@InjectRepository(AuditEvent) private repository: Repository<AuditEvent>) {}
  async onModuleInit() {
    if (process.env.NODE_ENV !== 'production') return;
    const [result] = await this.repository.query(`SELECT
      EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid = 'audit_events'::regclass AND tgname = 'sitf_audit_no_mutation' AND tgenabled = 'O') AS protected,
      (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS superuser,
      (SELECT relowner = (SELECT oid FROM pg_roles WHERE rolname = current_user) FROM pg_class WHERE oid = 'audit_events'::regclass) AS owner`);
    if (!result.protected || result.superuser || result.owner) throw new Error('Auditoria requer migração aplicada e usuário de execução sem privilégios de proprietário ou superusuário.');
  }
}
