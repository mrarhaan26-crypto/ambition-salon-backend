import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class PosService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(query: any) {
    const sales = await this.prisma.posSale.findMany({
      where: query.branchId ? { branchId: query.branchId } : {},
      include: { items: true, client: { select: { id: true, fullName: true } }, staff: { select: { id: true, fullName: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const totals = sales.reduce((acc, sale) => {
      if (sale.status === 'COMPLETED') acc.revenue += sale.totalAmount;
      acc.count++;
      return acc;
    }, { revenue: 0, count: 0 });

    return {
      summary: { totalSales: sales.length, completedRevenue: totals.revenue },
      recentSales: sales.slice(0, 10),
    };
  }

  async checkout(body: any) {
    if (!body.items || !body.items.length) {
      throw new BadRequestException('At least one item is required');
    }

    const items = body.items.map((item: any) => {
      if (!item.name) throw new BadRequestException('Each item needs a name');
      const quantity = Number(item.quantity) || 1;
      const unitPrice = Number(item.unitPrice) || 0;
      return {
        serviceId: item.serviceId || null,
        name: item.name,
        quantity,
        unitPrice,
        totalPrice: quantity * unitPrice,
      };
    });

    const totalAmount = items.reduce((sum: number, item: any) => sum + item.totalPrice, 0);

    return this.prisma.posSale.create({
      data: {
        branchId: body.branchId || 'seed-branch-main',
        clientId: body.clientId || null,
        staffId: body.staffId || null,
        totalAmount,
        paymentMethod: body.paymentMethod || 'CASH',
        status: 'COMPLETED',
        items: { create: items },
      },
      include: { items: true, client: { select: { id: true, fullName: true } }, staff: { select: { id: true, fullName: true, email: true, role: true } } },
    });
  }

  async getSales(query: any) {
    const where: any = {};
    if (query.branchId) where.branchId = query.branchId;
    if (query.status) where.status = query.status;
    if (query.from) where.createdAt = { ...where.createdAt, gte: new Date(query.from) };
    if (query.to) where.createdAt = { ...where.createdAt, lte: new Date(query.to) };
    return this.prisma.posSale.findMany({
      where,
      include: { items: true, client: { select: { id: true, fullName: true } }, staff: { select: { id: true, fullName: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getSale(id: string) {
    const sale = await this.prisma.posSale.findUnique({
      where: { id },
      include: { items: true, client: { select: { id: true, fullName: true } }, staff: { select: { id: true, fullName: true, email: true, role: true } } },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  async refund(id: string, body: any) {
    const sale = await this.prisma.posSale.findUnique({ where: { id } });
    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.status === 'REFUNDED') throw new BadRequestException('Sale already refunded');
    return this.prisma.posSale.update({
      where: { id },
      data: { status: 'REFUNDED' },
      include: { items: true, client: { select: { id: true, fullName: true } }, staff: { select: { id: true, fullName: true, email: true, role: true } } },
    });
  }

  async getPaymentMethods() {
    return [
      { id: 'CASH', name: 'Cash' },
      { id: 'CARD', name: 'Card' },
      { id: 'UPI', name: 'UPI' },
      { id: 'WALLET', name: 'Wallet' },
    ];
  }
}

