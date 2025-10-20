import { Injectable, Inject } from '@nestjs/common';
import type { UserRepository } from '../domain/interfaces/userRepository';
import { User } from '../domain/models/user';

@Injectable()
export class GetUsersUseCase {
  constructor(
    @Inject('UserRepository') private readonly userRepository: UserRepository,
  ) {}

  async execute(): Promise<User[]> {
    return await this.userRepository.findAll();
  }
}
