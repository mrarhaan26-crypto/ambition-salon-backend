import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { NotificationPriority, NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @IsOptional() @IsString()
  branchId?: string;

  @IsOptional() @IsString()
  userId?: string;

  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsOptional() @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsOptional() @IsString()
  link?: string;
}
