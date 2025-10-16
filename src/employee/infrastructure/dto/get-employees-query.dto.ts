/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetEmployeesQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Número de página (>=1)' })
  @Transform(({ value }) => (value === undefined ? 1 : parseInt(value, 10)))
  @IsInt()
  @IsPositive()
  @IsOptional()
  page = 1;

  @ApiPropertyOptional({
    example: 25,
    description: 'Límite por página (1-100)',
  })
  @Transform(({ value }) => (value === undefined ? 25 : parseInt(value, 10)))
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 25;

  @ApiPropertyOptional({
    example: 'IT',
    description: 'Filtrar por departamento',
  })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Filtrar por estado activo',
  })
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    enum: ['name', 'department', 'createdAt'],
    description: 'Campo de ordenamiento',
  })
  @IsIn(['name', 'department', 'createdAt'])
  @IsOptional()
  sortBy?: 'name' | 'department' | 'createdAt';

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    description: 'Dirección de ordenamiento',
  })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortDir?: 'asc' | 'desc';

  @ApiPropertyOptional({
    example: 'Analista',
    description: 'Filtrar por puesto (position)',
  })
  @IsString()
  @IsOptional()
  position?: string;
}
