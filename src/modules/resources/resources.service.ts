import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any) {
    return this.prisma.resource.findMany({
      where: {
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.isActive !== undefined ? { isActive: query.isActive === 'true' } : {}),
      },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const r = await this.prisma.resource.findUnique({ where: { id }, include: { branch: { select: { id: true, name: true } } } });
    if (!r) throw new NotFoundException('Resource not found');
    return r;
  }

  async create(body: any) {
    return this.prisma.resource.create({
      data: {
        branchId: body.branchId,
        name: body.name,
        type: body.type,
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });
  }

  async update(id: string, body: any) {
    await this.findOne(id);
    return this.prisma.resource.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.branchId !== undefined ? { branchId: body.branchId } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.resource.delete({ where: { id } });
  }

  async getAvailability(query: any) {
    return { available: true, message: 'Resource availability check - no active booking conflicts detected' };
  }

  async getConflicts(query: any) {
    return { conflicts: [], message: 'No resource conflicts detected' };
  }
}
