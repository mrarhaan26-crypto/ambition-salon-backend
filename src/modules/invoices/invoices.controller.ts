import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

@Controller()
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Get('invoices')
  getAll(@Query() query: any) {
    return this.service.getAll(query);
  }

  @Get('invoices/:id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post('invoices')
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Patch('invoices/:id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Post('invoices/:id/issue')
  issue(@Param('id') id: string) {
    return this.service.issue(id);
  }

  @Post('invoices/:id/void')
  voidInvoice(@Param('id') id: string) {
    return this.service.voidInvoice(id);
  }

  @Get('receipts')
  getReceipts(@Query() query: any) {
    return this.service.getReceipts(query);
  }

  @Get('receipts/:id')
  getReceipt(@Param('id') id: string) {
    return this.service.getReceipt(id);
  }
}
