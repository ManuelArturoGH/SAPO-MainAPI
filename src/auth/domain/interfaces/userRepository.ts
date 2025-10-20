import { User } from '../models/user';

export interface UserRepository {
  create(user: User): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  update(id: string, user: User): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}
