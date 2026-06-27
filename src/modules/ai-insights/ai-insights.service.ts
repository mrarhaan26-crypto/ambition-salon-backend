import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AiInsightsQueryDto } from './dto/ai-insights-query.dto';

@Injectable()
export class AiInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AiInsightsQueryDto) {
    const [health, risks, ops] = await Promise.all([
      this.businessHealth(query),
      this.riskAlerts(query),
      this.opportunities(query),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      filters: { branchId: query.branchId ?? null, from: query.from ?? null, to: query.to ?? null },
      summary: {
        healthScore: health.score,
        healthLabel: health.label,
        activeRisks: risks.length,
        opportunities: ops.length,
      },
      insights: [
        ...health.insights,
        ...risks,
        ...ops,
      ].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)),
    };
  }

  async businessHealth(query: AiInsightsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);
    const prevStart = new Date(startDate);
    prevStart.setDate(prevStart.getDate() - 30);
    const prevEnd = new Date(endDate);
    prevEnd.setDate(prevEnd.getDate() - 30);

    const where = this.buildWhere(query);
    const prevWhere = this.buildWhere({ ...query, from: prevStart.toISOString(), to: prevEnd.toISOString() });

    const [currentBookings, prevBookings, currentClients, prevClients, cancelledCount, totalBookings, noShowCount] =
      await Promise.all([
        this.prisma.booking.count({ where: { ...where, startTime: { gte: startDate, lte: endDate } } }),
        this.prisma.booking.count({ where: { ...prevWhere, startTime: { gte: prevStart, lte: prevEnd } } }),
        this.prisma.booking.groupBy({ by: ['clientId'], where: { ...where, startTime: { gte: startDate, lte: endDate } }, _count: { clientId: true } }),
        this.prisma.booking.groupBy({ by: ['clientId'], where: { ...prevWhere, startTime: { gte: prevStart, lte: prevEnd } }, _count: { clientId: true } }),
        this.prisma.booking.count({ where: { ...where, status: 'CANCELLED', startTime: { gte: startDate, lte: endDate } } }),
        this.prisma.booking.count({ where: { ...where, startTime: { gte: startDate, lte: endDate } } }),
        this.prisma.booking.count({ where: { ...where, status: 'NO_SHOW', startTime: { gte: startDate, lte: endDate } } }),
      ]);

    const revenue = await this.prisma.booking.aggregate({
      where: { ...where, startTime: { gte: startDate, lte: endDate }, status: { in: ['COMPLETED', 'CHECKED_IN'] } },
      _sum: { totalAmount: true },
    });

    const prevRevenue = await this.prisma.booking.aggregate({
      where: { ...prevWhere, startTime: { gte: prevStart, lte: prevEnd }, status: { in: ['COMPLETED', 'CHECKED_IN'] } },
      _sum: { totalAmount: true },
    });

    const bookingGrowth = prevBookings > 0 ? ((currentBookings - prevBookings) / prevBookings) * 100 : 0;
    const revenueGrowth = (prevRevenue._sum.totalAmount ?? 0) > 0
      ? (((revenue._sum.totalAmount ?? 0) - (prevRevenue._sum.totalAmount ?? 0)) / (prevRevenue._sum.totalAmount ?? 0)) * 100
      : 0;

    const returnRate = currentClients.length > 0
      ? (currentClients.filter((c) => prevClients.some((p) => p.clientId === c.clientId)).length / currentClients.length) * 100
      : 0;

    const cancellationRate = totalBookings > 0 ? (cancelledCount / totalBookings) * 100 : 0;
    const noShowRate = totalBookings > 0 ? (noShowCount / totalBookings) * 100 : 0;

    let score = 70;
    const adjustments: string[] = [];

    if (bookingGrowth > 10) { score += 10; adjustments.push(`Booking growth +${bookingGrowth.toFixed(0)}%`); }
    else if (bookingGrowth > 0) { score += 5; adjustments.push(`Booking growth +${bookingGrowth.toFixed(0)}%`); }
    else if (bookingGrowth < -10) { score -= 15; adjustments.push(`Booking decline ${bookingGrowth.toFixed(0)}%`); }
    else if (bookingGrowth < 0) { score -= 5; adjustments.push(`Slight booking decline ${bookingGrowth.toFixed(0)}%`); }

    if (revenueGrowth > 10) { score += 10; adjustments.push(`Revenue growth +${revenueGrowth.toFixed(0)}%`); }
    else if (revenueGrowth > 0) { score += 5; adjustments.push(`Revenue growth +${revenueGrowth.toFixed(0)}%`); }
    else if (revenueGrowth < -10) { score -= 15; adjustments.push(`Revenue decline ${revenueGrowth.toFixed(0)}%`); }
    else if (revenueGrowth < 0) { score -= 5; adjustments.push(`Slight revenue decline ${revenueGrowth.toFixed(0)}%`); }

    if (returnRate > 50) { score += 10; adjustments.push(`Strong return rate ${returnRate.toFixed(0)}%`); }
    else if (returnRate > 30) { score += 5; adjustments.push(`Moderate return rate ${returnRate.toFixed(0)}%`); }
    else { score -= 5; adjustments.push(`Low return rate ${returnRate.toFixed(0)}%`); }

    if (cancellationRate < 5) { score += 5; adjustments.push(`Low cancellation ${cancellationRate.toFixed(0)}%`); }
    else if (cancellationRate > 15) { score -= 10; adjustments.push(`High cancellation ${cancellationRate.toFixed(0)}%`); }
    else if (cancellationRate > 10) { score -= 5; adjustments.push(`Elevated cancellation ${cancellationRate.toFixed(0)}%`); }

    if (noShowRate > 10) { score -= 10; adjustments.push(`High no-show ${noShowRate.toFixed(0)}%`); }
    else if (noShowRate > 5) { score -= 5; adjustments.push(`Elevated no-show ${noShowRate.toFixed(0)}%`); }

    score = Math.max(0, Math.min(100, score));

    const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Attention';

    const insights = [
      {
        category: 'business_health',
        label: 'Business Health Score',
        value: score,
        details: { score, label, bookingGrowth: Math.round(bookingGrowth * 100) / 100, revenueGrowth: Math.round(revenueGrowth * 100) / 100, returnRate: Math.round(returnRate * 100) / 100, cancellationRate: Math.round(cancellationRate * 100) / 100, noShowRate: Math.round(noShowRate * 100) / 100, totalBookings, revenue: revenue._sum.totalAmount ?? 0 },
        priority: score < 50 ? 90 : score < 70 ? 60 : 30,
        factors: adjustments,
      },
    ];

    return { score, label, insights };
  }

  async riskAlerts(query: AiInsightsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);
    const where = this.buildWhere(query);
    const alerts: any[] = [];

    const whereDate = { ...where, startTime: { gte: startDate, lte: endDate } };

    const [cancelledCount, totalBookings, noShowCount, pendingWaitlist, highPriorityWaitlist] =
      await Promise.all([
        this.prisma.booking.count({ where: { ...whereDate, status: 'CANCELLED' } }),
        this.prisma.booking.count({ where: whereDate }),
        this.prisma.booking.count({ where: { ...whereDate, status: 'NO_SHOW' } }),
        this.prisma.waitlistEntry.count({ where: { ...where, status: 'WAITING' } }),
        this.prisma.waitlistEntry.count({ where: { ...where, status: 'WAITING', priority: { gte: 5 } } }),
      ]);

    const cancellationRate = totalBookings > 0 ? (cancelledCount / totalBookings) * 100 : 0;
    const noShowRate = totalBookings > 0 ? (noShowCount / totalBookings) * 100 : 0;

    if (cancellationRate > 15) {
      alerts.push({
        id: 'risk-high-cancellation',
        category: 'risk',
        type: 'cancellation_rate',
        severity: cancellationRate > 25 ? 'critical' : 'high',
        title: 'High Cancellation Rate',
        message: `Cancellation rate is ${cancellationRate.toFixed(0)}% which is above the healthy threshold of 15%.`,
        value: Math.round(cancellationRate * 100) / 100,
        priority: cancellationRate > 25 ? 95 : 80,
        suggestedAction: 'Review booking policies and send reminders.',
      });
    }

    if (noShowRate > 10) {
      alerts.push({
        id: 'risk-high-noshow',
        category: 'risk',
        type: 'no_show_rate',
        severity: noShowRate > 20 ? 'critical' : 'high',
        title: 'High No-Show Rate',
        message: `No-show rate is ${noShowRate.toFixed(0)}%. Clients are not showing up for appointments.`,
        value: Math.round(noShowRate * 100) / 100,
        priority: noShowRate > 20 ? 95 : 80,
        suggestedAction: 'Implement confirmation calls or deposit requirements.',
      });
    }

    if (pendingWaitlist > 20) {
      alerts.push({
        id: 'risk-backlog-waitlist',
        category: 'risk',
        type: 'waitlist_backlog',
        severity: pendingWaitlist > 50 ? 'critical' : 'medium',
        title: 'Waitlist Backlog',
        message: `${pendingWaitlist} waitlist entries are pending. ${highPriorityWaitlist} are high priority.`,
        value: pendingWaitlist,
        priority: pendingWaitlist > 50 ? 85 : 65,
        suggestedAction: 'Review staffing and open more appointment slots.',
      });
    }

    const noRecentBookings = await this.prisma.client.count({
      where: {
        totalVisits: { gt: 0 },
        lastVisitAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
    });

    if (noRecentBookings > 0) {
      alerts.push({
        id: 'risk-inactive-clients',
        category: 'risk',
        type: 'inactive_clients',
        severity: noRecentBookings > 50 ? 'high' : 'low',
        title: 'Inactive Clients',
        message: `${noRecentBookings} clients have not visited in over 90 days.`,
        value: noRecentBookings,
        priority: noRecentBookings > 50 ? 75 : 40,
        suggestedAction: 'Run a re-engagement campaign for inactive clients.',
      });
    }

    return alerts;
  }

  async opportunities(query: AiInsightsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);
    const where = this.buildWhere(query);
    const ops: any[] = [];

    const whereDate = { ...where, startTime: { gte: startDate, lte: endDate } };

    const [peakHours, popularServices, topStaff, frequentClients] =
      await Promise.all([
        this.prisma.booking.groupBy({
          by: ['branchId'],
          where: { ...whereDate, status: { in: ['COMPLETED', 'CONFIRMED', 'CHECKED_IN'] } },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 3,
        }),
        this.prisma.bookingService.groupBy({
          by: ['name'],
          where: { booking: { ...whereDate } },
          _count: { id: true },
          _sum: { price: true },
          orderBy: { _count: { id: 'desc' } },
          take: 5,
        }),
        this.prisma.booking.groupBy({
          by: ['staffId'],
          where: { ...whereDate, staffId: { not: null }, status: { in: ['COMPLETED', 'CONFIRMED', 'CHECKED_IN'] } },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 3,
        }),
        this.prisma.client.findMany({
          where: { totalVisits: { gte: 5 } },
          orderBy: { totalSpend: 'desc' },
          take: 5,
          select: { id: true, fullName: true, totalVisits: true, totalSpend: true },
        }),
      ]);

    if (popularServices.length > 0) {
      const topService = popularServices[0];
      ops.push({
        id: 'opp-popular-service',
        category: 'opportunity',
        type: 'popular_service',
        title: `Top Service: ${topService.name}`,
        message: `${topService.name} booked ${topService._count.id} times generating ₹${topService._sum.price ?? 0} in revenue. Consider promoting this service.`,
        value: topService._count.id,
        priority: 70,
        details: { service: topService.name, bookings: topService._count.id, revenue: topService._sum.price ?? 0 },
      });
    }

    if (peakHours.length > 0) {
      ops.push({
        id: 'opp-branch-demand',
        category: 'opportunity',
        type: 'branch_demand',
        title: 'High Demand Branches',
        message: `Top branches are driving significant booking volume. Consider expanding capacity.`,
        value: peakHours.length,
        priority: 60,
        details: { branches: peakHours.map((b) => ({ branchId: b.branchId, bookings: b._count.id })) },
      });
    }

    if (topStaff.length > 0) {
      const staffDetails = await Promise.all(
        topStaff.map(async (s) => {
          if (!s.staffId) return null;
          const user = await this.prisma.user.findUnique({ where: { id: s.staffId }, select: { id: true, fullName: true } });
          return { staffId: s.staffId, name: user?.fullName ?? 'Unknown', bookings: s._count.id };
        }),
      );
      ops.push({
        id: 'opp-top-staff',
        category: 'opportunity',
        type: 'top_performers',
        title: 'Top Performing Staff',
        message: 'Top staff members have high booking volumes. Consider incentive programs.',
        value: staffDetails.filter(Boolean).length,
        priority: 55,
        details: { staff: staffDetails.filter(Boolean) },
      });
    }

    if (frequentClients.length > 0) {
      ops.push({
        id: 'opp-loyal-clients',
        category: 'opportunity',
        type: 'loyal_clients',
        title: 'Loyal Client Base',
        message: `${frequentClients.length} clients have 5+ visits. Launch a loyalty program to retain them.`,
        value: frequentClients.length,
        priority: 65,
        details: { topClients: frequentClients },
      });
    }

    const walkInsToday = await this.prisma.walkIn.count({
      where: { ...where, arrivalTime: { gte: startDate, lte: endDate } },
    });

    if (walkInsToday > 10) {
      ops.push({
        id: 'opp-walkin-demand',
        category: 'opportunity',
        type: 'walkin_traffic',
        title: 'High Walk-In Traffic',
        message: `${walkInsToday} walk-ins recorded. Consider dedicated walk-in staff to capture more revenue.`,
        value: walkInsToday,
        priority: 60,
        details: { walkIns: walkInsToday },
      });
    }

    return ops;
  }

  private getDateRange(query: AiInsightsQueryDto) {
    const endDate = query.to ? new Date(query.to) : new Date();
    const startDate = query.from ? new Date(query.from) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { startDate, endDate };
  }

  private buildWhere(query: AiInsightsQueryDto) {
    const where: any = {};
    if (query.branchId) where.branchId = query.branchId;
    return where;
  }
}
