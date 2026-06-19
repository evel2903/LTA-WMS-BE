import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CreateRuleDefinitionUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateRuleDefinitionUseCase';
import { GetRuleDefinitionUseCase } from '@modules/WarehouseProfile/Application/UseCases/GetRuleDefinitionUseCase';
import { ListRuleDefinitionsUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListRuleDefinitionsUseCase';
import { CreateRuleDefinitionRequest } from '@modules/WarehouseProfile/Presentation/Requests/CreateRuleDefinitionRequest';
import { ListRuleDefinitionsQuery } from '@modules/WarehouseProfile/Presentation/Requests/ListRuleDefinitionsQuery';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('rule-definitions')
export class RuleDefinitionController {
  constructor(
    private readonly createRuleDefinitionUseCase: CreateRuleDefinitionUseCase,
    private readonly getRuleDefinitionUseCase: GetRuleDefinitionUseCase,
    private readonly listRuleDefinitionsUseCase: ListRuleDefinitionsUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.Rule)
  public async Create(@Body() request: CreateRuleDefinitionRequest) {
    return await this.createRuleDefinitionUseCase.Execute(request);
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.Rule)
  public async GetById(@Param('id') id: string) {
    return await this.getRuleDefinitionUseCase.Execute(id);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.Rule)
  public async List(@Query() query: ListRuleDefinitionsQuery) {
    return await this.listRuleDefinitionsUseCase.Execute(query);
  }
}
