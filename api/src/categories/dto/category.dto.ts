import { IsString, IsOptional, IsBoolean, IsNumber, IsInt, Min, Max, IsUUID, IsArray, ArrayMaxSize, MaxLength, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
export class CreateCategoryDto {
  @IsString()
  @MaxLength(4000)
  name: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  name?: string;
}
