import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { WalkInsService } from './walkins.service';
import { CreateWalkInDto } from './dto/create-walkin.dto';
import { UpdateWalkInDto } from './dto/update-walkin.dto';

@Controller('walkins')
export class WalkInsController {
  constructor(private readonly service: WalkInsService) {}

  @Post()
  create(@Body() dto: CreateWalkInDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get('dashboard')
  dashboard(@Query('branchId') branchId?: string) {
    return this.service.dashboard(branchId);
  }

  @Get('queue')
  queue(@Query('branchId') branchId?: string) {
    return this.service.todayQueue(branchId);
  }

  @Post('call-next')
  callNext(@Body('branchId') branchId: string) {
    return this.service.callNext(branchId);
  }

  @Patch(':id/call')
  call(@Param('id') id: string) {
    return this.service.call(id);
  }

  @Patch(':id/start')
  start(
    @Param('id') id: string,
    @Body('staffId') staffId?: string,
  ) {
    return this.service.startService(id, staffId);
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string) {
    return this.service.complete(id);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.service.cancel(id, reason);
  }

  @Patch(':id/no-show')
  noShow(@Param('id') id: string) {
    return this.service.noShow(id);
  }

  @Post(':id/convert')
  convert(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.convertToBooking(id, body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWalkInDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
