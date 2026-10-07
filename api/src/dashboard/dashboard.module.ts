import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from '../patients/patient.entity';
import { Session } from '../sessions/session.entity';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Patient, Session])],
  controllers: [DashboardController],
})
export class DashboardModule {}
