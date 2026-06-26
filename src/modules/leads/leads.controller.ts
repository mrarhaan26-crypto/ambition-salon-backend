import { Body,Controller,Get,Post } from '@nestjs/common';import { LeadsService } from './leads.service';
@Controller('leads')export class LeadsController{constructor(private readonly service:LeadsService){} @Get() findAll(){return this.service.findAll();} @Post() create(@Body() body:any){return this.service.create(body);}}
