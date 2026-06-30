import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { DeliverySettingsService } from './delivery-settings.service';

@Controller('delivery-settings')
export class DeliverySettingsController {
  constructor(private readonly service: DeliverySettingsService) {}

  @Get()
  getSettings() { return this.service.getSettings(); }

  @Patch()
  updateSettings(@Body() body: any) { return this.service.updateSettings(body); }

  @Get('logs')
  getLogs(@Query() query: any) { return this.service.getLogs(query); }

  @Post('test')
  testDelivery(@Body() body: any) { return this.service.testDelivery(body); }
}

@Controller('delivery-logs')
export class DeliveryLogsController {
  constructor(private readonly service: DeliverySettingsService) {}

  @Get()
  getLogs(@Query() query: any) { return this.service.getLogs(query); }
}

@Controller('delivery-test')
export class DeliveryTestController {
  constructor(private readonly service: DeliverySettingsService) {}

  @Post()
  testDelivery(@Body() body: any) { return this.service.testDelivery(body); }
}
