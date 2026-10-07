import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class WeeklyPlanExerciseDto {
  @IsUUID() exerciseId: string;
  @IsInt() @Min(1) @Max(200) sets: number;
  @IsString() @MinLength(1) @MaxLength(200) reps: string;
}
export class WeeklyPlanRoutineDto {
  @IsOptional() @IsUUID() id?: string;
  @IsString() @MinLength(1) @MaxLength(200) title: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  recurrenceDays: number[];
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => WeeklyPlanExerciseDto)
  exercises: WeeklyPlanExerciseDto[];
}
export class SaveWeeklyPlanDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => WeeklyPlanRoutineDto)
  routines: WeeklyPlanRoutineDto[];
}
