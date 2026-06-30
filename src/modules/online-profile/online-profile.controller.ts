import { Body, Controller, Get, Patch } from '@nestjs/common';
import { OnlineProfileService } from './online-profile.service';

@Controller()
export class OnlineProfileController {
  constructor(private readonly service: OnlineProfileService) {}

  @Get('online-profile')
  getProfile() {
    return this.service.getProfile();
  }

  @Patch('online-profile')
  updateProfile(@Body() body: any) {
    return this.service.updateProfile(body);
  }

  @Get('online-profile/services')
  getServices() {
    return this.service.getServices();
  }

  @Patch('online-profile/services')
  updateServices(@Body() body: any) {
    return this.service.updateServices(body);
  }

  @Get('online-profile/staff')
  getStaff() {
    return this.service.getStaff();
  }

  @Patch('online-profile/staff')
  updateStaff(@Body() body: any) {
    return this.service.updateStaff(body);
  }

  @Get('online-profile/availability')
  getAvailability() {
    return this.service.getAvailability();
  }

  @Patch('online-profile/availability')
  updateAvailability(@Body() body: any) {
    return this.service.updateAvailability(body);
  }

  @Get('public/booking-profile')
  getPublicProfile() {
    return this.service.getPublicProfile();
  }
}
