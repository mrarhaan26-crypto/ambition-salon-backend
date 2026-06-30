import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PublicBookingService } from './public-booking.service';

@Controller('public')
export class PublicBookingController {
  constructor(private readonly service: PublicBookingService) {}

  @Get('booking-profile')
  getProfile() {
    return this.service.getProfile();
  }

  @Get('booking-services')
  getServices() {
    return this.service.getServices();
  }

  @Get('booking-staff')
  getStaff() {
    return this.service.getStaff();
  }

  @Get('booking-slots')
  getSlots(@Query() query: any) {
    return this.service.getSlots(query);
  }

  @Post('bookings')
  createBooking(@Body() body: any) {
    return this.service.createBooking(body);
  }
}
