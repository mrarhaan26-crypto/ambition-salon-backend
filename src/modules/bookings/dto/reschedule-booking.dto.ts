import { IsString, IsOptional } from 'class-validator';

export class RescheduleBookingDto {
  @IsString()
  startTime!: string;

  @IsOptional()
  @IsString()
  resourceId?: string;
}
