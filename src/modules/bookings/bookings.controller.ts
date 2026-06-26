import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { BookingsService } from './bookings.service';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly service: BookingsService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }
  @Get('calendar/summary')
  calendarSummary(@Query() query: any) {
    return this.service.calendarSummary(query);
  }


  
  @Get('calendar/day')
  calendarDay(@Query() query: any) {
    return this.service.calendarDay(query);
  }

  @Get('calendar/week')
  calendarWeek(@Query() query: any) {
    return this.service.calendarWeek(query);
  }

  @Get('calendar/month')
  calendarMonth(@Query() query: any) {
    return this.service.calendarMonth(query);
  }

  @Get('calendar')
  calendar(@Query() query: any) {
    return this.service.calendar(query);
  }

  @Get('slots')
  getAvailableSlots(@Query() query: any) {
    return this.service.getAvailableSlots(query);
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

  @Patch(':id/reschedule')
  reschedule(@Param('id') id: string, @Body() body: any) {
    return this.service.reschedule(id, body);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Body() body: any) {
    return this.service.cancel(id, body);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: BookingStatus) {
    return this.service.updateStatus(id, status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}





