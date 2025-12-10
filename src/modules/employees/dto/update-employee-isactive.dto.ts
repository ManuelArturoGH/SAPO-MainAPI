import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateEmployeeIsActiveDto {
  @ApiProperty({
    example: false,
    description: 'Estado activo del empleado',
  })
  @IsBoolean()
  isActive: boolean;
}
