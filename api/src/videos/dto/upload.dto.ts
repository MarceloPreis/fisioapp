import { IsInt, IsUUID, IsString, MaxLength, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
export class InitUploadDto {
  @IsInt() @Min(1) @Max(2048) totalChunks: number;
}
export class ChunkDto {
  @IsUUID() uploadId: string;
  @Type(() => Number) @IsInt() @Min(0) @Max(2047) chunkIndex: number;
}
export class CompleteUploadDto {
  @IsUUID() uploadId: string;
  @IsString() @MaxLength(255) fileName: string;
}
