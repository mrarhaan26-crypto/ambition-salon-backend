import { Module } from '@nestjs/common';
import { BillingRulesController } from './billing-rules.controller';
import { BillingRulesService } from './billing-rules.service';
@Module({
  controllers: [BillingRulesController],
  providers: [BillingRulesService],
})
export class BillingRulesModule {}
