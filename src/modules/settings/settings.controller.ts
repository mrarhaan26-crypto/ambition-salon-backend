import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  getAll(@Query() query: any) {
    return this.service.getAll(query);
  }

  @Patch()
  update(@Body() body: any) {
    return this.service.update(body);
  }

  @Get('business')
  getBusiness() {
    return this.service.getBusiness();
  }

  @Patch('business')
  updateBusiness(@Body() body: any) {
    return this.service.updateBusiness(body);
  }

  @Get('branches')
  getBranches() {
    return this.service.getBranches();
  }

  @Post('branches')
  createBranch(@Body() body: any) {
    return this.service.createBranch(body);
  }

  @Patch('branches/:id')
  updateBranch(@Param('id') id: string, @Body() body: any) {
    return this.service.updateBranch(id, body);
  }

  @Delete('branches/:id')
  removeBranch(@Param('id') id: string) {
    return this.service.removeBranch(id);
  }
}
