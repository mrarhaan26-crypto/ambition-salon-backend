import { Module } from '@nestjs/common';
import { SurveysController, FeedbackController } from './surveys.controller';
import { SurveysService } from './surveys.service';
@Module({
  controllers: [SurveysController, FeedbackController],
  providers: [SurveysService],
})
export class SurveysModule {}
