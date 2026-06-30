import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class OnlineProfileService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureProfile() {
    let profile = await this.prisma.onlineProfile.findFirst();
    if (!profile) {
      profile = await this.prisma.onlineProfile.create({
        data: {
          businessName: 'Ambition Unisex Salon',
          description: 'Premium unisex salon services.',
          cancellationWindow: 24,
          advanceBookingDays: 30,
          slotSizeMinutes: 30,
          publicServices: true,
          publicStaff: true,
        },
      });
    }
    return profile;
  }

  async getProfile() {
    return this.ensureProfile();
  }

  async updateProfile(body: any) {
    const profile = await this.ensureProfile();
    const data: any = {};
    if (body.businessName !== undefined) data.businessName = body.businessName;
    if (body.description !== undefined) data.description = body.description;
    if (body.photos !== undefined) data.photos = body.photos;
    if (body.cancellationWindow !== undefined) data.cancellationWindow = Number(body.cancellationWindow);
    if (body.advanceBookingDays !== undefined) data.advanceBookingDays = Number(body.advanceBookingDays);
    if (body.slotSizeMinutes !== undefined) data.slotSizeMinutes = Number(body.slotSizeMinutes);
    if (body.publicServices !== undefined) data.publicServices = body.publicServices;
    if (body.publicStaff !== undefined) data.publicStaff = body.publicStaff;
    return this.prisma.onlineProfile.update({ where: { id: profile.id }, data });
  }

  async getServices() {
    const profile = await this.ensureProfile();
    const services = await this.prisma.service.findMany({
      where: { isActive: true },
      select: { id: true, name: true, durationMin: true, price: true, category: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
    return { publicServices: profile.publicServices, services };
  }

  async updateServices(body: any) {
    const profile = await this.ensureProfile();
    if (body.publicServices !== undefined) {
      await this.prisma.onlineProfile.update({ where: { id: profile.id }, data: { publicServices: body.publicServices } });
    }
    return this.getServices();
  }

  async getStaff() {
    const profile = await this.ensureProfile();
    const staff = await this.prisma.user.findMany({
      where: { isActive: true, role: { in: ['STYLIST', 'THERAPIST'] } },
      select: { id: true, fullName: true, specialization: true, bio: true },
      orderBy: { fullName: 'asc' },
    });
    return { publicStaff: profile.publicStaff, staff };
  }

  async updateStaff(body: any) {
    const profile = await this.ensureProfile();
    if (body.publicStaff !== undefined) {
      await this.prisma.onlineProfile.update({ where: { id: profile.id }, data: { publicStaff: body.publicStaff } });
    }
    return this.getStaff();
  }

  async getAvailability() {
    const profile = await this.ensureProfile();
    return {
      cancellationWindow: profile.cancellationWindow,
      advanceBookingDays: profile.advanceBookingDays,
      slotSizeMinutes: profile.slotSizeMinutes,
    };
  }

  async updateAvailability(body: any) {
    return this.updateProfile(body);
  }

  async getPublicProfile() {
    const profile = await this.ensureProfile();
    const [services, staff] = await Promise.all([
      profile.publicServices
        ? this.prisma.service.findMany({ where: { isActive: true }, select: { id: true, name: true, durationMin: true, price: true } })
        : [],
      profile.publicStaff
        ? this.prisma.user.findMany({ where: { isActive: true, role: { in: ['STYLIST', 'THERAPIST'] } }, select: { id: true, fullName: true, specialization: true } })
        : [],
    ]);
    return {
      businessName: profile.businessName,
      description: profile.description,
      photos: profile.photos,
      services,
      staff,
      cancellationWindow: profile.cancellationWindow,
      advanceBookingDays: profile.advanceBookingDays,
      slotSizeMinutes: profile.slotSizeMinutes,
    };
  }
}
