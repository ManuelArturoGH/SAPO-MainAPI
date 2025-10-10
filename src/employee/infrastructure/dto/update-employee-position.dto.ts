import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateEmployeePositionDto {
  @ApiProperty({
    example: 'Supervisor',
    description: 'Nuevo puesto del empleado',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  position!: string;
}
