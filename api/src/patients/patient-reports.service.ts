import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientReport } from './patient-report.entity';
import { Patient } from './patient.entity';
import { User } from '../users/user.entity';
import { requireTenant, type AuthenticatedUser } from '../auth/current-user.decorator';
import { CreatePatientReportDto } from './dto/patient-report.dto';

@Injectable()
export class PatientReportsService {
  constructor(@InjectRepository(PatientReport) private readonly reports: Repository<PatientReport>) {}

  async list(patientId: string, tenantId: string) {
    requireTenant(tenantId);
    const patient = await this.reports.manager.findOne(Patient, { where: { id: patientId, tenantId }, select: { id: true, fullName: true } });
    if (!patient) throw new NotFoundException('Paciente não encontrado.');
    const reports = await this.reports.createQueryBuilder('report')
      .leftJoin('report.author', 'author')
      .select(['report.id', 'report.title', 'report.content', 'report.createdAt', 'author.id', 'author.name'])
      .where('report.patientId = :patientId AND report.tenantId = :tenantId', { patientId, tenantId })
      .orderBy('report.createdAt', 'DESC').addOrderBy('report.id', 'DESC').getMany();
    return { patient, reports };
  }

  async create(patientId: string, dto: CreatePatientReportDto, user: AuthenticatedUser) {
    const tenantId = requireTenant(user.tenantId);
    return this.reports.manager.transaction(async manager => {
      if (!await manager.findOne(Patient, { where: { id: patientId, tenantId } })) throw new NotFoundException('Paciente não encontrado.');
      if (!await manager.findOne(User, { where: { id: user.userId, tenantId, role: 'PHYSIO' } })) throw new NotFoundException('Fisioterapeuta não encontrado.');
      return manager.save(PatientReport, manager.create(PatientReport, { patientId, tenantId, authorId: user.userId, title: dto.title, content: dto.content }));
    });
  }
}
