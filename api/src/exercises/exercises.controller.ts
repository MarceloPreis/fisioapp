import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { ParseUUIDPipe } from '@nestjs/common';
import { PhysioGuard } from '../auth/physio.guard';
import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { ExercisesService } from './exercises.service';
import { CreateExerciseDto, UpdateExerciseDto } from './dto/exercise.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard, PhysioGuard)
@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Post()
  create(@Body() createExerciseDto: CreateExerciseDto, @CurrentUser() user: AuthenticatedUser) {
    return this.exercisesService.create(createExerciseDto, user.tenantId);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.exercisesService.findAll(user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.exercisesService.findOne(id, user.tenantId);
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateExerciseDto: UpdateExerciseDto, @CurrentUser() user: AuthenticatedUser) {
    return this.exercisesService.update(id, updateExerciseDto, user.tenantId);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.exercisesService.remove(id, user.tenantId);
  }
}
