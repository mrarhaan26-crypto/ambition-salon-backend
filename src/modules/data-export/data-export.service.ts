import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class DataExportService {
  constructor(private readonly prisma: PrismaService) {}

  async getInfo() {
    return { available: true, modules: ['clients', 'bookings', 'payments', 'invoices', 'inventory', 'services'] };
  }

  async getModules() {
    return [
      { key: 'clients', label: 'Clients' },
      { key: 'bookings', label: 'Bookings' },
      { key: 'payments', label: 'Payments' },
      { key: 'invoices', label: 'Invoices' },
      { key: 'inventory', label: 'Inventory' },
      { key: 'services', label: 'Services' },
    ];
  }

  async runExport(body: { module: string }) {
    const { module } = body;
    let data: any[] = [];

    switch (module) {
      case 'clients':
        data = await this.prisma.client.findMany({ orderBy: { createdAt: 'desc' } });
        break;
      case 'bookings':
        data = await this.prisma.booking.findMany({ orderBy: { startTime: 'desc' } });
        break;
      case 'payments':
        data = await this.prisma.payment.findMany({ orderBy: { createdAt: 'desc' } });
        break;
      case 'invoices':
        data = await this.prisma.invoice.findMany({ orderBy: { createdAt: 'desc' } });
        break;
      case 'inventory':
        data = await this.prisma.inventoryProduct.findMany({ orderBy: { name: 'asc' } });
        break;
      case 'services':
        data = await this.prisma.service.findMany({ orderBy: { name: 'asc' } });
        break;
      default:
        data = [];
    }

    const job = await this.prisma.dataExportJob.create({
      data: {
        module,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    return { job, data };
  }

  async getHistory() {
    return this.prisma.dataExportJob.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const job = await this.prisma.dataExportJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Export job not found');
    return job;
  }
}
