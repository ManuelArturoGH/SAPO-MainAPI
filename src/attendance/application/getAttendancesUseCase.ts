import { Inject, Injectable, Logger } from '@nestjs/common';
import type { AttendanceRepository } from '../domain/interfaces/attendanceRepository';
import { Attendance } from '../domain/models/attendance';

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
export class GetAttendancesUseCase {
  private readonly logger = new Logger(GetAttendancesUseCase.name);
  constructor(
    @Inject('AttendanceRepository') private readonly repo: AttendanceRepository,
  ) {}

  async execute(
    params: GetAttendanceParams = {},
  ): Promise<PaginatedAttendances> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 25;
    const sortDir =
      params.sortDir === 'asc' || params.sortDir === 'desc'
        ? params.sortDir
        : 'desc';

    try {
      return await this.repo.getAttendances({
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
}
