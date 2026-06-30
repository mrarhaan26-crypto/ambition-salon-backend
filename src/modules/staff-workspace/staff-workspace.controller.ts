import { Controller, Get, Query } from '@nestjs/common';
import { StaffWorkspaceService } from './staff-workspace.service';

@Controller('staff-workspace')
export class StaffWorkspaceController {
  constructor(private readonly service: StaffWorkspaceService) {}

  @Get()
  getFull(@Query() query: any) {
    return this.service.getFull(query);
  }

  @Get('today')
  getToday(@Query('staffId') staffId: string) {
    return this.service.getToday(staffId);
  }

  @Get('bookings')
  getBookings(@Query('staffId') staffId: string, @Query('date') date: string) {
    return this.service.getBookings(staffId, date);
  }

  @Get('tasks')
  getTasks(@Query('staffId') staffId: string) {
    return this.service.getTasks(staffId);
  }

  @Get('commission')
  getCommission(@Query('staffId') staffId: string) {
    return this.service.getCommission(staffId);
  }

  @Get('attendance')
  getAttendance(@Query('staffId') staffId: string) {
    return this.service.getAttendance(staffId);
  }
}
