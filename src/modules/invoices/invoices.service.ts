import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(query: any) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.clientId) where.clientId = query.clientId;
    return this.prisma.invoice.findMany({
      where,
      include: { items: true, client: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async get(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { items: true, client: { select: { id: true, fullName: true } } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  private async nextInvoiceNumber(): Promise<string> {
    const last = await this.prisma.invoice.findFirst({ orderBy: { createdAt: 'desc' } });
    const num = last ? parseInt(last.invoiceNumber.replace('INV-', ''), 10) + 1 : 1001;
    return `INV-${num}`;
  }

  async create(body: any) {
    if (!body.items || !body.items.length) throw new BadRequestException('At least one item required');
    const subtotal = body.items.reduce((s: number, i: any) => s + (Number(i.unitPrice) || 0) * (i.quantity || 1), 0);
    const discountPercent = Number(body.discountPercent) || 0;
    const discount = subtotal * (discountPercent / 100);
    const taxRate = Number(body.taxRate) || 0;
    const afterDiscount = subtotal - discount;
    const tax = afterDiscount * (taxRate / 100);
    const total = afterDiscount + tax;
    return this.prisma.invoice.create({
      data: {
        invoiceNumber: await this.nextInvoiceNumber(),
        clientId: body.clientId || null,
        subtotal,
        discount,
        discountPercent,
        tax,
        taxRate,
        total,
        notes: body.notes || null,
        status: 'DRAFT',
        items: {
          create: body.items.map((i: any) => ({
            description: i.description || 'Service',
            quantity: i.quantity || 1,
            unitPrice: Number(i.unitPrice) || 0,
            totalPrice: (Number(i.unitPrice) || 0) * (i.quantity || 1),
          })),
        },
      },
      include: { items: true, client: { select: { id: true, fullName: true } } },
    });
  }

  async update(id: string, body: any) {
    await this.get(id);
    const data: any = {};
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.status !== undefined) data.status = body.status;
    return this.prisma.invoice.update({
      where: { id },
      data,
      include: { items: true, client: { select: { id: true, fullName: true } } },
    });
  }

  async issue(id: string) {
    const invoice = await this.get(id);
    if (invoice.status !== 'DRAFT') throw new BadRequestException('Only DRAFT invoices can be issued');
    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'ISSUED', issuedAt: new Date() },
      include: { items: true, client: { select: { id: true, fullName: true } } },
    });
  }

  async voidInvoice(id: string) {
    const invoice = await this.get(id);
    if (invoice.status === 'VOID') throw new BadRequestException('Invoice already voided');
    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'VOID', voidedAt: new Date() },
      include: { items: true, client: { select: { id: true, fullName: true } } },
    });
  }

  async getReceipts(query: any) {
    const where: any = {};
    if (query.invoiceId) where.invoiceId = query.invoiceId;
    return this.prisma.receipt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getReceipt(id: string) {
    const receipt = await this.prisma.receipt.findUnique({ where: { id } });
    if (!receipt) throw new NotFoundException('Receipt not found');
    return receipt;
  }
}
