import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class StaffWorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  async getFull(query: any) {
    const staffId = query.staffId;
    const [profile, bookings, tasks, attendance, commission] = await Promise.all([
      staffId ? this.prisma.user.findUnique({ where: { id: staffId }, select: { id: true, fullName: true, email: true, phone: true, role: true, specialization: true, bio: true } }) : null,
      this.getBookings(staffId, query.date),
      this.getTasks(staffId),
      this.getAttendance(staffId),
      this.getCommission(staffId),
    ]);
    return { profile, bookings, tasks, attendance, commission };
  }

  async getToday(staffId: string) {
    if (!staffId) return { bookings: [], tasks: [], attendance: null };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [bookings, tasks, attendance] = await Promise.all([
      this.prisma.booking.findMany({ where: { staffId, startTime: { gte: today, lt: tomorrow } }, include: { client: { select: { id: true, fullName: true, phone: true, email: true } } }, orderBy: { startTime: 'asc' } }),
      this.prisma.task.findMany({ where: { assignedTo: staffId, status: { notIn: ['COMPLETED', 'CANCELLED'] } }, orderBy: { dueDate: 'asc' } }),
      this.prisma.staffAttendance.findFirst({ where: { staffId, clockOut: null }, orderBy: { clockIn: 'desc' } }),
    ]);
    return { bookings, tasks, attendance };
  }

  async getBookings(staffId: string, date?: string) {
    if (!staffId) return [];
    const where: any = { staffId };
    if (date) {
      const d = new Date(date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.startTime = { gte: d, lt: next };
    }
    return this.prisma.booking.findMany({ where, include: { client: { select: { id: true, fullName: true, phone: true, email: true } } }, orderBy: { startTime: 'asc' } });
  }

  async getTasks(staffId: string) {
    if (!staffId) return [];
    return this.prisma.task.findMany({ where: { assignedTo: staffId }, orderBy: { createdAt: 'desc' } });
  }

  async getCommission(staffId: string) {
    if (!staffId) return { total: 0, pending: 0, paid: 0 };
    const payments = await this.prisma.commissionPayment.findMany({ where: { staffId } });
    return {
      total: payments.reduce((s, p) => s + p.amount, 0),
      pending: payments.filter(p => p.status === 'PENDING').reduce((s, p) => s + p.amount, 0),
      paid: payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0),
    };
  }

  async getAttendance(staffId: string) {
    if (!staffId) return { today: null, recent: [], summary: null };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayRecord, recent, summary] = await Promise.all([
      this.prisma.staffAttendance.findFirst({ where: { staffId, date: { gte: today, lt: tomorrow } }, orderBy: { clockIn: 'desc' } }),
      this.prisma.staffAttendance.findMany({ where: { staffId }, orderBy: { date: 'desc' }, take: 10 }),
      this.prisma.staffAttendance.aggregate({ where: { staffId }, _sum: { totalMin: true }, _count: true }),
    ]);
    return { today: todayRecord, recent, totalMinutes: summary._sum.totalMin || 0, totalEntries: summary._count || 0 };
  }
}
