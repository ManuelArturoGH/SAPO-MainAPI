import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ description: 'ID del usuario' })
  id: string;

  @ApiProperty({ description: 'Email del usuario' })
  email: string;

  @ApiProperty({ description: 'Nombre del usuario' })
  name: string;

  @ApiProperty({ description: 'Rol del usuario' })
  role: string;

  @ApiProperty({ description: 'Estado activo del usuario' })
  isActive: boolean;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'Mensaje de respuesta' })
  message: string;

  @ApiProperty({
    description: 'Datos del usuario autenticado',
    type: UserResponseDto,
  })
  user: UserResponseDto;

  @ApiProperty({ description: 'Token de acceso JWT' })
  accessToken: string;
}

export class SessionResponseDto {
  @ApiProperty({ description: 'Si la sesión está activa' })
  authenticated: boolean;

  @ApiProperty({
    description: 'Datos del usuario si está autenticado',
    type: UserResponseDto,
    required: false,
  })
  user?: UserResponseDto;
}

export class LogoutResponseDto {
  @ApiProperty({ description: 'Mensaje de respuesta' })
  message: string;
}
