import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import type { UserRepository } from '../domain/interfaces/userRepository';
import { User } from '../domain/models/user';

@Injectable()
export class GetUserByIdUseCase {
  constructor(
    @Inject('UserRepository') private readonly userRepository: UserRepository,
  ) {}

  async execute(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }
}
