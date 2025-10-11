import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UpdateEmployeePositionDto {
  @ApiProperty({
    example: 'Supervisor',
    description: 'Nuevo puesto del empleado',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.trim();
    if (value && typeof value === 'object') {
      if (typeof value.value === 'string') return value.value.trim();
      if (typeof value.label === 'string') return value.label.trim();
    }
    return String(value ?? '').trim();
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  position!: string;
}
