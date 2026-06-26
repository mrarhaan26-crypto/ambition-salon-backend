import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { GetBookingSlotsDto } from './dto/get-booking-slots.dto';

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


  async getAvailableSlots(query: GetBookingSlotsDto) {
    const { branchId, staffId, date, serviceIds } = query;

    const slotSizeMinutes = query.slotSizeMinutes
      ? Number(query.slotSizeMinutes)
      : 15;

    if (!Number.isFinite(slotSizeMinutes) || slotSizeMinutes <= 0) {
      throw new BadRequestException('slotSizeMinutes must be a positive number');
    }

    const rawDateValue = Array.isArray(date) ? date[0] : date;
    const normalizedDate = String(rawDateValue ?? '2026-06-27').trim().slice(0, 10);

    const [year, month, day] = normalizedDate.split('-').map((value) => Number(value));
    const parsedDate = new Date(Date.UTC(year, month - 1, day));

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Invalid date');
    }

    const serviceIdList = serviceIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (!serviceIdList.length) {
      throw new BadRequestException('At least one serviceId is required');
    }

    const staff = await this.prisma.user.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    const services = await this.prisma.bookingService.findMany({
      where: {
        id: {
          in: serviceIdList,
        },
      },
    });

    if (services.length !== serviceIdList.length) {
      throw new NotFoundException('One or more services were not found');
    }

    const durationMinutes = services.reduce((total, service) => {
      return total + Number(service.durationMin || 0);
    }, 0);

    if (!durationMinutes || durationMinutes <= 0) {
      throw new BadRequestException('Selected services have invalid duration');
    }

    const dayStart = new Date(parsedDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(parsedDate);
    dayEnd.setHours(23, 59, 59, 999);

    const businessOpen = new Date(parsedDate);
    businessOpen.setHours(10, 0, 0, 0);

    const businessClose = new Date(parsedDate);
    businessClose.setHours(20, 0, 0, 0);

    const existingBookings = await this.prisma.booking.findMany({
      where: {
        branchId,
        staffId,
        startTime: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: {
          notIn: ['CANCELLED', 'NO_SHOW'],
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    const slots: Array<{
      startTime: Date;
      endTime: Date;
      available: boolean;
    }> = [];

    let cursor = new Date(businessOpen);

    while (
      cursor.getTime() + durationMinutes * 60_000 <=
      businessClose.getTime()
    ) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor.getTime() + durationMinutes * 60_000);

      const hasConflict = existingBookings.some((booking) => {
        const bookingStart = new Date(booking.startTime);
        const bookingEnd = new Date(booking.endTime);

        return slotStart < bookingEnd && slotEnd > bookingStart;
      });

      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
        available: !hasConflict,
      });

      cursor = new Date(cursor.getTime() + slotSizeMinutes * 60_000);
    }

    return {
      date,
      branchId,
      staffId,
      durationMinutes,
      slotSizeMinutes,
      businessOpen,
      businessClose,
      totalSlots: slots.length,
      availableSlots: slots.filter((slot) => slot.available).length,
      unavailableSlots: slots.filter((slot) => !slot.available).length,
      slots,
    };
  }
  async calendar(query: any) {
    return this.findAll(query);
  }
}








