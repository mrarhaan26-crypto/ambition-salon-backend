import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any) {
    const where: any = {};
    if (query.role) where.role = query.role;
    if (query.isActive === 'true') where.isActive = true;
    if (query.isActive === 'false') where.isActive = false;
    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.user.findMany({
      where,
      select: {
        id: true, fullName: true, email: true, phone: true, role: true,
        isActive: true, specialization: true, bio: true, createdAt: true, updatedAt: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async findOne(id: string) {
    const staff = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, fullName: true, email: true, phone: true, role: true,
        isActive: true, specialization: true, bio: true, createdAt: true, updatedAt: true,
      },
    });
    if (!staff) throw new NotFoundException('Staff not found');
    return staff;
  }

  async create(body: any) {
    if (!body.fullName) throw new BadRequestException('Full name is required');
    if (!body.email) throw new BadRequestException('Email is required');
    if (!body.password) throw new BadRequestException('Password is required');

    const existing = await this.prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw new BadRequestException('Email already in use');

    const passwordHash = await bcrypt.hash(body.password, 10);
    return this.prisma.user.create({
      data: {
        fullName: body.fullName,
        email: body.email,
        passwordHash,
        phone: body.phone || null,
        role: body.role || 'STYLIST',
        isActive: body.isActive ?? true,
        specialization: body.specialization || null,
        bio: body.bio || null,
      },
      select: {
        id: true, fullName: true, email: true, phone: true, role: true,
        isActive: true, specialization: true, bio: true, createdAt: true,
      },
    });
  }

  async update(id: string, body: any) {
    await this.findOne(id);
    const data: any = {};
    if (body.fullName !== undefined) data.fullName = body.fullName;
    if (body.email !== undefined) data.email = body.email;
    if (body.phone !== undefined) data.phone = body.phone || null;
    if (body.role !== undefined) data.role = body.role;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.specialization !== undefined) data.specialization = body.specialization || null;
    if (body.bio !== undefined) data.bio = body.bio || null;
    if (body.password) {
      data.passwordHash = await bcrypt.hash(body.password, 10);
    }
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, fullName: true, email: true, phone: true, role: true,
        isActive: true, specialization: true, bio: true, updatedAt: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, isActive: true },
    });
  }

  async getSchedule(id: string, query: any) {
    await this.findOne(id);
    const where: any = { staffId: id };
    if (query.branchId) where.branchId = query.branchId;
    return this.prisma.staffAvailability.findMany({
      where,
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async updateSchedule(id: string, body: any) {
    await this.findOne(id);
    if (!body.schedule || !Array.isArray(body.schedule)) {
      throw new BadRequestException('schedule array is required');
    }
    await this.prisma.staffAvailability.deleteMany({ where: { staffId: id } });
    for (const slot of body.schedule) {
      if (slot.dayOfWeek === undefined) throw new BadRequestException('Each schedule entry needs dayOfWeek');
      await this.prisma.staffAvailability.create({
        data: {
          branchId: slot.branchId || 'seed-branch-main',
          staffId: id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime || '10:00',
          endTime: slot.endTime || '19:00',
          isActive: slot.isActive ?? true,
        },
      });
    }
    return this.prisma.staffAvailability.findMany({
      where: { staffId: id },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async getPerformance(id: string) {
    await this.findOne(id);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    const bookings = await this.prisma.booking.findMany({
      where: { staffId: id, startTime: { gte: thirtyDaysAgo } },
    });

    const total = bookings.length;
    const completed = bookings.filter(b => b.status === 'COMPLETED').length;
    const cancelled = bookings.filter(b => b.status === 'CANCELLED').length;
    const noShow = bookings.filter(b => b.status === 'NO_SHOW').length;
    const revenue = bookings
      .filter(b => b.status !== 'CANCELLED')
      .reduce((sum, b) => sum + b.totalAmount, 0);

    return {
      staffId: id,
      period: { from: thirtyDaysAgo, to: now },
      summary: {
        totalBookings: total,
        completedBookings: completed,
        cancelledBookings: cancelled,
        noShowBookings: noShow,
        revenue,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
    };
  }

  async getBookings(id: string, query: any) {
    await this.findOne(id);
    const where: any = { staffId: id };
    if (query.status) where.status = query.status;
    if (query.from) where.startTime = { ...where.startTime, gte: new Date(query.from) };
    if (query.to) where.endTime = { ...where.endTime, lte: new Date(query.to) };
    return this.prisma.booking.findMany({
      where,
      include: { client: true, services: true },
      orderBy: { startTime: 'desc' },
      take: query.limit ? Number(query.limit) : 50,
    });
  }
}
