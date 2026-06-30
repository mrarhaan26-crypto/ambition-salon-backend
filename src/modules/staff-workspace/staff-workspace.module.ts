import { Module } from '@nestjs/common';
import { StaffWorkspaceController } from './staff-workspace.controller';
import { StaffWorkspaceService } from './staff-workspace.service';
@Module({
  controllers: [StaffWorkspaceController],
  providers: [StaffWorkspaceService],
})
export class StaffWorkspaceModule {}
