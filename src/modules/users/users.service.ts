import { Injectable } from '@nestjs/common';
@Injectable()export class UsersService{findAll(){return {module:'users',status:'Step 21 foundation ready'};} create(body:any){return {module:'users',received:body,status:'created placeholder'};}}
