import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any) {
    const where: any = {};
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.isActive === 'true') where.isActive = true;
    if (query.isActive === 'false') where.isActive = false;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.service.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async create(body: any) {
    if (!body.name) throw new BadRequestException('Service name is required');
    if (!body.durationMin || body.durationMin <= 0) {
      throw new BadRequestException('Valid durationMin is required');
    }
    if (body.price === undefined || body.price < 0) {
      throw new BadRequestException('Valid price is required');
    }
    return this.prisma.service.create({
      data: {
        name: body.name,
        description: body.description || null,
        categoryId: body.categoryId || null,
        durationMin: Number(body.durationMin),
        price: Number(body.price),
        isActive: body.isActive ?? true,
      },
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, body: any) {
    await this.findOne(id);
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description || null;
    if (body.categoryId !== undefined) data.categoryId = body.categoryId || null;
    if (body.durationMin !== undefined) data.durationMin = Number(body.durationMin);
    if (body.price !== undefined) data.price = Number(body.price);
    if (body.isActive !== undefined) data.isActive = body.isActive;
    return this.prisma.service.update({
      where: { id },
      data,
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.service.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getCategories() {
    return this.prisma.serviceCategory.findMany({
      include: { _count: { select: { services: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(body: any) {
    if (!body.name) throw new BadRequestException('Category name is required');
    return this.prisma.serviceCategory.create({
      data: { name: body.name, description: body.description || null },
      include: { _count: { select: { services: true } } },
    });
  }

  async updateCategory(id: string, body: any) {
    const existing = await this.prisma.serviceCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Category not found');
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description || null;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    return this.prisma.serviceCategory.update({
      where: { id },
      data,
      include: { _count: { select: { services: true } } },
    });
  }

  async removeCategory(id: string) {
    const existing = await this.prisma.serviceCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Category not found');
    await this.prisma.service.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });
    return this.prisma.serviceCategory.delete({ where: { id } });
  }
}
