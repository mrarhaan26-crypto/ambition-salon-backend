import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { DashboardAnalyticsController } from './dashboard-analytics.controller';
import { DashboardAnalyticsService } from './dashboard-analytics.service';

@Module({
  controllers: [DashboardAnalyticsController],
  providers: [DashboardAnalyticsService, PrismaService],
  exports: [DashboardAnalyticsService],
})
export class DashboardAnalyticsModule {}
