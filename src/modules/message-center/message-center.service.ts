import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class MessageCenterService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [conversations, totalConversations] = await Promise.all([
      this.prisma.messageConversation.findMany({
        include: { messages: { take: 1, orderBy: { createdAt: 'desc' } } },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
      this.prisma.messageConversation.count(),
    ]);

    const unread = await this.prisma.messageConversation.count({ where: { unread: true } });

    return { conversations, unread, channels: ['IN_APP', 'EMAIL', 'SMS'] };
  }

  async getConversations() {
    return this.prisma.messageConversation.findMany({
      include: { _count: { select: { messages: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getConversation(id: string) {
    return this.prisma.messageConversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async sendMessage(body: { conversationId?: string; clientId?: string; subject?: string; content: string; channel?: string }) {
    const { conversationId, clientId, subject, content, channel } = body;
    let convId = conversationId;

    if (!convId) {
      const conversation = await this.prisma.messageConversation.create({
        data: { clientId, subject, channel: channel || 'IN_APP' },
      });
      convId = conversation.id;
    } else {
      await this.prisma.messageConversation.update({
        where: { id: convId },
        data: { unread: true },
      });
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId: convId,
        content,
        channel: channel || 'IN_APP',
        sender: 'STAFF',
      },
    });

    return { message, conversationId: convId };
  }
}
