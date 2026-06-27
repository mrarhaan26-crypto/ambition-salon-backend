import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AiSchedulerService {
  constructor(private readonly prisma: PrismaService) {}

  async suggest(query: any) {
    if (!query.branchId) throw new BadRequestException('branchId is required');
    if (!query.date) throw new BadRequestException('date is required');

    const date = new Date(query.date);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid date');

    const durationMinutes = Number(query.durationMinutes || 30);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      throw new BadRequestException('durationMinutes must be positive');
    }

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const [staff, bookings] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        select: { id: true, fullName: true, email: true, role: true },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.booking.findMany({
        where: {
          branchId: query.branchId,
          startTime: { gte: start, lt: end },
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        },
        select: {
          id: true,
          staffId: true,
          startTime: true,
          endTime: true,
          status: true,
        },
        orderBy: { startTime: 'asc' },
      }),
    ]);

    const suggestions = staff.map((person) => {
      const staffBookings = bookings.filter((booking) => booking.staffId === person.id);
      const bookedMinutes = staffBookings.reduce((sum, booking) => {
        return sum + Math.max(0, Math.round((new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / 60000));
      }, 0);

      const score = Math.max(0, 100 - Math.round(bookedMinutes / 6));
      const suggestedStart = this.findGap(start, end, staffBookings, durationMinutes);

      return {
        staffId: person.id,
        staffName: person.fullName,
        email: person.email,
        role: person.role,
        bookedMinutes,
        activeBookings: staffBookings.length,
        score,
        suggestedStart,
        suggestedEnd: suggestedStart ? new Date(new Date(suggestedStart).getTime() + durationMinutes * 60000).toISOString() : null,
      };
    });

    return {
      date: start.toISOString().slice(0, 10),
      branchId: query.branchId,
      durationMinutes,
      suggestions: suggestions
        .filter((item) => item.suggestedStart)
        .sort((a, b) => b.score - a.score || a.bookedMinutes - b.bookedMinutes),
    };
  }

  async optimizeDay(query: any) {
    const result = await this.suggest(query);

    return {
      ...result,
      optimization: {
        strategy: 'LOAD_BALANCE_AND_GAP_FILL',
        recommendationCount: result.suggestions.length,
        bestOption: result.suggestions[0] ?? null,
      },
    };
  }

  private findGap(dayStart: Date, dayEnd: Date, bookings: any[], durationMinutes: number) {
    const sorted = [...bookings].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

    let cursor = new Date(dayStart);
    cursor.setHours(10, 0, 0, 0);

    const businessClose = new Date(dayStart);
    businessClose.setHours(20, 0, 0, 0);

    const hardEnd = businessClose < dayEnd ? businessClose : dayEnd;

    for (const booking of sorted) {
      const bookingStart = new Date(booking.startTime);
      if (cursor.getTime() + durationMinutes * 60000 <= bookingStart.getTime()) {
        return cursor.toISOString();
      }

      const bookingEnd = new Date(booking.endTime);
      if (bookingEnd > cursor) cursor = bookingEnd;
    }

    if (cursor.getTime() + durationMinutes * 60000 <= hardEnd.getTime()) {
      return cursor.toISOString();
    }

    return null;
  }
}
