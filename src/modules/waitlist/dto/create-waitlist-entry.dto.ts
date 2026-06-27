import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateWaitlistEntryDto {
  @IsString()
  branchId!: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  staffId?: string;

  @IsDateString()
  requestedDate!: string;

  @IsOptional()
  @IsDateString()
  preferredStart?: string;

  @IsOptional()
  @IsDateString()
  preferredEnd?: string;

  @IsOptional()
  @IsString()
  serviceName?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}

