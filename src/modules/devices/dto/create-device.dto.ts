import { ApiProperty } from '@nestjs/swagger';
import { IsIP, IsInt, Max, Min } from 'class-validator';

export class CreateDeviceDto {
  @ApiProperty({
    example: '192.168.1.111',
    description: 'Dirección IPv4 del dispositivo',
  })
  @IsIP(4)
  ip!: string;

  @ApiProperty({
    example: 502,
    description: 'Puerto TCP del dispositivo',
    minimum: 1,
    maximum: 65535,
  })
  @IsInt()
  @Min(1)
  @Max(65535)
  port!: number;

  @ApiProperty({
    example: 7,
    description: 'Número de máquina (1-254)',
    minimum: 1,
    maximum: 254,
  })
  @IsInt()
  @Min(1)
  @Max(254)
  machineNumber!: number;
}
