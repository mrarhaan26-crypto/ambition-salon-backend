import { Module } from '@nestjs/common';
import { WalkInsController } from './walkins.controller';
import { WalkInsService } from './walkins.service';

@Module({
  controllers: [WalkInsController],
  providers: [WalkInsService],
  exports: [WalkInsService],
})
export class WalkInsModule {}
