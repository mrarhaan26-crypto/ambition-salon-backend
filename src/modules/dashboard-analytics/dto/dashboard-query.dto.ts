import { IsOptional, IsString } from 'class-validator';

export class DashboardQueryDto {
  @IsOptional() @IsString()
  branchId?: string;

  @IsOptional() @IsString()
  from?: string;

  @IsOptional() @IsString()
  to?: string;
}
