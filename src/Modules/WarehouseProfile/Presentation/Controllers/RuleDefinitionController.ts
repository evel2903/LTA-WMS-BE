import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateRuleDefinitionUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateRuleDefinitionUseCase';
import { GetRuleDefinitionUseCase } from '@modules/WarehouseProfile/Application/UseCases/GetRuleDefinitionUseCase';
import { ListRuleDefinitionsUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListRuleDefinitionsUseCase';
import { CreateRuleDefinitionRequest } from '@modules/WarehouseProfile/Presentation/Requests/CreateRuleDefinitionRequest';
import { ListRuleDefinitionsQuery } from '@modules/WarehouseProfile/Presentation/Requests/ListRuleDefinitionsQuery';

@Controller('rule-definitions')
export class RuleDefinitionController {
  constructor(
    private readonly createRuleDefinitionUseCase: CreateRuleDefinitionUseCase,
    private readonly getRuleDefinitionUseCase: GetRuleDefinitionUseCase,
    private readonly listRuleDefinitionsUseCase: ListRuleDefinitionsUseCase,
  ) {}

  @Post()
  public async Create(@Body() request: CreateRuleDefinitionRequest) {
    return await this.createRuleDefinitionUseCase.Execute(request);
  }

  @Get(':id')
  public async GetById(@Param('id') id: string) {
    return await this.getRuleDefinitionUseCase.Execute(id);
  }

  @Get()
  public async List(@Query() query: ListRuleDefinitionsQuery) {
    return await this.listRuleDefinitionsUseCase.Execute(query);
  }
}
