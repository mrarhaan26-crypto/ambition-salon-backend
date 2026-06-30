import { Controller, Get, Param } from '@nestjs/common';
import { BranchesService } from './branches.service';

@Controller('branches')
export class BranchesController {
  constructor(private readonly service: BranchesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/overview')
  getOverview(@Param('id') id: string) {
    return this.service.getOverview(id);
  }

  @Get(':id/staff')
  getStaff(@Param('id') id: string) {
    return this.service.getStaff(id);
  }

  @Get(':id/services')
  getServices(@Param('id') id: string) {
    return this.service.getServices(id);
  }

  @Get(':id/bookings')
  getBookings(@Param('id') id: string) {
    return this.service.getBookings(id);
  }

  @Get(':id/inventory')
  getInventory(@Param('id') id: string) {
    return this.service.getInventory(id);
  }
}
