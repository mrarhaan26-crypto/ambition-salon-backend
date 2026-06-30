import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { MarketingService } from './marketing.service';

@Controller('marketing')
export class MarketingController {
  constructor(private readonly service: MarketingService) {}

  @Get()
  getDashboard(@Query() query: any) {
    return this.service.getDashboard(query);
  }

  @Get('campaigns')
  getCampaigns(@Query() query: any) {
    return this.service.getCampaigns(query);
  }

  @Get('campaigns/:id')
  getCampaign(@Param('id') id: string) {
    return this.service.getCampaign(id);
  }

  @Post('campaigns')
  createCampaign(@Body() body: any) {
    return this.service.createCampaign(body);
  }

  @Patch('campaigns/:id')
  updateCampaign(@Param('id') id: string, @Body() body: any) {
    return this.service.updateCampaign(id, body);
  }

  @Delete('campaigns/:id')
  removeCampaign(@Param('id') id: string) {
    return this.service.removeCampaign(id);
  }

  @Get('audience')
  getAudience() {
    return this.service.getAudience();
  }

  @Get('templates')
  getTemplates() {
    return this.service.getTemplates();
  }
}
