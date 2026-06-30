import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AdjustmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdjustments(query: any) {
    const where: any = {};
    if (query.type) where.type = query.type;
    if (query.clientId) where.clientId = query.clientId;
    return this.prisma.adjustment.findMany({
      where,
      include: { client: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getAdjustment(id: string) {
    return this.prisma.adjustment.findUnique({
      where: { id },
      include: { client: { select: { id: true, fullName: true } } },
    });
  }

  async createAdjustment(body: any) {
    if (!body.amount) throw new BadRequestException('Amount is required');
    return this.prisma.adjustment.create({
      data: {
        type: body.type || 'MANUAL_CREDIT',
        bookingId: body.bookingId || null,
        paymentId: body.paymentId || null,
        invoiceId: body.invoiceId || null,
        posSaleId: body.posSaleId || null,
        clientId: body.clientId || null,
        amount: Number(body.amount),
        reason: body.reason || null,
        createdById: body.createdById || null,
      },
      include: { client: { select: { id: true, fullName: true } } },
    });
  }

  async getRefunds(query: any) {
    const where: any = {};
    if (query.clientId) where.clientId = query.clientId;
    return this.prisma.refund.findMany({
      where,
      include: { client: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async createRefund(body: any) {
    if (!body.amount) throw new BadRequestException('Amount is required');
    return this.prisma.refund.create({
      data: {
        paymentId: body.paymentId || null,
        posSaleId: body.posSaleId || null,
        invoiceId: body.invoiceId || null,
        clientId: body.clientId || null,
        amount: Number(body.amount),
        reason: body.reason || null,
      },
      include: { client: { select: { id: true, fullName: true } } },
    });
  }

  async getCancellations(query: any) {
    const where: any = {};
    if (query.clientId) where.clientId = query.clientId;
    return this.prisma.cancellation.findMany({
      where,
      include: { client: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async createCancellation(body: any) {
    if (!body.reason) throw new BadRequestException('Reason is required');
    return this.prisma.cancellation.create({
      data: {
        bookingId: body.bookingId || null,
        invoiceId: body.invoiceId || null,
        clientId: body.clientId || null,
        amount: Number(body.amount) || 0,
        reason: body.reason,
      },
      include: { client: { select: { id: true, fullName: true } } },
    });
  }
}
