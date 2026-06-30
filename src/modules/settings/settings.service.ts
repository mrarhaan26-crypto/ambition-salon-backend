import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(query: any) {
    const business = await this.getBusiness();
    const branches = await this.getBranches();
    return { business, branches };
  }

  async update(body: any) {
    if (body.business) await this.updateBusiness(body.business);
    return this.getAll({});
  }

  async getBusiness() {
    let settings = await this.prisma.businessSetting.findFirst();
    if (!settings) {
      settings = await this.prisma.businessSetting.create({
        data: {
          businessName: 'Ambition Unisex Salon',
          email: 'info@ambitionsalon.com',
          phone: '+1-234-567-8900',
          currency: 'USD',
          timezone: 'UTC',
        },
      });
    }
    return settings;
  }

  async updateBusiness(body: any) {
    let settings = await this.prisma.businessSetting.findFirst();
    if (!settings) {
      settings = await this.prisma.businessSetting.create({
        data: {
          businessName: body.businessName || 'Ambition Unisex Salon',
          email: body.email || null,
          phone: body.phone || null,
          address: body.address || null,
          currency: body.currency || 'USD',
          timezone: body.timezone || 'UTC',
          notificationPreferences: body.notificationPreferences || null,
        },
      });
    }
    const data: any = {};
    if (body.businessName !== undefined) data.businessName = body.businessName;
    if (body.email !== undefined) data.email = body.email;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.address !== undefined) data.address = body.address;
    if (body.currency !== undefined) data.currency = body.currency;
    if (body.timezone !== undefined) data.timezone = body.timezone;
    if (body.notificationPreferences !== undefined) data.notificationPreferences = body.notificationPreferences;
    return this.prisma.businessSetting.update({
      where: { id: settings.id },
      data,
    });
  }

  async getBranches() {
    return this.prisma.branch.findMany({
      include: { _count: { select: { bookings: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createBranch(body: any) {
    if (!body.name) throw new BadRequestException('Branch name is required');
    return this.prisma.branch.create({
      data: {
        salonId: body.salonId || 'seed-salon-ambition',
        name: body.name,
        city: body.city || null,
      },
    });
  }

  async updateBranch(id: string, body: any) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException('Branch not found');
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.city !== undefined) data.city = body.city;
    return this.prisma.branch.update({ where: { id }, data });
  }

  async removeBranch(id: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException('Branch not found');
    if (branch.id === 'seed-branch-main') {
      throw new BadRequestException('Cannot delete the main branch');
    }
    return this.prisma.branch.delete({ where: { id } });
  }
}
