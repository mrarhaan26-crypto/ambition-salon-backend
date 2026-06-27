import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@Injectable()
export class DashboardAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(query: DashboardQueryDto) {
    const { startDate, endDate, prevStartDate, prevEndDate } = this.getRanges(query);
    const where = this.buildWhere(query);
    const whereDate = { ...where, startTime: { gte: startDate, lte: endDate } };
    const prevWhereDate = { ...where, startTime: { gte: prevStartDate, lte: prevEndDate } };

    const [totalBookings, prevBookings, revenue, prevRevenue, totalClients, newClients, pendingWaitlist, activeWalkIns, totalStaff] =
      await Promise.all([
        this.prisma.booking.count({ where: whereDate }),
        this.prisma.booking.count({ where: prevWhereDate }),
        this.prisma.booking.aggregate({ where: { ...whereDate, status: { in: ['COMPLETED', 'CHECKED_IN'] } }, _sum: { totalAmount: true } }),
        this.prisma.booking.aggregate({ where: { ...prevWhereDate, status: { in: ['COMPLETED', 'CHECKED_IN'] } }, _sum: { totalAmount: true } }),
        this.prisma.client.count(),
        this.prisma.client.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
        this.prisma.waitlistEntry.count({ where: { ...where, status: 'WAITING' } }),
        this.prisma.walkIn.count({ where: { ...where, status: { in: ['WAITING', 'CALLED', 'IN_SERVICE'] } } }),
        this.prisma.user.count(),
      ]);

    const bookingGrowth = prevBookings > 0 ? ((totalBookings - prevBookings) / prevBookings) * 100 : 0;
    const revenueGrowth = (prevRevenue._sum.totalAmount ?? 0) > 0
      ? (((revenue._sum.totalAmount ?? 0) - (prevRevenue._sum.totalAmount ?? 0)) / (prevRevenue._sum.totalAmount ?? 0)) * 100
      : 0;

