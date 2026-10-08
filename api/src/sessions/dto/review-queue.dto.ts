import { IsDateString, IsIn, IsOptional, IsUUID, Matches } from 'class-validator';

export const REVIEW_QUEUE_STATUSES = ['ALL', 'PENDING', 'REVIEWED', 'FOLLOW_UP', 'NEXT_VISIT'] as const;
export type ReviewQueueStatus = typeof REVIEW_QUEUE_STATUSES[number];

export class ReviewQueueDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  to?: string;

  @IsOptional()
  @IsIn(REVIEW_QUEUE_STATUSES)
  reviewStatus: ReviewQueueStatus = 'ALL';
}
