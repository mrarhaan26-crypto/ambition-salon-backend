import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class PublicBookingService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile() {
    const profile = await this.prisma.onlineProfile.findFirst();
    if (!profile) {
      return {
        businessName: 'Ambition Unisex Salon',
        description: 'Premium salon services.',
        cancellationWindow: 24,
        advanceBookingDays: 30,
        slotSizeMinutes: 30,
      };
    }
    return profile;
  }

  async getServices() {
    return this.prisma.service.findMany({
      where: { isActive: true },
      select: { id: true, name: true, description: true, durationMin: true, price: true, category: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async getStaff() {
    return this.prisma.user.findMany({
      where: { isActive: true, role: { in: ['STYLIST', 'THERAPIST'] } },
      select: { id: true, fullName: true, specialization: true, bio: true },
      orderBy: { fullName: 'asc' },
    });
  }

  async getSlots(query: any) {
    const { date, staffId, serviceId } = query;
    if (!date) return [];
    const dayOfWeek = new Date(date).getDay();
    const availabilities = await this.prisma.staffAvailability.findMany({
      where: {
        dayOfWeek,
        isActive: true,
        ...(staffId ? { staffId } : {}),
      },
    });
    const bookings = await this.prisma.booking.findMany({
      where: {
        staffId: staffId || undefined,
        startTime: {
          gte: new Date(`${date}T00:00:00Z`),
          lt: new Date(`${date}T23:59:59Z`),
        },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: { startTime: true, endTime: true },
    });
    const slots: any[] = [];
    for (const av of availabilities) {
      const [startH, startM] = av.startTime.split(':').map(Number);
      const [endH, endM] = av.endTime.split(':').map(Number);
      let current = startH * 60 + startM;
      const end = endH * 60 + endM;
      while (current + 30 <= end) {
        const slotStart = `${String(Math.floor(current / 60)).padStart(2, '0')}:${String(current % 60).padStart(2, '0')}`;
        const slotEndH = Math.floor((current + 30) / 60);
        const slotEndM = (current + 30) % 60;
        const slotEnd = `${String(slotEndH).padStart(2, '0')}:${String(slotEndM).padStart(2, '0')}`;
        const isBooked = bookings.some(b => {
          const bStart = `${String(new Date(b.startTime).getHours()).padStart(2, '0')}:${String(new Date(b.startTime).getMinutes()).padStart(2, '0')}`;
          const bEnd = `${String(new Date(b.endTime).getHours()).padStart(2, '0')}:${String(new Date(b.endTime).getMinutes()).padStart(2, '0')}`;
          return slotStart < bEnd && slotEnd > bStart;
        });
        if (!isBooked) {
          slots.push({ staffId: av.staffId, time: slotStart, endTime: slotEnd, date });
        }
        current += 30;
      }
    }
    return slots;
  }

  async createBooking(body: any) {
    const { clientId, serviceId, staffId, date, time, customerName, customerPhone, customerEmail } = body;
    if (!serviceId) throw new BadRequestException('serviceId is required');
    if (!date || !time) throw new BadRequestException('date and time are required');
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new NotFoundException('Service not found');
    let client = clientId ? await this.prisma.client.findUnique({ where: { id: clientId } }) : null;
    if (!client && customerName) {
      client = await this.prisma.client.create({
        data: {
          fullName: customerName,
          phone: customerPhone || null,
          email: customerEmail || null,
        },
      });
    }
    if (!client) throw new BadRequestException('Client info required');
    const startTime = new Date(`${date}T${time}:00Z`);
    const endTime = new Date(startTime.getTime() + service.durationMin * 60000);

    const branch = await this.prisma.branch.findFirst();
    const booking = await this.prisma.booking.create({
      data: {
        branchId: branch?.id || 'seed-branch-main',
        clientId: client.id,
        staffId: staffId || null,
        title: service.name,
        status: 'PENDING',
        startTime,
        endTime,
        totalAmount: service.price,
        services: {
          create: {
            name: service.name,
            durationMin: service.durationMin,
            price: service.price,
            serviceId: service.id,
          },
        },
      },
      include: { services: true, client: true, staff: { select: { id: true, fullName: true } } },
    });
    return booking;
  }
}
