import { Module } from '@nestjs/common';
import { AddEmployeeUseCase } from './application/addEmployeeUseCase';
import { GetAllEmployeeUseCase } from './application/getAllEmployeeUseCase';
import { GetEmployeesUseCase } from './application/getEmployeesUseCase';
import { GetEmployeeByIdUseCase } from './application/getEmployeeByIdUseCase';
import { UpdateEmployeeUseCase } from './application/updateEmployeeUseCase';
import { SoftDeleteEmployeeUseCase } from './application/softDeleteEmployeeUseCase';
import { MongoDBRepository } from './infrastructure/repositories/MongoDBRepository';
import { AddEmployeeController } from './infrastructure/controllers/addEmployeeController';
import { GetAllEmployeeController } from './infrastructure/controllers/getAllEmployeeController';
import { EmployeeIdController } from './infrastructure/controllers/employeeIdController';
import { CacheService } from './infrastructure/services/cache.service';
import { IndexInitializerService } from './infrastructure/services/index-initializer.service';
import { ExternalEmployeeSyncService } from './infrastructure/services/external-sync.service';
import { CloudinaryService } from './infrastructure/services/cloudinary.service';
import { DeviceModule } from '../device/device.module';
import { EmployeeSyncController } from './infrastructure/controllers/employeeSyncController';

@Module({
  imports: [DeviceModule],
  controllers: [
    AddEmployeeController,
    GetAllEmployeeController,
    EmployeeIdController,
    EmployeeSyncController,
  ],
  providers: [
    AddEmployeeUseCase,
    GetAllEmployeeUseCase,
    GetEmployeesUseCase,
    GetEmployeeByIdUseCase,
    UpdateEmployeeUseCase,
    SoftDeleteEmployeeUseCase,
    CacheService,
    IndexInitializerService,
    ExternalEmployeeSyncService,
    CloudinaryService,
    { provide: 'EmployeeRepository', useClass: MongoDBRepository },
  ],
  exports: [
    AddEmployeeUseCase,
    GetAllEmployeeUseCase,
    GetEmployeesUseCase,
    GetEmployeeByIdUseCase,
    UpdateEmployeeUseCase,
    SoftDeleteEmployeeUseCase,
    CacheService,
    ExternalEmployeeSyncService,
  ],
})
export class EmployeeModule {}
