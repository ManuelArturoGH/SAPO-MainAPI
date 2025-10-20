import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Verificar si la ruta es pública
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(),
    );
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const session = request.session;

    if (!session || !session.userId) {
      throw new UnauthorizedException('No estás autenticado');
    }

    // Verificar que la sesión no haya expirado (1 hora)
    const now = new Date().getTime();
    const sessionCreatedAt = new Date(session.createdAt).getTime();
    const oneHourInMs = 60 * 60 * 1000;

    if (now - sessionCreatedAt > oneHourInMs) {
      request.session.destroy();
      throw new UnauthorizedException('La sesión ha expirado');
    }

    return true;
  }
}
