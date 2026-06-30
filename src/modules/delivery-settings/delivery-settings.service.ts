import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class DeliverySettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    const settings = await this.prisma.deliverySetting.findMany();
    const channels = ['EMAIL', 'SMS', 'WHATSAPP'];
    const result: any = {};
    for (const ch of channels) {
      const existing = settings.find(s => s.channel === ch);
      result[ch.toLowerCase()] = existing || { channel: ch, provider: 'PLACEHOLDER', config: null, isActive: false };
    }
    return result;
  }

  async updateSettings(body: any) {
    const updates: any[] = [];
    for (const key of ['email', 'sms', 'whatsapp']) {
      if (body[key]) {
        await this.prisma.deliverySetting.upsert({
          where: { channel: key.toUpperCase() },
          create: { channel: key.toUpperCase(), provider: body[key].provider || 'PLACEHOLDER', config: body[key].config || null, isActive: body[key].isActive || false },
          update: { provider: body[key].provider, config: body[key].config, isActive: body[key].isActive },
        });
        updates.push(key);
      }
    }
    return { success: true, updated: updates };
  }

  async getLogs(query: any) {
    return this.prisma.deliveryLog.findMany({
      where: { ...(query.channel ? { channel: query.channel } : {}) },
      orderBy: { createdAt: 'desc' },
      take: parseInt(query.limit) || 50,
    });
  }

  async testDelivery(body: any) {
    const log = await this.prisma.deliveryLog.create({
      data: {
        channel: body.channel || 'EMAIL',
        recipient: body.recipient || 'test@example.com',
        subject: body.subject || 'Test Delivery',
        body: body.body || 'This is a simulated test delivery.',
        status: 'SIMULATED',
        response: 'Simulated delivery successful (no real provider configured)',
      },
    });
    return { success: true, simulated: true, message: `Test ${body.channel || 'EMAIL'} delivery simulated. No real provider configured.`, log };
  }
}
