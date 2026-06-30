import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class SurveysService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any) {
    return this.prisma.survey.findMany({
      where: { ...(query.isActive !== undefined ? { isActive: query.isActive === 'true' } : {}) },
      include: { _count: { select: { responses: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const s = await this.prisma.survey.findUnique({ where: { id }, include: { responses: true, _count: { select: { responses: true } } } });
    if (!s) throw new NotFoundException('Survey not found');
    return s;
  }

  async create(body: any) {
    return this.prisma.survey.create({ data: { title: body.title, ...(body.questions ? { questions: body.questions } : {}) } });
  }

  async update(id: string, body: any) {
    await this.findOne(id);
    return this.prisma.survey.update({ where: { id }, data: { ...(body.title ? { title: body.title } : {}), ...(body.questions ? { questions: body.questions } : {}), ...(body.isActive !== undefined ? { isActive: body.isActive } : {}) } });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.survey.delete({ where: { id } });
  }

  async getResponses(id: string) {
    await this.findOne(id);
    return this.prisma.surveyResponse.findMany({ where: { surveyId: id }, orderBy: { createdAt: 'desc' } });
  }

  async submitResponse(id: string, body: any) {
    await this.findOne(id);
    return this.prisma.surveyResponse.create({ data: { surveyId: id, ...(body.clientId ? { clientId: body.clientId } : {}), answers: body.answers || '' } });
  }

  async findAllFeedback(query: any) {
    return this.prisma.feedback.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createFeedback(body: any) {
    return this.prisma.feedback.create({ data: { ...(body.clientId ? { clientId: body.clientId } : {}), ...(body.clientName ? { clientName: body.clientName } : {}), ...(body.rating ? { rating: body.rating } : {}), message: body.message || '', ...(body.source ? { source: body.source } : {}) } });
  }
}
