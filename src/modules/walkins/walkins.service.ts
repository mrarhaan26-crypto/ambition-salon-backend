import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma, WalkInStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { CreateWalkInDto } from './dto/create-walkin.dto';
import { UpdateWalkInDto } from './dto/update-walkin.dto';

@Injectable()
export class WalkInsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWalkInDto) {
    await this.ensureBranchExists(dto.branchId);
    if (dto.clientId) await this.ensureClientExists(dto.clientId);
    if (dto.staffId) await this.ensureStaffExists(dto.staffId);

    const arrivalTime = dto.arrivalTime ? new Date(dto.arrivalTime) : new Date();
    if (Number.isNaN(arrivalTime.getTime())) throw new BadRequestException('Invalid arrivalTime');

    const queueNumber = await this.getNextQueueNumber(dto.branchId, arrivalTime);

    return this.prisma.walkIn.create({
      data: {
        branchId: dto.branchId,
        clientId: dto.clientId,
        staffId: dto.staffId,
        customerName: dto.customerName,
        phone: dto.phone,
        serviceName: dto.serviceName,
        notes: dto.notes,
        arrivalTime,
        queueNumber,
        estimatedWaitMinutes: dto.estimatedWaitMinutes ?? 0,
      },
      include: this.defaultInclude(),
    });
  }

  async findAll(query: any) {
    const where: Prisma.WalkInWhereInput = {};
    if (query.branchId) where.branchId = query.branchId;
    if (query.status) where.status = query.status;
    if (query.staffId) where.staffId = query.staffId;
    if (query.clientId) where.clientId = query.clientId;

    if (query.date) {
      const { start, end } = this.getDayRange(query.date);
      where.arrivalTime = { gte: start, lt: end };
    }

    return this.prisma.walkIn.findMany({
      where,
      orderBy: [{ arrivalTime: 'asc' }, { queueNumber: 'asc' }],
      include: this.defaultInclude(),
    });
  }

  async todayQueue(branchId?: string) {
    const { start, end } = this.getDayRange(new Date().toISOString());

    return this.prisma.walkIn.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        arrivalTime: { gte: start, lt: end },
        status: { in: ['WAITING', 'CALLED', 'IN_SERVICE'] },
      },
      orderBy: [{ queueNumber: 'asc' }, { arrivalTime: 'asc' }],
      include: this.defaultInclude(),
    });
  }

  async dashboard(branchId?: string) {
    const { start, end } = this.getDayRange(new Date().toISOString());
    const where: Prisma.WalkInWhereInput = {
      ...(branchId ? { branchId } : {}),
      arrivalTime: { gte: start, lt: end },
    };

    const [total, waiting, called, inService, completed, cancelled, noShow, converted, rows] =
      await this.prisma.$transaction([
        this.prisma.walkIn.count({ where }),
        this.prisma.walkIn.count({ where: { ...where, status: 'WAITING' } }),
        this.prisma.walkIn.count({ where: { ...where, status: 'CALLED' } }),
        this.prisma.walkIn.count({ where: { ...where, status: 'IN_SERVICE' } }),
        this.prisma.walkIn.count({ where: { ...where, status: 'COMPLETED' } }),
        this.prisma.walkIn.count({ where: { ...where, status: 'CANCELLED' } }),
        this.prisma.walkIn.count({ where: { ...where, status: 'NO_SHOW' } }),
        this.prisma.walkIn.count({ where: { ...where, status: 'CONVERTED' } }),
        this.prisma.walkIn.findMany({
          where,
          orderBy: [{ queueNumber: 'asc' }],
          include: this.defaultInclude(),
        }),
      ]);

    return {
      date: start.toISOString().slice(0, 10),
      filters: { branchId: branchId ?? null },
      kpis: { total, waiting, called, inService, completed, cancelled, noShow, converted },
      queue: rows,
    };
  }

  async findOne(id: string) {
    const walkIn = await this.prisma.walkIn.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });
    if (!walkIn) throw new NotFoundException('Walk-in not found');
    return walkIn;
  }

  async update(id: string, dto: UpdateWalkInDto) {
    await this.findOne(id);
    if (dto.clientId) await this.ensureClientExists(dto.clientId);
    if (dto.staffId) await this.ensureStaffExists(dto.staffId);
    if (dto.bookingId) await this.ensureBookingExists(dto.bookingId);

    return this.prisma.walkIn.update({
      where: { id },
      data: {
        clientId: dto.clientId,
        staffId: dto.staffId,
        bookingId: dto.bookingId,
        customerName: dto.customerName,
        phone: dto.phone,
        serviceName: dto.serviceName,
        notes: dto.notes,
        status: dto.status,
        arrivalTime: dto.arrivalTime ? new Date(dto.arrivalTime) : undefined,
        estimatedWaitMinutes: dto.estimatedWaitMinutes,
      },
      include: this.defaultInclude(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.walkIn.delete({ where: { id }, include: this.defaultInclude() });
  }

  async callNext(branchId: string) {
    if (!branchId) throw new BadRequestException('branchId is required');
    const { start, end } = this.getDayRange(new Date().toISOString());

    const next = await this.prisma.walkIn.findFirst({
      where: { branchId, status: 'WAITING', arrivalTime: { gte: start, lt: end } },
      orderBy: [{ queueNumber: 'asc' }, { arrivalTime: 'asc' }],
    });

    if (!next) return { found: false, message: 'No waiting walk-in found', walkIn: null };

    const walkIn = await this.prisma.walkIn.update({
      where: { id: next.id },
      data: { status: 'CALLED', calledAt: new Date() },
      include: this.defaultInclude(),
    });

    return { found: true, message: 'Next walk-in called', walkIn };
  }

  async call(id: string) {
    const walkIn = await this.findOne(id);
    if (walkIn.status !== 'WAITING') throw new BadRequestException('Only waiting walk-ins can be called');

    return this.prisma.walkIn.update({
      where: { id },
      data: { status: 'CALLED', calledAt: new Date() },
      include: this.defaultInclude(),
    });
  }

  async startService(id: string, staffId?: string) {
    const walkIn = await this.findOne(id);
    if (!['WAITING', 'CALLED'].includes(walkIn.status)) {
      throw new BadRequestException('Only waiting or called walk-ins can start service');
    }
    if (staffId) await this.ensureStaffExists(staffId);

    return this.prisma.walkIn.update({
      where: { id },
      data: { status: 'IN_SERVICE', staffId: staffId ?? walkIn.staffId, startedAt: new Date() },
      include: this.defaultInclude(),
    });
  }

  async complete(id: string) {
    const walkIn = await this.findOne(id);
    if (walkIn.status !== 'IN_SERVICE') {
      throw new BadRequestException('Only in-service walk-ins can be completed');
    }

    return this.prisma.walkIn.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date() },
      include: this.defaultInclude(),
    });
  }

  async cancel(id: string, reason?: string) {
    const walkIn = await this.findOne(id);
    if (['COMPLETED', 'CANCELLED', 'CONVERTED'].includes(walkIn.status)) {
      throw new BadRequestException('Final walk-in cannot be cancelled');
    }

    return this.prisma.walkIn.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        notes: this.appendNote(walkIn.notes, reason ? `Cancellation reason: ${reason}` : 'Cancelled'),
      },
      include: this.defaultInclude(),
    });
  }

  async noShow(id: string) {
    const walkIn = await this.findOne(id);
    if (!['WAITING', 'CALLED'].includes(walkIn.status)) {
      throw new BadRequestException('Only waiting or called walk-ins can be marked no-show');
    }

    return this.prisma.walkIn.update({
      where: { id },
      data: { status: 'NO_SHOW', cancelledAt: new Date() },
      include: this.defaultInclude(),
    });
  }

  async convertToBooking(id: string, body: any) {
    return this.prisma.$transaction(async (tx) => {
      const walkIn = await tx.walkIn.findUnique({ where: { id } });
      if (!walkIn) throw new NotFoundException('Walk-in not found');
      if (walkIn.status === 'CONVERTED') throw new BadRequestException('Walk-in is already converted');
      if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(walkIn.status)) {
        throw new BadRequestException('Final walk-in cannot be converted');
      }

      const clientId = body.clientId || walkIn.clientId;
      const staffId = body.staffId || walkIn.staffId;
      if (!clientId) throw new BadRequestException('clientId is required');
      if (!staffId) throw new BadRequestException('staffId is required');

      const startTime = new Date(body.startTime || new Date());
      if (Number.isNaN(startTime.getTime())) throw new BadRequestException('Invalid startTime');

      const durationMin = Number(body.durationMin || 30);
      const price = Number(body.price || 0);
      if (!Number.isFinite(durationMin) || durationMin <= 0) throw new BadRequestException('durationMin must be positive');
      if (!Number.isFinite(price) || price < 0) throw new BadRequestException('price must be zero or positive');

      const endTime = new Date(startTime.getTime() + durationMin * 60_000);
      const bookingStatus: BookingStatus = body.status || 'CONFIRMED';
      if (!Object.values(BookingStatus).includes(bookingStatus)) throw new BadRequestException('Invalid booking status');

      const staffConflict = await tx.booking.findFirst({
        where: {
          branchId: walkIn.branchId,
          staffId,
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });
      if (staffConflict) throw new BadRequestException('Staff already has a booking in this slot');

      const clientConflict = await tx.booking.findFirst({
        where: {
          clientId,
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });
      if (clientConflict) throw new BadRequestException('Client already has a booking in this slot');

      const serviceName = String(body.serviceName || walkIn.serviceName || 'Walk-in Service').trim();

      const booking = await tx.booking.create({
        data: {
          branchId: walkIn.branchId,
          clientId,
          staffId,
          title: body.title || serviceName,
          notes: this.appendNote(body.notes || walkIn.notes, `Converted from walk-in ${walkIn.id}`),
          status: bookingStatus,
          startTime,
          endTime,
          totalAmount: price,
          services: { create: [{ name: serviceName, durationMin, price }] },
        },
        include: { client: true, branch: true, staff: true, services: true },
      });

      const updatedWalkIn = await tx.walkIn.update({
        where: { id },
        data: {
          status: 'CONVERTED',
          bookingId: booking.id,
          completedAt: new Date(),
          notes: this.appendNote(walkIn.notes, `Converted to booking ${booking.id}`),
        },
        include: this.defaultInclude(),
      });

      return { booking, walkIn: updatedWalkIn };
    });
  }

  private async getNextQueueNumber(branchId: string, arrivalTime: Date) {
    const { start, end } = this.getDayRange(arrivalTime.toISOString());
    const latest = await this.prisma.walkIn.findFirst({
      where: { branchId, arrivalTime: { gte: start, lt: end } },
      orderBy: { queueNumber: 'desc' },
      select: { queueNumber: true },
    });
    return (latest?.queueNumber || 0) + 1;
  }

  private getDayRange(dateValue: string) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid date');
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return { start, end };
  }

  private appendNote(current: string | null | undefined, note: string) {
    const cleanCurrent = String(current || '').trim();
    const cleanNote = String(note || '').trim();
    if (!cleanCurrent) return cleanNote;
    if (!cleanNote) return cleanCurrent;
    return `${cleanCurrent} | ${cleanNote}`;
  }

  private async ensureBranchExists(branchId: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId }, select: { id: true } });
    if (!branch) throw new NotFoundException('Branch not found');
  }

  private async ensureClientExists(clientId: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!client) throw new NotFoundException('Client not found');
  }

  private async ensureStaffExists(staffId: string) {
    const staff = await this.prisma.user.findUnique({ where: { id: staffId }, select: { id: true } });
    if (!staff) throw new NotFoundException('Staff not found');
  }

  private async ensureBookingExists(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId }, select: { id: true } });
    if (!booking) throw new NotFoundException('Booking not found');
  }

  private defaultInclude() {
    return { branch: true, client: true, staff: true, booking: true };
  }
}
