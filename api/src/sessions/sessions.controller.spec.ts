const tenantId = '00000000-0000-4000-8000-000000000001';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { UpdateSessionDto } from './dto/session.dto';

describe('session editing permissions', () => {
  const changes: UpdateSessionDto[] = [
    { title: 'Treino' }, { scheduledDate: '2026-10-09' },
    { recurrenceDays: [1] }, { exercises: [] },
  ];

  it.each(changes)('does not allow patients to modify the prescription: %o', async change => {
    const service = { findAuthorized: jest.fn().mockResolvedValue({}), update: jest.fn() };
    const controller = new SessionsController(service as unknown as SessionsService);
    await expect(controller.update('session', change, { user: { tenantId, role: 'PATIENT', patientId: 'patient' } })).rejects.toThrow();
    expect(service.update).not.toHaveBeenCalled();
  });

  it('allows the physiotherapist to edit the prescription', async () => {
    const service = { findAuthorized: jest.fn().mockResolvedValue({}), update: jest.fn().mockResolvedValue({ id: 'session' }) };
    const controller = new SessionsController(service as unknown as SessionsService);
    const change = { title: 'Treino', recurrenceDays: [1] };
    await controller.update('session', change, { user: { tenantId, role: 'PHYSIO' } });
    expect(service.update).toHaveBeenCalledWith('session', change, tenantId);
  });
});
