import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any) {
    const where: any = {};
    if (query.action) where.action = query.action;
    if (query.entityType) where.entityType = query.entityType;
    if (query.days) {
      const since = new Date(Date.now() - Number(query.days) * 86400000);
      where.createdAt = { gte: since };
    }
    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const log = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('Audit log not found');
    return log;
  }

  async getSummary() {
    const [total, byAction, byEntityType, recent7Days] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.groupBy({ by: ['action'], _count: true }),
      this.prisma.auditLog.groupBy({ by: ['entityType'], _count: true }),
      this.prisma.auditLog.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      }),
    ]);

    return {
      totalLogs: total,
      byAction: byAction.map(a => ({ action: a.action, count: a._count })),
      byEntityType: byEntityType.map(e => ({ entityType: e.entityType, count: e._count })),
      recent7Days,
    };
  }
}
