import { requireTenant } from '../auth/current-user.decorator';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './appointment.entity';
import { Patient } from '../patients/patient.entity';
import { AppointmentDto } from './dto/appointment.dto';
@Injectable()
export class AppointmentsService {
  constructor(@InjectRepository(Appointment) private repository: Repository<Appointment>,
    @InjectRepository(Patient) private patients: Repository<Patient>) {}
  findAll(tenantId: string): Promise<Appointment[]> { return this.repository.find({ where: { tenantId: requireTenant(tenantId) }, order: { startTime: 'ASC' } }); }
  private async owned(id: string, userId: string, tenantId: string) {
    const appointment = await this.repository.findOneBy({ id, tenantId: requireTenant(tenantId) });
    if (!appointment) throw new NotFoundException();
    if (appointment.therapistId !== userId) throw new ForbiddenException();
    return appointment;
  }
  async save(dto: AppointmentDto, userId: string, tenantId: string, id?: string) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    if (!Number.isFinite(startTime.getTime()) || !Number.isFinite(endTime.getTime()) || startTime >= endTime) throw new BadRequestException('Intervalo invalido.');
    const appointment = id ? await this.owned(id, userId, tenantId) : this.repository.create({ therapistId: userId, tenantId: requireTenant(tenantId) });
    const patient = await this.patients.findOneBy({ id: dto.patientId, tenantId: requireTenant(tenantId) });
    if (!patient) throw new BadRequestException('Paciente não encontrado.');
    if (!dto.title?.trim()) throw new BadRequestException('Informe o título do evento.');
    Object.assign(appointment, { patientId: patient.id, patientName: patient.fullName, title: dto.title.trim(), description: dto.description, startTime, endTime });
    return this.repository.save(appointment);
  }
  async remove(id: string, userId: string, tenantId: string) { await this.repository.remove(await this.owned(id, userId, tenantId)); }
}
