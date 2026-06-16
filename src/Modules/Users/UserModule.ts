import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateUserUseCase } from './Application/UseCases/CreateUserUseCase';
import { DeleteUserUseCase } from './Application/UseCases/DeleteUserUseCase';
import { GetUserByIdUseCase } from './Application/UseCases/GetUserByIdUseCase';
import { ListUsersUseCase } from './Application/UseCases/ListUsersUseCase';
import { UpdateUserUseCase } from './Application/UseCases/UpdateUserUseCase';
import { IUserRepository, USER_REPOSITORY } from './Domain/Interfaces/IUserRepository';
import { UserRepository } from './Infrastructure/Persistence/Repositories/UserRepository';
import { UserOrmEntity } from './Infrastructure/Persistence/Entities/UserOrmEntity';
import { UserController } from './Presentation/Controllers/UserController';

@Module({
  imports: [TypeOrmModule.forFeature([UserOrmEntity])],
  controllers: [UserController],
  providers: [
    { provide: USER_REPOSITORY, useClass: UserRepository },
    {
      provide: CreateUserUseCase,
      useFactory: (repo: IUserRepository) => new CreateUserUseCase(repo),
      inject: [USER_REPOSITORY],
    },
    {
      provide: GetUserByIdUseCase,
      useFactory: (repo: IUserRepository) => new GetUserByIdUseCase(repo),
      inject: [USER_REPOSITORY],
    },
    {
      provide: ListUsersUseCase,
      useFactory: (repo: IUserRepository) => new ListUsersUseCase(repo),
      inject: [USER_REPOSITORY],
    },
    {
      provide: UpdateUserUseCase,
      useFactory: (repo: IUserRepository) => new UpdateUserUseCase(repo),
      inject: [USER_REPOSITORY],
    },
    {
      provide: DeleteUserUseCase,
      useFactory: (repo: IUserRepository) => new DeleteUserUseCase(repo),
      inject: [USER_REPOSITORY],
    },
  ],
  exports: [USER_REPOSITORY],
})
export class UserModule {}
