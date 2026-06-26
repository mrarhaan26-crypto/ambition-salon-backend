import { Body,Controller,Get,Post } from '@nestjs/common';import { SalonsService } from './salons.service';
@Controller('salons')export class SalonsController{constructor(private readonly service:SalonsService){} @Get() findAll(){return this.service.findAll();} @Post() create(@Body() body:any){return this.service.create(body);}}
