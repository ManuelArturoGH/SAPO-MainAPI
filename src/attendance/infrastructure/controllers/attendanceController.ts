import {
  Controller,
  Get,
  Query,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { GetAttendancesUseCase } from '../../application/getAttendancesUseCase';
import { GetAttendanceQueryDto } from '../dto/get-attendance-query.dto';
import { ExportAttendanceQueryDto } from '../dto/export-attendance-query.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

@ApiTags('attendances')
@Controller('attendances')
export class AttendanceController {
  constructor(private readonly listUseCase: GetAttendancesUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Listar asistencias con paginación y filtros básicos',
  })
  @ApiResponse({ status: 200, description: 'Listado paginado' })
  async list(@Query() q: GetAttendanceQueryDto) {
    if (q.from && q.to && q.from > q.to) {
      throw new BadRequestException('from debe ser menor o igual a to');
    }
    const res = await this.listUseCase.execute({
      page: q.page,
      limit: q.limit,
      userId: q.userId,
      machineNumber: q.machineNumber,
      from: q.from,
      to: q.to,
      sortDir: q.sortDir,
    });
    return {
      data: res.data.map((a) => ({
        id: a.id,
        attendanceMachineID: a.attendanceMachineID,
        userId: a.userId,
        attendanceTime: a.attendanceTime,
        accessMode: a.accessMode,
        attendanceStatus: a.attendanceStatus,
      })),
      meta: { total: res.total, page: res.page, limit: res.limit },
    };
  }

  @Get('export')
  @ApiOperation({ summary: 'Exportar asistencias a CSV o JSON' })
  @ApiResponse({ status: 200, description: 'Archivo exportado' })
  async export(
    @Query() q: ExportAttendanceQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (q.from && q.to && q.from > q.to) {
      throw new BadRequestException('from debe ser menor o igual a to');
    }

    // Ensure day-range behavior: if only from is given, use same-day end for to
    let from = q.from;
    let to = q.to;
    if (from && !to) {
      const end = new Date(from);
      end.setUTCHours(23, 59, 59, 999);
      to = end;
    }

    const result = await this.listUseCase.execute({
      page: q.page,
      limit: q.limit,
      userId: q.userId,
      machineNumber: q.machineNumber,
      from,
      to,
      sortDir: q.sortDir,
    });

    const format = (q.format || 'csv').toLowerCase() as 'csv' | 'json';
    const header = [
      'id',
      'attendanceMachineID',
      'userId',
      'attendanceTime',
      'accessMode',
      'attendanceStatus',
    ] as const;
    type RowKey = (typeof header)[number];
    type Row = Record<RowKey, string | number>;

    const rows: Row[] = result.data.map((a) => ({
      id: a.id ?? '',
      attendanceMachineID: a.attendanceMachineID,
      userId: a.userId,
      attendanceTime: a.attendanceTime.toISOString(),
      accessMode: a.accessMode,
      attendanceStatus: a.attendanceStatus,
    }));

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="attendances.json"',
      );
      return rows;
    }

    const csv = [
      header.join(','),
      ...rows.map((r) =>
        header
          .map((h) => String(r[h]).replace(/"/g, '""'))
          .map((v) => (/,|\n|"/.test(v) ? `"${v}"` : v))
          .join(','),
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="attendances.csv"',
    );
    return csv;
  }
}
