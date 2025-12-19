import {
  Injectable,
  UnauthorizedException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from './auth.repository';
import { User } from './entities/user.entity';
import { LoginDto } from './dto/login.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    await this.authRepository.ensureIndexes();
    await this.createDefaultAdminIfNotExists();
  }

  private async createDefaultAdminIfNotExists(): Promise<void> {
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@sapo.com';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

    const existingAdmin = await this.authRepository.findByEmail(adminEmail);
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const adminUser = User.createNew(
        adminEmail,
        hashedPassword,
        'Administrador',
        'admin',
        true,
      );
      await this.authRepository.create(adminUser);
      this.logger.log(`Usuario admin creado: ${adminEmail}`);
    }
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.authRepository.findByEmail(email);
    if (!user) return null;

    if (!user.isActive) return null;

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) return null;

    return user;
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ user: User; accessToken: string }> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: JwtPayload = {
      sub: user.id!,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      user,
      accessToken,
    };
  }

  async validateToken(payload: JwtPayload): Promise<User | null> {
    const user = await this.authRepository.findById(payload.sub);
    if (!user || !user.isActive) return null;
    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.authRepository.findById(id);
  }
}
