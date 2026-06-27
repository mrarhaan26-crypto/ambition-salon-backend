import { Controller, Get, Query } from '@nestjs/common';
import { DashboardAnalyticsService } from './dashboard-analytics.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@Controller('dashboard-analytics')
export class DashboardAnalyticsController {
  constructor(private readonly service: DashboardAnalyticsService) {}

  @Get('overview')
  overview(@Query() query: DashboardQueryDto) {
    return this.service.overview(query);
  }

  @Get('revenue')
  revenue(@Query() query: DashboardQueryDto) {
    return this.service.revenue(query);
  }

  @Get('operations')
  operations(@Query() query: DashboardQueryDto) {
    return this.service.operations(query);
  }

  @Get('staff')
  staff(@Query() query: DashboardQueryDto) {
    return this.service.staff(query);
  }

  @Get('client-activity')
  clientActivity(@Query() query: DashboardQueryDto) {
    return this.service.clientActivity(query);
  }
}
