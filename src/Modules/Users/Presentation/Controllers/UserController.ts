import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CreateUserUseCase } from '@modules/Users/Application/UseCases/CreateUserUseCase';
import { DeleteUserUseCase } from '@modules/Users/Application/UseCases/DeleteUserUseCase';
import { GetUserByIdUseCase } from '@modules/Users/Application/UseCases/GetUserByIdUseCase';
import { ListUsersUseCase } from '@modules/Users/Application/UseCases/ListUsersUseCase';
import { UpdateUserUseCase } from '@modules/Users/Application/UseCases/UpdateUserUseCase';
import { CreateUserRequest } from '@modules/Users/Presentation/Requests/CreateUserRequest';
import { ListUsersQuery } from '@modules/Users/Presentation/Requests/ListUsersQuery';
import { UpdateUserRequest } from '@modules/Users/Presentation/Requests/UpdateUserRequest';

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

  // The user roster carries PII and backs the admin-only RBAC assignment screen (C10),
  // so reading it requires the same permission as managing assignments. Other /users
  // endpoints retain their pre-existing access model (tracked separately).
  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(ActionCode.Read, ObjectType.UserAssignment)
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
