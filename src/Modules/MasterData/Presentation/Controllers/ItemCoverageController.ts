import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateItemCoverageUseCase } from '@modules/MasterData/Application/UseCases/CreateItemCoverageUseCase';
import { GetItemCoverageUseCase } from '@modules/MasterData/Application/UseCases/GetItemCoverageUseCase';
import { ListItemCoveragesUseCase } from '@modules/MasterData/Application/UseCases/ListItemCoveragesUseCase';
import { UpdateItemCoverageUseCase } from '@modules/MasterData/Application/UseCases/UpdateItemCoverageUseCase';
import { CreateItemCoverageRequest } from '@modules/MasterData/Presentation/Requests/CreateItemCoverageRequest';
import { ListItemCoverageQuery } from '@modules/MasterData/Presentation/Requests/ListItemCoverageQuery';
import { UpdateItemCoverageRequest } from '@modules/MasterData/Presentation/Requests/UpdateItemCoverageRequest';

@Controller('item-coverages')
export class ItemCoverageController {
  constructor(
    private readonly createItemCoverageUseCase: CreateItemCoverageUseCase,
    private readonly getItemCoverageUseCase: GetItemCoverageUseCase,
    private readonly listItemCoveragesUseCase: ListItemCoveragesUseCase,
    private readonly updateItemCoverageUseCase: UpdateItemCoverageUseCase,
  ) {}

  @Post()
  public async Create(@Body() request: CreateItemCoverageRequest) {
    return await this.createItemCoverageUseCase.Execute(request);
  }

  @Get(':id')
  public async GetById(@Param('id') id: string) {
    return await this.getItemCoverageUseCase.Execute(id);
  }

  @Get()
  public async List(@Query() query: ListItemCoverageQuery) {
    return await this.listItemCoveragesUseCase.Execute(query);
  }

  @Patch(':id')
  public async Update(@Param('id') id: string, @Body() request: UpdateItemCoverageRequest) {
    return await this.updateItemCoverageUseCase.Execute({ Id: id, ...request });
  }
}
