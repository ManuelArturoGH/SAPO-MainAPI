import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsPositive } from 'class-validator';

export class GetAttendanceQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @Transform(({ value }) => (value === undefined ? 1 : parseInt(value, 10)))
  @IsInt()
  @IsPositive()
  @IsOptional()
  page = 1;

  @ApiPropertyOptional({ example: 25 })
  @Transform(({ value }) => (value === undefined ? 25 : parseInt(value, 10)))
  @IsInt()
  @IsPositive()
  @IsOptional()
  limit = 25;

  @ApiPropertyOptional({ example: 254 })
  @Transform(({ value }) =>
    value === undefined ? undefined : parseInt(value, 10),
  )
  @IsInt()
  @IsOptional()
  machineNumber?: number;

  @ApiPropertyOptional({ example: 100 })
  @Transform(({ value }) =>
    value === undefined ? undefined : parseInt(value, 10),
  )
  @IsInt()
  @IsOptional()
  userId?: number;

  @ApiPropertyOptional({
    example: '2025-10-01',
    description:
      'Fecha de inicio (YYYY-MM-DD o ISO). Se normaliza al inicio del día en UTC (00:00:00.000Z).',
  })
  @Transform(({ value }) => {
    if (!value) return undefined;
    const d = new Date(value);
    if (isNaN(d.getTime())) return undefined;
    d.setUTCHours(0, 0, 0, 0);
    return d;
  })
  @IsOptional()
  from?: Date;

  @ApiPropertyOptional({
    example: '2025-10-31',
    description:
      'Fecha de fin (YYYY-MM-DD o ISO). Se normaliza al final del día en UTC (23:59:59.999Z).',
  })
  @Transform(({ value }) => {
    if (!value) return undefined;
    const d = new Date(value);
    if (isNaN(d.getTime())) return undefined;
    d.setUTCHours(23, 59, 59, 999);
    return d;
  })
  @IsOptional()
  to?: Date;

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    description: 'Orden de attendanceTime',
  })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortDir?: 'asc' | 'desc';
}
