import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma, WaitlistStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';
import { UpdateWaitlistEntryDto } from './dto/update-waitlist-entry.dto';

@Injectable()
export class WaitlistService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWaitlistEntryDto) {
    await this.ensureBranchExists(dto.branchId);

    if (dto.clientId) await this.ensureClientExists(dto.clientId);
    if (dto.staffId) await this.ensureStaffExists(dto.staffId);

    this.validatePreferredWindow(dto.preferredStart, dto.preferredEnd);

    return this.prisma.waitlistEntry.create({
      data: {
        branchId: dto.branchId,
        clientId: dto.clientId,
        staffId: dto.staffId,
        requestedDate: new Date(dto.requestedDate),
        preferredStart: dto.preferredStart ? new Date(dto.preferredStart) : null,
        preferredEnd: dto.preferredEnd ? new Date(dto.preferredEnd) : null,
        serviceName: dto.serviceName,
        notes: dto.notes,
        priority: dto.priority ?? 0,
      },
      include: this.defaultInclude(),
    });
  }

  async findAll(query: {
    branchId?: string;
    clientId?: string;
    staffId?: string;
    status?: WaitlistStatus;
    from?: string;
    to?: string;
  }) {
    const where: Prisma.WaitlistEntryWhereInput = {};

    if (query.branchId) where.branchId = query.branchId;
    if (query.clientId) where.clientId = query.clientId;
    if (query.staffId) where.staffId = query.staffId;
    if (query.status) where.status = query.status;

    if (query.from || query.to) {
      where.requestedDate = {};
      if (query.from) where.requestedDate.gte = new Date(query.from);
      if (query.to) where.requestedDate.lte = new Date(query.to);
    }

    return this.prisma.waitlistEntry.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { requestedDate: 'asc' },
        { createdAt: 'asc' },
      ],
      include: this.defaultInclude(),
    });
  }

  async findOne(id: string) {
    const entry = await this.prisma.waitlistEntry.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    if (!entry) throw new NotFoundException('Waitlist entry not found');

    return entry;
  }

  async update(id: string, dto: UpdateWaitlistEntryDto) {
    await this.findOne(id);

    if (dto.clientId) await this.ensureClientExists(dto.clientId);
    if (dto.staffId) await this.ensureStaffExists(dto.staffId);

    this.validatePreferredWindow(dto.preferredStart, dto.preferredEnd);

    return this.prisma.waitlistEntry.update({
      where: { id },
      data: {
        clientId: dto.clientId,
        staffId: dto.staffId,
        requestedDate: dto.requestedDate ? new Date(dto.requestedDate) : undefined,
        preferredStart: dto.preferredStart ? new Date(dto.preferredStart) : undefined,
        preferredEnd: dto.preferredEnd ? new Date(dto.preferredEnd) : undefined,
        serviceName: dto.serviceName,
        notes: dto.notes,
        status: dto.status,
        priority: dto.priority,
      },
      include: this.defaultInclude(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.waitlistEntry.delete({
      where: { id },
      include: this.defaultInclude(),
    });
  }

  async suggestions(query: {
    branchId?: string;
    staffId?: string;
    startTime?: string;
    endTime?: string;
    serviceName?: string;
  }) {
    if (!query.branchId) {
      throw new BadRequestException('branchId is required');
    }

    if (!query.startTime || !query.endTime) {
      throw new BadRequestException('startTime and endTime are required');
    }

    const startTime = new Date(query.startTime);
    const endTime = new Date(query.endTime);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw new BadRequestException('Invalid startTime or endTime');
    }

    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }

    const dayStart = new Date(startTime);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);

    const entries = await this.prisma.waitlistEntry.findMany({
      where: {
        branchId: query.branchId,
        status: 'WAITING',
        requestedDate: {
          gte: dayStart,
          lt: dayEnd,
        },
        OR: [
          { staffId: null },
          ...(query.staffId ? [{ staffId: query.staffId }] : []),
        ],
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      include: this.defaultInclude(),
    });

    return entries
      .filter((entry) =>
        this.matchesPreferredWindow(
          startTime,
          endTime,
          entry.preferredStart,
          entry.preferredEnd,
        ),
      )
      .filter((entry) =>
        this.matchesServiceName(entry.serviceName, query.serviceName),
      )
      .map((entry, index) => ({
        rank: index + 1,
        matchScore: this.calculateMatchScore(entry, {
          staffId: query.staffId,
          serviceName: query.serviceName,
          startTime,
          endTime,
        }),
        entry,
      }))
      .sort((a, b) => b.matchScore - a.matchScore || a.rank - b.rank);
  }

  async autoFill(body: {
    branchId?: string;
    staffId?: string;
    startTime?: string;
    endTime?: string;
    serviceName?: string;
  }) {
    const suggestions = await this.suggestions(body);
    const bestMatch = suggestions[0];

    if (!bestMatch) {
      return {
        matched: false,
        message: 'No matching waitlist entry found',
        suggestion: null,
      };
    }

    const updated = await this.prisma.waitlistEntry.update({
      where: { id: bestMatch.entry.id },
      data: {
        status: 'CONTACTED',
        notes: this.appendNote(
          bestMatch.entry.notes,
          `Auto-fill match found for ${body.startTime}`,
        ),
      },
      include: this.defaultInclude(),
    });

    return {
      matched: true,
      message: 'Best waitlist entry contacted',
      suggestion: {
        rank: 1,
        matchScore: bestMatch.matchScore,
        entry: updated,
      },
    };
  }

  async contact(id: string) {
    await this.findOne(id);

    return this.prisma.waitlistEntry.update({
      where: { id },
      data: { status: 'CONTACTED' },
      include: this.defaultInclude(),
    });
  }

  async markBooked(id: string) {
    await this.findOne(id);

    return this.prisma.waitlistEntry.update({
      where: { id },
      data: { status: 'BOOKED' },
      include: this.defaultInclude(),
    });
  }

  async expire(id: string) {
    await this.findOne(id);

    return this.prisma.waitlistEntry.update({
      where: { id },
      data: { status: 'EXPIRED' },
      include: this.defaultInclude(),
    });
  }

  async convertToBooking(id: string, body: any) {
    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.waitlistEntry.findUnique({
        where: { id },
      });

      if (!entry) throw new NotFoundException('Waitlist entry not found');

      if (entry.status === 'BOOKED') {
        throw new BadRequestException('Waitlist entry is already booked');
      }

      if (entry.status === 'CANCELLED' || entry.status === 'EXPIRED') {
        throw new BadRequestException('Inactive waitlist entry cannot be booked');
      }

      if (!entry.clientId) {
        throw new BadRequestException('Waitlist entry has no client assigned');
      }

      const staffId = body.staffId || entry.staffId;

      if (!staffId) {
        throw new BadRequestException('staffId is required to create booking');
      }

      const startTime = new Date(body.startTime || entry.preferredStart);

      if (Number.isNaN(startTime.getTime())) {
        throw new BadRequestException('Valid startTime is required');
      }

      const durationMin = Number(body.durationMin || 30);
      const price = Number(body.price || 0);

      if (!Number.isFinite(durationMin) || durationMin <= 0) {
        throw new BadRequestException('durationMin must be positive');
      }

      if (!Number.isFinite(price) || price < 0) {
        throw new BadRequestException('price must be zero or positive');
      }

      const endTime = new Date(startTime.getTime() + durationMin * 60_000);

      const staffConflict = await tx.booking.findFirst({
        where: {
          branchId: entry.branchId,
          staffId,
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });

      if (staffConflict) {
        throw new BadRequestException('Staff already has a booking in this slot');
      }

      const clientConflict = await tx.booking.findFirst({
        where: {
          clientId: entry.clientId,
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });

      if (clientConflict) {
        throw new BadRequestException('Client already has a booking in this slot');
      }

      const serviceName = String(body.serviceName || entry.serviceName || 'Waitlist Booking').trim();
      const bookingStatus: BookingStatus = body.status || 'CONFIRMED';

      if (!Object.values(BookingStatus).includes(bookingStatus)) {
        throw new BadRequestException('Invalid booking status');
      }

      const booking = await tx.booking.create({
        data: {
          branchId: entry.branchId,
          clientId: entry.clientId,
          staffId,
          title: body.title || serviceName,
          notes: this.appendNote(body.notes || entry.notes, `Converted from waitlist ${entry.id}`),
          status: bookingStatus,
          startTime,
          endTime,
          totalAmount: price,
          services: {
            create: [
              {
                name: serviceName,
                durationMin,
                price,
              },
            ],
          },
        },
        include: { client: true, branch: true, staff: true, services: true },
      });

      const waitlist = await tx.waitlistEntry.update({
        where: { id },
        data: {
          status: 'BOOKED',
          notes: this.appendNote(entry.notes, `Booked as ${booking.id}`),
        },
        include: {
          branch: true,
          client: true,
          staff: true,
        },
      });

      return {
        booking,
        waitlist,
      };
    });
  }

  private validatePreferredWindow(start?: string, end?: string) {
    if (!start || !end) return;

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (startDate >= endDate) {
      throw new BadRequestException('preferredStart must be before preferredEnd');
    }
  }

  private matchesPreferredWindow(
    slotStart: Date,
    slotEnd: Date,
    preferredStart?: Date | null,
    preferredEnd?: Date | null,
  ) {
    if (!preferredStart && !preferredEnd) return true;
    if (preferredStart && slotStart < preferredStart) return false;
    if (preferredEnd && slotEnd > preferredEnd) return false;
    return true;
  }

  private matchesServiceName(waitlistService?: string | null, targetService?: string) {
    if (!waitlistService || !targetService) return true;

    return waitlistService
      .toLowerCase()
      .includes(targetService.toLowerCase());
  }

  private calculateMatchScore(
    entry: any,
    context: {
      staffId?: string;
      serviceName?: string;
      startTime: Date;
      endTime: Date;
    },
  ) {
    let score = 0;

    score += Number(entry.priority || 0) * 20;

    if (entry.staffId && context.staffId && entry.staffId === context.staffId) {
      score += 30;
    }

    if (entry.serviceName && context.serviceName) {
      score += this.matchesServiceName(entry.serviceName, context.serviceName) ? 20 : 0;
    }

    if (this.matchesPreferredWindow(context.startTime, context.endTime, entry.preferredStart, entry.preferredEnd)) {
      score += 25;
    }

    score += Math.max(0, 10 - Math.floor((Date.now() - new Date(entry.createdAt).getTime()) / 86_400_000));

    return score;
  }

  private appendNote(current: string | null | undefined, note: string) {
    const cleanCurrent = String(current || '').trim();
    const cleanNote = String(note || '').trim();

    if (!cleanCurrent) return cleanNote;
    if (!cleanNote) return cleanCurrent;

    return `${cleanCurrent} | ${cleanNote}`;
  }

  private async ensureBranchExists(branchId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true },
    });

    if (!branch) throw new NotFoundException('Branch not found');
  }

  private async ensureClientExists(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

    if (!client) throw new NotFoundException('Client not found');
  }

  private async ensureStaffExists(staffId: string) {
    const staff = await this.prisma.user.findUnique({
      where: { id: staffId },
      select: { id: true },
    });

    if (!staff) throw new NotFoundException('Staff not found');
  }

  private defaultInclude() {
    return {
      branch: true,
      client: true,
      staff: true,
    };
  }
}
