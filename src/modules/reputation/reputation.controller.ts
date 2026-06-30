import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ReputationService } from './reputation.service';

@Controller('reputation')
export class ReputationController {
  constructor(private readonly service: ReputationService) {}

  @Get()
  getDashboard() { return this.service.getDashboard(); }

  @Get('reviews')
  getReviews(@Query() query: any) { return this.service.getReviews(query); }

  @Get('summary')
  getSummary() { return this.service.getSummary(); }

  @Get('reviews/:id')
  getReview(@Param('id') id: string) { return this.service.getReview(id); }

  @Post('reviews')
  createReview(@Body() body: any) { return this.service.createReview(body); }

  @Patch('reviews/:id')
  updateReview(@Param('id') id: string, @Body() body: any) { return this.service.updateReview(id, body); }

  @Delete('reviews/:id')
  removeReview(@Param('id') id: string) { return this.service.removeReview(id); }
}
