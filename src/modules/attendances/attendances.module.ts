import { Module } from '@nestjs/common';
import { AttendancesController } from './attendances.controller';
import { AttendancesService } from './attendances.service';
import { AttendancesRepository } from './attendances.repository';
import { ExternalAttendanceSyncService } from './services/external-attendance-sync.service';
import { AttendanceIndexInitializerService } from './services/attendance-index-initializer.service';
import { EmployeesModule } from '../employees/employees.module';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [DevicesModule, EmployeesModule],
  controllers: [AttendancesController],
  providers: [
    AttendancesService,
    AttendancesRepository,
    ExternalAttendanceSyncService,
    AttendanceIndexInitializerService,
    { provide: 'AttendanceRepository', useClass: AttendancesRepository },
  ],
  exports: [AttendancesService, ExternalAttendanceSyncService],
})
export class AttendancesModule {}
