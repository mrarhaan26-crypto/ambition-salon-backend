import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class SalonsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.salon.findMany({
      include: { owner: true, branches: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(body: any) {
    if (!body.name) throw new BadRequestException('Salon name is required');
    if (!body.ownerId) throw new BadRequestException('Owner is required');

    const owner = await this.prisma.user.findUnique({ where: { id: body.ownerId } });
    if (!owner) throw new BadRequestException('Owner not found');

    return this.prisma.salon.create({
      data: {
        name: body.name,
        ownerId: body.ownerId,
        branches: {
          create: {
            name: body.branchName || 'Main Branch',
            city: body.city || null,
          },
        },
      },
      include: { owner: true, branches: true },
    });
  }

  async findOne(id: string) {
    const salon = await this.prisma.salon.findUnique({
      where: { id },
      include: { owner: true, branches: true },
    });

    if (!salon) throw new NotFoundException('Salon not found');
    return salon;
  }
}
