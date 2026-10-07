import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PhysioGuard } from '../auth/physio.guard';
import { AppointmentsService } from './appointments.service';
import { AppointmentDto } from './dto/appointment.dto';
@UseGuards(JwtAuthGuard, PhysioGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}
  @Get() findAll(@Request() req: any) { return this.service.findAll(req.user.tenantId); }
  @Post() create(@Body() body: AppointmentDto, @Request() req: any) { return this.service.save(body, req.user.userId, req.user.tenantId); }
  @Put(':id') update(@Param('id', ParseUUIDPipe) id: string, @Body() body: AppointmentDto, @Request() req: any) { return this.service.save(body, req.user.userId, req.user.tenantId, id); }
  @Delete(':id') remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) { return this.service.remove(id, req.user.userId, req.user.tenantId); }
}
