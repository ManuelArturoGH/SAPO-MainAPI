import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import type { UserRepository } from '../domain/interfaces/userRepository';
import { User } from '../domain/models/user';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UpdateUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(
    id: string,
    data: Partial<{ name: string; email: string; password: string }>,
  ): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Si se está actualizando el email, verificar que no exista
    if (data.email && data.email !== user.email) {
      const existingUser = await this.userRepository.findByEmail(data.email);
      if (existingUser) {
        throw new ConflictException('El email ya está registrado');
      }
    }

    // Si se está actualizando la contraseña, hashearla
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    user.update(data);
    const updatedUser = await this.userRepository.update(id, user);
    if (!updatedUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return updatedUser;
  }
}
