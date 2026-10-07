import { IsIn, IsString, IsOptional, IsBoolean, IsNumber, IsInt, Min, Max, IsUUID, IsArray, ArrayMaxSize, MaxLength, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
export class SessionExerciseDto {
  @IsUUID()
  exerciseId: string;
  @IsNumber()
  @Min(0)
  @IsInt() @Min(1) @Max(200)
  sets: number;
  @IsString()
  @MaxLength(4000)
  reps: string;
}

export class CreateSessionDto {
  @IsString()
  @MaxLength(4000)
  title: string;
  @IsUUID()
  patientId: string;
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SessionExerciseDto)
  exercises: SessionExerciseDto[];
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  recurrenceDays?: number[];
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;
}

export class CompletedSetsDto {
  @IsUUID() sessionExerciseId: string;
  @IsArray() @ArrayMaxSize(200) @IsBoolean({ each: true }) completedSets: boolean[];
}

export class UpdateSessionDto {
  @IsOptional() @IsDateString()
  scheduledDate?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(200) @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true })
  recurrenceDays?: number[];
  @IsOptional() @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => SessionExerciseDto)
  exercises?: SessionExerciseDto[];
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  title?: string;
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  @IsIn(['PENDENTE', 'PARCIAL', 'CONCLUIDO'])
  status?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => CompletedSetsDto)
  exercisesCompletedSets?: CompletedSetsDto[];
}
