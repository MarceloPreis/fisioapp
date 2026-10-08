import { requireTenant, type AuthenticatedUser } from '../auth/current-user.decorator';
import { Patient } from '../patients/patient.entity';
import { Exercise } from '../exercises/exercise.entity';
import { In } from 'typeorm';
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './session.entity';
import { SessionExercise } from './session-exercise.entity';
import { SessionExecution } from '../executions/execution.entity';
import { CreateSessionDto, UpdateSessionDto } from './dto/session.dto';
import { SessionReview } from './session-review.entity';
import { CreateSessionReviewDto } from './dto/create-session-review.dto';
import { ReviewQueueDto } from './dto/review-queue.dto';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
    @InjectRepository(SessionExercise)
    private sessionExercisesRepository: Repository<SessionExercise>,
    @InjectRepository(SessionReview)
    private sessionReviewsRepository: Repository<SessionReview>,
  ) {}

  async getReviewQueue(query: ReviewQueueDto, tenantId: string) {
    const scopedTenantId = requireTenant(tenantId);
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException('A data inicial deve ser anterior ou igual à data final.');
    }

    const sessionsQuery = this.sessionsRepository.createQueryBuilder('session')
      .innerJoinAndSelect('session.patient', 'patient')
      .leftJoinAndSelect('session.sessionExercises', 'sessionExercise')
      .leftJoinAndSelect('sessionExercise.exercise', 'exercise')
      .select([
        'session.id', 'session.title', 'session.status', 'session.scheduledDate', 'session.createdAt',
        'patient.id', 'patient.fullName',
        'sessionExercise.id', 'sessionExercise.sets', 'sessionExercise.reps', 'sessionExercise.completedSets',
        'exercise.id', 'exercise.title',
      ])
      .where('session.tenantId = :tenantId', { tenantId: scopedTenantId })
      .andWhere('session.isTemplate = false')
      .andWhere('session.status IN (:...statuses)', { statuses: ['CONCLUIDO', 'PARCIAL'] })
      .orderBy('session.scheduledDate', 'ASC')
      .addOrderBy('session.createdAt', 'ASC')
      .addOrderBy('session.id', 'ASC');
    if (query.from) {
      sessionsQuery.andWhere('COALESCE(session.scheduledDate, session.createdAt::date) >= :fromDate', {
        fromDate: query.from,
      });
    }
    if (query.to) {
      sessionsQuery.andWhere('COALESCE(session.scheduledDate, session.createdAt::date) <= :toDate', {
        toDate: query.to,
      });
    }
    if (query.patientId) sessionsQuery.andWhere('session.patientId = :patientId', { patientId: query.patientId });

    const sessions = await sessionsQuery.getMany();
    if (!sessions.length) return { items: [] };

    const reviews = await this.sessionReviewsRepository.find({
      where: { tenantId: scopedTenantId, sessionId: In(sessions.map(session => session.id)) },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    const latestBySession = new Map<string, SessionReview>();
    for (const review of reviews) if (!latestBySession.has(review.sessionId)) latestBySession.set(review.sessionId, review);

    const items = sessions.flatMap(session => {
      const latest = latestBySession.get(session.id);
      if (query.reviewStatus === 'PENDING' && latest) return [];
      if (query.reviewStatus !== 'ALL' && query.reviewStatus !== 'PENDING' && latest?.disposition !== query.reviewStatus) return [];
      return [{
        id: session.id,
        title: session.title,
        status: session.status,
        scheduledDate: session.scheduledDate,
        createdAt: session.createdAt,
        patient: { id: session.patient.id, fullName: session.patient.fullName },
        sessionExercises: (session.sessionExercises || []).map(exercise => ({
          id: exercise.id,
          sets: exercise.sets,
          reps: exercise.reps,
          completedSets: exercise.completedSets,
          exercise: { id: exercise.exercise.id, title: exercise.exercise.title },
        })),
        latestReview: latest ? this.toReviewResponse(latest) : null,
      }];
    });
    return { items };
  }

  async getReviews(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    const reviews = await this.sessionReviewsRepository.find({
      where: { tenantId: requireTenant(tenantId), sessionId: id },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    return { items: reviews.map(review => this.toReviewResponse(review)) };
  }

  async addReview(id: string, dto: CreateSessionReviewDto, user: AuthenticatedUser) {
    if (user.role !== 'PHYSIO') throw new ForbiddenException();
    const tenantId = requireTenant(user.tenantId);
    const session = await this.findOne(id, tenantId);
    if (session.isTemplate || !['CONCLUIDO', 'PARCIAL'].includes(session.status)) {
      throw new BadRequestException('A sessão não está disponível para revisão.');
    }
    const review = await this.sessionReviewsRepository.save(this.sessionReviewsRepository.create({
      tenantId,
      sessionId: session.id,
      reviewerId: user.userId,
      reviewerName: user.name,
      disposition: dto.disposition,
      note: dto.note?.trim() || null,
    }));
    return this.toReviewResponse(review);
  }

  private toReviewResponse(review: SessionReview) {
    return {
      id: review.id,
      disposition: review.disposition,
      note: review.note,
      createdAt: review.createdAt,
      reviewer: { id: review.reviewerId, name: review.reviewerName },
    };
  }

  async findAll(tenantId: string, patientId?: string, isTemplate: boolean = false): Promise<Session[]> {
    const where: any = { tenantId: requireTenant(tenantId), isTemplate };
    if (patientId) where.patientId = patientId;
    return this.sessionsRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, tenantId: string): Promise<Session> {
    const session = await this.sessionsRepository.findOne({ where: { id, tenantId: requireTenant(tenantId) } });
    if (!session) throw new NotFoundException('Sessão não encontrada');
    return session;
  }

  async findAuthorized(id: string, user: { role: string; patientId?: string; tenantId: string }): Promise<Session> {
    const session = await this.findOne(id, user.tenantId);
    if (user.role !== 'PHYSIO' && (user.role !== 'PATIENT' || !user.patientId || session.patientId !== user.patientId)) throw new ForbiddenException();
    return session;
  }

  async create(createSessionDto: CreateSessionDto, tenantId: string): Promise<Session> {
    const { title, patientId, exercises, isTemplate, recurrenceDays, scheduledDate } = createSessionDto;
    
    const sessionPayload = {
      tenantId: requireTenant(tenantId), 
      title, 
      patientId,
      isTemplate: isTemplate || false,
      recurrenceDays: recurrenceDays || null,
      scheduledDate: scheduledDate ? scheduledDate.slice(0, 10) : null
    };
    
    // Use type assertion to avoid overloaded resolution issues
    const savedSession = await this.sessionsRepository.manager.transaction(async manager => {
      if (!await manager.findOne(Patient, { where: { id: patientId, tenantId: requireTenant(tenantId) } })) throw new BadRequestException('Paciente não encontrado.');
      await this.validateExercises(manager, exercises, tenantId);
      const saved = await manager.save(Session, manager.create(Session, sessionPayload as any));
      if (exercises?.length) await manager.save(SessionExercise, exercises.map(ex => manager.create(SessionExercise, { sessionId: saved.id, exerciseId: ex.exerciseId, sets: ex.sets, reps: ex.reps })));
      return saved;
    });

    return this.findOne(savedSession.id, tenantId);
  }

  async generateWeekSessions(tenantId: string): Promise<{ generated: number }> {
    return this.sessionsRepository.manager.transaction(async manager => {
      await manager.query('SELECT pg_advisory_xact_lock(73421)');
      const templates = await manager.find(Session, { where: { tenantId: requireTenant(tenantId), isTemplate: true } });
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
      const part = (type: string) => parts.find(value => value.type === type)!.value;
      const firstDay = new Date(part('year') + '-' + part('month') + '-' + part('day') + 'T00:00:00Z');
      firstDay.setUTCDate(firstDay.getUTCDate() - firstDay.getUTCDay());
      let generated = 0;
      for (const template of templates) {
        for (const dayIndex of new Set(template.recurrenceDays || [])) {
          const target = new Date(firstDay);
          target.setUTCDate(target.getUTCDate() + dayIndex);
          const date = target.toISOString().slice(0, 10);
          const existing = await manager.createQueryBuilder(Session, 'session')
            .where('session.tenantId = :tenantId', { tenantId: requireTenant(tenantId) })
            .andWhere('session.patientId = :patientId', { patientId: template.patientId })
            .andWhere('session.isTemplate = false')
            .andWhere('session.title = :title', { title: template.title })
            .andWhere('session.scheduledDate = :date', { date }).getOne();
          if (existing) continue;
          const session = await manager.save(Session, manager.create(Session, { tenantId: requireTenant(tenantId), patientId: template.patientId, title: template.title, isTemplate: false, scheduledDate: date }));
          await manager.save(SessionExercise, template.sessionExercises.map(exercise => manager.create(SessionExercise, { sessionId: session.id, exerciseId: exercise.exerciseId, sets: exercise.sets, reps: exercise.reps })));
          generated++;
        }
      }
      return { generated };
    });
  }

  async update(id: string, updateSessionDto: UpdateSessionDto, tenantId: string): Promise<Session> {
    const session = await this.findOne(id, tenantId);
    
    if (updateSessionDto.title !== undefined) session.title = updateSessionDto.title;
    if (updateSessionDto.status !== undefined) session.status = updateSessionDto.status;
    if (updateSessionDto.scheduledDate !== undefined) session.scheduledDate = updateSessionDto.scheduledDate.slice(0, 10);
    if (updateSessionDto.recurrenceDays !== undefined) session.recurrenceDays = updateSessionDto.recurrenceDays;

    const prescribedExercises = updateSessionDto.exercises;
    const prescriptionChanged = prescribedExercises !== undefined && JSON.stringify(prescribedExercises.map(ex => [ex.exerciseId, ex.sets, ex.reps]).sort()) !== JSON.stringify(session.sessionExercises.map(ex => [ex.exerciseId, ex.sets, ex.reps]).sort());
    
    const updates = updateSessionDto.exercisesCompletedSets || [];
    for (const exData of updates) {
      const exercise = session.sessionExercises.find(item => item.id === exData.sessionExerciseId);
      if (!exercise || exData.completedSets.length !== exercise.sets) throw new BadRequestException('Séries inválidas para a sessão.');
    }
    await this.sessionsRepository.manager.transaction(async manager => {
      if (prescriptionChanged) {
        const hasExecution = await manager.count(SessionExecution, { where: { sessionId: id, tenantId: requireTenant(tenantId) } });
        if (session.status !== 'PENDENTE' || hasExecution || session.sessionExercises.some(ex => ex.completedSets?.some(Boolean)) || updates.length) {
          throw new BadRequestException('Não é possível alterar os exercícios de uma sessão com execução registrada.');
        }
        await this.validateExercises(manager, prescribedExercises, tenantId);
      }
      await manager.save(Session, session);
      if (prescriptionChanged) {
        await manager.delete(SessionExercise, { sessionId: id });
        if (prescribedExercises?.length) await manager.save(SessionExercise, prescribedExercises.map(ex => manager.create(SessionExercise, { sessionId: id, exerciseId: ex.exerciseId, sets: ex.sets, reps: ex.reps })));
      }
      for (const exData of updates) await manager.update(SessionExercise, { id: exData.sessionExerciseId, sessionId: id }, { completedSets: exData.completedSets });
    });

    return this.findOne(id, tenantId);
  }

  private async validateExercises(manager: import('typeorm').EntityManager, exercises: { exerciseId: string }[] | undefined, tenantId: string) {
    const ids = [...new Set((exercises || []).map(exercise => exercise.exerciseId))];
    if (ids.length && await manager.count(Exercise, { where: { id: In(ids), tenantId: requireTenant(tenantId) } }) !== ids.length) throw new BadRequestException('Exercício não encontrado na clínica.');
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const session = await this.findOne(id, tenantId);
    if (await this.sessionReviewsRepository.count({ where: { tenantId: requireTenant(tenantId), sessionId: id } })) {
      throw new BadRequestException('Sessão possui revisões; o histórico deve ser preservado.');
    }
    await this.sessionsRepository.remove(session);
  }
}
