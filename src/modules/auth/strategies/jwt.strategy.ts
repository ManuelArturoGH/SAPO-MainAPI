import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService, JwtPayload } from '../auth.service';
import { Request } from 'express';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Primero intenta extraer del header Authorization
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // Luego intenta extraer de la cookie
        (request: Request): string | null => {
          const cookies = request?.cookies as
            | { access_token?: string }
            | undefined;
          return cookies?.access_token ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_SECRET || 'sapo-secret-key-change-in-production',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.authService.validateToken(payload);
    if (!user) {
      throw new UnauthorizedException('Token inválido o usuario inactivo');
    }
    return user.toSafeObject() as AuthenticatedUser;
  }
}
