import { Module } from '@nestjs/common';
import { DeviceController } from './infrastructure/controllers/deviceController';
import { AddDeviceUseCase } from './application/addDeviceUseCase';
import { GetDevicesUseCase } from './application/getDevicesUseCase';
import { DeleteDeviceUseCase } from './application/deleteDeviceUseCase';
import { GetDeviceByIdUseCase } from './application/getDeviceByIdUseCase';
import { MongoDeviceRepository } from './infrastructure/repositories/MongoDeviceRepository';
import { DeviceIndexInitializerService } from './infrastructure/services/device-index-initializer.service';

@Module({
  controllers: [DeviceController],
  providers: [
    AddDeviceUseCase,
    GetDevicesUseCase,
    DeleteDeviceUseCase,
    GetDeviceByIdUseCase,
    DeviceIndexInitializerService,
    { provide: 'DeviceRepository', useClass: MongoDeviceRepository },
  ],
  exports: [
    AddDeviceUseCase,
    GetDevicesUseCase,
    DeleteDeviceUseCase,
    GetDeviceByIdUseCase,
    'DeviceRepository',
  ],
})
export class DeviceModule {}
