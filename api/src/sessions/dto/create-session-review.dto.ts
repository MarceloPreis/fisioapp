import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSessionReviewDto {
  @IsIn(['REVIEWED', 'FOLLOW_UP', 'NEXT_VISIT'])
  disposition: 'REVIEWED' | 'FOLLOW_UP' | 'NEXT_VISIT';

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  note?: string;
}
