import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AutomationsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.automationRule.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findOne(id: string) {
    return this.prisma.automationRule.findUnique({ where: { id } });
  }

  create(data: { name: string; triggerType: string; actionType: string; config?: string }) {
    return this.prisma.automationRule.create({ data });
  }

  update(id: string, data: Partial<{ name: string; triggerType: string; actionType: string; config: string; isActive: boolean }>) {
    return this.prisma.automationRule.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.automationRule.delete({ where: { id } });
  }

  setActive(id: string, isActive: boolean) {
    return this.prisma.automationRule.update({ where: { id }, data: { isActive } });
  }

  getEvents() {
    return this.prisma.automationEventLog.findMany({
      include: { rule: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
