import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { WalletService } from './wallet.service';

@Controller()
export class WalletController {
  constructor(private readonly service: WalletService) {}

  @Get('wallet')
  getWallets(@Query() query: any) {
    return this.service.getWallets(query);
  }

  @Get('wallet/client/:clientId')
  getClientWallet(@Param('clientId') clientId: string) {
    return this.service.getClientWallet(clientId);
  }

  @Post('wallet/credit')
  creditWallet(@Body() body: any) {
    return this.service.creditWallet(body);
  }

  @Post('wallet/debit')
  debitWallet(@Body() body: any) {
    return this.service.debitWallet(body);
  }

  @Get('gift-cards')
  getGiftCards(@Query() query: any) {
    return this.service.getGiftCards(query);
  }

  @Get('gift-cards/:id')
  getGiftCard(@Param('id') id: string) {
    return this.service.getGiftCard(id);
  }

  @Post('gift-cards')
  createGiftCard(@Body() body: any) {
    return this.service.createGiftCard(body);
  }

  @Patch('gift-cards/:id')
  updateGiftCard(@Param('id') id: string, @Body() body: any) {
    return this.service.updateGiftCard(id, body);
  }

  @Get('loyalty')
  getLoyaltySummary() {
    return this.service.getLoyaltySummary();
  }

  @Get('loyalty/client/:clientId')
  getClientLoyalty(@Param('clientId') clientId: string) {
    return this.service.getClientLoyalty(clientId);
  }

  @Post('loyalty/adjust')
  adjustLoyalty(@Body() body: any) {
    return this.service.adjustLoyalty(body);
  }
}
