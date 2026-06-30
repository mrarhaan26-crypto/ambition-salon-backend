import { Controller, Get, Post, Body } from '@nestjs/common';
import { OwnerCommandCenterService } from './owner-command-center.service';

@Controller('owner-command-center')
export class OwnerCommandCenterController {
  constructor(private readonly service: OwnerCommandCenterService) {}

  @Get()
  getDashboard() {
    return this.service.getDashboard();
  }

  @Get('health')
  getHealth() {
    return this.service.getHealth();
  }

  @Get('actions')
  getActions() {
    return this.service.getActions();
  }

  @Post('actions')
  createAction(@Body() body: any) {
    return this.service.createAction(body);
  }
}
