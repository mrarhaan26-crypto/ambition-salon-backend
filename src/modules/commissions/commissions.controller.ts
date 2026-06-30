import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CommissionsService } from './commissions.service';

@Controller('commissions')
export class CommissionsController {
  constructor(private readonly service: CommissionsService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get('summary')
  summary() {
    return this.service.summary();
  }

  @Get('rules')
  findAllRules() {
    return this.service.findAllRules();
  }

  @Get('staff/:staffId')
  findByStaff(@Param('staffId') staffId: string) {
    return this.service.findByStaff(staffId);
  }

  @Post('rules')
  createRule(@Body() body: any) {
    return this.service.createRule(body);
  }

  @Patch('rules/:id')
  updateRule(@Param('id') id: string, @Body() body: any) {
    return this.service.updateRule(id, body);
  }

  @Delete('rules/:id')
  removeRule(@Param('id') id: string) {
    return this.service.removeRule(id);
  }
}
