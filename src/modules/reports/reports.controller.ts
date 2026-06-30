import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get()
  getDashboard(@Query() query: any) {
    return this.service.getDashboard(query);
  }

  @Get('revenue')
  getRevenue(@Query() query: any) {
    return this.service.getRevenue(query);
  }

  @Get('bookings')
  getBookings(@Query() query: any) {
    return this.service.getBookings(query);
  }

  @Get('clients')
  getClients(@Query() query: any) {
    return this.service.getClients(query);
  }

  @Get('staff')
  getStaff(@Query() query: any) {
    return this.service.getStaff(query);
  }

  @Get('inventory')
  getInventory(@Query() query: any) {
    return this.service.getInventory(query);
  }

  @Get('export-summary')
  getExportSummary(@Query() query: any) {
    return this.service.getExportSummary(query);
  }
}
