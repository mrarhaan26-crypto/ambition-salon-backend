import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly service: PermissionsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyPermissions(@Req() req: any) {
    return this.service.getMyPermissions(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('roles')
  getRoles() {
    return this.service.getRoles();
  }

  @UseGuards(JwtAuthGuard)
  @Get('audit-summary')
  getAuditSummary() {
    return this.service.getAuditSummary();
  }
}
