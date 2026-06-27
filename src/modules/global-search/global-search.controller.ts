import { Controller, Get, Query } from '@nestjs/common';
import { GlobalSearchService } from './global-search.service';
import { GlobalSearchQueryDto } from './dto/global-search-query.dto';

@Controller('global-search')
export class GlobalSearchController {
  constructor(private readonly service: GlobalSearchService) {}

  @Get()
  search(@Query() query: GlobalSearchQueryDto) {
    return this.service.search(query);
  }

  @Get('suggestions')
  suggestions(@Query() query: GlobalSearchQueryDto) {
    return this.service.suggestions(query);
  }
}
