import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Query,
} from '@nestjs/common';
import { ExternalAttendanceSyncService } from '../services/external-attendance-sync.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

class ManualAttendanceSyncDto {
  @IsInt() @Min(1) @Max(254) @IsOptional() machineNumber?: number;
  @IsDateString() @IsOptional() from?: string;
  @IsDateString() @IsOptional() to?: string;
}

@ApiTags('attendances')
@Controller('attendances/sync')
export class AttendanceSyncController {
  constructor(private readonly svc: ExternalAttendanceSyncService) {}

  @Post()
  @ApiOperation({
    summary:
      'Disparar sincronización manual de asistencias (opcional: machineNumber, from, to)',
  })
  @ApiResponse({ status: 200 })
  async run(
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
    await this.svc.triggerManual(machineNumber, from, to);
    return {
      message: 'Attendance manual sync triggered',
      machineNumber: machineNumber ?? 'all',
      from: from ?? null,
      to: to ?? null,
    };
  }
}
