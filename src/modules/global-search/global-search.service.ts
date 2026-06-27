import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { GlobalSearchQueryDto } from './dto/global-search-query.dto';

@Injectable()
export class GlobalSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: GlobalSearchQueryDto) {
    const q = query.q?.trim();
    if (!q) throw new BadRequestException('q query parameter is required');

    const limit = query.limit ?? 10;

    const [clients, bookings, staff, salons, branches, waitlist, walkIns] =
      await Promise.all([
        this.searchClients(q, query.branchId, limit),
        this.searchBookings(q, query.branchId, limit),
        this.searchStaff(q, query.branchId, limit),
        this.searchSalons(q, limit),
        this.searchBranches(q, query.branchId, limit),
        this.searchWaitlist(q, query.branchId, limit),
        this.searchWalkIns(q, query.branchId, limit),
      ]);

    return {
      query: q,
      filters: { branchId: query.branchId ?? null },
      results: {
        clients,
        bookings,
        staff,
        salons,
        branches,
        waitlist,
        walkIns,
      },
      totalCount:
        clients.length +
        bookings.length +
        staff.length +
        salons.length +
        branches.length +
        waitlist.length +
        walkIns.length,
    };
  }

  async suggestions(query: GlobalSearchQueryDto) {
    const q = query.q?.trim();
    if (!q) throw new BadRequestException('q query parameter is required');

    const limit = query.limit ?? 5;

    const [clients, bookings, staff] = await Promise.all([
      this.prisma.client.findMany({
        where: {
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, fullName: true, phone: true },
        take: limit,
      }),
      this.prisma.booking.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { client: { fullName: { contains: q, mode: 'insensitive' } } },
          ],
        },
        select: { id: true, title: true, startTime: true, clientId: true },
        take: limit,
      }),
      this.prisma.user.findMany({
        where: {
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, fullName: true, email: true, role: true },
        take: limit,
      }),
    ]);

    return {
      query: q,
      suggestions: {
        clients: clients.map((c) => ({
          type: 'client',
          id: c.id,
          label: c.fullName,
          sublabel: c.phone ?? undefined,
        })),
        bookings: bookings.map((b) => ({
          type: 'booking',
          id: b.id,
          label: b.title,
          sublabel: b.startTime.toISOString(),
        })),
        staff: staff.map((s) => ({
          type: 'staff',
          id: s.id,
          label: s.fullName,
          sublabel: s.role,
        })),
      },
    };
  }

  private async searchClients(q: string, branchId?: string, limit?: number) {
    const where: any = {
      OR: [
        { fullName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { email: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
      ],
    };

    return this.prisma.client.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        city: true,
        totalVisits: true,
        totalSpend: true,
      },
    });
  }

  private async searchBookings(q: string, branchId?: string, limit?: number) {
    const where: any = {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
        { client: { fullName: { contains: q, mode: 'insensitive' } } },
      ],
    };
    if (branchId) where.branchId = branchId;

    return this.prisma.booking.findMany({
      where,
      take: limit,
      orderBy: { startTime: 'desc' },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        status: true,
        totalAmount: true,
        branchId: true,
        client: { select: { id: true, fullName: true } },
        staff: { select: { id: true, fullName: true } },
      },
    });
  }

  private async searchStaff(q: string, branchId?: string, limit?: number) {
    const where: any = {
      OR: [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    };

    return this.prisma.user.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: { id: true, fullName: true, email: true, role: true },
    });
  }

  private async searchSalons(q: string, limit?: number) {
    return this.prisma.salon.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, ownerId: true },
    });
  }

  private async searchBranches(q: string, branchId?: string, limit?: number) {
    const where: any = {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
      ],
    };
    if (branchId) where.id = branchId;

    return this.prisma.branch.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, city: true, salonId: true },
    });
  }

  private async searchWaitlist(q: string, branchId?: string, limit?: number) {
    const where: any = {
      OR: [
        { serviceName: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
        { client: { fullName: { contains: q, mode: 'insensitive' } } },
      ],
    };
    if (branchId) where.branchId = branchId;

    return this.prisma.waitlistEntry.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        serviceName: true,
        status: true,
        requestedDate: true,
        branchId: true,
        client: { select: { id: true, fullName: true } },
        staff: { select: { id: true, fullName: true } },
      },
    });
  }

  private async searchWalkIns(q: string, branchId?: string, limit?: number) {
    const where: any = {
      OR: [
        { customerName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { serviceName: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
        { client: { fullName: { contains: q, mode: 'insensitive' } } },
      ],
    };
    if (branchId) where.branchId = branchId;

    return this.prisma.walkIn.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        customerName: true,
        phone: true,
        serviceName: true,
        status: true,
        queueNumber: true,
        branchId: true,
        client: { select: { id: true, fullName: true } },
      },
    });
  }
}
