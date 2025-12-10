import {
  Controller,
  Get,
  Query,
  Res,
  BadRequestException,
  Post,
  Body,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AttendancesService } from './attendances.service';
import { EmployeesService } from '../employees/employees.service';
import { ExternalAttendanceSyncService } from './services/external-attendance-sync.service';
import { GetAttendanceQueryDto } from './dto/get-attendance-query.dto';
import { ExportAttendanceQueryDto } from './dto/export-attendance-query.dto';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

class ManualAttendanceSyncDto {
  @IsInt() @Min(1) @Max(254) @IsOptional() machineNumber?: number;
  @IsDateString() @IsOptional() from?: string;
  @IsDateString() @IsOptional() to?: string;
}

@ApiTags('attendances')
@Controller('attendances')
export class AttendancesController {
  constructor(
    private readonly attendancesService: AttendancesService,
    private readonly employeesService: EmployeesService,
    private readonly syncService: ExternalAttendanceSyncService,
  ) {}

  // GET /attendances - Listar asistencias
  @Get()
  @ApiOperation({
    summary: 'Listar asistencias con paginación y filtros básicos',
  })
  @ApiResponse({ status: 200, description: 'Listado paginado' })
  async list(@Query() q: GetAttendanceQueryDto) {
    if (q.from && q.to && q.from > q.to) {
      throw new BadRequestException('from debe ser menor o igual a to');
    }

    const res = await this.attendancesService.getAttendances({
      page: q.page,
      limit: q.limit,
      userId: q.userId,
      machineNumber: q.machineNumber,
      from: q.from,
      to: q.to,
      sortDir: q.sortDir,
    });

    const employees = (await this.employeesService.getAllEmployees()) || [];

    const idToInfo = new Map<
      number,
      { profileImageUrl: string; name: string; position: string }
    >();
    for (const e of employees) {
      const ext = e.externalId;
      if (typeof ext === 'number')
        idToInfo.set(ext, {
          profileImageUrl: e.profile ? e.profile : '',
          name: e.name,
          position: e.position ?? 'sin asignar',
        });
    }

    return {
      data: res.data.map((a) => ({
        id: a.id,
        attendanceMachineID: a.attendanceMachineID,
        profileImageUrl: idToInfo.get(a.userId)?.profileImageUrl ?? '',
        userName: idToInfo.get(a.userId)?.name ?? String(a.userId),
        position: idToInfo.get(a.userId)?.position ?? 'sin asignar',
        attendanceTime: a.attendanceTime,
        accessMode: a.accessMode,
        attendanceStatus: a.attendanceStatus,
      })),
      meta: { total: res.total, page: res.page, limit: res.limit },
    };
  }

  // GET /attendances/export - Exportar asistencias
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

    const from = q.from;
    let to = q.to;
    if (from && !to) {
      const end = new Date(from);
      end.setUTCHours(23, 59, 59, 999);
      to = end;
    }

    const result = await this.attendancesService.getAttendances({
      page: q.page,
      limit: q.limit,
      userId: q.userId,
      machineNumber: q.machineNumber,
      from,
      to,
      sortDir: q.sortDir,
    });

    // Build userId -> { name, position } map
    const employees = (await this.employeesService.getAllEmployees()) || [];
    const idToInfo = new Map<number, { name: string; position: string }>();
    for (const e of employees) {
      const ext = e.externalId;
      if (typeof ext === 'number')
        idToInfo.set(ext, {
          name: e.name,
          position: e.position ?? 'sin asignar',
        });
    }

    const format = (q.format || 'csv').toLowerCase() as 'csv' | 'json';
    const header = [
      'id',
      'attendanceMachineID',
      'userName',
      'position',
      'attendanceTime',
      'accessMode',
      'attendanceStatus',
    ] as const;
    type RowKey = (typeof header)[number];
    type Row = Record<RowKey, string | number>;

    const rows: Row[] = result.data.map((a) => ({
      id: a.id ?? '',
      attendanceMachineID: a.attendanceMachineID,
      userName: idToInfo.get(a.userId)?.name ?? String(a.userId),
      position: idToInfo.get(a.userId)?.position ?? 'sin asignar',
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
      return rows.map((r) => ({
        id: r.id,
        attendanceMachineID: r.attendanceMachineID,
        userName: r.userName,
        position: r.position,
        attendanceTime: r.attendanceTime,
        accessMode: r.accessMode,
        attendanceStatus: r.attendanceStatus,
      }));
    }

    const csv = [
      header.join(','),
      ...rows.map((r) =>
        header
          .map((h) => String(r[h]).replace(/"/g, '""'))
          .map((v) => (/[",\n]/.test(v) ? `"${v}"` : v))
          .join(','),
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="attendances.csv"',
    );
    return csv;
  }

  // POST /attendances/sync - Sincronización manual
  @Post('sync')
  @ApiOperation({
    summary:
      'Disparar sincronización manual de asistencias (opcional: machineNumber, from, to)',
  })
  @ApiResponse({ status: 200 })
  async sync(
    @Body() dto: ManualAttendanceSyncDto,
    @Query('machineNumber') q?: string,
    @Query('from') qFrom?: string,
    @Query('to') qTo?: string,
  ) {
    const machineNumber =
      dto.machineNumber ?? (q !== undefined ? parseInt(q, 10) : undefined);
    if (q !== undefined && Number.isNaN(machineNumber))
      throw new BadRequestException('machineNumber inválido');
    const from = dto.from ?? qFrom;
    const to = dto.to ?? qTo;
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        throw new BadRequestException('from/to deben ser fechas válidas (ISO)');
      }
      if (fromDate > toDate)
        throw new BadRequestException('from debe ser menor o igual a to');
    }
    await this.syncService.triggerManual(machineNumber, from, to);
    return {
      message: 'Attendance manual sync triggered',
      machineNumber: machineNumber ?? 'all',
      from: from ?? null,
      to: to ?? null,
    };
  }
}
