import { IsDateString, IsOptional, IsString, MaxLength, MinLength, IsUUID, Matches } from 'class-validator';
export class AppointmentDto {
  @IsUUID() patientId: string;
  @IsString() @MinLength(1) @MaxLength(200) @Matches(/\S/) title: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @IsDateString() startTime: string;
  @IsDateString() endTime: string;
}
