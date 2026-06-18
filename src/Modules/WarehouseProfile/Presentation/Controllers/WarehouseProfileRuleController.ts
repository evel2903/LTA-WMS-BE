import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { AddWarehouseProfileRuleUseCase } from '@modules/WarehouseProfile/Application/UseCases/AddWarehouseProfileRuleUseCase';
import { ListWarehouseProfileRulesUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListWarehouseProfileRulesUseCase';
import { RemoveWarehouseProfileRuleUseCase } from '@modules/WarehouseProfile/Application/UseCases/RemoveWarehouseProfileRuleUseCase';
import { AddWarehouseProfileRuleRequest } from '@modules/WarehouseProfile/Presentation/Requests/AddWarehouseProfileRuleRequest';
import { ListWarehouseProfileRulesQuery } from '@modules/WarehouseProfile/Presentation/Requests/ListWarehouseProfileRulesQuery';

@Controller('warehouse-profiles/:id/rules')
export class WarehouseProfileRuleController {
  constructor(
    private readonly addWarehouseProfileRuleUseCase: AddWarehouseProfileRuleUseCase,
    private readonly listWarehouseProfileRulesUseCase: ListWarehouseProfileRulesUseCase,
    private readonly removeWarehouseProfileRuleUseCase: RemoveWarehouseProfileRuleUseCase,
  ) {}

  @Post()
  public async Create(@Param('id') id: string, @Body() request: AddWarehouseProfileRuleRequest) {
    return await this.addWarehouseProfileRuleUseCase.Execute({ WarehouseProfileId: id, ...request });
  }

  @Get()
  public async List(@Param('id') id: string, @Query() query: ListWarehouseProfileRulesQuery) {
    return await this.listWarehouseProfileRulesUseCase.Execute(id, query);
  }

  @Delete(':ruleId')
  @HttpCode(204)
  public async Remove(@Param('id') id: string, @Param('ruleId') ruleId: string) {
    await this.removeWarehouseProfileRuleUseCase.Execute(id, ruleId);
  }
}
