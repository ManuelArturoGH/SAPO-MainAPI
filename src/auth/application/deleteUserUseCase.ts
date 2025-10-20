import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import type { UserRepository } from '../domain/interfaces/userRepository';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject('UserRepository') private readonly userRepository: UserRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const deleted = await this.userRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException('Usuario no encontrado');
    }
  }
}
