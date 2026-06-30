import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.branch.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async getOverview(id: string) {
    const branch = await this.findOne(id);
    const [bookingCount, staffCount, serviceCount] = await Promise.all([
      this.prisma.booking.count({ where: { branchId: id } }),
      this.prisma.user.count({
        where: {
          staffBookings: { some: { branchId: id } },
          role: { in: ['STYLIST', 'THERAPIST'] },
        },
      }),
      this.prisma.service.count(),
    ]);
    return { ...branch, stats: { bookingCount, staffCount, serviceCount } };
  }

  async getStaff(id: string) {
    await this.findOne(id);
    const staff = await this.prisma.user.findMany({
      where: { role: { in: ['STYLIST', 'THERAPIST'] } },
      select: { id: true, fullName: true, email: true, role: true, isActive: true },
    });
    return staff.map(s => ({ ...s, branchId: id, branchLabel: 'Assigned' }));
  }

  async getServices(id: string) {
    await this.findOne(id);
    return this.prisma.service.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  }

  async getBookings(id: string) {
    await this.findOne(id);
    return this.prisma.booking.findMany({
      where: { branchId: id },
      include: { client: { select: { fullName: true } } },
      orderBy: { startTime: 'desc' },
      take: 20,
    });
  }

  async getInventory(id: string) {
    await this.findOne(id);
    return this.prisma.inventoryProduct.findMany({
      where: { branchId: id, isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}
