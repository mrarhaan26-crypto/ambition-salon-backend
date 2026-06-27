import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { WaitlistController } from './waitlist.controller';
import { WaitlistService } from './waitlist.service';

@Module({
  controllers: [WaitlistController],
  providers: [WaitlistService, PrismaService],
  exports: [WaitlistService],
})
export class WaitlistModule {}
