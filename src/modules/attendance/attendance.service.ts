import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any) {
    return this.prisma.staffAttendance.findMany({
      where: {
        ...(query.staffId ? { staffId: query.staffId } : {}),
        ...(query.date ? { date: new Date(query.date) } : {}),
      },
      orderBy: { date: 'desc' },
    });
  }

  async findByStaff(staffId: string) {
    return this.prisma.staffAttendance.findMany({
      where: { staffId },
      orderBy: { date: 'desc' },
    });
  }

  async clockIn(staffId: string) {
    if (!staffId) throw new BadRequestException('staffId is required');
    return this.prisma.staffAttendance.create({
      data: {
        staffId,
        clockIn: new Date(),
        date: new Date(),
      },
    });
  }

  async clockOut(staffId: string) {
    if (!staffId) throw new BadRequestException('staffId is required');

    const record = await this.prisma.staffAttendance.findFirst({
      where: { staffId, clockOut: null },
      orderBy: { clockIn: 'desc' },
    });

    if (!record) throw new NotFoundException('No open attendance record found');

    const clockOut = new Date();
    const clockIn = record.clockIn ? new Date(record.clockIn) : new Date();
    const totalMin = Math.round((clockOut.getTime() - clockIn.getTime()) / 60000);

    return this.prisma.staffAttendance.update({
      where: { id: record.id },
      data: { clockOut, totalMin },
    });
  }

  async update(id: string, body: any) {
    const existing = await this.prisma.staffAttendance.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Attendance record not found');
    return this.prisma.staffAttendance.update({
      where: { id },
      data: {
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });
  }

  async summary() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const records = await this.prisma.staffAttendance.findMany({
      where: { date: { gte: startOfMonth } },
    });

    const grouped: Record<string, { staffId: string; totalEntries: number; totalMinutes: number }> = {};

    for (const record of records) {
      if (!grouped[record.staffId]) {
        grouped[record.staffId] = { staffId: record.staffId, totalEntries: 0, totalMinutes: 0 };
      }
      grouped[record.staffId].totalEntries += 1;
      grouped[record.staffId].totalMinutes += record.totalMin;
    }

    return Object.values(grouped);
  }
}
