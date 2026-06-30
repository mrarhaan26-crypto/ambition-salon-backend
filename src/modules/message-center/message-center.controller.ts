import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { MessageCenterService } from './message-center.service';

@Controller('message-center')
export class MessageCenterController {
  constructor(private readonly service: MessageCenterService) {}

  @Get()
  getOverview() {
    return this.service.getOverview();
  }

  @Get('conversations')
  getConversations() {
    return this.service.getConversations();
  }

  @Get('conversations/:id')
  getConversation(@Param('id') id: string) {
    return this.service.getConversation(id);
  }

  @Post('send')
  sendMessage(@Body() body: { conversationId?: string; clientId?: string; subject?: string; content: string; channel?: string }) {
    return this.service.sendMessage(body);
  }
}
