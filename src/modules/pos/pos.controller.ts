import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PosService } from './pos.service';

@UseGuards(JwtAuthGuard)
@Controller('pos')
export class PosController {
  constructor(private readonly service: PosService) {}

  @Get()
  getDashboard(@Query() query: any) {
    return this.service.getDashboard(query);
  }

  @Post('checkout')
  checkout(@Body() body: any) {
    return this.service.checkout(body);
  }

  @Get('sales')
  getSales(@Query() query: any) {
    return this.service.getSales(query);
  }

  @Get('sales/:id')
  getSale(@Param('id') id: string) {
    return this.service.getSale(id);
  }

  @Post('sales/:id/refund')
  refund(@Param('id') id: string, @Body() body: any) {
    return this.service.refund(id, body);
  }

  @Get('payment-methods')
  getPaymentMethods() {
    return this.service.getPaymentMethods();
  }
}

