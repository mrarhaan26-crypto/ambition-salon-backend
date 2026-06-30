import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AiSchedulerService } from '../ai-scheduler/ai-scheduler.service';
import { CalendarAnalyticsService } from '../calendar-analytics/calendar-analytics.service';

@Injectable()
export class AiCommandCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiScheduler: AiSchedulerService,
    private readonly calendarAnalytics: CalendarAnalyticsService,
  ) {}

  async getDashboard(query: any) {
    const branchId = query.branchId;
    const from = query.from;
    const to = query.to;

    const range = this.getRange(from, to);
    const where: any = {
      startTime: { gte: range.start, lt: range.end },
      ...(branchId ? { branchId } : {}),
    };

    const [bookings, waitlist, walkIns] =
      await this.prisma.$transaction([
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
            ...(branchId ? { branchId } : {}),
            requestedDate: { gte: range.start, lt: range.end },
          },
          select: {
            id: true,
            status: true,
            priority: true,
            requestedDate: true,
            branchId: true,
          },
        }),
        this.prisma.walkIn.findMany({
          where: {
            ...(branchId ? { branchId } : {}),
            arrivalTime: { gte: range.start, lt: range.end },
          },
          select: {
            id: true,
            status: true,
            arrivalTime: true,
            estimatedWaitMinutes: true,
            branchId: true,
          },
        }),
      ]);

    const [overview, aiSuggestions] = await Promise.all([
      this.calendarAnalytics.overview(query),
      this.getAiSuggestions(branchId, range),
    ]);

    const activeBookings = bookings.filter(
      (b: { status: string }) => b.status !== 'CANCELLED' && b.status !== 'NO_SHOW',
    );
    const revenue = activeBookings.reduce(
      (sum: number, b: { totalAmount: number }) =>
        sum + Number(b.totalAmount || 0),
      0,
    );

    const avgBookingValue =
      activeBookings.length > 0
        ? Math.round(revenue / activeBookings.length)
        : 0;

    return {
      range: {
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      },
      branchId: branchId ?? null,
      overview,
      summary: {
        totalBookings: bookings.length,
        revenue,
        avgBookingValue,
        waitlistCount: waitlist.length,
        walkInCount: walkIns.length,
        pendingWaitlist: waitlist.filter(
          (w: { status: string }) => w.status === 'WAITING',
        ).length,
        activeWalkIns: walkIns.filter(
          (w: { status: string }) =>
            w.status === 'WAITING' ||
            w.status === 'CALLED' ||
            w.status === 'IN_SERVICE',
        ).length,
      },
      alerts: this.generateAlerts(bookings, waitlist, walkIns, branchId),
      aiSuggestions,
    };
  }

  async getInsights(query: any) {
    const branchId = query.branchId;
    const range = this.getRange(query.from, query.to);

    const bookings = await this.prisma.booking.findMany({
      where: {
        startTime: { gte: range.start, lt: range.end },
        ...(branchId ? { branchId } : {}),
        status: { not: 'CANCELLED' },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        totalAmount: true,
        staffId: true,
      },
      orderBy: { startTime: 'asc' },
    });

    const hourBuckets: Record<number, { count: number; revenue: number }> = {};
    const dayBuckets: Record<number, { count: number; revenue: number }> = {};
    let totalMinutes = 0;

    for (const booking of bookings) {
      const start = new Date(booking.startTime);
      const hour = start.getHours();
      const day = start.getDay();
      const duration =
        (new Date(booking.endTime).getTime() - start.getTime()) / 60000;
      totalMinutes += duration;

      if (!hourBuckets[hour]) hourBuckets[hour] = { count: 0, revenue: 0 };
      hourBuckets[hour].count++;
      hourBuckets[hour].revenue += Number(booking.totalAmount || 0);

      if (!dayBuckets[day]) dayBuckets[day] = { count: 0, revenue: 0 };
      dayBuckets[day].count++;
      dayBuckets[day].revenue += Number(booking.totalAmount || 0);
    }

    const peakHour = Object.entries(hourBuckets).sort(
      (a, b) => b[1].count - a[1].count,
    )[0];
    const busiestDay = Object.entries(dayBuckets).sort(
      (a, b) => b[1].count - a[1].count,
    )[0];

    const avgDuration =
      bookings.length > 0 ? Math.round(totalMinutes / bookings.length) : 0;

    return {
      range: {
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      },
      branchId: branchId ?? null,
      peakHours: Object.entries(hourBuckets)
        .map(([hour, data]) => ({
          hour: Number(hour),
          bookingCount: data.count,
          revenue: data.revenue,
          isPeak: peakHour ? Number(hour) === Number(peakHour[0]) : false,
        }))
        .sort((a, b) => a.hour - b.hour),
      busiestDays: Object.entries(dayBuckets)
        .map(([day, data]) => ({
          day: Number(day),
          dayName: this.getDayName(Number(day)),
          bookingCount: data.count,
          revenue: data.revenue,
          isBusiest: busiestDay
            ? Number(day) === Number(busiestDay[0])
            : false,
        }))
        .sort((a, b) => a.day - b.day),
      averages: {
        avgBookingDurationMin: avgDuration,
        avgRevenuePerBooking:
          bookings.length > 0
            ? Math.round(
                bookings.reduce(
                  (s: number, b: { totalAmount: number }) =>
                    s + Number(b.totalAmount || 0),
                  0,
                ) / bookings.length,
              )
            : 0,
        totalBookings: bookings.length,
      },
    };
  }

  async getCapacityForecast(query: any) {
    let branchId = query.branchId;
    if (!branchId) {
      const firstBranch = await this.prisma.branch.findFirst({ select: { id: true } });
      branchId = firstBranch?.id;
    }
    if (!branchId) {
      return { branchId: null, forecastDays: 0, avgUtilization: 0, criticalDays: 0, recommendations: 'NO_BRANCH_AVAILABLE', dailyForecast: [] };
    }

    const days = Math.min(Math.max(Number(query.days) || 7, 1), 30);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const forecast = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().slice(0, 10);

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);

      const [bookings, staffCount] = await this.prisma.$transaction([
        this.prisma.booking.findMany({
          where: {
            branchId,
            startTime: { gte: dayStart, lt: dayEnd },
            status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
          },
          select: {
            id: true,
            startTime: true,
            endTime: true,
            status: true,
          },
        }),
        this.prisma.staffAvailability.groupBy({
          by: ['staffId'],
          where: { branchId, isActive: true },
          orderBy: { staffId: 'asc' },
        }),
      ]);

      const bookedMinutes = bookings.reduce(
        (sum: number, b: { endTime: Date; startTime: Date }) =>
          sum +
          Math.max(
            0,
            Math.round(
              (new Date(b.endTime).getTime() -
                new Date(b.startTime).getTime()) /
                60000,
            ),
          ),
        0,
      );

      const availableMinutes =
        staffCount.length > 0 ? staffCount.length * 600 : 600;
      const utilizationPct =
        availableMinutes > 0
          ? Math.min(100, Math.round((bookedMinutes / availableMinutes) * 100))
          : 0;

      forecast.push({
        date: dateStr,
        dayName: this.getDayName(date.getDay()),
        bookedMinutes,
        availableMinutes,
        staffCount: staffCount.length,
        utilizationPct,
        bookingCount: bookings.length,
        capacityStatus:
          utilizationPct >= 85
            ? 'CRITICAL'
            : utilizationPct >= 65
              ? 'HIGH'
              : utilizationPct >= 40
                ? 'MODERATE'
                : 'LOW',
      });
    }

    const avgUtilization =
      forecast.length > 0
        ? Math.round(
            forecast.reduce(
              (sum: number, d: { utilizationPct: number }) =>
                sum + d.utilizationPct,
              0,
            ) / forecast.length,
          )
        : 0;

    const criticalDays = forecast.filter(
      (d: { capacityStatus: string }) => d.capacityStatus === 'CRITICAL',
    ).length;

    return {
      branchId,
      forecastDays: days,
      avgUtilization,
      criticalDays,
      recommendations:
        avgUtilization >= 75
          ? 'CONSIDER_ADDING_STAFF'
          : criticalDays > 0
            ? 'MANAGE_PEAK_DAYS'
            : 'CAPACITY_ADEQUATE',
      dailyForecast: forecast,
    };
  }

  async getStaffPerformance(query: any) {
    const branchId = query.branchId;
    const range = this.getRange(query.from, query.to);

    const staff = await this.prisma.user.findMany({
      where: branchId
        ? {
            staffBookings: {
              some: {
                branchId,
                startTime: { gte: range.start, lt: range.end },
              },
            },
          }
        : undefined,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
      },
    });

    const performance = [];
    for (const person of staff) {
      const staffBookings = await this.prisma.booking.findMany({
        where: {
          staffId: person.id,
          ...(branchId ? { branchId } : {}),
          startTime: { gte: range.start, lt: range.end },
        },
        select: {
          id: true,
          status: true,
          startTime: true,
          endTime: true,
          totalAmount: true,
        },
      });

      const completed = staffBookings.filter(
        (b: { status: string }) => b.status === 'COMPLETED',
      );
      const cancelled = staffBookings.filter(
        (b: { status: string }) => b.status === 'CANCELLED',
      );
      const noShow = staffBookings.filter(
        (b: { status: string }) => b.status === 'NO_SHOW',
      );

      const totalMinutes = completed.reduce(
        (sum: number, b: { endTime: Date; startTime: Date }) =>
          sum +
          Math.max(
            0,
            Math.round(
              (new Date(b.endTime).getTime() -
                new Date(b.startTime).getTime()) /
                60000,
            ),
          ),
        0,
      );
      const revenue = completed.reduce(
        (sum: number, b: { totalAmount: number }) =>
          sum + Number(b.totalAmount || 0),
        0,
      );

      const totalBookings = staffBookings.length;
      const completionRate =
        totalBookings > 0
          ? Math.round((completed.length / totalBookings) * 100)
          : 0;

      const efficiencyScore =
        totalBookings > 0
          ? Math.max(
              0,
              100 -
                Math.round(
                  ((cancelled.length + noShow.length * 2) / totalBookings) *
                    100,
                ),
            )
          : 0;

      performance.push({
        staffId: person.id,
        staffName: person.fullName,
        role: person.role,
        totalBookings,
        completed: completed.length,
        cancelled: cancelled.length,
        noShow: noShow.length,
        totalMinutes,
        revenue,
        completionRate,
        efficiencyScore,
        avgBookingValue:
          completed.length > 0 ? Math.round(revenue / completed.length) : 0,
      });
    }

    const sorted = performance.sort(
      (
        a: { efficiencyScore: number; revenue: number },
        b: { efficiencyScore: number; revenue: number },
      ) => b.efficiencyScore - a.efficiencyScore || b.revenue - a.revenue,
    );

    return {
      range: {
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      },
      branchId: branchId ?? null,
      staff: sorted,
      topPerformer: sorted[0] ?? null,
    };
  }

  async getRecommendations(query: any) {
    const branchId = query.branchId;
    const range = this.getRange(query.from, query.to);

    let insights: any = { peakHours: [], busiestDays: [], averages: { avgBookingDurationMin: 0, avgRevenuePerBooking: 0, totalBookings: 0 } };
    let capacity: any = { branchId: null, forecastDays: 0, avgUtilization: 0, criticalDays: 0, recommendations: 'NO_DATA', dailyForecast: [] };
    let staffPerf: any = { range: {}, branchId: null, staff: [], topPerformer: null };

    try { insights = await this.getInsights(query); } catch {}
    try { capacity = await this.getCapacityForecast({ ...query, days: '14' }); } catch {}
    try { staffPerf = await this.getStaffPerformance(query); } catch {}

    const recommendations: Array<{
      type: string;
      priority: string;
      title: string;
      description: string;
      metric: string;
    }> = [];

    const peakHourData = insights.peakHours?.find(
      (h: { isPeak: boolean }) => h.isPeak,
    );
    if (peakHourData && peakHourData.bookingCount > 5) {
      recommendations.push({
        type: 'STAFFING',
        priority: 'HIGH',
        title: 'Peak hour staffing needed',
        description: `Hour ${peakHourData.hour}:00 has ${peakHourData.bookingCount} bookings. Consider adding staff during this period.`,
        metric: `${peakHourData.bookingCount} bookings at hour ${peakHourData.hour}`,
      });
    }

    if (capacity.avgUtilization >= 75) {
      recommendations.push({
        type: 'CAPACITY',
        priority: 'HIGH',
        title: 'Capacity nearing limit',
        description: `Average utilization is ${capacity.avgUtilization}% over the next ${capacity.forecastDays} days. Consider expanding hours or adding staff.`,
        metric: `${capacity.avgUtilization}% avg utilization`,
      });
    }

    if (capacity.criticalDays > 0) {
      recommendations.push({
        type: 'CAPACITY',
        priority: 'CRITICAL',
        title: `${capacity.criticalDays} day(s) at critical capacity`,
        description: `${capacity.criticalDays} day(s) exceed 85% utilization. Consider blocking new bookings or extending hours.`,
        metric: `${capacity.criticalDays} critical day(s)`,
      });
    }

    const lowPerformers = (
      capacity.dailyForecast as Array<{ utilizationPct: number }>
    )?.filter((d) => d.utilizationPct < 30);
    if (lowPerformers && lowPerformers.length > 2) {
      recommendations.push({
        type: 'PROMOTION',
        priority: 'MEDIUM',
        title: 'Low-utilization days detected',
        description: `${lowPerformers.length} day(s) have utilization below 30%. Consider running promotions to boost bookings.`,
        metric: `${lowPerformers.length} low day(s)`,
      });
    }

    if (staffPerf.staff && staffPerf.staff.length > 0) {
      const lowEfficiency = staffPerf.staff.filter(
        (s: { efficiencyScore: number; totalBookings: number }) =>
          s.efficiencyScore < 50 && s.totalBookings > 0,
      );
      if (lowEfficiency.length > 0) {
        recommendations.push({
          type: 'TRAINING',
          priority: 'MEDIUM',
          title: 'Staff efficiency improvement',
          description: `${lowEfficiency.length} staff member(s) have low efficiency scores (< 50). Consider additional training.`,
          metric: `${lowEfficiency.length} staff below threshold`,
        });
      }
    }

    const waitlistCount = await this.prisma.waitlistEntry.count({
      where: {
        ...(branchId ? { branchId } : {}),
        status: 'WAITING',
        requestedDate: { gte: range.start, lt: range.end },
      },
    });

    if (waitlistCount > 5) {
      recommendations.push({
        type: 'WAITLIST',
        priority: 'HIGH',
        title: 'Waitlist backlog',
        description: `${waitlistCount} client(s) waiting. Consider opening additional slots or contacting them for rescheduling.`,
        metric: `${waitlistCount} waiting`,
      });
    }

    const priorityOrder: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    };
    recommendations.sort(
      (a, b) =>
        (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99),
    );

    return {
      range: {
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      },
      branchId: branchId ?? null,
      recommendations,
      summary: {
        total: recommendations.length,
        critical: recommendations.filter((r) => r.priority === 'CRITICAL')
          .length,
        high: recommendations.filter((r) => r.priority === 'HIGH').length,
        medium: recommendations.filter((r) => r.priority === 'MEDIUM').length,
        low: recommendations.filter((r) => r.priority === 'LOW').length,
      },
    };
  }

  private async getAiSuggestions(
    branchId: string | undefined,
    range: { start: Date; end: Date },
  ) {
    if (!branchId) return [];

    const suggestions = [];
    const today = new Date(range.start);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (range.start >= today && range.end <= new Date(tomorrow)) {
      suggestions.push({
        type: 'SCHEDULING',
        source: 'ai-scheduler',
        description: 'AI scheduling suggestions available for today',
      });
    }

    return suggestions;
  }

  private generateAlerts(
    bookings: Array<{ status: string }>,
    waitlist: Array<{ status: string }>,
    walkIns: Array<{ status: string }>,
    branchId?: string,
  ) {
    const alerts: Array<{
      type: string;
      severity: string;
      message: string;
    }> = [];

    const pendingCount = bookings.filter((b) => b.status === 'PENDING').length;
    if (pendingCount > 10) {
      alerts.push({
        type: 'PENDING_BOOKINGS',
        severity: 'HIGH',
        message: `${pendingCount} pending bookings need confirmation`,
      });
    }

    const waitingWalkIns = walkIns.filter((w) => w.status === 'WAITING').length;
    if (waitingWalkIns > 3) {
      alerts.push({
        type: 'WALKIN_BACKLOG',
        severity: 'MEDIUM',
        message: `${waitingWalkIns} walk-in clients currently waiting`,
      });
    }

    const waitingWaitlist = waitlist.filter(
      (w) => w.status === 'WAITING',
    ).length;
    if (waitingWaitlist > 5) {
      alerts.push({
        type: 'WAITLIST_BACKLOG',
        severity: 'MEDIUM',
        message: `${waitingWaitlist} clients on waitlist`,
      });
    }

    const cancelledCount = bookings.filter(
      (b) => b.status === 'CANCELLED',
    ).length;
    if (cancelledCount > 5) {
      alerts.push({
        type: 'HIGH_CANCELLATION',
        severity: 'LOW',
        message: `${cancelledCount} bookings cancelled`,
      });
    }

    return alerts;
  }

  private getRange(from?: string, to?: string) {
    const start = from ? new Date(from) : new Date();
    if (Number.isNaN(start.getTime()))
      throw new BadRequestException('Invalid from date');
    start.setHours(0, 0, 0, 0);

    const end = to ? new Date(to) : new Date(start);
    if (Number.isNaN(end.getTime()))
      throw new BadRequestException('Invalid to date');

    if (!to) end.setDate(start.getDate() + 1);
    else end.setHours(23, 59, 59, 999);

    if (start >= end) throw new BadRequestException('from must be before to');

    return { start, end };
  }

  private getDayName(day: number): string {
    const names = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    return names[day] ?? 'Unknown';
  }
}
