import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallets(query: any) {
    const clients = await this.prisma.client.findMany({
      where: { walletBalance: { gt: 0 } },
      orderBy: { walletBalance: 'desc' },
      take: 50,
    });
    const totalBalance = clients.reduce((s, c) => s + c.walletBalance, 0);
    return { totalClients: clients.length, totalBalance, clients };
  }

  async getClientWallet(clientId: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');
    const transactions = await this.prisma.walletTransaction.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { client, balance: client.walletBalance, transactions };
  }

  async creditWallet(body: any) {
    if (!body.clientId) throw new BadRequestException('clientId is required');
    if (!body.amount || Number(body.amount) <= 0) throw new BadRequestException('Amount must be positive');
    const amount = Number(body.amount);
    return this.prisma.$transaction(async (tx) => {
      const client = await tx.client.update({
        where: { id: body.clientId },
        data: { walletBalance: { increment: amount } },
      });
      const transaction = await tx.walletTransaction.create({
        data: {
          clientId: body.clientId,
          type: 'CREDIT',
          amount,
          balanceAfter: client.walletBalance,
          notes: body.notes || null,
          reference: body.reference || null,
        },
      });
      return { client, balance: client.walletBalance, transaction };
    });
  }

  async debitWallet(body: any) {
    if (!body.clientId) throw new BadRequestException('clientId is required');
    if (!body.amount || Number(body.amount) <= 0) throw new BadRequestException('Amount must be positive');
    const amount = Number(body.amount);
    return this.prisma.$transaction(async (tx) => {
      const client = await tx.client.findUnique({ where: { id: body.clientId } });
      if (!client) throw new NotFoundException('Client not found');
      if (client.walletBalance < amount) throw new BadRequestException('Insufficient wallet balance');
      const updated = await tx.client.update({
        where: { id: body.clientId },
        data: { walletBalance: { decrement: amount } },
      });
      const transaction = await tx.walletTransaction.create({
        data: {
          clientId: body.clientId,
          type: 'DEBIT',
          amount,
          balanceAfter: updated.walletBalance,
          notes: body.notes || null,
          reference: body.reference || null,
        },
      });
      return { client: updated, balance: updated.walletBalance, transaction };
    });
  }

  async getGiftCards(query: any) {
    const where: any = {};
    if (query.status) where.status = query.status;
    return this.prisma.giftCard.findMany({
      where,
      include: { client: { select: { id: true, fullName: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getGiftCard(id: string) {
    const item = await this.prisma.giftCard.findUnique({
      where: { id },
      include: { client: { select: { id: true, fullName: true, phone: true } } },
    });
    if (!item) throw new NotFoundException('Gift card not found');
    return item;
  }

  async createGiftCard(body: any) {
    if (!body.code) throw new BadRequestException('Gift card code is required');
    const existing = await this.prisma.giftCard.findUnique({ where: { code: body.code } });
    if (existing) throw new BadRequestException('Gift card code already exists');
    return this.prisma.giftCard.create({
      data: {
        clientId: body.clientId || null,
        code: body.code,
        initialBalance: Number(body.initialBalance) || 0,
        balance: Number(body.initialBalance) || 0,
        status: body.status || 'ACTIVE',
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    });
  }

  async updateGiftCard(id: string, body: any) {
    await this.getGiftCard(id);
    const data: any = {};
    if (body.clientId !== undefined) data.clientId = body.clientId;
    if (body.status !== undefined) data.status = body.status;
    if (body.balance !== undefined) data.balance = Number(body.balance);
    if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    return this.prisma.giftCard.update({ where: { id }, data });
  }

  async getLoyaltySummary() {
    const clients = await this.prisma.client.count();
    const withPoints = await this.prisma.client.count({ where: { loyaltyPoints: { gt: 0 } } });
    const totalPoints = await this.prisma.client.aggregate({ _sum: { loyaltyPoints: true } });
    return {
      totalClients: clients,
      clientsWithPoints: withPoints,
      totalPoints: totalPoints._sum.loyaltyPoints || 0,
    };
  }

  async getClientLoyalty(clientId: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');
    const rewards = await this.prisma.loyaltyReward.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { client, points: client.loyaltyPoints, rewards };
  }

  async adjustLoyalty(body: any) {
    if (!body.clientId) throw new BadRequestException('clientId is required');
    if (!body.points) throw new BadRequestException('points is required');
    const points = Number(body.points);
    return this.prisma.$transaction(async (tx) => {
      const client = await tx.client.update({
        where: { id: body.clientId },
        data: { loyaltyPoints: { increment: points } },
      });
      const reward = await tx.loyaltyReward.create({
        data: {
          clientId: body.clientId,
          points,
          type: points > 0 ? 'EARNED' : 'REDEEMED',
          description: body.description || null,
          reference: body.reference || null,
        },
      });
      return { client, points: client.loyaltyPoints, reward };
    });
  }
}
