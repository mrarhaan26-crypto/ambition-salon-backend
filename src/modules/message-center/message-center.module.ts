import { Module } from '@nestjs/common';
import { MessageCenterController } from './message-center.controller';
import { MessageCenterService } from './message-center.service';
@Module({
  controllers: [MessageCenterController],
  providers: [MessageCenterService],
})
export class MessageCenterModule {}
