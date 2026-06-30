import { Controller, Get } from '@nestjs/common';
import { CrmIntelligenceService } from './crm-intelligence.service';

@Controller('crm-intelligence')
export class CrmIntelligenceController {
  constructor(private readonly service: CrmIntelligenceService) {}

  @Get()
  getDashboard() { return this.service.getDashboard(); }

  @Get('segments')
  getSegments() { return this.service.getSegments(); }

  @Get('vips')
  getVips() { return this.service.getVips(); }

  @Get('inactive')
  getInactive() { return this.service.getInactive(); }

  @Get('birthdays')
  getBirthdays() { return this.service.getBirthdays(); }

  @Get('recommendations')
  getRecommendations() { return this.service.getRecommendations(); }
}
