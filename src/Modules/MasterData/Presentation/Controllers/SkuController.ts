import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateSkuUseCase } from '@modules/MasterData/Application/UseCases/CreateSkuUseCase';
import { GetSkuUseCase } from '@modules/MasterData/Application/UseCases/GetSkuUseCase';
import { GetSkuRuleFactsUseCase } from '@modules/MasterData/Application/UseCases/GetSkuRuleFactsUseCase';
import { ListSkusUseCase } from '@modules/MasterData/Application/UseCases/ListSkusUseCase';
import { UpdateSkuUseCase } from '@modules/MasterData/Application/UseCases/UpdateSkuUseCase';
import { CreateSkuRequest } from '@modules/MasterData/Presentation/Requests/CreateSkuRequest';
import { ListSkusQuery } from '@modules/MasterData/Presentation/Requests/ListSkusQuery';
import { UpdateSkuRequest } from '@modules/MasterData/Presentation/Requests/UpdateSkuRequest';

@Controller('skus')
export class SkuController {
  constructor(
    private readonly createSkuUseCase: CreateSkuUseCase,
    private readonly getSkuUseCase: GetSkuUseCase,
    private readonly getSkuRuleFactsUseCase: GetSkuRuleFactsUseCase,
    private readonly listSkusUseCase: ListSkusUseCase,
    private readonly updateSkuUseCase: UpdateSkuUseCase,
  ) {}

  @Post()
  public async Create(@Body() request: CreateSkuRequest) {
    return await this.createSkuUseCase.Execute(request);
  }

  @Get(':id/rule-facts')
  public async GetRuleFacts(@Param('id') id: string) {
    return await this.getSkuRuleFactsUseCase.Execute(id);
  }

  @Get(':id')
  public async GetById(@Param('id') id: string) {
    return await this.getSkuUseCase.Execute(id);
  }

  @Get()
  public async List(@Query() query: ListSkusQuery) {
    return await this.listSkusUseCase.Execute(query);
  }

  @Patch(':id')
  public async Update(@Param('id') id: string, @Body() request: UpdateSkuRequest) {
    return await this.updateSkuUseCase.Execute({ Id: id, ...request });
  }
}
