import { Module } from '@nestjs/common';
import { OnlineProfileController } from './online-profile.controller';
import { OnlineProfileService } from './online-profile.service';
@Module({
  controllers: [OnlineProfileController],
  providers: [OnlineProfileService],
})
export class OnlineProfileModule {}
