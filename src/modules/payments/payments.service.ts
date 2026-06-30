import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(query: any) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.method) where.method = query.method;
    return this.prisma.payment.findMany({
      where,
      include: { client: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getMethods() {
    return ['CASH', 'UPI_AT_VENUE', 'CARD_AT_VENUE', 'RAZORPAY_PLACEHOLDER'];
  }

  async get(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { client: { select: { id: true, fullName: true } } },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async createIntent(body: any) {
    if (!body.amount || body.amount <= 0) throw new BadRequestException('Valid amount required');
    return this.prisma.payment.create({
      data: {
        posSaleId: body.posSaleId || null,
        bookingId: body.bookingId || null,
        clientId: body.clientId || null,
        amount: Number(body.amount),
        currency: body.currency || 'USD',
        method: body.method || 'CASH',
        status: 'PENDING',
      },
    });
  }

  async markPaid(body: any) {
    const { id, method } = body;
    if (!id) throw new BadRequestException('Payment id required');
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');
    return this.prisma.payment.update({
      where: { id },
      data: { status: 'COMPLETED', method: method || payment.method },
    });
  }

  async markFailed(body: any) {
    const { id } = body;
    if (!id) throw new BadRequestException('Payment id required');
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');
    return this.prisma.payment.update({ where: { id }, data: { status: 'FAILED' } });
  }

  async refund(body: any) {
    const { id } = body;
    if (!id) throw new BadRequestException('Payment id required');
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');
    return this.prisma.payment.update({ where: { id }, data: { status: 'REFUNDED' } });
  }
}
