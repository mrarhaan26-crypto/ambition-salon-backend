import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class BillingRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async getRules() {
    const rules = await this.prisma.billingRule.findMany();
    const map: any = { currency: 'USD', defaultTaxRate: '0', defaultDiscountPercent: '0', invoicePrefix: 'INV-' };
    rules.forEach(r => map[r.key] = r.value);
    return map;
  }

  async updateRules(body: any) {
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string' || typeof value === 'number') {
        await this.prisma.billingRule.upsert({
          where: { key },
          create: { key, value: String(value) },
          update: { value: String(value) },
        });
      }
    }
    return this.getRules();
  }

  async getDiscounts() {
    return this.prisma.discount.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createDiscount(body: any) {
    if (!body.name) throw new BadRequestException('Discount name required');
    return this.prisma.discount.create({
      data: {
        name: body.name,
        type: body.type || 'PERCENTAGE',
        value: Number(body.value) || 0,
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
    });
  }

  async updateDiscount(id: string, body: any) {
    const discount = await this.prisma.discount.findUnique({ where: { id } });
    if (!discount) throw new NotFoundException('Discount not found');
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.type !== undefined) data.type = body.type;
    if (body.value !== undefined) data.value = Number(body.value);
    if (body.isActive !== undefined) data.isActive = body.isActive;
    return this.prisma.discount.update({ where: { id }, data });
  }

  async removeDiscount(id: string) {
    await this.prisma.discount.findUniqueOrThrow({ where: { id } });
    return this.prisma.discount.delete({ where: { id } });
  }

  async getTaxes() {
    return this.prisma.tax.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createTax(body: any) {
    if (!body.name) throw new BadRequestException('Tax name required');
    return this.prisma.tax.create({
      data: {
        name: body.name,
        rate: Number(body.rate) || 0,
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
    });
  }

  async updateTax(id: string, body: any) {
    const tax = await this.prisma.tax.findUnique({ where: { id } });
    if (!tax) throw new NotFoundException('Tax not found');
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.rate !== undefined) data.rate = Number(body.rate);
    if (body.isActive !== undefined) data.isActive = body.isActive;
    return this.prisma.tax.update({ where: { id }, data });
  }

  async removeTax(id: string) {
    await this.prisma.tax.findUniqueOrThrow({ where: { id } });
    return this.prisma.tax.delete({ where: { id } });
  }
}
