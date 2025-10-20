import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoginDto } from '../dto/login.dto';
import { LoginUseCase } from '../../application/loginUseCase';
import { Public } from '../decorators/public.decorator';
import type { Request } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly loginUseCase: LoginUseCase) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({ status: 200, description: 'Login exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const user = await this.loginUseCase.execute(
      loginDto.email,
      loginDto.password,
    );

    // Crear sesión
    req.session.userId = user.id;
    req.session.createdAt = new Date();

    return {
      message: 'Login exitoso',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar sesión' })
  @ApiResponse({ status: 200, description: 'Logout exitoso' })
  async logout(@Req() req: Request) {
    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          reject(new UnauthorizedException('Error al cerrar sesión'));
        }
        resolve({ message: 'Logout exitoso' });
      });
    });
  }

  @Post('session-check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar sesión activa' })
  @ApiResponse({ status: 200, description: 'Sesión válida' })
  @ApiResponse({ status: 401, description: 'Sesión inválida o expirada' })
  async checkSession(@Req() req: Request) {
    return {
      message: 'Sesión válida',
      userId: req.session.userId,
    };
  }
}
