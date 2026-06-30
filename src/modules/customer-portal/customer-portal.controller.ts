import { Controller, Get, Param, Patch, Body, Query } from '@nestjs/common';
import { CustomerPortalService } from './customer-portal.service';

@Controller('customer-portal')
export class CustomerPortalController {
  constructor(private readonly service: CustomerPortalService) {}

  @Get('profile')
  getProfile(@Query() query: any) {
    return this.service.getProfile(query);
  }

  @Patch('profile')
  updateProfile(@Body() body: any) {
    return this.service.updateProfile(body);
  }

  @Get('bookings')
  getBookings(@Query() query: any) {
    return this.service.getBookings(query);
  }

  @Get('bookings/:id')
  getBooking(@Param('id') id: string) {
    return this.service.getBooking(id);
  }

  @Get('wallet')
  getWallet(@Query() query: any) {
    return this.service.getWallet(query);
  }

  @Get('memberships')
  getMemberships(@Query() query: any) {
    return this.service.getMemberships(query);
  }

  @Get('packages')
  getPackages(@Query() query: any) {
    return this.service.getPackages(query);
  }

  @Get('loyalty')
  getLoyalty(@Query() query: any) {
    return this.service.getLoyalty(query);
  }
}
