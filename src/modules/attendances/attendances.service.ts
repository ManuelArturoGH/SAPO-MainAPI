import { Injectable, Logger } from '@nestjs/common';
import { AttendancesRepository } from './attendances.repository';
import { Attendance } from './entities/attendance.entity';

export interface GetAttendanceParams {
  page?: number;
  limit?: number;
  userId?: number;
  machineNumber?: number;
  from?: Date;
  to?: Date;
  sortDir?: 'asc' | 'desc';
}

export interface PaginatedAttendances {
  data: Attendance[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class AttendancesService {
  private readonly logger = new Logger(AttendancesService.name);

  constructor(private readonly repository: AttendancesRepository) {}

  async getAttendances(
    params: GetAttendanceParams = {},
  ): Promise<PaginatedAttendances> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 25;
    const sortDir =
      params.sortDir === 'asc' || params.sortDir === 'desc'
        ? params.sortDir
        : 'desc';

    try {
      return await this.repository.getAttendances({
        page,
        limit,
        userId: params.userId,
        machineNumber: params.machineNumber,
        from: params.from,
        to: params.to,
        sortDir,
      });
    } catch (e) {
      this.logger.error('Error getting attendances', e as Error);
      return { data: [], total: 0, page, limit };
    }
  }

  async addIfNotExists(
    att: Attendance,
  ): Promise<{ inserted: boolean; existingId?: string | null }> {
    try {
      return await this.repository.addIfNotExists(att);
    } catch (e) {
      this.logger.error('Error adding attendance', e as Error);
      return { inserted: false };
    }
  }

  async addManyIfNotExists(
    atts: Attendance[],
  ): Promise<{ upserted: number; matched: number }> {
    try {
      if (this.repository.addManyIfNotExists) {
        return await this.repository.addManyIfNotExists(atts);
      }
      return { upserted: 0, matched: 0 };
    } catch (e) {
      this.logger.error('Error bulk adding attendances', e as Error);
      return { upserted: 0, matched: 0 };
    }
  }
}
