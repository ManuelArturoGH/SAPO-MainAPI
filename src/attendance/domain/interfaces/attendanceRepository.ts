import { Attendance } from '../models/attendance';

export interface AttendanceRepository {
  addIfNotExists(
    att: Attendance,
  ): Promise<{ inserted: boolean; existingId?: string | null }>;
  // Optional bulk method for performance; implementations may omit
  addManyIfNotExists?: (
    atts: Attendance[],
  ) => Promise<{ upserted: number; matched: number }>;
  getAttendances(params: {
    page: number;
    limit: number;
    userId?: number;
    machineNumber?: number;
    from?: Date;
    to?: Date;
    sortDir?: 'asc' | 'desc';
  }): Promise<{
    data: Attendance[];
    total: number;
    page: number;
    limit: number;
  }>;
}
