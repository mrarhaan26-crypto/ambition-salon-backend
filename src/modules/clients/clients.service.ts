import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any) {
    const search = query?.search || '';

    return this.prisma.client.findMany({
      where: search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { city: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {},
      orderBy: { createdAt: 'desc' },
    });
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
