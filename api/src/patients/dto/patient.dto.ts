import { MinLength, IsString, IsOptional, IsBoolean, IsNumber, IsInt, Min, Max, IsUUID, IsArray, ArrayMaxSize, MaxLength, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
export class CreatePatientDto {
  @IsString()
  @MaxLength(4000)
  fullName: string;
  @IsString()
  @MaxLength(4000)
  medicalRecordNumber: string;
  @IsDateString()
  birthDate: string;
  @IsOptional()
  @IsBoolean()
  mobileAccess?: boolean;
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  email?: string;
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  @MinLength(12)
  password?: string;
}

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  fullName?: string;
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  medicalRecordNumber?: string;
  @IsOptional()
  @IsDateString()
  birthDate?: string;
  @IsOptional()
  @IsBoolean()
  mobileAccess?: boolean;
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  email?: string;
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  @MinLength(12)
  password?: string;
}
