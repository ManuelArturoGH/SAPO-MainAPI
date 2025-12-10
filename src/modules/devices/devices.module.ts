import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { DevicesRepository } from './devices.repository';
import { DeviceIndexInitializerService } from './services/device-index-initializer.service';

@Module({
  controllers: [DevicesController],
  providers: [
    DevicesService,
    DevicesRepository,
    DeviceIndexInitializerService,
    { provide: 'DeviceRepository', useClass: DevicesRepository },
  ],
  exports: [DevicesService, DevicesRepository, 'DeviceRepository'],
})
export class DevicesModule {}
