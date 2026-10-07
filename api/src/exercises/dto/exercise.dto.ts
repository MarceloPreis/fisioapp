import { IsString, IsOptional, IsBoolean, IsNumber, IsInt, Min, Max, IsUUID, IsArray, ArrayMaxSize, MaxLength, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
export class CreateExerciseRuleDto {
  @IsString()
  @MaxLength(4000)
  jointA: string;
  @IsString()
  @MaxLength(4000)
  jointB: string;
  @IsString()
  @MaxLength(4000)
  jointC: string;
  @IsString()
  @MaxLength(4000)
  conditionOperator: string;
  @IsNumber()
  @Min(0)
  targetAngle: number;
  @IsString()
  @MaxLength(4000)
  validationPlane: string;
  @IsString()
  @MaxLength(4000)
  feedbackMessage: string;
}

export class CreateExerciseCountRuleDto {
  @IsString()
  @MaxLength(4000)
  jointA: string;
  @IsString()
  @MaxLength(4000)
  jointB: string;
  @IsString()
  @MaxLength(4000)
  jointC: string;
  @IsNumber()
  @Min(0)
  angleMin: number;
  @IsNumber()
  @Min(0)
  angleMax: number;
  @IsString()
  @MaxLength(4000)
  validationPlane: string;
}

export class CreateExerciseDto {
  @IsString()
  @MaxLength(4000)
  title: string;
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  videoUrl?: string;
  @IsOptional()
  @IsUUID()
  categoryId?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CreateExerciseRuleDto)
  rules?: CreateExerciseRuleDto[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CreateExerciseCountRuleDto)
  countRules?: CreateExerciseCountRuleDto[];
}

export class UpdateExerciseDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  title?: string;
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  videoUrl?: string;
  @IsOptional()
  @IsUUID()
  categoryId?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CreateExerciseRuleDto)
  rules?: CreateExerciseRuleDto[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CreateExerciseCountRuleDto)
  countRules?: CreateExerciseCountRuleDto[];
}
