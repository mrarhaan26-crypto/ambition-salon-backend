import { Body,Controller,Get,Post } from '@nestjs/common';import { UsersService } from './users.service';
@Controller('users')export class UsersController{constructor(private readonly service:UsersService){} @Get() findAll(){return this.service.findAll();} @Post() create(@Body() body:any){return this.service.create(body);}}
