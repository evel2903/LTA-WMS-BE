import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateUserUseCase } from '../../Application/UseCases/CreateUserUseCase';
import { DeleteUserUseCase } from '../../Application/UseCases/DeleteUserUseCase';
import { GetUserByIdUseCase } from '../../Application/UseCases/GetUserByIdUseCase';
import { ListUsersUseCase } from '../../Application/UseCases/ListUsersUseCase';
import { UpdateUserUseCase } from '../../Application/UseCases/UpdateUserUseCase';
import { CreateUserRequest } from '../Requests/CreateUserRequest';
import { ListUsersQuery } from '../Requests/ListUsersQuery';
import { UpdateUserRequest } from '../Requests/UpdateUserRequest';

@Controller('users')
export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) {}

  @Post()
  public async Create(@Body() request: CreateUserRequest) {
    return await this.createUserUseCase.Execute(request);
  }

  @Get(':id')
  public async GetById(@Param('id') id: string) {
    return await this.getUserByIdUseCase.Execute(id);
  }

  @Get()
  public async List(@Query() query: ListUsersQuery) {
    return await this.listUsersUseCase.Execute(query);
  }

  @Patch(':id')
  public async Update(@Param('id') id: string, @Body() request: UpdateUserRequest) {
    return await this.updateUserUseCase.Execute({ Id: id, ...request });
  }

  @Delete(':id')
  public async Delete(@Param('id') id: string) {
    await this.deleteUserUseCase.Execute(id);
    return { Deleted: true };
  }
}
