import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CreateOwnerUseCase } from '@modules/MasterData/Application/UseCases/CreateOwnerUseCase';
import { GetOwnerUseCase } from '@modules/MasterData/Application/UseCases/GetOwnerUseCase';
import { ListOwnersUseCase } from '@modules/MasterData/Application/UseCases/ListOwnersUseCase';
import { UpdateOwnerUseCase } from '@modules/MasterData/Application/UseCases/UpdateOwnerUseCase';
import { CreateOwnerRequest } from '@modules/MasterData/Presentation/Requests/CreateOwnerRequest';
import { ListOwnersQuery } from '@modules/MasterData/Presentation/Requests/ListOwnersQuery';
import { UpdateOwnerRequest } from '@modules/MasterData/Presentation/Requests/UpdateOwnerRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('owners')
export class OwnerController {
  constructor(
    private readonly createOwnerUseCase: CreateOwnerUseCase,
    private readonly getOwnerUseCase: GetOwnerUseCase,
    private readonly listOwnersUseCase: ListOwnersUseCase,
    private readonly updateOwnerUseCase: UpdateOwnerUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.Owner)
  public async Create(@Body() request: CreateOwnerRequest) {
    return await this.createOwnerUseCase.Execute(request);
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.Owner)
  public async GetById(@Param('id') id: string) {
    return await this.getOwnerUseCase.Execute(id);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.Owner)
  public async List(@Query() query: ListOwnersQuery) {
    return await this.listOwnersUseCase.Execute(query);
  }

  @Patch(':id')
  @RequirePermission(ActionCode.Update, ObjectType.Owner)
  public async Update(@Param('id') id: string, @Body() request: UpdateOwnerRequest) {
    return await this.updateOwnerUseCase.Execute({ Id: id, ...request });
  }
}
