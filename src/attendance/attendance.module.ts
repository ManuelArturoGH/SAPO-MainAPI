import { Module } from '@nestjs/common';
import { AttendanceController } from './infrastructure/controllers/attendanceController';
import { AttendanceSyncController } from './infrastructure/controllers/attendanceSyncController';
import { GetAttendancesUseCase } from './application/getAttendancesUseCase';
import { MongoAttendanceRepository } from './infrastructure/repositories/MongoAttendanceRepository';
import { DeviceModule } from '../device/device.module';
import { ExternalAttendanceSyncService } from './infrastructure/services/external-attendance-sync.service';
import { AttendanceIndexInitializerService } from './infrastructure/services/attendance-index-initializer.service';
import { EmployeeModule } from '../employee/employee.module';

@Module({
  imports: [DeviceModule, EmployeeModule],
  controllers: [AttendanceController, AttendanceSyncController],
  providers: [
    GetAttendancesUseCase,
    ExternalAttendanceSyncService,
    AttendanceIndexInitializerService,
    { provide: 'AttendanceRepository', useClass: MongoAttendanceRepository },
  ],
  exports: [GetAttendancesUseCase, ExternalAttendanceSyncService],
})
export class AttendanceModule {}
