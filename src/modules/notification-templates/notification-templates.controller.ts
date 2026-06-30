import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { NotificationTemplatesService } from './notification-templates.service';

@Controller('notification-templates')
export class NotificationTemplatesController {
  constructor(private readonly service: NotificationTemplatesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: { name: string; subject?: string; body: string; variables?: string; channel?: string }) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<{ name: string; subject: string; body: string; variables: string; channel: string; isActive: boolean }>) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
