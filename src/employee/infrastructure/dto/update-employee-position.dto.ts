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
      if (typeof (value as { value: any }).value === 'string')
        return (value as { value: string }).value.trim();
      if (typeof (value as { label: any }).label === 'string')
        return (value as { label: string }).label.trim();
    }
    return String(value ?? '').trim();
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  position!: string;
}
