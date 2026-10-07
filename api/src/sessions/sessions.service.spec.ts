const tenantId = '00000000-0000-4000-8000-000000000001';
import { SessionsService } from './sessions.service';
import { SessionExecution } from '../executions/execution.entity';
import { Session } from './session.entity';
import { SessionExercise } from './session-exercise.entity';

describe('session editing', () => {
  function setup(status = 'PENDENTE', executions = 0) {
    const session = {
      id: 'session', title: 'Original', status, isTemplate: false,
      sessionExercises: [{ id: 'row', exerciseId: 'exercise', sets: 3, reps: '10', completedSets: [] }],
    };
    const manager = {
      count: jest.fn().mockImplementation(async entity => entity === SessionExecution ? executions : 1),
      save: jest.fn().mockImplementation(async (_entity, value) => value),
      delete: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockImplementation((_entity, value) => value),
    };
    const repository = {
      findOne: jest.fn().mockResolvedValue(session),
      manager: { transaction: jest.fn().mockImplementation(fn => fn(manager)) },
    };
    const service = new SessionsService(repository as any, {} as any);
    return { service, manager, session };
  }

  it('updates scheduling and prescription of a pending session in one transaction', async () => {
    const { service, manager, session } = setup();
    await service.update('session', { title: 'Atualizado', scheduledDate: '2026-10-09', recurrenceDays: [], exercises: [{ exerciseId: 'new', sets: 4, reps: '12' }] }, tenantId);
    expect(session.title).toBe('Atualizado');
    expect(manager.save).toHaveBeenCalledWith(Session, expect.objectContaining({ scheduledDate: '2026-10-09' }));
    expect(manager.delete).toHaveBeenCalledWith(SessionExercise, { sessionId: 'session' });
    expect(manager.save).toHaveBeenCalledWith(SessionExercise, [{ sessionId: 'session', exerciseId: 'new', sets: 4, reps: '12' }]);
  });

  it('preserves exercise identities and progress when editing a completed session without changing exercises', async () => {
    const { service, manager } = setup('CONCLUIDO', 1);
    await service.update('session', { title: 'Atualizado', exercises: [{ exerciseId: 'exercise', sets: 3, reps: '10' }] }, tenantId);
    expect(manager.delete).not.toHaveBeenCalled();
    expect(manager.save).toHaveBeenCalledTimes(1);
  });

  it.each([['CONCLUIDO', 0], ['PARCIAL', 0], ['PENDENTE', 1]])('protects prescription history for %s with %i executions', async (status, executions) => {
    const { service, manager } = setup(status, executions);
    await expect(service.update('session', { exercises: [{ exerciseId: 'new', sets: 2, reps: '8' }] }, tenantId)).rejects.toThrow('execução registrada');
    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.delete).not.toHaveBeenCalled();
  });

  it('updates the recurrence of a template', async () => {
    const { service, session, manager } = setup();
    session.isTemplate = true;
    await service.update('session', { recurrenceDays: [1, 3, 5] }, tenantId);
    expect(manager.save).toHaveBeenCalledWith(Session, expect.objectContaining({ recurrenceDays: [1, 3, 5], isTemplate: true }));
  });
});
