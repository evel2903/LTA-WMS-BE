import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CreateUomUseCase } from '@modules/MasterData/Application/UseCases/CreateUomUseCase';
import { GetUomUseCase } from '@modules/MasterData/Application/UseCases/GetUomUseCase';
import { ListUomsUseCase } from '@modules/MasterData/Application/UseCases/ListUomsUseCase';
import { UpdateUomUseCase } from '@modules/MasterData/Application/UseCases/UpdateUomUseCase';
import { CreateUomRequest } from '@modules/MasterData/Presentation/Requests/CreateUomRequest';
import { ListUomsQuery } from '@modules/MasterData/Presentation/Requests/ListUomsQuery';
import { UpdateUomRequest } from '@modules/MasterData/Presentation/Requests/UpdateUomRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('uoms')
export class UomController {
  constructor(
    private readonly createUomUseCase: CreateUomUseCase,
    private readonly getUomUseCase: GetUomUseCase,
    private readonly listUomsUseCase: ListUomsUseCase,
    private readonly updateUomUseCase: UpdateUomUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.Uom)
  public async Create(@Body() request: CreateUomRequest) {
    return await this.createUomUseCase.Execute(request);
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.Uom)
  public async GetById(@Param('id') id: string) {
    return await this.getUomUseCase.Execute(id);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.Uom)
  public async List(@Query() query: ListUomsQuery) {
    return await this.listUomsUseCase.Execute(query);
  }

  @Patch(':id')
  @RequirePermission(ActionCode.Update, ObjectType.Uom)
  public async Update(@Param('id') id: string, @Body() request: UpdateUomRequest) {
    return await this.updateUomUseCase.Execute({ Id: id, ...request });
  }
}
