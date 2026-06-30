import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private getDateRange(query: any) {
    const now = new Date();
    const to = query.to ? new Date(query.to) : now;
    const from = query.from ? new Date(query.from) : new Date(now.getTime() - 30 * 86400000);
    return { from, to };
  }

  async getDashboard(query: any) {
    const { from, to } = this.getDateRange(query);
    const where = { createdAt: { gte: from, lte: to } };

    const [bookings, sales, clients, lowStock] = await Promise.all([
      this.prisma.booking.count({ where: { startTime: { gte: from, lte: to } } }),
      this.prisma.posSale.aggregate({ where: { ...where, status: 'COMPLETED' }, _sum: { totalAmount: true } }),
      this.prisma.client.count({ where }),
      this.prisma.inventoryProduct.findMany({ where: { isActive: true, quantity: { lte: this.prisma.inventoryProduct.fields.minStockLevel } }, select: { id: true, name: true, quantity: true, minStockLevel: true } }),
    ]);

    return {
      period: { from, to },
      kpis: {
        totalBookings: bookings,
        totalRevenue: sales._sum.totalAmount || 0,
        newClients: clients,
        lowStockItems: lowStock.length,
      },
      lowStockProducts: lowStock,
    };
  }

  async getRevenue(query: any) {
    const { from, to } = this.getDateRange(query);
    const sales = await this.prisma.posSale.findMany({
      where: { createdAt: { gte: from, lte: to }, status: 'COMPLETED' },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap = new Map<string, number>();
    let total = 0;
    for (const sale of sales) {
      total += sale.totalAmount;
      const day = sale.createdAt.toISOString().slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) || 0) + sale.totalAmount);
    }

    const daily = Array.from(dailyMap.entries()).map(([date, revenue]) => ({ date, revenue }));

    return {
      period: { from, to },
      summary: { totalRevenue: total, totalSales: sales.length, averagePerSale: sales.length > 0 ? total / sales.length : 0 },
      daily,
    };
  }

  async getBookings(query: any) {
    const { from, to } = this.getDateRange(query);
    const bookings = await this.prisma.booking.findMany({
      where: { startTime: { gte: from, lte: to } },
      include: { client: { select: { fullName: true } }, services: true },
      orderBy: { startTime: 'desc' },
    });

    const statusCounts = { PENDING: 0, CONFIRMED: 0, CHECKED_IN: 0, COMPLETED: 0, CANCELLED: 0, NO_SHOW: 0 };
    for (const b of bookings) {
      if (statusCounts[b.status] !== undefined) statusCounts[b.status]++;
    }

    return {
      period: { from, to },
      summary: { totalBookings: bookings.length, ...statusCounts },
      bookings: bookings.slice(0, 50),
    };
  }

  async getClients(query: any) {
    const { from, to } = this.getDateRange(query);
    const [clients, newClients, returningClients] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.client.count({ where: { createdAt: { gte: from, lte: to } } }),
      this.prisma.client.count({ where: { lastVisitAt: { gte: from, lte: to } } }),
    ]);

    const topClients = await this.prisma.client.findMany({
      orderBy: { totalSpend: 'desc' },
      take: 10,
    });

    return {
      period: { from, to },
      summary: { totalClients: clients, newClients, returningClients },
      topClients,
    };
  }

  async getStaff(query: any) {
    const { from, to } = this.getDateRange(query);
    const staff = await this.prisma.user.findMany({
      where: { role: { in: ['STYLIST', 'THERAPIST'] } },
      select: { id: true, fullName: true, email: true, role: true, isActive: true },
    });

    const staffWithStats = await Promise.all(staff.map(async (s) => {
      const bookings = await this.prisma.booking.findMany({
        where: { staffId: s.id, startTime: { gte: from, lte: to } },
      });
      const completed = bookings.filter(b => b.status === 'COMPLETED').length;
      const revenue = bookings.filter(b => b.status !== 'CANCELLED').reduce((sum, b) => sum + b.totalAmount, 0);
      return { ...s, totalBookings: bookings.length, completedBookings: completed, revenue };
    }));

    return {
      period: { from, to },
      staff: staffWithStats,
    };
  }

  async getInventory(query: any) {
    const total = await this.prisma.inventoryProduct.count({ where: { isActive: true } });
    const lowStock = await this.prisma.inventoryProduct.findMany({
      where: { isActive: true, quantity: { lte: this.prisma.inventoryProduct.fields.minStockLevel } },
      orderBy: { quantity: 'asc' },
    });
    const categories = await this.prisma.inventoryProduct.groupBy({
      by: ['category'],
      _count: { category: true },
      where: { isActive: true, category: { not: null } },
    });

    return {
      summary: { totalProducts: total, lowStockCount: lowStock.length },
      lowStock,
      categories: categories.map(c => ({ category: c.category, count: c._count.category })),
    };
  }

  async getExportSummary(query: any) {
    const { from, to } = this.getDateRange(query);
    const [revenue, bookings, clients, inventory] = await Promise.all([
      this.getRevenue(query),
      this.getBookings(query),
      this.getClients(query),
      this.getInventory(query),
    ]);
    return { period: { from, to }, revenue: revenue.summary, bookings: bookings.summary, clients: clients.summary, inventory: inventory.summary };
  }
}
