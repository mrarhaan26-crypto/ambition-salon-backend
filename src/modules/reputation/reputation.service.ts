import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class ReputationService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const summary = await this.getSummary();
    const reviews = await this.getReviews({});
    return { summary, reviews, totalReviews: reviews.length };
  }

  async getReviews(query: any) {
    return this.prisma.review.findMany({
      where: {
        ...(query.source ? { source: query.source } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.rating ? { rating: parseInt(query.rating) } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReview(id: string) {
    const r = await this.prisma.review.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Review not found');
    return r;
  }

  async createReview(body: any) {
    return this.prisma.review.create({
      data: {
        ...(body.clientId ? { clientId: body.clientId } : {}),
        ...(body.clientName ? { clientName: body.clientName } : {}),
        rating: body.rating || 5,
        ...(body.source ? { source: body.source } : {}),
        ...(body.comment ? { comment: body.comment } : {}),
        ...(body.status ? { status: body.status } : {}),
      },
    });
  }

  async updateReview(id: string, body: any) {
    await this.getReview(id);
    return this.prisma.review.update({
      where: { id },
      data: {
        ...(body.rating !== undefined ? { rating: body.rating } : {}),
        ...(body.comment !== undefined ? { comment: body.comment } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      },
    });
  }

  async removeReview(id: string) {
    await this.getReview(id);
    return this.prisma.review.delete({ where: { id } });
  }

  async getSummary() {
    const reviews = await this.prisma.review.findMany();
    const total = reviews.length;
    const avgRating = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
    return { total, avgRating: Math.round(avgRating * 10) / 10, sources: [...new Set(reviews.map(r => r.source))] };
  }
}
