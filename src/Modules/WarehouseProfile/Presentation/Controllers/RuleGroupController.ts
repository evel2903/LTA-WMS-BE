import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CreateRuleGroupUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateRuleGroupUseCase';
import { GetRuleGroupUseCase } from '@modules/WarehouseProfile/Application/UseCases/GetRuleGroupUseCase';
import { ListRuleGroupsUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListRuleGroupsUseCase';
import { CreateRuleGroupRequest } from '@modules/WarehouseProfile/Presentation/Requests/CreateRuleGroupRequest';
import { ListRuleGroupsQuery } from '@modules/WarehouseProfile/Presentation/Requests/ListRuleGroupsQuery';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('rule-groups')
export class RuleGroupController {
  constructor(
    private readonly createRuleGroupUseCase: CreateRuleGroupUseCase,
    private readonly getRuleGroupUseCase: GetRuleGroupUseCase,
    private readonly listRuleGroupsUseCase: ListRuleGroupsUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.Rule)
  public async Create(@Body() request: CreateRuleGroupRequest) {
    return await this.createRuleGroupUseCase.Execute(request);
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.Rule)
  public async GetById(@Param('id') id: string) {
    return await this.getRuleGroupUseCase.Execute(id);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.Rule)
  public async List(@Query() query: ListRuleGroupsQuery) {
    return await this.listRuleGroupsUseCase.Execute(query);
  }
}
