import { IsOptional, IsString } from 'class-validator';

export class AiInsightsQueryDto {
  @IsOptional() @IsString()
  branchId?: string;

  @IsOptional() @IsString()
  from?: string;

  @IsOptional() @IsString()
  to?: string;
}
