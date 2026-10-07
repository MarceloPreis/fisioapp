import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { SaveWeeklyPlanDto } from './dto/weekly-plan.dto';
import { ParseUUIDPipe, Query } from '@nestjs/common';
import { SearchPatientsDto } from './dto/search-patients.dto';
import { PhysioGuard } from '../auth/physio.guard';
import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto, UpdatePatientDto } from './dto/patient.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard, PhysioGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  create(@Body() createPatientDto: CreatePatientDto, @CurrentUser() user: AuthenticatedUser) {
    return this.patientsService.create(createPatientDto, user.tenantId);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.patientsService.findAll(user.tenantId);
  }

  @Get(':id/weekly-plan')
  getWeeklyPlan(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) { return this.patientsService.getWeeklyPlan(id, user.tenantId); }

  @Get('search')
  search(@Query() query: SearchPatientsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.patientsService.search(query.name || '', user.tenantId);
  }

  @Put(':id/weekly-plan')
  saveWeeklyPlan(@Param('id', ParseUUIDPipe) id: string, @Body() body: SaveWeeklyPlanDto, @CurrentUser() user: AuthenticatedUser) { return this.patientsService.saveWeeklyPlan(id, body, user.tenantId); }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.patientsService.findOne(id, user.tenantId);
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updatePatientDto: UpdatePatientDto, @CurrentUser() user: AuthenticatedUser) {
    return this.patientsService.update(id, updatePatientDto, user.tenantId);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.patientsService.remove(id, user.tenantId);
  }
}
