import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class FormsService {
  constructor(private readonly prisma: PrismaService) {}

  async getForms(query: any) {
    const where: any = {};
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
    return this.prisma.formTemplate.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async getForm(id: string) {
    const form = await this.prisma.formTemplate.findUnique({ where: { id } });
    if (!form) throw new NotFoundException('Form template not found');
    return form;
  }

  async createForm(body: any) {
    if (!body.name) throw new BadRequestException('Form name is required');
    return this.prisma.formTemplate.create({
      data: {
        name: body.name,
        description: body.description || null,
        fields: body.fields || null,
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
    });
  }

  async updateForm(id: string, body: any) {
    await this.getForm(id);
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.fields !== undefined) data.fields = body.fields;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    return this.prisma.formTemplate.update({ where: { id }, data });
  }

  async removeForm(id: string) {
    await this.getForm(id);
    return this.prisma.formTemplate.delete({ where: { id } });
  }

  async getClientForms(clientId: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');
    return this.prisma.clientFormSubmission.findMany({
      where: { clientId },
      include: { form: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async submitClientForm(clientId: string, body: any) {
    if (!body.formId) throw new BadRequestException('formId is required');
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');
    const form = await this.prisma.formTemplate.findUnique({ where: { id: body.formId } });
    if (!form) throw new NotFoundException('Form template not found');
    return this.prisma.clientFormSubmission.create({
      data: {
        clientId,
        formId: body.formId,
        answers: body.answers || null,
        notes: body.notes || null,
      },
      include: { form: true },
    });
  }

  async getClientNotes(clientId: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');
    return this.prisma.clientNote.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createClientNote(clientId: string, body: any) {
    if (!body.content) throw new BadRequestException('Note content is required');
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');
    return this.prisma.clientNote.create({
      data: {
        clientId,
        content: body.content,
        createdBy: body.createdBy || null,
      },
    });
  }

  async updateClientNote(clientId: string, noteId: string, body: any) {
    const note = await this.prisma.clientNote.findFirst({ where: { id: noteId, clientId } });
    if (!note) throw new NotFoundException('Note not found');
    const data: any = {};
    if (body.content !== undefined) data.content = body.content;
    return this.prisma.clientNote.update({ where: { id: noteId }, data });
  }

  async removeClientNote(clientId: string, noteId: string) {
    const note = await this.prisma.clientNote.findFirst({ where: { id: noteId, clientId } });
    if (!note) throw new NotFoundException('Note not found');
    return this.prisma.clientNote.delete({ where: { id: noteId } });
  }

  async getClientTimeline(clientId: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');
    const [bookings, sales, notes, forms, walletTx, loyaltyRx] = await Promise.all([
      this.prisma.booking.findMany({ where: { clientId }, include: { services: true }, orderBy: { createdAt: 'desc' }, take: 20 }),
      this.prisma.posSale.findMany({ where: { clientId }, include: { items: true }, orderBy: { createdAt: 'desc' }, take: 20 }),
      this.prisma.clientNote.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' }, take: 20 }),
      this.prisma.clientFormSubmission.findMany({ where: { clientId }, include: { form: true }, orderBy: { createdAt: 'desc' }, take: 20 }),
      this.prisma.walletTransaction.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' }, take: 20 }),
      this.prisma.loyaltyReward.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);
    const timeline: any[] = [];
    bookings.forEach(b => timeline.push({ type: 'booking', date: b.createdAt, data: b }));
    sales.forEach(s => timeline.push({ type: 'sale', date: s.createdAt, data: s }));
    notes.forEach(n => timeline.push({ type: 'note', date: n.createdAt, data: n }));
    forms.forEach(f => timeline.push({ type: 'form', date: f.createdAt, data: f }));
    walletTx.forEach(w => timeline.push({ type: 'wallet', date: w.createdAt, data: w }));
    loyaltyRx.forEach(l => timeline.push({ type: 'loyalty', date: l.createdAt, data: l }));
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return { clientId, clientName: client.fullName, timeline };
  }
}
