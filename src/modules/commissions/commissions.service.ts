import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class CommissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any) {
    return this.prisma.commissionPayment.findMany({
      where: {
        ...(query.staffId ? { staffId: query.staffId } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      include: { rule: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByStaff(staffId: string) {
    return this.prisma.commissionPayment.findMany({
      where: { staffId },
      include: { rule: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async summary() {
    const payments = await this.prisma.commissionPayment.groupBy({
      by: ['staffId'],
      _sum: { amount: true },
      _count: { id: true },
    });

    return payments.map((p) => ({
      staffId: p.staffId,
      totalCommission: p._sum.amount ?? 0,
      totalPayments: p._count.id,
    }));
  }

  async findAllRules() {
    return this.prisma.commissionRule.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createRule(body: any) {
    return this.prisma.commissionRule.create({
      data: {
        name: body.name,
        type: body.type ?? 'PERCENTAGE',
        value: body.value ?? 0,
        ...(body.serviceId !== undefined ? { serviceId: body.serviceId } : {}),
        ...(body.staffId !== undefined ? { staffId: body.staffId } : {}),
      },
    });
  }

  async updateRule(id: string, body: any) {
    const existing = await this.prisma.commissionRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Commission rule not found');
    return this.prisma.commissionRule.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.value !== undefined ? { value: body.value } : {}),
        ...(body.serviceId !== undefined ? { serviceId: body.serviceId } : {}),
        ...(body.staffId !== undefined ? { staffId: body.staffId } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });
  }

  async removeRule(id: string) {
    const existing = await this.prisma.commissionRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Commission rule not found');
    return this.prisma.commissionRule.delete({ where: { id } });
  }
}
