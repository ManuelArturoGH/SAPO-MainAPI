/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsIP, IsOptional, Max, Min } from 'class-validator';
export class GetDevicesQueryDto {
  @Transform(({ value }) => (value === undefined ? 1 : parseInt(value, 10)))
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @Transform(({ value }) => (value === undefined ? 25 : parseInt(value, 10)))
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 25;

  @ApiPropertyOptional({ example: '192.168.1.111' })
  @IsIP(4)
  @IsOptional()
  ip?: string;

  @ApiPropertyOptional({ example: 502, description: 'Filtrar por puerto' })
  @Transform(({ value }) =>
    value === undefined ? undefined : parseInt(value, 10),
  )
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  port?: number;

  @Transform(({ value }) =>
    value === undefined ? undefined : parseInt(value, 10),
  )
  @ApiPropertyOptional({
    example: 7,
    description: 'Filtrar por número de máquina',
  })
  @IsInt()
  @Min(1)
  @Max(254)
  @IsOptional()
  machineNumber?: number;
}
