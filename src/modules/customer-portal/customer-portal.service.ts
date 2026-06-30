import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class CustomerPortalService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(query: any) {
    const { clientId } = query;
    if (!clientId) return { message: 'Provide clientId query parameter' };
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async updateProfile(body: any) {
    const { clientId, ...data } = body;
    if (!clientId) return { message: 'Provide clientId in body' };
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');
    const updateData: any = {};
    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.dateOfBirth !== undefined) updateData.dateOfBirth = new Date(data.dateOfBirth);
    return this.prisma.client.update({ where: { id: clientId }, data: updateData });
  }

  async getBookings(query: any) {
    const { clientId } = query;
    if (!clientId) return [];
    return this.prisma.booking.findMany({
      where: { clientId },
      include: { services: true, staff: { select: { id: true, fullName: true } } },
      orderBy: { startTime: 'desc' },
      take: 50,
    });
  }

  async getBooking(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { services: true, staff: { select: { id: true, fullName: true } }, client: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async getWallet(query: any) {
    const { clientId } = query;
    if (!clientId) return { balance: 0, transactions: [] };
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return { balance: 0, transactions: [] };
    const transactions = await this.prisma.walletTransaction.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return { balance: client.walletBalance, transactions };
  }

  async getMemberships(query: any) {
    const { clientId } = query;
    if (!clientId) return [];
    return this.prisma.clientMembership.findMany({
      where: { clientId, isActive: true },
      include: { membershipPlan: true },
      orderBy: { endDate: 'asc' },
    });
  }

  async getPackages(query: any) {
    const { clientId } = query;
    if (!clientId) return [];
    return this.prisma.clientPackage.findMany({
      where: { clientId, isActive: true },
      include: { package: { include: { services: { include: { service: true } } } } },
      orderBy: { endDate: 'asc' },
    });
  }

  async getLoyalty(query: any) {
    const { clientId } = query;
    if (!clientId) return { points: 0, rewards: [] };
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return { points: 0, rewards: [] };
    const rewards = await this.prisma.loyaltyReward.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return { points: client.loyaltyPoints, rewards };
  }
}
