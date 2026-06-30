import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { MembershipsService } from './memberships.service';

@Controller()
export class MembershipsController {
  constructor(private readonly service: MembershipsService) {}

  @Get('memberships')
  getMemberships(@Query() query: any) {
    return this.service.getMemberships(query);
  }

  @Get('memberships/:id')
  getMembership(@Param('id') id: string) {
    return this.service.getMembership(id);
  }

  @Post('memberships')
  createMembership(@Body() body: any) {
    return this.service.createMembership(body);
  }

  @Patch('memberships/:id')
  updateMembership(@Param('id') id: string, @Body() body: any) {
    return this.service.updateMembership(id, body);
  }

  @Delete('memberships/:id')
  removeMembership(@Param('id') id: string) {
    return this.service.removeMembership(id);
  }

  @Get('packages')
  getPackages(@Query() query: any) {
    return this.service.getPackages(query);
  }

  @Get('packages/:id')
  getPackage(@Param('id') id: string) {
    return this.service.getPackage(id);
  }

  @Post('packages')
  createPackage(@Body() body: any) {
    return this.service.createPackage(body);
  }

  @Patch('packages/:id')
  updatePackage(@Param('id') id: string, @Body() body: any) {
    return this.service.updatePackage(id, body);
  }

  @Delete('packages/:id')
  removePackage(@Param('id') id: string) {
    return this.service.removePackage(id);
  }

  @Get('clients/:id/memberships')
  getClientMemberships(@Param('id') id: string) {
    return this.service.getClientMemberships(id);
  }

  @Get('clients/:id/packages')
  getClientPackages(@Param('id') id: string) {
    return this.service.getClientPackages(id);
  }
}
