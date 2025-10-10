import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmployeeModule } from './employee/employee.module';
import { AppLifecycle } from './appLifecycle';
import { DeviceModule } from './device/device.module';
import { AttendanceModule } from './attendance/attendance.module';
import { SharedModule } from './shared';

@Module({
  imports: [SharedModule, EmployeeModule, DeviceModule, AttendanceModule],
  controllers: [AppController],
  providers: [AppService, AppLifecycle],
})
export class AppModule {}
