import { IsString, IsOptional, IsBoolean, IsNumber, IsInt, Min, Max, IsUUID, IsArray, ArrayMaxSize, MaxLength, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
export class CreateExecutionNoteDto {
  @IsNumber()
  @Min(0)
  timestampSeconds: number;
  @IsString()
  @MaxLength(4000)
  description: string;
}

export class CreateExecutionDto {
  @IsUUID()
  sessionId: string;
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  videoObjectName?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CreateExecutionNoteDto)
  notes?: CreateExecutionNoteDto[];
}
