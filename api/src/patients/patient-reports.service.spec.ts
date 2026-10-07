import { ValidationPipe } from '@nestjs/common';
import { PatientReportsService } from './patient-reports.service';
import { CreatePatientReportDto } from './dto/patient-report.dto';

const tenantId = '00000000-0000-4000-8000-000000000001';
const user = { tenantId, userId: 'author', role: 'PHYSIO' } as any;
describe('Patient progress reports', () => {
  it('rejects a patient outside the clinic before saving', async () => {
    const manager = { findOne: jest.fn().mockResolvedValue(null), save: jest.fn() };
    const service = new PatientReportsService({ manager: { transaction: async fn => fn(manager) } } as any);
    await expect(service.create('foreign', { title: 'Synthetic', content: '**Observation**' }, user)).rejects.toThrow('Paciente não encontrado');
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('assigns clinic, patient and author from trusted context', async () => {
    const manager = { findOne: jest.fn().mockResolvedValue({}), create: jest.fn((_entity, data) => data), save: jest.fn(async (_entity, data) => data) };
    const service = new PatientReportsService({ manager: { transaction: async fn => fn(manager) } } as any);
    await expect(service.create('patient', { title: 'Synthetic', content: '# Observation' }, user)).resolves.toEqual({ title: 'Synthetic', content: '# Observation', tenantId, patientId: 'patient', authorId: 'author' });
  });
  it('does not list reports from a patient outside the clinic', async () => {
    const repository = { manager: { findOne: jest.fn().mockResolvedValue(null) }, createQueryBuilder: jest.fn() };
    await expect(new PatientReportsService(repository as any).list('foreign', tenantId)).rejects.toThrow('Paciente não encontrado');
    expect(repository.createQueryBuilder).not.toHaveBeenCalled();
  });
  it('rejects blank reports, oversized contents and forged ownership', async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
    for (const data of [{ title: ' ', content: 'Synthetic' }, { title: 'Synthetic', content: ' ' }, { title: 'Synthetic', content: 'x'.repeat(100001) }, { title: 'Synthetic', content: 'Text', tenantId: 'foreign' }, { title: 'Synthetic', content: 'Text', authorId: 'foreign' }]) await expect(pipe.transform(data, { type: 'body', metatype: CreatePatientReportDto })).rejects.toThrow();
    await expect(pipe.transform({ title: ' Synthetic ', content: ' **Text** ' }, { type: 'body', metatype: CreatePatientReportDto })).resolves.toMatchObject({ title: 'Synthetic', content: '**Text**' });
  });
});
