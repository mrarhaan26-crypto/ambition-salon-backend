import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { DataExportService } from './data-export.service';

@Controller('data-export')
export class DataExportController {
  constructor(private readonly service: DataExportService) {}

  @Get()
  getInfo() {
    return this.service.getInfo();
  }

  @Get('modules')
  getModules() {
    return this.service.getModules();
  }

  @Get('history')
  getHistory() {
    return this.service.getHistory();
  }

  @Post('run')
  runExport(@Body() body: { module: string }) {
    return this.service.runExport(body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
