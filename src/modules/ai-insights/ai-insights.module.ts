import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AiInsightsController } from './ai-insights.controller';
import { AiInsightsService } from './ai-insights.service';

@Module({
  controllers: [AiInsightsController],
  providers: [AiInsightsService, PrismaService],
  exports: [AiInsightsService],
})
export class AiInsightsModule {}
