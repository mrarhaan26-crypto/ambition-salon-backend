import { Controller, Get, Query } from '@nestjs/common';
import { CalendarAnalyticsService } from './calendar-analytics.service';

@Controller('calendar-analytics')
export class CalendarAnalyticsController {
  constructor(private readonly service: CalendarAnalyticsService) {}

  @Get('overview')
  overview(@Query() query: any) {
    return this.service.overview(query);
  }

  @Get('trends')
  trends(@Query() query: any) {
    return this.service.trends(query);
  }
}
