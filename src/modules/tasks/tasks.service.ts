import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any) {
    return this.prisma.task.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.assignedTo ? { assignedTo: query.assignedTo } : {}),
        ...(query.priority ? { priority: query.priority } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async create(body: any) {
    return this.prisma.task.create({
      data: {
        title: body.title,
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.dueDate !== undefined ? { dueDate: new Date(body.dueDate) } : {}),
        ...(body.priority !== undefined ? { priority: body.priority } : {}),
        ...(body.assignedTo !== undefined ? { assignedTo: body.assignedTo } : {}),
        ...(body.clientId !== undefined ? { clientId: body.clientId } : {}),
        ...(body.bookingId !== undefined ? { bookingId: body.bookingId } : {}),
      },
    });
  }

  async update(id: string, body: any) {
    await this.findOne(id);
    return this.prisma.task.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.dueDate !== undefined ? { dueDate: new Date(body.dueDate) } : {}),
        ...(body.priority !== undefined ? { priority: body.priority } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.assignedTo !== undefined ? { assignedTo: body.assignedTo } : {}),
        ...(body.clientId !== undefined ? { clientId: body.clientId } : {}),
        ...(body.bookingId !== undefined ? { bookingId: body.bookingId } : {}),
      },
    });
  }

  async complete(id: string) {
    await this.findOne(id);
    return this.prisma.task.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.task.delete({ where: { id } });
  }

  async findMy(userId: string) {
    const where: any = {};
    if (userId) where.assignedTo = userId;
    return this.prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOverdue() {
    return this.prisma.task.findMany({
      where: {
        dueDate: { lt: new Date() },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      orderBy: { dueDate: 'asc' },
    });
  }
}
