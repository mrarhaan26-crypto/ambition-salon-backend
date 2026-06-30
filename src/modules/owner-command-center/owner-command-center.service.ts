import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class OwnerCommandCenterService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      todayBookings, todayRevenue, totalStaff, activeStaff,
      lowStockItems, totalClients, totalTasks, unreadNotifications
    ] = await Promise.all([
      this.prisma.booking.count({ where: { startTime: { gte: today, lt: tomorrow } } }),
      this.prisma.booking.aggregate({ where: { startTime: { gte: today, lt: tomorrow } }, _sum: { totalAmount: true } }),
      this.prisma.user.count({ where: { role: { in: ['STYLIST', 'THERAPIST'] }, isActive: true } }),
      this.prisma.staffAttendance.count({ where: { clockOut: null } }),
      this.prisma.inventoryProduct.count({ where: { quantity: { lte: this.prisma.inventoryProduct.fields.minStockLevel } } }),
      this.prisma.client.count(),
      this.prisma.task.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
      this.prisma.notification.count({ where: { read: false } }),
    ]);

    return {
      todayBookings,
      todayRevenue: todayRevenue._sum.totalAmount || 0,
      totalStaff,
      activeStaff,
      lowStockItems,
      totalClients,
      totalTasks,
      unreadNotifications,
    };
  }

  async getHealth() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [bookings, revenue, staff] = await Promise.all([
      this.prisma.booking.count({ where: { startTime: { gte: today, lt: tomorrow } } }),
      this.prisma.booking.aggregate({ where: { startTime: { gte: today, lt: tomorrow } }, _sum: { totalAmount: true } }),
      this.prisma.user.count({ where: { isActive: true } }),
    ]);

    const score = Math.min(100, Math.round(
      ((bookings > 0 ? 25 : 0) + ((revenue._sum.totalAmount ?? 0) > 0 ? 25 : 0) + (staff > 0 ? 25 : 0)) / 75 * 100
    ));
    return {
      score,
      bookings,
      revenue: revenue._sum.totalAmount || 0,
      staff,
      status: score >= 50 ? 'GOOD' : 'ATTENTION',
      insights: [
        bookings > 0 ? `${bookings} booking(s) today` : 'No bookings today',
        (revenue._sum.totalAmount ?? 0) > 0 ? `Revenue: $${(revenue._sum.totalAmount ?? 0).toFixed(0)}` : 'No revenue today',
        staff > 0 ? `${staff} active staff` : 'No active staff',
        `Health score: ${score}%`,
      ],
    };
  }

  async getActions() {
    return [
      { id: '1', label: 'View Today Bookings', action: 'navigate', route: '/app/bookings', icon: 'calendar' },
      { id: '2', label: 'Check Low Stock', action: 'navigate', route: '/app/inventory', icon: 'box' },
      { id: '3', label: 'View Staff Attendance', action: 'navigate', route: '/app/attendance', icon: 'users' },
      { id: '4', label: 'Generate Report', action: 'navigate', route: '/app/advanced-reports', icon: 'chart' },
    ];
  }

  async createAction(body: any) {
    return { success: true, action: body };
  }
}
