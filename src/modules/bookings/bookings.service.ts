import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any) {
    return this.prisma.booking.findMany({
      where: {
        ...(query?.branchId ? { branchId: query.branchId } : {}),
        ...(query?.clientId ? { clientId: query.clientId } : {}),
        ...(query?.staffId ? { staffId: query.staffId } : {}),
        ...(query?.status ? { status: query.status } : {}),
      },
      include: { client: true, branch: true, staff: true, services: true },
      orderBy: { startTime: 'asc' },
    });
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { client: true, branch: true, staff: true, services: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async create(body: any) {
    if (!body.branchId) throw new BadRequestException('Branch is required');
    if (!body.clientId) throw new BadRequestException('Client is required');
    if (!body.title) throw new BadRequestException('Booking title is required');
    if (!body.startTime) throw new BadRequestException('Start time is required');
    if (!body.endTime) throw new BadRequestException('End time is required');

    const startTime = new Date(body.startTime);
    const endTime = new Date(body.endTime);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw new BadRequestException('Invalid booking time');
    }

    if (endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    const client = await this.prisma.client.findUnique({
      where: { id: body.clientId },
    });
    if (!client) throw new BadRequestException('Client not found');

    const branch = await this.prisma.branch.findUnique({
      where: { id: body.branchId },
    });
    if (!branch) throw new BadRequestException('Branch not found');

    if (body.staffId) {
      const staff = await this.prisma.user.findUnique({
        where: { id: body.staffId },
      });
      if (!staff) throw new BadRequestException('Staff not found');

      const conflict = await this.prisma.booking.findFirst({
        where: {
          staffId: body.staffId,
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });

      if (conflict) {
        throw new ConflictException(
          'Staff already has a booking in this time slot',
        );
      }
    }

    const services = Array.isArray(body.services) ? body.services : [];

    const totalAmount = services.reduce(
      (sum: number, service: any) => sum + Number(service.price || 0),
      0,
    );

    return this.prisma.booking.create({
      data: {
        branchId: body.branchId,
        clientId: body.clientId,
        staffId: body.staffId || null,
        title: body.title,
        notes: body.notes || null,
        status: body.status || 'PENDING',
        startTime,
        endTime,
        totalAmount,
        services: {
          create: services.map((s: any) => ({
            name: s.name || 'Service',
            durationMin: Number(s.durationMin || 30),
            price: Number(s.price || 0),
          })),
        },
      },
      include: { client: true, branch: true, staff: true, services: true },
    });
  }

  async update(id: string, body: any) {
    await this.findOne(id);

    const data: any = {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.staffId !== undefined ? { staffId: body.staffId || null } : {}),
      ...(body.totalAmount !== undefined
        ? { totalAmount: Number(body.totalAmount) }
        : {}),
    };

    if (body.startTime) data.startTime = new Date(body.startTime);
    if (body.endTime) data.endTime = new Date(body.endTime);

    return this.prisma.booking.update({
      where: { id },
      data,
      include: { client: true, branch: true, staff: true, services: true },
    });
  }

  async updateStatus(id: string, status: BookingStatus) {
    if (!status) {
      throw new BadRequestException('Status is required');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const allowedTransitions: Record<BookingStatus, BookingStatus[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED', 'NO_SHOW'],
      CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
      CHECKED_IN: ['COMPLETED'],
      COMPLETED: [],
      CANCELLED: [],
      NO_SHOW: [],
    };

    if (!allowedTransitions[booking.status].includes(status)) {
      throw new BadRequestException('Invalid booking status transition');
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status },
      include: { client: true, branch: true, staff: true, services: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.booking.delete({ where: { id } });
  }

  async calendar(query: any) {
    return this.findAll(query);
  }
}