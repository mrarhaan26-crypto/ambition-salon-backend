import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class CalendarAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(query: any) {
    const range = this.getRange(query.from, query.to);

    const where: any = {
      startTime: { gte: range.start, lt: range.end },
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.staffId ? { staffId: query.staffId } : {}),
    };

    const [bookings, waitlist, walkIns] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        select: {
          id: true,
          status: true,
          startTime: true,
          endTime: true,
          totalAmount: true,
          branchId: true,
          staffId: true,
        },
      }),
      this.prisma.waitlistEntry.findMany({
        where: {
          requestedDate: { gte: range.start, lt: range.end },
          ...(query.branchId ? { branchId: query.branchId } : {}),
        },
        select: {
          id: true,
          status: true,
          priority: true,
          requestedDate: true,
          branchId: true,
          staffId: true,
        },
      }),
      this.prisma.walkIn.findMany({
        where: {
          arrivalTime: { gte: range.start, lt: range.end },
          ...(query.branchId ? { branchId: query.branchId } : {}),
          ...(query.staffId ? { staffId: query.staffId } : {}),
        },
        select: {
          id: true,
          status: true,
          arrivalTime: true,
          startedAt: true,
          completedAt: true,
          branchId: true,
          staffId: true,
        },
      }),
    ]);

    const revenue = bookings
      .filter((booking) => booking.status !== 'CANCELLED')
      .reduce((sum, booking) => sum + Number(booking.totalAmount || 0), 0);

    const bookedMinutes = bookings.reduce((sum, booking) => {
      return sum + Math.max(0, Math.round((new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / 60000));
    }, 0);

    return {
      range: {
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      },
      filters: {
        branchId: query.branchId ?? null,
        staffId: query.staffId ?? null,
      },
      bookingKpis: {
        total: bookings.length,
        confirmed: bookings.filter((b) => b.status === 'CONFIRMED').length,
        pending: bookings.filter((b) => b.status === 'PENDING').length,
        completed: bookings.filter((b) => b.status === 'COMPLETED').length,
        cancelled: bookings.filter((b) => b.status === 'CANCELLED').length,
        noShow: bookings.filter((b) => b.status === 'NO_SHOW').length,
        revenue,
        bookedMinutes,
      },
      waitlistKpis: {
        total: waitlist.length,
        waiting: waitlist.filter((w) => w.status === 'WAITING').length,
        contacted: waitlist.filter((w) => w.status === 'CONTACTED').length,
        booked: waitlist.filter((w) => w.status === 'BOOKED').length,
        cancelled: waitlist.filter((w) => w.status === 'CANCELLED').length,
        expired: waitlist.filter((w) => w.status === 'EXPIRED').length,
      },
      walkInKpis: {
        total: walkIns.length,
        waiting: walkIns.filter((w) => w.status === 'WAITING').length,
        called: walkIns.filter((w) => w.status === 'CALLED').length,
        inService: walkIns.filter((w) => w.status === 'IN_SERVICE').length,
        completed: walkIns.filter((w) => w.status === 'COMPLETED').length,
        cancelled: walkIns.filter((w) => w.status === 'CANCELLED').length,
        noShow: walkIns.filter((w) => w.status === 'NO_SHOW').length,
        converted: walkIns.filter((w) => w.status === 'CONVERTED').length,
      },
    };
  }

  async trends(query: any) {
    const overview = await this.overview(query);

    return {
      ...overview,
      trends: {
        revenueTrend: 'READY_FOR_FRONTEND_CHART',
        bookingTrend: 'READY_FOR_FRONTEND_CHART',
        utilizationTrend: 'READY_FOR_FRONTEND_CHART',
      },
    };
  }

  private getRange(from?: string, to?: string) {
    const start = from ? new Date(from) : new Date();
    if (Number.isNaN(start.getTime())) throw new BadRequestException('Invalid from date');
    start.setHours(0, 0, 0, 0);

    const end = to ? new Date(to) : new Date(start);
    if (Number.isNaN(end.getTime())) throw new BadRequestException('Invalid to date');

    if (!to) end.setDate(start.getDate() + 1);
    else end.setHours(23, 59, 59, 999);

    if (start >= end) throw new BadRequestException('from must be before to');

    return { start, end };
  }
}
