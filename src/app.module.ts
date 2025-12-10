import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { SharedModule } from './shared';
import { EmployeesModule } from './modules/employees/employees.module';
import { DevicesModule } from './modules/devices/devices.module';
import { AttendancesModule } from './modules/attendances/attendances.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    SharedModule,
    DevicesModule,
    EmployeesModule,
    AttendancesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
