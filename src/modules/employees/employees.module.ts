import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { EmployeesRepository } from './employees.repository';
import { ExternalEmployeeSyncService } from './services/external-sync.service';
import { IndexInitializerService } from './services/index-initializer.service';
import { DevicesModule } from '../devices/devices.module';

// Nota: SharedModule ya provee CacheService, CloudinaryService, RequestQueueService globalmente

@Module({
  imports: [DevicesModule],
  controllers: [EmployeesController],
  providers: [
    EmployeesService,
    EmployeesRepository,
    ExternalEmployeeSyncService,
    IndexInitializerService,
    { provide: 'EmployeeRepository', useClass: EmployeesRepository },
  ],
  exports: [
    EmployeesService,
    EmployeesRepository,
    ExternalEmployeeSyncService,
    'EmployeeRepository',
  ],
})
export class EmployeesModule {}
