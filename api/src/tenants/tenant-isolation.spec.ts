import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from '../auth/jwt.strategy';
import { PatientsService } from '../patients/patients.service';
import { SessionsService } from '../sessions/sessions.service';
import { ExecutionsService } from '../executions/executions.service';
import { ExercisesService } from '../exercises/exercises.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { Patient } from '../patients/patient.entity';

const a = '00000000-0000-4000-8000-000000000001';
const b = '00000000-0000-4000-8000-000000000002';
describe('Clinic isolation', () => {
  it('rejects legacy tokens and tokens for a different clinic before patient lookup', async () => {
    const patients = { findByUserId: jest.fn().mockResolvedValue(null) };
    const strategy = new JwtStrategy({ findById: async () => ({ id: 'u', tenantId: a, role: 'PHYSIO' }) } as any, patients as any);
    for (const tenantId of [undefined, '', b]) await expect(strategy.validate({ sub: 'u', role: 'PHYSIO', tenantId })).rejects.toThrow(UnauthorizedException);
    expect(patients.findByUserId).not.toHaveBeenCalled();
    await expect(strategy.validate({ sub: 'u', role: 'PHYSIO', tenantId: a })).resolves.toMatchObject({ tenantId: a });
    expect(patients.findByUserId).toHaveBeenCalledWith('u', a);
  });
  it('hides another clinic patient from reads, updates, deletes and weekly plans', async () => {
    const findOne = jest.fn(async ({ where }) => where.tenantId === b ? { id: 'p', tenantId: b } : null);
    const manager = { findOne: jest.fn((_entity, options) => findOne(options)), save: jest.fn(), delete: jest.fn(), query: jest.fn() };
    const repository = { findOne, remove: jest.fn(), manager: { transaction: async fn => fn(manager) } };
    const service = new PatientsService(repository as any, {} as any);
    for (const operation of [() => service.findOne('p', a), () => service.update('p', {}, a), () => service.remove('p', a), () => service.getWeeklyPlan('p', a), () => service.saveWeeklyPlan('p', { routines: [] }, a)]) await expect(operation()).rejects.toThrow('Paciente não encontrado');
    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.delete).not.toHaveBeenCalled();
    expect(repository.remove).not.toHaveBeenCalled();
  });
  it('fails closed when a service is called without tenant context', async () => {
    const repository = { find: jest.fn() };
    const service = new PatientsService(repository as any, {} as any);
    await expect(service.findAll(undefined!)).rejects.toThrow(UnauthorizedException);
    expect(repository.find).not.toHaveBeenCalled();
  });
  it('rejects prescriptions referencing a patient from another clinic', async () => {
    const manager = { findOne: jest.fn().mockResolvedValue(null), save: jest.fn() };
    const service = new SessionsService({ manager: { transaction: async fn => fn(manager) } } as any, {} as any);
    await expect(service.create({ patientId: 'foreign', title: 'Synthetic', exercises: [] }, a)).rejects.toThrow('Paciente não encontrado');
    expect(manager.findOne).toHaveBeenCalledWith(Patient, { where: { id: 'foreign', tenantId: a } });
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('rejects prescriptions referencing an exercise from another clinic', async () => {
    const manager = { findOne: jest.fn().mockResolvedValue({ id: 'p' }), count: jest.fn().mockResolvedValue(0), save: jest.fn() };
    const service = new SessionsService({ manager: { transaction: async fn => fn(manager) } } as any, {} as any);
    await expect(service.create({ patientId: 'p', title: 'Synthetic', exercises: [{ exerciseId: 'foreign', sets: 1, reps: '1' }] }, a)).rejects.toThrow('Exercício não encontrado');
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('rejects a foreign category before saving an exercise', async () => {
    const repository = { manager: { findOne: jest.fn().mockResolvedValue(null) }, save: jest.fn() };
    await expect(new ExercisesService(repository as any, {} as any, {} as any).create({ title: 'Synthetic', categoryId: 'foreign' }, a)).rejects.toThrow('Categoria não encontrada');
    expect(repository.save).not.toHaveBeenCalled();
  });
  it('does not sign videos belonging to another clinic', async () => {
    const storage = { generatePresignedUrl: jest.fn() };
    const service = new ExecutionsService({ findOne: jest.fn().mockResolvedValue(null) } as any, {} as any, {} as any, {} as any, storage as any);
    await expect(service.getSignedVideoUrl('foreign', { tenantId: a, role: 'PHYSIO' })).rejects.toThrow('Execução não encontrada');
    expect(storage.generatePresignedUrl).not.toHaveBeenCalled();
  });
  it('filters the clinic agenda and refuses another clinic patient', async () => {
    const repository = { find: jest.fn(), create: jest.fn(), save: jest.fn() };
    const service = new AppointmentsService(repository as any, { findOneBy: jest.fn().mockResolvedValue(null) } as any);
    service.findAll(a);
    expect(repository.find).toHaveBeenCalledWith({ where: { tenantId: a }, order: { startTime: 'ASC' } });
    await expect(service.save({ patientId: 'foreign', title: 'Synthetic', startTime: '2026-10-07T12:00:00Z', endTime: '2026-10-07T13:00:00Z' }, 'u', a)).rejects.toThrow('Paciente não encontrado');
    expect(repository.save).not.toHaveBeenCalled();
  });
});
