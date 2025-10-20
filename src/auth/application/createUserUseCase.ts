import { Injectable, ConflictException, Inject } from '@nestjs/common';
import type { UserRepository } from '../domain/interfaces/userRepository';
import { User } from '../domain/models/user';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject('UserRepository') private readonly userRepository: UserRepository,
  ) {}

  async execute(name: string, email: string, password: string): Promise<User> {
    // Verificar si el email ya existe
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const user = User.createNew(name, email, hashedPassword);
    return await this.userRepository.create(user);
  }
}
