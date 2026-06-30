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
      include: { client: true, branch: true, staff: true, services: true, resource: true },
      orderBy: { startTime: 'asc' },
    });
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { client: true, branch: true, staff: true, services: true, resource: true },
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

      if (body.resourceId) {
        const resource = await tx.resource.findUnique({
          where: { id: body.resourceId },
        });
        if (!resource) throw new NotFoundException('Resource not found');

        const resourceConflict = await tx.booking.findFirst({
          where: {
            branchId: body.branchId,
            resourceId: body.resourceId,
            status: { in: ACTIVE_BOOKING_STATUSES },
            startTime: { lt: conflictEndTime },
            endTime: { gt: conflictStartTime },
          },
        });
        if (resourceConflict) {
          throw new ConflictException('Resource is already booked in this time slot');
        }
      }

      return tx.booking.create({
        data: {
          branchId: body.branchId,
          clientId: body.clientId,
          staffId: body.staffId,
          resourceId: body.resourceId || null,
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
        include: { client: true, branch: true, staff: true, resource: true, services: true },
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
      ...(body.resourceId !== undefined ? { resourceId: body.resourceId || null } : {}),
      ...(body.totalAmount !== undefined
        ? { totalAmount: Number(body.totalAmount) }
        : {}),
    };

    if (body.startTime) data.startTime = new Date(body.startTime);
    if (body.endTime) data.endTime = new Date(body.endTime);

    return this.prisma.booking.update({
      where: { id },
      data,
      include: { client: true, branch: true, staff: true, services: true, resource: true },
    });
  }

  async reschedule(id: string, body: any) {
    if (!body.startTime) {
      throw new BadRequestException('New start time is required');
    }

    const newStartTime = new Date(body.startTime);

    if (Number.isNaN(newStartTime.getTime())) {
      throw new BadRequestException('Invalid new start time');
    }

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
        include: { services: true },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(booking.status)) {
        throw new BadRequestException(
          'Completed, cancelled or no-show bookings cannot be rescheduled',
        );
      }

      if (!booking.staffId) {
        throw new BadRequestException('Booking has no assigned staff');
      }

      const durationMinutes = booking.services.reduce(
        (total: number, service: { durationMin: number }) =>
          total + Number(service.durationMin || 0),
        0,
      );

      if (!durationMinutes || durationMinutes <= 0) {
        throw new BadRequestException('Booking services have invalid duration');
      }

      const newEndTime = new Date(newStartTime.getTime() + durationMinutes * 60_000);
      const dayOfWeek = newStartTime.getDay();

      const staffAvailability = await tx.staffAvailability.findFirst({
        where: {
          branchId: booking.branchId,
          staffId: booking.staffId,
          dayOfWeek,
          isActive: true,
        },
      });

      if (!staffAvailability) {
        throw new ConflictException('Staff is not available on this day');
      }

      const availabilityStart = this.applyTimeToDate(
        newStartTime,
        staffAvailability.startTime,
      );
      const availabilityEnd = this.applyTimeToDate(
        newStartTime,
        staffAvailability.endTime,
      );

      if (newStartTime < availabilityStart || newEndTime > availabilityEnd) {
        throw new ConflictException('New booking time is outside staff availability');
      }

      const staffConflict = await tx.booking.findFirst({
        where: {
          id: { not: id },
          branchId: booking.branchId,
          staffId: booking.staffId,
          status: { in: ACTIVE_BOOKING_STATUSES },
          startTime: { lt: newEndTime },
          endTime: { gt: newStartTime },
        },
      });

      if (staffConflict) {
        throw new ConflictException(
          'Staff already has a booking in this time slot',
        );
      }

      const clientConflict = await tx.booking.findFirst({
        where: {
          id: { not: id },
          clientId: booking.clientId,
          status: { in: ACTIVE_BOOKING_STATUSES },
          startTime: { lt: newEndTime },
          endTime: { gt: newStartTime },
        },
      });

      if (clientConflict) {
        throw new ConflictException(
          'Client already has a booking in this time slot',
        );
      }

      const targetResourceId = body.resourceId !== undefined ? body.resourceId : booking.resourceId;
      if (targetResourceId) {
        const resourceConflict = await tx.booking.findFirst({
          where: {
            id: { not: id },
            resourceId: targetResourceId,
            status: { in: ACTIVE_BOOKING_STATUSES },
            startTime: { lt: newEndTime },
            endTime: { gt: newStartTime },
          },
        });
        if (resourceConflict) {
          throw new ConflictException('Resource is already booked in this time slot');
        }
      }

      return tx.booking.update({
        where: { id },
        data: {
          startTime: newStartTime,
          endTime: newEndTime,
          ...(body.resourceId !== undefined ? { resourceId: body.resourceId || null } : {}),
        },
        include: { client: true, branch: true, staff: true, services: true, resource: true },
      });
    });
  }

  async cancel(id: string, body: any) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.status === 'CANCELLED') {
        throw new BadRequestException('Booking is already cancelled');
      }

      if (booking.status === 'COMPLETED') {
        throw new BadRequestException('Completed booking cannot be cancelled');
      }

      if (booking.status === 'NO_SHOW') {
        throw new BadRequestException('No-show booking cannot be cancelled');
      }

      const reason = String(body?.reason || '').trim();

      return tx.booking.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          notes: reason
            ? `${booking.notes || ''}${booking.notes ? ' | ' : ''}Cancellation reason: ${reason}`
            : booking.notes,
        },
        include: { client: true, branch: true, staff: true, resource: true, services: true },
      });
    });
  }

  async updateStatus(id: string, status: BookingStatus) {
    if (!status) {
      throw new BadRequestException('Status is required');
    }

    if (!Object.values(BookingStatus).includes(status)) {
      throw new BadRequestException('Invalid booking status');
    }

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.status === status) {
        throw new BadRequestException(`Booking is already ${status}`);
      }

      const allowedTransitions: Record<BookingStatus, BookingStatus[]> = {
        PENDING: ['CONFIRMED', 'CANCELLED', 'NO_SHOW'],
        CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
        CHECKED_IN: ['COMPLETED'],
        COMPLETED: [],
        CANCELLED: [],
        NO_SHOW: [],
      };

      const nextStatuses = allowedTransitions[booking.status] || [];

      if (!nextStatuses.includes(status)) {
        throw new BadRequestException(
          `Invalid booking status transition from ${booking.status} to ${status}`,
        );
      }

      return tx.booking.update({
        where: { id },
        data: { status },
        include: { client: true, branch: true, staff: true, resource: true, services: true },
      });
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
  async createResource(body: any) {
    if (!body.branchId) {
      throw new BadRequestException('branchId is required');
    }

    if (!body.name) {
      throw new BadRequestException('Resource name is required');
    }

    if (!body.type) {
      throw new BadRequestException('Resource type is required');
    }

    return this.prisma.resource.create({
      data: {
        branchId: body.branchId,
        name: body.name,
        type: body.type,
        description: body.description ?? null,
        isActive: body.isActive ?? true,
      },
      include: {
        branch: true,
      },
    });
  }

  async updateResource(id: string, body: any) {
    const existing = await this.prisma.resource.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new BadRequestException('Resource not found');
    }

    return this.prisma.resource.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
      include: {
        branch: true,
      },
    });
  }

  async removeResource(id: string) {
    const existing = await this.prisma.resource.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new BadRequestException('Resource not found');
    }

    return this.prisma.resource.delete({
      where: { id },
    });
  }

  async seedBranchResources(query: any) {
    if (!query.branchId) {
      throw new BadRequestException('branchId is required');
    }

    const defaults = [
      { name: 'Styling Chair 1', type: 'CHAIR', description: 'Primary haircut and styling chair' },
      { name: 'Styling Chair 2', type: 'CHAIR', description: 'Secondary haircut and styling chair' },
      { name: 'Facial Room 1', type: 'ROOM', description: 'Private facial and therapy room' },
      { name: 'Makeup Station 1', type: 'STATION', description: 'Makeup and bridal trial station' },
      { name: 'Hair Spa Equipment 1', type: 'EQUIPMENT', description: 'Hair spa machine and setup' },
    ];

    const created = [];

    for (const resource of defaults) {
      const existing = await this.prisma.resource.findFirst({
        where: {
          branchId: query.branchId,
          name: resource.name,
        },
      });

      if (!existing) {
        created.push(
          await this.prisma.resource.create({
            data: {
              branchId: query.branchId,
              name: resource.name,
              type: resource.type as any,
              description: resource.description,
              isActive: true,
            },
          }),
        );
      }
    }

    return {
      branchId: query.branchId,
      createdCount: created.length,
      created,
    };
  }
  async calendarResourceConflicts(query: any) {
    if (!query.branchId) {
      throw new BadRequestException('branchId is required');
    }

    const baseDate = query.date ? new Date(query.date) : new Date();

    if (Number.isNaN(baseDate.getTime())) {
      throw new BadRequestException('Invalid resource conflict date');
    }

    const start = new Date(baseDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const [resources, bookings] = await this.prisma.$transaction([
      this.prisma.resource.findMany({
        where: {
          branchId: query.branchId,
          isActive: true,
          ...(query.type ? { type: query.type } : {}),
        },
        select: {
          id: true,
          branchId: true,
          name: true,
          type: true,
        },
        orderBy: [
          { type: 'asc' },
          { name: 'asc' },
        ],
      }),
      this.prisma.booking.findMany({
        where: {
          branchId: query.branchId,
          startTime: {
            gte: start,
            lt: end,
          },
          status: {
            not: 'CANCELLED',
          },
        },
        select: {
          id: true,
          title: true,
          status: true,
          startTime: true,
          endTime: true,
          staffId: true,
          clientId: true,
          resourceId: true,
          services: true,
        },
        orderBy: {
          startTime: 'asc',
        },
      }),
    ]);

    const resourceBookingMap = new Map<string, typeof bookings>();
    for (const b of bookings) {
      if (!b.resourceId) continue;
      if (!resourceBookingMap.has(b.resourceId)) resourceBookingMap.set(b.resourceId, []);
      resourceBookingMap.get(b.resourceId)!.push(b);
    }

    const timeline = bookings.map((booking) => {
      let conflictStatus = 'UNASSIGNED';
      let assignedResourceId: string | null = null;

      if (booking.resourceId) {
        assignedResourceId = booking.resourceId;
        const resourceBookings = resourceBookingMap.get(booking.resourceId) || [];
        const overlapping = resourceBookings.some(
          (rb) => rb.id !== booking.id && new Date(rb.startTime) < new Date(booking.endTime) && new Date(rb.endTime) > new Date(booking.startTime)
        );
        conflictStatus = overlapping ? 'CONFLICT' : 'ASSIGNED_CLEAR';
      } else if (resources.length === 0) {
        conflictStatus = 'NO_RESOURCE_AVAILABLE';
      }

      return {
        bookingId: booking.id,
        title: booking.title,
        status: booking.status,
        startTime: booking.startTime,
        endTime: booking.endTime,
        staffId: booking.staffId,
        clientId: booking.clientId,
        resourceId: booking.resourceId,
        services: booking.services,
        requiresResourceAssignment: true,
        assignedResourceId,
        conflictStatus,
      };
    });

    const conflictCount = timeline.filter((item) => item.conflictStatus === 'CONFLICT' || item.conflictStatus === 'NO_RESOURCE_AVAILABLE').length;

    return {
      date: start.toISOString().slice(0, 10),
      range: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      filters: {
        branchId: query.branchId,
        type: query.type ?? null,
      },
      resourceCount: resources.length,
      bookingCount: bookings.length,
      conflictCount,
      resources,
      timeline,
    };
  }

  async calendarResourceAvailability(query: any) {
    const baseDate = query.date ? new Date(query.date) : new Date();

    if (Number.isNaN(baseDate.getTime())) {
      throw new BadRequestException('Invalid resource availability date');
    }

    const start = new Date(baseDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const [resources, dayBookings] = await this.prisma.$transaction([
      this.prisma.resource.findMany({
        where: {
          ...(query.branchId ? { branchId: query.branchId } : {}),
          ...(query.type ? { type: query.type } : {}),
          isActive: true,
        },
        select: {
          id: true,
          branchId: true,
          name: true,
          type: true,
          description: true,
          isActive: true,
        },
        orderBy: [
          { branchId: 'asc' },
          { type: 'asc' },
          { name: 'asc' },
        ],
      }),
      this.prisma.booking.findMany({
        where: {
          resourceId: { not: null },
          startTime: { gte: start, lt: end },
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        },
        select: {
          id: true,
          resourceId: true,
          title: true,
          startTime: true,
          endTime: true,
        },
      }),
    ]);

    const DAY_MINUTES = 1440;
    const resourceMap = new Map(resources.map(r => [r.id, r]));

    const byResource = new Map<string, typeof dayBookings>();
    for (const b of dayBookings) {
      if (!b.resourceId) continue;
      if (!byResource.has(b.resourceId)) byResource.set(b.resourceId, []);
      byResource.get(b.resourceId)!.push(b);
    }

    const resourceResults = resources.map((resource) => {
      const bookings = byResource.get(resource.id) || [];
      let occupiedMinutes = 0;
      const timeline: Array<{ bookingId: string; title: string; startTime: Date; endTime: Date }> = [];

      for (const b of bookings) {
        const bStart = new Date(b.startTime);
        const bEnd = new Date(b.endTime);
        const duration = Math.max(0, Math.round((bEnd.getTime() - bStart.getTime()) / 60000));
        occupiedMinutes += duration;
        timeline.push({ bookingId: b.id, title: b.title, startTime: bStart, endTime: bEnd });
      }

      const availabilityStatus = bookings.length === 0 ? 'AVAILABLE' : occupiedMinutes >= DAY_MINUTES ? 'OCCUPIED' : 'PARTIAL';

      return {
        ...resource,
        availabilityStatus,
        occupiedMinutes,
        availableMinutes: DAY_MINUTES - occupiedMinutes,
        utilizationPercent: Math.min(100, Math.round((occupiedMinutes / DAY_MINUTES) * 100)),
        timeline,
      };
    });

    const occupiedCount = resourceResults.filter(r => r.availabilityStatus !== 'AVAILABLE').length;

    return {
      date: start.toISOString().slice(0, 10),
      range: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      filters: {
        branchId: query.branchId ?? null,
        type: query.type ?? null,
      },
      totalResources: resources.length,
      availableResources: resources.length - occupiedCount,
      occupiedResources: occupiedCount,
      resources: resourceResults,
    };
  }


  async calendarResources(query: any) {
    const baseDate = query.date ? new Date(query.date) : new Date();

    if (Number.isNaN(baseDate.getTime())) {
      throw new BadRequestException('Invalid resource calendar date');
    }

    const start = new Date(baseDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const resources = await this.prisma.resource.findMany({
      where: {
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.isActive === 'false' ? { isActive: false } : { isActive: true }),
      },
      select: {
        id: true,
        branchId: true,
        name: true,
        type: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        branch: {
          select: {
            id: true,
            name: true,
            city: true,
            salonId: true,
          },
        },
      },
      orderBy: [
        { branchId: 'asc' },
        { type: 'asc' },
        { name: 'asc' },
      ],
    });

    return {
      date: start.toISOString().slice(0, 10),
      range: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      filters: {
        branchId: query.branchId ?? null,
        type: query.type ?? null,
        isActive: query.isActive ?? 'true',
      },
      totalResources: resources.length,
      resources: resources.map((resource) => ({
        ...resource,
        status: 'AVAILABLE',
        bookedMinutes: 0,
        utilizationPercent: 0,
        bookings: [],
      })),
    };
  }

  async calendarBranchSummary(query: any) {
    const baseDate = query.date ? new Date(query.date) : new Date();

    if (Number.isNaN(baseDate.getTime())) {
      throw new BadRequestException('Invalid branch summary date');
    }

    const start = new Date(baseDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const capacityMinutes = query.capacityMinutes ? Number(query.capacityMinutes) : 720;

    if (!Number.isFinite(capacityMinutes) || capacityMinutes <= 0) {
      throw new BadRequestException('Invalid capacityMinutes');
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        startTime: {
          gte: start,
          lt: end,
        },
        ...(query.branchId ? { branchId: query.branchId } : {}),
      },
      select: {
        id: true,
        status: true,
        startTime: true,
        endTime: true,
        totalAmount: true,
        branchId: true,
        staffId: true,
        branch: {
          select: {
            id: true,
            name: true,
            city: true,
            salonId: true,
          },
        },
      },
      orderBy: [
        { branchId: 'asc' },
        { startTime: 'asc' },
      ],
    });

    const branchMap = new Map<string, any>();

    for (const booking of bookings) {
      const key = booking.branchId ?? 'unassigned';

      if (!branchMap.has(key)) {
        branchMap.set(key, {
          branchId: booking.branchId,
          branch: booking.branch ?? null,
          totalBookings: 0,
          confirmed: 0,
          pending: 0,
          completed: 0,
          cancelled: 0,
          revenue: 0,
          bookedMinutes: 0,
          utilizationPercent: 0,
          bookings: [],
        });
      }

      const row = branchMap.get(key);
      row.totalBookings += 1;

      if (booking.status === 'CONFIRMED') row.confirmed += 1;
      if (booking.status === 'PENDING') row.pending += 1;
      if (booking.status === 'COMPLETED') row.completed += 1;
      if (booking.status === 'CANCELLED') row.cancelled += 1;

      const duration = Math.max(
        0,
        Math.round((new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / 60000),
      );

      row.bookedMinutes += duration;

      if (booking.status !== 'CANCELLED') {
        row.revenue += booking.totalAmount ?? 0;
      }

      row.bookings.push({
        id: booking.id,
        status: booking.status,
        startTime: booking.startTime,
        endTime: booking.endTime,
        totalAmount: booking.totalAmount,
        durationMinutes: duration,
        staffId: booking.staffId,
      });
    }

    const branchSummaries = Array.from(branchMap.values()).map((row) => ({
      ...row,
      utilizationPercent: Math.min(100, Math.round((row.bookedMinutes / capacityMinutes) * 100)),
    }));

    const totals = branchSummaries.reduce(
      (sum, row) => {
        sum.totalBookings += row.totalBookings;
        sum.confirmed += row.confirmed;
        sum.pending += row.pending;
        sum.completed += row.completed;
        sum.cancelled += row.cancelled;
        sum.revenue += row.revenue;
        sum.bookedMinutes += row.bookedMinutes;
        return sum;
      },
      {
        totalBookings: 0,
        confirmed: 0,
        pending: 0,
        completed: 0,
        cancelled: 0,
        revenue: 0,
        bookedMinutes: 0,
      },
    );

    return {
      date: start.toISOString().slice(0, 10),
      range: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      filters: {
        branchId: query.branchId ?? null,
        capacityMinutes,
      },
      totals: {
        ...totals,
        utilizationPercent:
          branchSummaries.length === 0
            ? 0
            : Math.round((totals.bookedMinutes / (branchSummaries.length * capacityMinutes)) * 100),
      },
      branches: branchSummaries,
    };
  }

  async calendarStaffSummary(query: any) {
    const baseDate = query.date ? new Date(query.date) : new Date();

    if (Number.isNaN(baseDate.getTime())) {
      throw new BadRequestException('Invalid staff summary date');
    }

    const start = new Date(baseDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const capacityMinutes = query.capacityMinutes ? Number(query.capacityMinutes) : 480;

    if (!Number.isFinite(capacityMinutes) || capacityMinutes <= 0) {
      throw new BadRequestException('Invalid capacityMinutes');
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        startTime: {
          gte: start,
          lt: end,
        },
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.staffId ? { staffId: query.staffId } : {}),
      },
      select: {
        id: true,
        status: true,
        startTime: true,
        endTime: true,
        totalAmount: true,
        branchId: true,
        staffId: true,
        staff: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [
        { staffId: 'asc' },
        { startTime: 'asc' },
      ],
    });

    const staffMap = new Map<string, any>();

    for (const booking of bookings) {
      const key = booking.staffId ?? 'unassigned';

      if (!staffMap.has(key)) {
        staffMap.set(key, {
          staffId: booking.staffId,
          staff: booking.staff ?? null,
          totalBookings: 0,
          confirmed: 0,
          pending: 0,
          completed: 0,
          cancelled: 0,
          revenue: 0,
          bookedMinutes: 0,
          utilizationPercent: 0,
          bookings: [],
        });
      }

      const row = staffMap.get(key);
      row.totalBookings += 1;

      if (booking.status === 'CONFIRMED') row.confirmed += 1;
      if (booking.status === 'PENDING') row.pending += 1;
      if (booking.status === 'COMPLETED') row.completed += 1;
      if (booking.status === 'CANCELLED') row.cancelled += 1;

      const duration = Math.max(
        0,
        Math.round((new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / 60000),
      );

      row.bookedMinutes += duration;

      if (booking.status !== 'CANCELLED') {
        row.revenue += booking.totalAmount ?? 0;
      }

      row.bookings.push({
        id: booking.id,
        status: booking.status,
        startTime: booking.startTime,
        endTime: booking.endTime,
        totalAmount: booking.totalAmount,
        durationMinutes: duration,
        branchId: booking.branchId,
      });
    }

    const staffSummaries = Array.from(staffMap.values()).map((row) => ({
      ...row,
      utilizationPercent: Math.min(100, Math.round((row.bookedMinutes / capacityMinutes) * 100)),
    }));

    const totals = staffSummaries.reduce(
      (sum, row) => {
        sum.totalBookings += row.totalBookings;
        sum.confirmed += row.confirmed;
        sum.pending += row.pending;
        sum.completed += row.completed;
        sum.cancelled += row.cancelled;
        sum.revenue += row.revenue;
        sum.bookedMinutes += row.bookedMinutes;
        return sum;
      },
      {
        totalBookings: 0,
        confirmed: 0,
        pending: 0,
        completed: 0,
        cancelled: 0,
        revenue: 0,
        bookedMinutes: 0,
      },
    );

    return {
      date: start.toISOString().slice(0, 10),
      range: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      filters: {
        branchId: query.branchId ?? null,
        staffId: query.staffId ?? null,
        capacityMinutes,
      },
      totals: {
        ...totals,
        utilizationPercent:
          staffSummaries.length === 0
            ? 0
            : Math.round((totals.bookedMinutes / (staffSummaries.length * capacityMinutes)) * 100),
      },
      staff: staffSummaries,
    };
  }

  async calendarSummary(query: any) {
    const baseDate = query.date ? new Date(query.date) : new Date();

    if (Number.isNaN(baseDate.getTime())) {
      throw new BadRequestException('Invalid calendar summary date');
    }

    const start = new Date(baseDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const where: any = {
      startTime: {
        gte: start,
        lt: end,
      },
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.staffId ? { staffId: query.staffId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [totalBookings, confirmed, pending, cancelled, completed, revenueAggregate, bookings] =
      await this.prisma.$transaction([
        this.prisma.booking.count({ where }),
        this.prisma.booking.count({ where: { ...where, status: 'CONFIRMED' } }),
        this.prisma.booking.count({ where: { ...where, status: 'PENDING' } }),
        this.prisma.booking.count({ where: { ...where, status: 'CANCELLED' } }),
        this.prisma.booking.count({ where: { ...where, status: 'COMPLETED' } }),
        this.prisma.booking.aggregate({
          where: { ...where, status: { not: 'CANCELLED' } },
          _sum: { totalAmount: true },
          _avg: { totalAmount: true },
        }),
        this.prisma.booking.findMany({
          where,
          select: {
            id: true,
            status: true,
            startTime: true,
            endTime: true,
            totalAmount: true,
            branchId: true,
            staffId: true,
          },
          orderBy: { startTime: 'asc' },
        }),
      ]);

    const totalDurationMinutes = bookings.reduce((sum, booking) => {
      const startMs = new Date(booking.startTime).getTime();
      const endMs = new Date(booking.endTime).getTime();
      const duration = Math.max(0, Math.round((endMs - startMs) / 60000));
      return sum + duration;
    }, 0);

    return {
      date: start.toISOString().slice(0, 10),
      range: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      filters: {
        branchId: query.branchId ?? null,
        staffId: query.staffId ?? null,
        status: query.status ?? null,
      },
      kpis: {
        totalBookings,
        confirmed,
        pending,
        cancelled,
        completed,
        revenue: revenueAggregate._sum.totalAmount ?? 0,
        averageBookingValue: Math.round(revenueAggregate._avg.totalAmount ?? 0),
        totalDurationMinutes,
      },
      bookings,
    };
  }


  async calendarDay(query: any) {
    return this.calendarRange(query, 'day');
  }

  async calendarWeek(query: any) {
    return this.calendarRange(query, 'week');
  }

  async calendarMonth(query: any) {
    return this.calendarRange(query, 'month');
  }

  private async calendarRange(query: any, view: 'day' | 'week' | 'month') {
    const baseDate = query.date ? new Date(query.date) : new Date();

    if (Number.isNaN(baseDate.getTime())) {
      throw new BadRequestException('Invalid calendar date');
    }

    const start = new Date(baseDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);

    if (view === 'day') {
      end.setDate(start.getDate() + 1);
    }

    if (view === 'week') {
      const day = start.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diffToMonday);
      end.setTime(start.getTime());
      end.setDate(start.getDate() + 7);
    }

    if (view === 'month') {
      start.setDate(1);
      end.setTime(start.getTime());
      end.setMonth(start.getMonth() + 1);
    }

    return this.prisma.booking.findMany({
      where: {
        startTime: {
          gte: start,
          lt: end,
        },
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.staffId ? { staffId: query.staffId } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      include: {
        client: true,
        staff: true,
        branch: true,
        resource: true,
        services: true,
      },
      orderBy: [
        { startTime: 'asc' },
        { createdAt: 'asc' },
      ],
    });
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











