import { Controller, Get, Query } from '@nestjs/common';
import { AiCommandCenterService } from './ai-command-center.service';

@Controller('ai-command-center')
export class AiCommandCenterController {
  constructor(private readonly service: AiCommandCenterService) {}

  @Get('dashboard')
  dashboard(@Query() query: any) {
    return this.service.getDashboard(query);
  }

  @Get('insights')
  insights(@Query() query: any) {
    return this.service.getInsights(query);
  }

  @Get('capacity-forecast')
  capacityForecast(@Query() query: any) {
    return this.service.getCapacityForecast(query);
  }

  @Get('staff-performance')
  staffPerformance(@Query() query: any) {
    return this.service.getStaffPerformance(query);
  }

  @Get('recommendations')
  recommendations(@Query() query: any) {
    return this.service.getRecommendations(query);
  }
}
