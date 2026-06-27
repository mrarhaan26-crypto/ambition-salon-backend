import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GlobalSearchQueryDto {
  @IsString()
  q!: string;

  @IsOptional() @IsString()
  branchId?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit?: number;
}
