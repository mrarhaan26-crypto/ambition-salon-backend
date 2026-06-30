import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FormsService } from './forms.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class FormsController {
  constructor(private readonly service: FormsService) {}

  @Get('forms')
  getForms(@Query() query: any) {
    return this.service.getForms(query);
  }

  @Get('forms/:id')
  getForm(@Param('id') id: string) {
    return this.service.getForm(id);
  }

  @Post('forms')
  createForm(@Body() body: any) {
    return this.service.createForm(body);
  }

  @Patch('forms/:id')
  updateForm(@Param('id') id: string, @Body() body: any) {
    return this.service.updateForm(id, body);
  }

  @Delete('forms/:id')
  removeForm(@Param('id') id: string) {
    return this.service.removeForm(id);
  }

  @Get('clients/:id/forms')
  getClientForms(@Param('id') id: string) {
    return this.service.getClientForms(id);
  }

  @Post('clients/:id/forms')
  submitClientForm(@Param('id') id: string, @Body() body: any) {
    return this.service.submitClientForm(id, body);
  }

  @Get('clients/:id/notes')
  getClientNotes(@Param('id') id: string) {
    return this.service.getClientNotes(id);
  }

  @Post('clients/:id/notes')
  createClientNote(@Param('id') id: string, @Body() body: any) {
    return this.service.createClientNote(id, body);
  }

  @Patch('clients/:id/notes/:noteId')
  updateClientNote(@Param('id') id: string, @Param('noteId') noteId: string, @Body() body: any) {
    return this.service.updateClientNote(id, noteId, body);
  }

  @Delete('clients/:id/notes/:noteId')
  removeClientNote(@Param('id') id: string, @Param('noteId') noteId: string) {
    return this.service.removeClientNote(id, noteId);
  }

  @Get('clients/:id/timeline')
  getClientTimeline(@Param('id') id: string) {
    return this.service.getClientTimeline(id);
  }
}
