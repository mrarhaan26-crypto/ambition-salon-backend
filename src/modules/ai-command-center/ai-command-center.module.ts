import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AiSchedulerModule } from '../ai-scheduler/ai-scheduler.module';
import { CalendarAnalyticsModule } from '../calendar-analytics/calendar-analytics.module';
import { AiCommandCenterController } from './ai-command-center.controller';
import { AiCommandCenterService } from './ai-command-center.service';

@Module({
  imports: [AiSchedulerModule, CalendarAnalyticsModule],
  controllers: [AiCommandCenterController],
  providers: [AiCommandCenterService, PrismaService],
  exports: [AiCommandCenterService],
})
export class AiCommandCenterModule {}
