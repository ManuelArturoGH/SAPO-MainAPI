import { Module } from '@nestjs/common';
import { AuthController } from './infrastructure/controllers/authController';
import { UserController } from './infrastructure/controllers/userController';
import { MongoUserRepository } from './infrastructure/repositories/MongoUserRepository';
import { CreateUserUseCase } from './application/createUserUseCase';
import { LoginUseCase } from './application/loginUseCase';
import { GetUsersUseCase } from './application/getUsersUseCase';
import { GetUserByIdUseCase } from './application/getUserByIdUseCase';
import { UpdateUserUseCase } from './application/updateUserUseCase';
import { DeleteUserUseCase } from './application/deleteUserUseCase';
import { AuthGuard } from './infrastructure/guards/auth.guard';

@Module({
  controllers: [AuthController, UserController],
  providers: [
    { provide: 'UserRepository', useClass: MongoUserRepository },
    CreateUserUseCase,
    LoginUseCase,
    GetUsersUseCase,
    GetUserByIdUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    AuthGuard,
  ],
  exports: [AuthGuard],
})
export class AuthModule {}
