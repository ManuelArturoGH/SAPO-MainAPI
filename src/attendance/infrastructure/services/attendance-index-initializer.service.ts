import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { connectMongo } from '../../../database/mongodb';

@Injectable()
export class AttendanceIndexInitializerService implements OnModuleInit {
  private readonly logger = new Logger(AttendanceIndexInitializerService.name);
  async onModuleInit(): Promise<void> {
    if (
      process.env.NODE_ENV === 'test' ||
      (process.env.SKIP_INDEX_INIT ?? '').toLowerCase() === 'true'
    )
      return;
    try {
      const db = await connectMongo();
      const col = db.collection('attendances');
      const res = await col.createIndexes([
        { key: { attendanceTime: -1 }, name: 'idx_attendanceTime_desc' },
        {
          key: { attendanceMachineID: 1, userId: 1, attendanceTime: 1 },
          name: 'uniq_attendance_entry',
          unique: true,
        },
        {
          key: { attendanceMachineID: 1 },
          name: 'idx_attendanceMachineID_asc',
        },
      ]);
      this.logger.log(`Attendance indexes ensured: ${res.join(', ')}`);
    } catch (e) {
      this.logger.warn(
        'Could not ensure attendance indexes: ' + (e as Error).message,
      );
    }
  }
}
