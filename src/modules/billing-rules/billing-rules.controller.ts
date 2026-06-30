import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { BillingRulesService } from './billing-rules.service';

@Controller()
export class BillingRulesController {
  constructor(private readonly service: BillingRulesService) {}

  @Get('billing-rules')
  getRules() {
    return this.service.getRules();
  }

  @Patch('billing-rules')
  updateRules(@Body() body: any) {
    return this.service.updateRules(body);
  }

  @Get('discounts')
  getDiscounts() {
    return this.service.getDiscounts();
  }

  @Post('discounts')
  createDiscount(@Body() body: any) {
    return this.service.createDiscount(body);
  }

  @Patch('discounts/:id')
  updateDiscount(@Param('id') id: string, @Body() body: any) {
    return this.service.updateDiscount(id, body);
  }

  @Delete('discounts/:id')
  removeDiscount(@Param('id') id: string) {
    return this.service.removeDiscount(id);
  }

  @Get('taxes')
  getTaxes() {
    return this.service.getTaxes();
  }

  @Post('taxes')
  createTax(@Body() body: any) {
    return this.service.createTax(body);
  }

  @Patch('taxes/:id')
  updateTax(@Param('id') id: string, @Body() body: any) {
    return this.service.updateTax(id, body);
  }

  @Delete('taxes/:id')
  removeTax(@Param('id') id: string) {
    return this.service.removeTax(id);
  }
}
