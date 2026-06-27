import { IsBooleanString, IsEnum, IsOptional, IsString } from 'class-validator';
import { NotificationPriority, NotificationType } from '@prisma/client';

export class NotificationQueryDto {
  @IsOptional() @IsString()
  branchId?: string;

  @IsOptional() @IsString()
  userId?: string;

  @IsOptional() @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional() @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional() @IsBooleanString()
  read?: string;

  @IsOptional() @IsBooleanString()
  archived?: string;

  @IsOptional() @IsString()
  from?: string;

  @IsOptional() @IsString()
  to?: string;
}
