import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class PosService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly saleInclude = {
    items: true,
    client: { select: { id: true, fullName: true } },
    staff: { select: { id: true, fullName: true, email: true, role: true } },
  };

  private async attachReceiptsAndPaymentsToSales(sales: any[]) {
    const saleIds = sales.map((sale) => sale.id).filter(Boolean);

    if (!saleIds.length) {
      return sales;
    }

    const receipts = await this.prisma.receipt.findMany({
      where: { posSaleId: { in: saleIds } },
      orderBy: { createdAt: 'desc' },
    });

    const payments = await this.prisma.payment.findMany({
      where: { posSaleId: { in: saleIds } },
      orderBy: { createdAt: 'desc' },
    });

    const receiptBySaleId = new Map<string, any>();
    const paymentBySaleId = new Map<string, any>();

    receipts.forEach((receipt) => {
      if (receipt.posSaleId && !receiptBySaleId.has(receipt.posSaleId)) {
        receiptBySaleId.set(receipt.posSaleId, receipt);
      }
    });

    payments.forEach((payment) => {
      if (payment.posSaleId && !paymentBySaleId.has(payment.posSaleId)) {
        paymentBySaleId.set(payment.posSaleId, payment);
      }
    });

    return sales.map((sale) => ({
      ...sale,
      receipt: receiptBySaleId.get(sale.id) || null,
      payment: paymentBySaleId.get(sale.id) || null,
    }));
  }

  async getDashboard(query: any) {
    const salesRaw = await this.prisma.posSale.findMany({
      where: query.branchId ? { branchId: query.branchId } : {},
      include: this.saleInclude,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const sales = await this.attachReceiptsAndPaymentsToSales(salesRaw);

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
        productId: item.productId || null,
        name: item.name,
        quantity,
        unitPrice,
        totalPrice: quantity * unitPrice,
      };
    });

    const totalAmount = items.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
    const paymentMethod = body.paymentMethod || 'CASH';

    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.posSale.create({
        data: {
          branchId: body.branchId || 'seed-branch-main',
          clientId: body.clientId || null,
          staffId: body.staffId || null,
          totalAmount,
          paymentMethod,
          status: 'COMPLETED',
          items: { create: items },
        },
        include: this.saleInclude,
      });

      for (const item of items) {
        if (!item.productId) continue;
        const product = await tx.inventoryProduct.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new BadRequestException(`Product "${item.name}" not found in inventory`);
        }
        if (!product.isActive) {
          throw new BadRequestException(`Product "${product.name}" is archived and cannot be sold`);
        }
        if (product.quantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${product.name}": requested ${item.quantity}, available ${product.quantity}`
          );
        }
        await tx.inventoryProduct.update({
          where: { id: item.productId },
          data: { quantity: product.quantity - item.quantity },
        });
        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            type: 'OUT',
            quantity: item.quantity,
            notes: `Sold via POS sale ${sale.id}`,
            posSaleId: sale.id,
          },
        });
      }

      const receipt = await tx.receipt.create({
        data: {
          posSaleId: sale.id,
          receiptNumber: `POS-${sale.id}`,
          amount: sale.totalAmount,
        },
      });

      const payment = await tx.payment.create({
        data: {
          posSaleId: sale.id,
          clientId: body.clientId || null,
          amount: sale.totalAmount,
          currency: 'USD',
          method: paymentMethod,
          status: 'COMPLETED',
        },
      });

      return { ...sale, receipt, payment };
    });
  }

  async getSales(query: any) {
    const where: any = {};
    if (query.branchId) where.branchId = query.branchId;
    if (query.status) where.status = query.status;
    if (query.from) where.createdAt = { ...where.createdAt, gte: new Date(query.from) };
    if (query.to) where.createdAt = { ...where.createdAt, lte: new Date(query.to) };

    const sales = await this.prisma.posSale.findMany({
      where,
      include: this.saleInclude,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return this.attachReceiptsAndPaymentsToSales(sales);
  }

  async getSale(id: string) {
    const sale = await this.prisma.posSale.findUnique({
      where: { id },
      include: this.saleInclude,
    });
    if (!sale) throw new NotFoundException('Sale not found');

    const receipt = await this.prisma.receipt.findFirst({
      where: { posSaleId: sale.id },
      orderBy: { createdAt: 'desc' },
    });

    const payment = await this.prisma.payment.findFirst({
      where: { posSaleId: sale.id },
      orderBy: { createdAt: 'desc' },
    });

    return { ...sale, receipt, payment };
  }

  async refund(id: string, body: any) {
    const sale = await this.prisma.posSale.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.status === 'REFUNDED') throw new BadRequestException('Sale already refunded');

    return this.prisma.$transaction(async (tx) => {
      const alreadyRestored = await tx.inventoryTransaction.findFirst({
        where: { posSaleId: id, type: 'IN' },
      });

      if (!alreadyRestored) {
        for (const item of sale.items) {
          if (!item.productId) continue;
          const product = await tx.inventoryProduct.findUnique({ where: { id: item.productId } });
          if (!product) continue;
          await tx.inventoryProduct.update({
            where: { id: item.productId },
            data: { quantity: product.quantity + item.quantity },
          });
          await tx.inventoryTransaction.create({
            data: {
              productId: item.productId,
              type: 'IN',
              quantity: item.quantity,
              notes: `Restocked via POS refund ${id}`,
              posSaleId: id,
            },
          });
        }
      }

      const updatedSale = await tx.posSale.update({
        where: { id },
        data: { status: 'REFUNDED' },
        include: this.saleInclude,
      });

      const receipt = await tx.receipt.findFirst({
        where: { posSaleId: updatedSale.id },
        orderBy: { createdAt: 'desc' },
      });

      const existingPayment = await tx.payment.findFirst({
        where: { posSaleId: updatedSale.id },
        orderBy: { createdAt: 'desc' },
      });

      const payment = existingPayment
        ? await tx.payment.update({
            where: { id: existingPayment.id },
            data: { status: 'REFUNDED' },
          })
        : null;

      return { ...updatedSale, receipt, payment };
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
