import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEmployeeDto {
  @ApiPropertyOptional({
    example: 'Alice Smith',
    description: 'Nuevo nombre (opcional)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'Finance',
    description: 'Nuevo departamento (opcional)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Estado activo (opcional)',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 'Supervisor',
    description: 'Nuevo puesto (opcional)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  position?: string;
}
