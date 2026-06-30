import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class CrmIntelligenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const [total, vips, inactive, birthdays] = await Promise.all([
      this.prisma.client.count(),
      this.getVips(),
      this.getInactive(),
      this.getBirthdays(),
    ]);
    return { total, vipCount: vips.length, inactiveCount: inactive.length, birthdayCount: birthdays.length, segments: await this.getSegments() };
  }

  async getSegments() {
    const total = await this.prisma.client.count();
    const withBookings = await this.prisma.booking.groupBy({ by: ['clientId'], _count: true });
    const frequent = withBookings.filter(b => b._count >= 5).length;
    const regular = withBookings.filter(b => b._count >= 2 && b._count < 5).length;
    const firstTime = withBookings.filter(b => b._count === 1).length;
    const inactive = total - withBookings.length;
    return { total, frequent, regular, firstTime, inactive, segments: [
      { name: 'Frequent', count: frequent, color: '#16a34a' },
      { name: 'Regular', count: regular, color: '#2563eb' },
      { name: 'First Time', count: firstTime, color: '#d97706' },
      { name: 'Inactive', count: inactive, color: '#6b7280' },
    ]};
  }

  async getVips() {
    return this.prisma.client.findMany({
      where: { totalSpend: { gte: 1000 } },
      orderBy: { totalSpend: 'desc' },
      take: 20,
    });
  }

  async getInactive() {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return this.prisma.client.findMany({
      where: { lastVisitAt: { lt: threeMonthsAgo } },
      orderBy: { lastVisitAt: 'asc' },
      take: 20,
    });
  }

  async getBirthdays() {
    const now = new Date();
    const all = await this.prisma.client.findMany({
      where: { dateOfBirth: { not: null } },
      select: { id: true, fullName: true, phone: true, email: true, dateOfBirth: true, totalSpend: true },
    });
    return all.filter(c => {
      if (!c.dateOfBirth) return false;
      const bd = new Date(c.dateOfBirth);
      return bd.getMonth() === now.getMonth();
    });
  }

  async getRecommendations() {
    return [
      { type: 'reengage', message: 'Send re-engagement offer to inactive clients', count: (await this.getInactive()).length },
      { type: 'vip', message: 'Thank VIP clients with exclusive reward', count: (await this.getVips()).length },
      { type: 'birthday', message: 'Send birthday wishes with special discount', count: (await this.getBirthdays()).length },
    ];
  }
}
