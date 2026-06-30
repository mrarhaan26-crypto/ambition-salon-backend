import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get('summary')
  summary() {
    return this.service.summary();
  }

  @Get('staff/:staffId')
  findByStaff(@Param('staffId') staffId: string) {
    return this.service.findByStaff(staffId);
  }

  @Post('clock-in')
  clockIn(@Body('staffId') staffId: string) {
    return this.service.clockIn(staffId);
  }

  @Post('clock-out')
  clockOut(@Body('staffId') staffId: string) {
    return this.service.clockOut(staffId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }
}
