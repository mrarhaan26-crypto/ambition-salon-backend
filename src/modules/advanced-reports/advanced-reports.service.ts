import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AdvancedReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBasicStats() {
    const [totalBookings, totalClients, revenueAgg, staffCount] = await Promise.all([
      this.prisma.booking.count(),
      this.prisma.client.count(),
      this.prisma.posSale.aggregate({ where: { status: 'COMPLETED' }, _sum: { totalAmount: true } }),
      this.prisma.user.count({ where: { role: { in: ['STYLIST', 'THERAPIST'] } } }),
    ]);

    return {
      totalBookings,
      totalClients,
      totalRevenue: revenueAgg._sum.totalAmount || 0,
      staffCount,
    };
  }

  async getRevenueStats() {
    const [totalAgg, byStatus, byMethod] = await Promise.all([
      this.prisma.posSale.aggregate({ _sum: { totalAmount: true }, _count: true }),
      this.prisma.posSale.groupBy({
        by: ['status'],
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.posSale.groupBy({
        by: ['paymentMethod'],
        _sum: { totalAmount: true },
        _count: true,
      }),
    ]);

    return {
      total: totalAgg._sum.totalAmount || 0,
      totalSales: totalAgg._count,
      byStatus: byStatus.map(s => ({ status: s.status, total: s._sum.totalAmount || 0, count: s._count })),
      byMethod: byMethod.map(m => ({ method: m.paymentMethod || 'UNKNOWN', total: m._sum.totalAmount || 0, count: m._count })),
    };
  }

  async getBookingStats() {
    const [total, byStatus] = await Promise.all([
      this.prisma.booking.count(),
      this.prisma.booking.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [thisMonthCount, prevMonthCount] = await Promise.all([
      this.prisma.booking.count({ where: { startTime: { gte: thisMonth, lte: nextMonth } } }),
      this.prisma.booking.count({ where: { startTime: { gte: prevMonth, lt: thisMonth } } }),
    ]);

    return {
      total,
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
      byPeriod: {
        thisMonth: thisMonthCount,
        prevMonth: prevMonthCount,
        last30Days: await this.prisma.booking.count({ where: { startTime: { gte: thirtyDaysAgo } } }),
      },
    };
  }

  async getClientStats() {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    const [total, newThisMonth, active] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.client.count({ where: { createdAt: { gte: thisMonthStart } } }),
      this.prisma.client.count({ where: { lastVisitAt: { gte: thirtyDaysAgo } } }),
    ]);

    return { total, newThisMonth, active };
  }

  async getStaffStats() {
    const staff = await this.prisma.user.findMany({
      where: { role: { in: ['STYLIST', 'THERAPIST'] } },
      select: { id: true, fullName: true, email: true, role: true, isActive: true },
    });

    const staffWithBookings = await Promise.all(
      staff.map(async (s) => {
        const count = await this.prisma.booking.count({ where: { staffId: s.id } });
        return { ...s, bookingCount: count };
      })
    );

    const totalBookings = staffWithBookings.reduce((sum, s) => sum + s.bookingCount, 0);
    return { count: staff.length, totalBookings, staff: staffWithBookings };
  }

  async getInventoryStats() {
    const [totalProducts, lowStockCount] = await Promise.all([
      this.prisma.inventoryProduct.count({ where: { isActive: true } }),
      this.prisma.inventoryProduct.count({
        where: {
          isActive: true,
          quantity: { lte: this.prisma.inventoryProduct.fields.minStockLevel },
        },
      }),
    ]);

    return { totalProducts, lowStock: lowStockCount };
  }

  async getFinanceStats() {
    const [paymentAgg, invoiceAgg, pendingInvoices] = await Promise.all([
      this.prisma.payment.aggregate({ _sum: { amount: true }, _count: true }),
      this.prisma.invoice.aggregate({ _sum: { total: true }, _count: true }),
      this.prisma.invoice.findMany({
        where: { status: { in: ['PENDING', 'DRAFT'] } },
        select: { id: true, invoiceNumber: true, total: true, status: true },
      }),
    ]);

    const pendingTotal = pendingInvoices.reduce((s, inv) => s + (inv.total || 0), 0);

    return {
      payments: paymentAgg._sum.amount || 0,
      invoices: invoiceAgg._count,
      pending: pendingTotal,
    };
  }

  async getExportCsv() {
    const [bookings, clients, payments] = await Promise.all([
      this.prisma.booking.findMany({ take: 100, orderBy: { createdAt: 'desc' } }),
      this.prisma.client.findMany({ take: 100, orderBy: { createdAt: 'desc' } }),
      this.prisma.payment.findMany({ take: 100, orderBy: { createdAt: 'desc' } }),
    ]);

    const header = 'Type,Id,CreatedAt,Amount,Status';
    const bookingRows = bookings.map(b => `Booking,${b.id},${b.createdAt.toISOString()},${b.totalAmount},${b.status}`);
    const clientRows = clients.map(c => `Client,${c.id},${c.createdAt.toISOString()},${c.totalSpend},ACTIVE`);
    const paymentRows = payments.map(p => `Payment,${p.id},${p.createdAt.toISOString()},${p.amount},${p.status}`);
    const csv = [header, ...bookingRows, ...clientRows, ...paymentRows].join('\n');

    return { csv };
  }
}
