import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import {
  LoginResponseDto,
  SessionResponseDto,
  LogoutResponseDto,
} from './dto/auth-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión con email y contraseña' })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponseDto> {
    const { user, accessToken } = await this.authService.login(loginDto);

    const isProduction = process.env.NODE_ENV === 'production';

    // Para desarrollo cross-origin: COOKIE_SAME_SITE=none y COOKIE_SECURE=true
    // Esto requiere HTTPS incluso en desarrollo
    const sameSite =
      (process.env.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none') ||
      (isProduction ? 'none' : 'lax');
    const secure = process.env.COOKIE_SECURE === 'true' || isProduction;

    // Configurar cookie para que funcione con CORS
    response.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: secure,
      sameSite: sameSite,
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
      path: '/',
    });

    return {
      message: 'Login exitoso',
      user: {
        id: user.id!,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      },
      accessToken,
    };
  }

  @Get('session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verificar si la sesión está activa' })
  @ApiResponse({
    status: 200,
    description: 'Sesión activa',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  checkSession(@CurrentUser() user: AuthenticatedUser): SessionResponseDto {
    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      },
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar sesión' })
  @ApiResponse({
    status: 200,
    description: 'Logout exitoso',
    type: LogoutResponseDto,
  })
  logout(@Res({ passthrough: true }) response: Response): LogoutResponseDto {
    response.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return {
      message: 'Sesión cerrada exitosamente',
    };
  }
}
