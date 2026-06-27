import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { GlobalSearchController } from './global-search.controller';
import { GlobalSearchService } from './global-search.service';

@Module({
  controllers: [GlobalSearchController],
  providers: [GlobalSearchService, PrismaService],
  exports: [GlobalSearchService],
})
export class GlobalSearchModule {}
