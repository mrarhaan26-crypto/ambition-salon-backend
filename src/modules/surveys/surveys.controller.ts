import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { SurveysService } from './surveys.service';

@Controller('surveys')
export class SurveysController {
  constructor(private readonly service: SurveysService) {}

  @Get()
  findAll(@Query() query: any) { return this.service.findAll(query); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() body: any) { return this.service.create(body); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Get(':id/responses')
  getResponses(@Param('id') id: string) { return this.service.getResponses(id); }

  @Post(':id/responses')
  submitResponse(@Param('id') id: string, @Body() body: any) { return this.service.submitResponse(id, body); }
}

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly service: SurveysService) {}

  @Get()
  findAll(@Query() query: any) { return this.service.findAllFeedback(query); }

  @Post()
  create(@Body() body: any) { return this.service.createFeedback(body); }
}
