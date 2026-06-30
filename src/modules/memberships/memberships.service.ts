import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMemberships(query: any) {
    const where: any = {};
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
    return this.prisma.membershipPlan.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async getMembership(id: string) {
    const item = await this.prisma.membershipPlan.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Membership plan not found');
    return item;
  }

  async createMembership(body: any) {
    if (!body.name) throw new BadRequestException('Name is required');
    return this.prisma.membershipPlan.create({
      data: {
        name: body.name,
        price: Number(body.price) || 0,
        validityDays: Number(body.validityDays) || 30,
        benefits: body.benefits || null,
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
    });
  }

  async updateMembership(id: string, body: any) {
    await this.getMembership(id);
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.price !== undefined) data.price = Number(body.price);
    if (body.validityDays !== undefined) data.validityDays = Number(body.validityDays);
    if (body.benefits !== undefined) data.benefits = body.benefits;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    return this.prisma.membershipPlan.update({ where: { id }, data });
  }

  async removeMembership(id: string) {
    await this.getMembership(id);
    return this.prisma.membershipPlan.delete({ where: { id } });
  }

  async getPackages(query: any) {
    const where: any = {};
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
    return this.prisma.package.findMany({
      where,
      include: { services: { include: { service: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPackage(id: string) {
    const item = await this.prisma.package.findUnique({
      where: { id },
      include: { services: { include: { service: true } } },
    });
    if (!item) throw new NotFoundException('Package not found');
    return item;
  }

  async createPackage(body: any) {
    if (!body.name) throw new BadRequestException('Name is required');
    const { serviceIds, ...rest } = body;
    const data: any = {
      name: rest.name,
      description: rest.description || null,
      price: Number(rest.price) || 0,
      validityDays: Number(rest.validityDays) || 90,
      isActive: rest.isActive !== undefined ? rest.isActive : true,
    };
    if (serviceIds && Array.isArray(serviceIds)) {
      data.services = {
        create: serviceIds.map((sid: string) => ({
          serviceId: sid,
          sessions: 1,
        })),
      };
    }
    return this.prisma.package.create({
      data,
      include: { services: { include: { service: true } } },
    });
  }

  async updatePackage(id: string, body: any) {
    await this.getPackage(id);
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.price !== undefined) data.price = Number(body.price);
    if (body.validityDays !== undefined) data.validityDays = Number(body.validityDays);
    if (body.isActive !== undefined) data.isActive = body.isActive;
    return this.prisma.package.update({
      where: { id },
      data,
      include: { services: { include: { service: true } } },
    });
  }

  async removePackage(id: string) {
    await this.getPackage(id);
    return this.prisma.package.delete({ where: { id } });
  }

  async getClientMemberships(clientId: string) {
    return this.prisma.clientMembership.findMany({
      where: { clientId },
      include: { membershipPlan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getClientPackages(clientId: string) {
    return this.prisma.clientPackage.findMany({
      where: { clientId },
      include: { package: { include: { services: { include: { service: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