    return {
      period: { from: startDate.toISOString(), to: endDate.toISOString() },
      filters: { branchId: query.branchId ?? null },
      kpis: {
        totalBookings,
        bookingGrowth: Math.round(bookingGrowth * 100) / 100,
        revenue: revenue._sum.totalAmount ?? 0,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
        totalClients,
        newClients,
        pendingWaitlist,
        activeWalkIns,
        totalStaff,
      },
    };
  }

  async revenue(query: DashboardQueryDto) {
    const { startDate, endDate } = this.getRanges(query);
    const where = this.buildWhere(query);
    const whereDate = { startTime: { gte: startDate, lte: endDate }, ...where };

    const statuses = ['COMPLETED', 'CHECKED_IN', 'CONFIRMED', 'PENDING', 'CANCELLED', 'NO_SHOW'];

    const [byStatus, totalRevenue, completedCount] = await Promise.all([
      Promise.all(
        statuses.map((status) =>
          this.prisma.booking.aggregate({
            where: { ...whereDate, status: status as any },
            _sum: { totalAmount: true },
            _count: { id: true },
          }).then((r) => ({
            status,
            amount: r._sum.totalAmount ?? 0,
            count: r._count.id,
          })),
        ),
      ),
      this.prisma.booking.aggregate({ where: whereDate, _sum: { totalAmount: true } }),
      this.prisma.booking.count({ where: { ...whereDate, status: { in: ['COMPLETED', 'CHECKED_IN'] } } }),
    ]);

    const avgRevenue = completedCount > 0 ? (totalRevenue._sum.totalAmount ?? 0) / completedCount : 0;

    const dailyRevenue = await this.prisma.booking.groupBy({
      by: ['startTime'],
      where: { ...whereDate, status: { in: ['COMPLETED', 'CHECKED_IN'] } },
      _sum: { totalAmount: true },
      _count: { id: true },
      orderBy: { startTime: 'asc' },
    });

    const dailyMap = new Map<string, { revenue: number; bookings: number }>();
    dailyRevenue.forEach((d) => {
      const day = d.startTime.toISOString().slice(0, 10);
      const existing = dailyMap.get(day) ?? { revenue: 0, bookings: 0 };
      existing.revenue += d._sum.totalAmount ?? 0;
      existing.bookings += d._count.id;
      dailyMap.set(day, existing);
    });

    const daily = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      bookings: data.bookings,
    }));

    const topServices = await this.prisma.bookingService.groupBy({
      by: ['name'],
      where: { booking: whereDate },
      _sum: { price: true },
      _count: { id: true },
      orderBy: { _sum: { price: 'desc' } },
      take: 10,
    });

    return {
      period: { from: startDate.toISOString(), to: endDate.toISOString() },
      filters: { branchId: query.branchId ?? null },
      summary: {
        total: totalRevenue._sum.totalAmount ?? 0,
        averagePerBooking: Math.round(avgRevenue * 100) / 100,
        completedBookings: completedCount,
      },
      byStatus,
      daily,
      topServices: topServices.map((s) => ({
        name: s.name,
        revenue: s._sum.price ?? 0,
        bookings: s._count.id,
      })),
    };
  }

  async operations(query: DashboardQueryDto) {
    const { startDate, endDate } = this.getRanges(query);
    const where = this.buildWhere(query);
    const whereDate = { ...where, startTime: { gte: startDate, lte: endDate } };

    const [totalBookings, cancelledCount, noShowCount, completedCount, pendingCount, waitlistCount, walkInCount] =
      await Promise.all([
        this.prisma.booking.count({ where: whereDate }),
        this.prisma.booking.count({ where: { ...whereDate, status: 'CANCELLED' } }),
        this.prisma.booking.count({ where: { ...whereDate, status: 'NO_SHOW' } }),
        this.prisma.booking.count({ where: { ...whereDate, status: { in: ['COMPLETED', 'CHECKED_IN'] } } }),
        this.prisma.booking.count({ where: { ...whereDate, status: 'PENDING' } }),
        this.prisma.waitlistEntry.count({ where: { ...where, createdAt: { gte: startDate, lte: endDate } } }),
        this.prisma.walkIn.count({ where: { ...where, arrivalTime: { gte: startDate, lte: endDate } } }),
      ]);

    const cancellationRate = totalBookings > 0 ? (cancelledCount / totalBookings) * 100 : 0;
    const noShowRate = totalBookings > 0 ? (noShowCount / totalBookings) * 100 : 0;
    const completionRate = totalBookings > 0 ? (completedCount / totalBookings) * 100 : 0;

    const bookingsByStatus = await this.prisma.booking.groupBy({
      by: ['status'],
      where: whereDate,
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    return {
      period: { from: startDate.toISOString(), to: endDate.toISOString() },
      filters: { branchId: query.branchId ?? null },
      kpis: {
        totalBookings,
        completedBookings: completedCount,
        pendingBookings: pendingCount,
        cancelledBookings: cancelledCount,
        noShowBookings: noShowCount,
        cancellationRate: Math.round(cancellationRate * 100) / 100,
        noShowRate: Math.round(noShowRate * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
        waitlistEntries: waitlistCount,
        walkIns: walkInCount,
      },
      bookingsByStatus: bookingsByStatus.map((b) => ({
        status: b.status,
        count: b._count.id,
        amount: b._sum.totalAmount ?? 0,
      })),
    };
  }

  async staff(query: DashboardQueryDto) {
    const { startDate, endDate } = this.getRanges(query);
    const where = this.buildWhere(query);
    const whereDate = { ...where, startTime: { gte: startDate, lte: endDate }, staffId: { not: null } };

    const staffBookings = await this.prisma.booking.groupBy({
      by: ['staffId'],
      where: whereDate,
      _count: { id: true },
      _sum: { totalAmount: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const staffPerformance = await Promise.all(
      staffBookings.map(async (s) => {
        if (!s.staffId) return null;
        const user = await this.prisma.user.findUnique({
          where: { id: s.staffId },
          select: { id: true, fullName: true, email: true, role: true },
        });
        if (!user) return null;

        const completedCount = await this.prisma.booking.count({
          where: { ...whereDate, staffId: s.staffId, status: { in: ['COMPLETED', 'CHECKED_IN'] } },
        });
        const cancelledCount = await this.prisma.booking.count({
          where: { ...whereDate, staffId: s.staffId, status: 'CANCELLED' },
        });

        return {
          staffId: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          totalBookings: s._count.id,
          completedBookings: completedCount,
          cancelledBookings: cancelledCount,
          revenue: s._sum.totalAmount ?? 0,
        };
      }),
    );

    const totalStaff = await this.prisma.user.count();
    const activeStaff = staffBookings.length;

    return {
      period: { from: startDate.toISOString(), to: endDate.toISOString() },
      filters: { branchId: query.branchId ?? null },
      summary: { totalStaff, activeStaff, inactiveStaff: totalStaff - activeStaff },
      staff: staffPerformance.filter(Boolean),
    };
  }

  async clientActivity(query: DashboardQueryDto) {
    const { startDate, endDate } = this.getRanges(query);
    const where = this.buildWhere(query);

    const [totalClients, newClients, returningClients, activeBookings, totalClientsWithVisits] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.client.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
      this.prisma.client.count({ where: { totalVisits: { gt: 0 }, lastVisitAt: { gte: startDate, lte: endDate } } }),
      this.prisma.booking.count({ where: { ...where, startTime: { gte: startDate, lte: endDate } } }),
      this.prisma.client.count({ where: { totalVisits: { gt: 0 } } }),
    ]);

    const uniqueClients = await this.prisma.booking.groupBy({
      by: ['clientId'],
      where: { ...where, startTime: { gte: startDate, lte: endDate } },
      _count: { id: true },
    });

    const avgVisitsPerClient = uniqueClients.length > 0
      ? uniqueClients.reduce((sum, c) => sum + c._count.id, 0) / uniqueClients.length
      : 0;

    const topClients = await this.prisma.client.findMany({
      where: { totalVisits: { gt: 0 } },
      orderBy: { totalSpend: 'desc' },
      take: 10,
      select: {
        id: true, fullName: true, phone: true, email: true,
        totalVisits: true, totalSpend: true, lastVisitAt: true, loyaltyPoints: true,
      },
    });

    const visitDistribution = [
      { range: '1-2 visits', count: await this.prisma.client.count({ where: { totalVisits: { gte: 1, lte: 2 } } }) },
      { range: '3-5 visits', count: await this.prisma.client.count({ where: { totalVisits: { gte: 3, lte: 5 } } }) },
      { range: '6-10 visits', count: await this.prisma.client.count({ where: { totalVisits: { gte: 6, lte: 10 } } }) },
      { range: '10+ visits', count: await this.prisma.client.count({ where: { totalVisits: { gte: 11 } } }) },
    ];

    return {
      period: { from: startDate.toISOString(), to: endDate.toISOString() },
      filters: { branchId: where.branchId ?? null },
      summary: {
        totalClients,
        newClients,
        returningClients,
        activeClientsInPeriod: uniqueClients.length,
        totalClientsWithVisits,
        avgVisitsPerClient: Math.round(avgVisitsPerClient * 100) / 100,
        activeBookings,
      },
      topClients,
      visitDistribution,
    };
  }

  private getRanges(query: DashboardQueryDto) {
    const endDate = query.to ? new Date(query.to) : new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = query.from ? new Date(query.from) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    const rangeMs = endDate.getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate.getTime() - 1);
    prevEndDate.setHours(23, 59, 59, 999);
    const prevStartDate = new Date(prevEndDate.getTime() - rangeMs);
    prevStartDate.setHours(0, 0, 0, 0);

    return { startDate, endDate, prevStartDate, prevEndDate };
  }

  private buildWhere(query: DashboardQueryDto) {
    const where: any = {};
    if (query.branchId) where.branchId = query.branchId;
    return where;
  }
}
