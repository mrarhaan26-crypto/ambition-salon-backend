import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class NotificationTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.notificationTemplate.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findOne(id: string) {
    return this.prisma.notificationTemplate.findUnique({ where: { id } });
  }

  create(data: { name: string; subject?: string; body: string; variables?: string; channel?: string }) {
    return this.prisma.notificationTemplate.create({ data });
  }

  update(id: string, data: Partial<{ name: string; subject: string; body: string; variables: string; channel: string; isActive: boolean }>) {
    return this.prisma.notificationTemplate.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.notificationTemplate.delete({ where: { id } });
  }
}
