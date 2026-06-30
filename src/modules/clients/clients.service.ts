import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';

const SORT_WHITELIST = ['fullName', 'createdAt', 'lastVisitAt', 'totalSpend', 'totalVisits'] as const;

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any) {
    const search = (query?.search || '').trim();
    const page = Math.max(1, parseInt(query?.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query?.limit, 10) || 25));
    const sortBy = (SORT_WHITELIST as readonly string[]).includes(query?.sortBy) ? query.sortBy : 'createdAt';
    const sortOrder: Prisma.SortOrder = query?.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: Prisma.ClientWhereInput = search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client;
  }

  async create(body: any) {
    if (!body.fullName) {
      throw new BadRequestException('Full name is required');
    }

    return this.prisma.client.create({
      data: {
        fullName: body.fullName,
        phone: body.phone || null,
        email: body.email || null,
        gender: body.gender || null,
        city: body.city || null,
        address: body.address || null,
        notes: body.notes || null,
      },
    });
  }

  async update(id: string, body: any) {
    await this.findOne(id);

    return this.prisma.client.update({
      where: { id },
      data: {
        fullName: body.fullName,
        phone: body.phone || null,
        email: body.email || null,
        gender: body.gender || null,
        city: body.city || null,
        address: body.address || null,
        notes: body.notes || null,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.client.delete({ where: { id } });
  }
}
