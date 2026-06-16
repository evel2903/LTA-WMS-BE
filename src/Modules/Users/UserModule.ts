import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateUserUseCase } from '@modules/Users/Application/UseCases/CreateUserUseCase';
import { DeleteUserUseCase } from '@modules/Users/Application/UseCases/DeleteUserUseCase';
import { GetUserByIdUseCase } from '@modules/Users/Application/UseCases/GetUserByIdUseCase';
import { ListUsersUseCase } from '@modules/Users/Application/UseCases/ListUsersUseCase';
import { UpdateUserUseCase } from '@modules/Users/Application/UseCases/UpdateUserUseCase';
import { IUserRepository, USER_REPOSITORY } from '@modules/Users/Application/Interfaces/IUserRepository';
import { UserRepository } from '@modules/Users/Infrastructure/Persistence/Repositories/UserRepository';
import { UserOrmEntity } from '@modules/Users/Infrastructure/Persistence/Entities/UserOrmEntity';
import { UserController } from '@modules/Users/Presentation/Controllers/UserController';

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
