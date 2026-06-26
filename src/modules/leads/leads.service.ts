import { Injectable } from '@nestjs/common';
@Injectable()export class LeadsService{findAll(){return {module:'leads',status:'Step 21 foundation ready'};} create(body:any){return {module:'leads',received:body,status:'created placeholder'};}}
