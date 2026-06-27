import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CalendarAnalyticsController } from './calendar-analytics.controller';
import { CalendarAnalyticsService } from './calendar-analytics.service';

@Module({
  controllers: [CalendarAnalyticsController],
  providers: [CalendarAnalyticsService, PrismaService],
  exports: [CalendarAnalyticsService],
})
export class CalendarAnalyticsModule {}
