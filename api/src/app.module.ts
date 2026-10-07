import { Tenant } from './tenants/tenant.entity';
import { PatientReport } from './patients/patient-report.entity';
import { databaseEnvironment, environmentFiles } from './database/environment';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuditIntegrityService } from './audit/audit-integrity.service';
import { Hl7Module } from './hl7/hl7.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditEvent } from './audit/audit.entity';
import { AuditInterceptor } from './audit/audit.interceptor';
import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { ExercisesModule } from './exercises/exercises.module';
import { CategoriesModule } from './categories/categories.module';
import { SessionsModule } from './sessions/sessions.module';
import { StorageModule } from './storage/storage.module';
import { VideosModule } from './videos/videos.module';
import { ExecutionsModule } from './executions/executions.module';
import { User } from './users/user.entity';
import { Patient } from './patients/patient.entity';
import { Exercise } from './exercises/exercise.entity';
import { ExerciseRule } from './exercises/exercise-rule.entity';
import { ExerciseCountRule } from './exercises/exercise-count-rule.entity';
import { Category } from './categories/category.entity';
import { Session } from './sessions/session.entity';
import { SessionExercise } from './sessions/session-exercise.entity';
import { SessionExecution } from './executions/execution.entity';
import { ExecutionNote } from './executions/execution-note.entity';
import { UsersService } from './users/users.service';
import * as bcrypt from 'bcrypt';

import { AppointmentsModule } from './appointments/appointments.module';
import { Appointment } from './appointments/appointment.entity';
import { ConfigModule } from '@nestjs/config';

@Module({
  providers: [AuditIntegrityService, { provide: APP_INTERCEPTOR, useClass: AuditInterceptor }],
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: environmentFiles }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const database = databaseEnvironment();
        if (!process.env.DATABASE_URL && !database.password) throw new Error('Configure DB_PASSWORD, POSTGRES_PASSWORD ou DATABASE_URL.');
        if (process.env.DATABASE_URL) {
          return {
            type: 'postgres',
            url: process.env.DATABASE_URL,
            entities: [PatientReport, Tenant, AuditEvent, User, Patient, Category, Exercise, ExerciseRule, ExerciseCountRule, Session, SessionExercise, SessionExecution, ExecutionNote, Appointment],
            synchronize: false,
            ssl: process.env.DB_SSL === 'true'
              ? { rejectUnauthorized: true }
              : false,
          };
        }
        return {
          type: 'postgres',
          ...database,
          entities: [PatientReport, Tenant, AuditEvent, User, Patient, Category, Exercise, ExerciseRule, ExerciseCountRule, Session, SessionExercise, SessionExecution, ExecutionNote, Appointment],
          synchronize: false,
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
        };
      },
    }),
    TypeOrmModule.forFeature([AuditEvent]),
    Hl7Module,
    UsersModule,
    AuthModule,
    PatientsModule,
    CategoriesModule,
    ExercisesModule,
    SessionsModule,
    StorageModule,
    VideosModule,
    ExecutionsModule,
    AppointmentsModule,
    DashboardModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private usersService: UsersService) {}

  async onModuleInit() {
    const legacyAdmin = await this.usersService.findByEmail('admin');
    const legacyDefault = legacyAdmin && await bcrypt.compare('admin', legacyAdmin.passwordHash);
    if (legacyDefault && !(process.env.SEED_ADMIN === 'true' && process.env.ADMIN_EMAIL === 'admin')) throw new Error('Substitua a senha do administrador legado com SEED_ADMIN e ADMIN_PASSWORD.');
    if (process.env.SEED_ADMIN !== 'true') return;
    if (!process.env.ADMIN_TENANT_ID) throw new Error('Configure ADMIN_TENANT_ID para criar o administrador.');
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) throw new Error('Configure ADMIN_EMAIL e ADMIN_PASSWORD (mínimo 12 caracteres).');
    const adminExists = await this.usersService.findByEmail(process.env.ADMIN_EMAIL);
    if (adminExists) {
      const patient = await this.usersService.isPatientAccount(adminExists.id);
      if (patient) throw new Error('Conta de paciente não pode ser usada como administrador.');
      if (adminExists.role !== 'PHYSIO' || legacyDefault) await this.usersService.updateCredentials(adminExists.id, await bcrypt.hash(process.env.ADMIN_PASSWORD, 12));
    } else {
      const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
      await this.usersService.create({
        tenantId: process.env.ADMIN_TENANT_ID!,
        name: 'Administrador (Fisioterapeuta)',
        email: process.env.ADMIN_EMAIL,
        passwordHash,
        role: 'PHYSIO',
      });
    }
  }
}
