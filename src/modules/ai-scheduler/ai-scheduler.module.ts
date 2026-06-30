import { Module } from '@nestjs/common';
import { AiSchedulerController } from './ai-scheduler.controller';
import { AiSchedulerService } from './ai-scheduler.service';

@Module({
  controllers: [AiSchedulerController],
  providers: [AiSchedulerService],
  exports: [AiSchedulerService],
})
export class AiSchedulerModule {}
