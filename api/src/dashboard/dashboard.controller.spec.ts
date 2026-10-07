const tenantId = '00000000-0000-4000-8000-000000000001';
const user = { tenantId } as any;
import { Between, Repository } from 'typeorm';
import { DashboardController } from './dashboard.controller';
import { Patient } from '../patients/patient.entity';
import { Session } from '../sessions/session.entity';

describe('DashboardController', () => {
  const periodEnd = new Date('2026-10-07T15:00:00Z');
  const periodStart = new Date('2026-09-30T15:00:00Z');
  beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(periodEnd); });
  afterEach(() => jest.useRealTimers());

  function sessionQuery() {
    return {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(3),
    };
  }
  it('returns totals for pending and completed sessions filtered independently over seven days', async () => {
    const patients = { count: jest.fn().mockResolvedValue(7) };
    const query = sessionQuery();
    const sessions = { count: jest.fn().mockResolvedValue(5), createQueryBuilder: jest.fn().mockReturnValue(query) };
    const controller = new DashboardController(
      patients as unknown as Repository<Patient>,
      sessions as unknown as Repository<Session>,
    );
    await expect(controller.stats(user)).resolves.toEqual({ registeredPatients: 7, pendingSessions: 5, completedSessions: 3, periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() });
    const createdAt = Between(periodStart, periodEnd);
    expect(patients.count).toHaveBeenCalledWith({ where: { tenantId, createdAt } });
    expect(query.andWhere).toHaveBeenCalledWith('session.status = :status', { status: 'CONCLUIDO' });
    expect(query.andWhere).toHaveBeenCalledWith('session.isTemplate = :isTemplate', { isTemplate: false });
    expect(query.andWhere).toHaveBeenCalledWith(expect.stringContaining('EXISTS'), { periodStart, periodEnd });
    expect(sessions.count).toHaveBeenCalledWith({ where: { tenantId, createdAt, status: 'PENDENTE', isTemplate: false } });
  });

  it('propagates database failures instead of reporting a false zero', async () => {
    const repository = { count: jest.fn().mockRejectedValue(new Error('Unavailable')), createQueryBuilder: jest.fn().mockReturnValue(sessionQuery()) };
    const controller = new DashboardController(repository as any, repository as any);
    await expect(controller.stats(user)).rejects.toThrow('Unavailable');
  });
});
