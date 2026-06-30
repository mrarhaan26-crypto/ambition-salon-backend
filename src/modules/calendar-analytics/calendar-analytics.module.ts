import { Module } from '@nestjs/common';
import { CalendarAnalyticsController } from './calendar-analytics.controller';
import { CalendarAnalyticsService } from './calendar-analytics.service';

@Module({
  controllers: [CalendarAnalyticsController],
  providers: [CalendarAnalyticsService],
  exports: [CalendarAnalyticsService],
})
export class CalendarAnalyticsModule {}
