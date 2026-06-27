import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaService } from './common/prisma.service';

import { AuthModule } from './modules/auth/auth.module';
import { LeadsModule } from './modules/leads/leads.module';
import { UsersModule } from './modules/users/users.module';
import { SalonsModule } from './modules/salons/salons.module';
import { ClientsModule } from './modules/clients/clients.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { WaitlistModule } from './modules/waitlist/waitlist.module';
import { WalkInsModule } from './modules/walkins/walkins.module';
import { AiSchedulerModule } from './modules/ai-scheduler/ai-scheduler.module';
import { CalendarAnalyticsModule } from './modules/calendar-analytics/calendar-analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    LeadsModule,
    UsersModule,
    SalonsModule,
    ClientsModule,
    BookingsModule,
    WaitlistModule,
    WalkInsModule,
    AiSchedulerModule,
    CalendarAnalyticsModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}



