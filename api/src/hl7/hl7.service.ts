import { requireTenant } from '../auth/current-user.decorator';
import { Tenant } from '../tenants/tenant.entity';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createServer, Server, Socket } from 'net';
import { randomUUID } from 'crypto';
import { Patient } from '../patients/patient.entity';
import { AuditEvent } from '../audit/audit.entity';
import { parseAdmission } from './hl7-parser';

@Injectable()
export class Hl7Service implements OnModuleInit, OnModuleDestroy {
  private server?: Server;
  private sockets = new Set<Socket>();
  constructor(@InjectRepository(Patient) private patients: Repository<Patient>, @InjectRepository(AuditEvent) private audit: Repository<AuditEvent>) {}
  async onModuleInit() {
    if (process.env.HL7_ENABLED !== 'true') return;
    const tenantId = requireTenant(process.env.HL7_TENANT_ID!);
    if (!await this.patients.manager.findOne(Tenant, { where: { id: tenantId } })) throw new Error('Clínica HL7 não encontrada.');
    const allowed = (process.env.HL7_ALLOWED_IPS || '127.0.0.1').split(',').map(ip => ip.trim());
    this.server = createServer(socket => {
      const ip = socket.remoteAddress?.replace(/^::ffff:/, '') || '';
      if (!allowed.includes(ip)) { socket.destroy(); return; }
      this.sockets.add(socket);
      socket.on('close', () => this.sockets.delete(socket));
      socket.on('error', () => socket.destroy());
      socket.setTimeout(30000, () => socket.destroy());
      let buffer = Buffer.alloc(0);
      let busy = false;
      socket.on('data', async data => {
        if (busy || buffer.length + data.length > 65536) { socket.destroy(); return; }
        buffer = Buffer.concat([buffer, data]);
        const end = buffer.indexOf(Buffer.from([0x1c, 0x0d]));
        if (end < 0) return;
        busy = true;
        let code = 'AE';
        let controlId = '';
        try {
          if (buffer[0] !== 0x0b || end + 2 !== buffer.length) throw new Error();
          const message = buffer.subarray(1, end).toString('utf8');
          controlId = message.split('\r')[0].split('|')[9] || '';
          if (!/^[a-zA-Z0-9._-]{1,100}$/.test(controlId)) throw new Error();
          const patient = parseAdmission(message);
          await this.patients.manager.transaction(async manager => {
            const result = await manager.upsert(Patient, { ...patient, tenantId }, ['tenantId', 'medicalRecordNumber']);
            await manager.insert(AuditEvent, { tenantId, userId: 'HL7', ip, action: 'ADT^A01', resource: 'patients', resourceId: result.identifiers[0]?.id || null });
          });
          code = 'AA';
        } catch { /* Do not log message content or identifiers. */ }
        const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
        socket.end(`\x0bMSH|^~\\&|SITF||HOSPITAL||${stamp}||ACK^A01|${randomUUID()}|P|2.5\rMSA|${code}|${controlId.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 100)}\r\x1c\r`);
      });
    });
    await new Promise<void>((resolve, reject) => { this.server!.once('error', reject); this.server!.listen(Number(process.env.HL7_PORT || 2575), process.env.HL7_HOST || '127.0.0.1', resolve); });
  }
  async onModuleDestroy() {
    for (const socket of this.sockets) socket.destroy();
    if (this.server?.listening) await new Promise<void>(resolve => this.server!.close(() => resolve()));
  }
}
