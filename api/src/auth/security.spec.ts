const tenantId = '00000000-0000-4000-8000-000000000001';
import { ForbiddenException, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { PhysioGuard } from './physio.guard';
import { JwtStrategy } from './jwt.strategy';
import { CreatePatientDto } from '../patients/dto/patient.dto';
import { UpdateSessionDto } from '../sessions/dto/session.dto';
import { SessionsService } from '../sessions/sessions.service';
import { LoginRateGuard } from './login-rate.guard';

const context = (user: any) => ({ switchToHttp: () => ({ getRequest: () => ({ user, ip: '127.0.0.1' }) }) }) as any;
describe('Authorization and input boundaries', () => {
  it('blocks patients from therapist endpoints', () => {
    expect(() => new PhysioGuard().canActivate(context({ tenantId, role: 'PATIENT' }))).toThrow(ForbiddenException);
    expect(new PhysioGuard().canActivate(context({ role: 'PHYSIO' }))).toBe(true);
  });
  it('blocks orphan patient credentials from therapist privileges', async () => {
    const strategy = new JwtStrategy({ findById: async () => ({ id: 'u', role: 'PATIENT' }) } as any, { findByUserId: async () => null } as any);
    await expect(strategy.validate({ sub: 'u', role: 'PHYSIO' })).rejects.toThrow(UnauthorizedException);
    await expect(strategy.validate({ sub: 'u', role: 'PATIENT', patientId: 'p' })).rejects.toThrow(UnauthorizedException);
  });
  it('allows only the owning patient to retrieve a session', async () => {
    const repository = { findOne: async () => ({ id: 's', patientId: 'p' }) };
    const service = new SessionsService(repository as any, {} as any);
    await expect(service.findAuthorized('s', { tenantId, role: 'PATIENT', patientId: 'other' })).rejects.toThrow(ForbiddenException);
    await expect(service.findAuthorized('s', { tenantId, role: 'PATIENT' })).rejects.toThrow(ForbiddenException);
    await expect(service.findAuthorized('s', { tenantId, role: 'PATIENT', patientId: 'p' })).resolves.toMatchObject({ id: 's' });
  });
  it('rejects cross-session series before saving', async () => {
    const repository = { findOne: async () => ({ id: 's', sessionExercises: [{ id: 'own', sets: 2 }] }), manager: { transaction: jest.fn() } };
    const service = new SessionsService(repository as any, {} as any);
    await expect(service.update('s', { exercisesCompletedSets: [{ sessionExerciseId: 'other', completedSets: [true] }] }, tenantId)).rejects.toThrow();
    expect(repository.manager.transaction).not.toHaveBeenCalled();
  });
  it('rejects unknown properties and invalid nested payloads', async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
    await expect(pipe.transform({ fullName: 'Synthetic', medicalRecordNumber: 'TEST', birthDate: '2000-01-01', userId: 'attacker' }, { type: 'body', metatype: CreatePatientDto })).rejects.toThrow();
    await expect(pipe.transform({ exercisesCompletedSets: [{ sessionExerciseId: 'bad', completedSets: ['yes'] }] }, { type: 'body', metatype: UpdateSessionDto })).rejects.toThrow();
  });
  it('rate limits login attempts', () => {
    const guard = new LoginRateGuard();
    for (let i = 0; i < 20; i++) expect(guard.canActivate(context(null))).toBe(true);
    expect(() => guard.canActivate(context(null))).toThrow();
  });
});
