import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AdjustmentsService } from './adjustments.service';

@Controller()
export class AdjustmentsController {
  constructor(private readonly service: AdjustmentsService) {}

  @Get('adjustments')
  getAdjustments(@Query() query: any) {
    return this.service.getAdjustments(query);
  }

  @Get('adjustments/:id')
  getAdjustment(@Param('id') id: string) {
    return this.service.getAdjustment(id);
  }

  @Post('adjustments')
  createAdjustment(@Body() body: any) {
    return this.service.createAdjustment(body);
  }

  @Get('refunds')
  getRefunds(@Query() query: any) {
    return this.service.getRefunds(query);
  }

  @Post('refunds')
  createRefund(@Body() body: any) {
    return this.service.createRefund(body);
  }

  @Get('cancellations')
  getCancellations(@Query() query: any) {
    return this.service.getCancellations(query);
  }

  @Post('cancellations')
  createCancellation(@Body() body: any) {
    return this.service.createCancellation(body);
  }
}
