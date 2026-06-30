import { IsString, IsOptional } from 'class-validator';

export class GetBookingSlotsDto {
  @IsString()
  branchId!: string;

  @IsString()
  staffId!: string;

  @IsString()
  date!: string;

  @IsString()
  serviceIds!: string;

  @IsOptional()
  @IsString()
  slotSizeMinutes?: string;
}
