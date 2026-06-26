type NormalizedBookingService = {
  name: string;
  durationMin: number;
  price: number;
};import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { GetBookingSlotsDto } from './dto/get-booking-slots.dto';

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
];

const DEFAULT_BUFFER_MINUTES = 0;

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
    if (!body.staffId) throw new BadRequestException('Staff is required');
    if (!body.startTime) throw new BadRequestException('Start time is required');

    const services = Array.isArray(body.services) ? body.services : [];

    if (!services.length) {
      throw new BadRequestException('At least one service is required');
    }

    const normalizedServices: NormalizedBookingService[] = services.map((service: any, index: number) => {
      const name = String(service.name || '').trim();
      const durationMin = Number(service.durationMin);
      const price = Number(service.price || 0);

      if (!name) {
        throw new BadRequestException(`Service ${index + 1} name is required`);
      }

      if (!Number.isFinite(durationMin) || durationMin <= 0) {
        throw new BadRequestException(
          `Service ${index + 1} durationMin must be positive`,
        );
      }

      if (!Number.isFinite(price) || price < 0) {
        throw new BadRequestException(
          `Service ${index + 1} price must be zero or positive`,
        );
      }

      return { name, durationMin, price };
    });

    const startTime = new Date(body.startTime);

    if (Number.isNaN(startTime.getTime())) {
      throw new BadRequestException('Invalid start time');
    }

    const serviceDurationMinutes = normalizedServices.reduce(
      (sum, service) => sum + service.durationMin,
      0,
    );

    const bufferBeforeMinutes = Number(body.bufferBeforeMinutes ?? DEFAULT_BUFFER_MINUTES);
    const bufferAfterMinutes = Number(body.bufferAfterMinutes ?? DEFAULT_BUFFER_MINUTES);

    if (
      !Number.isFinite(bufferBeforeMinutes) ||
      bufferBeforeMinutes < 0 ||
      !Number.isFinite(bufferAfterMinutes) ||
      bufferAfterMinutes < 0
    ) {
      throw new BadRequestException('Buffer minutes must be zero or positive');
    }

    const endTime = new Date(startTime.getTime() + serviceDurationMinutes * 60_000);
    const conflictStartTime = new Date(
      startTime.getTime() - bufferBeforeMinutes * 60_000,
    );
    const conflictEndTime = new Date(
      endTime.getTime() + bufferAfterMinutes * 60_000,
    );

    const totalAmount = normalizedServices.reduce(
      (sum, service) => sum + service.price,
      0,
    );

    const bookingStatus: BookingStatus = body.status || 'CONFIRMED';

    if (!Object.values(BookingStatus).includes(bookingStatus)) {
      throw new BadRequestException('Invalid booking status');
    }

    const dayOfWeek = startTime.getDay();

    return this.prisma.$transaction(async (tx) => {
      const branch = await tx.branch.findUnique({
        where: { id: body.branchId },
      });

      if (!branch) throw new NotFoundException('Branch not found');

      const client = await tx.client.findUnique({
        where: { id: body.clientId },
      });

      if (!client) throw new NotFoundException('Client not found');

      const staff = await tx.user.findUnique({
        where: { id: body.staffId },
      });

      if (!staff) throw new NotFoundException('Staff not found');

      const staffAvailability = await tx.staffAvailability.findFirst({
        where: {
          branchId: body.branchId,
          staffId: body.staffId,
          dayOfWeek,
          isActive: true,
        },
      });

      if (!staffAvailability) {
        throw new ConflictException('Staff is not available on this day');
      }

      const availabilityStart = this.applyTimeToDate(
        startTime,
        staffAvailability.startTime,
      );
      const availabilityEnd = this.applyTimeToDate(
        startTime,
        staffAvailability.endTime,
      );

      if (startTime < availabilityStart || endTime > availabilityEnd) {
        throw new ConflictException('Booking is outside staff availability');
      }

      const staffConflict = await tx.booking.findFirst({
        where: {
          branchId: body.branchId,
          staffId: body.staffId,
          status: { in: ACTIVE_BOOKING_STATUSES },
          startTime: { lt: conflictEndTime },
          endTime: { gt: conflictStartTime },
        },
      });

      if (staffConflict) {
        throw new ConflictException(
          'Staff already has a booking in this time slot',
        );
      }

      const clientConflict = await tx.booking.findFirst({
        where: {
          clientId: body.clientId,
          status: { in: ACTIVE_BOOKING_STATUSES },
          startTime: { lt: conflictEndTime },
          endTime: { gt: conflictStartTime },
        },
      });

      if (clientConflict) {
        throw new ConflictException(
          'Client already has a booking in this time slot',
        );
      }

      return tx.booking.create({
        data: {
          branchId: body.branchId,
          clientId: body.clientId,
          staffId: body.staffId,
          title:
            body.title ||
            normalizedServices.map((service) => service.name).join(', '),
          notes: body.notes || null,
          status: bookingStatus,
          startTime,
          endTime,
          totalAmount,
          services: {
            create: normalizedServices,
          },
        },
        include: { client: true, branch: true, staff: true, services: true },
      });
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
    const normalizedDate = String(rawDateValue ?? '2026-06-27')
      .trim()
      .slice(0, 10);

    const [year, month, day] = normalizedDate
      .split('-')
      .map((value) => Number(value));
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

  private applyTimeToDate(date: Date, time: string) {
    const [hours, minutes] = time.split(':').map((value) => Number(value));
    const result = new Date(date);

    if (
      !Number.isFinite(hours) ||
      !Number.isFinite(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      throw new BadRequestException('Invalid staff availability time');
    }

    result.setHours(hours, minutes, 0, 0);
    return result;
  }
}