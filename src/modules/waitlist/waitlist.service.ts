import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WaitlistStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';
import { UpdateWaitlistEntryDto } from './dto/update-waitlist-entry.dto';

@Injectable()
export class WaitlistService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWaitlistEntryDto) {
    await this.ensureBranchExists(dto.branchId);

    if (dto.clientId) {
      await this.ensureClientExists(dto.clientId);
    }

    if (dto.staffId) {
      await this.ensureStaffExists(dto.staffId);
    }

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

    if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (query.clientId) {
      where.clientId = query.clientId;
    }

    if (query.staffId) {
      where.staffId = query.staffId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.from || query.to) {
      where.requestedDate = {};
      if (query.from) {
        where.requestedDate.gte = new Date(query.from);
      }
      if (query.to) {
        where.requestedDate.lte = new Date(query.to);
      }
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

    if (!entry) {
      throw new NotFoundException('Waitlist entry not found');
    }

    return entry;
  }

  async update(id: string, dto: UpdateWaitlistEntryDto) {
    await this.findOne(id);

    if (dto.clientId) {
      await this.ensureClientExists(dto.clientId);
    }

    if (dto.staffId) {
      await this.ensureStaffExists(dto.staffId);
    }

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

  private validatePreferredWindow(start?: string, end?: string) {
    if (!start || !end) {
      return;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (startDate >= endDate) {
      throw new BadRequestException('preferredStart must be before preferredEnd');
    }
  }

  private async ensureBranchExists(branchId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
  }

  private async ensureClientExists(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }
  }

  private async ensureStaffExists(staffId: string) {
    const staff = await this.prisma.user.findUnique({
      where: { id: staffId },
      select: { id: true },
    });

    if (!staff) {
      throw new NotFoundException('Staff not found');
    }
  }

  private defaultInclude() {
    return {
      branch: true,
      client: true,
      staff: true,
    };
  }
}


