import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmployeeModule } from './employee/employee.module';
import { AppLifecycle } from './appLifecycle';
import { DeviceModule } from './device/device.module';
import { AttendanceModule } from './attendance/attendance.module';
import { SharedModule } from './shared';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth/infrastructure/guards/auth.guard';

@Module({
  imports: [
    SharedModule,
    AuthModule,
    EmployeeModule,
    DeviceModule,
    AttendanceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AppLifecycle,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
