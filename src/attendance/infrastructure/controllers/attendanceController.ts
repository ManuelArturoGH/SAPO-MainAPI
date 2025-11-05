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
import { GetAllEmployeeUseCase } from '../../../employee/application/getAllEmployeeUseCase';

@ApiTags('attendances')
@Controller('attendances')
export class AttendanceController {
  constructor(
    private readonly listUseCase: GetAttendancesUseCase,
    private readonly getAllEmployeesUseCase: GetAllEmployeeUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Listar asistencias con paginación y filtros básicos',
  })
  @ApiResponse({ status: 200, description: 'Listado paginado' })
  async list(@Query() q: GetAttendanceQueryDto) {
    console.log('🔵 [AttendanceController.list] INICIO - Petición recibida');
    console.log(
      '🔵 [AttendanceController.list] Query params:',
      JSON.stringify(q),
    );

    if (q.from && q.to && q.from > q.to) {
      console.log('🔴 [AttendanceController.list] ERROR - from > to');
      throw new BadRequestException('from debe ser menor o igual a to');
    }

    console.log('🔵 [AttendanceController.list] Ejecutando listUseCase...');
    const res = await this.listUseCase.execute({
      page: q.page,
      limit: q.limit,
      userId: q.userId,
      machineNumber: q.machineNumber,
      from: q.from,
      to: q.to,
      sortDir: q.sortDir,
    });
    console.log(
      '🔵 [AttendanceController.list] Resultado del use case - Total:',
      res.total,
      'Items:',
      res.data.length,
    );

    // Map userId -> { name, position} using employees.externalId
    console.log('🔵 [AttendanceController.list] Obteniendo empleados...');
    const employees = (await this.getAllEmployeesUseCase.execute()) || [];
    console.log(
      '🔵 [AttendanceController.list] Empleados obtenidos:',
      employees.length,
    );

    const idToInfo = new Map<number, { name: string; position: string }>();
    for (const e of employees) {
      const ext = e.externalId;
      if (typeof ext === 'number')
        idToInfo.set(ext, {
          name: e.name,
          position: e.position ?? 'sin asignar',
        });
    }

    console.log('🔵 [AttendanceController.list] Mapeando datos...');
    const result = {
      data: res.data.map((a) => ({
        id: a.id,
        attendanceMachineID: a.attendanceMachineID,
        userName: idToInfo.get(a.userId)?.name ?? String(a.userId),
        position: idToInfo.get(a.userId)?.position ?? 'sin asignar',
        attendanceTime: a.attendanceTime,
        accessMode: a.accessMode,
        attendanceStatus: a.attendanceStatus,
      })),
      meta: { total: res.total, page: res.page, limit: res.limit },
    };
    console.log(
      '🟢 [AttendanceController.list] FIN - Retornando respuesta con',
      result.data.length,
      'registros',
    );
    return result;
  }

  @Get('export')
  @ApiOperation({ summary: 'Exportar asistencias a CSV o JSON' })
  @ApiResponse({ status: 200, description: 'Archivo exportado' })
  async export(
    @Query() q: ExportAttendanceQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log('🔵 [AttendanceController.export] INICIO - Petición recibida');
    console.log(
      '🔵 [AttendanceController.export] Query params:',
      JSON.stringify(q),
    );

    if (q.from && q.to && q.from > q.to) {
      console.log('🔴 [AttendanceController.export] ERROR - from > to');
      throw new BadRequestException('from debe ser menor o igual a to');
    }

    // Ensure day-range behavior: if only from is given, use same-day end for to
    const from = q.from;
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

    // Build userId -> { name, position } map
    const employees = (await this.getAllEmployeesUseCase.execute()) || [];
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
      // Return only selected keys in header order for JSON consistency
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

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="attendances.csv"',
    );
    return csv;
  }
}
