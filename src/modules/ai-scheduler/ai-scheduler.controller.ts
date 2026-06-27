import { Controller, Get, Query } from '@nestjs/common';
import { AiSchedulerService } from './ai-scheduler.service';

@Controller('ai-scheduler')
export class AiSchedulerController {
  constructor(private readonly service: AiSchedulerService) {}

  @Get('suggest')
  suggest(@Query() query: any) {
    return this.service.suggest(query);
  }

  @Get('optimize-day')
  optimizeDay(@Query() query: any) {
    return this.service.optimizeDay(query);
  }
}
