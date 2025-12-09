import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateEmployeeDepartmentDto {
  @ApiProperty({
    example: 'Finance',
    description: 'Departamento del empleado',
  })
  @IsString()
  @MaxLength(100)
  department: string;
}
