import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { WalkInsController } from './walkins.controller';
import { WalkInsService } from './walkins.service';

@Module({
  controllers: [WalkInsController],
  providers: [WalkInsService, PrismaService],
  exports: [WalkInsService],
})
export class WalkInsModule {}
