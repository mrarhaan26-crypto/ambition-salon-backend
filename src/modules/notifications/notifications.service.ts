import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        branchId: dto.branchId,
        userId: dto.userId,
        type: dto.type,
        priority: dto.priority ?? 'MEDIUM',
        title: dto.title,
        message: dto.message,
        link: dto.link,
      },
    });
  }

  async findAll(query: NotificationQueryDto) {
    const where: Prisma.NotificationWhereInput = {};

    if (query.branchId) where.branchId = query.branchId;
    if (query.userId) where.userId = query.userId;
    if (query.type) where.type = query.type;
    if (query.priority) where.priority = query.priority;

    if (query.read !== undefined) {
      where.read = query.read === 'true';
    }
    if (query.archived !== undefined) {
      where.archived = query.archived === 'true';
    }

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async unreadCount(query: { userId?: string; branchId?: string }) {
    const where: Prisma.NotificationWhereInput = {
      read: false,
      archived: false,
    };

    if (query.userId) where.userId = query.userId;
    if (query.branchId) where.branchId = query.branchId;

    const count = await this.prisma.notification.count({ where });
    return { count };
  }

  async findOne(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) throw new NotFoundException('Notification not found');

    return notification;
  }

  async markRead(id: string) {
    await this.findOne(id);

    return this.prisma.notification.update({
      where: { id },
      data: { read: true, readAt: new Date() },
    });
  }

  async markAllRead(query: { branchId?: string; userId?: string }) {
    const where: Prisma.NotificationWhereInput = { read: false };

    if (query.branchId) where.branchId = query.branchId;
    if (query.userId) where.userId = query.userId;

    await this.prisma.notification.updateMany({
      where,
      data: { read: true, readAt: new Date() },
    });

    return { success: true };
  }

  async archive(id: string) {
    await this.findOne(id);

    return this.prisma.notification.update({
      where: { id },
      data: { archived: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.notification.delete({
      where: { id },
    });
  }
}
