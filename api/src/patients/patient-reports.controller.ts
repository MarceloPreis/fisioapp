import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PhysioGuard } from '../auth/physio.guard';
import { CreatePatientReportDto } from './dto/patient-report.dto';
import { PatientReportsService } from './patient-reports.service';

@Controller('patients/:patientId/reports')
@UseGuards(JwtAuthGuard, PhysioGuard)
export class PatientReportsController {
  constructor(private readonly reports: PatientReportsService) {}
  @Get()
  list(@Param('patientId', ParseUUIDPipe) patientId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.list(patientId, user.tenantId);
  }
  @Post()
  create(@Param('patientId', ParseUUIDPipe) patientId: string, @Body() dto: CreatePatientReportDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.create(patientId, dto, user);
  }
}
