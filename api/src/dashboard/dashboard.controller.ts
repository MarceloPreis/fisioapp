import { CurrentUser, type AuthenticatedUser, requireTenant } from '../auth/current-user.decorator';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PhysioGuard } from '../auth/physio.guard';
import { Patient } from '../patients/patient.entity';
import { Session } from '../sessions/session.entity';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PhysioGuard)
export class DashboardController {
  constructor(
    @InjectRepository(Patient) private readonly patients: Repository<Patient>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
  ) {}

  @Get('stats')
  async stats(@CurrentUser() user: AuthenticatedUser) {
    const tenantId = requireTenant(user.tenantId);
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    const createdAt = Between(periodStart, periodEnd);
    const [registeredPatients, pendingSessions, completedSessions] = await Promise.all([
      this.patients.count({ where: { tenantId, createdAt } }),
      this.sessions.count({ where: { tenantId, createdAt, status: 'PENDENTE', isTemplate: false } }),
      this.sessions.createQueryBuilder('session')
        .where('session.tenantId = :tenantId', { tenantId })
        .andWhere('session.status = :status', { status: 'CONCLUIDO' })
        .andWhere('session.isTemplate = :isTemplate', { isTemplate: false })
        .andWhere(`EXISTS (
          SELECT 1 FROM session_executions execution
          WHERE execution."sessionId" = session.id
            AND execution."createdAt" BETWEEN :periodStart AND :periodEnd
        )`, { periodStart, periodEnd })
        .getCount(),
    ]);
    return { registeredPatients, pendingSessions, completedSessions, periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() };
  }
}
