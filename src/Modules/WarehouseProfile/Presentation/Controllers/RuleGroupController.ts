import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateRuleGroupUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateRuleGroupUseCase';
import { GetRuleGroupUseCase } from '@modules/WarehouseProfile/Application/UseCases/GetRuleGroupUseCase';
import { ListRuleGroupsUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListRuleGroupsUseCase';
import { CreateRuleGroupRequest } from '@modules/WarehouseProfile/Presentation/Requests/CreateRuleGroupRequest';
import { ListRuleGroupsQuery } from '@modules/WarehouseProfile/Presentation/Requests/ListRuleGroupsQuery';

@Controller('rule-groups')
export class RuleGroupController {
  constructor(
    private readonly createRuleGroupUseCase: CreateRuleGroupUseCase,
    private readonly getRuleGroupUseCase: GetRuleGroupUseCase,
    private readonly listRuleGroupsUseCase: ListRuleGroupsUseCase,
  ) {}

  @Post()
  public async Create(@Body() request: CreateRuleGroupRequest) {
    return await this.createRuleGroupUseCase.Execute(request);
  }

  @Get(':id')
  public async GetById(@Param('id') id: string) {
    return await this.getRuleGroupUseCase.Execute(id);
  }

  @Get()
  public async List(@Query() query: ListRuleGroupsQuery) {
    return await this.listRuleGroupsUseCase.Execute(query);
  }
}
