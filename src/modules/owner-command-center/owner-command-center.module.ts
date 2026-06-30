import { Module } from '@nestjs/common';
import { OwnerCommandCenterController } from './owner-command-center.controller';
import { OwnerCommandCenterService } from './owner-command-center.service';
@Module({
  controllers: [OwnerCommandCenterController],
  providers: [OwnerCommandCenterService],
})
export class OwnerCommandCenterModule {}
