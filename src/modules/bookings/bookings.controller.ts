import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { BookingsService } from './bookings.service';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly service: BookingsService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get('calendar')
  calendar(@Query() query: any) {
    return this.service.calendar(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }
@Patch(':id/status')
updateStatus(@Param('id') id: string, @Body() body: any) {
  return this.service.updateStatus(id, body.status);
}                                                                   
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
