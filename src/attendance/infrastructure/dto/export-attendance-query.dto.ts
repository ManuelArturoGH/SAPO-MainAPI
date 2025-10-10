import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';
import { GetAttendanceQueryDto } from './get-attendance-query.dto';

export class ExportAttendanceQueryDto extends GetAttendanceQueryDto {
  @ApiPropertyOptional({ enum: ['csv', 'json'], default: 'csv' })
  @Transform(({ value }) => (typeof value === 'string' && value.length ? value.toLowerCase() : 'csv'))
  @IsIn(['csv', 'json'])
  @IsOptional()
  format?: 'csv' | 'json';
}
