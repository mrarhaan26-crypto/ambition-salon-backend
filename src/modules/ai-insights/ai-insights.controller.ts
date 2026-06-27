import { Controller, Get, Query } from '@nestjs/common';
import { AiInsightsService } from './ai-insights.service';
import { AiInsightsQueryDto } from './dto/ai-insights-query.dto';

@Controller('ai-insights')
export class AiInsightsController {
  constructor(private readonly service: AiInsightsService) {}

  @Get()
  findAll(@Query() query: AiInsightsQueryDto) {
    return this.service.findAll(query);
  }

  @Get('business-health')
  businessHealth(@Query() query: AiInsightsQueryDto) {
    return this.service.businessHealth(query);
  }

  @Get('risk-alerts')
  riskAlerts(@Query() query: AiInsightsQueryDto) {
    return this.service.riskAlerts(query);
  }

  @Get('opportunities')
  opportunities(@Query() query: AiInsightsQueryDto) {
    return this.service.opportunities(query);
  }
}
