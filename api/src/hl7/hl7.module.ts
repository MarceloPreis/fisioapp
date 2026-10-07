import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from '../patients/patient.entity';
import { AuditEvent } from '../audit/audit.entity';
import { Hl7Service } from './hl7.service';
@Module({ imports: [TypeOrmModule.forFeature([Patient, AuditEvent])], providers: [Hl7Service] })
export class Hl7Module {}
