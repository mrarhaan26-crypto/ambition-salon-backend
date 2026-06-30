import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get()
  getAll(@Query() query: any) {
    return this.service.getAll(query);
  }

  @Get('methods')
  getMethods() {
    return this.service.getMethods();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post('create-intent')
  createIntent(@Body() body: any) {
    return this.service.createIntent(body);
  }

  @Post('mark-paid')
  markPaid(@Body() body: any) {
    return this.service.markPaid(body);
  }

  @Post('mark-failed')
  markFailed(@Body() body: any) {
    return this.service.markFailed(body);
  }

  @Post('refund')
  refund(@Body() body: any) {
    return this.service.refund(body);
  }
}
