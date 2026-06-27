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
import { WaitlistStatus } from '@prisma/client';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';
import { UpdateWaitlistEntryDto } from './dto/update-waitlist-entry.dto';
import { WaitlistService } from './waitlist.service';

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  create(@Body() dto: CreateWaitlistEntryDto) {
    return this.waitlistService.create(dto);
  }

  @Get()
  findAll(
    @Query('branchId') branchId?: string,
    @Query('clientId') clientId?: string,
    @Query('staffId') staffId?: string,
    @Query('status') status?: WaitlistStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.waitlistService.findAll({
      branchId,
      clientId,
      staffId,
      status,
      from,
      to,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.waitlistService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWaitlistEntryDto) {
    return this.waitlistService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.waitlistService.remove(id);
  }
}
