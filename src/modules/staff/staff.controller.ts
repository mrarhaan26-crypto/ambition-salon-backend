import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { StaffService } from './staff.service';

@Controller('staff')
export class StaffController {
  constructor(private readonly service: StaffService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.service.findAll(query);
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

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get(':id/schedule')
  getSchedule(@Param('id') id: string, @Query() query: any) {
    return this.service.getSchedule(id, query);
  }

  @Patch(':id/schedule')
  updateSchedule(@Param('id') id: string, @Body() body: any) {
    return this.service.updateSchedule(id, body);
  }

  @Get(':id/performance')
  getPerformance(@Param('id') id: string) {
    return this.service.getPerformance(id);
  }

  @Get(':id/bookings')
  getBookings(@Param('id') id: string, @Query() query: any) {
    return this.service.getBookings(id, query);
  }
}
