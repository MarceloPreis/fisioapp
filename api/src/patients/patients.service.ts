import { requireTenant } from '../auth/current-user.decorator';
import { PatientReport } from './patient-report.entity';
import { In } from 'typeorm';
import { Session } from '../sessions/session.entity';
import { SessionExercise } from '../sessions/session-exercise.entity';
import { Exercise } from '../exercises/exercise.entity';
import { SaveWeeklyPlanDto } from './dto/weekly-plan.dto';
import { User } from '../users/user.entity';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from './patient.entity';
import { CreatePatientDto, UpdatePatientDto } from './dto/patient.dto';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private patientsRepository: Repository<Patient>,
    private usersService: UsersService,
  ) {}

  async findByUserId(userId: string, tenantId: string): Promise<Patient | null> {
    return this.patientsRepository.findOne({ where: { userId, tenantId: requireTenant(tenantId) } });
  }

  async findAll(tenantId: string): Promise<Patient[]> {
    return this.patientsRepository.find({ where: { tenantId: requireTenant(tenantId) }, order: { createdAt: 'DESC' } });
  }

  async search(name: string, tenantId: string): Promise<Pick<Patient, 'id' | 'fullName'>[]> {
    // Literal substring search: bound parameters avoid SQL injection and wildcard expansion.
    const patients = await this.patientsRepository.createQueryBuilder('patient')
      .select(['patient.id', 'patient.fullName'])
      .where('patient.tenantId = :tenantId', { tenantId: requireTenant(tenantId) })
      .andWhere('POSITION(LOWER(:name) IN LOWER(patient.fullName)) > 0', { name: name.trim() })
      .orderBy('patient.fullName', 'ASC')
      .addOrderBy('patient.id', 'ASC')
      .take(20)
      .getMany();
    return patients.map(({ id, fullName }) => ({ id, fullName }));
  }

  async findOne(id: string, tenantId: string): Promise<Patient> {
    const patient = await this.patientsRepository.findOne({ where: { id, tenantId: requireTenant(tenantId) } });
    if (!patient) throw new NotFoundException('Paciente não encontrado');
    return patient;
  }

  async create(dto: CreatePatientDto, tenantId: string): Promise<Patient> {
    if (dto.mobileAccess && (!dto.email || !dto.password)) throw new BadRequestException('E-mail e senha obrigatórios.');
    return this.patientsRepository.manager.transaction(async manager => {
      const patient = manager.create(Patient, { tenantId: requireTenant(tenantId), fullName: dto.fullName, medicalRecordNumber: dto.medicalRecordNumber, birthDate: dto.birthDate });
      if (dto.mobileAccess) {
        if (await manager.findOne(User, { where: { email: dto.email } })) throw new BadRequestException('E-mail já está em uso.');
        const user = await manager.save(User, manager.create(User, { tenantId: requireTenant(tenantId), name: dto.fullName, email: dto.email, passwordHash: await bcrypt.hash(dto.password!, 12), role: 'PATIENT' }));
        patient.userId = user.id;
      }
      await manager.save(Patient, patient);
      return manager.findOneOrFail(Patient, { where: { id: patient.id, tenantId: requireTenant(tenantId) } });
    });
  }

  async update(id: string, dto: UpdatePatientDto, tenantId: string): Promise<Patient> {
    if (dto.mobileAccess && (!dto.email || !dto.password)) throw new BadRequestException('E-mail e senha obrigatórios.');
    return this.patientsRepository.manager.transaction(async manager => {
      const patient = await manager.findOne(Patient, { where: { id, tenantId: requireTenant(tenantId) } });
      if (!patient) throw new NotFoundException('Paciente não encontrado.');
      if (dto.mobileAccess && !patient.userId) {
        if (await manager.findOne(User, { where: { email: dto.email } })) throw new BadRequestException('E-mail já está em uso.');
        const user = await manager.save(User, manager.create(User, { tenantId: requireTenant(tenantId), name: dto.fullName || patient.fullName, email: dto.email, passwordHash: await bcrypt.hash(dto.password!, 12), role: 'PATIENT' }));
        patient.userId = user.id;
      }
      for (const key of ['fullName', 'medicalRecordNumber', 'birthDate'] as const) if (dto[key] !== undefined) patient[key] = dto[key]!;
      await manager.save(Patient, patient);
      return manager.findOneOrFail(Patient, { where: { id, tenantId: requireTenant(tenantId) } });
    });
  }

  async getWeeklyPlan(id: string, tenantId: string) {
    const patient = await this.findOne(id, tenantId);
    const routines = await this.patientsRepository.manager.find(Session, { where: { tenantId: requireTenant(tenantId), patientId: id, isTemplate: true }, order: { createdAt: 'ASC' } });
    return { patient, routines };
  }

  async saveWeeklyPlan(id: string, dto: SaveWeeklyPlanDto, tenantId: string) {
    return this.patientsRepository.manager.transaction(async manager => {
      // Serialize replacement and generation without inspecting clinical contents.
      await manager.query('SELECT pg_advisory_xact_lock(73421)');
      const patient = await manager.findOne(Patient, { where: { id, tenantId: requireTenant(tenantId) } });
      if (!patient) throw new NotFoundException('Paciente não encontrado.');
      const previous = await manager.find(Session, { where: { tenantId: requireTenant(tenantId), patientId: id, isTemplate: true } });
      const existingIds = new Set(previous.map(item => item.id));
      const titles = new Set<string>();
      const submittedIds = new Set<string>();
      for (const routine of dto.routines) {
        if (!routine.title.trim() || !routine.recurrenceDays.length || !routine.exercises.length || routine.exercises.some(exercise => !exercise.reps.trim())) throw new BadRequestException('Informe título, dias, exercícios e repetições de cada treino.');
        if (routine.id && (!existingIds.has(routine.id) || submittedIds.has(routine.id))) throw new BadRequestException('Modelo inválido para este paciente.');
        if (routine.id) submittedIds.add(routine.id);
        const title = routine.title.trim().toLocaleLowerCase('pt-BR');
        if (titles.has(title)) throw new BadRequestException('Use títulos diferentes para os treinos do paciente.');
        titles.add(title);
      }
      const exerciseIds = [...new Set(dto.routines.flatMap(routine => routine.exercises.map(exercise => exercise.exerciseId)))];
      if (exerciseIds.length && await manager.count(Exercise, { where: { id: In(exerciseIds), tenantId: requireTenant(tenantId) } }) !== exerciseIds.length) throw new BadRequestException('Um exercício não está mais disponível.');
      // Only templates are replaced. Scheduled sessions, executions and videos remain intact.
      await manager.delete(Session, { tenantId: requireTenant(tenantId), patientId: id, isTemplate: true });
      for (const routine of dto.routines) {
        const saved = await manager.save(Session, manager.create(Session, { tenantId: requireTenant(tenantId), patientId: id, title: routine.title.trim(), isTemplate: true, recurrenceDays: [...routine.recurrenceDays].sort((a, b) => a - b) }));
        await manager.save(SessionExercise, routine.exercises.map(exercise => manager.create(SessionExercise, { sessionId: saved.id, exerciseId: exercise.exerciseId, sets: exercise.sets, reps: exercise.reps.trim() })));
      }
      return { patient, routines: await manager.find(Session, { where: { tenantId: requireTenant(tenantId), patientId: id, isTemplate: true }, order: { createdAt: 'ASC' } }) };
    });
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const patient = await this.findOne(id, tenantId);
    if (await this.patientsRepository.manager.count(PatientReport, { where: { patientId: id, tenantId: requireTenant(tenantId) } })) throw new BadRequestException('Paciente possui relatórios de evolução e seu histórico deve ser preservado.');
    await this.patientsRepository.remove(patient);
  }
}
