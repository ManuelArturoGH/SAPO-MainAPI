import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'Alice', description: 'Nombre del empleado' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'IT', description: 'Departamento del empleado' })
  @IsString()
  @IsNotEmpty()
  department!: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Estado activo (opcional, true por defecto)',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 'Analista',
    description: 'Puesto del empleado (opcional, por defecto "sin asignar")',
  })
  @IsString()
  @IsOptional()
  position?: string;
}
