const tenantId = '00000000-0000-4000-8000-000000000001';
import { AppointmentsService } from './appointments.service';
describe('Local appointments', () => {
  it('rejects a patient that does not exist', async () => {
    const repository = { create: () => ({}), save: jest.fn() };
    const patients = { findOneBy: jest.fn().mockResolvedValue(null) };
    await expect(new AppointmentsService(repository as any, patients as any).save(dto, 'u', tenantId)).rejects.toThrow('Paciente não encontrado.');
    expect(repository.save).not.toHaveBeenCalled();
  });
  const dto = { patientId: '11111111-1111-4111-8111-111111111111', title: 'Avaliação', startTime: '2026-10-07T12:00:00Z', endTime: '2026-10-07T13:00:00Z' };
  it('rejects inverted intervals before saving', async () => {
    const repository = { save: jest.fn() };
    await expect(new AppointmentsService(repository as any, { findOneBy: async () => ({ id: dto.patientId, fullName: 'Synthetic' }) } as any).save({ ...dto, endTime: dto.startTime }, 'u', tenantId)).rejects.toThrow();
    expect(repository.save).not.toHaveBeenCalled();
  });
  it('prevents editing another therapist appointment', async () => {
    const repository = { findOneBy: async () => ({ therapistId: 'other' }), save: jest.fn() };
    await expect(new AppointmentsService(repository as any, { findOneBy: async () => ({ id: dto.patientId, fullName: 'Synthetic' }) } as any).save(dto, 'u', tenantId, 'id')).rejects.toThrow();
    expect(repository.save).not.toHaveBeenCalled();
  });
  it('creates appointments without an external provider', async () => {
    const repository = { create: (value: any) => value, save: async (value: any) => value };
    await expect(new AppointmentsService(repository as any, { findOneBy: async () => ({ id: dto.patientId, fullName: 'Synthetic' }) } as any).save(dto, 'u', tenantId)).resolves.toMatchObject({ therapistId: 'u', patientId: dto.patientId, patientName: 'Synthetic', title: dto.title });
  });
});
