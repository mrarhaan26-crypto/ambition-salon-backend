import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class MarketingService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(query: any) {
    const campaigns = await this.prisma.marketingCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const totalSent = campaigns.reduce((s, c) => s + c.sentCount, 0);
    const totalDelivered = campaigns.reduce((s, c) => s + c.deliveredCount, 0);
    const activeCampaigns = campaigns.filter(c => c.status === 'SCHEDULED' || c.status === 'SENT').length;
    return {
      summary: {
        totalCampaigns: campaigns.length,
        activeCampaigns,
        totalSent,
        totalDelivered,
        totalFailed: campaigns.reduce((s, c) => s + c.failedCount, 0),
      },
      recentCampaigns: campaigns.slice(0, 5),
    };
  }

  async getCampaigns(query: any) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    return this.prisma.marketingCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCampaign(id: string) {
    const campaign = await this.prisma.marketingCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async createCampaign(body: any) {
    if (!body.name) throw new BadRequestException('Campaign name is required');
    return this.prisma.marketingCampaign.create({
      data: {
        branchId: body.branchId || null,
        name: body.name,
        type: body.type || 'SMS',
        audienceCount: Number(body.audienceCount) || 0,
        status: body.status || 'DRAFT',
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        content: body.content || null,
      },
    });
  }

  async updateCampaign(id: string, body: any) {
    await this.getCampaign(id);
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.type !== undefined) data.type = body.type;
    if (body.audienceCount !== undefined) data.audienceCount = Number(body.audienceCount);
    if (body.status !== undefined) data.status = body.status;
    if (body.scheduledAt !== undefined) data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    if (body.content !== undefined) data.content = body.content;
    if (body.sentCount !== undefined) data.sentCount = Number(body.sentCount);
    if (body.deliveredCount !== undefined) data.deliveredCount = Number(body.deliveredCount);
    if (body.failedCount !== undefined) data.failedCount = Number(body.failedCount);
    return this.prisma.marketingCampaign.update({ where: { id }, data });
  }

  async removeCampaign(id: string) {
    await this.getCampaign(id);
    return this.prisma.marketingCampaign.delete({ where: { id } });
  }

  async getAudience() {
    const totalClients = await this.prisma.client.count();
    const clientsWithPhone = await this.prisma.client.count({ where: { phone: { not: null } } });
    const clientsWithEmail = await this.prisma.client.count({ where: { email: { not: null } } });
    return {
      total: totalClients,
      reachableBySMS: clientsWithPhone,
      reachableByEmail: clientsWithEmail,
    };
  }

  async getTemplates() {
    return [
      { id: 'welcome', name: 'Welcome Message', type: 'SMS', content: 'Welcome to Ambition Unisex Salon! Book your first appointment today.' },
      { id: 'reminder', name: 'Appointment Reminder', type: 'SMS', content: 'Reminder: You have an appointment at Ambition Unisex Salon on {{date}} at {{time}}.' },
      { id: 'promotion', name: 'Promotional Offer', type: 'SMS', content: 'Special offer just for you! Get {{discount}}% off on {{service}} at Ambition Unisex Salon.' },
      { id: 'followup', name: 'Follow-up', type: 'EMAIL', content: 'Thank you for visiting Ambition Unisex Salon! We hope you loved your experience.' },
    ];
  }
}
