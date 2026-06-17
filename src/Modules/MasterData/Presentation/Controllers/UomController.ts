import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateUomUseCase } from '@modules/MasterData/Application/UseCases/CreateUomUseCase';
import { GetUomUseCase } from '@modules/MasterData/Application/UseCases/GetUomUseCase';
import { ListUomsUseCase } from '@modules/MasterData/Application/UseCases/ListUomsUseCase';
import { UpdateUomUseCase } from '@modules/MasterData/Application/UseCases/UpdateUomUseCase';
import { CreateUomRequest } from '@modules/MasterData/Presentation/Requests/CreateUomRequest';
import { ListUomsQuery } from '@modules/MasterData/Presentation/Requests/ListUomsQuery';
import { UpdateUomRequest } from '@modules/MasterData/Presentation/Requests/UpdateUomRequest';

@Controller('uoms')
export class UomController {
  constructor(
    private readonly createUomUseCase: CreateUomUseCase,
    private readonly getUomUseCase: GetUomUseCase,
    private readonly listUomsUseCase: ListUomsUseCase,
    private readonly updateUomUseCase: UpdateUomUseCase,
  ) {}

  @Post()
  public async Create(@Body() request: CreateUomRequest) {
    return await this.createUomUseCase.Execute(request);
  }

  @Get(':id')
  public async GetById(@Param('id') id: string) {
    return await this.getUomUseCase.Execute(id);
  }

  @Get()
  public async List(@Query() query: ListUomsQuery) {
    return await this.listUomsUseCase.Execute(query);
  }

  @Patch(':id')
  public async Update(@Param('id') id: string, @Body() request: UpdateUomRequest) {
    return await this.updateUomUseCase.Execute({ Id: id, ...request });
  }
}
