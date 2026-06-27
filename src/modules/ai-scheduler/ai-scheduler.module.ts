import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AiSchedulerController } from './ai-scheduler.controller';
import { AiSchedulerService } from './ai-scheduler.service';

@Module({
  controllers: [AiSchedulerController],
  providers: [AiSchedulerService, PrismaService],
  exports: [AiSchedulerService],
})
export class AiSchedulerModule {}
