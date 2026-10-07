import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExercisesService } from './exercises.service';
import { ExercisesController } from './exercises.controller';
import { Exercise } from './exercise.entity';
import { ExerciseRule } from './exercise-rule.entity';
import { ExerciseCountRule } from './exercise-count-rule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Exercise, ExerciseRule, ExerciseCountRule])],
  controllers: [ExercisesController],
  providers: [ExercisesService],
})
export class ExercisesModule {}
