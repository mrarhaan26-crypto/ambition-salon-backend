import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { BookingStatus } from '@prisma/client';

class CreateBookingServiceDto {
  @IsString()
  name!: string;

  @IsNumber()
  durationMin!: number;

  @IsNumber()
  price!: number;

  @IsOptional()
  @IsString()
  serviceId?: string;
}

export class CreateBookingDto {
  @IsString()
  branchId!: string;

  @IsString()
  clientId!: string;

  @IsString()
  staffId!: string;

  @IsString()
  startTime!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBookingServiceDto)
  services!: CreateBookingServiceDto[];

  @IsOptional()
  @IsNumber()
  bufferBeforeMinutes?: number;

  @IsOptional()
  @IsNumber()
  bufferAfterMinutes?: number;
}
