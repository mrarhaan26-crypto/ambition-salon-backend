import { Module } from '@nestjs/common';
import { CrmIntelligenceController } from './crm-intelligence.controller';
import { CrmIntelligenceService } from './crm-intelligence.service';
@Module({
  controllers: [CrmIntelligenceController],
  providers: [CrmIntelligenceService],
})
export class CrmIntelligenceModule {}
