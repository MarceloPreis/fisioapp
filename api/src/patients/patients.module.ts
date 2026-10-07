import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { Patient } from './patient.entity';
import { UsersModule } from '../users/users.module';
import { PatientReport } from './patient-report.entity';
import { PatientReportsService } from './patient-reports.service';
import { PatientReportsController } from './patient-reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Patient, PatientReport]), UsersModule],
  controllers: [PatientsController, PatientReportsController],
  providers: [PatientsService, PatientReportsService],
  exports: [PatientsService],
})
export class PatientsModule {}
