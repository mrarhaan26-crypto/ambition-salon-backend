import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { AutomationsService } from './automations.service';

@Controller('automations')
export class AutomationsController {
  constructor(private readonly service: AutomationsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('events')
  getEvents() {
    return this.service.getEvents();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: { name: string; triggerType: string; actionType: string; config?: string }) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<{ name: string; triggerType: string; actionType: string; config: string; isActive: boolean }>) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Post(':id/enable')
  enable(@Param('id') id: string) {
    return this.service.setActive(id, true);
  }

  @Post(':id/disable')
  disable(@Param('id') id: string) {
    return this.service.setActive(id, false);
  }
}
