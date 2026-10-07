const tenantId = '00000000-0000-4000-8000-000000000001';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { PatientsController } from '../src/patients/patients.controller';
import { PatientsService } from '../src/patients/patients.service';
import { UsersService } from '../src/users/users.service';
import { SessionsController } from '../src/sessions/sessions.controller';
import { SessionsService } from '../src/sessions/sessions.service';
import { ExecutionsController } from '../src/executions/executions.controller';
import { ExecutionsService } from '../src/executions/executions.service';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { getJwtSecret } from '../src/auth/jwt-secret';
import { AuditInterceptor } from '../src/audit/audit.interceptor';
import { AuditEvent } from '../src/audit/audit.entity';
import { PatientReportsController } from '../src/patients/patient-reports.controller';
import { PatientReportsService } from '../src/patients/patient-reports.service';

const patientId = '11111111-1111-4111-8111-111111111111';
const sessionId = '22222222-2222-4222-8222-222222222222';
const otherSessionId = '33333333-3333-4333-8333-333333333333';
describe('HTTP authorization (synthetic fixtures, no clinical database)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const audit = { insert: jest.fn(async () => ({})) };
  const reports = { list: jest.fn(async () => ({ patient: { id: patientId, fullName: 'Synthetic' }, reports: [] })), create: jest.fn(async () => ({ id: sessionId, title: 'Synthetic', content: '**Observation**' })) };
  const repository = { findOne: async ({ where }: any) => ({ id: where.id, patientId: where.id === sessionId ? patientId : 'other', sessionExercises: [] }), find: jest.fn(async () => []) };
  const patients = { search: jest.fn(async () => [{ id: patientId, fullName: 'Synthetic' }]), findByUserId: async (id: string) => id === 'patient-user' ? { id: patientId } : null, findAll: async () => [], create: jest.fn(async () => ({ id: patientId })), getWeeklyPlan: jest.fn(async () => ({ patient: { id: patientId }, routines: [] })), saveWeeklyPlan: jest.fn(async (_id: string, dto: any) => dto) };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({ secret: getJwtSecret() })],
      controllers: [PatientsController, PatientReportsController, SessionsController, ExecutionsController],
      providers: [JwtStrategy, AuditInterceptor,
        { provide: getRepositoryToken(AuditEvent), useValue: audit },
        { provide: PatientsService, useValue: patients },
        { provide: PatientReportsService, useValue: reports },
        { provide: UsersService, useValue: { findById: async (id: string) => ({ id, tenantId, role: id === 'physio-user' ? 'PHYSIO' : 'PATIENT' }) } },
        { provide: SessionsService, useValue: new SessionsService(repository as any, {} as any) },
        { provide: ExecutionsService, useValue: { getSignedVideoUrl: async () => ({ url: 'http://localhost/synthetic' }) } },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalInterceptors(module.get(AuditInterceptor));
    await app.init();
    jwt = module.get(JwtService);
  });
  afterAll(async () => app.close());
  const cookie = (role: string) => `Authentication=${jwt.sign({ tenantId, sub: role === 'PHYSIO' ? 'physio-user' : 'patient-user', role, patientId: role === 'PATIENT' ? patientId : undefined })}`;
  it('searches patient names only for therapists and validates query length', async () => {
    await request(app.getHttpServer()).get('/api/v1/patients/search?name=Synthetic').expect(401);
    await request(app.getHttpServer()).get('/api/v1/patients/search?name=Synthetic').set('Cookie', cookie('PATIENT')).expect(403);
    await request(app.getHttpServer()).get('/api/v1/patients/search').query({ name: 'x'.repeat(101) }).set('Cookie', cookie('PHYSIO')).expect(400);
    expect(patients.search).not.toHaveBeenCalled();
    const result = await request(app.getHttpServer()).get('/api/v1/patients/search?name=Synthetic').set('Cookie', cookie('PHYSIO')).expect(200);
    expect(result.body).toEqual([{ id: patientId, fullName: 'Synthetic' }]);
    expect(patients.search).toHaveBeenCalledWith('Synthetic', tenantId);
  });
  it('requires authentication', () => request(app.getHttpServer()).get('/api/v1/patients').expect(401));
  it('restricts reports to therapists, validates Markdown and audits additions without contents', async () => {
    const url = `/api/v1/patients/${patientId}/reports`;
    await request(app.getHttpServer()).get(url).expect(401);
    await request(app.getHttpServer()).get(url).set('Cookie', cookie('PATIENT')).expect(403);
    await request(app.getHttpServer()).post(url).set('Cookie', cookie('PATIENT')).send({ title: 'Synthetic', content: '**Observation**' }).expect(403);
    await request(app.getHttpServer()).get(url).set('Cookie', cookie('PHYSIO')).expect(200);
    expect(reports.list).toHaveBeenCalledWith(patientId, tenantId);
    for (const invalid of [{ title: ' ', content: 'Text' }, { title: 'Synthetic', content: ' ' }, { title: 'Synthetic', content: 'Text', tenantId }, { title: 'Synthetic', content: 'Text', authorId: patientId }]) await request(app.getHttpServer()).post(url).set('Cookie', cookie('PHYSIO')).send(invalid).expect(400);
    expect(reports.create).not.toHaveBeenCalled();
    await request(app.getHttpServer()).post(url).set('Cookie', cookie('PHYSIO')).send({ title: 'Synthetic', content: '**Observation**' }).expect(201);
    expect(reports.create).toHaveBeenCalledWith(patientId, expect.objectContaining({ title: 'Synthetic', content: '**Observation**' }), expect.objectContaining({ userId: 'physio-user', tenantId }));
    expect(audit.insert).toHaveBeenCalledWith(expect.objectContaining({ tenantId, action: 'POST:success', resourceId: sessionId }));
    for (const [event] of audit.insert.mock.calls as any) expect(event.content).toBeUndefined();
    await request(app.getHttpServer()).delete(`${url}/${sessionId}`).set('Cookie', cookie('PHYSIO')).expect(404);
  });
  it('rejects tokens without a clinic or claiming another clinic', async () => {
    for (const claimedTenant of [undefined, '00000000-0000-4000-8000-000000000002']) {
      const token = jwt.sign({ sub: 'physio-user', role: 'PHYSIO', tenantId: claimedTenant });
      await request(app.getHttpServer()).get('/api/v1/patients').set('Cookie', `Authentication=${token}`).expect(401);
    }
  });
  it('restricts weekly plans to therapists and validates nested routines', async () => {
    const url = `/api/v1/patients/${patientId}/weekly-plan`;
    await request(app.getHttpServer()).get(url).expect(401);
    await request(app.getHttpServer()).get(url).set('Cookie', cookie('PATIENT')).expect(403);
    await request(app.getHttpServer()).put(url).set('Cookie', cookie('PATIENT')).send({ routines: [] }).expect(403);
    await request(app.getHttpServer()).get(url).set('Cookie', cookie('PHYSIO')).expect(200);
    const routine = { title: 'Synthetic A', recurrenceDays: [1, 3], exercises: [{ exerciseId: sessionId, sets: 3, reps: '10' }] };
    for (const invalid of [{ ...routine, recurrenceDays: [] }, { ...routine, recurrenceDays: [7] }, { ...routine, recurrenceDays: [1, 1] }, { ...routine, exercises: [] }, { ...routine, exercises: [{ exerciseId: sessionId, sets: 0, reps: '10' }] }]) {
      await request(app.getHttpServer()).put(url).set('Cookie', cookie('PHYSIO')).send({ routines: [invalid] }).expect(400);
    }
    expect(patients.saveWeeklyPlan).not.toHaveBeenCalled();
    await request(app.getHttpServer()).put(url).set('Cookie', cookie('PHYSIO')).send({ routines: [routine] }).expect(200);
    expect(patients.saveWeeklyPlan).toHaveBeenCalledWith(patientId, expect.objectContaining({ routines: [routine] }), tenantId);
    await request(app.getHttpServer()).put(url).set('Cookie', cookie('PHYSIO')).send({ routines: [] }).expect(200);
  });
  it('prevents patients from reading or creating clinical records', async () => {
    await request(app.getHttpServer()).get('/api/v1/patients').set('Cookie', cookie('PATIENT')).expect(403);
    await request(app.getHttpServer()).post('/api/v1/patients').set('Cookie', cookie('PATIENT')).send({}).expect(403);
    expect(patients.create).not.toHaveBeenCalled();
  });
  it('checks ownership on direct session URLs', async () => {
    await request(app.getHttpServer()).get(`/api/v1/sessions/${sessionId}`).set('Cookie', cookie('PATIENT')).expect(200);
    await request(app.getHttpServer()).get(`/api/v1/sessions/${otherSessionId}`).set('Cookie', cookie('PATIENT')).expect(403);
  });
  it('restricts signed URLs and records therapist access', async () => {
    await request(app.getHttpServer()).get(`/api/v1/executions/${sessionId}/video-url`).set('Cookie', cookie('PATIENT')).expect(403);
    await request(app.getHttpServer()).get(`/api/v1/executions/${sessionId}/video-url`).set('Cookie', cookie('PHYSIO')).expect(200);
    expect(audit.insert).toHaveBeenCalledWith(expect.objectContaining({ userId: 'physio-user', action: 'GET:success', resourceId: sessionId }));
  });
  it('rejects invalid IDs and unexpected fields', async () => {
    await request(app.getHttpServer()).get('/api/v1/sessions/invalid').set('Cookie', cookie('PHYSIO')).expect(400);
    await request(app.getHttpServer()).post('/api/v1/patients').set('Cookie', cookie('PHYSIO')).send({ fullName: 'Synthetic', medicalRecordNumber: 'TEST', birthDate: '2000-01-01', role: 'PHYSIO' }).expect(400);
    expect(patients.create).not.toHaveBeenCalled();
  });
});
