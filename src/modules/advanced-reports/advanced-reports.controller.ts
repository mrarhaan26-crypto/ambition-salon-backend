import { Controller, Get, Query } from '@nestjs/common';
import { AdvancedReportsService } from './advanced-reports.service';

@Controller('advanced-reports')
export class AdvancedReportsController {
  constructor(private readonly service: AdvancedReportsService) {}

  @Get()
  getBasicStats() {
    return this.service.getBasicStats();
  }

  @Get('revenue')
  getRevenueStats() {
    return this.service.getRevenueStats();
  }

  @Get('bookings')
  getBookingStats() {
    return this.service.getBookingStats();
  }

  @Get('clients')
  getClientStats() {
    return this.service.getClientStats();
  }

  @Get('staff')
  getStaffStats() {
    return this.service.getStaffStats();
  }

  @Get('inventory')
  getInventoryStats() {
    return this.service.getInventoryStats();
  }

  @Get('finance')
  getFinanceStats() {
    return this.service.getFinanceStats();
  }

  @Get('export-csv')
  getExportCsv() {
    return this.service.getExportCsv();
  }
}
