import { Module } from '@nestjs/common';
import { DeliverySettingsController, DeliveryLogsController, DeliveryTestController } from './delivery-settings.controller';
import { DeliverySettingsService } from './delivery-settings.service';
@Module({
  controllers: [DeliverySettingsController, DeliveryLogsController, DeliveryTestController],
  providers: [DeliverySettingsService],
})
export class DeliverySettingsModule {}
