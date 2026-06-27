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
  ],
  providers: [PrismaService],
})
export class AppModule {}

